const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Milestone amount cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "submitted", "completed"],
      default: "pending",
    },
    submissionUrl: {
      type: String,
      trim: true,
    },
    workNotes: {
      type: String,
      trim: true,
    },
  },
  { _id: true },
);

const gigSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    maxPr: {
      type: Number,
      required: true,
      min: [0, "maxPr cannot be negative"],
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "assigned", "in-progress", "completed"],
      default: "open",
    },
    hiredFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

gigSchema.virtual("proposals", {
  ref: "Proposal",  
  localField: "_id",
  foreignField: "gig",
});

gigSchema.set("toJSON", { virtuals: true });
gigSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Gig", gigSchema);