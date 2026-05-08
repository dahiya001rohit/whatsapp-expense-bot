'use strict';

const { fmt } = require('./formatters');

const askAmountMessage = () => ({
  text:
    `💰 *Add Money*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please enter the amount you'd like to\n` +
    `deposit into your account.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
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
    `⚠️ *Invalid Amount*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `That doesn't look like a valid number.\n` +
    `Please enter a positive amount in ₹.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_For example, type *500* to deposit ₹500_\n` +
    `_Type *0* to cancel._`,
});

const askCreditNoteMessage = () => ({
  text:
    `📝 *Add a Note?*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `You can add a note to this deposit.\n` +
    `_(e.g. 'monthly salary')_\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type your note, or type *SKIP* to skip._`,
});

module.exports = {
  askAmountMessage,
  depositConfirmedMessage,
  invalidDepositMessage,
  askCreditNoteMessage,
};
