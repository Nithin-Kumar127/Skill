const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getGigMessages,
  markMessagesAsRead, // 🌟 ADDED IMPORT
} = require("../controllers/messageController");

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/:gigId", protect, getGigMessages);

// 🌟 ADDED: New route to mark messages as read
router.post("/read", protect, markMessagesAsRead);

module.exports = router;