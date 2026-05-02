/**
 * messages.js — premium bank-staff tone, plain text only.
 * Bold via *asterisks* for WhatsApp formatting.
 */

/** Format: no decimals unless fractional. 500 → "500", 500.5 → "500.50" */
const fmt = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));

/** Build a numbered list string from an array of category names. */
const categoryList = (cats) =>
  cats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');

// ─── Onboarding ───────────────────────────────────────────────────────────────

const askNameMessage = () => ({
  text:
    `👋 Welcome to *SpendBot*!\n\n` +
    `We're glad to have you here. Let's get your ` +
    `account set up in just a few seconds.\n\n` +
    `Could you please tell us your *name*?`,
});

const nameRegisteredMessage = (name) => ({
  text:
    `✅ *Account Created Successfully!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Welcome aboard, *${name}*! 🎉\n\n` +
    `Your account has been created with a starting\n` +
    `balance of *₹0.00*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `You're all set! Type *hi* to see your options\n` +
    `and get started.`,
});

// ─── Welcome / main menu ──────────────────────────────────────────────────────

const welcomeMessage = (name, balance) => ({
  text:
    `👋 Welcome back, *${name}*!\n\n` +
    `Here's a quick look at where you stand:\n` +
    `💼 Current Balance: *₹${fmt(balance)}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Here's what you can do:\n\n` +
    `1️⃣  *Add Money* — Deposit funds into your account\n` +
    `2️⃣  *Withdraw Money* — Debit funds from your account\n` +
    `3️⃣  *Manage Categories* — Add or remove categories\n\n` +
    `📌 *Quick Commands*\n` +
    `• Type *BAL* anytime to check your balance\n` +
    `• Type *0* anytime to cancel an operation\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `_Reply with 1, 2, or 3 to get started._`,
});

// ─── Global shortcuts ─────────────────────────────────────────────────────────

const balanceMessage = (name, balance) => ({
  text:
    `💼 *Account Balance*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}*, your current balance is:\n\n` +
    `*₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to see your options._`,
});

const cancelledMessage = (balance) => ({
  text:
    `❌ *Operation Cancelled*\n\n` +
    `No changes have been made to your account.\n` +
    `Your balance remains *₹${fmt(balance)}*.\n\n` +
    `_Type *hi* whenever you're ready to continue._`,
});

const unrecognisedMessage = () => ({
  text:
    `🤔 Hmm, we didn't quite catch that.\n\n` +
    `Type *hi* to see your options\n` +
    `Type *BAL* to check your balance\n` +
    `Type *0* to cancel any ongoing operation`,
});

// ─── Add Money ────────────────────────────────────────────────────────────────

const askAmountMessage = () => ({
  text:
    `💰 *Add Money*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter the amount you'd like to\n` +
    `deposit into your account.\n\n` +
    `_Type the amount in ₹ — for example, *500*_\n` +
    `_Type *0* to cancel this operation._`,
});

const depositConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *Deposit Successful!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Amount Deposited:   *₹${fmt(amount)}*\n` +
    `Category:           *${category}*\n` +
    `Previous Balance:   *₹${fmt(prevBal)}*\n` +
    `Current Balance:    *₹${fmt(newBal)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to make another transaction._`,
});

const invalidDepositMessage = () => ({
  text:
    `⚠️ *Invalid Amount*\n\n` +
    `That doesn't look like a valid number.\n` +
    `Please enter a positive amount in ₹.\n\n` +
    `_For example, type *500* to deposit ₹500_\n` +
    `_Type *0* to cancel._`,
});

// ─── Withdraw ─────────────────────────────────────────────────────────────────

const askDebitAmountMessage = (balance) => ({
  text:
    `💸 *Withdraw Money*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter the amount you'd like to\n` +
    `withdraw from your account.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n\n` +
    `_Type the amount in ₹ — for example, *200*_\n` +
    `_Type *0* to cancel this operation._`,
});

const withdrawConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *Withdrawal Successful!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Amount Withdrawn:   *₹${fmt(amount)}*\n` +
    `Category:           *${category}*\n` +
    `Previous Balance:   *₹${fmt(prevBal)}*\n` +
    `Current Balance:    *₹${fmt(newBal)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to make another transaction._`,
});

const invalidDebitMessage = (balance) => ({
  text:
    `⚠️ *Invalid Amount*\n\n` +
    `Please enter a valid withdrawal amount in ₹.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n\n` +
    `_Type *0* to cancel._`,
});

// ─── Category selection ───────────────────────────────────────────────────────

const selectCategoryMessage = (cats) => ({
  text:
    `🗂️ *Select Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Which category does this belong to?\n\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with the category number_\n` +
    `_Type *0* to cancel_`,
});

const invalidCategoryMessage = (total) => ({
  text:
    `⚠️ *Invalid Selection*\n\n` +
    `Please reply with a number\n` +
    `between 1 and ${total}.\n\n` +
    `_Type *0* to cancel._`,
});

// ─── Negative balance confirmation ────────────────────────────────────────────

const negativeWarningMessage = (balance, amount) => {
  const deficit = amount - balance;
  return {
    text:
      `⚠️ *Insufficient Balance Warning*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `We noticed this withdrawal exceeds\n` +
      `your current balance.\n\n` +
      `Current Balance:    *₹${fmt(balance)}*\n` +
      `Withdrawal Amount:  *₹${fmt(amount)}*\n` +
      `Deficit:            *₹${fmt(deficit)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `This will leave your account in\n` +
      `a *negative balance*.\n\n` +
      `Are you sure you want to proceed?\n\n` +
      `Reply *YES* to confirm\n` +
      `Reply *NO* to cancel`,
  };
};

const negativeWithdrawConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *Withdrawal Confirmed*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Amount Withdrawn:   *₹${fmt(amount)}*\n` +
    `Category:           *${category}*\n` +
    `Previous Balance:   *₹${fmt(prevBal)}*\n` +
    `Current Balance:    *₹${fmt(newBal)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ Your account is currently in\n` +
    `a negative balance. Please deposit\n` +
    `funds at your earliest convenience.\n\n` +
    `_Type *hi* to make another transaction._`,
});

const withdrawCancelledMessage = (balance) => ({
  text:
    `❌ *Withdrawal Cancelled*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No changes have been made\n` +
    `to your account.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* whenever you're ready._`,
});

const needYesOrNoMessage = () => ({
  text:
    `🤔 We need a clear confirmation.\n\n` +
    `Please reply with:\n` +
    `*YES* — to confirm the withdrawal\n` +
    `*NO* — to cancel and keep your balance safe`,
});

// ─── Manage Categories ────────────────────────────────────────────────────────

const manageCategoriesMessage = (cats) => ({
  text:
    `🗂️ *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to create a new category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const askNewCategoryNameMessage = () => ({
  text:
    `✏️ *New Category*\n\n` +
    `What would you like to name\n` +
    `your new category?\n\n` +
    `_Type *0* to cancel._`,
});

const categoryCreatedMessage = (name) => ({
  text:
    `✅ *Category Created*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been added to\n` +
    `your categories.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

const askDeleteCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type the *number* of the category\n` +
    `you want to delete.\n\n` +
    `_Type *0* to cancel._`,
});

const categoryDeletedMessage = (name) => ({
  text:
    `✅ *Category Deleted*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been removed.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

const lastCategoryWarningMessage = () => ({
  text:
    `⚠️ You must keep at least\n` +
    `one category.\n\n` +
    `_Type *0* to go back._`,
});

module.exports = {
  askNameMessage,
  nameRegisteredMessage,
  welcomeMessage,
  balanceMessage,
  cancelledMessage,
  unrecognisedMessage,
  askAmountMessage,
  depositConfirmedMessage,
  invalidDepositMessage,
  askDebitAmountMessage,
  withdrawConfirmedMessage,
  invalidDebitMessage,
  selectCategoryMessage,
  invalidCategoryMessage,
  negativeWarningMessage,
  negativeWithdrawConfirmedMessage,
  withdrawCancelledMessage,
  needYesOrNoMessage,
  manageCategoriesMessage,
  askNewCategoryNameMessage,
  categoryCreatedMessage,
  askDeleteCategoryMessage,
  categoryDeletedMessage,
  lastCategoryWarningMessage,
};
