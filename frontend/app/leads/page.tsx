"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import LeadsBoard from "../../components/leads/LeadsBoard";
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

  if (!user) return null;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleLeads = normalizedSearch
    ? leads.filter((lead) =>
        [lead.name, lead.phone, lead.email, lead.source].some((value) =>
          String(value ?? "").toLowerCase().includes(normalizedSearch),
        ),
      )
    : leads;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="min-h-full flex flex-col">
        <div className="mx-auto w-full py-2">
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[20px] border border-[#E8EDF7] shadow-sm hover:shadow-lg transition-all duration-300 p-6 md:p-8 backdrop-blur-md bg-white/95">
            <LeadsBoard
              leads={visibleLeads}
              loading={loading}
              searchValue={searchQuery}
              onSearch={setSearchQuery}
              onAdd={() => router.push("/leads/new")}
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
