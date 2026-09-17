/**
 * Pure helpers for GlobalNotificationCenter deep-link resolution.
 *
 * Extracted from GlobalNotificationCenter.tsx so the routing behavior
 * can be unit-tested in isolation. No React or side-effect dependencies
 * beyond the documented localStorage fallback.
 */

export interface NotificationDestination {
  /** When true, `path` is an absolute URL and should be opened in a new tab. */
  isExternal: boolean;
  path: string;
}

/**
 * Resolve the navigation target for a notification.
 *
 * Replaces `:clientId` / `:id` placeholders in links with the currently
 * selected client id (falling back to the value persisted in localStorage
 * under "selectedClientId", then to client 1). Notifications without an
 * explicit link fall back to a sensible module page based on their type.
 *
 * Default behavior is identical to the previous inline implementation in
 * GlobalNotificationCenter.tsx.
 */
export const resolveDestination = (
  link?: string,
  type?: string,
  selectedClientId?: number | null,
): NotificationDestination => {
  const activeId =
    selectedClientId ||
    (typeof window !== "undefined"
      ? parseInt(window.localStorage.getItem("selectedClientId") || "1", 10)
      : 1) ||
    1;

  if (link) {
    if (link.startsWith("http://") || link.startsWith("https://")) {
      return { isExternal: true, path: link };
    }
    return {
      isExternal: false,
      path: link.replace(/:clientId/g, String(activeId)).replace(/:id/g, String(activeId)),
    };
  }

  switch (type) {
    case "threat":
      return { isExternal: false, path: `/clients/${activeId}/risks/adversary-intel` };
    case "connector":
      return { isExternal: false, path: `/clients/${activeId}/evidence` };
    case "audit":
      return { isExternal: false, path: `/clients/${activeId}/audit-manager` };
    case "overdue_alert":
      return { isExternal: false, path: `/clients/${activeId}/controls` };
    case "system":
    default:
      return { isExternal: false, path: `/settings?tab=notifications` };
  }
};
