import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["kitchen"], default: "kitchen" },
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    delta: { type: Number, required: true }, // + or -
    reason: { type: String, required: true }, // order, spoilage, delivery...
    byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refType: { type: String, default: "" },
    refId: { type: mongoose.Schema.Types.ObjectId }
  },
  { timestamps: true }
);

export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);
