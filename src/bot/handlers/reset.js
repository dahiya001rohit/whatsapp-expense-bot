'use strict';

const Transaction    = require('../../models/Transaction');
const Category       = require('../../models/Category');
const Budget         = require('../../models/Budget');
const IncomeCategory = require('../../models/IncomeCategory');
const ResetLog       = require('../../models/ResetLog');
const { send }       = require('../helpers/send');
const { seedCategories, seedIncomeCategories } = require('../helpers/db');
const {
  resetTypeMessage, resetKeepCategoriesMessage, resetFinalConfirmMessage,
  resetSuccessMessage, fullResetSuccessMessage, resetConfirmNudgeMessage,
} = require('../../utils/messages');

async function handleResetTypeConfirm(sock, jid, user, phone, userInput) {
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
}

async function handleResetKeepCategories(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  if (inputUpper !== 'YES' && inputUpper !== 'NO') {
    await send(sock, jid, { text: '⚠️ Please reply *YES* to keep or *NO* to clear.\n_Type *0* to cancel._' });
    return;
  }
  const keepCategories = inputUpper === 'YES';
  const txCount        = await Transaction.countDocuments({ phone });
  user.tempData = { ...user.tempData, keepCategories, keepBudgets: keepCategories };
  user.markModified('tempData');
  user.currentStep = 'reset_final_confirm';
  await user.save();
  await send(sock, jid, resetFinalConfirmMessage('transactions_only', keepCategories, user.balance, txCount));
}

async function handleResetFinalConfirm(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  if (inputUpper !== 'CONFIRM') {
    await send(sock, jid, resetConfirmNudgeMessage());
    return;
  }
  const { resetChoice, keepCategories = false, keepBudgets = false } = user.tempData ?? {};
  const txCount = await Transaction.countDocuments({ phone });

  await ResetLog.create({
    phone, resetType: resetChoice, keptCategories: keepCategories,
    keptBudgets: keepBudgets, balanceBeforeReset: user.balance,
    transactionCount: txCount, performedAt: new Date(),
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
}

module.exports = { handleResetTypeConfirm, handleResetKeepCategories, handleResetFinalConfirm };
