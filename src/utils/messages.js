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
    `👋 Welcome back, *${name}*!\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💼 Balance: *₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `1️⃣  Add Money\n` +
    `2️⃣  Withdraw Money\n\n` +
    `📌 *Quick Commands*\n` +
    `• *BAL* — Check balance instantly\n` +
    `• *MORE* — Reports, budgets, categories,\n` +
    `           lending & borrowing\n` +
    `• *0* — Cancel anytime\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with 1 or 2 to transact._`,
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
    `3️⃣  *Manage Categories* — Add or remove categories\n` +
    `4️⃣  *Lending & Borrowing* — Track loans and dues\n` +
    `5️⃣  *Reset Account* — Clear your account data\n` +
    `6️⃣  *Transaction History* — View last 10 transactions\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with 1, 2, 3, 4, 5, or 6_\n` +
    `_Type *0* to go back_`,
});

// ─── Spending Report ──────────────────────────────────────────────────────────

const INCOME_EMOJIS = {
  salary: '💼', freelance: '💻', family: '👨‍👩‍👧', stipend: '🎓',
  cashback: '🎁', 'other income': '💵',
};
const incomeEmojiFor = (name) => INCOME_EMOJIS[name.toLowerCase()] || '💰';

const spendingReportMessage = (creditRows, debitRows, totalCredited, totalSpent, balance) => {
  const creditSection = creditRows.length > 0
    ? creditRows.map((r) => `${incomeEmojiFor(r.category)} ${r.category.padEnd(20)}₹${fmt(r.total)}`).join('\n')
    : `No deposits this month`;

  const spendSection = debitRows.length > 0
    ? debitRows.map((r) => `${emojiFor(r.category)} ${r.category.padEnd(20)}₹${fmt(r.total)}`).join('\n')
    : `No spending recorded this month`;

  return {
    text:
      `📊 *Spending Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Money In*\n\n` +
      `${creditSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Money Out*\n\n` +
      `${spendSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Total In:    *₹${fmt(totalCredited)}*\n` +
      `💸 Total Out:   *₹${fmt(totalSpent)}*\n` +
      `💼 Balance:     *₹${fmt(balance)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *hi* for main menu or *MORE* for more options._`,
  };
};

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
    `_Type *hi* for menu or *MORE* for options._`,
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
    `_Type *hi* for menu or *MORE* for options._`,
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
    `_Type *hi* for menu or *MORE* for options._`,
});

const withdrawCancelledMessage = (balance) => ({
  text:
    `❌ *Withdrawal Cancelled*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No changes have been made\n` +
    `to your account.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* for menu or *MORE* for options._`,
});

const needYesOrNoMessage = () => ({
  text:
    `🤔 We need a clear confirmation.\n\n` +
    `Please reply with:\n` +
    `*YES* — to confirm the withdrawal\n` +
    `*NO* — to cancel and keep your balance safe`,
});

// ─── Reset Flow ───────────────────────────────────────────────────────────────

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
    `     Restores default categories.\n\n` +
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
    `Reply *NO* to clear both\n\n` +
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
        `*${txCount}*\n\n` +
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
      `*${txCount}*\n\n` +
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
    `Budgets:               *${keepBudgets ? 'Kept' : 'Cleared'}*\n\n` +
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
    `Default categories have been restored.\n\n` +
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
  text: `⚠️ Type *CONFIRM* to proceed\nor *0* to cancel.`,
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

const categoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *Category Created*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been added\n` +
    `to your categories.\n\n` +
    `📁 *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add another category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
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

const categoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *Category Deleted*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been removed.\n\n` +
    `📁 *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add a category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const lastCategoryWarningMessage = () => ({
  text:
    `⚠️ You must keep at least\n` +
    `one category.\n\n` +
    `_Type *0* to go back._`,
});

// ─── Income category selection (credit flow) ──────────────────────────────────
const selectIncomeCategoryMessage = (cats) => ({
  text:
    `💰 *Select Income Type*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What is this money from?\n\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with category number_\n` +
    `_Type *0* to cancel_`,
});

// ─── Manage categories sub-menu ───────────────────────────────────────────────
const manageCategoriesMenuMessage = () => ({
  text:
    `🗂️ *Manage Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What would you like to manage?\n\n` +
    `1️⃣  *Spending Categories*\n` +
    `2️⃣  *Income Categories*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to go back_`,
});

// ─── Manage income categories ─────────────────────────────────────────────────
const manageIncomeCategoriesMessage = (cats) => ({
  text:
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to create a new category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const askNewIncomeCategoryNameMessage = () => ({
  text:
    `✏️ *New Income Category*\n\n` +
    `What would you like to name\n` +
    `this income category?\n\n` +
    `_Type *0* to cancel._`,
});

const incomeCategoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *Income Category Created*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been added.\n\n` +
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add another\n` +
    `Type *DEL* to delete\n` +
    `Type *0* to go back`,
});

const askDeleteIncomeCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete Income Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type the *number* of the category\n` +
    `you want to delete.\n\n` +
    `_Type *0* to cancel._`,
});

const incomeCategoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *Income Category Deleted*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been removed.\n\n` +
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add a category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

// ─── Lending & Borrowing ──────────────────────────────────────────────────────
const lendBorrowMenuMessage = (totalOwedToYou, totalYouOwe) => {
  const summaryLine = (totalOwedToYou > 0 || totalYouOwe > 0)
    ? `🟢 Owed to you:  ₹${fmt(totalOwedToYou)}\n🔴 You owe:      ₹${fmt(totalYouOwe)}\n`
    : `No outstanding balances.\n`;
  return {
    text:
      `💸 *Lending & Borrowing*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${summaryLine}` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `What would you like to do?\n\n` +
      `1️⃣  *I Gave Money* — they owe me\n` +
      `2️⃣  *I Took Money* — I owe them\n` +
      `3️⃣  *View All Balances*\n` +
      `4️⃣  *Settle Up*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Reply with 1, 2, 3, or 4_\n` +
      `_Type *0* to go back_`,
  };
};

const lendPersonSelectMessage = (lendType, people) => {
  const verb = lendType === 'gave' ? 'give to' : 'take from';
  const title = lendType === 'gave' ? 'I Gave Money' : 'I Took Money';
  const recentSection = people.length > 0
    ? `Recent people:\n${people.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nOr type a *new name* directly`
    : `Type the person's *name*:`;
  return {
    text:
      `💸 *${title}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Who did you ${verb}?\n\n` +
      `${recentSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *0* to cancel_`,
  };
};

const lendAskAmountMessage = (lendType, personName) => {
  const verb = lendType === 'gave' ? 'give to' : 'take from';
  return {
    text:
      `💰 *Amount*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `How much did you ${verb}\n` +
      `*${personName}*?\n\n` +
      `_Type amount in ₹_\n` +
      `_Type *0* to cancel_`,
  };
};

const lendGaveConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *Recorded*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💸 You gave *${personName}*\n` +
    `Amount:  *₹${fmt(amount)}*\n` +
    `📅 Date: *${date}*\n\n` +
    `Total *${personName}* owes you:\n` +
    `*₹${fmt(totalOwed)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendTookConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *Recorded*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💸 You took from *${personName}*\n` +
    `Amount:  *₹${fmt(amount)}*\n` +
    `📅 Date: *${date}*\n\n` +
    `Total you owe *${personName}*:\n` +
    `*₹${fmt(totalOwed)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendBalancesMessage = (gavePeople, tookPeople, totalOwedToYou, totalYouOwe) => {
  const net = totalOwedToYou - totalYouOwe;
  const netStr = net >= 0 ? `+₹${fmt(net)}` : `-₹${fmt(Math.abs(net))}`;

  const gaveSection = gavePeople.length > 0
    ? gavePeople.map((p) =>
        `👤 *${p.name}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} on ${r.date}`).join('\n') +
        `\n   *Total: ₹${fmt(p.total)}*`
      ).join('\n\n')
    : `None`;

  const tookSection = tookPeople.length > 0
    ? tookPeople.map((p) =>
        `👤 *${p.name}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} on ${r.date}`).join('\n') +
        `\n   *Total: ₹${fmt(p.total)}*`
      ).join('\n\n')
    : `None`;

  return {
    text:
      `📊 *Lending & Borrowing*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟢 *They Owe You*\n\n` +
      `${gaveSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔴 *You Owe Them*\n\n` +
      `${tookSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟢 Total Owed to You:  *₹${fmt(totalOwedToYou)}*\n` +
      `🔴 Total You Owe:      *₹${fmt(totalYouOwe)}*\n` +
      `💰 Net:                *${netStr}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *MORE* → *4* to continue or *hi* for main menu._`,
  };
};

const lendNoRecordsMessage = () => ({
  text:
    `📊 *Lending & Borrowing*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No records yet.\n\n` +
    `Type *MORE* then *4* to add one.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to add one or *hi* for main menu._`,
});

const lendSettleSelectMessage = (people) => {
  const lines = people.map((p, i) => {
    const dir = p.direction === 'owes_you'
      ? `owes you ₹${fmt(p.net)}`
      : `you owe ₹${fmt(p.net)}`;
    return `${i + 1}. ${p.name}  — ${dir}`;
  }).join('\n');
  return {
    text:
      `✅ *Settle Up*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Who are you settling with?\n\n` +
      `${lines}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type number to select_\n` +
      `_Type *0* to cancel_`,
  };
};

const lendAllClearMessage = () => ({
  text:
    `✅ *All Clear!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No outstanding balances.\n` +
    `Everyone is settled up! 🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* for main menu or *MORE* for more options._`,
});

const lendSettleAmountMessage = (personName, totalAmount) => ({
  text:
    `💰 *Settle — ${personName}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Outstanding: *₹${fmt(totalAmount)}*\n\n` +
    `Type *FULL* to settle completely\n` +
    `Or type partial amount in ₹\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel_`,
});

const lendFullSettledMessage = (personName, amount, date) => ({
  text:
    `✅ *Fully Settled!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${personName}* — ₹${fmt(amount)}\n` +
    `📅 Settled: ${date}\n\n` +
    `All dues cleared! 🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendPartialSettledMessage = (personName, partial, remaining, date) => ({
  text:
    `✅ *Partial Settlement*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${personName}* — ₹${fmt(partial)} settled\n` +
    `📅 Date: ${date}\n\n` +
    `Remaining: *₹${fmt(remaining)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

// ─── Transaction History ──────────────────────────────────────────────────────

const TXN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const transactionHistoryMessage = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { text: `📋 *No transactions yet.*\n\nType *hi* for main menu.` };
  }
  const lines = transactions.map((txn, i) => {
    const d    = new Date(txn.createdAt);
    const day  = String(d.getDate()).padStart(2, '0');
    const mon  = TXN_MONTHS[d.getMonth()];
    const icon = txn.type === 'credit' ? '💰' : '💸';
    const sign = txn.type === 'credit' ? '+' : '-';
    let line = `${i + 1}. ${day} ${mon} — ${icon} ${txn.category}   *${sign}₹${fmt(txn.amount)}*   bal ₹${fmt(txn.newBalance)}`;
    if (txn.note) line += `\n   _${txn.note}_`;
    return line;
  });
  return {
    text:
      `📋 *Recent Transactions:*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      lines.join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *hi* for main menu._`,
  };
};

const askDebitNoteMessage = () => ({
  text: `📝 Add a note? _(e.g. 'lunch at office')_\n\nOr type *SKIP* to skip.`,
});

const askCreditNoteMessage = () => ({
  text: `📝 Add a note? _(e.g. 'monthly salary')_\n\nOr type *SKIP* to skip.`,
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
  manageBudgetsMessage,
  askBudgetAmountMessage,
  budgetSetMessage,
  budgetRemovedMessage,
  invalidBudgetAmountMessage,
  budgetAlertMessage,
  budgetNoticeMessage,
  resetTypeMessage,
  resetKeepCategoriesMessage,
  resetFinalConfirmMessage,
  resetSuccessMessage,
  fullResetSuccessMessage,
  resetCancelledMessage,
  resetConfirmNudgeMessage,
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
  selectIncomeCategoryMessage,
  manageCategoriesMenuMessage,
  manageIncomeCategoriesMessage,
  askNewIncomeCategoryNameMessage,
  incomeCategoryCreatedMessage,
  askDeleteIncomeCategoryMessage,
  incomeCategoryDeletedMessage,
  lendBorrowMenuMessage,
  lendPersonSelectMessage,
  lendAskAmountMessage,
  lendGaveConfirmedMessage,
  lendTookConfirmedMessage,
  lendBalancesMessage,
  lendNoRecordsMessage,
  lendSettleSelectMessage,
  lendAllClearMessage,
  lendSettleAmountMessage,
  lendFullSettledMessage,
  lendPartialSettledMessage,
  transactionHistoryMessage,
  askDebitNoteMessage,
  askCreditNoteMessage,
  fmt,
};
