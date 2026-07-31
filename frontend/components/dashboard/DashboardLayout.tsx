"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "../../lib/axios";

interface UserType {
  name: string;
  role: string;
}

interface NotificationItem {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: UserType;
  unreadCount: number;
  notifications: NotificationItem[];
  onMarkRead: (id: number) => void;
  onLogout: () => void;
}

const searchContexts = [
  { prefix: "/leads", section: "leads", href: "/leads", placeholder: "Search leads..." },
  { prefix: "/customers", section: "customers", href: "/customers", placeholder: "Search customers..." },
  { prefix: "/inventory", section: "inventory", href: "/inventory", placeholder: "Search properties or units..." },
  { prefix: "/bookings", section: "bookings", href: "/bookings", placeholder: "Search bookings..." },
  { prefix: "/collections", section: "payments", href: "/collections", placeholder: "Search payments..." },
  { prefix: "/tasks", section: "tasks", href: "/tasks", placeholder: "Search tasks..." },
  { prefix: "/messages", section: "messages", href: "/messages", placeholder: "Search messages..." },
  { prefix: "/admin/users", section: "users", href: "/admin/users", placeholder: "Search users..." },
];

export default function DashboardLayout({
  children,
  user,
  unreadCount,
  notifications,
  onMarkRead,
  onLogout,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchContext = searchContexts.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );

  useEffect(() => {
    const updateClock = () => setCurrentTime(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setDashboardSearch(
      new URLSearchParams(window.location.search).get("search") ?? "",
    );
  }, [pathname]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "ADMIN":
        return "Organization Admin";
      case "MANAGER":
        return "Branch Manager";
      case "EMPLOYEE":
        return "Sales Agent";
      case "PARTNER":
        return "Channel Partner Manager";
      case "BROKER":
        return "Broker / Channel Partner";
      case "CUSTOMER":
        return "Customer";
      default:
        return role;
    }
  };

  // Analytics are already presented on the dashboard.
  const navItems = [
    { name: "Dashboard", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Leads", href: "/leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { name: "Properties", href: "/inventory", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" },
    { name: "Bookings", href: "/bookings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { name: "Customers", href: "/customers", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: "Payments", href: "/collections", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" },
    { name: "Reports", href: "/reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Tasks", href: "/tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { name: "Messages", href: "/messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { name: "Settings", href: "/admin/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  const handleNavClick = (href: string) => {
    if (href !== "#") {
      router.push(href);
    }
    setIsMobileMenuOpen(false);
  };

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {
      // Always clear local credentials when the server session already expired.
    } finally {
      onLogout();
    }
  };

  return (
    <div className="h-screen overflow-hidden w-full flex bg-[#F5F8FF] font-sans selection:bg-blue-600 selection:text-white">
      
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
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));
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
                onClick={() => void performLogout()}
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
          {isSidebarCollapsed && (
            <button 
              onClick={() => void performLogout()}
              disabled={isLoggingOut}
              className="mt-3 w-full flex justify-center p-2 rounded-lg hover:bg-rose-500/10 text-rose-450 transition-colors"
              title="Logout Session"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
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
        <header className="sticky top-0 z-50 w-full h-[76px] bg-white/75 backdrop-blur-[18px] border-b border-white/60 px-6 flex items-center justify-between shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 md:hidden rounded-lg hover:bg-slate-100 text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            
            {/* Minimal workspace breadcrumb / label */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Dashboard Overview</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-blue-600">Overview</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Large Rounded Search Input */}
            {searchContext && <form
              className="relative hidden md:block"
              onSubmit={(event) => {
                event.preventDefault();
                const query = dashboardSearch.trim();
                const target = query
                  ? `${searchContext.href}?search=${encodeURIComponent(query)}`
                  : searchContext.href;
                router.push(target);
                window.dispatchEvent(
                  new CustomEvent(`crm:search:${searchContext.section}`, {
                    detail: query,
                  }),
                );
              }}
            >
              <input
                type="text"
                placeholder={searchContext.placeholder}
                value={dashboardSearch}
                onChange={(event) => setDashboardSearch(event.target.value)}
                aria-label={searchContext.placeholder}
                className="h-[48px] w-60 pl-10 pr-10 bg-slate-50/40 border border-[#E8EDF7] rounded-[16px] text-slate-800 placeholder:text-slate-450 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-650/10 focus:border-blue-600 shadow-sm transition-all"
              />
              <button
                type="submit"
                aria-label={`Submit ${searchContext.section} search`}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </button>
              {dashboardSearch && (
                <button
                  type="button"
                  onClick={() => setDashboardSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg leading-none text-slate-400 transition hover:text-slate-700"
                >
                  {"\u00d7"}
                </button>
              )}
            </form>}

            {/* Live local date and time */}
            <div
              className="hidden lg:flex items-center gap-3 h-[48px] px-4 bg-white border border-[#E8EDF7] rounded-[16px] text-slate-700 text-xs font-bold shadow-sm select-none"
              aria-live="off"
              title="Current local date and time"
            >
              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <div className="leading-tight">
                <span className="block">
                  {currentTime
                    ? currentTime.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Loading date"}
                </span>
                <span className="mt-0.5 block text-[10px] tabular-nums text-blue-600">
                  {currentTime
                    ? currentTime.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "--:--:--"}
                </span>
              </div>
            </div>

            {/* Notification trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                className="w-12 h-12 flex items-center justify-center bg-white border border-[#E8EDF7] rounded-full text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-[0_10px_20px_rgba(37,99,235,0.2)] hover:-translate-y-[3px] hover:scale-[1.05] relative group"
              >
                <svg className={`w-5 h-5 ${unreadCount > 0 ? "animate-bell-shake" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white px-1 leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_15px_40px_rgba(15,23,42,0.12)] border border-[#E8EDF7] z-50 overflow-hidden animate-header-load">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs font-extrabold text-slate-800">System Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications && notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col gap-1 text-[11px] relative">
                          <p className={`font-semibold text-slate-700 ${!n.is_read ? 'text-slate-900 font-bold' : ''}`}>{n.message}</p>
                          <span className="text-[9px] text-slate-400 font-semibold">{new Date(n.created_at).toLocaleTimeString()}</span>
                          {!n.is_read && (
                            <button 
                              onClick={() => onMarkRead(n.id)}
                              className="absolute right-3.5 top-3.5 px-2 py-0.5 bg-blue-50 hover:bg-blue-600 hover:text-white rounded border border-blue-100 text-[9px] font-bold text-blue-700 transition-all"
                            >
                              Read
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs font-semibold">No recent alerts found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => router.push("/messages")}
              aria-label="Open messages"
              className="w-12 h-12 flex items-center justify-center bg-white border border-[#E8EDF7] rounded-full text-indigo-600 hover:bg-indigo-650 hover:text-white hover:border-indigo-650 transition-all duration-300 shadow-sm hover:shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:-translate-y-[3px] hover:scale-[1.05] relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            </button>

            <button 
              onClick={() => router.push("/admin/settings")}
              className="w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-md border border-[#E8EDF7] rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 transition-all duration-300 shadow-sm hover:-translate-y-[3px] hover:scale-[1.05] group"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-[15deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                className="flex items-center gap-3 pl-3 border-l border-slate-200 focus:outline-none group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-650 text-white flex items-center justify-center font-extrabold text-sm border border-white/80 shadow-md shrink-0 animate-avatar-pulse relative z-10">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-bold text-slate-800 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-[0_15px_40px_rgba(15,23,42,0.12)] border border-[#E8EDF7] z-50 py-1.5 overflow-hidden animate-header-load">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-extrabold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-450 font-semibold mt-0.5">{user.role}</p>
                  </div>
                  <button 
                    onClick={() => void performLogout()}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-bold border-t border-slate-100/60 transition-all"
                  >
                    {isLoggingOut ? "Ending session..." : "Logout Session"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Master Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <main className="flex-1 overflow-y-auto p-8 bg-[#F5F8FF] relative overflow-x-hidden">
            
            {/* Background Layer 2: Soft Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F8FF] via-blue-50/30 to-indigo-50/20 pointer-events-none" />

            {/* Background Layer 3: Top Right Blurred Blue Glow */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-blue-400/8 rounded-full blur-[140px] pointer-events-none" />

            {/* Background Layer 4: Bottom Left Blurred Indigo Glow */}
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/6 rounded-full blur-[180px] pointer-events-none" />

            {/* Background Layer 4.5: Center Cyan Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-400/8 rounded-full blur-[120px] pointer-events-none" />

            {/* Background Layer 5: Subtle grid texture (3-5% opacity) */}
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
