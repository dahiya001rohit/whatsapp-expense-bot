'use strict';

const { fmt } = require('./formatters');

const txnRangeSelectMessage = () => ({
  text:
    `📋 *Transaction History*\n\n` +
    `*1* → Today\n` +
    `*2* → Specific date — reply *DD/MM/YYYY*\n` +
    `*3* → Full month — reply *MM/YYYY* (PDF)\n\n` +
    `_Type *0* to go back_`,
});

const txnPageMessage = (txns, page, totalPages, dateLabel) => {
  const lines = txns.map((txn) => {
    const d    = new Date(txn.createdAt);
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const icon = txn.type === 'credit' ? '💰' : '💸';
    const sign = txn.type === 'credit' ? '+' : '-';
    let line   = `${icon} ${txn.category} · *${sign}₹${fmt(txn.amount)}* · ${time}`;
    if (txn.note) line += `\n   _${txn.note}_`;
    return line;
  }).join('\n');

  const nav = totalPages > 1
    ? `\n\nPage ${page}/${totalPages}` +
      (page < totalPages ? ' · *NEXT*' : '') +
      (page > 1 ? ' · *PREV*' : '')
    : '';

  return {
    text:
      `📋 *${dateLabel}*\n\n` +
      lines +
      nav +
      `\n_Type *0* to go back_`,
  };
};

const TXN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const transactionHistoryMessage = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { text: `📋 No transactions yet.\n\nType *hi* for menu.` };
  }
  const lines = transactions.map((txn, i) => {
    const d    = new Date(txn.createdAt);
    const day  = String(d.getDate()).padStart(2, '0');
    const mon  = TXN_MONTHS[d.getMonth()];
    const icon = txn.type === 'credit' ? '💰' : '💸';
    const sign = txn.type === 'credit' ? '+' : '-';
    let line = `${i + 1}. ${day} ${mon} — ${icon} ${txn.category} · *${sign}₹${fmt(txn.amount)}* · bal ₹${fmt(txn.newBalance)}`;
    if (txn.note) line += `\n   _${txn.note}_`;
    return line;
  });
  return {
    text: `📋 *Recent Transactions*\n\n${lines.join('\n')}\n\n_Type *hi* for menu._`,
  };
};

module.exports = {
  txnRangeSelectMessage,
  txnPageMessage,
  transactionHistoryMessage,
};
