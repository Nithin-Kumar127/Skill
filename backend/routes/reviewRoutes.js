const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { createReview, getFreelancerReviews } = require("../controllers/reviewController");

const router = express.Router();

router.post("/", protect, authorizeRoles(["client"]), createReview);
router.get("/freelancer/:freelancerId", protect, getFreelancerReviews);

module.exports = router;
