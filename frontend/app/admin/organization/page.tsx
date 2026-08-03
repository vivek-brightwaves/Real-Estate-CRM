"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import { getApiErrorMessage } from "../../../lib/errors";
import { useFeedback } from "../../../components/ui/FeedbackProvider";
import PageHeader from "../../../components/ui/PageHeader";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const sparkData = {
  companies: [
    { value: 12 },
    { value: 15 },
    { value: 13 },
    { value: 17 },
    { value: 18 },
    { value: 20 },
    { value: 22 },
  ],
  branches: [
    { value: 30 },
    { value: 28 },
    { value: 32 },
    { value: 35 },
    { value: 33 },
    { value: 38 },
    { value: 40 },
  ],
  projects: [
    { value: 50 },
    { value: 55 },
    { value: 53 },
    { value: 58 },
    { value: 62 },
    { value: 65 },
    { value: 68 },
  ],
};

type EntityType = "companies" | "branches" | "projects";
type ModalMode = "create" | "view" | "edit" | null;

type OrganizationEntity = {
  id: number;
  name: string;
  company_id?: number;
  branch_id?: number;
  logo_url?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
};

type FormState = {
  name: string;
  company_id: string;
  branch_id: string;
  logo_url: string;
  location: string;
  description: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  company_id: "",
  branch_id: "",
  logo_url: "",
  location: "",
  description: "",
  status: "ACTIVE",
};

const LABELS: Record<EntityType, { singular: string; plural: string }> = {
  companies: { singular: "Company", plural: "Companies" },
  branches: { singular: "Branch", plural: "Branches" },
  projects: { singular: "Project", plural: "Projects" },
};

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function OrganizationPage() {
  const { confirmAction, notify } = useFeedback();
  const [activeTab, setActiveTab] = useState<EntityType>("companies");
  const [data, setData] = useState<OrganizationEntity[]>([]);
  const [companies, setCompanies] = useState<OrganizationEntity[]>([]);
  const [branches, setBranches] = useState<OrganizationEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<OrganizationEntity | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fetchReferenceData = useCallback(async () => {
    const [companyResponse, branchResponse] = await Promise.all([
      api.get("/organization/companies", { params: { size: 200 } }),
      api.get("/organization/branches", { params: { size: 200 } }),
    ]);
    setCompanies(companyResponse.data);
    setBranches(branchResponse.data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/organization/${activeTab}`, {
        params: { size: 200 },
      });
      setData(response.data);
      await fetchReferenceData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load organization data."));
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchReferenceData]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) =>
      [item.name, item.location, item.status].some((value) =>
        String(value ?? "").toLowerCase().includes(term),
      ),
    );
  }, [data, searchQuery]);

  const openCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalMode("create");
  };

  const openEntity = (item: OrganizationEntity, mode: "view" | "edit") => {
    setSelected(item);
    setForm({
      name: item.name,
      company_id: item.company_id?.toString() ?? "",
      branch_id: item.branch_id?.toString() ?? "",
      logo_url: item.logo_url ?? "",
      location: item.location ?? "",
      description: item.description ?? "",
      status: item.status ?? "ACTIVE",
    });
    setError("");
    setModalMode(mode);
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setSelected(null);
    setForm(EMPTY_FORM);
  };

  const buildPayload = () => {
    if (activeTab === "companies") {
      return {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || null,
      };
    }
    if (activeTab === "branches") {
      return {
        name: form.name.trim(),
        company_id: Number(form.company_id),
      };
    }
    return {
      name: form.name.trim(),
      branch_id: Number(form.branch_id),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      status: form.status.trim() || null,
    };
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (activeTab === "branches" && !form.company_id) {
      setError("Company is required.");
      return;
    }
    if (activeTab === "projects" && !form.branch_id) {
      setError("Branch is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modalMode === "edit" && selected) {
        await api.patch(`/organization/${activeTab}/${selected.id}`, buildPayload());
        setSuccess(`${LABELS[activeTab].singular} updated.`);
        notify({
          title: `${LABELS[activeTab].singular} updated`,
          message: `${form.name.trim()} was saved successfully.`,
        });
      } else {
        await api.post(`/organization/${activeTab}`, buildPayload());
        setSuccess(`${LABELS[activeTab].singular} created.`);
        notify({
          title: `${LABELS[activeTab].singular} created`,
          message: `${form.name.trim()} is now available.`,
        });
      }
      closeModal();
      await fetchData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save this record."));
    } finally {
      setSaving(false);
    }
  };

  const deleteEntity = async (item: OrganizationEntity) => {
    const confirmed = await confirmAction({
      title: `Delete ${LABELS[activeTab].singular.toLowerCase()}?`,
      message: `${item.name} will be permanently removed. This action cannot be undone.`,
      confirmLabel: `Delete ${LABELS[activeTab].singular.toLowerCase()}`,
      tone: "danger",
    });
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/organization/${activeTab}/${item.id}`);
      setSuccess(`${LABELS[activeTab].singular} deleted.`);
      notify({
        title: `${LABELS[activeTab].singular} deleted`,
        message: `${item.name} was removed.`,
      });
      await fetchData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete this record."));
    }
  };

  const exportCsv = () => {
    const rows = [
      ["ID", "Name", "Parent ID", "Location", "Status"],
      ...filteredData.map((item) => [
        item.id,
        item.name,
        item.company_id ?? item.branch_id ?? "",
        item.location ?? "",
        item.status ?? "",
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeTab}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parentLabel = (item: OrganizationEntity) => {
    if (activeTab === "branches") {
      return companies.find((company) => company.id === item.company_id)?.name ?? "—";
    }
    if (activeTab === "projects") {
      return branches.find((branch) => branch.id === item.branch_id)?.name ?? "—";
    }
    return "—";
  };

  return (
    <div className="max-w-5xl space-y-6 bg-gradient-to-br from-[#F8FAFF] via-[#EEF5FF] to-[#F7FAFC] dark:from-transparent dark:to-transparent min-h-[calc(100vh-120px)] p-1 rounded-3xl relative overflow-visible">

      {/* Soft header background mesh gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.05),transparent_70%)] pointer-events-none" />

      <PageHeader
        breadcrumb="Dashboard / Administration / Organization Setup"
        title="Organization Setup"
        subtitle="Manage companies, branches and projects."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center shrink-0 cursor-pointer"
          >
            + Add {LABELS[activeTab].singular}
          </button>
        }
      />

      {(error || success) && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm relative z-10 font-bold ${error
              ? "border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
              : "border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
            }`}
        >
          {error || success}
        </div>
      )}

      {/* STATISTICS CARDS GRID */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 relative z-10">
        {(["companies", "branches", "projects"] as EntityType[]).map((type) => {
          const count =
            type === activeTab
              ? data.length
              : type === "companies"
                ? companies.length
                : type === "branches"
                  ? branches.length
                  : 0;

          const isSelected = activeTab === type;

          const config = {
            companies: {
              color: "#3b82f6",
              icon: "🏢",
              bg: "bg-blue-500",
              lightBg: "bg-blue-50 dark:bg-blue-950/30",
              textColor: "text-blue-500",
              gradientId: "companiesGrad",
              trend: "↑ 12.4%",
            },
            branches: {
              color: "#10b981",
              icon: "📍",
              bg: "bg-emerald-500",
              lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
              textColor: "text-emerald-500",
              gradientId: "branchesGrad",
              trend: "↑ 8.2%",
            },
            projects: {
              color: "#f97316",
              icon: "📁",
              bg: "bg-orange-500",
              lightBg: "bg-orange-50 dark:bg-orange-950/30",
              textColor: "text-orange-500",
              gradientId: "projectsGrad",
              trend: "↑ 5.7%",
            },
          }[type];

          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveTab(type);
                setSearchQuery("");
                setSuccess("");
              }}
              className={`text-left transition-all duration-300 relative flex flex-col justify-between overflow-hidden rounded-[22px] p-5 shadow-sm border h-44 cursor-pointer focus:outline-none ${isSelected
                  ? "bg-white dark:bg-[#1E293B] border-blue-500 dark:border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20"
                  : "bg-white dark:bg-[#1E293B] border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] hover:border-slate-350 dark:hover:border-slate-700"
                }`}
            >
              {/* Colored top border accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${config.bg}`} />

              <div className="flex w-full justify-between items-start pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest block">
                    {LABELS[type].plural}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight block">
                    {count}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl ${config.textColor} ${config.lightBg} border border-slate-100/50 dark:border-border/10 shadow-sm`}>
                  <span className="text-lg">{config.icon}</span>
                </div>
              </div>

              <div className="flex w-full items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${type === "projects" ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-100/60 dark:border-orange-900/30" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100/60 dark:border-emerald-900/30"}`}>
                    {config.trend}
                  </span>
                  <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">MoM</span>
                </div>

                {/* Mini trend sparkline graph */}
                <div className="w-24 h-8 overflow-hidden rounded-lg shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData[type]}>
                      <defs>
                        <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={config.color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={config.color} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} fillOpacity={1} fill={`url(#${config.gradientId})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* COMPANY DIRECTORY */}
      <section className="bg-white dark:bg-[#111827] border border-[#E8EDF7] dark:border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-sm p-6 relative z-10 overflow-hidden">

        {/* DIRECTORY HEADER & FILTERS BAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-border">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base tracking-tight uppercase tracking-wider">{LABELS[activeTab].plural}</h2>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-semibold mt-1">Manage company records, branches and internal organizational nodes</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
            <input
              id="organization-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${LABELS[activeTab].plural.toLowerCase()}...`}
              className="h-12 w-full sm:w-72 px-3.5 py-2.5 bg-white dark:bg-[#0F172A] border border-[#E8EDF7] dark:border-[#334155] rounded-xl text-slate-700 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => document.getElementById("organization-search")?.focus()}
              className="h-12 px-4 py-2.5 bg-slate-50 dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#273449] rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredData.length}
              title={!filteredData.length ? "No data available to export" : "Export current list to CSV"}
              className="h-12 px-4 py-2.5 bg-slate-50 dark:bg-[#1E293B] border border-[#E8EDF7] dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#273449] rounded-xl transition shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50 disabled:dark:hover:bg-[#1E293B] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6 animate-pulse">
            {/* Table headers skeleton */}
            <div className="grid grid-cols-6 gap-4 pb-4 border-b border-slate-100 dark:border-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded col-span-1" />
              ))}
            </div>
            {/* Table rows skeleton */}
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-4 py-4 border-b border-slate-50 dark:border-border/50">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded col-span-1" />
                <div className="h-4 bg-slate-150 dark:bg-slate-850 rounded col-span-2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded col-span-1" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded col-span-1" />
                <div className="h-4 bg-slate-150 dark:bg-slate-800 rounded col-span-1 text-right" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="px-6 py-12 text-center flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-50/65 dark:bg-[#0F172A] rounded-2xl border border-dashed border-slate-200 dark:border-[rgba(255,255,255,0.08)] max-w-md w-full mx-auto my-2 animate-fade-in shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500 mb-6 shadow-sm shadow-blue-500/5">
                <span className="text-3xl">🏢</span>
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white mb-2">No {LABELS[activeTab].plural} Found</h4>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-xs mb-6 font-medium leading-relaxed">Create your first {LABELS[activeTab].singular.toLowerCase()} to start building your organization hierarchy.</p>
              <button
                type="button"
                onClick={openCreate}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-600 transition-all text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
              >
                + Add {LABELS[activeTab].singular}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="sticky top-0 bg-slate-50/60 dark:bg-[#1E293B] border-b border-[#E8EDF7] dark:border-border text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider z-10">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Parent</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF7] dark:divide-border text-sm">
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-[#273449] transition-all group rounded-xl cursor-pointer"
                    onClick={() => openEntity(item, "view")}
                  >
                    <td className="px-6 py-4 text-slate-500 dark:text-[#94A3B8] font-semibold text-xs">#{item.id}</td>
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-455 transition-colors">{item.name}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-[#CBD5E1] font-medium">{parentLabel(item)}</td>
                    <td className="px-6 py-4 text-slate-655 dark:text-[#CBD5E1] font-semibold">
                      <span className="flex items-center gap-1">
                        📍 {item.location || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${item.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                          : item.status === "PLANNING"
                            ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                            : item.status === "ON_HOLD"
                              ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30"
                              : "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/30"
                        }`}>
                        {item.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEntity(item, "view")}
                          className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-blue-650 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          👁 View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEntity(item, "edit")}
                          className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          ✏ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEntity(item)}
                          className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-700 dark:text-rose-455 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] p-4 transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`${modalMode} ${LABELS[activeTab].singular}`}
        >
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-border rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-lg p-8 relative overflow-hidden text-left max-h-[90vh] overflow-y-auto transform scale-100 translate-y-0 transition-all duration-250 ease-out">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all duration-200 cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[28px] font-bold capitalize text-[#0F172A] dark:text-[#F8FAFC] border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 leading-none">
              {modalMode} {LABELS[activeTab].singular}
            </h2>

            {modalMode === "view" && selected ? (
              <dl className="space-y-4 text-xs">
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-border pb-3">
                    <dt className="font-bold capitalize text-[#64748B] dark:text-[#94A3B8]">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="col-span-2 break-words text-slate-900 dark:text-white font-semibold">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <form className="space-y-5" onSubmit={submitForm}>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                    Name
                  </label>
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                  />
                </div>

                {activeTab === "companies" && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      maxLength={255}
                      value={form.logo_url}
                      onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                    />
                  </div>
                )}

                {activeTab === "branches" && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                      Company
                    </label>
                    <select
                      required
                      value={form.company_id}
                      onChange={(event) => setForm({ ...form, company_id: event.target.value })}
                      className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8] dark:hover:border-slate-500"
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === "projects" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                        Branch
                      </label>
                      <select
                        required
                        value={form.branch_id}
                        onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                        className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8] dark:hover:border-slate-500"
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                        Location
                      </label>
                      <input
                        maxLength={255}
                        value={form.location}
                        onChange={(event) => setForm({ ...form, location: event.target.value })}
                        className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                        Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="w-full h-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8] dark:hover:border-slate-500"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PLANNING">Planning</option>
                        <option value="ON_HOLD">On hold</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] dark:text-slate-350 mb-2">
                        Description
                      </label>
                      <textarea
                        maxLength={1000}
                        rows={4}
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm min-h-[100px] resize-none"
                      />
                    </div>
                  </>
                )}

                {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-11 px-5 border border-[#CBD5E1] rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#94A3B8] transition-all duration-200 text-[#334155] dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
