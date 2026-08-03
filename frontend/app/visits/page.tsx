"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";

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
        <PageHeader
          breadcrumb="Dashboard / Visits"
          title="Site Visits"
          subtitle="Track, check-in, and approve on-site real estate tours"
        />

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
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${visit.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
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
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowCheckIn(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Check In</h3>
              <form onSubmit={handleCheckIn} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Upload Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowCheckIn(null)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedback && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowFeedback(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Leave Feedback</h3>
              <form onSubmit={handleFeedback} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Rating (1-5)</label>
                  <input
                    type="number" min="1" max="5"
                    value={rating} onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm" required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Outcome / Feedback</label>
                  <textarea
                    value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm min-h-[100px] resize-none" required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowFeedback(null)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
