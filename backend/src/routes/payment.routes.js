import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Reservation } from "../models/Reservation.js";
import { emitEvent } from "../socket.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

let cachedStripe = null;

function getStripeCurrency() {
  return String(process.env.STRIPE_CURRENCY || "usd").toLowerCase();
}

function requireStripe() {
  const stripeKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!stripeKey) {
    const err = new Error("Stripe not configured. Set STRIPE_SECRET_KEY");
    err.statusCode = 400;
    throw err;
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(stripeKey);
  }
  return cachedStripe;
}

function moneyToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function centsToMoney(cents) {
  return Number(cents || 0) / 100;
}

function pickEmail(entity) {
  return String(entity?.guest?.email || "").trim() || undefined;
}

async function markOrderPaidByStripe({ orderId, session }) {
  const amountTotal = centsToMoney(session?.amount_total);
  const order = await Order.findById(orderId);
  if (!order) return;

  // Basic anti-tamper check (amount should match)
  const expected = Number(order.totals?.grandTotal || 0);
  if (expected > 0 && session?.amount_total != null && Math.abs(expected - amountTotal) > 0.01) {
    order.payment.status = "failed";
    order.payment.provider = "stripe";
    order.payment.amount = expected;
    order.payment.stripeSessionId = session?.id || order.payment.stripeSessionId;
    order.payment.stripePaymentIntentId = session?.payment_intent || order.payment.stripePaymentIntentId;
    order.payment.currency = session?.currency || order.payment.currency;
    await order.save();
    return;
  }

  order.payment.status = "paid";
  order.payment.provider = "stripe";
  order.payment.amount = expected || amountTotal;
  order.payment.stripeSessionId = session?.id || order.payment.stripeSessionId;
  order.payment.stripePaymentIntentId = session?.payment_intent || order.payment.stripePaymentIntentId;
  order.payment.currency = session?.currency || order.payment.currency;
  order.payment.paidAt = new Date();
  if (order.status === "pending_payment") order.status = "confirmed";
  await order.save();
  emitEvent("kitchen", "order:paid", order);
}

async function markReservationPaidByStripe({ reservationId, session }) {
  const amountTotal = centsToMoney(session?.amount_total);
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return;

  const expected = Number(reservation.payment?.amount || 0);
  if (expected > 0 && session?.amount_total != null && Math.abs(expected - amountTotal) > 0.01) {
    reservation.payment.status = "failed";
    reservation.payment.provider = "stripe";
    reservation.payment.amount = expected;
    reservation.payment.stripeSessionId = session?.id || reservation.payment.stripeSessionId;
    reservation.payment.stripePaymentIntentId = session?.payment_intent || reservation.payment.stripePaymentIntentId;
    reservation.payment.currency = session?.currency || reservation.payment.currency;
    await reservation.save();
    return;
  }

  reservation.payment.status = "paid";
  reservation.payment.provider = "stripe";
  reservation.payment.amount = expected || amountTotal;
  reservation.payment.stripeSessionId = session?.id || reservation.payment.stripeSessionId;
  reservation.payment.stripePaymentIntentId = session?.payment_intent || reservation.payment.stripePaymentIntentId;
  reservation.payment.currency = session?.currency || reservation.payment.currency;
  reservation.payment.paidAt = new Date();
  if (reservation.status === "pending_payment") reservation.status = "confirmed";
  await reservation.save();
  emitEvent("reservations", "reservation:paid", reservation);
}

// Create checkout session
router.post("/checkout", async (req, res, next) => {
  try {
    const stripeClient = requireStripe();

    const schema = z.object({
      kind: z.enum(["order", "reservation"]),
      id: z.string()
    });
    const { kind, id } = schema.parse(req.body);

    let amountCents = 0;
    let description = "";
    let customerEmail;

    if (kind === "order") {
      const order = await Order.findById(id);
      if (!order) { res.status(404); throw new Error("Order not found"); }
      if (order.payment?.status === "paid") {
        res.status(400);
        throw new Error("Order is already paid");
      }
      if (order.channel && order.channel !== "online") {
        res.status(400);
        throw new Error("Stripe checkout is only available for online orders");
      }
      amountCents = moneyToCents(order.totals?.grandTotal || 0);
      description = `Payment for order ${order.orderNo}`;

      // Only allow payment when the order expects Stripe payment
      order.payment.provider = "stripe";
      order.payment.amount = Number(order.totals?.grandTotal || 0);
      if (order.status !== "pending_payment") order.status = "pending_payment";
      await order.save();
      customerEmail = pickEmail(order);
    } else {
      const r = await Reservation.findById(id).populate("room");
      if (!r) { res.status(404); throw new Error("Reservation not found"); }
      if (r.payment?.status === "paid") {
        res.status(400);
        throw new Error("Reservation is already paid");
      }
      amountCents = moneyToCents(r.payment?.amount || 0);
      description = `Payment for reservation ${r.referenceNo}`;

      r.payment.provider = "stripe";
      if (r.status !== "pending_payment") r.status = "pending_payment";
      await r.save();
      customerEmail = pickEmail(r);
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      res.status(400);
      throw new Error("Invalid payment amount");
    }

    const appBase = process.env.APP_BASE_URL || "http://localhost:5173";

    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: getStripeCurrency(),
            product_data: { name: description },
            unit_amount: amountCents
          }
        }
      ],
      success_url: `${appBase}/payment/success?kind=${kind}&id=${id}`,
      cancel_url: `${appBase}/payment/cancel?kind=${kind}&id=${id}`,
      metadata: { kind, id },
    });

    // Store session id for admin visibility / reconciliation
    if (kind === "order") {
      await Order.updateOne(
        { _id: id },
        { $set: { "payment.stripeSessionId": session.id, "payment.currency": session.currency } }
      );
    } else {
      await Reservation.updateOne(
        { _id: id },
        { $set: { "payment.stripeSessionId": session.id, "payment.currency": session.currency } }
      );
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    next(e);
  }
});

export async function stripeWebhookHandler(req, res) {
  let stripeClient;
  try {
    stripeClient = requireStripe();
  } catch (e) {
    return res.status(400).send(e.message);
  }

  const sig = req.headers["stripe-signature"];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!whSecret) return res.status(400).send("Stripe webhook secret not configured");

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, whSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const kind = session?.metadata?.kind;
      const id = session?.metadata?.id;
      if (kind === "order" && id) await markOrderPaidByStripe({ orderId: id, session });
      if (kind === "reservation" && id) await markReservationPaidByStripe({ reservationId: id, session });
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const kind = session?.metadata?.kind;
      const id = session?.metadata?.id;
      if (kind === "order" && id) {
        await Order.updateOne(
          { _id: id },
          {
            $set: {
              "payment.status": "failed",
              "payment.provider": "stripe",
              "payment.stripeSessionId": session?.id,
              "payment.stripePaymentIntentId": session?.payment_intent,
              "payment.currency": session?.currency,
            }
          }
        );
      }
      if (kind === "reservation" && id) {
        await Reservation.updateOne(
          { _id: id },
          {
            $set: {
              "payment.status": "failed",
              "payment.provider": "stripe",
              "payment.stripeSessionId": session?.id,
              "payment.stripePaymentIntentId": session?.payment_intent,
              "payment.currency": session?.currency,
            }
          }
        );
      }
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).send(`Webhook handler failed: ${err.message}`);
  }
}

router.get("/status", async (req, res, next) => {
  try {
    const schema = z.object({
      kind: z.enum(["order", "reservation"]),
      id: z.string(),
    });
    const { kind, id } = schema.parse(req.query);

    if (kind === "order") {
      const order = await Order.findById(id).select("_id orderNo status totals payment createdAt").lean();
      if (!order) {
        res.status(404);
        throw new Error("Order not found");
      }
      return res.json({ kind, entity: order });
    }

    const reservation = await Reservation.findById(id).select("_id referenceNo status room payment createdAt").populate("room", "name").lean();
    if (!reservation) {
      res.status(404);
      throw new Error("Reservation not found");
    }
    return res.json({ kind, entity: reservation });
  } catch (e) {
    next(e);
  }
});

router.get("/admin", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      kind: z.enum(["all", "order", "reservation"]).optional().default("all"),
      status: z.enum(["all", "paid", "unpaid", "failed", "refunded"]).optional().default("all"),
      limit: z.coerce.number().int().min(1).max(500).optional().default(200),
    });
    const { kind, status, limit } = schema.parse(req.query);

    const payments = [];

    if (kind === "all" || kind === "order") {
      const q = {};
      if (status !== "all") q["payment.status"] = status;
      const orders = await Order.find(q)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("_id orderNo channel status totals payment guest customer createdAt")
        .populate("customer", "name email")
        .lean();

      for (const o of orders) {
        payments.push({
          kind: "order",
          id: o._id,
          reference: o.orderNo,
          channel: o.channel,
          entityStatus: o.status,
          amount: o.payment?.amount || o.totals?.grandTotal || 0,
          currency: o.payment?.currency || getStripeCurrency(),
          paymentStatus: o.payment?.status || "unpaid",
          provider: o.payment?.provider || "-",
          stripeSessionId: o.payment?.stripeSessionId || "",
          stripePaymentIntentId: o.payment?.stripePaymentIntentId || "",
          paidAt: o.payment?.paidAt || null,
          createdAt: o.createdAt,
          customerName: o.customer?.name || o.guest?.name || "",
          customerEmail: o.customer?.email || o.guest?.email || "",
        });
      }
    }

    if (kind === "all" || kind === "reservation") {
      const q = {};
      if (status !== "all") q["payment.status"] = status;
      const reservations = await Reservation.find(q)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("_id referenceNo status payment guest customer room createdAt")
        .populate("customer", "name email")
        .populate("room", "name")
        .lean();

      for (const r of reservations) {
        payments.push({
          kind: "reservation",
          id: r._id,
          reference: r.referenceNo,
          channel: "rooms",
          entityStatus: r.status,
          amount: r.payment?.amount || 0,
          currency: r.payment?.currency || getStripeCurrency(),
          paymentStatus: r.payment?.status || "unpaid",
          provider: r.payment?.provider || "-",
          stripeSessionId: r.payment?.stripeSessionId || "",
          stripePaymentIntentId: r.payment?.stripePaymentIntentId || "",
          paidAt: r.payment?.paidAt || null,
          createdAt: r.createdAt,
          customerName: r.customer?.name || r.guest?.name || "",
          customerEmail: r.customer?.email || r.guest?.email || "",
          roomName: r.room?.name || "",
        });
      }
    }

    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ payments: payments.slice(0, limit) });
  } catch (e) {
    next(e);
  }
});

export default router;
