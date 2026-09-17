/**
 * Access Review Scheduler (scorecard P2 #7 — access review automation).
 *
 * Runs the global overdue sweep (lib/accessReviews.runGlobalOverdueCheck) on a
 * 12h cycle: pending certification tasks whose effective due date (task due
 * date, else inherited cycle due date) is in the past are flagged `overdue` so
 * reviewers see them in the Access Reviews UI.
 *
 * DB-unreachable is handled inside the lib (in-memory fallback returns zeroes
 * instead of throwing), mirroring the evidenceRenewalScheduler pattern.
 * Guarded at the wiring site by ENABLE_ACCESS_REVIEW_SCHEDULER !== 'false'
 * (see server_entry.ts).
 */

import { runGlobalOverdueCheck } from '../../lib/accessReviews';

/** 12h sweep interval (same cadence as the policy ACK reminder scheduler). */
export const DEFAULT_ACCESS_REVIEW_INTERVAL_MS = 12 * 60 * 60 * 1000;

let sweepInterval: NodeJS.Timeout | null = null;

/** Run one global overdue sweep against the live DB. Returns the result (or null). */
export async function runAccessReviewSweep(): Promise<unknown> {
  try {
    const result = await runGlobalOverdueCheck();
    console.log(
      `[AccessReviewScheduler] Sweep complete — overdue=${result.overdue}`,
    );
    return result;
  } catch (err) {
    console.error(
      '[AccessReviewScheduler] Sweep failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Start the background overdue sweep (immediate first tick + interval). */
export function start(intervalMs: number = DEFAULT_ACCESS_REVIEW_INTERVAL_MS): void {
  stop();

  runAccessReviewSweep().catch((err) =>
    console.error('[AccessReviewScheduler] Initial sweep failed:', err?.message ?? err),
  );

  sweepInterval = setInterval(() => {
    runAccessReviewSweep().catch((err) =>
      console.error('[AccessReviewScheduler] Recurrent sweep failed:', err?.message ?? err),
    );
  }, intervalMs);

  console.log(`[AccessReviewScheduler] Started (${Math.round(intervalMs / 1000)}s cycle)`);
}

/** Stop the background overdue sweep. */
export function stop(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
    console.log('[AccessReviewScheduler] Stopped');
  }
}
