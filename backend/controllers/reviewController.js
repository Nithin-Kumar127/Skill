const mongoose = require("mongoose");

const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const FreelancerProfile = require("../models/FreelancerProfile");

async function recalculateFreelancerRating(freelancerId) {
  const aggregation = await Review.aggregate([
    { $match: { freelancer: new mongoose.Types.ObjectId(String(freelancerId)) } },
    {
      $group: {
        _id: "$freelancer",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const stats = aggregation[0];

  const averageRating = stats ? Math.round(stats.averageRating * 10) / 10 : 0;
  const totalReviews = stats ? stats.totalReviews : 0;

  await FreelancerProfile.findOneAndUpdate(
    { id: freelancerId },
    { $set: { averageRating, totalReviews } }
  );
}

/**
 * Client creates a review for the freelancer assigned to a completed/assigned gig.
 */
async function createReview(req, res) {
  try {
    const { gig, rating, reviewText } = req.body;

    if (!gig || !mongoose.Types.ObjectId.isValid(gig)) {
      return res.status(400).json({ message: "gig must be a valid Gig document id." });
    }

    const parsedRating = Number(rating);
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "rating must be a number between 1 and 5." });
    }

    const gigRecord = await Gig.findById(gig).lean();

    if (!gigRecord) {
      return res.status(404).json({ message: "Gig not found." });
    }

    if (String(gigRecord.id) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only review a freelancer for your own gig." });
    }

    if (gigRecord.status !== "assigned" && gigRecord.status !== "completed") {
      return res.status(400).json({
        message: "Reviews can only be left for assigned or completed gigs.",
      });
    }

    const acceptedProposal = await Proposal.findOne({
      gig: gigRecord._id,
      status: "accepted",
    }).lean();

    if (!acceptedProposal) {
      return res.status(400).json({ message: "No accepted proposal found for this gig." });
    }

    const freelancerId = acceptedProposal.id;

    const reviewRecord = await Review.create({
      gig: gigRecord._id,
      client: req.user.id,
      freelancer: freelancerId,
      rating: parsedRating,
      reviewText: reviewText ? String(reviewText).trim() : "",
      isVerified: true,
    });

    await recalculateFreelancerRating(freelancerId);

    return res.status(201).json({
      message: "Review submitted and freelancer rating updated.",
      review: reviewRecord.toObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already reviewed the freelancer for this gig." });
    }

    console.error("createReview:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Could not submit review." });
  }
}

/**
 * Fetches all verified reviews for a freelancer by their User id.
 */
async function getFreelancerReviews(req, res) {
  try {
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({ message: "Invalid freelancer id." });
    }

    const reviewList = await Review.find({ freelancer: freelancerId })
      .sort({ createdAt: -1 })
      .populate("client", "name email")
      .populate("gig", "title")
      .lean();

    const profile = await FreelancerProfile.findOne({ id: freelancerId })
      .select("averageRating totalReviews")
      .lean();

    return res.status(200).json({
      averageRating: profile?.averageRating ?? 0,
      totalReviews: profile?.totalReviews ?? 0,
      reviews: reviewList,
    });
  } catch (error) {
    console.error("getFreelancerReviews:", error?.message || error);
    return res.status(500).json({ message: "Could not load reviews." });
  }
}

module.exports = {
  createReview,
  getFreelancerReviews,
};
