import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, default: "pcs" }, // kg, ml, pcs
    stock: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const Ingredient = mongoose.model("Ingredient", ingredientSchema);
