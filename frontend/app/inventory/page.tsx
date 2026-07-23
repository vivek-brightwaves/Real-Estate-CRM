"use client";

import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

export default function InventoryPage() {
  const [projects, setProjects] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  
  // States for toggling tree view
  const [expandedProjects, setExpandedProjects] = useState<number[]>([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // In a real scenario, this would fetch hierarchically or use a specialized tree endpoint.
      // For scaffold, we will simulate the tree fetch.
      const res = await api.get("/inventory/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async (unitId: number) => {
    try {
      await api.post(`/inventory/units/${unitId}/hold`);
      alert("Unit placed on hold for 24h.");
      setSelectedUnit({ ...selectedUnit, status: "HOLD" });
    } catch (err) {
      alert("Error holding unit");
    }
  };

  const handleRelease = async (unitId: number) => {
    try {
      await api.post(`/inventory/units/${unitId}/release-hold`);
      alert("Unit hold released.");
      setSelectedUnit({ ...selectedUnit, status: "AVAILABLE" });
    } catch (err) {
      alert("Error releasing unit");
    }
  };

  const handlePriceUpdate = async (unitId: number, newPrice: number) => {
    try {
      await api.patch(`/inventory/units/${unitId}/price`, { price: newPrice });
      alert("Price updated successfully.");
      setSelectedUnit({ ...selectedUnit, price: newPrice });
    } catch (err) {
      alert("Error updating price. You may lack permissions.");
    }
  };

  return (
    <div className="flex gap-8">
      {/* Tree View Main Area */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border overflow-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Inventory Tree</h2>
          
          {loading ? <p>Loading...</p> : (
            <div className="space-y-4">
              {projects.map((proj: any) => (
                <div key={proj.id} className="border p-4 rounded-lg">
                  <div 
                    className="flex justify-between items-center cursor-pointer font-bold text-lg"
                    onClick={() => setExpandedProjects(prev => 
                      prev.includes(proj.id) ? prev.filter(id => id !== proj.id) : [...prev, proj.id]
                    )}
                  >
                    <span>{proj.name}</span>
                    <span>{expandedProjects.includes(proj.id) ? "-" : "+"}</span>
                  </div>
                  
                  {expandedProjects.includes(proj.id) && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Towers will appear here...</p>
                      {/* Placeholder for actual unit click simulation */}
                      <button 
                        className="text-primary text-sm hover:underline"
                        onClick={() => setSelectedUnit({ id: 1, unit_number: "A-101", status: "AVAILABLE", price: 5000000 })}
                      >
                        Simulate Click on Unit A-101
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {projects.length === 0 && <p className="text-gray-500">No projects found.</p>}
            </div>
          )}
        </div>

        {/* Detail Drawer Slide-out */}
        {selectedUnit && (
          <div className="w-96 bg-white shadow-xl rounded-xl border p-6 flex flex-col h-full transform transition-transform">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-800">Unit {selectedUnit.unit_number}</h3>
              <button onClick={() => setSelectedUnit(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p className="font-bold text-lg">{selectedUnit.status}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Price</span>
                {user?.role === "SUPER_ADMIN" ? (
                  <input 
                    type="number"
                    className="w-full mt-1 border px-3 py-2 rounded focus:ring-primary outline-none"
                    defaultValue={selectedUnit.price}
                    onBlur={(e) => handlePriceUpdate(selectedUnit.id, Number(e.target.value))}
                  />
                ) : (
                  <p className="font-medium text-lg">₹{selectedUnit.price}</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                <p>History timeline will load here...</p>
              </div>
            </div>

            {/* Action Buttons (RBAC Enforced) */}
            {(user?.role === "MANAGER" || user?.role === "SUPER_ADMIN") && (
              <div className="pt-4 border-t space-y-3">
                {selectedUnit.status === "AVAILABLE" && (
                  <button 
                    onClick={() => handleHold(selectedUnit.id)}
                    className="w-full bg-amber-500 text-white py-2 rounded shadow hover:bg-amber-600 transition"
                  >
                    Hold Unit (24h)
                  </button>
                )}
                {selectedUnit.status === "HOLD" && (
                  <button 
                    onClick={() => handleRelease(selectedUnit.id)}
                    className="w-full bg-green-500 text-white py-2 rounded shadow hover:bg-green-600 transition"
                  >
                    Release Hold
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
  );
}
