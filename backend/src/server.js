import http from "http";
import "dotenv/config";

import bcrypt from "bcryptjs";

import { connectDB, disconnectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { initSocket } from "./socket.js";
import { User } from "./models/User.js";

async function ensureDefaultAdmin() {
  const existingAdmin = await User.findOne({ role: "admin" }).select("_id").lean();
  if (existingAdmin) return;

  const email = String(process.env.DEFAULT_ADMIN_EMAIL || "admin@demo.com").trim().toLowerCase();
  const password = String(process.env.DEFAULT_ADMIN_PASSWORD || "admin123");
  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({ name: "Admin", email, role: "admin", passwordHash });

  if ((process.env.NODE_ENV || "development") !== "production") {
    console.log(`ℹ️  Created default admin: ${email} / ${password}`);
  } else {
    console.log(`ℹ️  Created default admin: ${email}`);
  }
}

await connectDB();
await ensureDefaultAdmin();

const app = createApp();
const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 5000;
server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or set PORT to a free port in backend/.env.`);
    process.exit(1);
  }
  console.error("❌ Server error:", err);
  process.exit(1);
});
server.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    console.log(`\nℹ️  Received ${signal}, shutting down...`);
    await disconnectDB();
  } catch (e) {
    console.error("❌ Error during shutdown:", e?.message || e);
  } finally {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
