/**
 * SSO proxy-header auth — reverse-proxy (Traefik / Nginx / Caddy /
 * Authentik) style. The proxy authenticates the user and forwards the
 * authenticated principal via a configurable header (default
 * `x-forwarded-user`), optionally with an email header (`x-forwarded-email`).
 *
 * Env vars are read at call time so tests can set process.env per-case.
 */

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

/**
 * Resolve the authenticated principal from the request headers.
 * Returns null when proxy SSO is disabled or the principal header is
 * missing. openId is namespaced (`sso_proxy:<email>`) so proxy users can
 * never collide with Supabase/OIDC identifiers.
 */
export function resolveProxyUser(headers: HeaderBag): ProxySsoUser | null {
  if (!isProxySsoEnabled()) return null;

  const authHeaderName = readEnv('SSO_PROXY_AUTH_HEADER', 'x-forwarded-user').toLowerCase();
  const emailHeaderName = readEnv('SSO_PROXY_EMAIL_HEADER', 'x-forwarded-email').toLowerCase();

  const principal = pickHeader(headers, authHeaderName)?.trim();
  if (!principal) return null;

  const email = pickHeader(headers, emailHeaderName)?.trim() || principal;

  return {
    email,
    name: principal,
    openId: `sso_proxy:${email}`,
  };
}
