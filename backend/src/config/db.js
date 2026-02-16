import mongoose from "mongoose";

let _memoryServer;

function isTruthyEnv(value) {
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(value).trim().toLowerCase());
}

export async function connectDB() {
  let uri = process.env.MONGO_URI;
  const useInMemory = isTruthyEnv(process.env.USE_IN_MEMORY_DB);

  if (useInMemory) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    _memoryServer = await MongoMemoryServer.create();
    uri = _memoryServer.getUri("restaurant_mern");
    console.log("ℹ️  Using in-memory MongoDB (no Docker, no persistence)");
  }

  if (!uri) {
    throw new Error(
      "MONGO_URI is missing in .env (set it, or set USE_IN_MEMORY_DB=true for an ephemeral in-memory DB)"
    );
  }

  try {
    const serverSelectionTimeoutMS = Math.max(
      1000,
      Math.min(60000, Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000))
    );
    await mongoose.connect(uri, { serverSelectionTimeoutMS });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
  } finally {
    if (_memoryServer) {
      await _memoryServer.stop();
      _memoryServer = undefined;
    }
  }
}
