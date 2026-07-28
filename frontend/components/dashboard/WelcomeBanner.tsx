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

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌅";
    if (hour < 18) return "☀️";
    return "🌙";
  };

  return (
    <div 
      className="relative overflow-hidden rounded-[18px] p-6 sm:p-8 bg-white/75 dark:bg-[#1E293B]/75 backdrop-blur-[18px] border border-white/60 dark:border-slate-700/50 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:shadow-none hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] dark:hover:shadow-none mb-6 transition-all duration-300 animate-header-load"
      style={{
        background: 'linear-gradient(135deg, var(--welcome-bg-start, rgba(255, 255, 255, 0.95)) 0%, var(--welcome-bg-mid, rgba(239, 246, 255, 0.07)) 50%, var(--welcome-bg-end, rgba(250, 245, 255, 0.07)) 100%)'
      }}
    >
      {/* Soft background radial decorations (< 5% opacity) */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-400/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-12 w-96 h-96 bg-purple-400/4 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-64 h-64 bg-cyan-400/4 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col gap-1">
          {/* Greeting Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[18px] font-medium text-slate-600 dark:text-slate-400">
              {getGreetingEmoji()} {getGreeting()},
            </span>
          </div>

          {/* User Name / Role Row */}
          <h2 className="text-[34px] font-black text-slate-900 dark:text-[#F8FAFC] leading-tight tracking-tight mt-0.5">
            {userName || getRoleLabel(userRole)} 👋
          </h2>

          {/* Description */}
          <p className="text-[15px] text-slate-500 dark:text-[#94A3B8] mt-1 max-w-xl">
            Welcome back! Here's your real estate business overview for today.
          </p>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/30 text-xs font-bold shadow-sm">
              <span>🏢</span> 12 Active Projects
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100/40 dark:border-purple-900/30 text-xs font-bold shadow-sm">
              <span>👥</span> 1,280 Customers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-100/40 dark:border-emerald-900/30 text-xs font-bold shadow-sm">
              <span>💰</span> ₹4.8 Cr Revenue
            </span>
          </div>
        </div>

        {/* Last Login Capsule */}
        <div className="self-start md:self-center shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Last Login: Today • 09:42 AM
          </span>
        </div>
      </div>
    </div>
  );
}
