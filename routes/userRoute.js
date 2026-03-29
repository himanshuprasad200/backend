const express = require("express");
const {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  getUserDetails,
  updatePassword,
  updateProfile,
  getAllUser,
  getSingleUser,
  updateUser,
  deleteUser,
  createUserReview,
  getUserReviews,
  deleteUserReview,
} = require("../controllers/userController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/logout").get(logout);
router.route("/me").get(isAuthenticatedUser, getUserDetails);
router.route("/password/update").put(isAuthenticatedUser, updatePassword);
router.route("/me/update").put(isAuthenticatedUser, updateProfile);
router
  .route("/admin/users")
  .get(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), getAllUser);
router
  .route("/admin/users/:id")
  .get(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), getSingleUser)
  .put(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), updateUser)
  .delete(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), deleteUser);
  router.route('/user/review').put(isAuthenticatedUser, createUserReview)
  router.route("/user/reviews").get(getUserReviews).delete(isAuthenticatedUser, deleteUserReview)
  router.route("/user/chat/:id").get(isAuthenticatedUser, require("../controllers/userController").getUserBasicInfo);

module.exports = router;
