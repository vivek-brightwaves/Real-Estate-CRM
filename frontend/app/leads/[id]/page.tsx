"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchLead();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, params.id, router]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leads");
      const found = res.data.find((l: any) => l.id === Number(params.id));
      if (found) setLead(found);
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;
    try {
      await api.post(`/leads/${params.id}/notes`, { note: newNote });
      setNewNote("");
      fetchLead();
    } catch (err) {
      alert("Error adding note");
    }
  };

  const handleScheduleVisit = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await api.post(`/leads/${params.id}/schedule-visit`, {
        scheduled_at: tomorrow.toISOString(),
      });
      alert("Visit scheduled for tomorrow!");
      fetchLead();
    } catch (err) {
      alert("Error scheduling visit");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-center text-slate-500 font-semibold text-xs">Lead not found.</div>;
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
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Lead Profiles</h2>
            <p className="text-xs text-slate-500 mt-0.5">View and update detailed pipeline status for {lead.name}</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-sm"
          >
            &larr; Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Col: Lead Info */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col backdrop-blur-md bg-white/95 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">{lead.name}</h3>
                <p className="text-xs text-slate-450 font-semibold">{lead.phone} &bull; {lead.email || "No email"}</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full font-bold text-xs uppercase tracking-wider">
                {lead.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-[#E8EDF7] shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Source</span>
                  <p className="font-bold text-slate-800 text-xs">{lead.source || "Unknown"}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-xl border border-[#E8EDF7] shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assigned To</span>
                  <p className="font-bold text-slate-800 text-xs">User ID #{lead.assigned_to_id}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
              <button 
                onClick={handleScheduleVisit}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-650 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                Schedule Site Visit
              </button>
              {lead.status !== 'CONVERTED' && (
                <button 
                  onClick={async () => {
                    try {
                      const res = await api.post("/customers", { lead_id: lead.id, name: lead.name, phone: lead.phone, email: lead.email });
                      alert("Lead converted successfully!");
                      router.push(`/customers/${res.data.id}`);
                    } catch (err) {
                      alert("Error converting lead");
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-violet-650 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  Convert to Customer
                </button>
              )}
            </div>
          </div>

          {/* Right Col: Notes Timeline */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col backdrop-blur-md bg-white/95 space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-[#E8EDF7] pb-2">Timeline & Notes</h3>
            
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
              {lead.notes?.length > 0 ? lead.notes.map((note: any) => (
                <div key={note.id} className="bg-slate-50/60 p-4 rounded-xl border border-[#E8EDF7] border-l-4 border-l-blue-600 shadow-inner">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{note.note}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              )) : (
                <p className="text-slate-400 text-center py-8 text-xs font-semibold">No timeline notes yet.</p>
              )}
              
              {lead.site_visits?.length > 0 && lead.site_visits.map((visit: any) => (
                <div key={visit.id} className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 border-l-4 border-l-emerald-600 shadow-inner">
                  <p className="text-xs text-emerald-800 font-bold">Site Visit Scheduled</p>
                  <p className="text-[10px] text-emerald-650 font-bold mt-1">{new Date(visit.scheduled_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddNote} className="pt-4 border-t border-slate-100 space-y-3">
              <textarea 
                className="w-full border border-[#E8EDF7] rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-xs font-semibold text-slate-700 shadow-sm bg-white resize-none"
                placeholder="Add a new timeline note..."
                rows={3}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer">
                Add Note
              </button>
            </form>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
