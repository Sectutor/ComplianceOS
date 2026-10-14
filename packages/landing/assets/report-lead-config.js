/**
 * Lead capture for /state-of-startup-security-2026.html
 *
 * Static Coolify/nginx deploys cannot read environment variables at request
 * time. Set the endpoint here before you deploy (no secrets belong in this file).
 *
 * leadEndpoint
 *   ""  — use the default, https://app.grcompliance.com/api/trpc/waitlist.join
 *         (the same public waitlist.join mutation the app already exposes).
 *         grcompliance.com is already allowed by the app CORS list.
 *   "/api/trpc/waitlist.join"
 *         — same-origin. Only works if this host proxies /api to the
 *         ComplianceOS app. The landing nginx image does not proxy /api.
 *   "https://example.com/hooks/report-lead"
 *         — any endpoint that accepts a JSON POST and returns 2xx:
 *           { name, email, company, role, consent, source, report }
 *
 * calendarLink
 *   Replace "[CALENDAR_LINK]" with the Readiness Snapshot booking URL.
 */
window.GRC_REPORT_CONFIG = {
    leadEndpoint: "",
    calendarLink: "[CALENDAR_LINK]"
};
