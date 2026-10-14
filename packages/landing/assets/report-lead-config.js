/**
 * Optional email signup on /state-of-startup-security-2026.html
 * ("2026 checklist + updates"). The PDF itself is a direct download.
 *
 * Static Coolify/nginx deploys cannot read environment variables at request
 * time. Set the endpoint here before you deploy. Do not put secrets in this file.
 *
 * leadEndpoint
 *   ""  — POST https://app.grcompliance.com/api/trpc/waitlist.join
 *         (public waitlist.join; grcompliance.com is already CORS-allowed).
 *   "/api/trpc/waitlist.join"
 *         — same-origin. Only works if this host proxies /api to the app.
 *   "https://example.com/hooks/report-lead"
 *         — any URL that accepts JSON { email, source, interestedPlay } and returns 2xx.
 */
window.GRC_REPORT_CONFIG = {
    leadEndpoint: ""
};
