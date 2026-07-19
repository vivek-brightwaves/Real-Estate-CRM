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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">System Audit Logs</h1>
        <button onClick={() => router.push("/")} className="text-primary font-bold hover:underline">
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input 
          type="number" 
          placeholder="Filter by User ID" 
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="border p-2 rounded w-48"
        />
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="border p-2 rounded w-48"
        >
          <option value="">All Entities</option>
          <option value="LEAD">LEAD</option>
          <option value="BOOKING">BOOKING</option>
          <option value="APPROVAL">APPROVAL</option>
        </select>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 font-bold">Timestamp</th>
                <th className="p-4 font-bold">User ID</th>
                <th className="p-4 font-bold">Action</th>
                <th className="p-4 font-bold">Entity</th>
                <th className="p-4 font-bold">Changes Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold">{log.user_id || "SYSTEM"}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-700">
                    {log.entity_type} #{log.entity_id}
                  </td>
                  <td className="p-4">
                    <div className="max-h-24 overflow-y-auto max-w-sm text-xs font-mono bg-gray-100 p-2 rounded text-gray-600">
                      {log.changes ? JSON.stringify(log.changes) : "No payload"}
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No logs match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
