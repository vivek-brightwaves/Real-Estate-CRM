"use client";

import React from "react";

export default function BoardHeader({ onSearch, onAdd }: { onSearch?: (q: string) => void; onAdd?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:shadow-lg">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Leads Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Premium Lead Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Track the full lead lifecycle with a polished enterprise layout and fast status management.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search leads, deals, or project"
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
            <button className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Filter</button>
            <button className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Sort</button>
            <button className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Export</button>
            <button onClick={onAdd} className="btn-premium-action btn-add-lead">+ Add Lead</button>
          </div>
        </div>
      </div>
    </div>
  );
}
