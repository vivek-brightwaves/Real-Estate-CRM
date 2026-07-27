"use client";

import React from "react";
import AddLeadButton from "./AddLeadButton";

interface LeadsToolbarProps {
  onSearch: (query: string) => void;
  onAdd: () => void;
}

export default function LeadsToolbar({ onSearch, onAdd }: LeadsToolbarProps) {
  return (
    <div className="rounded-2xl border border-[#CBD5E1] bg-white p-5 shadow-sm transition duration-200 hover:shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Leads Board</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Leads Board</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage and track leads through each sales stage.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search leads"
              className="w-full rounded-[20px] border border-[#CBD5E1] bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button className="rounded-3xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:bg-slate-50">
            Filter
          </button>
          <button className="rounded-3xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:bg-slate-50">
            Sort
          </button>
          <button className="rounded-3xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:bg-slate-50">
            Export
          </button>
          <AddLeadButton onClick={onAdd} />
        </div>
      </div>
    </div>
  );
}
