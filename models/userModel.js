const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
    maxLength: [30, "Name cannot exceed 30 characters"],
    minLength: [4, "Name should not be less than 4 characters"],
  },
  country:{
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
  ratings: {
    type: Number,
    default: 0,
  },
  accountNo: {
    type: String,
    required: [true, "Please Enter Your Account Number"],
    validate: [validator.isNumeric, "Please Enter a Valid Account Number"],
  },
  upiId: {
    type: String,
    required: [true, "Please Enter Your UPI ID"],
  },
  password: {
    type: String,
    required: [true, "Please Enter Your Password"],
    minLength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  avatar: {
    public_id: {
      type: String,
      required: true,
    },
    url: { 
      type: String,
      required: true,
    },
  },
  role: {
    type: String,
    default: "user",
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
      name: {
        type: String, 
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
      avatar: {
        type: String,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date, 
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
},{
  timestamps: true,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// JWT TOKEN
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// COMPARE PASSWORD
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// GENERATING PASSWORD RESET TOKEN
userSchema.methods.getResetPasswordToken = function () {
  // GENERATING TOKEN
  const resetToken = crypto.randomBytes(20).toString("hex");

  // HASHING AND ADDING resetPasswordToken TO userSchema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiration

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
