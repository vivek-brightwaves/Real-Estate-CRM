"use client";

import React from "react";
import AddLeadButton from "./AddLeadButton";

interface LeadsToolbarProps {
  onSearch: (query: string) => void;
  onAdd: () => void;
}

export default function LeadsToolbar({ onSearch, onAdd }: LeadsToolbarProps) {
  return (
    <div className="bg-transparent pb-6 border-b border-[#E8EDF7] mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-450">Leads Board</p>
          <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-none">Leads Pipeline</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-450 font-semibold">Manage, assign and track leads through each pipeline stage.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-xl border border-[#E8EDF7] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 placeholder:text-slate-405 shadow-sm"
            />
          </div>

          <button className="rounded-xl border border-[#E8EDF7] bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-350 shadow-sm cursor-pointer">
            Filter
          </button>
          <button className="rounded-xl border border-[#E8EDF7] bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-350 shadow-sm cursor-pointer">
            Sort
          </button>
          <button className="rounded-xl border border-[#E8EDF7] bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-350 shadow-sm cursor-pointer">
            Export
          </button>
          <AddLeadButton onClick={onAdd} />
        </div>
      </div>
    </div>
  );
}
