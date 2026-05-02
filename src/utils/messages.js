/**
 * messages.js
 * All bot reply payloads.
 *
 * List-menu payloads carry a `sections` array — the send() helper in handler.js
 * detects this and passes them through Baileys' list-message path.
 *
 * WhatsApp list-tap responses come back as:
 *   msg.listResponseMessage?.singleSelectReply?.selectedRowId
 */

// ─── Onboarding ───────────────────────────────────────────────────────────────

const askNameMessage = () => ({
  text: "👋 Welcome to *Expense Tracker*!\n\nWhat's your name?",
});

const accountCreatedMessage = (name) => ({
  text: `✅ Account created! Welcome, *${name}*! 🎉\n\nYour current balance is *₹0*`,
});

// ─── Main menu (3 options) ────────────────────────────────────────────────────

const MENU_SECTIONS = [
  {
    title: 'Options',
    rows: [
      { title: '➕  Add Money',      rowId: '1', description: 'Deposit funds to your account' },
      { title: '➖  Withdraw Money', rowId: '2', description: 'Debit funds from your account' },
      { title: '📊  Check Balance',  rowId: '3', description: 'View your current balance'     },
    ],
  },
];

const mainMenuMessage = (name) => ({
  // `text` becomes the list description; `title` is the header
  text: `What would you like to do?`,
  title: `Hey *${name}*! 👋`,
  footer: 'Expense Tracker Bot 💸',
  buttonText: 'Open Menu',
  sections: MENU_SECTIONS,
});

const backToMenuMessage = (name) => ({
  text: `What would you like to do next?`,
  title: `Hey *${name}*! 👋`,
  footer: 'Expense Tracker Bot 💸',
  buttonText: 'Open Menu',
  sections: MENU_SECTIONS,
});

// ─── Add Money flow ───────────────────────────────────────────────────────────

const askAmountMessage = () => ({
  text: '💰 How much would you like to *add*?\n\n_Type the amount in ₹ (e.g. *500*)_',
});

const depositConfirmedMessage = (added, newBal) => ({
  text: `✅ *₹${added}* added successfully!\n\n💼 New balance: *₹${newBal}*`,
});

// ─── Withdraw flow ────────────────────────────────────────────────────────────

const askDebitAmountMessage = () => ({
  text: '💸 How much would you like to *withdraw*?\n\n_Type the amount in ₹ (e.g. *200*)_',
});

const debitConfirmedMessage = (amount, newBal) => ({
  text: `✅ *₹${amount}* withdrawn successfully!\n\n💼 Remaining balance: *₹${newBal}*`,
});

const insufficientBalanceMessage = (available) => ({
  text: `❌ Insufficient balance!\n\nYou only have *₹${available}* available.`,
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
  balanceMessage,
  invalidAmountMessage,
};
