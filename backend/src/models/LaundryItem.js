import mongoose from "mongoose";

const laundryItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["linens", "towels", "uniforms"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["soiled", "queued", "in-progress", "cleaned", "ready"], default: "soiled" },
    assignedTo: { type: String, default: "" }, // internal team or vendor
    dueAt: { type: Date },
    charges: {
      express: { type: Number, default: 0 },
      replacement: { type: Number, default: 0 },
      damage: { type: Number, default: 0 }
    },
    linkedInvoiceRef: { type: String, default: "" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const LaundryItem = mongoose.model("LaundryItem", laundryItemSchema);
