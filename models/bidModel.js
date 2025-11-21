// models/bidModel.js
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  proposal: {
    type: String,
    required: [true, "Please enter your proposal"],
    trim: true,
  },
  bidsItems: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Project",
      required: true,
    },
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  response: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  file: String,
  completedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bid", bidSchema);