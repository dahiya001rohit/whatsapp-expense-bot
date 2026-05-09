'use strict';

const User         = require('../models/User');
const { send }     = require('./helpers/send');
const { GREETINGS } = require('./helpers/constants');
const {
  welcomeMessage, balanceMessage, cancelledMessage,
  moreMenuMessage, askNameMessage, unrecognisedMessage, fmt,
  txnRangeSelectMessage, resetTypeMessage,
} = require('../utils/messages');

const { handleOnboarding, handleAwaitingActualPhone } = require('./handlers/onboarding');
const { handleMainMenu }                      = require('./handlers/mainMenu');
const { handleAwaitingAmount, handleIncomeCategory, handleCreditNote } = require('./handlers/credit');
const {
  handleAwaitingDebitAmount, handleCategory, handleCategoryPage,
  handleDebitNote, handleNegativeConfirm,
} = require('./handlers/debit');
const { handleManageBudgets, handleBudgetAmount } = require('./handlers/budgets');
const {
  handleManageCategories, handleManageSpendingCategories,
  handleNewCategoryName, handleDeleteCategory,
  handleManageIncomeCategories, handleNewIncomeCategory, handleDeleteIncomeCategory,
  handleCategoriesBudgetsMenu,
} = require('./handlers/categories');
const {
  handleLendBorrowMenu, handleLendPersonSelect,
  handleLendAmountEntry, handleLendSettleSelect, handleLendSettleAmount,
} = require('./handlers/lendBorrow');
const { handleResetTypeConfirm, handleResetKeepCategories, handleResetFinalConfirm } = require('./handlers/reset');
const { handleMoreMenu }          = require('./handlers/moreMenu');
const {
  handleSmartInsights,
  handleSmartInsightsDrillSpend,
  handleSmartInsightsDrillIncome,
  handleDrillTxnPage,
} = require('./handlers/smartInsights');
const { handleTxnRangeSelect, handleTxnView, handleTxnViewPage } = require('./handlers/txnHistory');

// ── States where NEXT / PREV are active ──────────────────────────────────────
const PAGINATED_STATES = new Set([
  'txn_view',
  'awaiting_category',
  'smart_insights_drill_spend_txns',
  'smart_insights_drill_income_txns',
]);

const DISPATCH = {
  awaiting_name:                        handleOnboarding,
  awaiting_actual_phone:                handleAwaitingActualPhone,
  main_menu:                            handleMainMenu,
  more_menu:                            handleMoreMenu,
  awaiting_amount:                      handleAwaitingAmount,
  awaiting_income_category:             handleIncomeCategory,
  awaiting_credit_note:                 handleCreditNote,
  awaiting_debit_amount:                handleAwaitingDebitAmount,
  awaiting_category:                    handleCategory,
  awaiting_debit_note:                  handleDebitNote,
  awaiting_negative_confirm:            handleNegativeConfirm,
  manage_budgets:                       handleManageBudgets,
  awaiting_budget_amount:               handleBudgetAmount,
  categories_budgets_menu:              handleCategoriesBudgetsMenu,
  manage_categories:                    handleManageCategories,
  manage_spending_categories:           handleManageSpendingCategories,
  awaiting_new_category_name:           handleNewCategoryName,
  awaiting_delete_category:             handleDeleteCategory,
  manage_income_categories:             handleManageIncomeCategories,
  awaiting_new_income_category:         handleNewIncomeCategory,
  awaiting_delete_income_category:      handleDeleteIncomeCategory,
  lend_borrow_menu:                     handleLendBorrowMenu,
  lend_person_select:                   handleLendPersonSelect,
  lend_amount_entry:                    handleLendAmountEntry,
  lend_settle_select:                   handleLendSettleSelect,
  lend_settle_amount:                   handleLendSettleAmount,
  reset_type_confirm:                   handleResetTypeConfirm,
  reset_keep_categories:                handleResetKeepCategories,
  reset_final_confirm:                  handleResetFinalConfirm,
  // Smart Insights
  smart_insights:                       handleSmartInsights,
  smart_insights_drill_spend:           handleSmartInsightsDrillSpend,
  smart_insights_drill_income:          handleSmartInsightsDrillIncome,
  smart_insights_drill_spend_txns:      null, // navigation only via NEXT/PREV
  smart_insights_drill_income_txns:     null,
  // Transaction History
  txn_range_select:                     handleTxnRangeSelect,
  txn_view:                             handleTxnView,
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
  let   user       = await User.findOne({ jid: jid });
  
  // Fallback to phone if jid is not yet saved
  if (!user) {
    user = await User.findOne({ phone });
    if (user) {
      user.jid = jid;
      await user.save();
    }
  }

  const inputLower = userInput.toLowerCase();
  const inputUpper = userInput.toUpperCase();

  console.log(`📨  [${phone}] step: ${user?.currentStep ?? 'none'} | input: "${userInput}"`);

  if (!user) {
    user = await User.create({ phone, jid, currentStep: 'awaiting_name', tempData: {} });
    await send(sock, jid, askNameMessage());
    return;
  }

  // ── Nudge reply handling ──────────────────────────────────────────────────
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

  // ── Global: greeting ──────────────────────────────────────────────────────
  if (GREETINGS.has(inputLower) && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, welcomeMessage(user.name, user.balance));
    return;
  }

  // ── Global: BAL ───────────────────────────────────────────────────────────
  if (inputUpper === 'BAL') {
    await send(sock, jid, balanceMessage(user.name, user.balance));
    return;
  }

  // ── Global: MORE ─────────────────────────────────────────────────────────
  if (inputUpper === 'MORE') {
    user.tempData = { ...user.tempData, previousStep: user.currentStep };
    user.markModified('tempData');
    user.currentStep = 'more_menu';
    await user.save();
    await send(sock, jid, moreMenuMessage());
    return;
  }

  // ── Global: TXN ──────────────────────────────────────────────────────────
  if (inputUpper === 'TXN' && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'txn_range_select';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, txnRangeSelectMessage());
    return;
  }

  // ── Global: PDF (only in smart_insights state) ────────────────────────────
  if (inputUpper === 'PDF' && user.currentStep === 'smart_insights') {
    const { handleSmartInsightsPdf } = require('./handlers/smartInsights');
    await handleSmartInsightsPdf(sock, jid, user, phone);
    return;
  }

  // ── Global: RESET ─────────────────────────────────────────────────────────
  if (inputUpper === 'RESET' && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'reset_type_confirm';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, resetTypeMessage());
    return;
  }

  // ── Global: NEXT / PREV (only in paginated states) ───────────────────────
  if ((inputUpper === 'NEXT' || inputUpper === 'PREV') && PAGINATED_STATES.has(user.currentStep)) {
    if (user.currentStep === 'txn_view') {
      await handleTxnViewPage(sock, jid, user, phone, inputUpper);
    } else if (user.currentStep === 'awaiting_category') {
      await handleCategoryPage(sock, jid, user, phone, inputUpper);
    } else if (
      user.currentStep === 'smart_insights_drill_spend_txns' ||
      user.currentStep === 'smart_insights_drill_income_txns'
    ) {
      await handleDrillTxnPage(sock, jid, user, phone, inputUpper);
    }
    return;
  }

  // ── Global: 0 — cancel / back ─────────────────────────────────────────────
  if (userInput === '0' && user.currentStep !== 'awaiting_name') {
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, cancelledMessage(user.balance));
    return;
  }

  // ── Dispatch to state handler ─────────────────────────────────────────────
  const handler = DISPATCH[user.currentStep];
  if (handler) {
    await handler(sock, jid, user, phone, userInput, inputLower, inputUpper);
  } else if (handler === null) {
    // Paginated view-only states — remind navigation
    await send(sock, jid, { text: '⚠️ Use *NEXT* / *PREV* to navigate, or *0* to cancel.' });
  } else {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, unrecognisedMessage());
  }
}

module.exports = { handleMessage };
