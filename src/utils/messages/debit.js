'use strict';

const { fmt } = require('./formatters');

const askDebitAmountMessage = (balance) => ({
  text:
    `💸 *Withdraw Money*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter the amount you'd like to\n` +
    `withdraw from your account.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
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
    `⚠️ *Invalid Amount*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter a valid withdrawal amount in ₹.\n\n` +
    `Current Balance: *₹${fmt(balance)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

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
      `Are you sure you want to proceed?\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
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
    `funds at your earliest convenience.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
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
    `🤔 *Confirmation Needed*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please reply with:\n` +
    `*YES* — to confirm the withdrawal\n` +
    `*NO* — to cancel and keep your balance safe\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with YES or NO._`,
});

const askDebitNoteMessage = () => ({
  text:
    `📝 *Add a Note?*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `You can add a note to this withdrawal.\n` +
    `_(e.g. 'lunch at office')_\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type your note, or type *SKIP* to skip._`,
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
