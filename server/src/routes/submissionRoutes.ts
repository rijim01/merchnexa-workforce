import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { SubmissionModel } from "../models/Submission.js";
import { TaskModel } from "../models/Task.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";
import { ledgerService } from "../services/ledgerService.js";

export const submissionRouter = Router();

// Get all submissions
submissionRouter.get("/", async (req, res) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }
    if (isDbConnected()) {
      const submissions = await SubmissionModel.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, submissions });
    }
    const rows = await sheetsRepo.readRows("Submissions");
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Employee submits deliverable link
submissionRouter.post("/", authMiddleware, async (req, res) => {
  const {
    taskTitle,
    employee,
    email,
    deliverableUrl,
    notes,
    payment,
    paymentType,
    unitRate,
    unitName,
    submittedQuantity,
  } = req.body;

  if (!taskTitle || !deliverableUrl) {
    res.status(400).json({ error: "Missing required submission fields" });
    return;
  }

  const subId = Date.now();
  let createdSub: any = null;

  try {
    if (!isDbConnected()) {
      await connectDB();
    }
    if (isDbConnected()) {
      createdSub = await SubmissionModel.create({
        id: subId,
        taskTitle,
        employee: employee || req.user?.displayName || "Staff Member",
        email: (email || req.user?.email || "").toLowerCase().trim(),
        submittedOn: new Date().toISOString().slice(0, 10),
        deliverableUrl,
        notes: notes || "",
        payment: Number(payment) || 0,
        status: "Under Review",
        paymentType: paymentType || "FIXED",
        unitRate: unitRate ? Number(unitRate) : undefined,
        unitName: unitName || "Account",
        submittedQuantity: Number(submittedQuantity) || 1,
        approvedQuantity: Number(submittedQuantity) || 1,
      });

      await AuditLogModel.create({
        actor: email || req.user?.email || "Employee",
        action: "SUBMIT_DELIVERABLE",
        details: `Deliverable submitted for "${taskTitle}" (${deliverableUrl})`,
      });
    }

    // Mirror to Google Sheets if configured
    sheetsRepo.appendRow("Submissions", [
      subId,
      new Date().toISOString().slice(0, 10),
      taskTitle,
      employee || req.user?.displayName || "Staff Member",
      email || req.user?.email,
      deliverableUrl,
      notes || "",
      "Under Review",
      paymentType || "FIXED",
      unitRate || "",
      unitName || "",
      submittedQuantity || 1,
      payment || 0,
      "", // Rating
      "", // Feedback
    ]).catch(() => {});

    res.status(201).json({
      success: true,
      subId,
      submission: createdSub,
      message: "Submission saved to MongoDB Atlas",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin approves submission and releases payout to ledger
submissionRouter.patch("/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
  const subId = Number(req.params.id);
  const {
    taskTitle,
    employee,
    email,
    amount,
    rating,
    approvedQuantity,
    unitRate,
    unitName,
    note,
  } = req.body;

  if (!email || !amount) {
    res.status(400).json({ error: "Missing required approval fields" });
    return;
  }

  try {
    const finalAmount = Math.round(Number(amount));
    const txnId = `TXN-${Date.now().toString().slice(-4)}`;

    if (isDbConnected()) {
      // 1. Update submission status in MongoDB Atlas
      await SubmissionModel.findOneAndUpdate(
        { id: subId },
        {
          status: "Approved",
          payment: finalAmount,
          rating: Number(rating) || 10,
          approvedQuantity: Number(approvedQuantity) || 1,
          feedback: note || "",
        }
      );

      // 2. Increment completedQuantity on the Task
      if (taskTitle) {
        await TaskModel.findOneAndUpdate(
          { title: taskTitle },
          { $inc: { completedQuantity: Number(approvedQuantity) || 1 } }
        );
      }
    }

    // 3. Credit employee ledger in MongoDB Atlas (and mirror to Sheets)
    await ledgerService.recordTransaction({
      id: txnId,
      employeeEmail: email.toLowerCase().trim(),
      employeeName: employee || "Staff Member",
      type: "CREDIT",
      amount: finalAmount,
      date: new Date().toISOString().slice(0, 10),
      method: "System Credit",
      reference: approvedQuantity ? `Approved ${approvedQuantity} ${unitName || "units"} @ ৳${unitRate || 10}` : `Approved: ${taskTitle}`,
      description: note || `Earnings for approved deliverable: ${taskTitle} (Rating: ${rating || 10}/10)`,
    });

    res.json({
      success: true,
      txnId,
      message: "Approval and payout successfully recorded in MongoDB Atlas",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
