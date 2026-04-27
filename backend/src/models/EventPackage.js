import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["none", "percent", "fixed"], default: "none" },
    value: { type: Number, default: 0 },
  },
  { _id: false }
);

const eventPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    includes: { type: [String], default: [] },

    price: { type: Number, required: true, min: 0 },
    discount: { type: discountSchema, default: () => ({ type: "none", value: 0 }) },

    packCount: { type: Number, default: 0, min: 0 },

    availableFrom: { type: Date },
    availableTo: { type: Date },
    timeStart: { type: String, default: "" },
    timeEnd: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

eventPackageSchema.index({ createdAt: -1 });

export const EventPackage = mongoose.model("EventPackage", eventPackageSchema);
