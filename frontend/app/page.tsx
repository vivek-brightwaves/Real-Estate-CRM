"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import api from "../lib/axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearAuth, accessToken } = useAuthStore();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
    } else {
      fetchDashboard();
      fetchNotifications();
      // Simple polling for notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [accessToken, user, router]);

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications')
      ]);
      setUnreadCount(countRes.data.count);
      setNotifications(listRes.data);
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

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      if (user?.role === "SUPER_ADMIN") {
        const res = await api.get('/dashboard/super-admin');
        setDashboardData(res.data);
      } else if (user?.role === "MANAGER") {
        const res = await api.get('/dashboard/manager');
        setDashboardData(res.data);
      } else if (user?.role === "EMPLOYEE") {
        const res = await api.get('/dashboard/employee');
        setDashboardData(res.data);
      }

      // Fetch common analytics for charts if not employee
      if (user?.role !== "EMPLOYEE") {
        const [funRes, trnRes] = await Promise.all([
          api.get('/analytics/lead-funnel'),
          api.get('/analytics/revenue-trends')
        ]);
        setFunnelData(funRes.data);
        setTrendData(trnRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM</h1>
        <nav className="space-y-4">
          <a href="/" className="block px-4 py-2 bg-slate-800 rounded">Dashboard</a>
          
          {(user.role === 'SUPER_ADMIN') && (
            <>
              <a href="/admin/organization" className="block px-4 py-2 hover:bg-slate-800 rounded">Organization Setup</a>
              <a href="/admin/approvals" className="block px-4 py-2 hover:bg-slate-800 rounded">Approvals Inbox</a>
              <a href="/admin/audit" className="block px-4 py-2 hover:bg-slate-800 rounded">Audit Logs</a>
              <a href="/admin/settings" className="block px-4 py-2 hover:bg-slate-800 rounded text-purple-400 font-bold">Global Settings</a>
            </>
          )}
          
          <a href="/inventory" className="block px-4 py-2 hover:bg-slate-800 rounded">Inventory</a>
          <a href="/leads" className="block px-4 py-2 hover:bg-slate-800 rounded">Leads</a>
          <a href="/visits" className="block px-4 py-2 hover:bg-slate-800 rounded">Site Visits</a>
          <a href="/customers" className="block px-4 py-2 hover:bg-slate-800 rounded">Customers</a>
          <a href="/bookings" className="block px-4 py-2 hover:bg-slate-800 rounded">Bookings</a>
          <a href="/collections" className="block px-4 py-2 hover:bg-slate-800 rounded">Collections</a>
          
          {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') && (
            <a href="/reports" className="block px-4 py-2 hover:bg-slate-800 rounded text-green-400 font-bold">Reports Center</a>
          )}
        </nav>
      </div>
      
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8 relative">
          <h2 className="text-3xl font-bold text-gray-800">
            {user.role === "SUPER_ADMIN" ? "Global Dashboard" : user.role === "MANAGER" ? "Branch Dashboard" : "My Dashboard"}
          </h2>
          <div className="flex items-center gap-6">
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 bg-white rounded-full shadow hover:bg-gray-100 relative"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
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
                      notifications.map((n: any) => (
                        <div key={n.id} className={`p-4 border-b text-sm ${n.is_read ? 'bg-white text-gray-600' : 'bg-blue-50 text-gray-900 font-semibold'}`}>
                          <p>{n.message}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                            {!n.is_read && (
                              <button onClick={() => markRead(n.id)} className="text-primary hover:underline text-xs">Mark read</button>
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
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            {/* SUPER ADMIN VIEW */}
            {user.role === "SUPER_ADMIN" && dashboardData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Total Revenue</p>
                    <p className="text-3xl font-black text-gray-800">₹{dashboardData.revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Pending Collection</p>
                    <p className="text-3xl font-black text-gray-800">₹{dashboardData.pending_collection.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-primary">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Today's Bookings</p>
                    <p className="text-3xl font-black text-gray-800">{dashboardData.todays_bookings}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Top Sales Agent</p>
                    <p className="text-xl font-bold text-gray-800">{dashboardData.top_employee?.name || "N/A"}</p>
                    <p className="text-sm text-gray-400">{dashboardData.top_employee?.sales || 0} Bookings</p>
                  </div>
                </div>
              </>
            )}

            {/* MANAGER VIEW */}
            {user.role === "MANAGER" && dashboardData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Branch Revenue</p>
                    <p className="text-3xl font-black text-gray-800">₹{dashboardData.branch_revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Today's Leads</p>
                    <p className="text-3xl font-black text-gray-800">{dashboardData.todays_leads}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-primary">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Today's Visits</p>
                    <p className="text-3xl font-black text-gray-800">{dashboardData.todays_visits}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
                    <p className="text-gray-500 text-sm font-bold uppercase mb-1">Pending Follow-ups</p>
                    <p className="text-3xl font-black text-gray-800">{dashboardData.pending_followups}</p>
                  </div>
                </div>
              </>
            )}

            {/* EMPLOYEE VIEW */}
            {user.role === "EMPLOYEE" && dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                  <p className="text-gray-500 text-sm font-bold uppercase mb-1">My Active Leads</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData.my_active_leads}</p>
                  <p className="text-sm text-gray-400">out of {dashboardData.my_leads} total</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-primary">
                  <p className="text-gray-500 text-sm font-bold uppercase mb-1">My Visits Today</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData.my_todays_visits}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                  <p className="text-gray-500 text-sm font-bold uppercase mb-1">My Confirmed Sales</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData.my_sales}</p>
                </div>
              </div>
            )}

            {/* Charts for Admins & Managers */}
            {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Lead Funnel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Lead Pipeline</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue Trends */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Trends (Last 6 Months)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
