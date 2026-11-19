import React from "react";
import { ChevronRight } from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";

export function EmployeeDashboard() {
  const {
    currentEmployee,
    taskList,
    assignments,
    submissions,
    ledger,
    setActive,
  } = useWorkforce();

  const myAssignments = assignments.filter(
    (a) => a.email === currentEmployee.email
  );
  const mySubmissions = submissions.filter(
    (s) => s.email === currentEmployee.email
  );
  const myLedger = ledger.filter((l) => l.email === currentEmployee.email);

  const totalCredits = myLedger
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => sum + l.amount, 0);
  const totalDebits = myLedger
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + l.amount, 0);
  const myBalance = totalCredits - totalDebits;

  const underReviewCount = mySubmissions.filter(
    (s) => s.status === "Under Review"
  ).length;
  const approvedCount = mySubmissions.filter(
    (s) => s.status === "Approved"
  ).length;
  const openTasksCount = taskList.filter((t) => t.status === "Open").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Staff Portal • {currentEmployee.role}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {currentEmployee.name}!
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Track your assignments, deliver projects, and monitor your earnings in BDT.
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md sm:text-right">
            <p className="text-xs uppercase tracking-wider text-blue-200">
              Available Balance
            </p>
            <p className="mt-1 text-2xl font-extrabold text-white">
              ৳{myBalance.toLocaleString("en-BD")}
            </p>
            <button
              onClick={() => setActive("My Earnings")}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
            >
              View Ledger <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active Tasks</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {myAssignments.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Assigned to you</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Under Review</p>
          <p className="mt-2 text-2xl font-bold text-violet-600">
            {underReviewCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Submissions awaiting admin</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Completed Work</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {approvedCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Approved deliverables</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Available Tasks</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {openTasksCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Open for application</p>
        </div>
      </div>

      {/* Active Tasks & Opportunities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Current Assigned Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900">My Current Tasks</h3>
              <p className="text-xs text-slate-500">
                Assigned projects you are working on
              </p>
            </div>
            <button
              onClick={() => setActive("My Tasks")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {myAssignments.map((task) => (
              <div
                key={task.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h4 className="font-semibold text-slate-800">
                    {task.taskTitle}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Deadline: {task.deadline} · Payment: ৳
                    {task.payment.toLocaleString("en-BD")}
                  </p>
                </div>

                <button
                  onClick={() => setActive("My Tasks")}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Submit Work
                </button>
              </div>
            ))}

            {myAssignments.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                You have no active assignments right now.
              </p>
            )}
          </div>
        </div>

        {/* Available Opportunities */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900">Open Opportunities</h3>
              <p className="text-xs text-slate-500">
                Apply for new tasks matching your skills
              </p>
            </div>
            <button
              onClick={() => setActive("Available Tasks")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Browse all
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {taskList
              .filter((t) => t.status === "Open")
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800">{task.title}</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Due: {task.deadline} · Reward: ৳
                      {task.payment.toLocaleString("en-BD")}
                    </p>
                  </div>

                  <button
                    onClick={() => setActive("Available Tasks")}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
