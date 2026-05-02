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

module.exports = mongoose.model('Category', categorySchema);
