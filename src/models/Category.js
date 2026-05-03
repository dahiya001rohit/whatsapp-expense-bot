const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,      // fast lookup by owner
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

categorySchema.index({ phone: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
