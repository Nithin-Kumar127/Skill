// backend/server.js
const http = require("http");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDatabase = require("./config/db");
const initSocket = require("./config/socket");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const gigRoutes = require("./routes/gigRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const messageRoutes = require("./routes/messageRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic health/status endpoint (no feature logic)
app.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "skillsphere-backend",
  });
});

const port = Number(process.env.PORT) || 5000;

const httpServer = http.createServer(app);
initSocket(httpServer);

async function startServer() {
  await connectDatabase();

  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
