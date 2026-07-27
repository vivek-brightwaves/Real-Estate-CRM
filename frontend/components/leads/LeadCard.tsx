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
      className="relative z-0 bg-white rounded-[16px] border border-[#D1D5DB] shadow-[0_3px_10px_rgba(15,23,42,0.04)] transition-all duration-300 transform hover:-translate-y-0.5 hover:border-[#3B82F6] hover:shadow-[0_10px_25px_rgba(59,130,246,0.15)] p-4 cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-base font-semibold text-slate-700">
          {lead.avatar || initials}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">{lead.name}</h4>
              <p className="mt-1 text-xs text-slate-500">{lead.phone ?? "No phone"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                lead.priority === "High"
                  ? "bg-rose-100 text-rose-700"
                  : lead.priority === "Medium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {lead.priority ?? "Normal"}
              </span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                {lead.assigned ? lead.assigned.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() : "?"}
              </span>
              <span>
                Assigned: <span className="font-semibold text-slate-900">{lead.assigned ?? "Unassigned"}</span>
              </span>
            </div>
            <div className="rounded-3xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              Budget: <span className="font-semibold text-slate-900">{lead.budget ? `₹${lead.budget}` : "TBD"}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {new Date(lead.created_at || Date.now()).toLocaleDateString()}
            </div>
            <select
              value={lead.status}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange?.(lead.id, e.target.value);
              }}
              className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
