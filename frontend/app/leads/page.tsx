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

  // Kanban Statuses
  const statuses = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "NEGOTIATION", "CONVERTED", "LOST"];

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

  const updateStatus = async (leadId: number, status: string) => {
    try {
      await api.patch(`/leads/${leadId}`, { status });
      fetchLeads();
    } catch (err) {
      alert("Error updating status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM</h1>
        <nav className="space-y-4">
          <a href="/" className="block px-4 py-2 hover:bg-slate-800 rounded">Dashboard</a>
          <a href="/leads" className="block px-4 py-2 bg-slate-800 rounded">Leads</a>
          <a href="/inventory" className="block px-4 py-2 hover:bg-slate-800 rounded">Inventory</a>
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-auto flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Leads Board</h2>
          <button className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition">
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
                      className="bg-white p-4 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <h4 className="font-bold text-gray-900">{lead.name}</h4>
                      <p className="text-sm text-gray-500 mb-3">{lead.phone}</p>
                      
                      {/* Quick Status Move Dropdown */}
                      <select 
                        className="text-xs border rounded p-1 w-full mt-2 bg-gray-50 outline-none"
                        value={lead.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateStatus(lead.id, e.target.value);
                        }}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
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
      </div>
    </div>
  );
}
