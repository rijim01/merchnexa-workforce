import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  ExternalLink,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { TaskItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";
import { getTimeRemaining } from "../employee/EmployeeMyTasks";

export interface TaskWorkerItem {
  name: string;
  email: string;
  role: string;
  skills: string[];
  initials: string;
  color: string;
  phone?: string;
  assignedOn: string;
  submission: {
    id: number;
    status: "Under Review" | "Approved" | "Revision Requested";
    deliverableUrl: string;
    submittedOn: string;
    notes?: string;
    payment?: number;
    rating?: number;
    feedback?: string;
  } | null;
}

interface TaskWorkersModalProps {
  task: TaskItem;
  onClose: () => void;
  onWorkerUnassigned?: () => void;
}

export function TaskWorkersModal({ task, onClose, onWorkerUnassigned }: TaskWorkersModalProps) {
  const { employeeList, assignments, applications, submissions, setTaskList, setAssignments, showToast, authToken, setActive } =
    useWorkforce();

  const [workers, setWorkers] = useState<TaskWorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unassigningEmail, setUnassigningEmail] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch live workers from API and fallback to local state
  useEffect(() => {
    let isMounted = true;
    async function loadWorkers() {
      setLoading(true);
      try {
        const res = await api.tasks.getWorkers(task.id, authToken || undefined);
        if (isMounted && res?.workers) {
          setWorkers(res.workers);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Could not fetch workers from API, building from local state:", err);
      }

      // Fallback: build from context state
      if (!isMounted) return;

      const userEmailSet = new Set<string>();
      (task.assignedEmployeeEmails || []).forEach((e) => userEmailSet.add(e.toLowerCase().trim()));

      assignments
        .filter((a) => a.taskTitle === task.title)
        .forEach((a) => {
          if (a.email) userEmailSet.add(a.email.toLowerCase().trim());
        });

      applications
        .filter((app) => app.taskTitle === task.title && app.status === "Accepted")
        .forEach((app) => {
          if (app.email) userEmailSet.add(app.email.toLowerCase().trim());
        });

      const workerNames = new Set<string>(task.assignedEmployees || []);
      const builtWorkers: TaskWorkerItem[] = [];
      const seen = new Set<string>();

      for (const email of Array.from(userEmailSet)) {
        if (seen.has(email)) continue;
        seen.add(email);

        const emp = employeeList.find((e) => e.email.toLowerCase() === email);
        const assign = assignments.find((a) => a.email.toLowerCase() === email && a.taskTitle === task.title);
        const app = applications.find((a) => a.email.toLowerCase() === email && a.taskTitle === task.title);
        const sub = submissions.find((s) => s.email.toLowerCase() === email && s.taskTitle === task.title);

        builtWorkers.push({
          name: emp?.name || assign?.employee || app?.employee || email.split("@")[0],
          email,
          role: emp?.role || "Staff Member",
          skills: emp?.skills || [],
          initials: emp?.initials || (emp?.name || email).slice(0, 2).toUpperCase(),
          color: emp?.color || "bg-blue-100 text-blue-700",
          phone: emp?.phone || "",
          assignedOn: assign?.assignedOn || app?.appliedOn || new Date().toISOString().slice(0, 10),
          submission: sub
            ? {
                id: sub.id,
                status: sub.status,
                deliverableUrl: sub.deliverableUrl,
                submittedOn: sub.submittedOn,
                notes: sub.notes,
                payment: sub.payment,
                rating: sub.rating,
                feedback: sub.feedback,
              }
            : null,
        });
      }

      for (const name of Array.from(workerNames)) {
        const matching = builtWorkers.find((w) => w.name.toLowerCase() === name.toLowerCase());
        if (!matching) {
          const emp = employeeList.find((e) => e.name.toLowerCase() === name.toLowerCase());
          const email = emp?.email || "";
          if (email && seen.has(email.toLowerCase())) continue;
          if (email) seen.add(email.toLowerCase());

          const sub = submissions.find(
            (s) =>
              s.taskTitle === task.title &&
              (s.employee.toLowerCase() === name.toLowerCase() || (email && s.email.toLowerCase() === email.toLowerCase()))
          );

          builtWorkers.push({
            name,
            email: email || "No email on record",
            role: emp?.role || "Staff Member",
            skills: emp?.skills || [],
            initials: emp?.initials || name.slice(0, 2).toUpperCase(),
            color: emp?.color || "bg-blue-100 text-blue-700",
            phone: emp?.phone || "",
            assignedOn: new Date().toISOString().slice(0, 10),
            submission: sub
              ? {
                  id: sub.id,
                  status: sub.status,
                  deliverableUrl: sub.deliverableUrl,
                  submittedOn: sub.submittedOn,
                  notes: sub.notes,
                  payment: sub.payment,
                  rating: sub.rating,
                  feedback: sub.feedback,
                }
              : null,
          });
        }
      }

      setWorkers(builtWorkers);
      setLoading(false);
    }

    loadWorkers();
    return () => {
      isMounted = false;
    };
  }, [task.id, task.title, authToken, assignments, applications, submissions, employeeList]);

  const handleUnassign = async (worker: TaskWorkerItem) => {
    const confirm = window.confirm(
      `Are you sure you want to unassign ${worker.name} from "${task.title}"? This will reopen their slot for other staff.`
    );
    if (!confirm) return;

    setUnassigningEmail(worker.email);

    try {
      await api.tasks.unassignWorker(
        task.id,
        { email: worker.email, employeeName: worker.name },
        authToken || undefined
      );

      // Optimistically update local state
      setWorkers((prev) => prev.filter((w) => w.email !== worker.email && w.name !== worker.name));

      setTaskList((prev) =>
        prev.map((t) => {
          if (t.id === task.id) {
            const updatedAssigned = (t.assignedEmployees || []).filter(
              (n) => n.toLowerCase() !== worker.name.toLowerCase() && n.toLowerCase() !== worker.email.toLowerCase()
            );
            const updatedEmails = (t.assignedEmployeeEmails || []).filter(
              (e) => e.toLowerCase() !== worker.email.toLowerCase()
            );
            return {
              ...t,
              assignedEmployees: updatedAssigned,
              assignedEmployeeEmails: updatedEmails,
              employee:
                updatedAssigned.length === 0
                  ? "Unassigned"
                  : updatedAssigned.length === 1
                  ? updatedAssigned[0]
                  : `${updatedAssigned[0]} (+${updatedAssigned.length - 1} more)`,
              status: updatedAssigned.length === 0 && t.status === "In Progress" ? "Open" : t.status,
            };
          }
          return t;
        })
      );

      setAssignments((prev) =>
        prev.filter((a) => !(a.taskTitle === task.title && (a.email === worker.email || a.employee === worker.name)))
      );

      showToast(`✓ ${worker.name} unassigned from "${task.title}". Slot is now open.`, "success");
      if (onWorkerUnassigned) onWorkerUnassigned();
    } catch (err: any) {
      console.error("Failed to unassign worker:", err);
      showToast(`Failed to unassign: ${err.message}`, "warning");
    } finally {
      setUnassigningEmail(null);
    }
  };

  const totalSlots = task.slots || 1;
  const assignedCount = workers.length;
  const remainingSlots = Math.max(0, totalSlots - assignedCount);
  const timeInfo = getTimeRemaining(task.deadline);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workers-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Users size={16} />
              </span>
              <h3 id="workers-modal-title" className="text-lg font-bold text-slate-900">
                Assigned Workforce
              </h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                {assignedCount} of {totalSlots} Filled
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-700">
              {task.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays size={13} className="text-slate-400" />
                Due: <b>{timeInfo.formattedDeadline}</b> ({timeInfo.text})
              </span>
              <span>•</span>
              <span>
                Payment:{" "}
                <b className="text-slate-900">
                  {task.paymentType === "PER_UNIT"
                    ? `৳${task.unitRate} / ${task.unitName || "unit"}`
                    : `৳${task.payment.toLocaleString("en-BD")} per worker`}
                </b>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Capacity Progress Bar */}
        <div className="border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">
              Staff Capacity: {assignedCount}/{totalSlots} workers
            </span>
            <span
              className={
                remainingSlots === 0
                  ? "text-emerald-700 font-bold"
                  : "text-amber-700 font-bold"
              }
            >
              {remainingSlots === 0 ? "✓ Full Capacity" : `${remainingSlots} open spots remaining`}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                remainingSlots === 0 ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(100, (assignedCount / totalSlots) * 100)}%` }}
            />
          </div>
        </div>

        {/* Worker List Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {loading && (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-2 text-xs text-slate-400">Loading assigned workers...</p>
            </div>
          )}

          {!loading && workers.map((worker) => {
            const hasSubmission = worker.submission;

            return (
              <div
                key={worker.email || worker.name}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  {/* Worker Identity */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${worker.color || "bg-blue-100 text-blue-700"}`}
                    >
                      {worker.initials || worker.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {worker.name}
                        </h4>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {worker.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{worker.email}</p>
                      {worker.phone && (
                        <p className="text-[11px] text-slate-400">Phone: {worker.phone}</p>
                      )}

                      {/* Skills Tags */}
                      {worker.skills && worker.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {worker.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Status Pill & Unassign Button */}
                  <div className="flex shrink-0 flex-col items-start sm:items-end gap-2">
                    {hasSubmission ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          hasSubmission.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : hasSubmission.status === "Revision Requested"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            hasSubmission.status === "Approved"
                              ? "bg-emerald-500"
                              : hasSubmission.status === "Revision Requested"
                              ? "bg-rose-500"
                              : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {hasSubmission.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                        <Clock size={12} className="text-blue-600" />
                        In Progress
                      </span>
                    )}

                    <button
                      onClick={() => handleUnassign(worker)}
                      disabled={unassigningEmail === worker.email}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition disabled:opacity-50"
                      title="Unassign worker and reopen slot"
                    >
                      <UserX size={13} />
                      {unassigningEmail === worker.email ? "Removing..." : "Unassign Worker"}
                    </button>
                  </div>
                </div>

                {/* Submission Deliverable Details if available */}
                {hasSubmission && (
                  <div className="mt-3.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-semibold text-slate-700">
                        Submitted Deliverable:
                      </span>
                      <a
                        href={hasSubmission.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                      >
                        Open Asset Link <ExternalLink size={12} />
                      </a>
                    </div>
                    {hasSubmission.notes && (
                      <p className="mt-1.5 text-slate-600 italic">
                        "{hasSubmission.notes}"
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Submitted on: {hasSubmission.submittedOn}</span>
                      {hasSubmission.rating && (
                        <span className="font-bold text-amber-600 flex items-center gap-0.5">
                          <Award size={12} /> Rating: {hasSubmission.rating}/10
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && workers.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={20} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800">
                No workers currently assigned
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                This task has {totalSlots} open {totalSlots === 1 ? "position" : "positions"}. When employees apply and you approve them from Applications, they will appear here.
              </p>
            </div>
          )}

          {/* Open Slots Info Card */}
          {!loading && remainingSlots > 0 && (
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  {remainingSlots} {remainingSlots === 1 ? "Spot" : "Spots"} Still Available
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Workers can apply from their portal. Review pending applications to assign additional staff.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setActive("Applications");
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Review Applications <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
