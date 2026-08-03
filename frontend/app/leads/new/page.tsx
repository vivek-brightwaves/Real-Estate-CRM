"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import AuthenticatedDashboard from "../../../components/dashboard/AuthenticatedDashboard";
import PageHeader from "../../../components/ui/PageHeader";
import api from "../../../lib/axios";
import { getApiErrorMessage } from "../../../lib/errors";
import { useFeedback } from "../../../components/ui/FeedbackProvider";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  source: "Website",
  priority: "MEDIUM",
  next_follow_up_at: "",
  remarks: "",
  initial_note: "",
};

export default function NewLeadPage() {
  const router = useRouter();
  const { notify } = useFeedback();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Enter at least a phone number or email address.");
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value.trim() !== ""),
      );
      const response = await api.post("/leads", payload);
      notify({
        title: "Lead added successfully",
        message: `${response.data.name} is now in the lead pipeline.`,
        tone: "success",
      });
      router.push(`/leads/${response.data.id}`);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to add the lead.");
      setError(message);
      notify({ title: "Lead was not added", message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <AuthenticatedDashboard>
      <PageHeader
        breadcrumb="Dashboard / Leads / Add Lead"
        title="Add Lead"
        subtitle="Capture contact details and the next follow-up action."
        actions={
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] px-4 py-2 text-xs font-bold text-slate-655 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#273449] shadow-sm transition-all"
          >
            Back to Leads
          </button>
        }
      />
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm md:p-8">

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Lead name <span className="text-rose-500">*</span>
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Phone
              <input
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className={inputClass}
                placeholder="buyer@example.com"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Source
              <select
                value={form.source}
                onChange={(event) => update("source", event.target.value)}
                className={inputClass}
              >
                {["Website", "Referral", "Walk-in", "Campaign", "Broker", "Other"].map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Priority
              <select
                value={form.priority}
                onChange={(event) => update("priority", event.target.value)}
                className={inputClass}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600">
              Next follow-up
              <input
                type="datetime-local"
                value={form.next_follow_up_at}
                onChange={(event) => update("next_follow_up_at", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600 md:col-span-2">
              Requirements / remarks
              <textarea
                rows={3}
                maxLength={10000}
                value={form.remarks}
                onChange={(event) => update("remarks", event.target.value)}
                className={inputClass}
                placeholder="Budget, preferred location, property type..."
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-600 md:col-span-2">
              Initial note
              <textarea
                rows={3}
                maxLength={2000}
                value={form.initial_note}
                onChange={(event) => update("initial_note", event.target.value)}
                className={inputClass}
                placeholder="First conversation notes"
              />
            </label>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 md:col-span-2">
              <button
                type="button"
                onClick={() => router.push("/leads")}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding Lead..." : "Add Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedDashboard>
  );
}
