const jwt = require("jsonwebtoken");

/**
 * @param {import("mongoose").Types.ObjectId | string} id - User document id
 * @returns {string} Signed JWT (30-day expiry)
 */
function generateToken(id) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const payloadId = typeof id === "string" ? id : id.toString();

  return jwt.sign({ id: payloadId }, secret, { expiresIn: "30d" });
}

module.exports = generateToken;
