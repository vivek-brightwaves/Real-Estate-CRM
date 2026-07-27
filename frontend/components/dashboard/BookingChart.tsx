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
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Booking Status</h3>
        <p className="text-xs text-slate-500 mt-0.5">Distribution of bookings by state</p>
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
                return <span className="text-xs font-semibold text-slate-600 ml-1">{value} ({item?.value})</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
