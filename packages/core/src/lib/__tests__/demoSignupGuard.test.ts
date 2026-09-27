import { describe, it, expect, beforeEach } from 'vitest';
import {
  isDisposableDemoEmail,
  normalizeDemoEmail,
  checkDemoIpThrottle,
  resetDemoIpThrottle,
  DEMO_IP_MAX_REQUESTS,
  DEMO_IP_WINDOW_MS,
  type DemoIpThrottleStore,
} from '../demoSignupGuard';

describe('demoSignupGuard — disposable email blocklist', () => {
  it('flags disposable domains', () => {
    expect(isDisposableDemoEmail('bot@mailinator.com')).toBe(true);
    expect(isDisposableDemoEmail('bot@yopmail.com')).toBe(true);
    expect(isDisposableDemoEmail('bot@temp-mail.org')).toBe(true);
  });

  it('flags subdomains of disposable domains', () => {
    expect(isDisposableDemoEmail('bot@inbox.mailinator.com')).toBe(true);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isDisposableDemoEmail('  Bot@Mailinator.COM ')).toBe(true);
    expect(normalizeDemoEmail('  Alice@Corp.COM ')).toBe('alice@corp.com');
  });

  it('allows permanent providers and custom domains', () => {
    expect(isDisposableDemoEmail('alice@gmail.com')).toBe(false);
    expect(isDisposableDemoEmail('alice@corp.example')).toBe(false);
  });

  it('treats malformed emails as disposable (rejects them)', () => {
    expect(isDisposableDemoEmail('not-an-email')).toBe(true);
    expect(isDisposableDemoEmail('')).toBe(true);
  });
});

describe('demoSignupGuard — per-IP throttle', () => {
  let store: DemoIpThrottleStore;
  const base = 1_700_000_000_000;

  beforeEach(() => {
    store = {};
  });

  it('allows up to the configured number of requests per window', () => {
    for (let i = 0; i < DEMO_IP_MAX_REQUESTS; i++) {
      expect(checkDemoIpThrottle(store, '1.2.3.4', base + i).allowed).toBe(true);
    }
    const denied = checkDemoIpThrottle(store, '1.2.3.4', base + DEMO_IP_MAX_REQUESTS);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it('does not count requests outside the window', () => {
    for (let i = 0; i < DEMO_IP_MAX_REQUESTS; i++) {
      checkDemoIpThrottle(store, '1.2.3.4', base + i);
    }
    // A request a full window later starts a fresh budget.
    expect(checkDemoIpThrottle(store, '1.2.3.4', base + DEMO_IP_WINDOW_MS + 1).allowed).toBe(true);
  });

  it('tracks IPs independently', () => {
    for (let i = 0; i < DEMO_IP_MAX_REQUESTS; i++) {
      checkDemoIpThrottle(store, '1.2.3.4', base);
    }
    expect(checkDemoIpThrottle(store, '5.6.7.8', base).allowed).toBe(true);
    expect(checkDemoIpThrottle(store, '1.2.3.4', base).allowed).toBe(false);
  });

  it('buckets missing IPs together (unknown)', () => {
    expect(checkDemoIpThrottle(store, undefined, base).allowed).toBe(true);
    expect(checkDemoIpThrottle(store, null, base).allowed).toBe(true);
    // Both count against the same 'unknown' bucket.
    for (let i = 2; i < DEMO_IP_MAX_REQUESTS; i++) {
      checkDemoIpThrottle(store, undefined, base);
    }
    expect(checkDemoIpThrottle(store, null, base).allowed).toBe(false);
  });

  it('retryAfterMs shrinks as the window slides', () => {
    resetDemoIpThrottle(store);
    for (let i = 0; i < DEMO_IP_MAX_REQUESTS; i++) {
      checkDemoIpThrottle(store, '1.2.3.4', base + i);
    }
    const early = checkDemoIpThrottle(store, '1.2.3.4', base + DEMO_IP_MAX_REQUESTS);
    const later = checkDemoIpThrottle(store, '1.2.3.4', base + DEMO_IP_MAX_REQUESTS + 30_000);
    expect(later.retryAfterMs).toBeLessThan(early.retryAfterMs);
    expect(early.retryAfterMs).toBeLessThanOrEqual(DEMO_IP_WINDOW_MS);
  });
});
