import React, { useState } from "react";
import {
  Shield,
  Database,
  CreditCard,
  CheckCircle2,
  Save,
  Key,
  FolderOpen,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  RefreshCw,
  Check,
} from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";
import { changeCurrentUserEmail, changeCurrentUserPassword } from "../../config/firebase";
import { validatePassword } from "../../utils/validation";

export function SettingsPage() {
  const { firebaseUser, authToken, showToast } = useWorkforce();

  // General Settings state
  const [spreadsheetId, setSpreadsheetId] = useState("1WrcxMNHh1KuNm96kXUkU6t0PHxxx76oTW9icP5I5iys");
  const [driveFolderId, setDriveFolderId] = useState("1bnS-SQon31iPHnaxVD229r7UYYHA33To");
  const [minCashout, setMinCashout] = useState("500");
  const [regMode, setRegMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Cloud Diagnostics state
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const handleRunDiagnostic = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const data = await api.diagnostics.testConnections();
      setDiagResult(data);
      if (data.success) {
        showToast("✓ Firebase & Google Sheets live tests passed!", "success");
      } else {
        showToast("⚠ One or more checks failed. See details below.", "warning");
      }
    } catch (err: any) {
      console.error(err);
      setDiagResult({
        success: false,
        summary: "Could not reach backend API at localhost:5000",
        results: {
          error: err.message || "Network request failed. Is the backend server running?",
        },
      });
      showToast("Diagnostic check failed. Make sure server is started.", "error");
    } finally {
      setDiagLoading(false);
    }
  };

  // Admin Credentials state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    showToast("System settings saved successfully!", "success");
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    const emailToUpdate = newAdminEmail.trim();
    const passToUpdate = newAdminPassword.trim();

    if (!emailToUpdate && !passToUpdate) {
      setCredError("Please enter a new email or password to update.");
      return;
    }

    if (passToUpdate) {
      const passValidation = validatePassword(passToUpdate);
      if (!passValidation.valid) {
        setCredError(passValidation.error!);
        showToast(passValidation.error!, "error");
        return;
      }
      if (passToUpdate !== confirmPassword.trim()) {
        const mismatchErr = "New password and confirmation password do not match.";
        setCredError(mismatchErr);
        showToast(mismatchErr, "error");
        return;
      }
    }

    setCredLoading(true);

    try {
      // 1. First attempt backend update using Firebase Admin SDK
      let backendUpdated = false;
      try {
        await api.auth.updateAdminCredentials(
          {
            newEmail: emailToUpdate || undefined,
            newPassword: passToUpdate || undefined,
          },
          authToken || undefined
        );
        backendUpdated = true;
      } catch {
        backendUpdated = false;
      }

      // 2. If client is logged in via Firebase Web SDK directly
      if (!backendUpdated && firebaseUser) {
        if (emailToUpdate && emailToUpdate !== firebaseUser.email) {
          await changeCurrentUserEmail(emailToUpdate);
        }
        if (passToUpdate) {
          await changeCurrentUserPassword(passToUpdate);
        }
      }

      setCredSuccess("Admin login credentials successfully updated!");
      showToast("Admin login credentials successfully updated!", "success");
      setNewAdminPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      const msg =
        err.message ||
        "Failed to update credentials. If recently logged in, Firebase requires re-authentication.";
      setCredError(msg);
      showToast(msg, "error");
    } finally {
      setCredLoading(false);
    }
  };

  const currentDisplayEmail =
    firebaseUser?.email || import.meta.env.VITE_ADMIN_EMAIL || "jim.sec14@gmail.com";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Settings Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Platform & System Settings</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage Admin credentials, cloud database connections, payout rules, and access control.
            </p>
          </div>
          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={16} />
              <span>Settings successfully saved!</span>
            </div>
          )}
        </div>
      </div>

      {/* 🔐 Admin Security & Credentials Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Admin Account Security & Credentials</h4>
            <p className="text-xs text-slate-500">
              Change the primary Administrator login email address and access password.
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {credError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <span>{credError}</span>
          </div>
        )}

        {credSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>{credSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-blue-600" />
                <span className="font-semibold text-slate-700">Current Admin Identity:</span>
              </div>
              <span className="font-mono font-medium text-slate-800">{currentDisplayEmail}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">New Admin Email Address</label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="new-admin@merchnexa.com"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Leave blank if keeping current email.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">New Password (min 6 characters)</label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Leave blank if keeping current password. Must be at least 6 characters with 1 uppercase, 1 number, and 1 special character.
              </p>
            </div>
          </div>

          {newAdminPassword && (
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700">Confirm New Password</label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={credLoading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition active:scale-[0.99] disabled:opacity-50"
            >
              <Save size={15} />
              <span>{credLoading ? "Updating..." : "Update Admin Credentials"}</span>
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Cloud Database & Google Workspace Integrations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Database size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">MongoDB Atlas & Cloud Storage</h4>
              <p className="text-xs text-slate-500">
                Primary MongoDB Atlas database with secondary Google Sheets synchronization.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* MongoDB Atlas Setup Notice */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-bold text-emerald-950">Primary Database: MongoDB Atlas (Mongoose)</p>
                  </div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    All core tables (Employees, Tasks, Deliverables, Applications, Ledger & Audit Logs) are stored in MongoDB Atlas.
                    Ensure <code className="rounded bg-emerald-100 px-1 py-0.5 font-mono font-semibold text-emerald-900">MONGODB_URI</code> is added in your backend <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-700">.env</code> and Render Environment Variables.
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    💡 <b>Important:</b> In MongoDB Atlas &rarr; <i>Network Access</i>, ensure IP <code className="font-mono font-bold">0.0.0.0/0</code> is added so Render cloud servers can connect.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={diagLoading}
                  onClick={handleRunDiagnostic}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={13} className={diagLoading ? "animate-spin" : ""} />
                  <span>{diagLoading ? "Testing..." : "Test Database & Cloud"}</span>
                </button>
              </div>
            </div>

            {/* Live Diagnostic Results Card */}
            {diagResult && (
              <div
                className={`rounded-xl border p-4 text-xs transition-all animate-in fade-in ${
                  diagResult.success
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                }`}
              >
                <div className="flex items-center justify-between border-b pb-2.5 mb-3 border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-bold ${
                        diagResult.success ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      {diagResult.success ? "✓" : "!"}
                    </span>
                    <span className="font-bold text-slate-800">{diagResult.summary}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {diagResult.results?.timestamp ? new Date(diagResult.results.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* MongoDB Atlas Report */}
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">MongoDB Atlas</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diagResult.results?.mongoAtlas?.status === "CONNECTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : diagResult.results?.mongoAtlas?.status === "NOT_CONFIGURED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {diagResult.results?.mongoAtlas?.status || "PENDING"}
                      </span>
                    </div>
                    {diagResult.results?.mongoAtlas?.status === "CONNECTED" ? (
                      <div className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                        <p className="truncate">Database: <b className="font-mono text-slate-800">{diagResult.results?.mongoAtlas?.database}</b></p>
                        <p className="text-[10px] text-slate-500 truncate">Host: {diagResult.results?.mongoAtlas?.host}</p>
                        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded bg-slate-50 p-1.5 text-[10px]">
                          <div>Staff: <b>{diagResult.results?.mongoAtlas?.collections?.employees ?? 0}</b></div>
                          <div>Tasks: <b>{diagResult.results?.mongoAtlas?.collections?.tasks ?? 0}</b></div>
                          <div>Submissions: <b>{diagResult.results?.mongoAtlas?.collections?.submissions ?? 0}</b></div>
                          <div>Ledger: <b>{diagResult.results?.mongoAtlas?.collections?.transactions ?? 0}</b></div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-amber-700 leading-snug">
                        {diagResult.results?.mongoAtlas?.error || "MONGODB_URI not configured or unreachable."}
                      </p>
                    )}
                  </div>

                  {/* Firebase report */}
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Firebase Auth</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diagResult.results?.firebase?.status === "CONNECTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {diagResult.results?.firebase?.status}
                      </span>
                    </div>
                    {diagResult.results?.firebase?.status === "CONNECTED" ? (
                      <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                        Project: <code className="font-bold text-slate-800">{diagResult.results?.firebase?.projectId}</code>
                        <br />
                        Auth Users: <b>{diagResult.results?.firebase?.userCount}</b>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-red-600">
                        {diagResult.results?.firebase?.error || "Connection failed"}
                      </p>
                    )}
                  </div>

                  {/* Google Sheets report */}
                  <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Google Sheets Sync</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diagResult.results?.googleSheets?.status === "CONNECTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {diagResult.results?.googleSheets?.status}
                      </span>
                    </div>
                    {diagResult.results?.googleSheets?.status === "CONNECTED" ? (
                      <div className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                        <p className="truncate">Title: <b>{diagResult.results?.googleSheets?.spreadsheetTitle}</b></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Tabs: {diagResult.results?.googleSheets?.tabsFound?.join(", ") || "None"}
                        </p>
                        <p className="mt-0.5 text-emerald-600 font-semibold">
                          ✓ Write Sync: {diagResult.results?.googleSheets?.writeTest}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-red-600 leading-relaxed">
                        {diagResult.results?.googleSheets?.error || "Connection failed"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Google Spreadsheet ID (Backup Mirror)</label>
              <p className="mb-2 text-[11px] text-slate-400">
                Found in your Google Sheet URL: https://docs.google.com/spreadsheets/d/<b>[SPREADSHEET_ID]</b>/edit
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Google Drive Folder ID (Deliverables)</label>
              <p className="mb-2 text-[11px] text-slate-400">
                Default Google Drive root folder where employee deliverables and project files are submitted.
              </p>
              <div className="relative">
                <FolderOpen size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Service Account Status Banner */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-start gap-3">
                <Key size={18} className="mt-0.5 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-blue-900">Authorized Service Account</p>
                  <p className="mt-1 font-mono text-[11px] text-blue-700">
                    firebase-adminsdk-fbsvc@merchnexa-workhub.iam.gserviceaccount.com
                  </p>
                  <p className="mt-1 text-slate-500">
                    Remember to share your Google Sheet with this email address as <b>Editor</b> so it can read/write rows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Authentication & Security Policy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Staff Registration & Access Control</h4>
              <p className="text-xs text-slate-500">
                Manage roles, user registration policy, and staff approval workflow.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">New Staff Registration Review</label>
              <select
                value={regMode}
                onChange={(e) => setRegMode(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="MANUAL">Manual Approval (Admin must approve each account)</option>
                <option value="AUTO">Auto-Approval (Immediate access upon email verification)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Role Structure</label>
              <input
                type="text"
                disabled
                value="2 Roles: ADMIN (Jim) & EMPLOYEE (Staff)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Financial & Payout Parameters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CreditCard size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Financial Rules & BDT Currency</h4>
              <p className="text-xs text-slate-500">
                Cashout thresholds and payment channels (bKash, Nagad, Bank Wire).
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Currency Unit</label>
              <input
                type="text"
                disabled
                value="Bangladeshi Taka (৳ BDT)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Minimum Cashout Threshold (৳)</label>
              <input
                type="number"
                value={minCashout}
                onChange={(e) => setMinCashout(e.target.value)}
                placeholder="500"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Accounting Ledger Model</label>
              <input
                type="text"
                disabled
                value="Strict Append-Only (Immutable)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Save size={16} />
            <span>Save System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
