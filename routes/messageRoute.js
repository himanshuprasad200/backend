const express = require("express");
const { getMessages, getUnreadNotifications, markMessagesAsRead, uploadChatMedia } = require("../controllers/messageController");
const { isAuthenticatedUser } = require("../middleware/auth");
const router = express.Router();

router.route("/messages").get(isAuthenticatedUser, getMessages);
router.route("/notifications").get(isAuthenticatedUser, getUnreadNotifications);
router.route("/messages/read").put(isAuthenticatedUser, markMessagesAsRead);
router.route("/chat/upload").post(isAuthenticatedUser, uploadChatMedia);

module.exports = router;
