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
 *   awaiting_name                  → save name → STOP
 *   main_menu                      → 1 | 2 | else hint
 *   awaiting_amount                → credit amount → awaiting_income_category
 *   awaiting_income_category       → pick income category → process credit
 *   awaiting_debit_amount          → debit amount  → awaiting_category (or direct if no cats)
 *   awaiting_category              → pick category → process transaction
 *   awaiting_negative_confirm      → YES / NO
 *   more_menu                      → 1 report | 2 budgets | 3 categories | 4 lend/borrow | 5 reset | 0 back
 *   manage_budgets                 → number | CLEAR X | 0
 *   awaiting_budget_amount         → set limit for saved budgetCategory
 *   manage_categories              → 1 spending | 2 income | 0 back (sub-menu chooser)
 *   manage_spending_categories     → ADD | DEL | 0
 *   awaiting_new_category_name     → save new spending category → STOP
 *   awaiting_delete_category       → pick number to delete → STOP
 *   manage_income_categories       → ADD | DEL | 0
 *   awaiting_new_income_category   → save new income category → STOP
 *   awaiting_delete_income_category→ pick number to delete → STOP
 *   lend_borrow_menu               → 1 gave | 2 took | 3 view | 4 settle | 0 back
 *   lend_person_select             → pick person or type name
 *   lend_amount_entry              → enter amount
 *   lend_settle_select             → pick person to settle
 *   lend_settle_amount             → FULL or partial amount
 */

const User           = require('../models/User');
const Category       = require('../models/Category');
const Transaction    = require('../models/Transaction');
const Budget         = require('../models/Budget');
const ResetLog       = require('../models/ResetLog');
const IncomeCategory = require('../models/IncomeCategory');
const LendBorrow     = require('../models/LendBorrow');

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
  resetTypeMessage,
  resetKeepCategoriesMessage,
  resetFinalConfirmMessage,
  resetSuccessMessage,
  fullResetSuccessMessage,
  resetCancelledMessage,
  resetConfirmNudgeMessage,
  selectIncomeCategoryMessage,
  manageCategoriesMenuMessage,
  manageIncomeCategoriesMessage,
  askNewIncomeCategoryNameMessage,
  incomeCategoryCreatedMessage,
  askDeleteIncomeCategoryMessage,
  incomeCategoryDeletedMessage,
  lendBorrowMenuMessage,
  lendPersonSelectMessage,
  lendAskAmountMessage,
  lendGaveConfirmedMessage,
  lendTookConfirmedMessage,
  lendBalancesMessage,
  lendNoRecordsMessage,
  lendSettleSelectMessage,
  lendAllClearMessage,
  lendSettleAmountMessage,
  lendFullSettledMessage,
  lendPartialSettledMessage,
  fmt,
} = require('../utils/messages');

// ─── Constants ────────────────────────────────────────────────────────────────

const GREETINGS = new Set(['hi', 'hey', 'hello']);

/** Default spending categories restored on reset. */
const DEFAULT_CATEGORIES = [
  'Food', 'Transport', 'Bills', 'Entertainment',
  'Shopping', 'Health', 'Education', 'Misc',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Family', 'Stipend', 'Cashback', 'Other Income',
];

async function seedCategories(phone) {
  await Category.insertMany(DEFAULT_CATEGORIES.map((name) => ({ phone, name })));
}

async function seedIncomeCategories(phone) {
  await IncomeCategory.insertMany(
    DEFAULT_INCOME_CATEGORIES.map((name) => ({ phone, name })),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(_sock, jid, payload) {
  await humanDelay();

  // Always use the most recently connected socket, not the one captured at
  // message-receipt time (which may have closed mid-reconnect cycle).
  const { getSocket } = require('./index');
  const live = getSocket() || _sock;

  try {
    await live.sendMessage(jid, { text: payload.text });
  } catch (err) {
    // If the connection closed between reading the message and sending the
    // reply, wait briefly for the reconnect then try once more.
    if (err?.message?.includes('Connection Closed') || err?.message?.includes('Timed Out')) {
      await new Promise((r) => setTimeout(r, 5000));
      const retrySocket = getSocket() || _sock;
      await retrySocket.sendMessage(jid, { text: payload.text });
    } else {
      throw err;
    }
  }
}

/** Fetch spending categories for a phone, ordered by creation time. */
async function getCategories(phone) {
  return Category.find({ phone }).sort({ createdAt: 1 });
}

/** Fetch income categories for a phone, ordered by creation time. */
async function getIncomeCategories(phone) {
  return IncomeCategory.find({ phone }).sort({ createdAt: 1 });
}

/** Start of current calendar month (UTC midnight). */
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

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

async function getLendBorrowSummary(phone) {
  const records = await LendBorrow.find({ phone, settled: false });
  const byPerson = {};
  for (const r of records) {
    if (!byPerson[r.personName]) byPerson[r.personName] = { gave: 0, took: 0 };
    if (r.type === 'gave') byPerson[r.personName].gave += r.amount;
    else                   byPerson[r.personName].took += r.amount;
  }
  let totalOwedToYou = 0;
  let totalYouOwe    = 0;
  const people = [];
  for (const [name, { gave, took }] of Object.entries(byPerson)) {
    const net = gave - took;
    if (net > 0)      { totalOwedToYou += net;           people.push({ name, net, direction: 'owes_you' }); }
    else if (net < 0) { totalYouOwe    += Math.abs(net); people.push({ name, net: Math.abs(net), direction: 'you_owe' }); }
  }
  return { totalOwedToYou, totalYouOwe, people };
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

  // ── NUDGE RESPONSE ────────────────────────────────────────────────────────
  if (user.notifStatus === 'nudge_sent') {
    if (inputUpper === 'YES') {
      user.notifStatus = 'none';
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, welcomeMessage(user.name, user.balance));
      return;
    }
    if (inputUpper === 'NO') {
      user.notifStatus = 'none';
      await user.save();
      await send(sock, jid, { text: `All good! 💪\nYour balance stands at *₹${fmt(user.balance)}*.\n\nCatch you later!\nType *hi* anytime you need me.` });
      return;
    }
    // Any other input — clear nudge status and fall through to normal flow
    user.notifStatus = 'none';
    await user.save();
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
    user.tempData = { ...user.tempData, previousStep: user.currentStep };
    user.markModified('tempData');
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
      await seedCategories(phone);
      await seedIncomeCategories(phone);
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
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ]);

        user.currentStep = 'main_menu';
        await user.save();

        const creditFormatted = creditRows.map((r) => ({ category: r._id, total: r.total }));
        const debitFormatted  = debitRows.map((r) => ({ category: r._id, total: r.total }));
        const totalCredited   = creditFormatted.reduce((s, r) => s + r.total, 0);
        const totalSpent      = debitFormatted.reduce((s, r) => s + r.total, 0);

        await send(sock, jid, spendingReportMessage(creditFormatted, debitFormatted, totalCredited, totalSpent, user.balance));
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
        // ── Manage Categories (sub-menu chooser) ────────────────────────────
        user.currentStep = 'manage_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMenuMessage());

      } else if (userInput === '4') {
        // ── Lending & Borrowing ───────────────────────────────────────────────
        const { totalOwedToYou, totalYouOwe } = await getLendBorrowSummary(phone);
        user.currentStep = 'lend_borrow_menu';
        await user.save();
        await send(sock, jid, lendBorrowMenuMessage(totalOwedToYou, totalYouOwe));

      } else if (userInput === '5') {
        // ── Reset ─────────────────────────────────────────────────────────────
        user.currentStep = 'reset_type_confirm';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, resetTypeMessage());

      } else if (userInput === '0') {
        const prevStep = user.tempData?.previousStep;
        user.currentStep = (prevStep && prevStep !== 'more_menu') ? prevStep : 'main_menu';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, { text: `❌ *Cancelled.*\n\nType *hi* for main menu.` });
        return;

      } else {
        await send(sock, jid, { text: '⚠️  Please reply with *1*, *2*, *3*, *4*, or *5*.\n_Type *0* to go back._' });
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

    // ── Add Money: ask income category ────────────────────────────────────────
    case 'awaiting_amount': {
      const amount = parseFloat(userInput);
      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, invalidDepositMessage());
        return;
      }
      const incomeCats = await getIncomeCategories(phone);
      user.tempData = { pendingIncomeAmount: amount };
      user.markModified('tempData');
      user.currentStep = 'awaiting_income_category';
      await user.save();
      await send(sock, jid, selectIncomeCategoryMessage(incomeCats));
      return;
    }

    // ── Income category selection ─────────────────────────────────────────────
    case 'awaiting_income_category': {
      const incomeCats = await getIncomeCategories(phone);
      const index = parseInt(userInput, 10);
      if (isNaN(index) || index < 1 || index > incomeCats.length) {
        await send(sock, jid, invalidCategoryMessage(incomeCats.length));
        return;
      }
      const category    = incomeCats[index - 1].name;
      const amount      = user.tempData?.pendingIncomeAmount ?? 0;
      const prevBalance = user.balance;
      user.balance     += amount;
      user.currentStep       = 'main_menu';
      user.tempData          = {};
      user.lastTransactionAt = new Date();
      user.markModified('tempData');
      await user.save();
      await Transaction.create({
        phone, type: 'credit', amount, category,
        previousBalance: prevBalance, newBalance: user.balance,
      });
      await send(sock, jid, depositConfirmedMessage(amount, category, prevBalance, user.balance));
      return;
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
        const prevBalance      = user.balance;
        user.balance          -= amount;
        user.currentStep       = 'main_menu';
        user.tempData          = {};
        user.lastTransactionAt = new Date();
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

      const prevBalance      = user.balance;
      user.balance          -= pendingAmount;
      user.currentStep       = 'main_menu';
      user.tempData          = {};
      user.lastTransactionAt = new Date();
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
        const prevBalance      = user.balance;
        user.balance          -= pendingAmount;
        user.currentStep       = 'main_menu';
        user.tempData          = {};
        user.lastTransactionAt = new Date();
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

    // ── Manage Categories (sub-menu chooser) ──────────────────────────────────
    case 'manage_categories': {
      if (userInput === '1') {
        const cats = await getCategories(phone);
        user.currentStep = 'manage_spending_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMessage(cats));
      } else if (userInput === '2') {
        const cats = await getIncomeCategories(phone);
        user.currentStep = 'manage_income_categories';
        await user.save();
        await send(sock, jid, manageIncomeCategoriesMessage(cats));
      } else if (userInput === '0') {
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, cancelledMessage(user.balance));
      } else {
        await send(sock, jid, manageCategoriesMenuMessage());
      }
      break;
    }

    // ── Manage Spending Categories ────────────────────────────────────────────
    case 'manage_spending_categories': {
      if (inputUpper === 'ADD') {
        user.currentStep = 'awaiting_new_category_name';
        await user.save();
        await send(sock, jid, askNewCategoryNameMessage());

      } else if (inputUpper === 'DEL') {
        const cats = await getCategories(phone);
        user.currentStep = 'awaiting_delete_category';
        await user.save();
        await send(sock, jid, askDeleteCategoryMessage(cats));

      } else if (userInput === '0') {
        user.currentStep = 'manage_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMenuMessage());

      } else {
        const cats = await getCategories(phone);
        await send(sock, jid, manageCategoriesMessage(cats));
      }
      break;
    }

    // ── Add new spending category ─────────────────────────────────────────────
    case 'awaiting_new_category_name': {
      const catName = userInput.trim();

      if (catName.length === 0) {
        await send(sock, jid, {
          text: '⚠️ Category name cannot be empty.\n\nPlease enter a valid name:\n_Type *0* to cancel_',
        });
        return;
      }

      if (catName.length > 30) {
        await send(sock, jid, {
          text: '⚠️ Category name too long.\n\nPlease keep it under 30 characters:\n_Type *0* to cancel_',
        });
        return;
      }

      await Category.create({ phone, name: catName });
      const updatedCats = await getCategories(phone);
      user.currentStep  = 'manage_spending_categories';
      await user.save();
      await send(sock, jid, categoryCreatedMessage(catName, updatedCats));
      break; // stay in manage_spending_categories
    }

    // ── Delete spending category ──────────────────────────────────────────────
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
      const updatedCats = await getCategories(phone);
      user.currentStep  = 'manage_spending_categories';
      await user.save();
      await send(sock, jid, categoryDeletedMessage(target.name, updatedCats));
      break; // stay in manage_spending_categories
    }

    // ── Manage Income Categories ──────────────────────────────────────────────
    case 'manage_income_categories': {
      if (inputUpper === 'ADD') {
        user.currentStep = 'awaiting_new_income_category';
        await user.save();
        await send(sock, jid, askNewIncomeCategoryNameMessage());
      } else if (inputUpper === 'DEL') {
        const cats = await getIncomeCategories(phone);
        user.currentStep = 'awaiting_delete_income_category';
        await user.save();
        await send(sock, jid, askDeleteIncomeCategoryMessage(cats));
      } else if (userInput === '0') {
        user.currentStep = 'manage_categories';
        await user.save();
        await send(sock, jid, manageCategoriesMenuMessage());
      } else {
        const cats = await getIncomeCategories(phone);
        await send(sock, jid, manageIncomeCategoriesMessage(cats));
      }
      break;
    }

    // ── Add new income category ───────────────────────────────────────────────
    case 'awaiting_new_income_category': {
      const catName = userInput.trim();
      if (catName.length === 0) {
        await send(sock, jid, { text: '⚠️ Category name cannot be empty.\n\nPlease enter a valid name:\n_Type *0* to cancel_' });
        return;
      }
      if (catName.length > 30) {
        await send(sock, jid, { text: '⚠️ Category name too long.\n\nPlease keep it under 30 characters:\n_Type *0* to cancel_' });
        return;
      }
      await IncomeCategory.create({ phone, name: catName });
      const updatedCats = await getIncomeCategories(phone);
      user.currentStep  = 'manage_income_categories';
      await user.save();
      await send(sock, jid, incomeCategoryCreatedMessage(catName, updatedCats));
      break;
    }

    // ── Delete income category ────────────────────────────────────────────────
    case 'awaiting_delete_income_category': {
      const cats  = await getIncomeCategories(phone);
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
      await IncomeCategory.deleteOne({ _id: target._id });
      const updatedCats = await getIncomeCategories(phone);
      user.currentStep  = 'manage_income_categories';
      await user.save();
      await send(sock, jid, incomeCategoryDeletedMessage(target.name, updatedCats));
      break;
    }

    // ── Lending & Borrowing menu ──────────────────────────────────────────────
    case 'lend_borrow_menu': {
      if (userInput === '1' || userInput === '2') {
        const lendType = userInput === '1' ? 'gave' : 'took';
        const allRecords = await LendBorrow.find({ phone });
        const uniquePeople = [...new Set(allRecords.map((r) => r.personName))];
        user.tempData = { pendingLendType: lendType };
        user.markModified('tempData');
        user.currentStep = 'lend_person_select';
        await user.save();
        await send(sock, jid, lendPersonSelectMessage(lendType, uniquePeople));
      } else if (userInput === '3') {
        // View all balances
        const allRecords = await LendBorrow.find({ phone, settled: false });
        if (allRecords.length === 0) {
          user.currentStep = 'main_menu';
          await user.save();
          await send(sock, jid, lendNoRecordsMessage());
          return;
        }
        // Group by person for gave and took
        const gavePeopleMap  = {};
        const tookPeopleMap  = {};
        for (const r of allRecords) {
          const key = r.personName;
          if (r.type === 'gave') {
            if (!gavePeopleMap[key]) gavePeopleMap[key] = { name: key, records: [], total: 0 };
            gavePeopleMap[key].records.push({ amount: r.amount, date: formatDate(r.date) });
            gavePeopleMap[key].total += r.amount;
          } else {
            if (!tookPeopleMap[key]) tookPeopleMap[key] = { name: key, records: [], total: 0 };
            tookPeopleMap[key].records.push({ amount: r.amount, date: formatDate(r.date) });
            tookPeopleMap[key].total += r.amount;
          }
        }
        // Net per person — only show if net positive in that direction
        const gavePeople = [];
        const tookPeople = [];
        const allPeople  = new Set([...Object.keys(gavePeopleMap), ...Object.keys(tookPeopleMap)]);
        let totalOwedToYou = 0;
        let totalYouOwe    = 0;
        for (const name of allPeople) {
          const gave = gavePeopleMap[name]?.total ?? 0;
          const took = tookPeopleMap[name]?.total ?? 0;
          const net  = gave - took;
          if (net > 0) {
            totalOwedToYou += net;
            gavePeople.push({ name, records: gavePeopleMap[name]?.records ?? [], total: net });
          } else if (net < 0) {
            totalYouOwe += Math.abs(net);
            tookPeople.push({ name, records: tookPeopleMap[name]?.records ?? [], total: Math.abs(net) });
          }
        }
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, lendBalancesMessage(gavePeople, tookPeople, totalOwedToYou, totalYouOwe));
      } else if (userInput === '4') {
        // Settle up
        const { people } = await getLendBorrowSummary(phone);
        if (people.length === 0) {
          user.currentStep = 'main_menu';
          await user.save();
          await send(sock, jid, lendAllClearMessage());
          return;
        }
        user.tempData = { settlePeople: people };
        user.markModified('tempData');
        user.currentStep = 'lend_settle_select';
        await user.save();
        await send(sock, jid, lendSettleSelectMessage(people));
      } else if (userInput === '0') {
        user.currentStep = 'main_menu';
        await user.save();
        await send(sock, jid, cancelledMessage(user.balance));
      } else {
        const { totalOwedToYou, totalYouOwe } = await getLendBorrowSummary(phone);
        await send(sock, jid, lendBorrowMenuMessage(totalOwedToYou, totalYouOwe));
      }
      break;
    }

    // ── Lend: person selection ────────────────────────────────────────────────
    case 'lend_person_select': {
      const lendType = user.tempData?.pendingLendType ?? 'gave';
      let personName;
      const allRecords    = await LendBorrow.find({ phone });
      const uniquePeople  = [...new Set(allRecords.map((r) => r.personName))];
      const index         = parseInt(userInput, 10);
      if (!isNaN(index) && index >= 1 && index <= uniquePeople.length) {
        personName = uniquePeople[index - 1];
      } else {
        // Treat as new name — capitalise first letter
        personName = userInput.trim().charAt(0).toUpperCase() + userInput.trim().slice(1);
      }
      if (!personName) {
        await send(sock, jid, { text: '⚠️ Please enter a valid name.\n_Type *0* to cancel_' });
        return;
      }
      user.tempData = { pendingLendType: lendType, lendPerson: personName };
      user.markModified('tempData');
      user.currentStep = 'lend_amount_entry';
      await user.save();
      await send(sock, jid, lendAskAmountMessage(lendType, personName));
      break;
    }

    // ── Lend: amount entry ────────────────────────────────────────────────────
    case 'lend_amount_entry': {
      const amount     = parseFloat(userInput);
      const lendType   = user.tempData?.pendingLendType ?? 'gave';
      const personName = user.tempData?.lendPerson ?? '';
      if (isNaN(amount) || amount <= 0) {
        await send(sock, jid, { text: '⚠️ Enter a valid amount in ₹\n_Type *0* to cancel_' });
        return;
      }
      await LendBorrow.create({ phone, personName, type: lendType, amount, date: new Date() });
      // Calculate net outstanding with this person
      const records = await LendBorrow.find({ phone, personName, settled: false });
      const gave    = records.filter((r) => r.type === 'gave').reduce((s, r) => s + r.amount, 0);
      const took    = records.filter((r) => r.type === 'took').reduce((s, r) => s + r.amount, 0);
      const net     = Math.abs(gave - took);
      user.currentStep = 'main_menu';
      user.tempData    = {};
      user.markModified('tempData');
      await user.save();
      const dateStr = formatDate(new Date());
      if (lendType === 'gave') {
        await send(sock, jid, lendGaveConfirmedMessage(personName, amount, net, dateStr));
      } else {
        await send(sock, jid, lendTookConfirmedMessage(personName, amount, net, dateStr));
      }
      return;
    }

    // ── Lend: settle — select person ──────────────────────────────────────────
    case 'lend_settle_select': {
      const { people } = await getLendBorrowSummary(phone);
      const index = parseInt(userInput, 10);
      if (isNaN(index) || index < 1 || index > people.length) {
        await send(sock, jid, { text: `⚠️ Please enter a number between 1 and ${people.length}.\n_Type *0* to cancel_` });
        return;
      }
      const selected = people[index - 1];
      user.tempData = { settlePerson: selected.name, settleNet: selected.net, settleDirection: selected.direction };
      user.markModified('tempData');
      user.currentStep = 'lend_settle_amount';
      await user.save();
      await send(sock, jid, lendSettleAmountMessage(selected.name, selected.net));
      break;
    }

    // ── Lend: settle — enter amount ───────────────────────────────────────────
    case 'lend_settle_amount': {
      const { settlePerson, settleNet, settleDirection } = user.tempData ?? {};
      const dateStr = formatDate(new Date());

      if (inputUpper === 'FULL') {
        // Mark all unsettled records for this person as settled
        await LendBorrow.updateMany(
          { phone, personName: settlePerson, settled: false },
          { settled: true, settledAt: new Date() },
        );
        user.currentStep = 'main_menu';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, lendFullSettledMessage(settlePerson, settleNet, dateStr));
        return;
      }

      const partial = parseFloat(userInput);
      if (isNaN(partial) || partial <= 0 || partial >= settleNet) {
        await send(sock, jid, {
          text: `⚠️ Enter an amount less than ₹${settleNet}.\nType *FULL* to settle completely.\n_Type *0* to cancel_`,
        });
        return;
      }

      // Create an opposite record to offset the balance
      const oppositeType = settleDirection === 'owes_you' ? 'took' : 'gave';
      await LendBorrow.create({ phone, personName: settlePerson, type: oppositeType, amount: partial, date: new Date() });
      const remaining = settleNet - partial;

      user.currentStep = 'main_menu';
      user.tempData    = {};
      user.markModified('tempData');
      await user.save();
      await send(sock, jid, lendPartialSettledMessage(settlePerson, partial, remaining, dateStr));
      return;
    }

    // ── Reset: choose type ────────────────────────────────────────────────────
    case 'reset_type_confirm': {
      if (userInput === '1') {
        user.tempData = { resetChoice: 'transactions_only' };
        user.markModified('tempData');
        user.currentStep = 'reset_keep_categories';
        await user.save();
        await send(sock, jid, resetKeepCategoriesMessage());

      } else if (userInput === '2') {
        const txCount = await Transaction.countDocuments({ phone });
        user.tempData = { resetChoice: 'full', keepCategories: false, keepBudgets: false };
        user.markModified('tempData');
        user.currentStep = 'reset_final_confirm';
        await user.save();
        await send(sock, jid, resetFinalConfirmMessage('full', false, user.balance, txCount));

      } else {
        await send(sock, jid, { text: '⚠️ Please reply *1* or *2* to choose a reset type.\n_Type *0* to cancel._' });
      }
      break;
    }

    // ── Reset: keep categories? ───────────────────────────────────────────────
    case 'reset_keep_categories': {
      if (inputUpper !== 'YES' && inputUpper !== 'NO') {
        await send(sock, jid, { text: '⚠️ Please reply *YES* to keep or *NO* to clear.\n_Type *0* to cancel._' });
        return;
      }

      const keepCategories = inputUpper === 'YES';
      const txCount = await Transaction.countDocuments({ phone });
      user.tempData = { ...user.tempData, keepCategories, keepBudgets: keepCategories };
      user.markModified('tempData');
      user.currentStep = 'reset_final_confirm';
      await user.save();
      await send(sock, jid, resetFinalConfirmMessage('transactions_only', keepCategories, user.balance, txCount));
      break;
    }

    // ── Reset: execute on CONFIRM ─────────────────────────────────────────────
    case 'reset_final_confirm': {
      if (inputUpper !== 'CONFIRM') {
        await send(sock, jid, resetConfirmNudgeMessage());
        return;
      }

      const { resetChoice, keepCategories = false, keepBudgets = false } = user.tempData ?? {};
      const txCount = await Transaction.countDocuments({ phone });

      // Save audit log FIRST — never lost
      await ResetLog.create({
        phone,
        resetType: resetChoice,
        keptCategories: keepCategories,
        keptBudgets: keepBudgets,
        balanceBeforeReset: user.balance,
        transactionCount: txCount,
        performedAt: new Date(),
      });

      await Transaction.deleteMany({ phone });

      if (resetChoice === 'full') {
        await Category.deleteMany({ phone });
        await Budget.deleteMany({ phone });
        await IncomeCategory.deleteMany({ phone });
        await seedCategories(phone);
        await seedIncomeCategories(phone);
        user.balance     = 0;
        user.name        = null;
        user.currentStep = 'awaiting_name';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, fullResetSuccessMessage(txCount));

      } else {
        if (!keepCategories) {
          await Category.deleteMany({ phone });
          await Budget.deleteMany({ phone });
          await IncomeCategory.deleteMany({ phone });
          await seedCategories(phone);
          await seedIncomeCategories(phone);
        }
        user.balance     = 0;
        user.currentStep = 'main_menu';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, resetSuccessMessage(txCount, keepCategories, keepBudgets));
      }
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
