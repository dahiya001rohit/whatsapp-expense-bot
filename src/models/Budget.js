const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  limit: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index — one budget per category per user
budgetSchema.index({ phone: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
