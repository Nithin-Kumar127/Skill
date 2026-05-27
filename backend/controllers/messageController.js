const mongoose = require("mongoose");

const Message = require("../models/Message");
const {
  getGigChatContext,
  isChatParticipant,
  getCounterpartId,
} = require("../utils/gigChatAccess");

/**
 * Persists a message for an assigned gig. Real-time delivery is handled via Socket.IO separately.
 */
async function sendMessage(req, res) {
  try {
    const { gig: gigRef, receiver: receiverRef, content } = req.body;

    if (!gigRef) {
      return res.status(400).json({ message: "gig is required (Gig document id)." });
    }

    if (!mongoose.Types.ObjectId.isValid(gigRef)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    if (!receiverRef || !mongoose.Types.ObjectId.isValid(receiverRef)) {
      return res.status(400).json({ message: "receiver must be a valid user id." });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "content is required." });
    }

    const chatContext = await getGigChatContext(gigRef);

    if (!chatContext.ok) {
      return res.status(chatContext.code).json({ message: chatContext.message });
    }

    const { clientId, freelancerId } = chatContext;

    if (!isChatParticipant(req.user.id, clientId, freelancerId)) {
      return res.status(403).json({ message: "You are not a participant in this gig chat." });
    }

    const expectedReceiver = getCounterpartId(req.user.id, clientId, freelancerId);

    if (String(receiverRef) !== String(expectedReceiver)) {
      return res.status(400).json({ message: "receiver must be the other participant for this gig." });
    }

    const messageRecord = await Message.create({
      sender: req.user.id,
      receiver: receiverRef,
      gig: gigRef,
      content: content.trim(),
      isRead: false,
    });

    return res.status(201).json({
      message: "Message saved.",
      savedMessage: messageRecord.toObject(),
    });
  } catch (error) {
    console.error("sendMessage:", error?.message || error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Could not save message." });
  }
}

/**
 * Full chat history for a gig (assigned + accepted proposal only).
 */
async function getGigMessages(req, res) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    const chatContext = await getGigChatContext(gigId);

    if (!chatContext.ok) {
      return res.status(chatContext.code).json({ message: chatContext.message });
    }

    const { clientId, freelancerId } = chatContext;

    if (!isChatParticipant(req.user.id, clientId, freelancerId)) {
      return res.status(403).json({ message: "You are not a participant in this gig chat." });
    }

    const messageList = await Message.find({ gig: gigId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .lean();

    return res.status(200).json({ messages: messageList });
  } catch (error) {
    console.error("getGigMessages:", error?.message || error);
    return res.status(500).json({ message: "Could not load messages." });
  }
}

module.exports = {
  sendMessage,
  getGigMessages,
};
