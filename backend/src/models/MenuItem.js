import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    // e.g. breakfast only
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sun
    startTime: { type: String, default: "" }, // "07:00"
    endTime: { type: String, default: "" }    // "11:00"
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    photos: [{ type: String }],          // additional gallery images
    orderCount: { type: Number, default: 0 }, // auto-incremented on each order
    isActive: { type: Boolean, default: true },
    dietaryTags: [{ type: String }],  // vegan, halal, etc.
    allergens: [{ type: String }],    // peanuts, dairy...
    availability: { type: availabilitySchema, default: () => ({}) },
    // recipe: ingredientId -> qty
    recipe: [
      {
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
        quantity: { type: Number, required: true, min: 0 }
      }
    ]
  },
  { timestamps: true }
);

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
