import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional for guest
    guest: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    purpose: { type: String, default: "" },
    status: { type: String, enum: ["confirmed", "cancelled", "completed", "pending_payment", "waitlisted"], default: "confirmed" },
    referenceNo: { type: String, required: true, unique: true },
    payment: {
      status: { type: String, enum: ["unpaid", "paid", "failed", "refunded"], default: "unpaid" },
      provider: { type: String, default: "stripe" },
      amount: { type: Number, default: 0 }
    },
    reminderSentAt: { type: Date },
    audit: [
      {
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: { type: String, required: true },
        note: { type: String, default: "" }
      }
    ]
  },
  { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
