/**
 * Enterprise SSO — public barrel.
 *
 * Approach A: direct OIDC (lib/sso/oidc.ts)
 * Approach B: reverse-proxy header auth (lib/sso/proxy-auth.ts)
 *
 * See docs/self-hosted/sso.md for the full design.
 */

export * from './oidc';
export * from './proxy-auth';
