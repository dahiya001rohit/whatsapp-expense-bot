const mongoose = require('mongoose');

const LendBorrowSchema = new mongoose.Schema({
  phone:         { type: String, required: true },
  personName:    { type: String, required: true },
  type:          { type: String, enum: ['gave', 'took'], required: true },
  amount:        { type: Number, required: true },
  settled:       { type: Boolean, default: false },
  note:          { type: String, default: '' },
  date:          { type: Date, default: Date.now },
  settledAt:     { type: Date },
});

LendBorrowSchema.index({ phone: 1, date: 1 });

module.exports = mongoose.model('LendBorrow', LendBorrowSchema);
