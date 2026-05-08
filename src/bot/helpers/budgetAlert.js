'use strict';

const Budget      = require('../../models/Budget');
const Transaction = require('../../models/Transaction');
const { budgetAlertMessage, budgetNoticeMessage } = require('../../utils/messages');
const { send }         = require('./send');
const { startOfMonth } = require('./constants');

async function checkBudgetAlert(sock, jid, phone, category) {
  const budget = await Budget.findOne({ phone, category });
  if (!budget) return;

  const [result] = await Transaction.aggregate([
    { $match: { phone, type: 'debit', category, createdAt: { $gte: startOfMonth() } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalSpent = result?.total ?? 0;
  const pct        = totalSpent / budget.limit;

  if (pct >= 1) {
    await send(sock, jid, budgetAlertMessage(category, budget.limit, totalSpent));
  } else if (pct >= 0.8) {
    await send(sock, jid, budgetNoticeMessage(category, budget.limit, totalSpent));
  }
}

module.exports = { checkBudgetAlert };
