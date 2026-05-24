const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const Bid = require("../models/bidModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("cloudinary");

//Register user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  let avatarObj = {
    public_id: "default_avatar",
    url: "/Profile.png",
  };

  // Support both Base64 (req.body) and File (req.files)
  let avatarData = req.body.avatar;
  if (req.files && req.files.avatar) {
    avatarData = req.files.avatar.tempFilePath;
  }

  if (avatarData && avatarData !== "") {
    const myCloud = await cloudinary.v2.uploader.upload(avatarData, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });
    avatarObj = {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  }

  const {
    name,
    email,
    password,
    country,
    professionalHeadline,
    accountNo,
    upiId,
    category,
  } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    country,
    professionalHeadline,
    accountNo,
    upiId,
    category,
    avatar: avatarObj,
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

// LOGOUT USER
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Get Reset OTP
  const otp = user.getResetOTP();
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'https://frontend-fw.onrender.com';
  const logoUrl = `${frontendUrl}/FlexiWork.png`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px; text-align: center;">
        <img src="${logoUrl}" alt="FlexiWork" style="max-height: 50px; width: auto; display: block; margin: 0 auto;">
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #1e293b; margin-top: 0; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Hi <strong>${user.name}</strong>, please use the verification code below to complete your password reset process.
        </p>
        
        <div style="background-color: #f0f9ff; border: 2px dashed #bae6fd; border-radius: 12px; padding: 25px; margin: 30px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; color: #0284c7; letter-spacing: 0.25em;">${otp}</span>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="color: #cbd5e1; font-size: 12px; margin-top: 10px;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} FlexiWork Inc. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: `FlexiWork Password Recovery OTP`,
      message: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    res.status(200).json({
      success: true,
      message: `OTP sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Email and OTP are required", 400));
  }

  const user = await User.findOne({ 
    email,
    resetOTP: otp,
    resetOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired OTP", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  user.password = password;
  user.resetOTP = undefined;
  user.resetOTPExpire = undefined;

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
      category: req.body.category,
    };

    console.log("Received user data:", newUserData);

    // Support both Base64 and File Upload for Avatar
    let avatarData = req.body.avatar;
    if (req.files && req.files.avatar) {
      avatarData = req.files.avatar.tempFilePath;
    }

    if (avatarData && avatarData !== "") {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const imageId = user.avatar.public_id;

      if (imageId && imageId !== "default_avatar") {
        await cloudinary.v2.uploader.destroy(imageId);
      }

      const myCloud = await cloudinary.v2.uploader.upload(avatarData, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });

      newUserData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }

    // Support both Base64 and Image Upload for Banner
    let bannerData = req.body.banner;
    if (req.files && req.files.banner) {
      bannerData = req.files.banner.tempFilePath;
    }

    if (bannerData && bannerData !== "") {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.banner && user.banner.public_id) {
        await cloudinary.v2.uploader.destroy(user.banner.public_id);
      }

      const myCloudBanner = await cloudinary.v2.uploader.upload(bannerData, {
        folder: "banners",
      });

      newUserData.banner = {
        public_id: myCloudBanner.public_id,
        url: myCloudBanner.secure_url,
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
  let users;

  if (req.user.role === "superadmin") {
    users = await User.find();
  } else {
    // Find projects posted by the admin
    const adminProjects = await Project.find({ postedBy: req.user.id }).select("_id");
    const projectIds = adminProjects.map((p) => p._id);

    // Find bids for these projects
    const bids = await Bid.find({ bidsItems: { $in: projectIds } }).select("user");
    const userIds = bids.map((b) => b.user);

    // Admins can see themselves and users who bid on their projects
    userIds.push(req.user.id);

    users = await User.find({ _id: { $in: userIds } });
  }

  res.status(200).json({
    success: true,
    users,
  });
});

// GET ALL FREELANCERS (Public)
exports.getFreelancers = catchAsyncErrors(async (req, res, next) => {
  const resultPerPage = 12;
  const { keyword, category, page } = req.query;

  let query = { role: { $in: ["user", "admin"] } };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { professionalHeadline: { $regex: keyword, $options: "i" } }
    ];
  }

  if (category && category !== "" && category !== "All Talent") {
    // Advanced Smart Match Algorithm:
    // 1. Break category into keywords (e.g., "Graphic Design" -> ["Graphic", "Design"])
    // 2. Filter out short/common words
    // 3. Match if category tag is exact OR headline contains major keywords
    const keywords = category.split(/\s+/)
      .filter(k => k.length > 2)
      .map(k => new RegExp(k, "i"));
    
    query.$and = [
      { role: { $in: ["user", "admin"] } },
      {
        $or: [
          { category: category },
          { professionalHeadline: { $regex: category, $options: "i" } },
          { professionalHeadline: { $in: keywords } }, // Matches any keyword from category in headline
          // Fuzzy match for specific endings (e.g., Design -> Designer)
          { professionalHeadline: { $regex: category.replace(/ing$|ion$|n$/, ""), $options: "i" } }
        ]
      }
    ];
    delete query.role;
  }

  const freelancersCount = await User.countDocuments(query);

  const currentPage = Number(page) || 1;
  const skip = resultPerPage * (currentPage - 1);

  const freelancers = await User.find(query)
    .limit(resultPerPage)
    .skip(skip);

  res.status(200).json({
    success: true,
    freelancers,
    freelancersCount,
    resultPerPage,
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

  // Security check: Admin can only access their own profile or users who bid on their projects
  if (req.user.role !== "superadmin" && req.user.id !== req.params.id) {
    const adminProjects = await Project.find({ postedBy: req.user.id }).select("_id");
    const projectIds = adminProjects.map((p) => p._id);
    const hasBid = await Bid.exists({ bidsItems: { $in: projectIds }, user: req.params.id });

    if (!hasBid) {
      return next(new ErrorHandler("Not authorized to access this user", 403));
    }
  }

  res.status(200).json({
    success: true,
    user,
  });
});

//UPDATE USER ROLE
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
  try {
    // Security check
    if (req.user.role !== "superadmin" && req.user.id !== req.params.id) {
      const adminProjects = await Project.find({ postedBy: req.user.id }).select("_id");
      const projectIds = adminProjects.map((p) => p._id);
      const hasBid = await Bid.exists({ bidsItems: { $in: projectIds }, user: req.params.id });

      if (!hasBid) {
        return next(new ErrorHandler("Not authorized to modify this user", 403));
      }
    }

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
  // Security check
  if (req.user.role !== "superadmin" && req.user.id !== req.params.id) {
    const adminProjects = await Project.find({ postedBy: req.user.id }).select("_id");
    const projectIds = adminProjects.map((p) => p._id);
    const hasBid = await Bid.exists({ bidsItems: { $in: projectIds }, user: req.params.id });

    if (!hasBid) {
      return next(new ErrorHandler("Not authorized to delete this user", 403));
    }
  }

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

// GET BASIC USER INFO (For Chat)
exports.getUserBasicInfo = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("name avatar");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// GET SUPPORT ID (Superadmin)
exports.getSupportId = catchAsyncErrors(async (req, res, next) => {
  const admin = await User.findOne({ role: "superadmin" }).select("_id");
  
  if (!admin) {
    return next(new ErrorHandler("Support administrator not found", 404));
  }

  res.status(200).json({
    success: true,
    supportId: admin._id,
  });
});