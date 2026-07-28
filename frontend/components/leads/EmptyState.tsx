"use client";

import React from "react";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  onAdd?: () => void;
}

export default function EmptyState({ title, subtitle, onAdd }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 rounded-[20px] border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center shadow-sm">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
        <svg className="h-12 w-12 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
          <path d="M7 7V5a5 5 0 0110 0v2" />
        </svg>
      </div>
      <div>
        <h4 className="text-xl font-semibold text-slate-900">{title ?? "No leads available"}</h4>
        <p className="mt-2 text-sm text-slate-500">{subtitle ?? "Create a new lead to get your pipeline moving."}</p>
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="btn-premium-action btn-add-lead"
        >
          Add Lead
        </button>
      )}
    </div>
  );
}
