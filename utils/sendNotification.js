const Notification = require("../models/notificationModel");

/**
 * Helper to save a system notification to the database and emit it in real-time if the recipient is online
 */
const sendNotification = async (req, { recipient, sender, type, message, project }) => {
  try {
    // 1. Save to Database
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      project,
    });

    // Populate sender and project details so the client gets complete details
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name avatar")
      .populate("project", "title");

    // 2. Retrieve Socket context from Express app variables
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || [];

    if (io) {
      // Find all active socket connections belonging to the recipient
      const receivers = onlineUsers.filter((u) => String(u.userId) === String(recipient));
      receivers.forEach((r) => {
        io.to(r.socketId).emit("new_system_notification", populatedNotification);
      });
    }

    return populatedNotification;
  } catch (error) {
    console.error("Error in sendNotification utility:", error);
  }
};

module.exports = sendNotification;
