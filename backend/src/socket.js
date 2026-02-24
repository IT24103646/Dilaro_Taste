import { Server } from "socket.io";

let io;

export function initSocket(httpServer) {
  // Mirror the same logic as Express CORS: allow any localhost port in dev when CORS_ORIGIN is unset/empty
  const rawOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isDev = (process.env.NODE_ENV || "development") !== "production";
  const corsOrigin =
    rawOrigins.length > 0
      ? rawOrigins
      : isDev
      ? /^https?:\/\/localhost:\d+$/
      : false;

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // rooms: kitchen, reservations, laundry, admin
    socket.on("join", (room) => socket.join(room));
  });

  return io;
}

export function emitEvent(room, event, payload) {
  if (!io) return;
  io.to(room).emit(event, payload);
}
