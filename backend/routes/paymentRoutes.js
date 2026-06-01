const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createRazorpayOrder,
  verifyPayment,
  getGigPayments,
  processRefund,       // 🌟 NEW: Imported refund logic
  getUserTransactions  // 🌟 NEW: Imported transaction history logic
} = require("../controllers/paymentController");

const router = express.Router();

// Escrow & Milestone Funding Routes
router.post("/create-order", protect, authorizeRoles(["client"]), createRazorpayOrder);
router.post("/verify", protect, authorizeRoles(["client"]), verifyPayment);

// Payment Fetching Routes
router.get("/gig/:gigId", protect, getGigPayments);

// 🌟 NEW: Global transaction history for the logged-in user (Client or Freelancer)
router.get("/history", protect, getUserTransactions);

// 🌟 NEW: Refund processing (can be restricted to admin/client as needed)
router.post("/refund", protect, processRefund);

module.exports = router;