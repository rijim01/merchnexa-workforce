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
   * Append-only ledger addition: strictly logs transaction and appends to Google Sheet
   */
  async recordTransaction(txn: Transaction): Promise<Transaction> {
    if (!Number.isInteger(txn.amount) || txn.amount <= 0) {
      throw new Error("Transaction amount must be a positive whole integer in BDT.");
    }

    // Append to Google Sheets 'Transactions' tab
    await sheetsRepo.appendRow("Transactions", [
      txn.id,
      txn.date,
      txn.employeeEmail,
      txn.employeeName,
      txn.type,
      txn.amount,
      txn.method,
      txn.reference,
      txn.description,
    ]);

    return txn;
  }

  /**
   * Authoritative balance calculation derived purely from append-only ledger entries
   */
  calculateBalance(transactions: Transaction[], email: string): number {
    const userTxns = transactions.filter((t) => t.employeeEmail === email);
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
