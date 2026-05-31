const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["bid_applied", "bid_approved", "bid_rejected", "payment_received", "system", "support_received", "support_updated", "review_received"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  project: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
