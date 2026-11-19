import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let accentBorder = "border-slate-700/80";
        let glowShadow = "shadow-slate-950/50";
        let iconBadge = "bg-blue-500/15 text-blue-400 border border-blue-500/30";
        let tag = "NOTIFICATION";
        let tagColor = "text-blue-400";
        let icon = <Info size={18} />;

        if (toast.type === "success") {
          accentBorder = "border-emerald-500/40";
          glowShadow = "shadow-emerald-950/40";
          iconBadge = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
          tag = "SUCCESS";
          tagColor = "text-emerald-400";
          icon = <CheckCircle2 size={18} />;
        } else if (toast.type === "error") {
          accentBorder = "border-rose-500/40";
          glowShadow = "shadow-rose-950/40";
          iconBadge = "bg-rose-500/15 text-rose-400 border border-rose-500/30";
          tag = "ERROR";
          tagColor = "text-rose-400";
          icon = <AlertCircle size={18} />;
        } else if (toast.type === "warning") {
          accentBorder = "border-amber-500/40";
          glowShadow = "shadow-amber-950/40";
          iconBadge = "bg-amber-500/15 text-amber-400 border border-amber-500/30";
          tag = "ALERT";
          tagColor = "text-amber-400";
          icon = <AlertTriangle size={18} />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 rounded-2xl border bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ${accentBorder} ${glowShadow}`}
          >
            {/* Left glowing accent line */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                toast.type === "success"
                  ? "bg-emerald-500"
                  : toast.type === "error"
                  ? "bg-rose-500"
                  : toast.type === "warning"
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
            />

            {/* Icon Pill */}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBadge}`}>
              {icon}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold tracking-wider uppercase ${tagColor}`}>
                  {tag}
                </span>
                <span className="text-[10px] text-slate-500">• MerchNexa</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-200 leading-relaxed">
                {toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
