import mongoose from "mongoose";

const roomStatusLogSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: { type: String, default: "" },
    byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const RoomStatusLog = mongoose.model("RoomStatusLog", roomStatusLogSchema);
