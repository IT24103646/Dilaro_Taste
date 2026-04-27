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
      preferredWindow: { type: String, default: "" },
      location: {
        lat: { type: Number },
        lng: { type: Number },
        label: { type: String, default: "" }
      }
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
    orderNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    idempotencyKey: { type: String, index: true },
    payment: {
      status: { type: String, enum: ["unpaid", "paid", "failed", "refunded"], default: "unpaid" },
      provider: { type: String, enum: ["stripe", "cash", "card", "split"], default: "stripe" },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "usd" },
      stripeSessionId: { type: String, default: "" },
      stripePaymentIntentId: { type: String, default: "" },
      paidAt: { type: Date },
      cashReceived: { type: Number, default: 0 },
      changeDue: { type: Number, default: 0 },
      receivedTotal: { type: Number, default: 0 },
      splits: {
        type: [{
          method: { type: String, enum: ["cash", "card", "stripe"], required: true },
          amount: { type: Number, required: true, min: 0 },
        }],
        default: [],
      },
    },
    channel: { type: String, enum: ["online", "pos"], default: "online", index: true },
    pos: {
      heldTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "PosTicket" },
      cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      closedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
