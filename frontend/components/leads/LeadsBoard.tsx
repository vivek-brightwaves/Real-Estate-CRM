"use client";

import React, { useMemo } from "react";
import LeadSection from "./LeadSection";
import { Lead, StatusOption } from "./LeadCard";

const SECTIONS = [
  { key: "NEW", label: "New", badgeClass: "bg-[#EFF6FF] text-[#2563EB] border border-[#3B82F6] dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30" },
  { key: "CONTACTED", label: "Contacted", badgeClass: "bg-[#FFF7ED] text-[#B45309] border border-[#F59E0B] dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30" },
  { key: "VISIT_SCHEDULED", label: "Visit Scheduled", badgeClass: "bg-[#F0F9FF] text-[#0EA5E9] border border-[#0EA5E9] dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30" },
  { key: "NEGOTIATION", label: "Negotiation", badgeClass: "bg-[#FAF5FF] text-[#7C3AED] border border-[#A855F7] dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30" },
  { key: "CONVERTED", label: "Converted", badgeClass: "bg-[#ECFDF5] text-[#047857] border border-[#10B981] dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30" },
  { key: "LOST", label: "Lost", badgeClass: "bg-[#FEF2F2] text-[#B91C1C] border border-[#EF4444] dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30" },
];

const iconMap: Record<string, React.ReactNode> = {
  NEW: (
    <svg className="h-5 w-5 text-cyan-700 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  CONTACTED: (
    <svg className="h-5 w-5 text-blue-700 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10a8 8 0 11-16 0 8 8 0 0116 0z" />
      <path d="M8 12l2 2 4-4" />
    </svg>
  ),
  VISIT_SCHEDULED: (
    <svg className="h-5 w-5 text-amber-700 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 7V3" />
      <path d="M16 7V3" />
      <path d="M3 11h18" />
      <path d="M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  NEGOTIATION: (
    <svg className="h-5 w-5 text-violet-700 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <path d="M8 8l8 8" />
    </svg>
  ),
  CONVERTED: (
    <svg className="h-5 w-5 text-emerald-700 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  LOST: (
    <svg className="h-5 w-5 text-rose-700 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6" />
      <path d="M6 6l12 12" />
    </svg>
  ),
};

interface LeadsBoardProps {
  leads: Lead[];
  loading: boolean;
  onStatusChange: (leadId: number, status: string) => void;
  onLeadClick: (leadId: number) => void;
  onViewAll: () => void;
}

export default function LeadsBoard({ leads, loading, onStatusChange, onLeadClick, onViewAll }: LeadsBoardProps) {
  const statusOptions: StatusOption[] = SECTIONS.map((section) => ({ value: section.key, label: section.label }));

  const groupedLeads = useMemo(() => {
    return SECTIONS.reduce((acc, section) => {
      acc[section.key] = leads.filter((lead) => lead.status === section.key);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads]);

  return (
    <div className="space-y-6 pb-4">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <LeadSection
            key={section.key}
            title={section.label}
            leads={groupedLeads[section.key] ?? []}
            statusOptions={statusOptions}
            icon={iconMap[section.key]}
            badgeClass={section.badgeClass}
            onAdd={onViewAll}
            onStatusChange={onStatusChange}
            onLeadClick={onLeadClick}
            onViewAll={onViewAll}
          />
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center text-muted-foreground">
          Loading premium leads board...
        </div>
      )}
    </div>
  );
}
