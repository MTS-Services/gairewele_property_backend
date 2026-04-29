const { Server } = require("socket.io");
const { verifyToken } = require("./utils/jwt");
const prisma = require("./config/prisma");

let io = null;

const userRoom = (userId) => `user:${userId}`;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 10 * 1024 * 1024,
  });

  // JWT auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Authentication required"));

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, fullName: true, role: true, isSuspended: true },
      });
      if (!user) return next(new Error("User not found"));
      if (user.isSuspended) return next(new Error("Account suspended"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket;
    socket.join(userRoom(user.id));

    // Notify others (optional presence indicator)
    socket.broadcast.emit("presence:online", { userId: user.id });

    // Typing indicator: { receiverId, isTyping }
    socket.on("typing", ({ receiverId, isTyping }) => {
      if (!receiverId) return;
      io.to(userRoom(receiverId)).emit("typing", {
        from: user.id,
        isTyping: !!isTyping,
      });
    });

    // Manual join of a conversation room (optional, for multi-device sync)
    socket.on("conversation:join", ({ conversationId }) => {
      if (conversationId) socket.join(`conversation:${conversationId}`);
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("presence:offline", { userId: user.id });
    });
  });

  return io;
};

const getIo = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
};

module.exports = { init, getIo, emitToUser };
