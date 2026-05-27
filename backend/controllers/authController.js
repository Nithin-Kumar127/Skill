const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { authenticator } = require("otplib");

const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const ClientProfile = require("../models/ClientProfile");
const generateToken = require("../utils/generateToken");
const { sendAutomatedEmail } = require("../config/mail"); // Streamlined to use your unified automation exporter

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
 * Register with email/password. Generates an email verification token,
 * issues live transactional verification mail messages, and maps workspace profiles.
 */
async function registerUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    if (role === "admin") {
      return res.status(403).json({
        message:
          "Admin accounts cannot be created through public registration.",
      });
    }

    if (role !== "client" && role !== "freelancer") {
      return res.status(400).json({
        message: "Role must be client or freelancer.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("registerUser: JWT_SECRET is not configured");
      return res.status(500).json({
        message: "Server authentication is not configured.",
      });
    }

    // Standardize input credentials mapping parameters
    const targetEmail = String(email).toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Generate Verification Token Pair
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const hashedVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24-hour token window

    const session = await mongoose.startSession();
    let savedUser = null;

    try {
      session.startTransaction();

      const [user] = await User.create(
        [
          {
            name,
            email: targetEmail,
            password: hashedPassword,
            role,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpire: verificationExpire,
          },
        ],
        { session },
      );

      if (role === "freelancer") {
        await FreelancerProfile.create([{ id: user._id }], { session });
      } else {
        await ClientProfile.create([{ id: user._id }], { session });
      }

      await session.commitTransaction();
      savedUser = user; // Extract document safely to pass outside the transaction database pool
    } catch (transactionError) {
      await session.abortTransaction();

      if (transactionError.code === 11000) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }

      throw transactionError;
    } finally {
      await session.endSession();
    }

    // 🌟 SAFE EXECUTION ZONE: Run network mail delivery outside database transactions
    const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email/${verificationToken}`;

    // DEVELOP
    console.log(`\n--- 🗺️ SKILLSPHERE REGISTRATION PROCESS ---`);
    console.log(`User: ${name} (${targetEmail})`);
    console.log(`Verification URL: ${verifyUrl}`);
    console.log(`-------------------------------------------\n`);

    try {
      // Trigger your production-grade live email handler
      await sendAutomatedEmail({
        to: targetEmail,
        subject: "Welcome to SkillSphere - Verify Your Email",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to SkillSphere, ${name}!</h2>
            <p>Thank you for registering. Please click the button below to verify your account address framework and unlock your workspace marketplace tools:</p>
            <p style="margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify My Email Address</a>
            </p>
            <p style="font-size: 12px; color: #666;">If the button above does not work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #2563eb;">${verifyUrl}</p>
          </div>
        `,
      });
    } catch (mailError) {
      // Catch bad env credentials gracefully without dropping the entire request flow!
      console.error(
        "⚠️ Nodemailer failed to deliver email, but user document registration remains safe in database:",
        mailError.message,
      );
    }

    const token = generateToken(savedUser._id);

    return res.status(201).json({
      message:
        "Registration successful. A verification link has been dispatched to your inbox.",
      user: buildPublicUser(savedUser),
      token,
    });
  } catch (error) {
    console.error("registerUser Error Gateway:", error?.message || error);
    return res.status(500).json({
      message: "Registration failed. Please try again later.",
    });
  }
}

/**
 * Login with email/password; Intercepts step workflow loops if 2FA is active.
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("loginUser: JWT_SECRET is not configured");
      return res.status(500).json({
        message: "Server authentication is not configured.",
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(200).json({
        requires2FA: true,
        message: "Two-factor authentication code required.",
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
    return res.status(500).json({
      message: "Login failed. Please try again later.",
    });
  }
}

/**
 * Get current logged-in user (protected route).
 */
async function getCurrentUser(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
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
    return res.status(500).json({
      message: "Could not fetch user data.",
    });
  }
}

/**
 * Consumes email token and activates verified field flags.
 * @route   POST /api/auth/verify-email/:token
 */
async function verifyEmail(req, res) {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Verification link is invalid or has expired." });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    return res.status(200).json({
      message: "Email verification successful! Profile privileges unlocked.",
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("verifyEmail Error Gateway:", error);
    return res.status(500).json({ message: "Verification processing failed." });
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
      message:
        "Internal failure updating account password credential structural states.",
    });
  }
}

/**
 * Verify incoming 2FA standard code strings from login forms.
 * @route   POST /api/auth/verify-2fa
 */
async function verify2FA(req, res) {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        message:
          "User ID and authenticator token validation codes are required.",
      });
    }

    const user = await User.findById(userId).select("+twoFactorSecret");
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        message:
          "2FA tracking parameters are completely inactive on this user record.",
      });
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid verification token code entry parameter string.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "2FA checkpoint passed successfully.",
      user: buildPublicUser(user),
      token,
    });
  } catch (error) {
    console.error("verify2FA Error Gateway:", error);
    return res.status(500).json({
      message: "Internal error processing second factor security checkpoints.",
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verify2FA,
  googleLogin,
};
