const mongoose = require("mongoose");
const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const User = require("../models/User");

const CLIENT_UPDATEABLE_STATUSES = ["accepted", "rejected", "negotiating"];

// Helper function to check if a client owns a specific gig
function gigOwnedByClient(gigRecord, clientUserId) {
  return String(gigRecord.user) === String(clientUserId);
}

/**
 * Freelancer submits a new proposal for a gig.
 */
async function submitProposal(req, res) {
  try {
    const { gig: gigRef, coverLetter, bidAmount, estimatedCompletionTime } = req.body;

    if (!gigRef || !mongoose.Types.ObjectId.isValid(gigRef)) {
      return res.status(400).json({ message: "Valid gig ID is required." });
    }

    if (!coverLetter || typeof coverLetter !== "string" || !coverLetter.trim()) {
      return res.status(400).json({ message: "coverLetter is required." });
    }

    if (!estimatedCompletionTime || typeof estimatedCompletionTime !== "string" || !estimatedCompletionTime.trim()) {
      return res.status(400).json({ message: "estimatedCompletionTime is required." });
    }

    const gigRecord = await Gig.findById(gigRef);
    if (!gigRecord) return res.status(404).json({ message: "Gig not found." });

    if (gigRecord.status !== "open") {
      return res.status(400).json({ message: "Proposals can only be submitted for open gigs." });
    }

    if (String(gigRecord.user) === String(req.user.id)) {
      return res.status(403).json({ message: "You cannot submit a proposal for your own gig." });
    }

    const bidAmountParsed = Number(bidAmount !== undefined ? bidAmount : gigRecord.maxPr);
    if (Number.isNaN(bidAmountParsed) || bidAmountParsed < 0) {
      return res.status(400).json({ message: "bidAmount must evaluate cleanly to a non-negative number." });
    }

    const proposalRecord = await Proposal.create({
      gig: gigRecord._id,
      freelancer: req.user.id,
      coverLetter: coverLetter.trim(),
      bidAmount: bidAmountParsed,
      estimatedCompletionTime: estimatedCompletionTime.trim(),
      status: "pending",
    });

    return res.status(201).json({
      message: "Proposal submitted successfully.",
      proposal: proposalRecord.toObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already submitted a proposal for this gig.", code: "DUPLICATE_PROPOSAL" });
    }
    console.error("submitProposal error:", error?.message || error);
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Could not submit proposal." });
  }
}

/**
 * 🌟 NEW: Freelancer updates an existing proposal (Counter-Offer).
 */
async function updateProposal(req, res) {
  try {
    const proposalId = req.params.id;
    const { coverLetter, bidAmount, estimatedCompletionTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ message: "Invalid proposal ID." });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ message: "Proposal not found." });

    // Verify ownership
    if (String(proposal.freelancer) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own proposals." });
    }

    // Check if gig is still open
    const gigRecord = await Gig.findById(proposal.gig);
    if (!gigRecord || gigRecord.status !== "open") {
       return res.status(400).json({ message: "Cannot modify proposal, gig is no longer open." });
    }

    // Only allow edits if status is negotiating (or pending)
    if (!["negotiating", "pending"].includes(proposal.status)) {
      return res.status(400).json({ message: "You can only edit proposals that are pending or in negotiation." });
    }

    if (coverLetter) proposal.coverLetter = coverLetter.trim();
    if (estimatedCompletionTime) proposal.estimatedCompletionTime = estimatedCompletionTime.trim();
    if (bidAmount !== undefined) {
       const bidAmountParsed = Number(bidAmount);
       if (Number.isNaN(bidAmountParsed) || bidAmountParsed < 0) {
         return res.status(400).json({ message: "bidAmount must be a valid non-negative number." });
       }
       proposal.bidAmount = bidAmountParsed;
    }

    // 🌟 Switch status back to pending so the client sees it as a new offer!
    proposal.status = "pending";
    await proposal.save();

    return res.status(200).json({
      message: "Counter-offer submitted successfully.",
      proposal: proposal.toObject(),
    });

  } catch (error) {
    console.error("updateProposal error:", error);
    return res.status(500).json({ message: "Could not update proposal." });
  }
}

/**
 * Client lists proposals for a gig they own.
 */
async function getGigProposals(req, res) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    const gigRecord = await Gig.findById(gigId).lean();
    if (!gigRecord) {
      return res.status(404).json({ message: "Gig not found." });
    }

    if (!gigOwnedByClient(gigRecord, req.user.id)) {
      return res.status(403).json({ message: "You can only view proposals for gigs you created." });
    }

    const proposalList = await Proposal.find({ gig: gigId })
      .populate("freelancer", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ proposals: proposalList });
  } catch (error) {
    console.error("getGigProposals:", error?.message || error);
    return res.status(500).json({ message: "Could not load proposals." });
  }
}

/**
 * Client updates proposal status (e.g., Negotiate, Reject).
 */
async function updateProposalStatus(req, res) {
  try {
    const proposalDocumentId = req.params.id;
    const { status: nextStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(proposalDocumentId)) {
      return res.status(400).json({ message: "Invalid proposal id." });
    }

    if (!nextStatus || typeof nextStatus !== "string") {
      return res.status(400).json({ message: "status is required." });
    }

    if (!CLIENT_UPDATEABLE_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        message: `status must be one of: ${CLIENT_UPDATEABLE_STATUSES.join(", ")}.`,
      });
    }

    const proposalRecord = await Proposal.findById(proposalDocumentId);
    if (!proposalRecord) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    const gigRecord = await Gig.findById(proposalRecord.gig);
    if (!gigRecord) {
      return res.status(404).json({ message: "Linked gig not found." });
    }

    if (!gigOwnedByClient(gigRecord, req.user.id)) {
      return res.status(403).json({ message: "You can only update proposals for your own gigs." });
    }

    if (nextStatus === "accepted") {
      if (proposalRecord.status === "rejected") {
        return res.status(400).json({ message: "Cannot accept a proposal that is already rejected." });
      }

      if (gigRecord.status !== "open") {
        return res.status(400).json({ message: "This gig is not open for assignment." });
      }

      proposalRecord.status = "accepted";
      await proposalRecord.save();

      gigRecord.status = "in-progress";
      gigRecord.hiredFreelancer = proposalRecord.freelancer;
      await gigRecord.save();

      const rejectResult = await Proposal.updateMany(
        { gig: proposalRecord.gig, _id: { $ne: proposalRecord._id } },
        { $set: { status: "rejected" } },
        { runValidators: true },
      );

      return res.status(200).json({
        message: "Gig assigned successfully. Competing proposals for this gig were rejected.",
        proposal: proposalRecord.toObject(),
        gig: gigRecord.toObject(),
        rejectedProposalCount: rejectResult.modifiedCount,
      });
    }

    proposalRecord.status = nextStatus;
    await proposalRecord.save();

    return res.status(200).json({
      message: "Proposal status updated.",
      proposal: proposalRecord.toObject(),
    });
  } catch (error) {
    console.error("updateProposalStatus:", error?.message || error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Could not update proposal status." });
  }
}

/**
 * Freelancer checks if they have already submitted a proposal for a gig.
 */
async function getUserProposalForGig(req, res) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    const proposal = await Proposal.findOne({
      gig: gigId,
      freelancer: req.user.id,
    }).lean();

    if (proposal) {
      return res.status(200).json({ proposal });
    } else {
      return res.status(404).json({ message: "No proposal found." });
    }
  } catch (error) {
    console.error("getUserProposalForGig error:", error?.message || error);
    return res.status(500).json({ message: "Could not check proposal." });
  }
}

/**
 * Client accepts a proposal, setting gig to in-progress and hiring the freelancer.
 */
async function acceptProposal(req, res) {
  try {
    const proposalDocumentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(proposalDocumentId)) {
      return res.status(400).json({ message: "Invalid proposal id." });
    }

    const proposalRecord = await Proposal.findById(proposalDocumentId);
    if (!proposalRecord) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    const gigRecord = await Gig.findById(proposalRecord.gig);
    if (!gigRecord) {
      return res.status(404).json({ message: "Linked gig not found." });
    }

    if (!gigOwnedByClient(gigRecord, req.user.id)) {
      return res.status(403).json({ message: "You can only accept proposals for your own gigs." });
    }

    if (proposalRecord.status === "accepted") {
      return res.status(400).json({ message: "This proposal is already accepted." });
    }

    if (gigRecord.status !== "open") {
      return res.status(400).json({ message: "This gig is not open for assignment." });
    }

    proposalRecord.status = "accepted";
    await proposalRecord.save();

    gigRecord.status = "in-progress";
    gigRecord.hiredFreelancer = proposalRecord.freelancer;
    await gigRecord.save();

    const rejectResult = await Proposal.updateMany(
      { gig: proposalRecord.gig, _id: { $ne: proposalRecord._id } },
      { $set: { status: "rejected" } },
      { runValidators: true },
    );

    return res.status(200).json({
      message: "Proposal accepted successfully. Gig is now in progress.",
      proposal: proposalRecord.toObject(),
      gig: gigRecord.toObject(),
      rejectedProposalCount: rejectResult.modifiedCount,
    });
  } catch (error) {
    console.error("acceptProposal:", error?.message || error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Could not accept proposal." });
  }
}

/**
 * Fetches all history records for proposals submitted by the logged-in freelancer.
 */
async function getUserProposals(req, res) {
  try {
    const proposals = await Proposal.find({ freelancer: req.user.id })
      .populate("gig")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(proposals);
  } catch (error) {
    console.error("getUserProposals Error:", error?.message || error);
    return res.status(500).json({ message: "Could not load your submitted proposals." });
  }
}

/**
 * Aggregates real operational metrics and accounts status for the freelancer overview dashboard view
 */
async function getFreelancerMetrics(req, res) {
  try {
    const freelancerId = req.user.id;

    const activeJobsCount = await Gig.countDocuments({
      hiredFreelancer: freelancerId,
      status: "in-progress"
    });

    const earningsResult = await Proposal.aggregate([
      {
        $match: {
          freelancer: new mongoose.Types.ObjectId(freelancerId),
          status: { $in: ["accepted", "submitted", "completed"] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$bidAmount" }
        }
      }
    ]);

    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;
    const userDoc = await User.findById(freelancerId).select("verificationStatus");

    return res.status(200).json({
      activeJobsCount,
      totalEarnings,
      verificationStatus: userDoc?.verificationStatus || "unapplied"
    });
  } catch (error) {
    console.error("getFreelancerMetrics Engine Error:", error?.message || error);
    return res.status(500).json({ message: "Internal server metrics aggregation failure." });
  }
}

module.exports = {
  submitProposal,
  updateProposal, // 🌟 EXPORTED NEW FUNCTION
  getGigProposals,
  updateProposalStatus,
  getUserProposalForGig,
  acceptProposal,
  getUserProposals,
  getFreelancerMetrics,
};