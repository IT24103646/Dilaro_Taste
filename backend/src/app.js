import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import orderRoutes from "./routes/order.routes.js";
import roomRoutes from "./routes/room.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import laundryRoutes from "./routes/laundry.routes.js";
import paymentRoutes, { stripeWebhookHandler } from "./routes/payment.routes.js";
import packageRoutes from "./routes/package.routes.js";
import reportRoutes from "./routes/report.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import heroRoutes from "./routes/hero.routes.js";
import { connectDB } from "./config/db.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isDev = (process.env.NODE_ENV || "development") !== "production";

  // Security + basics
  app.use(helmet());
  app.use(morgan("dev"));

  // Stripe requires the raw request body for webhook signature verification.
  // This MUST be registered before express.json().
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting (basic)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200
    })
  );

  // CORS
  app.use(
    cors({
      origin(origin, cb) {
        // same-origin / curl / server-to-server
        if (!origin) return cb(null, true);

        // If explicitly configured, enforce allowlist
        if (allowedOrigins.length > 0) {
          return cb(null, allowedOrigins.includes(origin));
        }

        // Otherwise, in dev allow any localhost port (Vite may pick 5174/5175)
        if (isDev && /^https?:\/\/localhost:\d+$/.test(origin)) {
          return cb(null, true);
        }

        return cb(null, false);
      },
      credentials: true
    })
  );

  // Health
  app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/reservations", reservationRoutes);
  app.use("/api/laundry", laundryRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/hero", heroRoutes);

  // simple image url storage; optional
  app.use("/api/uploads", uploadRoutes);

  // Errors
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const _app = createApp();

let _dbPromise;
async function ensureDbConnected() {
  if (!_dbPromise) {
    _dbPromise = connectDB().catch((err) => {
      _dbPromise = undefined;
      throw err;
    });
  }
  return _dbPromise;
}

export default async function handler(req, res) {
  await ensureDbConnected();
  return _app(req, res);
}
