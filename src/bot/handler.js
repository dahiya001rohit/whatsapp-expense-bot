/**
 * handler.js
 * State-machine message router — plain text only.
 *
 * Menu navigation uses numbered replies:
 *   "1" → Add Money
 *   "2" → Check Balance
 */

const User = require('../models/User');
const {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  askAmountMessage,
  depositConfirmedMessage,
  balanceMessage,
  backToMenuMessage,
  invalidAmountMessage,
  invalidChoiceMessage,
} = require('../utils/messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random 1–2 second delay so replies feel human. */
const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

/**
 * Send a plain text message with a human-like delay.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} jid
 * @param {{ text: string }} payload
 */
async function send(sock, jid, payload) {
  await humanDelay();
  await sock.sendMessage(jid, { text: payload.text });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

/**
 * Handle a single incoming message event.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {object} message  raw Baileys message object
 */
async function handleMessage(sock, message) {
  const jid = message.key.remoteJid;

  // Ignore groups, status broadcasts, and our own outgoing messages
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
  if (message.key.fromMe) return;

  const msg = message.message;
  if (!msg) return;

  // Extract typed text only
  const userInput = (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    ''
  ).trim();

  if (!userInput) return; // ignore media, stickers, reactions, etc.

  const phone = jid.split('@')[0];
  console.log(`📨  [${phone}] step: ${(await User.findOne({ phone }))?.currentStep ?? 'none'} | input: "${userInput}"`);

  // ── Fetch or create user ──────────────────────────────────────────────────
  let user = await User.findOne({ phone });

  // ── BRAND-NEW USER ────────────────────────────────────────────────────────
  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name' });
    await send(sock, jid, askNameMessage());
    return;
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────────────
  switch (user.currentStep) {

    // ── Waiting for name ────────────────────────────────────────────────────
    case 'awaiting_name': {
      user.name = userInput;
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, accountCreatedMessage(userInput));
      await send(sock, jid, mainMenuMessage(userInput));
      break;
    }

    // ── Waiting for deposit amount ───────────────────────────────────────────
    case 'awaiting_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidAmountMessage());
        return;
      }

      user.balance += amount;
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, depositConfirmedMessage(amount, user.balance));
      await send(sock, jid, backToMenuMessage(user.name));
      break;
    }

    // ── Main menu — user replies "1" or "2" ──────────────────────────────────
    case 'main_menu':
    default: {
      if (userInput === '1') {
        user.currentStep = 'awaiting_amount';
        await user.save();
        await send(sock, jid, askAmountMessage());

      } else if (userInput === '2') {
        await send(sock, jid, balanceMessage(user.name, user.balance));
        await send(sock, jid, backToMenuMessage(user.name));

      } else {
        // Returning user typed something unexpected — re-show menu
        if (user.name) {
          await send(sock, jid, mainMenuMessage(user.name));
        } else {
          await send(sock, jid, invalidChoiceMessage());
        }
      }
      break;
    }
  }
}

module.exports = { handleMessage };
