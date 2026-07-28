"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

export default function PropertySalesTrendChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = [
    { year: "2021", commercial: 400, residential: 240 },
    { year: "2022", commercial: 450, residential: 320 },
    { year: "2023", commercial: 512, residential: 410 },
    { year: "2024", commercial: 620, residential: 490 },
    { year: "2025", commercial: 790, residential: 580 },
    { year: "2026", commercial: 950, residential: 720 },
  ];

  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="bg-gradient-to-br from-white via-white to-teal-50/15 dark:from-[#1E293B] dark:to-teal-950/5 p-5 rounded-[20px] border border-[#E8EDF7] dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95 dark:bg-[#1E293B]/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7] dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Property Sales Trend</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-105 dark:border-teal-900/35 text-[10px] font-bold">
              Annually
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Commercial vs Residential unit sales trends</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Sales Trends Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-500 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-sm cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCommercial" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorResidential" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '12px', color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="commercial" 
              name="Commercial" 
              stroke="#3b82f6" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorCommercial)" 
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={0}
            />
            <Area 
              type="monotone" 
              dataKey="residential" 
              name="Residential" 
              stroke="#14b8a6" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorResidential)" 
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
