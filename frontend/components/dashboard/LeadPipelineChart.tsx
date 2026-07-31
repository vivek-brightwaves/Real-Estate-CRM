"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface LeadPipelineChartProps {
  data: Array<{ name: string; count: number }>;
}

export default function LeadPipelineChart({ data }: LeadPipelineChartProps) {
  const router = useRouter();
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
    <div className="bg-gradient-to-br from-white via-white to-indigo-50/15 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E8EDF7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Lead Pipeline Funnel</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-105 text-[10px] font-bold">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Total counts across different deal stages</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/leads")}
            className="px-3 py-1.5 border border-[#E8EDF7] hover:border-slate-350 rounded-lg text-slate-700 hover:text-slate-900 text-xs font-bold transition-all bg-slate-50/50 hover:bg-slate-100 shadow-sm"
          >
            Details
          </button>
        </div>
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
            <Bar 
              dataKey="count" 
              radius={[6, 6, 0, 0]} 
              barSize={40}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            >
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
