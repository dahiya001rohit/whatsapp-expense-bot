'use strict';

const { fmt } = require('./formatters');

const txnRangeSelectMessage = () => ({
  text:
    `📋 *Transaction History*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Pick a range:\n\n` +
    `*1* → Today\n` +
    `*2* → Specific date — reply *DD/MM/YYYY*\n` +
    `*3* → Full month — reply *MM/YYYY* → sends PDF\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to go back_`,
});

/**
 * Paginated transaction list.
 * @param {Array}  txns       Transaction docs for this page
 * @param {number} page       1-indexed current page
 * @param {number} totalPages
 * @param {string} dateLabel  e.g. "08 May" or "May 2026"
 */
const txnPageMessage = (txns, page, totalPages, dateLabel) => {
  const TM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const lines = txns.map((txn) => {
    const d    = new Date(txn.createdAt);
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const icon = txn.type === 'credit' ? '💰' : '💸';
    const sign = txn.type === 'credit' ? '+' : '-';
    const cat  = txn.category.padEnd(12);
    let line   = `${icon} ${cat}  ${sign}₹${fmt(txn.amount)}  ${time}`;
    if (txn.note) line += `\n   _${txn.note}_`;
    return line;
  });

  const nav = totalPages > 1
    ? `\nPage ${page}/${totalPages} — ${page < totalPages ? '*NEXT* for more' : 'last page'}${page > 1 ? ' | *PREV* for previous' : ''}`
    : '';

  return {
    text:
      `📋 *Transactions — ${dateLabel}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      lines.join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━━` +
      nav +
      `\n_Type *0* to cancel_`,
  };
};

const TXN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const transactionHistoryMessage = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { text: `📋 *No transactions yet.*\n\nType *hi* for main menu.` };
  }
  const lines = transactions.map((txn, i) => {
    const d    = new Date(txn.createdAt);
    const day  = String(d.getDate()).padStart(2, '0');
    const mon  = TXN_MONTHS[d.getMonth()];
    const icon = txn.type === 'credit' ? '💰' : '💸';
    const sign = txn.type === 'credit' ? '+' : '-';
    let line = `${i + 1}. ${day} ${mon} — ${icon} ${txn.category}   *${sign}₹${fmt(txn.amount)}*   bal ₹${fmt(txn.newBalance)}`;
    if (txn.note) line += `\n   _${txn.note}_`;
    return line;
  });
  return {
    text:
      `📋 *Recent Transactions*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      lines.join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *hi* for main menu._`,
  };
};

module.exports = {
  txnRangeSelectMessage,
  txnPageMessage,
  transactionHistoryMessage,
};
