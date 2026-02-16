import express from "express";
import { z } from "zod";
import { LaundryItem } from "../models/LaundryItem.js";
import { TextileInventory } from "../models/TextileInventory.js";
import { protect, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";

const router = express.Router();

async function ensureInventory(type) {
  let inv = await TextileInventory.findOne({ type });
  if (!inv) inv = await TextileInventory.create({ type, clean: 0, soiled: 0, inUse: 0 });
  return inv;
}

router.get("/inventory", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const inv = await TextileInventory.find().sort({ type: 1 });
    res.json({ inventory: inv });
  } catch (e) { next(e); }
});

router.post("/inventory/:type/adjust", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      clean: z.number().int().optional(),
      soiled: z.number().int().optional(),
      inUse: z.number().int().optional()
    });
    const patch = schema.parse(req.body);
    const inv = await ensureInventory(req.params.type);
    for (const k of ["clean","soiled","inUse"]) {
      if (typeof patch[k] === "number") inv[k] = Math.max(0, inv[k] + patch[k]);
    }
    await inv.save();
    res.json({ inventory: inv });
  } catch (e) { next(e); }
});

// CRUD laundry tasks
router.get("/", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const items = await LaundryItem.find().sort({ createdAt: -1 }).limit(200);
    res.json({ items });
  } catch (e) { next(e); }
});

router.post("/", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(["linens", "towels", "uniforms"]),
      quantity: z.number().int().min(1),
      assignedTo: z.string().optional().default(""),
      dueAt: z.string().datetime().optional(),
      charges: z.object({
        express: z.number().optional(),
        replacement: z.number().optional(),
        damage: z.number().optional()
      }).optional()
    });
    const data = schema.parse(req.body);

    const item = await LaundryItem.create({
      ...data,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined
    });

    // Update textile inventory: move to soiled by default
    const inv = await ensureInventory(data.type);
    inv.soiled += data.quantity;
    await inv.save();

    emitEvent("laundry", "laundry:new", item);
    res.status(201).json({ item });
  } catch (e) { next(e); }
});

router.post("/:id/status", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(["soiled", "queued", "in-progress", "cleaned", "ready"]),
      verify: z.boolean().optional().default(false)
    });
    const { status, verify } = schema.parse(req.body);

    const item = await LaundryItem.findById(req.params.id);
    if (!item) { res.status(404); throw new Error("Laundry item not found"); }

    item.status = status;
    if (verify && status === "ready") item.verifiedBy = req.user._id;

    await item.save();

    // When ready + verified, move inventory soiled -> clean
    if (verify && status === "ready") {
      const inv = await ensureInventory(item.type);
      inv.soiled = Math.max(0, inv.soiled - item.quantity);
      inv.clean += item.quantity;
      await inv.save();
    }

    emitEvent("laundry", "laundry:status", item);
    res.json({ item });
  } catch (e) { next(e); }
});

export default router;
