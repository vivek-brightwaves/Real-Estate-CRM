"use client";

import React from "react";
import AddLeadButton from "./AddLeadButton";

interface LeadsToolbarProps {
  searchValue: string;
  onSearch: (query: string) => void;
  onAdd: () => void;
  onPriorityChange: (priority: string) => void;
  onSortChange: (order: string) => void;
  onExport: () => void;
}

export default function LeadsToolbar({
  searchValue,
  onSearch,
  onAdd,
  onPriorityChange,
  onSortChange,
  onExport,
}: LeadsToolbarProps) {
  return (
    <div className="bg-transparent pb-6 border-b border-border mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Leads Board</p>
          <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-foreground leading-none">Leads Pipeline</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground font-semibold">Manage, assign and track leads through each pipeline stage.</p>
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
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-xs font-semibold text-foreground outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 placeholder:text-muted-foreground shadow-sm"
            />
          </div>

          <select
            aria-label="Filter leads by priority"
            onChange={(event) => onPriorityChange(event.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-foreground shadow-sm outline-none"
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select
            aria-label="Sort leads"
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-foreground shadow-sm outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
          </select>
          <button type="button" onClick={onExport} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-hover hover:border-slate-350 dark:hover:border-slate-750 shadow-sm cursor-pointer">
            Export
          </button>
          <AddLeadButton onClick={onAdd} />
        </div>
      </div>
    </div>
  );
}
