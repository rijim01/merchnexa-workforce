import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getFirebaseAdmin } from "../config/firebase.js";
import { validatePassword } from "../utils/validation.js";

export const authRouter = Router();

// Synchronize / verify authenticated user session
authRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve user profile" });
  }
});

// Set custom claims (Only callable by Admin to elevate or assign roles)
authRouter.post("/assign-role", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Only Admin can assign custom roles" });
    }

    const { targetUid, role } = req.body;
    if (!targetUid || !["ADMIN", "EMPLOYEE"].includes(role)) {
      return res.status(400).json({ error: "Invalid targetUid or role" });
    }

    const fbAdmin = getFirebaseAdmin();
    if (fbAdmin) {
      await admin.auth().setCustomUserClaims(targetUid, { role });
    }

    res.json({
      success: true,
      message: `Role ${role} successfully granted to user ${targetUid}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to set custom role claim" });
  }
});

// Update Admin Credentials (Email / Password)
authRouter.post("/update-admin-credentials", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Only Admin can update credentials." });
    }

    const { newEmail, newPassword } = req.body;
    if (!newEmail && !newPassword) {
      return res.status(400).json({ error: "Please provide a new email or password to update." });
    }

    const updatePayload: { email?: string; password?: string } = {};
    if (newEmail) {
      updatePayload.email = newEmail;
    }
    if (newPassword) {
      const passValidation = validatePassword(newPassword);
      if (!passValidation.valid) {
        return res.status(400).json({ error: passValidation.error });
      }
      updatePayload.password = newPassword;
    }

    const fbAdmin = getFirebaseAdmin();
    if (fbAdmin) {
      await admin.auth().updateUser(req.user.uid, updatePayload);
    }

    res.json({
      success: true,
      message: "Admin credentials successfully updated in Firebase.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update admin credentials." });
  }
});
