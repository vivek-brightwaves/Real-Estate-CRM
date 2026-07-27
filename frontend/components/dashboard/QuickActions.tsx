"use client";

import React from "react";

export default function QuickActions() {
  const actions = [
    {
      title: "Add Lead",
      desc: "Register a new buyer prospect",
      color: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/80 hover:border-blue-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      title: "Add Customer",
      desc: "Convert a closed lead to buyer",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/80 hover:border-emerald-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Create Booking",
      desc: "Lock a specific property unit",
      color: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100/80 hover:border-purple-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "View Inventory",
      desc: "Check available block listings",
      color: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100/80 hover:border-indigo-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
        </svg>
      ),
    },
    {
      title: "Generate Report",
      desc: "Download sales & leads PDF",
      color: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/80 hover:border-amber-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: "Schedule Visit",
      desc: "Arrange property site visit",
      color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/80 hover:border-rose-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Quick CRM Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((act, index) => (
          <button
            key={index}
            onClick={() => alert(`Triggering: ${act.title}`)}
            className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-300 ${act.color}`}
          >
            <div className="mb-2.5 p-2 bg-white rounded-lg shadow-sm">
              {act.icon}
            </div>
            <span className="text-sm font-semibold tracking-tight">{act.title}</span>
            <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{act.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
