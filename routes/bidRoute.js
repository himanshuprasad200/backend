const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const {
  newBid,
  getSingleBid,
  myBids,
  updateBid,
  deleteBid,
  getAllBids,
} = require("../controllers/bidController");
const router = express.Router();

router.route("/bid/new").post(isAuthenticatedUser, newBid);
router.route("/bid/:id").get(isAuthenticatedUser, getSingleBid);
router.route("/bids/me").get(isAuthenticatedUser, myBids);
router
  .route("/admin/bids")
  .get(isAuthenticatedUser, authorizeRoles("admin"), getAllBids);
router
  .route("/admin/bid/:id")
  .put(isAuthenticatedUser, authorizeRoles("admin"), updateBid)
  .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteBid);

module.exports = router;
