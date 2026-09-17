/**
 * Enterprise SSO router (cycle 9, scorecard #13).
 *
 * Exposes the OIDC handshake as tRPC procedures:
 *   - sso.status   → current SSO configuration (never echoes secrets)
 *   - sso.start    → generate state/nonce and return the IdP authorization URL
 *   - sso.callback → exchange the code, verify the ID token, upsert the user
 *                    by openId (loginMethod 'sso') and issue a session JWT
 *
 * Mirrors the createEvidenceRenewalRouter factory pattern:
 * `createSsoRouter(t, publicProcedure)`.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as db from '../../db';
import { issueToken } from '../../lib/auth/local-auth';
import {
  isProxySsoEnabled,
  getOidcClientConfig,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  verifyIdToken,
  createSsoStateStore,
} from '../../lib/sso';

/** Instance-local state store (single-instance self-host deployments). */
const ssoStateStore = createSsoStateStore();

/** Stable helper — converts unexpected failures into descriptive TRPCErrors. */
function ssoError(err: unknown, fallback: string): never {
  const detail = err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `SSO: ${detail}`,
    cause: err,
  });
}

export const createSsoRouter = (t: any, publicProcedure: any) => {
  return t.router({
    /**
     * Public SSO status — lets the UI decide which flow to show.
     * Never echoes clientSecret or any secret.
     */
    status: publicProcedure.query(async () => {
      const oidcConfig = getOidcClientConfig();
      const proxyEnabled = isProxySsoEnabled();

      let providerName: string | undefined;
      if (oidcConfig?.issuer) {
        try {
          providerName = new URL(oidcConfig.issuer).hostname;
        } catch {
          providerName = oidcConfig.issuer;
        }
      }

      return {
        enabled: !!oidcConfig || proxyEnabled,
        mode: oidcConfig ? ('oidc' as const) : proxyEnabled ? ('proxy' as const) : ('none' as const),
        providerName,
        issuer: oidcConfig?.issuer,
        roleClaim: oidcConfig?.roleClaim,
        proxyHeader: proxyEnabled ? proxyHeaderName() : undefined,
        redirectUri: oidcConfig?.redirectUri,
      };
    }),

    /**
     * Start the OIDC authorization-code flow. Returns the IdP URL the
     * browser should be redirected to.
     */
    start: publicProcedure.query(async () => {
      const config = getOidcClientConfig();
      if (!config) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'SSO OIDC is not enabled or configured.',
        });
      }
      try {
        const { state, nonce } = ssoStateStore.generate();
        const authorizationUrl = await buildAuthorizationUrl(state, nonce);
        return { authorizationUrl };
      } catch (err) {
        return ssoError(err, 'could not build the SSO authorization URL');
      }
    }),

    /**
     * OIDC callback — exchange the code, verify the ID token (nonce),
     * upsert the user by openId (loginMethod 'sso') and issue a session
     * JWT via localAuth.issueToken.
     */
    callback: publicProcedure
      .input(z.object({ code: z.string().min(1), state: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const config = getOidcClientConfig();
        if (!config) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'SSO OIDC is not enabled or configured.',
          });
        }

        // Consume the state single-flight — invalid/expired/replayed states
        // are rejected here.
        const nonce = ssoStateStore.consume(input.state);
        if (!nonce) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'SSO state is invalid or expired. Please start a new sign-in.',
          });
        }

        try {
          const tokens = await exchangeCodeForTokens(input.code, config.redirectUri);
          const verified = await verifyIdToken(tokens.idToken, nonce);

          const openId = verified.sub;
          const email = verified.email || '';
          const name = verified.name || '';

          // DB-backed upsert by openId — degrade gracefully, never crash.
          await db.upsertUser({
            openId,
            email: email || undefined,
            name: name || undefined,
            loginMethod: 'sso',
            lastSignedIn: new Date(),
          });

          const dbUser = await db.getUserByOpenId(openId);
          if (!dbUser) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'SSO sign-in could not create a user record.',
            });
          }

          const role = dbUser.role || 'user';
          const token = issueToken({
            id: String(dbUser.id),
            email: dbUser.email || email,
            role,
          });

          return {
            token,
            user: {
              id: dbUser.id,
              email: dbUser.email || email,
              name: dbUser.name || name,
              role,
            },
          };
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          return ssoError(err, 'SSO sign-in failed');
        }
      }),
  });
};

/* ------------------------------------------------------------------ */
/*  Small env helpers (server-side only)                               */
/* ------------------------------------------------------------------ */

function proxyHeaderName(): string {
  return typeof process !== 'undefined' && process.env
    ? process.env.SSO_PROXY_AUTH_HEADER || 'x-forwarded-user'
    : 'x-forwarded-user';
}
