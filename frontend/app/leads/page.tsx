"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import LeadsBoard from "../../components/leads/LeadsBoard";
import AddLeadButton from "../../components/leads/AddLeadButton";
import PageHeader from "../../components/ui/PageHeader";
import { useFeedback } from "../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../hooks/useSectionSearch";

export default function LeadsPage() {
  const router = useRouter();
  const { notify } = useFeedback();
  const { user, accessToken, clearAuth } = useAuthStore();

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  useSectionSearch("leads", setSearchQuery);

  const [priority, setPriority] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }

    fetchLeads();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [accessToken, router]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leads");
      setLeads(res.data || []);
    } catch (err) {
      console.error(err);
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

  const updateStatus = async (leadId: number, status: string) => {
    try {
      await api.patch(`/leads/${leadId}`, { status });
      notify({
        title: "Lead status updated",
        message: `The lead moved to ${status.replaceAll("_", " ").toLowerCase()}.`,
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
      notify({
        title: "Status update failed",
        message: "Unable to update lead status. Please try again.",
        tone: "error",
      });
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

  const exportLeads = () => {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Name", "Phone", "Email", "Source", "Priority", "Status"],
      ...visibleLeads.map((lead) => [
        lead.name,
        lead.phone,
        lead.email,
        lead.source,
        lead.priority,
        lead.status,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(escape).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleLeads = useMemo(() => {
    let filtered = normalizedSearch
      ? leads.filter((lead) =>
          [lead.name, lead.phone, lead.email, lead.source].some((value) =>
            String(value ?? "").toLowerCase().includes(normalizedSearch)
          )
        )
      : [...leads];

    if (priority) {
      filtered = filtered.filter((lead) => lead.priority === priority);
    }

    return filtered.sort((left, right) => {
      if (sortOrder === "name") return left.name.localeCompare(right.name);
      const difference =
        new Date(left.created_at ?? 0).getTime() -
        new Date(right.created_at ?? 0).getTime();
      return sortOrder === "oldest" ? difference : -difference;
    });
  }, [leads, normalizedSearch, priority, sortOrder]);

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <PageHeader
        breadcrumb="Dashboard / Leads"
        title="Leads Pipeline"
        subtitle="Manage, assign and track leads through each pipeline stage."
        searchFilter={
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full h-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 dark:text-[#CBD5E1] outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 placeholder:text-slate-400 shadow-sm"
            />
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2.5 items-center">
            <select
              aria-label="Filter leads by priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] shadow-sm outline-none"
            >
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select
              aria-label="Sort leads"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] shadow-sm outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>
            <button
              type="button"
              onClick={exportLeads}
              className="h-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-4 text-xs font-bold text-slate-750 dark:text-[#CBD5E1] transition hover:bg-slate-50 dark:hover:bg-[#273449] shadow-sm cursor-pointer"
            >
              Export
            </button>
            <AddLeadButton onClick={() => router.push("/leads/new")} />
          </div>
        }
      />
      <div className="min-h-full flex flex-col">
        <div className="mx-auto w-full">
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 dark:from-background dark:via-background dark:to-background/30 rounded-[20px] border border-border shadow-sm hover:shadow-lg transition-all duration-300 p-6 md:p-8 backdrop-blur-md bg-white/95 dark:bg-background/95">
            <LeadsBoard
              leads={visibleLeads}
              loading={loading}
              onStatusChange={updateStatus}
              onLeadClick={(leadId) => router.push(`/leads/${leadId}`)}
              onViewAll={() => router.push("/leads")}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
