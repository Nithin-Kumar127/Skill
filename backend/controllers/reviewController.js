// backend/controllers/reviewController.js
const Review = require('../models/Review');
const Gig = require('../models/Gig');
const FreelancerProfile = require('../models/FreelancerProfile'); // ✅ Fixed: Imported Profile instead of User
const mongoose = require('mongoose');

// Helper function to calculate the smart weighted reputation score
async function updateFreelancerReputation(freelancerId) {
  try {
    const reviews = await Review.find({ freelancer: freelancerId });
    
    if (reviews.length === 0) return;

    let totalWeight = 0;
    let weightedRatingSum = 0;
    const now = new Date();

    reviews.forEach(review => {
      // 1. Recency Weight: Deduct weight as the review gets older (max 24 months impact)
      const ageInMonths = (now - new Date(review.createdAt)) / (1000 * 60 * 60 * 24 * 30);
      const recencyWeight = Math.max(0.2, 1 - (ageInMonths / 24)); 

      // 2. Value Weight: Higher budget gigs carry more reputation weight
      // Cap value weight multiplier at 3.0 for gigs over $1000 to avoid extreme skewing
      const valueWeight = Math.min(3.0, 1 + (review.gigValue / 500));

      // Combined mathematical weight for this individual review
      const finalWeight = recencyWeight * valueWeight;

      weightedRatingSum += review.rating * finalWeight;
      totalWeight += finalWeight;
    });

    const smartScore = totalWeight > 0 ? (weightedRatingSum / totalWeight).toFixed(2) : 0;

    // ✅ Fixed: Now updates the FreelancerProfile model using your app's query key safely
    await FreelancerProfile.findOneAndUpdate(
      { $or: [{ user: freelancerId }, { _id: freelancerId }, { id: freelancerId }] }, 
      { 
        smartRating: Number(smartScore),
        totalReviews: reviews.length
      }
    );
  } catch (error) {
    console.error("Error updating freelancer reputation metrics:", error.message);
  }
} // 🌟 FIXED: Added this missing closing brace that caused your unexpected end of input crash!

// 1. Create a Verified Review with Fraud Detection
exports.addReview = async (req, res) => {
  try {
    const { gigId, rating, comment } = req.body;
    const clientId = req.user.id; // Populated by your authentication middleware

    // Find the gig and verify its status
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found." });
    }

    // Fraud Prevention: Verify the client actually owns this gig/contract
    if (!gig.user || gig.user.toString() !== clientId) {
      return res.status(403).json({ message: "Unauthorized. You did not hire this freelancer." });
    }

    // Fraud Prevention: Verify the project is fully completed/paid
    if (gig.status !== 'completed') {
      return res.status(400).json({ message: "You can only review completed milestones." });
    }

    // Fraud Prevention: Ensure freelancer isn't reviewing themselves
    //  UPDATED TO MATCH YOUR SCHEMA:
const freelancerId = gig.hiredFreelancer; // 🌟 Changed 'freelancer' to 'hiredFreelancer'
if (!freelancerId || clientId === freelancerId.toString()) {
  return res.status(400).json({ message: "Fraud detected: You cannot review yourself." });
}

    // Create and save the verified review
    const newReview = new Review({
      freelancer: freelancerId,
      client: clientId,
      gig: gigId,
      rating: Number(rating),
      comment,
      gigValue: gig.price || gig.maxPr || 0, // Fallback budget configuration tracking
      isVerified: true
    });

    await newReview.save();

    // Recalculate and update freelancer's reputation score asynchronously
    await updateFreelancerReputation(freelancerId);

    return res.status(201).json({ message: "Verified review submitted successfully!", review: newReview });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already submitted a review for this contract." });
    }
    return res.status(500).json({ message: "Server error updating review.", error: error.message });
  }
};

// 2. Fetch Review Analytics for Freelancer Dashboard
exports.getReviewAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Aggregation Pipeline to generate historical performance trends group by month
    const analytics = await Review.aggregate([
      { $match: { freelancer: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          totalEarningsReviewed: { $sum: "$gigValue" }
        }
      },
      { $sort: { "_id": 1 } } // Sort chronologically
    ]);

    return res.status(200).json({ analytics });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching dashboard analytics.", error: error.message });
  }
};