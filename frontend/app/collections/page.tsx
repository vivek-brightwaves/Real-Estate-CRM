"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatsCard from "../../components/dashboard/StatsCard";
import { useFeedback } from "../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../hooks/useSectionSearch";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

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
  const { notify } = useFeedback();
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
  useSectionSearch("payments", setSearchTerm);
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
  const [paymentAction, setPaymentAction] = useState<{
    id: number;
    type: "reminder" | "received" | "receipt";
  } | null>(null);

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
      notify({
        title: "Payment scheduled",
        message: "The payment record was saved in MySQL.",
      });
      setShowNew(false);
      setNewBookingId("");
      setNewAmount("");
      setNewDueDate("");
      fetchPayments();
    } catch (err: any) {
      notify({
        title: "Unable to schedule payment",
        message: err.response?.data?.detail || "Please check the booking and amount.",
        tone: "error",
      });
    }
  };

  const handleMarkReceived = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMarkReceived) return;
    setPaymentAction({ id: showMarkReceived, type: "received" });
    try {
      await api.patch(`/payments/${showMarkReceived}/mark-received`, {
        mode: rcvMode,
        receipt_number: rcvRef || null
      });
      notify({
        title: "Payment marked received",
        message: "The status, payment mode, receipt reference, and received date were saved. The booking owner was notified.",
      });
      setShowMarkReceived(null);
      setRcvRef("");
      fetchPayments();
    } catch (err: any) {
      notify({
        title: "Unable to mark payment received",
        message: err.response?.data?.detail || "Please try again.",
        tone: "error",
      });
    } finally {
      setPaymentAction(null);
    }
  };

  const generateReceipt = async (paymentId: number) => {
    setPaymentAction({ id: paymentId, type: "receipt" });
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
      notify({
        title: "Receipt generation failed",
        message: detail || err.message || "Unknown error",
        tone: "error",
      });
    } finally {
      setPaymentAction(null);
    }
  };

  const sendReminder = async (paymentId: number) => {
    setPaymentAction({ id: paymentId, type: "reminder" });
    try {
      const res = await api.post(`/payments/${paymentId}/reminder`);
      notify({
        title: "Payment reminder created",
        message: `${res.data.message} Contact: ${res.data.customer_contact || "not available"}. Delivery status: ${res.data.delivery_status}.`,
      });
    } catch (err: any) {
      notify({
        title: "Unable to create reminder",
        message: err.response?.data?.detail || "Please try again.",
        tone: "error",
      });
    } finally {
      setPaymentAction(null);
    }
  };

  const statusSeries = (status: Payment["status"]) => {
    const values = payments
      .filter((payment) => payment.status === status)
      .slice(-6)
      .map((payment) => ({ value: payment.amount }));
    return values.length ? values : [{ value: 0 }];
  };

  const sparkData = {
    pending: statusSeries("PENDING"),
    overdue: statusSeries("OVERDUE"),
    received: statusSeries("RECEIVED"),
  };

  // Calculated Days Overdue & Due Countdown
  const getDaysOverdue = (dateStr?: string) => {
    if (!dateStr) return 0;
    const due = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return 0;
    const due = new Date(dateStr);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
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
      pending: pendingSum,
      overdue: overdueSum,
      received: receivedSum,
      count: payments.length
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

  const exportPayments = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Payment ID", "Booking ID", "Amount", "Status", "Due Date", "Receipt"],
      ...sortedPayments.map((payment) => [
        payment.id,
        payment.booking_id,
        payment.amount,
        payment.status,
        payment.due_date,
        payment.receipt_number,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${activeTab.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="space-y-8 bg-gradient-to-br from-[#F8FAFF] via-[#EEF5FF] to-[#F7FAFC] dark:from-transparent dark:to-transparent min-h-[calc(100vh-120px)] p-1 rounded-3xl relative overflow-hidden">
        
        {/* Abstract fintech background meshes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.04),transparent_70%)] pointer-events-none" />

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2 border-b border-slate-200/50 dark:border-border/50 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="text-2xl">💳</span> Payment Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">Manage and record collection schedules and receipt generation.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:w-auto shrink-0">
            <input 
              type="text" 
              placeholder="Search ID / Booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full sm:w-60 px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button 
              onClick={exportPayments}
              className="h-12 px-4 py-2.5 bg-slate-50 dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#273449] rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center shrink-0"
            >
              Export
            </button>
            <button 
              onClick={() => setShowNew(true)} 
              className="h-12 px-5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-90 active:scale-95 transition-all text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center justify-center shrink-0 cursor-pointer"
            >
              + Record Payment
            </button>
          </div>
        </div>

        {/* METRICS STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* Card 1 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest">Pending Collections</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">₹{(stats.pending / 100000).toFixed(1)} L</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-orange-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30">↑ 6.2%</span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.pending}>
                  <defs>
                    <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#pendingGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest">Overdue Collections</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">₹{(stats.overdue / 100000).toFixed(1)} L</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-red-550 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455 border-rose-100/60 dark:border-rose-900/30">↓ 12.5%</span>
              <span className="text-[9px] text-slate-455 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.overdue}>
                  <defs>
                    <linearGradient id="overdueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#overdueGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest">Total Received</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">₹4.8 Cr</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-emerald-505 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30">↑ 18.1%</span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.received}>
                  <defs>
                    <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#receivedGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[22px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-[22px]" />
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest">Active Schedules</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-0.5">{stats.count}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] text-blue-500 border border-slate-100 dark:border-border shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30">↑ 5.4%</span>
              <span className="text-[9px] text-slate-455 dark:text-slate-500 font-bold uppercase">MoM Change</span>
            </div>
            <div className="w-full h-10 mt-3 overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.pending}>
                  <defs>
                    <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#activeGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* TABS CONTROLLER */}
        <div className="flex gap-2.5 bg-slate-100/80 dark:bg-[#0F172A] p-1.5 border border-[#E8EDF7] dark:border-[#334155] rounded-2xl w-fit relative z-10 backdrop-blur-md">
          {[
            { id: "PENDING", label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-100 dark:bg-blue-600 dark:border-blue-500 dark:text-white" },
            { id: "OVERDUE", label: "Overdue", color: "text-rose-700 bg-rose-50 border-rose-100 dark:bg-blue-600 dark:border-blue-500 dark:text-white" },
            { id: "RECEIVED", label: "Received", color: "text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-blue-600 dark:border-blue-500 dark:text-white" }
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
                    : "text-slate-505 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-white border-transparent hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* GLASS CARD WRAPPER */}
        <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 relative z-10 overflow-hidden">
          
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100 dark:border-border">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              {activeTab} Collections Queue
            </h3>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <option value="id">Sort by ID</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] font-semibold text-xs bg-white dark:bg-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-sm">Loading Collections...</div>
          ) : (
            <>
              {/* TABLE WITH TABS VISUAL IDENTITY */}
              <div key={activeTab} className="overflow-x-auto animate-tab-change">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                      <th className="px-6 py-4">ID / Booking</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">{activeTab === "RECEIVED" ? "Received Date" : "Due Date"}</th>
                      <th className="px-6 py-4">Timeline / Priority</th>
                      {activeTab === "RECEIVED" && <th className="px-6 py-4">Payment Mode</th>}
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                    {paginatedPayments.map((p: Payment) => {
                      const daysRemaining = getDaysRemaining(p.due_date);
                      const daysOverdue = getDaysOverdue(p.due_date);

                      return (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-slate-50/60 dark:hover:bg-[#273449] transition-colors group cursor-pointer ${
                            activeTab === "OVERDUE" ? "border-l-4 border-l-rose-500" : ""
                          }`}
                        >
                          {/* ID & BOOKING LINK */}
                          <td className="px-6 py-4">
                            <span className="block font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-455 transition-colors">Payment #{p.id}</span>
                            <span className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-bold uppercase tracking-wide">Booking #{p.booking_id}</span>
                          </td>

                          {/* AMOUNT */}
                          <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-base">₹{p.amount.toLocaleString()}</td>

                          {/* DATE */}
                          <td className="px-6 py-4 font-bold text-slate-600 dark:text-[#CBD5E1]">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {activeTab === "RECEIVED"
                                ? (p.received_date || "Not recorded")
                                : (p.due_date || "Not set")}
                            </span>
                          </td>

                          {/* TIMELINE / DYNAMIC CHIP IDENTITY */}
                          <td className="px-6 py-4">
                            {activeTab === "PENDING" && (
                              <div className="flex flex-col gap-1 max-w-[120px]">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 text-[10px] font-black w-fit">
                                  ⏳ {daysRemaining} Days Left
                                </span>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "65%" }} />
                                </div>
                              </div>
                            )}

                            {activeTab === "OVERDUE" && (
                              <div className="flex flex-col gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-455 border border-rose-255 dark:border-rose-900/30 text-[10px] font-black w-fit uppercase tracking-wide">
                                  ⚠️ {daysOverdue} Days Overdue
                                </span>
                                <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                                  High Priority
                                </span>
                              </div>
                            )}

                            {activeTab === "RECEIVED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/30 text-[10px] font-black w-fit uppercase">
                                ✓ Verified Cashflow
                              </span>
                            )}
                          </td>

                          {/* PAYMENT MODE (RECEIVED ONLY) */}
                          {activeTab === "RECEIVED" && (
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#334155] text-[10px] font-black uppercase">
                                💼 {p.mode || "Not recorded"}
                              </span>
                              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wide">Ref: {p.receipt_number || "Not recorded"}</span>
                            </td>
                          )}

                          {/* ACTIONS */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2 justify-end">
                              {activeTab !== "RECEIVED" && (
                                <button 
                                  onClick={() => sendReminder(p.id)} 
                                  disabled={paymentAction?.id === p.id}
                                  className="px-3 py-1.5 bg-orange-50 dark:bg-orange-955/20 border border-orange-200 dark:border-orange-900/30 rounded-lg text-orange-700 dark:text-orange-400 text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:scale-102 transition shadow-sm cursor-pointer"
                                >
                                  {paymentAction?.id === p.id && paymentAction.type === "reminder"
                                    ? "Recording..."
                                    : "Send Reminder"}
                                </button>
                              )}
                              
                              {activeTab !== "RECEIVED" && ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user?.role ?? "") && (
                                <button 
                                  onClick={() => setShowMarkReceived(p.id)} 
                                  disabled={paymentAction?.id === p.id}
                                  className="btn-premium-action btn-mark-received px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow hover:bg-blue-750 transition cursor-pointer"
                                >
                                  Mark Received
                                </button>
                              )}

                              {activeTab === "RECEIVED" && (
                                <button 
                                  onClick={() => generateReceipt(p.id)} 
                                  disabled={paymentAction?.id === p.id}
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
                          <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0F172A] rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] max-w-lg mx-auto my-6 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-blue-955/20 border border-blue-900/30 flex items-center justify-center text-blue-400 mb-4 shadow-sm shadow-blue-500/5">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">No {activeTab.toLowerCase()} payments found</h4>
                            <p className="text-xs text-[#94A3B8] max-w-sm mb-5 font-medium">Payment schedule pipelines are clear for this category filter.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {filteredPayments.length > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-6 mt-6 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                  <span>Showing {Math.min(filteredPayments.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredPayments.length, currentPage * itemsPerPage)} of {filteredPayments.length} Payments</span>
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

        {/* MODALS */}

        {/* Record Payment Modal */}
        {showNew && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 dark:from-[#111827] dark:via-[#111827] dark:to-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-2xl w-full max-w-sm p-6 relative overflow-hidden backdrop-blur-md bg-white/98 dark:bg-[#111827]/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 dark:text-white border-b border-slate-100 dark:border-border pb-2">Record Scheduled Payment</h3>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest mb-1.5">Booking ID</label>
                  <input type="number" required value={newBookingId} onChange={(e) => setNewBookingId(e.target.value)} className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. 1" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest mb-1.5">Amount (₹)</label>
                  <input type="number" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. 120000" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest mb-1.5">Due Date</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-border">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-655 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Record</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark Received Modal */}
        {showMarkReceived && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 dark:from-[#111827] dark:via-[#111827] dark:to-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-2xl w-full max-w-sm p-6 relative overflow-hidden backdrop-blur-md bg-white/98 dark:bg-[#111827]/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 dark:text-white border-b border-slate-100 dark:border-border pb-2">Mark Payment Received</h3>
              <form onSubmit={handleMarkReceived} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest mb-1.5">Payment Mode</label>
                  <select value={rcvMode} onChange={(e) => setRcvMode(e.target.value)} className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer">
                    <option value="CASH">CASH</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="UPI_REFERENCE">UPI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-[#94A3B8] uppercase tracking-widest mb-1.5">Receipt / Reference No. (Optional)</label>
                  <input type="text" value={rcvRef} onChange={(e) => setRcvRef(e.target.value)} className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" placeholder="e.g. UPI-92837" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-border">
                  <button type="button" onClick={() => setShowMarkReceived(null)} className="px-4 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-655 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                  <button
                    type="submit"
                    disabled={paymentAction?.type === "received"}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentAction?.type === "received" ? "Saving..." : "Confirm Receipt"}
                  </button>
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CollectionsDashboard />
    </Suspense>
  );
}
