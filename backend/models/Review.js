const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // 📊 1. REVIEW ANALYTICS: Multi-dimensional scoring
    rating: {
      type: Number, // Overall average rating
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must not exceed 5"],
    },
    qualityRating: {
      type: Number,
      required: true,
      min: 1, max: 5,
    },
    communicationRating: {
      type: Number,
      required: true,
      min: 1, max: 5,
    },
    timelinessRating: {
      type: Number,
      required: true,
      min: 1, max: 5,
    },
    
    reviewText: {
      type: String,
      trim: true,
      default: "",
    },
    
    // 🛡️ 2. VERIFIED REVIEWS: Strictly gated by payment completion
    isVerified: {
      type: Boolean,
      default: false, // Defaults to false; backend must actively verify the contract was paid
    },
    
    // ⚖️ 3. WEIGHTED REPUTATION: Higher-value contracts hold more weight
    weight: {
      type: Number,
      default: 1.0, // Base multiplier. Backend can increase this based on Gig 'maxPr' (budget).
    },

    // 🚨 4. FRAUD DETECTION: Flags for suspicious activity
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      enum: ["rapid_submission", "self_review", "suspicious_language", "none"],
      default: "none",
    }
  },
  {
    timestamps: true,
  }
);

// Prevent review spam: One review per client per gig
reviewSchema.index({ gig: 1, client: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);