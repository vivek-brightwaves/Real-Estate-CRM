"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function PropertySalesTrendChart() {
  const router = useRouter();
  const data = [
    { year: "2021", commercial: 400, residential: 240 },
    { year: "2022", commercial: 450, residential: 320 },
    { year: "2023", commercial: 512, residential: 410 },
    { year: "2024", commercial: 620, residential: 490 },
    { year: "2025", commercial: 790, residential: 580 },
    { year: "2026", commercial: 950, residential: 720 },
  ];

  return (
    <div className="bg-gradient-to-br from-white via-white to-teal-50/15 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Property Sales Trend</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-105 text-[10px] font-bold">
              Annually
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Commercial vs Residential unit sales trends</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/inventory")}
            className="px-3 py-1.5 border border-[#E8EDF7] hover:border-slate-350 rounded-lg text-slate-700 hover:text-slate-900 text-xs font-bold transition-all bg-slate-50/50 hover:bg-slate-100 shadow-sm"
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '12px' }}
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
