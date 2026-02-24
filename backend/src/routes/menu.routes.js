import express from "express";
import { z } from "zod";
import { MenuItem } from "../models/MenuItem.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Public menu (active + time-based availability filter)
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const dow = now.getDay();
    const hhmm = now.toTimeString().slice(0,5);

    const items = await MenuItem.find({ isActive: true }).lean();
    const filtered = items.filter(i => {
      const a = i.availability || {};
      if (!a.daysOfWeek?.length && !a.startTime && !a.endTime) return true;
      if (a.daysOfWeek?.length && !a.daysOfWeek.includes(dow)) return false;
      if (a.startTime && hhmm < a.startTime) return false;
      if (a.endTime && hhmm > a.endTime) return false;
      return true;
    });

    res.json({ items: filtered });
  } catch (e) {
    next(e);
  }
});

// Public: popular items sorted by orderCount — must be BEFORE /:id
router.get("/popular", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 20);
    const items = await MenuItem.find({ isActive: true })
      .sort({ orderCount: -1 })
      .limit(limit)
      .lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Admin/staff list all (including inactive) — must be BEFORE /:id
router.get("/all", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Public: get single item by id — must come AFTER static routes
router.get("/:id", async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) { res.status(404); throw new Error("Menu item not found"); }
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

router.post("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional().default(""),
      price: z.number().min(0),
      category: z.string().min(1),
      imageUrl: z.string().optional().default(""),
      photos: z.array(z.string()).optional().default([]),
      isActive: z.boolean().optional().default(true),
      dietaryTags: z.array(z.string()).optional().default([]),
      allergens: z.array(z.string()).optional().default([]),
      availability: z.object({
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional()
      }).optional(),
      recipe: z.array(z.object({
        ingredient: z.string(),
        quantity: z.number().min(0)
      })).optional().default([])
    });
    const data = schema.parse(req.body);
    const item = await MenuItem.create(data);
    res.status(201).json({ item });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) {
      res.status(404);
      throw new Error("Menu item not found");
    }
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) {
      res.status(404);
      throw new Error("Menu item not found");
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Bulk update (seasonal)
router.post("/bulk", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      items: z.array(z.object({
        id: z.string(),
        patch: z.record(z.any())
      }))
    });
    const { items } = schema.parse(req.body);

    const results = [];
    for (const it of items) {
      const updated = await MenuItem.findByIdAndUpdate(it.id, it.patch, { new: true });
      results.push(updated);
    }
    res.json({ results });
  } catch (e) {
    next(e);
  }
});

export default router;
