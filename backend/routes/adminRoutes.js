const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getPlatformStats,
  getAllUsers,
  getAllDisputes,
  resolveDispute,
  getPendingFreelancers,      // NEW: Verification pipeline controller action
  updateFreelancerVerification // NEW: Verification approval/rejection handler
} = require("../controllers/adminController");

const router = express.Router();

// Apply global protection and role-gate policies across all administrative endpoints
router.use(protect);
router.use(authorizeRoles(["admin"]));

// Platform Metrics & Overview Dashboard Analytics Route
router.get("/stats", getPlatformStats);

// Global User Directory Management Route
router.get("/users", getAllUsers);

// Escrow Dispute Management and Resolution Routes
router.get("/disputes", getAllDisputes);
router.patch("/disputes/:id/resolve", resolveDispute);

// NEW: Freelancer Profile Document Verification Processing Routes
router.get("/verification/pending", getPendingFreelancers);
router.patch("/verification/:userId", updateFreelancerVerification);

module.exports = router;