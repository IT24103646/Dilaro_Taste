import "dotenv/config";

import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";

const app = createApp();

let connectPromise;
async function ensureDbConnected() {
  if (!connectPromise) {
    connectPromise = connectDB().catch((err) => {
      connectPromise = undefined;
      throw err;
    });
  }
  return connectPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDbConnected();
    return app(req, res);
  } catch (err) {
    console.error("❌ API handler crashed:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Internal Server Error" }));
  }
}
