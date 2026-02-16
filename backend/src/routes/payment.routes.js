import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Reservation } from "../models/Reservation.js";
import { emitEvent } from "../socket.js";

const router = express.Router();

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Create checkout session
router.post("/checkout", async (req, res, next) => {
  try {
    if (!stripe) {
      res.status(400);
      throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY");
    }

    const schema = z.object({
      kind: z.enum(["order", "reservation"]),
      id: z.string()
    });
    const { kind, id } = schema.parse(req.body);

    let amount = 0;
    let description = "";
    if (kind === "order") {
      const order = await Order.findById(id);
      if (!order) { res.status(404); throw new Error("Order not found"); }
      amount = Math.round(order.totals.grandTotal * 100);
      description = `Payment for order ${order.orderNo}`;
    } else {
      const r = await Reservation.findById(id).populate("room");
      if (!r) { res.status(404); throw new Error("Reservation not found"); }
      amount = Math.round((r.payment?.amount || 0) * 100);
      description = `Payment for reservation ${r.referenceNo}`;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: amount
          }
        }
      ],
      success_url: `${process.env.APP_BASE_URL || "http://localhost:5173"}/payment/success?kind=${kind}&id=${id}`,
      cancel_url: `${process.env.APP_BASE_URL || "http://localhost:5173"}/payment/cancel?kind=${kind}&id=${id}`,
      metadata: { kind, id }
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

// Stripe webhook (raw body required for signature; simplified here)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(400).send("Stripe not configured");
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const kind = s.metadata?.kind;
      const id = s.metadata?.id;

      if (kind === "order") {
        const order = await Order.findById(id);
        if (order) {
          order.payment.status = "paid";
          order.status = order.status === "pending_payment" ? "confirmed" : order.status;
          await order.save();
          emitEvent("kitchen", "order:paid", order);
        }
      } else if (kind === "reservation") {
        const r = await Reservation.findById(id);
        if (r) {
          r.payment.status = "paid";
          r.status = r.status === "pending_payment" ? "confirmed" : r.status;
          await r.save();
          emitEvent("reservations", "reservation:paid", r);
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
