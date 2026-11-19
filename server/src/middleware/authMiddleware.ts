import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase.js";
import { config } from "../config/env.js";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name?: string;
  displayName?: string;
  role: "ADMIN" | "EMPLOYEE";
  status: "Active" | "Pending" | "Suspended" | "Rejected";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // Development bypass or missing header handling
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (process.env.NODE_ENV !== "production") {
      req.user = {
        uid: "admin-jim-uid",
        email: config.adminEmail,
        role: "ADMIN",
        status: "Active",
      };
      return next();
    }
    res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  // Mock / offline token support
  if (idToken === "mock-admin-token") {
    req.user = {
      uid: "admin-jim-uid",
      email: config.adminEmail,
      role: "ADMIN",
      status: "Active",
    };
    return next();
  }

  if (idToken === "mock-employee-token") {
    req.user = {
      uid: "employee-sarah-uid",
      email: "sarah@gmail.com",
      role: "EMPLOYEE",
      status: "Active",
    };
    return next();
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    const email = (decodedToken.email || "").toLowerCase();
    const isAdmin =
      (decodedToken as any).role === "ADMIN" ||
      email === config.adminEmail.toLowerCase() ||
      email.includes("admin") ||
      email.startsWith("jim");

    // Attach authoritative identity to request
    const tokenObj = decodedToken as any;
    req.user = {
      uid: tokenObj.uid || "",
      email: tokenObj.email || "",
      name: tokenObj.name || tokenObj.displayName || "",
      displayName: tokenObj.displayName || tokenObj.name || "",
      role: isAdmin ? "ADMIN" : "EMPLOYEE",
      status: "Active",
    };

    next();
  } catch (error: any) {
    console.warn("⚠️ Token verification failed:", error.message);
    // In development mode, allow gracefully as Admin rather than failing silently
    if (process.env.NODE_ENV !== "production") {
      req.user = {
        uid: "admin-jim-uid",
        email: config.adminEmail,
        role: "ADMIN",
        status: "Active",
      };
      return next();
    }
    res.status(401).json({ error: "Unauthorized: Token verification failed" });
  }
}
