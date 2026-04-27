import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

async function resolveUser(req) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : req.cookies?.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-passwordHash");
  } catch {
    return null;
  }
}

export async function protect(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401);
      throw new Error("Not authorized (no token)");
    }

    req.user = user;
    next();
  } catch (e) {
    res.status(401);
    next(e);
  }
}

export async function optionalProtect(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Not authorized"));
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error("Forbidden: insufficient role"));
    }
    next();
  };
}
