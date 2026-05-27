const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  getClientProfile,
  updateClientProfile,
  updateUserProfile,
  applyForVerification,
} = require("../controllers/profileController");

const router = express.Router();

router.get("/me", protect, getUserProfile);

// Freelancer Profile management endpoints
router.get("/freelancer", protect, authorizeRoles(["freelancer"]), getFreelancerProfile);
router.put("/freelancer", protect, authorizeRoles(["freelancer"]), updateFreelancerProfile); // Switched to PUT for clean structural updates

// Client Profile management endpoints
router.get("/client", protect, authorizeRoles(["client"]), getClientProfile);
router.put("/client", protect, authorizeRoles(["client"]), updateClientProfile); // Switched to PUT for clean structural updates

// Freelancer verification flow endpoints
router.put("/update", protect, updateUserProfile);
router.patch("/apply-verification", protect, applyForVerification);

module.exports = router;