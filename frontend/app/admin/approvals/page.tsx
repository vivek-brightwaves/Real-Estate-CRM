"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/axios";

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || user?.role !== "SUPER_ADMIN") {
      router.push("/");
    } else {
      fetchApprovals();
    }
  }, [accessToken, user, router]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/system/approvals");
      setApprovals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      await api.patch(`/system/approvals/${id}/action?action=${action}`);
      alert(`Request ${action}D successfully.`);
      fetchApprovals();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Action failed"));
    }
  };

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Approvals Inbox</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage system admin validation and approval requests</p>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="px-3.5 py-2 bg-slate-50/50 border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading requests...</div>
      ) : (
        <div className="space-y-6">
          {approvals.length === 0 ? (
            <div className="bg-gradient-to-br from-white via-white to-slate-50/30 p-12 rounded-[20px] border border-[#E8EDF7] text-center text-slate-500 font-semibold text-xs backdrop-blur-md bg-white/95">
              No pending approvals.
            </div>
          ) : (
            approvals.map((req: any) => (
              <div key={req.id} className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center backdrop-blur-md bg-white/95">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-purple-50 text-purple-700 border border-purple-100 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      {req.type}
                    </span>
                    <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs border ${
                      req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-105' :
                      req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-450 text-[11px] font-semibold">
                    Requested by User ID: <span className="text-slate-800 font-bold">#{req.requested_by_id}</span> on <span className="text-slate-600 font-bold">{new Date(req.created_at).toLocaleString()}</span>
                  </p>
                  
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-[#E8EDF7] font-mono text-xs text-slate-650 max-w-2xl overflow-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(req.payload, null, 2)}</pre>
                  </div>
                </div>

                {req.status === "PENDING" && (
                  <div className="flex gap-3 shrink-0">
                    <button 
                      onClick={() => handleAction(req.id, "REJECT")}
                      className="px-5 py-2.5 bg-rose-50 text-rose-650 font-bold rounded-xl border border-rose-100 hover:bg-rose-100/70 transition-all text-xs shadow-sm"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, "APPROVE")}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-650 text-white font-bold rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-xs"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
