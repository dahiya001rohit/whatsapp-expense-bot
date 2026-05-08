'use strict';

/**
 * smartInsights.js
 * Handles:  smart_insights
 *           smart_insights_drill_spend  (pick a spending category → paginated txns)
 *           smart_insights_drill_income (pick an income source  → paginated txns)
 */

const Transaction = require('../../models/Transaction');
const { send }    = require('../helpers/send');
const { startOfMonth } = require('../helpers/constants');
const { generateMonthPdf } = require('../../utils/pdfGenerator');
const {
  smartInsightsMessage,
  smartInsightsDrillMenuMessage,
  txnPageMessage,
  moreMenuMessage,
} = require('../../utils/messages');

const PAGE_SIZE = 5; // txns per page inside drill-down

// ── helpers ───────────────────────────────────────────────────────────────────

function currentMonthLabel() {
  const d = new Date();
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function sendTxnPage(sock, jid, allTxns, page, dateLabel) {
  const totalPages = Math.max(1, Math.ceil(allTxns.length / PAGE_SIZE));
  const safePage   = Math.min(Math.max(page, 1), totalPages);
  const slice      = allTxns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { msg: txnPageMessage(slice, safePage, totalPages, dateLabel), safePage, totalPages };
}

// ── entry: called from more_menu when user selects option 1 ───────────────────

async function enterSmartInsights(sock, jid, user, phone) {
  const now        = new Date();
  const monthStart = startOfMonth();

  const [debitRows, creditRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { phone, type: 'debit',  createdAt: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { phone, type: 'credit', createdAt: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const incomeRows = creditRows.map((r) => ({ category: r._id, total: r.total }));
  const spendRows  = debitRows.map((r)  => ({ category: r._id, total: r.total }));
  const totalIn    = incomeRows.reduce((s, r) => s + r.total, 0);
  const totalOut   = spendRows.reduce((s, r)  => s + r.total, 0);
  const monthLabel = currentMonthLabel();

  user.currentStep = 'smart_insights';
  user.tempData    = { siIncomeRows: incomeRows, siSpendRows: spendRows };
  user.markModified('tempData');
  await user.save();

  await send(sock, jid, smartInsightsMessage(monthLabel, totalIn, totalOut, incomeRows, spendRows));
}

// ── smart_insights state handler ─────────────────────────────────────────────

async function handleSmartInsights(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  if (userInput === '1') {
    // Drill spending
    const cats = (user.tempData?.siSpendRows ?? []);
    if (cats.length === 0) {
      await send(sock, jid, { text: '📉 No spending recorded this month.\n\n_Type *0* to go back._' });
      return;
    }
    user.currentStep = 'smart_insights_drill_spend';
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, smartInsightsDrillMenuMessage('spend', cats));
    return;
  }

  if (userInput === '2') {
    // Drill income
    const cats = (user.tempData?.siIncomeRows ?? []);
    if (cats.length === 0) {
      await send(sock, jid, { text: '📈 No income recorded this month.\n\n_Type *0* to go back._' });
      return;
    }
    user.currentStep = 'smart_insights_drill_income';
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, smartInsightsDrillMenuMessage('income', cats));
    return;
  }

  if (inputUpper === 'PDF') {
    await handleSmartInsightsPdf(sock, jid, user, phone);
    return;
  }

  if (inputUpper === 'TXN') {
    const { txnRangeSelectMessage } = require('../../utils/messages');
    user.currentStep = 'txn_range_select';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, txnRangeSelectMessage());
    return;
  }

  // Any other input: re-show the insights card
  await enterSmartInsights(sock, jid, user, phone);
}

// ── PDF export ────────────────────────────────────────────────────────────────

async function handleSmartInsightsPdf(sock, jid, user, phone) {
  const now        = new Date();
  const monthStart = startOfMonth();

  const [creditTxns, debitTxns] = await Promise.all([
    Transaction.find({ phone, type: 'credit', createdAt: { $gte: monthStart } }).sort({ createdAt: 1 }),
    Transaction.find({ phone, type: 'debit',  createdAt: { $gte: monthStart } }).sort({ createdAt: 1 }),
  ]);

  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  await send(sock, jid, { text: '⏳ Generating PDF...' });

  try {
    const pdfBuffer = await generateMonthPdf(user, creditTxns, debitTxns, month, year);
    const fileName  = `SpendBot_${MONTHS[month-1]}_${year}.pdf`;
    await sock.sendMessage(jid, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName,
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    await send(sock, jid, { text: '⚠️ Could not generate PDF. Please try again.' });
  }
}

// ── drill spending: user picks a category number ──────────────────────────────

async function handleSmartInsightsDrillSpend(sock, jid, user, phone, userInput) {
  const cats = user.tempData?.siSpendRows ?? [];
  const idx  = parseInt(userInput, 10);

  if (isNaN(idx) || idx < 1 || idx > cats.length) {
    await send(sock, jid, { text: `⚠️ Please reply with a number between 1 and ${cats.length}.\n_Type *0* to go back._` });
    return;
  }

  const chosen   = cats[idx - 1].category;
  const monthStart = startOfMonth();
  const allTxns  = await Transaction.find({
    phone, type: 'debit', category: chosen, createdAt: { $gte: monthStart },
  }).sort({ createdAt: -1 });

  if (allTxns.length === 0) {
    await send(sock, jid, { text: `📂 No transactions for *${chosen}* this month.\n_Type *0* to go back._` });
    return;
  }

  const dateLabel  = currentMonthLabel() + ' — ' + chosen;
  const { msg, safePage, totalPages } = sendTxnPage(sock, jid, allTxns, 1, dateLabel);

  user.tempData = {
    ...user.tempData,
    drillTxns: allTxns.map((t) => t._id.toString()),
    drillPage: safePage,
    drillTotalPages: totalPages,
    drillDateLabel: dateLabel,
    drillParent: 'smart_insights_drill_spend',
  };
  user.currentStep = 'smart_insights_drill_spend_txns';
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, msg);
}

// ── drill income: user picks a category number ────────────────────────────────

async function handleSmartInsightsDrillIncome(sock, jid, user, phone, userInput) {
  const cats = user.tempData?.siIncomeRows ?? [];
  const idx  = parseInt(userInput, 10);

  if (isNaN(idx) || idx < 1 || idx > cats.length) {
    await send(sock, jid, { text: `⚠️ Please reply with a number between 1 and ${cats.length}.\n_Type *0* to go back._` });
    return;
  }

  const chosen   = cats[idx - 1].category;
  const monthStart = startOfMonth();
  const allTxns  = await Transaction.find({
    phone, type: 'credit', category: chosen, createdAt: { $gte: monthStart },
  }).sort({ createdAt: -1 });

  if (allTxns.length === 0) {
    await send(sock, jid, { text: `📂 No income for *${chosen}* this month.\n_Type *0* to go back._` });
    return;
  }

  const dateLabel  = currentMonthLabel() + ' — ' + chosen;
  const { msg, safePage, totalPages } = sendTxnPage(sock, jid, allTxns, 1, dateLabel);

  user.tempData = {
    ...user.tempData,
    drillTxns: allTxns.map((t) => t._id.toString()),
    drillPage: safePage,
    drillTotalPages: totalPages,
    drillDateLabel: dateLabel,
    drillParent: 'smart_insights_drill_income',
  };
  user.currentStep = 'smart_insights_drill_income_txns';
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, msg);
}

// ── paginated drill txn view (NEXT/PREV handled via global catches) ────────────

/**
 * Called from handler.js global NEXT/PREV when state is
 * smart_insights_drill_spend_txns or smart_insights_drill_income_txns.
 */
async function handleDrillTxnPage(sock, jid, user, phone, direction) {
  const { drillTxns = [], drillPage = 1, drillDateLabel = '' } = user.tempData ?? {};
  const newPage   = direction === 'NEXT' ? drillPage + 1 : drillPage - 1;
  const totalPages = Math.max(1, Math.ceil(drillTxns.length / PAGE_SIZE));

  if (newPage < 1 || newPage > totalPages) {
    await send(sock, jid, { text: `⚠️ No more pages. You're on page ${drillPage}/${totalPages}.` });
    return;
  }

  // Re-fetch the actual transaction docs by IDs for this page
  const ids   = drillTxns.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
  const txns  = await Transaction.find({ _id: { $in: ids } }).sort({ createdAt: -1 });

  user.tempData = { ...user.tempData, drillPage: newPage };
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, txnPageMessage(txns, newPage, totalPages, drillDateLabel));
}

module.exports = {
  enterSmartInsights,
  handleSmartInsights,
  handleSmartInsightsDrillSpend,
  handleSmartInsightsDrillIncome,
  handleDrillTxnPage,
  handleSmartInsightsPdf,
};
