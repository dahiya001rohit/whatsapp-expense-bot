'use strict';

const askNameMessage = () => ({
  text:
    `👋 *Welcome to FynxAI!*\n\n` +
    `Your personal finance tracker on WhatsApp.\n\n` +
    `What's your name?`,
});

const nameRegisteredMessage = (name) => ({
  text:
    `✅ Hey *${name}*, you're all set! 🎉\n\n` +
    `Starting balance: *₹0*\n\n` +
    `Type *hi* to get started.`,
});

module.exports = {
  askNameMessage,
  nameRegisteredMessage,
};
