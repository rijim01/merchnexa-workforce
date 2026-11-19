import { useState } from "react";
import type { ApplicationItem, ApplicationStatus, AssignmentItem } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function ApplicationsPage() {
  const {
    applications,
    setApplications,
    assignments,
    setAssignments,
    taskList,
    setTaskList,
    showToast,
    authToken,
  } = useWorkforce();

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const updateStatus = async (id: number, status: ApplicationStatus) => {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, status } : application
      )
    );

    try {
      await api.applications.updateStatus(id, status, authToken || undefined);
      showToast(`Application marked as ${status} in MongoDB!`, "success");
    } catch (err: any) {
      console.error("Failed to update application on server:", err);
      showToast(`Status updated locally (Server sync: ${err.message})`, "warning");
    }
  };

  const assignApplication = (application: ApplicationItem) => {
    const alreadyAssigned = assignments.some(
      (assignment) => assignment.applicationId === application.id
    );

    if (alreadyAssigned) {
      showToast("This application has already been assigned.", "warning");
      return;
    }

    if (application.status !== "Accepted") {
      showToast("Only accepted applications can be assigned.", "warning");
      return;
    }

    const taskDetails: Record<string, { payment: number; deadline: string }> = {
      "Social Media Content Creation": {
        payment: 1500,
        deadline: "2026-11-21",
      },
      "Product Research & Analysis": {
        payment: 2000,
        deadline: "2026-11-22",
      },
      "Facebook Ad Creative Design": {
        payment: 1200,
        deadline: "2026-11-24",
      },
    };

    const details = taskDetails[application.taskTitle] || {
      payment: 1500,
      deadline: "2026-11-30",
    };

    const targetTask = taskList.find((t) => t.title === application.taskTitle);
    const payment = targetTask?.payment || details.payment;
    const deadline = targetTask?.deadline || details.deadline;

    const newAssignment: AssignmentItem = {
      id: Date.now(),
      applicationId: application.id,
      employee: application.employee,
      email: application.email,
      taskTitle: application.taskTitle,
      assignedOn: new Date().toISOString().slice(0, 10),
      deadline,
      payment,
      status: "Assigned",
      paymentType: targetTask?.paymentType,
      unitRate: targetTask?.unitRate,
      unitName: targetTask?.unitName,
      targetQuantity: targetTask?.targetQuantity,
    };

    setAssignments((current) => [...current, newAssignment]);

    // Add employee to task's multi-worker assigned list
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.title === application.taskTitle) {
          const currentList = t.assignedEmployees || [];
          const updatedList = currentList.includes(application.employee)
            ? currentList
            : [...currentList, application.employee];

          return {
            ...t,
            status: "In Progress",
            employee:
              updatedList.length === 1
                ? updatedList[0]
                : `${updatedList[0]} (+${updatedList.length - 1} more)`,
            assignedEmployees: updatedList,
          };
        }
        return t;
      })
    );

    showToast(`✓ ${application.employee} approved and assigned to "${application.taskTitle}"!`, "success");
  };

  const filteredApplications = applications.filter((application) => {
    const matchesFilter = filter === "All" || application.status === filter;

    const searchText = search.toLowerCase();

    const matchesSearch =
      application.employee.toLowerCase().includes(searchText) ||
      application.taskTitle.toLowerCase().includes(searchText) ||
      application.email.toLowerCase().includes(searchText);

    return matchesFilter && matchesSearch;
  });

  const counts = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "Pending").length,
    accepted: applications.filter((a) => a.status === "Accepted").length,
    rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  const statusStyles: Record<ApplicationStatus, string> = {
    Pending: "bg-amber-50 text-amber-700",
    Accepted: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Applications", value: counts.total },
          { label: "Pending Review", value: counts.pending },
          { label: "Accepted", value: counts.accepted },
          { label: "Rejected", value: counts.rejected },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Application List */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Employee Applications</h3>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage employee task applications.
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or task..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-64"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          {["All", "Pending", "Accepted", "Rejected"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Application Cards */}
        <div className="divide-y divide-slate-100">
          {filteredApplications.map((application) => (
            <div key={application.id} className="space-y-4 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {application.employee}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.email}
                  </p>
                </div>

                <span
                  className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[application.status]
                  }`}
                >
                  {application.status}
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Applied for
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {application.taskTitle}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Applied on: {application.appliedOn}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Application Message
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {application.message}
                </p>
              </div>

              {application.status === "Pending" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(application.id, "Accepted")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Accept Application
                  </button>

                  <button
                    onClick={() => updateStatus(application.id, "Rejected")}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {application.status === "Accepted" && (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-emerald-700">
                    Application accepted.
                  </p>

                  <button
                    onClick={() => assignApplication(application)}
                    disabled={assignments.some(
                      (a) => a.applicationId === application.id
                    )}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {assignments.some((a) => a.applicationId === application.id)
                      ? "Already Assigned"
                      : "Assign Task"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-700">No applications found</p>
              <p className="mt-1 text-sm text-slate-400">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">Assigned Tasks</h3>
          <p className="mt-1 text-sm text-slate-500">
            Track employees and their assigned projects.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
            >
              <div>
                <h4 className="font-semibold text-slate-900">
                  {assignment.taskTitle}
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  Assigned to: {assignment.employee}
                </p>

                <p className="mt-1 text-xs text-slate-400">{assignment.email}</p>
              </div>

              <div className="space-y-1 sm:text-right">
                <p className="text-sm font-semibold text-slate-800">
                  ৳{assignment.payment.toLocaleString("en-BD")}
                </p>

                <p className="text-xs text-slate-500">
                  Deadline: {assignment.deadline}
                </p>

                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {assignment.status}
                </span>
              </div>
            </div>
          ))}

          {assignments.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-400">
              No tasks assigned yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
