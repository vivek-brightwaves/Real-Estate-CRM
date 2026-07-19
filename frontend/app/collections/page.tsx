"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

export default function CollectionsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, OVERDUE, RECEIVED
  
  const { user } = useAuthStore();

  // Modals state
  const [showNew, setShowNew] = useState(false);
  const [newBookingId, setNewBookingId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [showMarkReceived, setShowMarkReceived] = useState<number | null>(null);
  const [rcvMode, setRcvMode] = useState("BANK_TRANSFER");
  const [rcvRef, setRcvRef] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [activeTab]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments`);
      // We will filter client side for tabs (or could pass ?status_filter)
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      fetchPayments();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to update"));
    }
  };

  const generateReceipt = async (paymentId: number) => {
    try {
      const res = await api.post(`/payments/${paymentId}/generate-receipt`);
      window.open(`http://localhost:8000${res.data.receipt_url}`, "_blank");
    } catch (err: any) {
      alert("Error generating receipt: " + (err.response?.data?.detail || "Error"));
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

  const filteredPayments = payments.filter((p: any) => p.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM</h1>
        <nav className="space-y-4">
          <a href="/" className="block px-4 py-2 hover:bg-slate-800 rounded">Dashboard</a>
          <a href="/bookings" className="block px-4 py-2 hover:bg-slate-800 rounded">Bookings</a>
          <a href="/collections" className="block px-4 py-2 bg-slate-800 rounded">Collections</a>
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Collections Dashboard</h2>
          <button onClick={() => setShowNew(true)} className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition font-bold">
            + Record Scheduled Payment
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b pb-2">
          {["PENDING", "OVERDUE", "RECEIVED"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? <p>Loading payments...</p> : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-bold text-gray-600">ID / Booking</th>
                  <th className="p-4 font-bold text-gray-600">Amount</th>
                  <th className="p-4 font-bold text-gray-600">{activeTab === 'RECEIVED' ? 'Received Date' : 'Due Date'}</th>
                  {activeTab === 'RECEIVED' && <th className="p-4 font-bold text-gray-600">Mode</th>}
                  <th className="p-4 font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <span className="block font-bold text-gray-800">Payment #{p.id}</span>
                      <span className="text-sm text-gray-500">Booking #{p.booking_id}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{p.amount}</td>
                    <td className="p-4 text-gray-600">
                      {activeTab === 'RECEIVED' ? (p.received_date || '-') : (p.due_date || '-')}
                    </td>
                    {activeTab === 'RECEIVED' && (
                      <td className="p-4">
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded font-bold">{p.mode}</span>
                        <span className="block text-xs text-gray-400 mt-1">{p.receipt_number}</span>
                      </td>
                    )}
                    <td className="p-4 text-right flex justify-end gap-2">
                      {activeTab !== 'RECEIVED' && (
                        <button onClick={() => sendReminder(p.id)} className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm font-bold hover:bg-orange-200">
                          Send Reminder
                        </button>
                      )}
                      
                      {activeTab !== 'RECEIVED' && (user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN') && (
                        <button onClick={() => setShowMarkReceived(p.id)} className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600">
                          Mark Received
                        </button>
                      )}

                      {activeTab === 'RECEIVED' && (
                        <button onClick={() => generateReceipt(p.id)} className="bg-primary text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-600">
                          View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No {activeTab.toLowerCase()} payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Record Payment Modal */}
        {showNew && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Record Scheduled Payment</h3>
              <form onSubmit={handleRecordPayment}>
                <label className="block text-sm font-bold text-gray-700 mb-1">Booking ID</label>
                <input type="number" required value={newBookingId} onChange={(e) => setNewBookingId(e.target.value)} className="w-full mb-4 border p-2 rounded" />
                
                <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full mb-4 border p-2 rounded" />

                <label className="block text-sm font-bold text-gray-700 mb-1">Due Date</label>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full mb-6 border p-2 rounded" />
                
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-primary text-white rounded hover:bg-blue-600">Record</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark Received Modal */}
        {showMarkReceived && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Mark Payment Received</h3>
              <form onSubmit={handleMarkReceived}>
                <label className="block text-sm font-bold text-gray-700 mb-1">Payment Mode</label>
                <select value={rcvMode} onChange={(e) => setRcvMode(e.target.value)} className="w-full mb-4 border p-2 rounded">
                  <option value="CASH">CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="UPI_REFERENCE">UPI</option>
                </select>
                
                <label className="block text-sm font-bold text-gray-700 mb-1">Receipt / Reference No. (Optional)</label>
                <input type="text" value={rcvRef} onChange={(e) => setRcvRef(e.target.value)} className="w-full mb-6 border p-2 rounded" />
                
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowMarkReceived(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-green-500 text-white rounded hover:bg-green-600">Confirm Receipt</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
