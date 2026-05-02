/**
 * handler.js
 * State-machine message router — plain text only.
 *
 * States:
 *   awaiting_name              → free text (user's name)
 *   main_menu                  → typed '1' add, '2' withdraw, '3' balance
 *   awaiting_amount            → free text (deposit amount)
 *   awaiting_debit_amount      → free text (withdrawal amount)
 *   awaiting_negative_confirm  → YES / NO to confirm negative-balance withdrawal
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
  negativeBalanceWarningMessage,
  negativeConfirmedMessage,
  withdrawalCancelledMessage,
  balanceMessage,
  invalidAmountMessage,
} = require('../utils/messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random 1–2 second delay so replies feel human. */
const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(sock, jid, payload) {
  await humanDelay();
  await sock.sendMessage(jid, { text: payload.text });
}

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
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidAmountMessage());
        return;
      }

      if (amount > user.balance) {
        // Would go negative — warn and ask for confirmation
        user.currentStep = 'awaiting_negative_confirm';
        user.tempData = { pendingDebit: amount };
        user.markModified('tempData'); // required for Mongoose to detect Object mutation
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
      const reply = userInput.toUpperCase();
      const pendingDebit = user.tempData?.pendingDebit;

      if (reply === 'YES') {
        if (!pendingDebit) {
          // Edge case: pendingDebit lost somehow — restart debit flow
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

      } else if (reply === 'NO') {
        user.currentStep = 'main_menu';
        user.tempData = {};
        user.markModified('tempData');
        await user.save();

        await send(sock, jid, withdrawalCancelledMessage());
        await send(sock, jid, backToMenuMessage(user.name));

      } else {
        // Any other reply — nudge them
        await send(sock, jid, {
          text: '⚠️  Please reply *YES* to confirm or *NO* to cancel.',
        });
      }
      break;
    }

    // ── Main menu — user replies '1', '2', or '3' ────────────────────────────
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
        await send(sock, jid, mainMenuMessage(user.name));
      }
      break;
    }
  }
}

module.exports = { handleMessage };
