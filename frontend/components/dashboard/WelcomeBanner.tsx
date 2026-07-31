"use client";

import React, { useEffect, useState } from "react";

import api from "../../lib/axios";

interface WelcomeBannerProps {
  userName: string;
  userRole: string;
}

interface LoginHistoryItem {
  id: number;
  status: string;
  attempt_time: string;
}

function parseServerTime(value: string): Date {
  const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export default function WelcomeBanner({
  userName,
  userRole,
}: WelcomeBannerProps) {
  const [lastSession, setLastSession] = useState<{
    label: string;
    time: Date;
  } | null>(null);

  useEffect(() => {
    const loadSessionHistory = async () => {
      try {
        const response = await api.get<LoginHistoryItem[]>(
          "/auth/history?size=20",
        );
        const history = response.data ?? [];
        const logout = history.find((item) => item.status === "LOGOUT");
        const successfulLogins = history.filter(
          (item) => item.status === "SUCCESS",
        );
        const priorLogin = successfulLogins[1];
        const source = logout ?? priorLogin;
        if (source) {
          setLastSession({
            label: logout ? "Last session ended" : "Previous login",
            time: parseServerTime(source.attempt_time),
          });
        }
      } catch {
        setLastSession(null);
      }
    };
    void loadSessionHistory();
  }, []);

  const roleLabel = userRole.replaceAll("_", " ").toLowerCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-[18px] border border-white/60 bg-white/75 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-[18px] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,.95), rgba(239,246,255,.45), rgba(250,245,255,.4))",
      }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-80 w-80 rounded-full bg-blue-400/5 blur-[90px]" />
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-medium text-slate-600">{greeting},</p>
          <h2 className="mt-1 text-[34px] font-black leading-tight tracking-tight text-slate-900">
            {userName}
          </h2>
          <p className="mt-1 text-sm font-medium capitalize text-slate-500">
            {roleLabel} workspace · live business overview
          </p>
        </div>

        <div
          className="self-start rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm md:self-center"
          aria-live="polite"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            {lastSession?.label ?? "Session history"}
          </p>
          <p className="mt-1 text-xs font-bold text-emerald-800">
            {lastSession
              ? lastSession.time.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "No previous completed session"}
          </p>
        </div>
      </div>
    </div>
  );
}
