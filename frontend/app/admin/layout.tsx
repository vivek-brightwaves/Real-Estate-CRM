"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const updateClock = () => setCurrentTime(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!accessToken) {
      router.push("/login");
    } else if (user && user.role !== "SUPER_ADMIN") {
      router.push("/"); // Redirect non-admins to main dashboard
    } else {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [accessToken, user, router]);

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications")
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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {
      // Local credentials still need to be cleared if the server session expired.
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "MANAGER":
        return "Branch Manager";
      case "EMPLOYEE":
        return "Sales Agent";
      default:
        return role;
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Organization Setup", href: "/admin/organization", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" },
    { name: "User Management", href: "/admin/users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  ];

  const handleNavClick = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  if (!mounted || !accessToken || !user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="h-screen overflow-hidden w-full flex bg-[#F5F8FF] dark:bg-background font-sans selection:bg-blue-600 selection:text-white">
      
      {/* ============================================================ */}
      {/* LEFT FIXED SIDEBAR                                           */}
      {/* ============================================================ */}
      <aside 
        className={`fixed left-0 top-0 h-screen hidden md:flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white shrink-0 border-r border-slate-800 transition-all duration-300 z-30 overflow-hidden ${
          isSidebarCollapsed ? "w-20" : "w-[250px]"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/85">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-650 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                CRM <span className="text-blue-500">Dashboard</span>
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Unified Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.name === "Dashboard" && pathname === "/");
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 group ${
                  isActive 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-650 text-white shadow-md shadow-blue-600/10" 
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                }`}
                title={item.name}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </div>

        {/* User Profile Section at the bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 border border-slate-700/50 shadow-inner">
              {user.name.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] text-slate-400 truncate mt-0.5">{getRoleLabel(user.role)}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button 
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-400 hover:text-rose-350 transition-colors shrink-0"
                title="Logout Session"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE DRAWER SIDEBAR                                        */}
      {/* ============================================================ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80vw] bg-slate-900 text-white p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-extrabold tracking-tight text-white">CRM <span className="text-blue-500">Dashboard</span></span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded bg-slate-850 hover:bg-slate-800">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-850"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONTENT AREA WRAPPER                                         */}
      {/* ============================================================ */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${
        isSidebarCollapsed ? "md:pl-20" : "md:pl-[250px]"
      }`}>
        
        {/* Top Header */}
        <header className="sticky top-0 z-50 w-full h-[64px] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-border px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 md:hidden rounded-lg hover:bg-hover text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            
            <div className="flex flex-col">
              <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight leading-none">
                Good Afternoon, {getRoleLabel(user.role)} 👋
              </h2>
              <span className="hidden sm:inline text-[10px] text-muted-foreground font-semibold mt-1">
                CRM Admin Console - Manage organizational settings.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-xl text-foreground text-xs font-semibold shadow-sm">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {currentTime?.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }) ?? "Loading current time..."}
              </span>
            </div>

            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 bg-card hover:bg-hover rounded-xl text-foreground border border-border relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white px-1 leading-none">{unreadCount}</span>
                )}
              </button>
            </div>

            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-3 border-l border-border focus:outline-none">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-650 text-white flex items-center justify-center font-extrabold text-sm border border-border">
                  {user.name.charAt(0)}
                </div>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-xl border border-border z-50 py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-bold text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{user.role}</p>
                  </div>
                  <button
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-t border-border font-bold disabled:opacity-60"
                  >
                    {isLoggingOut ? "Ending session..." : "Logout Session"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Master Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <main className="flex-1 overflow-y-auto p-8 bg-[#F5F8FF] dark:bg-background relative overflow-x-hidden">
            
            {/* Background Layer 2: Soft Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F8FF] via-blue-50/30 to-indigo-50/20 dark:from-background dark:via-blue-950/10 dark:to-indigo-950/10 pointer-events-none" />

            {/* Background Layer 3: Top Right Blurred Blue Glow */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-blue-400/8 rounded-full blur-[140px] pointer-events-none" />

            {/* Background Layer 4: Bottom Left Blurred Indigo Glow */}
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/6 rounded-full blur-[180px] pointer-events-none" />

            {/* Background Layer 5: Subtle grid texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e8edf7_1px,transparent_1px),linear-gradient(to_bottom,#e8edf7_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.05] pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10">
              {children}
            </div>

          </main>
        </div>

      </div>

    </div>
  );
}
