'use strict';

const { fmt } = require('./formatters');

const balanceMessage = (name, balance) => ({
  text:
    `💼 *${name}* — Balance: *₹${fmt(balance)}*\n\n` +
    `_Type *hi* for menu._`,
});

const cancelledMessage = (balance) => ({
  text:
    `❌ Cancelled. Balance: *₹${fmt(balance)}*\n\n` +
    `_Type *hi* anytime._`,
});

const unrecognisedMessage = () => ({
  text:
    `🤔 Didn't catch that.\n\n` +
    `*hi* → menu\n` +
    `*BAL* → balance\n` +
    `*MORE* → reports & options\n` +
    `*TXN* → transaction history\n` +
    `*0* → cancel`,
});

const deploymentMessage = () => ({
  text:
    `🚀 *FynxAI updated!*\n\n` +
    `New features and fixes are live.\n` +
    `_Type *hi* to explore what's new!_`,
});

module.exports = {
  balanceMessage,
  cancelledMessage,
  unrecognisedMessage,
  deploymentMessage,
};
