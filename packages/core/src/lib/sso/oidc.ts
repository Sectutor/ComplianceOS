/**
 * SSO OIDC client — pure-ish module with injectable fetch.
 *
 * Implements the Authorization Code flow (state + nonce) with RS256
 * ID-token verification against the IdP's JWKS endpoint. All network
 * access goes through an optional `fetchImpl` (defaults to
 * globalThis.fetch) so the module is fully unit-testable with a mocked
 * fetch. Env vars are read at call time (not module load) so tests can
 * set process.env per-case.
 *
 * Contract (cycle 9, scorecard #13): see docs/self-hosted/sso.md
 */

import crypto from 'crypto';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** State/nonce validity window (10 minutes). */
export const STATE_TTL_MS = 10 * 60_000;

/** Clock-skew leeway (seconds) tolerated when validating exp/iat. */
const CLOCK_SKEW_LEEWAY_SEC = 60;

/* ------------------------------------------------------------------ */
/*  Env helpers (call-time reads, safe in browser builds)              */
/* ------------------------------------------------------------------ */

function readEnv(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
}

const BOOL_TRUE = new Set(['true', '1', 'yes', 'on']);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Minimal structural Response type so mocks satisfy FetchLike. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<FetchResponseLike>;

export interface OidcClientConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  redirectUri: string;
  roleClaim: string;
}

export interface OidcDiscovery {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
}

export interface IdTokenClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  [claim: string]: unknown;
}

export interface VerifiedIdToken {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

export interface SsoUserProfile {
  email: string;
  name: string;
  roles: string[];
}

export interface SsoStateStore {
  generate(): { state: string; nonce: string };
  consume(state: string): string | null;
}

/* ------------------------------------------------------------------ */
/*  Default fetch                                                      */
/* ------------------------------------------------------------------ */

const defaultFetch: FetchLike = (input, init) =>
  globalThis.fetch(input, init as RequestInit) as Promise<FetchResponseLike>;

function getFetch(fetchImpl?: FetchLike): FetchLike {
  return fetchImpl || defaultFetch;
}

/* ------------------------------------------------------------------ */
/*  Feature switch + config                                            */
/* ------------------------------------------------------------------ */

/** Master switch for the built-in OIDC flow. */
export function isOidcEnabled(): boolean {
  return BOOL_TRUE.has(readEnv('SSO_OIDC_ENABLED', 'false').toLowerCase());
}

/**
 * Resolved OIDC client configuration, or null when the feature is
 * disabled or incompletely configured (issuer / client id / secret).
 * The redirect URI defaults to `<APP_URL>/auth/sso/callback`.
 */
export function getOidcClientConfig(): OidcClientConfig | null {
  if (!isOidcEnabled()) return null;

  const issuer = readEnv('SSO_OIDC_ISSUER').trim();
  const clientId = readEnv('SSO_OIDC_CLIENT_ID').trim();
  const clientSecret = readEnv('SSO_OIDC_CLIENT_SECRET');
  if (!issuer || !clientId || !clientSecret) return null;

  const scopes = readEnv('SSO_OIDC_SCOPES', 'openid email profile').trim() || 'openid email profile';
  const roleClaim = readEnv('SSO_OIDC_ROLE_CLAIM', 'groups').trim() || 'groups';

  let redirectUri = readEnv('SSO_OIDC_REDIRECT_URI').trim();
  if (!redirectUri) {
    const appUrl =
      readEnv('APP_URL').trim() ||
      readEnv('VITE_APP_URL').trim() ||
      readEnv('NEXT_PUBLIC_APP_URL').trim();
    if (appUrl) {
      redirectUri = `${appUrl.replace(/\/+$/, '')}/auth/sso/callback`;
    }
  }

  return { issuer, clientId, clientSecret, scopes, redirectUri, roleClaim };
}

/* ------------------------------------------------------------------ */
/*  Discovery                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch the OIDC discovery document from
 * `${issuer}/.well-known/openid-configuration`.
 */
export async function discoverConfiguration(fetchImpl?: FetchLike): Promise<OidcDiscovery> {
  const config = getOidcClientConfig();
  if (!config) {
    throw new Error('SSO OIDC is not enabled or configured');
  }
  const fetchFn = getFetch(fetchImpl);
  const discoveryUrl = `${config.issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;

  const res = await fetchFn(discoveryUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch OIDC discovery document: HTTP ${res.status}`);
  }
  const data = (await res.json()) as Record<string, unknown>;

  const authorizationEndpoint = data.authorization_endpoint;
  const tokenEndpoint = data.token_endpoint;
  const jwksUri = data.jwks_uri;
  if (
    typeof authorizationEndpoint !== 'string' ||
    typeof tokenEndpoint !== 'string' ||
    typeof jwksUri !== 'string'
  ) {
    throw new Error('OIDC discovery document is missing required endpoints');
  }

  return {
    issuer: typeof data.issuer === 'string' ? data.issuer : config.issuer,
    authorizationEndpoint,
    tokenEndpoint,
    jwksUri,
  };
}

/* ------------------------------------------------------------------ */
/*  Authorization request URL                                          */
/* ------------------------------------------------------------------ */

/**
 * Build the IdP authorization URL. Performs discovery internally.
 * Query params: response_type=code, scope, client_id, redirect_uri,
 * state and nonce (URLSearchParams).
 */
export async function buildAuthorizationUrl(
  state: string,
  nonce: string,
  fetchImpl?: FetchLike,
): Promise<string> {
  const config = getOidcClientConfig();
  if (!config) {
    throw new Error('SSO OIDC is not enabled or configured');
  }
  if (!config.redirectUri) {
    throw new Error(
      'SSO OIDC redirect URI is not configured (set SSO_OIDC_REDIRECT_URI or APP_URL)',
    );
  }

  const discovery = await discoverConfiguration(fetchImpl);

  const params = new URLSearchParams({
    response_type: 'code',
    scope: config.scopes,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    nonce,
  });

  const endpoint = discovery.authorizationEndpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Token exchange                                                     */
/* ------------------------------------------------------------------ */

/**
 * Exchange the authorization code for tokens at the token endpoint.
 * POST body is application/x-www-form-urlencoded and includes
 * client_id + client_secret.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  fetchImpl?: FetchLike,
): Promise<{ idToken: string; accessToken?: string; expiresIn?: number }> {
  const config = getOidcClientConfig();
  if (!config) {
    throw new Error('SSO OIDC is not enabled or configured');
  }
  const fetchFn = getFetch(fetchImpl);
  const discovery = await discoverConfiguration(fetchImpl);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetchFn(discovery.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    id_token?: unknown;
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof data.id_token !== 'string' || !data.id_token) {
    throw new Error('Token exchange response did not include an id_token');
  }

  return {
    idToken: data.id_token,
    accessToken: typeof data.access_token === 'string' ? data.access_token : undefined,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  ID token verification (RS256 via JWKS)                             */
/* ------------------------------------------------------------------ */

function decodeJwtSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
}

function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, '');
}

/**
 * Verify an RS256-signed ID token against the IdP JWKS and the expected
 * nonce. Returns the subject + mapped profile claims. Throws Error with
 * a descriptive message on every failure path.
 */
export async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
  fetchImpl?: FetchLike,
): Promise<VerifiedIdToken> {
  const config = getOidcClientConfig();
  if (!config) {
    throw new Error('SSO OIDC is not enabled or configured');
  }

  const segments = idToken.split('.');
  if (segments.length !== 3) {
    throw new Error('ID token is malformed: expected 3 dot-separated segments');
  }
  const [headerB64, payloadB64, signatureB64] = segments;

  let header: { alg?: string; kid?: string };
  let payload: IdTokenClaims;
  try {
    header = decodeJwtSegment(headerB64) as { alg?: string; kid?: string };
    payload = decodeJwtSegment(payloadB64) as IdTokenClaims;
  } catch (err) {
    throw new Error(`ID token decoding failed: ${(err as Error).message}`);
  }

  if (header.alg !== 'RS256') {
    throw new Error(`ID token algorithm must be RS256, got "${header.alg || 'unknown'}"`);
  }
  if (!payload.sub) {
    throw new Error('ID token is missing the subject (sub) claim');
  }
  if (!payload.iss || normalizeIssuer(payload.iss) !== normalizeIssuer(config.issuer)) {
    throw new Error('ID token issuer does not match the configured issuer');
  }
  const audiences = Array.isArray(payload.aud)
    ? payload.aud
    : payload.aud
      ? [payload.aud]
      : [];
  if (!audiences.includes(config.clientId)) {
    throw new Error('ID token audience does not match the configured client id');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now - CLOCK_SKEW_LEEWAY_SEC) {
    throw new Error('ID token is expired or missing an exp claim');
  }
  if (typeof payload.iat === 'number' && payload.iat > now + CLOCK_SKEW_LEEWAY_SEC) {
    throw new Error('ID token was issued in the future (iat claim is not sane)');
  }
  if (payload.nonce !== expectedNonce) {
    throw new Error('ID token nonce does not match the expected nonce');
  }

  // Signature verification against the IdP JWKS.
  const discovery = await discoverConfiguration(fetchImpl);
  const fetchFn = getFetch(fetchImpl);
  const jwksRes = await fetchFn(discovery.jwksUri);
  if (!jwksRes.ok) {
    throw new Error(`Failed to fetch JWKS: HTTP ${jwksRes.status}`);
  }
  const jwks = (await jwksRes.json()) as { keys?: JsonWebKey[] };
  const keys = (jwks.keys || []) as Array<JsonWebKey & { kid?: string }>;
  const jwk =
    keys.find((k) => k.kid === header.kid) || (keys.length === 1 ? keys[0] : undefined);
  if (!jwk) {
    throw new Error(`No JWKS key found for kid "${header.kid || 'unknown'}"`);
  }

  const signature = Buffer.from(signatureB64, 'base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  let valid = false;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: 'jwk' });
    valid = crypto.verify('RSA-SHA256', Buffer.from(signingInput, 'utf-8'), publicKey, signature);
  } catch (err) {
    throw new Error(`ID token signature verification failed: ${(err as Error).message}`);
  }
  if (!valid) {
    throw new Error('ID token signature verification failed');
  }

  const { email, name, roles } = mapUserFromClaims(payload, config.roleClaim);
  return { sub: payload.sub, email, name, roles };
}

/* ------------------------------------------------------------------ */
/*  Claim mapping                                                      */
/* ------------------------------------------------------------------ */

/**
 * Extract the normalized profile from decoded ID-token claims.
 * Roles come from the configured claim (default "groups") and may be an
 * array of strings or a space/comma separated string.
 */
export function mapUserFromClaims(claims: IdTokenClaims, roleClaim: string): SsoUserProfile {
  const raw = claims[roleClaim];
  let roles: string[] = [];
  if (Array.isArray(raw)) {
    roles = raw.filter((item): item is string => typeof item === 'string');
  } else if (typeof raw === 'string') {
    roles = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const email = typeof claims.email === 'string' && claims.email ? claims.email : '';
  const fallbackName = email ? email.split('@')[0] : '';
  const name =
    typeof claims.name === 'string' && claims.name
      ? claims.name
      : typeof claims.preferred_username === 'string' && claims.preferred_username
        ? claims.preferred_username
        : fallbackName;

  return { email, name, roles };
}

/* ------------------------------------------------------------------ */
/*  In-memory state store (state ⇄ nonce, single-flight, TTL)          */
/* ------------------------------------------------------------------ */

interface SsoStateEntry {
  nonce: string;
  expiresAt: number;
}

/**
 * Create a single-flight state store. `consume` deletes the entry on
 * first use, so a state can never be replayed. Entries older than
 * STATE_TTL_MS are rejected. Instance-local — suitable for a
 * single-instance self-hosted deployment.
 */
export function createSsoStateStore(): SsoStateStore {
  const entries = new Map<string, SsoStateEntry>();

  return {
    generate(): { state: string; nonce: string } {
      const state = crypto.randomBytes(16).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');
      entries.set(state, { nonce, expiresAt: Date.now() + STATE_TTL_MS });
      return { state, nonce };
    },

    consume(state: string): string | null {
      if (!state) return null;
      const entry = entries.get(state);
      if (!entry) return null;
      entries.delete(state); // single-flight: consumed exactly once
      if (Date.now() > entry.expiresAt) return null;
      return entry.nonce;
    },
  };
}
