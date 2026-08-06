"use client";

import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      // Clear the must_change_password flag locally in authStore
      if (user && accessToken && refreshToken) {
        const updatedUser = { ...user, must_change_password: false };
        setAuth(accessToken, refreshToken, updatedUser);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Failed to change password. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-8 relative z-10 text-left transform scale-100 transition-all duration-250 ease-out">
        {/* Close Button */}
        <button
          type="button"
          disabled={loading || success}
          onClick={() => {
            setError("");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onClose();
          }}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#EEF2FF] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#0F172A] dark:hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight mb-2">
            Change Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For security, please enter your current password followed by your new password.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-455 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-455 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Password changed successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Old Password */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
              placeholder="Minimum 8 characters"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-2">
            <button
              type="button"
              disabled={loading || success}
              onClick={() => {
                setError("");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
                onClose();
              }}
              className="h-11 px-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-all duration-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-200 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
