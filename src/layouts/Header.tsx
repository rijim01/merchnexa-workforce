import React from "react";
import { Menu, LogIn, LogOut, UserCheck } from "lucide-react";
import { useWorkforce } from "../context/WorkforceContext";

export function Header() {
  const {
    role,
    setRole,
    active,
    setActive,
    setMobileOpen,
    currentEmployee,
    firebaseUser,
    openLoginModal,
    handleLogout,
  } = useWorkforce();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={21} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{active}</h2>
          <p className="hidden text-xs text-slate-400 sm:block">
            {role === "ADMIN"
              ? "Welcome back, Jim. Here's your workspace overview."
              : `Signed in as ${currentEmployee.name} (${currentEmployee.role}).`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Admin-only Preview Switcher. Regular Employees NEVER see Admin View */}
        {role === "ADMIN" && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 sm:p-1">
            <button
              onClick={() => {
                setRole("ADMIN");
                setActive("Overview");
              }}
              className="rounded-lg bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
            >
              Admin
            </button>
            <button
              onClick={() => {
                setRole("EMPLOYEE");
                setActive("My Dashboard");
              }}
              className="rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              <span className="hidden sm:inline">Preview </span>Staff
            </button>
          </div>
        )}

        {role === "EMPLOYEE" && firebaseUser?.email?.toLowerCase().includes("admin") && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 sm:p-1">
            <button
              onClick={() => {
                setRole("ADMIN");
                setActive("Overview");
              }}
              className="rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              Admin
            </button>
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-white shadow-sm">
              Staff<span className="hidden sm:inline"> (Preview)</span>
            </span>
          </div>
        )}

        {/* Regular employee badge */}
        {role === "EMPLOYEE" && !firebaseUser?.email?.toLowerCase().includes("admin") && (
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
            Staff Portal
          </div>
        )}

        {/* User Auth Info & Login/Logout Action */}
        {firebaseUser ? (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {(firebaseUser.displayName || firebaseUser.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
                {firebaseUser.displayName || firebaseUser.email?.split("@")[0]}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <UserCheck size={11} />
                <span>{role === "ADMIN" ? "Admin" : "Verified Staff"}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="ml-1 rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
