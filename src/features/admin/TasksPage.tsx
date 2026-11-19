import { useState } from "react";
import { Plus, X, CalendarDays, ExternalLink, Users, Building2 } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import type { TaskItem, TaskStatus } from "../../types";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";

export function TasksPage() {
  const { taskList, setTaskList, authToken, showToast } = useWorkforce();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [paymentType, setPaymentType] = useState<"FIXED" | "PER_UNIT">("FIXED");
  const [payment, setPayment] = useState("");
  const [unitRate, setUnitRate] = useState("10");
  const [unitName, setUnitName] = useState("Account");
  const [targetQuantity, setTargetQuantity] = useState("100");
  const [clientName, setClientName] = useState("");
  const [clientAmount, setClientAmount] = useState("");
  const [clientUnitRate, setClientUnitRate] = useState("15");
  const [deadline, setDeadline] = useState("");
  const [slots, setSlots] = useState("1");
  const [documentUrl, setDocumentUrl] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSkills("");
    setPaymentType("FIXED");
    setPayment("");
    setUnitRate("10");
    setUnitName("Account");
    setTargetQuantity("100");
    setClientName("");
    setClientAmount("");
    setClientUnitRate("15");
    setDeadline("");
    setSlots("1");
    setDocumentUrl("");
    setShowForm(false);
  };

  const createTask = async (status: TaskStatus) => {
    if (!title.trim() || !description.trim() || !deadline) {
      showToast("Please fill in all required task fields.", "warning");
      return;
    }

    let calculatedPayment = Number(payment);
    if (paymentType === "PER_UNIT") {
      const rate = Number(unitRate);
      const target = Number(targetQuantity);
      if (!rate || rate <= 0 || !target || target <= 0) {
        showToast("Please enter a valid rate per unit and target quantity.", "error");
        return;
      }
      calculatedPayment = rate * target;
    } else {
      if (!calculatedPayment || calculatedPayment <= 0 || !Number.isFinite(calculatedPayment)) {
        showToast("Please enter a valid whole number payment amount.", "error");
        return;
      }
    }

    const taskSlots = Number(slots) > 0 ? Number(slots) : 1;

    const newTask: TaskItem = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      payment: calculatedPayment,
      paymentType,
      unitRate: paymentType === "PER_UNIT" ? Number(unitRate) : undefined,
      unitName: paymentType === "PER_UNIT" ? unitName.trim() : undefined,
      targetQuantity: paymentType === "PER_UNIT" ? Number(targetQuantity) : undefined,
      completedQuantity: 0,
      clientName: clientName.trim() || undefined,
      clientAmount: paymentType === "PER_UNIT"
        ? (Number(clientUnitRate) ? Number(clientUnitRate) * (Number(targetQuantity) || 0) : undefined)
        : (Number(clientAmount) || undefined),
      clientUnitRate: paymentType === "PER_UNIT" && Number(clientUnitRate) ? Number(clientUnitRate) : undefined,
      deadline,
      documentUrl: documentUrl.trim(),
      status,
      employee: "Unassigned",
      assignedEmployees: [],
      slots: taskSlots,
    };

    setTaskList((previous) => [newTask, ...previous]);
    resetForm();

    try {
      const res = await api.tasks.create(newTask, authToken || undefined);
      if (res && res.task) {
        setTaskList((previous) => [res.task, ...previous.filter((t) => t.id !== newTask.id)]);
      }
      showToast(`✓ Task "${newTask.title}" saved to MongoDB Atlas!`, "success");
    } catch (err: any) {
      console.error("Task creation failed on backend:", err);
      showToast(
        `⚠ Could not save to MongoDB Atlas: ${err.message}. Make sure backend server is running!`,
        "error"
      );
    }
  };

  const updateStatus = (id: number, status: TaskStatus) => {
    setTaskList((previous) =>
      previous.map((task) => (task.id === id ? { ...task, status } : task))
    );
  };

  const filteredTasks = taskList.filter(
    (task) => filter === "All" || task.status === filter
  );

  return (
    <div className="space-y-5">
      {/* Task statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tasks</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{taskList.length}</h3>
          <p className="mt-1 text-xs text-slate-500">{taskList.filter((t) => t.status === "Open").length} open for applicants</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Staff Slots</p>
          <h3 className="mt-2 text-2xl font-bold text-blue-600">
            {taskList.reduce((sum, t) => sum + (t.assignedEmployees?.length || 0), 0)} / {taskList.reduce((sum, t) => sum + (t.slots || 1), 0)}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Assigned workers across tasks</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client Revenue / Invoiced</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            ৳{taskList
              .reduce((sum, t) => sum + (t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0)), 0)
              .toLocaleString("en-BD")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Gross billing from clients</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Expected Net Profit</p>
          <h3 className="mt-2 text-2xl font-bold text-emerald-700">
            ৳{taskList
              .reduce((sum, t) => {
                const clientRev = t.clientAmount || (t.clientUnitRate && t.targetQuantity ? t.clientUnitRate * t.targetQuantity : 0);
                const workerCost = t.paymentType === "PER_UNIT"
                  ? (t.payment || (t.unitRate && t.targetQuantity ? t.unitRate * t.targetQuantity : 0))
                  : ((t.payment || 0) * (t.slots || 1));
                return sum + (clientRev > 0 ? (clientRev - workerCost) : 0);
              }, 0)
              .toLocaleString("en-BD")}
          </h3>
          <p className="mt-1 text-xs text-emerald-600">Client billing minus total workforce payouts</p>
        </div>
      </div>

      {/* Task list */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">Task Management</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create, publish and manage project tasks.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Create New Task
          </button>
        </div>

        {/* Create task form */}
        {showForm && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Create a New Task
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the task information below.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Task Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Social Media Content Creation"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Task Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Explain what the employee needs to do..."
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Required Skills
                </label>
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Writing, Canva, Research"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Separate skills with commas.
                </p>
              </div>

              {/* Pricing Model Selector */}
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-xs font-bold text-slate-800">
                  Pricing & Work Model *
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType("FIXED")}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      paymentType === "FIXED"
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${paymentType === "FIXED" ? "bg-blue-600" : "bg-slate-300"}`} />
                      Fixed Project Budget
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Set a fixed total payment for the whole assignment (e.g. ৳1,500).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType("PER_UNIT")}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      paymentType === "PER_UNIT"
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${paymentType === "PER_UNIT" ? "bg-blue-600" : "bg-slate-300"}`} />
                      Bulky / Pay-per-Unit (Piece Rate)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pay per item or account created (e.g. ৳10 / Gmail Account).
                    </p>
                  </button>
                </div>

                {paymentType === "PER_UNIT" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Rate per Unit (BDT) *</label>
                      <input
                        type="number"
                        min="1"
                        value={unitRate}
                        onChange={(e) => setUnitRate(e.target.value)}
                        placeholder="10"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Unit Type / Label *</label>
                      <input
                        type="text"
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="Account, Lead, Entry"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Target Total Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={targetQuantity}
                        onChange={(e) => setTargetQuantity(e.target.value)}
                        placeholder="500"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3 text-[11px] text-blue-700 font-medium">
                      💡 Total Pool: {Number(targetQuantity) || 0} {unitName || "units"} @ ৳{unitRate || 0} = <b>৳{((Number(targetQuantity) || 0) * (Number(unitRate) || 0)).toLocaleString("en-BD")} total budget</b>
                    </div>
                  </div>
                )}
              </div>

              {paymentType === "FIXED" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Payment per Worker (BDT) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    placeholder="150"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Amount each individual worker will receive upon task completion.
                  </p>
                </div>
              )}

              {/* Allowed Workers / Slots */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  <Users size={13} className="mr-1 inline text-blue-600" />
                  Staff Capacity (Allowed Workers) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={slots}
                  onChange={(e) => setSlots(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Number of employees assigned to this task (e.g. 5 workers).
                </p>
              </div>

              {/* Client Billing & Profit Margin (Admin Eyes Only) */}
              <div className="sm:col-span-2 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-emerald-50/40 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-600" />
                    <span className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                      Client Billing & Net Profit Tracking (Admin Only)
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    Confidential
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Client / Company Name
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Acme Corp / Upwork Client"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  {paymentType === "FIXED" ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Client Invoiced Amount (BDT)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={clientAmount}
                        onChange={(e) => setClientAmount(e.target.value)}
                        placeholder="e.g. 2500"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Client Rate per {unitName || "Unit"} (BDT)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={clientUnitRate}
                        onChange={(e) => setClientUnitRate(e.target.value)}
                        placeholder="e.g. 15"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Live Profit Calculation Preview */}
                {paymentType === "FIXED" && Number(clientAmount) > 0 && (() => {
                  const workerCount = Math.max(1, Number(slots) || 1);
                  const payPerWorker = Number(payment) || 0;
                  const totalWorkerCost = payPerWorker * workerCount;
                  const clientTotal = Number(clientAmount);
                  const netProfit = clientTotal - totalWorkerCost;
                  const margin = clientTotal > 0 ? ((netProfit / clientTotal) * 100).toFixed(1) : "0";

                  return (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200/60 bg-white/90 p-3 text-xs shadow-xs">
                      <div>
                        <span className="text-slate-500">Client Invoiced:</span>{" "}
                        <b className="text-slate-900">৳{clientTotal.toLocaleString("en-BD")}</b>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-slate-500">Total Workforce Cost:</span>{" "}
                        <b className="text-rose-600">৳{totalWorkerCost.toLocaleString("en-BD")}</b>
                        {workerCount > 1 && (
                          <span className="text-[11px] text-slate-500 ml-1">
                            (৳{payPerWorker.toLocaleString("en-BD")} × {workerCount} workers)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-600">Net Profit:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-bold ${
                            netProfit >= 0
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {netProfit >= 0 ? `+৳${netProfit.toLocaleString("en-BD")}` : `-৳${Math.abs(netProfit).toLocaleString("en-BD")}`}{" "}
                          ({margin}% Margin)
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {paymentType === "PER_UNIT" && Number(clientUnitRate) > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-between rounded-lg border border-indigo-200/60 bg-white/90 p-3 text-xs shadow-xs">
                    <div>
                      <span className="text-slate-500">Client Rate:</span>{" "}
                      <b className="text-slate-900">৳{clientUnitRate}/{unitName || "Unit"}</b>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="text-slate-500">Employee Rate:</span>{" "}
                      <b className="text-rose-600">৳{unitRate}/{unitName || "Unit"}</b>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="text-slate-500">Profit Spread:</span>{" "}
                      <b className="text-emerald-700">৳{Number(clientUnitRate) - (Number(unitRate) || 0)}/{unitName || "Unit"}</b>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-600">Total Pool Profit:</span>
                      <span className="rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-0.5 border border-emerald-200">
                        +৳{((Number(clientUnitRate) - (Number(unitRate) || 0)) * (Number(targetQuantity) || 0)).toLocaleString("en-BD")}{" "}
                        ({Number(clientUnitRate) > 0
                          ? (((Number(clientUnitRate) - (Number(unitRate) || 0)) / Number(clientUnitRate)) * 100).toFixed(1)
                          : 0}% Margin)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  <CalendarDays size={13} className="mr-1 inline" />
                  Deadline *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Reference document */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  <ExternalLink size={13} className="mr-1 inline" />
                  Reference Document URL
                </label>
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-blue-100 pt-4">
              <button
                onClick={resetForm}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>

              <button
                onClick={() => createTask("Draft")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <Save size={15} />
                Save Draft
              </button>

              <button
                onClick={() => createTask("Open")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={15} />
                Publish Task
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["All", "Open", "Draft", "Closed"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Task cards */}
        <div className="mt-5 space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-slate-100 p-4 transition hover:border-blue-200"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {task.title}
                    </h4>

                    <StatusBadge value={task.status} />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {task.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>
                      <CalendarDays size={13} className="mr-1 inline" />
                      {task.deadline}
                    </span>

                    <span className="flex items-center gap-1">
                      <Users size={13} className="inline text-blue-600" />
                      {task.assignedEmployees && task.assignedEmployees.length > 0 ? (
                        <span className="font-semibold text-slate-700">
                          Assigned: {task.assignedEmployees.join(", ")} ({task.assignedEmployees.length}/{task.slots || 1} staff)
                        </span>
                      ) : (
                        <span>Open for applicants ({task.slots || 1} staff needed)</span>
                      )}
                    </span>

                    {task.documentUrl && (
                      <a
                        href={task.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Reference document
                        <ExternalLink size={11} className="ml-1 inline" />
                      </a>
                    )}
                  </div>

                  {/* Admin Profit & Client Billing Strip */}
                  {(task.clientAmount || task.clientUnitRate) && (() => {
                    const workerCost = task.paymentType === "PER_UNIT"
                      ? task.payment
                      : (task.payment * (task.slots || 1));
                    const clientRev = task.paymentType === "PER_UNIT"
                      ? (task.clientAmount || ((task.clientUnitRate || 0) * (task.targetQuantity || 0)))
                      : (task.clientAmount || 0);
                    const netProfit = clientRev - workerCost;
                    const margin = clientRev > 0 ? ((netProfit / clientRev) * 100).toFixed(0) : "0";

                    return (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs">
                        {task.clientName && (
                          <span className="font-bold text-indigo-950 flex items-center gap-1">
                            <Building2 size={13} className="text-indigo-600 inline" />
                            {task.clientName}
                          </span>
                        )}
                        <span className="text-slate-600">
                          Client Invoiced:{" "}
                          <b className="text-slate-900">
                            {task.paymentType === "PER_UNIT"
                              ? `৳${task.clientUnitRate}/${task.unitName || "unit"} (৳${clientRev.toLocaleString("en-BD")})`
                              : `৳${clientRev.toLocaleString("en-BD")}`}
                          </b>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600">
                          Worker Cost:{" "}
                          <b className="text-slate-900">
                            {task.paymentType === "PER_UNIT"
                              ? `৳${task.unitRate}/${task.unitName || "unit"} (৳${task.payment.toLocaleString("en-BD")})`
                              : `৳${workerCost.toLocaleString("en-BD")}`}
                          </b>
                          {task.paymentType !== "PER_UNIT" && (task.slots || 1) > 1 && (
                            <span className="text-[10px] text-slate-500 ml-1">
                              (৳{task.payment} × {task.slots} workers)
                            </span>
                          )}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded border ${
                            netProfit >= 0
                              ? "text-emerald-800 bg-emerald-100 border-emerald-200"
                              : "text-rose-800 bg-rose-100 border-rose-200"
                          }`}
                        >
                          Net Profit: {netProfit >= 0 ? `+৳${netProfit.toLocaleString("en-BD")}` : `-৳${Math.abs(netProfit).toLocaleString("en-BD")}`}{" "}
                          ({margin}% Margin)
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  {task.paymentType === "PER_UNIT" ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 text-xs border border-emerald-200">
                          ৳{task.unitRate} / {task.unitName || "Unit"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Pool: {task.completedQuantity || 0}/{task.targetQuantity || 100} units (৳{task.payment.toLocaleString("en-BD")})
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-slate-900">
                        ৳{task.payment.toLocaleString("en-BD")}
                      </p>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {(task.slots || 1) > 1 ? `per worker (${task.slots} slots = ৳${(task.payment * (task.slots || 1)).toLocaleString("en-BD")})` : "Fixed Budget"}
                      </span>
                    </>
                  )}

                  <div className="flex gap-2 mt-2">
                    {task.status === "Draft" && (
                      <button
                        onClick={() => updateStatus(task.id, "Open")}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                      >
                        Publish
                      </button>
                    )}

                    {task.status === "Open" && (
                      <button
                        onClick={() => updateStatus(task.id, "Closed")}
                        className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                      >
                        Close Task
                      </button>
                    )}

                    {task.status === "Closed" && (
                      <button
                        onClick={() => updateStatus(task.id, "Open")}
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              No tasks found.
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Showing {filteredTasks.length} of {taskList.length} tasks
          </p>
        </div>
      </div>
    </div>
  );
}
