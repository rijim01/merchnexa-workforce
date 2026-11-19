import React, { useState } from "react";
import { Search, Eye } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";
import type { Employee } from "../../types";
import { EmployeeDetailsModal } from "./EmployeeDetailsModal";

export function EmployeesPage() {
  const { employeeList, setEmployeeList, authToken } = useWorkforce();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const pendingCount = employeeList.filter(
    (employee) => employee.status === "Pending"
  ).length;

  const activeCount = employeeList.filter(
    (employee) => employee.status === "Active"
  ).length;

  const handleApproval = async (email: string, newStatus: any) => {
    setEmployeeList((previous) =>
      previous.map((employee) =>
        employee.email === email
          ? { ...employee, status: newStatus }
          : employee
      )
    );
    try {
      await api.employees.updateStatus(email, newStatus, authToken || undefined);
    } catch (e) {
      // Local state is already updated, quiet fallback
    }
  };

  const filtered = employeeList.filter((employee) => {
    const matchesSearch = `${employee.name} ${employee.email} ${employee.role}`
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesFilter = filter === "All" || employee.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5">
      {/* Employee statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Employees</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {employeeList.length}
          </h3>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active Employees</p>
          <h3 className="mt-2 text-2xl font-bold text-emerald-600">
            {activeCount}
          </h3>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending Approvals</p>
          <h3 className="mt-2 text-2xl font-bold text-amber-600">
            {pendingCount}
          </h3>
        </div>
      </div>

      {/* Employee management */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              Employee Management
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Review and manage employee registrations.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees..."
              className="w-full text-sm outline-none sm:w-48"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {["All", "Active", "Pending", "Rejected", "Suspended"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item}
              {item === "Pending" && (
                <span className="ml-2">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Mobile View: Responsive Cards */}
        <div className="mt-4 space-y-3 sm:hidden">
          {filtered.map((employee) => (
            <div
              key={employee.email}
              className="rounded-xl border border-slate-100 p-4 shadow-xs hover:border-blue-200 transition bg-white"
              onClick={() => setSelectedEmployee(employee)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {employee.photoUrl ? (
                    <img
                      src={employee.photoUrl}
                      alt={employee.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${employee.color}`}
                    >
                      {employee.initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{employee.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{employee.email}</p>
                  </div>
                </div>
                <StatusBadge value={employee.status} />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-slate-500 font-medium">{employee.role}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={12} />
                    <span>Details</span>
                  </button>
                  {employee.status === "Pending" && (
                    <button
                      onClick={() => handleApproval(employee.email, "Active")}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No employees found.</p>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="mt-5 hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-slate-100 text-xs text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Employee</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((employee) => (
                <tr
                  key={employee.email}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition cursor-pointer"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {employee.photoUrl ? (
                        <img
                          src={employee.photoUrl}
                          alt={employee.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${employee.color}`}
                        >
                          {employee.initials}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {employee.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 text-sm text-slate-600">
                    {employee.role}
                  </td>

                  <td className="py-4">
                    <StatusBadge value={employee.status} />
                  </td>

                  <td className="py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>

                      {employee.status === "Pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleApproval(employee.email, "Active")
                            }
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() =>
                              handleApproval(employee.email, "Rejected")
                            }
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {employee.status === "Active" && (
                        <button
                          onClick={() =>
                            handleApproval(employee.email, "Suspended")
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Suspend
                        </button>
                      )}

                      {employee.status === "Suspended" && (
                        <button
                          onClick={() =>
                            handleApproval(employee.email, "Active")
                          }
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Reactivate
                        </button>
                      )}

                      {employee.status === "Rejected" && (
                        <button
                          onClick={() =>
                            handleApproval(employee.email, "Pending")
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-sm text-slate-400"
                  >
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Showing {filtered.length} of {employeeList.length} employees
          </p>
        </div>
      </div>

      {/* Employee Details Modal for Admin */}
      <EmployeeDetailsModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onStatusChange={handleApproval}
      />
    </div>
  );
}
