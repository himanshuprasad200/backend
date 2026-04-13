const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Project = require("../models/projectModel");
const User = require("../models/userModel");

// Get All Unique Categories from both Projects and Users
exports.getAllCategories = catchAsyncErrors(async (req, res, next) => {
  // Get distinct categories from Projects
  const projectCategories = await Project.distinct("category");

  // Get distinct categories from Users
  const userCategories = await User.distinct("category");

  // Merge, remove duplicates, and filter out nulls/empty strings
  const combined = [...new Set([...projectCategories, ...userCategories])].filter(
    (cat) => cat && cat.trim() !== ""
  );

  // Sort alphabetically
  combined.sort();

  res.status(200).json({
    success: true,
    categories: combined,
  });
});
