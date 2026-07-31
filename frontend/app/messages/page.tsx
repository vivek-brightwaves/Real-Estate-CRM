"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthenticatedDashboard from "../../components/dashboard/AuthenticatedDashboard";
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
      <div className="mx-auto w-full py-3">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600">Team Communication</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Messages</h1>
              <p className="mt-1 text-sm text-slate-500">Secure internal conversations with your branch team.</p>
            </div>
            <button type="button" onClick={() => setShowCompose(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700">
              + Compose
            </button>
          </header>

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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={sendMessage} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">New Message</h2>
            <div className="mt-5 space-y-4">
              <select required value={draft.recipient_id} onChange={(event) => setDraft({ ...draft, recipient_id: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none">
                <option value="">Select recipient</option>
                {staff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
              </select>
              <input required maxLength={255} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Subject" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
              <textarea required rows={7} maxLength={10000} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Write your message..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCompose(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={sending || staff.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AuthenticatedDashboard>
  );
}
