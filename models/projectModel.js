const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
    trim: true,
  },
  title: {
    type: String,
    required: [true, "Please Enter Your Project Title"],
  },
  desc: {
    type: String,
    required: [true, "Please Enter Your Project Description"],
  },
  price: {
    type: Number,
    required: [true, "Please Enter Job Price"],
    maxLength: [8, "Price cannot exceed 8 characters"],
  },

  // ── Payment & Wallet Integration Fields ─────────────────────────────────────
  paymentStatus: {
    type: String,
    enum: ["not_paid", "paid", "in_escrow", "released", "refunded", "disputed"],
    default: "not_paid",
  },
  orderId: {
    type: String,               // Razorpay Order ID
  },
  paymentId: {
    type: String,               // Razorpay Payment ID (rzp_pay_...)
  },
  paymentDetails: {
    paidAt: Date,
    method: String,             // card, upi, netbanking, etc.
    amountReceived: Number,     // in rupees (for reference)
  },

  // Platform takes a cut (configurable per project or globally)
  platformFeePercentage: {
    type: Number,
    default: 15,                // e.g. 15% → you keep 15%, freelancer gets 85%
    min: 0,
    max: 50,
  },
  platformFee: {
    type: Number,               // calculated: price * (platformFeePercentage / 100)
    default: 0,
  },
  freelancerReceivable: {
    type: Number,               // price - platformFee (what freelancer should eventually get)
    default: 0,
  },

  // Who is working on it
  assignedTo: {                 // Freelancer who accepted / was assigned
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  assignedAt: Date,

  // Milestones (optional but very useful for real freelance apps)
  milestones: [
    {
      title: { type: String, required: true },
      description: String,
      amount: { type: Number, required: true }, // portion of total price
      dueDate: Date,
      status: {
        type: String,
        enum: ["pending", "in_progress", "submitted", "approved", "rejected"],
        default: "pending",
      },
      submittedAt: Date,
      approvedAt: Date,
      paymentReleased: { type: Boolean, default: false },
    },
  ],

  // ── Existing fields (kept + minor cleanup) ──────────────────────────────────
  ratings: {
    type: Number,
    default: 0,
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  category: {
    type: String,
    required: [true, "Please Enter Project Category"],
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
      },
      name: { type: String, required: true },
      rating: { type: Number, required: true },
      comment: { type: String, required: true },
      avatar: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Optional: for dispute / cancellation
  status: {
    type: String,
    enum: ["open", "in_progress", "completed", "cancelled", "disputed"],
    default: "open",
  },
  cancellationReason: String,
});

module.exports = mongoose.model("Project", projectSchema);