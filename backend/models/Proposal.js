const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
    },
    bidAmount: {
      type: Number,
      required: true,
      min: [0, "bidAmount cannot be negative"],
    },
    estimatedCompletionTime: {
      type: String,
      required: true,
      default: "Not specified", // 🌟 THE FIX: Prevents crashes on old legacy data
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "submitted", "completed", "negotiating"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.index({ gig: 1, freelancer: 1 }, { unique: true });

module.exports = mongoose.model("Proposal", proposalSchema);