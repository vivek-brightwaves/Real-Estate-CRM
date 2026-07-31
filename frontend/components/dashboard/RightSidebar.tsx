"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import api from "../../lib/axios";

interface RightSidebarProps {
  notifications: Array<{ id: number; message: string; created_at: string; is_read: boolean }>;
  onMarkRead: (id: number) => void;
}

export default function RightSidebar({ notifications, onMarkRead }: RightSidebarProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Array<{ id: number; title: string; status: string }>>([]);

  const loadTasks = async () => {
    try {
      const response = await api.get("/tasks?size=5&sort_by=due_date&sort_order=asc");
      setTasks(response.data ?? []);
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const toggleTask = async (task: { id: number; status: string }) => {
    await api.patch(`/tasks/${task.id}`, {
      status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    });
    await loadTasks();
  };

  const visits = [
    { customer: "Aravind Sharma", project: "Palace Heights Block B", time: "02:30 PM", status: "Confirmed" },
    { customer: "Neha Deshmukh", project: "Greenwood Villa 14", time: "04:00 PM", status: "In Progress" },
  ];

  const approvals = [
    { id: 101, title: "Unit Booking B-104", details: "Aravind Sharma • ₹5,00,000 advanced token", agent: "Vikram Rathore" },
  ];

  // Mock Calendar days
  const calendarDays = [20, 21, 22, 23, 24, 25, 26];

  return (
    <aside className="w-full xl:w-80 shrink-0 bg-white border-l border-slate-200/80 p-6 space-y-8 overflow-y-auto">
      
      {/* Calendar Widget */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calendar Widget</span>
          <span className="text-xs font-bold text-blue-600">July 2026</span>
        </div>
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 shadow-inner">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-700">
            {calendarDays.map((day, idx) => (
              <span 
                key={idx} 
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                  day === 25 
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30" 
                    : "hover:bg-slate-100"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Tasks</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
            {tasks.filter(t => t.status !== "COMPLETED").length} Pending
          </span>
        </div>
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <label 
              key={task.id} 
              className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors select-none"
            >
              <input
                type="checkbox"
                checked={task.status === "COMPLETED"}
                onChange={() => void toggleTask(task)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className={`text-xs font-semibold leading-relaxed ${task.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {task.title}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Upcoming Site Visits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming Site Visits</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-3">
          {visits.map((vis, idx) => (
            <div key={idx} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">{vis.customer}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded">
                  {vis.time}
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">{vis.project}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="space-y-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pending Approvals</span>
        <div className="space-y-3">
          {approvals.map((app) => (
            <div key={app.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-900">{app.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{app.details}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-1">Request by Agent: {app.agent}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/admin/approvals")}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors"
                >
                  Review
                </button>
                <button
                  onClick={() => router.push("/tasks")}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-colors"
                >
                  Tasks
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}
