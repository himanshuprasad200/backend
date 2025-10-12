const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  proposal: {
    type: String,
    required: true,
  },
  bidsItems: [
    {
      name: {
        type: String,
        required: true,
      },
      price: {
        type: String,
        required: true,
      },
      image: {
        type: String,
        required: true,
      },
      category: { 
        type: String,
        required: true,  
      },
      title: {
        type: String,
        required: true, 
      },
      project: {
        type: mongoose.Schema.ObjectId,
        ref: "Project",
        required: true,
      },
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
    default: "Pending"
  },
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bid", bidSchema);
