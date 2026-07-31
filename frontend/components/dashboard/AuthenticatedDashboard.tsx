"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import DashboardLayout from "./DashboardLayout";

interface NotificationItem {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AuthenticatedDashboard({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const [countResponse, listResponse] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications?size=10"),
      ]);
      setUnreadCount(countResponse.data.count ?? 0);
      setNotifications(listResponse.data ?? []);
    } catch {
      // Page data remains usable when notification polling is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [accessToken, fetchNotifications, router]);

  const markRead = async (id: number) => {
    await api.patch(`/notifications/${id}/mark-read`);
    await fetchNotifications();
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!user || !accessToken) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={logout}
    >
      {children}
    </DashboardLayout>
  );
}
