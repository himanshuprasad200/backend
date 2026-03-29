const Message = require("../models/messageModel");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

exports.getMessages = catchAsyncErrors(async (req, res, next) => {
  const { projectId, userId } = req.query; 
  
  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  const currentUserId = req.user._id.toString();

  const query = {
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId }
    ]
  };

  if (projectId) {
    query.project = projectId;
  }

  const messages = await Message.find(query).sort({ createdAt: 1 });

  // When I fetch a chat, mark their messages to me as read
  await Message.updateMany(
    { sender: userId, receiver: currentUserId, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    messages
  });
});

exports.getUnreadNotifications = catchAsyncErrors(async (req, res, next) => {
  const currentUserId = req.user._id.toString();

  // Aggregate unread messages by sender to show distinct notifications
  // Using find so we can populate the sender name
  const unreadMessages = await Message.find({
    receiver: currentUserId,
    isRead: false
  }).populate('sender', 'name avatar').sort({ createdAt: -1 });

  // Group by sender ID
  const notificationMap = new Map();
  unreadMessages.forEach(msg => {
    const senderId = msg.sender._id.toString();
    if (!notificationMap.has(senderId)) {
      notificationMap.set(senderId, {
        senderId,
        senderName: msg.sender.name,
        senderAvatar: msg.sender.avatar?.url,
        text: msg.text, // Latest message snippet
        count: 1,
        createdAt: msg.createdAt
      });
    } else {
      notificationMap.get(senderId).count += 1;
    }
  });

  const notifications = Array.from(notificationMap.values());

  res.status(200).json({
    success: true,
    notifications
  });
});

exports.markMessagesAsRead = catchAsyncErrors(async (req, res, next) => {
  const { senderId } = req.body;
  const currentUserId = req.user._id.toString();

  await Message.updateMany(
    { sender: senderId, receiver: currentUserId, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true
  });
});
