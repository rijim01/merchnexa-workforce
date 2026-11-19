import React from "react";
import { ChevronRight, Clock } from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { getTimeRemaining } from "./EmployeeMyTasks";
import type { AssignmentItem } from "../../types";

export function EmployeeDashboard() {
  const {
    currentEmployee,
    taskList,
    applications,
    assignments,
    submissions,
    ledger,
    setActive,
  } = useWorkforce();

  const userEmail = (currentEmployee?.email || "").toLowerCase().trim();
  const userName = (currentEmployee?.name || "").toLowerCase().trim();

  const assignedMap = new Map<string, AssignmentItem>();

  assignments.forEach((a) => {
    const aEmail = (a.email || "").toLowerCase().trim();
    const aName = (a.employee || "").toLowerCase().trim();
    if (aEmail === userEmail || (userEmail && aEmail.includes(userEmail)) || (userName && aName === userName)) {
      assignedMap.set(a.taskTitle, a);
    }
  });

  applications
    .filter(
      (app) =>
        app.status === "Accepted" &&
        ((app.email && app.email.toLowerCase().trim() === userEmail) ||
          (app.employee && app.employee.toLowerCase().trim() === userName))
    )
    .forEach((app) => {
      if (!assignedMap.has(app.taskTitle)) {
        const targetTask = taskList.find((t) => t.title === app.taskTitle);
        assignedMap.set(app.taskTitle, {
          id: app.id,
          applicationId: app.id,
          employee: app.employee || currentEmployee.name,
          email: app.email || currentEmployee.email,
          taskTitle: app.taskTitle,
          assignedOn: app.appliedOn || new Date().toISOString().slice(0, 10),
          deadline: targetTask?.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          payment: targetTask?.payment || 0,
          status: "Assigned",
          paymentType: targetTask?.paymentType,
          unitRate: targetTask?.unitRate,
          unitName: targetTask?.unitName,
          targetQuantity: targetTask?.targetQuantity,
        });
      }
    });

  taskList.forEach((t) => {
    const isAssigned =
      t.assignedEmployeeEmails?.some((em: string) => em.toLowerCase().trim() === userEmail) ||
      t.assignedEmployees?.some(
        (name: string) => name.toLowerCase().trim() === userName || name.toLowerCase().trim() === userEmail
      );

    if (isAssigned && !assignedMap.has(t.title)) {
      assignedMap.set(t.title, {
        id: t.id,
        applicationId: t.id,
        employee: currentEmployee.name,
        email: currentEmployee.email,
        taskTitle: t.title,
        assignedOn: new Date().toISOString().slice(0, 10),
        deadline: t.deadline,
        payment: t.payment,
        status: "Assigned",
        paymentType: t.paymentType,
        unitRate: t.unitRate,
        unitName: t.unitName,
        targetQuantity: t.targetQuantity,
      });
    }
  });

  const myAssignments = Array.from(assignedMap.values());
  const mySubmissions = submissions.filter((s) => {
    const sEmail = (s.email || "").toLowerCase().trim();
    const sName = (s.employee || "").toLowerCase().trim();
    return (userEmail && sEmail === userEmail) || (userName && sName === userName);
  });

  const myLedger = ledger.filter((l) => {
    const lEmail = (l.email || (l as any).employeeEmail || "").toLowerCase().trim();
    const lName = (l.employee || (l as any).employeeName || "").toLowerCase().trim();
    return (userEmail && lEmail === userEmail) || (userName && lName === userName);
  });

  const totalCredits = myLedger
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalDebits = myLedger
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const myBalance = totalCredits - totalDebits;

  // Calculate live average rating from approved deliverables
  const ratedSubs = mySubmissions.filter(
    (s) => s.status === "Approved" && typeof s.rating === "number" && s.rating > 0
  );
  const liveRating =
    ratedSubs.length > 0
      ? (ratedSubs.reduce((sum, s) => sum + (s.rating || 0), 0) / ratedSubs.length).toFixed(1)
      : currentEmployee.rating
      ? currentEmployee.rating.toFixed(1)
      : "5.0";

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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                Staff Portal • {currentEmployee.role}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-200 px-3 py-1 text-xs font-bold border border-amber-300/30 backdrop-blur-sm">
                ⭐ {liveRating}/10 Rating ({ratedSubs.length} {ratedSubs.length === 1 ? "review" : "reviews"})
              </span>
            </div>
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
            {myAssignments.map((task) => {
              const timeInfo = getTimeRemaining(task.deadline);
              return (
                <div
                  key={task.id || task.taskTitle}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center hover:border-slate-200 transition"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {task.taskTitle}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">
                        ৳{task.payment.toLocaleString("en-BD")}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                          timeInfo.urgency === "overdue"
                            ? "bg-red-100 text-red-800"
                            : timeInfo.urgency === "urgent"
                            ? "bg-amber-100 text-amber-800"
                            : timeInfo.urgency === "moderate"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        <Clock size={11} />
                        {timeInfo.text}
                      </span>
                      <span className="text-slate-400">
                        (Due: {timeInfo.formattedDeadline})
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActive("My Tasks")}
                    className="rounded-lg bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 shrink-0"
                  >
                    Submit Work
                  </button>
                </div>
              );
            })}

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
