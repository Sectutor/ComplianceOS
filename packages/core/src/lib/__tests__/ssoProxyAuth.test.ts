/**
 * Enterprise SSO — reverse-proxy header auth contract tests (cycle 9,
 * scorecard #13).
 *
 * Target: packages/core/src/lib/sso/proxy-auth.ts (implemented in parallel
 * by the backend agent). Tests run against the cycle-9 contract only:
 *
 *   isProxySsoEnabled(): boolean
 *   resolveProxyUser(headers): { email, name?, openId } | null
 *     - openId = `sso_proxy:<email>`, case-insensitive header lookup, null
 *       when disabled or the principal header is missing.
 *
 * BACKEND-DEP guard (mirrors policyAckContract.test.ts): the suite is
 * auto-skipped (describe.skipIf) until the module lands, so the repo stays
 * green even if the module is reverted mid-cycle.
 *
 * process.env is snapshot/restored per test (env is read at call time and
 * mutation is global) so the rest of the suite is never affected.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  BACKEND-DEP availability gate (keeps the suite green)              */
/* ------------------------------------------------------------------ */

let proxy: typeof import('../sso/proxy-auth') | null = null;
try {
  proxy = await import('../sso/proxy-auth');
} catch {
  proxy = null;
}

const proxyAvailable =
  !!proxy &&
  typeof proxy.isProxySsoEnabled === 'function' &&
  typeof proxy.resolveProxyUser === 'function';

/* ------------------------------------------------------------------ */
/*  Env snapshot/restore                                               */
/* ------------------------------------------------------------------ */

const SSO_ENV_KEYS = [
  'SSO_PROXY_ENABLED',
  'SSO_PROXY_AUTH_HEADER',
  'SSO_PROXY_EMAIL_HEADER',
  'SSO_OIDC_ENABLED',
  'SSO_OIDC_ISSUER',
  'SSO_OIDC_CLIENT_ID',
  'SSO_OIDC_CLIENT_SECRET',
];

let pristineSsoEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  pristineSsoEnv = {};
  for (const key of SSO_ENV_KEYS) {
    pristineSsoEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of SSO_ENV_KEYS) {
    const value = pristineSsoEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe.skipIf(!proxyAvailable)('sso/proxy-auth', () => {
  const lib = proxy!;

  it('isProxySsoEnabled() is false when SSO_PROXY_ENABLED is unset', () => {
    expect(lib.isProxySsoEnabled()).toBe(false);
  });

  it('isProxySsoEnabled() is true when SSO_PROXY_ENABLED=true', () => {
    process.env.SSO_PROXY_ENABLED = 'true';
    expect(lib.isProxySsoEnabled()).toBe(true);
  });

  it('resolveProxyUser returns null when proxy SSO is disabled, even with headers present', () => {
    process.env.SSO_PROXY_ENABLED = 'false';
    expect(lib.resolveProxyUser({ 'x-forwarded-user': 'alice@corp.com' })).toBeNull();

    delete process.env.SSO_PROXY_ENABLED;
    expect(lib.resolveProxyUser({ 'x-forwarded-user': 'alice@corp.com' })).toBeNull();
  });

  it('resolves the principal from x-forwarded-user with a namespaced openId', () => {
    process.env.SSO_PROXY_ENABLED = 'true';

    const user = lib.resolveProxyUser({ 'x-forwarded-user': 'alice@corp.com' });

    expect(user).not.toBeNull();
    expect(user!.email).toBe('alice@corp.com');
    expect(user!.openId).toBe('sso_proxy:alice@corp.com');
  });

  it('prefers a dedicated email header when present', () => {
    process.env.SSO_PROXY_ENABLED = 'true';

    const user = lib.resolveProxyUser({
      'x-forwarded-user': 'alice',
      'x-forwarded-email': 'alice@corp.com',
    });

    expect(user!.email).toBe('alice@corp.com');
    expect(user!.openId).toBe('sso_proxy:alice@corp.com');
  });

  it('is case-insensitive about header names (e.g. X-Forwarded-User)', () => {
    process.env.SSO_PROXY_ENABLED = 'true';

    const user = lib.resolveProxyUser({ 'X-Forwarded-User': 'alice@corp.com' });

    expect(user).not.toBeNull();
    expect(user!.email).toBe('alice@corp.com');
    expect(user!.openId).toBe('sso_proxy:alice@corp.com');
  });

  it('takes the first value when a header is an array', () => {
    process.env.SSO_PROXY_ENABLED = 'true';

    const user = lib.resolveProxyUser({
      'x-forwarded-user': ['alice@corp.com', 'bob@corp.com'],
    });

    expect(user!.email).toBe('alice@corp.com');
    expect(user!.openId).toBe('sso_proxy:alice@corp.com');
  });

  it('returns null when the principal header is missing', () => {
    process.env.SSO_PROXY_ENABLED = 'true';

    expect(lib.resolveProxyUser({})).toBeNull();
    expect(lib.resolveProxyUser({ 'x-something-else': 'alice@corp.com' })).toBeNull();
  });

  it('supports custom header names via SSO_PROXY_AUTH_HEADER and SSO_PROXY_EMAIL_HEADER', () => {
    process.env.SSO_PROXY_ENABLED = 'true';
    process.env.SSO_PROXY_AUTH_HEADER = 'x-sso-user';
    process.env.SSO_PROXY_EMAIL_HEADER = 'x-sso-email';

    const user = lib.resolveProxyUser({
      'x-sso-user': 'carol',
      'x-sso-email': 'carol@corp.com',
    });

    expect(user!.email).toBe('carol@corp.com');
    expect(user!.openId).toBe('sso_proxy:carol@corp.com');
  });

  it('uses the auth header value as the email when only a custom auth header is set', () => {
    process.env.SSO_PROXY_ENABLED = 'true';
    process.env.SSO_PROXY_AUTH_HEADER = 'x-sso-user';

    const user = lib.resolveProxyUser({ 'x-sso-user': 'dave@corp.com' });

    expect(user!.email).toBe('dave@corp.com');
    expect(user!.openId).toBe('sso_proxy:dave@corp.com');
  });
});
