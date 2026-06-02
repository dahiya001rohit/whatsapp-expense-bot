'use strict';

const { fmt } = require('./formatters');

const resetTypeMessage = () => ({
  text:
    `⚠️ *Reset Account*\n\n` +
    `*1* → Transactions only\n` +
    `   Clears transactions & balance. Keeps categories.\n\n` +
    `*2* → Full reset\n` +
    `   Clears everything. Restores defaults.\n\n` +
    `_Type *0* to cancel_`,
});

const resetKeepCategoriesMessage = () => ({
  text:
    `📁 Keep your categories & budgets?\n\n` +
    `*YES* → keep them\n` +
    `*NO* → clear them\n\n` +
    `_Type *0* to cancel_`,
});

const resetFinalConfirmMessage = (resetChoice, keepCategories, balance, txCount) => {
  const fmtLocal = (n) => {
    const abs = Math.abs(Number(n));
    const str = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (Number(n) < 0 ? '-' : '') + parts.join('.');
  };

  if (resetChoice === 'full') {
    return {
      text:
        `🔴 *Full Reset — Final Confirmation*\n\n` +
        `Will delete:\n` +
        `❌ ${txCount} transactions\n` +
        `❌ Balance (₹${fmtLocal(balance)})\n` +
        `❌ All categories & budgets\n` +
        `❌ Your name\n\n` +
        `⚠️ *This cannot be undone.*\n\n` +
        `Type *CONFIRM* to proceed\n` +
        `Type *0* to cancel`,
    };
  }

  const catLine = keepCategories
    ? `✅ Categories & budgets kept`
    : `❌ Categories & budgets cleared`;

  return {
    text:
      `🔴 *Reset — Final Confirmation*\n\n` +
      `Will delete:\n` +
      `❌ ${txCount} transactions\n` +
      `❌ Balance (₹${fmtLocal(balance)})\n` +
      `${catLine}\n\n` +
      `⚠️ *This cannot be undone.*\n\n` +
      `Type *CONFIRM* to proceed\n` +
      `Type *0* to cancel`,
  };
};

const resetSuccessMessage = (txCount, keepCategories, keepBudgets) => ({
  text:
    `✅ *Reset complete*\n\n` +
    `${txCount} transactions deleted · Balance: *₹0*\n` +
    `Categories: *${keepCategories ? 'kept' : 'restored'}* · Budgets: *${keepBudgets ? 'kept' : 'cleared'}*\n\n` +
    `_Type *hi* to continue._`,
});

const fullResetSuccessMessage = (txCount) => ({
  text:
    `✅ *Full reset complete*\n\n` +
    `${txCount} transactions deleted · Balance: *₹0*\n` +
    `Default categories restored.\n\n` +
    `_Type *hi* to set up your account._`,
});

const resetCancelledMessage = () => ({
  text: `❌ Reset cancelled. No changes made.\n\n_Type *hi* to continue._`,
});

const resetConfirmNudgeMessage = () => ({
  text: `Type *CONFIRM* to proceed or *0* to cancel.`,
});

module.exports = {
  resetTypeMessage,
  resetKeepCategoriesMessage,
  resetFinalConfirmMessage,
  resetSuccessMessage,
  fullResetSuccessMessage,
  resetCancelledMessage,
  resetConfirmNudgeMessage,
};
