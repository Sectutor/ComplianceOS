/**
 * Addon System Initialization
 *
 * Called once at server startup. Registers all addon handlers
 * and initializes the addon executor with the database adapter.
 *
 * Must be called after the database is ready but before the first
 * cron/scheduled addon run.
 */

import { AddonExecutor } from '@complianceos/addons/runtime/executor';
import { setExecutor } from '@complianceos/addons/runtime/executor-instance';
import { FindingsPusher } from '@complianceos/addons/runtime/pusher';
import { WebhookHandler } from '@complianceos/addons/runtime/webhook-handler';
import { ADDON_REGISTRY } from '@complianceos/addons/registry';
import { addonSubscriptions, addonRunLogs } from '@complianceos/addons/shared/schema';
import { getDb } from './packages/core/src/db';
import { sql } from 'drizzle-orm';

let initialized = false;

export async function initializeAddonSystem(): Promise<{
  executor: AddonExecutor;
  pusher: FindingsPusher;
  webhookHandler: WebhookHandler;
}> {
  if (initialized) {
    console.log('[Addons] System already initialized, skipping');
  }

  console.log('[Addons] Initializing addon system...');

  // Create the database adapter for the executor
  const dbAdapter = {
    async getPg() {
      const { default: postgres } = await import('postgres');
      return postgres(process.env.DATABASE_URL!, {
        max: 2,
        ssl: { rejectUnauthorized: false },
        prepare: false,
      });
    },

    async findSubscription(clientId: number, addonSlug: string) {
      const pg = await this.getPg();
      try {
        const [sub] = await pg`
          SELECT * FROM addon_subscriptions
          WHERE client_id = ${clientId} AND addon_slug = ${addonSlug}
          LIMIT 1
        `;
        if (!sub) return null;
        return {
          id: sub.id,
          clientId: sub.client_id,
          addonSlug: sub.addon_slug,
          status: sub.status,
          trialEndsAt: sub.trial_ends_at,
          settings: sub.settings || {},
          stripeSubscriptionId: sub.stripe_subscription_id,
          autoRenew: sub.auto_renew,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
        };
      } finally {
        await pg.end();
      }
    },

    async updateSubscription(id: number, data: any) {
      const pg = await this.getPg();
      try {
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(data)) {
          if (k === 'id') continue;
          const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
          sets.push(`${col} = $${i++}`);
          vals.push(v instanceof Date ? v.toISOString() : v);
        }
        if (sets.length > 0) {
          const query = `UPDATE addon_subscriptions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`;
          vals.push(id);
          await pg.unsafe(query, vals);
        }
      } finally {
        await pg.end();
      }
    },

    async insertRunLog(data: any) {
      const pg = await this.getPg();
      try {
        const [log] = await pg`
          INSERT INTO addon_run_logs (subscription_id, addon_slug, client_id, trigger, status, started_at)
          VALUES (${data.subscriptionId}, ${data.addonSlug}, ${data.clientId}, ${data.trigger}, ${data.status}, ${data.startedAt instanceof Date ? data.startedAt.toISOString() : data.startedAt})
          RETURNING id
        `;
        return log;
      } finally {
        await pg.end();
      }
    },

    async updateRunLog(id: number, data: any) {
      const pg = await this.getPg();
      try {
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(data)) {
          if (k === 'id') continue;
          const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
          sets.push(`${col} = $${i++}`);
          vals.push(v instanceof Date ? v.toISOString() : v);
        }
        if (sets.length > 0) {
          const query = `UPDATE addon_run_logs SET ${sets.join(', ')} WHERE id = $${i}`;
          vals.push(id);
          await pg.unsafe(query, vals);
        }
      } finally {
        await pg.end();
      }
    },
  };

  const executor = new AddonExecutor(dbAdapter);
  setExecutor(executor);
  const pusher = new FindingsPusher();
  const webhookHandler = new WebhookHandler();

  // Register Prowler addon handler
  const { registerProwlerAddon } = await import(
    './packages/addons/src/prowler/connector'
  );
  registerProwlerAddon(executor, pusher);

  // Register Trivy dependency scanner addon handler
  const { registerTrivyAddon } = await import(
    './packages/addons/src/trivy/connector'
  );
  registerTrivyAddon(executor, pusher);

  // Start the addon scheduler for automated scans
  const { startAddonScheduler } = await import(
    './packages/addons/src/scheduler'
  );
  startAddonScheduler();

  console.log(`[Addons] Registered handlers: ${executor.listRegistered().join(', ')}`);
  console.log(`[Addons] Marketplace addons: ${Object.keys(ADDON_REGISTRY).join(', ')}`);

  initialized = true;

  return { executor, pusher, webhookHandler };
}
