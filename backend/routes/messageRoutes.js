const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { sendMessage, getGigMessages } = require("../controllers/messageController");

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/:gigId", protect, getGigMessages);

module.exports = router;
