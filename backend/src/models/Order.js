import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional for guest
    guest: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    type: { type: String, enum: ["delivery", "pickup"], required: true },
    delivery: {
      address: { type: String, default: "" },
      contactDetails: { type: String, default: "" },
      preferredWindow: { type: String, default: "" }
    },
    pickup: {
      slotAt: { type: Date }
    },
    items: { type: [orderItemSchema], default: [] },
    totals: {
      subTotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ["confirmed", "preparing", "ready", "dispatched", "completed", "cancelled", "pending_payment"],
      default: "confirmed"
    },
    orderNo: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, index: true },
    payment: {
      status: { type: String, enum: ["unpaid", "paid", "failed", "refunded"], default: "unpaid" },
      provider: { type: String, default: "stripe" },
      amount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
