import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { TaskModel } from "../models/Task.js";
import { AssignmentModel } from "../models/Assignment.js";
import { ApplicationModel } from "../models/Application.js";
import { EmployeeModel } from "../models/Employee.js";
import { SubmissionModel } from "../models/Submission.js";
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

// GET /api/tasks/:id/workers - Get all active workers on a task with profiles and submissions
taskRouter.get("/:id/workers", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const task = await TaskModel.findOne({ id: taskId }).lean();
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const assignments = await AssignmentModel.find({ taskTitle: task.title }).lean();
      const acceptedApps = await ApplicationModel.find({ taskTitle: task.title, status: "Accepted" }).lean();

      const workerEmails = new Set<string>();
      assignments.forEach((a) => {
        if (a.email) workerEmails.add(a.email.toLowerCase().trim());
      });
      acceptedApps.forEach((app) => {
        if (app.email) workerEmails.add(app.email.toLowerCase().trim());
      });
      if (task.assignedEmployeeEmails) {
        task.assignedEmployeeEmails.forEach((e: string) => workerEmails.add(e.toLowerCase().trim()));
      }

      const workerNames = new Set<string>(task.assignedEmployees || []);
      assignments.forEach((a) => workerNames.add(a.employee));
      acceptedApps.forEach((app) => workerNames.add(app.employee));

      const employees = await EmployeeModel.find({
        $or: [
          { email: { $in: Array.from(workerEmails) } },
          { name: { $in: Array.from(workerNames) } },
        ],
      }).lean();

      const submissions = await SubmissionModel.find({ taskTitle: task.title }).lean();

      const workers: any[] = [];
      const seen = new Set<string>();

      for (const email of Array.from(workerEmails)) {
        if (seen.has(email)) continue;
        seen.add(email);

        const emp = employees.find((e) => e.email.toLowerCase() === email);
        const assign = assignments.find((a) => a.email.toLowerCase() === email);
        const app = acceptedApps.find((a) => a.email.toLowerCase() === email);
        const sub = submissions.find((s) => s.email.toLowerCase() === email);

        workers.push({
          name: emp?.name || assign?.employee || app?.employee || email.split("@")[0],
          email,
          role: emp?.role || "Staff Member",
          skills: emp?.skills || [],
          initials: emp?.initials || (emp?.name || email).slice(0, 2).toUpperCase(),
          color: emp?.color || "bg-blue-100 text-blue-700",
          phone: emp?.phone || "",
          assignedOn: assign?.assignedOn || app?.appliedOn || new Date().toISOString().slice(0, 10),
          submission: sub
            ? {
                id: sub.id,
                status: sub.status,
                deliverableUrl: sub.deliverableUrl,
                submittedOn: sub.submittedOn,
                notes: sub.notes,
                payment: sub.payment,
                rating: sub.rating,
                feedback: sub.feedback,
              }
            : null,
        });
      }

      for (const name of Array.from(workerNames)) {
        const matchingWorker = workers.find((w) => w.name.toLowerCase() === name.toLowerCase());
        if (!matchingWorker) {
          const emp = employees.find((e) => e.name.toLowerCase() === name.toLowerCase());
          const email = emp?.email || "";
          if (email && seen.has(email.toLowerCase())) continue;
          if (email) seen.add(email.toLowerCase());

          const sub = submissions.find(
            (s) =>
              s.employee.toLowerCase() === name.toLowerCase() ||
              (email && s.email.toLowerCase() === email.toLowerCase())
          );

          workers.push({
            name,
            email: email || "No email on record",
            role: emp?.role || "Staff Member",
            skills: emp?.skills || [],
            initials: emp?.initials || name.slice(0, 2).toUpperCase(),
            color: emp?.color || "bg-blue-100 text-blue-700",
            phone: emp?.phone || "",
            assignedOn: new Date().toISOString().slice(0, 10),
            submission: sub
              ? {
                  id: sub.id,
                  status: sub.status,
                  deliverableUrl: sub.deliverableUrl,
                  submittedOn: sub.submittedOn,
                  notes: sub.notes,
                  payment: sub.payment,
                  rating: sub.rating,
                  feedback: sub.feedback,
                }
              : null,
          });
        }
      }

      return res.json({
        success: true,
        taskId: task.id,
        taskTitle: task.title,
        slots: task.slots || 1,
        assignedCount: workers.length,
        remainingSlots: Math.max(0, (task.slots || 1) - workers.length),
        workers,
      });
    }

    res.json({ success: true, workers: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/unassign - Admin unassigns worker from task
taskRouter.post("/:id/unassign", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { email, employeeName } = req.body;

    if (!email && !employeeName) {
      return res.status(400).json({ error: "Worker email or employeeName is required" });
    }

    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const task = await TaskModel.findOne({ id: taskId });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const cleanEmail = (email || "").toLowerCase().trim();
      const cleanName = (employeeName || "").trim();

      task.assignedEmployees = (task.assignedEmployees || []).filter(
        (n) => n.toLowerCase() !== cleanName.toLowerCase() && n.toLowerCase() !== cleanEmail
      );
      task.assignedEmployeeEmails = (task.assignedEmployeeEmails || []).filter(
        (e) => e.toLowerCase() !== cleanEmail
      );
      task.employee =
        task.assignedEmployees.length === 0
          ? "Unassigned"
          : task.assignedEmployees.length === 1
          ? task.assignedEmployees[0]
          : `${task.assignedEmployees[0]} (+${task.assignedEmployees.length - 1} more)`;

      if (task.assignedEmployees.length === 0 && task.status === "In Progress") {
        task.status = "Open";
      }
      await task.save();

      if (cleanEmail) {
        await AssignmentModel.deleteMany({
          taskTitle: task.title,
          email: cleanEmail,
        });
      }
      if (cleanName) {
        await AssignmentModel.deleteMany({
          taskTitle: task.title,
          employee: cleanName,
        });
      }

      if (cleanEmail) {
        await ApplicationModel.updateMany(
          { taskTitle: task.title, email: cleanEmail },
          { status: "Rejected" }
        );
      }

      await AuditLogModel.create({
        actor: req.user?.email || "Admin",
        action: "UNASSIGN_WORKER",
        details: `Worker ${cleanName || cleanEmail} unassigned from "${task.title}"`,
      }).catch(() => {});

      return res.json({
        success: true,
        message: `Worker successfully unassigned from "${task.title}"`,
        task,
      });
    }

    res.status(503).json({ error: "Database temporarily unavailable" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
