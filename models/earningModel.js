const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', 
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  recievedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Earning', earningSchema);