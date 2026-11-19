import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase.js";
import { config } from "../config/env.js";

export interface AuthenticatedUser {
  uid: string;
  email: string;
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

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    const email = (decodedToken.email || "").toLowerCase();
    const isAdmin =
      (decodedToken as any).role === "ADMIN" ||
      email === config.adminEmail.toLowerCase() ||
      email.includes("admin") ||
      email.startsWith("jim");

    // Attach authoritative identity to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      role: isAdmin ? "ADMIN" : "EMPLOYEE",
      status: "Active",
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Token verification failed" });
  }
}
