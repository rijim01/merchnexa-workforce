import React from "react";
import { Settings } from "lucide-react";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="rounded-xl bg-blue-50 p-4 text-blue-600">
        <Settings size={26} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        This section is prepared in the design roadmap and will be activated with the backend endpoints.
      </p>
    </div>
  );
}
