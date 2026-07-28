"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from "next-themes";

interface RevenueChartProps {
  data: Array<{ month: string; amount: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // If data is empty, use realistic mock data
  const chartData = data && data.length > 0 ? data : [
    { month: "Jan", amount: 1200000 },
    { month: "Feb", amount: 1900000 },
    { month: "Mar", amount: 2200000 },
    { month: "Apr", amount: 2600000 },
    { month: "May", amount: 3400000 },
    { month: "Jun", amount: 4800000 }
  ];

  const formatCurrency = (value: number) => {
    return `₹${(value / 100000).toFixed(1)}L`;
  };

  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="bg-gradient-to-br from-white via-white to-blue-50/15 dark:from-[#1E293B] dark:to-blue-950/5 p-5 rounded-[20px] border border-[#E8EDF7] dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95 dark:bg-[#1E293B]/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7] dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Revenue Trends</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-105 dark:border-emerald-900/35 text-[10px] font-bold">
              +18.4%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Gross revenue collections over the last 6 months</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Revenue Breakdown Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-500 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-sm cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: tickColor, fontSize: 12 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={formatCurrency}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff', fontSize: '13px' }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#4f46e5" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorAmount)" 
              isAnimationActive={true}
              animationDuration={2000}
              animationEasing="ease-out"
              dot={{ stroke: '#4f46e5', strokeWidth: 2, r: 4, fill: isDark ? '#1e293b' : '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
