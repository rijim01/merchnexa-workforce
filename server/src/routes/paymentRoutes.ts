import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/rbacMiddleware.js";
import { ledgerService } from "../services/ledgerService.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const paymentRouter = Router();

// Get financial ledger transactions
paymentRouter.get("/ledger", authMiddleware, async (req, res) => {
  try {
    const txns = await ledgerService.getLedger();
    if (txns && txns.length > 0) {
      return res.json({ success: true, ledger: txns });
    }
    const rows = await sheetsRepo.readRows("Transactions");
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin records a completed cashout (Debit)
paymentRouter.post("/cashout", authMiddleware, requireAdmin, async (req, res) => {
  const { employeeEmail, employeeName, amount, method, reference, description } = req.body;

  if (!employeeEmail || !amount || !method || !reference) {
    res.status(400).json({ error: "Missing required payment parameters" });
    return;
  }

  try {
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
