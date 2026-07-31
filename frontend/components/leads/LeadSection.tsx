"use client";

import React from "react";
import LeadSectionHeader from "./LeadSectionHeader";
import LeadCard, { Lead, StatusOption } from "./LeadCard";
import EmptyState from "./EmptyState";

interface LeadSectionProps {
  title: string;
  leads: Lead[];
  statusOptions: StatusOption[];
  icon: React.ReactNode;
  badgeClass: string;
  onAdd: () => void;
  onStatusChange: (leadId: number, status: string) => void;
  onLeadClick: (leadId: number) => void;
  onViewAll: () => void;
}

export default function LeadSection({
  title,
  leads,
  statusOptions,
  icon,
  badgeClass,
  onAdd,
  onStatusChange,
  onLeadClick,
  onViewAll,
}: LeadSectionProps) {
  return (
    <section className="flex h-[680px] min-h-[520px] flex-col overflow-hidden rounded-[20px] border border-[#E8EDF7] bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8EDF7] px-5 py-4">
        <LeadSectionHeader title={title} count={leads.length} icon={icon} badgeClass={badgeClass} />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {leads.length === 0 ? (
          <EmptyState
            title="No Leads Available"
            subtitle="Add a new lead to start tracking this stage with confidence."
            onAdd={onAdd}
          />
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              statusOptions={statusOptions}
              onClick={() => onLeadClick(lead.id)}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>

      <div className="border-t border-[#E8EDF7] bg-slate-50/40 px-5 py-3">
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-slate-550 transition hover:text-blue-600 cursor-pointer"
        >
          View All Leads &rarr;
        </button>
      </div>
    </section>
  );
}
