/**
 * Evidence Collection Scheduler
 *
 * Runs due evidence collections on a schedule (reusing the addon-scheduler /
 * control-auto-test-scheduler pattern). The scheduler:
 *
 *   1. Reads due evidence rows from the LOCAL database via `getDb()` — rows
 *      whose status is still `pending`, or whose `dueDate` / `expirationDate`
 *      has passed.
 *   2. Runs the registered evidence collectors (`evidenceCollectorRegistry`)
 *      against each due row. When `row.systemId` matches a registered
 *      collector slug, only that collector runs; otherwise the full set runs.
 *   3. Persists the collected artifacts as new `evidence` rows (marked
 *      `collected` with `lastVerified` set) and flips the scheduled row itself
 *      to `collected` so it is not re-picked on the next tick.
 *
 * Every collector failure is isolated (the collector engine converts a
 * throwing collector into a failed run result), so one broken source never
 * blocks the rest of the batch — and a missing/remote database fails as a
 * single concise log line instead of a TLS stack trace.
 */

import { getDb } from '../db';
import { evidence } from '../schema';
import { eq, or, lte } from 'drizzle-orm';
import {
  evidenceCollectorRegistry,
  collectEvidence,
} from './integrations/collector';
import type { EvidenceCollectorRegistry } from './integrations/collector';
import type { IntegrationContext } from './integrations/types';

/** How often the scheduler checks for due collections (in ms). */
export const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** How many due rows to process per tick (rate limiting). */
export const DEFAULT_BATCH_SIZE = 10;

/** Running flag to prevent overlapping ticks. */
let isRunning = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export interface EvidenceCollectionSummary {
  dueRows: number;
  processedRows: number;
  collectedItems: number;
  failedRuns: number;
  updatedRows: number;
  insertedRows: number;
  skipped: boolean;
  completedAt: Date;
}

/** Drizzle condition selecting evidence rows that are due for collection. */
export function buildDueWhere(now: Date) {
  return or(
    eq(evidence.status, 'pending'),
    lte(evidence.dueDate, now),
    lte(evidence.expirationDate, now),
  );
}

/** Map a collected evidence status to the `evidence` table status enum. */
export function mapCollectedStatus(status: 'pass' | 'warning' | 'fail' | 'error'): string {
  switch (status) {
    case 'pass':
    case 'warning':
      return 'collected';
    case 'fail':
      return 'rejected';
    case 'error':
    default:
      return 'pending';
  }
}

function emptySummary(skipped = false): EvidenceCollectionSummary {
  return {
    dueRows: 0,
    processedRows: 0,
    collectedItems: 0,
    failedRuns: 0,
    updatedRows: 0,
    insertedRows: 0,
    skipped,
    completedAt: new Date(),
  };
}

/**
 * Run every due evidence collection for one tick.
 *
 * `db` and `registry` may be injected for tests; when omitted, the live
 * `getDb()` client and the shared registry are used.
 */
export async function runDueEvidenceCollections(options: {
  db?: any;
  registry?: EvidenceCollectorRegistry;
  now?: Date;
  evidenceTtlMs?: Record<string, number>;
  limit?: number;
} = {}): Promise<EvidenceCollectionSummary> {
  const now = options.now ?? new Date();

  if (isRunning) {
    return emptySummary(true);
  }
  isRunning = true;

  try {
    const db = options.db ?? (await getDb());
    const registry = options.registry ?? evidenceCollectorRegistry;
    const limit = options.limit ?? DEFAULT_BATCH_SIZE;

    const dueRows = await db
      .select()
      .from(evidence)
      .where(buildDueWhere(now))
      .limit(limit);
    const rows = Array.isArray(dueRows) ? dueRows : [];

    const summary: EvidenceCollectionSummary = {
      dueRows: rows.length,
      processedRows: 0,
      collectedItems: 0,
      failedRuns: 0,
      updatedRows: 0,
      insertedRows: 0,
      skipped: false,
      completedAt: now,
    };

    for (const row of rows) {
      const collectorSlug =
        typeof row.systemId === 'string' && registry.has(row.systemId)
          ? row.systemId
          : undefined;
      const collectors = collectorSlug
        ? [registry.get(collectorSlug)!]
        : registry.list();

      if (!collectors.length) continue;
      summary.processedRows += 1;

      const context: IntegrationContext = {
        connectionId: `evidence-scheduler-${row.id}`,
        userId: 'system',
        credentials: {},
        settings: {},
      };

      for (const collector of collectors) {
        const run = await collectEvidence(collector, context, {
          now,
          evidenceTtlMs: options.evidenceTtlMs,
          limit,
        });

        if (!run.success) summary.failedRuns += 1;

        for (const item of run.evidence) {
          summary.collectedItems += 1;
          await db.insert(evidence).values({
            clientId: row.clientId,
            clientControlId: row.clientControlId,
            evidenceId: String(item.id).slice(0, 50),
            systemId: item.source,
            description: item.description,
            type: item.type,
            status: mapCollectedStatus(item.status),
            lastVerified: now,
            expirationDate: item.expiresAt,
            updatedAt: now,
          });
          summary.insertedRows += 1;
        }
      }

      // Mark the scheduled row collected so it is not re-picked next tick.
      await db
        .update(evidence)
        .set({ status: 'collected', lastVerified: now, updatedAt: now })
        .where(eq(evidence.id, row.id));
      summary.updatedRows += 1;
    }

    return summary;
  } finally {
    isRunning = false;
  }
}

/**
 * Start the background evidence collection scheduler.
 * Runs an initial tick immediately, then checks on the interval.
 */
export function startEvidenceScheduler(
  intervalMs = DEFAULT_CHECK_INTERVAL_MS,
): void {
  if (intervalHandle) {
    console.log('[EvidenceScheduler] Already running');
    return;
  }

  console.log(`[EvidenceScheduler] Starting — checks every ${Math.round(intervalMs / 1000)}s`);

  // Initial execution on startup
  runDueEvidenceCollections().catch((err) =>
    console.error('[EvidenceScheduler] Initial run failed:', err?.message ?? err),
  );

  intervalHandle = setInterval(() => {
    runDueEvidenceCollections().catch((err) =>
      console.error('[EvidenceScheduler] Run failed:', err?.message ?? err),
    );
  }, intervalMs);
}

/** Stop the background evidence collection scheduler. */
export function stopEvidenceScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[EvidenceScheduler] Stopped');
  }
}
