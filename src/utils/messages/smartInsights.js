'use strict';

const { fmt, emojiFor, incomeEmojiFor } = require('./formatters');

/** Legacy — kept for backward compat if still referenced anywhere. */
const spendingReportMessage = (creditRows, debitRows, totalCredited, totalSpent, balance) => {
  const creditSection = creditRows.length > 0
    ? creditRows.map((r) => `${incomeEmojiFor(r.category)} ${r.category.padEnd(20)}₹${fmt(r.total)}`).join('\n')
    : `No deposits this month`;

  const spendSection = debitRows.length > 0
    ? debitRows.map((r) => `${emojiFor(r.category)} ${r.category.padEnd(20)}₹${fmt(r.total)}`).join('\n')
    : `No spending recorded this month`;

  return {
    text:
      `📊 *Spending Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Money In*\n\n` +
      `${creditSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Money Out*\n\n` +
      `${spendSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Total In:    *₹${fmt(totalCredited)}*\n` +
      `💸 Total Out:   *₹${fmt(totalSpent)}*\n` +
      `💼 Balance:     *₹${fmt(balance)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *hi* for main menu or *MORE* for more options._`,
  };
};

/**
 * Smart Insights main card.
 * @param {string} monthLabel  e.g. "May 2026"
 * @param {number} totalIn
 * @param {number} totalOut
 * @param {Array}  incomeRows  [{ category, total }] sorted desc
 * @param {Array}  debitRows   [{ category, total }] sorted desc
 */
const smartInsightsMessage = (monthLabel, totalIn, totalOut, incomeRows, debitRows) => {
  const net    = totalIn - totalOut;
  const netStr = net >= 0 ? `+₹${fmt(net)}` : `-₹${fmt(Math.abs(net))}`;

  const incomeSection = incomeRows.length > 0
    ? incomeRows.map((r) => {
        const label = (incomeEmojiFor(r.category) + ' ' + r.category).padEnd(14);
        return `${label} ₹${fmt(r.total)}`;
      }).join('\n')
    : `No income this month`;

  const topN  = debitRows.slice(0, 5);
  const spendSection = topN.length > 0
    ? topN.map((r) => {
        const pct   = totalOut > 0 ? Math.round((r.total / totalOut) * 100) : 0;
        const label = (emojiFor(r.category) + ' ' + r.category).padEnd(14);
        return `${label} ₹${fmt(r.total)}  ${pct}%`;
      }).join('\n')
    : `No spending this month`;

  return {
    text:
      `📊 *${monthLabel}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 In:  ₹${fmt(totalIn)}\n` +
      `📉 Out: ₹${fmt(totalOut)}\n` +
      `💼 Net: ${netStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Income by source:*\n` +
      `${incomeSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Top spending:*\n` +
      `${spendSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Reply:\n` +
      `*1* → drill spending category\n` +
      `*2* → drill income source\n` +
      `*TXN* → transaction history\n` +
      `*PDF* → export this month\n` +
      `*0* → back`,
  };
};

/**
 * Numbered list of categories for drill-down pick.
 * @param {'spend'|'income'} type
 * @param {Array} cats [{ category, total }]
 */
const smartInsightsDrillMenuMessage = (type, cats) => {
  const icon  = type === 'income' ? '💰' : '💸';
  const title = type === 'income' ? 'Income Sources' : 'Spending Categories';
  const lines = cats.map((r, i) => `${i + 1}. ${emojiFor(r.category)} ${r.category}  ₹${fmt(r.total)}`).join('\n');
  return {
    text:
      `${icon} *${title}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${lines || 'No data this month.'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Reply with category number to see transactions_\n` +
      `_Type *0* to go back_`,
  };
};

module.exports = {
  spendingReportMessage,
  smartInsightsMessage,
  smartInsightsDrillMenuMessage,
};
