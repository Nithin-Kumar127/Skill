const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");

/**
 * Loads an active contract gig and participants for real-time chat authorization.
 */
async function getGigChatContext(gigId) {
  const gigRecord = await Gig.findById(gigId).lean();

  if (!gigRecord) {
    return { ok: false, code: 404, message: "Gig not found." };
  }

  // FIXED: Expanded the check array loop to cleanly accept both "assigned", "in-progress", and "completed" contract phases!
  const allowedChatStatuses = ["assigned", "in-progress", "completed"];
  if (!allowedChatStatuses.includes(gigRecord.status)) {
    return {
      ok: false,
      code: 403,
      message: "Chat rooms are only available for hired and active project contracts.",
    };
  }

  const acceptedProposal = await Proposal.findOne({
    gig: gigRecord._id,
    status: "accepted",
  }).lean();

  if (!acceptedProposal) {
    return {
      ok: false,
      code: 403,
      message: "No accepted proposal or hired contractor found for this gig workspace.",
    };
  }

  // FIXED PROPERTY MAPPINGS: Replaced '.id' extensions with explicit root database references
  const clientId = String(gigRecord.user); 
  const freelancerId = String(acceptedProposal.freelancer);

  return {
    ok: true,
    gigRecord,
    clientId,
    freelancerId,
  };
}

function isChatParticipant(userId, clientId, freelancerId) {
  const userIdStr = String(userId);
  return userIdStr === clientId || userIdStr === freelancerId;
}

function getCounterpartId(userId, clientId, freelancerId) {
  const userIdStr = String(userId);
  if (userIdStr === clientId) {
    return freelancerId;
  }
  if (userIdStr === freelancerId) {
    return clientId;
  }
  return null;
}

module.exports = {
  getGigChatContext,
  isChatParticipant,
  getCounterpartId,
};