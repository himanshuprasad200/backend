const Bid = require("../models/bidModel");
const Project = require("../models/projectModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const mongoose = require("mongoose");

//Create New Bid
exports.newBid = catchAsyncErrors(async (req, res, next) => {
  const { proposal } = req.body;

  // SUPPORT ALL FORMATS (FormData, JSON, Postman, etc.)
  let projectIds = [];

  // 1. FormData from frontend: bidsItems[]
  if (req.body["bidsItems[]"]) {
    projectIds = Array.isArray(req.body["bidsItems[]"])
      ? req.body["bidsItems[]"]
      : [req.body["bidsItems[]"]];
  }
  // 2. JSON array: "bidsItems": ["id1", "id2"]
  else if (Array.isArray(req.body.bidsItems)) {
    projectIds = req.body.bidsItems;
  }
  // 3. JSON single object: "bidsItems": { project: "id" }
  else if (req.body.bidsItems && req.body.bidsItems.project) {
    projectIds = [req.body.bidsItems.project];
  }
  // 4. Old format: "bidItems" (your curl uses this)
  else if (req.body.bidItems && req.body.bidItems.project) {
    projectIds = [req.body.bidItems.project];
  }
  // 5. Direct array in body
  else if (req.body.projectIds) {
    projectIds = Array.isArray(req.body.projectIds) ? req.body.projectIds : [req.body.projectIds];
  }

  // Final check
  if (!projectIds || projectIds.length === 0) {
    return next(new ErrorHandler("Please select at least one project", 400));
  }

  // Validate ObjectIds
  for (let id of projectIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid project ID: ${id}`, 400));
    }
  }

  const bid = await Bid.create({
    proposal,
    bidsItems: projectIds,
    user: req.user._id,
    file: req.file ? req.file.filename : undefined,
  });

  // Populate for response
  const populatedBid = await Bid.findById(bid._id).populate({
    path: "bidsItems",
    select: "title price images category name",
  });

  res.status(201).json({
    success: true,
    bid: populatedBid,
  });
});

//Get Single Bid
// controllers/bidController.js

// Get Single Bid - FULLY POPULATED
exports.getSingleBid = catchAsyncErrors(async (req, res, next) => {
  const bid = await Bid.findById(req.params.id)
    .populate("user", "name email avatar")
    .populate({
      path: "bidsItems",
      select: "title price images category postedBy",
      populate: {
        path: "postedBy",
        select: "name avatar",
      },
    });

  if (!bid) {
    return next(new ErrorHandler("Bid not found", 404));
  }

  res.status(200).json({
    success: true,
    bid,
  });
});

// Get Logged in user Bids - FULLY POPULATED
exports.myBids = catchAsyncErrors(async (req, res, next) => {
  const bids = await Bid.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "bidsItems",
      select: "title price images category postedBy",
      populate: {
        path: "postedBy",
        select: "name",
      },
    });

  res.status(200).json({
    success: true,
    bids,
  });
});

// Get All Bids (Admin) - FULLY POPULATED
exports.getAllBids = catchAsyncErrors(async (req, res, next) => {
  const bids = await Bid.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate({
      path: "bidsItems",
      select: "title price images category",
    });

  res.status(200).json({
    success: true,
    bids,
  });
});


//Update Bid -- Admin
exports.updateBid = catchAsyncErrors(async (req, res, next) => {
    const bidId = req.params.id;
    const newStatus = req.body.status;
  
    if (!["Pending", "Approved", "Rejected"].includes(newStatus)) {
      return next(new ErrorHandler("Invalid status value", 400));
    }
  
    const bid = await Bid.findById(bidId);
  
    if (!bid) {
      return next(new ErrorHandler("Bid not found", 404));
    }
  
    if (bid.response === "Approved" && newStatus === "Approved") {
      return next(new ErrorHandler("Client has already approved this bid", 400));
    }
  
    bid.response = newStatus;
  
    if (newStatus === "Approved") {
      bid.approvedAt = Date.now();
    }
  
    await bid.save({ validateBeforeSave: false });
  
    res.status(200).json({
      success: true,
    });
  });

// DELETE BID
exports.deleteBid = catchAsyncErrors(async (req, res, next) => {
  const bid = await Bid.findById(req.params.id);

  if (!bid) {
    return next(new ErrorHandler("Bid not found", 404));
  }

  await bid.deleteOne(); 

  res.status(200).json({
    success: true,
  });
});