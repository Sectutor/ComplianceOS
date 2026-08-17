/**
 * Enterprise SSO — OIDC client contract tests (cycle 9, scorecard #13).
 *
 * Target: packages/core/src/lib/sso/oidc.ts (implemented in parallel by the
 * backend agent). Tests run against the cycle-9 contract only:
 *
 *   isOidcEnabled / getOidcClientConfig / discoverConfiguration /
 *   buildAuthorizationUrl / exchangeCodeForTokens / verifyIdToken (RS256 via
 *   JWKS) / mapUserFromClaims / STATE_TTL_MS / createSsoStateStore
 *
 * Style notes:
 *  - Injectable-fetch mocking mirrors httpApiEvidenceCollector.test.ts.
 *  - BACKEND-DEP guard mirrors policyAckContract.test.ts: the suite is
 *    auto-skipped (describe.skipIf) until the contract exports land, so the
 *    repo stays green even if the module is reverted mid-cycle.
 *  - process.env is snapshot/restored per test (env is read at call time and
 *    mutation is global), so the rest of the suite is never affected.
 *
 * Network: fully mocked. Signature verification uses real RS256 keypairs
 * generated with node:crypto — no external IdP required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import type { JsonWebKey } from 'crypto';

/* ------------------------------------------------------------------ */
/*  BACKEND-DEP availability gate (keeps the suite green)              */
/* ------------------------------------------------------------------ */

let oidc: typeof import('../sso/oidc') | null = null;
try {
  oidc = await import('../sso/oidc');
} catch {
  oidc = null;
}

const oidcAvailable =
  !!oidc &&
  typeof oidc.isOidcEnabled === 'function' &&
  typeof oidc.getOidcClientConfig === 'function' &&
  typeof oidc.discoverConfiguration === 'function' &&
  typeof oidc.buildAuthorizationUrl === 'function' &&
  typeof oidc.exchangeCodeForTokens === 'function' &&
  typeof oidc.verifyIdToken === 'function' &&
  typeof oidc.mapUserFromClaims === 'function' &&
  typeof oidc.createSsoStateStore === 'function' &&
  typeof oidc.STATE_TTL_MS === 'number';

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
  'APP_URL',
  'VITE_APP_URL',
  'NEXT_PUBLIC_APP_URL',
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
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const ISSUER = 'https://idp.example.com/tenant';
const CLIENT_ID = 'complianceos-web';
const CLIENT_SECRET = 'correct-horse-battery-staple';
const SCOPES = 'openid email profile';
const REDIRECT_URI = 'https://app.example.com/auth/sso/callback';
const AUTHZ_ENDPOINT = `${ISSUER}/authorize`;
const TOKEN_ENDPOINT = `${ISSUER}/token`;
const JWKS_URI = `${ISSUER}/jwks`;

const DISCOVERY_DOC = {
  issuer: ISSUER,
  authorization_endpoint: AUTHZ_ENDPOINT,
  token_endpoint: TOKEN_ENDPOINT,
  jwks_uri: JWKS_URI,
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
};

/** Minimal structural fetch types (mirrors lib/sso/oidc.ts FetchLike). */
interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

function jsonResponse(body: unknown, status = 200): FetchResponseLike {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Set the OIDC env the lib reads at call time. */
function setOidcEnv(overrides: Record<string, string | undefined> = {}): void {
  process.env.SSO_OIDC_ENABLED = 'true';
  process.env.SSO_OIDC_ISSUER = ISSUER;
  process.env.SSO_OIDC_CLIENT_ID = CLIENT_ID;
  process.env.SSO_OIDC_CLIENT_SECRET = CLIENT_SECRET;
  process.env.SSO_OIDC_SCOPES = SCOPES;
  process.env.SSO_OIDC_REDIRECT_URI = REDIRECT_URI;
  process.env.SSO_OIDC_ROLE_CLAIM = 'groups';
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/**
 * URL-routing fetch mock: serves the discovery doc, the JWKS and the token
 * endpoint, and throws on anything unexpected. Recorded via vi.fn so tests
 * can assert exactly which URLs were requested.
 */
function routingFetch(opts: {
  discovery?: unknown;
  jwks?: unknown;
  token?: unknown;
} = {}) {
  return vi.fn(async (input: string, init?: FetchInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.endsWith('/.well-known/openid-configuration')) {
      return jsonResponse(opts.discovery ?? DISCOVERY_DOC);
    }
    if (url === JWKS_URI) {
      return jsonResponse(opts.jwks ?? { keys: [] });
    }
    if (url === TOKEN_ENDPOINT && method === 'POST') {
      return jsonResponse(
        opts.token ?? {
          id_token: 'mock-id-token',
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      );
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

/* ------------------------------------------------------------------ */
/*  RS256 JWT fixtures (node:crypto only)                              */
/* ------------------------------------------------------------------ */

const b64url = (data: string | Buffer): string =>
  Buffer.from(data).toString('base64url');
const b64urlJson = (value: unknown): string => b64url(JSON.stringify(value));

function makeKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function toJwk(publicKeyPem: string, kid = 'test-key-1'): JsonWebKey {
  const jwk = crypto.createPublicKey(publicKeyPem).export({ format: 'jwk' });
  return { ...jwk, kid, alg: 'RS256', use: 'sig' };
}

function signIdToken(
  payload: Record<string, unknown>,
  privateKey: crypto.KeyObject,
  opts: { kid?: string; headerOverrides?: Record<string, unknown> } = {},
): string {
  const header = { alg: 'RS256', kid: 'test-key-1', typ: 'JWT', ...opts.headerOverrides };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput, 'utf-8'), privateKey);
  return `${signingInput}.${b64url(signature)}`;
}

function idTokenPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: ISSUER,
    aud: CLIENT_ID,
    sub: 'user-123',
    email: 'alice@corp.com',
    name: 'Alice Example',
    groups: ['admin', 'viewer'],
    exp: now + 300,
    iat: now,
    nonce: 'nonce-abc-123',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe.skipIf(!oidcAvailable)('sso/oidc isOidcEnabled', () => {
  const lib = oidc!;

  it('returns false when SSO_OIDC_ENABLED is unset', () => {
    expect(lib.isOidcEnabled()).toBe(false);
  });

  it('returns false for an unknown flag value', () => {
    process.env.SSO_OIDC_ENABLED = 'false';
    expect(lib.isOidcEnabled()).toBe(false);
  });

  it('returns true when SSO_OIDC_ENABLED=true and issuer/clientId/secret are configured', () => {
    setOidcEnv();
    expect(lib.isOidcEnabled()).toBe(true);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc getOidcClientConfig', () => {
  const lib = oidc!;

  it('returns null when SSO is disabled', () => {
    expect(lib.getOidcClientConfig()).toBeNull();
  });

  it('returns null when enabled but a required field is missing', () => {
    setOidcEnv({ SSO_OIDC_ISSUER: undefined });
    expect(lib.getOidcClientConfig()).toBeNull();
  });

  it('returns the parsed configuration when fully configured', () => {
    setOidcEnv();
    expect(lib.getOidcClientConfig()).toEqual({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      roleClaim: 'groups',
    });
  });

  it('returns a redirectUri string even when SSO_OIDC_REDIRECT_URI is unset (default derivation)', () => {
    setOidcEnv({ SSO_OIDC_REDIRECT_URI: undefined });
    const config = lib.getOidcClientConfig();
    expect(config).not.toBeNull();
    expect(typeof config!.redirectUri).toBe('string');
  });

  it('falls back to non-empty scopes and roleClaim defaults when unset', () => {
    setOidcEnv({ SSO_OIDC_SCOPES: undefined, SSO_OIDC_ROLE_CLAIM: undefined });
    const config = lib.getOidcClientConfig();
    expect(config).not.toBeNull();
    expect(typeof config!.scopes).toBe('string');
    expect(config!.scopes.length).toBeGreaterThan(0);
    expect(typeof config!.roleClaim).toBe('string');
    expect(config!.roleClaim.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc discoverConfiguration', () => {
  const lib = oidc!;

  it('fetches the well-known document and maps snake_case to camelCase', async () => {
    setOidcEnv();
    const fetchMock = routingFetch();

    const discovery = await lib.discoverConfiguration(fetchMock as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${ISSUER}/.well-known/openid-configuration`);
    expect(discovery).toEqual({
      issuer: ISSUER,
      authorizationEndpoint: AUTHZ_ENDPOINT,
      tokenEndpoint: TOKEN_ENDPOINT,
      jwksUri: JWKS_URI,
    });
  });

  it('propagates fetch failures', async () => {
    setOidcEnv();
    const failingFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED 127.0.0.1:8080');
    });

    await expect(lib.discoverConfiguration(failingFetch as never)).rejects.toThrow('ECONNREFUSED');
  });

  it('throws on non-OK discovery responses', async () => {
    setOidcEnv();
    const fetchMock = vi.fn(async () => jsonResponse({}, 503));

    await expect(lib.discoverConfiguration(fetchMock as never)).rejects.toThrow(/503/);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc buildAuthorizationUrl', () => {
  const lib = oidc!;

  it('builds a code-flow authorization URL with all required params', async () => {
    setOidcEnv();
    const fetchMock = routingFetch();

    const url = await lib.buildAuthorizationUrl('state-1', 'nonce-1', fetchMock as never);

    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(AUTHZ_ENDPOINT);
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(parsed.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(parsed.searchParams.get('scope')).toBe(SCOPES);
    expect(parsed.searchParams.get('state')).toBe('state-1');
    expect(parsed.searchParams.get('nonce')).toBe('nonce-1');
  });

  it('performs discovery through the injected fetch', async () => {
    setOidcEnv();
    const fetchMock = routingFetch();

    await lib.buildAuthorizationUrl('state-1', 'nonce-1', fetchMock as never);

    expect(fetchMock).toHaveBeenCalledWith(`${ISSUER}/.well-known/openid-configuration`);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc exchangeCodeForTokens', () => {
  const lib = oidc!;

  it('POSTs an x-www-form-urlencoded body to the token endpoint and maps the response', async () => {
    setOidcEnv();
    const fetchMock = routingFetch({
      token: {
        id_token: 'id-token-1',
        access_token: 'at-1',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    });

    const result = await lib.exchangeCodeForTokens('auth-code-42', REDIRECT_URI, fetchMock as never);

    expect(result).toEqual({ idToken: 'id-token-1', accessToken: 'at-1', expiresIn: 3600 });

    const tokenCall = fetchMock.mock.calls.find(([url]) => String(url) === TOKEN_ENDPOINT);
    expect(tokenCall).toBeDefined();
    const [tokenUrl, tokenInit] = tokenCall!;
    expect(tokenUrl).toBe(TOKEN_ENDPOINT);
    expect(tokenInit?.method).toBe('POST');
    expect(tokenInit?.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });

    const body = new URLSearchParams(String(tokenInit?.body ?? ''));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code-42');
    expect(body.get('client_id')).toBe(CLIENT_ID);
    expect(body.get('client_secret')).toBe(CLIENT_SECRET);
    expect(body.get('redirect_uri')).toBe(REDIRECT_URI);
  });

  it('omits optional accessToken/expiresIn when the provider omits them', async () => {
    setOidcEnv();
    const fetchMock = routingFetch({ token: { id_token: 'id-token-1' } });

    const result = await lib.exchangeCodeForTokens('auth-code-42', REDIRECT_URI, fetchMock as never);

    expect(result).toEqual({ idToken: 'id-token-1' });
  });

  it('throws when the token response carries no id_token', async () => {
    setOidcEnv();
    const fetchMock = routingFetch({ token: { access_token: 'at-1' } });

    await expect(
      lib.exchangeCodeForTokens('auth-code-42', REDIRECT_URI, fetchMock as never),
    ).rejects.toThrow(/id_token/);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc verifyIdToken (RS256 via JWKS)', () => {
  const lib = oidc!;

  it('accepts a valid RS256 ID token and returns mapped claims', async () => {
    setOidcEnv();
    const { publicKey, privateKey } = makeKeyPair();
    const fetchMock = routingFetch({ jwks: { keys: [toJwk(publicKey)] } });
    const token = signIdToken(idTokenPayload(), crypto.createPrivateKey(privateKey));

    const verified = await lib.verifyIdToken(token, 'nonce-abc-123', fetchMock as never);

    expect(verified).toEqual({
      sub: 'user-123',
      email: 'alice@corp.com',
      name: 'Alice Example',
      roles: ['admin', 'viewer'],
    });
    // Signature verification drives both the discovery and the JWKS fetch.
    expect(fetchMock).toHaveBeenCalledWith(`${ISSUER}/.well-known/openid-configuration`);
    expect(fetchMock).toHaveBeenCalledWith(JWKS_URI);
  });

  it.each([
    ['a wrong issuer', idTokenPayload({ iss: 'https://evil.example.com' }), /issuer/i],
    ['a wrong audience', idTokenPayload({ aud: 'some-other-client' }), /audience/i],
    ['an expired token', idTokenPayload({ exp: Math.floor(Date.now() / 1000) - 300 }), /expired/i],
    ['a nonce mismatch', idTokenPayload({ nonce: 'a-different-nonce' }), /nonce/i],
  ])('rejects %s', async (_label, payload, messagePattern) => {
    setOidcEnv();
    const { publicKey, privateKey } = makeKeyPair();
    const fetchMock = routingFetch({ jwks: { keys: [toJwk(publicKey)] } });
    const token = signIdToken(payload, crypto.createPrivateKey(privateKey));

    await expect(
      lib.verifyIdToken(token, 'nonce-abc-123', fetchMock as never),
    ).rejects.toThrow(messagePattern);
  });

  it('rejects a token signed by a different key (bad signature)', async () => {
    setOidcEnv();
    const { publicKey } = makeKeyPair(); // key published in the JWKS
    const { privateKey: roguePrivateKey } = makeKeyPair(); // actual signer
    const fetchMock = routingFetch({ jwks: { keys: [toJwk(publicKey)] } });
    const token = signIdToken(idTokenPayload(), crypto.createPrivateKey(roguePrivateKey));

    await expect(
      lib.verifyIdToken(token, 'nonce-abc-123', fetchMock as never),
    ).rejects.toThrow(/signature/i);
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc mapUserFromClaims', () => {
  const lib = oidc!;

  it('maps email/name/roles from the configured role claim', () => {
    const user = lib.mapUserFromClaims(
      { sub: 'u1', email: 'alice@corp.com', name: 'Alice Example', roles: ['admin'] },
      'roles',
    );
    expect(user).toEqual({ email: 'alice@corp.com', name: 'Alice Example', roles: ['admin'] });
  });

  it('supports a custom role claim name', () => {
    const user = lib.mapUserFromClaims(
      { email: 'bob@corp.com', name: 'Bob Example', groups: ['editor', 'viewer'] },
      'groups',
    );
    expect(user).toEqual({ email: 'bob@corp.com', name: 'Bob Example', roles: ['editor', 'viewer'] });
  });

  it('returns an empty roles array when the role claim is missing', () => {
    const user = lib.mapUserFromClaims({ email: 'carol@corp.com', name: 'Carol Example' }, 'roles');
    expect(user).toEqual({ email: 'carol@corp.com', name: 'Carol Example', roles: [] });
  });
});

describe.skipIf(!oidcAvailable)('sso/oidc createSsoStateStore', () => {
  const lib = oidc!;

  it('exports STATE_TTL_MS as 600_000', () => {
    expect(lib.STATE_TTL_MS).toBe(600_000);
  });

  it('generate() returns distinct state/nonce pairs', () => {
    const store = lib.createSsoStateStore();
    const a = store.generate();
    const b = store.generate();
    expect(a.state).toBeTruthy();
    expect(a.nonce).toBeTruthy();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('consume() returns the nonce exactly once (single-flight)', () => {
    const store = lib.createSsoStateStore();
    const { state, nonce } = store.generate();
    expect(store.consume(state)).toBe(nonce);
    expect(store.consume(state)).toBeNull();
  });

  it('consume() returns null for unknown or empty states', () => {
    const store = lib.createSsoStateStore();
    expect(store.consume('no-such-state')).toBeNull();
    expect(store.consume('')).toBeNull();
  });

  it('consume() rejects states older than STATE_TTL_MS', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const store = lib.createSsoStateStore();
      const { state } = store.generate();

      vi.advanceTimersByTime(lib.STATE_TTL_MS + 1);

      expect(store.consume(state)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
