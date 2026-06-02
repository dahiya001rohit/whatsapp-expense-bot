'use strict';

const Transaction    = require('../../models/Transaction');
const { send }       = require('../helpers/send');
const { getIncomeCategories } = require('../helpers/db');
const {
  invalidDepositMessage, selectIncomeCategoryMessage, invalidCategoryMessage,
  askCreditNoteMessage, depositConfirmedMessage,
} = require('../../utils/messages');

// FIXED: reject amounts above ₹1 crore and non-finite values
const MAX_AMOUNT = 10_000_000;

async function handleAwaitingAmount(sock, jid, user, phone, userInput) {
  const amount = parseFloat(userInput.trim());
  // FIXED: guard against NaN, Infinity, zero, negative, and absurdly large amounts
  if (isNaN(amount) || !isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    await send(sock, jid, invalidDepositMessage());
    return;
  }
  const incomeCats = await getIncomeCategories(phone);
  user.tempData = { pendingIncomeAmount: amount };
  user.markModified('tempData');
  user.currentStep = 'awaiting_income_category';
  await user.save();
  await send(sock, jid, selectIncomeCategoryMessage(incomeCats));
}

async function handleIncomeCategory(sock, jid, user, phone, userInput) {
  const incomeCats = await getIncomeCategories(phone);
  const index      = parseInt(userInput, 10);
  if (isNaN(index) || index < 1 || index > incomeCats.length) {
    await send(sock, jid, invalidCategoryMessage(incomeCats.length));
    return;
  }
  const category = incomeCats[index - 1].name;
  user.tempData  = { ...user.tempData, pendingIncomeCategory: category };
  user.markModified('tempData');
  user.currentStep = 'awaiting_credit_note';
  await user.save();
  await send(sock, jid, askCreditNoteMessage());
}

async function handleCreditNote(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  // FIXED: cap note at 200 chars to prevent bloated DB documents
  const note        = inputUpper === 'SKIP' ? '' : userInput.slice(0, 200);
  const amount      = user.tempData?.pendingIncomeAmount ?? 0;
  const category    = user.tempData?.pendingIncomeCategory ?? 'Other Income';
  const prevBalance = user.balance;
  user.balance          += amount;
  user.currentStep       = 'main_menu';
  user.tempData          = {};
  user.lastTransactionAt = new Date();
  user.markModified('tempData');
  await user.save();
  await Transaction.create({ phone, type: 'credit', amount, category, note, previousBalance: prevBalance, newBalance: user.balance });
  await send(sock, jid, depositConfirmedMessage(amount, category, prevBalance, user.balance));
}

module.exports = { handleAwaitingAmount, handleIncomeCategory, handleCreditNote };
