const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { getUserNotifications, markAsRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);

router.get("/", getUserNotifications);
router.patch("/:id/read", markAsRead);

module.exports = router;

