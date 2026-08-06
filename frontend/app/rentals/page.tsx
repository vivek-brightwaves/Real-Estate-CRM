"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import { useFeedback } from "../../components/ui/FeedbackProvider";

interface Lease {
  id: number;
  unit_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number;
  status: "ACTIVE" | "TERMINATED" | "EXPIRED" | "DRAFT";
  created_at: string;
}

interface Invoice {
  id: number;
  lease_id: number;
  amount: number;
  due_date: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  paid_at: string | null;
  created_at: string;
}

export default function RentalsPage() {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();
  const { notify } = useFeedback();

  // Navigation / notifications sync
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // State Management
  const [leases, setLeases] = useState<Lease[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"leases" | "invoices">("leases");

  // Filters & Search
  const [searchLease, setSearchLease] = useState("");
  const [statusFilterLease, setStatusFilterLease] = useState<string>("ALL");
  const [statusFilterInvoice, setStatusFilterInvoice] = useState<string>("ALL");

  // Pagination
  const [currentPageLeases, setCurrentPageLeases] = useState(1);
  const [currentPageInvoices, setCurrentPageInvoices] = useState(1);
  const itemsPerPage = 8;

  // Modals & Portal Coordinates
  const [showNewLeaseModal, setShowNewLeaseModal] = useState(false);
  const [activeMenuLeaseId, setActiveMenuLeaseId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // New Lease Form state
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [savingLease, setSavingLease] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router]);

  // Dropdown Auto-Close Window Listeners
  useEffect(() => {
    const handleScrollOrClick = () => {
      setActiveMenuLeaseId(null);
    };
    if (activeMenuLeaseId) {
      window.addEventListener("scroll", handleScrollOrClick, true);
      window.addEventListener("click", handleScrollOrClick, true);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrClick, true);
      window.removeEventListener("click", handleScrollOrClick, true);
    };
  }, [activeMenuLeaseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leasesRes, invoicesRes] = await Promise.all([
        api.get("/rentals/leases?size=100"),
        api.get("/rentals/invoices?size=100")
      ]);
      setLeases(leasesRes.data);
      setInvoices(invoicesRes.data);
    } catch (err: any) {
      notify({
        title: "Error fetching data",
        message: err.response?.data?.detail || "Could not retrieve rentals data.",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications?limit=5");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Notifications fetch failed", err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  // Open Lease Status Options Dropdown
  const handleOpenMenu = (event: React.MouseEvent, leaseId: number) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.right + window.scrollX - 160; // Align with w-40 width
    setMenuPosition({ top, left });
    setActiveMenuLeaseId(activeMenuLeaseId === leaseId ? null : leaseId);
  };

  // PATCH lease status change
  const handleUpdateStatus = async (leaseId: number, nextStatus: string) => {
    try {
      await api.patch(`/rentals/leases/${leaseId}/status`, { status: nextStatus });
      notify({
        title: "Status updated",
        message: `Lease #${leaseId} is now ${nextStatus}.`,
        tone: "success"
      });
      fetchData();
    } catch (err: any) {
      notify({
        title: "Update failed",
        message: err.response?.data?.detail || "Could not modify lease status.",
        tone: "error"
      });
    }
  };

  // PATCH mark rental invoice paid
  const handleMarkPaid = async (invoiceId: number) => {
    try {
      await api.patch(`/rentals/invoices/${invoiceId}/mark-paid`, {
        paid_at: new Date().toISOString()
      });
      notify({
        title: "Invoice recorded paid",
        message: `Invoice #${invoiceId} has been successfully settled.`,
        tone: "success"
      });
      fetchData();
    } catch (err: any) {
      notify({
        title: "Transaction failed",
        message: err.response?.data?.detail || "Could not mark invoice as paid.",
        tone: "error"
      });
    }
  };

  // POST create new lease agreement
  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLease(true);
    try {
      await api.post("/rentals/leases", {
        tenant_name: tenantName,
        tenant_email: tenantEmail || null,
        tenant_phone: tenantPhone,
        unit_id: parseInt(unitId),
        start_date: startDate,
        end_date: endDate,
        rent_amount: parseFloat(rentAmount),
        security_deposit: parseFloat(securityDeposit)
      });
      notify({
        title: "Lease created successfully",
        message: `New lease has been registered for Tenant ${tenantName}.`,
        tone: "success"
      });
      setShowNewLeaseModal(false);
      // Reset form fields
      setTenantName("");
      setTenantEmail("");
      setTenantPhone("");
      setUnitId("");
      setStartDate("");
      setEndDate("");
      setRentAmount("");
      setSecurityDeposit("");
      fetchData();
    } catch (err: any) {
      notify({
        title: "Creation failed",
        message: err.response?.data?.detail || "Please double-check form inputs.",
        tone: "error"
      });
    } finally {
      setSavingLease(false);
    }
  };

  // Filters & searches computations
  const filteredLeases = leases.filter((l) => {
    const matchesSearch = l.id.toString().includes(searchLease) || (l.tenant_id.toString().includes(searchLease));
    const matchesStatus = statusFilterLease === "ALL" || l.status === statusFilterLease;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter((i) => {
    return statusFilterInvoice === "ALL" || i.status === statusFilterInvoice;
  });

  // Client pagination
  const totalPagesLeases = Math.ceil(filteredLeases.length / itemsPerPage);
  const totalPagesInvoices = Math.ceil(filteredInvoices.length / itemsPerPage);

  const paginatedLeases = filteredLeases.slice(
    (currentPageLeases - 1) * itemsPerPage,
    currentPageLeases * itemsPerPage
  );

  const paginatedInvoices = filteredInvoices.slice(
    (currentPageInvoices - 1) * itemsPerPage,
    currentPageInvoices * itemsPerPage
  );

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={handleMarkRead}
      onLogout={handleLogout}
    >
      <div className="flex-1 overflow-y-auto p-8 scrollbar-premium-dark">
        <PageHeader 
          title="Rentals and Leases Management" 
          subtitle="Register leases, schedule monthly billing cycles, and track invoice collections"
        />

        {/* TABS SELECTOR */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] mb-6">
          <button
            onClick={() => setActiveTab("leases")}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 ${
              activeTab === "leases"
                ? "border-blue-600 text-blue-600 dark:text-blue-455 dark:border-blue-455"
                : "border-transparent text-slate-455 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Lease Agreements
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 ${
              activeTab === "invoices"
                ? "border-blue-600 text-blue-600 dark:text-blue-455 dark:border-blue-455"
                : "border-transparent text-slate-455 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Rental Invoices
          </button>
        </div>

        {/* TAB CONTENT: LEASES */}
        {activeTab === "leases" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-1 gap-3 w-full sm:max-w-md">
                <input
                  type="text"
                  placeholder="Search by ID..."
                  value={searchLease}
                  onChange={(e) => setSearchLease(e.target.value)}
                  className="w-full h-11 px-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12 transition-all duration-200 shadow-sm"
                />
                <select
                  value={statusFilterLease}
                  onChange={(e) => {
                    setStatusFilterLease(e.target.value);
                    setCurrentPageLeases(1);
                  }}
                  className="h-11 px-3 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
              <button
                onClick={() => setShowNewLeaseModal(true)}
                className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition"
              >
                <span>+ New Lease</span>
              </button>
            </div>

            {/* Leases Table */}
            <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] font-semibold text-xs bg-white dark:bg-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-sm">Loading lease files...</div>
              ) : (
                <>
                  <div className="overflow-x-auto md:overflow-x-visible scrollbar-premium-dark">
                    <table className="w-full min-w-[800px] md:min-w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                          <th className="w-[10%] px-5 py-3.5">Lease ID</th>
                          <th className="w-[15%] px-5 py-3.5">Unit ID</th>
                          <th className="w-[15%] px-5 py-3.5">Tenant ID</th>
                          <th className="w-[14%] px-5 py-3.5">Rent</th>
                          <th className="w-[14%] px-5 py-3.5">Deposit</th>
                          <th className="w-[13%] px-5 py-3.5">Start Date</th>
                          <th className="w-[13%] px-5 py-3.5">End Date</th>
                          <th className="w-[10%] px-5 py-3.5">Status</th>
                          <th className="w-[6%] min-w-[110px] px-5 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                        {paginatedLeases.map((l) => (
                          <tr
                            key={l.id}
                            className="hover:bg-slate-50/40 dark:hover:bg-white/[0.03] transition-all duration-200 group"
                          >
                            <td className="px-5 py-[18px] align-middle font-bold text-slate-900 dark:text-white">Lease #{l.id}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-700 dark:text-white">Unit #{l.unit_id}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-700 dark:text-white">Tenant #{l.tenant_id}</td>
                            <td className="px-5 py-[18px] align-middle font-bold text-emerald-600 dark:text-emerald-455">${l.rent_amount}</td>
                            <td className="px-5 py-[18px] align-middle font-bold text-slate-700 dark:text-white">${l.security_deposit}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-500 dark:text-[#CBD5E1]">{new Date(l.start_date).toLocaleDateString()}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-500 dark:text-[#CBD5E1]">{new Date(l.end_date).toLocaleDateString()}</td>
                            <td className="px-5 py-[18px] align-middle">
                              <span className={`px-4 py-1 rounded-full text-xs font-bold border ${
                                l.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/30"
                                  : l.status === "DRAFT"
                                  ? "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/30"
                                  : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30"
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-5 py-[18px] align-middle text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleOpenMenu(e, l.id)}
                                className="w-[84px] py-1 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold rounded-lg transition shadow-sm cursor-pointer mx-auto block"
                              >
                                Options
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredLeases.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-5 py-12 text-center text-slate-500 dark:text-[#94A3B8] font-medium">
                              No lease records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Leases Pagination */}
                  {filteredLeases.length > 0 && (
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-4 mt-4 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                      <span>Showing {Math.min(filteredLeases.length, (currentPageLeases - 1) * itemsPerPage + 1)} to {Math.min(filteredLeases.length, currentPageLeases * itemsPerPage)} of {filteredLeases.length} Leases</span>
                      <div className="flex gap-2">
                        <button
                          disabled={currentPageLeases === 1}
                          onClick={() => setCurrentPageLeases((prev) => Math.max(prev - 1, 1))}
                          className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-[#CBD5E1] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPageLeases === totalPagesLeases}
                          onClick={() => setCurrentPageLeases((prev) => Math.min(prev + 1, totalPagesLeases))}
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
          </div>
        )}

        {/* TAB CONTENT: INVOICES */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex gap-4">
              <select
                value={statusFilterInvoice}
                onChange={(e) => {
                  setStatusFilterInvoice(e.target.value);
                  setCurrentPageInvoices(1);
                }}
                className="h-11 px-3 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] font-semibold text-xs bg-white dark:bg-[#0F172A] rounded-[20px] border border-[#E8EDF7] dark:border-border shadow-sm">Loading billing invoices...</div>
              ) : (
                <>
                  <div className="overflow-x-auto md:overflow-x-visible scrollbar-premium-dark">
                    <table className="w-full min-w-[800px] md:min-w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                          <th className="w-[10%] px-5 py-3.5">Invoice ID</th>
                          <th className="w-[15%] px-5 py-3.5">Lease ID</th>
                          <th className="w-[15%] px-5 py-3.5">Amount</th>
                          <th className="w-[15%] px-5 py-3.5">Due Date</th>
                          <th className="w-[15%] px-5 py-3.5">Status</th>
                          <th className="w-[18%] px-5 py-3.5">Settled Date</th>
                          <th className="w-[12%] px-5 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                        {paginatedInvoices.map((i) => (
                          <tr
                            key={i.id}
                            className="hover:bg-slate-50/40 dark:hover:bg-white/[0.03] transition-all duration-200"
                          >
                            <td className="px-5 py-[18px] align-middle font-bold text-slate-900 dark:text-white">Inv #{i.id}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-700 dark:text-white">Lease #{i.lease_id}</td>
                            <td className="px-5 py-[18px] align-middle font-bold text-emerald-600 dark:text-emerald-455">${i.amount}</td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-500 dark:text-[#CBD5E1]">{new Date(i.due_date).toLocaleDateString()}</td>
                            <td className="px-5 py-[18px] align-middle">
                              <span className={`px-4 py-1 rounded-full text-xs font-bold border ${
                                i.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/30"
                                  : i.status === "PENDING"
                                  ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30"
                                  : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30"
                              }`}>
                                {i.status}
                              </span>
                            </td>
                            <td className="px-5 py-[18px] align-middle font-semibold text-slate-550 dark:text-slate-400">
                              {i.paid_at ? new Date(i.paid_at).toLocaleString() : "—"}
                            </td>
                            <td className="px-5 py-[18px] align-middle text-center">
                              {i.status !== "PAID" ? (
                                <button
                                  onClick={() => handleMarkPaid(i.id)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">Settled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredInvoices.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-[#94A3B8] font-medium">
                              No invoices matches this filter state.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoices Pagination */}
                  {filteredInvoices.length > 0 && (
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-4 mt-4 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                      <span>Showing {Math.min(filteredInvoices.length, (currentPageInvoices - 1) * itemsPerPage + 1)} to {Math.min(filteredInvoices.length, currentPageInvoices * itemsPerPage)} of {filteredInvoices.length} Invoices</span>
                      <div className="flex gap-2">
                        <button
                          disabled={currentPageInvoices === 1}
                          onClick={() => setCurrentPageInvoices((prev) => Math.max(prev - 1, 1))}
                          className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-[#CBD5E1] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPageInvoices === totalPagesInvoices}
                          onClick={() => setCurrentPageInvoices((prev) => Math.min(prev + 1, totalPagesInvoices))}
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
          </div>
        )}

        {/* MODAL: CREATE LEASE */}
        {showNewLeaseModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowNewLeaseModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">New Lease Agreement</h3>
              
              <form onSubmit={handleCreateLease} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Tenant Name</label>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                      placeholder="Tenant Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Tenant Phone</label>
                    <input
                      type="text"
                      required
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Tenant Email (Optional)</label>
                  <input
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                    placeholder="name@domain.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Unit ID</label>
                    <input
                      type="number"
                      required
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Rent Amount</label>
                    <input
                      type="number"
                      required
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                      placeholder="Monthly Rent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-1.5">Security Deposit</label>
                  <input
                    type="number"
                    required
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full h-11 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition duration-200 shadow-sm"
                    placeholder="Deposit Amount"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewLeaseModal(false)}
                    className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingLease}
                    className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {savingLease ? "Saving..." : "Create Lease"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OPTIONS POPUP PORTAL: LEASE STATUS */}
        {mounted && activeMenuLeaseId && menuPosition && createPortal(
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
            <button
              onClick={() => handleUpdateStatus(activeMenuLeaseId, "ACTIVE")}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer"
            >
              Set Active
            </button>
            <button
              onClick={() => handleUpdateStatus(activeMenuLeaseId, "TERMINATED")}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer"
            >
              Terminate Lease
            </button>
            <button
              onClick={() => handleUpdateStatus(activeMenuLeaseId, "EXPIRED")}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] cursor-pointer"
            >
              Mark Expired
            </button>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}
