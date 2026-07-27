"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import LeadsBoard from "../../components/leads/LeadsBoard";

export default function LeadsPage() {
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }

    fetchLeads();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert("Unable to update lead status. Please try again.");
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

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="min-h-full flex flex-col bg-[linear-gradient(180deg,_#F8FAFC_0%,_#F1F5F9_100%)]">
        <div className="mx-auto max-w-7xl px-8 py-10">
          <div className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <LeadsBoard
              leads={leads}
              loading={loading}
              onSearch={() => {}}
              onAdd={() => router.push("/leads/new")}
              onStatusChange={updateStatus}
              onViewAll={() => router.push("/leads")}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
