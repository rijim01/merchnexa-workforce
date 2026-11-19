import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { ApplicationModel } from "../models/Application.js";
import { TaskModel } from "../models/Task.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const applicationRouter = Router();

// GET /api/applications - List all applications
applicationRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const applications = await ApplicationModel.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, applications });
    }

    const rows = await sheetsRepo.readRows("Applications");
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch applications" });
  }
});

// POST /api/applications - Worker applies for a task
applicationRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  const { taskTitle, employee, email, message } = req.body;
  const targetEmail = (email || req.user?.email || "").toLowerCase().trim();
  const targetEmployee = employee || req.user?.name || req.user?.displayName || "Staff Member";

  if (!taskTitle) {
    return res.status(400).json({ error: "Task title is required" });
  }

  const appId = Date.now();

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      // 1. Check if employee already applied for this task
      const alreadyApplied = await ApplicationModel.findOne({
        taskTitle,
        email: targetEmail,
      });

      if (alreadyApplied) {
        return res.status(400).json({
          error: `You have already applied for "${taskTitle}". Current status: ${alreadyApplied.status}.`,
        });
      }

      // 2. Check if task exists and has remaining slots
      const task = await TaskModel.findOne({ title: taskTitle });
      if (task) {
        const assignedCount = task.assignedEmployees ? task.assignedEmployees.length : 0;
        const totalSlots = task.slots || 1;
        if (assignedCount >= totalSlots) {
          return res.status(400).json({
            error: `All ${totalSlots} positions for this task are already filled.`,
          });
        }
      }

      // 3. Create the application in MongoDB Atlas
      const createdApp = await ApplicationModel.create({
        id: appId,
        taskTitle,
        employee: targetEmployee,
        email: targetEmail,
        message: message || "",
        status: "Pending",
        appliedOn: new Date().toISOString().slice(0, 10),
      });

      console.log(`✅ [MongoDB Atlas] New application recorded: ${targetEmployee} applied for "${taskTitle}"`);

      await AuditLogModel.create({
        actor: targetEmail,
        action: "APPLY_TASK",
        details: `${targetEmployee} applied for task "${taskTitle}"`,
      }).catch(() => {});

      // Mirror to Google Sheets if configured
      sheetsRepo.appendRow("Applications", [
        appId,
        taskTitle,
        targetEmployee,
        targetEmail,
        new Date().toISOString().slice(0, 10),
        message || "",
        "Pending",
      ]).catch(() => {});

      return res.status(201).json({
        success: true,
        application: createdApp,
        message: "Application submitted successfully and sent to Admin!",
      });
    }

    res.status(503).json({ error: "Database temporarily unavailable" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit application" });
  }
});

// PATCH /api/applications/:id/status - Admin accepts/rejects application and assigns worker
applicationRouter.patch("/:id/status", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const appId = Number(req.params.id);
  const { status } = req.body;

  if (!status || !["Pending", "Accepted", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Valid status (Pending, Accepted, Rejected) is required" });
  }

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const app = await ApplicationModel.findOneAndUpdate(
        { id: appId },
        { status },
        { new: true }
      );

      if (!app) {
        return res.status(404).json({ error: "Application not found" });
      }

      // If accepted, add worker to the task's assignedEmployees list in MongoDB Atlas
      if (status === "Accepted") {
        const task = await TaskModel.findOne({ title: app.taskTitle });
        if (task) {
          const currentAssigned = task.assignedEmployees || [];
          if (!currentAssigned.includes(app.employee)) {
            const updatedAssigned = [...currentAssigned, app.employee];
            task.assignedEmployees = updatedAssigned;
            task.status = "In Progress";
            task.employee = updatedAssigned.length === 1
              ? updatedAssigned[0]
              : `${updatedAssigned[0]} (+${updatedAssigned.length - 1} more)`;
            await task.save();

            console.log(`✅ [MongoDB Atlas] Worker ${app.employee} assigned to task "${task.title}". Active staff: ${updatedAssigned.length}/${task.slots}`);
          }
        }
      }

      await AuditLogModel.create({
        actor: req.user?.email || "Admin",
        action: "UPDATE_APPLICATION",
        details: `Application for "${app.taskTitle}" by ${app.employee} marked as ${status}`,
      }).catch(() => {});

      return res.json({
        success: true,
        application: app,
        message: `Application marked as ${status}`,
      });
    }

    res.status(503).json({ error: "Database temporarily unavailable" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update application" });
  }
});
