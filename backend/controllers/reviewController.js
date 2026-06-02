const mongoose = require("mongoose");

const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const FreelancerProfile = require("../models/FreelancerProfile");

/**
 * 🌟 1 & 4. WEIGHTED SCORE & REVIEW ANALYTICS
 * Recalculates the freelancer's score using a weighted average.
 * Excludes flagged (fraudulent) reviews from the calculation.
 */
async function recalculateFreelancerRating(freelancerId) {
  const aggregation = await Review.aggregate([
    { 
      $match: { 
        freelancer: new mongoose.Types.ObjectId(String(freelancerId)),
        isFlagged: false, // Quarantined reviews don't affect the score
        isVerified: true
      } 
    },
    {
      $group: {
        _id: "$freelancer",
        totalWeight: { $sum: "$weight" },
        weightedRatingSum: { $sum: { $multiply: ["$rating", "$weight"] } },
        totalReviews: { $sum: 1 },
        // Track dimensional analytics
        qualityAvg: { $avg: "$qualityRating" },
        commAvg: { $avg: "$communicationRating" },
        timeAvg: { $avg: "$timelinessRating" },
      },
    },
  ]);

  const stats = aggregation[0];

  const averageRating = stats && stats.totalWeight > 0 
    ? Math.round((stats.weightedRatingSum / stats.totalWeight) * 10) / 10 
    : 0;
    
  const totalReviews = stats ? stats.totalReviews : 0;

  // Update the Freelancer Profile with the new weighted and dimensional stats
  await FreelancerProfile.findOneAndUpdate(
    { user: freelancerId }, // Assuming your FreelancerProfile schema maps to 'user'
    { 
      $set: { 
        averageRating, 
        totalReviews,
        analytics: {
          quality: stats ? Math.round(stats.qualityAvg * 10) / 10 : 0,
          communication: stats ? Math.round(stats.commAvg * 10) / 10 : 0,
          timeliness: stats ? Math.round(stats.timeAvg * 10) / 10 : 0,
        }
      } 
    },
    { upsert: true }
  );
}

/**
 * Client creates a review for the freelancer assigned to a completed gig.
 */
async function createReview(req, res) {
  try {
    const { gig, qualityRating, communicationRating, timelinessRating, reviewText } = req.body;

    if (!gig || !mongoose.Types.ObjectId.isValid(gig)) {
      return res.status(400).json({ message: "Valid gig document id is required." });
    }

    // Parse and validate dimensional ratings
    const qRating = Number(qualityRating);
    const cRating = Number(communicationRating);
    const tRating = Number(timelinessRating);

    if ([qRating, cRating, tRating].some(r => Number.isNaN(r) || r < 1 || r > 5)) {
      return res.status(400).json({ message: "All dimensional ratings must be numbers between 1 and 5." });
    }

    // Calculate the overall base rating
    const overallRating = (qRating + cRating + tRating) / 3;

    const gigRecord = await Gig.findById(gig).lean();
    if (!gigRecord) return res.status(404).json({ message: "Gig not found." });

    if (String(gigRecord.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only review a freelancer for your own gig." });
    }

    // 🌟 2. VERIFIED REVIEWS: Strict enforcement
    if (gigRecord.status !== "completed") {
      return res.status(400).json({
        message: "Reviews can only be submitted after the contract is officially completed and paid.",
      });
    }

    const acceptedProposal = await Proposal.findOne({ gig: gigRecord._id, status: "completed" }).lean();
    if (!acceptedProposal) {
      return res.status(400).json({ message: "No completed proposal found for this contract." });
    }

    const freelancerId = String(acceptedProposal.freelancer);

    // 🌟 3. WEIGHTED REPUTATION: Calculate influence multiplier based on contract budget
    // e.g., Base weight is 1. Every $500 adds 0.5 to the weight (capped at a multiplier of 5)
    let reviewWeight = 1.0;
    if (gigRecord.maxPr && gigRecord.maxPr > 0) {
      reviewWeight = Math.min(5.0, 1 + (gigRecord.maxPr / 1000)); 
    }

    // 🌟 4. FRAUD DETECTION SYSTEM
    let isFlagged = false;
    let flagReason = "none";
    const textToAnalyze = (reviewText || "").toLowerCase();

    // Check 1: Self-Review attempt
    if (String(req.user.id) === freelancerId) {
      isFlagged = true;
      flagReason = "self_review";
    }
    // Check 2: Suspicious / Spam Language
    else if (textToAnalyze.match(/(fake|buy reviews|test review|spam|scam)/)) {
      isFlagged = true;
      flagReason = "suspicious_language";
    }
    // Check 3: Gibberish or low-effort bot text (less than 10 characters but 5 stars)
    else if (overallRating === 5 && textToAnalyze.trim().length > 0 && textToAnalyze.trim().length < 5) {
      isFlagged = true;
      flagReason = "suspicious_language"; // Can also create a "low_effort" enum
    }

   // 🌟 FIX: If the review already exists, update it. If not, create it (upsert: true).
    const reviewRecord = await Review.findOneAndUpdate(
      { gig: gigRecord._id, client: req.user.id }, // Find existing review for this gig
      {
        freelancer: freelancerId,
        rating: overallRating,
        qualityRating: qRating,
        communicationRating: cRating,
        timelinessRating: tRating,
        reviewText: reviewText ? String(reviewText).trim() : "",
        isVerified: true,
        weight: reviewWeight,
        isFlagged,
        flagReason
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Only recalculate public scores if the review wasn't flagged for fraud
    if (!isFlagged) {
      await recalculateFreelancerRating(freelancerId);
    }

    return res.status(201).json({
      message: isFlagged 
        ? "Review submitted but held for moderation due to suspicious activity." 
        : "Review submitted and freelancer rating updated.",
      review: reviewRecord.toObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already reviewed the freelancer for this gig." });
    }
    console.error("createReview Error:", error?.message || error);
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Could not submit review." });
  }
}

/**
 * Fetches all verified, unflagged reviews for a freelancer by their User id.
 */
async function getFreelancerReviews(req, res) {
  try {
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({ message: "Invalid freelancer id." });
    }

    // Only fetch safe, verified reviews
    const reviewList = await Review.find({ 
      freelancer: freelancerId,
      isFlagged: false,
      isVerified: true 
    })
      .sort({ createdAt: -1 })
      .populate("client", "name email")
      .populate("gig", "title")
      .lean();

    const profile = await FreelancerProfile.findOne({ user: freelancerId })
      .select("averageRating totalReviews analytics")
      .lean();

    return res.status(200).json({
      averageRating: profile?.averageRating ?? 0,
      totalReviews: profile?.totalReviews ?? 0,
      analytics: profile?.analytics ?? { quality: 0, communication: 0, timeliness: 0 },
      reviews: reviewList,
    });
  } catch (error) {
    console.error("getFreelancerReviews Error:", error?.message || error);
    return res.status(500).json({ message: "Could not load reviews." });
  }
}

module.exports = {
  createReview,
  getFreelancerReviews,
};