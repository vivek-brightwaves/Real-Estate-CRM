"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSectionSearch } from "../../hooks/useSectionSearch";

interface Booking {
  id: number;
  unit_id: number;
  customer_id: number;
  status: "PENDING" | "DOCS_VERIFIED" | "APPROVED" | "CONFIRMED" | "CANCELLED";
  created_at?: string;
  discounts?: any[];
}

export default function BookingsBoardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  useSectionSearch("bookings", setSearchTerm);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 6;

  // Modal State for New Booking
  const [showNew, setShowNew] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [newCustId, setNewCustId] = useState("");

  // Action Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [activeMenuBooking, setActiveMenuBooking] = useState<Booking | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close action dropdown menu on scroll or click elsewhere
  useEffect(() => {
    const handleScrollOrClick = () => {
      setActiveMenuId(null);
      setActiveMenuBooking(null);
    };
    if (activeMenuId) {
      window.addEventListener("scroll", handleScrollOrClick, true);
      window.addEventListener("click", handleScrollOrClick, true);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrClick, true);
      window.removeEventListener("click", handleScrollOrClick, true);
    };
  }, [activeMenuId]);

  const handleOpenMenu = (event: React.MouseEvent, booking: Booking) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.right + window.scrollX - 160;
    setMenuPosition({ top, left });
    setActiveMenuBooking(booking);
    setActiveMenuId(activeMenuId === booking.id ? null : booking.id);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("action") === "new") {
      setShowNew(true);
    }
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchBookings();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      setBookings(res.data || []);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/bookings", {
        unit_id: Number(newUnitId),
        customer_id: Number(newCustId)
      });
      alert("Booking created successfully!");
      setShowNew(false);
      setNewUnitId("");
      setNewCustId("");
      fetchBookings();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to create booking"));
    }
  };

  // Mocked details matching customer profiles
  const getMockCustomer = (custId: number) => {
    const list = [
      { name: "Sarah Connor", phone: "+91 98765 43210" },
      { name: "John Doe", phone: "+91 91234 56789" },
      { name: "James Smith", phone: "+91 95432 10987" }
    ];
    return list[custId % list.length];
  };

  // Mocked details matching unit locations
  const getMockProperty = (unitId: number) => {
    const list = [
      { name: "Skyline Heights", tower: "Tower A", amount: "₹65 Lakhs" },
      { name: "Riverside Meadows", tower: "Tower B", amount: "₹72 Lakhs" },
      { name: "Grand Central Plaza", tower: "Tower 1", amount: "₹58 Lakhs" }
    ];
    return list[unitId % list.length];
  };

  // Sparkline chart simple datasets for KPI cards
  const sparkData = {
    pending: [{ value: 12 }, { value: 16 }, { value: 15 }, { value: 18 }, { value: 20 }, { value: 24 }],
    docs: [{ value: 22 }, { value: 26 }, { value: 24 }, { value: 31 }, { value: 28 }, { value: 35 }],
    approved: [{ value: 18 }, { value: 20 }, { value: 25 }, { value: 24 }, { value: 30 }, { value: 32 }],
    confirmed: [{ value: 8 }, { value: 12 }, { value: 14 }, { value: 18 }, { value: 16 }, { value: 20 }],
    cancelled: [{ value: 6 }, { value: 8 }, { value: 5 }, { value: 9 }, { value: 7 }, { value: 10 }],
  };

  // Count active stats
  const getStatusCount = (status: Booking["status"]) => {
    return bookings.filter((b: Booking) => b.status === status).length;
  };

  // Filter & search bookings
  const filteredBookings = bookings.filter((b: Booking) => {
    const cust = getMockCustomer(b.customer_id);
    const prop = getMockProperty(b.unit_id);
    const matchesSearch =
      String(b.id).includes(searchTerm) ||
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm) ||
      prop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * bookingsPerPage,
    currentPage * bookingsPerPage
  );

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-140px)] bg-gradient-to-br from-[#F6F9FF] via-[#EEF5FF] to-[#F8FAFC] dark:from-transparent dark:to-transparent p-1 rounded-3xl">
        
        <PageHeader
          breadcrumb="Dashboard / Bookings"
          title="Bookings"
          subtitle="Manage and track booking cycles and approvals."
          searchFilter={
            <input 
              type="text" 
              placeholder="Search Booking ID / Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 px-3.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm w-full sm:w-48 placeholder-slate-400 dark:placeholder-slate-500"
            />
          }
          actions={
            <div className="flex flex-wrap gap-2.5 items-center">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 px-3.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="DOCS_VERIFIED">DOCS VERIFIED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <button 
                onClick={() => setShowNew(true)} 
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shrink-0 cursor-pointer"
              >
                + New Booking
              </button>
            </div>
          }
        />

        {/* STATUS CARDS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Card 1: PENDING */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-border flex items-center justify-center text-amber-500 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button type="button" aria-label="Show pending bookings" onClick={() => { setStatusFilter("PENDING"); setCurrentPage(1); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block">Pending</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">{getStatusCount("PENDING")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+12%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.pending}>
                  <defs>
                    <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={1.5} fillOpacity={1} fill="url(#pendingGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: DOCS VERIFIED */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-border flex items-center justify-center text-blue-500 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button type="button" aria-label="Show document verified bookings" onClick={() => { setStatusFilter("DOCS_VERIFIED"); setCurrentPage(1); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block">Docs Verified</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">{getStatusCount("DOCS_VERIFIED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+18%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.docs}>
                  <defs>
                    <linearGradient id="docsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={1.5} fillOpacity={1} fill="url(#docsGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: APPROVED */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-border flex items-center justify-center text-emerald-500 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button type="button" aria-label="Show approved bookings" onClick={() => { setStatusFilter("APPROVED"); setCurrentPage(1); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block">Approved</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">{getStatusCount("APPROVED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+14%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.approved}>
                  <defs>
                    <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill="url(#approvedGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4: CONFIRMED */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-border flex items-center justify-center text-purple-500 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <button type="button" aria-label="Show confirmed bookings" onClick={() => { setStatusFilter("CONFIRMED"); setCurrentPage(1); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block">Confirmed</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">{getStatusCount("CONFIRMED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+25%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.confirmed}>
                  <defs>
                    <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={1.5} fillOpacity={1} fill="url(#confirmedGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 5: CANCELLED */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-border flex items-center justify-center text-red-500 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button type="button" aria-label="Show cancelled bookings" onClick={() => { setStatusFilter("CANCELLED"); setCurrentPage(1); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block">Cancelled</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">{getStatusCount("CANCELLED")}</span>
                <span className="text-[10px] font-bold text-rose-600">-2%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.cancelled}>
                  <defs>
                    <linearGradient id="cancelledGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={1.5} fillOpacity={1} fill="url(#cancelledGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* BOOKINGS TABLE */}
        <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-2 border-b border-slate-100 dark:border-border">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Bookings Log Directory</h3>
              <p className="text-[10px] text-slate-450 dark:text-[#94A3B8] font-bold mt-0.5">Filter, search, and manage transaction milestones</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] font-semibold text-xs bg-white dark:bg-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-sm">Loading bookings log...</div>
          ) : (
            <>
              <div className="overflow-x-auto md:overflow-x-visible scrollbar-premium-dark">
                <table className="w-full min-w-[800px] md:min-w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                      <th className="w-[10%] px-5 py-3.5">Booking ID</th>
                      <th className="w-[20%] px-5 py-3.5">Customer</th>
                      <th className="w-[22%] px-5 py-3.5">Property</th>
                      <th className="w-[10%] px-5 py-3.5">Unit</th>
                      <th className="w-[10%] px-5 py-3.5">Amount</th>
                      <th className="w-[12%] px-5 py-3.5">Status</th>
                      <th className="w-[10%] px-5 py-3.5">Booking Date</th>
                      <th className="w-[6%] min-w-[110px] px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                    {paginatedBookings.map((b: Booking) => {
                      const cust = getMockCustomer(b.customer_id);
                      const prop = getMockProperty(b.unit_id);
                      
                      const statusStyles = {
                        PENDING: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                        DOCS_VERIFIED: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30",
                        APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30",
                        CONFIRMED: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/30",
                        CANCELLED: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30"
                      };

                      return (
                        <tr 
                          key={b.id} 
                          className="hover:bg-slate-50/40 dark:hover:bg-white/[0.03] transition-all duration-200 group cursor-pointer"
                          onClick={() => router.push(`/bookings/${b.id}`)}
                        >
                          <td className="px-5 py-[18px] align-middle font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-455 transition-colors">Booking #{b.id}</td>
                          <td className="px-5 py-[18px] align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-[11px] shadow-sm shrink-0">
                                {cust.name.charAt(0)}
                              </div>
                              <div className="flex flex-col justify-center">
                                <span className="block font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-455 transition-colors cursor-pointer leading-tight" onClick={() => router.push(`/customers/${b.customer_id}`)}>{cust.name}</span>
                                <span className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-bold leading-normal mt-0.5">{cust.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-[18px] align-middle">
                            <div className="flex flex-col justify-center">
                              <span className="block font-bold text-slate-900 dark:text-white leading-tight">{prop.name}</span>
                              <span className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-bold leading-normal mt-0.5">{prop.tower}</span>
                            </div>
                          </td>
                          <td className="px-5 py-[18px] align-middle font-black text-slate-800 dark:text-white">Unit #{b.unit_id}</td>
                          <td className="px-5 py-[18px] align-middle font-bold text-slate-800 dark:text-white">{prop.amount}</td>
                          <td className="px-5 py-[18px] align-middle">
                            <span className={`px-4 py-1 rounded-full text-xs font-bold border ${statusStyles[b.status]}`}>
                              {b.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-[18px] align-middle font-semibold text-slate-500 dark:text-[#CBD5E1]">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                          </td>
                          <td className="px-5 py-[18px] align-middle text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => handleOpenMenu(e, b)}
                              className="w-[84px] py-1 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold rounded-lg transition shadow-sm cursor-pointer mx-auto block"
                            >
                              Options
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedBookings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12">
                          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0F172A] rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] max-w-lg mx-auto my-6 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-blue-950/20 border border-blue-900/30 flex items-center justify-center text-blue-400 mb-4 shadow-sm shadow-blue-500/5">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">No Bookings Found</h4>
                            <p className="text-xs text-[#94A3B8] max-w-sm mb-5 font-medium">There are no bookings available yet. Create your first booking to get started.</p>
                            <button 
                              onClick={() => setShowNew(true)} 
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-90 transition-all text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer"
                            >
                              + New Booking
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredBookings.length > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-4 mt-4 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                  <span>Showing {Math.min(filteredBookings.length, (currentPage - 1) * bookingsPerPage + 1)} to {Math.min(filteredBookings.length, currentPage * bookingsPerPage)} of {filteredBookings.length} Bookings</span>
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

        {/* CREATE BOOKING MODAL */}
        {showNew && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">New Booking</h3>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Unit ID</label>
                  <input 
                    type="number" required
                    value={newUnitId} onChange={(e) => setNewUnitId(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. 1"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Customer ID</label>
                  <input 
                    type="number" required
                    value={newCustId} onChange={(e) => setNewCustId(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. 1"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowNew(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OPTIONS POPUP PORTAL */}
        {mounted && activeMenuId && activeMenuBooking && menuPosition && createPortal(
          <div 
            style={{ 
              position: "absolute", 
              top: `${menuPosition.top}px`, 
              left: `${menuPosition.left}px`,
              width: "160px"
            }}
            className="bg-white dark:bg-[#1E293B] rounded-xl shadow-xl border border-[#E8EDF7] dark:border-border z-[100] py-1 font-semibold text-xs animate-modal-fade-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setActiveMenuId(null); setActiveMenuBooking(null); router.push(`/bookings/${activeMenuBooking.id}`); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer">View Details</button>
            <button onClick={() => { setActiveMenuId(null); setActiveMenuBooking(null); router.push(`/customers/${activeMenuBooking.customer_id}`); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer">View Client</button>
            <button onClick={() => { setActiveMenuId(null); setActiveMenuBooking(null); router.push(`/collections?booking=${activeMenuBooking.id}`); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer">Schedule Payment</button>
          </div>,
          document.body
        )}

      </div>
    </DashboardLayout>
  );
}
