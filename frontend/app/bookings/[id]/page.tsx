"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";

export default function BookingDetailPage({ params }: { params: { id: string } }) {
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Booking Profiles</h2>
            <p className="text-xs text-slate-500 mt-0.5">View and update detailed pipeline status for Booking #{booking.id}</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-sm"
          >
            &larr; Back to Pipeline
          </button>
        </div>
        
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-sm p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">Request Discount</h3>
              <form onSubmit={handleRequestDiscount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                  <input 
                    type="number" required min="1"
                    value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowDiscount(false)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
