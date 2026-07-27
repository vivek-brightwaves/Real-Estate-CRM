"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SiteVisitChart() {
  const data = [
    { month: "Jan", visits: 65, sales: 12 },
    { month: "Feb", visits: 80, sales: 18 },
    { month: "Mar", visits: 95, sales: 24 },
    { month: "Apr", visits: 110, sales: 29 },
    { month: "May", visits: 140, sales: 38 },
    { month: "Jun", visits: 165, sales: 48 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Site Visit Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">Comparing site visits against sales conversions</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-lg">
          Monthly Progress
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="visits" name="Total Visits" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="sales" name="Sales Closed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
