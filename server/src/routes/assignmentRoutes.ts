import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { AssignmentModel } from "../models/Assignment.js";
import { ApplicationModel } from "../models/Application.js";
import { TaskModel } from "../models/Task.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { connectDB, isDbConnected } from "../config/db.js";

export const assignmentRouter = Router();

// GET /api/assignments - List all assignments
assignmentRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      // 1. Auto-backfill any accepted applications that don't have assignment documents yet
      const acceptedApps = await ApplicationModel.find({ status: "Accepted" }).lean();
      for (const app of acceptedApps) {
        const existing = await AssignmentModel.findOne({
          $or: [
            { applicationId: app.id },
            { email: app.email.toLowerCase().trim(), taskTitle: app.taskTitle },
          ],
        });

        if (!existing) {
          const task = await TaskModel.findOne({ title: app.taskTitle }).lean();
          await AssignmentModel.create({
            id: app.id,
            applicationId: app.id,
            employee: app.employee,
            email: app.email.toLowerCase().trim(),
            taskTitle: app.taskTitle,
            assignedOn: app.appliedOn || new Date().toISOString().slice(0, 10),
            deadline: task?.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            payment: task?.payment || 0,
            status: "Assigned",
            paymentType: task?.paymentType || "FIXED",
            unitRate: task?.unitRate,
            unitName: task?.unitName,
            targetQuantity: task?.targetQuantity,
          });
        }
      }

      const assignments = await AssignmentModel.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, assignments });
    }

    res.json({ success: true, assignments: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch assignments" });
  }
});

// POST /api/assignments - Admin assigns worker to task
assignmentRouter.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const {
    applicationId,
    employee,
    email,
    taskTitle,
    deadline,
    payment,
    paymentType,
    unitRate,
    unitName,
    targetQuantity,
  } = req.body;

  if (!email || !taskTitle) {
    return res.status(400).json({ error: "Missing required fields (email, taskTitle)" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = employee || cleanEmail.split("@")[0];
  const assignId = applicationId || Date.now();

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      // 1. Create or update Assignment
      const task = await TaskModel.findOne({ title: taskTitle });
      const finalDeadline = deadline || task?.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const finalPayment = payment !== undefined ? Number(payment) : (task?.payment || 0);

      const assignment = await AssignmentModel.findOneAndUpdate(
        { email: cleanEmail, taskTitle },
        {
          id: assignId,
          applicationId: applicationId || assignId,
          employee: cleanName,
          email: cleanEmail,
          taskTitle,
          assignedOn: new Date().toISOString().slice(0, 10),
          deadline: finalDeadline,
          payment: finalPayment,
          status: "Assigned",
          paymentType: paymentType || task?.paymentType || "FIXED",
          unitRate: unitRate !== undefined ? Number(unitRate) : task?.unitRate,
          unitName: unitName || task?.unitName || "Account",
          targetQuantity: targetQuantity !== undefined ? Number(targetQuantity) : task?.targetQuantity,
        },
        { upsert: true, new: true }
      );

      // 2. Update TaskModel assigned employees
      if (task) {
        const currentAssigned = task.assignedEmployees || [];
        const currentEmails = task.assignedEmployeeEmails || [];

        if (!currentAssigned.includes(cleanName)) {
          currentAssigned.push(cleanName);
        }
        if (!currentEmails.includes(cleanEmail)) {
          currentEmails.push(cleanEmail);
        }

        task.assignedEmployees = currentAssigned;
        task.assignedEmployeeEmails = currentEmails;
        const totalSlots = task.slots || 1;
        task.status = currentAssigned.length >= totalSlots ? "In Progress" : "Open";
        task.employee = currentAssigned.length === 1
          ? currentAssigned[0]
          : `${currentAssigned[0]} (+${currentAssigned.length - 1} more)`;
        await task.save();
      }

      // 3. If application exists, ensure it is marked Accepted
      if (applicationId) {
        await ApplicationModel.findOneAndUpdate(
          { id: applicationId },
          { status: "Accepted" }
        );
      } else {
        await ApplicationModel.findOneAndUpdate(
          { email: cleanEmail, taskTitle },
          { status: "Accepted" }
        );
      }

      await AuditLogModel.create({
        actor: req.user?.email || "Admin",
        action: "ASSIGN_TASK",
        details: `Assigned "${taskTitle}" to ${cleanName} (${cleanEmail})`,
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        assignment,
        message: `Task successfully assigned to ${cleanName}!`,
      });
    }

    res.status(503).json({ error: "Database temporarily unavailable" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create assignment" });
  }
});
