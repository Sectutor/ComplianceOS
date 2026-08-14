/**
 * Real-time dashboard aggregation (scorecard P1 #12 — "Real-time dashboard").
 *
 * Pure aggregation + a `getDb()`-backed loader. The pure functions operate on
 * plain row-shaped arrays and are unit tested with a mocked db
 * (lib/__tests__/dashboardStats.test.ts); the loader wires them to the
 * existing schema tables (clientControls, controls, evidence, clients,
 * clientPolicies, vendors, riskScenarios, complianceSnapshots).
 */
import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  clients,
  clientControls,
  clientPolicies,
  complianceSnapshots,
  controls,
  evidence,
  riskScenarios,
  vendors,
} from "../schema";

// ---------------------------------------------------------------------------
// Row shapes (subset of the real table columns the aggregation needs)
// ---------------------------------------------------------------------------

export interface ControlRow {
  id: number;
  controlId: number;
  status: string;
}

export interface ControlMasterRow {
  id: number;
  framework: string;
}

export interface EvidenceRow {
  clientControlId: number;
  status: string;
}

export interface SnapshotRow {
  snapshotDate: Date;
  complianceScore: number | null;
  riskScore: number | null;
  implementedControls: number | null;
  totalControls: number | null;
}

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export interface ComplianceScore {
  passing: number;
  total: number;
  scorePct: number;
}

export interface FrameworkPassRate {
  framework: string;
  passing: number;
  total: number;
  ratePct: number;
}

export interface EvidenceCoverage {
  covered: number;
  total: number;
  coveragePct: number;
}

export interface Counts {
  clients: number;
  openRisks: number;
  policies: number;
  vendors: number;
}

export interface TrendPoint {
  date: string; // ISO date (yyyy-mm-dd)
  complianceScore: number;
  riskScore: number;
  controlsImplementedPct: number;
}

export interface DashboardStats {
  complianceScore: ComplianceScore;
  passRateByFramework: FrameworkPassRate[];
  evidenceCoverage: EvidenceCoverage;
  counts: Counts;
  trend30d: TrendPoint[];
  generatedAt: string;
}

export const VALID_EVIDENCE_STATUSES = ["collected", "verified"] as const;
export const OPEN_RISK_STATUSES = ["identified", "analyzed"] as const;

// ---------------------------------------------------------------------------
// Pure aggregation
// ---------------------------------------------------------------------------

function pct(passing: number, total: number): number {
  return total > 0 ? Math.round((passing / total) * 100) : 100;
}

/** Compliance score: implemented controls / applicable controls (excl. N/A). */
export function computeComplianceScore(rows: ControlRow[]): ComplianceScore {
  const applicable = (rows ?? []).filter((c) => c.status !== "not_applicable");
  const passing = applicable.filter((c) => c.status === "implemented").length;
  const total = applicable.length;
  return { passing, total, scorePct: pct(passing, total) };
}

/**
 * Pass rate grouped by framework. Joins client controls to the master
 * `controls` table rows (provided as a separate array to keep this pure).
 */
export function computePassRateByFramework(
  controlRows: ControlRow[],
  masterRows: ControlMasterRow[]
): FrameworkPassRate[] {
  const frameworkById = new Map<number, string>();
  for (const m of masterRows ?? []) frameworkById.set(m.id, m.framework);

  const byFramework = new Map<string, { passing: number; total: number }>();
  for (const c of controlRows ?? []) {
    const framework = frameworkById.get(c.controlId) || "Unmapped";
    const entry = byFramework.get(framework) || { passing: 0, total: 0 };
    if (c.status === "not_applicable") continue;
    entry.total += 1;
    if (c.status === "implemented") entry.passing += 1;
    byFramework.set(framework, entry);
  }

  return Array.from(byFramework.entries())
    .map(([framework, { passing, total }]) => ({
      framework,
      passing,
      total,
      ratePct: pct(passing, total),
    }))
    .sort((a, b) => b.total - a.total || a.framework.localeCompare(b.framework));
}

/**
 * Evidence coverage: distinct client controls that have valid evidence
 * (collected/verified) / applicable client controls.
 */
export function computeEvidenceCoverage(
  controlRows: ControlRow[],
  evidenceRows: EvidenceRow[]
): EvidenceCoverage {
  const applicable = (controlRows ?? []).filter((c) => c.status !== "not_applicable");
  const total = applicable.length;
  const covered = new Set(
    (evidenceRows ?? [])
      .filter((e) => (VALID_EVIDENCE_STATUSES as readonly string[]).includes(e.status))
      .map((e) => e.clientControlId)
  ).size;
  return { covered, total, coveragePct: pct(covered, total) };
}

/** 30-day compliance trend from the compliance_snapshots table. */
export function computeTrend(snapshots: SnapshotRow[], days = 30): TrendPoint[] {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sorted = (snapshots ?? [])
    .filter((s) => s.snapshotDate >= cutoff)
    .sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

  return sorted.map((s) => ({
    date: s.snapshotDate.toISOString().slice(0, 10),
    complianceScore: s.complianceScore ?? 0,
    riskScore: s.riskScore ?? 0,
    controlsImplementedPct: pct(s.implementedControls ?? 0, s.totalControls ?? 0),
  }));
}

/** Compose the full dashboard stats object from pre-fetched rows (pure). */
export function aggregateDashboardStats(input: {
  controlRows: ControlRow[];
  masterRows: ControlMasterRow[];
  evidenceRows: EvidenceRow[];
  snapshotRows: SnapshotRow[];
  counts: Counts;
  days?: number;
}): DashboardStats {
  const complianceScore = computeComplianceScore(input.controlRows);
  return {
    complianceScore,
    passRateByFramework: computePassRateByFramework(input.controlRows, input.masterRows),
    evidenceCoverage: computeEvidenceCoverage(input.controlRows, input.evidenceRows),
    counts: input.counts,
    trend30d: computeTrend(input.snapshotRows, input.days ?? 30),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// DB-backed loader
// ---------------------------------------------------------------------------

/**
 * Load all dashboard stats. When `clientId` is omitted, aggregates across all
 * clients (admin view). Counts are returned as plain numbers.
 */
export async function loadDashboardStats(opts: { clientId?: number } = {}): Promise<DashboardStats> {
  const db = await getDb();
  const clientId = opts?.clientId;
  const scope = clientId !== undefined ? eq(clientControls.clientId, clientId) : undefined;

  // 1. Client controls (id, controlId, status) — drives score + coverage
  const controlRows = (await db
    .select({ id: clientControls.id, controlId: clientControls.controlId, status: clientControls.status })
    .from(clientControls)
    .where(scope)) as unknown as ControlRow[];

  // 2. Master controls (id, framework) — drives pass-rate by framework
  const masterRows = (await db
    .select({ id: controls.id, framework: controls.framework })
    .from(controls)) as unknown as ControlMasterRow[];

  // 3. Evidence (clientControlId, status) — drives evidence coverage
  const evScope = clientId !== undefined ? eq(evidence.clientId, clientId) : undefined;
  const evidenceRows = (await db
    .select({ clientControlId: evidence.clientControlId, status: evidence.status })
    .from(evidence)
    .where(evScope)) as unknown as EvidenceRow[];

  // 4. Counts
  const [clientCount] = await db.select({ value: count() }).from(clients);
  const [policyCount] = await db
    .select({ value: count() })
    .from(clientPolicies)
    .where(clientId !== undefined ? eq(clientPolicies.clientId, clientId) : undefined);
  const [vendorCount] = await db
    .select({ value: count() })
    .from(vendors)
    .where(clientId !== undefined ? eq(vendors.clientId, clientId) : undefined);
  const [openRiskCount] = await db
    .select({ value: count() })
    .from(riskScenarios)
    .where(
      and(
        clientId !== undefined ? eq(riskScenarios.clientId, clientId) : undefined,
        inArray(riskScenarios.status, OPEN_RISK_STATUSES as unknown as string[])
      )
    );

  // 5. 30-day trend from compliance snapshots
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snapshotRows = (await db
    .select({
      snapshotDate: complianceSnapshots.snapshotDate,
      complianceScore: complianceSnapshots.complianceScore,
      riskScore: complianceSnapshots.riskScore,
      implementedControls: complianceSnapshots.implementedControls,
      totalControls: complianceSnapshots.totalControls,
    })
    .from(complianceSnapshots)
    .where(
      and(
        clientId !== undefined ? eq(complianceSnapshots.clientId, clientId) : undefined,
        gte(complianceSnapshots.snapshotDate, cutoff)
      )
    )
    .orderBy(asc(complianceSnapshots.snapshotDate))) as unknown as SnapshotRow[];

  return aggregateDashboardStats({
    controlRows,
    masterRows,
    evidenceRows,
    snapshotRows,
    counts: {
      clients: Number(clientCount?.value ?? 0),
      openRisks: Number(openRiskCount?.value ?? 0),
      policies: Number(policyCount?.value ?? 0),
      vendors: Number(vendorCount?.value ?? 0),
    },
  });
}

// ---------------------------------------------------------------------------
// Posture stats (cycle-3 UI contract: pages/dashboard/postureStatsApi.ts)
// ---------------------------------------------------------------------------

export type PostureStatus = "strong" | "attention" | "critical";

export interface PostureControlsStat {
  implemented: number;
  total: number;
  /** 0..100 */
  passRate: number;
}

export interface PostureFrameworkStat {
  framework: string;
  /** 0..100 */
  passRate: number;
  totalControls: number;
  passedControls: number;
}

export interface PostureEvidenceStat {
  verified: number;
  total: number;
  /** 0..100 */
  coverage: number;
  expiringSoon: number;
}

export interface PostureTrendPoint {
  date: string;
  score: number;
}

export interface PostureStats {
  /** 0..100 overall posture score */
  postureScore: number;
  status: PostureStatus;
  controls: PostureControlsStat;
  frameworks: PostureFrameworkStat[];
  evidence: PostureEvidenceStat;
  trend: PostureTrendPoint[];
}

/**
 * Map the internal DashboardStats onto the posture view-model. Pure.
 * - postureScore/status derive from the control pass rate (>=85 strong,
 *   >=60 attention, else critical).
 * - evidence coverage is verified/total (0 when there is no evidence yet).
 * - trend reuses the 30-day compliance snapshots.
 * - `framework` optionally narrows the per-framework breakdown.
 */
export function toPostureStats(stats: DashboardStats, framework?: string): PostureStats {
  const score = stats.complianceScore.scorePct;
  const status: PostureStatus = score >= 85 ? "strong" : score >= 60 ? "attention" : "critical";

  const frameworks = (stats.passRateByFramework ?? [])
    .filter((f) => {
      if (!framework) return true;
      return f.framework.toLowerCase() === String(framework).toLowerCase();
    })
    .map((f) => ({
      framework: f.framework,
      passRate: f.ratePct,
      totalControls: f.total,
      passedControls: f.passing,
    }));

  const verified = stats.evidenceCoverage.covered;
  const total = stats.evidenceCoverage.total;

  return {
    postureScore: score,
    status,
    controls: {
      implemented: stats.complianceScore.passing,
      total: stats.complianceScore.total,
      passRate: score,
    },
    frameworks,
    evidence: {
      verified,
      total,
      coverage: total > 0 ? Math.round((verified / total) * 100) : 0,
      expiringSoon: 0,
    },
    trend: (stats.trend30d ?? []).map((p) => ({ date: p.date, score: p.complianceScore })),
  };
}
