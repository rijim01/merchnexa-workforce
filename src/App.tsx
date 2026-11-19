import React from "react";
import { Plus } from "lucide-react";
import { WorkforceProvider, useWorkforce } from "./context/WorkforceContext";
import { Sidebar } from "./layouts/Sidebar";
import { Header } from "./layouts/Header";
import { AuthModal } from "./features/auth/AuthModal";
import { PlaceholderPage } from "./components/PlaceholderPage";

// Admin features
import { Overview } from "./features/admin/Overview";
import { EmployeesPage } from "./features/admin/EmployeesPage";
import { TasksPage } from "./features/admin/TasksPage";
import { ApplicationsPage } from "./features/admin/ApplicationsPage";
import { SubmissionsPage } from "./features/admin/SubmissionsPage";
import { PaymentsPage } from "./features/admin/PaymentsPage";
import { ReportsPage } from "./features/admin/ReportsPage";
import { SettingsPage } from "./features/admin/SettingsPage";

// Employee features
import { EmployeeDashboard } from "./features/employee/EmployeeDashboard";
import { EmployeeAvailableTasks } from "./features/employee/EmployeeAvailableTasks";
import { EmployeeMyTasks } from "./features/employee/EmployeeMyTasks";
import { EmployeeSubmissions } from "./features/employee/EmployeeSubmissions";
import { EmployeeEarnings } from "./features/employee/EmployeeEarnings";
import { EmployeeProfile } from "./features/employee/EmployeeProfile";

function MainContent() {
  const { role, active, setActive, currentEmployee, isAuthLoading } = useWorkforce();

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Loading MerchNexa WorkHub...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuthModal />
      <Sidebar />

      <div className="min-h-screen lg:pl-64">
        <Header />

        <main className="space-y-6 p-4 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {active === "Overview" ? "Dashboard Overview" : active}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {role === "ADMIN"
                  ? active === "Overview"
                    ? "Here's what's happening with your team today."
                    : `Manage your ${active.toLowerCase()} workspace.`
                  : `Employee Workspace for ${currentEmployee.name}.`}
              </p>
            </div>
            {role === "ADMIN" && active === "Overview" && (
              <button
                onClick={() => setActive("Tasks")}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={17} /> Create New Task
              </button>
            )}
          </div>

          {/* Admin Routing */}
          {role === "ADMIN" && (
            <>
              {active === "Overview" && <Overview />}
              {active === "Employees" && <EmployeesPage />}
              {active === "Tasks" && <TasksPage />}
              {active === "Applications" && <ApplicationsPage />}
              {active === "Submissions" && <SubmissionsPage />}
              {active === "Payments" && <PaymentsPage />}
              {active === "Reports" && <ReportsPage />}
              {active === "Settings" && <SettingsPage />}
              {![
                "Overview",
                "Employees",
                "Tasks",
                "Applications",
                "Submissions",
                "Payments",
                "Reports",
                "Settings",
              ].includes(active) && <PlaceholderPage title={active} />}
            </>
          )}

          {/* Employee Portal Routing */}
          {role === "EMPLOYEE" && (
            <>
              {active === "My Dashboard" && <EmployeeDashboard />}
              {active === "Available Tasks" && <EmployeeAvailableTasks />}
              {active === "My Tasks" && <EmployeeMyTasks />}
              {active === "My Submissions" && <EmployeeSubmissions />}
              {active === "My Earnings" && <EmployeeEarnings />}
              {active === "My Profile" && <EmployeeProfile />}
              {![
                "My Dashboard",
                "Available Tasks",
                "My Tasks",
                "My Submissions",
                "My Earnings",
                "My Profile",
              ].includes(active) && <PlaceholderPage title={active} />}
            </>
          )}

          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            © 2026 MerchNexa Workforce. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WorkforceProvider>
      <MainContent />
    </WorkforceProvider>
  );
}
