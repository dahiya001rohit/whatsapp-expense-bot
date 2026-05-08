'use strict';

/**
 * moreMenu.js — Handles the `more_menu` state.
 *
 * Menu:
 *   1 → Smart Insights
 *   2 → Transaction History
 *   3 → Categories & Budgets (combined sub-menu)
 *   4 → Lending & Borrowing
 *   0 → Back
 *
 * RESET is now a global typed command — removed from this menu.
 */

const Budget = require('../../models/Budget');
const { send } = require('../helpers/send');
const { getCategories, getLendBorrowSummary } = require('../helpers/db');
const {
  moreMenuMessage,
  categoriesBudgetsMenuMessage,
  lendBorrowMenuMessage,
} = require('../../utils/messages');
const { enterSmartInsights } = require('./smartInsights');
const { handleTxnRangeSelect } = require('./txnHistory');

async function handleMoreMenu(sock, jid, user, phone, userInput) {

  // 1 → Smart Insights
  if (userInput === '1') {
    await enterSmartInsights(sock, jid, user, phone);
    return;
  }

  // 2 → Transaction History
  if (userInput === '2') {
    const { txnRangeSelectMessage } = require('../../utils/messages');
    user.currentStep = 'txn_range_select';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, txnRangeSelectMessage());
    return;
  }

  // 3 → Categories & Budgets combined sub-menu
  if (userInput === '3') {
    user.currentStep = 'categories_budgets_menu';
    await user.save();
    await send(sock, jid, categoriesBudgetsMenuMessage());
    return;
  }

  // 4 → Lending & Borrowing
  if (userInput === '4') {
    const { totalOwedToYou, totalYouOwe } = await getLendBorrowSummary(phone);
    user.currentStep = 'lend_borrow_menu';
    await user.save();
    await send(sock, jid, lendBorrowMenuMessage(totalOwedToYou, totalYouOwe));
    return;
  }

  // 0 → Back (also handled by global 0-catch in handler.js, but kept here for clarity)
  if (userInput === '0') {
    const prevStep   = user.tempData?.previousStep;
    user.currentStep = (prevStep && prevStep !== 'more_menu') ? prevStep : 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, { text: '❌ *Cancelled.*\n\nType *hi* for main menu.' });
    return;
  }

  await send(sock, jid, { text: '⚠️  Please reply with *1*, *2*, *3*, or *4*.\n_Type *0* to go back._' });
}

module.exports = { handleMoreMenu };
