const mongoose = require('mongoose');

const AuthSessionSchema = new mongoose.Schema(
  {
    _id:   String,
    value: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuthSession', AuthSessionSchema);
