"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import api from "../../lib/axios";
import { getApiErrorMessage } from "../../lib/errors";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to request a reset."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-white p-8 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Account Recovery</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your account email to request a secure reset link.</p>
        {message ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
        <button type="button" onClick={() => router.push("/login")} className="mt-5 w-full text-sm font-bold text-slate-600 hover:text-blue-600">
          Back to login
        </button>
      </section>
    </main>
  );
}
