"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface LeadItem {
  id: number;
  name: string;
  phone: string;
  email?: string;
  status: string;
  source?: string;
  assigned_to_id?: number;
  budget?: number;
  created_at?: string;
}

interface RecentLeadsTableProps {
  leads: LeadItem[];
  onRefresh?: () => void;
}

export default function RecentLeadsTable({ leads, onRefresh }: RecentLeadsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const activeLeads = leads ?? [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
      case "CONTACTED":
        return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
      case "VISIT_SCHEDULED":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "NEGOTIATION":
        return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30";
      case "CONVERTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return { date: "Not available", time: "" };
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'AM' : 'PM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      return {
        date: `${day} ${month} ${year}`,
        time: `${hours}:${minutes} ${ampm}`
      };
    } catch (e) {
      return { date: "Not available", time: "" };
    }
  };

  // Search & Filter Logic
  const filteredLeads = activeLeads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">

      {/* Header section with Filter controls */}
      <div className="p-5 border-b border-slate-100 dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Recent Leads Registry</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-semibold mt-1">Manage and track incoming deal flow</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="h-10 w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50/50 dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:bg-white dark:focus:bg-[#0F172A] focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3.5 py-2 bg-slate-50/50 dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-slate-350 text-xs font-semibold focus:bg-white dark:focus:bg-[#0F172A] focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="VISIT_SCHEDULED">Visit Scheduled</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="sticky top-0 bg-slate-50/60 dark:bg-slate-800/40 border-b border-[#E8EDF7] dark:border-[#1E293B] text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider z-10">
              <th className="px-6 py-3.5">Lead</th>
              <th className="px-6 py-3.5">Contact Details</th>
              <th className="px-6 py-3.5">Source</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Assigned Agent</th>
              <th className="px-6 py-3.5">Date Added</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] text-sm">
            {paginatedLeads.map((lead, index) => {
              const formatted = getFormattedDate(lead.created_at);
              return (
                <tr
                  key={lead.id}
                  className="odd:bg-white even:bg-slate-50/20 dark:odd:bg-[#111827] dark:even:bg-[#1E293B]/20 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group table-row-anim premium-table-row border-l-0"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200/50 dark:border-blue-800/50 select-none">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {lead.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">ID: {lead.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-850 dark:text-slate-200">{lead.phone}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]" title={lead.email}>{lead.email || "No Email"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/30 dark:border-slate-700/30">
                      {lead.source || "Web Intake"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(lead.status)}`}>
                      {lead.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {lead.assigned_to_id ? `Agent ${lead.assigned_to_id}` : "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatted.date}</span>
                      {formatted.time && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{formatted.time}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="h-9 px-4 bg-slate-50 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 border border-[#E8EDF7] dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-600 text-slate-750 hover:text-white dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 cursor-pointer"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-semibold text-slate-600 dark:text-slate-400">No matching leads found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting your filters or search keywords</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {filteredLeads.length > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/10 dark:bg-transparent">
          <p className="font-medium text-slate-550 dark:text-[#94A3B8]">
            Showing <span className="font-bold text-slate-900 dark:text-white">{Math.min(filteredLeads.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
            <span className="font-bold text-slate-900 dark:text-white">{Math.min(filteredLeads.length, currentPage * itemsPerPage)}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{filteredLeads.length}</span> entries
          </p>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 px-3.5 rounded-xl border border-[#E8EDF7] dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#273449] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-9 w-9 flex items-center justify-center rounded-xl font-bold transition-all text-xs ${currentPage === page
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "border border-[#E8EDF7] dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#273449]"
                  }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 px-3.5 rounded-xl border border-[#E8EDF7] dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#273449] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
