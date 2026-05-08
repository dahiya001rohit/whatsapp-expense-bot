'use strict';

const Transaction         = require('../../models/Transaction');
const { send }            = require('../helpers/send');
const { getCategories }   = require('../helpers/db');
const { checkBudgetAlert } = require('../helpers/budgetAlert');
const {
  invalidDebitMessage, negativeWarningMessage, askDebitNoteMessage,
  selectCategoryMessage, invalidCategoryMessage,
  withdrawConfirmedMessage, negativeWithdrawConfirmedMessage,
  withdrawCancelledMessage, needYesOrNoMessage,
} = require('../../utils/messages');

async function handleAwaitingDebitAmount(sock, jid, user, phone, userInput) {
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
    user.tempData = { pendingAmount: amount, pendingCategory: 'Uncategorised' };
    user.markModified('tempData');
    user.currentStep = 'awaiting_debit_note';
    await user.save();
    await send(sock, jid, askDebitNoteMessage());
    return;
  }
  user.tempData = { pendingAmount: amount, pendingType: 'debit' };
  user.markModified('tempData');
  user.currentStep = 'awaiting_category';
  await user.save();
  await send(sock, jid, selectCategoryMessage(cats));
}

async function handleCategory(sock, jid, user, phone, userInput) {
  const cats         = await getCategories(phone);
  const index        = parseInt(userInput, 10);
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
  user.tempData = { ...user.tempData, pendingCategory: category };
  user.markModified('tempData');
  user.currentStep = 'awaiting_debit_note';
  await user.save();
  await send(sock, jid, askDebitNoteMessage());
}

async function handleDebitNote(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  const note          = inputUpper === 'SKIP' ? '' : userInput;
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

module.exports = { handleAwaitingDebitAmount, handleCategory, handleDebitNote, handleNegativeConfirm };
