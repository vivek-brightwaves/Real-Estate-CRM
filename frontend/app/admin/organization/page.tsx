"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import { getApiErrorMessage } from "../../../lib/errors";
import { useFeedback } from "../../../components/ui/FeedbackProvider";

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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Organization Setup
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage companies, branches, and projects.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
        >
          + Add {LABELS[activeTab].singular}
        </button>
      </div>

      {(error || success) && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["companies", "branches", "projects"] as EntityType[]).map((type) => {
          const count =
            type === activeTab
              ? data.length
              : type === "companies"
                ? companies.length
                : type === "branches"
                  ? branches.length
                  : "View";
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveTab(type);
                setSearchQuery("");
                setSuccess("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                activeTab === type
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {LABELS[type].plural}
              </span>
              <span className="mt-2 block text-2xl font-black text-slate-900">{count}</span>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">{LABELS[activeTab].plural}</h2>
            <p className="text-xs text-slate-500">{filteredData.length} matching records</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="organization-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${LABELS[activeTab].plural.toLowerCase()}...`}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => document.getElementById("organization-search")?.focus()}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredData.length}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading…</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-bold text-slate-800">No records found</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              + Add {LABELS[activeTab].singular}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-500">#{item.id}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-5 py-4 text-slate-600">{parentLabel(item)}</td>
                    <td className="px-5 py-4 text-slate-600">{item.location || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{item.status || "Active"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEntity(item, "view")}
                          className="rounded-lg px-3 py-2 font-bold text-blue-600 hover:bg-blue-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEntity(item, "edit")}
                          className="rounded-lg px-3 py-2 font-bold text-amber-600 hover:bg-amber-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEntity(item)}
                          className="rounded-lg px-3 py-2 font-bold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${modalMode} ${LABELS[activeTab].singular}`}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black capitalize text-slate-900">
                {modalMode} {LABELS[activeTab].singular}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {modalMode === "view" && selected ? (
              <dl className="mt-6 space-y-4 text-sm">
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-3">
                    <dt className="font-bold capitalize text-slate-500">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="col-span-2 break-words text-slate-900">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submitForm}>
                <label className="block text-sm font-bold text-slate-700">
                  Name
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                  />
                </label>

                {activeTab === "companies" && (
                  <label className="block text-sm font-bold text-slate-700">
                    Logo URL
                    <input
                      type="url"
                      maxLength={255}
                      value={form.logo_url}
                      onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                    />
                  </label>
                )}

                {activeTab === "branches" && (
                  <label className="block text-sm font-bold text-slate-700">
                    Company
                    <select
                      required
                      value={form.company_id}
                      onChange={(event) => setForm({ ...form, company_id: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {activeTab === "projects" && (
                  <>
                    <label className="block text-sm font-bold text-slate-700">
                      Branch
                      <select
                        required
                        value={form.branch_id}
                        onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-bold text-slate-700">
                      Location
                      <input
                        maxLength={255}
                        value={form.location}
                        onChange={(event) => setForm({ ...form, location: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">
                      Status
                      <select
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PLANNING">Planning</option>
                        <option value="ON_HOLD">On hold</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </label>
                    <label className="block text-sm font-bold text-slate-700">
                      Description
                      <textarea
                        maxLength={1000}
                        rows={4}
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500"
                      />
                    </label>
                  </>
                )}

                {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
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
