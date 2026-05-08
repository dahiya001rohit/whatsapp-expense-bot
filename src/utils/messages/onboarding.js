'use strict';

const { fmt } = require('./formatters');

const askNameMessage = () => ({
  text:
    `👋 *Welcome to SpendBot!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `We're glad to have you here. Let's get your\n` +
    `account set up in just a few seconds.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Could you please tell us your *name*?`,
});

const nameRegisteredMessage = (name) => ({
  text:
    `✅ *Account Created Successfully!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Welcome aboard, *${name}*! 🎉\n\n` +
    `Your account has been created with a starting\n` +
    `balance of *₹0.00*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `You're all set! Type *hi* to see your options\n` +
    `and get started.`,
});

module.exports = {
  askNameMessage,
  nameRegisteredMessage,
};
