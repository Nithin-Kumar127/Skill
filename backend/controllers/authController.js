const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const ClientProfile = require("../models/ClientProfile");
const generateToken = require("../utils/generateToken");
const { sendAutomatedEmail } = require("../config/mail");

const BCRYPT_SALT_ROUNDS = 12;

function buildPublicUser(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    isEmailVerified: userDoc.isEmailVerified,
    twoFactorEnabled: userDoc.twoFactorEnabled,
  };
}

/**
 * Register: Auto-verifies the user and sends a Welcome Email.
 */
async function registerUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    if (role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be created through public registration." });
    }

    if (role !== "client" && role !== "freelancer") {
      return res.status(400).json({ message: "Role must be client or freelancer." });
    }

    const targetEmail = String(email).toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const session = await mongoose.startSession();
    let savedUser = null;

    try {
      session.startTransaction();

      const [user] = await User.create(
        [{
          name,
          email: targetEmail,
          password: hashedPassword,
          role,
          isEmailVerified: true, // 🌟 AUTO-VERIFIED
        }],
        { session }
      );

      if (role === "freelancer") {
        await FreelancerProfile.create([{ id: user._id }], { session });
      } else {
        await ClientProfile.create([{ id: user._id }], { session });
      }

      await session.commitTransaction();
      savedUser = user;
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }
      throw error;
    } finally {
      await session.endSession();
    }

    // 🌟 Send Welcome Email Background Task
    try {
      await sendAutomatedEmail({
        to: targetEmail,
        subject: "Welcome to SkillSphere!",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to SkillSphere, ${name}!</h2>
            <p>Your account has been successfully created and verified.</p>
            <p>You can now log in and start exploring the marketplace.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error("Welcome email failed to send, but registration succeeded:", mailError.message);
    }

    const token = generateToken(savedUser._id);

    return res.status(201).json({
      message: "Registration successful. Welcome to SkillSphere!",
      user: buildPublicUser(savedUser),
      token,
    });
  } catch (error) {
    console.error("registerUser Error Gateway:", error?.message || error);
    return res.status(500).json({ message: "Registration failed. Please try again later." });
  }
}

/**
 * Login: Checks password, triggers 6-digit Email OTP if 2FA is enabled.
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 🌟 TEMPORARY OVERRIDE TO TEST THE FRONTEND FLOW
    user.twoFactorEnabled = true;

    // 🌟 EMAIL OTP 2FA TRIGGER
    if (user.twoFactorEnabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digits
      user.twoFactorOtp = await bcrypt.hash(otpCode, BCRYPT_SALT_ROUNDS);
      user.twoFactorOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
      await user.save();

      try {
        await sendAutomatedEmail({
          to: user.email,
          subject: "SkillSphere - Your Login Code",
          html: `<h2>Your Login Code is: ${otpCode}</h2><p>This code expires in 10 minutes.</p>`,
        });
      } catch (mailError) {
        console.error("2FA email failed to send:", mailError.message);
        return res.status(500).json({ message: "Failed to send 2FA code. Please check email configuration." });
      }

      return res.status(200).json({
        requires2FA: true,
        message: "A 6-digit code has been sent to your email.",
        userId: user._id,
      });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "Login successful.",
      user: buildPublicUser(user),
      token,
    });
  } catch (error) {
    console.error("loginUser Error Gateway:", error?.message || error);
    return res.status(500).json({ message: "Login failed. Please try again later." });
  }
}

/**
 * Verify Email OTP for 2FA
 */
async function verify2FA(req, res) {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "User ID and validation codes are required." });
    }

    const user = await User.findById(userId).select("+twoFactorOtp +twoFactorOtpExpire");
    
    if (!user || !user.twoFactorOtp) {
      return res.status(400).json({ message: "No active 2FA request found." });
    }

    if (user.twoFactorOtpExpire < Date.now()) {
      return res.status(400).json({ message: "This code has expired. Please log in again." });
    }

    const isValid = await bcrypt.compare(code.trim(), user.twoFactorOtp);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid verification code." });
    }

    // Clear the OTP fields after successful use
    user.twoFactorOtp = undefined;
    user.twoFactorOtpExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "2FA verified successfully.",
      user: buildPublicUser(user),
      token,
    });
  } catch (error) {
    console.error("verify2FA Error Gateway:", error);
    return res.status(500).json({ message: "Error verifying 2FA code." });
  }
}

/**
 * Get current logged-in user (protected route).
 */
async function getCurrentUser(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      verificationStatus: user.verificationStatus,
      bio: user.bio,
      skills: user.skills,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("getCurrentUser Error Gateway:", error?.message || error);
    return res.status(500).json({ message: "Could not fetch user data." });
  }
}

/**
 * Generate Token & Send Reset Link Email
 * @route   POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No account registered with that email address." });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    // 🌟 ISOLATED TRY/CATCH: Prevents Nodemailer from hanging the frontend
    try {
      await sendAutomatedEmail({
        to: user.email,
        subject: "SkillSphere - Password Reset Request",
        html: `
          <h3>Password Reset Request</h3>
          <p>You requested a password reset for your SkillSphere profile. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
          <p>This link will expire in 10 minutes.</p>
        `,
      });
    } catch (mailError) {
      console.error("🚨 Nodemailer failed to send reset email:", mailError);
      
      // Rollback the token so it isn't stuck in the database
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      return res.status(500).json({ 
        message: "Email could not be sent. Please check server mail configuration." 
      });
    }

    return res
      .status(200)
      .json({ message: "Password reset instructions sent to your email." });
  } catch (error) {
    console.error("Forgot Password Error Gateway:", error);
    return res
      .status(500)
      .json({ message: "Internal server error processing email dispatch." });
  }
}

/**
 * Validate Token & Update User Password
 * @route   POST /api/auth/reset-password/:token
 */
async function resetPassword(req, res) {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token link." });
    }

    user.password = await bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully completed! You can now log in.",
    });
  } catch (error) {
    console.error("Reset Password Error Gateway:", error);
    return res.status(500).json({
      message: "Internal failure updating account password credential structural states.",
    });
  }
}

/**
 * Google OAuth 2.0 Identity Token Routing Gateway
 * @route   POST /api/auth/google
 */
async function googleLogin(req, res) {
  const { idToken } = req.body;

  try {
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        role: "freelancer",
        isEmailVerified: true, // Google accounts are pre-verified
        googleId,
      });
    }

    const appToken = generateToken(user._id);

    return res.status(200).json({
      token: appToken,
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("Google Auth Engine Error Gateway:", error.message);
    return res.status(400).json({
      message: "Google authentication signature tracking handshake failure.",
    });
  }
}

module.exports = {
  registerUser,
  loginUser,
  verify2FA,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  googleLogin,
};