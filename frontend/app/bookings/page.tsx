"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 6;

  // Modal State for New Booking
  const [showNew, setShowNew] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [newCustId, setNewCustId] = useState("");

  // Action Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  useEffect(() => {
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
      <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-140px)] bg-gradient-to-br from-[#F6F9FF] via-[#EEF5FF] to-[#F8FAFC] p-1 rounded-3xl">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.06),transparent_70%)] pointer-events-none" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Booking Pipeline</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Manage and track booking cycles and approvals.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto shrink-0 z-10">
            <input 
              type="text" 
              placeholder="Search Booking ID / Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-2 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm w-full md:w-48"
            />
            <button 
              onClick={() => alert("Filter sidebar toggled")}
              className="px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm cursor-pointer"
            >
              Filter
            </button>
            <button 
              onClick={() => setShowNew(true)} 
              className="btn-premium-action btn-new-booking"
            >
              + New Booking
            </button>
          </div>
        </div>

        {/* STATUS CARDS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Card 1: PENDING */}
          <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-orange-200 rounded-[22px] p-5 shadow-[0_20px_50px_rgba(30,41,59,.08)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#F59E0B] shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getStatusCount("PENDING")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+12%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.pending}>
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={1.5} fillOpacity={0.06} fill="#F59E0B" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: DOCS VERIFIED */}
          <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-blue-200 rounded-[22px] p-5 shadow-[0_20px_50px_rgba(30,41,59,.08)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#2563EB] shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Docs Verified</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getStatusCount("DOCS_VERIFIED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+18%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.docs}>
                  <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={1.5} fillOpacity={0.06} fill="#2563EB" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: APPROVED */}
          <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-emerald-250 rounded-[22px] p-5 shadow-[0_20px_50px_rgba(30,41,59,.08)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#10B981] shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Approved</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getStatusCount("APPROVED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+14%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.approved}>
                  <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fillOpacity={0.06} fill="#10B981" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4: CONFIRMED */}
          <div className="bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-purple-200 rounded-[22px] p-5 shadow-[0_20px_50px_rgba(30,41,59,.08)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#8B5CF6] shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Confirmed</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getStatusCount("CONFIRMED")}</span>
                <span className="text-[10px] font-bold text-emerald-600">+25%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.confirmed}>
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={1.5} fillOpacity={0.06} fill="#8B5CF6" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 5: CANCELLED */}
          <div className="bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border border-red-200 rounded-[22px] p-5 shadow-[0_20px_50px_rgba(30,41,59,.08)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#EF4444] shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <span className="text-base font-bold">&bull;&bull;&bull;</span>
              </button>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cancelled</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getStatusCount("CANCELLED")}</span>
                <span className="text-[10px] font-bold text-rose-600">-2%</span>
              </div>
            </div>
            <div className="w-full h-8 mt-3 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.cancelled}>
                  <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={1.5} fillOpacity={0.06} fill="#EF4444" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* BOOKINGS TABLE */}
        <div className="bg-white/90 backdrop-blur-md border border-[#E8EDF7] rounded-[24px] shadow-[0_12px_40px_rgba(15,23,42,.08)] p-6 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Bookings Log Directory</h3>
              <p className="text-[10px] text-slate-450 font-bold mt-0.5">Filter, search, and manage transaction milestones</p>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="DOCS_VERIFIED">DOCS VERIFIED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading bookings log...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-50/60 border-b border-[#E8EDF7] text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
                      <th className="px-6 py-4">Booking ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Property</th>
                      <th className="px-6 py-4">Unit</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Booking Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF7] text-sm">
                    {paginatedBookings.map((b: Booking) => {
                      const cust = getMockCustomer(b.customer_id);
                      const prop = getMockProperty(b.unit_id);
                      
                      const statusStyles = {
                        PENDING: "bg-orange-50 text-orange-700 border-orange-100",
                        DOCS_VERIFIED: "bg-blue-50 text-blue-700 border-blue-100",
                        APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        CONFIRMED: "bg-purple-50 text-purple-700 border-purple-100",
                        CANCELLED: "bg-rose-50 text-rose-700 border-rose-100"
                      };

                      return (
                        <tr 
                          key={b.id} 
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/bookings/${b.id}`)}
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Booking #{b.id}</td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-[11px] shadow-sm">
                                {cust.name.charAt(0)}
                              </div>
                              <div>
                                <span className="block font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => router.push(`/customers/${b.customer_id}`)}>{cust.name}</span>
                                <span className="text-[10px] text-slate-450 font-bold">{cust.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="block font-bold text-slate-900">{prop.name}</span>
                              <span className="text-[10px] text-slate-450 font-bold">{prop.tower}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-black text-slate-800">Unit #{b.unit_id}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{prop.amount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyles[b.status]}`}>
                              {b.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-500">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block text-left">
                              <button 
                                onClick={() => setActiveMenuId(activeMenuId === b.id ? null : b.id)}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                              >
                                Options
                              </button>
                              
                              {activeMenuId === b.id && (
                                <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-[#E8EDF7] z-50 py-1 font-semibold text-xs">
                                  <button onClick={() => router.push(`/bookings/${b.id}`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700">View Details</button>
                                  <button onClick={() => router.push(`/customers/${b.customer_id}`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700">View Client</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedBookings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-semibold">No bookings found match current query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredBookings.length > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6 text-xs font-bold text-slate-450 uppercase">
                  <span>Showing {Math.min(filteredBookings.length, (currentPage - 1) * bookingsPerPage + 1)} to {Math.min(filteredBookings.length, currentPage * bookingsPerPage)} of {filteredBookings.length} Bookings</span>
                  <div className="flex gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-700 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3.5 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-700 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-md p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-lg font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">New Booking</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Unit ID</label>
                  <input 
                    type="number" required
                    value={newUnitId} onChange={(e) => setNewUnitId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
                    placeholder="e.g. 1"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer ID</label>
                  <input 
                    type="number" required
                    value={newCustId} onChange={(e) => setNewCustId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
                    placeholder="e.g. 1"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-655 text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
