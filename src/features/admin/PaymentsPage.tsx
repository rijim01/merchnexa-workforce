import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  X,
  Plus,
  Check,
  Search,
} from "lucide-react";
import type { PaymentMethod, TransactionItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function PaymentsPage() {
  const { ledger, setLedger, employeeList, authToken, showToast } = useWorkforce();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Form states
  const [targetEmail, setTargetEmail] = useState(employeeList[0]?.email || "");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>("bKash");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutNote, setPayoutNote] = useState("");

  // Append-only Ledger calculation
  const totalCredits = ledger
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = ledger
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentOutstanding = totalCredits - totalDebits;

  // Individual balances (strictly derived from ledger transactions)
  const employeeBalances = employeeList.map((emp) => {
    const empTxns = ledger.filter((t) => t.email === emp.email);
    const credits = empTxns
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const debits = empTxns
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = credits - debits;

    return {
      ...emp,
      credits,
      debits,
      balance,
    };
  });

  const selectedEmployeeInfo = employeeBalances.find(
    (e) => e.email === targetEmail
  );

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      showToast("Please enter a valid whole number BDT amount.", "error");
      return;
    }

    if (!selectedEmployeeInfo) {
      showToast("Employee not found.", "error");
      return;
    }

    if (amount > selectedEmployeeInfo.balance) {
      showToast(
        `Insufficient balance! ${selectedEmployeeInfo.name} only has ৳${selectedEmployeeInfo.balance.toLocaleString(
          "en-BD"
        )} available.`,
        "warning"
      );
      return;
    }

    if (!payoutRef.trim()) {
      showToast("Please provide payment reference info (e.g. account number & transaction ID).", "warning");
      return;
    }

    const newTransaction: TransactionItem = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      employee: selectedEmployeeInfo.name,
      email: selectedEmployeeInfo.email,
      type: "DEBIT",
      amount,
      date: new Date().toISOString().slice(0, 10),
      method: payoutMethod,
      reference: payoutRef.trim(),
      description: payoutNote.trim() || `Cashout via ${payoutMethod}`,
    };

    // Append to ledger (never overwrite previous transactions)
    setLedger((prev) => [newTransaction, ...prev]);

    try {
      await api.payments.recordCashout(
        {
          employeeEmail: selectedEmployeeInfo.email,
          employeeName: selectedEmployeeInfo.name,
          amount,
          method: payoutMethod,
          reference: payoutRef.trim(),
          description: payoutNote.trim() || `Cashout via ${payoutMethod}`,
        },
        authToken || undefined
      );
    } catch {
      // Local ledger state already updated
    }

    // Reset form
    setPayoutAmount("");
    setPayoutRef("");
    setPayoutNote("");
    setShowPayoutForm(false);
    showToast(`✓ Payout of ৳${amount.toLocaleString("en-BD")} successfully recorded for ${selectedEmployeeInfo.name}!`, "success");
  };

  const filteredLedger = ledger.filter((t) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Credits" && t.type === "CREDIT") ||
      (filter === "Debits" && t.type === "DEBIT");

    const query = search.toLowerCase();
    const matchesSearch =
      t.employee.toLowerCase().includes(query) ||
      t.email.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      t.reference.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Unpaid Balance</p>
            <Wallet size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            ৳{currentOutstanding.toLocaleString("en-BD")}
          </p>
          <p className="mt-1 text-xs text-slate-400">Total liability owed</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Earnings</p>
            <ArrowUpRight size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            ৳{totalCredits.toLocaleString("en-BD")}
          </p>
          <p className="mt-1 text-xs text-slate-400">Approved task credits</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Payouts</p>
            <ArrowDownRight size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            ৳{totalDebits.toLocaleString("en-BD")}
          </p>
          <p className="mt-1 text-xs text-slate-400">Completed cashouts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Transactions</p>
            <CreditCard size={18} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {ledger.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Append-only ledger entries</p>
        </div>
      </div>

      {/* Record Cashout Form Modal / Collapsible */}
      {showPayoutForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Record Employee Payout (Debit)
              </h3>
              <p className="text-xs text-slate-500">
                Log a completed mobile banking or bank cashout.
              </p>
            </div>
            <button
              onClick={() => setShowPayoutForm(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreatePayout} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Select Employee *
              </label>
              <select
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {employeeBalances.map((emp) => (
                  <option key={emp.email} value={emp.email}>
                    {emp.name} (Balance: ৳{emp.balance.toLocaleString("en-BD")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Payout Amount (BDT) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedEmployeeInfo?.balance || 0}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder={
                  selectedEmployeeInfo
                    ? `Max: ৳${selectedEmployeeInfo.balance}`
                    : "Amount"
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Payment Method *
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Reference / TrxID / Number *
              </label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="e.g. 01712345678 / TrxID: BK92841A"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Note / Description (Optional)
              </label>
              <input
                type="text"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="e.g. Bi-weekly project cashout"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowPayoutForm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Check size={14} /> Confirm & Record Debit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Balances Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-900">Employee Balances</h3>
            <p className="text-xs text-slate-500">
              Current available balances calculated strictly as Total Credits - Total Debits.
            </p>
          </div>

          <button
            onClick={() => setShowPayoutForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={15} /> Record New Payout
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {employeeBalances.map((emp) => (
            <div
              key={emp.email}
              className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${emp.color}`}
                >
                  {emp.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {emp.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{emp.role}</p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200/60 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Balance:</span>
                  <span
                    className={`font-bold ${
                      emp.balance > 0 ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    ৳{emp.balance.toLocaleString("en-BD")}
                  </span>
                </div>

                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>Earned: ৳{emp.credits}</span>
                  <span>Paid: ৳{emp.debits}</span>
                </div>

                {emp.balance > 0 && (
                  <button
                    onClick={() => {
                      setTargetEmail(emp.email);
                      setPayoutAmount(String(emp.balance));
                      setShowPayoutForm(true);
                    }}
                    className="mt-2.5 w-full rounded-md bg-white border border-slate-200 py-1 text-center text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Cash Out (৳{emp.balance})
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Append-Only Transaction Ledger
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Immutable history of all task credits and completed debits.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, employee..."
              className="w-full text-sm outline-none sm:w-60"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          {["All", "Credits", "Debits"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Mobile View: Transaction Cards */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {filteredLedger.map((txn) => (
            <div key={txn.id} className="p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700">{txn.id}</span>
                <span className="text-slate-400">{txn.date}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{txn.employee}</p>
                  <p className="text-[11px] text-slate-400">{txn.email}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-bold ${
                      txn.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {txn.type === "CREDIT" ? "+" : "-"}৳{txn.amount.toLocaleString("en-BD")}
                  </span>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">{txn.type}</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{txn.method}</span>
                  <span className="font-mono text-[11px] text-slate-500 truncate">{txn.reference}</span>
                </div>
                <p className="mt-1 text-slate-500 text-[11px]">{txn.description}</p>
              </div>
            </div>
          ))}

          {filteredLedger.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No ledger transactions found.</p>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Txn ID</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Method & Reference</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLedger.map((txn) => (
                <tr key={txn.id} className="text-sm">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                    {txn.id}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {txn.date}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{txn.employee}</p>
                    <p className="text-[11px] text-slate-400">{txn.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {txn.method}
                    </span>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {txn.reference}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {txn.description}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold ${
                        txn.type === "CREDIT"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {txn.type === "CREDIT" ? "+" : "-"}৳
                      {txn.amount.toLocaleString("en-BD")}
                    </span>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">
                      {txn.type}
                    </p>
                  </td>
                </tr>
              ))}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                    No ledger transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
