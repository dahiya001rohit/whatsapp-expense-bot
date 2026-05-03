const mongoose = require('mongoose');

const IncomeCategorySchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  name:      { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

IncomeCategorySchema.index({ phone: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('IncomeCategory', IncomeCategorySchema);
