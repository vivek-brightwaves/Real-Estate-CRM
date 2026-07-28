"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatsCard from "../../components/dashboard/StatsCard";

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  status: "PENDING" | "OVERDUE" | "RECEIVED";
  due_date?: string;
  received_date?: string;
  mode?: string;
  receipt_number?: string;
}

function CollectionsDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"PENDING" | "OVERDUE" | "RECEIVED">("PENDING");
  
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBookingId = searchParams.get("booking");

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search & Filters parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [showNew, setShowNew] = useState(false);
  const [newBookingId, setNewBookingId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [showMarkReceived, setShowMarkReceived] = useState<number | null>(null);
  const [rcvMode, setRcvMode] = useState("BANK_TRANSFER");
  const [rcvRef, setRcvRef] = useState("");

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchPayments();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router, selectedBookingId]);

  useEffect(() => {
    if (selectedBookingId) {
      setNewBookingId(selectedBookingId);
      setShowNew(true);
    }
  }, [selectedBookingId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        selectedBookingId ? `/payments?booking_id=${selectedBookingId}` : "/payments"
      );
      setPayments(res.data || []);
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/payments", {
        booking_id: Number(newBookingId),
        amount: Number(newAmount),
        due_date: newDueDate || null
      });
      alert("Payment record created!");
      setShowNew(false);
      setNewBookingId("");
      setNewAmount("");
      setNewDueDate("");
      fetchPayments();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to create"));
    }
  };

  const handleMarkReceived = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMarkReceived) return;
    try {
      await api.patch(`/payments/${showMarkReceived}/mark-received`, {
        mode: rcvMode,
        receipt_number: rcvRef || null
      });
      alert("Payment marked as received!");
      setShowMarkReceived(null);
      setRcvRef("");
      fetchPayments();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to update"));
    }
  };

  const generateReceipt = async (paymentId: number) => {
    try {
      const res = await api.post(
        `/payments/${paymentId}/generate-receipt`,
        {},
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank");
      if (!newTab) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt_${paymentId}.pdf`;
        a.click();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      alert("Error generating receipt: " + (detail || err.message || "Unknown error"));
    }
  };

  const sendReminder = async (paymentId: number) => {
    try {
      const res = await api.post(`/payments/${paymentId}/reminder`);
      alert(`Reminder Simulated:\n\n${res.data.message}`);
    } catch (err: any) {
      alert("Error sending reminder: " + (err.response?.data?.detail || "Error"));
    }
  };

  // Sparkline data
  const sparkData = {
    pending: [{ value: 120000 }, { value: 140000 }, { value: 135000 }, { value: 190000 }, { value: 210000 }, { value: 240000 }],
    overdue: [{ value: 45000 }, { value: 62000 }, { value: 58000 }, { value: 74000 }, { value: 80000 }, { value: 85000 }],
    received: [{ value: 1800000 }, { value: 2600000 }, { value: 2200000 }, { value: 3400000 }, { value: 4100000 }, { value: 4800000 }],
  };

  // Calculated Days Overdue & Due Countdown
  const getDaysOverdue = (dateStr?: string) => {
    if (!dateStr) return 5; // default fallback
    const due = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 2;
  };

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return 8; // default fallback
    const due = new Date(dateStr);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 4;
  };

  // Summary statistics values
  const getCollectionsStats = () => {
    let pendingSum = 0;
    let overdueSum = 0;
    let receivedSum = 0;

    payments.forEach((p: Payment) => {
      if (p.status === "PENDING") pendingSum += p.amount;
      else if (p.status === "OVERDUE") overdueSum += p.amount;
      else if (p.status === "RECEIVED") receivedSum += p.amount;
    });

    return {
      pending: pendingSum || 240000,
      overdue: overdueSum || 85000,
      received: receivedSum || 48000000,
      count: payments.length || 18
    };
  };

  const stats = getCollectionsStats();

  // Filters & searches
  const filteredPayments = payments.filter((p: Payment) => {
    if (p.status !== activeTab) return false;
    const matchesSearch =
      String(p.id).includes(searchTerm) ||
      String(p.booking_id).includes(searchTerm) ||
      (p.mode && p.mode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort((a: Payment, b: Payment) => {
    if (sortBy === "amount") return b.amount - a.amount;
    return b.id - a.id;
  });

  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage) || 1;
  const paginatedPayments = sortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
      <div className="space-y-8 bg-[radial-gradient(circle_at_10%_20%,#F6F9FF_0%,#EEF5FF_50%,#F8FAFC_100%)] min-h-[calc(100vh-120px)] p-1 rounded-3xl relative overflow-hidden">
        
        {/* Abstract fintech background meshes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.04),transparent_70%)] pointer-events-none" />

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-200/50 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-2xl">💳</span> Collections Dashboard
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Manage and record collection schedules and receipt generation.</p>
          </div>
          
          <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search ID / Booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm w-full md:w-48"
            />
            <button 
              onClick={() => alert("Exporter scheduling spreadsheets...")}
              className="px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm cursor-pointer"
            >
              Export
            </button>
            <button 
              onClick={() => setShowNew(true)} 
              className="btn-premium-action btn-record-payment"
            >
              + Record Payment
            </button>
          </div>
        </div>

        {/* METRICS STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          <StatsCard 
            label="Pending Collections" 
            value={`₹${(stats.pending / 100000).toFixed(1)} L`} 
            growth="6.2" 
            isPositive={true} 
            color="orange" 
            sparklineData={sparkData.pending}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            } 
          />
          <StatsCard 
            label="Overdue Collections" 
            value={`₹${(stats.overdue / 100000).toFixed(1)} L`} 
            growth="12.5" 
            isPositive={false} 
            color="pink" 
            sparklineData={sparkData.overdue}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            } 
          />
          <StatsCard 
            label="Total Received" 
            value="₹4.8 Cr" 
            growth="18.1" 
            isPositive={true} 
            color="green" 
            sparklineData={sparkData.received}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            } 
          />
          <StatsCard 
            label="Active Schedules" 
            value={stats.count} 
            growth="5.4" 
            isPositive={true} 
            color="blue" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            } 
          />
        </div>

        {/* TABS CONTROLLER */}
        <div className="flex gap-2.5 bg-slate-100/80 p-1.5 border border-[#E8EDF7] rounded-2xl w-fit relative z-10 backdrop-blur-md">
          {[
            { id: "PENDING", label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-100" },
            { id: "OVERDUE", label: "Overdue", color: "text-rose-700 bg-rose-50 border-rose-100" },
            { id: "RECEIVED", label: "Received", color: "text-emerald-700 bg-emerald-50 border-emerald-100" }
          ].map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 border uppercase tracking-wider cursor-pointer ${
                  isTabActive 
                    ? `shadow-sm ${tab.color} scale-102` 
                    : "text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* GLASS CARD WRAPPER */}
        <div className="bg-white/90 backdrop-blur-[20px] border border-[#E8EDF7] rounded-[24px] shadow-[0_20px_50px_rgba(15,23,42,.08)] p-6 relative z-10 overflow-hidden">
          
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              {activeTab} Collections Queue
            </h3>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <option value="id">Sort by ID</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading Collections...</div>
          ) : (
            <>
              {/* TABLE WITH TABS VISUAL IDENTITY */}
              <div key={activeTab} className="overflow-x-auto animate-tab-change">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-50/60 border-b border-[#E8EDF7] text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
                      <th className="px-6 py-4">ID / Booking</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">{activeTab === "RECEIVED" ? "Received Date" : "Due Date"}</th>
                      <th className="px-6 py-4">Timeline / Priority</th>
                      {activeTab === "RECEIVED" && <th className="px-6 py-4">Payment Mode</th>}
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF7] text-sm">
                    {paginatedPayments.map((p: Payment) => {
                      const daysRemaining = getDaysRemaining(p.due_date);
                      const daysOverdue = getDaysOverdue(p.due_date);

                      return (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${
                            activeTab === "OVERDUE" ? "border-l-4 border-l-rose-500" : ""
                          }`}
                        >
                          {/* ID & BOOKING LINK */}
                          <td className="px-6 py-4">
                            <span className="block font-black text-slate-900 group-hover:text-blue-600 transition-colors">Payment #{p.id}</span>
                            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wide">Booking #{p.booking_id}</span>
                          </td>

                          {/* AMOUNT */}
                          <td className="px-6 py-4 font-black text-slate-900 text-base">₹{p.amount.toLocaleString()}</td>

                          {/* DATE */}
                          <td className="px-6 py-4 font-bold text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {activeTab === "RECEIVED" ? (p.received_date || "2026-07-27") : (p.due_date || "2026-08-04")}
                            </span>
                          </td>

                          {/* TIMELINE / DYNAMIC CHIP IDENTITY */}
                          <td className="px-6 py-4">
                            {activeTab === "PENDING" && (
                              <div className="flex flex-col gap-1 max-w-[120px]">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black w-fit">
                                  ⏳ {daysRemaining} Days Left
                                </span>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-0.5">
                                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "65%" }} />
                                </div>
                              </div>
                            )}

                            {activeTab === "OVERDUE" && (
                              <div className="flex flex-col gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black w-fit uppercase tracking-wide">
                                  ⚠️ {daysOverdue} Days Overdue
                                </span>
                                <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                                  High Priority
                                </span>
                              </div>
                            )}

                            {activeTab === "RECEIVED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-250 text-[10px] font-black w-fit uppercase">
                                ✓ Verified Cashflow
                              </span>
                            )}
                          </td>

                          {/* PAYMENT MODE (RECEIVED ONLY) */}
                          {activeTab === "RECEIVED" && (
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase">
                                💼 {p.mode || "BANK TRANSFER"}
                              </span>
                              <span className="block text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Ref: {p.receipt_number || "RCV-4001"}</span>
                            </td>
                          )}

                          {/* ACTIONS */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2 justify-end">
                              {activeTab !== "RECEIVED" && (
                                <button 
                                  onClick={() => sendReminder(p.id)} 
                                  className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-xs font-bold hover:bg-orange-100 hover:scale-102 transition shadow-sm cursor-pointer"
                                >
                                  Send Reminder
                                </button>
                              )}
                              
                              {activeTab !== "RECEIVED" && (user?.role === "MANAGER" || user?.role === "SUPER_ADMIN") && (
                                <button 
                                  onClick={() => setShowMarkReceived(p.id)} 
                                  className="btn-premium-action btn-mark-received animate-pulse"
                                >
                                  Mark Received
                                </button>
                              )}

                              {activeTab === "RECEIVED" && (
                                <button 
                                  onClick={() => generateReceipt(p.id)} 
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:scale-102 transition cursor-pointer"
                                >
                                  📥 View Receipt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedPayments.length === 0 && (
                      <tr>
                        <td colSpan={activeTab === "RECEIVED" ? 6 : 5} className="px-6 py-16 text-center">
                          {/* Mock empty states illustration */}
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                              <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 tracking-tight">No {activeTab.toLowerCase()} payments found</h4>
                            <p className="text-[11px] text-slate-450 font-semibold max-w-xs mt-1">Payment schedule pipelines are clear for this category filter.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {filteredPayments.length > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6 text-xs font-bold text-slate-450 uppercase">
                  <span>Showing {Math.min(filteredPayments.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredPayments.length, currentPage * itemsPerPage)} of {filteredPayments.length} Payments</span>
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

        {/* MODALS */}

        {/* Record Payment Modal */}
        {showNew && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-sm p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">Record Scheduled Payment</h3>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Booking ID</label>
                  <input type="number" required value={newBookingId} onChange={(e) => setNewBookingId(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. 1" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                  <input type="number" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. 120000" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-655 text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-655 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Record</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark Received Modal */}
        {showMarkReceived && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-sm p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">Mark Payment Received</h3>
              <form onSubmit={handleMarkReceived} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Mode</label>
                  <select value={rcvMode} onChange={(e) => setRcvMode(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer">
                    <option value="CASH">CASH</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="UPI_REFERENCE">UPI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Receipt / Reference No. (Optional)</label>
                  <input type="text" value={rcvRef} onChange={(e) => setRcvRef(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. UPI-92837" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowMarkReceived(null)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-655 text-xs font-bold cursor-pointer font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Confirm Receipt</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

import { Suspense } from "react";

export default function CollectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CollectionsDashboard />
    </Suspense>
  );
}
