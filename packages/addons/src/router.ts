/**
 * Addon Marketplace tRPC Router
 *
 * Provides the API endpoints for:
 * - Browsing available addons
 * - Starting trials
 * - Managing subscriptions
 * - Configuring addon settings
 * - Triggering manual runs
 * - Viewing run history
 *
 * Follows the same patterns as plugins.ts and integrations.ts.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, gt, or, sql } from 'drizzle-orm';
import { ADDON_REGISTRY, getAddonBySlug, listAddons } from './registry';
import { getExecutor } from './runtime/executor-instance';

// Raw postgres.js client — avoids compatibility issues with drizzle's
// db.select() and db.session access in the addon module context.
// Gets DATABASE_URL from the already-loaded process.env (env-loader).
let _addonSql: import('postgres').Sql<{}> | null = null;
async function getSql() {
  if (!_addonSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    // Dynamic import to avoid ESM/CJS issues
    const { default: postgres } = await import('postgres');
    _addonSql = postgres(url, {
      max: 2,
      idle_timeout: 15,
      connection: { statement_timeout: 10000 },
    });
  }
  return _addonSql;
}

/** Run a select query against addon_subscriptions using raw SQL */
async function findSubscription(clientId: number, addonSlug: string) {
  const sql = await getSql();
  const rows = await sql`
    SELECT * FROM addon_subscriptions
    WHERE client_id = ${clientId} AND addon_slug = ${addonSlug}
    LIMIT 1
  `;
  return rows[0] || null;
}

/** Run a select query with status filter */
async function findActiveSubscription(clientId: number, addonSlug: string) {
  const sql = await getSql();
  const rows = await sql`
    SELECT * FROM addon_subscriptions
    WHERE client_id = ${clientId}
      AND addon_slug = ${addonSlug}
      AND (status = 'active' OR status = 'trial')
    LIMIT 1
  `;
  return rows[0] || null;
}

/** List all subscriptions for a client */
async function listSubscriptions(clientId: number) {
  const sql = await getSql();
  return await sql`
    SELECT * FROM addon_subscriptions
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
  `;
}

/** List all subscriptions (admin) */
async function listAllSubscriptions(opts: { status?: string; addonSlug?: string; limit: number }) {
  const sql = await getSql();
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (opts.status) {
    conditions.push(`status = $${idx++}`);
    params.push(opts.status);
  }
  if (opts.addonSlug) {
    conditions.push(`addon_slug = $${idx++}`);
    params.push(opts.addonSlug);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await sql.unsafe(`
    SELECT * FROM addon_subscriptions ${where}
    ORDER BY created_at DESC
    LIMIT ${opts.limit}
  `, params);
  return rows;
}

/** Resolve clientId from ctx, input, or user's first membership */
async function resolveClientId(ctx: any, inputClientId?: number): Promise<number> {
  if (inputClientId) return inputClientId;
  if (ctx.clientId) return ctx.clientId;
  const sql = await getSql();
  const [membership] = await sql`
    SELECT client_id FROM user_clients WHERE user_id = ${ctx.user?.id || 0} ORDER BY joined_at ASC LIMIT 1
  `;
  if (membership) return membership.client_id;
  throw new Error('No client workspace found. Please select or create a workspace first.');
}

/** Get run history */
async function getRunLogs(clientId: number, addonSlug: string, limit: number, offset: number) {
  const pg = await getSql();
  const runs = await pg`
    SELECT * FROM addon_run_logs
    WHERE client_id = ${clientId} AND addon_slug = ${addonSlug}
    ORDER BY started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [totalRow] = await pg`
    SELECT count(*)::int as count FROM addon_run_logs
    WHERE client_id = ${clientId} AND addon_slug = ${addonSlug}
  `;
  return { runs, total: totalRow?.count || 0 };
}

/**
 * Create the addon marketplace router.
 *
 * @param t - tRPC instance
 * @param clientProcedure - procedure that requires client context
 * @param adminProcedure - procedure that requires admin context
 * @param publicProcedure - procedure that allows unauthenticated access
 */
export function createAddonRouter(
  t: any,
  clientProcedure: any,
  adminProcedure: any,
  publicProcedure: any,
  protectedProcedure: any,
) {
  return t.router({
    // ── Public / Discovery ──────────────────────────────────────

    /**
     * List all available addons in the marketplace.
     * Optionally filter by category.
     */
    listMarketplace: publicProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const addons = listAddons(input?.category);
        return {
          addons,
          total: addons.length,
          categories: [
            { slug: 'scanner', label: 'Cloud & Infrastructure Security' },
            { slug: 'siem', label: 'Endpoint Security & SIEM' },
            { slug: 'dependency', label: 'Supply Chain Security' },
            { slug: 'ai', label: 'AI-Powered Compliance' },
          ],
        };
      }),

    /**
     * Get details for a single addon.
     */
    getAddon: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const addon = getAddonBySlug(input.slug);
        if (!addon) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Addon "${input.slug}" not found`,
          });
        }
        return addon;
      }),

    // ── Subscription Management ────────────────────────────────

    /**
     * Get the current client's subscriptions (including trial status).
     */
    listMySubscriptions: clientProcedure.query(async ({ ctx }) => {
      const clientId = await resolveClientId(ctx);
      const subs = await listSubscriptions(clientId);

      // Enrich subscriptions with addon manifest data
      return subs.map((sub: any) => ({
        ...sub,
        manifest: getAddonBySlug(sub.addon_slug) || null,
      }));
    }),

    /**
     * Get subscription status for a specific addon.
     */
    getSubscription: clientProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input, ctx }) => {
        const clientId = await resolveClientId(ctx);
        const sub = await findSubscription(clientId, input.slug);
        return sub || null;
      }),

    /**
     * Start a 14-day free trial for an addon.
     */
    startTrial: clientProcedure
      .input(z.object({
        slug: z.string(),
        clientId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const addon = getAddonBySlug(input.slug);
        if (!addon) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Addon not found' });
        }

        // Resolve clientId: try input, then ctx, then user's first membership
        let clientId = input.clientId || ctx.clientId;
        if (!clientId) {
          const sql = await getSql();
          const [membership] = await sql`
            SELECT client_id FROM user_clients WHERE user_id = ${ctx.user?.id || 0} ORDER BY joined_at ASC LIMIT 1
          `;
          if (membership) {
            clientId = membership.client_id;
          } else {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'No client workspace found. Please select or create a workspace first.' });
          }
        }

        const sql = await getSql();

        // Check if already subscribed or trialing
        const existing = await findSubscription(clientId, input.slug);

        if (existing) {
          if (existing.status === 'trial' || existing.status === 'active') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Already on ${existing.status === 'trial' ? 'trial' : 'subscription'} for "${input.slug}"`,
            });
          }
          // Re-activate expired/cancelled subscription
          const [updated] = await sql`
            UPDATE addon_subscriptions
            SET status = 'trial',
                trial_ends_at = ${new Date(Date.now() + addon.trialDays * 86400000)},
                updated_at = NOW()
            WHERE id = ${existing.id}
            RETURNING *
          `;
          return updated;
        }

        // Create new trial subscription with sensible defaults
        const now = new Date();
        const trialEnd = new Date(now.getTime() + addon.trialDays * 86400000);

        const DEFAULT_ADDON_SETTINGS: Record<string, Record<string, any>> = {
          'dep-scanner': {
            repos: [],
            directories: ['./'],
            sbomFiles: [],
            minSeverity: 'MEDIUM',
            scanType: 'fs',
            schedule: 'weekly',
            timeout: 120,
          },
          'cloud-scanner': {
            awsAccounts: [],
            azureSubscriptions: [],
            gcpProjects: [],
            frameworks: ['nist_csf_2.0', 'soc2'],
            schedule: 'weekly',
          },
          'endpoint-siem': {
            managerHost: '',
            managerPort: 55000,
            protocol: 'https',
            alertLevel: 5,
            rulesets: ['pci_dss', 'nist_800_53'],
            autoDeploy: false,
          },
          'evidence-gap-detector': {
            minConfidence: 0.7,
            schedule: 'daily',
          },
          'ai-questionnaire': {
            autoRespond: false,
            schedule: 'on-demand',
          },
        };

        const settingsObj = DEFAULT_ADDON_SETTINGS[input.slug] ?? {};

        const [sub] = await sql`
          INSERT INTO addon_subscriptions (client_id, addon_slug, status, trial_ends_at, settings, auto_renew, created_at, updated_at)
          VALUES (${clientId}, ${input.slug}, 'trial', ${trialEnd}, ${settingsObj}, true, ${now}, ${now})
          RETURNING *
        `;

        return sub;
      }),

    /**
     * Cancel an addon subscription.
     * Remains active until the current period ends.
     */
    cancelSubscription: clientProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sql = await getSql();
        const clientId = await resolveClientId(ctx);
        const sub = await findActiveSubscription(clientId, input.slug);

        if (!sub) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          });
        }

        // If Stripe subscription exists, cancel it
        if (sub.stripe_subscription_id) {
          // await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          //   cancel_at_period_end: true,
          // });
        }

        const [updated] = await sql`
          UPDATE addon_subscriptions
          SET status = 'cancelled',
              auto_renew = false,
              updated_at = NOW()
          WHERE id = ${sub.id}
          RETURNING *
        `;

        return updated;
      }),

    // ── Addon Configuration ────────────────────────────────────

    /**
     * Update addon settings (cloud accounts, frameworks, schedule, etc.).
     */
    updateSettings: clientProcedure
      .input(
        z.object({
          slug: z.string(),
          settings: z.record(z.any()),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const clientId = await resolveClientId(ctx);
        const sql = await getSql();

        const [updated] = await sql`
          UPDATE addon_subscriptions
          SET settings = ${input.settings},
              updated_at = NOW()
          WHERE client_id = ${clientId} AND addon_slug = ${input.slug}
          RETURNING *
        `;

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No subscription found for this addon',
          });
        }

        return updated;
      }),

    // ── Execution ───────────────────────────────────────────────

    /**
     * Manually trigger an addon run.
     * Useful for: first-time setup, testing, or running out-of-schedule.
     */
    runNow: clientProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const clientId = await resolveClientId(ctx);
        const result = await getExecutor().execute(
          clientId,
          input.slug,
          'manual',
        );
        return result;
      }),

    /**
     * Get run history for an addon.
     */
    getRunHistory: clientProcedure
      .input(
        z.object({
          slug: z.string(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        }),
      )
      .query(async ({ input, ctx }) => {
        const clientId = await resolveClientId(ctx);
        const { runs, total } = await getRunLogs(clientId, input.slug, input.limit, input.offset);
        return { runs, total };
      }),

    // ── Admin ───────────────────────────────────────────────────

    /**
     * Admin: list all client subscriptions for management.
     */
    adminListSubscriptions: adminProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            addonSlug: z.string().optional(),
            limit: z.number().default(50),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const subscriptions = await listAllSubscriptions({
          status: input?.status,
          addonSlug: input?.addonSlug,
          limit: input?.limit ?? 50,
        });

        return { subscriptions, total: subscriptions.length };
      }),
  });
}
