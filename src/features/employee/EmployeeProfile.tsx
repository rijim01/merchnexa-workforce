import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Camera,
  Plus,
  X,
  Save,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import { useWorkforce } from "../../context/WorkforceContext";
import { api } from "../../services/api";
import { changeCurrentUserPassword } from "../../config/firebase";
import { validatePassword } from "../../utils/validation";

export function EmployeeProfile() {
  const { currentEmployee, currentEmployeeEmail, setEmployeeList, authToken, showToast } = useWorkforce();

  // Local form state
  const [name, setName] = useState(currentEmployee.name || "");
  const [role, setRole] = useState(currentEmployee.role || "");
  const [phone, setPhone] = useState(currentEmployee.phone || "");
  const [birthDate, setBirthDate] = useState(currentEmployee.birthDate || "");
  const [photoUrl, setPhotoUrl] = useState(currentEmployee.photoUrl || "");
  const [bio, setBio] = useState(currentEmployee.bio || "");
  const [skills, setSkills] = useState<string[]>(currentEmployee.skills || ["Graphic Design", "Content"]);
  const [newSkill, setNewSkill] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(currentEmployee.paymentMethod || "bKash");
  const [paymentNumber, setPaymentNumber] = useState(currentEmployee.paymentNumber || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Employee Password update state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPassError(validation.error!);
      showToast(validation.error!, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      const err = "New password and confirmation do not match.";
      setPassError(err);
      showToast(err, "error");
      return;
    }

    setPassLoading(true);

    try {
      await changeCurrentUserPassword(newPassword);
      setPassSuccess("Your password has been changed successfully!");
      showToast("Password updated successfully!", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Failed to update password.";
      if (msg.includes("requires-recent-login")) {
        msg = "For security reasons, please log out and log in again before changing your password.";
      }
      setPassError(msg);
      showToast(msg, "error");
    } finally {
      setPassLoading(false);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile = {
      name,
      role,
      phone,
      birthDate,
      photoUrl,
      bio,
      skills,
      paymentMethod,
      paymentNumber,
    };

    setEmployeeList((prev) =>
      prev.map((emp) => {
        if (emp.email.toLowerCase() === currentEmployeeEmail.toLowerCase()) {
          return {
            ...emp,
            ...updatedProfile,
          };
        }
        return emp;
      })
    );

    try {
      api.employees.updateProfile(currentEmployeeEmail, updatedProfile, authToken || undefined);
    } catch {
      // Local state is already updated
    }

    setSavedSuccess(true);
    showToast("Profile details saved successfully!", "success");
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Profile Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="h-24 w-24 rounded-full border-4 border-slate-100 object-cover shadow-sm"
              />
            ) : (
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ${
                  currentEmployee.color || "bg-blue-100 text-blue-700"
                }`}
              >
                {currentEmployee.initials}
              </div>
            )}
            <div className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 text-white shadow-sm ring-2 ring-white">
              <Camera size={14} />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <h2 className="text-xl font-bold text-slate-900">{name || "Staff Member"}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={12} />
                {currentEmployee.status} Staff
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{role || "Employee"}</p>
            <p className="mt-1 text-xs text-slate-400 font-mono">{currentEmployeeEmail}</p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 animate-in fade-in">
              <CheckCircle2 size={16} />
              <span>Profile updated successfully!</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Personal Information
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative mt-1.5">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Registered Email</label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={currentEmployeeEmail}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Date of Birth</label>
              <div className="relative mt-1.5">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Phone / WhatsApp Number</label>
              <div className="relative mt-1.5">
                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700-000000"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Profile Photo Image URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Paste an image URL from Google Drive, Unsplash, or Imgur to display your photo avatar.
              </p>
            </div>
          </div>
        </div>

        {/* Professional Details & Skills */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Professional Title & Skills
          </h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Role / Job Title</label>
              <div className="relative mt-1.5">
                <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Graphic Designer / Content Writer"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Skills tag editor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Skills & Expertise</label>
              <p className="mb-2 text-[11px] text-slate-400">
                Add skills so the Admin can assign relevant tasks matching your skillset.
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="rounded-full p-0.5 hover:bg-blue-200 text-blue-600 transition"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                  placeholder="Type a skill (e.g. Photoshop, SEO, Translation) and click Add"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  <Plus size={14} />
                  <span>Add Skill</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Bio / About Me</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly describe your experience, tools you master, and background..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Payout Mobile Banking Number */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Wallet size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Payout Account (bKash / Nagad)</h3>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Preferred Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="bKash">bKash (Personal)</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Wallet / Account Number</label>
              <input
                type="text"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value)}
                placeholder="e.g. 01700000000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-[0.99]"
          >
            <Save size={16} />
            <span>Save My Profile</span>
          </button>
        </div>
      </form>

      {/* Account Security & Password Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Password</h3>
            <p className="text-xs text-slate-500">
              Update your account login password.
            </p>
          </div>
        </div>

        {passError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {passError}
          </div>
        )}

        {passSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            {passSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">New Password *</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Confirm Password *</label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Password Rules Helper */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
            <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className={newPassword.length >= 6 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                ✓ 6+ characters
              </span>
              <span className={/[A-Z]/.test(newPassword) ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                ✓ 1 uppercase letter (A-Z)
              </span>
              <span className={/[0-9]/.test(newPassword) ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                ✓ 1 number (0-9)
              </span>
              <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword) ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                ✓ 1 special char (!@#$)
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passLoading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition active:scale-[0.99] disabled:opacity-50"
            >
              <Key size={14} />
              <span>{passLoading ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
