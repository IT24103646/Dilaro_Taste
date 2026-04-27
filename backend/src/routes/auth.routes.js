import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

// Register (optional; guest checkout supported)
router.post("/register", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional().default(""),
      password: z.string().min(6)
    });
    const data = schema.parse(req.body);

    const email = String(data.email).trim().toLowerCase();

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error("Email already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({ ...data, email, passwordHash, role: "customer" });
    const token = signToken(user);

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (e) {
    next(e);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.parse(req.body);
    const email = String(parsed.email).trim().toLowerCase();
    const password = parsed.password;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }
    const token = signToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (e) {
    next(e);
  }
});

// Current user
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : req.cookies?.token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// Admin: list users
router.get("/users", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const users = await User.find().select("name email phone role createdAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// Admin: update user (role / name / phone)
router.put("/users/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["customer", "staff", "admin"]).optional(),
      name: z.string().min(2).optional(),
      phone: z.string().optional()
    });
    const patch = schema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true }).select("name email phone role createdAt");
    if (!user) { res.status(404); throw new Error("User not found"); }
    res.json(user);
  } catch (e) { next(e); }
});

// Admin: delete user
router.delete("/users/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      res.status(400); throw new Error("Cannot delete your own account");
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404); throw new Error("User not found"); }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
