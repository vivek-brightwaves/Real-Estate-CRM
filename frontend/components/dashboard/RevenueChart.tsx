"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface RevenueChartProps {
  data: Array<{ month: string; amount: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
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

  return (
    <div className="bg-gradient-to-br from-white via-white to-blue-50/15 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Revenue Trends</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-105 text-[10px] font-bold">
              +18.4%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Gross revenue collections over the last 6 months</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Revenue Breakdown Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] hover:border-slate-350 rounded-lg text-slate-700 hover:text-slate-900 text-xs font-bold transition-all bg-slate-50/50 hover:bg-slate-100 shadow-sm"
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
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
              dot={{ stroke: '#4f46e5', strokeWidth: 2, r: 4, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
