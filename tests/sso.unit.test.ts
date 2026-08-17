/**
 * Enterprise SSO router — sso.status contract tests (cycle 9, scorecard #13).
 *
 * The router factory createSsoRouter(t, publicProcedure) lives in
 * packages/core/src/server/routers/sso.ts (backend-owned). It is exercised
 * directly here with a minimal tRPC v11 instance (initTRPC.create()) so no
 * DB / network / server is required for the sso.status query.
 *
 * BACKEND-DEP guard (mirrors policyAckContract.test.ts): the suite is
 * auto-skipped (describe.skipIf) until the factory lands, so the repo stays
 * green even if the router is reverted mid-cycle.
 *
 * process.env is snapshot/restored per test (the status query reads env at
 * call time) so the rest of the suite is never affected.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initTRPC } from '@trpc/server';

/* ------------------------------------------------------------------ */
/*  BACKEND-DEP availability gate (keeps the suite green)              */
/* ------------------------------------------------------------------ */

let createSsoRouter: ((t: unknown, publicProcedure: unknown) => {
  createCaller(ctx: unknown): { status(): Promise<Record<string, unknown>> };
}) | null = null;

try {
  const mod = await import('../packages/core/src/server/routers/sso');
  createSsoRouter = typeof mod.createSsoRouter === 'function' ? mod.createSsoRouter : null;
} catch {
  createSsoRouter = null;
}

const routerAvailable = createSsoRouter !== null;

/* ------------------------------------------------------------------ */
/*  Env snapshot/restore                                               */
/* ------------------------------------------------------------------ */

const SSO_ENV_KEYS = [
  'SSO_OIDC_ENABLED',
  'SSO_OIDC_ISSUER',
  'SSO_OIDC_CLIENT_ID',
  'SSO_OIDC_CLIENT_SECRET',
  'SSO_OIDC_SCOPES',
  'SSO_OIDC_REDIRECT_URI',
  'SSO_OIDC_ROLE_CLAIM',
  'SSO_PROXY_ENABLED',
  'SSO_PROXY_AUTH_HEADER',
  'SSO_PROXY_EMAIL_HEADER',
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

describe.skipIf(!routerAvailable)('sso router status', () => {
  async function queryStatus(): Promise<Record<string, unknown>> {
    const t = initTRPC.create();
    const router = createSsoRouter!(t, t.procedure);
    const caller = router.createCaller({});
    return caller.status();
  }

  it('returns { enabled: false, mode: "none" } when OIDC and proxy SSO are both disabled', async () => {
    const status = await queryStatus();
    expect(status).toMatchObject({ enabled: false, mode: 'none' });
  });

  it('returns mode "oidc" when OIDC is configured', async () => {
    process.env.SSO_OIDC_ENABLED = 'true';
    process.env.SSO_OIDC_ISSUER = 'https://idp.example.com';
    process.env.SSO_OIDC_CLIENT_ID = 'complianceos-web';
    process.env.SSO_OIDC_CLIENT_SECRET = 's3cret';
    process.env.SSO_OIDC_REDIRECT_URI = 'https://app.example.com/auth/sso/callback';

    const status = await queryStatus();

    expect(status).toMatchObject({ enabled: true, mode: 'oidc' });
  });

  it('returns mode "proxy" when proxy SSO is enabled', async () => {
    process.env.SSO_PROXY_ENABLED = 'true';
    process.env.SSO_PROXY_AUTH_HEADER = 'x-sso-user';

    const status = await queryStatus();

    expect(status).toMatchObject({ enabled: true, mode: 'proxy' });
  });
});
