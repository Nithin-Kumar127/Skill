const express = require("express");

const { 
  registerUser, 
  loginUser, 
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verify2FA,
  googleLogin // Imported from the same controller now!
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Core Authentication Lifecycle Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

// Feature Endpoint Interfacing Mappings
router.post("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/verify-2fa", verify2FA);

// Google OAuth 2.0 Route
router.post("/google", googleLogin);

module.exports = router;