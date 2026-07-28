"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useTheme } from "next-themes";

export default function MonthlySalesChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = [
    { month: "Jan", sales: 45 },
    { month: "Feb", sales: 58 },
    { month: "Mar", sales: 72 },
    { month: "Apr", sales: 60 },
    { month: "May", sales: 88 },
    { month: "Jun", sales: 115 },
  ];

  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const cursorColor = isDark ? "rgba(51, 65, 85, 0.25)" : "#f8fafc";

  return (
    <div className="bg-gradient-to-br from-white via-white to-purple-50/15 dark:from-[#1E293B] dark:to-purple-950/5 p-5 rounded-[20px] border border-[#E8EDF7] dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95 dark:bg-[#1E293B]/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7] dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Monthly Sales Volume</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-105 dark:border-indigo-900/35 text-[10px] font-bold">
              Closed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Total closed transactions monthly</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Sales Breakdown Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-500 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-sm cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: cursorColor }}
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            <Bar 
              dataKey="sales" 
              fill="#6366f1" 
              radius={[4, 4, 0, 0]} 
              barSize={24} 
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
