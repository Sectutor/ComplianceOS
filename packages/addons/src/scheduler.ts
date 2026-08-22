/**
 * Addon Scheduler
 *
 * Runs scheduled addon scans based on each client's configured schedule.
 * Queries addon_subscriptions for subscriptions that are due for a run,
 * executes them, and updates the next run time.
 *
 * Runs as a setInterval within the GRCompliance server process.
 */

import { getDb } from '@complianceos/core/db';
import { addonSubscriptions, addonRunLogs } from '@complianceos/addons/shared/schema';
import { getExecutor } from '@complianceos/addons/runtime/executor-instance';
import { eq, and, sql } from 'drizzle-orm';

/** How often the scheduler checks for due runs (in ms) */
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/** How many subscriptions to process per tick (rate limiting) */
const BATCH_SIZE = 5;

/** Running flag to prevent overlapping ticks */
let isRunning = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

/** Warn-once flag: logged the first time the DB client lacks a query API */
let warnedIncompatibleDbClient = false;

/**
 * Start the addon scheduler.
 * Called once during server initialization.
 */
export function startAddonScheduler(): void {
  if (intervalHandle) {
    console.log('[AddonScheduler] Already running');
    return;
  }

  console.log('[AddonScheduler] Starting — checks every 5 minutes');
  
  // Run an initial check immediately
  processDueScans().catch((err) =>
    console.error('[AddonScheduler] Initial check failed:', err.message),
  );

  // Then check on interval
  intervalHandle = setInterval(() => {
    processDueScans().catch((err) =>
      console.error('[AddonScheduler] Check failed:', err.message),
    );
  }, CHECK_INTERVAL);
}

/**
 * Stop the addon scheduler.
 */
export function stopAddonScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[AddonScheduler] Stopped');
  }
}

/**
 * Find and execute all addon subscriptions that are due for a scan.
 */
export async function processDueScans(): Promise<void> {
  if (isRunning) {
    console.log('[AddonScheduler] Previous tick still running, skipping');
    return;
  }

  isRunning = true;
  const executor = getExecutor();
  const db = await getDb();
  const now = new Date();

  try {
    // Guard: the scheduler requires a Drizzle-style client exposing `.select()`.
    // Some environments hand back a raw pool/proxy without one, which used to
    // spam "db.select is not a function" on every tick. Warn once, then make
    // each tick a safe no-op until a compatible client is available.
    if (typeof (db as any)?.select !== 'function') {
      if (!warnedIncompatibleDbClient) {
        warnedIncompatibleDbClient = true;
        console.warn(
          '[AddonScheduler] Incompatible database client (missing db.select) - scheduled addon scans are disabled until a Drizzle-compatible client is available',
        );
      }
      return; // Safe no-op tick
    }

    // Find subscriptions due for a run
    const dueSubscriptions = await db
      .select()
      .from(addonSubscriptions)
      .where(
        and(
          eq(addonSubscriptions.status, 'active'),
          sql`(${addonSubscriptions.nextScheduledRun} IS NULL OR ${addonSubscriptions.nextScheduledRun} <= ${now.toISOString()})`,
        ),
      )
      .limit(BATCH_SIZE);

    if (dueSubscriptions.length === 0) {
      return; // Nothing due
    }

    console.log(
      `[AddonScheduler] Found ${dueSubscriptions.length} subscription(s) due for scan`,
    );

    for (const sub of dueSubscriptions) {
      try {
        console.log(
          `[AddonScheduler] Running ${sub.addonSlug} for client ${sub.clientId}`,
        );

        await executor.execute(sub.clientId, sub.addonSlug, 'scheduled');

        // Calculate next run based on schedule setting
        const schedule = (sub.settings as any)?.schedule ?? 'weekly';
        const nextRun = calculateNextRun(schedule);

        // Update next scheduled run
        await db
          .update(addonSubscriptions)
          .set({
            nextScheduledRun: nextRun,
            updatedAt: new Date(),
          })
          .where(eq(addonSubscriptions.id, sub.id));

        console.log(
          `[AddonScheduler] Completed ${sub.addonSlug} for client ${sub.clientId}, next run: ${nextRun.toISOString()}`,
        );
      } catch (err: any) {
        console.error(
          `[AddonScheduler] Failed ${sub.addonSlug} for client ${sub.clientId}: ${err.message}`,
        );

        // On failure, retry in 1 hour instead of the normal schedule
        const retryRun = new Date(Date.now() + 60 * 60 * 1000);
        await db
          .update(addonSubscriptions)
          .set({
            nextScheduledRun: retryRun,
            updatedAt: new Date(),
          })
          .where(eq(addonSubscriptions.id, sub.id));
      }
    }
  } catch (err: any) {
    console.error(`[AddonScheduler] Error querying subscriptions: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

/**
 * Calculate the next scheduled run time based on the schedule setting.
 */
export function calculateNextRun(schedule: string): Date {
  const now = new Date();

  switch (schedule) {
    case 'daily':
      // Next run: tomorrow at same time
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);

    case 'weekly':
      // Next run: 7 days from now
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    case 'monthly':
      // Next run: 30 days from now
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
