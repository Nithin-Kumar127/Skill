const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // 🌟 NEW: Multer Middleware
const {
  getUserProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  getClientProfile,
  updateClientProfile,
  updateUserProfile,
  applyForVerification,
  uploadFile, // 🌟 NEW: Controller Logic
} = require("../controllers/profileController");

const router = express.Router();

router.get("/me", protect, getUserProfile);

// Freelancer Profile management endpoints
router.get("/freelancer", protect, authorizeRoles(["freelancer"]), getFreelancerProfile);
router.put("/freelancer", protect, authorizeRoles(["freelancer"]), updateFreelancerProfile);

// Client Profile management endpoints
router.get("/client", protect, authorizeRoles(["client"]), getClientProfile);
router.put("/client", protect, authorizeRoles(["client"]), updateClientProfile);

// Freelancer verification flow endpoints
router.put("/update", protect, updateUserProfile);
router.patch("/apply-verification", protect, applyForVerification);

// 🌟 NEW: Route for handling secure file uploads
router.post("/upload", protect, authorizeRoles(["freelancer"]), upload.single("file"), uploadFile);

module.exports = router;