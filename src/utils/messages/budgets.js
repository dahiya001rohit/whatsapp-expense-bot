'use strict';

const { fmt } = require('./formatters');

const manageBudgetsMessage = (cats, budgetMap) => {
  const lines = cats.map((c, i) => {
    const limit    = budgetMap[c.name];
    const limitStr = limit != null ? `₹${fmt(limit)}` : 'No limit set';
    return `${i + 1}. ${c.name.padEnd(16)} Limit: ${limitStr}`;
  }).join('\n');
  return {
    text:
      `💰 *Manage Budgets*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Set monthly spending limits\n` +
      `for each category:\n\n` +
      `${lines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Type category *number* to set its limit\n` +
      `Type *CLEAR* + number to remove a limit\n` +
      `(e.g. CLEAR 4 removes category 4's limit)\n` +
      `Type *0* to go back`,
  };
};

const askBudgetAmountMessage = (categoryName, currentLimit) => ({
  text:
    `💰 *Set Budget — ${categoryName}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Enter the monthly spending limit\n` +
    `for *${categoryName}*:\n\n` +
    `Current limit: ${currentLimit != null ? `₹${fmt(currentLimit)}` : 'Not set'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type amount in ₹ — e.g. *2000*_\n` +
    `_Type *0* to cancel_`,
});

const budgetSetMessage = (categoryName, limit) => ({
  text:
    `✅ *Budget Set*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Monthly limit for *${categoryName}*:\n` +
    `*₹${fmt(limit)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `We'll warn you if you exceed\n` +
    `this limit.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* for main menu or *MORE* for more options._`,
});

const budgetRemovedMessage = (categoryName) => ({
  text:
    `✅ *Budget Removed*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Spending limit for *${categoryName}*\n` +
    `has been removed.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* for main menu or *MORE* for more options._`,
});

const invalidBudgetAmountMessage = () => ({
  text:
    `⚠️ *Invalid Amount*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter a valid\n` +
    `amount in ₹.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

const budgetAlertMessage = (category, limit, totalSpent) => {
  const over = totalSpent - limit;
  return {
    text:
      `⚠️ *Budget Alert — ${category}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `You've reached or exceeded your\n` +
      `monthly budget for *${category}*.\n\n` +
      `Monthly Limit:   ₹${fmt(limit)}\n` +
      `Total Spent:     ₹${fmt(totalSpent)}\n` +
      `Over by:         ₹${fmt(over)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Consider reviewing your spending\n` +
      `in this category.\n` +
      `_Type *MORE* then *1* to see full report._`,
  };
};

const budgetNoticeMessage = (category, limit, totalSpent) => {
  const remaining = limit - totalSpent;
  return {
    text:
      `💛 *Budget Notice — ${category}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `You're close to your monthly\n` +
      `budget for *${category}*.\n\n` +
      `Monthly Limit:   ₹${fmt(limit)}\n` +
      `Total Spent:     ₹${fmt(totalSpent)}\n` +
      `Remaining:       ₹${fmt(remaining)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *MORE* then *1* to see full report._`,
  };
};

module.exports = {
  manageBudgetsMessage,
  askBudgetAmountMessage,
  budgetSetMessage,
  budgetRemovedMessage,
  invalidBudgetAmountMessage,
  budgetAlertMessage,
  budgetNoticeMessage,
};
