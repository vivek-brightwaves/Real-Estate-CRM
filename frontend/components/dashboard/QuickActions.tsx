"use client";

import React from "react";

export default function QuickActions() {
  const actions = [
    {
      title: "Add Lead",
      desc: "Register a new buyer prospect",
      color: "bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-100/60 hover:border-blue-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      title: "Add Property",
      desc: "List a new residential asset",
      color: "bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60 hover:border-emerald-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
        </svg>
      ),
    },
    {
      title: "New Booking",
      desc: "Create unit reservation booking",
      color: "bg-purple-50/50 text-purple-600 border-purple-100 hover:bg-purple-100/60 hover:border-purple-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "View Inventory",
      desc: "Check available block listings",
      color: "bg-pink-50/50 text-pink-600 border-pink-100 hover:bg-pink-100/60 hover:border-pink-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: "Generate Report",
      desc: "Download sales & leads PDF",
      color: "bg-orange-50/50 text-orange-600 border-orange-100 hover:bg-orange-100/60 hover:border-orange-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
        </svg>
      ),
    },
    {
      title: "Schedule Visit",
      desc: "Arrange property site visit",
      color: "bg-cyan-50/50 text-cyan-600 border-cyan-100 hover:bg-cyan-100/60 hover:border-cyan-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 mb-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4 font-sans tracking-tight">Quick CRM Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((act, index) => (
          <button
            key={index}
            onClick={() => alert(`Triggering: ${act.title}`)}
            className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-300 hover:shadow-md ${act.color}`}
          >
            <div className="mb-2.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
              {act.icon}
            </div>
            <span className="text-xs font-bold tracking-tight text-slate-800">{act.title}</span>
            <span className="text-[9px] text-slate-400 font-semibold mt-1 line-clamp-1">{act.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
