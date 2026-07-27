"use client";

import React from "react";

interface LeadSectionHeaderProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  badgeClass: string;
}

export default function LeadSectionHeader({ title, count, icon, badgeClass }: LeadSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-5 border-b border-slate-100 bg-white">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${badgeClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{count} leads</p>
        </div>
      </div>
      <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  );
}
