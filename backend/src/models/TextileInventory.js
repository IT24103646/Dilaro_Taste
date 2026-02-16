import mongoose from "mongoose";

const textileInventorySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["linens", "towels", "uniforms"], unique: true, required: true },
    clean: { type: Number, default: 0, min: 0 },
    soiled: { type: Number, default: 0, min: 0 },
    inUse: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const TextileInventory = mongoose.model("TextileInventory", textileInventorySchema);
