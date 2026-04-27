import express from "express";
import { z } from "zod";
import { EventPackage } from "../models/EventPackage.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function parseOptionalDate(value) {
  if (value == null || value === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("Invalid date value");
    err.statusCode = 400;
    throw err;
  }
  return d;
}

function normalizeIncludes(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  // allow comma-separated string
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function computeFinalPrice(price, discount) {
  const base = Number(price || 0);
  const type = discount?.type || "none";
  const value = Number(discount?.value || 0);

  if (!Number.isFinite(base) || base < 0) return 0;
  if (!Number.isFinite(value) || value < 0) return base;

  let final = base;
  if (type === "percent") {
    final = base * (1 - value / 100);
  }
  if (type === "fixed") {
    final = base - value;
  }
  if (!Number.isFinite(final)) final = base;
  return Math.max(0, Math.round(final * 100) / 100);
}

function parseTimeToMinutes(value) {
  if (value == null || value === "") return undefined;
  const str = String(value).trim();
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(str);
  if (!m) throw badRequest("Invalid time value (expected HH:MM)");
  return Number(m[1]) * 60 + Number(m[2]);
}

function validateAvailability({ availableFrom, availableTo, timeStart, timeEnd }) {
  if (availableFrom && availableTo && availableFrom.getTime() > availableTo.getTime()) {
    throw badRequest("Available From must be before Available To");
  }

  const hasStart = !!(timeStart && String(timeStart).trim());
  const hasEnd = !!(timeEnd && String(timeEnd).trim());
  if (hasStart !== hasEnd) {
    throw badRequest("Provide both Time Start and Time End");
  }

  if (hasStart && hasEnd) {
    const startMinutes = parseTimeToMinutes(timeStart);
    const endMinutes = parseTimeToMinutes(timeEnd);
    if (startMinutes >= endMinutes) {
      throw badRequest("Time Start must be before Time End");
    }
  }
}

function validateDiscount({ price, discountType, discountValue }) {
  const p = Number(price || 0);
  const type = discountType || "none";
  const value = Number(discountValue || 0);

  if (!Number.isFinite(p) || p < 0) throw badRequest("Price must be a valid number");
  if (!Number.isFinite(value) || value < 0) throw badRequest("Discount Value must be a valid number");

  if (type === "none") {
    if (value !== 0) throw badRequest("Discount Value must be 0 when Discount Type is none");
    return;
  }
  if (p === 0 && value !== 0) throw badRequest("Discount Value must be 0 when Price is 0");

  if (type === "percent") {
    if (value > 100) throw badRequest("Percent discount cannot be greater than 100");
    return;
  }

  if (type === "fixed") {
    if (value > p) throw badRequest("Fixed discount cannot be greater than Price");
  }
}
 if (type === "fixed") {
    if (value > p) throw badRequest("Fixed discount cannot be greater than Price");
  }
}

function toClient(doc) {
  const p = doc?.toObject ? doc.toObject() : doc;
  const price = Number(p.price || 0);
  const discount = p.discount || { type: "none", value: 0 };
  return {
    ...p,
    finalPrice: computeFinalPrice(price, discount),
  };
}

// Public list
router.get("/", async (req, res, next) => {
  try {
    const items = await EventPackage.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json({ packages: items.map(toClient) });
  } catch (e) {
    next(e);
  }
});

// Admin list (includes inactive)
router.get("/all", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const items = await EventPackage.find({}).sort({ createdAt: -1 }).lean();
    res.json({ packages: items.map(toClient) });
  } catch (e) {
    next(e);
  }
});

// Public detail
router.get("/:id", async (req, res, next) => {
  try {
    const item = await EventPackage.findById(req.params.id).lean();
    if (!item || item.isActive === false) {
      res.status(404);
      throw new Error("Package not found");
    }
    res.json({ package: toClient(item) });
  } catch (e) {
    next(e);
  }
});

// Admin create
router.post("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional().default(""),
      includes: z.any().optional(),
      price: z.coerce.number().min(0),
      discountType: z.enum(["none", "percent", "fixed"]).optional().default("none"),
      discountValue: z.coerce.number().min(0).optional().default(0),
      packCount: z.coerce.number().int().min(0).optional().default(0),
      availableFrom: z.string().optional().nullable(),
      availableTo: z.string().optional().nullable(),
      timeStart: z.string().optional().default(""),
      timeEnd: z.string().optional().default(""),
      isActive: z.boolean().optional().default(true),
    });

    const data = schema.parse(req.body);

    const availableFrom = parseOptionalDate(data.availableFrom);
    const availableTo = parseOptionalDate(data.availableTo);
    const timeStart = String(data.timeStart || "").trim();
    const timeEnd = String(data.timeEnd || "").trim();

    validateAvailability({ availableFrom, availableTo, timeStart, timeEnd });
    validateDiscount({ price: data.price, discountType: data.discountType, discountValue: data.discountValue });

    const created = await EventPackage.create({
      name: data.name.trim(),
      description: data.description || "",
      includes: normalizeIncludes(data.includes),
      price: Number(data.price || 0),
      discount: { type: data.discountType, value: Number(data.discountValue || 0) },
      packCount: Number(data.packCount || 0),
      availableFrom,
      availableTo,
      timeStart,
      timeEnd,
      isActive: !!data.isActive,
    });

    res.status(201).json({ package: toClient(created) });
  } catch (e) {
    next(e);
  }
});

// Admin update
router.put("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      includes: z.any().optional(),
      price: z.coerce.number().min(0).optional(),
      discountType: z.enum(["none", "percent", "fixed"]).optional(),
      discountValue: z.coerce.number().min(0).optional(),
      packCount: z.coerce.number().int().min(0).optional(),
      availableFrom: z.string().optional().nullable(),
      availableTo: z.string().optional().nullable(),
      timeStart: z.string().optional(),
      timeEnd: z.string().optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const item = await EventPackage.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error("Package not found");
    }

    const nextPrice = data.price != null ? Number(data.price) : Number(item.price || 0);
    const nextDiscountType = data.discountType ?? item.discount?.type ?? "none";
    const nextDiscountValue = data.discountValue != null
      ? Number(data.discountValue)
      : Number(item.discount?.value || 0);

    const nextAvailableFrom = ("availableFrom" in data)
      ? parseOptionalDate(data.availableFrom)
      : item.availableFrom;
    const nextAvailableTo = ("availableTo" in data)
      ? parseOptionalDate(data.availableTo)
      : item.availableTo;
    const nextTimeStart = data.timeStart != null ? String(data.timeStart || "").trim() : String(item.timeStart || "").trim();
    const nextTimeEnd = data.timeEnd != null ? String(data.timeEnd || "").trim() : String(item.timeEnd || "").trim();

    validateAvailability({
      availableFrom: nextAvailableFrom,
      availableTo: nextAvailableTo,
      timeStart: nextTimeStart,
      timeEnd: nextTimeEnd,
    });

    validateDiscount({
      price: nextPrice,
      discountType: nextDiscountType,
      discountValue: nextDiscountValue,
    });

    if (data.name != null) item.name = String(data.name).trim();
    if (data.description != null) item.description = String(data.description);
    if (data.includes != null) item.includes = normalizeIncludes(data.includes);
    if (data.price != null) item.price = Number(data.price);
    if (data.discountType != null || data.discountValue != null) {
      item.discount = {
        type: data.discountType ?? item.discount?.type ?? "none",
        value: data.discountValue != null ? Number(data.discountValue) : Number(item.discount?.value || 0),
      };
    }
    if (data.packCount != null) item.packCount = Number(data.packCount);
    if ("availableFrom" in data) item.availableFrom = nextAvailableFrom;
    if ("availableTo" in data) item.availableTo = nextAvailableTo;
    if (data.timeStart != null) item.timeStart = nextTimeStart;
    if (data.timeEnd != null) item.timeEnd = nextTimeEnd;
    if (data.isActive != null) item.isActive = !!data.isActive;

    await item.save();
    res.json({ package: toClient(item) });
  } catch (e) {
    next(e);
  }
});

// Admin delete (soft)
router.delete("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const item = await EventPackage.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error("Package not found");
    }
    item.isActive = false;
    await item.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
