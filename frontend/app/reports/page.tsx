"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useFeedback } from "../../components/ui/FeedbackProvider";

export default function ReportsPage() {
  const router = useRouter();
  const { notify } = useFeedback();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [reportType, setReportType] = useState("bookings");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    if (user?.role === "EMPLOYEE") {
      router.push("/");
      return;
    }
    fetchPreview();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications"),
      ]);
      setUnreadCount(countRes.data.count ?? 0);
      setNotifications(listRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/mark-read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const downloadReport = async (format: "excel" | "pdf") => {
    setDownloading(format);
    try {
      const response = await api.get(
        `/reports/${reportType}/export?format=${format}`,
        { responseType: "blob" },
      );
      const extension = format === "excel" ? "xlsx" : "pdf";
      const mime =
        format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";
      const blob = new Blob([response.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}_report.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify({
        title: `${format === "excel" ? "Excel" : "PDF"} report downloaded`,
        message: `${reportType.replaceAll("_", " ")} report is ready.`,
      });
    } catch {
      notify({
        title: "Report export failed",
        message: "The authenticated report could not be generated. Please try again.",
        tone: "error",
      });
    } finally {
      setDownloading(null);
    }
  };

  if (!user || user.role === "EMPLOYEE") return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Reports Center</h2>
            <p className="text-xs text-slate-500 mt-0.5">Generate, filter, preview and export business performance and sales sheets</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-white to-slate-50/30 p-6 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-md transition-all duration-300 mb-8 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8EDF7] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <option value="bookings">Sales & Bookings</option>
              <option value="finance">Finance & Collections</option>
              <option value="inventory">Inventory Status</option>
            </select>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto shrink-0 justify-end">
            <button 
              onClick={() => downloadReport("excel")}
              disabled={downloading !== null}
              className="btn-premium-action btn-export-excel flex items-center gap-1.5"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              {downloading === "excel" ? "Preparing..." : "Export Excel"}
            </button>
            <button 
              onClick={() => downloadReport("pdf")}
              disabled={downloading !== null}
              className="btn-premium-action btn-export-pdf flex items-center gap-1.5"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              {downloading === "pdf" ? "Preparing..." : "Export PDF"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-semibold text-xs bg-white rounded-[20px] border border-[#E8EDF7] shadow-sm">Loading report preview...</div>
        ) : preview ? (
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden backdrop-blur-md bg-white/95">
            <div className="p-4 border-b border-[#E8EDF7] bg-slate-50/60 flex justify-between items-center px-6">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Data Preview (Max 50 rows)</h3>
              <span className="text-xs text-slate-450 font-bold">Total Rows Available: {preview.total_rows}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-50/60 border-b border-[#E8EDF7] text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
                    {preview.headers.map((h: string, i: number) => (
                      <th key={i} className="px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF7] text-sm">
                  {preview.rows.map((row: any[], i: number) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-6 py-4 font-semibold text-slate-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                  {preview.rows.length === 0 && (
                    <tr>
                      <td colSpan={preview.headers.length} className="px-6 py-12 text-center text-slate-500">No data found for this report.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-rose-500 text-center py-8">Failed to load preview data.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
