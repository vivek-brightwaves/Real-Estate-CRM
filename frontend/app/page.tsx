"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import api from "../lib/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchDashboard();
  }, [accessToken, user, router]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      if (user?.role === "SUPER_ADMIN") {
        const res = await api.get("/dashboard/super-admin");
        setDashboardData(res.data);
      } else if (user?.role === "MANAGER") {
        const res = await api.get("/dashboard/manager");
        setDashboardData(res.data);
      } else if (user?.role === "EMPLOYEE") {
        const res = await api.get("/dashboard/employee");
        setDashboardData(res.data);
      }

      if (user?.role !== "EMPLOYEE") {
        const [funRes, trnRes] = await Promise.all([
          api.get("/analytics/lead-funnel"),
          api.get("/analytics/revenue-trends"),
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

  if (!user) return null;

  if (loading) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      {/* SUPER ADMIN VIEW */}
      {user.role === "SUPER_ADMIN" && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      )}

      {/* MANAGER VIEW */}
      {user.role === "MANAGER" && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      )}

      {/* EMPLOYEE VIEW */}
      {user.role === "EMPLOYEE" && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
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
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
