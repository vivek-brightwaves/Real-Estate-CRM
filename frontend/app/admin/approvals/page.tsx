"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Approvals Inbox</h1>
        <Link href="/" className="text-primary font-bold hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <div className="space-y-6">
          {approvals.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-gray-500">
              No pending approvals.
            </div>
          ) : (
            approvals.map((req: any) => (
              <div key={req.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded text-sm">
                      {req.type}
                    </span>
                    <span className={`font-bold px-3 py-1 rounded text-sm ${
                      req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">Requested by User ID: {req.requested_by_id} on {new Date(req.created_at).toLocaleString()}</p>
                  
                  <div className="bg-gray-50 p-4 rounded border font-mono text-sm text-gray-700 max-w-2xl overflow-auto">
                    <pre>{JSON.stringify(req.payload, null, 2)}</pre>
                  </div>
                </div>

                {req.status === "PENDING" && (
                  <div className="flex gap-3 min-w-max">
                    <button 
                      onClick={() => handleAction(req.id, "REJECT")}
                      className="px-6 py-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200 transition"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, "APPROVE")}
                      className="px-6 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 transition shadow"
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
