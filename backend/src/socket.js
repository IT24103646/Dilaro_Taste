import { Server } from "socket.io";

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
      credentials: true
    }
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
