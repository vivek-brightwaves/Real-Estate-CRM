"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";

export default function OrganizationPanel() {
  const [activeTab, setActiveTab] = useState("companies");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/organization/${tab}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Organization</h2>

      {/* Dropdown Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Organization Type</label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="block w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
        >
          {[
            { value: "companies", label: "Companies" },
            { value: "branches", label: "Branches" },
            { value: "projects", label: "Projects" },
          ].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end mb-4">
        <button className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition">
          + Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:text-blue-900 mr-4">Edit</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
