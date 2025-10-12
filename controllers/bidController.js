const Bid = require("../models/bidModel");
const Project = require("../models/projectModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

//Create New Bid
exports.newBid = catchAsyncErrors(async (req, res, next) => {
  const { proposal, bidsItems } = req.body;

  const bid = await Bid.create({ 
    bidsItems,
    proposal,
    completedAt: Date.now(),
    user: req.user._id, 
  });

  res.status(201).json({
    success: true,
    bid, 
  });
});

//Get Single Bid
exports.getSingleBid = catchAsyncErrors(async (req, res, next) => {
  const bid = await Bid.findById(req.params.id).populate("user", "name email");

  if (!bid) {
    return next(new ErrorHandler("Bid not be found with this id", 404));
  }

  res.status(200).json({
    success: true,
    bid,
  }); 
});

//Get Logged in user Bid
exports.myBids = catchAsyncErrors(async (req, res, next) => {
  const bids = await Bid.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    bids,
  });
});


//Get all Bid -- Admin
exports.getAllBids = catchAsyncErrors(async (req, res, next) => {
  // Fetch bids and sort them by `createdAt` in descending order
  const bids = await Bid.find().sort({ createdAt: -1 });

  // Send the sorted bids in the response
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
