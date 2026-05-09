'use strict';

const { fmt } = require('./formatters');

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
    `❌ *Operation Cancelled*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No changes have been made to your account.\n` +
    `Your balance remains *₹${fmt(balance)}*.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* whenever you're ready to continue._`,
});

const unrecognisedMessage = () => ({
  text:
    `🤔 *Hmm, we didn't quite catch that.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *hi* to see your options\n` +
    `Type *BAL* to check your balance\n` +
    `Type *MORE* for reports, budgets & categories\n` +
    `Type *0* to cancel any ongoing operation\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with a valid command to continue._`,
});

const deploymentMessage = () => ({
  text:
    `🚀 *SpendBot Update!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `The bot has just been updated with\n` +
    `new features and improvements.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* to explore what's new!_`,
});

module.exports = {
  balanceMessage,
  cancelledMessage,
  unrecognisedMessage,
  deploymentMessage,
};
