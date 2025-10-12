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
} = require("../controllers/projectController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

router
  .route("/admin/project/new")
  .post(isAuthenticatedUser, authorizeRoles("admin"), createProject);
router.route("/projects").get(getAllProjects);
router.route("/admin/projects").get(isAuthenticatedUser, authorizeRoles("admin"), getAdminProjects);
router
  .route("/admin/project/:id")
  .put(isAuthenticatedUser, authorizeRoles("admin"), updateProject)
  .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteProject);
router.route("/project/:id").get(getProjectDetails);
router.route('/review').put(isAuthenticatedUser, createProjectReview)
router.route('/reviews').get(getProjectReviews).delete(isAuthenticatedUser, deleteReview)

module.exports = router;
