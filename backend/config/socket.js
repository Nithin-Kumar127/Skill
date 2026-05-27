const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { getGigChatContext, isChatParticipant } = require("../utils/gigChatAccess");
const User = require("../models/User");
// INTEGRATION: Import your native Message model layout to store logs permanently
const Message = require("../models/Message");

function roomNameForGig(gigId) {
  return `gig:${gigId}`;
}

/**
 * @param {import("http").Server} httpServer
 * @param {{ cors?: import("socket.io").ServerOptions["cors"] }} [options]
 * @returns {import("socket.io").Server}
 */
function initSocket(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors:
      options.cors ?? {
        origin: "*",
        methods: ["GET", "POST"],
      },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        next(new Error("Unauthorized"));
        return;
      }

      const decoded = jwt.verify(token, secret);
      const userId = decoded.id;

      if (!userId) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.userId = userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Private room for user-scoped events (notifications, etc.)
    socket.join(String(socket.userId));

    socket.on("join_chat", async (payload, ack) => {
      try {
        const gigId = payload?.gigId;

        if (!gigId || typeof gigId !== "string") {
          socket.emit("chat_error", { message: "gigId is required." });
          return;
        }

        const chatContext = await getGigChatContext(gigId);

        if (!chatContext.ok) {
          socket.emit("chat_error", { message: chatContext.message });
          return;
        }

        if (!isChatParticipant(socket.userId, chatContext.clientId, chatContext.freelancerId)) {
          socket.emit("chat_error", { message: "You are not a participant in this gig chat." });
          return;
        }

        await socket.join(roomNameForGig(gigId));
        socket.emit("joined_chat", { gigId });

        if (typeof ack === "function") {
          ack({ ok: true, gigId });
        }
      } catch (error) {
        console.error("join_chat:", error?.message || error);
        socket.emit("chat_error", { message: "Could not join chat room." });
      }
    });

    socket.on("send_message", async (payload) => {
      try {
        const gigId = payload?.gigId;
        const textContent = payload?.content;

        if (!gigId || typeof gigId !== "string") return;
        if (!textContent || !textContent.trim()) return;

        const chatContext = await getGigChatContext(gigId);

        if (!chatContext.ok) {
          socket.emit("chat_error", { message: chatContext.message });
          return;
        }

        if (!isChatParticipant(socket.userId, chatContext.clientId, chatContext.freelancerId)) {
          socket.emit("chat_error", { message: "You are not a participant in this gig chat." });
          return;
        }

        // Determine the receiver ID based on who is sending the message
        const targetReceiverId = String(socket.userId) === String(chatContext.clientId)
          ? chatContext.freelancerId
          : chatContext.clientId;

        // FIXED STRUCTURAL KEYS: Aligned 'receiver' key with your Message.js model parameters
        const savedMessage = await Message.create({
          gig: gigId,
          sender: socket.userId,
          receiver: targetReceiverId,
          content: textContent.trim(),
          isRead: false,
        });

        const senderUser = await User.findById(socket.userId).select("name role").lean();

        // Broadcast the fully saved message document to the entire room (including sender & recipient)
        io.to(roomNameForGig(gigId)).emit("message_received", {
          _id: savedMessage._id,
          gig: savedMessage.gig,
          sender: {
            _id: savedMessage.sender,
            name: senderUser?.name || "Unknown",
            role: senderUser?.role || "user",
          },
          senderName: senderUser?.name || "Unknown",
          receiver: savedMessage.receiver,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt,
        });

      } catch (error) {
        console.error("send_message real-time exception logic failure:", error?.message || error);
        socket.emit("chat_error", { message: "Could not safely process or save your message body." });
      }
    });

    socket.on("typing", async (payload) => {
      try {
        const gigId = payload?.gigId;
        if (!gigId || typeof gigId !== "string") {
          return;
        }

        const chatContext = await getGigChatContext(gigId);

        if (!chatContext.ok) {
          return;
        }

        if (!isChatParticipant(socket.userId, chatContext.clientId, chatContext.freelancerId)) {
          return;
        }

        socket.to(roomNameForGig(gigId)).emit("typing", {
          gigId,
          userId: socket.userId,
          isTyping: Boolean(payload.isTyping),
        });
      } catch (error) {
        console.error("typing:", error?.message || error);
      }
    });

    /**
     * Server-side fanout to a specific user's private room.
     * Payload: { recipientId: string, event?: string, data: any }
     */
    socket.on("send_notification", async (payload, ack) => {
      try {
        const recipientId = payload?.recipientId;

        if (!recipientId || typeof recipientId !== "string") {
          if (typeof ack === "function") {
            ack({ ok: false, message: "recipientId is required." });
          }
          return;
        }

        const eventName = typeof payload?.event === "string" && payload.event.trim() ? payload.event : "notification_received";
        io.to(recipientId).emit(eventName, payload?.data ?? null);

        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        console.error("send_notification:", error?.message || error);
        if (typeof ack === "function") {
          ack({ ok: false, message: "Could not send notification." });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected (${socket.id}): ${reason}`);
    });
  });

  return io;
}

module.exports = initSocket;