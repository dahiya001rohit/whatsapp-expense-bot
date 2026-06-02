'use strict';

const { fmt, emojiFor, incomeEmojiFor } = require('./formatters');

const spendingReportMessage = (creditRows, debitRows, totalCredited, totalSpent, balance) => {
  const creditLines = creditRows.length > 0
    ? creditRows.map((r) => `${incomeEmojiFor(r.category)} ${r.category} — *₹${fmt(r.total)}*`).join('\n')
    : `No deposits this month`;

  const spendLines = debitRows.length > 0
    ? debitRows.map((r) => `${emojiFor(r.category)} ${r.category} — *₹${fmt(r.total)}*`).join('\n')
    : `No spending this month`;

  return {
    text:
      `📊 *Monthly Report*\n\n` +
      `💰 *In*\n${creditLines}\n\n` +
      `💸 *Out*\n${spendLines}\n\n` +
      `Total in: *₹${fmt(totalCredited)}*\n` +
      `Total out: *₹${fmt(totalSpent)}*\n` +
      `Balance: *₹${fmt(balance)}*`,
  };
};

const smartInsightsMessage = (monthLabel, totalIn, totalOut, incomeRows, debitRows) => {
  const net    = totalIn - totalOut;
  const netStr = net >= 0 ? `+₹${fmt(net)}` : `-₹${fmt(Math.abs(net))}`;

  const incomeLines = incomeRows.length > 0
    ? incomeRows.map((r) => `${incomeEmojiFor(r.category)} ${r.category} — ₹${fmt(r.total)}`).join('\n')
    : `No income this month`;

  const topSpend = debitRows.slice(0, 5);
  const spendLines = topSpend.length > 0
    ? topSpend.map((r) => {
        const pct = totalOut > 0 ? Math.round((r.total / totalOut) * 100) : 0;
        return `${emojiFor(r.category)} ${r.category} — ₹${fmt(r.total)} · ${pct}%`;
      }).join('\n')
    : `No spending this month`;

  return {
    text:
      `📊 *${monthLabel}*\n\n` +
      `📈 In:  *₹${fmt(totalIn)}*\n` +
      `📉 Out: *₹${fmt(totalOut)}*\n` +
      `💼 Net: *${netStr}*\n\n` +
      `💰 *Income*\n${incomeLines}\n\n` +
      `💸 *Top spending*\n${spendLines}\n\n` +
      `*1* → drill spending\n` +
      `*2* → drill income\n` +
      `*TXN* → history · *PDF* → export\n` +
      `*0* → back`,
  };
};

const smartInsightsDrillMenuMessage = (type, cats) => {
  const icon  = type === 'income' ? '💰' : '💸';
  const title = type === 'income' ? 'Income Sources' : 'Spending Categories';
  const lines = cats.map((r, i) => `${i + 1}. ${emojiFor(r.category)} ${r.category} — ₹${fmt(r.total)}`).join('\n');
  return {
    text:
      `${icon} *${title}*\n\n` +
      `${lines || 'No data this month.'}\n\n` +
      `_Reply with number to see transactions_\n` +
      `_Type *0* to go back_`,
  };
};

module.exports = {
  spendingReportMessage,
  smartInsightsMessage,
  smartInsightsDrillMenuMessage,
};
