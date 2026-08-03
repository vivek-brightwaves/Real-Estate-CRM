"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthenticatedDashboard from "../../components/dashboard/AuthenticatedDashboard";
import PageHeader from "../../components/ui/PageHeader";
import api from "../../lib/axios";
import { getApiErrorMessage } from "../../lib/errors";
import { useAuthStore } from "../../store/authStore";
import { useFeedback } from "../../components/ui/FeedbackProvider";
import { useSectionSearch } from "../../hooks/useSectionSearch";

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  recipient_name: string;
  subject: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface StaffOption {
  id: number;
  name: string;
  email: string;
  role: string;
}

const emptyDraft = { recipient_id: "", subject: "", body: "" };

export default function MessagesPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const { confirmAction, notify } = useFeedback();
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState("");
  useSectionSearch("messages", setSearch);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ folder, size: "100" });
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get(`/messages?${params.toString()}`);
      setMessages(response.data ?? []);
      setSelected((current) =>
        current && response.data.some((message: Message) => message.id === current.id)
          ? current
          : null,
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load messages."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, folder, search]);

  useEffect(() => {
    if (!accessToken) return;
    void loadMessages();
  }, [accessToken, loadMessages]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .get("/work/staff?purpose=message")
      .then((response) =>
        setStaff(
          (response.data ?? []).filter(
            (person: StaffOption) => person.id !== currentUser?.id,
          ),
        ),
      )
      .catch(() => setStaff([]));
  }, [accessToken, currentUser?.id]);

  const openMessage = async (message: Message) => {
    setSelected(message);
    if (folder === "inbox" && !message.is_read) {
      try {
        const response = await api.patch(`/messages/${message.id}/read`);
        setSelected(response.data);
        setMessages((current) =>
          current.map((item) => item.id === message.id ? response.data : item),
        );
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to mark the message read."));
      }
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await api.post("/messages", {
        recipient_id: Number(draft.recipient_id),
        subject: draft.subject,
        body: draft.body,
      });
      notify({
        title: "Message sent",
        message: `"${draft.subject}" was delivered to the recipient's inbox.`,
      });
      setDraft(emptyDraft);
      setShowCompose(false);
      setFolder("sent");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to send the message.");
      setError(message);
      notify({ title: "Message was not sent", message, tone: "error" });
    } finally {
      setSending(false);
    }
  };

  const reply = (message: Message) => {
    setDraft({
      recipient_id: String(message.sender_id),
      subject: message.subject.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject}`,
      body: "",
    });
    setShowCompose(true);
  };

  const deleteMessage = async (message: Message) => {
    const confirmed = await confirmAction({
      title: "Delete message?",
      message: `"${message.subject}" will be removed from this mailbox.`,
      confirmLabel: "Delete message",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/messages/${message.id}`);
      notify({ title: "Message deleted", message: "The message was removed from this mailbox." });
      setSelected(null);
      await loadMessages();
    } catch (requestError) {
      const detail = getApiErrorMessage(requestError, "Unable to delete the message.");
      setError(detail);
      notify({ title: "Message deletion failed", message: detail, tone: "error" });
    }
  };

  return (
    <AuthenticatedDashboard>
      <PageHeader
        breadcrumb="Dashboard / Messages"
        title="Messages"
        subtitle="Secure internal conversations with your branch team."
        actions={
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="rounded-xl bg-indigo-650 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center shrink-0 cursor-pointer"
          >
            + Compose
          </button>
        }
      />
      <div className="mx-auto w-full">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:bg-[#1E293B] shadow-sm dark:border-slate-800">

          {error && <div role="alert" className="m-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

          <div className="grid min-h-[560px] md:grid-cols-[360px_1fr]">
            <aside className="border-r border-slate-100">
              <div className="flex gap-2 border-b border-slate-100 p-4">
                {(["inbox", "sent"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setFolder(value);
                      setSelected(null);
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize ${folder === value ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="border-b border-slate-100 p-4">
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages..." className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div className="max-h-[470px] overflow-y-auto">
                {loading ? (
                  <p className="p-8 text-center text-sm text-slate-500">Loading...</p>
                ) : messages.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">No messages in {folder}.</p>
                ) : messages.map((message) => (
                  <button
                    type="button"
                    key={message.id}
                    onClick={() => void openMessage(message)}
                    className={`block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${selected?.id === message.id ? "bg-indigo-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`truncate text-sm ${folder === "inbox" && !message.is_read ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                        {folder === "inbox" ? message.sender_name : message.recipient_name}
                      </p>
                      {!message.is_read && folder === "inbox" && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">{message.subject}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{message.body}</p>
                  </button>
                ))}
              </div>
            </aside>

            <main className="flex min-h-[420px] items-center justify-center p-6">
              {selected ? (
                <article className="w-full max-w-3xl self-start">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">{selected.subject}</h2>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        From {selected.sender_name} to {selected.recipient_name} · {new Date(selected.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button type="button" onClick={() => void deleteMessage(selected)} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                      Delete
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap py-7 text-sm leading-7 text-slate-700">{selected.body}</p>
                  {folder === "inbox" && (
                    <button type="button" onClick={() => reply(selected)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                      Reply
                    </button>
                  )}
                </article>
              ) : (
                <div className="text-center text-slate-400">
                  <div className="text-4xl">✉</div>
                  <p className="mt-3 text-sm font-semibold">Select a message to read it</p>
                </div>
              )}
            </main>
          </div>
        </section>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-[80] bg-[#0F172A]/18 dark:bg-black/60 backdrop-blur-[12px] flex items-center justify-center p-4 transition-opacity duration-200">
          <div className="bg-white border border-slate-200 rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] w-full max-w-xl p-8 relative overflow-hidden transition-all transform scale-100 translate-y-0 duration-250 ease-out">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-[28px] font-bold text-[#0F172A] border-b border-slate-200 pb-4 mb-6 leading-none">New Message</h2>
            <form onSubmit={sendMessage}>
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Recipient</label>
                  <select required value={draft.recipient_id} onChange={(event) => setDraft({ ...draft, recipient_id: event.target.value })} className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm cursor-pointer hover:border-[#94A3B8]">
                    <option value="">Select recipient</option>
                    {staff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Subject</label>
                  <input required maxLength={255} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Subject" className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-2">Message Content</label>
                  <textarea required rows={7} maxLength={10000} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Write your message..." className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/12 transition-all duration-200 shadow-sm min-h-[140px] resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setShowCompose(false)} className="h-11 px-5 border border-[#CBD5E1] rounded-xl bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8] transition-all duration-200 text-[#334155] text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={sending || staff.length === 0} className="h-11 px-5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)] transition-all duration-200 text-xs font-semibold cursor-pointer disabled:opacity-60">
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedDashboard>
  );
}
