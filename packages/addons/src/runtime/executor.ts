/**
 * Addon Executor
 *
 * Orchestrates addon runs. Each addon registers a handler function
 * that the executor calls when a run is triggered (scheduled, manual, webhook).
 *
 * The executor handles:
 * - Subscription validation (is the addon active/trial?)
 * - Settings injection (passes per-client config)
 * - Run logging (creates addon_run_logs entries)
 * - Error handling + retry
 */

import { TRPCError } from '@trpc/server';
import type { AddonRunConfig, AddonRunHandler } from '../shared/types';
import { addonSubscriptions, addonRunLogs } from '../shared/schema';
// In the real implementation, these come from the core app:
// import { getDb } from '@complianceos/core/db';
// For now, we define the interface:

interface DbAdapter {
  findSubscription(clientId: number, addonSlug: string): Promise<{
    id: number;
    status: string;
    trialEndsAt: Date | null;
    settings: Record<string, unknown>;
  } | null>;
  updateSubscription(id: number, data: Partial<Record<string, unknown>>): Promise<void>;
  insertRunLog(data: Record<string, unknown>): Promise<{ id: number }>;
  updateRunLog(id: number, data: Record<string, unknown>): Promise<void>;
}

export class AddonExecutor {
  private handlers = new Map<string, AddonRunHandler>();
  private db: DbAdapter;

  constructor(db: DbAdapter) {
    this.db = db;
  }

  /**
   * Register an addon's run handler.
   * Called once at startup by each addon module.
   */
  register(slug: string, handler: AddonRunHandler): void {
    if (this.handlers.has(slug)) {
      console.warn(`[AddonExecutor] Overwriting existing handler for "${slug}"`);
    }
    this.handlers.set(slug, handler);
  }

  /**
   * Run an addon for a specific client.
   * This is the main entry point called by:
   * - Cron scheduler (scheduled runs)
   * - tRPC mutation (manual "Run Now" button)
   * - Webhook receiver (BYO external tool pushes data)
   */
  async execute(
    clientId: number,
    addonSlug: string,
    trigger: 'scheduled' | 'manual' | 'webhook' = 'scheduled',
  ): Promise<{ runLogId: number; status: string; findingsCount: number }> {
    // 1. Validate the handler exists
    const handler = this.handlers.get(addonSlug);
    if (!handler) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No handler registered for addon "${addonSlug}"`,
      });
    }

    // 2. Validate the subscription
    const subscription = await this.db.findSubscription(clientId, addonSlug);
    if (!subscription) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Addon "${addonSlug}" is not subscribed for this client`,
      });
    }

    // Check subscription is active or in trial
    const isActive = subscription.status === 'active';
    const isTrialValid =
      subscription.status === 'trial' &&
      subscription.trialEndsAt &&
      new Date() < subscription.trialEndsAt;

    if (!isActive && !isTrialValid) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          subscription.status === 'expired'
            ? `Your trial for "${addonSlug}" has expired. Subscribe to continue using it.`
            : `Addon "${addonSlug}" is not active (status: ${subscription.status})`,
      });
    }

    // 3. Create a run log entry
    const startedAt = new Date();
    const runLog = await this.db.insertRunLog({
      subscriptionId: subscription.id,
      addonSlug,
      clientId,
      trigger,
      status: 'running',
      startedAt,
    });

    try {
      // 4. Execute the addon handler with per-client settings
      const config: AddonRunConfig = {
        clientId,
        subscriptionId: subscription.id,
        addonSlug,
        manifest: {} as any, // Set by the caller when needed
        settings: subscription.settings,
      };

      const result = await handler(config);

      // 5. Update run log with results
      const completedAt = new Date();
      await this.db.updateRunLog(runLog.id, {
        status: 'completed',
        findingsCount: result.findings.length,
        risksCreated: result.summary.failed,
        evidencePushed: result.evidenceArtifacts?.length || 0,
        durationSeconds: Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 1000,
        ),
        completedAt,
        summary: result.summary,
      });

      // 6. Update last sync timestamp on subscription
      await this.db.updateSubscription(subscription.id, {
        lastSyncAt: completedAt,
      } as any);

      return {
        runLogId: runLog.id,
        status: 'completed',
        findingsCount: result.findings.length,
        summary: result.summary,
        findings: result.findings.slice(0, 20).map(f => ({
          title: f.title,
          severity: f.severity,
          description: f.description?.substring(0, 200),
          remediation: f.remediation?.substring(0, 200),
          resourceId: f.resourceId,
        })),
        evidenceArtifacts: result.evidenceArtifacts?.map(e => ({
          type: e.type,
        })),
        durationSeconds: Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 1000,
        ),
      };
    } catch (error) {
      // 7. Handle failures
      const failedAt = new Date();
      const message = error instanceof Error ? error.message : String(error);

      await this.db.updateRunLog(runLog.id, {
        status: 'failed',
        durationSeconds: Math.round(
          (failedAt.getTime() - startedAt.getTime()) / 1000,
        ),
        completedAt: failedAt,
        errorMessage: message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Addon "${addonSlug}" run failed: ${message}`,
      });
    }
  }

  /** Check if a handler is registered */
  isRegistered(slug: string): boolean {
    return this.handlers.has(slug);
  }

  /** List all registered addon slugs */
  listRegistered(): string[] {
    return Array.from(this.handlers.keys());
  }
}
