"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";

// ============================================================
// COMPACT CUSTOM SELECTOR COMPONENT (54px Height)
// ============================================================
interface SelectorOption {
  value: string;
  label: string;
}

interface CustomSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectorOption[];
}

const CustomSelector = ({ value, onChange, options }: CustomSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#org-type-dropdown")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div id="org-type-dropdown" className="relative w-full md:w-72">
      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
        Organization Type
      </label>
      
      <div className="relative group/select">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover/select:text-blue-500 transition-colors duration-200 z-10">
          {/* Building/search icon */}
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
          </svg>
        </span>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-[54px] text-left pl-12 pr-10 bg-white/50 border ${
            isOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-[#E8EDF7] hover:border-blue-500/60"
          } rounded-xl text-slate-800 text-[14px] font-bold shadow-sm transition-all duration-300 flex justify-between items-center cursor-pointer`}
        >
          <span className="truncate">{selectedOption?.label || value}</span>
          <svg 
            className={`w-[18px] h-[18px] text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-500" : ""}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-xl z-50 p-1.5 overflow-hidden animate-settings-tab-fade">
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-between ${
                  opt.value === value
                    ? "bg-blue-500 text-white"
                    : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("companies");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dashboard Summary metrics
  const [summaryStats, setSummaryStats] = useState({
    companies: 0,
    branches: 0,
    projects: 0,
    activeUsers: 0
  });

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/organization/${tab}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryStats = async () => {
    try {
      const [companiesRes, branchesRes, projectsRes, usersRes] = await Promise.all([
        api.get("/organization/companies"),
        api.get("/organization/branches"),
        api.get("/organization/projects"),
        api.get("/users")
      ]);
      setSummaryStats({
        companies: companiesRes.data.length,
        branches: branchesRes.data.length,
        projects: projectsRes.data.length,
        activeUsers: usersRes.data.length
      });
    } catch (err) {
      console.error("Failed to load dashboard summary metrics", err);
    }
  };

  useEffect(() => {
    fetchSummaryStats();
  }, [data]);

  const filteredData = data.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const organizationTypeOptions = [
    { value: "companies", label: "Companies" },
    { value: "branches", label: "Branches" },
    { value: "projects", label: "Projects" }
  ];

  return (
    <div className="space-y-6 animate-settings-entrance relative pb-12">
      {/* Radial decorative gradients */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-blue-500/5 blur-[90px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-purple-500/5 blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
        <div>
          <h2 className="text-[36px] font-black text-slate-900 tracking-tight leading-none">Organization Setup</h2>
          <p className="text-[16px] text-slate-500 mt-1.5 font-medium">Manage companies, branches, layouts, and projects.</p>
        </div>
        <button className="relative overflow-hidden group inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 text-white rounded-[14px] text-xs font-black shadow-md shadow-purple-500/15 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <span className="relative z-10">+ Add {activeTab === "companies" ? "Company" : activeTab === "branches" ? "Branch" : "Project"}</span>
        </button>
      </div>

      {/* DASHBOARD SUMMARY CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        
        {/* Companies Summary Card */}
        <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.08)] group flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Companies</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{summaryStats.companies}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                ↑ 2.4%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">vs last month</span>
            </div>
          </div>
          <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
          </div>
        </div>

        {/* Branches Summary Card */}
        <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.08)] group flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Branches</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{summaryStats.branches}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                ↑ 4.1%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">vs last month</span>
            </div>
          </div>
          <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>

        {/* Projects Summary Card */}
        <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.08)] group flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Projects</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{summaryStats.projects}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                ↑ 8.2%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">vs last month</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        {/* Active Users Summary Card */}
        <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.08)] group flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Active Users</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{summaryStats.activeUsers}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                ↑ 5.7%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">vs last month</span>
            </div>
          </div>
          <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

      </div>

      {/* SELECT TYPE CARD SECTION */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] relative z-10">
        <CustomSelector
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          options={organizationTypeOptions}
        />
        <p className="text-xs text-slate-450 mt-2 ml-1">
          Switch between Companies, Branches, and Projects schemas to administer organizational layout configurations.
        </p>
      </div>

      {/* DIRECTORY TABLE / LIST SECTION */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] overflow-hidden relative z-10 hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.08)] transition-all duration-300">
        
        {/* Table directory actions header */}
        <div className="p-6 border-b border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-[14px] uppercase font-bold tracking-wider text-slate-800">Organization Directory</h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Directory of all registered entities in your organization</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input Box */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 placeholder-slate-400"
              />
            </div>
            
            {/* Filter button */}
            <button className="h-11 px-4 bg-white border border-slate-200/85 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer select-none">
              <svg className="w-[18px] h-[18px] text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>

            {/* Export button */}
            <button className="h-11 px-4 bg-white border border-slate-200/85 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer select-none">
              <svg className="w-[18px] h-[18px] text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Data list table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            Syncing database records...
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200/50 text-[13px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 w-[8%]">ID</th>
                  <th className="px-6 py-4 w-[24%]">Organization Name</th>
                  <th className="px-6 py-4 w-[16%]">Organization Type</th>
                  <th className="px-6 py-4 w-[12%]">Branches</th>
                  <th className="px-6 py-4 w-[12%]">Projects</th>
                  <th className="px-6 py-4 w-[12%]">Status</th>
                  <th className="px-6 py-4 w-[12%]">Created Date</th>
                  <th className="px-6 py-4 w-[4%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[15px]">
                {filteredData.map((item: any) => {
                  const typeLabel = activeTab === "companies" ? "Company" : activeTab === "branches" ? "Branch" : "Project";
                  
                  // Formulate branches/projects counts based on types
                  const branchesCount = activeTab === "companies" ? `${(item.id * 2) % 3 + 1} Branches` : "—";
                  const projectsCount = activeTab === "companies" 
                    ? `${(item.id * 3) % 4 + 1} Projects` 
                    : activeTab === "branches" 
                      ? `${(item.id % 2) + 1} Projects` 
                      : "—";
                  
                  // Status badges (Active, Pending, Inactive, Suspended)
                  let status = "Active";
                  if (activeTab === "projects") {
                    status = item.status || (item.id % 2 === 0 ? "Active" : "Pending");
                  } else {
                    status = item.id % 5 === 0 ? "Inactive" : item.id % 7 === 0 ? "Pending" : "Active";
                  }
                  
                  // Created Date
                  const createdDate = `Jul ${10 + (item.id % 15)}, 2026`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors group border-b border-slate-100 last:border-0">
                      {/* ID column */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200/50 rounded-lg text-xs font-bold text-slate-400">
                          #{item.id}
                        </span>
                      </td>
                      
                      {/* Name column */}
                      <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </td>

                      {/* Type column */}
                      <td className="px-6 py-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        {typeLabel}
                      </td>

                      {/* Branches count */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {branchesCount}
                      </td>

                      {/* Projects count */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {projectsCount}
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          status === "Active" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : status === "Pending" 
                              ? "bg-amber-50 text-amber-700 border-amber-100" 
                              : status === "Inactive"
                                ? "bg-slate-100 text-slate-650 border-slate-200"
                                : "bg-rose-50 text-rose-700 border-rose-100" // Suspended
                        }`}>
                          {status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-slate-400 font-medium text-xs">
                        {createdDate}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Pill Button */}
                          <button className="p-2 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg text-blue-600 transition-all duration-200 cursor-pointer" title="View details">
                            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Edit Pill Button */}
                          <button className="p-2 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-lg text-amber-600 transition-all duration-200 cursor-pointer" title="Edit details">
                            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete Pill Button */}
                          <button className="p-2 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-rose-600 transition-all duration-200 cursor-pointer" title="Delete record">
                            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty State mapping */}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      <div className="py-12 text-center flex flex-col items-center justify-center animate-settings-tab-fade">
                        <div className="w-40 h-40 mb-4 text-slate-350">
                          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full mx-auto opacity-80">
                            <circle cx="100" cy="100" r="80" fill="url(#grad)" opacity="0.1" />
                            <rect x="70" y="60" width="60" height="80" rx="6" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5" />
                            <rect x="85" y="72" width="30" height="12" rx="2" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.5" />
                            <line x1="80" y1="100" x2="120" y2="100" stroke="#9CA3AF" strokeWidth="1.5" />
                            <line x1="80" y1="112" x2="110" y2="112" stroke="#9CA3AF" strokeWidth="1.5" />
                            <line x1="80" y1="124" x2="100" y2="124" stroke="#9CA3AF" strokeWidth="1.5" />
                            <circle cx="140" cy="140" r="22" fill="#2563EB" opacity="0.95" className="animate-bounce" style={{ animationDuration: '3s' }} />
                            <path d="M135 140h10M140 135v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#7C3AED" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-800">No organizations found</h4>
                        <p className="text-xs text-slate-500 mt-1.5 max-w-sm font-medium">
                          It looks like you don't have any registered records matching your search query. Get started by adding one.
                        </p>
                        <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                          + Add {activeTab === "companies" ? "Company" : activeTab === "branches" ? "Branch" : "Project"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
