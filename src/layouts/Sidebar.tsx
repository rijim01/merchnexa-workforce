import React from "react";
import { X, MoreHorizontal } from "lucide-react";
import { navigation, employeeNavigation } from "../data/mockData";
import { useWorkforce } from "../context/WorkforceContext";

export function Sidebar() {
  const {
    role,
    active,
    setActive,
    mobileOpen,
    setMobileOpen,
    currentEmployee,
    employeeList,
    firebaseUser,
  } = useWorkforce();

  const navItems = role === "ADMIN" ? navigation : employeeNavigation;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#111827] text-white transition-transform overflow-y-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Merch<span className="text-blue-400">Nexa</span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {role === "ADMIN" ? "Admin Workforce Hub" : "Employee Portal"}
            </p>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {role === "ADMIN" ? "Workspace" : "Staff Hub"}
          </p>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActive(item.name);
                    setMobileOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    selected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                  {role === "ADMIN" && item.name === "Employees" && (
                    <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[10px]">
                      {employeeList.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
            {!firebaseUser ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                  MN
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">MerchNexa Staff</p>
                  <p className="text-[10px] text-slate-400">Not signed in</p>
                </div>
              </>
            ) : role === "ADMIN" ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                  J
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Jim</p>
                  <p className="text-xs text-slate-400">Administrator</p>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    currentEmployee?.color || "bg-purple-100 text-purple-700"
                  }`}
                >
                  {currentEmployee?.initials || "EM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {currentEmployee?.name || "Employee"}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {currentEmployee?.role || "Staff Member"}
                  </p>
                </div>
              </>
            )}
            <MoreHorizontal size={18} className="text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  );
}
