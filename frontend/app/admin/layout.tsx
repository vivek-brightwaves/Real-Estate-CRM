"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!accessToken) {
      router.push("/login");
    } else if (user && user.role !== "SUPER_ADMIN") {
      router.push("/"); // Redirect non-admins to main dashboard
    }
  }, [accessToken, user, router]);

  if (!mounted || !accessToken || (user && user.role !== "SUPER_ADMIN")) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM Admin</h1>
        <nav className="space-y-4 flex-1">
          <a href="/" className="block px-4 py-2 hover:bg-slate-800 rounded">Dashboard</a>
          <a href="/admin/organization" className="block px-4 py-2 hover:bg-slate-800 rounded">Organization Setup</a>
          <a href="/admin/users" className="block px-4 py-2 hover:bg-slate-800 rounded">User Management</a>
        </nav>
        <button 
          onClick={() => { clearAuth(); router.push("/login"); }}
          className="mt-auto px-4 py-2 text-left hover:bg-red-500 rounded text-red-300 hover:text-white transition"
        >
          Logout
        </button>
      </div>
      
      {/* Admin Content */}
      <div className="flex-1 p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}
