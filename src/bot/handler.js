'use strict';

const User         = require('../models/User');
const { send }     = require('./helpers/send');
const { GREETINGS } = require('./helpers/constants');
const {
  welcomeMessage, balanceMessage, cancelledMessage,
  moreMenuMessage, askNameMessage, unrecognisedMessage, fmt,
  txnRangeSelectMessage, resetTypeMessage,
} = require('../utils/messages');

const { handleOnboarding }    = require('./handlers/onboarding');
const { handleMainMenu }      = require('./handlers/mainMenu');
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
const { handleMoreMenu }      = require('./handlers/moreMenu');
const {
  handleSmartInsights,
  handleSmartInsightsDrillSpend,
  handleSmartInsightsDrillIncome,
  handleDrillTxnPage,
} = require('./handlers/smartInsights');
const { handleTxnRangeSelect, handleTxnView, handleTxnViewPage } = require('./handlers/txnHistory');

// ── States where NEXT / PREV navigation is active ────────────────────────────
const PAGINATED_STATES = new Set([
  'txn_view',
  'awaiting_category',
  'smart_insights_drill_spend_txns',
  'smart_insights_drill_income_txns',
]);

// FIXED: states where an idle user should be timed out and returned to main_menu
// Menu/view states are excluded — only transient input-awaiting states timeout
const TIMEOUT_STATES = new Set([
  'awaiting_amount', 'awaiting_income_category', 'awaiting_credit_note',
  'awaiting_debit_amount', 'awaiting_category', 'awaiting_debit_note',
  'awaiting_negative_confirm', 'reset_type_confirm', 'reset_keep_categories',
  'reset_final_confirm', 'lend_person_select', 'lend_amount_entry',
  'lend_settle_select', 'lend_settle_amount', 'awaiting_budget_amount',
  'awaiting_new_category_name', 'awaiting_delete_category',
  'awaiting_new_income_category', 'awaiting_delete_income_category',
]);

const SESSION_TIMEOUT_MS = 30 * 60 * 1_000; // 30 minutes

const _processingUsers = new Set();

const DISPATCH = {
  awaiting_name:                        handleOnboarding,
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
  smart_insights:                       handleSmartInsights,
  smart_insights_drill_spend:           handleSmartInsightsDrillSpend,
  smart_insights_drill_income:          handleSmartInsightsDrillIncome,
  smart_insights_drill_spend_txns:      null, // navigation-only via NEXT/PREV
  smart_insights_drill_income_txns:     null,
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

  const phone = jid.split('@')[0];

  // FIXED: per-user mutex — drop concurrent messages from same user
  if (_processingUsers.has(phone)) {
    console.log(`⏭️  Already processing ${phone}, skipping`);
    return;
  }
  _processingUsers.add(phone);

  try {
    let user = await User.findOne({ jid });

    // Fallback: match by phone if jid not yet saved
    if (!user) {
      user = await User.findOne({ phone });
      if (user) { user.jid = jid; await user.save(); }
    }

    const inputLower = userInput.toLowerCase();
    const inputUpper = userInput.toUpperCase();

    console.log(`📨  [${phone}] step=${user?.currentStep ?? 'none'} | "${userInput}"`);

    // ── Brand-new user ──────────────────────────────────────────────────────
    if (!user) {
      user = await User.create({ phone, jid, currentStep: 'awaiting_name', tempData: {} });
      await send(sock, jid, askNameMessage());
      return;
    }

    // FIXED: session timeout — if user was mid-flow and hasn't interacted in
    // 30 min, reset to main_menu so they're not stuck in a dead state
    if (TIMEOUT_STATES.has(user.currentStep)) {
      const lastActive = user.tempData?.lastActiveAt;
      if (lastActive && (Date.now() - Number(lastActive)) > SESSION_TIMEOUT_MS) {
        user.currentStep = 'main_menu';
        user.tempData    = {};
        user.markModified('tempData');
        await user.save();
        await send(sock, jid, {
          text: `⏱️ Your session timed out after 30 min.\n\n${welcomeMessage(user.name, user.balance).text}`,
        });
        return;
      }
    }

    // ── Nudge reply ─────────────────────────────────────────────────────────
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
        await send(sock, jid, { text: `All good! 💪 Balance: *₹${fmt(user.balance)}*\n\nType *hi* anytime.` });
        return;
      }
      user.notifStatus = 'none';
      await user.save();
    }

    // ── Global: greeting ────────────────────────────────────────────────────
    if (GREETINGS.has(inputLower) && user.currentStep !== 'awaiting_name') {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, welcomeMessage(user.name, user.balance));
      return;
    }

    // ── Global: BAL ─────────────────────────────────────────────────────────
    if (inputUpper === 'BAL') {
      await send(sock, jid, balanceMessage(user.name, user.balance));
      return;
    }

    // ── Global: MORE ────────────────────────────────────────────────────────
    if (inputUpper === 'MORE') {
      user.tempData = { ...user.tempData, previousStep: user.currentStep };
      user.markModified('tempData');
      user.currentStep = 'more_menu';
      await user.save();
      await send(sock, jid, moreMenuMessage());
      return;
    }

    // ── Global: TXN ─────────────────────────────────────────────────────────
    if (inputUpper === 'TXN' && user.currentStep !== 'awaiting_name') {
      user.currentStep = 'txn_range_select';
      user.tempData    = {};
      user.markModified('tempData');
      await user.save();
      await send(sock, jid, txnRangeSelectMessage());
      return;
    }

    // ── Global: PDF (smart_insights only) ───────────────────────────────────
    if (inputUpper === 'PDF' && user.currentStep === 'smart_insights') {
      const { handleSmartInsightsPdf } = require('./handlers/smartInsights');
      await handleSmartInsightsPdf(sock, jid, user, phone);
      return;
    }

    // ── Global: RESET ───────────────────────────────────────────────────────
    if (inputUpper === 'RESET' && user.currentStep !== 'awaiting_name') {
      user.currentStep = 'reset_type_confirm';
      user.tempData    = {};
      user.markModified('tempData');
      await user.save();
      await send(sock, jid, resetTypeMessage());
      return;
    }

    // ── Global: NEXT / PREV (paginated states only) ──────────────────────────
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

    // ── Global: 0 — cancel / back ────────────────────────────────────────────
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
      // FIXED: update lastActiveAt after handler completes so session timeout
      // works even when handlers clear tempData (uses $set to avoid wiping tempData)
      if (TIMEOUT_STATES.has(user.currentStep)) {
        await User.updateOne({ phone }, { $set: { 'tempData.lastActiveAt': Date.now() } }).catch(() => {});
      }
    } else if (handler === null) {
      // Navigation-only states — remind user
      await send(sock, jid, { text: '⚠️ Use *NEXT* / *PREV* to navigate, or *0* to cancel.' });
    } else {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, unrecognisedMessage());
    }
  } finally {
    _processingUsers.delete(phone);
  }
}

module.exports = { handleMessage };
