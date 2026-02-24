import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, default: "", trim: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ["new", "resolved"], default: "new" },
    internalNotes: { type: String, default: "" },
    emailStatus: { type: String, enum: ["pending", "sent", "skipped", "failed"], default: "pending" },
    emailError: { type: String, default: "" }
  },
  { timestamps: true }
);

export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
