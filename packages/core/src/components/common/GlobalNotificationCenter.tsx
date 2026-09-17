import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Check,
  Trash2,
  X,
  ArrowUpRight,
  Settings,
  Clock,
  Inbox,
} from "lucide-react";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { resolveDestination } from "./notificationDestinations";

/* UI-STANDARD §16 typed data-contract layer. The appRouter mounts routers
 * via factories, which collapses client-side tRPC inference (cycles 36-39
 * precedent), so this component consumes the notifications surface ONLY
 * through this typed view — never raw trpc.notifications.* access. Shapes
 * mirror createNotificationsRouter exactly. */
interface DbNotificationRow {
  id: number;
  title: string;
  message: string;
  sentAt: string | Date | null;
  type?: string | null;
  readAt?: string | Date | null;
  link?: string | null;
}

interface NotificationsQuery<TInput, TData> {
  useQuery: (
    input?: TInput,
    opts?: Record<string, unknown>
  ) => {
    data?: TData;
    isLoading?: boolean;
    refetch: () => Promise<unknown>;
  };
}

interface NotificationMutation<TInput, TResult> {
  useMutation: (opts?: {
    onSuccess?: (data: TResult) => void;
    onError?: (error: { message?: string }) => void;
  }) => {
    mutate: (input: TInput) => void;
    mutateAsync: (input: TInput) => Promise<unknown>;
    isPending?: boolean;
    isLoading?: boolean;
  };
}

interface NotificationsApi {
  getNotifications: NotificationsQuery<{ limit: number }, DbNotificationRow[]>;
  getUnreadCount: NotificationsQuery<void, number>;
  markAsRead: NotificationMutation<{ id: number }, unknown>;
  markAllAsRead: NotificationMutation<void, unknown>;
}

const notificationsApi = trpc as unknown as { notifications: NotificationsApi };

interface NotificationItem {
  id: string;
  dbId?: number;
  isDb?: boolean;
  title: string;
  message: string;
  timestamp: string;
  type: "threat" | "connector" | "audit" | "system" | "overdue_alert" | string;
  isRead: boolean;
  link?: string;
  sourceLabel?: string;
}

const DEFAULT_SYSTEM_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "sys-1",
    title: "CISA KEV Vulnerability Alert",
    message: "Log4j RCE CVE-2021-44228 threat auto-mapped to client risk register.",
    timestamp: "5m ago",
    type: "threat",
    isRead: false,
    link: "/clients/:clientId/risks/adversary-intel",
    sourceLabel: "Adversary Intelligence",
  },
  {
    id: "sys-2",
    title: "Automated Evidence Collectors Finished",
    message: "GitHub, AWS, and Okta collectors generated 12 new verified evidence proofs.",
    timestamp: "25m ago",
    type: "connector",
    isRead: false,
    link: "/clients/:clientId/evidence",
    sourceLabel: "Evidence Locker",
  },
  {
    id: "sys-3",
    title: "Audit Package Ready",
    message: "One-Click Audit Package ZIP & Executive PDF report compiled.",
    timestamp: "1h ago",
    type: "audit",
    isRead: true,
    link: "/clients/:clientId/audit-manager",
    sourceLabel: "Audit Manager",
  },
];

export const GlobalNotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // NOTE: called unconditionally — hook order must be stable across renders.
  // App.tsx wraps the whole tree in ClientContextProvider, so this never throws.
  const clientCtx = useClientContext();
  const selectedClientId: number | null = clientCtx?.selectedClientId ?? null;

  // TRPC Backend Queries
  const { data: dbNotifications, refetch: refetchNotifications } =
    notificationsApi.notifications.getNotifications.useQuery(
      { limit: 20 },
      { enabled: isOpen }
    );
  const { data: dbUnreadCount, refetch: refetchUnreadCount } =
    notificationsApi.notifications.getUnreadCount.useQuery();

  // TRPC Mutations
  const markAsRead = notificationsApi.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

  const markAllAsRead = notificationsApi.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

  // Local System Notifications State
  const [systemNotifications, setSystemNotifications] = useState<NotificationItem[]>(
    DEFAULT_SYSTEM_NOTIFICATIONS
  );

  // Combine DB notifications & System Notifications
  const notifications: NotificationItem[] = useMemo(() => {
    const dbItems: NotificationItem[] = (dbNotifications || []).map((n: any) => ({
      id: `db_${n.id}`,
      dbId: n.id,
      isDb: true,
      title: n.title,
      message: n.message,
      timestamp: n.sentAt
        ? formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })
        : "Recently",
      type: n.type || "system",
      isRead: !!n.readAt,
      link: n.link || undefined,
      sourceLabel: n.type === "overdue_alert" ? "Compliance Controls" : undefined,
    }));

    return [...systemNotifications, ...dbItems];
  }, [dbNotifications, systemNotifications]);

  const sysUnreadCount = systemNotifications.filter((n) => !n.isRead).length;
  const totalUnreadCount = sysUnreadCount + (dbUnreadCount || 0);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = () => {
    setSystemNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllAsRead.mutate();
  };

  const removeNotification = (id: string) => {
    setSystemNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      if (item.isDb && item.dbId) {
        await markAsRead.mutateAsync?.({ id: item.dbId });
      } else {
        setSystemNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }
    }

    setIsOpen(false);

    const dest = resolveDestination(item.link, item.type, selectedClientId);
    if (dest.isExternal) {
      window.open(dest.path, "_blank", "noopener,noreferrer");
    } else {
      setLocation(dest.path);
    }
  };

  // Status/accent tints: semantic tokens where they exist (destructive/primary),
  // otherwise the sanctioned translucent-accent pattern from UI-STANDARD §2.
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "threat":
        return <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />;
      case "connector":
        return <Cpu className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />;
      case "audit":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "overdue_alert":
        return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-xs"
        title="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground font-extrabold text-[9px] flex items-center justify-center animate-pulse shadow-sm">
            {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Unified Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-lg z-50 p-4 text-popover-foreground space-y-3 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">Notifications</h4>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {totalUnreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleMarkAllRead}
                className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[11px] cursor-pointer transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Mark all as read"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Read
              </button>
              <button
                onClick={() => {
                  setLocation("/settings?tab=notifications");
                  setIsOpen(false);
                }}
                className="text-muted-foreground/70 hover:text-foreground cursor-pointer transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Notification Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground/70 hover:text-foreground cursor-pointer transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group p-3 rounded-xl border text-xs space-y-1.5 relative transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    n.isRead
                      ? "bg-card/60 border-border hover:bg-accent opacity-75 hover:opacity-100"
                      : "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-foreground"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(n);
                    }
                  }}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      {getNotificationIcon(n.type)}
                      <span className="truncate group-hover:text-primary transition-colors">
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/60 mt-1">
                    <span className="text-[10px] text-primary/80 group-hover:text-primary flex items-center gap-1 font-medium transition-colors">
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      {n.sourceLabel ? `Open ${n.sourceLabel}` : "Open source"}
                    </span>
                    {!n.isDb && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        className="text-muted-foreground/50 hover:text-destructive p-1 -m-1 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-border text-center">
            <button
              onClick={() => {
                setLocation("/notifications");
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalNotificationCenter;
