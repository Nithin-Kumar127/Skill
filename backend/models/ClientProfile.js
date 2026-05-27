const mongoose = require("mongoose");

const clientProfileSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: [0, "Total spent cannot be negative"],
    },
    postedGigs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gig",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
