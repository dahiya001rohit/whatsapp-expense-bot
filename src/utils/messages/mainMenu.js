'use strict';

const { fmt } = require('./formatters');

const welcomeMessage = (name, balance) => ({
  text:
    `👋 *${name}* — ₹${fmt(balance)}\n\n` +
    `*1* → Add money\n` +
    `*2* → Spend\n\n` +
    `*BAL* · *MORE* · *TXN* · *0* to cancel`,
});

module.exports = { welcomeMessage };
