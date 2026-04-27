import express from "express";
import { z } from "zod";
import { protect, requireRole } from "../middleware/auth.js";
import { getCloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Cloudinary signed upload params (frontend uploads directly to Cloudinary)
router.post("/cloudinary/sign", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      folder: z.string().optional().default(""),
      publicId: z.string().optional().default(""),
      resourceType: z.enum(["image", "video", "raw"]).optional().default("image")
    });
    const { folder, publicId, resourceType } = schema.parse(req.body || {});

    let cloudinary;
    try {
      cloudinary = getCloudinary();
    } catch (e) {
      res.status(500);
      throw e;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadFolder = folder || process.env.CLOUDINARY_FOLDER || "restaurant-mern";

    const paramsToSign = {
      timestamp,
      folder: uploadFolder
    };
    if (publicId) paramsToSign.public_id = publicId;

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    res.json({
      timestamp,
      signature,
      folder: uploadFolder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      resourceType
    });
  } catch (e) {
    next(e);
  }
});

// Optional: allow admin to delete an uploaded asset by publicId
router.post("/cloudinary/delete", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const schema = z.object({
      publicId: z.string().min(1),
      resourceType: z.enum(["image", "video", "raw"]).optional().default("image")
    });
    const { publicId, resourceType } = schema.parse(req.body);

    let cloudinary;
    try {
      cloudinary = getCloudinary();
    } catch (e) {
      res.status(500);
      throw e;
    }
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    res.json({ result });
  } catch (e) {
    next(e);
  }
});

export default router;
