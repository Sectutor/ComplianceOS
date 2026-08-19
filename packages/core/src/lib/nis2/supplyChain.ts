/**
 * NIS2 supply-chain security engine.
 *
 * Cycle 17 (NIS2 Implementation Plan Phase 3 Task 3.1 — ENISA Measure 5.1
 * "Supply Chain Security", NIS2 Article 21(2)(d)): the NIS2-specific supplier
 * security lifecycle — criticality classification with a review cadence,
 * security-posture scoring against 8 weighted contractual controls, incident
 * notification SLA tracking, and cadence-driven security-monitoring SLA
 * statuses. Complements (and deliberately does NOT replace) the per-vendor
 * risk tiers in lib/vendor/vendorRisk.ts.
 *
 * Design rules (house pattern — mirrors lib/cyber/incidentClassifier.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no iteration-order
 *   dependent logic. Same input always yields the same output.
 * - NEVER throws: malformed input (missing/invalid dates, negative/NaN
 *   numbers, non-object input) is clamped to 0 / treated as false / defaulted
 *   and yields a neutral safe shape.
 * - Injectable clock: `now` parameters default to `new Date()` but can be
 *   pinned in tests.
 * - Time arithmetic uses fixed millisecond constants in the house style of
 *   lib/cyber/incidentClassifier.ts; one month = 30 days.
 *
 * Criticality model (additive, clamped 0-100):
 *   services essential to critical functions +45
 *   processes sensitive data                  +30
 *   broad network access                      +25  (restricted +15)
 *   subcontractor                             -10
 *   annual spend >= EUR 1,000,000             +10
 *   score >= 70 => critical | >= 50 => high | >= 25 => medium | else low.
 *   Review cadence: critical Quarterly (3mo), high Semi-Annual (6mo),
 *   medium Annual (12mo), low Biennial (24mo). nextReviewDate = now + months.
 *
 * Posture model (8 contractual controls, weights sum to 100):
 *   score = sum(weights of met controls). readiness:
 *   >= 85 => Strong | >= 65 => Developing | >= 40 => At Risk | < 40 => At Risk
 *   (At Risk covers everything below 65 when data is present; the 40 boundary
 *   is documented for completeness). No answers provided (empty object or all
 *   values undefined) => score 0, readiness "No Data".
 *
 * Incident SLA model:
 *   notificationSlaHours defaults to 24h when significant, else 72h.
 *   notificationDeadline = detectedAt + SLA hours. Status precedence:
 *   acknowledged > submitted > overdue (past deadline) > due (inside the 12h
 *   window before the deadline) > pending. daysRemaining = signed whole days
 *   from now to the deadline (Math.round), null once submitted/acknowledged.
 *   The "not-required" status exists in the union for other callers (e.g. the
 *   UI for non-applicable suppliers) but is never emitted by this tracker.
 *
 * Monitoring SLA model (cadence-driven; `passed` is informational only):
 *   no lastVerifiedAt           => not-tested (daysUntilDue 0)
 *   daysSince > cadence * 2     => breached
 *   daysSince > cadence         => at-risk
 *   else                        => compliant
 *   daysUntilDue = cadence - daysSince (signed, negative = overdue; rounded
 *   to whole days). Items with an invalid cadenceDays (<= 0 or NaN) are
 *   filtered out; missing/invalid item arrays yield an empty list and a
 *   zeroed summary.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Supplier criticality band (higher score = more critical). */
export type SupplierCriticality = "critical" | "high" | "medium" | "low";

/** Supplier review cadence labels (mapped from criticality). */
export type SupplierReviewFrequency = "Quarterly" | "Semi-Annual" | "Annual" | "Biennial";

/** Supplier security-posture readiness band. */
export type SupplierPostureReadiness = "Strong" | "Developing" | "At Risk" | "No Data";

/** Lifecycle status of a supplier incident notification. */
export type SupplierIncidentStatus =
  | "not-required"
  | "pending"
  | "due"
  | "overdue"
  | "submitted"
  | "acknowledged";

/** Status of a single security-monitoring SLA item. */
export type SlaStatus = "compliant" | "at-risk" | "breached" | "not-tested";

/** Contractual security controls scored by the posture engine. */
export type SupplyChainControlId =
  | "securityRequirementsInAgreement"
  | "incidentNotificationCommitment"
  | "vulnerabilityHandlingProcess"
  | "auditRights"
  | "subcontractingConstraints"
  | "terminationExitProvisions"
  | "dataProtectionMeasures"
  | "businessContinuityProvisions";

/** Input for `classifySupplierCriticality`. */
export interface ClassifySupplierCriticalityInput {
  supplierName?: string;
  servicesEssentialToCriticalFunctions?: boolean;
  processesSensitiveData?: boolean;
  networkAccessLevel?: "none" | "restricted" | "broad";
  isSubcontractor?: boolean;
  annualSpendEur?: number;
  now?: Date;
}

/** Output of `classifySupplierCriticality`. */
export interface SupplierCriticalityResult {
  supplierName: string;
  criticality: SupplierCriticality;
  /** 0-100 additive score, higher = more critical. */
  criticalityScore: number;
  /** One stable string per triggered factor (stable order). */
  rationale: string[];
  reviewFrequency: SupplierReviewFrequency;
  /** now + review months, ISO 8601 string. */
  nextReviewDate: string;
}

/** Input for `scoreSupplierSecurityPosture`. */
export interface ScoreSupplierSecurityPostureInput {
  supplierName?: string;
  answers?: Partial<Record<SupplyChainControlId, boolean>>;
}

/** One scored control inside the posture result. */
export interface SupplierControlArea {
  id: SupplyChainControlId;
  label: string;
  met: boolean;
  weight: number;
}

/** Output of `scoreSupplierSecurityPosture`. */
export interface SupplierPostureResult {
  supplierName: string;
  /** 0-100 weighted score (0 when no data). */
  score: number;
  readiness: SupplierPostureReadiness;
  areas: SupplierControlArea[];
  /** Labels of unmet controls, in catalog order. */
  gaps: string[];
  recommendedActions: string[];
}

/** Input for `trackSupplierIncident`. */
export interface TrackSupplierIncidentInput {
  supplierName?: string;
  incidentTitle?: string;
  detectedAt?: Date;
  significant?: boolean;
  notificationSlaHours?: number;
  reportedToEntityAt?: Date;
  acknowledgedAt?: Date;
  now?: Date;
}

/** Output of `trackSupplierIncident`. */
export interface TrackSupplierIncidentResult {
  /** Deterministic slug of `supplierName-incidentTitle`. */
  incidentId: string;
  supplierName: string;
  incidentTitle: string;
  significant: boolean;
  notificationDeadline: Date;
  status: SupplierIncidentStatus;
  /** Signed whole days now -> deadline; null once submitted/acknowledged. */
  daysRemaining: number | null;
  /** Short deterministic explanation of the status. */
  note: string;
}

/** Input for `monitorSecuritySla`. */
export interface MonitorSecuritySlaInput {
  supplierName?: string;
  items?: SecuritySlaItemInput[];
  now?: Date;
}

/** One SLA item as provided by the caller. */
export interface SecuritySlaItemInput {
  id: string;
  title: string;
  /** Verification cadence in days (must be a positive finite number). */
  cadenceDays: number;
  lastVerifiedAt?: Date;
  /** Informational only — status is cadence-driven. */
  passed: boolean;
}

/** One SLA item in the result (invalid cadences filtered out). */
export interface SecuritySlaItem {
  id: string;
  title: string;
  cadenceDays: number;
  lastVerifiedAt: Date | null;
  passed: boolean;
  status: SlaStatus;
  /** cadence - daysSince; negative = overdue; 0 when not-tested. */
  daysUntilDue: number;
}

/** Counts per SLA status. */
export interface SecuritySlaSummary {
  compliant: number;
  atRisk: number;
  breached: number;
  notTested: number;
  total: number;
}

/** Output of `monitorSecuritySla`. */
export interface SecuritySlaResult {
  supplierName: string;
  items: SecuritySlaItem[];
  summary: SecuritySlaSummary;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** One month = 30 days (fixed ms arithmetic, house style). */
const MONTH_MS = 30 * DAY_MS;

/** Incident notification "due" window before the deadline (hours). */
const DUE_WINDOW_HOURS = 12;

/** Default incident notification SLA hours (24 significant / 72 else). */
const SLA_HOURS_SIGNIFICANT = 24;
const SLA_HOURS_NON_SIGNIFICANT = 72;

/** Annual spend threshold that adds criticality points (EUR). */
const SPEND_CRITICALITY_THRESHOLD = 1_000_000;

/** Criticality score weights (documented in the header). */
const WEIGHT_ESSENTIAL_SERVICES = 45;
const WEIGHT_SENSITIVE_DATA = 30;
const WEIGHT_NETWORK_BROAD = 25;
const WEIGHT_NETWORK_RESTRICTED = 15;
const WEIGHT_SUBCONTRACTOR = -10;
const WEIGHT_HIGH_SPEND = 10;

/** Criticality bands (score thresholds). */
const CRITICALITY_CRITICAL = 70;
const CRITICALITY_HIGH = 50;
const CRITICALITY_MEDIUM = 25;

/** Posture readiness bands (score thresholds). */
const READINESS_STRONG = 85;
const READINESS_DEVELOPING = 65;
const READINESS_AT_RISK = 40;

/**
 * Contractual security controls in catalog order (stable output order).
 * Weights sum to 100.
 */
export const SUPPLY_CHAIN_CONTROLS: ReadonlyArray<{
  id: SupplyChainControlId;
  label: string;
  weight: number;
}> = [
  { id: "securityRequirementsInAgreement", label: "Security requirements in agreement", weight: 20 },
  { id: "incidentNotificationCommitment", label: "Incident notification commitment", weight: 15 },
  { id: "vulnerabilityHandlingProcess", label: "Vulnerability handling & disclosure process", weight: 15 },
  { id: "auditRights", label: "Audit / inspection rights", weight: 12 },
  { id: "subcontractingConstraints", label: "Subcontracting constraints", weight: 10 },
  { id: "terminationExitProvisions", label: "Termination & exit provisions", weight: 10 },
  { id: "dataProtectionMeasures", label: "Data protection measures", weight: 10 },
  { id: "businessContinuityProvisions", label: "Business continuity provisions", weight: 8 },
];

/** The eight control ids in catalog order (useful for schemas/tests). */
export const SUPPLY_CHAIN_CONTROL_IDS: readonly SupplyChainControlId[] =
  SUPPLY_CHAIN_CONTROLS.map((c) => c.id);

/** Recommended action per unmet control (one per gap). */
const CONTROL_GAP_ACTIONS: Record<SupplyChainControlId, string> = {
  securityRequirementsInAgreement: "Add security requirements to the supplier agreement",
  incidentNotificationCommitment: "Negotiate incident notification commitment (24h/72h)",
  vulnerabilityHandlingProcess: "Establish a vulnerability handling & disclosure process",
  auditRights: "Include audit rights in the contract",
  subcontractingConstraints: "Add subcontracting constraints",
  terminationExitProvisions: "Define termination & exit provisions",
  dataProtectionMeasures: "Add data protection measures to the DPA",
  businessContinuityProvisions: "Require business continuity provisions",
};

/**
 * Standard fallback recommendations appended until the list holds at least 3
 * items. With every control met the list contains just these two.
 */
const STANDARD_ACTIONS: ReadonlyArray<string> = [
  "Reassess at next review",
  "Maintain supplier security documentation",
];

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** Coerce a number to a non-negative finite value; anything else -> 0. */
const toNonNegative = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

/** Coerce a date to a valid Date; invalid input -> `fallback`. */
const toValidDate = (value: Date | undefined, fallback: Date): Date =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : fallback;

/** Coerce a date to a valid Date or null when missing/invalid. */
const toOptionalValidDate = (value: Date | undefined): Date | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;

/** Coerce a supplier name; missing/blank -> "Unnamed supplier". */
const toSupplierName = (value: string | undefined): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed !== "" ? trimmed : "Unnamed supplier";
};

/** Deterministic kebab-case slug: lowercase, alphanumerics + hyphens only. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Classify a supplier's criticality for NIS2 supply-chain management using
 * the documented additive scoring model, resolve the review cadence, and
 * compute the next review date from the injected clock.
 *
 * Never throws: a missing/blank supplier name becomes "Unnamed supplier";
 * invalid numbers are treated as 0; an invalid `now` falls back to the real
 * clock; an invalid `networkAccessLevel` simply earns no network points.
 */
export function classifySupplierCriticality(
  input: ClassifySupplierCriticalityInput
): SupplierCriticalityResult {
  const supplierName = toSupplierName(input?.supplierName);
  const safeNow = toValidDate(input?.now, new Date());

  const essential = input?.servicesEssentialToCriticalFunctions === true;
  const sensitiveData = input?.processesSensitiveData === true;
  const networkLevel = input?.networkAccessLevel;
  const subcontractor = input?.isSubcontractor === true;
  const spend = toNonNegative(input?.annualSpendEur);

  const rationale: string[] = [];
  let score = 0;

  if (essential) {
    score += WEIGHT_ESSENTIAL_SERVICES;
    rationale.push("Services are essential to the entity's critical functions (+45)");
  }
  if (sensitiveData) {
    score += WEIGHT_SENSITIVE_DATA;
    rationale.push("Supplier processes sensitive data (+30)");
  }
  if (networkLevel === "broad") {
    score += WEIGHT_NETWORK_BROAD;
    rationale.push("Supplier has broad network access to the entity's environment (+25)");
  } else if (networkLevel === "restricted") {
    score += WEIGHT_NETWORK_RESTRICTED;
    rationale.push("Supplier has restricted network access to the entity's environment (+15)");
  }
  if (subcontractor) {
    score += WEIGHT_SUBCONTRACTOR;
    rationale.push("Subcontractor relationship — reduced direct exposure (-10)");
  }
  if (spend >= SPEND_CRITICALITY_THRESHOLD) {
    score += WEIGHT_HIGH_SPEND;
    rationale.push("Annual spend of EUR 1,000,000 or more (+10)");
  }

  score = Math.max(0, Math.min(100, score));
  if (rationale.length === 0) {
    rationale.push("No criticality factors identified");
  }

  const criticality: SupplierCriticality =
    score >= CRITICALITY_CRITICAL
      ? "critical"
      : score >= CRITICALITY_HIGH
        ? "high"
        : score >= CRITICALITY_MEDIUM
          ? "medium"
          : "low";

  const reviewFrequency: SupplierReviewFrequency =
    criticality === "critical"
      ? "Quarterly"
      : criticality === "high"
        ? "Semi-Annual"
        : criticality === "medium"
          ? "Annual"
          : "Biennial";

  const months =
    criticality === "critical" ? 3 : criticality === "high" ? 6 : criticality === "medium" ? 12 : 24;
  const nextReviewDate = new Date(safeNow.getTime() + months * MONTH_MS).toISOString();

  return {
    supplierName,
    criticality,
    criticalityScore: score,
    rationale,
    reviewFrequency,
    nextReviewDate,
  };
}

/**
 * Score a supplier's security posture against the 8 weighted contractual
 * controls (weights sum to 100) and derive gaps plus recommended actions.
 *
 * Readiness mapping (documented): >= 85 Strong, >= 65 Developing, and At Risk
 * below 65 when data is present (the 40 boundary is kept for documentation).
 * When no answers are provided at all (empty object or every value undefined)
 * the score is 0 and readiness is "No Data".
 *
 * recommendedActions = one action per unmet control (catalog order), padded
 * with the standard fallbacks to at least 3 items and capped at 5. With every
 * control met only the two standard fallbacks are returned.
 *
 * Never throws: unknown answer keys are ignored; a missing/blank supplier
 * name becomes "Unnamed supplier"; non-boolean answer values count as unmet.
 */
export function scoreSupplierSecurityPosture(
  input: ScoreSupplierSecurityPostureInput
): SupplierPostureResult {
  const supplierName = toSupplierName(input?.supplierName);
  const answers =
    input?.answers && typeof input.answers === "object" ? input.answers : {};

  const answerEntries = Object.entries(answers);
  const hasData = answerEntries.length > 0 && answerEntries.some(([, v]) => v !== undefined);

  const areas: SupplierControlArea[] = SUPPLY_CHAIN_CONTROLS.map((control) => ({
    id: control.id,
    label: control.label,
    met: answers[control.id] === true,
    weight: control.weight,
  }));

  const score = areas.reduce((sum, area) => sum + (area.met ? area.weight : 0), 0);

  const readiness: SupplierPostureReadiness = !hasData
    ? "No Data"
    : score >= READINESS_STRONG
      ? "Strong"
      : score >= READINESS_DEVELOPING
        ? "Developing"
        : "At Risk";

  const gapAreas = areas.filter((area) => !area.met);
  const gaps = gapAreas.map((area) => area.label);

  const recommendedActions: string[] = gapAreas.map((area) => CONTROL_GAP_ACTIONS[area.id]);
  for (const fallback of STANDARD_ACTIONS) {
    if (recommendedActions.length >= 3) break;
    recommendedActions.push(fallback);
  }

  return {
    supplierName,
    score,
    readiness,
    areas,
    gaps,
    recommendedActions: recommendedActions.slice(0, 5),
  };
}

/**
 * Track a supplier incident against its NIS2 notification SLA.
 *
 * The SLA defaults to 24h for significant incidents and 72h otherwise; the
 * notification deadline is `detectedAt + SLA hours`. Status follows the
 * documented precedence (acknowledged > submitted > overdue > due > pending)
 * against the injected clock. daysRemaining is the signed whole-day distance
 * from now to the deadline (Math.round), null once submitted/acknowledged.
 *
 * incidentId is a deterministic kebab-case slug of `supplierName-incidentTitle`
 * (alphanumerics + hyphens only), falling back to "untitled-incident" when
 * the slug would be empty.
 *
 * Never throws: a missing/blank title becomes "Untitled incident"; a missing
 * or invalid `detectedAt` anchors the deadline to `now`; an invalid SLA hours
 * value falls back to the 24h/72h default.
 */
export function trackSupplierIncident(input: TrackSupplierIncidentInput): TrackSupplierIncidentResult {
  const supplierName = toSupplierName(input?.supplierName);

  const rawTitle = typeof input?.incidentTitle === "string" ? input.incidentTitle.trim() : "";
  const incidentTitle = rawTitle !== "" ? rawTitle : "Untitled incident";

  const significant = input?.significant === true;
  const safeNow = toValidDate(input?.now, new Date());
  const detectedAt = toValidDate(input?.detectedAt, safeNow);

  const slaHours =
    typeof input?.notificationSlaHours === "number" &&
    Number.isFinite(input.notificationSlaHours) &&
    input.notificationSlaHours > 0
      ? input.notificationSlaHours
      : significant
        ? SLA_HOURS_SIGNIFICANT
        : SLA_HOURS_NON_SIGNIFICANT;

  const deadlineMs = detectedAt.getTime() + slaHours * HOUR_MS;
  const acknowledgedAt = toOptionalValidDate(input?.acknowledgedAt);
  const reportedToEntityAt = toOptionalValidDate(input?.reportedToEntityAt);

  const nowMs = safeNow.getTime();

  let status: SupplierIncidentStatus;
  if (acknowledgedAt) {
    status = "acknowledged";
  } else if (reportedToEntityAt) {
    status = "submitted";
  } else if (nowMs > deadlineMs) {
    status = "overdue";
  } else if (nowMs > deadlineMs - DUE_WINDOW_HOURS * HOUR_MS) {
    status = "due";
  } else {
    status = "pending";
  }

  const daysRemaining: number | null =
    status === "submitted" || status === "acknowledged"
      ? null
      : Math.round((deadlineMs - nowMs) / DAY_MS);

  let note: string;
  if (status === "acknowledged" && acknowledgedAt) {
    note = `Acknowledged by the entity on ${acknowledgedAt.toISOString()}`;
  } else if (status === "submitted" && reportedToEntityAt) {
    note = `Reported to entity on ${reportedToEntityAt.toISOString()}`;
  } else if (status === "overdue" && daysRemaining !== null) {
    note = `Overdue by ${Math.abs(daysRemaining)} days`;
  } else if (status === "due" && daysRemaining !== null) {
    note = `Due in ${daysRemaining} days`;
  } else {
    note = `Pending — notification deadline ${new Date(deadlineMs).toISOString()}`;
  }

  const slug = slugify(`${supplierName}-${incidentTitle}`);
  const incidentId = slug.length > 0 ? slug : "untitled-incident";

  return {
    incidentId,
    supplierName,
    incidentTitle,
    significant,
    notificationDeadline: new Date(deadlineMs),
    status,
    daysRemaining,
    note,
  };
}

/**
 * Monitor the entity's security-monitoring SLA obligations for a supplier's
 * assets/processes. Status is cadence-driven (the `passed` flag is echoed for
 * transparency but does not influence the status — a failing check is still
 * handled within the cadence).
 *
 * Status per item: no verification date -> not-tested (daysUntilDue 0);
 * daysSince > 2x cadence -> breached; daysSince > cadence -> at-risk; else
 * compliant. daysUntilDue = cadence - daysSince (signed; negative = overdue;
 * rounded to whole days).
 *
 * Never throws: a missing/invalid item array yields an empty items list and a
 * zeroed summary; items with an invalid cadenceDays (not a positive finite
 * number) are filtered out; invalid verification dates count as not-tested.
 */
export function monitorSecuritySla(input: MonitorSecuritySlaInput): SecuritySlaResult {
  const supplierName = toSupplierName(input?.supplierName);
  const safeNow = toValidDate(input?.now, new Date());
  const rawItems = Array.isArray(input?.items) ? input.items : [];

  const items: SecuritySlaItem[] = rawItems
    .filter(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.cadenceDays === "number" &&
        Number.isFinite(item.cadenceDays) &&
        item.cadenceDays > 0
    )
    .map((item) => {
      const cadenceDays = item.cadenceDays;
      const lastVerifiedAt = toOptionalValidDate(item.lastVerifiedAt);
      const passed = item.passed === true;

      let status: SlaStatus;
      let daysUntilDue: number;

      if (!lastVerifiedAt) {
        status = "not-tested";
        daysUntilDue = 0;
      } else {
        const daysSince = (safeNow.getTime() - lastVerifiedAt.getTime()) / DAY_MS;
        if (daysSince > cadenceDays * 2) {
          status = "breached";
        } else if (daysSince > cadenceDays) {
          status = "at-risk";
        } else {
          status = "compliant";
        }
        daysUntilDue = Math.round(cadenceDays - daysSince);
      }

      return {
        id: typeof item.id === "string" ? item.id : "",
        title: typeof item.title === "string" ? item.title : "",
        cadenceDays,
        lastVerifiedAt,
        passed,
        status,
        daysUntilDue,
      };
    });

  const summary: SecuritySlaSummary = {
    compliant: items.filter((i) => i.status === "compliant").length,
    atRisk: items.filter((i) => i.status === "at-risk").length,
    breached: items.filter((i) => i.status === "breached").length,
    notTested: items.filter((i) => i.status === "not-tested").length,
    total: items.length,
  };

  return { supplierName, items, summary };
}
