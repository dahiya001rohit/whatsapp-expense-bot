'use strict';

const { fmt } = require('./formatters');

const welcomeMessage = (name, balance) => ({
  text:
    `👋 *Welcome back, ${name}!*\n` +
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

module.exports = {
  welcomeMessage,
};
