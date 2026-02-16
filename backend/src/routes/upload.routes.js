import express from "express";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Placeholder endpoint for "uploading" image URLs.
// In real life, integrate Cloudinary/S3.
router.post("/menu-image", protect, requireRole("admin"), async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });
  res.json({ imageUrl });
});

export default router;
