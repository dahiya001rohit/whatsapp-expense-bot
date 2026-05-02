/**
 * messages.js — premium bank-staff tone, plain text only.
 * Bold via *asterisks* for WhatsApp formatting.
 */

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Amount with comma separators, no decimals unless fractional. */
const fmt = (n) => {
  const num  = Number(n);
  const abs  = Math.abs(num);
  const str  = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + parts.join('.');
};

const EMOJIS = {
  food: '🍕', transport: '🚗', bills: '💡', entertainment: '🎬',
  shopping: '🛍️', health: '🏥', education: '📚', misc: '📦',
  uncategorised: '📦',
};
const emojiFor = (name) => EMOJIS[name.toLowerCase()] || '📁';

/** Numbered list from category docs. */
const categoryList = (cats) => cats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');

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
    `2️⃣  *Withdraw Money* — Debit funds from your account\n\n` +
    `📌 *Quick Commands*\n` +
    `• Type *BAL* anytime to check your balance\n` +
    `• Type *MORE* for reports, budgets & categories\n` +
    `• Type *0* anytime to cancel an operation\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `_Reply with 1 or 2 to get started._`,
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
    `Type *MORE* for reports, budgets & categories\n` +
    `Type *0* to cancel any ongoing operation`,
});

// ─── MORE menu ────────────────────────────────────────────────────────────────

const moreMenuMessage = () => ({
  text:
    `📋 *More Options*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Here's what else you can do:\n\n` +
    `1️⃣  *Spending Report* — See spending by category\n` +
    `2️⃣  *Manage Budgets* — Set category spending limits\n` +
    `3️⃣  *Manage Categories* — Add or remove categories\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with 1, 2, or 3_\n` +
    `_Type *0* to go back_`,
});

// ─── Spending Report ──────────────────────────────────────────────────────────

const spendingReportMessage = (rows, total, balance) => {
  const lines = rows
    .map((r) => `${emojiFor(r.category)} ${r.category.padEnd(16)}₹${fmt(r.total)}`)
    .join('\n');
  return {
    text:
      `📊 *Spending Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Here's your spending breakdown:\n\n` +
      `${lines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Total Spent:    ₹${fmt(total)}*\n` +
      `💼 *Balance:        ₹${fmt(balance)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *hi* to continue._`,
  };
};

const noTransactionsMessage = () => ({
  text:
    `📊 *Spending Report*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No transactions recorded yet.\n\n` +
    `Start by adding a transaction\n` +
    `to see your spending breakdown.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

// ─── Manage Budgets ───────────────────────────────────────────────────────────

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
    `Current limit: ${currentLimit != null ? `₹${fmt(currentLimit)}` : 'Not set'}\n\n` +
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
    `_Type *hi* to continue._`,
});

const budgetRemovedMessage = (categoryName) => ({
  text:
    `✅ *Budget Removed*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Spending limit for *${categoryName}*\n` +
    `has been removed.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to continue._`,
});

const invalidBudgetAmountMessage = () => ({
  text:
    `⚠️ Please enter a valid\n` +
    `amount in ₹.\n` +
    `_Type *0* to cancel._`,
});

// ─── Budget alerts (sent after debit) ────────────────────────────────────────

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
  moreMenuMessage,
  spendingReportMessage,
  noTransactionsMessage,
  manageBudgetsMessage,
  askBudgetAmountMessage,
  budgetSetMessage,
  budgetRemovedMessage,
  invalidBudgetAmountMessage,
  budgetAlertMessage,
  budgetNoticeMessage,
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
