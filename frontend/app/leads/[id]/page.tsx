"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchLead();
  }, [params.id]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      // Assuming a GET /leads/{id} endpoint exists (might need to add it to router if missing)
      // I didn't explicitly add GET /leads/{id} in the backend scaffold, let's mock the detail for now
      // using the list endpoint and filtering
      const res = await api.get("/leads");
      const found = res.data.find((l: any) => l.id === Number(params.id));
      if (found) setLead(found);
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

  const handleScheduleVisit = async () => {
    try {
      // Defaulting to tomorrow for scaffold
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
            <button 
              onClick={handleScheduleVisit}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg shadow hover:bg-green-600 transition font-bold"
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
              <div key={visit.id} className="bg-green-50 p-4 rounded border-l-4 border-green-500">
                <p className="text-sm text-green-900 font-bold">Site Visit Scheduled</p>
                <p className="text-xs text-green-700 mt-1">{new Date(visit.scheduled_at).toLocaleString()}</p>
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
    </div>
  );
}
