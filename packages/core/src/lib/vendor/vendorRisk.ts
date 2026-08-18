/**
 * TPRM per-vendor risk tiering — pure, deterministic, DB-free, network-free.
 *
 * Closes the TPRM parity gap (scorecard row #5): exposes a per-vendor risk TIER,
 * residual score and next-review date derived from concrete, persisted signals:
 *   - inherent risk class (PII / ePHI / Infrastructure => critical, else medium)
 *   - clean SOC 2 attestation status
 *   - latest threat-intel scan risk score (from runRiskScan; LOWER = riskier)
 *   - open high/critical vendor assessments
 *   - contract / DPA presence
 *   - subprocessor count
 *
 * The module is intentionally side-effect free: all inputs are passed in, the
 * clock is injectable (`now`), and identical inputs always produce identical
 * outputs — safe to unit test and safe for the UI to mirror.
 *
 * UI-STANDARD §16 — the shapes exported here (VendorRiskInput / VendorRiskResult /
 * VendorRiskOverview) are the contract the UI will consume; do not rename fields
 * without a coordinated change.
 */

/** Sensitivity class of the data the vendor can access. */
export type DataAccessType = "PII" | "ePHI" | "Infrastructure" | "None";

/** Base inherent risk level derived from data access type. */
export type InherentRiskLevel = "critical" | "medium";

/** TPRM tier assigned from the residual score. */
export type RiskTier = "Tier 1 (Critical)" | "Tier 2 (High)" | "Tier 3 (Medium)";

/** How often the vendor must be re-assessed. */
export type ReviewFrequency = "Quarterly" | "Semi-Annual" | "Annual";

/**
 * Everything `computeVendorRiskTier` needs to grade one vendor.
 *
 * @param vendor.id — vendor primary key (returned verbatim as `vendorId`).
 * @param vendor.name — display name (returned verbatim as `vendorName`).
 * @param vendor.dataAccessType — optional; when omitted (or "None") the vendor
 *   is treated as medium inherent risk.
 * @param vendor.hasCleanSoc2 — optional; defaults to `false` (conservative:
 *   no attestation on file is treated as a gap until proven otherwise).
 * @param latestScanRiskScore — optional 0-100 risk score from `runRiskScan`.
 *   NOTE: in this schema HIGHER means SAFER (100 - cveScore - breachScore), so a
 *   score below 60 drives the residual score DOWN by (60 - score), capped at 60.
 * @param openHighCriticalAssessments — optional count of open assessments rated
 *   high/critical; each costs 8 points, capped at 3 (max -24).
 * @param hasContract — optional; +5 residual points when a contract is on file.
 * @param hasDpa — optional; +8 residual points when a DPA is signed.
 * @param subprocessorCount — optional; each subprocessor beyond 2 costs 3
 *   points, capped at 4 (max -12).
 * @param now — injectable clock; defaults to `new Date()`. Pass an EARLIER date
 *   (e.g. the last review date) when you want `nextReviewDate` anchored to the
 *   last review rather than today — combined with a real "now" in
 *   `buildVendorRiskOverview` this drives the due-for-review list.
 */
export interface VendorRiskInput {
  vendor: {
    id: number;
    name: string;
    dataAccessType?: DataAccessType;
    hasCleanSoc2?: boolean;
  };
  latestScanRiskScore?: number;
  openHighCriticalAssessments?: number;
  hasContract?: boolean;
  hasDpa?: boolean;
  subprocessorCount?: number;
  now?: Date;
}

/**
 * Output of `computeVendorRiskTier` for a single vendor.
 *
 * @param residualScore — 0-100, HIGHER is safer (100 = no residual risk signal).
 * @param tier — "<50 => Tier 1 (Critical) | <75 => Tier 2 (High) | else Tier 3 (Medium)".
 * @param nextReviewDate — ISO 8601 string; now + 3 / 6 / 12 months by tier.
 * @param recommendedActions — 3-5 concrete follow-ups derived from the gaps.
 * @param riskFactors — echoed inputs so the UI can render a drill-down without
 *   re-querying.
 */
export interface VendorRiskResult {
  vendorId: number;
  vendorName: string;
  dataAccessType: DataAccessType | null;
  inherentRisk: InherentRiskLevel;
  residualScore: number;
  tier: RiskTier;
  reviewFrequency: ReviewFrequency;
  nextReviewDate: string;
  recommendedActions: string[];
  riskFactors: {
    latestScanRiskScore: number | null;
    openHighCriticalAssessments: number;
    hasContract: boolean;
    hasDpa: boolean;
    subprocessorCount: number;
    hasCleanSoc2: boolean;
  };
}

/**
 * Aggregate view over a client's vendor portfolio.
 *
 * @param vendorsDueForReview — vendors whose `nextReviewDate <= now` (anchor
 *   `nextReviewDate` to a past review date via `input.now` to populate this).
 * @param updatedAt — ISO 8601 timestamp of when the overview was computed.
 */
export interface VendorRiskOverview {
  totalVendors: number;
  tierCounts: { tier1: number; tier2: number; tier3: number };
  avgResidualScore: number;
  vendorsDueForReview: VendorRiskResult[];
  updatedAt: string;
}

/** Review cadence (months) per tier, used to compute `nextReviewDate`. */
const REVIEW_MONTHS_BY_TIER: Record<RiskTier, number> = {
  "Tier 1 (Critical)": 3, // Quarterly
  "Tier 2 (High)": 6, // Semi-Annual
  "Tier 3 (Medium)": 12, // Annual
};

const REVIEW_FREQUENCY_BY_TIER: Record<RiskTier, ReviewFrequency> = {
  "Tier 1 (Critical)": "Quarterly",
  "Tier 2 (High)": "Semi-Annual",
  "Tier 3 (Medium)": "Annual",
};

/** Fallbacks that guarantee 3-5 recommended actions even for a clean vendor. */
const RECOMMENDED_ACTION_FALLBACKS = [
  "Reassess at next review window",
  "Maintain accurate vendor inventory and contacts",
  "Keep vendor security documentation (SOC 2 / DPA) current",
] as const;

/**
 * Compute the TPRM tier, residual score and next-review date for one vendor.
 *
 * Scoring model (documented for auditors):
 *   residual = 100
 *     - 20                                     if no clean SOC 2
 *     - min(60 - scanScore, 60)                if latestScanRiskScore < 60
 *     - min(openHighCritical, 3) * 8           (cap -24)
 *     + 5                                      if contract on file
 *     + 8                                      if DPA signed
 *     - min(max(subprocessors - 2, 0), 4) * 3  (cap -12)
 *   residual = clamp(residual, 0, 100)
 *
 * Deterministic: same input in, same output out.
 */
export function computeVendorRiskTier(input: VendorRiskInput): VendorRiskResult {
  const now = input.now ?? new Date();
  const { vendor } = input;

  const dataAccessType = vendor.dataAccessType ?? null;
  const hasCleanSoc2 = vendor.hasCleanSoc2 ?? false;
  const latestScanRiskScore = input.latestScanRiskScore;
  const openHighCriticalAssessments = input.openHighCriticalAssessments ?? 0;
  const hasContract = input.hasContract ?? false;
  const hasDpa = input.hasDpa ?? false;
  const subprocessorCount = input.subprocessorCount ?? 0;

  // 1) Base inherent risk: critical for sensitive access, medium otherwise.
  const inherentRisk: InherentRiskLevel =
    dataAccessType === "PII" || dataAccessType === "ePHI" || dataAccessType === "Infrastructure"
      ? "critical"
      : "medium";

  // 2) Residual score: start safe and subtract/add concrete signals.
  let residualScore = 100;

  if (!hasCleanSoc2) {
    residualScore -= 20;
  }

  if (latestScanRiskScore !== undefined && latestScanRiskScore !== null && latestScanRiskScore < 60) {
    residualScore -= Math.min(60 - latestScanRiskScore, 60);
  }

  residualScore -= Math.min(openHighCriticalAssessments, 3) * 8;

  if (hasContract) {
    residualScore += 5;
  }
  if (hasDpa) {
    residualScore += 8;
  }

  residualScore -= Math.min(Math.max(subprocessorCount - 2, 0), 4) * 3;

  residualScore = Math.max(0, Math.min(100, residualScore));

  // 3) Tier + review cadence.
  const tier: RiskTier =
    residualScore < 50 ? "Tier 1 (Critical)" : residualScore < 75 ? "Tier 2 (High)" : "Tier 3 (Medium)";
  const reviewFrequency = REVIEW_FREQUENCY_BY_TIER[tier];

  const nextReviewDate = new Date(now);
  nextReviewDate.setMonth(nextReviewDate.getMonth() + REVIEW_MONTHS_BY_TIER[tier]);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    dataAccessType,
    inherentRisk,
    residualScore: Math.round(residualScore),
    tier,
    reviewFrequency,
    nextReviewDate: nextReviewDate.toISOString(),
    recommendedActions: buildRecommendedActions({
      hasCleanSoc2,
      hasDpa,
      openHighCriticalAssessments,
      latestScanRiskScore,
    }),
    riskFactors: {
      latestScanRiskScore: latestScanRiskScore ?? null,
      openHighCriticalAssessments,
      hasContract,
      hasDpa,
      subprocessorCount,
      hasCleanSoc2,
    },
  };
}

/**
 * Build 3-5 concrete recommended actions from the identified gaps.
 * Gap-derived actions (verbatim strings, stable for UI display):
 *   - missing SOC 2  -> "Mandate annual SOC 2 Type II submission"
 *   - missing DPA    -> "Execute DPA with SCCs"
 *   - open high/crit -> "Follow up on outstanding assessments"
 *   - weak scan      -> "Review threat-intel scan findings (CVE/breach matches)"
 * Fallbacks pad the list to at least 3 items when few/no gaps exist.
 */
function buildRecommendedActions(f: {
  hasCleanSoc2: boolean;
  hasDpa: boolean;
  openHighCriticalAssessments: number;
  latestScanRiskScore: number | null | undefined;
}): string[] {
  const actions: string[] = [];

  if (!f.hasCleanSoc2) {
    actions.push("Mandate annual SOC 2 Type II submission");
  }
  if (!f.hasDpa) {
    actions.push("Execute DPA with SCCs");
  }
  if (f.openHighCriticalAssessments > 0) {
    actions.push("Follow up on outstanding assessments");
  }
  if (f.latestScanRiskScore !== undefined && f.latestScanRiskScore !== null && f.latestScanRiskScore < 60) {
    actions.push("Review threat-intel scan findings (CVE/breach matches)");
  }

  for (const fallback of RECOMMENDED_ACTION_FALLBACKS) {
    if (actions.length >= 3) break;
    if (!actions.includes(fallback)) {
      actions.push(fallback);
    }
  }

  return actions.slice(0, 5);
}

/**
 * Aggregate per-vendor results into a portfolio overview.
 *
 * Deterministic except for the injectable clock: pass the same `now` you used to
 * compute the rows for a fully reproducible result.
 *
 * @param rows — one `VendorRiskResult` per vendor (typically already sorted).
 * @param now — the reference clock for the due-for-review filter and `updatedAt`.
 * @returns overview with tier counts, average residual score and due-for-review list.
 */
export function buildVendorRiskOverview(rows: VendorRiskResult[], now: Date = new Date()): VendorRiskOverview {
  const tierCounts = { tier1: 0, tier2: 0, tier3: 0 };

  for (const row of rows) {
    if (row.tier === "Tier 1 (Critical)") {
      tierCounts.tier1 += 1;
    } else if (row.tier === "Tier 2 (High)") {
      tierCounts.tier2 += 1;
    } else {
      tierCounts.tier3 += 1;
    }
  }

  const totalVendors = rows.length;
  const avgResidualScore =
    totalVendors === 0
      ? 0
      : Math.round((rows.reduce((sum, row) => sum + row.residualScore, 0) / totalVendors) * 10) / 10;

  const nowMs = now.getTime();
  const vendorsDueForReview = rows
    .filter((row) => new Date(row.nextReviewDate).getTime() <= nowMs)
    .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());

  return {
    totalVendors,
    tierCounts,
    avgResidualScore,
    vendorsDueForReview,
    updatedAt: now.toISOString(),
  };
}
