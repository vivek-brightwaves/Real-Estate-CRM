"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from "next-themes";

export default function SiteVisitChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = [
    { month: "Jan", visits: 65, sales: 12 },
    { month: "Feb", visits: 80, sales: 18 },
    { month: "Mar", visits: 95, sales: 24 },
    { month: "Apr", visits: 110, sales: 29 },
    { month: "May", visits: 140, sales: 38 },
    { month: "Jun", visits: 165, sales: 48 },
  ];

  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200/80 dark:border-[#334155] shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Site Visit Analytics</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Comparing site visits against sales conversions</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-450 rounded-lg border border-transparent dark:border-emerald-900/30">
          Monthly Progress
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '12px', color: '#fff' }}
            />
            <Bar 
              dataKey="visits" 
              name="Total Visits" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
              barSize={16} 
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
            <Bar 
              dataKey="sales" 
              name="Sales Closed" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              barSize={16} 
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
