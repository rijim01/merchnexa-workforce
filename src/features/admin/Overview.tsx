import React from "react";
import {
  Users,
  BriefcaseBusiness,
  Clock,
  CircleDollarSign,
  ChevronRight,
  Activity,
  Plus,
  FileText,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { MetricCard } from "../../components/MetricCard";
import { StatusBadge } from "../../components/StatusBadge";
import { useWorkforce } from "../../context/WorkforceContext";

export function Overview() {
  const { setActive, employeeList, taskList, submissions, ledger } = useWorkforce();

  // Dynamic live calculations
  const activeEmployeesCount = employeeList.filter((e) => e.status === "Active").length;
  const totalTasksCount = taskList.length;
  const pendingReviewsCount = submissions.filter((s) => s.status === "Under Review").length;
  const totalPayouts = ledger
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + l.amount, 0);

  // Agency Profitability Metrics (Admin Executive Overview)
  const totalClientRevenue = taskList.reduce((sum, t) => {
    if (t.clientAmount) return sum + t.clientAmount;
    if (t.paymentType === "PER_UNIT" && t.clientUnitRate && t.targetQuantity) {
      return sum + (t.clientUnitRate * t.targetQuantity);
    }
    return sum;
  }, 0);

  const totalWorkerBudget = taskList.reduce((sum, t) => {
    if (t.paymentType === "PER_UNIT") {
      return sum + (t.payment || 0);
    }
    return sum + ((t.payment || 0) * (t.slots || 1));
  }, 0);
  const totalNetProfit = totalClientRevenue - totalWorkerBudget;
  const overallMargin = totalClientRevenue > 0 ? ((totalNetProfit / totalClientRevenue) * 100).toFixed(1) : "0";

  // Dynamic recent tasks
  const recentTasks = taskList.slice(0, 5);

  // Dynamic recent activities derived from live events
  const dynamicActivities = [
    ...submissions.slice(0, 2).map((s) => ({
      id: `sub-${s.id}`,
      title: `${s.employee} submitted work`,
      detail: `Deliverable submitted for "${s.taskTitle}"`,
      time: s.submittedOn || "Recent",
      icon: CheckCircle2,
    })),
    ...ledger.slice(0, 2).map((l) => ({
      id: `txn-${l.id}`,
      title: l.type === "DEBIT" ? `Payout to ${l.employee}` : `Credit to ${l.employee}`,
      detail: `৳${l.amount.toLocaleString("en-BD")} via ${l.method}`,
      time: l.date || "Recent",
      icon: Wallet,
    })),
  ];

  return (
    <>
      {/* Dynamic Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Employees"
          value={activeEmployeesCount.toString()}
          change={`${employeeList.length} total staff`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Total Tasks"
          value={totalTasksCount.toString()}
          change={`${taskList.filter((t) => t.status === "Open").length} open`}
          icon={BriefcaseBusiness}
          color="bg-violet-50 text-violet-600"
        />
        <MetricCard
          title="Pending Reviews"
          value={pendingReviewsCount.toString()}
          change={pendingReviewsCount > 0 ? `${pendingReviewsCount} awaiting review` : "All caught up"}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
          direction={pendingReviewsCount > 0 ? "up" : "down"}
        />
        <MetricCard
          title="Total Payouts"
          value={`৳${totalPayouts.toLocaleString("en-BD")}`}
          change="Completed cashouts"
          icon={CircleDollarSign}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Executive Financial & Profit Summary */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-400/30">
                Agency Financial Ledger
              </span>
              <span className="text-xs text-slate-400">Client Billing vs Workforce Payouts</span>
            </div>
            <h3 className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Expected Net Profit: ৳{totalNetProfit.toLocaleString("en-BD")}</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {overallMargin}% Margin
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 text-xs w-full sm:w-auto">
            <div className="rounded-xl bg-white/10 p-2 sm:px-4 sm:py-2.5 backdrop-blur-xs text-center sm:text-left">
              <p className="text-slate-400 font-medium text-[10px] sm:text-xs">Client Invoiced</p>
              <p className="text-xs sm:text-base font-bold text-white">৳{totalClientRevenue.toLocaleString("en-BD")}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2 sm:px-4 sm:py-2.5 backdrop-blur-xs text-center sm:text-left">
              <p className="text-slate-400 font-medium text-[10px] sm:text-xs">Workforce Cost</p>
              <p className="text-xs sm:text-base font-bold text-rose-300">৳{totalWorkerBudget.toLocaleString("en-BD")}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-2 sm:px-4 sm:py-2.5 text-center sm:text-left">
              <p className="text-emerald-300 font-medium text-[10px] sm:text-xs">Net Retained</p>
              <p className="text-xs sm:text-base font-bold text-emerald-400">৳{totalNetProfit.toLocaleString("en-BD")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Recent Tasks Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Tasks</h3>
              <p className="mt-1 text-xs text-slate-500">
                Overview of your team's latest tasks and margin
              </p>
            </div>
            <button
              onClick={() => setActive("Tasks")}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all <ChevronRight size={15} />
            </button>
          </div>

          {/* Mobile View: Recent Tasks Cards */}
          <div className="mt-4 space-y-3 sm:hidden">
            {recentTasks.map((task) => {
              const clientRev = task.clientAmount || (task.clientUnitRate && task.targetQuantity ? task.clientUnitRate * task.targetQuantity : 0);
              const profit = clientRev > 0 ? clientRev - task.payment : null;

              return (
                <div
                  key={task.id}
                  onClick={() => setActive("Tasks")}
                  className="rounded-xl border border-slate-100 p-3.5 space-y-2.5 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                    <StatusBadge value={task.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Staff:{" "}
                      {task.assignedEmployees && task.assignedEmployees.length > 0 ? (
                        <b className="text-slate-800">
                          {task.assignedEmployees.join(", ")} ({task.assignedEmployees.length}/{task.slots || 1})
                        </b>
                      ) : (
                        <span className="text-slate-400">Unassigned (0/{task.slots || 1})</span>
                      )}
                    </span>
                    <span>Due: {task.deadline}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                    <span className="text-slate-500">Worker Cost: <b>৳{task.payment.toLocaleString("en-BD")}</b></span>
                    {profit !== null ? (
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Profit: +৳{profit.toLocaleString("en-BD")}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">Direct</span>
                    )}
                  </div>
                </div>
              );
            })}

            {recentTasks.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No tasks published yet.</p>
            )}
          </div>

          {/* Desktop View: Full Table */}
          <div className="mt-5 hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[580px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium">Assigned to</th>
                  <th className="pb-3 font-medium">Deadline</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Worker Cost</th>
                  <th className="pb-3 text-right font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => {
                  const clientRev = task.clientAmount || (task.clientUnitRate && task.targetQuantity ? task.clientUnitRate * task.targetQuantity : 0);
                  const profit = clientRev > 0 ? clientRev - task.payment : null;

                  return (
                    <tr
                      key={task.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition cursor-pointer"
                      onClick={() => setActive("Tasks")}
                    >
                      <td className="py-4 pr-3 text-sm font-medium text-slate-800">
                        {task.title}
                      </td>
                      <td className="py-4 pr-3 text-sm text-slate-600">
                        {task.assignedEmployees && task.assignedEmployees.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {task.assignedEmployees.slice(0, 2).join(", ")}
                              {task.assignedEmployees.length > 2 && ` (+${task.assignedEmployees.length - 2})`}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              {task.assignedEmployees.length}/{task.slots || 1} staff
                            </span>
                          </div>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                            Unassigned (0/{task.slots || 1})
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-3 text-xs text-slate-500">
                        {task.deadline}
                      </td>
                      <td className="py-4 pr-3">
                        <StatusBadge value={task.status} />
                      </td>
                      <td className="py-4 text-right text-sm font-semibold text-slate-700">
                        ৳{task.payment.toLocaleString("en-BD")}
                      </td>
                      <td className="py-4 text-right text-sm font-bold text-emerald-600">
                        {profit !== null ? `+৳${profit.toLocaleString("en-BD")}` : "-"}
                      </td>
                    </tr>
                  );
                })}

                {recentTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                      No tasks published yet. Click "Create Task" to publish your first assignment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              <p className="mt-1 text-xs text-slate-500">
                Latest workspace updates
              </p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-4">
            {dynamicActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                      {activity.detail}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400 font-mono">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}

            {dynamicActivities.length === 0 && (
              <p className="py-10 text-center text-xs text-slate-400">
                No recent workspace activity yet. As employees work and submit deliverables, live events will appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Team Overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Team Overview</h3>
              <p className="mt-1 text-xs text-slate-500">
                Staff registered in your workforce
              </p>
            </div>
            <button
              onClick={() => setActive("Employees")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all ({employeeList.length})
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {employeeList.slice(0, 4).map((employee) => (
              <div
                key={employee.email}
                className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-50 transition"
              >
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                      employee.color || "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {employee.initials || "EM"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {employee.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{employee.role}</p>
                </div>
                <StatusBadge value={employee.status} />
              </div>
            ))}

            {employeeList.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">
                No employees registered yet. Share the portal with your staff to join.
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Quick Actions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Manage your workforce faster
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setActive("Tasks")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <Plus size={17} className="text-blue-600" /> Create Task
            </button>
            <button
              onClick={() => setActive("Employees")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <Users size={17} className="text-blue-600" /> Employees
            </button>
            <button
              onClick={() => setActive("Submissions")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <FileText size={17} className="text-blue-600" /> Review Work
            </button>
            <button
              onClick={() => setActive("Payments")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <Wallet size={17} className="text-blue-600" /> Payments
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
