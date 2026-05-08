'use strict';

/**
 * txnHistory.js
 * Handles:  txn_range_select  — pick date range
 *           txn_view          — show paginated transactions (NEXT/PREV via global catches)
 */

const Transaction = require('../../models/Transaction');
const { send }    = require('../helpers/send');
const { generateMonthPdf } = require('../../utils/pdfGenerator');
const {
  txnRangeSelectMessage,
  txnPageMessage,
} = require('../../utils/messages');

const PAGE_SIZE = 10; // txns per page in txn_view

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LONG_MONTHS  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

// ── helpers ───────────────────────────────────────────────────────────────────

function todayRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function parseDDMMYYYY(str) {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (isNaN(d.getTime()) || d.getDate() !== +dd) return null;
  return d;
}

function parseMMYYYY(str) {
  const m = str.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, yyyy] = m;
  if (+mm < 1 || +mm > 12) return null;
  return { month: +mm, year: +yyyy };
}

function formatDateLabel(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,'0')} ${SHORT_MONTHS[d.getMonth()]}`;
}

async function showTxnPage(sock, jid, user, txns, page, dateLabel) {
  const totalPages = Math.max(1, Math.ceil(txns.length / PAGE_SIZE));
  const safePage   = Math.min(Math.max(page, 1), totalPages);
  const slice      = txns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  user.tempData = {
    ...user.tempData,
    txnPage: safePage,
    txnTotalPages: totalPages,
    txnIds: txns.map((t) => t._id.toString()),
    txnDateLabel: dateLabel,
  };
  user.currentStep = 'txn_view';
  user.markModified('tempData');
  await user.save();

  await send(sock, jid, txnPageMessage(slice, safePage, totalPages, dateLabel));
}

// ── txn_range_select handler ─────────────────────────────────────────────────

async function handleTxnRangeSelect(sock, jid, user, phone, userInput) {

  // Option 1 — Today
  if (userInput === '1') {
    const { start, end } = todayRange();
    const txns = await Transaction.find({
      phone, createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (txns.length === 0) {
      await send(sock, jid, { text: '📋 No transactions today.\n\n_Type *0* to go back._' });
      return;
    }
    const label = formatDateLabel(start);
    await showTxnPage(sock, jid, user, txns, 1, label);
    return;
  }

  // Option 2 — Awaiting DD/MM/YYYY
  if (userInput === '2') {
    user.tempData    = { ...user.tempData, txnMode: 'awaiting_date' };
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, {
      text: '📅 *Enter date*\n\nReply in format *DD/MM/YYYY*\n_e.g. 08/05/2026_\n\n_Type *0* to go back._',
    });
    return;
  }

  // Option 3 — Awaiting MM/YYYY for PDF
  if (userInput === '3') {
    user.tempData    = { ...user.tempData, txnMode: 'awaiting_month' };
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, {
      text: '📅 *Enter month*\n\nReply in format *MM/YYYY*\n_e.g. 05/2026_\n\n_Type *0* to go back._',
    });
    return;
  }

  // Awaiting DD/MM/YYYY input
  if (user.tempData?.txnMode === 'awaiting_date') {
    const date = parseDDMMYYYY(userInput);
    if (!date) {
      await send(sock, jid, { text: '⚠️ Invalid date. Please use *DD/MM/YYYY*.\n_e.g. 08/05/2026_' });
      return;
    }
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const txns  = await Transaction.find({
      phone, createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (txns.length === 0) {
      await send(sock, jid, { text: `📋 No transactions on *${userInput}*.\n\n_Type *0* to go back._` });
      return;
    }
    const label = formatDateLabel(start);
    await showTxnPage(sock, jid, user, txns, 1, label);
    return;
  }

  // Awaiting MM/YYYY for PDF
  if (user.tempData?.txnMode === 'awaiting_month') {
    const parsed = parseMMYYYY(userInput);
    if (!parsed) {
      await send(sock, jid, { text: '⚠️ Invalid month. Please use *MM/YYYY*.\n_e.g. 05/2026_' });
      return;
    }
    const { month, year } = parsed;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59, 999);
    const [creditTxns, debitTxns] = await Promise.all([
      Transaction.find({ phone, type: 'credit', createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }),
      Transaction.find({ phone, type: 'debit',  createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }),
    ]);

    if (creditTxns.length === 0 && debitTxns.length === 0) {
      await send(sock, jid, { text: `📋 No transactions in *${LONG_MONTHS[month-1]} ${year}*.\n\n_Type *0* to go back._` });
      return;
    }

    await send(sock, jid, { text: '⏳ Generating PDF...' });
    try {
      const pdfBuffer = await generateMonthPdf(user, creditTxns, debitTxns, month, year);
      const fileName  = `SpendBot_${LONG_MONTHS[month-1]}_${year}.pdf`;
      await sock.sendMessage(jid, { document: pdfBuffer, mimetype: 'application/pdf', fileName });
      // Reset to range select, clear awaiting mode
      user.tempData = {};
      user.markModified('tempData');
      await user.save();
      await send(sock, jid, { text: `✅ PDF for *${LONG_MONTHS[month-1]} ${year}* sent!\n\n` + txnRangeSelectMessage().text });
    } catch (err) {
      console.error('PDF error:', err);
      await send(sock, jid, { text: '⚠️ Could not generate PDF. Please try again.' });
    }
    return;
  }

  // Default — re-show the range picker
  await send(sock, jid, txnRangeSelectMessage());
}

// ── txn_view pagination (NEXT/PREV calls from handler.js global catches) ──────

/**
 * Called from handler.js when state = 'txn_view' and input = NEXT or PREV.
 */
async function handleTxnViewPage(sock, jid, user, phone, direction) {
  const { txnIds = [], txnPage = 1, txnDateLabel = '', txnTotalPages = 1 } = user.tempData ?? {};
  const newPage = direction === 'NEXT' ? txnPage + 1 : txnPage - 1;

  if (newPage < 1 || newPage > txnTotalPages) {
    await send(sock, jid, { text: `⚠️ No more pages. You're on page ${txnPage}/${txnTotalPages}.` });
    return;
  }

  const ids  = txnIds.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
  const txns = await Transaction.find({ _id: { $in: ids } }).sort({ createdAt: -1 });

  user.tempData = { ...user.tempData, txnPage: newPage };
  user.markModified('tempData');
  await user.save();

  await send(sock, jid, txnPageMessage(txns, newPage, txnTotalPages, txnDateLabel));
}

// ── stub handler for txn_view state (only NEXT/PREV do anything meaningful) ──

async function handleTxnView(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  // Allow jumping back to range select from txn view
  if (userInput === '0') {
    user.currentStep = 'txn_range_select';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, txnRangeSelectMessage());
    return;
  }
  // Any other input: remind user of navigation
  const { txnPage = 1, txnTotalPages = 1 } = user.tempData ?? {};
  await send(sock, jid, {
    text: `⚠️ Use *NEXT* / *PREV* to navigate pages (${txnPage}/${txnTotalPages}).\n_Type *0* to go back._`,
  });
}

module.exports = {
  handleTxnRangeSelect,
  handleTxnView,
  handleTxnViewPage,
};
