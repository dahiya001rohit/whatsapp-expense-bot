/**
 * handler.js
 *
 * CORE RULE: every operation ends with a final message and STOPS.
 *
 * GLOBAL (before switch):
 *   hi/hey/hello  → welcome (or onboarding if new)
 *   BAL           → balance, state unchanged
 *   0             → cancel, reset to main_menu (except awaiting_name)
 *
 * STATES:
 *   awaiting_name               → save name, seed categories → STOP
 *   main_menu                   → 1 | 2 | 3 | else hint
 *   awaiting_amount             → credit — save amount → awaiting_category
 *   awaiting_debit_amount       → debit  — save amount → awaiting_category
 *   awaiting_category           → pick category → process transaction
 *   awaiting_negative_confirm   → YES / NO for negative balance
 *   manage_categories           → ADD | DEL | 0
 *   awaiting_new_category_name  → save new category → STOP
 *   awaiting_delete_category    → pick number to delete → STOP
 */

const User        = require('../models/User');
const Category    = require('../models/Category');
const Transaction = require('../models/Transaction');

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
  selectCategoryMessage,
  invalidCategoryMessage,
  negativeWarningMessage,
  negativeWithdrawConfirmedMessage,
  withdrawCancelledMessage,
  needYesOrNoMessage,
  manageCategoriesMessage,
  askNewCategoryNameMessage,
  categoryCreatedMessage,
  askDeleteCategoryMessage,
  categoryDeletedMessage,
  lastCategoryWarningMessage,
} = require('../utils/messages');

// ─── Constants ────────────────────────────────────────────────────────────────

const GREETINGS = new Set(['hi', 'hey', 'hello']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(sock, jid, payload) {
  await humanDelay();
  await sock.sendMessage(jid, { text: payload.text });
}

/** Fetch categories for a phone, ordered by creation time. */
async function getCategories(phone) {
  return Category.find({ phone }).sort({ createdAt: 1 });
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

  const phone      = jid.split('@')[0];
  let   user       = await User.findOne({ phone });
  const inputLower = userInput.toLowerCase();
  const inputUpper = userInput.toUpperCase();

  console.log(`📨  [${phone}] step: ${user?.currentStep ?? 'none'} | input: "${userInput}"`);

  // ── BRAND-NEW USER ────────────────────────────────────────────────────────
  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name', tempData: {} });
    await send(sock, jid, askNameMessage());
    return;
  }

  // ── GLOBAL: greeting ──────────────────────────────────────────────────────
  if (GREETINGS.has(inputLower) && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, welcomeMessage(user.name, user.balance));
    return;
  }

  // ── GLOBAL: BAL ───────────────────────────────────────────────────────────
  if (inputUpper === 'BAL') {
    await send(sock, jid, balanceMessage(user.name, user.balance));
    return; // state unchanged
  }

  // ── GLOBAL: 0 = cancel ────────────────────────────────────────────────────
  if (userInput === '0' && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, cancelledMessage(user.balance));
    return;
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────────────
  switch (user.currentStep) {

    // ── Onboarding ────────────────────────────────────────────────────────────
    case 'awaiting_name': {
      user.name        = userInput;
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

      } else if (userInput === '3') {
        const cats = await getCategories(phone);
        user.currentStep = 'manage_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMessage(cats));

      } else {
        await send(sock, jid, unrecognisedMessage());
      }
      break;
    }

    // ── Add Money: get amount ─────────────────────────────────────────────────
    case 'awaiting_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDepositMessage());
        return; // stay in state
      }

      const cats = await getCategories(phone);

      if (cats.length === 0) {
        // No categories — process immediately as 'Uncategorised'
        const prevBalance = user.balance;
        user.balance     += amount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();
        await Transaction.create({
          phone, type: 'credit', amount, category: 'Uncategorised',
          previousBalance: prevBalance, newBalance: user.balance,
        });
        await send(sock, jid, depositConfirmedMessage(amount, 'Uncategorised', prevBalance, user.balance));
        return; // STOP
      }

      user.tempData = { pendingAmount: amount, pendingType: 'credit' };
      user.markModified('tempData');
      user.currentStep = 'awaiting_category';
      await user.save();
      await send(sock, jid, selectCategoryMessage(cats));
      return;
    }

    // ── Withdraw: get amount ──────────────────────────────────────────────────
    case 'awaiting_debit_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDebitMessage(user.balance));
        return; // stay in state
      }

      const cats = await getCategories(phone);

      if (cats.length === 0) {
        // No categories — process immediately as 'Uncategorised'
        if (amount > user.balance) {
          user.tempData = { pendingAmount: amount, pendingType: 'debit', pendingCategory: 'Uncategorised' };
          user.markModified('tempData');
          user.currentStep = 'awaiting_negative_confirm';
          await user.save();
          await send(sock, jid, negativeWarningMessage(user.balance, amount));
          return;
        }
        const prevBalance = user.balance;
        user.balance     -= amount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();
        await Transaction.create({
          phone, type: 'debit', amount, category: 'Uncategorised',
          previousBalance: prevBalance, newBalance: user.balance,
        });
        await send(sock, jid, withdrawConfirmedMessage(amount, 'Uncategorised', prevBalance, user.balance));
        return; // STOP
      }

      user.tempData = { pendingAmount: amount, pendingType: 'debit' };
      user.markModified('tempData');
      user.currentStep = 'awaiting_category';
      await user.save();
      await send(sock, jid, selectCategoryMessage(cats));
      return;
    }

    // ── Category selection ────────────────────────────────────────────────────
    case 'awaiting_category': {
      const cats  = await getCategories(phone);
      const index = parseInt(userInput, 10);

      if (isNaN(index) || index < 1 || index > cats.length) {
        await send(sock, jid, invalidCategoryMessage(cats.length));
        return; // stay in state
      }

      const category    = cats[index - 1].name;
      const { pendingAmount, pendingType } = user.tempData;

      if (pendingType === 'credit') {
        // ── Credit ─────────────────────────────────────────────────────────
        const prevBalance = user.balance;
        user.balance     += pendingAmount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();

        await Transaction.create({
          phone,
          type: 'credit',
          amount: pendingAmount,
          category,
          previousBalance: prevBalance,
          newBalance: user.balance,
        });

        await send(sock, jid, depositConfirmedMessage(pendingAmount, category, prevBalance, user.balance));
        return; // STOP

      } else {
        // ── Debit ──────────────────────────────────────────────────────────
        if (pendingAmount > user.balance) {
          // Would go negative — save category and warn
          user.tempData = { pendingAmount, pendingType: 'debit', pendingCategory: category };
          user.markModified('tempData');
          user.currentStep = 'awaiting_negative_confirm';
          await user.save();
          await send(sock, jid, negativeWarningMessage(user.balance, pendingAmount));
          return;
        }

        const prevBalance = user.balance;
        user.balance     -= pendingAmount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();

        await Transaction.create({
          phone,
          type: 'debit',
          amount: pendingAmount,
          category,
          previousBalance: prevBalance,
          newBalance: user.balance,
        });

        await send(sock, jid, withdrawConfirmedMessage(pendingAmount, category, prevBalance, user.balance));
        return; // STOP
      }
    }

    // ── Negative balance confirmation ─────────────────────────────────────────
    case 'awaiting_negative_confirm': {
      const { pendingAmount = 0, pendingCategory = 'Misc' } = user.tempData ?? {};

      if (inputUpper === 'YES') {
        const prevBalance = user.balance;
        user.balance     -= pendingAmount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();

        await Transaction.create({
          phone,
          type: 'debit',
          amount: pendingAmount,
          category: pendingCategory,
          previousBalance: prevBalance,
          newBalance: user.balance,
        });

        await send(sock, jid, negativeWithdrawConfirmedMessage(pendingAmount, pendingCategory, prevBalance, user.balance));
        return; // STOP

      } else if (inputUpper === 'NO') {
        user.currentStep = 'main_menu';
        user.tempData    = {};
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

    // ── Manage Categories: show list + ADD/DEL/0 ──────────────────────────────
    case 'manage_categories': {
      if (inputUpper === 'ADD') {
        user.currentStep = 'awaiting_new_category_name';
        await user.save();
        await send(sock, jid, askNewCategoryNameMessage());

      } else if (inputUpper === 'DEL') {
        const cats = await getCategories(phone);
        user.currentStep = 'awaiting_delete_category';
        await user.save();
        await send(sock, jid, askDeleteCategoryMessage(cats));

      } else {
        // unrecognised — re-show the menu
        const cats = await getCategories(phone);
        await send(sock, jid, manageCategoriesMessage(cats));
      }
      break;
    }

    // ── Add new category: get name ────────────────────────────────────────────
    case 'awaiting_new_category_name': {
      const name = userInput.trim();
      await Category.create({ phone, name });
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, categoryCreatedMessage(name));
      return; // STOP
    }

    // ── Delete category: get number ───────────────────────────────────────────
    case 'awaiting_delete_category': {
      const cats  = await getCategories(phone);
      const index = parseInt(userInput, 10);

      if (isNaN(index) || index < 1 || index > cats.length) {
        await send(sock, jid, invalidCategoryMessage(cats.length));
        return; // stay in state
      }

      if (cats.length === 1) {
        await send(sock, jid, lastCategoryWarningMessage());
        return; // stay in state
      }

      const target = cats[index - 1];
      await Category.deleteOne({ _id: target._id });
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, categoryDeletedMessage(target.name));
      return; // STOP
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
