import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  RotateCcw,
  Check,
  MessageSquare,
  Star,
  X,
  Award,
} from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";
import type { SubmissionItem, TransactionItem } from "../../types";

export function SubmissionsPage() {
  const { submissions, setSubmissions, setLedger, setTaskList, authToken, showToast } = useWorkforce();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [revisionModalId, setRevisionModalId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Approval & Rating Modal state
  const [approvingSubmission, setApprovingSubmission] = useState<SubmissionItem | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(10);
  const [approvalNote, setApprovalNote] = useState("");
  const [customPayoutAmount, setCustomPayoutAmount] = useState("");
  const [customApprovedUnits, setCustomApprovedUnits] = useState("");

  const openApprovalModal = (sub: SubmissionItem) => {
    setApprovingSubmission(sub);
    setSelectedRating(10);
    setApprovalNote("");
    setCustomPayoutAmount(sub.payment.toString());
    setCustomApprovedUnits((sub.submittedQuantity || 1).toString());
  };

  const confirmApprovalWithRating = () => {
    if (!approvingSubmission) return;

    const targetId = approvingSubmission.id;
    const rating = selectedRating;
    const finalAmount = Number(customPayoutAmount) > 0 ? Math.round(Number(customPayoutAmount)) : approvingSubmission.payment;
    const validUnits = approvingSubmission.paymentType === "PER_UNIT" ? Number(customApprovedUnits) || approvingSubmission.submittedQuantity : undefined;

    // 1. Update submission status and assigned rating
    setSubmissions((current) =>
      current.map((item) =>
        item.id === targetId
          ? {
              ...item,
              status: "Approved",
              rating,
              feedback: approvalNote.trim() || undefined,
              payment: finalAmount,
              approvedQuantity: validUnits,
            }
          : item
      )
    );

    // 2. Automatically record CREDIT in ledger
    const newTxn: TransactionItem = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      employee: approvingSubmission.employee,
      email: approvingSubmission.email,
      type: "CREDIT",
      amount: finalAmount,
      date: new Date().toISOString().slice(0, 10),
      method: "System Credit",
      reference: approvingSubmission.paymentType === "PER_UNIT"
        ? `Bulk Approval (${validUnits} ${approvingSubmission.unitName || "Units"})`
        : `Task Approval (${approvingSubmission.taskTitle})`,
      description: approvingSubmission.paymentType === "PER_UNIT"
        ? `Earned ৳${finalAmount} for ${validUnits} ${approvingSubmission.unitName || "units"} (Rating: ${rating}/10)`
        : `Earned ৳${finalAmount} (Rating: ${rating}/10)`,
    };
    setLedger((prev) => [newTxn, ...prev]);

    // 3. Mark task completed or update units progress
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.title === approvingSubmission.taskTitle) {
          if (t.paymentType === "PER_UNIT") {
            const newCompleted = (t.completedQuantity || 0) + (validUnits || 0);
            const isAllDone = t.targetQuantity ? newCompleted >= t.targetQuantity : false;
            return {
              ...t,
              completedQuantity: newCompleted,
              status: isAllDone ? "Completed" : t.status,
            };
          }
          return { ...t, status: "Completed" };
        }
        return t;
      })
    );

    showToast(
      `✓ Task approved with ${rating}/10 rating! ৳${finalAmount.toLocaleString(
        "en-BD"
      )} credited to ${approvingSubmission.employee}'s balance.`,
      "success"
    );

    // Sync approval and ledger credit to Google Sheets
    api.submissions
      .approve(
        approvingSubmission.id,
        {
          taskTitle: approvingSubmission.taskTitle,
          employee: approvingSubmission.employee,
          email: approvingSubmission.email,
          amount: finalAmount,
          rating,
          approvedQuantity: validUnits,
          unitRate: approvingSubmission.unitRate,
          unitName: approvingSubmission.unitName,
          note: approvalNote.trim(),
        },
        authToken || undefined
      )
      .catch((err) => {
        console.warn("Could not sync approval to Google Sheets immediately:", err);
      });

    setApprovingSubmission(null);
    setSelectedRating(10);
    setApprovalNote("");
    setCustomPayoutAmount("");
    setCustomApprovedUnits("");
  };

  const handleRequestRevision = (id: number) => {
    if (!feedbackText.trim()) {
      showToast("Please provide revision feedback instructions for the employee.", "warning");
      return;
    }

    setSubmissions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Revision Requested",
              feedback: feedbackText.trim(),
            }
          : item
      )
    );

    setRevisionModalId(null);
    setFeedbackText("");
    showToast("Revision request sent to the employee.", "info");
  };

  const filteredSubmissions = submissions.filter((item) => {
    const matchesFilter = filter === "All" || item.status === filter;
    const query = search.toLowerCase();
    const matchesSearch =
      item.employee.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      item.taskTitle.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const getRatingLabel = (score: number) => {
    if (score === 10) return "10/10 - Outstanding Excellence";
    if (score === 9) return "9/10 - Excellent Quality";
    if (score === 8) return "8/10 - Very Good";
    if (score === 7) return "7/10 - Good / Satisfactory";
    if (score >= 5) return `${score}/10 - Average Quality`;
    return `${score}/10 - Below Expectations`;
  };

  return (
    <div className="space-y-5">
      {/* Approval & Performance Rating Modal */}
      {approvingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-5 text-white">
              <button
                onClick={() => setApprovingSubmission(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <Award size={14} />
                <span>Task Review & Evaluation</span>
              </div>
              <h3 className="mt-2 text-xl font-bold">Approve Deliverable</h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Assign performance points (1–10) for {approvingSubmission.employee}.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Project Title</p>
                <p className="text-sm font-bold text-slate-800">{approvingSubmission.taskTitle}</p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Author: <b>{approvingSubmission.employee}</b></span>
                  <span>Payment: <b className="text-emerald-600">৳{approvingSubmission.payment.toLocaleString("en-BD")}</b></span>
                </div>
              </div>

              {/* Payout & Quantity Verification for Bulky / Unit-based Work */}
              {approvingSubmission.paymentType === "PER_UNIT" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      Bulky Work Piece-Rate Verification
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                      Rate: ৳{approvingSubmission.unitRate || 10} / {approvingSubmission.unitName || "Unit"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Approved Valid Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customApprovedUnits}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomApprovedUnits(val);
                          const rate = approvingSubmission.unitRate || 10;
                          setCustomPayoutAmount(((Number(val) || 0) * rate).toString());
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-600"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Employee Claimed: <b>{approvingSubmission.submittedQuantity || 0} {approvingSubmission.unitName || "units"}</b>
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Approved Total Payout (BDT) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customPayoutAmount}
                        onChange={(e) => setCustomPayoutAmount(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-emerald-700 outline-none focus:border-blue-600"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Auto: {Number(customApprovedUnits) || 0} × ৳{approvingSubmission.unitRate || 10}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">Approved Credit Amount (BDT):</p>
                    <p className="text-[10px] text-slate-400">Fixed project payout to credit into employee ledger</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={customPayoutAmount}
                    onChange={(e) => setCustomPayoutAmount(e.target.value)}
                    className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 text-right outline-none focus:border-blue-600"
                  />
                </div>
              )}

              {/* 10-Point Rating Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">
                    Performance Score (Points out of 10):
                  </label>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    ⭐ {getRatingLabel(selectedRating)}
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedRating(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                        selectedRating === num
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{num}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  This score directly calculates into the employee's ranking score.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Optional Praise / Review Feedback:
                </label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Delivered on time with great typography and branding accuracy."
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingSubmission(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmApprovalWithRating}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
                >
                  <Check size={14} />
                  <span>Confirm Approval (+{selectedRating} Pts)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Management Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">Project Deliverables & Review</h3>
            <p className="mt-1 text-xs text-slate-500">
              Inspect Google Drive deliverables, rate performance out of 10 points, and release payments.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search submissions..."
              className="w-full text-sm outline-none sm:w-48"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {["All", "Under Review", "Approved", "Revision Requested"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filter === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="mt-5 space-y-4">
          {filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="space-y-3 rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      {submission.taskTitle}
                    </h4>
                    <StatusBadge value={submission.status} />
                    {submission.rating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        {submission.rating}/10 Points
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    By <b>{submission.employee}</b> ({submission.email}) • Submitted on {submission.submittedOn}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">
                    ৳{submission.payment.toLocaleString("en-BD")}
                  </p>
                  {submission.paymentType === "PER_UNIT" ? (
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      {submission.submittedQuantity || 0} {submission.unitName || "units"} @ ৳{submission.unitRate || 10}
                    </span>
                  ) : (
                    <p className="text-[11px] text-slate-400">Fixed Total</p>
                  )}
                </div>
              </div>

              {/* Google Drive Link Box */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">
                      Deliverable Google Drive Location:
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-600 font-mono">
                      {submission.deliverableUrl}
                    </p>
                  </div>

                  <a
                    href={submission.deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    Open in Google Drive
                    <ExternalLink size={13} />
                  </a>
                </div>

                <div className="mt-3 border-t border-slate-200/60 pt-3">
                  <p className="text-xs font-medium text-slate-500">Employee Deliverable Notes:</p>
                  <p className="mt-1 text-sm text-slate-700">{submission.notes}</p>
                </div>
              </div>

              {/* Revision feedback banner if present */}
              {submission.status === "Revision Requested" && submission.feedback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="mt-0.5 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Requested Revision Feedback:
                      </p>
                      <p className="mt-1 text-xs text-amber-800">{submission.feedback}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Revision input form if modal toggled */}
              {revisionModalId === submission.id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                  <label className="block text-xs font-bold text-slate-700">
                    Feedback & Change Instructions for {submission.employee} *
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    placeholder="Specify exactly what changes or improvements are required..."
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-500"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setRevisionModalId(null);
                        setFeedbackText("");
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRequestRevision(submission.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      <RotateCcw size={13} />
                      Send Revision Request
                    </button>
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {submission.status === "Under Review" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openApprovalModal(submission)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      <Check size={14} />
                      <span>Review & Approve (Score 1-10)</span>
                    </button>

                    <button
                      onClick={() => {
                        setRevisionModalId(submission.id);
                        setFeedbackText(submission.feedback || "");
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                    >
                      <RotateCcw size={14} />
                      <span>Request Revision</span>
                    </button>
                  </div>
                )}

                {submission.status === "Revision Requested" && revisionModalId !== submission.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-700">
                      Awaiting revised submission from employee.
                    </span>
                    <button
                      onClick={() => openApprovalModal(submission)}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Override & Approve
                    </button>
                  </div>
                )}

                {submission.status === "Approved" && (
                  <div className="flex items-center gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Check size={15} /> Deliverable approved and payment credited.
                    </p>
                    {submission.rating && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        ⭐ Rating: {submission.rating}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-700">No submissions found</p>
              <p className="mt-1 text-sm text-slate-400">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
