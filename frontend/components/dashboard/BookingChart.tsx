"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BookingChart() {
  const data = [
    { name: "Approved", value: 34, color: "#10b981" },
    { name: "Pending Approval", value: 18, color: "#f59e0b" },
    { name: "Cancelled", value: 8, color: "#ef4444" },
  ];

  return (
    <div className="bg-gradient-to-br from-white via-white to-emerald-50/15 dark:from-[#1E293B] dark:to-emerald-950/5 p-5 rounded-[20px] border border-[#E8EDF7] dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95 dark:bg-[#1E293B]/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7] dark:border-[#334155]">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Booking Status</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Distribution of bookings by state</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Bookings Breakdown Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-500 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-sm cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-64 mt-4 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              itemStyle={{ color: '#fff', fontSize: '13px' }}
              formatter={(value: any) => [value, "Bookings"]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              formatter={(value: any, entry: any) => {
                const item = data.find(d => d.name === value);
                return <span className="text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] ml-1">{value} ({item?.value})</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
