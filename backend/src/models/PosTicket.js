import mongoose from "mongoose";

const posTicketItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const posTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    status: { type: String, enum: ["held", "converted", "void"], default: "held", index: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    guest: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    items: { type: [posTicketItemSchema], default: [] },
    totals: {
      subTotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },
    note: { type: String, default: "" },
    convertedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    heldAt: { type: Date, default: Date.now },
    resumedAt: { type: Date },
    voidedAt: { type: Date },
  },
  { timestamps: true }
);

export const PosTicket = mongoose.model("PosTicket", posTicketSchema);
