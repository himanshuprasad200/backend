const express = require("express");
const router = express.Router();
const {
  createSupportRequest,
  mySupportRequests,
  getAllSupportRequests,
  updateSupportRequestStatus,
} = require("../controllers/supportController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

// Support Submission - accessible to both guests and logged-in users
router.route("/support/new").post(createSupportRequest);

// Logged-in User Support Tracking
router.route("/support/me").get(isAuthenticatedUser, mySupportRequests);

// Superadmin-only Support Management Routes (Restricted completely from normal Admins)
router
  .route("/admin/support")
  .get(isAuthenticatedUser, authorizeRoles("superadmin"), getAllSupportRequests);

router
  .route("/admin/support/:id")
  .put(isAuthenticatedUser, authorizeRoles("superadmin"), updateSupportRequestStatus);

module.exports = router;
