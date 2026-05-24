const Support = require("../models/supportModel");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendEmail = require("../utils/sendEmail");
const sendNotification = require("../utils/sendNotification");

// Create Support Request
exports.createSupportRequest = catchAsyncErrors(async (req, res, next) => {
  const { name, email, subject, message, userId } = req.body;

  if (!name || !email || !subject || !message) {
    return next(new ErrorHandler("Please provide name, email, subject, and message", 400));
  }

  // Create in database
  const support = await Support.create({
    user: userId || req.user?._id,
    name,
    email,
    subject,
    message,
  });

  // Compose HTML message for admin notification
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #7ec8c0; padding-bottom: 10px; margin-top: 0;">New Support Request Received</h2>
      <p style="font-size: 15px; color: #333;">A user has submitted a support query from the FlexiWork Help Center.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0; width: 120px;">Name:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Email:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${email}">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Category:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #e11d48; font-weight: 600;">${subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Submitted At:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${new Date().toLocaleString()}</td>
        </tr>
      </table>

      <div style="background-color: #f7f7f5; padding: 15px; border-radius: 6px; border-left: 4px solid #7ec8c0; margin-top: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #1a1a2e;">User Message:</h4>
        <p style="margin: 0; color: #444; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center;">
        FlexiWork Portal • Automated System Notification
      </p>
    </div>
  `;

  // Send email to standard admin team email (teamflexiworkhub@gmail.com)
  try {
    await sendEmail({
      email: "teamflexiworkhub@gmail.com",
      subject: `[Support Query] ${subject} - ${name}`,
      html: htmlMessage,
    });
  } catch (error) {
    console.error("Support query notification email failed to send, but entry was stored in DB successfully:", error.message);
  }

  // --- SEND REAL-TIME SYSTEM NOTIFICATIONS TO ALL SUPERADMINS ---
  try {
    const superAdmins = await User.find({ role: "superadmin" });
    for (const admin of superAdmins) {
      await sendNotification(req, {
        recipient: admin._id,
        sender: userId || req.user?._id || support._id,
        type: "support_received",
        message: `New support query "${subject}" from ${name}`,
      });
    }
  } catch (error) {
    console.error("Failed to trigger real-time notifications to superadmins:", error.message);
  }

  res.status(201).json({
    success: true,
    message: "Your support request has been sent successfully. We'll get back to you soon!",
    support,
  });
});

// Get Logged-In User's Support Requests
exports.mySupportRequests = catchAsyncErrors(async (req, res, next) => {
  const supportRequests = await Support.find({
    $or: [{ user: req.user._id }, { email: req.user.email }],
  })
    .sort({ createdAt: -1 })
    .populate("resolvedBy", "name email");

  res.status(200).json({
    success: true,
    supportRequests,
  });
});

// Get All Support Requests (Superadmin only)
exports.getAllSupportRequests = catchAsyncErrors(async (req, res, next) => {
  const supportRequests = await Support.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email role")
    .populate("resolvedBy", "name email");

  res.status(200).json({
    success: true,
    supportRequests,
  });
});

// Update Support Request Status & Send Response (Superadmin only)
exports.updateSupportRequestStatus = catchAsyncErrors(async (req, res, next) => {
  const support = await Support.findById(req.params.id);

  if (!support) {
    return next(new ErrorHandler("Support request not found with this ID", 404));
  }

  const { status, adminMessage } = req.body;

  let nextStatus = support.status;
  if (!status) {
    const currentStatus = support.status;
    if (currentStatus === "open") nextStatus = "in-progress";
    else if (currentStatus === "in-progress") nextStatus = "resolved";
    else nextStatus = "open";
  } else {
    nextStatus = status;
  }

  support.status = nextStatus;
  support.resolvedBy = req.user._id;

  if (adminMessage !== undefined) {
    support.adminMessage = adminMessage;
    support.repliedAt = Date.now();
  }

  await support.save();

  // --- SEND REAL-TIME SYSTEM NOTIFICATION TO THE USER ---
  if (support.user) {
    try {
      await sendNotification(req, {
        recipient: support.user,
        sender: req.user._id, // superadmin ID
        type: "support_updated",
        message: `Superadmin has updated your support query status to "${support.status}"`,
      });
    } catch (error) {
      console.error("Failed to send real-time system notification to the user:", error.message);
    }
  }

  // --- SEND EMAIL NOTIFICATION TO THE USER'S EMAIL ---
  const userHtmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #7ec8c0; padding-bottom: 10px; margin-top: 0;">Support Query Updated</h2>
      <p style="font-size: 15px; color: #333;">Dear ${support.name},</p>
      <p style="font-size: 15px; color: #333;">Your support request has been reviewed and updated by our Superadmin.</p>
      
      <div style="background-color: #f7f7f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Original Query:</strong></p>
        <p style="margin: 0; color: #444; font-style: italic;">"${support.message}"</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0; width: 120px;">New Status:</td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">
            <span style="display: inline-block; padding: 6px 16px; background-color: ${support.status === 'resolved' ? '#d1fae5' : '#fef3c7'}; color: ${support.status === 'resolved' ? '#10b981' : '#d97706'}; font-weight: bold; border-radius: 50px; font-size: 12px; text-transform: uppercase;">
              ${support.status}
            </span>
          </td>
        </tr>
      </table>

      ${adminMessage ? `
      <div style="background-color: #f0fbfa; padding: 15px; border-radius: 6px; border-left: 4px solid #7ec8c0; margin-top: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #1a1a2e;">Superadmin Reply:</h4>
        <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${adminMessage}</p>
      </div>
      ` : ''}
      
      <p style="font-size: 14.5px; color: #333; margin-top: 20px;">You can track your support requests anytime on our portal under the support tracking section.</p>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center;">
        FlexiWork Team • Automated Support System
      </p>
    </div>
  `;

  try {
    await sendEmail({
      email: support.email,
      subject: `[Support Query Update] Re: ${support.subject} - Status: ${support.status.toUpperCase()}`,
      html: userHtmlMessage,
    });
  } catch (error) {
    console.error("Failed to send status update email to user:", error.message);
  }

  res.status(200).json({
    success: true,
    message: `Support query marked as ${support.status} and response dispatched successfully`,
    support,
  });
});
