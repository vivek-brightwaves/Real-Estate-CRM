"use client";

import React from "react";
import EmptyState from "./EmptyState";
import LeadCard from "./LeadCard";

type StatusOption = {
  value: string;
  label: string;
};

export default function StatusCard({
  title,
  color,
  leads,
  onLeadClick,
  onStatusChange,
  statusOptions = [],
}: {
  title: string;
  color: string;
  leads: any[];
  onLeadClick?: (lead: any) => void;
  onStatusChange?: (id: number, status: string) => void;
  statusOptions?: StatusOption[];
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-3.5 w-3.5 rounded-full ${color}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{leads.length} active leads</p>
            </div>
          </div>
          <span className="rounded-2xl bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {leads.length} items
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {leads.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()}`}
            subtitle={`There are no leads currently in the ${title.toLowerCase()} stage.`}
          />
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick?.(lead)}
              onStatusChange={onStatusChange}
              statusOptions={statusOptions}
            />
          ))
        )}
      </div>
    </div>
  );
}
