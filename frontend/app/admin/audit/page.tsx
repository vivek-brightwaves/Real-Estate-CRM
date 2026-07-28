"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/axios";

export default function AuditLogPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    if (!accessToken || user?.role !== "SUPER_ADMIN") {
      router.push("/");
    } else {
      fetchLogs();
    }
  }, [accessToken, user, router, filterType, filterUser]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/system/audit-logs?limit=50`;
      if (filterType) url += `&entity_type=${filterType}`;
      if (filterUser) url += `&user_id=${filterUser}`;
      
      const res = await api.get(url);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">System Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit log of system actions and entity payload histories</p>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="bg-gradient-to-br from-white via-white to-slate-50/30 p-5 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-md transition-all duration-300 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Filter User ID</label>
          <input 
            type="number" 
            placeholder="User ID" 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full sm:w-48 px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Filter Entity</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
          >
            <option value="">All Entities</option>
            <option value="LEAD">LEAD</option>
            <option value="BOOKING">BOOKING</option>
            <option value="APPROVAL">APPROVAL</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading logs...</div>
      ) : (
        <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden backdrop-blur-md bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-slate-50/60 border-b border-[#E8EDF7] text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Changes Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF7] text-sm">
                {logs.map((log: any) => (
                  <tr key={log.id} className="odd:bg-white even:bg-slate-50/10 hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{log.user_id ? `ID: ${log.user_id}` : "SYSTEM"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        log.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-h-24 overflow-y-auto max-w-sm text-xs font-mono bg-slate-50/60 p-2 rounded-xl text-slate-600 border border-[#E8EDF7]">
                        {log.changes ? JSON.stringify(log.changes) : "No payload"}
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No logs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
