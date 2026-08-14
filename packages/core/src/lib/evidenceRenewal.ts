/**
 * Evidence Expiration + Auto-Renewal (scorecard P1 #14).
 *
 * Extends the existing evidenceExpirationScheduler (which only marks
 * verified → expired) into a full renewal loop:
 *
 *   1. `selectDueForRenewal` — pure: pick evidence rows that are expired or
 *      expiring within a configurable horizon (default 7 days).
 *   2. `computeRenewalResult` — pure: decide, per due row, whether it can be
 *      auto-renewed (a connected evidence collector exists for its source) or
 *      must be expired with a remediation-needed note.
 *   3. `connectionForRow` — pure: match an evidence row's `systemId` to an
 *      active `collector_connections` row (provider slug, both the bare slug
 *      and the `-evidence` suffixed manifest slug are accepted).
 *   4. `runEvidenceRenewal` — db-backed: for every due row, re-run the
 *      matching collector and flip the row back to `verified` with a fresh
 *      `lastVerified` / `expirationDate`; rows without a connection (or whose
 *      renewal run fails) are marked `expired` and a remediation note is
 *      surfaced in the summary.
 *
 * The pure functions take injected `db` / `now` / connection lists so the
 * whole loop is unit-testable with a mocked db (see
 * `lib/__tests__/evidenceRenewal.test.ts`).
 */

import { and, eq, inArray, lt, lte } from 'drizzle-orm';
import { getDb } from '../db';
import { evidence } from '../schema';
import {
  listCollectorConnections,
  runCollectorConnection,
} from './evidenceCollectorConnections';
import type { CollectorConnection } from './evidenceCollectorConnections';

/** Default horizon: rows expiring within N days are renewed proactively. */
export const DEFAULT_RENEWAL_HORIZON_DAYS = 7;

/** Default interval for the renewal tick in the scheduler (12h). */
export const DEFAULT_RENEWAL_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Statuses that participate in the renewal loop (valid or already expired). */
export const RENEWABLE_STATUSES = ['verified', 'collected', 'expired'] as const;

/** Minimal evidence-row shape the renewal logic needs. */
export interface EvidenceRowLike {
  id: number;
  clientId: number;
  status?: string | null;
  systemId?: string | null;
  evidenceId?: string | null;
  type?: string | null;
  intervalDays?: number | null;
  lastVerified?: Date | string | null;
  expirationDate?: Date | string | null;
  dueDate?: Date | string | null;
}

export type RenewalAction = 'renew' | 'expire' | 'skip';

export interface RenewalDecision {
  action: RenewalAction;
  reason: string;
  /** Populated when the row cannot be renewed and needs manual attention. */
  remediationNote?: string;
}

export interface RenewalRunSummary {
  dueRows: number;
  renewedRows: number;
  expiredRows: number;
  skippedRows: number;
  failedRenewals: number;
  remediationNotes: string[];
  horizonDays: number;
  completedAt: Date;
}

export interface RenewalStateSummary {
  horizonDays: number;
  dueForRenewal: number;
  expired: number;
  verified: number;
  collected: number;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function toEpochMs(value: Date | string | null | undefined): number {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

/**
 * Normalize a systemId / provider slug for comparison. Strips the
 * `-evidence` manifest suffix used by github/http-api collectors so
 * `systemId = 'github-evidence'` matches `provider = 'github'`.
 */
export function normalizeSlug(slug: string | null | undefined): string {
  return String(slug ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-evidence$/i, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * Select evidence rows due for renewal: rows with a renewable status whose
 * `expirationDate` is in the past (already expired) or within `horizonDays`
 * ahead (expiring soon). Rows without an `expirationDate` never expire and
 * are not selected.
 */
export function selectDueForRenewal(
  rows: EvidenceRowLike[],
  now: Date,
  opts: { horizonDays?: number } = {},
): EvidenceRowLike[] {
  const horizonDays = opts.horizonDays ?? DEFAULT_RENEWAL_HORIZON_DAYS;
  const cutoff = now.getTime() + horizonDays * 24 * 60 * 60 * 1000;

  return (rows ?? []).filter((row) => {
    if (!row || !RENEWABLE_STATUSES.includes(String(row.status ?? '').toLowerCase() as (typeof RENEWABLE_STATUSES)[number])) {
      return false;
    }
    return toEpochMs(row.expirationDate) <= cutoff;
  });
}

/** Find the active collector connection able to renew an evidence row. */
export function connectionForRow(
  row: EvidenceRowLike,
  connections: CollectorConnection[],
): CollectorConnection | undefined {
  const slug = normalizeSlug(row?.systemId);
  if (!slug) return undefined;
  return (connections ?? []).find(
    (c) => c?.status === 'connected' && normalizeSlug(c.provider) === slug,
  );
}

/**
 * Decide what to do with one evidence row (pure). Returns:
 *  - 'renew'  when a connected collector can re-run for this source
 *  - 'expire' when no connection exists — the row should be marked expired
 *             and a remediation-needed note produced
 *  - 'skip'   when the row is not actually due (defensive)
 */
export function computeRenewalResult(
  row: EvidenceRowLike,
  now: Date,
  opts: { horizonDays?: number; connections?: CollectorConnection[] } = {},
): RenewalDecision {
  const due = selectDueForRenewal([row], now, { horizonDays: opts.horizonDays });
  if (due.length === 0) {
    return { action: 'skip', reason: 'Evidence is not due for renewal' };
  }
  const connection = connectionForRow(row, opts.connections ?? []);
  if (connection) {
    return {
      action: 'renew',
      reason: `Collector connection ${connection.provider} (${connection.name}) is connected and can renew this source`,
    };
  }
  return {
    action: 'expire',
    reason: 'No connected evidence collector available for this source',
    remediationNote:
      `Evidence ${row.evidenceId ?? `#${row.id}`} requires manual remediation: no automated ` +
      `collector connection (systemId "${row.systemId ?? 'unknown'}") is configured for client ${row.clientId}.`,
  };
}

// ---------------------------------------------------------------------------
// Drizzle conditions
// ---------------------------------------------------------------------------

/** Drizzle where clause: renewable status AND expirationDate within horizon. */
export function buildDueForRenewalWhere(
  now: Date,
  horizonDays: number = DEFAULT_RENEWAL_HORIZON_DAYS,
) {
  const cutoff = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  return and(
    inArray(evidence.status, [...RENEWABLE_STATUSES]),
    lte(evidence.expirationDate, cutoff),
  );
}

// ---------------------------------------------------------------------------
// DB-backed renewal loop
// ---------------------------------------------------------------------------

async function updateEvidenceRow(
  db: any,
  id: number,
  patch: Record<string, unknown>,
): Promise<void> {
  await db.update(evidence).set(patch).where(eq(evidence.id, id));
}

function emptySummary(horizonDays: number, now: Date): RenewalRunSummary {
  return {
    dueRows: 0,
    renewedRows: 0,
    expiredRows: 0,
    skippedRows: 0,
    failedRenewals: 0,
    remediationNotes: [],
    horizonDays,
    completedAt: now,
  };
}

/**
 * Run one renewal tick.
 *
 * 1. Select due rows (expired or expiring within the horizon).
 * 2. Load collector connections per client (injectable for tests).
 * 3. For rows with a matching connected collector, re-run it and flip the row
 *    back to `verified` with a fresh `lastVerified` / `expirationDate`.
 * 4. Rows without a connection (or failed runs) are marked `expired` and the
 *    remediation note is surfaced in the summary.
 *
 * `db`, `connections` and `runCollector` are injectable for deterministic
 * unit tests; by default the live `getDb()` client, the shared connection
 * store and `runCollectorConnection` are used.
 */
export async function runEvidenceRenewal(options: {
  db?: any;
  now?: Date;
  horizonDays?: number;
  limit?: number;
  connections?: CollectorConnection[];
  runCollector?: (
    connection: CollectorConnection,
    clientId: number,
    now: Date,
  ) => Promise<{ ok: boolean; message?: string }>;
} = {}): Promise<RenewalRunSummary> {
  const now = options.now ?? new Date();
  const horizonDays = options.horizonDays ?? DEFAULT_RENEWAL_HORIZON_DAYS;
  const db = options.db ?? (await getDb());
  const limit = options.limit ?? 100;

  const due = await db
    .select()
    .from(evidence)
    .where(buildDueForRenewalWhere(now, horizonDays))
    .limit(limit);
  const rows = Array.isArray(due) ? due : [];

  const summary = emptySummary(horizonDays, now);
  summary.dueRows = rows.length;

  const connectionsByClient = new Map<number, CollectorConnection[]>();
  const getConnections = async (clientId: number): Promise<CollectorConnection[]> => {
    if (!connectionsByClient.has(clientId)) {
      connectionsByClient.set(
        clientId,
        options.connections ?? (await listCollectorConnections(clientId, db)),
      );
    }
    return connectionsByClient.get(clientId)!;
  };

  for (const row of rows as EvidenceRowLike[]) {
    const connections = await getConnections(row.clientId);
    const decision = computeRenewalResult(row, now, { horizonDays, connections });

    if (decision.action === 'skip') {
      summary.skippedRows += 1;
      continue;
    }

    if (decision.action === 'renew') {
      const connection = connectionForRow(row, connections);
      if (!connection) {
        // Defensive — a decision said renew but the connection vanished.
        summary.failedRenewals += 1;
        summary.remediationNotes.push(
          decision.remediationNote ?? `No collector connection found for evidence #${row.id}`,
        );
        await updateEvidenceRow(db, row.id, { status: 'expired', updatedAt: now });
        summary.expiredRows += 1;
        continue;
      }

      const run = options.runCollector
        ? await options.runCollector(connection, row.clientId, now)
        : await runCollectorConnection(connection.id, row.clientId, db, { now });

      if (run.ok) {
        const intervalDays = Number(row.intervalDays) > 0 ? Number(row.intervalDays) : 365;
        const freshExpiration = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        await updateEvidenceRow(db, row.id, {
          status: 'verified',
          lastVerified: now,
          expirationDate: freshExpiration,
          updatedAt: now,
        });
        summary.renewedRows += 1;
      } else {
        summary.failedRenewals += 1;
        summary.remediationNotes.push(
          `Renewal failed for evidence ${row.evidenceId ?? `#${row.id}`}: ${run.message ?? 'collector error'}`,
        );
        await updateEvidenceRow(db, row.id, { status: 'expired', updatedAt: now });
        summary.expiredRows += 1;
      }
      continue;
    }

    // expire
    summary.expiredRows += 1;
    if (decision.remediationNote) summary.remediationNotes.push(decision.remediationNote);
    await updateEvidenceRow(db, row.id, { status: 'expired', updatedAt: now });
  }

  return summary;
}

/**
 * Lightweight state summary for the tRPC `evidenceRenewal.getSummary`
 * procedure — counts of due / expired / verified / collected evidence.
 */
export async function getRenewalStateSummary(options: {
  db?: any;
  now?: Date;
  horizonDays?: number;
} = {}): Promise<RenewalStateSummary> {
  const now = options.now ?? new Date();
  const horizonDays = options.horizonDays ?? DEFAULT_RENEWAL_HORIZON_DAYS;
  const db = options.db ?? (await getDb());

  const dueRows = await db.select().from(evidence).where(buildDueForRenewalWhere(now, horizonDays));
  const expiredRows = await db
    .select({ id: evidence.id })
    .from(evidence)
    .where(and(eq(evidence.status, 'expired'), lt(evidence.expirationDate, now)));
  const verifiedRows = await db
    .select({ id: evidence.id })
    .from(evidence)
    .where(eq(evidence.status, 'verified'));
  const collectedRows = await db
    .select({ id: evidence.id })
    .from(evidence)
    .where(eq(evidence.status, 'collected'));

  return {
    horizonDays,
    dueForRenewal: Array.isArray(dueRows) ? dueRows.length : 0,
    expired: Array.isArray(expiredRows) ? expiredRows.length : 0,
    verified: Array.isArray(verifiedRows) ? verifiedRows.length : 0,
    collected: Array.isArray(collectedRows) ? collectedRows.length : 0,
    completedAt: now.toISOString(),
  };
}
