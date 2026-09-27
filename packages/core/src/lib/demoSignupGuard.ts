/**
 * Abuse controls for the public demo auto-invite endpoint
 * (waitlist.requestDemoAccount). Pure helpers so they are unit-testable.
 *
 * The endpoint mints single-use demo accounts from an unauthenticated
 * landing-page form, so it needs:
 *  - a disposable-email domain blocklist,
 *  - a per-IP request throttle (in-memory; single-instance self-host —
 *    multi-instance deployments should front this with a shared limiter).
 */

export const DEMO_DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'tempmail.com',
  'tempmail.net', 'yopmail.com', 'yopmail.net', 'trashmail.com', 'trashmail.de',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'mailnesia.com',
  'throwawaymail.com', 'mailcatch.com', 'spam4.me', 'grr.la', 'fakeinbox.com',
  'mytemp.email', 'mohmal.com', 'emailondeck.com', 'tempr.email',
]);

/** Default demo-account lifetime in days (time-boxed access). */
export const DEMO_ACCESS_DAYS = Number(process.env.DEMO_ACCESS_DAYS) || 7;

/** Rolling per-IP window for demo-signup requests. */
export const DEMO_IP_WINDOW_MS = 60 * 60 * 1000;
export const DEMO_IP_MAX_REQUESTS = 5;

export function normalizeDemoEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isDisposableDemoEmail(email: string): boolean {
  const normalized = normalizeDemoEmail(email);
  const domain = normalized.split('@')[1];
  if (!domain) return true;
  if (DEMO_DISPOSABLE_DOMAINS.has(domain)) return true;
  return [...DEMO_DISPOSABLE_DOMAINS].some((d) => domain.endsWith(`.${d}`));
}

export interface DemoIpThrottleStore {
  [ip: string]: number[];
}

/**
 * Sliding-window throttle. Mutates the store passed in (callers own the
 * store; tests pass a fresh object). Returns whether the request is allowed.
 */
export function checkDemoIpThrottle(
  store: DemoIpThrottleStore,
  ip: string | null | undefined,
  now: number = Date.now(),
): { allowed: boolean; retryAfterMs: number } {
  const key = (ip || 'unknown').trim() || 'unknown';
  const hits = (store[key] || []).filter((ts) => now - ts < DEMO_IP_WINDOW_MS);
  if (hits.length >= DEMO_IP_MAX_REQUESTS) {
    const oldest = hits[0];
    store[key] = hits;
    return { allowed: false, retryAfterMs: Math.max(0, DEMO_IP_WINDOW_MS - (now - oldest)) };
  }
  hits.push(now);
  store[key] = hits;
  return { allowed: true, retryAfterMs: 0 };
}

/** Reset helper for tests. */
export function resetDemoIpThrottle(store: DemoIpThrottleStore): void {
  for (const key of Object.keys(store)) delete store[key];
}
