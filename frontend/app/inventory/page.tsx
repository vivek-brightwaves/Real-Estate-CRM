"use client";

import { useState, useEffect, useRef } from "react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatsCard from "../../components/dashboard/StatsCard";
import PageHeader from "../../components/ui/PageHeader";
import { useFeedback } from "../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../hooks/useSectionSearch";

interface Unit {
  id: string;
  unit_number: string;
  floor: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "HOLD";
  area: number;
  price: number;
  agent: string;
}

interface Floor {
  id: string;
  name: string;
  units: Unit[];
}

interface Tower {
  id: string;
  name: string;
  floors: Floor[];
}

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  totalTowers: number;
  completion: number;
  towers: Tower[];
}

export default function InventoryPage() {
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();
  const { notify, requestText } = useFeedback();
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const demoModeAvailable =
    process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Production always starts with persisted backend data. Demo data is opt-in.
  const [useDemoData, setUseDemoData] = useState(demoModeAvailable);
  const [liveProjects, setLiveProjects] = useState<Project[]>([]);

  // Tree toggle states
  const [expandedNodes, setExpandedNodes] = useState<string[]>(["proj-a", "tower-a", "floor-1"]);
  const [selectedNode, setSelectedNode] = useState<{ type: "project" | "tower" | "floor" | "unit"; id: string; data: any }>({
    type: "project",
    id: "proj-a",
    data: {
      id: "proj-a",
      name: "Project A",
      location: "Premium Downtown Sector 15",
      status: "Under Construction",
      totalTowers: 2,
      completion: 75,
    }
  });

  // Table parameters
  const [searchTerm, setSearchTerm] = useState("");
  useSectionSearch("inventory", setSearchTerm);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const unitsPerPage = 5;

  // Add modals states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLoc, setNewProjectLoc] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("Under Construction");
  const [newProjectCompletion, setNewProjectCompletion] = useState(75);

  const [showTowerModal, setShowTowerModal] = useState(false);
  const [newTowerName, setNewTowerName] = useState("");

  const [showFloorModal, setShowFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitArea, setNewUnitArea] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newUnitStatus, setNewUnitStatus] = useState<"AVAILABLE" | "BOOKED" | "BLOCKED" | "HOLD">("AVAILABLE");
  const [newUnitAgent, setNewUnitAgent] = useState("");

  // Sparkline data matching stats cards
  const sparkData = {
    projects: [{ value: 6 }, { value: 8 }, { value: 7 }, { value: 10 }, { value: 9 }, { value: 12 }],
    available: [{ value: 200 }, { value: 220 }, { value: 215 }, { value: 235 }, { value: 240 }, { value: 245 }],
    booked: [{ value: 50 }, { value: 62 }, { value: 68 }, { value: 74 }, { value: 80 }, { value: 82 }],
    revenue: [{ value: 120 }, { value: 210 }, { value: 180 }, { value: 340 }, { value: 390 }, { value: 480 }],
  };

  // Pre-populated demo projects matching the exact requested path tree: Project A -> Tower A -> Floor 1 -> 101, 102, 103, Tower B; Project B
  const [demoProjects, setDemoProjects] = useState<Project[]>([
    {
      id: "proj-a",
      name: "Project A",
      location: "Premium Downtown Sector 15",
      status: "Under Construction",
      totalTowers: 2,
      completion: 75,
      towers: [
        {
          id: "tower-a",
          name: "Tower A",
          floors: [
            {
              id: "floor-1",
              name: "Floor 1",
              units: [
                { id: "101", unit_number: "101", floor: "Floor 1", status: "AVAILABLE", area: 1250, price: 6500000, agent: "Sarah Connor" },
                { id: "102", unit_number: "102", floor: "Floor 1", status: "BOOKED", area: 1400, price: 7200000, agent: "John Doe" },
                { id: "103", unit_number: "103", floor: "Floor 1", status: "HOLD", area: 1100, price: 5800000, agent: "James Smith" }
              ]
            }
          ]
        },
        {
          id: "tower-b",
          name: "Tower B",
          floors: []
        }
      ]
    },
    {
      id: "proj-b",
      name: "Project B",
      location: "Riverside Meadows Boulevard",
      status: "Planning",
      totalTowers: 1,
      completion: 15,
      towers: []
    }
  ]);

  const projectsToDisplay = useDemoData ? demoProjects : liveProjects;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("action") === "project") {
      setShowProjectModal(true);
    }
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchInventory();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken, router]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/projects");
      setLiveProjects(res.data || []);
      if (res.data && res.data.length > 0) {
        setUseDemoData(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications"),
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

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const openBulkUpload = () => {
    if (selectedNode.type !== "floor" || !selectedNode.id) {
      alert("Select a floor in the inventory tree before uploading units.");
      return;
    }
    if (useDemoData) {
      alert("Switch to Live Data before importing units.");
      return;
    }
    bulkInputRef.current?.click();
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = (await file.text())
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (rows.length < 2) {
        throw new Error("CSV must contain a header and at least one unit.");
      }
      const headers = rows[0].split(",").map((value) => value.trim().toLowerCase());
      const requiredIndex = headers.indexOf("unit_number");
      if (requiredIndex < 0) {
        throw new Error("CSV header must include unit_number.");
      }
      const fieldIndex = (field: string) => headers.indexOf(field);
      const units = rows.slice(1).map((line, rowIndex) => {
        const values = line.split(",").map((value) => value.trim());
        const unitNumber = values[requiredIndex];
        if (!unitNumber) throw new Error(`Missing unit_number on row ${rowIndex + 2}.`);
        const areaValue = values[fieldIndex("area")];
        const priceValue = values[fieldIndex("price")];
        return {
          block_id: Number(selectedNode.id),
          unit_number: unitNumber,
          type: values[fieldIndex("type")] || null,
          area: areaValue ? Number(areaValue) : null,
          price: priceValue ? Number(priceValue) : null,
        };
      });
      await api.post("/inventory/units/bulk", units);
      alert(`${units.length} units imported successfully.`);
      await fetchInventory();
    } catch (requestError: any) {
      alert(
        requestError.response?.data?.error?.message ||
        requestError.response?.data?.detail ||
        requestError.message ||
        "Unable to import units.",
      );
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Extract all units for the bottom table & circular statistics
  const getAllUnits = (): (Unit & { projectName: string; towerName: string; floorName: string })[] => {
    const list: any[] = [];
    projectsToDisplay.forEach((p: Project) => {
      p.towers.forEach((t: Tower) => {
        t.floors.forEach((f: Floor) => {
          f.units.forEach((u: Unit) => {
            list.push({
              ...u,
              projectName: p.name,
              towerName: t.name,
              floorName: f.name
            });
          });
        });
      });
    });
    return list;
  };

  const allUnits = getAllUnits();

  // Unit pricing update triggered by table or side cards
  const handlePriceUpdate = async (unitId: string, newPrice: number) => {
    try {
      if (useDemoData) {
        setDemoProjects(prev =>
          prev.map(p => ({
            ...p,
            towers: p.towers.map(t => ({
              ...t,
              floors: t.floors.map(f => ({
                ...f,
                units: f.units.map(u => (u.id === unitId ? { ...u, price: newPrice } : u))
              }))
            }))
          }))
        );
        if (selectedNode.type === "unit" && selectedNode.id === unitId) {
          setSelectedNode(prev => ({
            ...prev,
            data: { ...prev.data, price: newPrice }
          }));
        }
        alert("Demo Unit Price Updated successfully!");
      } else {
        await api.patch(`/inventory/units/${unitId}/price`, { price: newPrice });
        alert("Price updated successfully.");
        fetchInventory();
      }
    } catch (err) {
      alert("Error updating price.");
    }
  };

  // Hold Unit action
  const handleHold = async (unitId: string) => {
    try {
      if (useDemoData) {
        setDemoProjects(prev =>
          prev.map(p => ({
            ...p,
            towers: p.towers.map(t => ({
              ...t,
              floors: t.floors.map(f => ({
                ...f,
                units: f.units.map(u => (u.id === unitId ? { ...u, status: "HOLD" } : u))
              }))
            }))
          }))
        );
        if (selectedNode.type === "unit" && selectedNode.id === unitId) {
          setSelectedNode(prev => ({
            ...prev,
            data: { ...prev.data, status: "HOLD" }
          }));
        }
        alert("Unit placed on hold.");
      } else {
        await api.post(`/inventory/units/${unitId}/hold`);
        alert("Unit placed on hold for 24h.");
        fetchInventory();
      }
    } catch (err) {
      alert("Error holding unit");
    }
  };

  // Release hold action
  const handleRelease = async (unitId: string) => {
    try {
      if (useDemoData) {
        setDemoProjects(prev =>
          prev.map(p => ({
            ...p,
            towers: p.towers.map(t => ({
              ...t,
              floors: t.floors.map(f => ({
                ...f,
                units: f.units.map(u => (u.id === unitId ? { ...u, status: "AVAILABLE" } : u))
              }))
            }))
          }))
        );
        if (selectedNode.type === "unit" && selectedNode.id === unitId) {
          setSelectedNode(prev => ({
            ...prev,
            data: { ...prev.data, status: "AVAILABLE" }
          }));
        }
        alert("Unit hold released.");
      } else {
        await api.post(`/inventory/units/${unitId}/release-hold`);
        alert("Unit hold released.");
        fetchInventory();
      }
    } catch (err) {
      alert("Error releasing unit");
    }
  };

  // Creation Triggers
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    const newProjObj: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectName,
      location: newProjectLoc || "Unspecified Location",
      status: newProjectStatus,
      totalTowers: 0,
      completion: Number(newProjectCompletion) || 0,
      towers: []
    };
    if (useDemoData) {
      setDemoProjects(prev => [...prev, newProjObj]);
    } else {
      setLiveProjects(prev => [...prev, newProjObj]);
    }
    alert("New project created successfully!");
    setShowProjectModal(false);
    setNewProjectName("");
    setNewProjectLoc("");
  };

  const handleCreateTower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTowerName) return;
    if (selectedNode.type !== "project") {
      alert("Please select a project in the tree first.");
      return;
    }
    const newTowerObj: Tower = {
      id: `tower-${Date.now()}`,
      name: newTowerName,
      floors: []
    };
    const updateProjects = (list: Project[]) =>
      list.map(p =>
        p.id === selectedNode.id
          ? { ...p, totalTowers: p.totalTowers + 1, towers: [...p.towers, newTowerObj] }
          : p
      );
    if (useDemoData) {
      setDemoProjects(updateProjects);
    } else {
      setLiveProjects(updateProjects);
    }
    alert("Tower added successfully!");
    setShowTowerModal(false);
    setNewTowerName("");
    // Re-select project node to sync counts
    const updatedProj = (useDemoData ? demoProjects : liveProjects).find(p => p.id === selectedNode.id);
    if (updatedProj) {
      setSelectedNode({
        type: "project",
        id: updatedProj.id,
        data: { ...updatedProj, totalTowers: updatedProj.totalTowers + 1 }
      });
    }
  };

  const handleCreateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName) return;

    // Find parent project and selected tower
    let targetProject: Project | null = null;
    let targetTowerId = "";
    if (selectedNode.type === "tower") {
      targetTowerId = selectedNode.id;
      // Search for containing project
      projectsToDisplay.forEach((p: Project) => {
        if (p.towers.some(t => t.id === targetTowerId)) {
          targetProject = p;
        }
      });
    } else {
      alert("Please select a Tower in the tree to add a floor.");
      return;
    }

    if (!targetProject) return;

    const newFloorObj: Floor = {
      id: `floor-${Date.now()}`,
      name: newFloorName,
      units: []
    };

    const updateProjects = (list: Project[]) =>
      list.map(p => {
        if (p.id !== (targetProject as any).id) return p;
        return {
          ...p,
          towers: p.towers.map(t =>
            t.id === targetTowerId ? { ...t, floors: [...t.floors, newFloorObj] } : t
          )
        };
      });

    if (useDemoData) {
      setDemoProjects(updateProjects);
    } else {
      setLiveProjects(updateProjects);
    }
    alert("Floor added successfully!");
    setShowFloorModal(false);
    setNewFloorName("");
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber) return;

    let targetFloorId = "";
    let targetProjectId = "";
    let targetTowerId = "";

    if (selectedNode.type === "floor") {
      targetFloorId = selectedNode.id;
      projectsToDisplay.forEach((p: Project) => {
        p.towers.forEach((t: Tower) => {
          if (t.floors.some(f => f.id === targetFloorId)) {
            targetProjectId = p.id;
            targetTowerId = t.id;
          }
        });
      });
    } else {
      alert("Please select a Floor in the tree to add a unit.");
      return;
    }

    const newUnitObj: Unit = {
      id: `unit-${Date.now()}`,
      unit_number: newUnitNumber,
      floor: selectedNode.data.name,
      status: newUnitStatus,
      area: Number(newUnitArea) || 1200,
      price: Number(newUnitPrice) || 5000000,
      agent: newUnitAgent || "Sarah Connor"
    };

    const updateProjects = (list: Project[]) =>
      list.map(p => {
        if (p.id !== targetProjectId) return p;
        return {
          ...p,
          towers: p.towers.map(t => {
            if (t.id !== targetTowerId) return t;
            return {
              ...t,
              floors: t.floors.map(f =>
                f.id === targetFloorId ? { ...f, units: [...f.units, newUnitObj] } : f
              )
            };
          })
        };
      });

    if (useDemoData) {
      setDemoProjects(updateProjects);
    } else {
      setLiveProjects(updateProjects);
    }
    alert("Unit added successfully!");
    setShowUnitModal(false);
    setNewUnitNumber("");
    setNewUnitArea("");
    setNewUnitPrice("");
    setNewUnitAgent("");
  };

  // Dynamic status split counts for active display project
  const getSelectedProjectUnitsCounts = () => {
    let avail = 0;
    let booked = 0;
    let blocked = 0;
    let hold = 0;

    let currentProject: Project | null = null;
    if (selectedNode.type === "project") {
      currentProject = projectsToDisplay.find(p => p.id === selectedNode.id) || null;
    } else {
      // Trace parent project
      projectsToDisplay.forEach((p: Project) => {
        if (selectedNode.type === "tower" && p.towers.some(t => t.id === selectedNode.id)) {
          currentProject = p;
        } else if (selectedNode.type === "floor") {
          p.towers.forEach((t: Tower) => {
            if (t.floors.some(f => f.id === selectedNode.id)) {
              currentProject = p;
            }
          });
        } else if (selectedNode.type === "unit") {
          p.towers.forEach((t: Tower) => {
            t.floors.forEach((f: Floor) => {
              if (f.units.some(u => u.id === selectedNode.id)) {
                currentProject = p;
              }
            });
          });
        }
      });
    }

    if (currentProject) {
      (currentProject as Project).towers.forEach((t: Tower) => {
        t.floors.forEach((f: Floor) => {
          f.units.forEach((u: Unit) => {
            if (u.status === "AVAILABLE") avail++;
            else if (u.status === "BOOKED") booked++;
            else if (u.status === "BLOCKED") blocked++;
            else if (u.status === "HOLD") hold++;
          });
        });
      });
    }

    const total = avail + booked + blocked + hold;
    return { avail, booked, blocked, hold, total, project: currentProject };
  };

  const projectStats = getSelectedProjectUnitsCounts();

  // Pie chart variables
  const totalProjUnits = projectStats.total || 1;
  const availRingPercent = (projectStats.avail / totalProjUnits) * 100;
  const bookedRingPercent = ((projectStats.booked + projectStats.hold) / totalProjUnits) * 100;
  const blockedRingPercent = (projectStats.blocked / totalProjUnits) * 100;

  // Filter & search table units
  const filteredUnits = allUnits.filter(u => {
    const matchesSearch =
      u.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.agent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUnits.length / unitsPerPage) || 1;
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * unitsPerPage,
    currentPage * unitsPerPage
  );

  const getKPIStats = () => {
    let totalProjects = projectsToDisplay.length;
    let availUnits = 0;
    let bookedUnits = 0;

    allUnits.forEach(u => {
      if (u.status === "AVAILABLE") availUnits++;
      else if (u.status === "BOOKED") bookedUnits++;
    });

    return {
      projects: totalProjects,
      available: availUnits,
      booked: bookedUnits
    };
  };

  const kpiStats = getKPIStats();

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markRead}
      onLogout={handleLogout}
    >
      <div className="properties-page-container space-y-8 bg-gradient-to-br from-[#F5F8FC] to-[#EEF4FF] dark:from-transparent dark:to-transparent min-h-[calc(100vh-120px)] p-1 rounded-3xl">

        <PageHeader
          breadcrumb="Dashboard / Properties"
          title="Property Inventory"
          subtitle="Explore projects, towers, floors, units, availability and pricing."
          actions={
            <div className="flex flex-wrap gap-2.5 items-center">
              {demoModeAvailable && (
                <>
                  <button
                    onClick={() => setUseDemoData(!useDemoData)}
                    className={`h-10 px-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${useDemoData
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30 shadow-sm"
                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30 shadow-sm"
                      }`}
                  >
                    Mode: {useDemoData ? "Demo Data" : "Live Backend"}
                  </button>
                  <button
                    onClick={() => {
                      setDemoProjects([]);
                      setLiveProjects([]);
                      setSelectedNode({ type: "project", id: "", data: null });
                    }}
                    className="h-10 px-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-2xl text-xs font-bold transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Clear the optional demo view"
                  >
                    Clear Demo View
                  </button>
                </>
              )}
              <button
                onClick={() => setShowProjectModal(true)}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
              >
                + New Project
              </button>
              <button
                onClick={openBulkUpload}
                className="h-10 px-4 bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-border rounded-2xl text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#273449] transition-all duration-200 hover:scale-[1.02] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
              >
                Import
              </button>
              <button
                onClick={() => document.getElementById("inventory-filters")?.scrollIntoView({ behavior: "smooth" })}
                className="h-10 px-4 bg-white dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-border rounded-2xl text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#273449] transition-all duration-200 hover:scale-[1.02] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
              >
                Filter
              </button>
            </div>
          }
        />

        {/* SUMMARY CARDS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            label="Projects"
            value={kpiStats.projects}
            growth="8.4"
            isPositive={true}
            color="blue"
            sparklineData={sparkData.projects}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            }
          />
          <StatsCard
            label="Available Units"
            value={kpiStats.available}
            growth="12.1"
            isPositive={true}
            color="green"
            sparklineData={sparkData.available}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            label="Booked Units"
            value={kpiStats.booked}
            growth="5.8"
            isPositive={true}
            color="purple"
            sparklineData={sparkData.booked}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <StatsCard
            label="Revenue"
            value="₹4.8 Cr"
            growth="15.2"
            isPositive={true}
            color="orange"
            sparklineData={sparkData.revenue}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* EMPTY STATE OR MAIN LAYOUT */}
        {projectsToDisplay.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-[0_12px_40px_rgba(15,23,42,.08)] p-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="w-20 h-20 bg-blue-50/50 dark:bg-blue-950/20 rounded-full flex items-center justify-center mb-6 border border-blue-100/60 dark:border-blue-800/20 shadow-inner">
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC] tracking-tight mb-2">No active projects found</h3>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] font-semibold max-w-xs mb-6">Get started by creating your first real estate project or building pipeline units.</p>
            <button
              onClick={() => setShowProjectModal(true)}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center justify-center"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 items-start">

            {/* LEFT (70%): INVENTORY TREE CARD */}
            <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-sm p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100 dark:border-border">
                <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Inventory Tree
                </h3>
                <span className="text-[10px] text-slate-400 dark:text-[#64748B] font-bold uppercase">Click nodes to inspect details</span>
              </div>

              {/* TREE COMPONENT */}
              <div className="space-y-3 font-semibold text-xs select-none">
                {projectsToDisplay.map((proj) => {
                  const isProjSelected = selectedNode.type === "project" && selectedNode.id === proj.id;
                  const isProjExpanded = expandedNodes.includes(proj.id);
                  return (
                    <div key={proj.id} className="space-y-1">
                      {/* Project Row */}
                      <div
                        onClick={() => {
                          setSelectedNode({ type: "project", id: proj.id, data: proj });
                          toggleNode(proj.id);
                        }}
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl cursor-pointer transition-all border ${isProjSelected
                            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800/40 dark:text-blue-400 shadow-sm"
                            : "bg-slate-50/50 dark:bg-[#1E293B] hover:bg-slate-100/50 dark:hover:bg-[#273449] border-transparent dark:border-[rgba(255,255,255,0.04)] text-slate-800 dark:text-slate-200"
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🏢</span>
                          <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{proj.name}</span>
                        </span>
                        <span className="text-slate-440 dark:text-slate-500 font-bold">{isProjExpanded ? "▼" : "▲"}</span>
                      </div>

                      {/* Towers Subtree */}
                      {isProjExpanded && (
                        <div className="pl-6 border-l-2 border-slate-200/60 dark:border-border/60 ml-4 space-y-2 mt-1 py-1">
                          {proj.towers.map(tower => {
                            const isTowerSelected = selectedNode.type === "tower" && selectedNode.id === tower.id;
                            const isTowerExpanded = expandedNodes.includes(tower.id);
                            return (
                              <div key={tower.id} className="space-y-1">
                                {/* Tower Row */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNode({ type: "tower", id: tower.id, data: tower });
                                    toggleNode(tower.id);
                                  }}
                                  className={`flex justify-between items-center px-3.5 py-2 rounded-lg cursor-pointer transition-all border ${isTowerSelected
                                      ? "bg-blue-50/70 border-blue-150 text-blue-650 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-400"
                                      : "hover:bg-slate-100/40 dark:hover:bg-[#1E293B] border-transparent text-slate-700 dark:text-slate-300"
                                    }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-sm">🗼</span>
                                    <span>{tower.name}</span>
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 font-bold">{isTowerExpanded ? "▼" : "▲"}</span>
                                </div>

                                {/* Floors Subtree */}
                                {isTowerExpanded && (
                                  <div className="pl-6 border-l border-dashed border-slate-200 dark:border-border ml-3.5 space-y-2 py-1">
                                    {tower.floors.map(floor => {
                                      const isFloorSelected = selectedNode.type === "floor" && selectedNode.id === floor.id;
                                      const isFloorExpanded = expandedNodes.includes(floor.id);
                                      return (
                                        <div key={floor.id} className="space-y-1">
                                          {/* Floor Row */}
                                          <div
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedNode({ type: "floor", id: floor.id, data: floor });
                                              toggleNode(floor.id);
                                            }}
                                            className={`flex justify-between items-center px-3 py-1.5 rounded-lg cursor-pointer transition-all border ${isFloorSelected
                                                ? "bg-blue-50/50 border-blue-100 text-blue-600 dark:bg-blue-950/10 dark:border-blue-800/20 dark:text-blue-400"
                                                : "hover:bg-slate-100/30 dark:hover:bg-[#1E293B] border-transparent text-slate-655 dark:text-slate-350"
                                              }`}
                                          >
                                            <span className="flex items-center gap-2">
                                              <span className="text-slate-400">📊</span>
                                              <span>{floor.name}</span>
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500 font-bold">{isFloorExpanded ? "▼" : "▲"}</span>
                                          </div>

                                          {/* Units Grid */}
                                          {isFloorExpanded && (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-4 py-1.5">
                                              {floor.units.map(unit => {
                                                const isUnitSelected = selectedNode.type === "unit" && selectedNode.id === unit.id;
                                                const statusColors = {
                                                  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30",
                                                  BOOKED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30",
                                                  BLOCKED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30",
                                                  HOLD: "bg-amber-50 text-amber-750 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30"
                                                };
                                                return (
                                                  <div
                                                    key={unit.id}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedNode({ type: "unit", id: unit.id, data: unit });
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-lg border text-center cursor-pointer transition-all shadow-sm ${isUnitSelected
                                                        ? "ring-2 ring-blue-500 border-blue-500 font-black scale-105"
                                                        : statusColors[unit.status] || "bg-white dark:bg-[#111827] border-slate-200 dark:border-border text-slate-700 dark:text-slate-355"
                                                      }`}
                                                  >
                                                    <div className="text-[10px] uppercase font-black">{unit.unit_number}</div>
                                                    <div className="text-[8px] opacity-75 font-semibold mt-0.5">{unit.status}</div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {tower.floors.length === 0 && (
                                      <p className="text-[10px] text-slate-400 font-bold italic py-1 pl-3">No floors added</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {proj.towers.length === 0 && (
                            <p className="text-[10px] text-slate-400 font-bold italic py-1 pl-3">No towers added</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT (30%): DETAILS & QUICK ACTIONS PANELS */}
            <div className="space-y-6 w-full shrink-0">

              {/* CARD 1: PROJECT / NODE DETAILS */}
              <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-border">
                  Node Details
                </h3>

                {selectedNode.data ? (
                  <div className="space-y-4">
                    {/* Project Node Card */}
                    {selectedNode.type === "project" && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Project Name</span>
                          <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">{selectedNode.data.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Location</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedNode.data.location}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Status</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-border font-black text-[10px] text-slate-700 dark:text-slate-300 uppercase">
                            {selectedNode.data.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Total Towers</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedNode.data.totalTowers}</span>
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">
                            <span>Completion</span>
                            <span>{selectedNode.data.completion}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-[#0F172A] rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-650 h-full rounded-full transition-all duration-500"
                              style={{ width: `${selectedNode.data.completion}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Unit Node Card */}
                    {selectedNode.type === "unit" && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Unit Number</span>
                          <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">#{selectedNode.data.unit_number}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Floor Group</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedNode.data.floor}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Area Size</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedNode.data.area} Sq.Ft</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Price</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{(selectedNode.data.price / 100000).toFixed(1)} Lakhs</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Assigned Agent</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedNode.data.agent}</span>
                        </div>

                        {/* Unit Edit Price Form (SUPER ADMIN & MANAGER) */}
                        {user?.role === "SUPER_ADMIN" && (
                          <div className="pt-2">
                            <label className="block text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">Update Price (₹)</label>
                            <input
                              type="number"
                              className="w-full px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
                              defaultValue={selectedNode.data.price}
                              onBlur={(e) => handlePriceUpdate(selectedNode.data.id, Number(e.target.value))}
                            />
                          </div>
                        )}

                        {/* Interactive Hold/Release Triggers */}
                        {(user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") && (
                          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-border">
                            {selectedNode.data.status === "AVAILABLE" ? (
                              <button
                                onClick={() => handleHold(selectedNode.data.id)}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 hover:shadow-lg transition cursor-pointer"
                              >
                                Hold Unit
                              </button>
                            ) : selectedNode.data.status === "HOLD" ? (
                              <button
                                onClick={() => handleRelease(selectedNode.data.id)}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-650 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg transition cursor-pointer"
                              >
                                Release Hold
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generic Tower/Floor Fallback */}
                    {(selectedNode.type === "tower" || selectedNode.type === "floor") && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Type</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold capitalize">{selectedNode.type}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-455 dark:text-slate-500 font-bold">Name</span>
                          <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">{selectedNode.data.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-[#64748B] font-bold py-6 text-center">Select a node in the tree to show its properties.</p>
                )}
              </div>

              {/* CARD 2: AVAILABILITY CIRCULAR CHART */}
              <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-border">
                  Availability Split
                </h3>

                <div className="flex flex-col items-center">
                  {/* SVG Circular Graph */}
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" className="stroke-[#f1f5f9] dark:stroke-[#1E293B]" strokeWidth="8" fill="transparent" />
                      {/* Available segment circle */}
                      <circle
                        cx="50" cy="50" r="40"
                        stroke="#10b981" strokeWidth="8" fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * availRingPercent) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      {/* Booked segment circle */}
                      <circle
                        cx="50" cy="50" r="40"
                        stroke="#3b82f6" strokeWidth="8" fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * bookedRingPercent) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500 opacity-60"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-[10px] text-slate-400 dark:text-[#64748B] font-bold uppercase tracking-wide">Total Units</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-1">{projectStats.total}</p>
                    </div>
                  </div>

                  {/* Legends */}
                  <div className="w-full space-y-2.5 font-semibold text-xs text-slate-655 dark:text-[#94A3B8]">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-650 dark:text-[#94A3B8]">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                      <span className="text-slate-800 dark:text-[#F8FAFC] font-black">{projectStats.avail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-650 dark:text-[#94A3B8]">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Booked
                      </span>
                      <span className="text-slate-800 dark:text-[#F8FAFC] font-black">{projectStats.booked}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-slate-650 dark:text-[#94A3B8]">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Blocked
                      </span>
                      <span className="text-slate-800 dark:text-[#F8FAFC] font-black">{projectStats.blocked}</span>
                    </div>
                    {projectStats.hold > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-slate-650 dark:text-[#94A3B8]">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          On Hold
                        </span>
                        <span className="text-slate-800 dark:text-[#F8FAFC] font-black">{projectStats.hold}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 3: QUICK ACTIONS PANEL */}
              <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-border">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (selectedNode.type !== "project") {
                        alert("Please select a project node in the tree first.");
                        return;
                      }
                      setShowTowerModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 text-blue-700 dark:from-blue-950/20 dark:to-blue-950/5 dark:border-blue-900/30 dark:text-blue-400 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-955/10 text-center rounded-xl text-xs font-bold transition duration-205 shadow-sm flex flex-col items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>🗼</span> Add Tower
                  </button>
                  <button
                    onClick={() => {
                      if (selectedNode.type !== "tower") {
                        alert("Please select a Tower node in the tree first.");
                        return;
                      }
                      setShowFloorModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 text-purple-700 dark:from-purple-950/20 dark:to-purple-950/5 dark:border-purple-900/30 dark:text-purple-400 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-955/10 text-center rounded-xl text-xs font-bold transition duration-205 shadow-sm flex flex-col items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>📊</span> Add Floor
                  </button>
                  <button
                    onClick={() => {
                      if (selectedNode.type !== "floor") {
                        alert("Please select a Floor node in the tree first.");
                        return;
                      }
                      setShowUnitModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 text-emerald-700 dark:from-emerald-950/20 dark:to-emerald-950/5 dark:border-emerald-900/30 dark:text-emerald-455 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-955/10 text-center rounded-xl text-xs font-bold transition duration-205 shadow-sm flex flex-col items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>🚪</span> Add Unit
                  </button>
                  <button
                    onClick={openBulkUpload}
                    className="p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 text-orange-700 dark:from-orange-950/20 dark:to-orange-950/5 dark:border-orange-900/30 dark:text-orange-400 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-955/10 text-center rounded-xl text-xs font-bold transition duration-205 shadow-sm flex flex-col items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span>📤</span> Bulk Upload
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* BOTTOM SECTION: PREMIUM UNITS FULL-WIDTH TABLE */}
        {projectsToDisplay.length > 0 && (
          <div className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-sm p-6 mt-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-2 border-b border-slate-100 dark:border-border">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm uppercase tracking-wider">All Units Directory</h3>
                <p className="text-[10px] text-slate-450 dark:text-[#94A3B8] font-bold mt-0.5">Filter, search and execute pricing/hold overrides</p>
              </div>

              <div id="inventory-filters" className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search by Unit / Project / Agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3.5 py-2 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm w-full sm:w-60"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="HOLD">HOLD</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B]/60 border-b border-[#E8EDF7] dark:border-[#334155] text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Tower</th>
                    <th className="px-6 py-4">Floor</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Area (Sq.Ft)</th>
                    <th className="px-6 py-4">Price (₹)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Assigned Agent</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                  {paginatedUnits.map((unit) => {
                    const statusStyles = {
                      AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30",
                      BOOKED: "bg-blue-50 text-blue-755 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30",
                      BLOCKED: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30",
                      HOLD: "bg-amber-50 text-amber-750 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30"
                    };
                    return (
                      <tr
                        key={unit.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-[#1E293B]/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedNode({ type: "unit", id: unit.id, data: unit })}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-[#F8FAFC] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{unit.projectName}</td>
                        <td className="px-6 py-4 font-semibold text-slate-650 dark:text-slate-300">{unit.towerName}</td>
                        <td className="px-6 py-4 font-semibold text-slate-655 dark:text-slate-300">{unit.floorName}</td>
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">#{unit.unit_number}</td>
                        <td className="px-6 py-4 font-semibold text-slate-650 dark:text-slate-300">{unit.area}</td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">₹{(unit.price / 100000).toFixed(1)} Lakhs</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyles[unit.status]}`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{unit.agent}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-2">
                            {unit.status === "AVAILABLE" && (user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") && (
                              <button
                                onClick={() => handleHold(unit.id)}
                                className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition shadow-sm cursor-pointer"
                              >
                                Hold
                              </button>
                            )}
                            {unit.status === "HOLD" && (user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") && (
                              <button
                                onClick={() => handleRelease(unit.id)}
                                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shadow-sm cursor-pointer"
                              >
                                Release
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                const price = await requestText({
                                  title: "Update unit price",
                                  message: `Enter the revised price for unit ${unit.unit_number}.`,
                                  inputLabel: "New price (₹)",
                                  initialValue: String(unit.price),
                                  placeholder: "Enter amount",
                                  confirmLabel: "Update price",
                                });
                                if (price === null) return;
                                const amount = Number(price);
                                if (!Number.isFinite(amount) || amount <= 0) {
                                  notify({
                                    title: "Invalid price",
                                    message: "Enter a positive numeric amount.",
                                    tone: "error",
                                  });
                                  return;
                                }
                                await handlePriceUpdate(unit.id, amount);
                              }}
                              className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[#334155] rounded-lg text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-105 dark:hover:bg-[#273449] transition shadow-sm cursor-pointer"
                            >
                              Edit Price
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedUnits.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-semibold">No units found match current query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredUnits.length > 0 && (
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-border pt-6 mt-6 text-xs font-bold text-slate-455 dark:text-slate-400 uppercase">
                <span>Showing {Math.min(filteredUnits.length, (currentPage - 1) * unitsPerPage + 1)} to {Math.min(filteredUnits.length, currentPage * unitsPerPage)} of {filteredUnits.length} Units</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-slate-350 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3.5 py-2 border border-[#E8EDF7] dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] transition text-slate-700 dark:text-slate-350 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={bulkInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleBulkUpload}
          className="hidden"
          aria-label="Upload unit CSV"
        />

        {/* Create Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200 project-modal-overlay">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out project-modal-content">
              {/* Close Button in top-right corner */}
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Create New Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Project Name</label>
                  <input
                    type="text" required
                    value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Project C"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Location</label>
                  <input
                    type="text" required
                    value={newProjectLoc} onChange={(e) => setNewProjectLoc(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Sector 5, Uptown"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Status</label>
                    <select
                      value={newProjectStatus} onChange={(e) => setNewProjectStatus(e.target.value)}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8] dark:hover:border-slate-500"
                    >
                      <option value="Under Construction">Under Construction</option>
                      <option value="Planning">Planning</option>
                      <option value="Ready to Move">Ready to Move</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Completion %</label>
                    <input
                      type="number" min="0" max="100"
                      value={newProjectCompletion} onChange={(e) => setNewProjectCompletion(Number(e.target.value))}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6 project-modal-footer">
                  <button type="button" onClick={() => setShowProjectModal(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer project-cancel-btn">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer project-create-btn">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Tower Modal */}
        {showTowerModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowTowerModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Add Tower</h3>
              <form onSubmit={handleCreateTower} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Tower Name</label>
                  <input
                    type="text" required
                    value={newTowerName} onChange={(e) => setNewTowerName(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Tower C"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowTowerModal(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Add Tower</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Floor Modal */}
        {showFloorModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowFloorModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Add Floor</h3>
              <form onSubmit={handleCreateFloor} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Floor Name</label>
                  <input
                    type="text" required
                    value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Floor 2"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowFloorModal(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Add Floor</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Unit Modal */}
        {showUnitModal && (
          <div className="fixed inset-0 bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 z-50 transition-opacity duration-200">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-md p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[28px] font-bold text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">Add Unit</h3>
              <form onSubmit={handleCreateUnit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Unit Number</label>
                    <input
                      type="text" required
                      value={newUnitNumber} onChange={(e) => setNewUnitNumber(e.target.value)}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                      placeholder="e.g. 104"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Initial Status</label>
                    <select
                      value={newUnitStatus} onChange={(e: any) => setNewUnitStatus(e.target.value)}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8] dark:hover:border-slate-500"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BOOKED">BOOKED</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="HOLD">HOLD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Area Size (Sq.Ft)</label>
                    <input
                      type="number" required
                      value={newUnitArea} onChange={(e) => setNewUnitArea(e.target.value)}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                      placeholder="e.g. 1250"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Price (₹)</label>
                    <input
                      type="number" required
                      value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                      placeholder="e.g. 6500000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">Assigned Agent</label>
                  <input
                    type="text"
                    value={newUnitAgent} onChange={(e) => setNewUnitAgent(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    placeholder="e.g. Sarah Connor"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button type="button" onClick={() => setShowUnitModal(false)} className="h-11 px-5 border border-[#CBD5E1] dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer">Add Unit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
