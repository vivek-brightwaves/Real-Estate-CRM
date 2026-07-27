"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

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
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const pathname = usePathname();

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

  // Sidebar items requested: Dashboard, Leads, Customers, Inventory, Bookings, Payments, Analytics, Reports, Employees, Settings, Logout
  const navItems = [
    { name: "Dashboard", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Leads", href: "/leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { name: "Customers", href: "/customers", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: "Inventory", href: "/inventory", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "Bookings", href: "/bookings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { name: "Payments", href: "/collections", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" },
  ];

  const adminItems = [
    { name: "Analytics", href: "/", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { name: "Reports Center", href: "/reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Employees Setup", href: "/admin/organization", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m24 0v-2a4 4 0 00-3-3.87m-4-12a4 4 0 11-8 0 4 4 0 018 0zM9 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { name: "Global Settings", href: "/admin/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  const handleNavClick = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden w-full flex bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white">
      
      {/* ============================================================ */}
      {/* LEFT COLLAPSIBLE SIDEBAR                                     */}
      {/* ============================================================ */}
      <aside 
        className={`fixed left-0 top-0 h-screen hidden md:flex flex-col bg-slate-900 text-white shrink-0 border-r border-slate-800 transition-all duration-300 z-30 overflow-hidden ${
          isSidebarCollapsed ? "w-20" : "w-[250px]"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-base font-extrabold tracking-tight text-white white-space-nowrap">
                RealEstate<span className="text-blue-500">CRM</span>
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-hidden p-4 space-y-2.5">
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Main Menu</p>
            )}
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all group ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                  title={item.name}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-3">
            {!isSidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Administrative</p>
            )}
            {adminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all group ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                  title={item.name}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Log out button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold rounded-xl text-sm transition-all`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && <span>Logout Panel</span>}
          </button>
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
              <span className="text-lg font-extrabold tracking-tight">RealEstate<span className="text-blue-500">CRM</span></span>
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
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 w-full h-[64px] bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 md:hidden rounded-lg hover:bg-slate-100 text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 tracking-wide">
              <span className="text-slate-400 font-medium">CRM</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-extrabold">
                {pathname === "/leads" 
                  ? "Leads Board" 
                  : pathname === "/customers" 
                    ? "Customers" 
                    : pathname === "/inventory" 
                      ? "Inventory" 
                      : pathname === "/bookings" 
                        ? "Bookings" 
                        : pathname === "/reports" 
                          ? "Reports" 
                          : pathname === "/collections" 
                            ? "Payments" 
                            : "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Global search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 lg:w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* Notification triggers */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200/40 relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white px-1 leading-none">{unreadCount}</span>
                )}
              </button>
            </div>

            {/* User Profile */}
            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-3 border-l border-slate-200 focus:outline-none">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm border border-slate-200">
                  {user.name.charAt(0)}
                </div>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/85 z-50 py-1">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user.role}</p>
                  </div>
                  <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100 font-bold">Logout Session</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Master Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
            {children}
          </main>
        </div>

      </div>

    </div>
  );
}
