import React from "react";

export function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    "In Progress": "bg-blue-50 text-blue-700",
    "Under Review": "bg-violet-50 text-violet-700",
    Assigned: "bg-slate-100 text-slate-600",
    Completed: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-red-50 text-red-700",
    Suspended: "bg-orange-50 text-orange-700",
    Draft: "bg-slate-100 text-slate-600",
    Open: "bg-emerald-50 text-emerald-700",
    Closed: "bg-red-50 text-red-700",
    Approved: "bg-emerald-50 text-emerald-700",
    "Revision Requested": "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}
