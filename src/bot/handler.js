'use strict';

const User         = require('../models/User');
const { send }     = require('./helpers/send');
const { GREETINGS } = require('./helpers/constants');
const {
  welcomeMessage, balanceMessage, cancelledMessage,
  moreMenuMessage, askNameMessage, unrecognisedMessage, fmt,
} = require('../utils/messages');

const { handleOnboarding }                    = require('./handlers/onboarding');
const { handleMainMenu }                      = require('./handlers/mainMenu');
const { handleAwaitingAmount, handleIncomeCategory, handleCreditNote } = require('./handlers/credit');
const { handleAwaitingDebitAmount, handleCategory, handleDebitNote, handleNegativeConfirm } = require('./handlers/debit');
const { handleManageBudgets, handleBudgetAmount } = require('./handlers/budgets');
const {
  handleManageCategories, handleManageSpendingCategories,
  handleNewCategoryName, handleDeleteCategory,
  handleManageIncomeCategories, handleNewIncomeCategory, handleDeleteIncomeCategory,
} = require('./handlers/categories');
const {
  handleLendBorrowMenu, handleLendPersonSelect,
  handleLendAmountEntry, handleLendSettleSelect, handleLendSettleAmount,
} = require('./handlers/lendBorrow');
const { handleResetTypeConfirm, handleResetKeepCategories, handleResetFinalConfirm } = require('./handlers/reset');
const { handleMoreMenu }                      = require('./handlers/moreMenu');

const DISPATCH = {
  awaiting_name:                   handleOnboarding,
  main_menu:                       handleMainMenu,
  more_menu:                       handleMoreMenu,
  awaiting_amount:                 handleAwaitingAmount,
  awaiting_income_category:        handleIncomeCategory,
  awaiting_credit_note:            handleCreditNote,
  awaiting_debit_amount:           handleAwaitingDebitAmount,
  awaiting_category:               handleCategory,
  awaiting_debit_note:             handleDebitNote,
  awaiting_negative_confirm:       handleNegativeConfirm,
  manage_budgets:                  handleManageBudgets,
  awaiting_budget_amount:          handleBudgetAmount,
  manage_categories:               handleManageCategories,
  manage_spending_categories:      handleManageSpendingCategories,
  awaiting_new_category_name:      handleNewCategoryName,
  awaiting_delete_category:        handleDeleteCategory,
  manage_income_categories:        handleManageIncomeCategories,
  awaiting_new_income_category:    handleNewIncomeCategory,
  awaiting_delete_income_category: handleDeleteIncomeCategory,
  lend_borrow_menu:                handleLendBorrowMenu,
  lend_person_select:              handleLendPersonSelect,
  lend_amount_entry:               handleLendAmountEntry,
  lend_settle_select:              handleLendSettleSelect,
  lend_settle_amount:              handleLendSettleAmount,
  reset_type_confirm:              handleResetTypeConfirm,
  reset_keep_categories:           handleResetKeepCategories,
  reset_final_confirm:             handleResetFinalConfirm,
};

async function handleMessage(sock, message) {
  const jid = message.key.remoteJid;
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
  if (message.key.fromMe) return;

  const msg = message.message;
  if (!msg) return;

  const userInput = (msg.conversation || msg.extendedTextMessage?.text || '').trim();
  if (!userInput) return;

  const phone      = jid.split('@')[0];
  let   user       = await User.findOne({ phone });
  const inputLower = userInput.toLowerCase();
  const inputUpper = userInput.toUpperCase();

  console.log(`📨  [${phone}] step: ${user?.currentStep ?? 'none'} | input: "${userInput}"`);

  if (!user) {
    user = await User.create({ phone, currentStep: 'awaiting_name', tempData: {} });
    await send(sock, jid, askNameMessage());
    return;
  }

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
    user.notifStatus = 'none';
    await user.save();
  }

  if (GREETINGS.has(inputLower) && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, welcomeMessage(user.name, user.balance));
    return;
  }

  if (inputUpper === 'BAL') {
    await send(sock, jid, balanceMessage(user.name, user.balance));
    return;
  }

  if (inputUpper === 'MORE') {
    user.tempData = { ...user.tempData, previousStep: user.currentStep };
    user.markModified('tempData');
    user.currentStep = 'more_menu';
    await user.save();
    await send(sock, jid, moreMenuMessage());
    return;
  }

  if (userInput === '0' && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, cancelledMessage(user.balance));
    return;
  }

  const handler = DISPATCH[user.currentStep];
  if (handler) {
    await handler(sock, jid, user, phone, userInput, inputLower, inputUpper);
  } else {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, unrecognisedMessage());
  }
}

module.exports = { handleMessage };
