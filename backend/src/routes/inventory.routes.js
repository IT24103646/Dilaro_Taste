import express from "express";
import { z } from "zod";
import { Ingredient } from "../models/Ingredient.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// View stock (staff/admin)
router.get("/kitchen", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json({ ingredients });
  } catch (e) {
    next(e);
  }
});

// Add ingredient (admin)
router.post("/kitchen", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      unit: z.string().optional().default("pcs"),
      stock: z.number().min(0).optional().default(0),
      minThreshold: z.number().min(0).optional().default(0)
    });
    const data = schema.parse(req.body);
    const ingredient = await Ingredient.create(data);
    res.status(201).json({ ingredient });
  } catch (e) {
    next(e);
  }
});

// Manual adjust (staff/admin) with log
router.post("/kitchen/:id/adjust", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      delta: z.number(),
      reason: z.string().min(2)
    });
    const { delta, reason } = schema.parse(req.body);

    const ing = await Ingredient.findById(req.params.id);
    if (!ing) {
      res.status(404);
      throw new Error("Ingredient not found");
    }
    ing.stock = Math.max(0, ing.stock + delta);
    await ing.save();

    await InventoryLog.create({
      ingredient: ing._id,
      delta,
      reason,
      byUser: req.user._id
    });

    res.json({ ingredient: ing });
  } catch (e) {
    next(e);
  }
});

// Low stock alerts
router.get("/kitchen/alerts/low-stock", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const low = await Ingredient.find({ $expr: { $lte: ["$stock", "$minThreshold"] } }).sort({ stock: 1 });
    res.json({ low });
  } catch (e) {
    next(e);
  }
});

// Movement logs
router.get("/kitchen/logs", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const logs = await InventoryLog.find().populate("ingredient", "name unit").populate("byUser", "name role").sort({ createdAt: -1 }).limit(200);
    res.json({ logs });
  } catch (e) {
    next(e);
  }
});

// Simple restock recommendations based on avg daily usage in last N days
router.get("/kitchen/recommendations", protect, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const days = Math.max(7, Math.min(60, Number(req.query.days || 14)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usage = await InventoryLog.aggregate([
      { $match: { createdAt: { $gte: since }, delta: { $lt: 0 } } },
      { $group: { _id: "$ingredient", totalUsed: { $sum: { $abs: "$delta" } } } }
    ]);

    const ingredients = await Ingredient.find();
    const map = new Map(usage.map(u => [String(u._id), u.totalUsed]));

    const recommendations = ingredients.map(i => {
      const totalUsed = map.get(String(i._id)) || 0;
      const avgPerDay = totalUsed / days;
      // recommend 7 days cover at least threshold
      const target = Math.max(i.minThreshold, Math.ceil(avgPerDay * 7));
      const need = Math.max(0, target - i.stock);
      return {
        ingredientId: i._id,
        name: i.name,
        unit: i.unit,
        stock: i.stock,
        minThreshold: i.minThreshold,
        avgPerDay: Number(avgPerDay.toFixed(2)),
        recommendQty: need
      };
    }).filter(r => r.recommendQty > 0).sort((a,b)=>b.recommendQty-a.recommendQty);

    res.json({ days, recommendations });
  } catch (e) {
    next(e);
  }
});

export default router;
