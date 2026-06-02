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

function validateWorkExperiencePayload(experience) {
  if (!Array.isArray(experience)) {
    return { ok: false, message: "workExperience must be an array." };
  }
  for (let i = 0; i < experience.length; i += 1) {
    const entry = experience[i];
    if (!entry.title || !entry.company || !entry.startDate) {
      return { ok: false, message: `workExperience[${i}] must include a title, company, and startDate.` };
    }
  }
  return { ok: true, value: experience };
}

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

async function getFreelancerProfile(req, res) {
  try {
    const id = req.user.id;
    let profileRecord = await FreelancerProfile.findOne({ id }).lean();

    if (!profileRecord) {
      profileRecord = { skills: [], portfolioGallery: [], certifications: [], workExperience: [], hourlyRate: 0, maxPr: 0 };
    }
    return res.status(200).json({ profile: profileRecord });
  } catch (error) {
    console.error("getFreelancerProfile:", error?.message || error);
    return res.status(500).json({ message: "Could not load freelancer profile." });
  }
}

async function updateFreelancerProfile(req, res) {
  try {
    const id = req.user.id;
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "skills")) {
      const skillsCheck = validateSkillsPayload(req.body.skills);
      if (!skillsCheck.ok) return res.status(400).json({ message: skillsCheck.message });
      updates.skills = skillsCheck.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "portfolioGallery")) {
      if (!Array.isArray(req.body.portfolioGallery)) {
        return res.status(400).json({ message: "portfolioGallery must be an array of strings." });
      }
      updates.portfolioGallery = req.body.portfolioGallery;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "resumeUrl")) {
      updates.resumeUrl = req.body.resumeUrl;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "certifications")) {
      const certCheck = validateCertificationsPayload(req.body.certifications);
      if (!certCheck.ok) return res.status(400).json({ message: certCheck.message });
      updates.certifications = certCheck.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "workExperience")) {
      const workCheck = validateWorkExperiencePayload(req.body.workExperience);
      if (!workCheck.ok) return res.status(400).json({ message: workCheck.message });
      updates.workExperience = workCheck.value;
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
      if (!hourlyCheck.ok) return res.status(400).json({ message: hourlyCheck.message });
      if (!hourlyCheck.skip) updates.hourlyRate = hourlyCheck.value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "maxPr")) {
      const maxPrCheck = parseNonNegativeNumber(req.body.maxPr, "maxPr");
      if (!maxPrCheck.ok) return res.status(400).json({ message: maxPrCheck.message });
      if (!maxPrCheck.skip) updates.maxPr = maxPrCheck.value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    const profileRecord = await FreelancerProfile.findOneAndUpdate(
      { id: id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Freelancer profile updated successfully.",
      profile: profileRecord.toObject(),
    });
  } catch (error) {
    console.error("updateFreelancerProfile:", error?.message || error);
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Could not update freelancer profile." });
  }
}

async function getClientProfile(req, res) {
  try {
    const id = req.user.id;
    const profileRecord = await ClientProfile.findOne({ id }).lean();
    if (!profileRecord) return res.status(404).json({ message: "Client profile not found." });
    return res.status(200).json({ profile: profileRecord });
  } catch (error) {
    return res.status(500).json({ message: "Could not load client profile." });
  }
}

async function updateClientProfile(req, res) {
  try {
    const id = req.user.id;
    const profileRecord = await ClientProfile.findOne({ id });
    if (!profileRecord) return res.status(404).json({ message: "Client profile not found." });

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, "companyName")) {
      updates.companyName = req.body.companyName ? req.body.companyName.trim() : req.body.companyName;
    }

    Object.assign(profileRecord, updates);
    await profileRecord.save();

    return res.status(200).json({
      message: "Client profile updated successfully.",
      profile: profileRecord.toObject(),
    });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Could not update client profile." });
  }
}

async function updateUserProfile(req, res) {
  try {
    const { bio, skills } = req.body;
    const User = require("../models/User");
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: "User profile not found." });

    if (Object.prototype.hasOwnProperty.call(req.body, "bio")) {
      user.bio = bio ? bio.trim() : bio;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "skills")) {
      const cleanedSkills = skills
        .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
        .filter((skill) => skill.length > 0);
      user.skills = cleanedSkills;
    }

    await user.save();
    return res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Could not update user profile." });
  }
}

async function applyForVerification(req, res) {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: "User profile not found." });

    if (user.verificationStatus === "pending" || user.verificationStatus === "verified") {
      return res.status(400).json({
        message: `Cannot apply for verification. Your current status is "${user.verificationStatus}".`,
      });
    }

    user.verificationStatus = "pending";
    await user.save();

    return res.status(200).json({ message: "Verification application submitted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit verification application." });
  }
}

async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided for upload." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ message: "File uploaded successfully", fileUrl });
  } catch (error) {
    console.error("uploadFile Error:", error);
    return res.status(500).json({ message: "Failed to process file upload." });
  }
}

// 🌟 NEW: The missing function that caused the crash
async function getPublicFreelancerProfile(req, res) {
  try {
    const { id } = req.params;
    
    const profileRecord = await FreelancerProfile.findOne({ id: id }).lean();
    
    const User = require("../models/User");
    const userRecord = await User.findById(id).select("name email verificationStatus").lean();

    if (!userRecord) {
      return res.status(404).json({ message: "Freelancer user account not found." });
    }

    const safeProfile = profileRecord || { 
      skills: [], portfolioGallery: [], certifications: [], workExperience: [], hourlyRate: 0, maxPr: 0, availability: "unknown" 
    };

    return res.status(200).json({
      user: userRecord,
      profile: safeProfile
    });
  } catch (error) {
    console.error("getPublicFreelancerProfile Error:", error?.message || error);
    return res.status(500).json({ message: "Could not load public freelancer profile." });
  }
}

// 🌟 EXPORTS (Crucial part that ties it all together)
module.exports = {
  getUserProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  getClientProfile,
  updateClientProfile,
  updateUserProfile,
  applyForVerification,
  uploadFile,
  getPublicFreelancerProfile, 
};