const mongoose = require("mongoose");

const skillEntrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    proficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      required: true,
    },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    credentialUrl: { type: String, trim: true },
    earnedAt: { type: Date },
  },
  { _id: false }
);

// 🌟 NEW: Work Experience Timeline Schema
const workExperienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // Leave empty if currently working here
    description: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const freelancerProfileSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: {
      type: [skillEntrySchema],
      default: [],
    },
    portfolioGallery: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      trim: true,
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    // 🌟 NEW: Added to main profile
    workExperience: {
      type: [workExperienceSchema],
      default: [],
    },
    availability: {
      type: String,
      enum: ["open", "limited", "unavailable"],
      default: "open",
    },
    hourlyRate: {
      type: Number,
      min: [0, "Hourly rate cannot be negative"],
    },
    maxPr: {
      type: Number,
      min: [0, "maxPr cannot be negative"],
    },
    verificationBadge: {
      type: String,
      enum: ["none", "pending", "verified"],
      default: "none",
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot exceed 5"],
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FreelancerProfile", freelancerProfileSchema);