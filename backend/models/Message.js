const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [8000, "Message content is too long"],
      // Relaxed requirement to allow file-only messages
      required: function() { return !this.fileUrl; } 
    },
    // 🌟 NEW: Added for File Sharing
    fileUrl: {
      type: String,
      default: null,
    },
    // 🌟 NEW: Added to distinguish between images, docs, etc.
    fileType: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ gig: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);