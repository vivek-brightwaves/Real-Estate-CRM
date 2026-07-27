"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface StatsCardProps {
  label: string;
  value: string | number;
  growth: string | number;
  isPositive: boolean;
  color: "blue" | "green" | "purple" | "orange" | "indigo" | "teal";
  sparklineData?: Array<{ value: number }>;
  icon: React.ReactNode;
}

export default function StatsCard({ label, value, growth, isPositive, color, sparklineData, icon }: StatsCardProps) {
  const themes = {
    blue: {
      gradient: "from-blue-600 to-indigo-600",
      accent: "text-blue-600",
      bgLight: "bg-blue-50/50 text-blue-600 border-blue-100/50",
      glow: "shadow-blue-500/10",
      sparkColor: "#3b82f6",
    },
    green: {
      gradient: "from-emerald-600 to-teal-600",
      accent: "text-emerald-600",
      bgLight: "bg-emerald-50/50 text-emerald-600 border-emerald-100/50",
      glow: "shadow-emerald-500/10",
      sparkColor: "#10b981",
    },
    purple: {
      gradient: "from-purple-600 to-fuchsia-600",
      accent: "text-purple-600",
      bgLight: "bg-purple-50/50 text-purple-600 border-purple-100/50",
      glow: "shadow-purple-500/10",
      sparkColor: "#8b5cf6",
    },
    orange: {
      gradient: "from-orange-500 to-amber-500",
      accent: "text-orange-600",
      bgLight: "bg-orange-50/50 text-orange-600 border-orange-100/50",
      glow: "shadow-orange-500/10",
      sparkColor: "#f97316",
    },
    indigo: {
      gradient: "from-indigo-600 to-blue-700",
      accent: "text-indigo-600",
      bgLight: "bg-indigo-50/50 text-indigo-600 border-indigo-100/50",
      glow: "shadow-indigo-500/10",
      sparkColor: "#6366f1",
    },
    teal: {
      gradient: "from-teal-500 to-emerald-500",
      accent: "text-teal-600",
      bgLight: "bg-teal-50/50 text-teal-600 border-teal-100/50",
      glow: "shadow-teal-500/10",
      sparkColor: "#14b8a6",
    },
  };

  const currentTheme = themes[color] || themes.blue;

  // Simple dynamic sparkline dataset if none provided
  const sparkData = sparklineData || [
    { value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 16 }, { value: 24 }
  ];

  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-lg ${currentTheme.glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-44`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{value}</h3>
        </div>

        <div className={`p-2 rounded-xl border ${currentTheme.bgLight}`}>
          {icon}
        </div>
      </div>

      {/* Sparkline & Conversion Metrics */}
      <div className="flex items-end justify-between mt-4">
        <div className="flex flex-col">
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isPositive 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}>
            <span>{isPositive ? "↑" : "↓"}</span>
            {growth}%
          </span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">MoM Change</span>
        </div>

        {/* Sparkline charts */}
        <div className="w-24 h-12 overflow-hidden opacity-80 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, left: 2, right: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentTheme.sparkColor} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={currentTheme.sparkColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={currentTheme.sparkColor} 
                strokeWidth={2} 
                fillOpacity={1} 
                fill={`url(#grad-${color})`} 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
