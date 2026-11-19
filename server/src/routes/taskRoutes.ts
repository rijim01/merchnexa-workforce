import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const taskRouter = Router();

// Get all tasks (Available to all authenticated staff)
taskRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const rows = await sheetsRepo.readRows("Tasks");
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin creates new task
taskRouter.post("/", authMiddleware, requireAdmin, async (req, res) => {
  const {
    title,
    description,
    skills,
    payment,
    deadline,
    documentUrl,
    status,
    slots,
    paymentType,
    unitRate,
    unitName,
    targetQuantity,
    clientName,
    clientAmount,
    clientUnitRate,
  } = req.body;

  if (!title || !description || !payment || !deadline) {
    res.status(400).json({ error: "Missing required task fields" });
    return;
  }

  const taskId = Date.now();
  const taskRow = [
    taskId,
    title,
    description,
    Array.isArray(skills) ? skills.join(", ") : skills,
    payment,
    deadline,
    documentUrl || "",
    status || "Open",
    "Unassigned",
    slots || 1,
    paymentType || "FIXED",
    unitRate || "",
    unitName || "",
    targetQuantity || "",
    clientName || "",
    clientAmount || "",
    clientUnitRate || "",
    new Date().toISOString(),
  ];

  try {
    await sheetsRepo.appendRow("Tasks", taskRow);
    res.status(201).json({ success: true, taskId, message: "Task recorded in Google Sheets" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
