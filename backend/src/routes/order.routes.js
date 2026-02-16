import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { MenuItem } from "../models/MenuItem.js";
import { Ingredient } from "../models/Ingredient.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { protect, requireRole } from "../middleware/auth.js";
import { getIdempotencyKey } from "../utils/idempotency.js";
import { emitEvent } from "../socket.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

function makeOrderNo() {
  return "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);
}

function computeTotals(items) {
  const sub = items.reduce((s, it) => s + it.priceSnapshot * it.quantity, 0);
  const tax = 0; // add tax rules if needed
  return { subTotal: sub, tax, grandTotal: sub + tax };
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

// Public: create order (guest allowed)
router.post("/", async (req, res, next) => {
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
        preferredWindow: z.string().optional().default("")
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

    // Prevent duplicate submission
    const idempotencyKey = getIdempotencyKey(req);
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) return res.json({ order: existing, duplicate: true });

    // Build item snapshots
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

    // Enforce pickup capacity (simple per-slot max)
    const pickupSlotAt = data.type === "pickup" && data.pickup?.slotAt ? new Date(data.pickup.slotAt) : undefined;
    if (pickupSlotAt) await enforcePickupSlotCapacity(pickupSlotAt);

    // Transaction: if payment not required immediately, confirm and decrement inventory when move to preparing (as per proposal)
    // We'll create as confirmed/pending_payment depending on paymentRequired.
    const status = data.paymentRequired ? "pending_payment" : "confirmed";

    session.startTransaction();

    const order = await Order.create([{
      customer: req.user?._id, // if protect used; here guest allowed so might be undefined
      guest: data.guest || {},
      type: data.type,
      delivery: data.type === "delivery" ? (data.delivery || {}) : {},
      pickup: data.type === "pickup" ? ({ slotAt: pickupSlotAt }) : {},
      items: orderItems,
      totals,
      status,
      orderNo,
      idempotencyKey,
      payment: { status: "unpaid", amount: totals.grandTotal, provider: "stripe" }
    }], { session });

    await session.commitTransaction();

    // notify room
    emitEvent("kitchen", "order:new", order[0]);

    // email confirmation (best-effort)
    const to = data.guest?.email;
    if (to) {
      sendEmail({
        to,
        subject: `Order Confirmation ${orderNo}`,
        html: `<p>Your order <b>${orderNo}</b> is received. Status: ${status}. Estimated time will update as staff progresses.</p>`
      }).catch(()=>{});
    }

    res.status(201).json({ order: order[0] });
  } catch (e) {
    try { await session.abortTransaction(); } catch {}
    next(e);
  } finally {
    session.endSession();
  }
});

// Customer history (auth)
router.get("/my", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

// Staff queue (auth)
router.get("/queue", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $in: ["confirmed", "preparing", "ready", "dispatched", "pending_payment"] } }).sort({ createdAt: 1 }).limit(200);
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

// Update status (staff/admin)
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

    // On transition to preparing: decrement kitchen inventory based on recipe usage (proposal)
    if (order.status !== "preparing" && status === "preparing") {
      // Build ingredient consumption
      const menuItems = await MenuItem.find({ _id: { $in: order.items.map(i => i.menuItem) } }).populate("recipe.ingredient").session(session);
      const mMap = new Map(menuItems.map(m => [String(m._id), m]));

      const consumption = new Map(); // ingredientId -> qty
      for (const it of order.items) {
        const m = mMap.get(String(it.menuItem));
        if (!m) continue;
        for (const r of m.recipe) {
          const ingId = String(r.ingredient._id);
          const qty = r.quantity * it.quantity;
          consumption.set(ingId, (consumption.get(ingId) || 0) + qty);
        }
      }

      // Validate stock
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

      // Decrement + log
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

    // guest email notification (best-effort)
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

// Cancel/modify with authorization (staff/admin)
router.put("/:id", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    // Limit modifications if already completed
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

// Reorder (customer)
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
      payment: { status: "unpaid", amount: old.totals.grandTotal, provider: "stripe" }
    });
    emitEvent("kitchen", "order:new", order);
    res.status(201).json({ order });
  } catch (e) {
    next(e);
  }
});

export default router;
