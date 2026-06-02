'use strict';

const { fmt } = require('./formatters');

const askAmountMessage = () => ({
  text: `💰 *Add money*\n\n_How much? (e.g. 500)_\n_Type *0* to cancel._`,
});

const depositConfirmedMessage = (amount, category, prevBal, newBal) => ({
  text:
    `✅ *+₹${fmt(amount)}* · ${category}\n` +
    `Balance: *₹${fmt(newBal)}*`,
});

const invalidDepositMessage = () => ({
  text:
    `⚠️ Enter a valid amount in ₹ (e.g. *500*)\n` +
    `Max: ₹1,00,00,000 · must be positive\n` +
    `_Type *0* to cancel._`,
});

const askCreditNoteMessage = () => ({
  text: `📝 Add a note? (optional)\n\n_Type your note or *SKIP*_`,
});

module.exports = {
  askAmountMessage,
  depositConfirmedMessage,
  invalidDepositMessage,
  askCreditNoteMessage,
};
