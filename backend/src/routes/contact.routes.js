import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { sendEmail } from "../utils/email.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/", contactLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(200),
      subject: z.string().max(200).optional().default(""),
      message: z.string().min(1).max(5000)
    });

    const { name, email, subject, message } = schema.parse(req.body || {});

    const doc = await ContactMessage.create({ name, email, subject, message, status: "new", emailStatus: "pending" });

    let emailStatus = "skipped";
    let warning = "";
    try {
      const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
      if (!to) {
        warning = "Contact email is not configured (CONTACT_TO_EMAIL/SMTP_USER missing). Message stored but not emailed.";
      } else {
        const result = await sendEmail({
          to,
          subject: subject ? `Contact: ${subject}` : "New contact message",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5">
              <h2>New contact message</h2>
              <p><b>Name:</b> ${escapeHtml(name)}</p>
              <p><b>Email:</b> ${escapeHtml(email)}</p>
              <p><b>Subject:</b> ${escapeHtml(subject || "(none)")}</p>
              <hr />
              <pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>
              <hr />
              <p style="color:#666;font-size:12px">Ticket: ${doc._id}</p>
            </div>
          `
        });

        if (result?.skipped) {
          emailStatus = "skipped";
          warning = "SMTP is not configured. Message stored but not emailed.";
        } else {
          emailStatus = "sent";
        }
      }
    } catch (e) {
      emailStatus = "failed";
      warning = "Message stored but email failed to send.";
      await ContactMessage.findByIdAndUpdate(doc._id, { emailError: String(e?.message || e) });
    }

    await ContactMessage.findByIdAndUpdate(doc._id, { emailStatus });
    res.json({ ok: true, ticketId: doc._id, emailStatus, warning });
  } catch (e) {
    next(e);
  }
});

// Admin: list messages
router.get("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(["new", "resolved"]).optional(),
      limit: z.coerce.number().min(1).max(200).optional().default(50)
    });
    const { status, limit } = schema.parse(req.query || {});
    const filter = status ? { status } : {};

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ messages });
  } catch (e) {
    next(e);
  }
});

// Admin: get one
router.get("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) {
      res.status(404);
      throw new Error("Contact message not found");
    }
    res.json({ message: msg });
  } catch (e) {
    next(e);
  }
});

// Admin: update status/notes
router.put("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(["new", "resolved"]).optional(),
      internalNotes: z.string().max(5000).optional()
    });
    const patch = schema.parse(req.body || {});

    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!msg) {
      res.status(404);
      throw new Error("Contact message not found");
    }
    res.json({ message: msg });
  } catch (e) {
    next(e);
  }
});

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default router;
