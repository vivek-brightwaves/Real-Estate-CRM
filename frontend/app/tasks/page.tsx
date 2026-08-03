"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthenticatedDashboard from "../../components/dashboard/AuthenticatedDashboard";
import PageHeader from "../../components/ui/PageHeader";
import api from "../../lib/axios";
import { getApiErrorMessage } from "../../lib/errors";
import { useAuthStore } from "../../store/authStore";
import { useFeedback } from "../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../hooks/useSectionSearch";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  due_date: string | null;
  assigned_to_id: number | null;
}

interface StaffOption {
  id: number;
  name: string;
  email: string;
}

const emptyTask = {
  title: "",
  description: "",
  assigned_to_id: "",
  priority: "MEDIUM",
  due_date: "",
};

export default function TasksPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { confirmAction, notify } = useFeedback();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [search, setSearch] = useState("");
  useSectionSearch("tasks", setSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ size: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const response = await api.get(`/tasks?${params.toString()}`);
      setTasks(response.data ?? []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    if (!accessToken) return;
    void loadTasks();
    api
      .get("/work/staff?purpose=assignment")
      .then((response) => setStaff(response.data ?? []))
      .catch(() => setStaff([]));
  }, [accessToken, loadTasks]);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/tasks", {
        title: form.title,
        description: form.description || null,
        assigned_to_id: form.assigned_to_id
          ? Number(form.assigned_to_id)
          : undefined,
        priority: form.priority,
        due_date: form.due_date || null,
      });
      notify({
        title: "Task created",
        message: `"${form.title}" has been added to the work queue.`,
      });
      setForm(emptyTask);
      setShowCreate(false);
      await loadTasks();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to create the task.");
      setError(message);
      notify({ title: "Task was not created", message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (task: Task, status: Task["status"]) => {
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      notify({
        title: "Task updated",
        message: `"${task.title}" is now ${status.replaceAll("_", " ").toLowerCase()}.`,
      });
      await loadTasks();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to update the task.");
      setError(message);
      notify({ title: "Task update failed", message, tone: "error" });
    }
  };

  const deleteTask = async (task: Task) => {
    const confirmed = await confirmAction({
      title: "Delete task?",
      message: `"${task.title}" will be removed from the work queue.`,
      confirmLabel: "Delete task",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      notify({
        title: "Task deleted",
        message: `"${task.title}" was removed.`,
      });
      await loadTasks();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to delete the task.");
      setError(message);
      notify({ title: "Task deletion failed", message, tone: "error" });
    }
  };

  const priorityClass: Record<Task["priority"], string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-blue-50 text-blue-700",
    HIGH: "bg-amber-50 text-amber-700",
    URGENT: "bg-rose-50 text-rose-700",
  };

  return (
    <AuthenticatedDashboard>
      <PageHeader
        breadcrumb="Dashboard / Tasks"
        title="Tasks"
        subtitle="Assign, prioritize and complete team follow-ups."
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center shrink-0 cursor-pointer"
          >
            + New Task
          </button>
        }
      />
      <div className="mx-auto w-full">
        <section className="rounded-[22px] border border-slate-200 bg-white dark:bg-[#1E293B] p-6 shadow-sm dark:border-slate-800">

          <div className="my-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-bold text-slate-700">No tasks found</p>
              <button type="button" onClick={() => setShowCreate(true)} className="mt-3 text-sm font-bold text-blue-600">
                Create the first task
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className={`font-bold text-slate-900 ${task.status === "COMPLETED" ? "line-through opacity-60" : ""}`}>
                        {task.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">{task.description || "No description"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${priorityClass[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-lg bg-slate-50 px-2.5 py-1">{task.status.replace("_", " ")}</span>
                    <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                      Due: {task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString() : "Not set"}
                    </span>
                    <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                      {staff.find((person) => person.id === task.assigned_to_id)?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                    {task.status !== "COMPLETED" ? (
                      <>
                        <button type="button" onClick={() => void updateStatus(task, "IN_PROGRESS")} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">
                          Start
                        </button>
                        <button type="button" onClick={() => void updateStatus(task, "COMPLETED")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                          Complete
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => void updateStatus(task, "PENDING")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                        Reopen
                      </button>
                    )}
                    <button type="button" onClick={() => void deleteTask(task)} className="ml-auto rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[80] bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 transition-opacity duration-200">
          <div className="bg-white border border-slate-200 rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-lg p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-[28px] font-bold text-[#0F172A] border-b border-slate-200 pb-4 mb-6 leading-none">Create Task</h2>
            <form onSubmit={createTask}>
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Task Title</label>
                  <input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task title" className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Description</label>
                  <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm min-h-[100px] resize-none" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] mb-2">Assigned To</label>
                    <select value={form.assigned_to_id} onChange={(event) => setForm({ ...form, assigned_to_id: event.target.value })} className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8]">
                      <option value="">Assign to me</option>
                      {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] mb-2">Priority</label>
                    <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8]">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setShowCreate(false)} className="h-11 px-5 border border-[#CBD5E1] rounded-xl bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8] transition-all duration-200 text-[#334155] text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer disabled:opacity-60">
                  {saving ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedDashboard>
  );
}
