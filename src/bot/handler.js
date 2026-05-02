/**
 * handler.js
 *
 * CORE RULE: every operation ends with a final message and STOPS.
 * No menus after completions. User initiates via hi/hey/hello.
 *
 * GLOBAL (before switch):
 *   hi/hey/hello  → welcome + options  (or onboarding if new)
 *   BAL           → balance, state unchanged
 *   0             → cancel, reset to main_menu (not in awaiting_name)
 *
 * STATES:
 *   awaiting_name             → save name → STOP
 *   main_menu                 → '1' | '2' | else hint
 *   awaiting_amount           → credit
 *   awaiting_debit_amount     → debit
 *   awaiting_negative_confirm → YES / NO
 */

const User = require('../models/User');
const {
  askNameMessage,
  nameRegisteredMessage,
  welcomeMessage,
  balanceMessage,
  cancelledMessage,
  unrecognisedMessage,
  askAmountMessage,
  depositConfirmedMessage,
  invalidDepositMessage,
  askDebitAmountMessage,
  withdrawConfirmedMessage,
  invalidDebitMessage,
  negativeWarningMessage,
  negativeWithdrawConfirmedMessage,
  withdrawCancelledMessage,
  needYesOrNoMessage,
} = require('../utils/messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(sock, jid, payload) {
  await humanDelay();
  await sock.sendMessage(jid, { text: payload.text });
}

const GREETINGS = new Set(['hi', 'hey', 'hello']);

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

  const inputLower = userInput.toLowerCase();
  const inputUpper = userInput.toUpperCase();

  // ── BRAND-NEW USER ────────────────────────────────────────────────────────
  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name', tempData: {} });
    await send(sock, jid, askNameMessage());
    return;
  }

  // ── GLOBAL: greeting ──────────────────────────────────────────────────────
  if (GREETINGS.has(inputLower)) {
    if (user.currentStep === 'awaiting_name') {
      // Still in onboarding — fall through to switch
    } else {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, welcomeMessage(user.name, user.balance));
      return; // STOP
    }
  }

  // ── GLOBAL: BAL ───────────────────────────────────────────────────────────
  if (inputUpper === 'BAL') {
    await send(sock, jid, balanceMessage(user.name, user.balance));
    return; // STOP — state unchanged
  }

  // ── GLOBAL: 0 = cancel (not while entering name) ─────────────────────────
  if (userInput === '0' && user.currentStep !== 'awaiting_name') {
    const prevBalance = user.balance;
    user.currentStep = 'main_menu';
    user.tempData = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, cancelledMessage(prevBalance));
    return; // STOP
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────────────
  switch (user.currentStep) {

    // ── Onboarding: waiting for name ──────────────────────────────────────────
    case 'awaiting_name': {
      user.name = userInput;
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, nameRegisteredMessage(user.name));
      return; // STOP
    }

    // ── Main menu ─────────────────────────────────────────────────────────────
    case 'main_menu': {
      if (userInput === '1') {
        user.currentStep = 'awaiting_amount';
        await user.save();
        await send(sock, jid, askAmountMessage());

      } else if (userInput === '2') {
        user.currentStep = 'awaiting_debit_amount';
        await user.save();
        await send(sock, jid, askDebitAmountMessage(user.balance));

      } else {
        await send(sock, jid, unrecognisedMessage());
      }
      break;
    }

    // ── Add Money ─────────────────────────────────────────────────────────────
    case 'awaiting_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDepositMessage());
        return; // stay in state
      }

      const prevBalance = user.balance;
      user.balance += amount;
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, depositConfirmedMessage(amount, prevBalance, user.balance));
      return; // STOP
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────
    case 'awaiting_debit_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDebitMessage(user.balance));
        return; // stay in state
      }

      if (amount > user.balance) {
        // Warn — save pending amount and ask for confirmation
        user.currentStep = 'awaiting_negative_confirm';
        user.tempData = { pendingDebit: amount };
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, negativeWarningMessage(user.balance, amount));
        return;
      }

      // Sufficient balance
      const prevBalance = user.balance;
      user.balance -= amount;
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, withdrawConfirmedMessage(amount, prevBalance, user.balance));
      return; // STOP
    }

    // ── Confirm negative-balance withdrawal ───────────────────────────────────
    case 'awaiting_negative_confirm': {
      const pendingDebit = user.tempData?.pendingDebit ?? 0;

      if (inputUpper === 'YES') {
        const prevBalance = user.balance;
        user.balance -= pendingDebit;
        user.currentStep = 'main_menu';
        user.tempData = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, negativeWithdrawConfirmedMessage(pendingDebit, prevBalance, user.balance));
        return; // STOP

      } else if (inputUpper === 'NO') {
        user.currentStep = 'main_menu';
        user.tempData = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, withdrawCancelledMessage(user.balance));
        return; // STOP

      } else {
        await send(sock, jid, needYesOrNoMessage());
        // stay in state
      }
      break;
    }

    // ── Unknown state — reset cleanly ─────────────────────────────────────────
    default: {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, unrecognisedMessage());
      break;
    }
  }
}

module.exports = { handleMessage };
