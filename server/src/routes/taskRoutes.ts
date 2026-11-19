import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { TaskModel } from "../models/Task.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const taskRouter = Router();

// Get all tasks (Available to all authenticated staff & frontend load)
taskRouter.get("/", async (req, res) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const tasks = await TaskModel.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, tasks });
    }

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
  let createdTask: any = null;

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      createdTask = await TaskModel.create({
        id: taskId,
        title,
        description,
        skills: Array.isArray(skills) ? skills : (skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        payment: Number(payment),
        deadline,
        documentUrl: documentUrl || "",
        status: status || "Open",
        employee: "Unassigned",
        assignedEmployees: [],
        slots: Number(slots) || 1,
        paymentType: paymentType || "FIXED",
        unitRate: unitRate ? Number(unitRate) : undefined,
        unitName: unitName || "Account",
        targetQuantity: targetQuantity ? Number(targetQuantity) : undefined,
        completedQuantity: 0,
        clientName: clientName || "",
        clientAmount: clientAmount ? Number(clientAmount) : undefined,
        clientUnitRate: clientUnitRate ? Number(clientUnitRate) : undefined,
      });

      console.log(`✅ [MongoDB Atlas] Successfully created task in MongoDB Atlas: "${title}" (ID: ${taskId})`);

      await AuditLogModel.create({
        actor: req.user?.email || "Admin",
        action: "CREATE_TASK",
        details: `Task created in MongoDB Atlas: "${title}" (Budget: ৳${payment})`,
      }).catch(() => {});
    } else {
      console.error("❌ [MongoDB Atlas] Cannot save task because MongoDB Atlas is disconnected.");
      return res.status(503).json({
        error: "MongoDB Atlas is not connected. Please verify your MONGODB_URI and Network Access IP whitelist (0.0.0.0/0).",
      });
    }

    // Mirror to Google Sheets if configured
    sheetsRepo.appendRow("Tasks", [
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
    ]).catch(() => {});

    res.status(201).json({
      success: true,
      taskId,
      task: createdTask,
      message: "Task successfully saved to MongoDB Atlas",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status (Admin only)
taskRouter.patch("/:id/status", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { status } = req.body;

    if (isDbConnected()) {
      const updated = await TaskModel.findOneAndUpdate(
        { id: taskId },
        { status },
        { new: true }
      );
      return res.json({ success: true, task: updated });
    }

    res.json({ success: true, message: "Status updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
