import { Request, Response, NextFunction } from "express";

export function requireRole(allowedRoles: ("ADMIN" | "EMPLOYEE")[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Authentication required" });
      return;
    }

    if (req.user.status === "Suspended") {
      res.status(403).json({ error: "Forbidden: Account is suspended" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions for this action" });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(["ADMIN"]);
export const requireEmployee = requireRole(["EMPLOYEE", "ADMIN"]);
