import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";
import { ledgerService } from "../services/ledgerService.js";

export const submissionRouter = Router();

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
  const submissionRow = [
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
  ];

  try {
    // Append to 'Submissions' tab in Google Sheets
    await sheetsRepo.appendRow("Submissions", submissionRow);

    // Record audit log
    await sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      email || req.user?.email || "Employee",
      "SUBMIT_DELIVERABLE",
      `Deliverable submitted for "${taskTitle}" (${deliverableUrl})`,
    ]);

    res.status(201).json({ success: true, subId, message: "Submission recorded in Google Sheets" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin approves submission and releases payout to ledger
submissionRouter.patch("/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
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

    // 1. Credit employee ledger in 'Transactions' tab
    await ledgerService.recordTransaction({
      id: txnId,
      employeeEmail: email,
      employeeName: employee || "Staff Member",
      type: "CREDIT",
      amount: finalAmount,
      date: new Date().toISOString().slice(0, 10),
      method: "System Credit",
      reference: approvedQuantity ? `Approved ${approvedQuantity} ${unitName || "units"} @ ৳${unitRate || 10}` : `Approved: ${taskTitle}`,
      description: note || `Earnings for approved deliverable: ${taskTitle} (Rating: ${rating || 10}/10)`,
    });

    // 2. Record audit log
    await sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      req.user?.email || "Admin",
      "APPROVE_SUBMISSION",
      `Approved "${taskTitle}" by ${employee}. Credited ৳${finalAmount} (Score: ${rating || 10}/10)`,
    ]);

    res.json({ success: true, txnId, message: "Approval and payout credited to Google Sheets" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
