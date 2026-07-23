"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";

export default function ReportsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [reportType, setReportType] = useState("sales");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || user?.role === "EMPLOYEE") {
      router.push("/");
    } else {
      fetchPreview();
    }
  }, [accessToken, user, router, reportType]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${reportType}`);
      setPreview(res.data);
    } catch (err) {
      console.error(err);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format: "excel" | "pdf") => {
    window.open(`http://localhost:8000/reports/${reportType}/export?format=${format}`, "_blank");
  };

  if (!user || user.role === "EMPLOYEE") return null;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Reports Center</h2>

        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border p-3 rounded"
            >
              <option value="sales">Sales & Bookings</option>
              <option value="finance">Finance & Collections</option>
              <option value="inventory">Inventory Status</option>
            </select>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => downloadReport("excel")}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Export Excel
            </button>
            <button 
              onClick={() => downloadReport("pdf")}
              className="px-6 py-3 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading preview...</p>
        ) : preview ? (
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <div className="p-4 border-b bg-gray-50 flex justify-between">
              <h3 className="font-bold text-gray-700">Data Preview (Max 50 rows)</h3>
              <span className="text-sm text-gray-500">Total Rows Available: {preview.total_rows}</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {preview.headers.map((h: string, i: number) => (
                    <th key={i} className="p-3 font-bold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row: any[], i: number) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    {row.map((cell: any, j: number) => (
                      <td key={j} className="p-3 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr>
                    <td colSpan={preview.headers.length} className="p-8 text-center text-gray-500">No data found for this report.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-red-500">Failed to load preview.</p>
        )}
      </div>
  );
}
