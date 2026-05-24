const express = require("express");
const {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectDetails,
  createProjectReview,
  getProjectReviews,
  deleteReview,
  getAdminProjects,
  bookmarkProject,
  getSavedProjects,
} = require("../controllers/projectController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

router
  .route("/admin/project/new")
  .post(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), createProject);
router.route("/projects").get(getAllProjects);
router.route("/admin/projects").get(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), getAdminProjects);
router
  .route("/admin/project/:id")
  .put(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), updateProject)
  .delete(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), deleteProject);
router.route("/projects/saved").get(isAuthenticatedUser, getSavedProjects);
router.route("/project/:id").get(getProjectDetails);
router.route("/project/bookmark/:id").put(isAuthenticatedUser, bookmarkProject);
router.route('/review').put(isAuthenticatedUser, createProjectReview)
router.route('/reviews').get(getProjectReviews).delete(isAuthenticatedUser, deleteReview)

module.exports = router;
