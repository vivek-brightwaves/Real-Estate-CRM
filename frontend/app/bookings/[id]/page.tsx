"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import PageHeader from "../../../components/ui/PageHeader";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchBooking();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, params.id, router]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/${params.id}`);
      setBooking(res.data);
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

  const handleStatusUpdate = async (action: string) => {
    try {
      await api.patch(`/bookings/${params.id}/${action}`);
      alert(`Booking successfully marked as ${action.toUpperCase()}`);
      fetchBooking();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Action failed"));
    }
  };

  const handleRequestDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/bookings/${params.id}/request-discount`, {
        amount: Number(discountAmount)
      });
      alert("Discount requested successfully!");
      setShowDiscount(false);
      setDiscountAmount("");
      fetchBooking();
    } catch (err: any) {
      alert("Error requesting discount: " + err.response?.data?.detail);
    }
  };

  const handleApproveDiscount = async (discountId: number) => {
    try {
      await api.patch(`/bookings/discount-approvals/${discountId}/approve`);
      alert("Discount approved!");
      fetchBooking();
    } catch (err: any) {
      alert("Error approving discount: " + err.response?.data?.detail);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading booking details...</div>;
  if (!booking) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Booking not found.</div>;
  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        <PageHeader
          breadcrumb="Dashboard / Bookings / Details"
          title="Booking Profile"
          subtitle={`View and update detailed pipeline status for Booking #${booking.id}`}
          actions={
            <button 
              onClick={() => router.back()}
              className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-sm"
            >
              &larr; Back to Pipeline
            </button>
          }
        />
        
        <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-8 backdrop-blur-md bg-white/95">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">Booking #{booking.id}</h2>
              <p className="text-xs text-slate-450 font-semibold">Created by Agent ID #{booking.created_by_id}</p>
            </div>
            <span className="px-3.5 py-1 bg-blue-50 border border-blue-100 text-blue-750 rounded-full font-bold text-xs uppercase tracking-wider">
              {booking.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50/50 p-6 rounded-xl border border-[#E8EDF7] shadow-inner">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer Details</h3>
              <p className="text-base font-black text-slate-800">Customer ID: #{booking.customer_id}</p>
              <button 
                onClick={() => router.push(`/customers/${booking.customer_id}`)} 
                className="text-blue-600 text-xs font-bold hover:text-blue-700 mt-2 inline-block transition-colors cursor-pointer"
              >
                View Customer Profile &rarr;
              </button>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-xl border border-[#E8EDF7] shadow-inner">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Details</h3>
              <p className="text-base font-black text-slate-800">Unit ID: #{booking.unit_id}</p>
            </div>
          </div>

          {/* Discounts Section */}
          <div className="mb-8 p-6 rounded-xl bg-purple-50/30 border border-purple-100/60 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-purple-900 text-sm">Discount Requests</h3>
              {booking.status === "PENDING" && (
                <button 
                  onClick={() => setShowDiscount(true)} 
                  className="bg-gradient-to-r from-purple-500 to-violet-650 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer"
                >
                  Request Discount
                </button>
              )}
            </div>
            
            {booking.discounts.length > 0 ? (
              <div className="space-y-3">
                {booking.discounts.map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E8EDF7] shadow-sm">
                    <div>
                      <p className="text-xs font-black text-slate-900">₹{d.amount}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Requested by Agent #{d.requested_by_id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        d.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {d.status}
                      </span>
                      {d.status === 'PENDING' && user?.role === 'SUPER_ADMIN' && (
                        <button 
                          onClick={() => handleApproveDiscount(d.id)} 
                          className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-650 text-white font-bold px-2.5 py-1 rounded-lg hover:opacity-95 shadow cursor-pointer transition-all"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-700/70 font-semibold">No discounts requested for this booking.</p>
            )}
          </div>

          {/* Workflow Action Buttons based on Role & Status */}
          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-6">
            {(user?.role === "MANAGER" || user?.role === "SUPER_ADMIN") && (
              <>
                {booking.status === "PENDING" && (
                  <button 
                    onClick={() => handleStatusUpdate('verify-documents')} 
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    Verify Documents
                  </button>
                )}
                {booking.status === "DOCS_VERIFIED" && (
                  <button 
                    onClick={() => handleStatusUpdate('approve')} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-650 text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    Approve Booking
                  </button>
                )}
                {booking.status === "APPROVED" && (
                  <button 
                    onClick={() => handleStatusUpdate('confirm')} 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-650 text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    Confirm Booking (Verify Payments)
                  </button>
                )}
              </>
            )}
            
            {user?.role === "SUPER_ADMIN" && booking.status !== "CANCELLED" && booking.status !== "CONFIRMED" && (
              <button 
                onClick={() => handleStatusUpdate('cancel')} 
                className="flex-1 bg-gradient-to-r from-rose-500 to-red-650 text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-rose-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
        {/* Discount Modal */}
        {showDiscount && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-sm p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowDiscount(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Request Discount</h3>
              <form onSubmit={handleRequestDiscount} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Amount (₹)</label>
                  <input 
                    type="number" required min="1"
                    value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowDiscount(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
