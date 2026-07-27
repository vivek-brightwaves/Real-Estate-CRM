"use client";

import React from "react";

export default function UpcomingVisits() {
  const visits = [
    {
      customer: "Aravind Sharma",
      project: "Palace Heights Block B",
      time: "Today, 02:30 PM",
      employee: "Vikram Rathore",
      status: "Confirmed",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      customer: "Neha Deshmukh",
      project: "Greenwood Meadows Villa 14",
      time: "Today, 04:00 PM",
      employee: "Pooja Hegde",
      status: "In Progress",
      statusColor: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      customer: "Kabir Mehra",
      project: "Urban Square Penthouse A",
      time: "Tomorrow, 11:00 AM",
      employee: "Vikram Rathore",
      status: "Scheduled",
      statusColor: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      customer: "Siddharth Malhotra",
      project: "Riverview Residency",
      time: "Tomorrow, 03:00 PM",
      employee: "Rohan Sen",
      status: "Scheduled",
      statusColor: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Upcoming Site Visits</h3>
          <p className="text-xs text-slate-500 mt-0.5">Visits scheduled for today & tomorrow</p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
      </div>

      <div className="space-y-4">
        {visits.map((vis, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">{vis.customer}</p>
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
                </svg>
                {vis.project}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {vis.time}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {vis.employee}
                </span>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${vis.statusColor}`}>
              {vis.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
