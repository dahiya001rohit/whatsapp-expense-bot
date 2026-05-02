const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    default: null,
  },
  balance: {
    type: Number,
    default: 0,
  },
  // Tracks where the user is in the conversation flow:
  //   'new'         → never interacted before
  //   'awaiting_name' → bot asked for name, waiting for reply
  //   'awaiting_amount' → bot asked for deposit amount
  //   'main_menu'   → fully onboarded, at the main menu
  currentStep: {
    type: String,
    default: 'new',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
