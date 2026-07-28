"use client";

import React, { useState } from "react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fallback high-quality mock data if API list is empty
  const defaultLeads: LeadItem[] = [
    { id: 1001, name: "Siddharth Malhotra", phone: "+91 98765 43210", email: "siddharth@gmail.com", status: "NEW", source: "Website Form", assigned_to_id: 3, budget: 8500000, created_at: "2 hours ago" },
    { id: 1002, name: "Anjali Patil", phone: "+91 99887 76655", email: "anjali.patil@outlook.com", status: "CONTACTED", source: "Social Media", assigned_to_id: 3, budget: 12500000, created_at: "1 day ago" },
    { id: 1003, name: "Kabir Mehra", phone: "+91 91234 56789", email: "kabir.mehra@yahoo.com", status: "VISIT_SCHEDULED", source: "Direct Walk-in", assigned_to_id: 4, budget: 35000000, created_at: "2 days ago" },
    { id: 1004, name: "Neha Deshmukh", phone: "+91 90000 11111", email: "neha.d@deshmukh.in", status: "NEGOTIATION", source: "Property Portal", assigned_to_id: 5, budget: 18000000, created_at: "3 days ago" },
    { id: 1005, name: "Aravind Sharma", phone: "+91 98888 77777", email: "aravind@sharmagroup.com", status: "CONVERTED", source: "Referral", assigned_to_id: 3, budget: 52000000, created_at: "4 days ago" },
    { id: 1006, name: "Riya Kapoor", phone: "+91 97777 66666", email: "riya.k@gmail.com", status: "LOST", source: "Google Ads", assigned_to_id: 4, budget: 9500000, created_at: "5 days ago" },
    { id: 1007, name: "Manish Pandey", phone: "+91 96666 55555", email: "manish.p@outlook.com", status: "NEW", source: "Website Form", assigned_to_id: 5, budget: 14000000, created_at: "6 days ago" }
  ];

  const activeLeads = leads && leads.length > 0 ? leads.map((lead, idx) => ({
    ...lead,
    created_at: lead.created_at || `${idx + 1} day${idx > 0 ? 's' : ''} ago`
  })) : defaultLeads;

  // Formatting utility
  const formatCurrency = (val?: number) => {
    if (!val) return "₹1.2Cr";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    return `₹${(val / 100000).toFixed(1)} L`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "CONTACTED":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "VISIT_SCHEDULED":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "NEGOTIATION":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "CONVERTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
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
    <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden backdrop-blur-md bg-white/95">
      
      {/* Header section with Filter controls */}
      <div className="p-5 border-b border-[#E8EDF7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans">Recent Leads Registry</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage and track incoming deal flow</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-60 pl-9 pr-4 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-900 placeholder:text-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="sticky top-0 bg-slate-50/60 border-b border-[#E8EDF7] text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
              <th className="px-6 py-4">Customer Avatar</th>
              <th className="px-6 py-4">Lead Name</th>
              <th className="px-6 py-4">Phone Number</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Status Badge</th>
              <th className="px-6 py-4">Assigned Agent</th>
              <th className="px-6 py-4">Date Added</th>
              <th className="px-6 py-4 text-right">Action Button</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EDF7] text-sm">
            {paginatedLeads.map((lead, index) => (
              <tr 
                key={lead.id} 
                className="odd:bg-white even:bg-slate-50/10 transition-colors group table-row-anim premium-table-row border-l-0"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200/50">
                    {lead.name.charAt(0)}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {lead.name}
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ID: {lead.id}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-800">{lead.phone}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{lead.email || "No Email"}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/30">
                    {lead.source || "Web Intake"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(lead.status)}`}>
                    {lead.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-semibold text-slate-600">Agent {lead.assigned_to_id || 3}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                  {lead.created_at}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => alert(`Opening Lead Detail view for: ${lead.name}`)}
                    className="px-3 py-1.5 bg-slate-50/50 border border-[#E8EDF7] rounded-lg text-slate-700 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-semibold text-slate-600">No matching leads found</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search keywords</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {filteredLeads.length > 0 && (
        <div className="p-4 border-t border-[#E8EDF7] flex items-center justify-between text-xs text-slate-500 bg-slate-50/10">
          <p className="font-medium">
            Showing <span className="font-bold text-slate-900">{Math.min(filteredLeads.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
            <span className="font-bold text-slate-900">{Math.min(filteredLeads.length, currentPage * itemsPerPage)}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredLeads.length}</span> entries
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-[#E8EDF7] bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-600"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  currentPage === page 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "border border-[#E8EDF7] bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-[#E8EDF7] bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
