const mongoose = require("mongoose");
const Gig = require("../models/Gig");
const User = require("../models/User");
const Proposal = require("../models/Proposal"); 
const { sendAutomatedEmail } = require("../config/mail");
const { generateMilestoneReceiptHTML } = require("../utils/receiptTemplates");

function parseMaxPrFilter(raw) {
  if (raw === undefined || raw === null || raw === "") return { ok: true, skip: true };
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0) return { ok: false, message: "Query parameter maxPr must be a non-negative number." };
  return { ok: true, value };
}

function parseSkillsFilter(raw) {
  if (raw === undefined || raw === null || raw === "") return { ok: true, skip: true };
  const tags = String(raw).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (tags.length === 0) return { ok: true, skip: true };
  return { ok: true, value: tags };
}

async function createGig(req, res) {
  try {
    const { title, description, skillsRequired, maxPr, milestones, attachments, category, estimatedDuration } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "title and description are required." });
    }

    if (!Array.isArray(skillsRequired) || !skillsRequired.every((item) => typeof item === "string" && item.trim().length > 0)) {
      return res.status(400).json({ message: "skillsRequired must be an array of non-empty strings." });
    }

    const maxPrParsed = Number(maxPr);
    if (Number.isNaN(maxPrParsed) || maxPrParsed < 0) {
      return res.status(400).json({ message: "maxPr must be a non-negative number." });
    }

    let milestonePayload = [];
    if (milestones && Array.isArray(milestones)) {
      milestonePayload = milestones.map((entry, index) => {
        const amount = Number(entry.amount);
        if (!entry.title || typeof entry.title !== "string" || Number.isNaN(amount) || amount < 0) {
          throw new Error(`milestones[${index}] must include a valid title and non-negative amount.`);
        }
        return {
          title: entry.title.trim(),
          amount,
          paymentStatus: "pending",
        };
      });
    }

    let attachmentPayload = [];
    if (attachments && Array.isArray(attachments)) {
      attachmentPayload = attachments.filter(url => typeof url === 'string');
    }

    const gigRecord = await Gig.create({
      user: req.user.id,
      title: String(title).trim(),
      description: String(description).trim(),
      category: category ? String(category).trim() : undefined,
      estimatedDuration: estimatedDuration ? String(estimatedDuration).trim() : undefined,
      skillsRequired: skillsRequired.map((item) => String(item).trim().toLowerCase()),
      maxPr: maxPrParsed,
      milestones: milestonePayload,
      attachments: attachmentPayload,
      status: "open",
    });

    return res.status(201).json({
      message: "Gig created successfully.",
      gig: gigRecord.toObject(),
    });
  } catch (error) {
    if (error.message && error.message.startsWith("milestones[")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("createGig:", error?.message || error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Could not create gig." });
  }
}

async function getGigs(req, res) {
  try {
    const filter = { user: req.user.id };

    const skillsResult = parseSkillsFilter(req.query.skills);
    if (!skillsResult.ok) return res.status(400).json({ message: skillsResult.message });
    if (!skillsResult.skip) filter.skillsRequired = { $in: skillsResult.value };

    const maxPrResult = parseMaxPrFilter(req.query.maxPr);
    if (!maxPrResult.ok) return res.status(400).json({ message: maxPrResult.message });
    if (!maxPrResult.skip) filter.maxPr = { $lte: maxPrResult.value };

    const gigList = await Gig.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "proposals",
        populate: { path: "freelancer", select: "name email" },
      })
      .lean({ virtuals: true });

    return res.status(200).json({ gigs: gigList });
  } catch (error) {
    console.error("getGigs:", error?.message || error);
    return res.status(500).json({ message: "Could not load gigs." });
  }
}

async function getGigById(req, res) {
  try {
    const gigId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    const gigRecord = await Gig.findById(gigId)
      .populate("user", "name email role")
      .populate("hiredFreelancer", "name email")
      .populate({
        path: "proposals",
        populate: { path: "freelancer", select: "name email" },
      })
      .lean({ virtuals: true });

    if (!gigRecord) return res.status(404).json({ message: "Gig not found." });

    return res.status(200).json({ gig: gigRecord });
  } catch (error) {
    console.error("getGigById:", error?.message || error);
    return res.status(500).json({ message: "Could not load gig." });
  }
}

async function getAllGigs(req, res) {
  try {
    const gigs = await Gig.find({ status: "open" }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ gigs });
  } catch (error) {
    console.error("getAllGigs:", error?.message || error);
    return res.status(500).json({ message: "Could not load gigs." });
  }
}

async function getHiredGigs(req, res) {
  try {
    const gigs = await Gig.find({ hiredFreelancer: req.user.id, status: "in-progress" }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ gigs });
  } catch (error) {
    console.error("getHiredGigs:", error?.message || error);
    return res.status(500).json({ message: "Could not load hired gigs." });
  }
}

async function submitMilestoneWork(req, res) {
  try {
    const { id: gigId, milestoneId } = req.params;
    const { submissionUrl, workNotes } = req.body;

    if (!submissionUrl || !submissionUrl.trim()) return res.status(400).json({ message: "Submission repository URL is required." });

    const gigRecord = await Gig.findById(gigId);
    if (!gigRecord) return res.status(404).json({ message: "Gig structure missing." });

    if (String(gigRecord.hiredFreelancer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Unauthorized. Only the hired expert can submit project milestones." });
    }

    const isSingleMilestoneContract = gigRecord.milestones.length === 0 || String(milestoneId) === String(gigId) || String(milestoneId) === "default-milestone-id-1";

    let milestone;
    if (isSingleMilestoneContract) {
      if (gigRecord.milestones.length === 0) {
        gigRecord.milestones.push({
          title: "Project Full Deliverable Block",
          amount: gigRecord.maxPr,
          paymentStatus: "paid",
          submissionUrl: "",
          workNotes: ""
        });
      }
      milestone = gigRecord.milestones[0];
    } else {
      milestone = gigRecord.milestones.id(milestoneId);
      if (!milestone) return res.status(404).json({ message: "Target milestone parameters missing." });
    }

    if (milestone.paymentStatus !== "paid" && milestone.paymentStatus !== "submitted") {
      return res.status(400).json({ message: "Milestones must be funded via escrow before work submission." });
    }

    milestone.submissionUrl = submissionUrl.trim();
    milestone.workNotes = workNotes?.trim() || "";
    milestone.paymentStatus = "submitted";

    await gigRecord.save();

    await Proposal.findOneAndUpdate(
      { gig: gigId, freelancer: req.user.id },
      { $set: { status: "submitted" } }
    );

    return res.status(200).json({ message: "Deliverable package successfully transmitted for review.", gig: gigRecord });
  } catch (error) {
    console.error("submitMilestoneWork error:", error);
    return res.status(500).json({ message: "Failed to update milestone parameters." });
  }
}

async function approveMilestoneWork(req, res) {
  try {
    const { id: gigId, milestoneId } = req.params;

    const gigRecord = await Gig.findById(gigId);
    if (!gigRecord) return res.status(404).json({ message: "Gig reference record missing." });

    if (String(gigRecord.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Access denied. Only the project owner can release milestone escrow funds." });
    }

    const isSingleMilestoneContract = gigRecord.milestones.length === 0 || String(milestoneId) === String(gigId) || String(milestoneId) === "default-milestone-id-1";

    let milestone;
    if (isSingleMilestoneContract) {
      if (gigRecord.milestones.length === 0) return res.status(404).json({ message: "No active deliverables found awaiting operational sign-off." });
      milestone = gigRecord.milestones[0];
    } else {
      milestone = gigRecord.milestones.id(milestoneId);
      if (!milestone) return res.status(404).json({ message: "Milestone array lookups missing parameters." });
    }

    if (milestone.paymentStatus !== "submitted") return res.status(400).json({ message: "Target milestone is not pending approval." });

    milestone.paymentStatus = "completed";

    const allCompleted = gigRecord.milestones.every((m) => m.paymentStatus === "completed");
    if (allCompleted) gigRecord.status = "completed";

    await gigRecord.save();

    if (allCompleted) {
      await Proposal.findOneAndUpdate(
        { gig: gigId, freelancer: gigRecord.hiredFreelancer },
        { $set: { status: "completed" } }
      );
    }

    try {
      const clientUser = await User.findById(gigRecord.user).lean();
      const freelancerUser = await User.findById(gigRecord.hiredFreelancer).lean();

      if (clientUser && freelancerUser) {
        const generatedTxId = new mongoose.Types.ObjectId().toString();
        const receiptHtmlContent = generateMilestoneReceiptHTML({
          gigTitle: gigRecord.title,
          milestoneTitle: milestone.title,
          amount: milestone.amount,
          clientName: clientUser.name,
          freelancerName: freelancerUser.name,
          transactionId: generatedTxId
        });

        await Promise.all([
          sendAutomatedEmail({ to: clientUser.email, subject: `[Receipt] Milestone Escrow Funds Released`, html: receiptHtmlContent }),
          sendAutomatedEmail({ to: freelancerUser.email, subject: `[Payment Dispatched] Contract Milestone Completed`, html: receiptHtmlContent })
        ]);
      }
    } catch (mailError) {
      console.error("Nodemailer transactional receipt system intercepted an error:", mailError?.message || mailError);
    }

    return res.status(200).json({ message: "Milestone successfully approved and paid out.", gig: gigRecord });
  } catch (error) {
    console.error("approveMilestoneWork error:", error);
    return res.status(500).json({ message: "Failed to process milestone approval." });
  }
}

module.exports = {
  createGig,
  getGigs,
  getGigById,
  getAllGigs,
  getHiredGigs,
  submitMilestoneWork,
  approveMilestoneWork,
};