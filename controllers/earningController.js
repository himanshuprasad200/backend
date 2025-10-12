const Earning = require("../models/earningModel");
const User = require("../models/userModel");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

// controllers/earningController.js
exports.createEarning = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    if (!amount || !userId) {
      return res
        .status(400)
        .json({ message: "Amount and userId are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newEarning = new Earning({
      user: userId,
      amount,
    }); 

    await newEarning.save();

    res
      .status(201)
      .json({ message: "Earning recorded successfully", earning: newEarning });
  } catch (error) {
    console.error("Error details:", error); // Log the error details
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//Get All Earnings
exports.getAllEarnings = catchAsyncErrors(async(req, res, next) => {
  const earning = await Earning.find();

  const totalAmount = earning.reduce((sum, e) => sum + e.amount, 0);

  res.status(200).json({
    success: true,
    earning,
    totalAmount
  })
})

// Get all earnings for a user
exports.getUserEarnings = catchAsyncErrors(async (req, res, next) => {
  // Use the user ID from the authenticated request
  const userId = req.user._id;

  try {
    // Find all earnings for the specific user
    const earnings = await Earning.find({ user: userId });

    if (earnings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No earnings found for the user",
      });
    }

    // Calculate total earnings
    const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);

    res.status(200).json({
      success: true,
      earnings,
      totalAmount, // Include total earnings in the response
    });
  } catch (error) {
    next(error);
  }
});




