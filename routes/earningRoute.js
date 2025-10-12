const express = require("express");
const {
  getUserEarnings,
  createEarning,
  getAllEarnings,
} = require("../controllers/earningController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.route("/earnings").post(createEarning);
router.route("/user/earning").get(isAuthenticatedUser, getUserEarnings);
router
  .route("/admin/earning")
  .get(isAuthenticatedUser, authorizeRoles("admin"), getAllEarnings);

module.exports = router;
