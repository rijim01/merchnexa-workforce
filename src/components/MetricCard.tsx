import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: string;
  direction?: "up" | "down";
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  direction = "up",
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
        >
          <Icon size={19} />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </h3>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
            direction === "up" ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {direction === "up" ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          )}
          {change}
        </span>
      </div>
    </div>
  );
}
