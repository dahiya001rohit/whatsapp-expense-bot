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

const askActualPhoneMessage = (name) => ({
  text:
    `🔒 *Privacy Settings Detected*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Hi *${name}*, WhatsApp has masked your number\n` +
    `due to your privacy settings or connection type.\n\n` +
    `To properly link your SpendBot account, could\n` +
    `you please reply with your WhatsApp phone number?\n` +
    `*(e.g., 919876543210)*`,
});

module.exports = {
  askNameMessage,
  nameRegisteredMessage,
  askActualPhoneMessage,
};
