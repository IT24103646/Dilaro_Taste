import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    photos: [{ type: String }],
    capacity: { type: Number, default: 1, min: 1 },
    amenities: [{ type: String }],
    basePricePerHour: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Cleaning", "Maintenance", "Out-of-Service"],
      default: "Available"
    }
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);
