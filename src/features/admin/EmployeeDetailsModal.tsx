import React, { useState } from "react";
import {
  X,
  Phone,
  Calendar,
  Clock,
  Wallet,
  ExternalLink,
  Star,
} from "lucide-react";
import type { Employee } from "../../types";
import { StatusBadge } from "../../components/StatusBadge";
import { useWorkforce } from "../../context/WorkforceContext";

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  onClose: () => void;
  onStatusChange: (email: string, newStatus: any) => void;
}

export function EmployeeDetailsModal({
  employee,
  onClose,
  onStatusChange,
}: EmployeeDetailsModalProps) {
  const { taskList, submissions, ledger } = useWorkforce();
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "finance">("overview");

  if (!employee) return null;

  // Filter employee data
  const empTasks = taskList.filter((t) => t.employee === employee.name);
  const empSubmissions = submissions.filter((s) => s.email === employee.email);
  const empTxns = ledger.filter((t) => t.email === employee.email);

  const completedTasks = empTasks.filter((t) => t.status === "Completed" || t.status === "Closed");
  const inProgressTasks = empTasks.filter(
    (t) => t.status === "In Progress" || t.status === "Assigned" || t.status === "Under Review"
  );

  const totalCredits = empTxns
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = empTxns
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalCredits - totalDebits;

  const approvedSubs = empSubmissions.filter((s) => s.status === "Approved");
  const totalRatingPoints = approvedSubs.reduce((sum, s) => sum + (s.rating || 9), 0);
  const avgRating = approvedSubs.length > 0 ? Number((totalRatingPoints / approvedSubs.length).toFixed(1)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt={employee.name}
                className="h-20 w-20 rounded-full border-2 border-white/20 object-cover shadow-md"
              />
            ) : (
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold ${
                  employee.color || "bg-blue-600 text-white"
                }`}
              >
                {employee.initials}
              </div>
            )}

            <div className="text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-xl font-bold tracking-tight text-white">{employee.name}</h2>
                <StatusBadge value={employee.status} />
              </div>
              <p className="mt-0.5 text-xs text-blue-200">{employee.role}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-300">{employee.email}</p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-white/10 p-2.5 text-center text-xs backdrop-blur-sm">
            <div>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Completed</p>
              <p className="mt-1 text-base font-bold text-white">{completedTasks.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Avg Rating</p>
              <p className="mt-1 text-base font-bold text-amber-300 flex items-center justify-center gap-1">
                <Star size={13} className="fill-amber-400" />
                <span>{avgRating}/10</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">In Progress</p>
              <p className="mt-1 text-base font-bold text-blue-200">{inProgressTasks.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Balance</p>
              <p className="mt-1 text-base font-bold text-emerald-300">৳{currentBalance.toLocaleString("en-BD")}</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-2 sm:px-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Profile Overview
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "tasks"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Tasks & Work ({empTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("finance")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "finance"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Financial Ledger ({empTxns.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Bio */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">About & Bio</h4>
                <p className="leading-relaxed text-slate-600 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  {employee.bio || "No professional biography provided yet."}
                </p>
              </div>

              {/* Skills badges */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Skills & Specializations</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(employee.skills || ["Graphic Design", "Content Writer"]).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Personal Details Grid */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5">
                  <Calendar size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Date of Birth</p>
                    <p className="font-medium text-slate-800">{employee.birthDate || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5">
                  <Phone size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Phone / WhatsApp</p>
                    <p className="font-medium text-slate-800">{employee.phone || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5">
                  <Wallet size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Payout Method</p>
                    <p className="font-medium text-slate-800">
                      {employee.paymentMethod || "bKash"} ({employee.paymentNumber || "N/A"})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5">
                  <Clock size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Member Since</p>
                    <p className="font-medium text-slate-800">{employee.joinedDate || "November 2026"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Assigned Tasks & Deliverables</h4>
              {empTasks.length === 0 ? (
                <p className="py-6 text-center text-slate-400">No tasks assigned to this employee yet.</p>
              ) : (
                <div className="space-y-2">
                  {empTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{task.title}</p>
                        <p className="text-[11px] text-slate-400">
                          Deadline: {task.deadline} • Payment: ৳{task.payment.toLocaleString("en-BD")}
                        </p>
                      </div>
                      <StatusBadge value={task.status} />
                    </div>
                  ))}
                </div>
              )}

              {/* Submissions Section */}
              {empSubmissions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-2">Submitted Deliverables</h4>
                  <div className="space-y-2">
                    {empSubmissions.map((sub) => (
                      <div key={sub.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{sub.taskTitle}</p>
                          <StatusBadge value={sub.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">{sub.notes}</p>
                        {sub.deliverableUrl && (
                          <a
                            href={sub.deliverableUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                          >
                            <ExternalLink size={12} />
                            <span>View Deliverable in Google Drive</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Ledger Activity</h4>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Total Earned: </span>
                  <span className="font-bold text-emerald-600">৳{totalCredits.toLocaleString("en-BD")}</span>
                </div>
              </div>

              {empTxns.length === 0 ? (
                <p className="py-6 text-center text-slate-400">No financial transactions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {empTxns.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              txn.type === "CREDIT" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {txn.type}
                          </span>
                          <span className="font-medium text-slate-800">{txn.description}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {txn.date} • Method: {txn.method} (Ref: {txn.reference})
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          txn.type === "CREDIT" ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {txn.type === "CREDIT" ? "+" : "-"}৳{txn.amount.toLocaleString("en-BD")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Admin Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            {employee.status === "Pending" && (
              <>
                <button
                  onClick={() => {
                    onStatusChange(employee.email, "Active");
                    onClose();
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Approve Registration
                </button>
                <button
                  onClick={() => {
                    onStatusChange(employee.email, "Rejected");
                    onClose();
                  }}
                  className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  Reject
                </button>
              </>
            )}

            {employee.status === "Active" && (
              <button
                onClick={() => {
                  onStatusChange(employee.email, "Suspended");
                  onClose();
                }}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
              >
                Suspend Employee
              </button>
            )}

            {employee.status === "Suspended" && (
              <button
                onClick={() => {
                  onStatusChange(employee.email, "Active");
                  onClose();
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                Reactivate Account
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
