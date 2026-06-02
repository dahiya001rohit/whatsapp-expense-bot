'use strict';

const { fmt } = require('./formatters');

const manageBudgetsMessage = (cats, budgetMap) => {
  const lines = cats.map((c, i) => {
    const limit = budgetMap[c.name];
    const tag   = limit != null ? `₹${fmt(limit)}/mo` : `_no limit_`;
    return `${i + 1}. ${c.name} — ${tag}`;
  }).join('\n');
  return {
    text:
      `💰 *Budgets*\n\n` +
      `${lines}\n\n` +
      `Reply *number* to set a limit\n` +
      `*CLEAR N* to remove (e.g. CLEAR 3)\n` +
      `*0* → back`,
  };
};

const askBudgetAmountMessage = (categoryName, currentLimit) => ({
  text:
    `💰 *${categoryName}*\n` +
    `Current limit: ${currentLimit != null ? `*₹${fmt(currentLimit)}/mo*` : '_none_'}\n\n` +
    `_Enter new monthly limit in ₹ (e.g. 2000)_\n` +
    `_Type *0* to cancel._`,
});

const budgetSetMessage = (categoryName, limit) => ({
  text: `✅ *${categoryName}* budget set to *₹${fmt(limit)}/mo*`,
});

const budgetRemovedMessage = (categoryName) => ({
  text: `✅ Budget for *${categoryName}* removed.`,
});

const invalidBudgetAmountMessage = () => ({
  text: `⚠️ Enter a valid amount in ₹.\n_Type *0* to cancel._`,
});

const budgetAlertMessage = (category, limit, totalSpent) => {
  const over = totalSpent - limit;
  return {
    text:
      `🔴 *Over budget — ${category}*\n\n` +
      `Limit: *₹${fmt(limit)}*\n` +
      `Spent: *₹${fmt(totalSpent)}*  (+₹${fmt(over)} over)\n\n` +
      `_Type *MORE* → *3* to review._`,
  };
};

const budgetNoticeMessage = (category, limit, totalSpent) => {
  const pct       = Math.round((totalSpent / limit) * 100);
  const remaining = limit - totalSpent;
  return {
    text:
      `🟡 *${pct}% used — ${category}*\n\n` +
      `Spent: *₹${fmt(totalSpent)}* of *₹${fmt(limit)}*\n` +
      `Remaining: *₹${fmt(remaining)}*`,
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
