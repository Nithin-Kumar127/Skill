// backend/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  freelancer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  gig: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gig', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: true,
    trim: true
  },
  gigValue: { 
    type: Number, 
    required: true 
  }, 
  isVerified: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Fraud Prevention: Prevent a client from reviewing the exact same gig twice
reviewSchema.index({ gig: 1, client: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);