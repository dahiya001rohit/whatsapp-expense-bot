/**
 * messages.js
 * Plain-text only payloads — the only format that works reliably
 * with Baileys on personal WhatsApp accounts.
 *
 * WhatsApp blocks both buttonsMessage and listMessage for unofficial APIs.
 * Navigation uses typed numbers: 1 = Add, 2 = Withdraw, 3 = Balance.
 */

// ─── Onboarding ───────────────────────────────────────────────────────────────

const askNameMessage = () => ({
  text: "👋 Welcome to *Expense Tracker*!\n\nWhat's your name?",
});

const accountCreatedMessage = (name) => ({
  text: `✅ Account created! Welcome, *${name}*! 🎉\n\nYour current balance is *₹0*`,
});

// ─── Main menu ────────────────────────────────────────────────────────────────

const MENU_TEXT = (name) =>
  `Hey *${name}*! 👋 What would you like to do?\n\n` +
  `1️⃣  Add Money\n` +
  `2️⃣  Withdraw Money\n` +
  `3️⃣  Check Balance\n\n` +
  `_Reply with *1*, *2*, or *3*_`;

const mainMenuMessage  = (name) => ({ text: MENU_TEXT(name) });
const backToMenuMessage = (name) => ({ text: MENU_TEXT(name) });

// ─── Add Money flow ───────────────────────────────────────────────────────────

const askAmountMessage = () => ({
  text: '💰 How much would you like to *add*?\n\n_Type the amount in ₹ (e.g. 500)_',
});

const depositConfirmedMessage = (added, newBal) => ({
  text: `✅ *₹${added}* added successfully!\n\n💼 New balance: *₹${newBal}*`,
});

// ─── Withdraw flow ────────────────────────────────────────────────────────────

const askDebitAmountMessage = () => ({
  text: '💸 How much would you like to *withdraw*?\n\n_Type the amount in ₹ (e.g. 200)_',
});

const debitConfirmedMessage = (amount, newBal) => ({
  text: `✅ *₹${amount}* withdrawn successfully!\n\n💼 Remaining balance: *₹${newBal}*`,
});

const insufficientBalanceMessage = (available) => ({
  text: `❌ *Insufficient balance!*\n\nYou only have *₹${available}* available.\n\nEnter a smaller amount:`,
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

// ─── Check Balance ────────────────────────────────────────────────────────────

const balanceMessage = (name, balance) => ({
  text: `💼 *${name}*, your current balance is:\n\n*₹${balance}*`,
});

// ─── Validation ───────────────────────────────────────────────────────────────

const invalidAmountMessage = () => ({
  text: "⚠️  That doesn't look like a valid amount.\n\nPlease type a number (e.g. *500*):",
});

module.exports = {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  backToMenuMessage,
  askAmountMessage,
  depositConfirmedMessage,
  askDebitAmountMessage,
  debitConfirmedMessage,
  insufficientBalanceMessage,
  negativeBalanceWarningMessage,
  negativeConfirmedMessage,
  withdrawalCancelledMessage,
  balanceMessage,
  invalidAmountMessage,
};
