const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createRazorpayOrder,
  verifyPayment,
  getGigPayments,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-order", protect, authorizeRoles(["client"]), createRazorpayOrder);
router.post("/verify", protect, authorizeRoles(["client"]), verifyPayment);
router.get("/gig/:gigId", protect, getGigPayments);

module.exports = router;
