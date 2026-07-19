"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM</h1>
        <nav className="space-y-4">
          <a href="/" className="block px-4 py-2 hover:bg-slate-800 rounded">Dashboard</a>
          <a href="/leads" className="block px-4 py-2 hover:bg-slate-800 rounded">Leads</a>
          <a href="/customers" className="block px-4 py-2 bg-slate-800 rounded">Customers</a>
          <a href="/inventory" className="block px-4 py-2 hover:bg-slate-800 rounded">Inventory</a>
          <a href="/visits" className="block px-4 py-2 hover:bg-slate-800 rounded">Site Visits</a>
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Customers</h2>

        {loading ? <p>Loading...</p> : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-bold text-gray-600">ID</th>
                  <th className="p-4 font-bold text-gray-600">Name</th>
                  <th className="p-4 font-bold text-gray-600">Phone</th>
                  <th className="p-4 font-bold text-gray-600">Email</th>
                  <th className="p-4 font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-gray-500">#{c.id}</td>
                    <td className="p-4 font-bold text-gray-800">{c.name}</td>
                    <td className="p-4 text-gray-600">{c.phone || "-"}</td>
                    <td className="p-4 text-gray-600">{c.email || "-"}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => router.push(`/customers/${c.id}`)}
                        className="text-primary font-bold hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No customers found. Convert a lead to see them here.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
