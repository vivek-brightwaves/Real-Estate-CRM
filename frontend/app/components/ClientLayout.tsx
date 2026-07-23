"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
  highlight?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  roles?: string[];
}

const SidebarLink = memo(function SidebarLink({
  href,
  label,
  active,
  highlight,
}: {
  href: string;
  label: string;
  active: boolean;
  highlight?: string;
}) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded transition ${
        active
          ? "bg-slate-700 text-white font-medium"
          : "text-slate-200 hover:bg-slate-800 hover:text-white"
      } ${highlight || ""}`}
    >
      {label}
    </Link>
  );
});

function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [orgOpen, setOrgOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("crm_sidebar_org_open") === "true";
  });

  useEffect(() => {
    localStorage.setItem("crm_sidebar_org_open", String(orgOpen));
  }, [orgOpen]);

  // Auto-expand Organization Setup when on admin organization/users pages
  useEffect(() => {
    if (
      pathname === "/admin/organization" ||
      pathname.startsWith("/admin/organization/") ||
      pathname === "/admin/users" ||
      pathname.startsWith("/admin/users/")
    ) {
      setOrgOpen(true);
    }
  }, [pathname]);

  const mainItems: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/" },
      { label: "Inventory", href: "/inventory" },
      { label: "Leads", href: "/leads" },
      { label: "Site Visits", href: "/visits" },
      { label: "Customers", href: "/customers" },
      { label: "Bookings", href: "/bookings" },
      { label: "Collections", href: "/collections" },
      {
        label: "Reports Center",
        href: "/reports",
        roles: ["SUPER_ADMIN", "MANAGER"],
        highlight: "text-green-400 font-bold",
      },
    ],
    []
  );

  const adminGroups: NavGroup[] = useMemo(
    () => [
      {
        label: "Organization Setup",
        roles: ["SUPER_ADMIN"],
        items: [
          { label: "Organization", href: "/admin/organization" },
          { label: "User Management", href: "/admin/users" },
        ],
      },
      {
        label: "Administration",
        roles: ["SUPER_ADMIN"],
        items: [
          { label: "Approvals Inbox", href: "/admin/approvals" },
          { label: "Audit Logs", href: "/admin/audit" },
          { label: "Global Settings", href: "/admin/settings", highlight: "text-purple-400 font-bold" },
        ],
      },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isOrgActive =
    pathname === "/admin/organization" ||
    pathname.startsWith("/admin/organization/") ||
    pathname === "/admin/users" ||
    pathname.startsWith("/admin/users/");

  return (
    <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col fixed inset-y-0 left-0 z-30 overflow-y-auto">
      <Link href="/" className="text-2xl font-bold mb-8 text-primary block">
        CRM
      </Link>

      <nav className="space-y-1 flex-1">
        {mainItems.map((item) =>
          item.roles && !item.roles.includes(userRole) ? null : (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(item.href)}
              highlight={item.highlight}
            />
          )
        )}

        {adminGroups.map((group) =>
          group.roles && !group.roles.includes(userRole) ? null : (
            <div key={group.label} className="pt-2">
              {group.label === "Organization Setup" ? (
                <div className="rounded hover:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrgOpen((o) => !o)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left rounded transition ${
                      isOrgActive ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{group.label}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${orgOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {orgOpen && (
                    <div className="pl-4 pr-2 pb-2 space-y-1 mt-1">
                      {group.items.map((item) => (
                        <SidebarLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          active={isActive(item.href)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(item.href)}
                      highlight={item.highlight}
                    />
                  ))}
                </>
              )}
            </div>
          )
        )}
      </nav>
    </aside>
  );
}

const Header = memo(function Header() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications"),
      ]);
      setUnreadCount(countRes.data.count);
      setNotifications(listRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <header className="flex justify-between items-center mb-8 relative">
      <h2 className="text-3xl font-bold text-gray-800">
        {pathnameLabel(user.role)}
      </h2>
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((s) => !s)}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100 relative"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-800">Notifications</h4>
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 text-sm">No notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 border-b text-sm ${
                        n.is_read ? "bg-white text-gray-600" : "bg-blue-50 text-gray-900 font-semibold"
                      }`}
                    >
                      <p>{n.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-primary hover:underline text-xs"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-right border-l pl-6">
          <p className="font-bold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-500">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
});

function pathnameLabel(role: string) {
  return role === "SUPER_ADMIN"
    ? "Global Dashboard"
    : role === "MANAGER"
    ? "Branch Dashboard"
    : "My Dashboard";
}

let clientLayoutMounted = false;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(clientLayoutMounted);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    clientLayoutMounted = true;
    setMounted(true);
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Close notification dropdown when clicking outside could be added here if needed

  if (!mounted || !accessToken || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50 flex overflow-hidden">
      <Sidebar userRole={user.role} />
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        <div className="p-8 pb-0 flex-shrink-0">
          <Header />
        </div>
        <main ref={mainRef} className="flex-1 p-8 pt-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
