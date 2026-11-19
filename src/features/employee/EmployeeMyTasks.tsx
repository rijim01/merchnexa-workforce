import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Check,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
  Info,
} from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import type { AssignmentItem, SubmissionItem, TaskItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function getTimeRemaining(deadlineStr: string, now = Date.now()) {
  if (!deadlineStr) {
    return {
      text: "Flexible deadline",
      urgency: "plenty" as const,
      isOverdue: false,
      formattedDeadline: "No deadline specified",
    };
  }

  // If deadline format is "YYYY-MM-DD", treat it as end of that day (23:59:59)
  let targetDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr.trim())) {
    targetDate = new Date(`${deadlineStr.trim()}T23:59:59`);
  } else {
    targetDate = new Date(deadlineStr);
  }

  if (isNaN(targetDate.getTime())) {
    return {
      text: deadlineStr,
      urgency: "plenty" as const,
      isOverdue: false,
      formattedDeadline: deadlineStr,
    };
  }

  const diffMs = targetDate.getTime() - now;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiff / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const remHours = totalHours % 24;
  const remMinutes = totalMinutes % 60;

  const formattedDeadline =
    targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    (targetDate.getHours() !== 0 || targetDate.getMinutes() !== 0
      ? `, ${targetDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
      : "");

  if (isOverdue) {
    let overdueText = "Overdue";
    if (totalDays > 0) {
      overdueText = `Overdue by ${totalDays}d ${remHours}h`;
    } else if (totalHours > 0) {
      overdueText = `Overdue by ${totalHours}h ${remMinutes}m`;
    } else {
      overdueText = `Overdue by ${Math.max(1, totalMinutes)}m`;
    }
    return {
      text: overdueText,
      urgency: "overdue" as const,
      isOverdue: true,
      formattedDeadline,
    };
  }

  let text = "";
  let urgency: "plenty" | "moderate" | "urgent" = "plenty";

  if (totalDays >= 3) {
    text = `${totalDays} days left`;
    urgency = "plenty";
  } else if (totalDays >= 1) {
    text = `${totalDays}d ${remHours}h left`;
    urgency = "moderate";
  } else if (totalHours >= 1) {
    text = `${totalHours}h ${remMinutes}m left`;
    urgency = "urgent";
  } else {
    text = `${Math.max(1, remMinutes)} mins left!`;
    urgency = "urgent";
  }

  return {
    text,
    urgency,
    isOverdue: false,
    formattedDeadline,
  };
}

export function EmployeeMyTasks() {
  const {
    currentEmployee,
    assignments,
    applications,
    taskList,
    submissions,
    setSubmissions,
    authToken,
    showToast,
    setActive,
  } = useWorkforce();

  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [submittedUnits, setSubmittedUnits] = useState("10");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live timer for countdown update every 30 seconds
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute comprehensive list of assigned tasks for current employee
  const userEmail = (currentEmployee?.email || "").toLowerCase().trim();
  const userName = (currentEmployee?.name || "").toLowerCase().trim();

  const assignedMap = new Map<string, AssignmentItem>();

  // 1. Explicit assignments from MongoDB / state
  assignments.forEach((a) => {
    const aEmail = (a.email || "").toLowerCase().trim();
    const aName = (a.employee || "").toLowerCase().trim();
    if (aEmail === userEmail || (userEmail && aEmail.includes(userEmail)) || (userName && aName === userName)) {
      assignedMap.set(a.taskTitle, a);
    }
  });

  // 2. Synthesize assignments from Accepted applications (immediate live sync)
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

  // 3. Tasks in taskList where assignedEmployees or assignedEmployeeEmails contains current employee
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

  const handleSubmitWork = async (task: AssignmentItem) => {
    if (!deliverableUrl.trim()) {
      showToast("Please provide the Google Drive link or deliverable URL.", "warning");
      return;
    }

    let calculatedPayout = task.payment;
    let unitsCount: number | undefined = undefined;

    if (task.paymentType === "PER_UNIT") {
      unitsCount = Number(submittedUnits);
      if (!unitsCount || unitsCount <= 0 || !Number.isInteger(unitsCount)) {
        showToast(
          `Please enter a valid whole number for ${task.unitName || "units"} completed.`,
          "warning"
        );
        return;
      }
      calculatedPayout = unitsCount * (task.unitRate || 10);
    }

    const subId = Date.now();
    const newSub: SubmissionItem = {
      id: subId,
      taskTitle: task.taskTitle,
      employee: currentEmployee.name,
      email: currentEmployee.email,
      submittedOn: new Date().toISOString().slice(0, 10),
      deliverableUrl: deliverableUrl.trim(),
      notes:
        notes.trim() ||
        `Delivered ${unitsCount ? `${unitsCount} ${task.unitName || "units"}` : "work"} according to requirements.`,
      payment: calculatedPayout,
      paymentType: task.paymentType,
      unitRate: task.unitRate,
      unitName: task.unitName,
      submittedQuantity: unitsCount,
      approvedQuantity: unitsCount,
      status: "Under Review",
    };

    setIsSubmitting(true);
    setSubmissions((prev) => [newSub, ...prev.filter((s) => s.taskTitle !== task.taskTitle || s.email !== currentEmployee.email)]);
    setSubmittingTaskId(null);
    setDeliverableUrl("");
    setNotes("");
    setSubmittedUnits("10");

    try {
      await api.submissions.create(newSub, authToken || undefined);
      showToast(
        "✓ Work submitted successfully! Admin has been notified to review your deliverable.",
        "success"
      );
    } catch (err: any) {
      console.warn("Could not sync submission to server immediately:", err);
      showToast(
        "✓ Work saved locally. Will sync to server as soon as connection is verified.",
        "info"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">My Assigned Tasks</h3>
            <p className="mt-1 text-sm text-slate-500">
              Active projects assigned to you. Review project guidelines, monitor your remaining time, and submit deliverables for review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              {myAssignments.length} {myAssignments.length === 1 ? "Active Task" : "Active Tasks"}
            </span>
          </div>
        </div>

        {/* Task Cards */}
        <div className="mt-6 space-y-5">
          {myAssignments.map((task) => {
            const matchingTask = taskList.find((t) => t.title === task.taskTitle);
            const effectiveDeadline = task.deadline || matchingTask?.deadline || "";
            const timeInfo = getTimeRemaining(effectiveDeadline, now);

            const hasSubmission = submissions.find(
              (s) =>
                s.email.toLowerCase().trim() === userEmail &&
                s.taskTitle.toLowerCase().trim() === task.taskTitle.toLowerCase().trim()
            );

            return (
              <div
                key={task.id || task.taskTitle}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                {/* Title & Payment Row */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        {task.taskTitle}
                      </h4>
                      <StatusBadge
                        value={hasSubmission ? hasSubmission.status : task.status}
                      />
                    </div>

                    {matchingTask?.description && (
                      <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-2">
                        {matchingTask.description}
                      </p>
                    )}

                    {matchingTask?.documentUrl && (
                      <a
                        href={matchingTask.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <ExternalLink size={12} /> View Project Guidelines / Brief
                      </a>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    {task.paymentType === "PER_UNIT" ? (
                      <div className="text-left sm:text-right">
                        <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 inline-block">
                          ৳{task.unitRate} / {task.unitName || "Unit"}
                        </span>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          Bulky Piece Rate
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-black text-slate-900">
                        ৳{task.payment.toLocaleString("en-BD")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Prominent Countdown & Time Left Banner */}
                <div
                  className={`mt-4 flex flex-col justify-between gap-3 rounded-lg p-3.5 sm:flex-row sm:items-center border ${
                    timeInfo.urgency === "overdue"
                      ? "bg-red-50/80 border-red-200 text-red-900"
                      : timeInfo.urgency === "urgent"
                      ? "bg-amber-50/80 border-amber-200 text-amber-900"
                      : timeInfo.urgency === "moderate"
                      ? "bg-blue-50/80 border-blue-200 text-blue-900"
                      : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {timeInfo.isOverdue ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                    ) : (
                      <Clock
                        className={`h-5 w-5 shrink-0 ${
                          timeInfo.urgency === "urgent"
                            ? "text-amber-600 animate-pulse"
                            : timeInfo.urgency === "moderate"
                            ? "text-blue-600"
                            : "text-emerald-600"
                        }`}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Time Left to Submit:
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                            timeInfo.urgency === "overdue"
                              ? "bg-red-200 text-red-950"
                              : timeInfo.urgency === "urgent"
                              ? "bg-amber-200 text-amber-950 animate-pulse"
                              : timeInfo.urgency === "moderate"
                              ? "bg-blue-200 text-blue-950"
                              : "bg-emerald-200 text-emerald-950"
                          }`}
                        >
                          {timeInfo.text}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Due Date: <b>{timeInfo.formattedDeadline}</b> • Assigned on:{" "}
                        {task.assignedOn || "Recent"}
                      </p>
                    </div>
                  </div>

                  {/* Submit Trigger Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => {
                        setSubmittingTaskId(
                          submittingTaskId === task.id ? null : task.id
                        );
                        if (hasSubmission) {
                          setDeliverableUrl(hasSubmission.deliverableUrl);
                          setNotes(hasSubmission.notes);
                          if (hasSubmission.submittedQuantity) {
                            setSubmittedUnits(hasSubmission.submittedQuantity.toString());
                          }
                        } else {
                          setDeliverableUrl("");
                          setNotes("");
                          setSubmittedUnits("10");
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <FileCheck2 size={14} />
                      {hasSubmission ? "Submit New Revision" : "Submit Deliverable"}
                    </button>
                  </div>
                </div>

                {/* Existing Submission Banner */}
                {hasSubmission && (
                  <div
                    className={`mt-4 rounded-xl border p-4 ${
                      hasSubmission.status === "Approved"
                        ? "bg-emerald-50/60 border-emerald-200"
                        : hasSubmission.status === "Revision Requested"
                        ? "bg-rose-50/60 border-rose-200"
                        : "bg-amber-50/60 border-amber-200"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            hasSubmission.status === "Approved"
                              ? "bg-emerald-500"
                              : hasSubmission.status === "Revision Requested"
                              ? "bg-rose-500"
                              : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {hasSubmission.status === "Approved"
                            ? "✓ Deliverable Approved & Credited!"
                            : hasSubmission.status === "Revision Requested"
                            ? "⚠️ Revisions Requested by Admin"
                            : "Deliverable Under Review by Admin"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Submitted on {hasSubmission.submittedOn}
                        </span>
                      </div>

                      <a
                        href={hasSubmission.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <ExternalLink size={12} /> Open Submitted Asset
                      </a>
                    </div>

                    {hasSubmission.feedback && (
                      <div className="mt-2.5 rounded-lg bg-white/80 p-2.5 text-xs text-slate-700 border border-slate-200">
                        <span className="font-bold text-slate-900">Admin Feedback: </span>
                        {hasSubmission.feedback}
                      </div>
                    )}
                  </div>
                )}

                {/* Submission Form Drawer */}
                {submittingTaskId === task.id && (
                  <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Send size={14} className="text-blue-600" />
                          {hasSubmission
                            ? "Submit Deliverable Revision"
                            : "Submit Work Deliverable"}
                        </h5>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Upload your deliverable to Google Drive or Google Sheets, ensure link permissions are set to "Anyone with the link can view", and paste the link below.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {task.paymentType === "PER_UNIT" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700">
                            Total {task.unitName || "Units"} Created / Completed *
                          </label>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <input
                              type="number"
                              min="1"
                              value={submittedUnits}
                              onChange={(e) => setSubmittedUnits(e.target.value)}
                              placeholder="e.g. 50"
                              className="w-full sm:w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                              required
                            />
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                              Claimed: {Number(submittedUnits) || 0} {task.unitName || "units"} @ ৳{task.unitRate || 10} ={" "}
                              <b>
                                ৳
                                {(
                                  (Number(submittedUnits) || 0) * (task.unitRate || 10)
                                ).toLocaleString("en-BD")}
                              </b>
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Google Drive / Sheet / Deliverable Link *
                        </label>
                        <input
                          type="url"
                          value={deliverableUrl}
                          onChange={(e) => setDeliverableUrl(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/... or https://docs.google.com/spreadsheets/..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Notes / Description of Work Done
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Provide details about the files completed, accounts created, or special delivery notes for Admin..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-blue-100">
                        <button
                          type="button"
                          onClick={() => setSubmittingTaskId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSubmitWork(task)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                          <Check size={14} />
                          {isSubmitting ? "Submitting..." : "Confirm & Submit Work"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {myAssignments.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FileCheck2 size={24} />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-800">
                No active tasks assigned yet
              </h4>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                You haven't been assigned to any tasks yet. Browse open opportunities and apply to start earning!
              </p>
              <button
                onClick={() => setActive("Available Tasks")}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Browse Available Tasks <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
