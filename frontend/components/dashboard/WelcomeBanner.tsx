"use client";

import React from "react";

interface WelcomeBannerProps {
  userName: string;
  userRole: string;
}

export default function WelcomeBanner({ userName, userRole }: WelcomeBannerProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "MANAGER":
        return "Branch Manager";
      case "EMPLOYEE":
        return "Sales Agent";
      default:
        return role;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg border border-slate-800 mb-8 transition-all duration-300">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            {getRoleLabel(userRole)} Workspace
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {userName || "Super Admin"}
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Here's what's happening across your organization today. Monitor lead conversions, track visits, and close deals.
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex flex-col items-start sm:items-end self-start sm:self-center">
          <span className="text-xs text-slate-300 font-medium">Current Date</span>
          <span className="text-sm font-semibold tracking-wide mt-0.5">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
