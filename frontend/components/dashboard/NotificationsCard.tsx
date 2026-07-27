"use client";

import React from "react";

interface NotificationItem {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationsCardProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
}

export default function NotificationsCard({ notifications, unreadCount, onMarkRead }: NotificationsCardProps) {
  // Demo items if no notifications returned
  const items = notifications && notifications.length > 0 ? notifications : [
    { id: 101, message: "New Approval request for unit B-104 Booking by Vikram Rathore", created_at: new Date().toISOString(), is_read: false },
    { id: 102, message: "Lead assigned: Anjali Patil by Manager", created_at: new Date(Date.now() - 3600000).toISOString(), is_read: false },
    { id: 103, message: "Site Visit scheduled: Kabir Mehra for Tomorrow", created_at: new Date(Date.now() - 7200000).toISOString(), is_read: true }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Notifications & Alerts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Inbox notifications and task actions</p>
        </div>
        {unreadCount > 0 && (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-600 rounded-full border border-rose-100 animate-pulse">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {items.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-3.5 rounded-xl border text-sm transition-all duration-200 ${
              notif.is_read 
                ? "bg-white border-slate-100 text-slate-500" 
                : "bg-blue-50/50 border-blue-100 text-slate-800 font-semibold"
            }`}
          >
            <p className="line-clamp-2 leading-relaxed">{notif.message}</p>
            <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100/60">
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {!notif.is_read && (
                <button 
                  onClick={() => onMarkRead(notif.id)} 
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
