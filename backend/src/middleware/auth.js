import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : req.cookies?.token;

    if (!token) {
      res.status(401);
      throw new Error("Not authorized (no token)");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized (user not found)");
    }

    req.user = user;
    next();
  } catch (e) {
    res.status(401);
    next(e);
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
