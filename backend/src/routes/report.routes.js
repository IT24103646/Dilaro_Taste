import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Reservation } from "../models/Reservation.js";
import { Room } from "../models/Room.js";
import { RoomStatusLog } from "../models/RoomStatusLog.js";

const router = express.Router();

router.get("/overview", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const [ordersTotal, reservationsTotal, roomsTotal] = await Promise.all([
      Order.countDocuments(),
      Reservation.countDocuments(),
      Room.countDocuments()
    ]);
    const activeOrders = await Order.countDocuments({ status: { $in: ["confirmed","preparing","ready","dispatched","pending_payment"] }});
    const upcomingReservations = await Reservation.countDocuments({ status: { $in: ["confirmed","pending_payment"] }, startAt: { $gte: new Date() }});
    res.json({ ordersTotal, reservationsTotal, roomsTotal, activeOrders, upcomingReservations });
  } catch (e) { next(e); }
});

// Room utilization / revenue per room (simple)
router.get("/rooms/utilization", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const sinceDays = Math.max(7, Math.min(365, Number(req.query.days || 30)));
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const agg = await Reservation.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ["confirmed","completed","pending_payment"] } } },
      { $group: { _id: "$room", count: { $sum: 1 }, revenue: { $sum: "$payment.amount" } } },
      { $sort: { revenue: -1 } }
    ]);

    const rooms = await Room.find();
    const map = new Map(rooms.map(r => [String(r._id), r]));

    const result = agg.map(a => ({
      roomId: a._id,
      code: map.get(String(a._id))?.code,
      name: map.get(String(a._id))?.name,
      bookings: a.count,
      revenue: a.revenue
    }));

    res.json({ sinceDays, result });
  } catch (e) { next(e); }
});

// Cleaning alerts: rooms stuck in Cleaning longer than X hours
router.get("/rooms/cleaning-alerts", protect, requireRole("admin","staff"), async (req, res, next) => {
  try {
    const hours = Math.max(1, Math.min(72, Number(req.query.hours || 4)));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Find last status change to Cleaning older than cutoff and still in Cleaning
    const cleaningRooms = await Room.find({ status: "Cleaning" });
    const alerts = [];
    for (const room of cleaningRooms) {
      const last = await RoomStatusLog.findOne({ room: room._id, to: "Cleaning" }).sort({ createdAt: -1 });
      if (last && last.createdAt < cutoff) {
        alerts.push({ roomId: room._id, code: room.code, name: room.name, since: last.createdAt });
      }
    }

    res.json({ hours, alerts });
  } catch (e) { next(e); }
});

export default router;
