// backend/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const { addReview, getReviewAnalytics } = require('../controllers/reviewController');

// Replace this with your project's actual path to token verification middleware
const { protect } = require('../middleware/authMiddleware'); 

// Route to post a new verified review
router.post('/', protect, addReview);

// Route to get analytical milestones for the frontend graphs
router.get('/analytics/:userId', protect, getReviewAnalytics);

module.exports = router;