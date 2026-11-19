import React, { useState } from "react";
import { ExternalLink, MessageSquare } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { useWorkforce } from "../../context/WorkforceContext";

export function EmployeeSubmissions() {
  const { currentEmployee, submissions, setSubmissions, showToast } = useWorkforce();
  const [resubmittingId, setResubmittingId] = useState<number | null>(null);
  const [resubmitUrl, setResubmitUrl] = useState("");
  const [resubmitNotes, setResubmitNotes] = useState("");

  const mySubmissions = submissions.filter(
    (s) => s.email === currentEmployee.email
  );

  const handleResubmit = (id: number) => {
    if (!resubmitUrl.trim()) {
      showToast("Please provide the updated Google Drive URL.", "warning");
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              deliverableUrl: resubmitUrl.trim(),
              notes: resubmitNotes.trim() || s.notes,
              status: "Under Review",
            }
          : s
      )
    );

    setResubmittingId(null);
    setResubmitUrl("");
    setResubmitNotes("");
    showToast(
      "✓ Updated deliverable resubmitted! Status changed back to Under Review.",
      "success"
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">My Deliverable Submissions</h3>
        <p className="mt-1 text-sm text-slate-500">
          Track the status of your submitted projects, review feedback, and resubmit if revisions are requested.
        </p>

        <div className="mt-6 space-y-4">
          {mySubmissions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl border border-slate-100 p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      {sub.taskTitle}
                    </h4>
                    <StatusBadge value={sub.status} />
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Submitted on: {sub.submittedOn}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-base font-bold text-slate-900">
                    ৳{sub.payment.toLocaleString("en-BD")}
                  </p>
                  {sub.paymentType === "PER_UNIT" && (
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      {sub.submittedQuantity || 0} {sub.unitName || "units"} @ ৳{sub.unitRate || 10}
                    </span>
                  )}
                </div>
              </div>

              {/* Asset link */}
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{sub.deliverableUrl}</span>
                  <a
                    href={sub.deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue-600 hover:underline"
                  >
                    Open Asset <ExternalLink size={12} />
                  </a>
                </div>
                <p className="mt-2 text-slate-500">
                  <span className="font-medium">My Notes:</span> {sub.notes}
                </p>
              </div>

              {/* Revision Alert Banner */}
              {sub.status === "Revision Requested" && sub.feedback && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <MessageSquare size={16} className="mt-0.5 text-amber-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Admin Feedback & Required Changes:
                        </p>
                        <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                          {sub.feedback}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setResubmittingId(sub.id);
                        setResubmitUrl(sub.deliverableUrl);
                        setResubmitNotes("");
                      }}
                      className="w-full sm:w-auto shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
                    >
                      Resubmit Revision
                    </button>
                  </div>
                </div>
              )}

              {/* Resubmit form */}
              {resubmittingId === sub.id && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                  <h5 className="text-xs font-bold text-slate-800">
                    Resubmit Revised Asset
                  </h5>
                  <input
                    type="url"
                    value={resubmitUrl}
                    onChange={(e) => setResubmitUrl(e.target.value)}
                    placeholder="Updated Google Drive URL..."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                    required
                  />
                  <textarea
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes on what was revised..."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-blue-500"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setResubmittingId(null)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResubmit(sub.id)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Confirm Resubmission
                    </button>
                  </div>
                </div>
              )}

              {sub.status === "Approved" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <span>✓ Approved! Payment of ৳{sub.payment.toLocaleString("en-BD")} has been credited to your ledger balance.</span>
                  {sub.rating && (
                    <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-emerald-900 font-bold">
                      Score: {sub.rating}/10
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {mySubmissions.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              No submissions logged yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
