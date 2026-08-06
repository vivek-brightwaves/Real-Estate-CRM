"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import ChangePasswordModal from "../../components/ui/ChangePasswordModal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, clearAuth } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`fixed left-0 top-0 h-screen hidden md:flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white shrink-0 border-r border-slate-800 transition-all duration-300 z-30 overflow-hidden ${isSidebarCollapsed ? "w-20" : "w-[250px]"
          }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/20">
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
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Unified Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-4">
          {/* Section 1: MAIN MENU */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-3 pt-2 pb-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Main Menu
              </div>
            )}
            {navItems.filter(item => item.href === "/").map((item) => {
              const isActive = pathname === item.href || (pathname === "/" && item.href === "/");
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                    ? "text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                    }`}
                  title={item.name}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill-admin"
                      className="absolute inset-0 bg-[#2563EB] rounded-xl -z-10 shadow-md shadow-blue-500/15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <svg className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? "text-white scale-110 ml-1" : "text-slate-400 group-hover:text-white group-hover:scale-110"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>

          {/* Section 2: ADMINISTRATION */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-3 pt-2 pb-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Administration
              </div>
            )}
            {navItems.filter(item => item.href !== "/").map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                    ? "text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                    }`}
                  title={item.name}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill-admin"
                      className="absolute inset-0 bg-[#2563EB] rounded-xl -z-10 shadow-md shadow-blue-500/15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <svg className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? "text-white scale-110 ml-1" : "text-slate-400 group-hover:text-white group-hover:scale-110"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile Section at the bottom */}
        <div className="p-4.5 pt-5 pb-5 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-650 text-white flex items-center justify-center font-extrabold text-sm shrink-0 border border-slate-700/50 shadow-inner">
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
                className="p-2 rounded-lg hover:bg-slate-800/70 text-rose-400 hover:text-rose-350 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Logout Session"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

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
            <nav className="flex-1 overflow-y-auto space-y-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.name === "Dashboard" && pathname === "/");
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      handleNavClick(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/15"
                      : "text-slate-350 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <svg className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-white" : "text-slate-450"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                    </svg>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONTENT AREA WRAPPER                                         */}
      {/* ============================================================ */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? "md:pl-20" : "md:pl-[250px]"
        }`}>

        {/* Top Header */}
        <motion.header
          initial={{ opacity: 0, y: -72 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="sticky top-0 z-50 w-full h-[72px] bg-white dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#1E293B] px-6 py-4 flex items-center justify-between shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:shadow-none transition-colors duration-300"
        >
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Calendar/Date Picker Button - 210x52px */}
            <div className="hidden lg:flex items-center justify-between w-[210px] h-[52px] px-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#1E293B] rounded-[16px] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold transition-all shadow-sm cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm">📅</span>
                <span>
                  {currentTime?.toLocaleString(undefined, {
                    dateStyle: "medium",
                  }) ?? "Loading date..."}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">▼</span>
            </div>

            {/* Notification trigger - circular 48px */}
            <div className="relative">
              <motion.button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#1E293B] rounded-full text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all focus:outline-none cursor-pointer relative"
              >
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-[#0F172A] px-1 leading-none"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.95 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.95 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ originY: 0 }}
                    className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1E293B] rounded-2xl shadow-[0_15px_40px_rgba(15,23,42,0.12)] border border-[#E5E7EB] dark:border-[#1E293B] z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-[#F8FAFC]">System Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-none">
                      {notifications && notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col gap-1 text-[11px] relative text-left">
                            <p className={`font-semibold text-slate-750 dark:text-slate-350 ${!n.is_read ? 'text-slate-900 dark:text-[#F8FAFC] font-bold' : ''}`}>{n.message}</p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{new Date(n.created_at).toLocaleTimeString()}</span>
                            {!n.is_read && (
                              <button
                                onClick={() => markRead(n.id)}
                                className="absolute right-3.5 top-3.5 px-2 py-0.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white rounded border border-blue-100 dark:border-slate-700 text-[9px] font-bold text-blue-700 dark:text-blue-400 transition-all cursor-pointer"
                              >
                                Read
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">No recent alerts found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages Button (Circular 48px with red dot in top right) */}
            <motion.button
              onClick={() => alert("Opening messages inbox panel")}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#1E293B] rounded-full text-indigo-650 dark:text-indigo-400 shadow-sm hover:shadow transition-all focus:outline-none cursor-pointer relative"
            >
              <svg className="w-5 h-5 text-blue-650 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full border border-white dark:border-[#0F172A]" />
            </motion.button>

            {/* Theme Toggle Button */}
            <motion.button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#1E293B] rounded-full text-[#94A3B8] dark:text-[#F8FAFC] shadow-sm hover:shadow transition-all focus:outline-none cursor-pointer"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={resolvedTheme}
                  initial={{ rotate: -180, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 180, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center"
                >
                  {resolvedTheme === "dark" ? (
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
                      <path fillRule="evenodd" d="M12 1a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.22 4.22a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414L4.22 5.636a1 1 0 010-1.414zm12.728 12.728a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM1 12a1 1 0 011-1h2a1 1 0 110 2H2a1 1 0 01-1-1zm16 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM5.636 19.78a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414l-1.414 1.414a1 1 0 01-1.414 0zm12.728-12.728a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414l-1.414 1.414a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Settings Button (Glass circle, rotate on hover) */}
            <motion.button
              onClick={() => router.push("/admin/settings")}
              whileHover={{ rotate: 90, scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex items-center justify-center bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#1E293B] rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-sm focus:outline-none cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-4 border-l border-[#E5E7EB] dark:border-[#1E293B] focus:outline-none group text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-650 text-white flex items-center justify-center font-extrabold text-lg border border-white dark:border-[#0F172A] shadow-md shrink-0 relative z-10">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-semibold mt-1">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-655 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.95 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.95 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ originY: 0 }}
                    className="absolute right-0 mt-3 w-52 bg-white dark:bg-[#1E293B] rounded-2xl shadow-[0_15px_40px_rgba(15,23,42,0.12)] border border-[#E5E7EB] dark:border-[#1E293B] z-50 py-1.5 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-[#E5E7EB] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-left">
                      <p className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">{user.name}</p>
                      <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">{getRoleLabel(user.role)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-800/40 font-bold transition-all cursor-pointer"
                    >
                      Change Password
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold border-t border-[#E5E7EB] dark:border-slate-800/60 transition-all cursor-pointer"
                    >
                      Logout Session
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* Master Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <main className="flex-1 overflow-y-auto pt-6 px-8 pb-8 bg-[#F5F8FF] dark:bg-background relative overflow-x-hidden">

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
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

          </main>
        </div>

      </div>

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}
