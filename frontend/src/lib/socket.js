import { io } from "socket.io-client";

export function createSocket() {
  const url = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const socket = io(url, { withCredentials: true });
  return socket;
}
