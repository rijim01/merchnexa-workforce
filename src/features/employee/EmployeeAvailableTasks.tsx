import React, { useState } from "react";
import { CalendarDays, ExternalLink, Send, Users, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import type { ApplicationItem, TaskItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function EmployeeAvailableTasks() {
  const { currentEmployee, taskList, applications, setApplications, showToast, authToken } =
    useWorkforce();
  const [applyingTaskId, setApplyingTaskId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const handleApply = async (task: TaskItem) => {
    if (!message.trim()) {
      showToast("Please write a short note about your experience or availability.", "warning");
      return;
    }

    const newApp: ApplicationItem = {
      id: Date.now(),
      employee: currentEmployee.name,
      email: currentEmployee.email,
      taskTitle: task.title,
      appliedOn: new Date().toISOString().slice(0, 10),
      message: message.trim(),
      status: "Pending",
    };

    setApplications((prev) => [newApp, ...prev]);
    setApplyingTaskId(null);
    const sentMsg = message.trim();
    setMessage("");

    try {
      const res = await api.applications.create(
        {
          taskTitle: task.title,
          employee: currentEmployee.name,
          email: currentEmployee.email,
          message: sentMsg,
        },
        authToken || undefined
      );

      if (res?.application) {
        setApplications((prev) => [res.application, ...prev.filter((a) => a.id !== newApp.id)]);
      }

      showToast(
        `✓ Application for "${task.title}" saved to MongoDB & sent to Admin!`,
        "success"
      );
    } catch (err: any) {
      console.error("Failed to submit application to server:", err);
      showToast(`⚠ Application error: ${err.message}`, "error");
    }
  };

  const openTasks = taskList.filter((t) => t.status === "Open");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Available Tasks & Projects</h3>
        <p className="mt-1 text-sm text-slate-500">
          Browse tasks published by the admin. Express your interest to get assigned.
        </p>

        <div className="mt-6 space-y-4">
          {openTasks.map((task) => {
            const taskApps = applications.filter((a) => a.taskTitle === task.title);
            const applicantCount = taskApps.length;
            const assignedCount = (task.assignedEmployees || []).length;
            const totalSlots = task.slots || 1;
            const remainingSlots = Math.max(0, totalSlots - assignedCount);

            const existingApp = applications.find(
              (a) =>
                a.email.toLowerCase() === currentEmployee.email.toLowerCase() &&
                a.taskTitle === task.title
            );

            return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-100 p-5 transition hover:border-blue-200"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-900">
                        {task.title}
                      </h4>
                      <StatusBadge value={task.status} />
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {task.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        <CalendarDays size={13} className="mr-1 inline text-slate-400" />
                        Deadline: <b className="text-slate-700">{task.deadline}</b>
                      </span>

                      {/* How many employees have applied */}
                      <span className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 border border-indigo-100">
                        <Users size={13} className="text-indigo-600" />
                        <span>
                          {applicantCount === 0
                            ? "Be the first to apply"
                            : `${applicantCount} ${applicantCount === 1 ? "employee applied" : "employees applied"}`}
                        </span>
                      </span>

                      {/* Staff Capacity & Remaining Slots */}
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                        <span>Staff Needed: <b>{assignedCount}/{totalSlots}</b></span>
                        {remainingSlots > 0 ? (
                          <span className="font-semibold text-emerald-700 ml-1">
                            ({remainingSlots} {remainingSlots === 1 ? "spot left" : "spots left"})
                          </span>
                        ) : (
                          <span className="font-bold text-amber-600 ml-1">
                            (Full)
                          </span>
                        )}
                      </span>

                      {task.documentUrl && (
                        <a
                          href={task.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          Reference Brief{" "}
                          <ExternalLink size={11} className="ml-0.5 inline" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    {task.paymentType === "PER_UNIT" ? (
                      <div className="text-left sm:text-right">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 text-xs border border-emerald-200 inline-block">
                          ৳{task.unitRate} / {task.unitName || "Unit"}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Target Pool: {task.targetQuantity || 100} units (৳{task.payment.toLocaleString("en-BD")})
                        </p>
                      </div>
                    ) : (
                      <div className="text-left sm:text-right">
                        <p className="text-xl font-bold text-slate-900">
                          ৳{task.payment.toLocaleString("en-BD")}
                        </p>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Fixed Project</span>
                      </div>
                    )}

                    {(task.assignedEmployees || []).includes(currentEmployee.name) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} />
                        Assigned to You
                      </span>
                    ) : existingApp ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          existingApp.status === "Pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : existingApp.status === "Accepted"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        Applied ({existingApp.status})
                      </span>
                    ) : remainingSlots > 0 ? (
                      <button
                        onClick={() => {
                          setApplyingTaskId(task.id);
                          setMessage("");
                        }}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Apply for Task
                      </button>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                        Slots Filled
                      </span>
                    )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Application Form Drawer */}
                {applyingTaskId === task.id && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <label className="block text-xs font-bold text-slate-700">
                      Application Proposal / Message to Admin *
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Explain your relevant skills and how quickly you can deliver this..."
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs outline-none focus:border-blue-500"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setApplyingTaskId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleApply(task)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Send size={13} /> Submit Application
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {openTasks.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              No open tasks available at the moment. Please check back later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
