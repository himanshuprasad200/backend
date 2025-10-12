const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("cloudinary");

//Register user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
    folder: "avatars",
    width: 150,
    crop: "scale",
  });

  const {
    name,
    email,
    password,
    country,
    professionalHeadline,
    accountNo,
    upiId,
  } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    country,
    professionalHeadline,
    accountNo,
    upiId,
    avatar: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  sendToken(user, 201, res);
});

// LOGIN USER
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // CHECKING IF USER HAS GIVEN BOTH EMAIL AND PASSWORD
  if (!email || !password) {
    return next(new ErrorHandler("Please enter Email and Password", 400));
  }
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Invalid Email and Password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Email and Password", 401));
  }

  sendToken(user, 201, res);
});

//LOGOUT USER
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "User logged out",
  });
});

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/password/reset/${resetToken}`;

  const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Freelance Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // creating token hash
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler(
        "Reset Password Token is invalid or has been expired",
        400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password does not password", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res);
});

// GET USER DETAILS
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

//UPDATE USER PASSWORD
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old Password Incorrect", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password does not match", 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

// Update USER Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  try {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      professionalHeadline: req.body.professionalHeadline,
      country: req.body.country,
      accountNo: req.body.accountNo,
      upiId: req.body.upiId,
    };

    console.log("Received user data:", newUserData);

    if (req.body.avatar && req.body.avatar !== "") {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const imageId = user.avatar.public_id;

      if (imageId) {
        await cloudinary.v2.uploader.destroy(imageId);
      }

      // Check if req.body.avatar is a valid URL or base64 string
      if (
        typeof req.body.avatar !== "string" ||
        req.body.avatar.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid avatar data",
        });
      }

      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });

      newUserData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET ALL USERS(Admin)
exports.getAllUser = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// GET SINGLE USERS(Admin)
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with id: ${req.params.id}`)
    );
  }

  res.status(200).json({
    success: true,
    user,
  });
});

//UPDATE USER ROLE
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

//DELETE USER
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with Id: ${req.params.id}`)
    );
  }

  const imageId = user.avatar.public_id;

  if (imageId) {
    await cloudinary.v2.uploader.destroy(imageId);
  }

  await User.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    message: "USER deleted successfully",
  });
});

// CREATE NEW REVIEW OR UPDATE REVIEW FOR USER
exports.createUserReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, userId } = req.body;

  const currentUser = await User.findById(req.user._id);

  const review = {
    user: req.user._id,
    name: req.user.name,
    avatar: currentUser.avatar.url,
    rating: Number(rating),
    comment,
  };

  const user = await User.findById(userId);

  const isReviewed = user.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    user.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString())
        (rev.rating = rating), (rev.comment = comment);
    });
  } else {
    user.reviews.push(review);
    user.numOfReviews = user.reviews.length;
  }

  let avg = 0;
  user.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  user.ratings = avg / user.reviews.length;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

//GET ALL REVIEWS OF A USER
exports.getUserReviews = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.query.id).populate({
    path: "reviews.user",
    select: "avatar.url",
  });

  if (!user) {
    return next(new ErrorHandler("User not found"), 404);
  }

  // Assuming user.reviews contains the reviews associated with the user
  const reviews = user.reviews;

  res.status(200).json({
    success: true,
    reviews: reviews, // Sending the reviews in the response
  });
});

//Delete the user Review
exports.deleteUserReview = catchAsyncErrors(async (req, res, next) => {
  const { id, userId } = req.query;

  // Find the user who has the review
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Remove the review from the user's reviews
  const reviews = user.reviews.filter(rev => rev._id.toString() !== id.toString());

  // Calculate the new average rating
  let avg = 0;
  if (reviews.length > 0) {
    avg = reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length;
  }

  const numOfReviews = reviews.length;

  // Update the user's data
  await User.findByIdAndUpdate(
    userId,
    {
      reviews,
      rating: avg,
      numOfReviews,
    },
    { new: true, runValidators: true, useFindAndModify: false }
  );

  // Optionally delete the user's avatar from Cloudinary if it's no longer needed
  if (user.avatar && user.avatar.public_id) {
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
  }

  res.status(200).json({
    success: true,
  });
});

