const express = require("express");
const { getMessages, getUnreadNotifications, markMessagesAsRead } = require("../controllers/messageController");
const { isAuthenticatedUser } = require("../middleware/auth");
const router = express.Router();

router.route("/messages").get(isAuthenticatedUser, getMessages);
router.route("/notifications").get(isAuthenticatedUser, getUnreadNotifications);
router.route("/messages/read").put(isAuthenticatedUser, markMessagesAsRead);

module.exports = router;
