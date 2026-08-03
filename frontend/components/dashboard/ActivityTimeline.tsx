"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function ActivityTimeline() {
  const router = useRouter();
  const activities = [
    {
      title: "Booking Approved",
      desc: "Unit B-104 booking has been approved by Super Admin",
      time: "10 mins ago",
      type: "booking",
      color: "bg-emerald-500 ring-emerald-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: "Payment Received",
      desc: "₹5,00,000 token advance received from Neha Deshmukh",
      time: "1 hour ago",
      type: "payment",
      color: "bg-blue-500 ring-blue-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
        </svg>
      ),
    },
    {
      title: "Lead Created",
      desc: "New incoming lead 'Siddharth Malhotra' registered via Website Form",
      time: "3 hours ago",
      type: "lead",
      color: "bg-purple-500 ring-purple-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      title: "Inventory Updated",
      desc: "Greenwood Villa 12 marked as 'Blocked' due to active token receipt",
      time: "Yesterday, 05:12 PM",
      type: "inventory",
      color: "bg-amber-500 ring-amber-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: "User Logged In",
      desc: "Manager Vikram Rathore signed in to portal from IP 192.168.1.45",
      time: "Yesterday, 09:00 AM",
      type: "auth",
      color: "bg-slate-500 ring-slate-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-gradient-to-br from-white via-white to-slate-50/30 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-[#E8EDF7]">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Activity Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">Audit log of corporate transactions</p>
        </div>
        <button
          onClick={() => router.push("/admin/audit")}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Full Audit
        </button>
      </div>

      <div className="relative border-l border-[#E8EDF7] ml-4 pl-6 space-y-6">
        {activities.map((act, index) => (
          <div key={index} className="relative">
            {/* Dot Indicator */}
            <span className={`absolute -left-[33px] top-1 flex h-7 w-7 items-center justify-center rounded-full ring-4 ${act.color}`}>
              {act.icon}
            </span>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">{act.time}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pr-2">{act.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
