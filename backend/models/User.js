const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Hash at registration in your service layer (e.g. bcrypt). Not hashed here.
    password: {
      type: String,
      select: false,
      minlength: [8, "Password must be at least 8 characters"],
    },
    // PASSWORD RESET PROPERTIES
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    role: {
      type: String,
      enum: {
        values: ["client", "freelancer", "admin"],
        message: "{VALUE} is not a supported role",
      },
      required: [true, "Role is required"],
    },
    // GOOGLE OAUTH SECURITY SIGNATURE
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    
    // EMAIL VERIFICATION PROPERTIES
    isEmailVerified: {
      type: Boolean,
      default: true, // AUTO-VERIFIED ON SIGNUP NOW
    },
    // TWO-FACTOR AUTHENTICATION (2FA) PROPERTIES
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorOtp: {
      type: String,
      select: false, // Hashed 6-digit code
    },
    twoFactorOtpExpire: {
      type: Date,
      select: false,
    },
    // ADMINISTRATIVE VERIFICATION ADDITIONS
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: {
        values: ["unapplied", "pending", "verified", "rejected"],
        message: "{VALUE} is not a valid verification state",
      },
      default: "unapplied",
    },
    // FREELANCER VERIFICATION APPLICATION FIELDS
    bio: {
      type: String,
      trim: true,
      maxlength: [5000, "Bio cannot exceed 5000 characters"],
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);