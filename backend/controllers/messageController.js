const mongoose = require("mongoose");
const Message = require("../models/Message");
const {
  getGigChatContext,
  isChatParticipant,
  getCounterpartId,
} = require("../utils/gigChatAccess");

/**
 * Persists a message (text or file) for an assigned gig.
 */
async function sendMessage(req, res) {
  try {
    const { gig: gigRef, receiver: receiverRef, content, fileUrl, fileType } = req.body;

    // 1. Validation
    if (!gigRef || !mongoose.Types.ObjectId.isValid(gigRef)) {
      return res.status(400).json({ message: "Valid gig ID is required." });
    }

    if (!receiverRef || !mongoose.Types.ObjectId.isValid(receiverRef)) {
      return res.status(400).json({ message: "receiver must be a valid user id." });
    }

    // Allow content OR fileUrl
    if ((!content || !content.trim()) && !fileUrl) {
      return res.status(400).json({ message: "Message must contain content or a file attachment." });
    }

    // 2. Authorization
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

    // 3. Save Message
    const messageRecord = await Message.create({
      sender: req.user.id,
      receiver: receiverRef,
      gig: gigRef,
      content: content ? content.trim() : null,
      fileUrl: fileUrl || null,    
      fileType: fileType || null,  
      isRead: false,
    });

    return res.status(201).json({
      message: "Message saved.",
      savedMessage: messageRecord.toObject(),
    });
  } catch (error) {
    console.error("sendMessage:", error?.message || error);
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Could not save message." });
  }
}

/**
 * Marks all unread messages for a specific gig as read.
 * Call this when the user opens the chat interface.
 */
async function markMessagesAsRead(req, res) {
  try {
    const { gigId } = req.body;

    if (!gigId || !mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Valid gigId is required." });
    }

    // Update messages sent TO the current user, in this gig, that are unread
    const result = await Message.updateMany(
      { 
        gig: gigId, 
        receiver: req.user.id, 
        isRead: false 
      },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      message: "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("markMessagesAsRead:", error);
    return res.status(500).json({ message: "Could not update read status." });
  }
}

/**
 * Full chat history for a gig.
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

/**
 * 🌟 NEW: Get global unread message count for the logged-in user.
 * Perfect for a notification badge in your Navbar/Dashboard.
 */
async function getGlobalUnreadCount(req, res) {
  try {
    const unreadCount = await Message.countDocuments({
      receiver: req.user.id, // Strictly messages sent TO this user
      isRead: false          // Strictly unread status
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("getGlobalUnreadCount:", error);
    return res.status(500).json({ message: "Could not fetch unread count." });
  }
}

module.exports = {
  sendMessage,
  getGigMessages,
  markMessagesAsRead, 
  getGlobalUnreadCount // 🌟 EXPORTED
};