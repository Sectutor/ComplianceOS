/**
 * Addon Database Schema
 *
 * Tracks addon subscriptions per client and per-run logs.
 * These tables live in the same PostgreSQL as the rest of GRCompliance.
 */

import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Tracks which addons each client has subscribed to and their current status.
 *
 * Status lifecycle:
 *   trial (14 days) ───► active (paid) ───► cancelled
 *                           │                   │
 *                           ├── payment_failed  │
 *                           │    └── expired    │
 *                           └───────────────────┘
 *
 * A client can re-subscribe after cancellation.
 */
export const addonSubscriptions = pgTable(
  'addon_subscriptions',
  {
    id: serial('id').primaryKey(),

    /** Which client owns this subscription */
    clientId: integer('client_id').notNull(),
    // FK to core clients table (resolved at drizzle schema merge in the core app)

    /** Addon slug from the registry (e.g. "cloud-scanner") */
    addonSlug: varchar('addon_slug', { length: 64 }).notNull(),

    /**
     * Subscription status:
     * - trial:       Free trial period, addon is fully functional
     * - active:      Paid subscription, addon is fully functional
     * - payment_failed: Payment didn't go through, grace period
     * - expired:     Trial or subscription ended, addon disabled
     * - cancelled:   User cancelled, remains active until period end
     */
    status: varchar('status', { length: 20 }).notNull().default('trial'),

    /** When the trial period ends (14 days from start) */
    trialEndsAt: timestamp('trial_ends_at'),

    /** Current billing period start/end (for active subscriptions) */
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),

    /**
     * Per-client configuration for this addon.
     * Each addon defines its own settings schema:
     *
     * Cloud Scanner:
     * { awsAccounts: [{name, accessKeyId, regions}], frameworks: [...], schedule: "weekly" }
     *
     * Endpoint SIEM:
     * { endpoints: [{hostname, os, agentVersion}], rulesets: [...], alertLevel: 5 }
     *
     * Dependency Scanner:
     * { repos: [{url, branch}], scanSchedule: "weekly", alertOnCritical: true }
     */
    settings: jsonb('settings').default({}).notNull(),

    /** Stripe subscription ID for billing management */
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }),

    /** Stripe price ID for the current plan */
    stripePriceId: varchar('stripe_price_id', { length: 128 }),

    /** When the last scan/run completed */
    lastSyncAt: timestamp('last_sync_at'),

    /** When the next scheduled run should execute */
    nextScheduledRun: timestamp('next_scheduled_run'),

    /** Whether the addon auto-renews */
    autoRenew: boolean('auto_renew').default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    /** Fast lookup: find a client's subscription to a specific addon */
    clientAddonIdx: index('idx_addon_sub_client_addon').on(
      table.clientId,
      table.addonSlug,
    ),
    /** Find all active subscriptions (for cron/scheduling) */
    statusIdx: index('idx_addon_sub_status').on(table.status),
    /** Find subscriptions due for a run */
    scheduledRunIdx: index('idx_addon_sub_next_run').on(table.nextScheduledRun),
  }),
);

/**
 * Tracks individual runs/executions of an addon.
 * Useful for: run history, error debugging, billing usage.
 */
export const addonRunLogs = pgTable(
  'addon_run_logs',
  {
    id: serial('id').primaryKey(),

    /** Which subscription this run belongs to */
    subscriptionId: integer('subscription_id').references(() => addonSubscriptions.id),

    /** Which addon ran (denormalized for fast querying) */
    addonSlug: varchar('addon_slug', { length: 64 }).notNull(),

    /** Which client this run was for (denormalized) */
    clientId: integer('client_id').notNull(),

    /** How the run was triggered */
    trigger: varchar('trigger', { length: 20 }).notNull().default('scheduled'),
    // "scheduled" | "manual" | "webhook" | "onboarding"

    /** Run status */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // "pending" | "running" | "completed" | "failed" | "skipped"

    /** How many findings were produced */
    findingsCount: integer('findings_count').default(0),

    /** How many risks were created (or updated) from this run */
    risksCreated: integer('risks_created').default(0),

    /** How many evidence records were pushed */
    evidencePushed: integer('evidence_pushed').default(0),

    /** Run duration in seconds */
    durationSeconds: integer('duration_seconds'),

    /** When the run started */
    startedAt: timestamp('started_at').notNull(),

    /** When the run completed (or failed) */
    completedAt: timestamp('completed_at'),

    /** Error message if status = "failed" */
    errorMessage: text('error_message'),

    /** Run summary data for the dashboard */
    summary: jsonb('summary'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    /** Find recent runs for a subscription */
    subRunsIdx: index('idx_addon_runs_subscription').on(table.subscriptionId),
    /** Find runs for a client (dashboard) */
    clientRunsIdx: index('idx_addon_runs_client').on(table.clientId),
    /** Find runs by addon type */
    addonRunsIdx: index('idx_addon_runs_addon').on(table.addonSlug),
  }),
);
