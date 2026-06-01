const express = require("express");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  submitProposal,
  updateProposal, // 🌟 IMPORTED NEW FUNCTION
  getGigProposals,
  updateProposalStatus,
  getUserProposalForGig,
  acceptProposal,
  getUserProposals, 
  getFreelancerMetrics,
} = require("../controllers/proposalController");

const router = express.Router();

// Add this temporary route near the top of backend/routes/proposalRoutes.js
router.get("/fix-existing-data", protect, async (req, res) => {
  try {
    const Proposal = require("../models/Proposal");
    const Gig = require("../models/Gig");

    // 1. Fetch all existing proposals
    const proposals = await Proposal.find({});
    let updatedCount = 0;

    for (let proposal of proposals) {
      // 2. Find the gig linked to this proposal
      const linkedGig = await Gig.findById(proposal.gig);
      
      if (linkedGig && linkedGig.milestones && linkedGig.milestones.length > 0) {
        const firstMilestone = linkedGig.milestones[0];
        let targetStatus = proposal.status;

        // 3. Evaluate the milestone's paymentStatus to determine the correct proposal status
        if (firstMilestone.paymentStatus === "submitted") {
          targetStatus = "submitted";
        } else if (firstMilestone.paymentStatus === "completed" || linkedGig.status === "completed") {
          targetStatus = "completed";
        } else if (linkedGig.status === "in-progress" && proposal.status === "pending") {
          targetStatus = "accepted";
        }

        // 4. Update the proposal document if a status change is needed
        if (targetStatus !== proposal.status) {
          proposal.status = targetStatus;
          await proposal.save();
          updatedCount++;
        }
      }
    }

    return res.status(200).json({ 
      message: `Database synchronization complete! Updated ${updatedCount} existing proposals.`,
      totalProposalsChecked: proposals.length
    });
  } catch (error) {
    console.error("Migration Error:", error);
    return res.status(500).json({ message: "Failed to sync existing records." });
  }
});

// Fetch operational freelancer metadata statistics
router.get("/my-metrics", protect, authorizeRoles(["freelancer"]), getFreelancerMetrics);

// Basic proposal actions
router.get("/", protect, authorizeRoles(["freelancer"]), getUserProposals);
router.post("/", protect, authorizeRoles(["freelancer"]), submitProposal);

// 🌟 NEW ROUTE: Freelancer updates their counter-offer
router.patch("/:id", protect, authorizeRoles(["freelancer"]), updateProposal);

router.get("/gig/:gigId", protect, authorizeRoles(["client"]), getGigProposals);

router.get(
  "/my/:gigId",
  protect,
  authorizeRoles(["freelancer"]),
  getUserProposalForGig,
);

// Unified State Transitions (Role-restricted to corporate Clients only)
router.patch(
  "/:id/status",
  protect,
  authorizeRoles(["client"]),
  updateProposalStatus,
);

router.patch(
  "/:id/accept",
  protect,
  authorizeRoles(["client"]),
  acceptProposal,
);

module.exports = router;