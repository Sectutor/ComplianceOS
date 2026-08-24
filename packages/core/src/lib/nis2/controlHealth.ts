/**
 * NIS2 Article 21(2) control-health engine — pure, deterministic scoring of
 * the twelve NIS2 "measures" (Art. 21(2)(a)-(l)), an eight-domain posture
 * summary, an Article 21 heatmap banding helper and the Art. 23 reporting
 * incident clock.
 *
 * Cycle 38 (DASHBOARD_NIS2_ENHANCEMENT_PLAN Phase 1-2): the backend contract
 * consumed by the nis2Dashboard tRPC router. The engine is PURE — no database,
 * no I/O, no Math.random, no iteration-order dependent logic. Rows are plain
 * records shaped loosely (drizzle rows work as-is); every field read is
 * defensively sanitized so malformed/missing input degrades to "no-data"
 * instead of throwing.
 *
 * Design rules (house pattern — mirrors lib/security/credentialLifecycle.ts
 * and lib/cyber/incidentClassifier.ts):
 * - Pure and deterministic: same input always yields the same output.
 * - NEVER throws: malformed rows are ignored/clamped (NaN->0, negative->0).
 * - Injectable clock: time-sensitive formulas accept `{ clock }` options;
 *   computeIncidentClock takes `now` directly. Default is the real clock.
 * - Stable ordering everywhere (canonical measure/domain orders below).
 *
 * ── Canonical measure order (NIS2 Art. 21(2)) ────────────────────────────
 *  policies            (a)   vulnerabilityMgmt    (f)
 *  riskManagement      (b)   effectiveness        (g)
 *  incidentHandling    (c)   cyberHygiene         (h)
 *  businessContinuity  (d)   cryptography         (i)
 *  supplyChain         (e)   hrSecurity           (j)
 *                            accessControl        (k)
 *                            assetManagement      (l)
 *
 * ── Status bands (per measure) ───────────────────────────────────────────
 *  score >= 80          -> compliant
 *  score >= 50 (<80)    -> at-risk
 *  score  >  0 (<50)    -> non-compliant
 *  zero domain rows     -> no-data (score 0, no metrics, 0 alerts)
 *
 * ── Per-measure formulas (all inputs clamped; shares are 0..1) ───────────
 *  policies           approvedShare*100 - 5*min(overdueReviews,10)
 *                     approved = approvalStatus/status == 'approved';
 *                     overdueReview = reviewDueDate < now && !approved
 *  riskManagement     100 - 45*untreatedShare - 35*highResidualShare
 *                          - 20*unownedUntreatedShare
 *                     untreated = status identified|analyzed; residual =
 *                     residualScore ?? inherentScore ?? likelihood*impact;
 *                     highResidual = residual >= 12 (of 25)
 *  incidentHandling   100 - 25*min(openSignificant,3)
 *                          - 5*min(openOther,10)
 *                     open = status != 'resolved'
 *  businessContinuity 60*freshlyTestedShare + 40*testScheduledShare
 *                     fresh test = lastTestedDate within 365d of now;
 *                     scheduled = nextTestDate > now
 *  supplyChain        100*weightedAssessedShare - 2*min(pending,15)
 *                     assessed vendor = >=1 assessment Completed;
 *                     critical vendors (criticality 'High') weigh x2
 *  vulnerabilityMgmt  100*(1 - weightedOpenShare)
 *                     open = status 'open'; severity weights
 *                     critical 1.0 / high 0.7 / medium 0.4 / low 0.2
 *                     (fallback: cvssScore(x10)/100 clamped 0..1)
 *  effectiveness      100*verifiedShare - 5*min(expiredOrRejected,6)
 *                     over non-'not_applicable' evidence rows
 *  cyberHygiene       100*executedShare - 6*min(overdueSchedules,8)
 *                     executed = completionDate present; overdue schedule =
 *                     status 'scheduled' && scheduledDate < now
 *  cryptography       100*verifiedShare - 5*min(stale,6)
 *                     over the crypto-tagged evidence slice (type/description/
 *                     location matching crypt|encrypt|tls|ssl|pki|key mgmt|
 *                     certificate); empty slice -> no-data
 *  hrSecurity         95*completedShare + 5*inProgressShare
 *                          - 10*min(stalePending,5)
 *                     stalePending = pending && assignedAt older than 90d
 *  accessControl      100*closedCampaignShare - 15*min(overdue,3)
 *                     closed = completedAt present; overdue = dueDate < now
 *                     && !closed
 *  assetManagement    100*inventoryCompleteShare
 *                     complete = owner present && valuationC in 1..5
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** The twelve fixed NIS2 Article 21(2) measure ids, canonical order. */
export type Nis2MeasureId =
  | "policies"
  | "riskManagement"
  | "incidentHandling"
  | "businessContinuity"
  | "supplyChain"
  | "vulnerabilityMgmt"
  | "effectiveness"
  | "cyberHygiene"
  | "cryptography"
  | "hrSecurity"
  | "accessControl"
  | "assetManagement";

/** Health band for a single measure. */
export type Nis2MeasureStatus = "compliant" | "at-risk" | "non-compliant" | "no-data";

/** One human-readable chip on a measure card. */
export interface Nis2MetricChip {
  label: string;
  value: string;
}

/** One Article 21(2) measure health card. */
export interface Nis2ControlMeasure {
  id: Nis2MeasureId;
  /** NIS2 article suffix, e.g. "21(2)(a)". */
  article: string;
  title: string;
  status: Nis2MeasureStatus;
  /** 0-100, rounded to 1 decimal. */
  score: number;
  /** 1-3 human chips (empty only for no-data). */
  metrics: Nis2MetricChip[];
  alertCount: number;
}

/** Full control-health report returned by `computeControlHealth`. */
export interface Nis2ControlHealthReport {
  measures: Nis2ControlMeasure[];
  generatedAt: string;
}

/** The eight fixed dashboard domains, canonical order. */
export type Nis2DomainKey =
  | "risk"
  | "incident"
  | "bcp"
  | "supplyChain"
  | "asset"
  | "training"
  | "access"
  | "policy";

/** Posture band for one domain tile. */
export type Nis2DomainStatus = "healthy" | "watch" | "critical" | "no-data";

/** One domain summary tile. */
export interface Nis2DomainSummaryEntry {
  key: Nis2DomainKey;
  title: string;
  status: Nis2DomainStatus;
  primary: string;
  secondary: string;
  alertCount: number;
}

/** Article 21 heatmap band. */
export type Nis2HeatBand = "green" | "amber" | "red" | "empty";

/** Labels of the three NIS2 Art. 23 reporting milestones (exact strings). */
export type Nis2IncidentMilestoneLabel =
  | "24h Early Warning"
  | "72h Incident Notification"
  | "30-day Final Report";

/** The single most urgent unmet reporting deadline. */
export interface Nis2NextIncidentDeadline {
  label: Nis2IncidentMilestoneLabel;
  /** ISO-8601 timestamp of the anchor (detectedAt + offset). */
  dueAt: string;
  /** Signed hours until due (negative once overdue), 1 decimal. */
  hoursRemaining: number;
  incidentId: number | null;
  incidentTitle: string;
}

/** Result of `computeIncidentClock`. */
export interface Nis2IncidentClockResult {
  openSignificant: number;
  nextDeadline: Nis2NextIncidentDeadline | null;
}

/**
 * Raw domain rows consumed by the engine. Each array holds loosely-typed
 * records (drizzle rows are compatible); arrays are optional — a missing or
 * malformed array is treated as empty ("no-data" for its measures).
 */
export interface Nis2ControlHealthRows {
  policies?: readonly unknown[];
  risks?: readonly unknown[];
  incidents?: readonly unknown[];
  bcPlans?: readonly unknown[];
  vendors?: readonly unknown[];
  vendorAssessments?: readonly unknown[];
  vulnerabilities?: readonly unknown[];
  evidence?: readonly unknown[];
  securityTests?: readonly unknown[];
  trainingAssignments?: readonly unknown[];
  employees?: readonly unknown[];
  accessCampaigns?: readonly unknown[];
  assets?: readonly unknown[];
}

/** Injectable-clock options for the report builders. */
export interface Nis2EngineOptions {
  clock?: () => Date;
}

/* ------------------------------------------------------------------ */
/* Neutral "empty" shapes                                              */
/* ------------------------------------------------------------------ */

/** Degraded control-health payload (DB failure / nothing to report). */
export const EMPTY_CONTROL_HEALTH: Nis2ControlHealthReport = {
  measures: [],
  generatedAt: "",
};

/** Degraded domain-summary payload. */
export const EMPTY_DOMAIN_SUMMARY: { domains: Nis2DomainSummaryEntry[] } = {
  domains: [],
};

/** Degraded incident-clock payload. */
export const EMPTY_INCIDENT_CLOCK: Nis2IncidentClockResult = {
  openSignificant: 0,
  nextDeadline: null,
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Canonical measure catalog (order IS the API contract). */
const MEASURE_CATALOG: ReadonlyArray<{ id: Nis2MeasureId; article: string; title: string }> = [
  { id: "policies", article: "21(2)(a)", title: "Policies on risk analysis & information security" },
  { id: "riskManagement", article: "21(2)(b)", title: "Risk analysis & incident handling" },
  { id: "incidentHandling", article: "21(2)(c)", title: "Incident handling & reporting" },
  { id: "businessContinuity", article: "21(2)(d)", title: "Business continuity & crisis management" },
  { id: "supplyChain", article: "21(2)(e)", title: "Supply chain security" },
  { id: "vulnerabilityMgmt", article: "21(2)(f)", title: "Vulnerability handling & disclosure" },
  { id: "effectiveness", article: "21(2)(g)", title: "Effectiveness assessment of measures" },
  { id: "cyberHygiene", article: "21(2)(h)", title: "Basic cyber-hygiene practices" },
  { id: "cryptography", article: "21(2)(i)", title: "Cryptography & encryption policies" },
  { id: "hrSecurity", article: "21(2)(j)", title: "HR security & awareness training" },
  { id: "accessControl", article: "21(2)(k)", title: "Access control & asset policies" },
  { id: "assetManagement", article: "21(2)(l)", title: "Asset inventory management" },
];

/** Canonical domain catalog (order IS the API contract). */
const DOMAIN_CATALOG: ReadonlyArray<{ key: Nis2DomainKey; title: string }> = [
  { key: "risk", title: "Risk Management" },
  { key: "incident", title: "Incident Response" },
  { key: "bcp", title: "Business Continuity" },
  { key: "supplyChain", title: "Supply Chain" },
  { key: "asset", title: "Asset Management" },
  { key: "training", title: "Training & Awareness" },
  { key: "access", title: "Access Control" },
  { key: "policy", title: "Policy Governance" },
];

/** Score thresholds for measure banding. */
const COMPLIANT_THRESHOLD = 80;
const AT_RISK_THRESHOLD = 50;

/** Domain rules: >4 alerts (or any critical item) -> critical. */
const DOMAIN_CRITICAL_ALERTS = 4;

/** Staleness windows. */
const POLICY_REVIEW_OVERDUE_PENALTY_CAP = 10;
const BCP_TEST_FRESH_DAYS = 365;
const TRAINING_STALE_DAYS = 90;

/* ------------------------------------------------------------------ */
/* Defensive sanitization helpers                                      */
/* ------------------------------------------------------------------ */

/** Coerce to a finite number; anything else -> fallback (default 0). */
function toNum(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Clamp to [min,max]; NaN-safe. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Clamp a count-like input to a non-negative integer (NaN->0, neg->0). */
function toCount(value: unknown): number {
  return Math.floor(Math.max(0, toNum(value)));
}

/** Round to 1 decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Coerce to a trimmed string; anything else -> "". */
function toStr(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Lowercased string compare helper. */
const eqLower = (value: unknown, expected: string): boolean => toStr(value).toLowerCase() === expected;

/** Coerce to a strict boolean (true / "true" / 1). */
function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

/** Coerce to a valid Date; anything else (invalid/malformed) -> null. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Treat a loose row as a record; non-objects become empty records. */
function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
}

/** Filter an arbitrary array down to plain records (malformed rows dropped). */
function safeRows(rows: readonly unknown[] | null | undefined): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as Record<string, unknown>[];
}

/** Case-insensitive keyword probe over concatenated free-text fields. */
function textMatches(row: Record<string, unknown>, fields: string[], pattern: RegExp): boolean {
  const hay = fields.map((f) => toStr(row[f]).toLowerCase()).join(" ");
  return pattern.test(hay);
}

/** Resolve a 0-25 risk residual defensively. */
function residualScoreOf(row: Record<string, unknown>): number {
  const residual = toNum(row.residualScore, NaN);
  if (Number.isFinite(residual) && residual > 0) return clamp(residual, 0, 25);
  const inherent = toNum(row.inherentScore, NaN);
  if (Number.isFinite(inherent) && inherent > 0) return clamp(inherent, 0, 25);
  const likelihood = clamp(toNum(row.likelihood, 0), 0, 5);
  const impact = clamp(toNum(row.impact, 0), 0, 5);
  return clamp(likelihood * impact, 0, 25);
}

/** Severity weight for vulnerability scoring (0..1). */
function vulnerabilityWeight(row: Record<string, unknown>): number {
  switch (toStr(row.severity).toLowerCase()) {
    case "critical":
      return 1;
    case "high":
      return 0.7;
    case "medium":
      return 0.4;
    case "low":
      return 0.2;
    default: {
      // Fallback: cvssScore is stored x10 (75 -> 7.5 -> 0.75).
      const cvss = toNum(row.cvssScore, NaN);
      return Number.isFinite(cvss) && cvss > 0 ? clamp(cvss / 100, 0, 1) : 0.2;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Banding helpers                                                     */
/* ------------------------------------------------------------------ */

/** Map a populated measure's score to its status band. Zero rows callers must use "no-data" themselves. */
function bandScore(score: number): Exclude<Nis2MeasureStatus, "no-data"> {
  if (score >= COMPLIANT_THRESHOLD) return "compliant";
  if (score >= AT_RISK_THRESHOLD) return "at-risk";
  return "non-compliant";
}

/**
 * Article 21 heatmap banding for one measure: compliant->green,
 * at-risk->amber, non-compliant->red, no-data->empty. Never throws.
 */
export function article21BandForMeasure(
  measure: Pick<Nis2ControlMeasure, "status" | "score"> | null | undefined
): Nis2HeatBand {
  if (!measure) return "empty";
  if (measure.status === "compliant") return "green";
  if (measure.status === "at-risk") return "amber";
  if (measure.status === "non-compliant") return "red";
  // Explicit no-data (or anything unexpected) renders as empty.
  if (measure.score >= COMPLIANT_THRESHOLD) return "green";
  if (measure.score >= AT_RISK_THRESHOLD) return "amber";
  if (measure.score > 0) return "red";
  return "empty";
}

/**
 * Article 21 heatmap for a full measure list -> { measureId: band }, keys in
 * canonical measure order. Malformed entries band as "empty".
 */
export function computeArticle21Heatmap(
  measures: readonly unknown[] | undefined
): Record<Nis2MeasureId, Nis2HeatBand> {
  const bands = {} as Record<Nis2MeasureId, Nis2HeatBand>;
  for (const entry of MEASURE_CATALOG) bands[entry.id] = "empty";
  if (!Array.isArray(measures)) return bands;
  for (const raw of measures) {
    const row = asRecord(raw);
    const id = toStr(row.id) as Nis2MeasureId;
    if (!(id in bands)) continue;
    bands[id] = article21BandForMeasure({
      status: (toStr(row.status) || "no-data") as Nis2MeasureStatus,
      score: clamp(toNum(row.score, 0), 0, 100),
    });
  }
  return bands;
}

/* ------------------------------------------------------------------ */
/* Per-measure computation                                             */
/* ------------------------------------------------------------------ */

interface MeasureComputation {
  populated: boolean;
  score: number;
  metrics: Nis2MetricChip[];
  alertCount: number;
}

const NO_MEASURE_DATA: MeasureComputation = { populated: false, score: 0, metrics: [], alertCount: 0 };

/** Chip builder that skips empty values (keeps cards at 1-3 meaningful chips). */
function chip(label: string, value: unknown, suffix = ""): Nis2MetricChip | null {
  const text = toStr(value);
  return text ? { label, value: text + suffix } : null;
}

/**
 * policies — Art. 21(2)(a). Formula:
 *   score = approvedShare*100 - 5*min(overdueReviews,10), clamped 0..100.
 */
function measurePolicies(rows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  let approved = 0;
  let overdue = 0;
  let drafts = 0;
  for (const row of list) {
    const isApproved = eqLower(row.approvalStatus, "approved") || eqLower(row.status, "approved");
    if (isApproved) approved += 1;
    if (eqLower(row.status, "draft")) drafts += 1;
    const due = toDate(row.reviewDueDate);
    if (!isApproved && due !== null && due.getTime() < nowMs) overdue += 1;
  }
  const total = list.length;
  const approvedShare = approved / total;
  const score = clamp(approvedShare * 100 - 5 * Math.min(overdue, POLICY_REVIEW_OVERDUE_PENALTY_CAP), 0, 100);
  const alertCount = clamp(approvedShare < 1 ? overdue + (total - approved) : overdue, 0, total);
  const metrics = [
    chip("Approved", `${approved}/${total}`),
    chip("Reviews overdue", overdue > 0 ? String(overdue) : ""),
    chip("In draft", drafts > 0 ? String(drafts) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount });
}

/**
 * riskManagement — Art. 21(2)(b). Formula:
 *   score = 100 - 45*untreatedShare - 35*highResidualShare - 20*unownedUntreatedShare.
 * Untreated = status identified|analyzed; residual prefers residualScore,
 * falls back inherentScore then likelihood*impact (0-25 scale); >=12 = high.
 */
function measureRiskManagement(rows: readonly unknown[] | null | undefined): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  const total = list.length;
  let untreated = 0;
  let highResidual = 0;
  let unownedUntreated = 0;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    const isUntreated = status === "" || status === "identified" || status === "analyzed";
    const residual = residualScoreOf(row);
    if (isUntreated) {
      untreated += 1;
      if (residual >= 12) highResidual += 1;
      if (!toStr(row.owner)) unownedUntreated += 1;
    }
  }
  const score = clamp(
    100 -
      45 * (untreated / total) -
      35 * (highResidual / total) -
      20 * (unownedUntreated / total),
    0,
    100
  );
  const metrics = [
    chip("Risks tracked", String(total)),
    chip("Untreated", untreated > 0 ? `${untreated}/${total}` : ""),
    chip("High residual", highResidual > 0 ? String(highResidual) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: highResidual });
}

/**
 * incidentHandling — Art. 21(2)(c). Formula:
 *   score = 100 - 25*min(openSignificant,3) - 5*min(openOther,10).
 * Open = status != 'resolved'. Significant = isSignificant flag.
 */
function measureIncidentHandling(rows: readonly unknown[] | null | undefined): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  let openSignificant = 0;
  let openOther = 0;
  let criticalOpen = 0;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    if (status === "resolved") continue;
    if (toBool(row.isSignificant)) openSignificant += 1;
    else openOther += 1;
    if (eqLower(row.severity, "critical")) criticalOpen += 1;
  }
  const score = clamp(100 - 25 * Math.min(openSignificant, 3) - 5 * Math.min(openOther, 10), 0, 100);
  const openTotal = openSignificant + openOther;
  const metrics = [
    chip("Open incidents", openTotal > 0 ? String(openTotal) : "0"),
    chip("Significant open", openSignificant > 0 ? String(openSignificant) : ""),
    chip("Critical severity", criticalOpen > 0 ? String(criticalOpen) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({
    populated: true,
    score: round1(score),
    metrics,
    alertCount: Math.min(list.length, openSignificant + criticalOpen),
  });
}

/**
 * businessContinuity — Art. 21(2)(d). Formula:
 *   score = 60*freshlyTestedShare + 40*testScheduledShare.
 * Fresh test = lastTestedDate within 365 days of now; scheduled =
 * nextTestDate lies in the future.
 */
function measureBusinessContinuity(rows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  let fresh = 0;
  let scheduled = 0;
  let stale = 0;
  for (const row of list) {
    const lastTested = toDate(row.lastTestedDate);
    const nextTest = toDate(row.nextTestDate);
    const isFresh = lastTested !== null && nowMs - lastTested.getTime() <= BCP_TEST_FRESH_DAYS * DAY_MS;
    const isScheduled = nextTest !== null && nextTest.getTime() > nowMs;
    if (isFresh) fresh += 1;
    if (isScheduled) scheduled += 1;
    if (!isFresh && !isScheduled) stale += 1;
  }
  const total = list.length;
  const score = clamp(60 * (fresh / total) + 40 * (scheduled / total), 0, 100);
  const metrics = [
    chip("BC plans", String(total)),
    chip("Tested <365d", fresh > 0 ? `${fresh}/${total}` : ""),
    chip("Need testing", stale > 0 ? String(stale) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: stale });
}

/**
 * supplyChain — Art. 21(2)(e). Formula:
 *   score = 100*weightedAssessedShare - 2*min(pendingAssessments,15).
 * Assessed vendor = >=1 assessment with status 'Completed'; critical vendors
 * (criticality 'High') count double in the coverage share.
 */
function measureSupplyChain(vendors: readonly unknown[] | null | undefined, assessments: readonly unknown[] | null | undefined): MeasureComputation {
  const vendorList = safeRows(vendors);
  if (vendorList.length === 0) return NO_MEASURE_DATA;
  const assessmentList = safeRows(assessments);
  const completedByVendor = new Set<number>();
  let pendingAssessments = 0;
  for (const row of assessmentList) {
    if (eqLower(row.status, "completed")) {
      const vendorId = toNum(row.vendorId, NaN);
      if (Number.isFinite(vendorId)) completedByVendor.add(vendorId);
    } else {
      pendingAssessments += 1;
    }
  }
  let weightedCovered = 0;
  let weightedTotal = 0;
  let criticalUncovered = 0;
  for (const vendor of vendorList) {
    const isCritical = eqLower(vendor.criticality, "high");
    const weight = isCritical ? 2 : 1;
    weightedTotal += weight;
    if (completedByVendor.has(toNum(vendor.id, NaN))) weightedCovered += weight;
    else if (isCritical) criticalUncovered += 1;
  }
  const coverage = weightedTotal > 0 ? weightedCovered / weightedTotal : 0;
  const score = clamp(coverage * 100 - 2 * Math.min(pendingAssessments, 15), 0, 100);
  const metrics = [
    chip("Vendors", String(vendorList.length)),
    chip("Critical uncovered", criticalUncovered > 0 ? String(criticalUncovered) : ""),
    chip("Assessments open", pendingAssessments > 0 ? String(pendingAssessments) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: criticalUncovered });
}

/**
 * vulnerabilityMgmt — Art. 21(2)(f). Formula:
 *   score = 100 * (1 - weightedOpenShare).
 * Open = status 'open'; severity weights critical 1 / high 0.7 / medium 0.4 /
 * low 0.2 (cvss fallback), normalized over the register's total weight.
 */
function measureVulnerabilityMgmt(rows: readonly unknown[] | null | undefined): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  let openWeight = 0;
  let totalWeight = 0;
  let openCount = 0;
  let criticalOpen = 0;
  let highOpen = 0;
  for (const row of list) {
    const weight = vulnerabilityWeight(row);
    totalWeight += weight;
    if (eqLower(row.status, "open")) {
      openWeight += weight;
      openCount += 1;
      const severity = toStr(row.severity).toLowerCase();
      if (severity === "critical") criticalOpen += 1;
      if (severity === "high") highOpen += 1;
    }
  }
  const openShare = totalWeight > 0 ? clamp(openWeight / totalWeight, 0, 1) : 0;
  const score = clamp((1 - openShare) * 100, 0, 100);
  const metrics = [
    chip("Open vulns", `${openCount}/${list.length}`),
    chip("Critical open", criticalOpen > 0 ? String(criticalOpen) : ""),
    chip("High open", highOpen > 0 ? String(highOpen) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: criticalOpen + highOpen });
}

/**
 * effectiveness — Art. 21(2)(g). Evidence verification formula:
 *   score = 100*verifiedShare - 5*min(expiredOrRejected,6)
 * over evidence rows whose status != 'not_applicable'.
 */
function measureEvidenceVerification(rows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(rows).filter((row) => !eqLower(row.status, "not_applicable"));
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  let verified = 0;
  let collected = 0;
  let stale = 0;
  let overdueDue = 0;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    if (status === "verified") verified += 1;
    else if (status === "collected") collected += 1;
    if (status === "expired" || status === "rejected") stale += 1;
    const due = toDate(row.dueDate);
    if ((status === "pending" || status === "") && due !== null && due.getTime() < nowMs) overdueDue += 1;
  }
  const total = list.length;
  const score = clamp((verified / total) * 100 - 5 * Math.min(stale, 6), 0, 100);
  const metrics = [
    chip("Verified", `${verified}/${total}`),
    chip("Expired/rejected", stale + overdueDue > 0 ? String(stale + overdueDue) : ""),
    chip("Awaiting collection", collected > 0 ? String(collected) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: Math.min(total, stale + overdueDue) });
}

/**
 * cyberHygiene — Art. 21(2)(h). Security-testing cadence formula:
 *   score = 100*executedShare - 6*min(overdueSchedules,8).
 * Executed = completionDate present; overdue schedule = status 'scheduled'
 * with scheduledDate in the past.
 */
function measureCyberHygiene(rows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  let executed = 0;
  let overdue = 0;
  for (const row of list) {
    if (toDate(row.completionDate) !== null) executed += 1;
    const sched = toDate(row.scheduledDate);
    if (eqLower(row.status, "scheduled") && sched !== null && sched.getTime() < nowMs) overdue += 1;
  }
  const total = list.length;
  const score = clamp((executed / total) * 100 - 6 * Math.min(overdue, 8), 0, 100);
  const metrics = [
    chip("Tests executed", `${executed}/${total}`),
    chip("Overdue schedules", overdue > 0 ? String(overdue) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: overdue });
}

/** Crypto-artifact keyword matcher over the evidence table's free-text columns. */
const CRYPTO_PATTERN = /\b(crypt|encrypt|tls|ssl|pki|key\s*management|certificate)\b/i;

/**
 * cryptography — Art. 21(2)(i). Verified-share formula over the crypto-tagged
 * evidence slice (type/description/location keyword match):
 *   score = 100*verifiedShare - 5*min(stale,6).
 * Empty slice -> no-data (nothing cryptographic tracked yet).
 */
function measureCryptography(evidenceRows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(evidenceRows)
    .filter((row) => !eqLower(row.status, "not_applicable"))
    .filter((row) => textMatches(row, ["type", "description", "location"], CRYPTO_PATTERN));
  if (list.length === 0) return NO_MEASURE_DATA;
  const base = measureEvidenceVerification(list, now);
  return base;
}

/**
 * hrSecurity — Art. 21(2)(j). Security-awareness formula:
 *   score = 95*completedShare + 5*inProgressShare - 10*min(stalePending,5).
 * Stale pending = status 'pending' with assignedAt older than 90 days.
 */
function measureHrSecurity(assignments: readonly unknown[] | null | undefined, employees: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(assignments);
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  const staleCutoff = nowMs - TRAINING_STALE_DAYS * DAY_MS;
  let completed = 0;
  let inProgress = 0;
  let stalePending = 0;
  let scoreSum = 0;
  let scored = 0;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    if (status === "completed") completed += 1;
    else if (status === "in_progress") inProgress += 1;
    const assigned = toDate(row.assignedAt);
    if ((status === "pending" || status === "") && assigned !== null && assigned.getTime() < staleCutoff) {
      stalePending += 1;
    }
    const quiz = toNum(row.score, NaN);
    if (Number.isFinite(quiz) && quiz > 0) {
      scoreSum += quiz;
      scored += 1;
    }
  }
  const total = list.length;
  const avgScore = scored > 0 ? Math.round(scoreSum / scored) : 0;
  const score = clamp(
    95 * (completed / total) +
      5 * (inProgress / total) -
      10 * Math.min(stalePending, 5),
    0,
    100
  );
  const employeeCount = safeRows(employees).length;
  const metrics = [
    chip("Completed", `${completed}/${total}`),
    chip("Overdue >90d", stalePending > 0 ? String(stalePending) : ""),
    chip("Avg score", avgScore > 0 ? `${avgScore}%` : employeeCount > 0 ? `${employeeCount} staff` : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: stalePending });
}

/**
 * accessControl — Art. 21(2)(k). Access-review campaign formula:
 *   score = 100*closedCampaignShare - 15*min(overdueCampaigns,3).
 * Closed = completedAt present; overdue = dueDate past && not closed.
 */
function measureAccessControl(rows: readonly unknown[] | null | undefined, now: Date): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  const nowMs = now.getTime();
  let closed = 0;
  let overdue = 0;
  for (const row of list) {
    const isClosed = toDate(row.completedAt) !== null || toStr(row.status).toLowerCase().includes("complete");
    if (isClosed) closed += 1;
    const due = toDate(row.dueDate);
    if (!isClosed && due !== null && due.getTime() < nowMs) overdue += 1;
  }
  const total = list.length;
  const score = clamp((closed / total) * 100 - 15 * Math.min(overdue, 3), 0, 100);
  const metrics = [
    chip("Campaigns closed", `${closed}/${total}`),
    chip("Overdue", overdue > 0 ? String(overdue) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: overdue });
}

/**
 * assetManagement — Art. 21(2)(l). Inventory completeness formula:
 *   score = 100*completeShare where complete = owner present &&
 *   valuationC within 1..5.
 */
function measureAssetManagement(rows: readonly unknown[] | null | undefined): MeasureComputation {
  const list = safeRows(rows);
  if (list.length === 0) return NO_MEASURE_DATA;
  let complete = 0;
  let gaps = 0;
  for (const row of list) {
    const valuation = toNum(row.valuationC, NaN);
    const valued = Number.isFinite(valuation) && valuation >= 1 && valuation <= 5;
    const owned = Boolean(toStr(row.owner));
    if (owned && valued) complete += 1;
    else gaps += 1;
  }
  const total = list.length;
  const score = clamp((complete / total) * 100, 0, 100);
  const metrics = [
    chip("Assets", String(total)),
    chip("Fully attributed", `${complete}/${total}`),
    chip("Inventory gaps", gaps > 0 ? String(gaps) : ""),
  ].filter((m): m is Nis2MetricChip => m !== null);
  return ({ populated: true, score: round1(score), metrics, alertCount: gaps });
}

/* ------------------------------------------------------------------ */
/* Report builders                                                     */
/* ------------------------------------------------------------------ */

/** Build all 12 measure cards in canonical order (shared by both queries). */
function buildMeasures(rows: Nis2ControlHealthRows, now: Date): Nis2ControlMeasure[] {
  const computations: Array<{ meta: (typeof MEASURE_CATALOG)[number]; calc: MeasureComputation }> = [
    { meta: MEASURE_CATALOG[0], calc: measurePolicies(rows.policies, now) },
    { meta: MEASURE_CATALOG[1], calc: measureRiskManagement(rows.risks) },
    { meta: MEASURE_CATALOG[2], calc: measureIncidentHandling(rows.incidents) },
    { meta: MEASURE_CATALOG[3], calc: measureBusinessContinuity(rows.bcPlans, now) },
    { meta: MEASURE_CATALOG[4], calc: measureSupplyChain(rows.vendors, rows.vendorAssessments) },
    { meta: MEASURE_CATALOG[5], calc: measureVulnerabilityMgmt(rows.vulnerabilities) },
    { meta: MEASURE_CATALOG[6], calc: measureEvidenceVerification(rows.evidence, now) },
    { meta: MEASURE_CATALOG[7], calc: measureCyberHygiene(rows.securityTests, now) },
    { meta: MEASURE_CATALOG[8], calc: measureCryptography(rows.evidence, now) },
    { meta: MEASURE_CATALOG[9], calc: measureHrSecurity(rows.trainingAssignments, rows.employees, now) },
    { meta: MEASURE_CATALOG[10], calc: measureAccessControl(rows.accessCampaigns, now) },
    { meta: MEASURE_CATALOG[11], calc: measureAssetManagement(rows.assets) },
  ];

  return computations.map(({ meta, calc }) => ({
    id: meta.id,
    article: meta.article,
    title: meta.title,
    status: (calc.populated ? bandScore(calc.score) : "no-data") as Nis2MeasureStatus,
    score: calc.populated ? calc.score : 0,
    metrics: calc.populated ? calc.metrics : [],
    alertCount: calc.populated ? toCount(calc.alertCount) : 0,
  }));
}

/**
 * Compute the full NIS2 control-health report: all 12 Article 21(2) measures
 * in canonical order. Never throws; missing/malformed row arrays degrade the
 * affected measures to "no-data".
 */
export function computeControlHealth(
  rows: Nis2ControlHealthRows | null | undefined,
  options?: Nis2EngineOptions
): Nis2ControlHealthReport {
  try {
    const clock = options?.clock ?? (() => new Date());
    const now = toDate(clock()) ?? new Date();
    const source: Nis2ControlHealthRows = rows && typeof rows === "object" ? rows : {};
    const measures = buildMeasures(source, now);
    return { measures, generatedAt: now.toISOString() };
  } catch {
    return { ...EMPTY_CONTROL_HEALTH, generatedAt: new Date().toISOString() };
  }
}

/* ------------------------------------------------------------------ */
/* Domain summarization                                                */
/* ------------------------------------------------------------------ */

interface DomainAlerts {
  populated: boolean;
  alertCount: number;
  hasCriticalItem: boolean;
  primary: string;
  secondary: string;
}

const NO_DOMAIN_DATA: DomainAlerts = {
  populated: false,
  alertCount: 0,
  hasCriticalItem: false,
  primary: "",
  secondary: "",
};

function domainRisk(rows: Nis2ControlHealthRows): DomainAlerts {
  const list = safeRows(rows.risks);
  if (list.length === 0) return NO_DOMAIN_DATA;
  let untreated = 0;
  let highResidual = 0;
  let criticalItem = false;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    const isUntreated = status === "" || status === "identified" || status === "analyzed";
    const residual = residualScoreOf(row);
    const residualLabel = toStr(row.residualRisk).toLowerCase();
    if (isUntreated) untreated += 1;
    if (residual >= 12 || residualLabel === "high" || residualLabel === "critical") highResidual += 1;
    if (residual >= 17 || residualLabel === "critical") criticalItem = true;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, highResidual),
    hasCriticalItem: criticalItem,
    primary: `${untreated}/${list.length} risks untreated`,
    secondary: `${highResidual} high-residual`,
  };
}

function domainIncident(rows: Nis2ControlHealthRows): DomainAlerts {
  const list = safeRows(rows.incidents);
  if (list.length === 0) return NO_DOMAIN_DATA;
  let open = 0;
  let significant = 0;
  let criticalItem = false;
  for (const row of list) {
    if (eqLower(row.status, "resolved")) continue;
    open += 1;
    if (toBool(row.isSignificant)) {
      significant += 1;
      criticalItem = true;
    }
    if (eqLower(row.severity, "critical")) criticalItem = true;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, open),
    hasCriticalItem: criticalItem,
    primary: `${open} open incident${open === 1 ? "" : "s"}`,
    secondary: `${significant} significant`,
  };
}

function domainBcp(rows: Nis2ControlHealthRows, now: Date): DomainAlerts {
  const list = safeRows(rows.bcPlans);
  if (list.length === 0) return NO_DOMAIN_DATA;
  const nowMs = now.getTime();
  let stale = 0;
  for (const row of list) {
    const lastTested = toDate(row.lastTestedDate);
    const nextTest = toDate(row.nextTestDate);
    const isFresh = lastTested !== null && nowMs - lastTested.getTime() <= BCP_TEST_FRESH_DAYS * DAY_MS;
    const isScheduled = nextTest !== null && nextTest.getTime() > nowMs;
    if (!isFresh && !isScheduled) stale += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, stale),
    hasCriticalItem: false,
    primary: `${list.length} BC plan${list.length === 1 ? "" : "s"}`,
    secondary: `${stale} need testing`,
  };
}

function domainSupplyChain(rows: Nis2ControlHealthRows): DomainAlerts {
  const vendorList = safeRows(rows.vendors);
  if (vendorList.length === 0) return NO_DOMAIN_DATA;
  const assessments = safeRows(rows.vendorAssessments);
  const completedByVendor = new Set<number>();
  let pending = 0;
  for (const row of assessments) {
    if (eqLower(row.status, "completed")) {
      const vendorId = toNum(row.vendorId, NaN);
      if (Number.isFinite(vendorId)) completedByVendor.add(vendorId);
    } else {
      pending += 1;
    }
  }
  let criticalUncovered = 0;
  for (const vendor of vendorList) {
    if (eqLower(vendor.criticality, "high") && !completedByVendor.has(toNum(vendor.id, NaN))) criticalUncovered += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(vendorList.length, criticalUncovered),
    hasCriticalItem: false,
    primary: `${vendorList.length} vendor${vendorList.length === 1 ? "" : "s"}`,
    secondary: `${pending} assessments open`,
  };
}

function domainAsset(rows: Nis2ControlHealthRows): DomainAlerts {
  const list = safeRows(rows.assets);
  if (list.length === 0) return NO_DOMAIN_DATA;
  let gaps = 0;
  for (const row of list) {
    const valuation = toNum(row.valuationC, NaN);
    const valued = Number.isFinite(valuation) && valuation >= 1 && valuation <= 5;
    if (!toStr(row.owner) || !valued) gaps += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, gaps),
    hasCriticalItem: false,
    primary: `${list.length} asset${list.length === 1 ? "" : "s"} inventoried`,
    secondary: `${gaps} inventory gap${gaps === 1 ? "" : "s"}`,
  };
}

function domainTraining(rows: Nis2ControlHealthRows, now: Date): DomainAlerts {
  const list = safeRows(rows.trainingAssignments);
  if (list.length === 0) return NO_DOMAIN_DATA;
  const staleCutoff = now.getTime() - TRAINING_STALE_DAYS * DAY_MS;
  let completed = 0;
  let stale = 0;
  for (const row of list) {
    const status = toStr(row.status).toLowerCase();
    if (status === "completed") completed += 1;
    const assigned = toDate(row.assignedAt);
    if ((status === "pending" || status === "") && assigned !== null && assigned.getTime() < staleCutoff) stale += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, stale),
    hasCriticalItem: false,
    primary: `${completed}/${list.length} training completed`,
    secondary: `${stale} overdue >90d`,
  };
}

function domainAccess(rows: Nis2ControlHealthRows, now: Date): DomainAlerts {
  const list = safeRows(rows.accessCampaigns);
  if (list.length === 0) return NO_DOMAIN_DATA;
  const nowMs = now.getTime();
  let closed = 0;
  let overdue = 0;
  for (const row of list) {
    const isClosed = toDate(row.completedAt) !== null || toStr(row.status).toLowerCase().includes("complete");
    if (isClosed) closed += 1;
    const due = toDate(row.dueDate);
    if (!isClosed && due !== null && due.getTime() < nowMs) overdue += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, overdue),
    hasCriticalItem: false,
    primary: `${closed}/${list.length} reviews closed`,
    secondary: `${overdue} overdue`,
  };
}

function domainPolicy(rows: Nis2ControlHealthRows, now: Date): DomainAlerts {
  const list = safeRows(rows.policies);
  if (list.length === 0) return NO_DOMAIN_DATA;
  const nowMs = now.getTime();
  let approved = 0;
  let overdue = 0;
  for (const row of list) {
    const isApproved = eqLower(row.approvalStatus, "approved") || eqLower(row.status, "approved");
    if (isApproved) approved += 1;
    const due = toDate(row.reviewDueDate);
    if (!isApproved && due !== null && due.getTime() < nowMs) overdue += 1;
  }
  return {
    populated: true,
    alertCount: Math.min(list.length, overdue + (list.length - approved)),
    hasCriticalItem: false,
    primary: `${approved}/${list.length} policies approved`,
    secondary: `${overdue} reviews overdue`,
  };
}

/**
 * Summarize the eight dashboard domains in canonical order. Status rules:
 *   empty domain rows            -> no-data
 *   alertCount > 4 or a critical item -> critical
 *   1..4 alerts or at-risk score -> watch
 *   otherwise                    -> healthy
 */
export function computeDomainSummary(
  rows: Nis2ControlHealthRows | null | undefined,
  options?: Nis2EngineOptions
): { domains: Nis2DomainSummaryEntry[] } {
  try {
    const clock = options?.clock ?? (() => new Date());
    const now = toDate(clock()) ?? new Date();
    const source: Nis2ControlHealthRows = rows && typeof rows === "object" ? rows : {};

    const measureScores = new Map<Nis2MeasureId, number>();
    for (const measure of buildMeasures(source, now)) measureScores.set(measure.id, measure.score);

    const builders: Array<{ key: Nis2DomainKey; title: string; measure: Nis2MeasureId; alerts: DomainAlerts }> = [
      { key: "risk", title: DOMAIN_CATALOG[0].title, measure: "riskManagement", alerts: domainRisk(source) },
      { key: "incident", title: DOMAIN_CATALOG[1].title, measure: "incidentHandling", alerts: domainIncident(source) },
      { key: "bcp", title: DOMAIN_CATALOG[2].title, measure: "businessContinuity", alerts: domainBcp(source, now) },
      { key: "supplyChain", title: DOMAIN_CATALOG[3].title, measure: "supplyChain", alerts: domainSupplyChain(source) },
      { key: "asset", title: DOMAIN_CATALOG[4].title, measure: "assetManagement", alerts: domainAsset(source) },
      { key: "training", title: DOMAIN_CATALOG[5].title, measure: "hrSecurity", alerts: domainTraining(source, now) },
      { key: "access", title: DOMAIN_CATALOG[6].title, measure: "accessControl", alerts: domainAccess(source, now) },
      { key: "policy", title: DOMAIN_CATALOG[7].title, measure: "policies", alerts: domainPolicy(source, now) },
    ];

    const domains = builders.map(({ key, title, measure, alerts }) => {
      const score = measureScores.get(measure) ?? 0;
      let status: Nis2DomainStatus;
      if (!alerts.populated) {
        status = "no-data";
      } else if (alerts.alertCount > DOMAIN_CRITICAL_ALERTS || alerts.hasCriticalItem) {
        status = "critical";
      } else if (alerts.alertCount >= 1 || (score >= AT_RISK_THRESHOLD && score < COMPLIANT_THRESHOLD)) {
        status = "watch";
      } else {
        status = "healthy";
      }
      return {
        key,
        title,
        status,
        primary: alerts.primary || title,
        secondary: alerts.secondary,
        alertCount: toCount(alerts.alertCount),
      };
    });

    return { domains };
  } catch {
    return { ...EMPTY_DOMAIN_SUMMARY };
  }
}

/* ------------------------------------------------------------------ */
/* Incident clock                                                      */
/* ------------------------------------------------------------------ */

/** Milestone definitions: exact labels, offsets, and sent-marker fields. */
const INCIDENT_MILESTONES: ReadonlyArray<{
  label: Nis2IncidentMilestoneLabel;
  offsetMs: number;
  sentField: string;
}> = [
  { label: "24h Early Warning", offsetMs: 24 * HOUR_MS, sentField: "earlyWarningSentAt" },
  { label: "72h Incident Notification", offsetMs: 72 * HOUR_MS, sentField: "intermediateReportSentAt" },
  { label: "30-day Final Report", offsetMs: 30 * DAY_MS, sentField: "finalReportSentAt" },
];

/**
 * Incident statuses treated as CLOSED for clock purposes. Everything else
 * ('open' | 'investigating' | 'mitigated' | 'reported' | unknown) counts as
 * still-open — mitigated/reported incidents may still owe a final report.
 */
const INCIDENT_CLOSED_STATUSES = new Set(["resolved", "closed"]);

/** Normalize a loose incident id to a number (numeric strings allowed). */
function incidentIdOf(row: Record<string, unknown>): number | null {
  const id = toNum(row.id, NaN);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * NIS2 Article 23 incident clock.
 *
 * Anchors each significant OPEN incident's three reporting milestones at
 * detectedAt +24h / +72h / +30d; a milestone whose sent-marker field
 * (earlyWarningSentAt / intermediateReportSentAt / finalReportSentAt) holds a
 * valid date is already satisfied and skipped. Across all remaining UNMET
 * milestones the EARLIEST dueAt wins. hoursRemaining is signed (negative =
 * overdue), rounded to 1 decimal.
 *
 * Insignificant/closed incidents are excluded from openSignificant. Rows with
 * a valid identity/severity but an unusable detectedAt still count toward
 * openSignificant (their deadlines simply cannot be anchored). Fully
 * malformed rows are ignored safely.
 *
 * @param rows incident records (drizzle rows compatible)
 * @param now  injectable reference clock (defaults to the real clock)
 */
export function computeIncidentClock(
  rows: readonly unknown[] | null | undefined,
  now?: Date | null
): Nis2IncidentClockResult {
  try {
    const reference = toDate(now) ?? new Date();
    const nowMs = reference.getTime();
    const list = safeRows(rows);

    let openSignificant = 0;
    let best:
      | (Nis2NextIncidentDeadline & { dueAtMs: number; detectedMs: number })
      | null = null;

    for (const row of list) {
      const status = toStr(row.status).toLowerCase();
      if (INCIDENT_CLOSED_STATUSES.has(status)) continue;
      if (!toBool(row.isSignificant)) continue;
      openSignificant += 1;

      const detected = toDate(row.detectedAt);
      if (detected === null) continue; // no anchor -> contributes count only
      const detectedMs = detected.getTime();

      const id = incidentIdOf(row);
      const title = toStr(row.title) || "Untitled incident";

      for (const milestone of INCIDENT_MILESTONES) {
        // Already-sent milestones are satisfied — skip them.
        if (toDate(row[milestone.sentField]) !== null) continue;
        const dueAtMs = detectedMs + milestone.offsetMs;
        const beatsBest =
          best === null ||
          dueAtMs < best.dueAtMs ||
          // Deterministic tie-breaks on equal dueAt: earlier detection,
          // then lower incident id, then milestone declaration order
          // (stable because milestones iterate in fixed order).
          (dueAtMs === best.dueAtMs && detectedMs < best.detectedMs) ||
          (dueAtMs === best.dueAtMs &&
            detectedMs === best.detectedMs &&
            id !== null &&
            best.incidentId !== null &&
            id < best.incidentId);
        if (!beatsBest) continue;
        best = {
          label: milestone.label,
          dueAt: new Date(dueAtMs).toISOString(),
          dueAtMs,
          detectedMs,
          hoursRemaining: round1((dueAtMs - nowMs) / HOUR_MS),
          incidentId: id,
          incidentTitle: title,
        };
      }
    }

    if (best === null) return { openSignificant, nextDeadline: null };
    return {
      openSignificant,
      nextDeadline: {
        label: best.label,
        dueAt: best.dueAt,
        hoursRemaining: best.hoursRemaining,
        incidentId: best.incidentId,
        incidentTitle: best.incidentTitle,
      },
    };
  } catch {
    return { ...EMPTY_INCIDENT_CLOCK };
  }
}
