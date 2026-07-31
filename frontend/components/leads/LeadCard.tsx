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
  email?: string;
  source?: string;
  budget?: string | number;
  assigned?: string;
  priority?: string;
  status: string;
  created_at?: string;
  avatar?: string;
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["VISIT_SCHEDULED", "LOST"],
  VISIT_SCHEDULED: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
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
  const allowedStatuses = new Set([
    lead.status,
    ...(ALLOWED_TRANSITIONS[lead.status] ?? []),
  ]);
  const availableStatusOptions = statusOptions.filter((option) =>
    allowedStatuses.has(option.value),
  );

  return (
    <div
      onClick={onClick}
      className="relative z-0 bg-card rounded-xl border border-border shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md p-4 cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200/50 dark:from-slate-800 dark:to-slate-900/50 flex items-center justify-center text-xs font-black text-slate-655 dark:text-slate-300 border border-slate-200/40 dark:border-white/5 shadow-inner">
          {lead.avatar || initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground truncate leading-tight">{lead.name}</h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{lead.phone ?? "No phone"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                lead.priority === "HIGH"
                  ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30"
                  : lead.priority === "MEDIUM"
                  ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
              }`}>
                {lead.priority ?? "Normal"}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClick?.();
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
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
            <div className="flex items-center gap-2 rounded-xl bg-slate-50/50 dark:bg-slate-850/50 border border-slate-100/50 dark:border-white/5 px-2.5 py-1.5 text-xs text-muted-foreground font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-700 dark:text-slate-300">
                {lead.assigned ? lead.assigned.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() : "?"}
              </span>
              <span className="truncate">
                Owner: <span className="font-bold text-slate-800 dark:text-slate-200">{lead.assigned ?? "Unassigned"}</span>
              </span>
            </div>
            <div className="rounded-xl bg-slate-50/50 dark:bg-slate-850/50 border border-slate-100/50 dark:border-white/5 px-2.5 py-1.5 text-xs text-muted-foreground font-semibold flex items-center">
              Budget: <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">{lead.budget ? `₹${lead.budget}` : "TBD"}</span>
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              {new Date(lead.created_at || Date.now()).toLocaleDateString()}
            </div>
            <select
              value={lead.status}
              disabled={availableStatusOptions.length <= 1}
              title={
                availableStatusOptions.length <= 1
                  ? "This lead is in a final status"
                  : "Move lead to an allowed next status"
              }
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange?.(lead.id, e.target.value);
              }}
              className="w-full sm:w-auto rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground outline-none transition focus:border-blue-650 focus:ring-4 focus:ring-blue-600/10 cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:dark:bg-slate-800 disabled:text-muted-foreground"
            >
              {availableStatusOptions.map((option) => (
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
