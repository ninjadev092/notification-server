import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const activeUsers = new Map();

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins chat
  socket.on("join", (data) => {
    const userId = parseInt(data.userId);

    // Remove any existing socket connection for this user
    const existingUser = activeUsers.get(userId);
    if (existingUser) {
      const existingSocket = io.sockets.sockets.get(existingUser.socketId);
      if (existingSocket) {
        existingSocket.disconnect();
      }
    }

    // Set new socket connection
    activeUsers.set(userId, {
      token: data.token,
      socketId: socket.id,
    });

    io.emit("user_online", userId);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  // Create a helper function for emitting events to users
  const emitToUser = (receiverId, eventName, data) => {
    const userData = activeUsers.get(receiverId);
    if (userData?.socketId) {
      io.to(userData.socketId).emit(eventName, data);
    }
  };

  // Handle incoming messages with the helper function
  socket.on("new_message", (data) => {
    emitToUser(parseInt(data.receiver_id), "new_message", data);
  });

  socket.on("typing_message", (data) => {
    emitToUser(parseInt(data.receiver_id), "typing_message", data);
  });

  socket.on("add_friend", (data) => {
    emitToUser(parseInt(data.receiver_id), "add_friend", data);
  });

  socket.on("decline_friend", (data) => {
    emitToUser(parseInt(data.receiver_id), "decline_friend", data);
  });

  socket.on("accept_friend", (data) => {
    emitToUser(parseInt(data.receiver_id), "accept_friend", data);
  });

  socket.on("new_comment", (data) => {
    emitToUser(parseInt(data.receiver_id), "new_comment", {
      comments: data.comments,
      isReply: data.isReply,
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    let disconnectedUserId;

    activeUsers.forEach((userData, userId) => {
      if (userData.socketId === socket.id) {
        disconnectedUserId = userId;
      }
    });

    if (disconnectedUserId) {
      activeUsers.delete(disconnectedUserId);
      io.emit("user_offline", disconnectedUserId);
      console.log(`User ${disconnectedUserId} disconnected (${socket.id})`);
    }
  });
});

// GET endpoint to retrieve all online users
app.get("/socket/online-users", (req, res) => {
  try {
    // Convert Map keys to array of user IDs
    const onlineUserIds = Array.from(activeUsers.keys());

    res.json({
      success: true,
      onlineUsers: onlineUserIds,
      count: onlineUserIds.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch online users",
    });
  }
});

// GET endpoint to check specific user's status
app.get("/socket/check-user-status/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const isOnline = activeUsers.has(userId);
    console.log(userId, isOnline);
    res.json({ userId, isOnline });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to check user status",
    });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
