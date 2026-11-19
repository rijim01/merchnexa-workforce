import { TransactionModel } from "../models/Transaction.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { isDbConnected } from "../config/db.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export interface Transaction {
  id: string;
  employeeEmail: string;
  employeeName: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  date: string;
  method: string;
  reference: string;
  description: string;
}

export class LedgerService {
  /**
   * Append-only ledger addition: strictly logs transaction to MongoDB Atlas
   */
  async recordTransaction(txn: Transaction): Promise<Transaction> {
    if (!Number.isInteger(txn.amount) || txn.amount <= 0) {
      throw new Error("Transaction amount must be a positive whole integer in BDT.");
    }

    if (isDbConnected()) {
      await TransactionModel.create({
        id: txn.id,
        date: txn.date,
        employee: txn.employeeName,
        email: txn.employeeEmail.toLowerCase().trim(),
        type: txn.type,
        amount: txn.amount,
        method: txn.method,
        reference: txn.reference,
        description: txn.description,
      });

      await AuditLogModel.create({
        actor: txn.employeeEmail,
        action: txn.type === "CREDIT" ? "LEDGER_CREDIT" : "LEDGER_DEBIT",
        details: `${txn.type} of ৳${txn.amount} for ${txn.employeeName} (${txn.method} - ${txn.reference})`,
      });
    }

    // Optional mirror to Google Sheets 'Transactions' tab
    sheetsRepo.appendRow("Transactions", [
      txn.id,
      txn.date,
      txn.employeeEmail,
      txn.employeeName,
      txn.type,
      txn.amount,
      txn.method,
      txn.reference,
      txn.description,
    ]).catch(() => {});

    return txn;
  }

  /**
   * Fetch all ledger transactions from MongoDB Atlas
   */
  async getLedger(): Promise<any[]> {
    if (isDbConnected()) {
      return await TransactionModel.find().sort({ createdAt: -1 }).lean();
    }
    return [];
  }

  /**
   * Authoritative balance calculation derived purely from append-only ledger entries
   */
  calculateBalance(transactions: Transaction[], email: string): number {
    const userTxns = transactions.filter((t) => t.employeeEmail.toLowerCase() === email.toLowerCase());
    const credits = userTxns
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const debits = userTxns
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    return credits - debits;
  }
}

export const ledgerService = new LedgerService();
