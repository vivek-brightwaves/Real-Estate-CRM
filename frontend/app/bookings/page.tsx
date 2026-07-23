"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export default function BookingsBoardPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  // Booking Pipeline Statuses (visible columns, CANCELLED hidden from board)
  const statuses = ["PENDING", "DOCS_VERIFIED", "APPROVED", "CONFIRMED"];

  // Modal State for New Booking
  const [showNew, setShowNew] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [newCustId, setNewCustId] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitId || !newCustId) {
      alert("Unit ID and Customer ID are required.");
      return;
    }
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

  const handleVerifyDocs = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/verify-documents`);
      alert("Documents verified successfully!");
      fetchBookings();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to verify documents"));
    }
  };

  const handleApprove = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/approve`);
      alert("Booking approved!");
      fetchBookings();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to approve booking"));
    }
  };

  const handleConfirm = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/confirm`);
      alert("Booking confirmed!");
      fetchBookings();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to confirm booking"));
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      alert("Booking cancelled.");
      fetchBookings();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to cancel booking"));
    }
  };

  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "SUPER_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Booking Pipeline</h2>
        <button
          onClick={() => setShowNew(true)}
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition font-bold"
        >
          + New Booking
        </button>
      </div>

      {/* Board Columns */}
      {loading ? <p>Loading...</p> : (
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
          {statuses.map(status => (
            <div key={status} className="bg-gray-100 rounded-lg p-4 w-80 shrink-0 flex flex-col">
              <h3 className="font-bold text-gray-700 mb-4 tracking-wide text-sm">{status.replace("_", " ")}</h3>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {(bookings as any[]).filter((b: any) => b.status === status).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="bg-white p-4 rounded shadow-sm border border-gray-200 hover:shadow-md transition"
                  >
                    {/* Card Header - clickable for detail */}
                    <div
                      className="cursor-pointer"
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    >
                      <h4 className="font-bold text-gray-900">Booking #{booking.id}</h4>
                      <p className="text-sm text-blue-600 mt-1">Unit ID: {booking.unit_id}</p>
                      <p className="text-sm text-blue-600">Customer ID: {booking.customer_id}</p>

                      {booking.discounts && booking.discounts.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold">
                            Discount: {booking.discounts[0].status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Workflow Action Buttons */}
                    <div className="mt-3 pt-3 border-t flex flex-col gap-2">
                      {/* PENDING → Verify Documents (Manager/Admin only) */}
                      {booking.status === "PENDING" && isManagerOrAdmin && (
                        <button
                          onClick={() => handleVerifyDocs(booking.id)}
                          className="w-full text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1.5 rounded transition"
                        >
                          ✓ Verify Documents
                        </button>
                      )}

                      {/* DOCS_VERIFIED → Approve (Manager/Admin only) */}
                      {booking.status === "DOCS_VERIFIED" && isManagerOrAdmin && (
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="w-full text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded transition"
                        >
                          ✓ Approve Booking
                        </button>
                      )}

                      {/* APPROVED → Confirm (Manager/Admin only) */}
                      {booking.status === "APPROVED" && isManagerOrAdmin && (
                        <button
                          onClick={() => handleConfirm(booking.id)}
                          className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded transition"
                        >
                          ✓ Confirm Booking
                        </button>
                      )}

                      {/* Cancel — SUPER_ADMIN only, not on CONFIRMED or CANCELLED */}
                      {isSuperAdmin && !["CONFIRMED", "CANCELLED"].includes(booking.status) && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="w-full text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1.5 rounded transition"
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(bookings as any[]).filter((b: any) => b.status === status).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed rounded">No bookings</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Booking Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">New Booking</h3>
            <form onSubmit={handleCreate}>
              <label className="block text-sm font-bold text-gray-700 mb-1">Unit ID *</label>
              <input
                type="number" required
                value={newUnitId} onChange={(e) => setNewUnitId(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. 1"
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Customer ID *</label>
              <input
                type="number" required
                value={newCustId} onChange={(e) => setNewCustId(e.target.value)}
                className="w-full mb-8 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. 1"
              />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 font-bold bg-primary text-white rounded hover:bg-blue-600 shadow">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

