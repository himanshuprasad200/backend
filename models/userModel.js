const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please Enter Your Name"],
      maxLength: [30, "Name cannot exceed 30 characters"],
      minLength: [4, "Name should not be less than 4 characters"],
    },
    country: {
      type: String,
      required: [true, "Please Enter Your Country"],
    },
    email: {
      type: String,
      required: [true, "Please Enter Your Email"],
      unique: true,
      validate: [validator.isEmail, "Please Enter a Valid Email"],
    },
    professionalHeadline: {
      type: String,
      required: [true, "Please Enter Your Work Role"],
      maxLength: [60, "Work Role cannot exceed 60 characters"],
      minLength: [4, "Work Role should not be less than 4 characters"],
    },

    // ── Wallet & Earnings System ───────────────────────────────────────────────
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0, // money in progress (e.g. not yet released or in dispute)
    },
    totalEarnings: {
      type: Number,
      default: 0, // lifetime earnings (for display/stats)
    },

    // ── Payout / Bank Details (Razorpay-integrated — recommended way) ──────────
    razorpayContactId: {
      type: String, // contact_id from Razorpay (created via Contacts API)
      sparse: true, // allows null/undefined
    },
    fundAccountId: {
      type: String, // fund_account_id linked to the contact (for payouts)
      sparse: true,
    },
    bankDetails: {
      // Minimal info — only store what's absolutely needed for display/verification
      // NEVER store full account number in plain text in production!
      // Best: let user re-enter when requesting payout or use Razorpay verification
      accountHolderName: { type: String },
      maskedAccountNumber: { type: String }, // e.g. "XXXX1234"
      ifsc: { type: String },
      bankName: { type: String },
      verified: { type: Boolean, default: false },
      lastVerifiedAt: Date,
    },
    upiId: {
      type: String,
      sparse: true,
      validate: {
        validator: function (v) {
          return !v || validator.matches(v, /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]+$/);
        },
        message: "Please Enter a Valid UPI ID",
      },
    },

    // ── KYC / Compliance (important for Indian payouts > certain limits) ───────
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "not_submitted"],
      default: "not_submitted",
    },
    panCard: {
      type: String,
      sparse: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          return !v || validator.matches(v, /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/);
        },
        message: "Please Enter a Valid PAN Card Number",
      },
    },
    // Add Aadhaar (masked) or other docs if needed later — store hashes or IDs only

    // ── Existing core fields ──────────────────────────────────────────────────
    ratings: {
      type: Number,
      default: 0,
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
    avatar: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
    role: {
      type: String,
      default: "user", // can be "freelancer", "client", "admin" later
    },
    password: {
      type: String,
      required: [true, "Please Enter Your Password"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // ── Auth & Security ───────────────────────────────────────────────────────
    createdAt: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// ── Pre-save middleware for password hashing ────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Methods ─────────────────────────────────────────────────────────────────
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min

  return resetToken;
};

// Optional: Helper to add earning (call this when releasing payment)
userSchema.methods.addEarning = function (amount) {
  this.walletBalance += amount;
  this.totalEarnings += amount;
  return this.save();
};

// Optional: Helper for withdrawal request (just reduces pending)
userSchema.methods.requestWithdrawal = function (amount) {
  if (this.walletBalance < amount) throw new Error("Insufficient balance");
  this.pendingBalance += amount;
  this.walletBalance -= amount;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);