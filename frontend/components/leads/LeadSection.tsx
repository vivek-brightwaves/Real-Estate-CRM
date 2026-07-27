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
  onViewAll,
}: LeadSectionProps) {
  return (
    <section className="flex h-[680px] min-h-[520px] flex-col overflow-hidden rounded-[24px] border-2 border-[#CBD5E1] bg-white shadow-[0_8px_25px_rgba(15,23,42,0.05)] transition-all duration-300 hover:border-[#2563EB] hover:shadow-[0_15px_40px_rgba(37,99,235,0.12)]">
      <div className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] px-5 py-4">
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
            <LeadCard key={lead.id} lead={lead} statusOptions={statusOptions} onStatusChange={onStatusChange} />
          ))
        )}
      </div>

      <div className="border-t border-[#E2E8F0] bg-slate-50 px-5 py-4">
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
        >
          View All Leads →
        </button>
      </div>
    </section>
  );
}
