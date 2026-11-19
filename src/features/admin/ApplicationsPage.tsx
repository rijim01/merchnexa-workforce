import { useState, useEffect } from "react";
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
    employeeList,
    showToast,
    authToken,
  } = useWorkforce();

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Live fetch applications and assignments from MongoDB on mount
  useEffect(() => {
    async function fetchAppsAndAssignments() {
      try {
        const [appRes, assignRes] = await Promise.allSettled([
          api.applications.list(authToken || undefined),
          api.assignments.list(authToken || undefined),
        ]);
        if (appRes.status === "fulfilled" && Array.isArray(appRes.value?.applications)) {
          setApplications(appRes.value.applications);
        }
        if (assignRes.status === "fulfilled" && Array.isArray(assignRes.value?.assignments)) {
          setAssignments(assignRes.value.assignments);
        }
      } catch (err) {
        console.warn("Could not fetch live applications or assignments:", err);
      }
    }
    fetchAppsAndAssignments();
  }, [authToken]);

  const updateStatus = async (id: number, status: ApplicationStatus) => {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, status } : application
      )
    );

    try {
      await api.applications.updateStatus(id, status, authToken || undefined);
      showToast(`Application marked as ${status} in MongoDB!`, "success");
      // Refresh assignments
      const res = await api.assignments.list(authToken || undefined);
      if (res?.assignments) {
        setAssignments(res.assignments);
      }
    } catch (err: any) {
      console.error("Failed to update application on server:", err);
      showToast(`Status updated locally (Server sync: ${err.message})`, "warning");
    }
  };

  const approveAndAssignApplication = async (application: ApplicationItem) => {
    // 1. Optimistically update application
    setApplications((current) =>
      current.map((app) =>
        app.id === application.id ? { ...app, status: "Accepted" } : app
      )
    );

    // 2. Find target task
    const targetTask = taskList.find((t) => t.title === application.taskTitle);
    const deadline = targetTask?.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const payment = targetTask?.payment || 1500;

    // 3. Optimistically create assignment in state
    const newAssignment: AssignmentItem = {
      id: application.id,
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

    setAssignments((current) => {
      const exists = current.some(
        (a) => a.id === application.id || (a.email === application.email && a.taskTitle === application.taskTitle)
      );
      return exists ? current : [newAssignment, ...current];
    });

    // 4. Update task in local state
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

    // 5. Sync to server
    try {
      await api.applications.updateStatus(application.id, "Accepted", authToken || undefined);
      showToast(`✓ ${application.employee} approved & assigned to "${application.taskTitle}"!`, "success");
      // Refresh assignments from MongoDB
      const res = await api.assignments.list(authToken || undefined);
      if (res?.assignments) {
        setAssignments(res.assignments);
      }
    } catch (err: any) {
      console.error("Failed to update application on server:", err);
      showToast(`Status updated locally (Server sync: ${err.message})`, "warning");
    }
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

                  {/* Applicant Skills */}
                  {(() => {
                    const applicant = employeeList.find(
                      (e) => e.email.toLowerCase() === application.email.toLowerCase()
                    );
                    if (applicant?.skills && applicant.skills.length > 0) {
                      return (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-400">Skills:</span>
                          {applicant.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                    onClick={() => approveAndAssignApplication(application)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    ✓ Approve & Assign Task
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
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Approved & Assigned to Task
                  </span>
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
