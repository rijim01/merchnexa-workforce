import React, { useState } from "react";
import {
  Download,
  Calendar,
  TrendingUp,
  Award,
  Wallet,
  CheckCircle2,
  FileSpreadsheet,
  Star,
  Trophy,
  Crown,
  Building2,
} from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { StatusBadge } from "../../components/StatusBadge";

export function ReportsPage() {
  const { taskList, submissions, ledger, employeeList } = useWorkforce();
  const [timeframe, setTimeframe] = useState("All Time");

  // Calculations
  const completedTasks = taskList.filter((t) => t.status === "Completed" || t.status === "Closed");
  const inProgressTasks = taskList.filter((t) => t.status === "In Progress" || t.status === "Assigned");

  const totalCredits = ledger
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = ledger
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const outstandingBalance = totalCredits - totalDebits;

  // Completion Rate
  const totalTrackedTasks = taskList.length || 1;
  const completionRate = Math.round((completedTasks.length / totalTrackedTasks) * 100);

  // Worker Rankings based on Completed Tasks & Performance Points (out of 10)
  const workerStats = employeeList.map((emp) => {
    const empSubmissions = submissions.filter((s) => s.email === emp.email);
    const approvedSubs = empSubmissions.filter((s) => s.status === "Approved");
    const completedCount = approvedSubs.length;

    // Sum rating points (defaults to 8.5 if not yet rated)
    const totalRatingPoints = approvedSubs.reduce((sum, s) => sum + (s.rating || 9), 0);
    const avgRating = completedCount > 0 ? Number((totalRatingPoints / completedCount).toFixed(1)) : 0;

    // Combined Rank Score: Completed Tasks * Avg Rating
    const rankScore = Number((completedCount * (avgRating || 0)).toFixed(1));

    const empCredits = ledger
      .filter((t) => t.email === emp.email && t.type === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const empDebits = ledger
      .filter((t) => t.email === emp.email && t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      name: emp.name,
      email: emp.email,
      role: emp.role,
      photoUrl: emp.photoUrl,
      initials: emp.initials,
      color: emp.color,
      completedCount,
      avgRating,
      rankScore,
      earned: empCredits,
      paid: empDebits,
      balance: empCredits - empDebits,
    };
  }).sort((a, b) => {
    if (b.rankScore !== a.rankScore) {
      return b.rankScore - a.rankScore;
    }
    return b.avgRating - a.avgRating;
  });

  // Top 3 Podium
  const top1 = workerStats[0];
  const top2 = workerStats[1];
  const top3 = workerStats[2];

  // CSV Export utility
  const handleExportCSV = (type: "ledger" | "performance" | "profitability") => {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (type === "ledger") {
      csvContent += "ID,Date,Employee,Email,Type,Amount (BDT),Method,Reference,Description\n";
      ledger.forEach((t) => {
        csvContent += `"${t.id}","${t.date}","${t.employee}","${t.email}","${t.type}","${t.amount}","${t.method}","${t.reference}","${t.description}"\n`;
      });
    } else if (type === "performance") {
      csvContent += "Rank,Employee,Email,Role,Completed Tasks,Avg Rating (Out of 10),Rank Score,Total Earned (BDT),Total Paid (BDT),Pending Balance (BDT)\n";
      workerStats.forEach((w, idx) => {
        csvContent += `"${idx + 1}","${w.name}","${w.email}","${w.role}","${w.completedCount}","${w.avgRating} / 10","${w.rankScore}","${w.earned}","${w.paid}","${w.balance}"\n`;
      });
    } else if (type === "profitability") {
      csvContent += "Task Title,Client,Pricing Model,Allowed Workers,Payment per Worker (BDT),Client Billing (BDT),Total Worker Cost (BDT),Net Profit (BDT),Margin (%),Status\n";
      taskList.forEach((t) => {
        const clientRev = t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0);
        const workerCost = t.paymentType === "PER_UNIT" ? (t.payment || 0) : ((t.payment || 0) * (t.slots || 1));
        const profit = clientRev > 0 ? clientRev - workerCost : 0;
        const margin = clientRev > 0 ? ((profit / clientRev) * 100).toFixed(1) : "0";
        csvContent += `"${t.title}","${t.clientName || 'Direct Client'}","${t.paymentType || 'FIXED'}","${t.slots || 1}","${t.payment}","${clientRev}","${workerCost}","${profit}","${margin}%","${t.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MerchNexa_${type}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeframe:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none shadow-sm focus:border-blue-600"
          >
            <option value="All Time">All Time</option>
            <option value="This Month">This Month (November 2026)</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV("profitability")}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
          >
            <TrendingUp size={14} />
            <span>Export Profitability CSV</span>
          </button>
          <button
            onClick={() => handleExportCSV("ledger")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export Ledger CSV</span>
          </button>
          <button
            onClick={() => handleExportCSV("performance")}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Download size={14} />
            <span>Export Rank Report</span>
          </button>
        </div>
      </div>

      {/* 🏆 Top 3 Rank Podium Showcase (Admin Only) */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Employee Performance Rankings</h3>
              <p className="text-xs text-slate-300">
                Formula: <b>Tasks Completed × Avg Quality Score (out of 10)</b>. (Visible only to Admin)
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-300">
            Admin Governance View
          </span>
        </div>

        {/* Podium cards */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {!top1 && (
            <div className="sm:col-span-3 rounded-xl border border-white/10 bg-white/5 py-10 px-4 text-center backdrop-blur-sm">
              <Trophy size={28} className="mx-auto text-amber-400/60 mb-2" />
              <p className="text-sm font-semibold text-white">No performance rankings yet</p>
              <p className="mt-1 text-xs text-slate-300 max-w-md mx-auto">
                Once employees complete assignments and you assign quality ratings (1–10), the Top 3 Podium and composite ranking score will automatically calculate here.
              </p>
            </div>
          )}

          {top1 && (
            <div className="relative rounded-xl border border-amber-400/40 bg-white/10 p-4 text-center backdrop-blur-sm shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-sm flex items-center gap-1">
                <Crown size={12} /> Rank #1
              </span>
              <div className="mt-2 flex justify-center">
                {top1.photoUrl ? (
                  <img src={top1.photoUrl} alt={top1.name} className="h-16 w-16 rounded-full border-2 border-amber-400 object-cover shadow-sm" />
                ) : (
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${top1.color}`}>
                    {top1.initials}
                  </div>
                )}
              </div>
              <h4 className="mt-2 text-sm font-bold text-white">{top1.name}</h4>
              <p className="text-[11px] text-slate-300">{top1.role}</p>
              <div className="mt-3 flex items-center justify-center gap-3 border-t border-white/10 pt-2 text-xs">
                <span>Tasks: <b className="text-amber-300">{top1.completedCount}</b></span>
                <span>Rating: <b className="text-amber-300">⭐ {top1.avgRating}/10</b></span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-amber-300">Rank Score: {top1.rankScore} pts</p>
            </div>
          )}

          {top2 && (
            <div className="relative rounded-xl border border-slate-300/30 bg-white/5 p-4 text-center backdrop-blur-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-300 px-3 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-sm">
                Rank #2
              </span>
              <div className="mt-2 flex justify-center">
                {top2.photoUrl ? (
                  <img src={top2.photoUrl} alt={top2.name} className="h-14 w-14 rounded-full border-2 border-slate-300 object-cover shadow-sm" />
                ) : (
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold ${top2.color}`}>
                    {top2.initials}
                  </div>
                )}
              </div>
              <h4 className="mt-2 text-sm font-bold text-white">{top2.name}</h4>
              <p className="text-[11px] text-slate-300">{top2.role}</p>
              <div className="mt-3 flex items-center justify-center gap-3 border-t border-white/10 pt-2 text-xs">
                <span>Tasks: <b>{top2.completedCount}</b></span>
                <span>Rating: <b>⭐ {top2.avgRating}/10</b></span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-slate-300">Rank Score: {top2.rankScore} pts</p>
            </div>
          )}

          {top3 && (
            <div className="relative rounded-xl border border-amber-700/40 bg-white/5 p-4 text-center backdrop-blur-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-700 px-3 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                Rank #3
              </span>
              <div className="mt-2 flex justify-center">
                {top3.photoUrl ? (
                  <img src={top3.photoUrl} alt={top3.name} className="h-14 w-14 rounded-full border-2 border-amber-600 object-cover shadow-sm" />
                ) : (
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold ${top3.color}`}>
                    {top3.initials}
                  </div>
                )}
              </div>
              <h4 className="mt-2 text-sm font-bold text-white">{top3.name}</h4>
              <p className="text-[11px] text-slate-300">{top3.role}</p>
              <div className="mt-3 flex items-center justify-center gap-3 border-t border-white/10 pt-2 text-xs">
                <span>Tasks: <b>{top3.completedCount}</b></span>
                <span>Rating: <b>⭐ {top3.avgRating}/10</b></span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-amber-500">Rank Score: {top3.rankScore} pts</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Disbursed</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Wallet size={18} />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">৳{totalDebits.toLocaleString("en-BD")}</h3>
          <p className="mt-1 text-xs text-slate-500">Paid out via bKash / Nagad / Bank</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Liability</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-bold text-amber-600">৳{outstandingBalance.toLocaleString("en-BD")}</h3>
          <p className="mt-1 text-xs text-slate-500">Earned by staff, awaiting cashout</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Success Rate</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">{completionRate}%</h3>
          <p className="mt-1 text-xs text-slate-500">{completedTasks.length} of {taskList.length} tasks completed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In-Flight Tasks</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <Award size={18} />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">{inProgressTasks.length}</h3>
          <p className="mt-1 text-xs text-slate-500">Currently active with employees</p>
        </div>
      </div>

      {/* Comprehensive Workforce Ranking Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Complete Staff Ranking & Scoreboard</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Rank score is calculated dynamically based on total approved tasks and admin review points (1–10).
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {employeeList.length} Active Staff
          </span>
        </div>

        {/* Mobile View: Scoreboard Cards */}
        <div className="mt-4 space-y-3 sm:hidden">
          {workerStats.map((w, idx) => (
            <div key={w.email} className="rounded-xl border border-slate-100 p-3.5 space-y-2 bg-slate-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-500">#{idx + 1}</span>
                  <p className="font-bold text-slate-900 text-sm">{w.name}</p>
                </div>
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                  {w.rankScore} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Completed: <b>{w.completedCount} tasks</b></span>
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <Star size={11} className="fill-amber-500" /> {w.avgRating}/10
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                <span className="text-slate-500">Earned: ৳{w.earned.toLocaleString("en-BD")}</span>
                <span className="font-bold text-emerald-600">Balance: ৳{w.balance.toLocaleString("en-BD")}</span>
              </div>
            </div>
          ))}

          {workerStats.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No staff rankings yet.</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="mt-4 hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold text-center">Rank</th>
                <th className="px-4 py-3 font-semibold">Staff Member</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold text-center">Tasks Completed</th>
                <th className="px-4 py-3 font-semibold text-center">Avg Rating (Out of 10)</th>
                <th className="px-4 py-3 font-semibold text-center">Composite Score</th>
                <th className="px-4 py-3 font-semibold text-right">Total Earned</th>
                <th className="px-4 py-3 font-semibold text-right">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workerStats.map((w, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <tr key={w.email} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 text-center">
                      {isTop1 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800 text-xs">
                          🥇 #1
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-200 px-2.5 py-0.5 font-bold text-slate-800 text-xs">
                          🥈 #2
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-200/60 px-2.5 py-0.5 font-bold text-amber-900 text-xs">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 text-xs">
                          #{idx + 1}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {w.photoUrl ? (
                          <img src={w.photoUrl} alt={w.name} className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${w.color}`}>
                            {w.initials}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800">{w.name}</p>
                          <p className="text-[11px] text-slate-400">{w.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">{w.role}</td>

                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {w.completedCount}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        <Star size={11} className="fill-amber-500 text-amber-500" />
                        {w.avgRating} / 10
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 border border-blue-100">
                        {w.rankScore} pts
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                      ৳{w.earned.toLocaleString("en-BD")}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                      ৳{w.balance.toLocaleString("en-BD")}
                    </td>
                  </tr>
                );
              })}

              {workerStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                    No staff records found. Once employees register and work on projects, rankings will show here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 💼 Project & Task Profitability Breakdown Table (Admin Only) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">Task Profitability & Margin Breakdown</h3>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Confidential Admin View
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Realized client billing amount, total employee payout cost, and net retained profit per task.
            </p>
          </div>
          <button
            onClick={() => handleExportCSV("profitability")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" /> Download Sheet
          </button>
        </div>

        {/* Mobile View: Task Profitability Cards */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {taskList.map((task) => {
            const clientRev = task.clientAmount || (task.clientUnitRate && task.targetQuantity ? task.clientUnitRate * task.targetQuantity : 0);
            const workerCost = task.paymentType === "PER_UNIT" ? (task.payment || 0) : ((task.payment || 0) * (task.slots || 1));
            const netProfit = clientRev > 0 ? clientRev - workerCost : 0;
            const margin = clientRev > 0 ? ((netProfit / clientRev) * 100).toFixed(1) : "0";

            return (
              <div key={task.id} className="p-4 space-y-2 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
                  <StatusBadge value={task.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Client: <b>{task.clientName || "Direct Client"}</b></span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {margin}% Margin
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50 p-2 text-center text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Client</span>
                    <b className="text-slate-800">৳{clientRev.toLocaleString("en-BD")}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cost</span>
                    <b className="text-rose-600">৳{workerCost.toLocaleString("en-BD")}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Profit</span>
                    <b className="text-emerald-700">+৳{netProfit.toLocaleString("en-BD")}</b>
                  </div>
                </div>
              </div>
            );
          })}

          {taskList.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No tasks logged yet.</p>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3">Task Title</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3 text-right">Client Billed</th>
                <th className="px-4 py-3 text-right">Workforce Cost</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
                <th className="px-4 py-3 text-center">Margin</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskList.map((task) => {
                const clientRev = task.clientAmount || (task.clientUnitRate && task.targetQuantity ? task.clientUnitRate * task.targetQuantity : 0);
                const workerCost = task.paymentType === "PER_UNIT" ? (task.payment || 0) : ((task.payment || 0) * (task.slots || 1));
                const netProfit = clientRev > 0 ? clientRev - workerCost : 0;
                const margin = clientRev > 0 ? ((netProfit / clientRev) * 100).toFixed(1) : "0";

                return (
                  <tr key={task.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {task.title}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {task.clientName ? (
                        <span className="flex items-center gap-1 font-medium text-indigo-900">
                          <Building2 size={12} className="text-indigo-500" />
                          {task.clientName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Direct Client</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {task.paymentType === "PER_UNIT" ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                          ৳{task.unitRate}/{task.unitName || "unit"}
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Fixed ({task.slots || 1} staff)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      ৳{clientRev.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-rose-600">
                      ৳{workerCost.toLocaleString("en-BD")}
                      {task.paymentType !== "PER_UNIT" && (task.slots || 1) > 1 && (
                        <span className="text-[10px] text-slate-400 block">
                          (৳{task.payment} × {task.slots})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">
                      +৳{netProfit.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        {margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge value={task.status} />
                    </td>
                  </tr>
                );
              })}

              {taskList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                    No tasks published yet. Profit metrics will populate as tasks are created.
                  </td>
                </tr>
              )}
            </tbody>
            {taskList.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-[11px] text-slate-500">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right">
                    ৳{taskList
                      .reduce((sum, t) => sum + (t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0)), 0)
                      .toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600">
                    ৳{taskList
                      .reduce((sum, t) => sum + (t.paymentType === "PER_UNIT" ? (t.payment || 0) : ((t.payment || 0) * (t.slots || 1))), 0)
                      .toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 text-sm">
                    +৳{taskList
                      .reduce((sum, t) => {
                        const clientRev = t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0);
                        const workerCost = t.paymentType === "PER_UNIT" ? (t.payment || 0) : ((t.payment || 0) * (t.slots || 1));
                        return sum + (clientRev > 0 ? (clientRev - workerCost) : 0);
                      }, 0)
                      .toLocaleString("en-BD")}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-center text-emerald-700">
                    {(() => {
                      const totalRev = taskList.reduce((sum, t) => sum + (t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0)), 0);
                      const totalCost = taskList.reduce((sum, t) => sum + (t.paymentType === "PER_UNIT" ? (t.payment || 0) : ((t.payment || 0) * (t.slots || 1))), 0);
                      const totalNet = totalRev - totalCost;
                      return totalRev > 0 ? `${((totalNet / totalRev) * 100).toFixed(1)}% Avg Margin` : "-";
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
