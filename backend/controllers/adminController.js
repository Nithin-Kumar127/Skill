const User = require("../models/User");
const Gig = require("../models/Gig");
const Payment = require("../models/Payment");
const Dispute = require("../models/Dispute");

/**
 * Fetches high-level administrative platform metrics, revenue aggregates, and status trends
 */
async function getPlatformStats(req, res) {
  try {
    const [totalUsers, totalGigs] = await Promise.all([
      User.countDocuments(),
      Gig.countDocuments()
    ]);

    const revenueAgg = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);

    const totalRevenue = Number(revenueAgg?.[0]?.totalRevenue || 0);

    return res.status(200).json({
      totalUsers: Number(totalUsers || 0),
      totalGigs: Number(totalGigs || 0),
      totalRevenue,
    });
  } catch (error) {
    console.error("getPlatformStats:", error?.message || error);
    return res.status(500).json({ message: "Failed to fetch platform stats." });
  }
}

/**
 * Lists all registered user accounts inside the database without exposed credential structures
 */
async function getAllUsers(req, res) {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (error) {
    console.error("getAllUsers:", error?.message || error);
    return res.status(500).json({ message: "Failed to fetch users." });
  }
}

/**
 * Lists historical and open contract disputes sorted chronologically
 */
async function getAllDisputes(req, res) {
  try {
    const disputes = await Dispute.find()
      .sort({ createdAt: -1 })
      .populate("gigId")
      .populate({
        path: "clientId",
        populate: { path: "id", model: "User", select: "-password" },
      })
      .populate({
        path: "freelancerId",
        populate: { path: "id", model: "User", select: "-password" },
      });

    return res.status(200).json(disputes);
  } catch (error) {
    console.error("getAllDisputes:", error?.message || error);
    return res.status(500).json({ message: "Failed to fetch disputes." });
  }
}

/**
 * Processes administrative sign-off and writes arbitrary review logs onto dispute contexts
 */
async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body || {};

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found." });
    }

    if (typeof adminNotes === "string") {
      dispute.adminNotes = adminNotes;
    }

    dispute.status = "resolved";

    const saved = await dispute.save();
    return res.status(200).json(saved);
  } catch (error) {
    console.error("resolveDispute:", error?.message || error);
    return res.status(500).json({ message: "Failed to resolve dispute." });
  }
}

/**
 * NEW VERIFICATION ADDITION:
 * Lists all freelancers who have submitted profiles currently waiting for admin authorization review
 */
async function getPendingFreelancers(req, res) {
  try {
    const pendingList = await User.find({
      role: "freelancer",
      verificationStatus: "pending"
    })
    .select("-password")
    .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pendingList.length,
      freelancers: pendingList
    });
  } catch (error) {
    console.error("getPendingFreelancers error:", error?.message || error);
    return res.status(500).json({ message: "Failed to load verification queue pipeline." });
  }
}

/**
 * NEW VERIFICATION ADDITION:
 * Action handler to either approve or reject a contractor's verification profile
 */
async function updateFreelancerVerification(req, res) {
  try {
    const { userId } = req.params;
    const { action } = req.body; // Expects values: 'approve' or 'reject'

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action type. Must use 'approve' or 'reject'." });
    }

    const freelancer = await User.findOne({ _id: userId, role: "freelancer" });
    if (!freelancer) {
      return res.status(404).json({ message: "Target freelancer user account not found." });
    }

    if (action === "approve") {
      freelancer.verificationStatus = "verified";
      freelancer.isVerified = true;
    } else {
      freelancer.verificationStatus = "rejected";
      freelancer.isVerified = false;
    }

    await freelancer.save();

    return res.status(200).json({
      message: `Freelancer profile layout successfully updated to: ${freelancer.verificationStatus}.`,
      freelancer: {
        _id: freelancer._id,
        name: freelancer.name,
        verificationStatus: freelancer.verificationStatus,
        isVerified: freelancer.isVerified
      }
    });
  } catch (error) {
    console.error("updateFreelancerVerification error:", error?.message || error);
    return res.status(500).json({ message: "Failed updating user profile identity verification state keys." });
  }
}

module.exports = {
  getPlatformStats,
  getAllUsers,
  getAllDisputes,
  resolveDispute,
  getPendingFreelancers,
  updateFreelancerVerification,
};  