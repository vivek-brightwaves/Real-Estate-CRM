"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [verifiedDocs, setVerifiedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "kyc">("all");
  const router = useRouter();
  const { user } = useAuthStore();

  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchCustomers();
    if (isManagerOrAdmin) fetchVerifiedDocs();
  }, [isManagerOrAdmin]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?t=${Date.now()}`);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedDocs = async () => {
    try {
      const res = await api.get(`/customers/verified-documents?t=${Date.now()}`);
      setVerifiedDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dt: string | null) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Customers</h2>

        {/* Tab Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 rounded font-bold text-sm transition ${tab === "all" ? "bg-primary text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Customers
          </button>
          {isManagerOrAdmin && (
            <button
              onClick={() => { setTab("kyc"); fetchVerifiedDocs(); }}
              className={`px-4 py-2 rounded font-bold text-sm transition ${tab === "kyc" ? "bg-green-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              ✓ KYC Verified
            </button>
          )}
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {/* --- All Customers Table --- */}
          {tab === "all" && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 font-bold text-gray-600">ID</th>
                    <th className="p-4 font-bold text-gray-600">Name</th>
                    <th className="p-4 font-bold text-gray-600">Phone</th>
                    <th className="p-4 font-bold text-gray-600">Email</th>
                    <th className="p-4 font-bold text-gray-600">KYC Status</th>
                    <th className="p-4 font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(customers as any[]).map((c: any) => {
                    const hasVerified = c.documents?.some((d: any) => d.status === "VERIFIED");
                    const hasPending = c.documents?.some((d: any) => d.status === "UPLOADED");
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-4 text-gray-500">#{c.id}</td>
                        <td className="p-4 font-bold text-gray-800">{c.name}</td>
                        <td className="p-4 text-gray-600">{c.phone || "-"}</td>
                        <td className="p-4 text-gray-600">{c.email || "-"}</td>
                        <td className="p-4">
                          {hasVerified ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">✓ Verified</span>
                          ) : hasPending ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">⏳ Pending</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded">No Docs</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => router.push(`/customers/${c.id}`)}
                            className="text-primary font-bold hover:underline"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">No customers found. Convert a lead to see them here.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- KYC Verified Documents Table --- */}
          {tab === "kyc" && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-green-50 flex justify-between items-center">
                <h3 className="font-bold text-green-800">KYC Verified Documents</h3>
                <span className="text-sm text-green-700">{verifiedDocs.length} record(s) found</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 font-bold text-gray-600">Doc ID</th>
                    <th className="p-4 font-bold text-gray-600">Customer ID</th>
                    <th className="p-4 font-bold text-gray-600">Document Type</th>
                    <th className="p-4 font-bold text-gray-600">Verification Status</th>
                    <th className="p-4 font-bold text-gray-600">Verified By</th>
                    <th className="p-4 font-bold text-gray-600">Verified At</th>
                    <th className="p-4 font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(verifiedDocs as any[]).map((doc: any) => (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-4 text-gray-500">#{doc.id}</td>
                      <td className="p-4 text-gray-600">#{doc.customer_id}</td>
                      <td className="p-4 font-bold text-gray-800">{doc.doc_type}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">✓ VERIFIED</span>
                      </td>
                      <td className="p-4 text-gray-700">
                        {doc.verified_by ? (
                          <span className="font-semibold">{doc.verified_by.name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 text-sm">{formatDate(doc.verified_at)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => router.push(`/customers/${doc.customer_id}`)}
                          className="text-primary font-bold hover:underline text-sm"
                        >
                          View Customer
                        </button>
                      </td>
                    </tr>
                  ))}
                  {verifiedDocs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">No verified KYC documents yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

