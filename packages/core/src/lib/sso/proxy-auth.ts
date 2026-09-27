/**
 * SSO proxy-header auth — reverse-proxy (Traefik / Nginx / Caddy /
 * Authentik) style. The proxy authenticates the user and forwards the
 * authenticated principal via a configurable header (default
 * `x-forwarded-user`), optionally with an email header (`x-forwarded-email`).
 *
 * Forwarded identity is only honored from a trusted source: the request must
 * carry SSO_PROXY_SECRET (header, default `x-proxy-secret`) or originate
 * from an IP in SSO_PROXY_TRUSTED_IPS.
 *
 * Env vars are read at call time so tests can set process.env per-case.
 */

import crypto from 'crypto';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HeaderBag = Record<string, string | string[] | undefined>;

export interface ProxySsoUser {
  email: string;
  name?: string;
  openId: string;
}

/* ------------------------------------------------------------------ */
/*  Env helpers                                                        */
/* ------------------------------------------------------------------ */

function readEnv(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
}

const BOOL_TRUE = new Set(['true', '1', 'yes', 'on']);

/* ------------------------------------------------------------------ */
/*  Feature switch                                                     */
/* ------------------------------------------------------------------ */

/** Master switch for reverse-proxy header SSO. */
export function isProxySsoEnabled(): boolean {
  return BOOL_TRUE.has(readEnv('SSO_PROXY_ENABLED', 'false').toLowerCase());
}

/* ------------------------------------------------------------------ */
/*  Header resolution                                                  */
/* ------------------------------------------------------------------ */

/** Case-insensitive header lookup; arrays collapse to their first value. */
function pickHeader(headers: HeaderBag, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) {
      const raw = headers[key];
      if (Array.isArray(raw)) return raw[0];
      return raw;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Trust evidence                                                     */
/* ------------------------------------------------------------------ */

let warnedMissingTrust = false;

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Exact match or IPv4 CIDR (enough for trusted proxy subnets). */
function ipMatchesEntry(ip: string, entry: string): boolean {
  if (entry.includes('/')) {
    const [base, bitsRaw] = entry.split('/');
    const bits = Number(bitsRaw);
    const v4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!v4.test(base) || !v4.test(ip) || !Number.isInteger(bits) || bits < 0 || bits > 32) {
      return false;
    }
    const toInt = (v: string) => v.split('.').reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
    const mask = bits === 0 ? 0 : ((0xffffffff << (32 - bits)) >>> 0);
    return (toInt(ip) & mask) === (toInt(base) & mask);
  }
  return ip === entry;
}

/**
 * A forwarded identity header is only honored from a trusted source:
 * a request carrying the shared secret (SSO_PROXY_SECRET, via
 * SSO_PROXY_SECRET_HEADER, default `x-proxy-secret`) or originating from an
 * address in SSO_PROXY_TRUSTED_IPS (exact IP or IPv4 CIDR list). Without
 * trust evidence, forwarded identity is IGNORED — otherwise any client that
 * can reach the app directly could impersonate any user by setting a header.
 */
function isTrustedProxyRequest(headers: HeaderBag, remoteAddress?: string | null): boolean {
  const secret = readEnv('SSO_PROXY_SECRET');
  const trustedIps = readEnv('SSO_PROXY_TRUSTED_IPS');

  if (!secret && !trustedIps) {
    if (!warnedMissingTrust) {
      console.warn(
        '[ProxySSO] SSO_PROXY_ENABLED is on but neither SSO_PROXY_SECRET nor ' +
        'SSO_PROXY_TRUSTED_IPS is configured — forwarded identity headers are ' +
        'being ignored (without trust evidence any client could impersonate any user).'
      );
      warnedMissingTrust = true;
    }
    return false;
  }

  if (secret) {
    const secretHeaderName = readEnv('SSO_PROXY_SECRET_HEADER', 'x-proxy-secret').toLowerCase();
    const provided = pickHeader(headers, secretHeaderName);
    if (provided && timingSafeEqualStr(provided.trim(), secret)) return true;
  }

  if (trustedIps && remoteAddress) {
    const ip = remoteAddress.trim().replace(/^::ffff:/i, '');
    for (const entry of trustedIps.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (ipMatchesEntry(ip, entry)) return true;
    }
  }

  return false;
}

/**
 * Resolve the authenticated principal from the request headers.
 * Returns null when proxy SSO is disabled, the request lacks trust evidence,
 * or the principal header is missing. openId is namespaced
 * (`sso_proxy:<email>`) so proxy users can never collide with
 * Supabase/OIDC identifiers.
 */
export function resolveProxyUser(headers: HeaderBag, remoteAddress?: string | null): ProxySsoUser | null {
  if (!isProxySsoEnabled()) return null;

  const authHeaderName = readEnv('SSO_PROXY_AUTH_HEADER', 'x-forwarded-user').toLowerCase();
  const emailHeaderName = readEnv('SSO_PROXY_EMAIL_HEADER', 'x-forwarded-email').toLowerCase();

  const principal = pickHeader(headers, authHeaderName)?.trim();
  if (!principal) return null;

  if (!isTrustedProxyRequest(headers, remoteAddress)) return null;

  const email = pickHeader(headers, emailHeaderName)?.trim() || principal;

  return {
    email,
    name: principal,
    openId: `sso_proxy:${email}`,
  };
}
