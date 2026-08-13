import React, { useState } from "react";
import { Bell, ShieldCheck, AlertTriangle, Cpu, Check, Trash2, X } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "threat" | "connector" | "audit" | "system";
  isRead: boolean;
}

export const GlobalNotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "CISA KEV Vulnerability Alert",
      message: "Log4j RCE CVE-2021-44228 threat auto-mapped to client risk register.",
      timestamp: "5m ago",
      type: "threat",
      isRead: false,
    },
    {
      id: "2",
      title: "Automated Evidence Collectors Finished",
      message: "GitHub, AWS, and Okta collectors generated 12 new verified evidence proofs.",
      timestamp: "25m ago",
      type: "connector",
      isRead: false,
    },
    {
      id: "3",
      title: "Audit Package Ready",
      message: "One-Click Audit Package ZIP & Executive PDF report compiled.",
      timestamp: "1h ago",
      type: "audit",
      isRead: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-indigo-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 text-slate-100 space-y-3 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">System Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={markAllRead}
                className="text-slate-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Read
              </button>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 relative transition-all ${
                    n.isRead
                      ? "bg-slate-900/60 border-slate-800/60 opacity-70"
                      : "bg-indigo-950/30 border-indigo-500/30 text-white"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-1.5">
                      {n.type === "threat" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : n.type === "connector" ? (
                        <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{n.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                  <button
                    onClick={() => removeNotification(n.id)}
                    className="absolute bottom-2 right-2 text-slate-600 hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">No notifications.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
