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
  //   'new'                      → never interacted before
  //   'awaiting_name'            → bot asked for name, waiting for reply
  //   'awaiting_amount'          → bot asked for deposit amount
  //   'awaiting_debit_amount'    → bot asked for withdrawal amount
  //   'awaiting_negative_confirm'→ warned about negative balance, waiting YES/NO
  //   'main_menu'                → fully onboarded, at the main menu
  currentStep: {
    type: String,
    default: 'new',
  },
  // Temporary storage for multi-step flows (e.g. pendingDebit)
  tempData: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  notifStatus: {
    type: String,
    enum: ['none', 'nudge_sent'],
    default: 'none',
  },
  lastNudgeSentAt: {
    type: Date,
  },
  lastTransactionAt: {
    type: Date,
  },
});

module.exports = mongoose.model('User', userSchema);
