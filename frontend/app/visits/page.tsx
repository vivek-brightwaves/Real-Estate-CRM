"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

export default function VisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // Modals state
  const [showCheckIn, setShowCheckIn] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const [showFeedback, setShowFeedback] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    fetchVisits();
  }, []);

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

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Scheduled Visits</h2>

      {loading ? <p>Loading...</p> : (
        <div className="space-y-8">
          {Object.keys(groupedVisits).map((date) => (
            <div key={date}>
              <h3 className="font-bold text-gray-500 mb-4 border-b pb-2">{date}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupedVisits[date].map((visit: any) => (
                  <div key={visit.id} className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">Lead ID: {visit.lead_id}</p>
                        <p className="text-sm text-gray-500">Scheduled: {new Date(visit.scheduled_at).toLocaleTimeString()}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                        {visit.status}
                      </span>
                    </div>

                    {visit.photo_url && (
                      <div className="mb-4">
                        <img src={`http://localhost:8000${visit.photo_url}`} alt="Check-in" className="h-32 object-cover rounded border" />
                        <p className="text-xs text-gray-500 mt-1">Checked in at: {new Date(visit.check_in_time).toLocaleTimeString()}</p>
                      </div>
                    )}

                    {visit.feedback && (
                      <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                        <p className="font-bold">Rating: {visit.rating}/5</p>
                        <p className="text-gray-700 italic">"{visit.feedback}"</p>
                      </div>
                    )}

                    <div className="mt-auto flex gap-3 border-t pt-4">
                      {/* Employee Actions */}
                      {(!visit.check_in_time && user?.role === "EMPLOYEE") && (
                        <button onClick={() => setShowCheckIn(visit.id)} className="flex-1 bg-primary text-white py-2 rounded hover:bg-blue-600 transition">
                          Check In
                        </button>
                      )}
                      {(visit.check_in_time && !visit.feedback && user?.role === "EMPLOYEE") && (
                        <button onClick={() => setShowFeedback(visit.id)} className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition">
                          Leave Feedback
                        </button>
                      )}

                      {/* Manager Actions */}
                      {(!visit.is_approved && visit.status === "COMPLETED" && (user?.role === "MANAGER" || user?.role === "SUPER_ADMIN")) && (
                        <button onClick={() => handleApprove(visit.id)} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition">
                          Approve Visit
                        </button>
                      )}
                      {visit.is_approved && (
                        <span className="text-green-600 font-bold flex-1 text-center py-2">✓ Approved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedVisits).length === 0 && <p className="text-gray-500">No scheduled visits.</p>}
        </div>
      )}

      {/* Check-In Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Check In</h3>
            <form onSubmit={handleCheckIn}>
              <label className="block text-sm font-medium mb-2">Upload Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                className="w-full mb-6 border p-2 rounded"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCheckIn(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Leave Feedback</h3>
            <form onSubmit={handleFeedback}>
              <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
              <input
                type="number" min="1" max="5"
                value={rating} onChange={(e) => setRating(Number(e.target.value))}
                className="w-full mb-4 border p-2 rounded outline-none" required
              />

              <label className="block text-sm font-medium mb-1">Outcome</label>
              <textarea
                value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full mb-6 border p-2 rounded outline-none min-h-[100px]" required
              />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowFeedback(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
