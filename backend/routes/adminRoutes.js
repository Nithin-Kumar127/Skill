const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getPlatformStats,
  getAllUsers,
  getAllDisputes,
  resolveDispute,
  getPendingFreelancers,      
  updateFreelancerVerification,
  toggleUserSuspension // 🌟 ADDED: Import the suspension action handler
} = require("../controllers/adminController");

const router = express.Router();

// Apply global protection and role-gate policies across all administrative endpoints
router.use(protect);
router.use(authorizeRoles(["admin"]));

// Platform Metrics & Overview Dashboard Analytics Route
router.get("/stats", getPlatformStats);

// Global User Directory Management Route
router.get("/users", getAllUsers);

// 🌟 ADDED: Put endpoint to match your frontend toggle handler parameter:
// This catches: http://localhost:5000/api/admin/users/:userId/suspend (or unsuspend)
router.put("/users/:userId/:action", toggleUserSuspension);

// Escrow Dispute Management and Resolution Routes
router.get("/disputes", getAllDisputes);
router.patch("/disputes/:id/resolve", resolveDispute);

// Freelancer Profile Document Verification Processing Routes
router.get("/verification/pending", getPendingFreelancers);
router.patch("/verification/:userId", updateFreelancerVerification);

module.exports = router;