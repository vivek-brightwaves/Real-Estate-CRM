"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function PropertySalesTrendChart() {
  const data = [
    { year: "2021", commercial: 400, residential: 240 },
    { year: "2022", commercial: 450, residential: 320 },
    { year: "2023", commercial: 512, residential: 410 },
    { year: "2024", commercial: 620, residential: 490 },
    { year: "2025", commercial: 790, residential: 580 },
    { year: "2026", commercial: 950, residential: 720 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Property Sales Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Commercial vs Residential unit sales trends</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-teal-50 text-teal-700 rounded-lg">
          Annually
        </span>
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
            <Area type="monotone" dataKey="commercial" name="Commercial" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCommercial)" />
            <Area type="monotone" dataKey="residential" name="Residential" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorResidential)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
