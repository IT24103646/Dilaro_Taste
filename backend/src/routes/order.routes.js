import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { PosTicket } from "../models/PosTicket.js";
import { MenuItem } from "../models/MenuItem.js";
import { Ingredient } from "../models/Ingredient.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { optionalProtect, protect, requireRole } from "../middleware/auth.js";
import { getIdempotencyKey } from "../utils/idempotency.js";
import { emitEvent } from "../socket.js";
import { sendEmail } from "../utils/email.js";
import {
  getDeliverySimulation,
  pauseDeliverySimulation,
  resetDeliverySimulation,
  resumeDeliverySimulation,
  setDeliverySimulationSpeed,
  startDeliverySimulation,
  stopDeliverySimulation,
} from "../utils/deliverySimulation.js";

const router = express.Router();

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeOrderNo() {
  return "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);
}

function makeTicketNo() {
  return "TKT-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + Date.now().toString().slice(-4);
}

function computeTotals(items) {
  const sub = items.reduce((s, it) => s + it.priceSnapshot * it.quantity, 0);
  const tax = 0;
  return { subTotal: sub, tax, grandTotal: sub + tax };
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getDayRange(dayRaw) {
  const base = dayRaw ? new Date(dayRaw) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getCashPortion(order) {
  if (!order?.payment) return 0;
  if (order.payment.provider === "split") {
    return roundMoney((order.payment.splits || [])
      .filter((s) => s.method === "cash")
      .reduce((sum, s) => sum + Number(s.amount || 0), 0));
  }
  if (order.payment.provider === "cash" && order.payment.status === "paid") {
    return roundMoney(order.payment.amount || 0);
  }
  return 0;
}

async function buildOrderItemsFromPosItems(items) {
  const menuIds = items.map((i) => i.menuItemId);
  const menu = await MenuItem.find({ _id: { $in: menuIds }, isActive: true });
  const menuMap = new Map(menu.map((m) => [String(m._id), m]));

  return items.map((i) => {
    const m = menuMap.get(i.menuItemId);
    if (!m) {
      const err = new Error("Menu item not found/active: " + i.menuItemId);
      err.statusCode = 400;
      throw err;
    }
    return {
      menuItem: m._id,
      nameSnapshot: m.name,
      priceSnapshot: m.price,
      quantity: i.quantity,
    };
  });
}

function buildPaymentDetails(rawPayment, grandTotal) {
  const payment = rawPayment || {};
  const status = payment.status || "unpaid";
  const provider = payment.provider || "cash";
  const normalizedGrand = roundMoney(grandTotal);
  const rawSplits = Array.isArray(payment.splits) ? payment.splits : [];

  if (provider === "split") {
    if (!rawSplits.length) {
      const err = new Error("Split payment requires at least one split line");
      err.statusCode = 400;
      throw err;
    }

    const splits = rawSplits.map((s) => ({
      method: s.method,
      amount: roundMoney(s.amount),
    })).filter((s) => ["cash", "card", "stripe"].includes(s.method) && s.amount > 0);

    const splitTotal = roundMoney(splits.reduce((sum, s) => sum + s.amount, 0));
    if (Math.abs(splitTotal - normalizedGrand) > 0.01) {
      const err = new Error(`Split payment total (${splitTotal.toFixed(2)}) must match grand total (${normalizedGrand.toFixed(2)})`);
      err.statusCode = 400;
      throw err;
    }

    const cashSplit = roundMoney(splits.filter((s) => s.method === "cash").reduce((sum, s) => sum + s.amount, 0));
    const cashReceived = roundMoney(payment.cashReceived || 0);
    if (cashSplit > 0 && cashReceived < cashSplit) {
      const err = new Error(`Cash received (${cashReceived.toFixed(2)}) cannot be less than cash split (${cashSplit.toFixed(2)})`);
      err.statusCode = 400;
      throw err;
    }

    return {
      status: "paid",
      provider: "split",
      amount: normalizedGrand,
      splits,
      cashReceived,
      changeDue: roundMoney(Math.max(0, cashReceived - cashSplit)),
      receivedTotal: splitTotal,
    };
  }

  const cashReceived = roundMoney(payment.cashReceived || 0);
  if (provider === "cash" && status === "paid" && cashReceived > 0 && cashReceived < normalizedGrand) {
    const err = new Error(`Cash received (${cashReceived.toFixed(2)}) cannot be less than total (${normalizedGrand.toFixed(2)})`);
    err.statusCode = 400;
    throw err;
  }

  return {
    status,
    provider,
    amount: normalizedGrand,
    splits: [],
    cashReceived,
    changeDue: provider === "cash" ? roundMoney(Math.max(0, cashReceived - normalizedGrand)) : 0,
    receivedTotal: status === "paid" ? normalizedGrand : cashReceived,
  };
}

async function reverseGeocode(lat, lng) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "restaurant-mern-demo/1.0 (local-dev)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.display_name || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function forwardGeocode(address) {
  const q = String(address || "").trim();
  if (!q) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "restaurant-mern-demo/1.0 (local-dev)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;
    const list = await response.json();
    if (!Array.isArray(list) || list.length === 0) return null;

    const first = list[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      address: first.display_name || q,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function enforcePickupSlotCapacity(slotAt) {
  const max = Number(process.env.PICKUP_SLOT_MAX_ORDERS || 0);
  if (!max || !slotAt) return;
  const count = await Order.countDocuments({
    type: "pickup",
    "pickup.slotAt": slotAt,
    status: { $in: ["pending_payment", "confirmed", "preparing", "ready", "dispatched"] }
  });
  if (count >= max) {
    const err = new Error("Pickup slot is full. Please choose another time.");
    err.statusCode = 400;
    throw err;
  }
}

router.get("/geocode/reverse", async (req, res, next) => {
  try {
    const schema = z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    });

    const { lat, lng } = schema.parse(req.query || {});
    const address = await reverseGeocode(lat, lng);

    res.json({
      lat,
      lng,
      address: address || `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/geocode/forward", async (req, res, next) => {
  try {
    const schema = z.object({
      address: z.string().trim().min(3),
    });

    const { address } = schema.parse(req.query || {});
    const result = await forwardGeocode(address);
    if (!result) {
      res.status(404);
      throw new Error("Could not locate that address");
    }

    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/track/:orderNo", async (req, res, next) => {
  try {
    const refRaw = String(req.params.orderNo || "").trim();
    const ref = refRaw.toUpperCase();
    const order = await Order.findOne({ orderNo: { $regex: new RegExp(`^${escapeRegExp(ref)}$`, "i") } })
      .select("-idempotencyKey")
      .lean();
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

router.get("/track/:orderNo/location", async (req, res, next) => {
  try {
    const refRaw = String(req.params.orderNo || "").trim();
    const ref = refRaw.toUpperCase();
    const order = await Order.findOne({ orderNo: { $regex: new RegExp(`^${escapeRegExp(ref)}$`, "i") } })
      .select("_id orderNo status type delivery.location")
      .lean();

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    let live = getDeliverySimulation(order._id);
    if (!live && order.type === "delivery" && order.status === "dispatched") {
      live = await startDeliverySimulation({
        orderId: order._id,
        orderNo: order.orderNo,
        destination: order.delivery?.location,
      });
    }
    res.json({ orderId: order._id, orderNo: order.orderNo, type: order.type, status: order.status, liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.post("/pos", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1),
      })).min(1),
      heldTicketId: z.string().optional(),
      guest: z.object({
        name: z.string().optional().default(""),
        email: z.string().optional().default(""),
        phone: z.string().optional().default(""),
      }).optional().default({}),
      payment: z.object({
        status: z.enum(["paid", "unpaid"]).optional().default("unpaid"),
        provider: z.enum(["cash", "card", "stripe", "split"]).optional().default("cash"),
        cashReceived: z.number().min(0).optional().default(0),
        splits: z.array(z.object({
          method: z.enum(["cash", "card", "stripe"]),
          amount: z.number().min(0),
        })).optional().default([]),
      }).optional().default({ status: "unpaid", provider: "cash" }),
    });

    const data = schema.parse(req.body || {});
    const orderItems = await buildOrderItemsFromPosItems(data.items);

    const totals = computeTotals(orderItems);
    const orderNo = makeOrderNo();
    const paymentDetails = buildPaymentDetails(data.payment, totals.grandTotal);

    let heldTicket = null;
    if (data.heldTicketId) {
      heldTicket = await PosTicket.findOne({
        _id: data.heldTicketId,
        status: "held",
      });
    }

    const order = await Order.create({
      customer: req.user?._id,
      guest: data.guest,
      type: "pickup",
      pickup: { slotAt: new Date() },
      items: orderItems,
      totals,
      status: "confirmed",
      orderNo,
      channel: "pos",
      pos: {
        heldTicketId: heldTicket?._id,
        cashier: req.user?._id,
        closedAt: new Date(),
      },
      payment: paymentDetails,
    });

    if (heldTicket) {
      heldTicket.status = "converted";
      heldTicket.convertedOrder = order._id;
      heldTicket.resumedAt = new Date();
      await heldTicket.save();
    }

    emitEvent("kitchen", "order:new", order);
    emitEvent("kitchen", "order:status", order);

    res.status(201).json({ order });
  } catch (e) {
    next(e);
  }
});

router.get("/pos/held", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const tickets = await PosTicket.find({ status: "held" })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate("cashier", "name email");
    res.json({ tickets });
  } catch (e) {
    next(e);
  }
});

router.get("/pos/hold/:id", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const ticket = await PosTicket.findOne({ _id: req.params.id, status: "held" })
      .populate("cashier", "name email");
    if (!ticket) {
      res.status(404);
      throw new Error("Held ticket not found");
    }
    ticket.resumedAt = new Date();
    await ticket.save();
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.post("/pos/hold", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      ticketId: z.string().optional(),
      guest: z.object({
        name: z.string().optional().default(""),
        email: z.string().optional().default(""),
        phone: z.string().optional().default(""),
      }).optional().default({}),
      note: z.string().optional().default(""),
      items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1),
      })).min(1),
    });

    const data = schema.parse(req.body || {});
    const orderItems = await buildOrderItemsFromPosItems(data.items);
    const totals = computeTotals(orderItems);

    let ticket = null;
    if (data.ticketId) {
      ticket = await PosTicket.findOne({ _id: data.ticketId, status: "held" });
    }

    if (!ticket) {
      ticket = new PosTicket({
        ticketNo: makeTicketNo(),
        status: "held",
        cashier: req.user._id,
      });
    }

    ticket.guest = data.guest;
    ticket.items = orderItems;
    ticket.totals = totals;
    ticket.note = data.note;
    ticket.heldAt = new Date();
    await ticket.save();

    const hydrated = await PosTicket.findById(ticket._id).populate("cashier", "name email");
    res.status(201).json({ ticket: hydrated });
  } catch (e) {
    next(e);
  }
});

router.post("/pos/hold/:id/void", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const ticket = await PosTicket.findOne({ _id: req.params.id, status: "held" });
    if (!ticket) {
      res.status(404);
      throw new Error("Held ticket not found");
    }

    ticket.status = "void";
    ticket.voidedAt = new Date();
    await ticket.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/pos/closing-summary", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const range = getDayRange(req.query.date);
    if (!range) {
      res.status(400);
      throw new Error("Invalid date");
    }

    const orders = await Order.find({
      channel: "pos",
      createdAt: { $gte: range.start, $lte: range.end },
    })
      .sort({ createdAt: -1 })
      .populate("pos.cashier", "name email");

    const summary = {
      date: range.start,
      orderCount: orders.length,
      paidCount: orders.filter((o) => o.payment?.status === "paid").length,
      unpaidCount: orders.filter((o) => o.payment?.status !== "paid").length,
      grossSales: roundMoney(orders.reduce((sum, o) => sum + Number(o.totals?.grandTotal || 0), 0)),
      paidSales: roundMoney(orders.filter((o) => o.payment?.status === "paid").reduce((sum, o) => sum + Number(o.totals?.grandTotal || 0), 0)),
      cashExpected: roundMoney(orders.reduce((sum, o) => sum + getCashPortion(o), 0)),
      byMethod: {
        cash: 0,
        card: 0,
        stripe: 0,
      },
      byCashier: [],
    };

    const cashierMap = new Map();

    for (const o of orders) {
      if (o.payment?.provider === "split") {
        for (const s of (o.payment?.splits || [])) {
          summary.byMethod[s.method] = roundMoney((summary.byMethod[s.method] || 0) + Number(s.amount || 0));
        }
      } else if (["cash", "card", "stripe"].includes(o.payment?.provider || "")) {
        summary.byMethod[o.payment.provider] = roundMoney((summary.byMethod[o.payment.provider] || 0) + Number(o.payment.amount || 0));
      }

      const cashierId = String(o.pos?.cashier?._id || o.customer || "unknown");
      const cashierName = o.pos?.cashier?.name || o.pos?.cashier?.email || "Unknown";
      if (!cashierMap.has(cashierId)) {
        cashierMap.set(cashierId, {
          cashierId,
          cashierName,
          orders: 0,
          paidSales: 0,
          cashExpected: 0,
        });
      }
      const row = cashierMap.get(cashierId);
      row.orders += 1;
      if (o.payment?.status === "paid") row.paidSales = roundMoney(row.paidSales + Number(o.totals?.grandTotal || 0));
      row.cashExpected = roundMoney(row.cashExpected + getCashPortion(o));
    }

    summary.byCashier = Array.from(cashierMap.values()).sort((a, b) => b.paidSales - a.paidSales);

    res.json({ summary, orders });
  } catch (e) {
    next(e);
  }
});

router.get("/pos/cashier-audit", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      res.status(400);
      throw new Error("Invalid from/to range");
    }

    const orders = await Order.find({
      channel: "pos",
      createdAt: { $gte: from, $lte: to },
    })
      .sort({ createdAt: -1 })
      .populate("pos.cashier", "name email");

    const byCashierMap = new Map();
    for (const o of orders) {
      const cashierId = String(o.pos?.cashier?._id || o.customer || "unknown");
      const cashierName = o.pos?.cashier?.name || o.pos?.cashier?.email || "Unknown";
      if (!byCashierMap.has(cashierId)) {
        byCashierMap.set(cashierId, {
          cashierId,
          cashierName,
          orders: 0,
          paidSales: 0,
          unpaidSales: 0,
          cashExpected: 0,
          cardSales: 0,
          stripeSales: 0,
        });
      }
      const row = byCashierMap.get(cashierId);
      row.orders += 1;
      const total = Number(o.totals?.grandTotal || 0);
      if (o.payment?.status === "paid") row.paidSales = roundMoney(row.paidSales + total);
      else row.unpaidSales = roundMoney(row.unpaidSales + total);
      row.cashExpected = roundMoney(row.cashExpected + getCashPortion(o));

      if (o.payment?.provider === "split") {
        for (const s of (o.payment.splits || [])) {
          if (s.method === "card") row.cardSales = roundMoney(row.cardSales + Number(s.amount || 0));
          if (s.method === "stripe") row.stripeSales = roundMoney(row.stripeSales + Number(s.amount || 0));
        }
      } else {
        if (o.payment?.provider === "card") row.cardSales = roundMoney(row.cardSales + Number(o.payment.amount || 0));
        if (o.payment?.provider === "stripe") row.stripeSales = roundMoney(row.stripeSales + Number(o.payment.amount || 0));
      }
    }

    const byCashier = Array.from(byCashierMap.values()).sort((a, b) => b.paidSales - a.paidSales);
    res.json({ from, to, byCashier, orders });
  } catch (e) {
    next(e);
  }
});

router.post("/", optionalProtect, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const schema = z.object({
      type: z.enum(["delivery", "pickup"]),
      items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1)
      })).min(1),
      delivery: z.object({
        address: z.string().optional().default(""),
        contactDetails: z.string().optional().default(""),
        preferredWindow: z.string().optional().default(""),
        location: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          label: z.string().optional().default(""),
        }).optional()
      }).optional(),
      pickup: z.object({
        slotAt: z.string().datetime().optional()
      }).optional(),
      guest: z.object({
        name: z.string().optional().default(""),
        email: z.string().optional().default(""),
        phone: z.string().optional().default("")
      }).optional(),
      paymentRequired: z.boolean().optional().default(false)
    });

    const data = schema.parse(req.body);

    const idempotencyKey = getIdempotencyKey(req);
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) return res.json({ order: existing, duplicate: true });

    const menuIds = data.items.map(i => i.menuItemId);
    const menu = await MenuItem.find({ _id: { $in: menuIds }, isActive: true }).populate("recipe.ingredient");
    const menuMap = new Map(menu.map(m => [String(m._id), m]));

    const orderItems = data.items.map(i => {
      const m = menuMap.get(i.menuItemId);
      if (!m) throw new Error("Menu item not found/active: " + i.menuItemId);
      return {
        menuItem: m._id,
        nameSnapshot: m.name,
        priceSnapshot: m.price,
        quantity: i.quantity
      };
    });

    const totals = computeTotals(orderItems);
    const orderNo = makeOrderNo();

    const pickupSlotAt = data.type === "pickup" && data.pickup?.slotAt ? new Date(data.pickup.slotAt) : undefined;
    if (pickupSlotAt) await enforcePickupSlotCapacity(pickupSlotAt);

    const status = data.paymentRequired ? "pending_payment" : "confirmed";
    const paymentProvider = data.paymentRequired ? "stripe" : "cash";

    session.startTransaction();

    const order = await Order.create([{
      customer: req.user?._id,
      guest: data.guest || {},
      type: data.type,
      delivery: data.type === "delivery" ? (data.delivery || {}) : {},
      pickup: data.type === "pickup" ? ({ slotAt: pickupSlotAt }) : {},
      items: orderItems,
      totals,
      status,
      channel: "online",
      orderNo,
      idempotencyKey,
      payment: { status: "unpaid", amount: totals.grandTotal, provider: paymentProvider }
    }], { session });

    await session.commitTransaction();

    const itemIds = data.items.map(i => i.menuItemId);
    MenuItem.updateMany({ _id: { $in: itemIds } }, { $inc: { orderCount: 1 } }).catch(() => {});

    emitEvent("kitchen", "order:new", order[0]);

    const to = data.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Order Confirmation ${orderNo}`,
        html: `<p>Your order <b>${orderNo}</b> is received. Status: ${status}. Estimated time will update as staff progresses.</p>`
      }).catch(() => {});
    }

    res.status(201).json({ order: order[0] });
  } catch (e) {
    try { await session.abortTransaction(); } catch {}
    next(e);
  } finally {
    session.endSession();
  }
});

router.get("/my", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

router.get("/:id/live-location", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select("_id customer type status orderNo");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    const isOwner = order.customer && String(order.customer) === String(req.user._id);
    const isStaff = ["staff", "admin"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      res.status(403);
      throw new Error("Forbidden");
    }

    const live = getDeliverySimulation(order._id);
    res.json({ orderId: order._id, orderNo: order.orderNo, type: order.type, status: order.status, liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/live-tracking/start", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({ speedProfile: z.enum(["slow", "normal", "fast"]).optional().default("normal") });
    const { speedProfile } = schema.parse(req.body || {});

    const order = await Order.findById(req.params.id).select("_id orderNo type delivery.location");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    if (order.type !== "delivery") {
      res.status(400);
      throw new Error("Live tracking is only available for delivery orders");
    }

    const live = await startDeliverySimulation({
      orderId: order._id,
      orderNo: order.orderNo,
      destination: order.delivery?.location,
    });
    const updated = setDeliverySimulationSpeed(order._id, speedProfile) || live;
    res.json({ liveLocation: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/live-tracking/pause", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const live = pauseDeliverySimulation(req.params.id);
    if (!live) {
      res.status(404);
      throw new Error("Live tracking is not running for this order");
    }
    res.json({ liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/live-tracking/resume", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const live = resumeDeliverySimulation(req.params.id);
    if (!live) {
      res.status(404);
      throw new Error("Live tracking is not running for this order");
    }
    res.json({ liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/live-tracking/reset", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const live = resetDeliverySimulation(req.params.id);
    if (!live) {
      res.status(404);
      throw new Error("Live tracking is not running for this order");
    }
    res.json({ liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/live-tracking/speed", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({ speedProfile: z.enum(["slow", "normal", "fast"]) });
    const { speedProfile } = schema.parse(req.body || {});
    const live = setDeliverySimulationSpeed(req.params.id, speedProfile);
    if (!live) {
      res.status(404);
      throw new Error("Live tracking is not running for this order");
    }
    res.json({ liveLocation: live });
  } catch (e) {
    next(e);
  }
});

router.get("/queue", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $in: ["confirmed", "preparing", "ready", "dispatched", "pending_payment"] } }).sort({ createdAt: 1 }).limit(200);
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/status", protect, requireRole("staff", "admin"), async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const schema = z.object({
      status: z.enum(["confirmed", "preparing", "ready", "dispatched", "completed", "cancelled", "pending_payment"]),
      note: z.string().optional().default("")
    });
    const { status } = schema.parse(req.body);

    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session).populate("items.menuItem");
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.status !== "preparing" && status === "preparing") {
      const menuItems = await MenuItem.find({ _id: { $in: order.items.map(i => i.menuItem) } }).populate("recipe.ingredient").session(session);
      const mMap = new Map(menuItems.map(m => [String(m._id), m]));

      const consumption = new Map();
      for (const it of order.items) {
        const m = mMap.get(String(it.menuItem));
        if (!m) continue;
        for (const r of m.recipe) {
          const ingId = String(r.ingredient._id);
          const qty = r.quantity * it.quantity;
          consumption.set(ingId, (consumption.get(ingId) || 0) + qty);
        }
      }

      const ingIds = Array.from(consumption.keys());
      const ingredients = await Ingredient.find({ _id: { $in: ingIds } }).session(session);
      const ingMap = new Map(ingredients.map(i => [String(i._id), i]));

      for (const [id, qty] of consumption.entries()) {
        const ing = ingMap.get(id);
        if (!ing) continue;
        if (ing.stock < qty) {
          res.status(400);
          throw new Error(`Insufficient stock for ${ing.name}. Needed ${qty}${ing.unit}, available ${ing.stock}${ing.unit}`);
        }
      }

      for (const [id, qty] of consumption.entries()) {
        const ing = ingMap.get(id);
        if (!ing) continue;
        ing.stock -= qty;
        await ing.save({ session });
        await InventoryLog.create([{
          ingredient: ing._id,
          delta: -qty,
          reason: "order_preparing",
          byUser: req.user._id,
          refType: "order",
          refId: order._id
        }], { session });
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();

    emitEvent("kitchen", "order:status", order);
    emitEvent("customer", "order:status", { orderId: order._id, status: order.status });

    if (order.type === "delivery" && order.status === "dispatched") {
      await startDeliverySimulation({
        orderId: order._id,
        orderNo: order.orderNo,
        destination: order.delivery?.location,
      });
    }
    if (["completed", "cancelled"].includes(order.status)) {
      stopDeliverySimulation(order._id);
    }

    const to = order.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Order Update ${order.orderNo}`,
        html: `<p>Your order <b>${order.orderNo}</b> status is now: <b>${order.status}</b>.</p>`
      }).catch(() => {});
    }

    res.json({ order });
  } catch (e) {
    try { await session.abortTransaction(); } catch {}
    next(e);
  } finally {
    session.endSession();
  }
});

router.put("/:id", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    if (["completed"].includes(order.status)) {
      res.status(400);
      throw new Error("Cannot modify completed orders");
    }
    Object.assign(order, req.body);
    await order.save();
    emitEvent("kitchen", "order:updated", order);
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/reorder", protect, async (req, res, next) => {
  try {
    const old = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!old) {
      res.status(404);
      throw new Error("Order not found");
    }
    const orderNo = makeOrderNo();
    const order = await Order.create({
      customer: req.user._id,
      type: old.type,
      delivery: old.delivery,
      pickup: old.pickup,
      items: old.items,
      totals: old.totals,
      status: "confirmed",
      orderNo,
      payment: { status: "unpaid", amount: old.totals.grandTotal, provider: "cash" }
    });
    emitEvent("kitchen", "order:new", order);
    res.status(201).json({ order });
  } catch (e) {
    next(e);
  }
});

export default router;
