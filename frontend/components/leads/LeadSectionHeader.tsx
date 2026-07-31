"use client";

import React from "react";

interface LeadSectionHeaderProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  badgeClass: string;
}

export default function LeadSectionHeader({ title, count, icon, badgeClass }: LeadSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-5 border-b border-border bg-card">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${badgeClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{count} leads</p>
        </div>
      </div>
      <span className="rounded-full bg-slate-50 dark:bg-[#111827] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
    </div>
  );
}
