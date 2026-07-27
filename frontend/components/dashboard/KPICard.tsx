"use client";

import React from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  percentage: string | number;
  isPositive: boolean;
  color: "blue" | "green" | "purple" | "orange";
  icon: React.ReactNode;
}

export default function KPICard({ label, value, percentage, isPositive, color, icon }: KPICardProps) {
  const themes = {
    blue: {
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-blue-50 text-blue-600",
      badge: "bg-blue-50 text-blue-700 border-blue-100",
      accent: "text-blue-600",
    },
    green: {
      border: "border-l-4 border-l-green-500",
      iconBg: "bg-green-50 text-green-600",
      badge: "bg-green-50 text-green-700 border-green-100",
      accent: "text-green-600",
    },
    purple: {
      border: "border-l-4 border-l-purple-500",
      iconBg: "bg-purple-50 text-purple-600",
      badge: "bg-purple-50 text-purple-700 border-purple-100",
      accent: "text-purple-600",
    },
    orange: {
      border: "border-l-4 border-l-orange-500",
      iconBg: "bg-orange-50 text-orange-600",
      badge: "bg-orange-50 text-orange-700 border-orange-100",
      accent: "text-orange-600",
    },
  };

  const currentTheme = themes[color] || themes.blue;

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex justify-between items-start ${currentTheme.border}`}>
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
            isPositive 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}>
            <span className="text-xs">{isPositive ? "↑" : "↓"}</span>
            {percentage}%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      </div>

      <div className={`p-3 rounded-xl shadow-sm ${currentTheme.iconBg}`}>
        {icon}
      </div>
    </div>
  );
}
