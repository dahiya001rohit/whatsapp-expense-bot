/**
 * handler.js
 * State-machine message router.
 *
 * List-menu selections arrive as rowId strings '1', '2', '3'.
 * Plain text input is still accepted as a fallback.
 *
 * States:
 *   awaiting_name         → free text (user's name)
 *   main_menu             → list tap: '1' add, '2' withdraw, '3' balance
 *   awaiting_amount       → free text (deposit amount)
 *   awaiting_debit_amount → free text (withdrawal amount, with balance check)
 */

const User = require('../models/User');
const {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  backToMenuMessage,
  askAmountMessage,
  depositConfirmedMessage,
  askDebitAmountMessage,
  debitConfirmedMessage,
  insufficientBalanceMessage,
  balanceMessage,
  invalidAmountMessage,
} = require('../utils/messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random 1–2 second delay so replies feel human. */
const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

/**
 * Send a message — detects list payloads vs plain text automatically.
 *
 * Baileys list-message format: pass `sections` directly on the content object
 * (NOT nested inside a `listMessage` key — that causes "Invalid media type").
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} jid
 * @param {object} payload  from messages.js
 */
async function send(sock, jid, payload) {
  await humanDelay();

  if (payload.sections) {
    // List message — renders as a tappable "Open Menu" button in WhatsApp
    await sock.sendMessage(jid, {
      text:       payload.text,
      title:      payload.title       || '',
      footer:     payload.footer      || '',
      buttonText: payload.buttonText  || 'Select',
      sections:   payload.sections,
    });
  } else {
    await sock.sendMessage(jid, { text: payload.text });
  }
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

  // ── Extract user intent ──────────────────────────────────────────────────
  // List-menu tap: comes back as selectedRowId ('1', '2', '3')
  const listRowId = msg.listResponseMessage?.singleSelectReply?.selectedRowId?.trim() ?? null;

  // Typed text (normal conversation or extended text)
  const textBody = (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    ''
  ).trim();

  const userInput = listRowId || textBody;

  if (!userInput) return; // ignore media, stickers, reactions, etc.

  const phone = jid.split('@')[0];

  // Fetch user first for logging, then re-use below
  let user = await User.findOne({ phone });
  console.log(`📨  [${phone}] step: ${user?.currentStep ?? 'none'} | input: "${userInput}"`);

  // ── BRAND-NEW USER ────────────────────────────────────────────────────────
  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name' });
    await send(sock, jid, askNameMessage());
    return;
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────────────
  switch (user.currentStep) {

    // ── Waiting for name ─────────────────────────────────────────────────────
    case 'awaiting_name': {
      user.name = textBody || userInput; // must be typed text
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, accountCreatedMessage(user.name));
      await send(sock, jid, mainMenuMessage(user.name));
      break;
    }

    // ── Waiting for deposit amount ────────────────────────────────────────────
    case 'awaiting_amount': {
      const amount = parseFloat(textBody);

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

    // ── Waiting for withdrawal amount ─────────────────────────────────────────
    case 'awaiting_debit_amount': {
      const amount = parseFloat(textBody);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidAmountMessage());
        return;
      }

      if (amount > user.balance) {
        // Insufficient funds — stay in this step so user can try again
        await send(sock, jid, insufficientBalanceMessage(user.balance));
        await send(sock, jid, askDebitAmountMessage());
        return;
      }

      user.balance -= amount;
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, debitConfirmedMessage(amount, user.balance));
      await send(sock, jid, backToMenuMessage(user.name));
      break;
    }

    // ── Main menu — list tap rowId or typed number ────────────────────────────
    case 'main_menu':
    default: {
      if (userInput === '1') {
        user.currentStep = 'awaiting_amount';
        await user.save();
        await send(sock, jid, askAmountMessage());

      } else if (userInput === '2') {
        user.currentStep = 'awaiting_debit_amount';
        await user.save();
        await send(sock, jid, askDebitAmountMessage());

      } else if (userInput === '3') {
        await send(sock, jid, balanceMessage(user.name, user.balance));
        await send(sock, jid, backToMenuMessage(user.name));

      } else {
        // Free text / returning user — just re-show the menu
        await send(sock, jid, mainMenuMessage(user.name));
      }
      break;
    }
  }
}

module.exports = { handleMessage };
