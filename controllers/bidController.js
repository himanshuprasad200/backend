const Bid = require("../models/bidModel");
const Project = require("../models/projectModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const mongoose = require("mongoose");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("cloudinary");

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

  // Attachments Handling
  let attachments = [];
  if (req.files && req.files.files) {
    let files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    for (const file of files) {
      const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
        folder: "bids",
        resource_type: "auto",
      });
      attachments.push({
        public_id: result.public_id,
        url: result.secure_url,
        name: file.name,
        resource_type: result.resource_type,
      });
    }
  }

  // Fetch project details for pricing snapshot
  const projects = await Project.find({ _id: { $in: projectIds } });
  
  if (projects.length === 0) {
      return next(new ErrorHandler("Selected projects not found", 404));
  }

  const bidsItemsSnapshots = projects.map(p => ({
      project: p._id,
      price: p.price
  }));

  const bid = await Bid.create({
    proposal,
    bidsItems: bidsItemsSnapshots,
    user: req.user._id,
    attachments,
  });

  // Populate for response
  const populatedBid = await Bid.findById(bid._id).populate({
    path: "bidsItems.project",
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
      path: "bidsItems.project",
      select: "title price images category postedBy",
      populate: {
        path: "postedBy",
        select: "name avatar",
      },
    });

  if (!bid) {
    return next(new ErrorHandler("Bid not found", 404));
  }

  // LEGACY SUPPORT: Normalize old bids from various previous schema versions
  const normalizedItems = [];
  for (let item of bid.bidsItems) {
    if (item.project && typeof item.project !== 'string' && item.project.title) {
       // New structure, already populated
       normalizedItems.push(item);
    } else if (item.project) {
       // Semi-legacy: has project ID as string, maybe has flat data (title, price, etc.)
       const projectId = typeof item.project === 'string' ? item.project : item.project.toString();
       const projectData = await Project.findById(projectId).populate("postedBy", "name avatar");
       if (projectData) {
          normalizedItems.push({
             project: projectData,
             price: item.price || projectData.price,
             isLegacy: true1
          });
       }
    } else {
       // Deep legacy: item itself is the ID
       const projectData = await Project.findById(item).populate("postedBy", "name avatar");
       if (projectData) {
          normalizedItems.push({
             project: projectData,
             price: projectData.price,
             isLegacy: true
          });
       }
    }
  }
  bid.bidsItems = normalizedItems;

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
      path: "bidsItems.project",
      select: "title price images category postedBy",
      populate: {
        path: "postedBy",
        select: "name",
      },
    });

  const normalizedBidsList = [];
  for (let b of bids) {
    const bItems = [];
    for (let item of b.bidsItems) {
      if (item.project && typeof item.project !== 'string' && item.project.title) {
        bItems.push(item);
      } else if (item.project) {
        const pId = typeof item.project === 'string' ? item.project : item.project.toString();
        const lp = await Project.findById(pId).populate("postedBy", "name avatar");
        if (lp) bItems.push({ project: lp, price: item.price || lp.price, isLegacy: true });
      } else {
        const lp = await Project.findById(item).populate("postedBy", "name avatar");
        if (lp) bItems.push({ project: lp, price: lp.price, isLegacy: true });
      }
    }
    b.bidsItems = bItems;
    normalizedBidsList.push(b);
  }

  res.status(200).json({
    success: true,
    bids: normalizedBidsList,
  });
});

// Get All Bids (Admin) - FULLY POPULATED
exports.getAllBids = catchAsyncErrors(async (req, res, next) => {
  let bids;

  if (req.user.role === "superadmin") {
    bids = await Bid.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email avatar accountNo upiId")
      .populate({
        path: "bidsItems.project",
        select: "title price images category",
      });
  } else {
    const myProjects = await Project.find({ postedBy: req.user.id }).select("_id");
    const myProjectIds = myProjects.map((p) => p._id);

    bids = await Bid.find({ 
      $or: [
        { "bidsItems.project": { $in: myProjectIds } },
        { "bidsItems": { $in: myProjectIds } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("user", "name email avatar accountNo upiId")
      .populate({
        path: "bidsItems.project",
        select: "title price images category",
      });
  }

  const adminBids = [];
  for (let b of (bids || [])) {
    const bItems = [];
    for (let item of (b.bidsItems || [])) {
      if (item.project && typeof item.project !== 'string' && item.project.title) {
        bItems.push(item);
      } else if (item.project) {
        const pId = typeof item.project === 'string' ? item.project : item.project.toString();
        const lp = await Project.findById(pId);
        if (lp) bItems.push({ project: lp, price: item.price || lp.price, isLegacy: true });
      } else {
        const lp = await Project.findById(item);
        if (lp) bItems.push({ project: lp, price: lp.price, isLegacy: true });
      }
    }
    b.bidsItems = bItems;
    adminBids.push(b);
  }

  res.status(200).json({
    success: true,
    bids: adminBids,
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

    // NEW CHECK: Verify if admin posted at least one project in this bid
    if (req.user.role !== "superadmin") {
      const bidProjectIds = bid.bidsItems.map(item => item.project);
      const adminProjects = await Project.find({
        _id: { $in: bidProjectIds },
        postedBy: req.user.id
      });

      if (adminProjects.length === 0) {
        return next(new ErrorHandler("Not authorized to manage this bid", 403));
      }
    }
  
    if (bid.response === "Approved" && newStatus === "Approved") {
      return next(new ErrorHandler("Client has already approved this bid", 400));
    }
  
    bid.response = newStatus;
  
    if (newStatus === "Approved") {
      bid.approvedAt = Date.now();
    }
  
    await bid.save({ validateBeforeSave: false });
  
    // --- SEND EMAIL NOTIFICATION ---
    try {
        const populatedBid = await Bid.findById(bidId)
            .populate("user", "name email accountNo") // Populate accountNo
            .populate("bidsItems.project", "title price");

        const user = populatedBid.user;
        const projects = populatedBid.bidsItems;
        const projectTitles = projects.map(p => p.project.title).join(", ");
        const amount = req.body.amount || projects.reduce((acc, p) => acc + (p.price || 0), 0);
        
        // Truncate proposal for email
        const proposalPreview = populatedBid.proposal.length > 150 
            ? populatedBid.proposal.slice(0, 150) + "..." 
            : populatedBid.proposal;
            
        const approvalDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        let subject, message, htmlContent;

        const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || '5173'}`;
        
        // Generate a public access token for this user's balance summary
        const jwt = require("jsonwebtoken");
        const publicAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d", // Valid for 7 days
        });

        if (newStatus === "Approved") {
            const publicLink = `${frontendUrl}/public/earning/${publicAccessToken}`;
            subject = `Good News! Your Bid for "${projectTitles}" has been Approved`;
            message = `Hi ${user.name},\nWe are pleased to inform you that your bid for "${projectTitles}" has been Approved on ${approvalDate}.\nPayment of ₹${amount} is sent to Account No: ${user.accountNo || 'N/A'}.\nProposal Snippet: ${proposalPreview}\nView your balance summary (no login required): ${publicLink}\nFull Account Dashboard: ${frontendUrl}/user/earning`;
            
            htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 30px; text-align: center;">
                        <img src="${frontendUrl}/FlexiWork.png" alt="FlexiWork" style="max-height: 45px; width: auto; display: block; margin: 0 auto;">
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Bid Approved!</p>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p style="font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
                        <p>We're thrilled to share that your bid for <strong>${projectTitles}</strong> was <strong>Approved</strong> on <strong>${approvalDate}</strong>.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #0284c7;">Bid & Payment Summary</h3>
                            <p style="margin: 8px 0;"><strong>Project:</strong> ${projectTitles}</p>
                            <p style="margin: 8px 0;"><strong>Account No:</strong> ${user.accountNo || 'Not Provided'}</p>
                            <p style="margin: 8px 0;"><strong>Payment Amount:</strong> <span style="color: #16a34a; font-weight: 700;">₹${Number(amount).toLocaleString('en-IN')}</span></p>
                            <p style="margin: 8px 0; color: #64748b; font-size: 14px; font-style: italic;"><strong>Proposal Preview:</strong> ${proposalPreview}</p>
                        </div>
                        
                        <p>The client has initiated the payment to your registered bank account. You can track this and other payment history in your dashboard.</p>
                        
                        <div style="text-align: center; margin-top: 35px;">
                            <a href="${publicLink}" 
                               style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">
                               Quick Balance Check
                            </a>
                            <p style="font-size: 11px; margin-top: 10px; color: #94a3b8;">This link allows you to view your earnings summary without logging in. Valid for 7 days.</p>
                        </div>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b;">
                        Copyright © FlexiWork. All rights reserved.
                    </div>
                </div>
            `;
        } else {
            subject = `Update on your Bid for "${projectTitles}"`;
            message = `Hi ${user.name},\nThank you for your proposal for "${projectTitles}". Unfortunately, the client has not moved forward with your proposal this time.\nProposal Snippet: ${proposalPreview}\nKeep applying! Your next big break is just around the corner: ${frontendUrl}/projects`;
            
            htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #64748b; padding: 30px; text-align: center;">
                        <img src="${frontendUrl}/FlexiWork.png" alt="FlexiWork" style="max-height: 45px; width: auto; display: block; margin: 0 auto;">
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Bid Update</p>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p style="font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
                        <p>Thank you for submitting your proposal for <strong>${projectTitles}</strong>.</p>
                        <p>After careful review, the client has decided not to proceed with your proposal at this time. We encourage you to keep exploring and applying for other exciting opportunities on FlexiWork.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0; color: #64748b; font-style: italic;"><strong>Proposal Preview:</strong> ${proposalPreview}</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 35px;">
                            <a href="${frontendUrl}/projects" 
                               style="background-color: #64748b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">
                               Browse More Projects
                            </a>
                        </div>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b;">
                        Stay persistent, hard work pays off!
                    </div>
                </div>
            `;
        }

        await sendEmail({
            email: user.email,
            subject,
            message,
            html: htmlContent
        });

    } catch (err) {
        console.error("Email Sending Error:", err);
        // We don't block the response update if email fails, just log it
    }
  
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

  // Verify if admin posted at least one project in this bid
  if (req.user.role !== "superadmin") {
    const bidProjectIds = bid.bidsItems.map(item => item.project);
    const adminProjects = await Project.find({
      _id: { $in: bidProjectIds },
      postedBy: req.user.id
    });

    if (adminProjects.length === 0) {
      return next(new ErrorHandler("Not authorized to delete this bid", 403));
    }
  }

  // Deleting attachments from Cloudinary
  if (bid.attachments && bid.attachments.length > 0) {
    for (const attachment of bid.attachments) {
      // Use stored resource_type or fallback logic for old bids
      const rType = attachment.resource_type || (attachment.url.includes("/raw/") ? "raw" : "image");
      await cloudinary.v2.uploader.destroy(attachment.public_id, {
        resource_type: rType,
      });
    }
  }

  await bid.deleteOne(); 

  res.status(200).json({
    success: true,
  });
});