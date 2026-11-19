import React, { useState } from "react";
import { X, Clock, CheckCircle2, XCircle, AlertCircle, Send } from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function EmployeeEarnings() {
  const {
    currentEmployee,
    ledger,
    cashoutRequests,
    setCashoutRequests,
    refreshCashoutRequests,
    showToast,
    authToken,
  } = useWorkforce();
  const [showCashoutRequest, setShowCashoutRequest] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [cashoutMethod, setCashoutMethod] = useState("bKash");
  const [cashoutAccount, setCashoutAccount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = (currentEmployee?.email || "").toLowerCase().trim();
  const userName = (currentEmployee?.name || "").toLowerCase().trim();

  const myLedger = ledger.filter((l) => {
    const lEmail = (l.email || (l as any).employeeEmail || "").toLowerCase().trim();
    const lName = (l.employee || (l as any).employeeName || "").toLowerCase().trim();
    return (userEmail && lEmail === userEmail) || (userName && lName === userName);
  });

  const totalCredits = myLedger
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => sum + l.amount, 0);

  const totalDebits = myLedger
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + l.amount, 0);

  const balance = totalCredits - totalDebits;

  // Filter requests belonging to this employee
  const myRequests = cashoutRequests.filter((r) => {
    const rEmail = (r.employeeEmail || "").toLowerCase().trim();
    const rName = (r.employeeName || "").toLowerCase().trim();
    return (userEmail && rEmail === userEmail) || (userName && rName === userName);
  });

  const pendingCashoutTotal = myRequests
    .filter((r) => r.status === "Pending")
    .reduce((sum, r) => sum + r.amount, 0);

  const withdrawableBalance = Math.max(0, balance - pendingCashoutTotal);

  const handleRequestCashout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(cashoutAmount);
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      showToast("Please enter a valid whole number BDT amount.", "error");
      return;
    }

    if (amount > withdrawableBalance) {
      showToast(
        `Requested amount exceeds your withdrawable balance of ৳${withdrawableBalance.toLocaleString(
          "en-BD"
        )} (৳${pendingCashoutTotal.toLocaleString("en-BD")} is currently pending admin review).`,
        "warning"
      );
      return;
    }

    if (!cashoutAccount.trim()) {
      showToast("Please provide your mobile banking or bank account number.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeName: currentEmployee?.name || "Staff Member",
        employeeEmail: currentEmployee?.email || userEmail,
        amount,
        method: cashoutMethod,
        accountNumber: cashoutAccount.trim(),
      };

      const res = await api.payments.requestCashout(payload, authToken || undefined);

      if (res?.success && res.request) {
        setCashoutRequests((prev) => [res.request, ...prev]);
        setShowCashoutRequest(false);
        setCashoutAmount("");
        setCashoutAccount("");
        showToast(
          `Cashout request for ৳${amount.toLocaleString(
            "en-BD"
          )} via ${cashoutMethod} submitted to Admin!`,
          "success"
        );
        refreshCashoutRequests().catch(() => {});
      } else {
        throw new Error(res?.error || "Failed to submit cashout request");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to submit cashout request to Admin.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Available Balance
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">
            ৳{balance.toLocaleString("en-BD")}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Ready for cashout: ৳{withdrawableBalance.toLocaleString("en-BD")}</span>
            {pendingCashoutTotal > 0 && (
              <span className="font-semibold text-amber-600">
                (৳{pendingCashoutTotal.toLocaleString("en-BD")} pending)
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Earned
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            ৳{totalCredits.toLocaleString("en-BD")}
          </p>
          <p className="mt-1 text-xs text-slate-400">From completed tasks</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Withdrawn
          </p>
          <p className="mt-2 text-3xl font-extrabold text-blue-600">
            ৳{totalDebits.toLocaleString("en-BD")}
          </p>
          <p className="mt-1 text-xs text-slate-400">Received payouts</p>
        </div>
      </div>

      {/* Cashout Request Action */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 sm:flex-row sm:items-center">
        <div>
          <h4 className="font-bold text-slate-900">
            Need to withdraw your earnings?
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Submit a cashout request to receive your payment via bKash, Nagad, or Bank Transfer.
          </p>
        </div>

        <button
          onClick={() => setShowCashoutRequest(true)}
          disabled={withdrawableBalance <= 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Request Cashout
        </button>
      </div>

      {/* Cashout Modal Form */}
      {showCashoutRequest && (
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900">Request Cashout</h4>
              <p className="text-xs text-slate-500">
                Withdrawable limit: ৳{withdrawableBalance.toLocaleString("en-BD")}
              </p>
            </div>
            <button
              onClick={() => setShowCashoutRequest(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleRequestCashout}
            className="grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Amount (BDT) *
              </label>
              <input
                type="number"
                min="50"
                max={withdrawableBalance}
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                placeholder={`Max ৳${withdrawableBalance}`}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Payment Channel *
              </label>
              <select
                value={cashoutMethod}
                onChange={(e) => setCashoutMethod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-emerald-500"
              >
                <option value="bKash">bKash (Personal)</option>
                <option value="Nagad">Nagad (Personal)</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Account / Mobile Number *
              </label>
              <input
                type="text"
                value={cashoutAccount}
                onChange={(e) => setCashoutAccount(e.target.value)}
                placeholder="017XXXXXXXX"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-3">
              <button
                type="button"
                onClick={() => setShowCashoutRequest(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send size={13} />
                {isSubmitting ? "Submitting..." : "Send Cashout Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cashout Requests Queue & History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                My Cashout Requests
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Track status of your withdrawal requests submitted to Admin.
              </p>
            </div>
            {pendingCashoutTotal > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200 flex items-center gap-1">
                <Clock size={12} />
                ৳{pendingCashoutTotal.toLocaleString("en-BD")} Pending
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {myRequests.map((req) => (
            <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800">{req.id}</span>
                  {req.status === "Pending" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                      <Clock size={11} />
                      Pending Admin Review
                    </span>
                  )}
                  {req.status === "Paid" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={11} />
                      Paid & Disbursed
                    </span>
                  )}
                  {req.status === "Rejected" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                      <XCircle size={11} />
                      Rejected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{req.method}</span> • {req.accountNumber} • Requested on {req.requestedDate}
                </p>
                {req.status === "Paid" && req.transactionRef && (
                  <p className="text-[11px] font-mono text-emerald-700 bg-emerald-50/70 rounded px-2 py-0.5 w-fit">
                    TrxID / Ref: {req.transactionRef} {req.processedDate ? `(${req.processedDate})` : ""}
                  </p>
                )}
                {req.status === "Rejected" && req.adminNote && (
                  <p className="text-[11px] text-rose-600 bg-rose-50/70 rounded px-2 py-0.5 w-fit">
                    Admin Note: {req.adminNote}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <p className="text-lg font-extrabold text-slate-900">
                  ৳{req.amount.toLocaleString("en-BD")}
                </p>
                <p className="text-[10px] text-slate-400">
                  {req.status === "Pending" ? "Processing payout" : req.status === "Paid" ? "Credited to wallet" : "Returned to balance"}
                </p>
              </div>
            </div>
          ))}

          {myRequests.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No cashout requests submitted yet.
            </div>
          )}
        </div>
      </div>

      {/* Personal Ledger History Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">
            Personal Financial History (Append-Only)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Every task reward and cashout transaction recorded in your personal ledger.
          </p>
        </div>

        {/* Mobile View: Personal Ledger Cards */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {myLedger.map((txn) => (
            <div key={txn.id} className="p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700">{txn.id}</span>
                <span className="text-slate-400">{txn.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      txn.type === "CREDIT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-red-50 text-red-700 border border-red-100"
                    }`}
                  >
                    {txn.type}
                  </span>
                  <span className="ml-2 font-semibold text-slate-700 text-xs">{txn.method}</span>
                </div>
                <span
                  className={`text-base font-bold ${
                    txn.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {txn.type === "CREDIT" ? "+" : "-"}৳{txn.amount.toLocaleString("en-BD")}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">{txn.reference}</p>
              <p className="text-xs text-slate-600">{txn.description}</p>
            </div>
          ))}

          {myLedger.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No ledger transactions recorded yet.</p>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Txn ID</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Method & Reference</th>
                <th className="px-5 py-3 font-medium">Details</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {myLedger.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">
                    {txn.id}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{txn.date}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        txn.type === "CREDIT"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="font-medium">{txn.method}</span>
                    <p className="font-mono text-[11px] text-slate-400">
                      {txn.reference}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {txn.description}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold">
                    <span
                      className={
                        txn.type === "CREDIT"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }
                    >
                      {txn.type === "CREDIT" ? "+" : "-"}৳
                      {txn.amount.toLocaleString("en-BD")}
                    </span>
                  </td>
                </tr>
              ))}

              {myLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transactions recorded yet.
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
