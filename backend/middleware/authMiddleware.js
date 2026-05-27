const jwt = require("jsonwebtoken");

const User = require("../models/User");

/**
 * Verifies Bearer JWT, loads user (no password), sets req.user.
 * LOGS: Incoming token payload for session leak debugging
 */
async function protect(req, res, next) {
  let bearerToken;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    bearerToken = req.headers.authorization.slice("Bearer ".length).trim();
  }

  if (!bearerToken) {
    console.log("⚠️  protect: No bearer token provided in Authorization header");
    return res.status(401).json({ message: "No token" });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("protect: JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server authentication is not configured." });
    }

    const decoded = jwt.verify(bearerToken, secret);
    const id = decoded.id;

    // CRITICAL LOG: Track exactly which user ID is in the incoming token
    console.log("🔐 Token decoded payload evaluating user ID:", {
      tokenUserId: id,
      tokenExp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiry',
      timestamp: new Date().toISOString()
    });

    if (!id) {
      console.warn("⚠️  protect: Token decoded but no user ID found");
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const userRecord = await User.findById(id);

    if (!userRecord) {
      console.warn("⚠️  protect: User not found in database for token ID:", id);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    console.log("✓ protect: Token valid for user", {
      userId: userRecord._id,
      userName: userRecord.name,
      userRole: userRecord.role
    });

    req.user = userRecord;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      console.warn("⚠️  protect: Invalid JWT token -", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
    
    if (error.name === "TokenExpiredError") {
      console.warn("⚠️  protect: JWT token expired at", error.expiredAt);
      return res.status(401).json({ message: "Not authorized, token expired" });
    }

    console.error("🔴 protect: Unexpected error during authentication -", error?.message || error);
    return res.status(500).json({ message: "Authentication failed." });
  }
}

/**
 * @param {string[]} allowedRoles - e.g. ['admin', 'client']
 * @returns {import('express').RequestHandler}
 */
function authorizeRoles(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error("authorizeRoles requires a non-empty array of role strings.");
  }

  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return function roleGate(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const userRole = String(req.user.role || "").toLowerCase();

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "User role not authorized to access this route",
      });
    }

    next();
  };
}

/**
 * ADMINISTRATIVE SECURITY GATE:
 * Restricts route access to verified freelancers only.
 * Must be used on routes AFTER the 'protect' middleware has run.
 */
function requireVerifiedFreelancer(req, res, next) {
  // Admins are granted bypass clearance automatically
  if (req.user && req.user.role === "admin") {
    return next();
  }

  if (!req.user || req.user.verificationStatus !== "verified") {
    return res.status(403).json({
      message: "Access Denied. Your freelancer profile must be verified by an admin before you can perform this action.",
    });
  }

  next();
}

module.exports = {
  protect,
  authorizeRoles,
  requireVerifiedFreelancer, // Exported to protect restricted proposal routes
};