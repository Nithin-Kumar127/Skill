const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createGig,
  getGigs,
  getGigById,
  getAllGigs,
  getHiredGigs,
  submitMilestoneWork, // IMPORTED FOR FREELANCER SUBMISSIONS
  approveMilestoneWork, // IMPORTED FOR CLIENT APPROVALS
} = require("../controllers/gigController");

const router = express.Router();

router.post("/", protect, authorizeRoles(["client"]), createGig);
router.get("/", protect, getGigs);
router.get("/hired", protect, authorizeRoles(["freelancer"]), getHiredGigs);
router.get("/all", protect, getAllGigs);
router.get("/:id", protect, getGigById);

// INTEGRATED OPTION 1: Task Assignment Sub-Routes
router.post("/:id/milestones/:milestoneId/submit", protect, authorizeRoles(["freelancer"]), submitMilestoneWork);
router.post("/:id/milestones/:milestoneId/approve", protect, authorizeRoles(["client"]), approveMilestoneWork);

module.exports = router;