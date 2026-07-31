"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useAuthStore } from "../../../store/authStore";
import { useFeedback } from "../../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../../hooks/useSectionSearch";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  branch_id?: number;
  manager_id?: number;
  is_active: boolean;
  created_at?: string;
  role_profiles?: RoleProfile[];
}

interface Branch {
  id: number;
  name: string;
}

interface RoleProfile {
  id: number;
  name: string;
  description?: string;
  base_role: string;
}

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Organization Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "PARTNER", label: "Partner Manager" },
  { value: "BROKER", label: "Broker / Channel Partner" },
  { value: "CUSTOMER", label: "Customer / Tenant" },
];

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { confirmAction, notify } = useFeedback();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Existing state logic
  const [roleFilter, setRoleFilter] = useState("");

  // Client-side filtering states to support requested filters
  const [searchQuery, setSearchQuery] = useState("");
  useSectionSearch("users", setSearchQuery);
  const [statusFilter, setStatusFilter] = useState(""); // "active", "inactive", ""
  const [branchFilter, setBranchFilter] = useState(""); // branchId or ""

  // Edit modal state
  const [editUser, setEditUser] = useState<User | null>(null);

  // Reset password modal state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // View profile modal state
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "EMPLOYEE",
    role_profile_id: "",
    branch_id: "",
  });
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    base_role: "EMPLOYEE",
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchRoleProfiles();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = roleFilter ? `/users?role=${roleFilter}` : `/users`;
      const res = await api.get(url);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/organization/branches");
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserStatus = async (user: User) => {
    const action = user.is_active ? "deactivate" : "activate";
    const confirmed = await confirmAction({
      title: `${user.is_active ? "Deactivate" : "Activate"} user?`,
      message: `${user.name}'s account will be ${action}d.`,
      confirmLabel: user.is_active ? "Deactivate user" : "Activate user",
      tone: user.is_active ? "danger" : "primary",
    });
    if (!confirmed) return;
    try {
      await api.put(`/users/${user.id}/deactivate`);
      notify({
        title: `User ${action}d`,
        message: `${user.name}'s access has been updated.`,
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to update user status");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      await api.put(`/users/${editUser.id}`, {
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone,
        branch_id: editUser.branch_id,
        manager_id: editUser.manager_id,
      });
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update user");
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;

    try {
      await api.put(`/users/${resetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      setResetUser(null);
      setNewPassword("");
      alert("Password reset successfully");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to reset password");
    }
  };

  const managers = users.filter(
    (u) => u.role === "MANAGER" || u.role === "SUPER_ADMIN"
  );

  // Client-side filtering logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "active" ? u.is_active : !u.is_active);
    const matchesBranch =
      branchFilter === "" || u.branch_id === Number(branchFilter);
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Calculate statistics metrics
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const managersCount = users.filter(
    (u) => u.role === "MANAGER" || u.role === "SUPER_ADMIN"
  ).length;
  const employeesCount = users.filter((u) => u.role === "EMPLOYEE").length;

  const resetAllFilters = () => {
    setRoleFilter("");
    setSearchQuery("");
    setStatusFilter("");
    setBranchFilter("");
  };

  const fetchRoleProfiles = async () => {
    try {
      const res = await api.get("/users/roles");
      setRoleProfiles(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post("/users", {
        ...newUser,
        phone: newUser.phone || null,
        role_profile_id: newUser.role_profile_id
          ? Number(newUser.role_profile_id)
          : null,
        branch_id: newUser.branch_id ? Number(newUser.branch_id) : null,
      });
      setShowCreateUser(false);
      setNewUser({ name: "", email: "", phone: "", password: "", role: "EMPLOYEE", role_profile_id: "", branch_id: "" });
      await fetchUsers();
      notify({
        title: "User created",
        message: "The account and documented role profile are ready.",
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || "Unable to create user");
    }
  };

  const createRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post("/users/roles", newRole);
      setShowCreateRole(false);
      setNewRole({ name: "", description: "", base_role: "EMPLOYEE" });
      await fetchRoleProfiles();
      notify({
        title: "Role profile created",
        message: "The new business role is available when adding users.",
      });
    } catch (err: any) {
      notify({
        title: "Unable to create role",
        message: err.response?.data?.detail || "Please check the role details.",
        tone: "error",
      });
    }
  };

  const exportUsers = () => {
    const rows = [
      ["Name", "Email", "Phone", "Role", "Branch", "Active"],
      ...filteredUsers.map((user) => [
        user.name,
        user.email,
        user.phone ?? "",
        user.role,
        user.branch_id ?? "",
        user.is_active,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-settings-entrance relative pb-12">
      {/* Radial decorative gradients */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-blue-500/5 blur-[90px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-purple-500/5 blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
        <div>
          <h2 className="text-[36px] font-black text-slate-900 tracking-tight leading-none">User Management</h2>
          <p className="text-[16px] text-slate-500 mt-1.5 font-medium">Configure users, roles, assignments, and activation status.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowCreateRole(true)}
            className="inline-flex h-[46px] items-center justify-center rounded-full border border-indigo-200 bg-white px-5 text-xs font-black text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50"
          >
            + Add Role
          </button>
          <button
            type="button"
            onClick={() => setShowCreateUser(true)}
            className="relative overflow-hidden group inline-flex items-center justify-center gap-2 px-6 h-[46px] bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 text-white rounded-full text-xs font-black shadow-md shadow-purple-500/15 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <span className="relative z-10">+ Add User</span>
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        
        {/* Total Users Card */}
        <div className="relative overflow-hidden bg-white border border-[#E7EEF8] rounded-[22px] p-5 shadow-[0_12px_35px_rgba(37,99,235,.08)] hover:shadow-[0_18px_45px_rgba(37,99,235,.14)] transition-all duration-350 hover:-translate-y-1 group flex justify-between items-center bg-gradient-to-br from-white to-slate-50/20">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{totalUsersCount}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                +4.5%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">trend</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {/* Sparkline Graph */}
            <svg className="w-14 h-6 text-blue-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,20 Q15,5 35,22 T70,8 T100,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="relative overflow-hidden bg-white border border-[#E7EEF8] rounded-[22px] p-5 shadow-[0_12px_35px_rgba(37,99,235,.08)] hover:shadow-[0_18px_45px_rgba(37,99,235,.14)] transition-all duration-350 hover:-translate-y-1 group flex justify-between items-center bg-gradient-to-br from-white to-slate-50/20">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Active Users</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{activeUsersCount}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                +3.2%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">active</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Sparkline Graph */}
            <svg className="w-14 h-6 text-emerald-550" viewBox="0 0 100 30" fill="none">
              <path d="M0,15 Q20,25 40,5 T80,18 T100,10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Managers Card */}
        <div className="relative overflow-hidden bg-white border border-[#E7EEF8] rounded-[22px] p-5 shadow-[0_12px_35px_rgba(37,99,235,.08)] hover:shadow-[0_18px_45px_rgba(37,99,235,.14)] transition-all duration-350 hover:-translate-y-1 group flex justify-between items-center bg-gradient-to-br from-white to-slate-50/20">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Managers</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{managersCount}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                +1.8%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">managers</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            {/* Sparkline Graph */}
            <svg className="w-14 h-6 text-purple-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,10 Q30,12 50,25 T90,5 T100,15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Employees Card */}
        <div className="relative overflow-hidden bg-white border border-[#E7EEF8] rounded-[22px] p-5 shadow-[0_12px_35px_rgba(37,99,235,.08)] hover:shadow-[0_18px_45px_rgba(37,99,235,.14)] transition-all duration-350 hover:-translate-y-1 group flex justify-between items-center bg-gradient-to-br from-white to-slate-50/20">
          <div className="space-y-1">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Employees</span>
            <h4 className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{employeesCount}</h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                +5.4%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">agents</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {/* Sparkline Graph */}
            <svg className="w-14 h-6 text-amber-550" viewBox="0 0 100 30" fill="none">
              <path d="M0,5 Q15,28 45,10 T80,22 T100,5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* FILTER CARD */}
      <div className="bg-white border border-[#E7EEF8] rounded-[24px] p-5 shadow-[0_12px_35px_rgba(37,99,235,.08)] relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Role Filter */}
          <div className="relative flex-1 min-w-[160px] group/select">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-10 pointer-events-none">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5" />
              </svg>
            </span>
            <select
              className="w-full h-11 pl-10 pr-8 bg-slate-50 border border-[#E7EEF8] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="user-search"
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-[#E7EEF8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 min-w-[150px] group/select">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-10 pointer-events-none">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <select
              className="w-full h-11 pl-10 pr-8 bg-slate-50 border border-[#E7EEF8] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Department / Branch Filter */}
          <div className="relative flex-1 min-w-[170px] group/select">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-10 pointer-events-none">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </span>
            <select
              className="w-full h-11 pl-10 pr-8 bg-slate-50 border border-[#E7EEF8] rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Reset Filters button */}
          <button
            onClick={resetAllFilters}
            className="h-11 px-4.5 bg-slate-100 hover:bg-slate-200 border border-[#E7EEF8] rounded-xl text-xs font-bold text-slate-750 hover:text-slate-900 transition-all duration-200 cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            Reset Filters
          </button>

        </div>
      </div>

      {/* USER TABLE CARD */}
      <div className="bg-white border border-[#E7EEF8] rounded-[24px] shadow-[0_12px_35px_rgba(37,99,235,.08)] overflow-hidden relative z-10 hover:shadow-[0_18px_45px_rgba(37,99,235,.14)] transition-all duration-300">
        
        {/* Table Directory Header */}
        <div className="p-6 border-b border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-[14px] uppercase font-bold tracking-wider text-slate-800">Users Directory</h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage all platform users and permissions.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => document.getElementById("user-search")?.focus()} aria-label="Focus user search" className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition duration-200 shadow-sm border border-slate-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            <button type="button" onClick={resetAllFilters} aria-label="Reset user filters" className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition duration-200 shadow-sm border border-slate-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>
            <button type="button" onClick={exportUsers} aria-label="Export users" className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition duration-200 shadow-sm border border-slate-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          </div>
        </div>

        {/* Data list table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            Syncing platform users...
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200/50 text-[13px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 w-[28%]">Name & Email</th>
                  <th className="px-6 py-4 w-[22%]">Branch Layout</th>
                  <th className="px-6 py-4 w-[16%]">System Role</th>
                  <th className="px-6 py-4 w-[16%]">Status</th>
                  <th className="px-6 py-4 w-[18%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[15px]">
                {filteredUsers.map((u) => {
                  const initial = u.name.charAt(0).toUpperCase();
                  const branchName = branches.find((b) => b.id === u.branch_id)?.name || "No Branch assigned";

                  return (
                    <tr key={u.id} className="hover:bg-[#F7FAFF] transition-colors group h-[70px] border-b border-slate-100 last:border-0">
                      
                      {/* Avatar & Info */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 border border-blue-500/15 text-blue-600 flex items-center justify-center text-sm font-black shadow-inner">
                            {initial}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-[14px] group-hover:text-blue-600 transition-colors">
                              {u.name}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold mt-0.5">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Branch column */}
                      <td className="px-6 py-3 text-[14px] text-slate-500 font-semibold">
                        {branchName}
                      </td>

                      {/* Role Pill badges */}
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            u.role === "SUPER_ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : u.role === "MANAGER"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-slate-50 text-slate-650 border-slate-200"
                          }`}
                        >
                          {u.role.replace("_", " ")}
                        </span>
                        {u.role_profiles?.[0] && (
                          <p className="mt-1 max-w-[180px] truncate text-[10px] font-bold text-slate-500">
                            {u.role_profiles[0].name}
                          </p>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => setViewUser(u)}
                            title="View profile"
                            className="w-10 h-10 rounded-xl border border-slate-100 hover:border-blue-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditUser(u)}
                            title="Edit user"
                            className="w-10 h-10 rounded-xl border border-slate-100 hover:border-blue-100 text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => setResetUser(u)}
                            title="Reset password"
                            className="w-10 h-10 rounded-xl border border-slate-100 hover:border-amber-100 text-amber-600 hover:text-amber-800 hover:bg-amber-50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </button>

                          {/* Toggle status deactivation button */}
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u)}
                            disabled={currentUser?.id === u.id}
                            title={currentUser?.id === u.id ? "Cannot deactivate your own account" : (u.is_active ? "Deactivate user" : "Activate user")}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
                              currentUser?.id === u.id
                                ? "text-gray-300 border-slate-50 bg-slate-50/10 cursor-not-allowed"
                                : u.is_active
                                ? "text-rose-600 border-transparent hover:border-rose-100 hover:bg-rose-50"
                                : "text-emerald-600 border-transparent hover:border-emerald-100 hover:bg-emerald-50"
                            }`}
                          >
                            {u.is_active ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty State visual */}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <div className="py-12 text-center flex flex-col items-center justify-center animate-settings-tab-fade">
                        <div className="w-40 h-40 mb-4 text-slate-350">
                          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full mx-auto opacity-80">
                            <circle cx="100" cy="100" r="80" fill="url(#grad)" opacity="0.1" />
                            <circle cx="100" cy="85" r="28" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5" />
                            <path d="M60 145c0-18 16-30 40-30s40 12 40 30" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5" />
                            <circle cx="140" cy="140" r="22" fill="#2563EB" opacity="0.95" className="animate-bounce" style={{ animationDuration: '3s' }} />
                            <path d="M135 140h10M140 135v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#7C3AED" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-800">No Users Found</h4>
                        <p className="text-xs text-slate-500 mt-1.5 max-w-sm font-medium">
                          Try changing filters or create a new user.
                        </p>
                        <button type="button" onClick={() => setShowCreateUser(true)} className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2 bg-gradient-to-r from-blue-600 to-purple-650 text-white rounded-full text-xs font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                          + Add User
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with pagination */}
        {!loading && filteredUsers.length > 0 && (
          <div className="p-4 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/20">
            <span className="text-[12px] text-slate-400 font-bold">
              Showing 1 - {filteredUsers.length} of {users.length} Users
            </span>
            <span className="text-[11px] font-semibold text-slate-500">All matching users are shown</span>
          </div>
        )}
      </div>

      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={createUser} className="w-full max-w-lg space-y-4 rounded-[24px] border border-white/40 bg-white p-6 shadow-2xl">
            <h3 className="border-b border-slate-100 pb-3 text-lg font-black text-slate-900">Add User</h3>
            <input required value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Full name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="Email" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input value={newUser.phone} onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })} placeholder="Phone" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input required type="password" minLength={8} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Strong temporary password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <label className="block space-y-1.5 text-xs font-bold text-slate-600">
              Business role from the specification
              <select
                required
                value={newUser.role_profile_id}
                onChange={(event) => {
                  const profile = roleProfiles.find(
                    (item) => item.id === Number(event.target.value),
                  );
                  setNewUser({
                    ...newUser,
                    role_profile_id: event.target.value,
                    role: profile?.base_role ?? "EMPLOYEE",
                  });
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">Select documented role</option>
                {roleProfiles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.base_role.replaceAll("_", " ")})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label="System access level"
                value={newUser.role}
                disabled={Boolean(newUser.role_profile_id)}
                onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              >
                {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <select value={newUser.branch_id} onChange={(event) => setNewUser({ ...newUser, branch_id: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <option value="">No branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowCreateUser(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white">Create User</button>
            </div>
          </form>
        </div>
      )}

      {showCreateRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/40 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Role</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Business roles map to a secure system access level. The catalogue below includes every primary role from the attached specification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRole(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close role dialog"
              >
                {"\u00d7"}
              </button>
            </div>

            <form onSubmit={createRole} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
              <input
                required
                value={newRole.name}
                onChange={(event) => setNewRole({ ...newRole, name: event.target.value })}
                placeholder="Custom business role name"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <select
                value={newRole.base_role}
                onChange={(event) => setNewRole({ ...newRole, base_role: event.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    Base access: {role.label}
                  </option>
                ))}
              </select>
              <textarea
                value={newRole.description}
                onChange={(event) => setNewRole({ ...newRole, description: event.target.value })}
                placeholder="Responsibilities and scope"
                className="min-h-20 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
              />
              <div className="flex justify-end md:col-span-2">
                <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white">
                  Save Role
                </button>
              </div>
            </form>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {roleProfiles.map((role) => (
                <div key={role.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-slate-800">{role.name}</p>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black text-indigo-700">
                      {role.base_role.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {role.description || "Custom organization role profile."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL OVERLAY */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-settings-tab-fade">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-[24px] shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" />
            <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight border-b border-slate-100 pb-2">Edit User Details</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Name</label>
                <div className="relative group/input">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    required
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <div className="relative group/input">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                <div className="relative group/input">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={editUser.phone || ""}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Branch / Office</label>
                <div className="relative group/select">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-10 pointer-events-none">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
                    </svg>
                  </span>
                  <select
                    value={editUser.branch_id || ""}
                    onChange={(e) =>
                      setEditUser({
                        ...editUser,
                        branch_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full h-12 pl-10 pr-8 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">No Branch assigned</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Manager Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Supervisor / Manager</label>
                <div className="relative group/select">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-10 pointer-events-none">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <select
                    value={editUser.manager_id || ""}
                    onChange={(e) =>
                      setEditUser({
                        ...editUser,
                        manager_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full h-12 pl-10 pr-8 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">No Manager assigned</option>
                    {managers
                      .filter((m) => m.id !== editUser.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role.replace("_", " ")})
                        </option>
                      ))}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl shadow-md text-xs font-bold hover:opacity-95 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL OVERLAY */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-settings-tab-fade">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-[24px] shadow-2xl w-full max-w-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
            <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Set a new password for <strong>{resetUser.name}</strong>.
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                <div className="relative group/input">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setResetUser(null);
                    setNewPassword("");
                  }}
                  className="px-4.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-md text-xs font-bold hover:opacity-95 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  Update Password
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL OVERLAY */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-settings-tab-fade">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-[24px] shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" />
            
            {/* Header info card */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-150">
              <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-500/15 to-purple-500/15 border border-blue-500/20 text-blue-600 flex items-center justify-center text-xl font-black shadow-md">
                {viewUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{viewUser.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">{viewUser.email}</p>
              </div>
            </div>

            {/* Profile fields list */}
            <div className="space-y-3 text-xs">
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User ID</span>
                <span className="font-extrabold text-slate-800">#{viewUser.id}</span>
              </div>
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</span>
                <span className="font-extrabold text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {viewUser.role.replace("_", " ")}
                </span>
              </div>
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                <span className="font-bold text-slate-800">{viewUser.phone || "N/A"}</span>
              </div>
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</span>
                <span className="font-bold text-slate-800">
                  {branches.find((b) => b.id === viewUser.branch_id)?.name || "N/A"}
                </span>
              </div>
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager</span>
                <span className="font-bold text-slate-800">
                  {users.find((u) => u.id === viewUser.manager_id)?.name || "N/A"}
                </span>
              </div>
              
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <span className={`font-bold ${viewUser.is_active ? "text-emerald-600" : "text-rose-600"}`}>
                  {viewUser.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              
              <div className="flex justify-between pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created At</span>
                <span className="font-bold text-slate-850">
                  {viewUser.created_at ? new Date(viewUser.created_at).toLocaleString() : "N/A"}
                </span>
              </div>
              
            </div>

            {/* Modal actions */}
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-650 text-xs font-bold shadow-sm cursor-pointer"
              >
                Close Profile
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
