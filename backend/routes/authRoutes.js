const express = require("express");
const { 
  registerUser, 
  loginUser, 
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verify2FA,
  googleLogin
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/verify-2fa", verify2FA);
router.post("/google", googleLogin);

module.exports = router;