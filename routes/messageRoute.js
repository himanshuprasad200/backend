const express = require("express");
const { 
  getMessages, 
  getUnreadNotifications, 
  markMessagesAsRead, 
  uploadChatMedia, 
  getConversations,
  getSystemNotifications,
  markSystemNotificationsRead
} = require("../controllers/messageController");
const { isAuthenticatedUser } = require("../middleware/auth");
const router = express.Router();

router.route("/messages").get(isAuthenticatedUser, getMessages);
router.route("/conversations").get(isAuthenticatedUser, getConversations);
router.route("/notifications").get(isAuthenticatedUser, getUnreadNotifications);
router.route("/messages/read").put(isAuthenticatedUser, markMessagesAsRead);
router.route("/chat/upload").post(isAuthenticatedUser, uploadChatMedia);

router.route("/system/notifications").get(isAuthenticatedUser, getSystemNotifications);
router.route("/system/notifications/read").put(isAuthenticatedUser, markSystemNotificationsRead);

module.exports = router;
