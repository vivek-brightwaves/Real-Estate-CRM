"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchBooking();
  }, [params.id]);

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

  const handleStatusUpdate = async (action: string) => {
    if (['verify-documents', 'approve', 'confirm'].includes(action) && !booking.has_verified_kyc) {
      alert("Cannot proceed: Customer KYC documents are missing or unverified.");
      return;
    }
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${params.id}/${action}`);
      await fetchBooking();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Action failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    try {
      // Calls /request-discount which matches the backend alias route
      await api.post(`/bookings/${params.id}/request-discount`, {
        amount: Number(discountAmount)
      });
      alert("Discount requested successfully!");
      setShowDiscount(false);
      setDiscountAmount("");
      await fetchBooking();
    } catch (err: any) {
      alert("Error requesting discount: " + (err.response?.data?.detail || "Failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDiscount = async (discountId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      // Approvals are managed via the system/approvals endpoint
      await api.patch(`/system/approvals/${discountId}/approve`);
      alert("Discount approved!");
      await fetchBooking();
    } catch (err: any) {
      alert("Error approving discount: " + (err.response?.data?.detail || "Failed"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!booking) return <div className="p-8">Booking not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <div className="max-w-4xl w-full flex flex-col gap-8">
        
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 self-start">← Back to Pipeline</button>
        
        <div className="bg-white p-8 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Booking #{booking.id}</h2>
              <p className="text-gray-500 mt-1">Created by User ID {booking.created_by_id}</p>
            </div>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded font-bold text-lg tracking-wide shadow-sm">
              {booking.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Customer Details</h3>
              <p className="text-xl font-medium text-gray-900">ID: {booking.customer_id}</p>
              <div className="mt-2 mb-2">
                {booking.has_verified_kyc ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">✓ KYC Verified</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">⚠ KYC Pending</span>
                )}
              </div>
              <button onClick={() => router.push(`/customers/${booking.customer_id}`)} className="text-primary text-sm hover:underline inline-block">View Customer Profile</button>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Unit Details</h3>
              <p className="text-xl font-medium text-gray-900">ID: {booking.unit_id}</p>
            </div>
          </div>

          {/* Discounts Section */}
          <div className="mb-8 p-6 border rounded-lg bg-purple-50 border-purple-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-purple-900 text-lg">Discount Requests</h3>
              {booking.status === "PENDING" && (
                <button onClick={() => setShowDiscount(true)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">Request Discount</button>
              )}
            </div>
            
            {booking.discounts.length > 0 ? (
              <div className="space-y-3">
                {booking.discounts.map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center bg-white p-3 rounded border">
                    <div>
                      <p className="font-bold text-gray-800">₹{d.amount}</p>
                      <p className="text-xs text-gray-500">Requested by ID {d.requested_by_id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${d.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {d.status}
                      </span>
                      {d.status === 'PENDING' && user?.role === 'SUPER_ADMIN' && (
                        <button onClick={() => handleApproveDiscount(d.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Approve</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-700/70">No discounts requested for this booking.</p>
            )}
          </div>

          {/* Workflow Action Buttons based on Role & Status */}
          <div className="flex gap-4 border-t pt-6">
            {(user?.role === "MANAGER" || user?.role === "SUPER_ADMIN") && (
              <>
                {booking.status === "PENDING" && (
                  <button
                    onClick={() => handleStatusUpdate('verify-documents')}
                    disabled={actionLoading}
                    className="flex-1 bg-yellow-500 text-white py-3 rounded-lg font-bold shadow hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Processing..." : "Verify Documents"}
                  </button>
                )}
                {booking.status === "DOCS_VERIFIED" && (
                  <button
                    onClick={() => handleStatusUpdate('approve')}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Processing..." : "Approve Booking"}
                  </button>
                )}
                {booking.status === "APPROVED" && (
                  <button
                    onClick={() => handleStatusUpdate('confirm')}
                    disabled={actionLoading}
                    className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold shadow hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Processing..." : "Confirm Booking (Verify Payments)"}
                  </button>
                )}
              </>
            )}
            
            {user?.role === "SUPER_ADMIN" && booking.status !== "CANCELLED" && booking.status !== "CONFIRMED" && (
              <button
                onClick={() => handleStatusUpdate('cancel')}
                disabled={actionLoading}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold shadow hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Processing..." : "Cancel Booking"}
              </button>
            )}
          </div>

        </div>

        {/* Discount Modal */}
        {showDiscount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Request Discount</h3>
              <form onSubmit={handleRequestDiscount}>
                <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" required min="1"
                  value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full mb-6 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowDiscount(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-purple-600 text-white rounded hover:bg-purple-700 shadow">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
