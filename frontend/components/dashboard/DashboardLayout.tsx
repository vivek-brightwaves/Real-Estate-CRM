"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import ChangePasswordModal from "../ui/ChangePasswordModal";

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

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

  // Nav items: Dashboard, Leads, Properties, Bookings, Customers, Payments, Reports, Analytics, Tasks, Messages, Settings
  const navItems = [
    { name: "Dashboard", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Leads", href: "/leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { name: "Properties", href: "/inventory", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" },
    { name: "Bookings", href: "/bookings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    ...(user && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role) ? [
      { name: "Rentals", href: "/rentals", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4" }
    ] : []),
    { name: "Customers", href: "/customers", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: "Payments", href: "/collections", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" },
    { name: "Reports", href: "/reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Analytics", href: "/", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { name: "Tasks", href: "/tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { name: "Messages", href: "/messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { name: "Settings", href: "/admin/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  const handleNavClick = (href: string) => {
    if (href !== "#") {
      router.push(href);
    } else {
      alert(`Navigation Link selected.`);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden w-full flex bg-[#F5F8FF] dark:bg-[#0F172A] font-sans selection:bg-blue-600 selection:text-white">

      {/* ============================================================ */}
      {/* LEFT FIXED SIDEBAR                                           */}
      {/* ============================================================ */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`fixed left-0 top-0 h-screen hidden md:flex flex-col bg-white dark:bg-[#111827] text-slate-800 dark:text-white shrink-0 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 z-30 overflow-hidden ${isSidebarCollapsed ? "w-20" : "w-[250px]"
          }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-650 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                CRM <span className="text-blue-500">Dashboard</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
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
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                  ? "text-white font-semibold"
                  : "bg-transparent text-[#334155] hover:bg-[#EEF4FF] hover:text-[#2563EB] dark:text-[#CBD5E1] dark:hover:bg-slate-800/50 dark:hover:text-white"
                  }`}
                title={item.name}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#2563EB] dark:bg-gradient-to-r dark:from-[#2563EB] dark:to-[#3B82F6] rounded-xl -z-10 shadow-md shadow-blue-600/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <svg
                  className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive
                    ? "text-white"
                    : "text-[#64748B] group-hover:text-[#2563EB] dark:text-[#94A3B8] dark:group-hover:text-white"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </div>

        {/* User Profile Section at the bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-650 text-white flex items-center justify-center font-extrabold text-sm shrink-0 border border-slate-100 dark:border-slate-800/50 shadow-inner">
              {user.name.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{getRoleLabel(user.role)}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-rose-600 dark:text-rose-400 hover:text-rose-755 dark:hover:text-rose-350 transition-colors shrink-0"
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
              onClick={onLogout}
              className="mt-3 w-full flex justify-center p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-450 transition-colors"
              title="Logout Session"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </motion.aside>

      {/* ============================================================ */}
      {/* MOBILE DRAWER SIDEBAR                                        */}
      {/* ============================================================ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80vw] bg-white dark:bg-[#111827] text-slate-800 dark:text-white p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">CRM <span className="text-blue-500">Dashboard</span></span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.name === "Dashboard" && pathname === "/");
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ease-in-out group ${isActive
                      ? "bg-[#2563EB] text-white dark:bg-gradient-to-r dark:from-[#2563EB] dark:to-[#3B82F6] dark:text-white shadow-md shadow-blue-600/10 font-semibold"
                      : "bg-transparent text-[#334155] hover:bg-[#EEF4FF] hover:text-[#2563EB] dark:text-[#CBD5E1] dark:hover:bg-[#2563EB] dark:hover:text-white"
                      }`}
                  >
                    <svg
                      className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isActive
                        ? "text-white"
                        : "text-[#64748B] group-hover:text-[#2563EB] dark:text-[#94A3B8] dark:group-hover:text-white"
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
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
                <span>July 27, 2026</span>
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
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications && notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col gap-1 text-[11px] relative text-left">
                            <p className={`font-semibold text-slate-750 dark:text-slate-350 ${!n.is_read ? 'text-slate-900 dark:text-[#F8FAFC] font-bold' : ''}`}>{n.message}</p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{new Date(n.created_at).toLocaleTimeString()}</span>
                            {!n.is_read && (
                              <button
                                onClick={() => onMarkRead(n.id)}
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
              onClick={() => alert("Opening settings dashboard")}
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
                  S
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
                      onClick={onLogout}
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
        <div className="flex-1 flex flex-col min-h-0 relative">
          <main className="flex-1 overflow-y-auto pt-6 px-8 pb-8 bg-[#F5F8FF] dark:bg-background relative overflow-x-hidden">

            {/* Background Layer 2: Soft Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F8FF] via-blue-50/30 to-indigo-50/20 dark:from-background dark:via-blue-950/10 dark:to-indigo-950/10 pointer-events-none" />

            {/* Background Layer 3: Top Right Blurred Blue Glow */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-blue-400/8 dark:bg-blue-500/3 rounded-full blur-[140px] pointer-events-none" />

            {/* Background Layer 4: Bottom Left Blurred Indigo Glow */}
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/6 dark:bg-indigo-600/3 rounded-full blur-[180px] pointer-events-none" />

            {/* Background Layer 4.5: Center Cyan Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-400/8 dark:bg-cyan-500/3 rounded-full blur-[120px] pointer-events-none" />

            {/* Background Layer 5: Subtle grid texture (3-5% opacity) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e8edf7_1px,transparent_1px),linear-gradient(to_bottom,#e8edf7_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.05] dark:opacity-[0.02] pointer-events-none" />

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
