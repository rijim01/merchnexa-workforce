import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { ledgerService } from "../services/ledgerService.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { CashoutRequestModel } from "../models/CashoutRequest.js";
import { AuditLogModel } from "../models/AuditLog.js";

export const paymentRouter = Router();

// Get financial ledger transactions
paymentRouter.get("/ledger", async (req, res) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }
    const txns = await ledgerService.getLedger();
    return res.json({ success: true, ledger: txns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin records a direct manual cashout (Debit)
paymentRouter.post("/cashout", authMiddleware, requireAdmin, async (req, res) => {
  const { employeeEmail, employeeName, amount, method, reference, description } = req.body;

  if (!employeeEmail || !amount || !method || !reference) {
    res.status(400).json({ error: "Missing required payment parameters" });
    return;
  }

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    const txn = await ledgerService.recordTransaction({
      id: `TXN-${Date.now().toString().slice(-4)}`,
      employeeEmail,
      employeeName,
      type: "DEBIT",
      amount: Math.round(Number(amount)),
      date: new Date().toISOString().slice(0, 10),
      method,
      reference,
      description: description || `Cashout via ${method}`,
    });

    res.status(201).json({ success: true, transaction: txn });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/payments/cashout-requests - Fetch all employee cashout requests
paymentRouter.get("/cashout-requests", async (req, res) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    const requests = await CashoutRequestModel.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch cashout requests" });
  }
});

// POST /api/payments/cashout-requests - Employee submits a cashout request
paymentRouter.post("/cashout-requests", authMiddleware, async (req, res) => {
  const { employeeName, employeeEmail, amount, method, accountNumber } = req.body;

  const targetEmail = (employeeEmail || req.user?.email || "").toLowerCase().trim();
  const targetName = (employeeName || req.user?.name || req.user?.displayName || "Staff Member").trim();

  if (!targetEmail) {
    return res.status(400).json({ error: "Employee email is required" });
  }

  const numAmount = Math.round(Number(amount));
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: "Cashout amount must be a positive integer in BDT" });
  }

  if (!accountNumber || !accountNumber.toString().trim()) {
    return res.status(400).json({ error: "Account / Phone number is required" });
  }

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    // 1. Check employee balance against append-only ledger
    const txns = await ledgerService.getLedger();
    const balance = ledgerService.calculateBalance(txns, targetEmail);

    // 2. Check existing pending requests to avoid overdrawing
    const existingPending = await CashoutRequestModel.find({
      employeeEmail: targetEmail,
      status: "Pending",
    }).lean();
    const pendingTotal = existingPending.reduce((sum, r) => sum + r.amount, 0);

    if (numAmount + pendingTotal > balance) {
      return res.status(400).json({
        error: `Insufficient available balance. You have ৳${balance.toLocaleString(
          "en-BD"
        )} total, with ৳${pendingTotal.toLocaleString(
          "en-BD"
        )} in pending cashout requests. Max withdrawable now is ৳${Math.max(
          0,
          balance - pendingTotal
        ).toLocaleString("en-BD")}.`,
      });
    }

    // 3. Create cashout request in MongoDB
    const requestId = `CR-${Date.now().toString().slice(-6)}`;
    const newRequest = await CashoutRequestModel.create({
      id: requestId,
      employeeName: targetName,
      employeeEmail: targetEmail,
      amount: numAmount,
      method: method || "bKash",
      accountNumber: accountNumber.toString().trim(),
      status: "Pending",
      requestedDate: new Date().toISOString().slice(0, 10),
    });

    // 4. Audit Log
    await AuditLogModel.create({
      actor: targetEmail,
      action: "CASHOUT_REQUEST_CREATED",
      details: `Cashout request ${requestId} of ৳${numAmount} via ${method || "bKash"} by ${targetName} (${accountNumber})`,
    });

    return res.status(201).json({
      success: true,
      request: newRequest,
      message: `Cashout request for ৳${numAmount} submitted to Admin successfully!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit cashout request" });
  }
});

// PATCH /api/payments/cashout-requests/:id/approve - Admin approves cashout and records DEBIT
paymentRouter.patch("/cashout-requests/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { transactionRef, adminNote } = req.body;

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    const request = await CashoutRequestModel.findOne({ id });
    if (!request) {
      return res.status(404).json({ error: "Cashout request not found" });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    const reference = (transactionRef || request.accountNumber || "Cashout Approved").trim();

    // 1. Record DEBIT in append-only ledger
    const txnId = `TXN-${Date.now().toString().slice(-4)}`;
    const txn = await ledgerService.recordTransaction({
      id: txnId,
      employeeEmail: request.employeeEmail,
      employeeName: request.employeeName,
      type: "DEBIT",
      amount: request.amount,
      date: new Date().toISOString().slice(0, 10),
      method: request.method,
      reference,
      description: adminNote || `Cashout Approved via ${request.method} (${request.accountNumber})`,
    });

    // 2. Mark request as Paid
    request.status = "Paid";
    request.processedDate = new Date().toISOString().slice(0, 10);
    request.transactionRef = reference;
    request.adminNote = adminNote || "";
    await request.save();

    // 3. Audit Log
    await AuditLogModel.create({
      actor: req.user?.email || "Admin",
      action: "CASHOUT_REQUEST_APPROVED",
      details: `Approved cashout ${request.id} of ৳${request.amount} for ${request.employeeName}. TrxID: ${reference}`,
    });

    return res.json({
      success: true,
      request,
      transaction: txn,
      message: `Cashout request ${request.id} approved and ৳${request.amount} paid!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to approve cashout request" });
  }
});

// PATCH /api/payments/cashout-requests/:id/reject - Admin rejects cashout request
paymentRouter.patch("/cashout-requests/:id/reject", authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;

  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    const request = await CashoutRequestModel.findOne({ id });
    if (!request) {
      return res.status(404).json({ error: "Cashout request not found" });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = "Rejected";
    request.processedDate = new Date().toISOString().slice(0, 10);
    request.adminNote = adminNote || "Rejected by Admin";
    await request.save();

    // Audit Log
    await AuditLogModel.create({
      actor: req.user?.email || "Admin",
      action: "CASHOUT_REQUEST_REJECTED",
      details: `Rejected cashout ${request.id} for ${request.employeeName}. Reason: ${adminNote || "None"}`,
    });

    return res.json({
      success: true,
      request,
      message: `Cashout request ${request.id} rejected.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to reject cashout request" });
  }
});
