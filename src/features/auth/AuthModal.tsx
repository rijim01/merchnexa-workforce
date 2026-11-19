import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { validatePassword } from "../../utils/validation";

export function AuthModal() {
  const {
    loginModalOpen,
    closeLoginModal,
    handleEmailLogin,
    handleEmailRegister,
    firebaseUser,
  } = useWorkforce();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If modal is not open, do not render
  if (!loginModalOpen) return null;

  // Real-time password requirement checks
  const hasMinLen = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate password complexity rule
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.error || "Password does not meet security requirements.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        await handleEmailLogin(email.trim(), password);
        setSuccessMsg("Signed in successfully!");
        setTimeout(() => {
          closeLoginModal();
        }, 400);
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }
        await handleEmailRegister(email.trim(), password, name.trim());
        setSuccessMsg("Registration submitted! Your employee account is pending Admin review.");
        setTimeout(() => closeLoginModal(), 1200);
      }
    } catch (err: any) {
      console.error(err);
      let message = err.message || "Authentication failed. Please check your credentials.";
      if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
        message = "Incorrect email address or password. Please try again.";
      } else if (message.includes("auth/email-already-in-use")) {
        message = "An account with this email already exists. Please sign in.";
      } else if (message.includes("auth/user-not-found")) {
        message = "No account found with this email. Please check spelling or register.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
          {firebaseUser && (
            <button
              onClick={closeLoginModal}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
              title="Close"
            >
              <X size={18} />
            </button>
          )}

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
            <ShieldCheck size={14} />
            MerchNexa Secure Portal
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Sign In to Your Workspace" : "Employee Registration"}
          </h2>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            {mode === "signin"
              ? "Enter your company email and password to access your dashboard."
              : "Register as a staff member. Your account will be verified by the administrator."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1">
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Staff Sign In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Register Account
          </button>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 animate-in fade-in">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
                <div className="relative mt-1">
                  <User size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Ahmed"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address *</label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@merchnexa.com"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Password *</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Real-time Password Requirements Checklist */}
              <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLen ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                    <Check size={12} className={hasMinLen ? "text-emerald-600" : "text-slate-300"} />
                    <span>6+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                    <Check size={12} className={hasUpper ? "text-emerald-600" : "text-slate-300"} />
                    <span>1 uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNum ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                    <Check size={12} className={hasNum ? "text-emerald-600" : "text-slate-300"} />
                    <span>1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                    <Check size={12} className={hasSpecial ? "text-emerald-600" : "text-slate-300"} />
                    <span>1 special char (!@#$)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                "Verifying credentials..."
              ) : mode === "signin" ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <span>Submit Employee Registration</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              {mode === "signin" ? (
                <>
                  Don't have an employee account?{" "}
                  <button
                    onClick={() => {
                      setMode("register");
                      setError(null);
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
