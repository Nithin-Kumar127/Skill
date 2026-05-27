const Notification = require("../models/Notification");

async function getUserNotifications(req, res) {
  try {
    const id = req.user?.id;

    if (!id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const notifications = await Notification.find({ recipientId: id }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("getUserNotifications:", error?.message || error);
    return res.status(500).json({ message: "Failed to fetch notifications." });
  }
}

async function markAsRead(req, res) {
  try {
    const id = req.user?.id;
    const notificationId = req.params?.id;

    if (!id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    notification.isRead = true;
    const saved = await notification.save();

    return res.status(200).json(saved);
  } catch (error) {
    console.error("markAsRead:", error?.message || error);
    return res.status(500).json({ message: "Failed to update notification." });
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
};

