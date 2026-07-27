"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  
  // Visit Modal State
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitResult, setVisitResult] = useState("COMPLETED");
  const [visitDate, setVisitDate] = useState("");
  const [visitFeedback, setVisitFeedback] = useState("");
  const [visitSalesNotes, setVisitSalesNotes] = useState("");
  const [visitRemarks, setVisitRemarks] = useState("");
  const [visitFollowUpDate, setVisitFollowUpDate] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetchLead();
  }, [params.id]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leads/${params.id}`);
      setLead(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;
    try {
      await api.post(`/leads/${params.id}/notes`, { note: newNote });
      setNewNote("");
      fetchLead(); // Refetch to show new note
    } catch (err) {
      alert("Error adding note");
    }
  };

  const handleMarkAsContacted = async () => {
    try {
      await api.patch(`/leads/${lead.id}`, { status: 'CONTACTED' });
      alert("Lead marked as Contacted successfully.");
      router.replace(`/leads/${lead.id}`);
    } catch (err: any) {
      alert("Error updating status: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    const prevStatus = lead.status;
    setLead({ ...lead, status: newStatus });
    try {
      await api.patch(`/leads/${lead.id}`, { status: newStatus });
    } catch (err: any) {
      setLead({ ...lead, status: prevStatus });
      alert("Error updating status: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleScheduleVisit = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await api.post(`/leads/${params.id}/schedule-visit`, {
        scheduled_at: tomorrow.toISOString(),
      });

      alert("Site visit scheduled successfully.");
      // Redirect to Leads Board — it will refetch and show the lead
      // in the VISIT_SCHEDULED column without a manual page refresh.
      router.replace("/visits");
    } catch (err: any) {
      alert("Error scheduling visit: " + (err.response?.data?.detail || err.message));
    }
  };

  const hasApprovedVisit = lead?.site_visits?.some(
    (v: any) => v.status === 'COMPLETED' && v.is_approved
  );

  const handleSubmitVisitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeVisit = lead.site_visits?.find((v: any) => v.status === 'SCHEDULED');
    if (!activeVisit) {
      alert("No active scheduled visit found.");
      return;
    }
    try {
      await api.post(`/site-visits/${activeVisit.id}/result`, {
        status: visitResult,
        scheduled_at: visitResult === 'RESCHEDULED' && visitDate ? new Date(visitDate).toISOString() : null,
        feedback: visitFeedback || null,
        sales_notes: visitSalesNotes || null,
        remarks: visitRemarks || null,
        next_follow_up_date: visitFollowUpDate ? new Date(visitFollowUpDate).toISOString() : null
      });
      alert("Visit result updated!");
      setShowVisitModal(false);
      // Reset form
      setVisitResult("COMPLETED");
      setVisitDate("");
      setVisitFeedback("");
      setVisitSalesNotes("");
      setVisitRemarks("");
      setVisitFollowUpDate("");
      
      fetchLead();
    } catch (err: any) {
      alert("Error updating visit result: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!lead) return <div className="p-8">Lead not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <div className="max-w-4xl w-full flex gap-8">
        
        {/* Left Col: Lead Info */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow border">
          <button onClick={() => router.back()} className="text-gray-500 mb-6 hover:text-gray-800">← Back</button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{lead.name}</h2>
              <p className="text-gray-500">{lead.phone} • {lead.email || "No email"}</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-bold text-sm">
              {lead.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded border">
                <span className="text-sm text-gray-500">Source</span>
                <p className="font-medium">{lead.source || "Unknown"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded border">
                <span className="text-sm text-gray-500">Assigned To</span>
                <p className="font-medium">User ID {lead.assigned_to_id}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {lead.status === 'NEW' && (
              <button 
                onClick={handleMarkAsContacted}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg shadow hover:bg-blue-600 transition font-bold"
              >
                Mark as Contacted
              </button>
            )}
            
            {lead.status === 'CONTACTED' && (
              <button 
                onClick={handleScheduleVisit}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg shadow hover:bg-green-600 transition font-bold"
              >
                Schedule Site Visit
              </button>
            )}

            {lead.status === 'VISIT_SCHEDULED' && (
              <>
                {!hasApprovedVisit && (
                  <button
                    onClick={() => router.replace("/visits")}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg shadow hover:bg-gray-700 transition font-bold"
                  >
                    Continue Site Visit
                  </button>
                )}
                {hasApprovedVisit && (
                  <button 
                    onClick={() => handleUpdateStatus('NEGOTIATION')}
                    className="flex-1 bg-yellow-500 text-white py-3 rounded-lg shadow hover:bg-yellow-600 transition font-bold"
                  >
                    Move to Negotiation
                  </button>
                )}
              </>
            )}

            {lead.status === 'NEGOTIATION' && (
              <button 
                onClick={async () => {
                  try {
                    const res = await api.post("/customers", { lead_id: lead.id, name: lead.name, phone: lead.phone, email: lead.email });
                    alert("Lead converted successfully!");
                    router.push(`/customers/${res.data.id}`);
                  } catch (err: any) {
                    alert("Error converting lead: " + (err.response?.data?.detail || err.message));
                  }
                }}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg shadow hover:bg-purple-700 transition font-bold"
              >
                Convert to Customer
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Notes Timeline */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow border flex flex-col">
          <h3 className="text-xl font-bold mb-6 border-b pb-2">Timeline & Notes</h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-6">
            {lead.notes?.length > 0 ? lead.notes.map((note: any) => (
              <div key={note.id} className="bg-gray-50 p-4 rounded border-l-4 border-primary">
                <p className="text-sm text-gray-800">{note.note}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(note.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No notes yet.</p>
            )}
            
            {lead.site_visits?.length > 0 && lead.site_visits.map((visit: any) => (
              <div key={visit.id} className="bg-green-50 p-4 rounded border-l-4 border-green-500 mb-4">
                <p className="text-sm text-green-900 font-bold">Site Visit - {visit.status}</p>
                <p className="text-xs text-green-700 mt-1">Scheduled for: {new Date(visit.scheduled_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleAddNote} className="mt-auto">
            <textarea 
              className="w-full border rounded-lg p-3 outline-none focus:border-primary mb-2"
              placeholder="Add a new note..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button type="submit" className="w-full bg-primary text-white py-2 rounded shadow hover:bg-blue-600 transition">
              Add Note
            </button>
          </form>
        </div>
        
      </div>

      {/* Visit Result Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-gray-800">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Update Visit Result</h3>
            <form onSubmit={handleSubmitVisitResult}>
              <label className="block text-sm font-bold text-gray-700 mb-1">Result *</label>
              <select 
                value={visitResult} 
                onChange={(e) => setVisitResult(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="COMPLETED">Completed</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>

              {visitResult === 'RESCHEDULED' && (
                <>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Visit Date & Time *</label>
                  <input 
                    type="datetime-local" required
                    value={visitDate} onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                  />
                </>
              )}

              <label className="block text-sm font-bold text-gray-700 mb-1">Customer Feedback</label>
              <textarea 
                value={visitFeedback} onChange={(e) => setVisitFeedback(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Sales Notes</label>
              <textarea 
                value={visitSalesNotes} onChange={(e) => setVisitSalesNotes(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Remarks</label>
              <textarea 
                value={visitRemarks} onChange={(e) => setVisitRemarks(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Next Follow-up Date (Optional)</label>
              <input 
                type="datetime-local"
                value={visitFollowUpDate} onChange={(e) => setVisitFollowUpDate(e.target.value)}
                className="w-full mb-6 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
              />
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowVisitModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 font-bold bg-primary text-white rounded hover:bg-blue-600 shadow">Save Result</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
