"use client";

import React from "react";

export type StatusOption = {
  value: string;
  label: string;
};

export type Lead = {
  id: number;
  name: string;
  phone?: string;
  budget?: string | number;
  assigned?: string;
  priority?: string;
  status: string;
  created_at?: string;
  avatar?: string;
};

export default function LeadCard({
  lead,
  onClick,
  onStatusChange,
  statusOptions = [],
}: {
  lead: Lead;
  onClick?: () => void;
  onStatusChange?: (id: number, status: string) => void;
  statusOptions?: StatusOption[];
}) {
  const initials = lead.name
    ? lead.name
        .split(" ")
        .map((segment) => segment[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LD";

  return (
    <div
      onClick={onClick}
      className="relative z-0 bg-white rounded-xl border border-[#E8EDF7] shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md p-4 cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200/50 flex items-center justify-center text-xs font-black text-slate-650 border border-slate-200/40 shadow-inner">
          {lead.avatar || initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{lead.name}</h4>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-450">{lead.phone ?? "No phone"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                lead.priority === "High"
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : lead.priority === "Medium"
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
              }`}>
                {lead.priority ?? "Normal"}
              </span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Open lead actions"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50/50 border border-slate-100/50 px-2.5 py-1.5 text-xs text-slate-500 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-black text-slate-700">
                {lead.assigned ? lead.assigned.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() : "?"}
              </span>
              <span className="truncate">
                Owner: <span className="font-bold text-slate-800">{lead.assigned ?? "Unassigned"}</span>
              </span>
            </div>
            <div className="rounded-xl bg-slate-50/50 border border-slate-100/50 px-2.5 py-1.5 text-xs text-slate-500 font-semibold flex items-center">
              Budget: <span className="font-bold text-slate-800 ml-1">{lead.budget ? `₹${lead.budget}` : "TBD"}</span>
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {new Date(lead.created_at || Date.now()).toLocaleDateString()}
            </div>
            <select
              value={lead.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange?.(lead.id, e.target.value);
              }}
              className="w-full sm:w-auto rounded-lg border border-[#E8EDF7] bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-650 focus:ring-4 focus:ring-blue-600/10 cursor-pointer shadow-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
