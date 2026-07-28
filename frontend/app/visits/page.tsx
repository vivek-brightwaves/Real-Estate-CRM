"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/dashboard/DashboardLayout";

export default function VisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Modals state
  const [showCheckIn, setShowCheckIn] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  
  const [showFeedback, setShowFeedback] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchVisits();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await api.get("/site-visits");
      setVisits(res.data);
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

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckIn) return;
    
    try {
      const formData = new FormData();
      if (photo) {
        formData.append("photo", photo);
      }
      
      await api.post(`/site-visits/${showCheckIn}/check-in`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert("Checked in successfully!");
      setShowCheckIn(null);
      setPhoto(null);
      fetchVisits();
    } catch (err) {
      alert("Error checking in");
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFeedback) return;
    
    try {
      await api.post(`/site-visits/${showFeedback}/feedback`, {
        feedback: feedbackText,
        rating
      });
      
      alert("Feedback submitted!");
      setShowFeedback(null);
      setFeedbackText("");
      fetchVisits();
    } catch (err) {
      alert("Error submitting feedback");
    }
  };

  const handleApprove = async (visitId: number) => {
    try {
      await api.post(`/site-visits/${visitId}/approve`);
      alert("Visit approved!");
      fetchVisits();
    } catch (err) {
      alert("Error approving visit");
    }
  };

  // Group visits by date (naive approach for scaffolding)
  const groupedVisits = visits.reduce((acc: any, visit: any) => {
    const dateStr = new Date(visit.scheduled_at).toLocaleDateString();
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(visit);
    return acc;
  }, {});

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
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Site Visits</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track, check-in, and approve on-site real estate tours</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading scheduled visits...</div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedVisits).map((date) => (
              <div key={date} className="space-y-4">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                  <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {date}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groupedVisits[date].map((visit: any) => (
                    <div key={visit.id} className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col backdrop-blur-md bg-white/95">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Lead ID: #{visit.lead_id}</p>
                          <p className="text-xs text-slate-450 font-semibold mt-0.5">Scheduled: {new Date(visit.scheduled_at).toLocaleTimeString()}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          visit.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          visit.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                        }`}>
                          {visit.status}
                        </span>
                      </div>
                      
                      {visit.photo_url && (
                        <div className="mb-4 space-y-1.5">
                          <img src={`http://localhost:8000${visit.photo_url}`} alt="Check-in" className="h-32 object-cover rounded-xl border border-[#E8EDF7] shadow-inner" />
                          <p className="text-[10px] text-slate-450 font-bold">Checked in at: {new Date(visit.check_in_time).toLocaleTimeString()}</p>
                        </div>
                      )}

                      {visit.feedback && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-[#E8EDF7] shadow-inner mb-4 text-xs font-semibold text-slate-650 space-y-1">
                          <p className="font-black text-slate-800">Rating: {visit.rating}/5</p>
                          <p className="italic text-slate-600">"{visit.feedback}"</p>
                        </div>
                      )}

                      <div className="mt-auto flex gap-3 border-t border-slate-100 pt-4">
                        {/* Employee Actions */}
                        {(!visit.check_in_time && user?.role === "EMPLOYEE") && (
                          <button onClick={() => setShowCheckIn(visit.id)} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-650 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition cursor-pointer">
                            Check In
                          </button>
                        )}
                        {(visit.check_in_time && !visit.feedback && user?.role === "EMPLOYEE") && (
                          <button onClick={() => setShowFeedback(visit.id)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-650 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg transition cursor-pointer">
                            Leave Feedback
                          </button>
                        )}

                        {/* Manager Actions */}
                        {(!visit.is_approved && visit.status === "COMPLETED" && (user?.role === "MANAGER" || user?.role === "SUPER_ADMIN")) && (
                          <button onClick={() => handleApprove(visit.id)} className="flex-1 bg-gradient-to-r from-purple-500 to-violet-650 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-500/10 hover:shadow-lg transition cursor-pointer">
                            Approve Visit
                          </button>
                        )}
                        {visit.is_approved && (
                          <span className="text-emerald-600 font-bold flex-1 text-center py-2 text-xs flex items-center justify-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedVisits).length === 0 && <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-[#E8EDF7] bg-slate-50/20 rounded-xl font-semibold">No scheduled site visits.</p>}
          </div>
        )}

        {/* Check-In Modal */}
        {showCheckIn && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-md p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">Check In</h3>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Upload Photo (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-3.5 py-2 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCheckIn(null)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedback && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[20px] border border-[#E8EDF7] shadow-2xl w-full max-w-md p-6 relative overflow-hidden backdrop-blur-md bg-white/98">
              <h3 className="text-base font-bold mb-4 text-slate-900 border-b border-slate-100 pb-2">Leave Feedback</h3>
              <form onSubmit={handleFeedback} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Rating (1-5)</label>
                  <input 
                    type="number" min="1" max="5" 
                    value={rating} onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm" required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Outcome / Feedback</label>
                  <textarea 
                    value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm min-h-[100px] resize-none" required
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowFeedback(null)} className="px-4 py-2 border border-[#E8EDF7] rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-650 text-white rounded-xl shadow hover:opacity-95 transition text-xs font-bold cursor-pointer">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
