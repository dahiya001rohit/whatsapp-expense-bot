'use strict';

const Transaction          = require('../../models/Transaction');
const Budget               = require('../../models/Budget');
const { send }             = require('../helpers/send');
const { getCategories, getLendBorrowSummary } = require('../helpers/db');
const { startOfMonth }     = require('../helpers/constants');
const {
  spendingReportMessage, manageBudgetsMessage, manageCategoriesMenuMessage,
  lendBorrowMenuMessage, resetTypeMessage, transactionHistoryMessage,
} = require('../../utils/messages');

async function handleMoreMenu(sock, jid, user, phone, userInput) {
  if (userInput === '1') {
    const monthStart  = startOfMonth();
    const debitRows   = await Transaction.aggregate([
      { $match: { phone, type: 'debit',   createdAt: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const creditRows  = await Transaction.aggregate([
      { $match: { phone, type: 'credit',  createdAt: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    user.currentStep = 'main_menu';
    await user.save();
    const creditFmt  = creditRows.map((r) => ({ category: r._id, total: r.total }));
    const debitFmt   = debitRows.map((r) => ({ category: r._id, total: r.total }));
    await send(sock, jid, spendingReportMessage(
      creditFmt, debitFmt,
      creditFmt.reduce((s, r) => s + r.total, 0),
      debitFmt.reduce((s, r) => s + r.total, 0),
      user.balance,
    ));
    return;
  }

  if (userInput === '2') {
    const cats    = await getCategories(phone);
    const budgets = await Budget.find({ phone });
    const budgetMap = {};
    budgets.forEach((b) => { budgetMap[b.category] = b.limit; });
    user.currentStep = 'manage_budgets';
    user.tempData    = { budgetCats: cats.map((c) => c.name) };
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, manageBudgetsMessage(cats, budgetMap));
    return;
  }

  if (userInput === '3') {
    user.currentStep = 'manage_categories';
    await user.save();
    await send(sock, jid, manageCategoriesMenuMessage());
    return;
  }

  if (userInput === '4') {
    const { totalOwedToYou, totalYouOwe } = await getLendBorrowSummary(phone);
    user.currentStep = 'lend_borrow_menu';
    await user.save();
    await send(sock, jid, lendBorrowMenuMessage(totalOwedToYou, totalYouOwe));
    return;
  }

  if (userInput === '5') {
    user.currentStep = 'reset_type_confirm';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, resetTypeMessage());
    return;
  }

  if (userInput === '6') {
    const txns = await Transaction.find({ phone }).sort({ createdAt: -1 }).limit(10);
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, transactionHistoryMessage(txns));
    return;
  }

  if (userInput === '0') {
    const prevStep   = user.tempData?.previousStep;
    user.currentStep = (prevStep && prevStep !== 'more_menu') ? prevStep : 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, { text: '❌ *Cancelled.*\n\nType *hi* for main menu.' });
    return;
  }

  await send(sock, jid, { text: '⚠️  Please reply with *1*, *2*, *3*, *4*, *5*, or *6*.\n_Type *0* to go back._' });
}

module.exports = { handleMoreMenu };
