"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthenticatedDashboard from "../../components/dashboard/AuthenticatedDashboard";
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
      <div className="mx-auto w-full py-3">
        <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-600">Work Management</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Tasks</h1>
              <p className="mt-1 text-sm text-slate-500">Assign, prioritize and complete team follow-ups.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              + New Task
            </button>
          </div>

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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={createTask} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Create Task</h2>
            <div className="mt-5 space-y-4">
              <input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task title" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <select value={form.assigned_to_id} onChange={(event) => setForm({ ...form, assigned_to_id: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none">
                  <option value="">Assign to me</option>
                  {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AuthenticatedDashboard>
  );
}
