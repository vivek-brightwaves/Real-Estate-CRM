"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "next/navigation";

export default function LeadsBoardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newInitialNote, setNewInitialNote] = useState("");

  // Kanban Statuses — CONVERTED leads are handled in the Customers module
  const statuses = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "NEGOTIATION", "LOST"];

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leads");
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert("Name and Phone are required.");
      return;
    }
    try {
      await api.post("/leads", {
        name: newName,
        phone: newPhone,
        email: newEmail || null,
        source: newSource || null,
        initial_note: newInitialNote || null
      });
      alert("Lead created successfully!");
      setShowNew(false);
      // Reset form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewSource("");
      setNewInitialNote("");
      // Refresh Leads Board
      fetchLeads();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Failed to create lead"));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Leads Board</h2>
        <button 
          onClick={() => setShowNew(true)} 
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition font-bold"
        >
          + Add Lead
        </button>
      </div>

        {/* Board Columns */}
        {loading ? <p>Loading...</p> : (
          <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
            {statuses.map(status => (
              <div key={status} className="bg-gray-100 rounded-lg p-4 w-80 shrink-0 flex flex-col">
                <h3 className="font-bold text-gray-700 mb-4 tracking-wide text-sm">{status.replace('_', ' ')}</h3>
                
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {leads.filter((l: any) => l.status === status).map((lead: any) => (
                    <div 
                      key={lead.id} 
                      className="bg-white p-4 rounded shadow-sm border border-gray-200 hover:shadow-md transition"
                    >
                      <h4 className="font-bold text-gray-900">{lead.name}</h4>
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                      {lead.email && <p className="text-xs text-gray-400 mb-3">{lead.email}</p>}

                      {/* View Details — the ONLY way to navigate and change lead status */}
                      <button
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="mt-3 w-full text-xs text-primary border border-primary rounded py-1 hover:bg-primary hover:text-white transition font-semibold"
                      >
                        View Details →
                      </button>
                    </div>
                  ))}
                  {leads.filter((l: any) => l.status === status).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed rounded">No leads</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create Lead Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-gray-800">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Add Lead</h3>
            <form onSubmit={handleCreateLead}>
              <label className="block text-sm font-bold text-gray-700 mb-1">Name *</label>
              <input 
                type="text" required
                value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. John Doe"
              />
              
              <label className="block text-sm font-bold text-gray-700 mb-1">Phone *</label>
              <input 
                type="text" required
                value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. +91 9999999999"
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input 
                type="email"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. john@example.com"
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Source</label>
              <input 
                type="text"
                value={newSource} onChange={(e) => setNewSource(e.target.value)}
                className="w-full mb-4 border p-3 rounded outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Website, Reference"
              />

              <label className="block text-sm font-bold text-gray-700 mb-1">Initial Note</label>
              <textarea 
                value={newInitialNote} onChange={(e) => setNewInitialNote(e.target.value)}
                className="w-full mb-6 border p-3 rounded outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Add initial details about the lead..."
              />
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 font-bold bg-primary text-white rounded hover:bg-blue-600 shadow">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
}
