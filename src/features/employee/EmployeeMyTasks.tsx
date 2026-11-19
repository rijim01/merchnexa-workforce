import React, { useState } from "react";
import { FileCheck2, Check } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import type { AssignmentItem, SubmissionItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function EmployeeMyTasks() {
  const { currentEmployee, assignments, submissions, setSubmissions, authToken, showToast } =
    useWorkforce();

  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [submittedUnits, setSubmittedUnits] = useState("10");
  const [notes, setNotes] = useState("");

  const myAssignments = assignments.filter(
    (a) => a.email === currentEmployee.email
  );

  const handleSubmitWork = (task: AssignmentItem) => {
    if (!deliverableUrl.trim()) {
      showToast("Please provide the Google Drive link or deliverable URL.", "warning");
      return;
    }

    let calculatedPayout = task.payment;
    let unitsCount: number | undefined = undefined;

    if (task.paymentType === "PER_UNIT") {
      unitsCount = Number(submittedUnits);
      if (!unitsCount || unitsCount <= 0 || !Number.isInteger(unitsCount)) {
        showToast(`Please enter a valid whole number for ${task.unitName || "units"} created.`, "warning");
        return;
      }
      calculatedPayout = unitsCount * (task.unitRate || 10);
    }

    const newSub: SubmissionItem = {
      id: Date.now(),
      taskTitle: task.taskTitle,
      employee: currentEmployee.name,
      email: currentEmployee.email,
      submittedOn: new Date().toISOString().slice(0, 10),
      deliverableUrl: deliverableUrl.trim(),
      notes: notes.trim() || `Delivered ${unitsCount ? `${unitsCount} ${task.unitName || "units"}` : "work"} according to task requirements.`,
      payment: calculatedPayout,
      paymentType: task.paymentType,
      unitRate: task.unitRate,
      unitName: task.unitName,
      submittedQuantity: unitsCount,
      approvedQuantity: unitsCount,
      status: "Under Review",
    };

    setSubmissions((prev) => [newSub, ...prev]);
    setSubmittingTaskId(null);
    setDeliverableUrl("");
    setNotes("");
    setSubmittedUnits("10");

    // Sync submission to Google Sheets
    api.submissions.create(newSub, authToken || undefined).catch((err) => {
      console.warn("Could not sync submission to Google Sheets immediately:", err);
    });

    showToast(
      "✓ Work submitted successfully! The admin has been notified to review your deliverable.",
      "success"
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">My Assigned Tasks</h3>
        <p className="mt-1 text-sm text-slate-500">
          Projects currently assigned to you. Work on the deliverables and submit your Google Drive link here.
        </p>

        <div className="mt-6 space-y-4">
          {myAssignments.map((task) => {
            const hasSubmission = submissions.find(
              (s) =>
                s.email === currentEmployee.email &&
                s.taskTitle === task.taskTitle
            );

            return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-100 p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-900">
                        {task.taskTitle}
                      </h4>
                      <StatusBadge
                        value={hasSubmission ? hasSubmission.status : task.status}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Assigned on: {task.assignedOn}</span>
                      <span className="font-medium text-amber-700">
                        Deadline: {task.deadline}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    {task.paymentType === "PER_UNIT" ? (
                      <div className="text-left sm:text-right">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-xs border border-emerald-200 inline-block">
                          ৳{task.unitRate} / {task.unitName || "Unit"}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Bulky Piece Rate</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-slate-900">
                        ৳{task.payment.toLocaleString("en-BD")}
                      </p>
                    )}

                    <button
                      onClick={() => {
                        setSubmittingTaskId(task.id);
                        setDeliverableUrl("");
                        setNotes("");
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <FileCheck2 size={14} />
                      {hasSubmission
                        ? "Submit New Revision"
                        : "Submit Deliverable"}
                    </button>
                  </div>
                </div>

                {/* Submission Form */}
                {submittingTaskId === task.id && (
                  <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <h5 className="font-semibold text-slate-800 text-sm">
                      Submit Work for Review
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ensure your Google Drive link has permissions set to "Anyone with the link can view".
                    </p>

                    <div className="mt-3 space-y-3">
                      {task.paymentType === "PER_UNIT" && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Total {task.unitName || "Units"} Created / Completed *
                          </label>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <input
                              type="number"
                              min="1"
                              value={submittedUnits}
                              onChange={(e) => setSubmittedUnits(e.target.value)}
                              placeholder="e.g. 50"
                              className="w-full sm:w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 font-bold"
                              required
                            />
                            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                              Claimed: {Number(submittedUnits) || 0} {task.unitName || "units"} @ ৳{task.unitRate || 10} = <b>৳{((Number(submittedUnits) || 0) * (task.unitRate || 10)).toLocaleString("en-BD")}</b>
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Google Drive / Sheet Deliverable Link *
                        </label>
                        <input
                          type="url"
                          value={deliverableUrl}
                          onChange={(e) => setDeliverableUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Notes / Description of Deliverables
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Summarize the work done, files included, and any special instructions..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setSubmittingTaskId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitWork(task)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check size={14} /> Confirm Submission
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {myAssignments.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              You do not have any assigned tasks yet. Check "Available Tasks" to apply!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
