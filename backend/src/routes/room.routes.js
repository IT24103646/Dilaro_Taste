import express from "express";
import { z } from "zod";
import { Room } from "../models/Room.js";
import { RoomStatusLog } from "../models/RoomStatusLog.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Public list rooms
router.get("/", async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ code: 1 });
    res.json({ rooms });
  } catch (e) {
    next(e);
  }
});

// Admin create room
router.post("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional().default(""),
      photos: z.array(z.string()).optional().default([]),
      capacity: z.number().min(1).optional().default(1),
      amenities: z.array(z.string()).optional().default([]),
      basePricePerHour: z.number().min(0).optional().default(0),
      status: z.enum(["Available", "Occupied", "Cleaning", "Maintenance", "Out-of-Service"]).optional()
    });
    const data = schema.parse(req.body);
    const room = await Room.create(data);
    res.status(201).json({ room });
  } catch (e) {
    next(e);
  }
});

// Staff/admin update room status with log
router.post("/:id/status", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      to: z.enum(["Available", "Occupied", "Cleaning", "Maintenance", "Out-of-Service"]),
      reason: z.string().optional().default("")
    });
    const { to, reason } = schema.parse(req.body);

    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }
    const from = room.status;
    room.status = to;
    await room.save();

    await RoomStatusLog.create({ room: room._id, from, to, reason, byUser: req.user._id });

    res.json({ room });
  } catch (e) {
    next(e);
  }
});

export default router;
