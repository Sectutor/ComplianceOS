/**
 * NIS2 third-party risk scoring engine.
 *
 * Cycle 18 (NIS2 Implementation Plan Phase 3 Task 3.2 — ENISA Measure 5.1
 * "Supply Chain Security", NIS2 Article 21(2)(d)): composites the NIS2
 * supplier signals from lib/nis2/supplyChain.ts (criticality band + security
 * posture) with the per-vendor TPRM residual signal from
 * lib/vendor/vendorRisk.ts into a single 0-100 third-party risk score per
 * supplier, plus certificate-expiry tracking and a supply-chain dependency
 * map. Pure view-model logic — no DB, no network, no side effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/supplyChain.ts and
 * lib/cyber/incidentClassifier.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no iteration-order
 *   dependent logic. Same input always yields the same output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   dates, NaN numbers, non-array collections) is coerced to safe neutral
 *   values and yields the documented safe shape.
 * - Injectable clock: `now` parameters default to `new Date()` but can be
 *   pinned in tests. The injected clock is forwarded to the reused engines so
 *   review dates and expiry windows are fully reproducible.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h).
 *
 * Composite model (per supplier, rounded to an integer 0-100):
 *   criticalityNumeric  = map(classifySupplierCriticality band):
 *                         critical=90 | high=70 | medium=50 | low=30 | unknown=0
 *   postureScore        = scoreSupplierSecurityPosture().score (0-100;
 *                         "No Data" yields 0)
 *   residualScore       = optional vendorResidualScore (0-100) when provided,
 *                         else computeVendorRiskTier().residualScore when any
 *                         vendor-risk signal is present, else absent.
 *   composite           = round(0.4*criticality + 0.4*posture + 0.2*residual)
 *                         when residual is present, otherwise the residual
 *                         weight is redistributed: round(0.5*criticality +
 *                         0.5*posture).
 *   riskTier            = critical >= 75 | high >= 55 | medium >= 30 | low < 30
 *
 * Malformed top-level input (non-object, non-array suppliers) yields zeroed
 * totals and empty/safe collections — never a throw.
 */

import {
  classifySupplierCriticality,
  scoreSupplierSecurityPosture,
} from "./supplyChain";
import type {
  ClassifySupplierCriticalityInput,
  ScoreSupplierSecurityPostureInput,
  SupplierCriticality,
  SupplierPostureReadiness,
  SupplyChainControlId,
} from "./supplyChain";
import { computeVendorRiskTier } from "../vendor/vendorRisk";
import type { RiskTier } from "../vendor/vendorRisk";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Composite risk tier for one supplier (same labels as criticality band). */
export type ThirdPartyRiskTier = SupplierCriticality;

/**
 * Everything the composite engine evaluates for one supplier. Mirrors the
 * inputs of classifySupplierCriticality + scoreSupplierSecurityPosture +
 * computeVendorRiskTier, plus an optional precomputed residual score.
 */
export interface ThirdPartySupplierInput {
  supplierId: string | number;
  supplierName?: string;
  // NIS2 criticality factors (classifySupplierCriticality).
  servicesEssentialToCriticalFunctions?: boolean;
  processesSensitiveData?: boolean;
  networkAccessLevel?: "none" | "restricted" | "broad";
  isSubcontractor?: boolean;
  annualSpendEur?: number;
  // Security posture answers (scoreSupplierSecurityPosture).
  answers?: Partial<Record<SupplyChainControlId, boolean>>;
  // Per-vendor TPRM signals (computeVendorRiskTier).
  dataAccessType?: "PII" | "ePHI" | "Infrastructure" | "None";
  hasCleanSoc2?: boolean;
  latestScanRiskScore?: number;
  openHighCriticalAssessments?: number;
  hasContract?: boolean;
  hasDpa?: boolean;
  subprocessorCount?: number;
  /**
   * Optional precomputed residual score (0-100, higher = safer). When present
   * it is used directly and the vendor tier is derived from it with the same
   * banding as computeVendorRiskTier (<50 Tier 1 | <75 Tier 2 | else Tier 3).
   */
  vendorResidualScore?: number;
}

/** Input for `aggregateSupplierRisk`. */
export interface AggregateSupplierRiskInput {
  suppliers?: ThirdPartySupplierInput[];
  now?: Date;
}

/** One scored supplier inside `aggregateSupplierRisk` output. */
export interface ThirdPartyRiskItem {
  supplierId: string | number;
  supplierName: string;
  criticality: SupplierCriticality;
  postureReadiness: SupplierPostureReadiness;
  /** Present only when a residual signal (explicit score or vendor inputs) exists. */
  vendorTier?: RiskTier;
  /** 0-100 composite score (rounded to an integer). */
  compositeScore: number;
  riskTier: ThirdPartyRiskTier;
  /** Short deterministic explanation of the tier. */
  verdict: string;
  /** Criticality + residual + posture-gap derived actions, deduped, max 5. */
  recommendedActions: string[];
}

/** Portfolio totals over the evaluated suppliers. */
export interface ThirdPartyRiskTotals {
  count: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** Mean composite score, rounded to 1 decimal (0 when no suppliers). */
  avgCompositeScore: number;
}

/** Output of `aggregateSupplierRisk`. */
export interface AggregateSupplierRiskResult {
  /** Sorted by compositeScore desc, then supplierName asc. */
  items: ThirdPartyRiskItem[];
  totals: ThirdPartyRiskTotals;
}

/** One certificate attached to a supplier. */
export interface ThirdPartyCertificateInput {
  name: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
}

/** A supplier entry for `trackSupplierCertificate`. */
export interface ThirdPartyCertificateSupplierInput {
  supplierId: string | number;
  supplierName?: string;
  certificates?: ThirdPartyCertificateInput[];
}

/** Input for `trackSupplierCertificate`. */
export interface TrackSupplierCertificateInput {
  suppliers?: ThirdPartyCertificateSupplierInput[];
  now?: Date;
}

/** Certificate lifecycle status (missing = supplier has no certificates). */
export type CertificateStatus = "valid" | "expiring" | "expired" | "missing";

/** One certificate row (or one missing row per certificate-less supplier). */
export interface ThirdPartyCertificateItem {
  supplierId: string | number;
  supplierName: string;
  /** Certificate name; null for missing rows. */
  name: string | null;
  issuer: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  status: CertificateStatus;
  /** Signed whole days now -> validTo; null for missing rows or unknown dates. */
  daysUntilExpiry: number | null;
}

/** Certificate portfolio summary. */
export interface CertificateSummary {
  /** Total rows (certificates + missing supplier rows). */
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  /** 0-1: suppliers with >=1 valid-or-expiring cert / total suppliers (0 when none). */
  coverageRate: number;
}

/** Output of `trackSupplierCertificate`. */
export interface TrackSupplierCertificateResult {
  items: ThirdPartyCertificateItem[];
  summary: CertificateSummary;
}

/** One dependency edge between two supplier nodes. */
export interface SupplyChainDependencyInput {
  from: string | number;
  to: string | number;
  /** Optional explicit edge weight; defaults by source risk tier. */
  weight?: number;
}

/** Input for `buildSupplyChainMap`. */
export interface BuildSupplyChainMapInput {
  suppliers?: ThirdPartySupplierInput[];
  dependencies?: SupplyChainDependencyInput[];
  now?: Date;
}

/** One node in the supply-chain map. */
export interface SupplyChainMapNode {
  id: string | number;
  name: string;
  riskTier: ThirdPartyRiskTier;
  compositeScore: number;
  criticality: SupplierCriticality;
  postureReadiness: SupplierPostureReadiness;
}

/** One edge in the supply-chain map (weight 0-1). */
export interface SupplyChainMapEdge {
  from: string | number;
  to: string | number;
  weight: number;
}

/** Map summary counts. */
export interface SupplyChainMapSummary {
  tierCounts: { critical: number; high: number; medium: number; low: number };
  /** Mean composite score, rounded to 1 decimal (0 when no nodes). */
  avgCompositeScore: number;
  edgeCount: number;
}

/** Output of `buildSupplyChainMap`. */
export interface SupplyChainMapResult {
  /** Sorted by compositeScore desc, then name asc. */
  nodes: SupplyChainMapNode[];
  /** Sorted by from asc, then to asc (String order). */
  edges: SupplyChainMapEdge[];
  summary: SupplyChainMapSummary;
}

/* ------------------------------------------------------------------ */
/* Certificate type catalog                                            */
/* ------------------------------------------------------------------ */

/**
 * Recognised certificate types (catalog constant, stable order). Callers may
 * reference any of these ids when attaching certificates to suppliers.
 */
export const CERTIFICATE_TYPES = [
  { id: "iso27001", label: "ISO 27001" },
  { id: "soc2-type-i", label: "SOC 2 Type I" },
  { id: "soc2-type-ii", label: "SOC 2 Type II" },
  { id: "pci-dss-v4", label: "PCI DSS v4" },
  { id: "hipaa", label: "HIPAA" },
  { id: "gdpr", label: "GDPR" },
  { id: "cyber-essentials", label: "Cyber Essentials" },
  { id: "nist-csf", label: "NIST CSF" },
] as const;

/** Union of recognised certificate type ids. */
export type CertificateTypeId = (typeof CERTIFICATE_TYPES)[number]["id"];

/** One entry of the certificate type catalog. */
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Expiry warning window: validTo - now <= 90 days => "expiring". */
const EXPIRY_WINDOW_DAYS = 90;

/** Composite weights (residual redistributed 50/50 when absent). */
const WEIGHT_CRITICALITY = 0.4;
const WEIGHT_POSTURE = 0.4;
const WEIGHT_RESIDUAL = 0.2;
const WEIGHT_CRITICALITY_NO_RESIDUAL = 0.5;
const WEIGHT_POSTURE_NO_RESIDUAL = 0.5;

/** Numeric map from the criticality band to a 0-100 score (unknown -> 0). */
const CRITICALITY_NUMERIC: Record<SupplierCriticality, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 30,
};

/** Composite risk tier thresholds. */
const TIER_CRITICAL = 75;
const TIER_HIGH = 55;
const TIER_MEDIUM = 30;

/** Default edge weight by the SOURCE node's risk tier. */
const DEFAULT_EDGE_WEIGHT_BY_TIER: Record<ThirdPartyRiskTier, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

/** Verdict text per composite risk tier. */
const VERDICT_BY_TIER: Record<ThirdPartyRiskTier, string> = {
  critical: "Critical third-party risk — immediate remediation required",
  high: "High third-party risk — prioritise remediation and monitoring",
  medium: "Medium third-party risk — monitor and address posture gaps",
  low: "Low third-party risk — maintain routine oversight",
};

/** Criticality-driven recommended actions (one per band). */
const ACTION_BY_CRITICALITY: Record<SupplierCriticality, string> = {
  critical: "Escalate supplier for immediate executive review",
  high: "Prioritise supplier remediation in the next review cycle",
  medium: "Schedule supplier criticality reassessment",
  low: "Maintain routine supplier monitoring cadence",
};

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** True for plain non-null, non-array objects. */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Coerce a number to a non-negative finite value; anything else -> 0. */
const toNonNegative = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

/** Coerce a value to a valid Date; invalid input -> `fallback`. */
const toValidDate = (value: unknown, fallback: Date): Date =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : fallback;

/** Coerce a value to a valid Date or null when missing/invalid. */
const toOptionalValidDate = (value: unknown): Date | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;

/** Coerce a supplier name; missing/blank -> "Unnamed supplier". */
const toSupplierName = (value: unknown): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed !== "" ? trimmed : "Unnamed supplier";
};

/** Coerce a supplier id; NaN/missing -> "" (deterministic safe id). */
const toSupplierId = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

/** One of the three network access levels, else undefined. */
const toNetworkAccessLevel = (
  value: unknown
): ClassifySupplierCriticalityInput["networkAccessLevel"] =>
  value === "none" || value === "restricted" || value === "broad" ? value : undefined;

/** One of the four vendor data access types, else undefined. */
const toDataAccessType = (value: unknown): "PII" | "ePHI" | "Infrastructure" | "None" | undefined =>
  value === "PII" || value === "ePHI" || value === "Infrastructure" || value === "None"
    ? value
    : undefined;

/** Composite risk tier from a 0-100 score. */
const toRiskTier = (score: number): ThirdPartyRiskTier =>
  score >= TIER_CRITICAL ? "critical" : score >= TIER_HIGH ? "high" : score >= TIER_MEDIUM ? "medium" : "low";

/** Vendor tier banding — identical thresholds to computeVendorRiskTier. */
const toVendorTier = (residualScore: number): RiskTier =>
  residualScore < 50 ? "Tier 1 (Critical)" : residualScore < 75 ? "Tier 2 (High)" : "Tier 3 (Medium)";

/** Deterministic sort: compositeScore desc, then supplierName asc. */
const byCompositeDescNameAsc = (
  a: { compositeScore: number; supplierName: string },
  b: { compositeScore: number; supplierName: string }
): number => b.compositeScore - a.compositeScore || a.supplierName.localeCompare(b.supplierName);

/* ------------------------------------------------------------------ */
/* Internal per-supplier evaluation                                    */
/* ------------------------------------------------------------------ */

/** Fully evaluated supplier row (shared by aggregate + map builders). */
interface EvaluatedSupplier {
  supplierId: string | number;
  supplierName: string;
  criticality: SupplierCriticality;
  criticalityNumeric: number;
  postureReadiness: SupplierPostureReadiness;
  postureScore: number;
  vendorTier?: RiskTier;
  residualScore: number | null;
  compositeScore: number;
  riskTier: ThirdPartyRiskTier;
  verdict: string;
  recommendedActions: string[];
}

/**
 * Evaluate one supplier row. Never throws: non-object rows yield a neutral
 * zeroed evaluation (criticalityNumeric 0 per the unknown band, composite 0).
 */
const evaluateSupplier = (raw: unknown, safeNow: Date): EvaluatedSupplier => {
  const supplier = isObject(raw) ? raw : {};
  const supplierId = toSupplierId(supplier.supplierId);
  const supplierName = toSupplierName(supplier.supplierName);

  // 1) NIS2 criticality band (numeric map; unknown/unsafe -> 0).
  const classification = classifySupplierCriticality({
    supplierName,
    servicesEssentialToCriticalFunctions: supplier.servicesEssentialToCriticalFunctions === true,
    processesSensitiveData: supplier.processesSensitiveData === true,
    networkAccessLevel: toNetworkAccessLevel(supplier.networkAccessLevel),
    isSubcontractor: supplier.isSubcontractor === true,
    annualSpendEur: toNonNegative(supplier.annualSpendEur),
    now: safeNow,
  });
  const criticality = classification.criticality;
  const criticalityNumeric = CRITICALITY_NUMERIC[criticality] ?? 0;

  // 2) Security posture (score 0-100; "No Data" yields 0).
  const rawAnswers = isObject(supplier.answers) ? supplier.answers : {};
  const postureResult = scoreSupplierSecurityPosture({
    supplierName,
    answers: rawAnswers as ScoreSupplierSecurityPostureInput["answers"],
  });
  const postureScore = postureResult.score;
  const postureReadiness = postureResult.readiness;

  // 3) Residual signal: explicit vendorResidualScore wins; otherwise reuse
  //    computeVendorRiskTier when any vendor-risk signal is present.
  let residualScore: number | null = null;
  let vendorTier: RiskTier | undefined;

  const explicitResidual = supplier.vendorResidualScore;
  const hasExplicitResidual =
    typeof explicitResidual === "number" && Number.isFinite(explicitResidual);

  const hasVendorSignals =
    supplier.dataAccessType !== undefined ||
    supplier.hasCleanSoc2 !== undefined ||
    supplier.latestScanRiskScore !== undefined ||
    supplier.openHighCriticalAssessments !== undefined ||
    supplier.hasContract !== undefined ||
    supplier.hasDpa !== undefined ||
    supplier.subprocessorCount !== undefined;

  if (hasExplicitResidual) {
    residualScore = Math.max(0, Math.min(100, explicitResidual as number));
    vendorTier = toVendorTier(residualScore);
  } else if (hasVendorSignals) {
    const vendorResult = computeVendorRiskTier({
      vendor: {
        id: typeof supplierId === "number" ? supplierId : 0,
        name: supplierName,
        dataAccessType: toDataAccessType(supplier.dataAccessType),
        hasCleanSoc2: supplier.hasCleanSoc2 === true,
      },
      latestScanRiskScore:
        typeof supplier.latestScanRiskScore === "number" &&
        Number.isFinite(supplier.latestScanRiskScore)
          ? supplier.latestScanRiskScore
          : undefined,
      openHighCriticalAssessments:
        typeof supplier.openHighCriticalAssessments === "number" &&
        Number.isFinite(supplier.openHighCriticalAssessments)
          ? supplier.openHighCriticalAssessments
          : undefined,
      hasContract: supplier.hasContract === true,
      hasDpa: supplier.hasDpa === true,
      subprocessorCount:
        typeof supplier.subprocessorCount === "number" && Number.isFinite(supplier.subprocessorCount)
          ? supplier.subprocessorCount
          : undefined,
      now: safeNow,
    });
    residualScore = vendorResult.residualScore;
    vendorTier = vendorResult.tier;
  }

  // 4) Composite 0-100 (residual absent => weights redistributed 50/50).
  // Tier is derived from the UNROUNDED weighted sum so band boundaries are
  // exact (74.99 stays "medium"; only >=75 is "critical"). The exposed
  // compositeScore is rounded to an integer for display.
  const rawComposite =
    residualScore !== null
      ? WEIGHT_CRITICALITY * criticalityNumeric +
        WEIGHT_POSTURE * postureScore +
        WEIGHT_RESIDUAL * residualScore
      : WEIGHT_CRITICALITY_NO_RESIDUAL * criticalityNumeric +
        WEIGHT_POSTURE_NO_RESIDUAL * postureScore;

  const riskTier = toRiskTier(rawComposite);

  const compositeScore = Math.max(0, Math.min(100, Math.round(rawComposite)));

  // 5) Verdict + recommended actions (criticality + residual + posture gaps).
  const isWellFormed = isObject(raw);
  const verdict = isWellFormed ? VERDICT_BY_TIER[riskTier] : "Insufficient data for composite scoring";

  const actions: string[] = [];
  if (isWellFormed) {
    actions.push(ACTION_BY_CRITICALITY[criticality]);
    if (vendorTier === "Tier 1 (Critical)") {
      actions.push("Intensify residual-risk monitoring for this supplier");
    }
    for (const action of postureResult.recommendedActions) {
      if (!actions.includes(action)) {
        actions.push(action);
      }
    }
  }

  return {
    supplierId,
    supplierName,
    criticality,
    criticalityNumeric,
    postureReadiness,
    postureScore,
    vendorTier,
    residualScore,
    compositeScore,
    riskTier,
    verdict,
    recommendedActions: actions.slice(0, 5),
  };
};

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Aggregate NIS2 third-party risk across a supplier portfolio.
 *
 * Each supplier is scored with the documented composite model
 * (criticality 40% / posture 40% / residual 20%, redistributed 50/50 when no
 * residual signal exists) and assigned a composite risk tier. Items are
 * sorted by compositeScore desc, then supplierName asc. Malformed/non-array
 * input yields zeroed totals and an empty items list — never a throw.
 */
export function aggregateSupplierRisk(
  input: AggregateSupplierRiskInput
): AggregateSupplierRiskResult {
  const raw = isObject(input) ? input : {};
  const safeNow = toValidDate(raw.now, new Date());
  const suppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];

  const items: ThirdPartyRiskItem[] = suppliers
    .map((supplier) => evaluateSupplier(supplier, safeNow))
    .sort(byCompositeDescNameAsc)
    .map((evaluated) => ({
      supplierId: evaluated.supplierId,
      supplierName: evaluated.supplierName,
      criticality: evaluated.criticality,
      postureReadiness: evaluated.postureReadiness,
      ...(evaluated.vendorTier !== undefined ? { vendorTier: evaluated.vendorTier } : {}),
      compositeScore: evaluated.compositeScore,
      riskTier: evaluated.riskTier,
      verdict: evaluated.verdict,
      recommendedActions: evaluated.recommendedActions,
    }));

  const count = items.length;
  const totals: ThirdPartyRiskTotals = {
    count,
    criticalCount: items.filter((i) => i.riskTier === "critical").length,
    highCount: items.filter((i) => i.riskTier === "high").length,
    mediumCount: items.filter((i) => i.riskTier === "medium").length,
    lowCount: items.filter((i) => i.riskTier === "low").length,
    avgCompositeScore:
      count === 0
        ? 0
        : Math.round((items.reduce((sum, i) => sum + i.compositeScore, 0) / count) * 10) / 10,
  };

  return { items, totals };
}

/**
 * Track certificate validity across suppliers against the injected clock.
 *
 * Status per certificate: valid (validTo - now > 90 days), expiring
 * (validTo - now <= 90 days and not expired), expired (now > validTo).
 * Suppliers listed without certificates produce one "missing" row each.
 * A certificate with a missing/invalid validTo is treated as neutral-safe
 * "valid" with daysUntilExpiry null (documented — unknown expiry does not
 * alarm, and does count towards coverage). Items keep input order.
 *
 * coverageRate = suppliers with >= 1 valid-or-expiring cert / total suppliers
 * (0 when there are no suppliers), rounded to 3 decimals.
 */
export function trackSupplierCertificate(
  input: TrackSupplierCertificateInput
): TrackSupplierCertificateResult {
  const raw = isObject(input) ? input : {};
  const safeNow = toValidDate(raw.now, new Date());
  const suppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];

  const items: ThirdPartyCertificateItem[] = [];
  let coveredSuppliers = 0;

  for (const rawSupplier of suppliers) {
    const supplier = isObject(rawSupplier) ? rawSupplier : {};
    const supplierId = toSupplierId(supplier.supplierId);
    const supplierName = toSupplierName(supplier.supplierName);
    const certificates = Array.isArray(supplier.certificates)
      ? supplier.certificates.filter(isObject)
      : [];

    if (certificates.length === 0) {
      items.push({
        supplierId,
        supplierName,
        name: null,
        issuer: null,
        validFrom: null,
        validTo: null,
        status: "missing",
        daysUntilExpiry: null,
      });
      continue;
    }

    let hasValidOrExpiring = false;

    for (const certificate of certificates) {
      const validTo = toOptionalValidDate(certificate.validTo);
      const validFrom = toOptionalValidDate(certificate.validFrom);
      const name = typeof certificate.name === "string" ? certificate.name : "";
      const issuer = typeof certificate.issuer === "string" ? certificate.issuer : null;

      if (!validTo) {
        items.push({
          supplierId,
          supplierName,
          name,
          issuer,
          validFrom,
          validTo: null,
          status: "valid",
          daysUntilExpiry: null,
        });
        hasValidOrExpiring = true;
        continue;
      }

      const daysUntilExpiry = Math.round((validTo.getTime() - safeNow.getTime()) / DAY_MS);
      const status: CertificateStatus =
        validTo.getTime() < safeNow.getTime()
          ? "expired"
          : daysUntilExpiry <= EXPIRY_WINDOW_DAYS
            ? "expiring"
            : "valid";

      if (status === "valid" || status === "expiring") {
        hasValidOrExpiring = true;
      }

      items.push({
        supplierId,
        supplierName,
        name,
        issuer,
        validFrom,
        validTo,
        status,
        daysUntilExpiry,
      });
    }

    if (hasValidOrExpiring) {
      coveredSuppliers += 1;
    }
  }

  const total = items.length;
  const valid = items.filter((i) => i.status === "valid").length;
  const expiring = items.filter((i) => i.status === "expiring").length;
  const expired = items.filter((i) => i.status === "expired").length;

  const coverageRate =
    suppliers.length === 0
      ? 0
      : Math.round((coveredSuppliers / suppliers.length) * 1000) / 1000;

  return {
    items,
    summary: { total, valid, expiring, expired, coverageRate },
  };
}

/**
 * Build a supply-chain dependency map: one node per supplier (risk tier +
 * composite score + criticality + posture readiness) and one edge per
 * dependency with the weight defaulted from the SOURCE node's risk tier
 * (critical 1.0, high 0.8, medium 0.5, low 0.3) unless an explicit weight is
 * given. Unknown source ids and malformed entries fall back to the low-tier
 * default weight (0.3). Nodes are sorted by compositeScore desc then name
 * asc; edges by `from` then `to` (String order).
 */
export function buildSupplyChainMap(input: BuildSupplyChainMapInput): SupplyChainMapResult {
  const raw = isObject(input) ? input : {};
  const safeNow = toValidDate(raw.now, new Date());
  const suppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];
  const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies : [];

  const nodes: SupplyChainMapNode[] = suppliers
    .map((supplier) => evaluateSupplier(supplier, safeNow))
    .sort(byCompositeDescNameAsc)
    .map((evaluated) => ({
      id: evaluated.supplierId,
      name: evaluated.supplierName,
      riskTier: evaluated.riskTier,
      compositeScore: evaluated.compositeScore,
      criticality: evaluated.criticality,
      postureReadiness: evaluated.postureReadiness,
    }));

  const nodeByKey = new Map<string, SupplyChainMapNode>();
  for (const node of nodes) {
    nodeByKey.set(String(node.id), node);
  }

  const edges: SupplyChainMapEdge[] = dependencies
    .filter(isObject)
    .map((dependency) => {
      const fromKey = String(dependency.from);
      const source = nodeByKey.get(fromKey);
      const tier = source?.riskTier ?? "low";
      const explicitWeight = dependency.weight;
      const weight =
        typeof explicitWeight === "number" && Number.isFinite(explicitWeight) && explicitWeight >= 0
          ? explicitWeight
          : DEFAULT_EDGE_WEIGHT_BY_TIER[tier];
      return {
        from: toSupplierId(dependency.from),
        to: toSupplierId(dependency.to),
        weight,
      };
    })
    .sort(
      (a, b) =>
        String(a.from).localeCompare(String(b.from)) || String(a.to).localeCompare(String(b.to))
    );

  const summary: SupplyChainMapSummary = {
    tierCounts: {
      critical: nodes.filter((n) => n.riskTier === "critical").length,
      high: nodes.filter((n) => n.riskTier === "high").length,
      medium: nodes.filter((n) => n.riskTier === "medium").length,
      low: nodes.filter((n) => n.riskTier === "low").length,
    },
    avgCompositeScore:
      nodes.length === 0
        ? 0
        : Math.round((nodes.reduce((sum, n) => sum + n.compositeScore, 0) / nodes.length) * 10) / 10,
    edgeCount: edges.length,
  };

  return { nodes, edges, summary };
}
