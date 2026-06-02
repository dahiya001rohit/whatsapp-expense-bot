'use strict';

const { fmt } = require('./formatters');

const askDebitAmountMessage = (balance) => ({
  text:
    `💸 *Spend*\n` +
    `Balance: *₹${fmt(balance)}*\n\n` +
    `_How much? (e.g. 200)_\n` +
    `_Type *0* to cancel._`,
});

const withdrawConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *-₹${fmt(amount)}* · ${category}\n` +
    `Balance: *₹${fmt(newBal)}*`,
});

const invalidDebitMessage = (balance) => ({
  text:
    `⚠️ Enter a valid amount in ₹ (e.g. *200*)\n` +
    `Balance: *₹${fmt(balance)}*\n` +
    `_Type *0* to cancel._`,
});

const negativeWarningMessage = (balance, amount) => {
  const deficit = amount - balance;
  return {
    text:
      `⚠️ *This will go negative*\n\n` +
      `Balance:    *₹${fmt(balance)}*\n` +
      `Withdraw:   *₹${fmt(amount)}*\n` +
      `Deficit:    *₹${fmt(deficit)}*\n\n` +
      `*YES* → confirm anyway\n` +
      `*NO* → cancel`,
  };
};

const negativeWithdrawConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *-₹${fmt(amount)}* · ${category}\n` +
    `Balance: *₹${fmt(newBal)}* ⚠️ _negative_\n\n` +
    `_Deposit when you can!_`,
});

const withdrawCancelledMessage = (balance) => ({
  text:
    `❌ Cancelled. Balance: *₹${fmt(balance)}*\n\n` +
    `_Type *hi* anytime._`,
});

const needYesOrNoMessage = () => ({
  text: `Reply *YES* to confirm or *NO* to cancel.`,
});

const askDebitNoteMessage = () => ({
  text: `📝 Add a note? (optional)\n\n_Type your note or *SKIP*_`,
});

module.exports = {
  askDebitAmountMessage,
  withdrawConfirmedMessage,
  invalidDebitMessage,
  negativeWarningMessage,
  negativeWithdrawConfirmedMessage,
  withdrawCancelledMessage,
  needYesOrNoMessage,
  askDebitNoteMessage,
};
