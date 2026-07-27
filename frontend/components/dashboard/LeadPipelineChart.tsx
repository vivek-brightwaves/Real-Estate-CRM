"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface LeadPipelineChartProps {
  data: Array<{ name: string; count: number }>;
}

export default function LeadPipelineChart({ data }: LeadPipelineChartProps) {
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

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Lead Pipeline Funnel</h3>
          <p className="text-xs text-slate-500 mt-0.5">Total counts across different deal stages</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
          Active Deals
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px 14px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff', fontSize: '13px' }}
              formatter={(value: any) => [value, "Leads"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
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
