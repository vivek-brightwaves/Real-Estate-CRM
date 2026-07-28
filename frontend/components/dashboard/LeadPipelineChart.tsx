"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useTheme } from "next-themes";

interface LeadPipelineChartProps {
  data: Array<{ name: string; count: number }>;
}

export default function LeadPipelineChart({ data }: LeadPipelineChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Mock data if database is empty
  const chartData = data && data.length > 0 ? data : [
    { name: "New Leads", count: 180 },
    { name: "Contacted", count: 130 },
    { name: "Site Visit Scheduled", count: 90 },
    { name: "Negotiation", count: 45 },
    { name: "Closed Won", count: 28 }
  ];

  // Professional colors for pipeline stages
  const COLORS = ["#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#10b981"];

  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const cursorColor = isDark ? "rgba(51, 65, 85, 0.25)" : "#f8fafc";

  return (
    <div className="bg-gradient-to-br from-white via-white to-indigo-50/15 dark:from-[#1E293B] dark:to-indigo-950/5 p-5 rounded-[20px] border border-[#E8EDF7] dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95 dark:bg-[#1E293B]/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7] dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Lead Pipeline Funnel</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-105 dark:border-blue-900/35 text-[10px] font-bold">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Total counts across different deal stages</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Lead Pipeline Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] dark:border-slate-700 hover:border-slate-355 dark:hover:border-slate-500 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-sm cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: tickColor, fontSize: 11 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: tickColor, fontSize: 12 }} 
            />
            <Tooltip 
              cursor={{ fill: cursorColor }}
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff', fontSize: '13px' }}
              formatter={(value: any) => [value, "Leads"]}
            />
            <Bar 
              dataKey="count" 
              radius={[6, 6, 0, 0]} 
              barSize={40}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
