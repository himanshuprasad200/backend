const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: false, // Optional for guests submitting queries
  },
  name: {
    type: String,
    required: [true, "Please enter your name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, "Please enter support category / subject"],
    trim: true,
  },
  message: {
    type: String,
    required: [true, "Please enter your support query"],
  },
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved"],
    default: "open",
  },
  adminMessage: {
    type: String,
    default: "",
  },
  repliedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Support", supportSchema);
