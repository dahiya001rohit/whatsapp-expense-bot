/**
 * handler.js
 * State-machine message router — plain text only.
 *
 * Global shortcuts (checked before any state switch):
 *   BAL           → show balance instantly, stay in current state
 *   HI/HELLO/HEY  → show welcome + 2-option menu (returning users)
 *
 * In any amount-entry state:
 *   0  → cancel operation, return to main menu
 *
 * States:
 *   awaiting_name              → free text (user's name)
 *   main_menu                  → '1' add | '2' withdraw
 *   awaiting_amount            → deposit amount (0 = cancel)
 *   awaiting_debit_amount      → withdrawal amount (0 = cancel)
 *   awaiting_negative_confirm  → YES / NO for negative-balance withdrawal
 */

const User = require('../models/User');
const {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  backToMenuMessage,
  welcomeMessage,
  askAmountMessage,
  depositConfirmedMessage,
  askDebitAmountMessage,
  debitConfirmedMessage,
  negativeBalanceWarningMessage,
  negativeConfirmedMessage,
  withdrawalCancelledMessage,
  cancelledMessage,
  balanceMessage,
  invalidAmountMessage,
} = require('../utils/messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(sock, jid, payload) {
  await humanDelay();
  await sock.sendMessage(jid, { text: payload.text });
}

const GREETINGS = new Set(['hi', 'hello', 'hey']);

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function handleMessage(sock, message) {
  const jid = message.key.remoteJid;

  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
  if (message.key.fromMe) return;

  const msg = message.message;
  if (!msg) return;

  const userInput = (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    ''
  ).trim();

  if (!userInput) return;

  const phone = jid.split('@')[0];
  let user = await User.findOne({ phone });
  console.log(`📨  [${phone}] step: ${user?.currentStep ?? 'none'} | input: "${userInput}"`);

  // ── BRAND-NEW USER ────────────────────────────────────────────────────────
  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name', tempData: {} });
    await send(sock, jid, askNameMessage());
    return;
  }

  const inputUpper = userInput.toUpperCase();

  // ── GLOBAL: BAL command — works from any state ────────────────────────────
  if (inputUpper === 'BAL') {
    await send(sock, jid, balanceMessage(user.name, user.balance));
    // Stay in whatever state the user was in — don't change currentStep
    return;
  }

  // ── GLOBAL: greeting — returning users only ───────────────────────────────
  if (GREETINGS.has(userInput.toLowerCase()) && user.currentStep !== 'awaiting_name') {
    await send(sock, jid, welcomeMessage(user.name));
    user.currentStep = 'main_menu';
    await user.save();
    return;
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────────────
  switch (user.currentStep) {

    // ── Waiting for name ─────────────────────────────────────────────────────
    case 'awaiting_name': {
      user.name = userInput;
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, accountCreatedMessage(user.name));
      await send(sock, jid, mainMenuMessage(user.name));
      break;
    }

    // ── Waiting for deposit amount ────────────────────────────────────────────
    case 'awaiting_amount': {
      // 0 = cancel
      if (userInput === '0') {
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, cancelledMessage());
        await send(sock, jid, backToMenuMessage(user.name));
        return;
      }

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

    // ── Waiting for withdrawal amount ─────────────────────────────────────────
    case 'awaiting_debit_amount': {
      // 0 = cancel
      if (userInput === '0') {
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, cancelledMessage());
        await send(sock, jid, backToMenuMessage(user.name));
        return;
      }

      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidAmountMessage());
        return;
      }

      if (amount > user.balance) {
        // Would go negative — warn and ask for confirmation
        user.currentStep = 'awaiting_negative_confirm';
        user.tempData = { pendingDebit: amount };
        user.markModified('tempData');
        await user.save();

        await send(sock, jid, negativeBalanceWarningMessage(user.balance, amount));
        return;
      }

      // Safe withdrawal
      user.balance -= amount;
      user.currentStep = 'main_menu';
      await user.save();

      await send(sock, jid, debitConfirmedMessage(amount, user.balance));
      await send(sock, jid, backToMenuMessage(user.name));
      break;
    }

    // ── Waiting for YES / NO on negative-balance withdrawal ───────────────────
    case 'awaiting_negative_confirm': {
      const reply = inputUpper;
      const pendingDebit = user.tempData?.pendingDebit;

      if (reply === 'YES') {
        if (!pendingDebit) {
          // pendingDebit lost — restart debit flow gracefully
          user.currentStep = 'awaiting_debit_amount';
          user.tempData = {};
          user.markModified('tempData');
          await user.save();
          await send(sock, jid, askDebitAmountMessage());
          return;
        }

        user.balance -= pendingDebit;
        user.currentStep = 'main_menu';
        user.tempData = {};
        user.markModified('tempData');
        await user.save();

        await send(sock, jid, negativeConfirmedMessage(pendingDebit, user.balance));
        await send(sock, jid, backToMenuMessage(user.name));

      } else if (reply === 'NO' || userInput === '0') {
        user.currentStep = 'main_menu';
        user.tempData = {};
        user.markModified('tempData');
        await user.save();

        await send(sock, jid, withdrawalCancelledMessage());
        await send(sock, jid, backToMenuMessage(user.name));

      } else {
        await send(sock, jid, { text: '⚠️  Please reply *YES* to confirm or *NO* to cancel.' });
      }
      break;
    }

    // ── Main menu ─────────────────────────────────────────────────────────────
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

      } else {
        // Any unrecognised input → re-show menu
        await send(sock, jid, mainMenuMessage(user.name));
      }
      break;
    }
  }
}

module.exports = { handleMessage };
