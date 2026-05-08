'use strict';

const resetTypeMessage = () => ({
  text:
    `⚠️ *Reset Account*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `This will clear your account data.\n` +
    `Please choose what to reset:\n\n` +
    `1️⃣  *Transactions Only*\n` +
    `     Clears all transactions and\n` +
    `     resets balance to ₹0.\n` +
    `     Keeps your categories and budgets.\n\n` +
    `2️⃣  *Full Reset*\n` +
    `     Clears everything — transactions,\n` +
    `     balance, categories, and budgets.\n` +
    `     Restores default categories.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply 1 or 2 to choose_\n` +
    `_Type *0* to cancel_`,
});

const resetKeepCategoriesMessage = () => ({
  text:
    `📁 *Keep Your Data?*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Would you like to keep your\n` +
    `categories and budget limits?\n\n` +
    `Reply *YES* to keep both\n` +
    `Reply *NO* to clear both\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel_`,
});

const resetFinalConfirmMessage = (resetChoice, keepCategories, balance, txCount) => {
  const fmt2 = (n) => {
    const abs = Math.abs(Number(n));
    const str = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (Number(n) < 0 ? '-' : '') + parts.join('.');
  };

  if (resetChoice === 'full') {
    return {
      text:
        `🔴 *Final Confirmation*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `You are about to perform a FULL RESET.\n` +
        `Here is exactly what will happen:\n\n` +
        `❌ Categories — *Deleted* (defaults restored)\n` +
        `❌ Budgets — *Deleted*\n` +
        `❌ All Transactions — *Deleted*\n` +
        `❌ Balance — *Reset to ₹0*\n` +
        `❌ Name — *Cleared*\n\n` +
        `You will need to set up your\n` +
        `account again from scratch.\n\n` +
        `Current balance that will be lost:\n` +
        `*₹${fmt2(balance)}*\n\n` +
        `Total transactions that will be deleted:\n` +
        `*${txCount}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ This action cannot be undone.\n\n` +
        `Type *CONFIRM* to proceed\n` +
        `Type *0* to cancel`,
    };
  }

  const catLine = keepCategories
    ? `✅ Categories — *Kept*\n✅ Budgets — *Kept*`
    : `❌ Categories — *Deleted* (defaults restored)\n❌ Budgets — *Deleted*`;

  return {
    text:
      `🔴 *Final Confirmation*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `You are about to reset your account.\n` +
      `Here is exactly what will happen:\n\n` +
      `${catLine}\n` +
      `❌ All Transactions — *Deleted*\n` +
      `❌ Balance — *Reset to ₹0*\n\n` +
      `Current balance that will be lost:\n` +
      `*₹${fmt2(balance)}*\n\n` +
      `Total transactions that will be deleted:\n` +
      `*${txCount}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ This action cannot be undone.\n\n` +
      `Type *CONFIRM* to proceed\n` +
      `Type *0* to cancel`,
  };
};

const resetSuccessMessage = (txCount, keepCategories, keepBudgets) => ({
  text:
    `✅ *Reset Complete*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Your account has been reset.\n\n` +
    `Transactions Deleted:  *${txCount}*\n` +
    `Balance Reset To:      *₹0*\n` +
    `Categories:            *${keepCategories ? 'Kept' : 'Restored'}*\n` +
    `Budgets:               *${keepBudgets ? 'Kept' : 'Cleared'}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

const fullResetSuccessMessage = (txCount) => ({
  text:
    `✅ *Full Reset Complete*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Your account has been completely reset.\n\n` +
    `Transactions Deleted:  *${txCount}*\n` +
    `Balance Reset To:      *₹0*\n` +
    `Default categories have been restored.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Please type *hi* to set up\nyour account again._`,
});

const resetCancelledMessage = () => ({
  text:
    `❌ *Reset Cancelled*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No changes have been made\n` +
    `to your account.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

const resetConfirmNudgeMessage = () => ({
  text:
    `⚠️ *Confirmation Needed*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *CONFIRM* to proceed\n` +
    `or *0* to cancel.`,
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
