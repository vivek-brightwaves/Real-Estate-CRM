"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSectionSearch } from "../../hooks/useSectionSearch";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED" | "VIP" | "VERIFIED";
  kyc?: "PENDING" | "VERIFIED" | "FAILED";
  bookings_count?: number;
  created_at?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  useSectionSearch("customers", setSearchTerm);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [kycFilter, setKycFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustLeadId, setNewCustLeadId] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchCustomers();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications"),
      ]);
      setUnreadCount(countRes.data.count ?? 0);
      setNotifications(listRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/mark-read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;

    try {
      await api.post("/customers", {
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail,
        lead_id: Number(newCustLeadId),
      });

      alert("Customer created successfully!");
      setShowAddModal(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setNewCustLeadId("");
      fetchCustomers();
    } catch (err) {
      alert("Error adding customer");
    }
  };

  // Deterministic mock variables for rich SaaS visual elements (Status, KYC, Bookings)
  const getEnrichedData = (c: Customer) => {
    const statuses: Customer["status"][] = ["ACTIVE", "VERIFIED", "VIP", "INACTIVE", "BLOCKED"];
    const kycs: Customer["kyc"][] = ["VERIFIED", "PENDING", "FAILED"];

    // Deterministic selectors based on customer ID
    const status = c.status || statuses[c.id % statuses.length];
    const kyc = c.kyc || kycs[c.id % kycs.length];
    const bookings = c.bookings_count ?? (c.id % 4) + 1;
    const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : "2026-07-27";

    return { status, kyc, bookings, date };
  };

  // Filter & Search customer profiles
  const filteredCustomers = customers.filter((c: Customer) => {
    const enriched = getEnrichedData(c);
    const code = `CUS-100${c.id}`;

    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || enriched.status === statusFilter;
    const matchesKYC = kycFilter === "ALL" || enriched.kyc === kycFilter;

    return matchesSearch && matchesStatus && matchesKYC;
  });

  // Sorting
  const sortedCustomers = [...filteredCustomers].sort((a: Customer, b: Customer) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "id") {
      return b.id - a.id;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedCustomers.length / rowsPerPage) || 1;
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const exportCustomers = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["ID", "Name", "Phone", "Email"],
      ...sortedCustomers.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCustomer) return;
    try {
      await api.patch(`/customers/${editingCustomer.id}`, {
        name: editingCustomer.name,
        phone: editingCustomer.phone || null,
        email: editingCustomer.email || null,
      });
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || "Unable to update customer");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setKycFilter("ALL");
    setSortBy("name");
  };

  // Sparkline data
  const sparkData = {
    total: [{ value: 920 }, { value: 1040 }, { value: 1110 }, { value: 1180 }, { value: 1240 }, { value: 1280 }],
    verified: [{ value: 800 }, { value: 910 }, { value: 980 }, { value: 1010 }, { value: 1050 }, { value: 1098 }],
    pending: [{ value: 120 }, { value: 130 }, { value: 130 }, { value: 170 }, { value: 190 }, { value: 112 }],
    blocked: [{ value: 60 }, { value: 65 }, { value: 62 }, { value: 72 }, { value: 68 }, { value: 70 }],
  };

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="space-y-8 bg-gradient-to-br from-[#F8FAFF] via-[#EEF5FF] to-[#F7FAFC] dark:from-transparent dark:to-transparent min-h-[calc(100vh-120px)] p-1 rounded-3xl relative overflow-hidden">

        {/* Soft header background mesh gradient */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.05),transparent_70%)] pointer-events-none" />

        <PageHeader
          breadcrumb="Dashboard / Customers"
          title="Customer Directory"
          subtitle="Manage converted buyers, contact details and document verifications."
          searchFilter={
            <input
              type="text"
              placeholder="Search Name, Phone, Email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 px-3.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm w-full sm:w-60 placeholder-slate-400 dark:placeholder-slate-500"
            />
          }
          actions={
            <div className="flex flex-wrap gap-2.5 items-center">
              <button
                onClick={exportCustomers}
                className="h-10 px-4 bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#273449] rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center shrink-0"
              >
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shrink-0 cursor-pointer"
              >
                + Add Customer
              </button>
            </div>
          }
        />

        {/* KPI STATISTICS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">

          {/* Card 1 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest">Total Customers</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">1,280</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-blue-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30">↑ 12.4%</span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.total}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#totalGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest">Verified Customers</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">1,098</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-emerald-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-455 border-emerald-100/60 dark:border-emerald-900/30">↑ 8.2%</span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.verified}>
                  <defs>
                    <linearGradient id="verifiedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#verifiedGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest">Pending Verification</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">112</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-orange-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455 border-rose-100/60 dark:border-rose-900/30">↓ 4.6%</span>
              <span className="text-[9px] text-slate-455 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.pending}>
                  <defs>
                    <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#pendingGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest">Blocked Customers</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">70</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-red-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30">↑ 1.1%</span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.blocked}>
                  <defs>
                    <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#blockedGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>            {/* CUSTOMERS GLASS TABLE CONTAINER */}
        <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 relative z-10 overflow-hidden">

          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-border">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">All Customer Directory</h3>
              <p className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-bold mt-0.5">Filter, search, sort and check converted buyers KYC parameters</p>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center w-full xl:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="VIP">VIP</option>
                <option value="VERIFIED">VERIFIED</option>
              </select>

              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="h-10 px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value="ALL">All KYC</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="id">Sort by ID</option>
              </select>

              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value={6}>6 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
              </select>

              <button
                onClick={resetFilters}
                className="h-[48px] w-auto px-[22px] bg-slate-50 dark:bg-transparent border border-[#E8EDF7] dark:border-white/[0.18] rounded-[12px] text-[14px] font-semibold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-350 dark:hover:border-white/[0.28] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-500/10 active:scale-[0.98] active:border-blue-500 dark:active:border-blue-500"
              >
                <svg className="w-4 h-4 shrink-0 dark:text-[#F8FAFC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                </svg>
                Reset Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] font-semibold text-xs bg-white dark:bg-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-sm">Loading Customers...</div>
          ) : (
            <>
              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">KYC</th>
                      <th className="px-6 py-4">Bookings</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                    {paginatedCustomers.map((c: Customer) => {
                      const enriched = getEnrichedData(c);

                      const statusStyles: Record<string, string> = {
                        ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30",
                        INACTIVE: "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/30",
                        BLOCKED: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30",
                        VIP: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-455 dark:border-purple-900/30",
                        VERIFIED: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-455 dark:border-blue-900/30"
                      };

                      const kycStyles: Record<string, string> = {
                        VERIFIED: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-455 dark:border-blue-900/30",
                        PENDING: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                        FAILED: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30"
                      };

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-[#273449] transition-all group rounded-xl cursor-pointer"
                          onClick={() => router.push(`/customers/${c.id}`)}
                        >
                          {/* CUSTOMER PROFILE */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-650 text-white flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-105 transition-transform duration-200">
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <span className="block font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-455 transition-colors">{c.name}</span>
                                <span className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-bold uppercase tracking-wide">CUS-100{c.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* PHONE */}
                          <td className="px-6 py-4 font-bold text-slate-700 dark:text-[#CBD5E1]">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {c.phone || "+91 98765 43210"}
                            </span>
                          </td>

                          {/* EMAIL */}
                          <td className="px-6 py-4 font-semibold text-slate-655 dark:text-[#CBD5E1]">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {c.email || `${c.name.toLowerCase().replace(/\s+/g, '')}@email.com`}
                            </span>
                          </td>

                          {/* STATUS PILL */}
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyles[enriched.status || "ACTIVE"]}`}>
                              {enriched.status}
                            </span>
                          </td>

                          {/* KYC STATUS PILL */}
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${kycStyles[enriched.kyc || "PENDING"]}`}>
                              {enriched.kyc}
                            </span>
                          </td>

                          {/* BOOKINGS COUNT */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] text-xs font-black text-slate-700 dark:text-[#CBD5E1]">
                              🏠 {enriched.bookings} Bookings
                            </span>
                          </td>

                          {/* CREATED DATE */}
                          <td className="px-6 py-4 font-bold text-slate-455 dark:text-[#94A3B8] text-xs uppercase">{enriched.date}</td>

                          {/* ACTIONS */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => router.push(`/customers/${c.id}`)}
                                className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-blue-650 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 text-xs font-bold transition shadow-sm cursor-pointer"
                              >
                                👁 View
                              </button>
                              <button
                                onClick={() => setEditingCustomer({ ...c })}
                                className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#273449] text-xs font-bold transition shadow-sm cursor-pointer"
                              >
                                ✏ Edit
                              </button>
                              <button
                                onClick={() => router.push(`/customers/${c.id}`)}
                                className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-955/20 border border-purple-100 dark:border-purple-900/30 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold transition shadow-sm cursor-pointer"
                              >
                                📄 Docs
                              </button>
                              <button
                                onClick={() => router.push(`/customers/${c.id}`)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-555 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#273449] transition shadow-sm cursor-pointer font-black text-xs"
                              >
                                ⋮
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedCustomers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12">
                          <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0F172A] rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] max-w-lg mx-auto my-6 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-blue-955/20 border border-blue-900/30 flex items-center justify-center text-blue-400 mb-4 shadow-sm shadow-blue-500/5">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">No Customers Found</h4>
                            <p className="text-xs text-[#94A3B8] max-w-sm mb-5 font-medium">You don't have any customers yet. Start by adding your first customer.</p>
                            <button
                              onClick={() => setShowAddModal(true)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-90 transition-all text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer"
                            >
                              + Add Customer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION LOGIC */}
              {filteredCustomers.length > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-6 mt-6 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                  <span>Showing {Math.min(filteredCustomers.length, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(filteredCustomers.length, currentPage * rowsPerPage)} of {filteredCustomers.length} Customers</span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-[#CBD5E1] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-[#CBD5E1] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* ADD CUSTOMER MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Add Customer</h3>
              <form onSubmit={handleAddCustomer} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Converted Lead ID</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCustLeadId}
                    onChange={(e) => setNewCustLeadId(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="Lead ID"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Customer Name</label>
                  <input
                    type="text" required
                    value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Rohan Sharma"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Phone Number</label>
                  <input
                    type="text" required
                    value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Email Address</label>
                  <input
                    type="email" required
                    value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. rohan@email.com"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowAddModal(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Add Customer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingCustomer && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Edit Customer</h3>
              <form onSubmit={saveCustomer} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Customer Name</label>
                  <input
                    required
                    value={editingCustomer.name}
                    onChange={(event) => setEditingCustomer({ ...editingCustomer, name: event.target.value })}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Phone Number</label>
                  <input
                    value={editingCustomer.phone || ""}
                    onChange={(event) => setEditingCustomer({ ...editingCustomer, phone: event.target.value })}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ""}
                    onChange={(event) => setEditingCustomer({ ...editingCustomer, email: event.target.value })}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="Email"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setEditingCustomer(null)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
