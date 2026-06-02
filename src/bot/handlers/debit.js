'use strict';

const Transaction         = require('../../models/Transaction');
const { send }            = require('../helpers/send');
const { getCategories }   = require('../helpers/db');
const { checkBudgetAlert } = require('../helpers/budgetAlert');
const { startOfMonth }    = require('../helpers/constants');
const {
  invalidDebitMessage, negativeWarningMessage, askDebitNoteMessage,
  selectCategoryPagedMessage, withdrawConfirmedMessage,
  negativeWithdrawConfirmedMessage, withdrawCancelledMessage, needYesOrNoMessage,
} = require('../../utils/messages');

// FIXED: reject amounts above ₹1 crore and non-finite values
const MAX_AMOUNT    = 10_000_000;
const CAT_PAGE_SIZE = 10;

async function getCategoriesSortedBySpend(phone) {
  const [cats, spendAgg] = await Promise.all([
    getCategories(phone),
    Transaction.aggregate([
      { $match: { phone, type: 'debit', createdAt: { $gte: startOfMonth() } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);
  const spendMap = {};
  spendAgg.forEach((r) => { spendMap[r._id] = r.total; });
  return cats.slice().sort((a, b) => (spendMap[b.name] ?? 0) - (spendMap[a.name] ?? 0));
}

function catPageSlice(allCats, page) {
  const totalPages = Math.max(1, Math.ceil(allCats.length / CAT_PAGE_SIZE));
  const safePage   = Math.min(Math.max(page, 1), totalPages);
  const offset     = (safePage - 1) * CAT_PAGE_SIZE;
  const slice      = allCats.slice(offset, offset + CAT_PAGE_SIZE);
  return { slice, safePage, totalPages, offset };
}

// ── awaiting_debit_amount ─────────────────────────────────────────────────────

async function handleAwaitingDebitAmount(sock, jid, user, phone, userInput) {
  const amount = parseFloat(userInput.trim());
  // FIXED: guard against NaN, Infinity, zero, negative, and absurdly large amounts
  if (isNaN(amount) || !isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    await send(sock, jid, invalidDebitMessage(user.balance));
    return;
  }

  const allCats = await getCategoriesSortedBySpend(phone);

  if (allCats.length === 0) {
    if (amount > user.balance) {
      user.tempData = { pendingAmount: amount, pendingType: 'debit', pendingCategory: 'Uncategorised' };
      user.markModified('tempData');
      user.currentStep = 'awaiting_negative_confirm';
      await user.save();
      await send(sock, jid, negativeWarningMessage(user.balance, amount));
      return;
    }
    user.tempData = { pendingAmount: amount, pendingCategory: 'Uncategorised' };
    user.markModified('tempData');
    user.currentStep = 'awaiting_debit_note';
    await user.save();
    await send(sock, jid, askDebitNoteMessage());
    return;
  }

  const { slice, safePage, totalPages, offset } = catPageSlice(allCats, 1);
  user.tempData = {
    pendingAmount: amount,
    pendingType: 'debit',
    allCats: allCats.map((c) => c.name),
    catPage: safePage,
  };
  user.markModified('tempData');
  user.currentStep = 'awaiting_category';
  await user.save();
  await send(sock, jid, selectCategoryPagedMessage(slice, safePage, totalPages, offset));
}

// ── awaiting_category ─────────────────────────────────────────────────────────

async function handleCategory(sock, jid, user, phone, userInput) {
  const allCatNames = user.tempData?.allCats ?? [];
  const catPage     = user.tempData?.catPage ?? 1;
  const index       = parseInt(userInput, 10);

  if (isNaN(index) || index < 1 || index > allCatNames.length) {
    await send(sock, jid, {
      text: `⚠️ Enter a number between 1 and ${allCatNames.length}.\n_Type *0* to cancel._`,
    });
    return;
  }

  const category      = allCatNames[index - 1];
  const pendingAmount = user.tempData.pendingAmount;

  if (pendingAmount > user.balance) {
    user.tempData = { pendingAmount, pendingType: 'debit', pendingCategory: category };
    user.markModified('tempData');
    user.currentStep = 'awaiting_negative_confirm';
    await user.save();
    await send(sock, jid, negativeWarningMessage(user.balance, pendingAmount));
    return;
  }

  user.tempData = { ...user.tempData, pendingCategory: category };
  user.markModified('tempData');
  user.currentStep = 'awaiting_debit_note';
  await user.save();
  await send(sock, jid, askDebitNoteMessage());
}

// ── NEXT / PREV category pagination ──────────────────────────────────────────

async function handleCategoryPage(sock, jid, user, phone, direction) {
  const allCatNames = user.tempData?.allCats ?? [];
  const catPage     = user.tempData?.catPage ?? 1;
  const totalPages  = Math.max(1, Math.ceil(allCatNames.length / CAT_PAGE_SIZE));
  const newPage     = direction === 'NEXT' ? catPage + 1 : catPage - 1;

  if (newPage < 1 || newPage > totalPages) {
    await send(sock, jid, { text: `⚠️ You're on page ${catPage}/${totalPages}.` });
    return;
  }

  const { slice, safePage, offset } = catPageSlice(allCatNames.map((n) => ({ name: n })), newPage);
  user.tempData = { ...user.tempData, catPage: safePage };
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, selectCategoryPagedMessage(slice, safePage, totalPages, offset));
}

// ── awaiting_debit_note ───────────────────────────────────────────────────────

async function handleDebitNote(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  // FIXED: cap note at 200 chars to prevent bloated DB documents
  const note          = inputUpper === 'SKIP' ? '' : userInput.slice(0, 200);
  const pendingAmount = user.tempData?.pendingAmount ?? 0;
  const category      = user.tempData?.pendingCategory ?? 'Uncategorised';
  const prevBalance   = user.balance;
  user.balance          -= pendingAmount;
  user.currentStep       = 'main_menu';
  user.tempData          = {};
  user.lastTransactionAt = new Date();
  user.markModified('tempData');
  await user.save();
  await Transaction.create({ phone, type: 'debit', amount: pendingAmount, category, note, previousBalance: prevBalance, newBalance: user.balance });
  await send(sock, jid, withdrawConfirmedMessage(pendingAmount, category, prevBalance, user.balance));
  await checkBudgetAlert(sock, jid, phone, category);
}

// ── awaiting_negative_confirm ─────────────────────────────────────────────────

async function handleNegativeConfirm(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  const { pendingAmount = 0, pendingCategory = 'Uncategorised' } = user.tempData ?? {};
  if (inputUpper === 'YES') {
    const prevBalance      = user.balance;
    user.balance          -= pendingAmount;
    user.currentStep       = 'main_menu';
    user.tempData          = {};
    user.lastTransactionAt = new Date();
    user.markModified('tempData');
    await user.save();
    await Transaction.create({ phone, type: 'debit', amount: pendingAmount, category: pendingCategory, previousBalance: prevBalance, newBalance: user.balance });
    await send(sock, jid, negativeWithdrawConfirmedMessage(pendingAmount, pendingCategory, prevBalance, user.balance));
    await checkBudgetAlert(sock, jid, phone, pendingCategory);
  } else if (inputUpper === 'NO') {
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, withdrawCancelledMessage(user.balance));
  } else {
    await send(sock, jid, needYesOrNoMessage());
  }
}

module.exports = {
  handleAwaitingDebitAmount,
  handleCategory,
  handleCategoryPage,
  handleDebitNote,
  handleNegativeConfirm,
};
