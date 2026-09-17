/**
 * Evidence Renewal Scheduler (scorecard P1 #14 — auto-remediation).
 *
 * Runs the evidence renewal loop (lib/evidenceRenewal.ts) on a 12h cycle:
 * evidence rows that are expired or expiring within the renewal horizon are
 * re-collected through their connected evidence collector (flipping them back
 * to `verified` with a fresh last_verified / expiration_date), or marked
 * `expired` with a remediation note when no collector is available.
 *
 * Guarded at the wiring site by ENABLE_EVIDENCE_RENEWAL_SCHEDULER !== 'false'
 * (see server_entry.ts), mirroring the evidenceExpirationScheduler pattern.
 */

import {
  runEvidenceRenewal,
  DEFAULT_RENEWAL_INTERVAL_MS,
} from '../../lib/evidenceRenewal';

let renewalInterval: NodeJS.Timeout | null = null;

/** Run one renewal tick against the live DB. Returns the summary (or null). */
export async function runEvidenceRenewalTick(): Promise<unknown> {
  try {
    const summary = await runEvidenceRenewal();
    console.log(
      `[EvidenceRenewalScheduler] Tick complete — due=${summary.dueRows} ` +
        `renewed=${summary.renewedRows} expired=${summary.expiredRows} ` +
        `failed=${summary.failedRenewals} remediationNotes=${summary.remediationNotes.length}`,
    );
    if (summary.remediationNotes.length > 0) {
      console.warn('[EvidenceRenewalScheduler] Remediation needed:', summary.remediationNotes);
    }
    return summary;
  } catch (err) {
    console.error(
      '[EvidenceRenewalScheduler] Tick failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Start the background renewal scheduler (immediate first tick + interval). */
export function start(intervalMs: number = DEFAULT_RENEWAL_INTERVAL_MS): void {
  stop();

  runEvidenceRenewalTick().catch((err) =>
    console.error('[EvidenceRenewalScheduler] Initial tick failed:', err?.message ?? err),
  );

  renewalInterval = setInterval(() => {
    runEvidenceRenewalTick().catch((err) =>
      console.error('[EvidenceRenewalScheduler] Recurrent tick failed:', err?.message ?? err),
    );
  }, intervalMs);

  console.log(`[EvidenceRenewalScheduler] Started (${Math.round(intervalMs / 1000)}s cycle)`);
}

/** Stop the background renewal scheduler. */
export function stop(): void {
  if (renewalInterval) {
    clearInterval(renewalInterval);
    renewalInterval = null;
    console.log('[EvidenceRenewalScheduler] Stopped');
  }
}
