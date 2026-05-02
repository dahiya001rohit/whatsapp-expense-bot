/**
 * handler.js
 *
 * CORE RULE: every operation ends with a final message and STOPS.
 *
 * GLOBAL commands (checked before switch):
 *   hi/hey/hello → welcome (or onboarding if new)
 *   BAL          → balance, state unchanged
 *   MORE         → extended menu, sets state to more_menu
 *   0            → cancel, reset to main_menu (except awaiting_name)
 *
 * STATES:
 *   awaiting_name               → save name → STOP
 *   main_menu                   → 1 | 2 | else hint
 *   awaiting_amount             → credit amount → awaiting_category (or direct if no cats)
 *   awaiting_debit_amount       → debit amount  → awaiting_category (or direct if no cats)
 *   awaiting_category           → pick category → process transaction
 *   awaiting_negative_confirm   → YES / NO
 *   more_menu                   → 1 report | 2 budgets | 3 categories | 0 back
 *   manage_budgets              → number | CLEAR X | 0
 *   awaiting_budget_amount      → set limit for saved budgetCategory
 *   manage_categories           → ADD | DEL | 0
 *   awaiting_new_category_name  → save new category → STOP
 *   awaiting_delete_category    → pick number to delete → STOP
 */

const User        = require('../models/User');
const Category    = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');

const {
  askNameMessage,
  nameRegisteredMessage,
  welcomeMessage,
  balanceMessage,
  cancelledMessage,
  unrecognisedMessage,
  moreMenuMessage,
  spendingReportMessage,
  manageBudgetsMessage,
  askBudgetAmountMessage,
  budgetSetMessage,
  budgetRemovedMessage,
  invalidBudgetAmountMessage,
  budgetAlertMessage,
  budgetNoticeMessage,
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

/** Start of current calendar month (UTC midnight). */
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * After a debit is saved, check if the user has a budget for that category.
 * Sends a notice (80%+) or alert (100%+) if thresholds are crossed.
 */
async function checkBudgetAlert(sock, jid, phone, category) {
  const budget = await Budget.findOne({ phone, category });
  if (!budget) return;

  const [result] = await Transaction.aggregate([
    {
      $match: {
        phone,
        type: 'debit',
        category,
        createdAt: { $gte: startOfMonth() },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalSpent = result?.total ?? 0;
  const pct        = totalSpent / budget.limit;

  if (pct >= 1) {
    await send(sock, jid, budgetAlertMessage(category, budget.limit, totalSpent));
  } else if (pct >= 0.8) {
    await send(sock, jid, budgetNoticeMessage(category, budget.limit, totalSpent));
  }
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

  // ── GLOBAL: MORE ──────────────────────────────────────────────────────────
  if (inputUpper === 'MORE') {
    user.currentStep = 'more_menu';
    await user.save();
    await send(sock, jid, moreMenuMessage());
    return;
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

      } else {
        await send(sock, jid, unrecognisedMessage());
      }
      break;
    }

    // ── MORE menu ─────────────────────────────────────────────────────────────
    case 'more_menu': {
      if (userInput === '1') {
        // ── Spending report ─────────────────────────────────────────────────
        const monthStart = startOfMonth();

        const debitRows = await Transaction.aggregate([
          { $match: { phone, type: 'debit', createdAt: { $gte: monthStart } } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ]);

        const creditRows = await Transaction.aggregate([
          { $match: { phone, type: 'credit', createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        user.currentStep = 'main_menu';
        await user.save();

        const totalCredited = creditRows[0]?.total ?? 0;
        const debitFormatted = debitRows.map((r) => ({ category: r._id, total: r.total }));
        const totalSpent = debitFormatted.reduce((s, r) => s + r.total, 0);

        await send(sock, jid, spendingReportMessage(totalCredited, debitFormatted, totalSpent, user.balance));
        return; // STOP

      } else if (userInput === '2') {
        // ── Manage Budgets ──────────────────────────────────────────────────
        const cats    = await getCategories(phone);
        const budgets = await Budget.find({ phone });
        const budgetMap = {};
        budgets.forEach((b) => { budgetMap[b.category] = b.limit; });

        user.currentStep = 'manage_budgets';
        user.tempData    = { budgetCats: cats.map((c) => c.name) };
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, manageBudgetsMessage(cats, budgetMap));

      } else if (userInput === '3') {
        // ── Manage Categories ───────────────────────────────────────────────
        const cats = await getCategories(phone);
        user.currentStep = 'manage_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMessage(cats));

      } else if (userInput === '0') {
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, cancelledMessage(user.balance));
        return;

      } else {
        await send(sock, jid, { text: '⚠️  Please reply with *1*, *2*, or *3*.\n_Type *0* to go back._' });
      }
      break;
    }

    // ── Manage Budgets ────────────────────────────────────────────────────────
    case 'manage_budgets': {
      const cats    = await getCategories(phone);
      const budgets = await Budget.find({ phone });
      const budgetMap = {};
      budgets.forEach((b) => { budgetMap[b.category] = b.limit; });

      // CLEAR X
      if (inputUpper.startsWith('CLEAR ')) {
        const idx = parseInt(inputUpper.replace('CLEAR ', '').trim(), 10);

        if (isNaN(idx) || idx < 1 || idx > cats.length) {
          await send(sock, jid, { text: `⚠️ Invalid number. Please enter 1–${cats.length}.` });
          return;
        }

        const catName = cats[idx - 1].name;
        await Budget.deleteOne({ phone, category: catName });
        user.currentStep = 'main_menu';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, budgetRemovedMessage(catName));
        return; // STOP
      }

      // Number — select category to set budget
      const idx = parseInt(userInput, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= cats.length) {
        const catName     = cats[idx - 1].name;
        const currentLimit = budgetMap[catName] ?? null;

        user.currentStep = 'awaiting_budget_amount';
        user.tempData    = { budgetCategory: catName };
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, askBudgetAmountMessage(catName, currentLimit));

      } else {
        // Unrecognised — re-show the budgets menu
        await send(sock, jid, manageBudgetsMessage(cats, budgetMap));
      }
      break;
    }

    // ── Set budget amount ─────────────────────────────────────────────────────
    case 'awaiting_budget_amount': {
      const limit = parseFloat(userInput);

      if (isNaN(limit) || limit <= 0) {
        await send(sock, jid, invalidBudgetAmountMessage());
        return; // stay in state
      }

      const catName = user.tempData?.budgetCategory;
      await Budget.findOneAndUpdate(
        { phone, category: catName },
        { phone, category: catName, limit },
        { upsert: true, new: true },
      );

      user.currentStep = 'main_menu';
      user.tempData    = {};
      user.markModified('tempData');
      await user.save();
      await send(sock, jid, budgetSetMessage(catName, limit));
      return; // STOP
    }

    // ── Add Money: process directly (no category prompt for credits) ──────────
    case 'awaiting_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDepositMessage());
        return;
      }

      const prevBalance = user.balance;
      user.balance     += amount;
      user.currentStep  = 'main_menu';
      user.tempData     = {};
      user.markModified('tempData');
      await user.save();

      await Transaction.create({
        phone, type: 'credit', amount, category: 'Credit / Add Money',
        previousBalance: prevBalance, newBalance: user.balance,
      });

      await send(sock, jid, depositConfirmedMessage(amount, 'Credit / Add Money', prevBalance, user.balance));
      return; // STOP
    }

    // ── Withdraw: get amount ──────────────────────────────────────────────────
    case 'awaiting_debit_amount': {
      const amount = parseFloat(userInput);

      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDebitMessage(user.balance));
        return;
      }

      const cats = await getCategories(phone);

      if (cats.length === 0) {
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
        await checkBudgetAlert(sock, jid, phone, 'Uncategorised');
        return; // STOP
      }

      user.tempData = { pendingAmount: amount, pendingType: 'debit' };
      user.markModified('tempData');
      user.currentStep = 'awaiting_category';
      await user.save();
      await send(sock, jid, selectCategoryMessage(cats));
      return;
    }

    // ── Category selection (debit only) ──────────────────────────────────────
    case 'awaiting_category': {
      const cats  = await getCategories(phone);
      const index = parseInt(userInput, 10);

      if (isNaN(index) || index < 1 || index > cats.length) {
        await send(sock, jid, invalidCategoryMessage(cats.length));
        return;
      }

      const category     = cats[index - 1].name;
      const pendingAmount = user.tempData.pendingAmount;

      if (pendingAmount > user.balance) {
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
        phone, type: 'debit', amount: pendingAmount, category,
        previousBalance: prevBalance, newBalance: user.balance,
      });
      await send(sock, jid, withdrawConfirmedMessage(pendingAmount, category, prevBalance, user.balance));
      await checkBudgetAlert(sock, jid, phone, category);
      return; // STOP
    }

    // ── Negative balance confirmation ─────────────────────────────────────────
    case 'awaiting_negative_confirm': {
      const { pendingAmount = 0, pendingCategory = 'Uncategorised' } = user.tempData ?? {};

      if (inputUpper === 'YES') {
        const prevBalance = user.balance;
        user.balance     -= pendingAmount;
        user.currentStep  = 'main_menu';
        user.tempData     = {};
        user.markModified('tempData');
        await user.save();

        await Transaction.create({
          phone, type: 'debit', amount: pendingAmount, category: pendingCategory,
          previousBalance: prevBalance, newBalance: user.balance,
        });
        await send(sock, jid, negativeWithdrawConfirmedMessage(pendingAmount, pendingCategory, prevBalance, user.balance));
        await checkBudgetAlert(sock, jid, phone, pendingCategory);
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
      }
      break;
    }

    // ── Manage Categories ─────────────────────────────────────────────────────
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
        const cats = await getCategories(phone);
        await send(sock, jid, manageCategoriesMessage(cats));
      }
      break;
    }

    // ── Add new category ──────────────────────────────────────────────────────
    case 'awaiting_new_category_name': {
      await Category.create({ phone, name: userInput.trim() });
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, categoryCreatedMessage(userInput.trim()));
      return; // STOP
    }

    // ── Delete category ───────────────────────────────────────────────────────
    case 'awaiting_delete_category': {
      const cats  = await getCategories(phone);
      const index = parseInt(userInput, 10);

      if (isNaN(index) || index < 1 || index > cats.length) {
        await send(sock, jid, invalidCategoryMessage(cats.length));
        return;
      }

      if (cats.length === 1) {
        await send(sock, jid, lastCategoryWarningMessage());
        return;
      }

      const target = cats[index - 1];
      await Category.deleteOne({ _id: target._id });
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, categoryDeletedMessage(target.name));
      return; // STOP
    }

    // ── Unknown state ─────────────────────────────────────────────────────────
    default: {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, unrecognisedMessage());
      break;
    }
  }
}

module.exports = { handleMessage };
