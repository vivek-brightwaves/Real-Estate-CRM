"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export default function MonthlySalesChart() {
  const data = [
    { month: "Jan", sales: 45 },
    { month: "Feb", sales: 58 },
    { month: "Mar", sales: 72 },
    { month: "Apr", sales: 60 },
    { month: "May", sales: 88 },
    { month: "Jun", sales: 115 },
  ];

  return (
    <div className="bg-gradient-to-br from-white via-white to-purple-50/15 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Monthly Sales Volume</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-105 text-[10px] font-bold">
              Closed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Total closed transactions monthly</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Opening Sales Breakdown Details")}
            className="px-3 py-1.5 border border-[#E8EDF7] hover:border-slate-350 rounded-lg text-slate-700 hover:text-slate-900 text-xs font-bold transition-all bg-slate-50/50 hover:bg-slate-100 shadow-sm"
          >
            Details
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
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
