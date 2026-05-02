/**
 * messages.js
 * All bot reply payloads as plain text.
 *
 * WhatsApp has deprecated buttonsMessage AND listMessage for unofficial bots.
 * Plain text + numbered replies is the only reliably working approach.
 */

const askNameMessage = () => ({
  text: "👋 Welcome to *Expense Tracker*!\n\nWhat's your name?",
});

const accountCreatedMessage = (name) => ({
  text: `✅ Account created! Welcome, *${name}*! 🎉\n\nYour current balance is *₹0*`,
});

const mainMenuMessage = (name) => ({
  text:
    `Hey *${name}*! 👋\n\n` +
    `What would you like to do?\n\n` +
    `1️⃣  Add Money\n` +
    `2️⃣  Check Balance\n\n` +
    `_Reply with *1* or *2*_`,
});

const askAmountMessage = () => ({
  text: '💰 How much would you like to add?\n\n_Type the amount in ₹ (e.g. *500*)_',
});

const depositConfirmedMessage = (added, newBal) => ({
  text: `✅ *₹${added}* added successfully!\n\n💼 New balance: *₹${newBal}*`,
});

const balanceMessage = (name, balance) => ({
  text: `💼 *${name}*, your current balance is:\n\n*₹${balance}*`,
});

const backToMenuMessage = (name) => ({
  text:
    `What would you like to do next, *${name}*?\n\n` +
    `1️⃣  Add Money\n` +
    `2️⃣  Check Balance\n\n` +
    `_Reply with *1* or *2*_`,
});

const invalidAmountMessage = () => ({
  text: "⚠️  That doesn't look like a valid amount.\n\nPlease type a number (e.g. *500*):",
});

const invalidChoiceMessage = () => ({
  text: "⚠️  Please reply with *1* (Add Money) or *2* (Check Balance).",
});

module.exports = {
  askNameMessage,
  accountCreatedMessage,
  mainMenuMessage,
  askAmountMessage,
  depositConfirmedMessage,
  balanceMessage,
  backToMenuMessage,
  invalidAmountMessage,
  invalidChoiceMessage,
};
