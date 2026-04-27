import express from "express";
import { z } from "zod";
import { protect, requireRole } from "../middleware/auth.js";
import HeroSlide from "../models/HeroSlide.js";
import { getCloudinary } from "../config/cloudinary.js";

const router = express.Router();

// GET /api/hero  — public, returns active slides ordered by `order`
router.get("/", async (req, res, next) => {
  try {
    const slides = await HeroSlide.find({ active: true }).sort({ order: 1, createdAt: 1 });
    res.json(slides);
  } catch (e) {
    next(e);
  }
});

// GET /api/hero/all  — admin only, returns all slides (including inactive)
router.get("/all", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 });
    res.json(slides);
  } catch (e) {
    next(e);
  }
});

// POST /api/hero  — admin, add a new slide
router.post("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      imageUrl: z.string().url("imageUrl must be a valid URL"),
      cloudinaryPublicId: z.string().optional().default(""),
      title: z.string().max(80).optional().default(""),
      subtitle: z.string().max(160).optional().default(""),
      order: z.number().int().optional().default(0),
      active: z.boolean().optional().default(true),
    });
    const data = schema.parse(req.body);
    const slide = await HeroSlide.create(data);
    res.status(201).json(slide);
  } catch (e) {
    next(e);
  }
});

// PUT /api/hero/:id  — admin, update slide fields (title, subtitle, order, active)
router.put("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().max(80).optional(),
      subtitle: z.string().max(160).optional(),
      order: z.number().int().optional(),
      active: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const slide = await HeroSlide.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!slide) { res.status(404); throw new Error("Slide not found"); }
    res.json(slide);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/hero/:id  — admin, delete slide + optionally purge Cloudinary asset
router.delete("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) { res.status(404); throw new Error("Slide not found"); }

    // Attempt Cloudinary delete if publicId stored
    if (slide.cloudinaryPublicId) {
      try {
        const cloudinary = getCloudinary();
        await cloudinary.uploader.destroy(slide.cloudinaryPublicId);
      } catch (_) {
        // Non-fatal — image still removed from DB
      }
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
