/**
 * messages.js
 * Plain-text only payloads.
 *
 * Menu has 2 numbered options only (Add / Withdraw).
 * Balance is always accessible via the global BAL command.
 * Type 0 from any amount prompt to cancel.
 */

// ─── Onboarding ───────────────────────────────────────────────────────────────

const askNameMessage = () => ({
  text: "👋 Welcome to *Expense Tracker*!\n\nWhat's your name?",
});

const accountCreatedMessage = (name) => ({
  text: `✅ Account created! Welcome, *${name}*! 🎉\n\nYour current balance is *₹0*`,
});

// ─── Menus ────────────────────────────────────────────────────────────────────

const MENU_BODY =
  `1️⃣  Add Money\n` +
  `2️⃣  Withdraw Money\n\n` +
  `_Reply with *1* or *2*_`;

const mainMenuMessage = (name) => ({
  text:
    `Hey *${name}*! 👋 What would you like to do?\n\n` +
    MENU_BODY,
});

const backToMenuMessage = (name) => ({
  text:
    `What would you like to do next, *${name}*?\n\n` +
    MENU_BODY,
});

/**
 * Shown when user sends "hi / hello / hey" (returning users).
 * Includes the pinned quick-commands reference card.
 */
const welcomeMessage = (name) => ({
  text:
    `👋 Hey *${name}*!\n\n` +
    `📌 *Quick Commands*\n` +
    `↩️  Type *0* anytime to cancel\n` +
    `💰  Type *BAL* anytime to check balance\n` +
    `🏠  Type *HI* anytime to return here\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `What would you like to do?\n\n` +
    MENU_BODY,
});

// ─── Add Money flow ───────────────────────────────────────────────────────────

const askAmountMessage = () => ({
  text: '💰 How much would you like to *add*?\n\n_Type the amount in ₹ (e.g. 500) or *0* to cancel_',
});

const depositConfirmedMessage = (added, newBal) => ({
  text: `✅ *₹${added}* added successfully!\n\n💼 New balance: *₹${newBal}*`,
});

// ─── Withdraw flow ────────────────────────────────────────────────────────────

const askDebitAmountMessage = () => ({
  text: '💸 How much would you like to *withdraw*?\n\n_Type the amount in ₹ (e.g. 200) or *0* to cancel_',
});

const debitConfirmedMessage = (amount, newBal) => ({
  text: `✅ *₹${amount}* withdrawn successfully!\n\n💼 Remaining balance: *₹${newBal}*`,
});

// ─── Negative balance confirmation ────────────────────────────────────────────

const negativeBalanceWarningMessage = (balance, amount) => {
  const deficit = (amount - balance).toFixed(2);
  return {
    text:
      `⚠️  *This will put your account in negative!*\n\n` +
      `Current balance:    *₹${balance}*\n` +
      `Withdrawal amount:  *₹${amount}*\n` +
      `Deficit:            *₹${deficit}*\n\n` +
      `Reply *YES* to confirm negative balance\n` +
      `Reply *NO* to cancel`,
  };
};

const negativeConfirmedMessage = (amount, newBal) => ({
  text: `✅ *₹${amount}* withdrawn.\n\n💼 Balance: *₹${newBal.toFixed(2)}* _(negative)_`,
});

const withdrawalCancelledMessage = () => ({
  text: '🚫 Withdrawal cancelled.',
});

// ─── Shared ───────────────────────────────────────────────────────────────────

const cancelledMessage = () => ({
  text: '❌ Operation cancelled.',
});

const balanceMessage = (name, balance) => ({
  text: `💼 *${name}*, your current balance is:\n\n*₹${balance}*`,
});

const invalidAmountMessage = () => ({
  text: "⚠️  That doesn't look like a valid amount.\n\nPlease type a number (e.g. *500*) or *0* to cancel:",
});

module.exports = {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  backToMenuMessage,
  welcomeMessage,
  askAmountMessage,
  depositConfirmedMessage,
  askDebitAmountMessage,
  debitConfirmedMessage,
  negativeBalanceWarningMessage,
  negativeConfirmedMessage,
  withdrawalCancelledMessage,
  cancelledMessage,
  balanceMessage,
  invalidAmountMessage,
};
