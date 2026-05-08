'use strict';

const moreMenuMessage = () => ({
  text:
    `📋 *More Options*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Here's what else you can do:\n\n` +
    `1️⃣  *Smart Insights* — Monthly summary & trends\n` +
    `2️⃣  *Transaction History* — Browse by date\n` +
    `3️⃣  *Categories & Budgets* — Manage your data\n` +
    `4️⃣  *Lending & Borrowing* — Track loans\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with 1, 2, 3, or 4_\n` +
    `_Type *0* to go back_\n` +
    `_Type *RESET* anytime to reset your data_`,
});

module.exports = {
  moreMenuMessage,
};
