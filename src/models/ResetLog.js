const mongoose = require('mongoose');

const resetLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  resetType: {
    type: String,
    enum: ['full', 'transactions_only'],
    required: true,
  },
  keptCategories: {
    type: Boolean,
    default: false,
  },
  keptBudgets: {
    type: Boolean,
    default: false,
  },
  balanceBeforeReset: {
    type: Number,
    default: 0,
  },
  transactionCount: {
    type: Number,
    default: 0,
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ResetLog', resetLogSchema);
