import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Reservation } from "../models/Reservation.js";
import { Room } from "../models/Room.js";
import { protect, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

function makeRef() {
  return "RSV-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);
}

// Public: availability for date range
router.get("/availability", async (req, res, next) => {
  try {
    const schema = z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    });
    const { start, end } = schema.parse(req.query);

    const startAt = new Date(start);
    const endAt = new Date(end);

    const rooms = await Room.find({ status: { $in: ["Available", "Occupied", "Cleaning"] } });
    const reservations = await Reservation.find({
      status: { $in: ["confirmed", "pending_payment"] },
      $or: [
        { startAt: { $lt: endAt }, endAt: { $gt: startAt } }
      ]
    }).select("room startAt endAt");

    const busy = new Map(); // roomId -> intervals
    for (const r of reservations) {
      const k = String(r.room);
      if (!busy.has(k)) busy.set(k, []);
      busy.get(k).push([r.startAt, r.endAt]);
    }

    const availableRooms = rooms.filter(room => {
      if (["Maintenance", "Out-of-Service"].includes(room.status)) return false;
      const intervals = busy.get(String(room._id)) || [];
      return intervals.length === 0;
    });

    res.json({ availableRooms, totalRooms: rooms.length });
  } catch (e) {
    next(e);
  }
});

// Create reservation (guest allowed)
router.post("/", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const schema = z.object({
      roomId: z.string(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      purpose: z.string().optional().default(""),
      guest: z.object({
        name: z.string().optional().default(""),
        email: z.string().optional().default(""),
        phone: z.string().optional().default("")
      }).optional(),
      paymentRequired: z.boolean().optional().default(false)
    });
    const data = schema.parse(req.body);

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (endAt <= startAt) {
      res.status(400);
      throw new Error("endAt must be after startAt");
    }

    session.startTransaction();

    const room = await Room.findById(data.roomId).session(session);
    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }
    if (["Maintenance", "Out-of-Service"].includes(room.status)) {
      res.status(400);
      throw new Error("Room unavailable due to maintenance/out-of-service");
    }

    // Prevent double-booking (atomic-ish with query)
    const clash = await Reservation.findOne({
      room: room._id,
      status: { $in: ["confirmed", "pending_payment"] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt }
    }).session(session);

    const referenceNo = makeRef();
    const status = data.paymentRequired ? "pending_payment" : "confirmed";

    if (clash) {
      // create waitlist entry
      const wait = await Reservation.create([{
        room: room._id,
        startAt, endAt,
        purpose: data.purpose,
        status: "waitlisted",
        referenceNo,
        guest: data.guest || {},
        payment: { status: "unpaid", amount: 0 }
      }], { session });

      await session.commitTransaction();
      res.status(202).json({ reservation: wait[0], waitlisted: true });
      return;
    }

    const hours = Math.ceil((endAt - startAt) / (1000 * 60 * 60));
    const amount = hours * (room.basePricePerHour || 0);

    const reservation = await Reservation.create([{
      room: room._id,
      startAt,
      endAt,
      purpose: data.purpose,
      status,
      referenceNo,
      guest: data.guest || {},
      payment: { status: "unpaid", amount }
    }], { session });

    await session.commitTransaction();

    emitEvent("reservations", "reservation:new", reservation[0]);

    const to = data.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Reservation Confirmation ${referenceNo}`,
        html: `<p>Your reservation <b>${referenceNo}</b> is ${status}. Room: ${room.name}. Start: ${startAt.toISOString()} End: ${endAt.toISOString()}</p>`
      }).catch(()=>{});
    }

    res.status(201).json({ reservation: reservation[0] });
  } catch (e) {
    try { await session.abortTransaction(); } catch {}
    next(e);
  } finally {
    session.endSession();
  }
});

// My reservations (auth)
router.get("/my", protect, async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ customer: req.user._id }).populate("room").sort({ startAt: -1 }).limit(100);
    res.json({ reservations });
  } catch (e) {
    next(e);
  }
});

// Staff calendar view
router.get("/calendar", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 7*24*60*60*1000);
    const end = req.query.end ? new Date(String(req.query.end)) : new Date(Date.now() + 30*24*60*60*1000);
    const reservations = await Reservation.find({
      startAt: { $lt: end },
      endAt: { $gt: start }
    }).populate("room", "code name status").sort({ startAt: 1 });
    res.json({ reservations });
  } catch (e) {
    next(e);
  }
});

// Modify/cancel (customer for own, or staff/admin override with audit)
router.put("/:id", protect, async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) {
      res.status(404);
      throw new Error("Reservation not found");
    }
    const isOwner = r.customer && String(r.customer) === String(req.user._id);
    const isStaff = ["staff", "admin"].includes(req.user.role);

    if (!isOwner && !isStaff) {
      res.status(403);
      throw new Error("Forbidden");
    }

    // staff override logging
    if (isStaff) {
      r.audit.push({ by: req.user._id, action: "override_update", note: "Staff updated reservation" });
    }

    Object.assign(r, req.body);
    await r.save();
    emitEvent("reservations", "reservation:updated", r);

    const to = r.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Reservation Update ${r.referenceNo}`,
        html: `<p>Your reservation <b>${r.referenceNo}</b> has been updated. Status: <b>${r.status}</b>.</p>`
      }).catch(() => {});
    }

    res.json({ reservation: r });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/cancel", protect, async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) {
      res.status(404);
      throw new Error("Reservation not found");
    }
    const isOwner = r.customer && String(r.customer) === String(req.user._id);
    const isStaff = ["staff", "admin"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      res.status(403);
      throw new Error("Forbidden");
    }

    r.status = "cancelled";
    if (isStaff) r.audit.push({ by: req.user._id, action: "override_cancel", note: "Staff cancelled reservation" });
    await r.save();
    emitEvent("reservations", "reservation:cancelled", r);

    const to = r.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Reservation Cancelled ${r.referenceNo}`,
        html: `<p>Your reservation <b>${r.referenceNo}</b> has been cancelled.</p>`
      }).catch(() => {});
    }

    res.json({ reservation: r });
  } catch (e) {
    next(e);
  }
});

export default router;
