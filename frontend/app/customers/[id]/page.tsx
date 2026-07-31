"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("ID_PROOF");
  const [file, setFile] = useState<File | null>(null);
  
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchCustomerData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, params.id, router]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [custRes, timeRes] = await Promise.all([
        api.get(`/customers/${params.id}`),
        api.get(`/customers/${params.id}/timeline`)
      ]);
      setCustomer(custRes.data);
      setTimeline(timeRes.data.timeline || []);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("file", file);
      
      await api.post(`/customers/${params.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Document uploaded successfully.");
      setFile(null);
      fetchCustomerData();
    } catch (err) {
      alert("Error uploading document");
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (docId: number, status: string) => {
    try {
      await api.patch(`/customers/documents/${docId}/verify`, { status });
      alert(`Document marked as ${status}`);
      
      if (status === 'VERIFIED') {
        window.location.href = '/customers'; // Use standard window navigation to force a full refresh, bypassing Next.js client router cache
      } else {
        fetchCustomerData();
      }
    } catch (err) {
      alert("Error verifying document. You might lack permissions.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading customer profile...</div>;
  if (!customer) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Customer not found.</div>;
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
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Customer Profiles</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage customer identity verification, KYC, and history updates</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-sm"
          >
            &larr; Back
          </button>
        </div>
        
        {/* Top Info Card */}
        <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 backdrop-blur-md bg-white/95">
          <h2 className="text-lg font-black text-slate-900 mb-2 leading-none">{customer.name}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
            <p><strong>Phone:</strong> <span className="text-slate-700">{customer.phone || "-"}</span></p>
            <p><strong>Email:</strong> <span className="text-slate-700">{customer.email || "-"}</span></p>
            <p><strong>Assigned Owner:</strong> <span className="text-slate-700">Agent ID #{customer.assigned_to_id}</span></p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Col: Documents */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 backdrop-blur-md bg-white/95 flex flex-col">
              <h3 className="text-base font-bold text-slate-900 border-b border-[#E8EDF7] pb-2 mb-6">KYC Documents</h3>
              
              <div className="space-y-4 mb-6">
                {customer.documents?.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between items-center p-4 border border-[#E8EDF7] rounded-xl bg-slate-50/50 shadow-inner">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">{doc.doc_type.replace('_', ' ')}</p>
                      <a href={`http://localhost:8000${doc.file_url}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-650 hover:text-blue-750 transition-colors">View File &rarr;</a>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        doc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        doc.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {doc.status}
                      </span>
                      
                      {doc.status === 'UPLOADED' && (user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN') && (
                        <div className="flex gap-2">
                          <button onClick={() => handleVerify(doc.id, 'VERIFIED')} className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-650 text-white font-bold px-2 py-1 rounded-lg hover:opacity-95 shadow cursor-pointer transition-all">Verify</button>
                          <button onClick={() => handleVerify(doc.id, 'REJECTED')} className="text-[10px] bg-gradient-to-r from-rose-500 to-red-650 text-white font-bold px-2 py-1 rounded-lg hover:opacity-95 shadow cursor-pointer transition-all">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!customer.documents || customer.documents.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-[#E8EDF7] bg-slate-50/20 rounded-xl font-semibold">No KYC documents uploaded yet.</p>
                )}
              </div>
              
              <form onSubmit={handleUpload} className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/60 shadow-sm space-y-4">
                <h4 className="font-bold text-blue-900 text-xs">Upload New Document</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Document Type</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer">
                      <option value="ID_PROOF">ID Proof</option>
                      <option value="ADDRESS_PROOF">Address Proof</option>
                      <option value="BANK_STATEMENT">Bank Statement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Choose File</label>
                    <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="w-full px-3.5 py-2 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer" required />
                  </div>
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: Journey Timeline */}
          <div className="flex-1 bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 backdrop-blur-md bg-white/95 flex flex-col">
            <h3 className="text-base font-bold text-slate-900 border-b border-[#E8EDF7] pb-2 mb-6">Customer Journey</h3>
            
            <div className="space-y-6">
              {/* Stub for Bookings */}
              <div className="relative pl-6 border-l-2 border-slate-200 pb-2">
                <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm"></div>
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Bookings & Payments</h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">Module linked dynamically via Payments page</p>
              </div>

              {timeline.map((item: any, idx: number) => (
                <div key={idx} className="relative pl-6 border-l-2 border-blue-600 pb-2 last:border-l-0">
                  <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm shadow-blue-500/20"></div>
                  <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-650 mt-1 leading-relaxed">{item.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">{new Date(item.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
