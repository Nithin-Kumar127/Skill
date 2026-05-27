const FreelancerProfile = require("../models/FreelancerProfile");
const ClientProfile = require("../models/ClientProfile");

const FREELANCER_AVAILABILITY = ["open", "limited", "unavailable"];
const SKILL_PROFICIENCY = ["beginner", "intermediate", "advanced", "expert"];

function buildPublicUser(userDoc) {
  return {
    id: userDoc.id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    isEmailVerified: userDoc.isEmailVerified,
    twoFactorEnabled: userDoc.twoFactorEnabled,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

function parseNonNegativeNumber(raw, label) {
  if (raw === undefined) {
    return { ok: true, skip: true };
  }

  if (raw === null || raw === "") {
    return { ok: false, message: `${label} cannot be empty. Omit the field to leave it unchanged.` };
  }

  const value = Number(raw);

  if (Number.isNaN(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }

  if (value < 0) {
    return { ok: false, message: `${label} cannot be negative.` };
  }

  return { ok: true, value };
}

function validateSkillsPayload(skills) {
  if (!Array.isArray(skills)) {
    return { ok: false, message: "skills must be an array." };
  }

  for (let i = 0; i < skills.length; i += 1) {
    const entry = skills[i];
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: `skills[${i}] must be an object with name and proficiency.` };
    }
    if (!entry.name || typeof entry.name !== "string" || entry.name.trim() === "") {
      return { ok: false, message: `skills[${i}].name is required and must be a valid string.` };
    }
    if (!entry.proficiency || !SKILL_PROFICIENCY.includes(entry.proficiency.toLowerCase())) {
      return {
        ok: false,
        message: `skills[${i}].proficiency must be one of: ${SKILL_PROFICIENCY.join(", ")}.`,
      };
    }
  }

  return { ok: true, value: skills };
}

function validateCertificationsPayload(certifications) {
  if (!Array.isArray(certifications)) {
    return { ok: false, message: "certifications must be an array." };
  }

  for (let i = 0; i < certifications.length; i += 1) {
    const entry = certifications[i];
    if (!entry || typeof entry !== "object") {
      return {
        ok: false,
        message: `certifications[${i}] must be an object with at least a title.`,
      };
    }
    if (!entry.title || typeof entry.title !== "string" || entry.title.trim() === "") {
      return { ok: false, message: `certifications[${i}].title is required.` };
    }
  }

  return { ok: true, value: certifications };
}

/**
 * Basic User data for any authenticated user.
 */
async function getUserProfile(req, res) {
  try {
    return res.status(200).json({
      user: buildPublicUser(req.user),
    });
  } catch (error) {
    console.error("getUserProfile:", error?.message || error);
    return res.status(500).json({ message: "Could not load profile." });
  }
}

/**
 * Freelancer: read FreelancerProfile linked by user id.
 */
async function getFreelancerProfile(req, res) {
  try {
    const id = req.user.id;

    const profileRecord = await FreelancerProfile.findOne({ id }).lean();

    if (!profileRecord) {
      return res.status(404).json({ message: "Freelancer profile not found." });
    }

    return res.status(200).json({ profile: profileRecord });
  } catch (error) {
    console.error("getFreelancerProfile:", error?.message || error);
    return res.status(500).json({ message: "Could not load freelancer profile." });
  }
}

/**
 * Freelancer: partial update; maxPr validated explicitly.
 */
async function updateFreelancerProfile(req, res) {
  try {
    const id = req.user.id;

    const profileRecord = await FreelancerProfile.findOne({ id });

    if (!profileRecord) {
      return res.status(404).json({ message: "Freelancer profile not found." });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "skills")) {
      const skillsCheck = validateSkillsPayload(req.body.skills);
      if (!skillsCheck.ok) {
        return res.status(400).json({ message: skillsCheck.message });
      }
      updates.skills = skillsCheck.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "portfolioGallery")) {
      if (!Array.isArray(req.body.portfolioGallery)) {
        return res.status(400).json({ message: "portfolioGallery must be an array of strings." });
      }
      if (!req.body.portfolioGallery.every((item) => typeof item === "string")) {
        return res.status(400).json({ message: "Each portfolioGallery entry must be a string URL." });
      }
      updates.portfolioGallery = req.body.portfolioGallery;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "resumeUrl")) {
      if (req.body.resumeUrl !== null && typeof req.body.resumeUrl !== "string") {
        return res.status(400).json({ message: "resumeUrl must be a string or null." });
      }
      updates.resumeUrl = req.body.resumeUrl;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "certifications")) {
      const certCheck = validateCertificationsPayload(req.body.certifications);
      if (!certCheck.ok) {
        return res.status(400).json({ message: certCheck.message });
      }
      updates.certifications = certCheck.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "availability")) {
      const normalizedAvailability = String(req.body.availability).toLowerCase().trim();
      if (!FREELANCER_AVAILABILITY.includes(normalizedAvailability)) {
        return res.status(400).json({
          message: `availability must be one of: ${FREELANCER_AVAILABILITY.join(", ")}.`,
        });
      }
      updates.availability = normalizedAvailability;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "hourlyRate")) {
      const hourlyCheck = parseNonNegativeNumber(req.body.hourlyRate, "hourlyRate");
      if (!hourlyCheck.ok) {
        return res.status(400).json({ message: hourlyCheck.message });
      }
      if (!hourlyCheck.skip) {
        updates.hourlyRate = hourlyCheck.value;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "maxPr")) {
      const maxPrCheck = parseNonNegativeNumber(req.body.maxPr, "maxPr");
      if (!maxPrCheck.ok) {
        return res.status(400).json({ message: maxPrCheck.message });
      }
      if (!maxPrCheck.skip) {
        updates.maxPr = maxPrCheck.value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    Object.assign(profileRecord, updates);
    await profileRecord.save();

    return res.status(200).json({
      message: "Freelancer profile updated successfully.",
      profile: profileRecord.toObject(),
    });
  } catch (error) {
    console.error("updateFreelancerProfile:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Could not update freelancer profile." });
  }
}

/**
 * Client: read ClientProfile linked by user id.
 */
async function getClientProfile(req, res) {
  try {
    const id = req.user.id;

    const profileRecord = await ClientProfile.findOne({ id }).lean();

    if (!profileRecord) {
      return res.status(404).json({ message: "Client profile not found." });
    }

    return res.status(200).json({ profile: profileRecord });
  } catch (error) {
    console.error("getClientProfile:", error?.message || error);
    return res.status(500).json({ message: "Could not load client profile." });
  }
}

/**
 * Client: partial update (self-service fields only).
 */
async function updateClientProfile(req, res) {
  try {
    const id = req.user.id;

    const profileRecord = await ClientProfile.findOne({ id });

    if (!profileRecord) {
      return res.status(404).json({ message: "Client profile not found." });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "companyName")) {
      if (req.body.companyName !== null && typeof req.body.companyName !== "string") {
        return res.status(400).json({ message: "companyName must be a string or null." });
      }
      updates.companyName = req.body.companyName ? req.body.companyName.trim() : req.body.companyName;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    Object.assign(profileRecord, updates);
    await profileRecord.save();

    return res.status(200).json({
      message: "Client profile updated successfully.",
      profile: profileRecord.toObject(),
    });
  } catch (error) {
    console.error("updateClientProfile:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Could not update client profile." });
  }
}

/**
 * Update user profile with bio and skills (for verification application).
 */
async function updateUserProfile(req, res) {
  try {
    const { bio, skills } = req.body;
    const User = require("../models/User");

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "bio")) {
      if (bio !== null && typeof bio !== "string") {
        return res.status(400).json({ message: "bio must be a string or null." });
      }
      if (bio && bio.trim().length === 0) {
        return res.status(400).json({ message: "bio cannot be empty." });
      }
      user.bio = bio ? bio.trim() : bio;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "skills")) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ message: "skills must be an array of strings." });
      }
      const cleanedSkills = skills
        .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
        .filter((skill) => skill.length > 0);

      if (cleanedSkills.length === 0) {
        return res.status(400).json({ message: "At least one skill is required." });
      }

      user.skills = cleanedSkills;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      skills: user.skills,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error("updateUserProfile:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Could not update user profile." });
  }
}

/**
 * Apply for freelancer verification.
 */
async function applyForVerification(req, res) {
  try {
    const User = require("../models/User");

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    if (user.verificationStatus === "pending" || user.verificationStatus === "verified") {
      return res.status(400).json({
        message: `Cannot apply for verification. Your current status is "${user.verificationStatus}".`,
        verificationStatus: user.verificationStatus,
      });
    }

    user.verificationStatus = "pending";
    await user.save();

    return res.status(200).json({
      message: "Verification application submitted successfully.",
      verificationStatus: user.verificationStatus,
      name: user.name,
      email: user.email,
      bio: user.bio,
      skills: user.skills,
    });
  } catch (error) {
    console.error("applyForVerification:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to submit verification application." });
  }
}

module.exports = {
  getUserProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  getClientProfile,
  updateClientProfile,
  updateUserProfile,
  applyForVerification,
};