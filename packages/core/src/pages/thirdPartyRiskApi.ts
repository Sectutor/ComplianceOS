/**
 * Third-Party Risk Scoring - data contract + hooks
 * =================================================
 * UI-side typed view of the `thirdPartyRisk.*` tRPC procedures the backend
 * agent is building (registered as `thirdPartyRisk:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 3 Task 3.2 - NIS2 Art. 21(2)(d)
 * (supply-chain security measures), ENISA Measure 5.1. Complements the
 * `supplyChain.*` lifecycle procedures from cycle 17 (see
 * `packages/core/src/pages/supplyChainApi.ts`) with portfolio-level scoring:
 * aggregate risk, certificate coverage and the supply chain dependency map.
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s and the query surfaces an error; every
 * consumer in the UI degrades to a graceful EmptyState
 * ("Connect the thirdPartyRisk.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) thirdPartyRisk.aggregateRisk
 *    input:  { suppliers: [{ id, name, criticalityInput, postureInput,
 *                           vendorResidualScore? }] }
 *    output: { items: [{ supplierId, supplierName, criticality,
 *                       postureReadiness, vendorTier?, compositeScore,
 *                       riskTier, verdict, recommendedActions[] }],
 *              totals: { count, criticalCount, highCount, mediumCount,
 *                        lowCount, avgCompositeScore } }
 *
 * 2) thirdPartyRisk.certificates
 *    input:  { suppliers: [{ supplierId, supplierName,
 *                           certificates: [{ name, issuer?, validFrom,
 *                                            validTo }] }], now? }
 *    output: { items: [{ supplierId, supplierName, name, issuer?, validFrom,
 *                       validTo, status, daysUntilExpiry }],
 *              summary: { total, valid, expiring, expired, coverageRate } }
 *            status: 'valid' | 'expiring' | 'expired' | 'missing'
 *
 * 3) thirdPartyRisk.supplyChainMap
 *    input:  { suppliers: [...], dependencies?: [{ from, to, weight? }] }
 *    output: { nodes: [{ id, name, riskTier, compositeScore, criticality,
 *                       postureReadiness }],
 *              edges: [{ from, to, weight }],
 *              summary: { tierCounts, avgCompositeScore, edgeCount } }
 *
 * riskTier: 'critical' | 'high' | 'medium' | 'low'
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";
import type {
  PostureReadiness,
  SupplierCriticality,
  SupplyBadgeVariant,
  SupplyBarClass,
} from "@/pages/supplyChainApi";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Portfolio risk tier returned by the scoring engine (0-100 composite). */
export type ThirdPartyRiskTier = "critical" | "high" | "medium" | "low";

/** Certificate validity status computed against `now`. */
export type CertificateStatus = "valid" | "expiring" | "expired" | "missing";

/**
 * One supplier profile fed into the pure scoring engine. Shared by all three
 * procedures - fields are optional so degraded/partial inputs stay valid.
 */
export interface ThirdPartySupplierInput {
  id: string | number;
  name: string;
  /** Art. 21(2)(d) criticality classification (supplyChain.classifySupplier). */
  criticalityInput?: SupplierCriticality;
  /** ENISA Measure 5.1 posture readiness (supplyChain.scorePosture). */
  postureInput?: PostureReadiness;
  /** Vendor residual score (0-100, HIGHER = safer) when available. */
  vendorResidualScore?: number;
}

/** Input of thirdPartyRisk.aggregateRisk. */
export interface AggregateRiskInput {
  suppliers: ThirdPartySupplierInput[];
}

/** One scored supplier row returned by thirdPartyRisk.aggregateRisk. */
export interface AggregateRiskItem {
  supplierId: string | number;
  supplierName: string;
  criticality: SupplierCriticality;
  postureReadiness: PostureReadiness;
  vendorTier?: string | number;
  /** 0-100 composite score (higher = worse residual exposure). */
  compositeScore: number;
  riskTier: ThirdPartyRiskTier;
  verdict: string;
  recommendedActions: string[];
}

/** Portfolio totals returned by thirdPartyRisk.aggregateRisk. */
export interface AggregateRiskTotals {
  count: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgCompositeScore: number;
}

/** Output of thirdPartyRisk.aggregateRisk. */
export interface AggregateRiskResponse {
  items: AggregateRiskItem[];
  totals: AggregateRiskTotals;
}

/** One certificate on file for a supplier (input of thirdPartyRisk.certificates). */
export interface CertificateInput {
  name: string;
  issuer?: string;
  /** ISO date string of the validity start. */
  validFrom: string;
  /** ISO date string of the validity end. */
  validTo: string;
}

/** One supplier's certificate set (input of thirdPartyRisk.certificates). */
export interface SupplierCertificatesInput {
  supplierId: string | number;
  supplierName: string;
  certificates: CertificateInput[];
}

/** Input of thirdPartyRisk.certificates. */
export interface CertificatesInput {
  suppliers: SupplierCertificatesInput[];
  now?: Date;
}

/** One evaluated certificate returned by thirdPartyRisk.certificates. */
export interface CertificateItem {
  supplierId: string | number;
  supplierName: string;
  name: string;
  issuer?: string;
  validFrom: string;
  validTo: string;
  status: CertificateStatus;
  /** Whole days until validTo; null when the row is a coverage gap ("missing"). */
  daysUntilExpiry: number | null;
}

/** Coverage totals returned by thirdPartyRisk.certificates. */
export interface CertificatesSummary {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  /** Percentage of suppliers that hold at least one certificate. */
  coverageRate: number;
}

/** Output of thirdPartyRisk.certificates. */
export interface CertificatesResponse {
  items: CertificateItem[];
  summary: CertificatesSummary;
}

/** One directed dependency between two suppliers (input of thirdPartyRisk.supplyChainMap). */
export interface DependencyEdgeInput {
  from: string | number;
  to: string | number;
  /** Dependency strength 0-100 (defaults to 50). */
  weight?: number;
}

/** Input of thirdPartyRisk.supplyChainMap. */
export interface SupplyChainMapInput {
  suppliers: ThirdPartySupplierInput[];
  dependencies?: DependencyEdgeInput[];
}

/** One map node returned by thirdPartyRisk.supplyChainMap. */
export interface SupplyChainMapNode {
  id: string | number;
  name: string;
  riskTier: ThirdPartyRiskTier;
  compositeScore: number;
  criticality: SupplierCriticality;
  postureReadiness: PostureReadiness;
}

/** One map edge returned by thirdPartyRisk.supplyChainMap. */
export interface SupplyChainMapEdge {
  from: string | number;
  to: string | number;
  weight: number;
}

/** Summary returned by thirdPartyRisk.supplyChainMap. */
export interface SupplyChainMapSummary {
  tierCounts: Record<ThirdPartyRiskTier, number>;
  avgCompositeScore: number;
  edgeCount: number;
}

/** Output of thirdPartyRisk.supplyChainMap. */
export interface SupplyChainMapResponse {
  nodes: SupplyChainMapNode[];
  edges: SupplyChainMapEdge[];
  summary: SupplyChainMapSummary;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_AGGREGATE_RISK: AggregateRiskResponse = {
  items: [],
  totals: {
    count: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    avgCompositeScore: 0,
  },
};

export const EMPTY_CERTIFICATES: CertificatesResponse = {
  items: [],
  summary: { total: 0, valid: 0, expiring: 0, expired: 0, coverageRate: 0 },
};

export const EMPTY_SUPPLY_CHAIN_MAP: SupplyChainMapResponse = {
  nodes: [],
  edges: [],
  summary: {
    tierCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    avgCompositeScore: 0,
    edgeCount: 0,
  },
};

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query result shapes (runtime is a superset)          */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface QueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
}

interface ThirdPartyRiskTrpc {
  thirdPartyRisk: {
    aggregateRisk: {
      useQuery: (input: AggregateRiskInput, opts?: QueryOptions) => QueryLike<AggregateRiskResponse>;
    };
    certificates: {
      useQuery: (input: CertificatesInput, opts?: QueryOptions) => QueryLike<CertificatesResponse>;
    };
    supplyChainMap: {
      useQuery: (input: SupplyChainMapInput, opts?: QueryOptions) => QueryLike<SupplyChainMapResponse>;
    };
  };
}

const thirdPartyRiskApi = trpc as unknown as ThirdPartyRiskTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_AGGREGATE_INPUT: AggregateRiskInput = { suppliers: [] };
const HIDDEN_CERTIFICATES_INPUT: CertificatesInput = { suppliers: [] };
const HIDDEN_SUPPLY_CHAIN_MAP_INPUT: SupplyChainMapInput = { suppliers: [] };

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Portfolio aggregate risk scorecard (per-supplier composite score, risk
 * tier, verdict + recommended actions, portfolio totals). Pass null for
 * `input` to keep the query disabled.
 */
export function useAggregateRiskQuery(
  clientId: number,
  input: AggregateRiskInput | null,
  enabled = true
): QueryLike<AggregateRiskResponse> {
  return thirdPartyRiskApi.thirdPartyRisk.aggregateRisk.useQuery(input ?? HIDDEN_AGGREGATE_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Supplier security certificate tracker (validity status per certificate +
 * coverage summary). Pass null for `input` to keep the query disabled.
 */
export function useCertificatesQuery(
  clientId: number,
  input: CertificatesInput | null,
  enabled = true
): QueryLike<CertificatesResponse> {
  return thirdPartyRiskApi.thirdPartyRisk.certificates.useQuery(input ?? HIDDEN_CERTIFICATES_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Supply chain map summary (node risk tiers, dependency edges, tier
 * distribution). Pass null for `input` to keep the query disabled.
 */
export function useSupplyChainMapQuery(
  clientId: number,
  input: SupplyChainMapInput | null,
  enabled = true
): QueryLike<SupplyChainMapResponse> {
  return thirdPartyRiskApi.thirdPartyRisk.supplyChainMap.useQuery(
    input ?? HIDDEN_SUPPLY_CHAIN_MAP_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/** Inputs for all three scoring queries (kept in one object by consumers). */
export interface ThirdPartyRiskQueryInputs {
  aggregateRisk: AggregateRiskInput | null;
  certificates: CertificatesInput | null;
  supplyChainMap: SupplyChainMapInput | null;
}

/** Combined result bundle for the three scoring queries. */
export interface ThirdPartyRiskQueryBundle {
  aggregateRisk: QueryLike<AggregateRiskResponse>;
  certificates: QueryLike<CertificatesResponse>;
  supplyChainMap: QueryLike<SupplyChainMapResponse>;
}

/** Convenience bundle - fires all three thirdPartyRisk queries at once. */
export function useThirdPartyRiskQueries(
  clientId: number,
  inputs: ThirdPartyRiskQueryInputs,
  enabled = true
): ThirdPartyRiskQueryBundle {
  return {
    aggregateRisk: useAggregateRiskQuery(clientId, inputs.aggregateRisk, enabled),
    certificates: useCertificatesQuery(clientId, inputs.certificates, enabled),
    supplyChainMap: useSupplyChainMapQuery(clientId, inputs.supplyChainMap, enabled),
  };
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)      */
/* ------------------------------------------------------------------ */

export interface RiskTierMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: SupplyBarClass;
}

/** Composite risk tier -> badge variant + score-bar fill. */
export const RISK_TIER_META: Record<ThirdPartyRiskTier, RiskTierMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "progress-error" },
  high: { label: "High", badgeVariant: "warning", barClass: "progress-warning" },
  medium: { label: "Medium", badgeVariant: "default", barClass: "progress-warning" },
  low: { label: "Low", badgeVariant: "secondary", barClass: "progress-success" },
};

/** Stable render order for tier bars/counts (critical first). */
export const RISK_TIER_ORDER: ThirdPartyRiskTier[] = ["critical", "high", "medium", "low"];

export interface CertificateStatusMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
}

/** Certificate validity status -> badge label + variant. */
export const CERT_STATUS_META: Record<CertificateStatus, CertificateStatusMeta> = {
  valid: { label: "Valid", badgeVariant: "success" },
  expiring: { label: "Expiring", badgeVariant: "warning" },
  expired: { label: "Expired", badgeVariant: "error" },
  missing: { label: "Missing", badgeVariant: "secondary" },
};

/** Stable render order for certificate status counters. */
export const CERT_STATUS_ORDER: CertificateStatus[] = ["valid", "expiring", "expired", "missing"];

export interface VerdictMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
}

/** Known verdict categories used by the demo engine and the helper below. */
export const VERDICT_META: Record<string, VerdictMeta> = {
  acceptable: { label: "Acceptable", badgeVariant: "success" },
  manageable: { label: "Manageable", badgeVariant: "warning" },
  highExposure: { label: "High exposure", badgeVariant: "error" },
  critical: { label: "Critical", badgeVariant: "error" },
};

/**
 * Map a free-text engine verdict to a stable badge. Unknown strings fall
 * back to their own text (or "Review") with a neutral variant, so the UI
 * never breaks when the backend ships new phrasing.
 */
export function getVerdictMeta(verdict: string | null | undefined): VerdictMeta {
  const v = (verdict ?? "").toLowerCase();
  if (!v) return { label: "No verdict", badgeVariant: "secondary" };
  if (v.includes("accept")) return VERDICT_META.acceptable;
  if (v.includes("manage") || v.includes("monitor")) return VERDICT_META.manageable;
  if (v.includes("critical") || v.includes("unacceptable")) return VERDICT_META.critical;
  if (v.includes("high") || v.includes("action")) return VERDICT_META.highExposure;
  return { label: verdict ?? "Review", badgeVariant: "default" };
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/** Sample supplier profiles fed into the pure scoring engine in demo mode. */
export const DEMO_TPR_SUPPLIERS: ThirdPartySupplierInput[] = [
  {
    id: 101,
    name: "Acme Cloud GmbH",
    criticalityInput: "critical",
    postureInput: "Developing",
    vendorResidualScore: 68,
  },
  {
    id: 102,
    name: "Nordwind Hosting",
    criticalityInput: "high",
    postureInput: "Strong",
    vendorResidualScore: 82,
  },
  {
    id: 103,
    name: "BlueBridge Data",
    criticalityInput: "critical",
    postureInput: "At Risk",
    vendorResidualScore: 41,
  },
  {
    id: 104,
    name: "SecurePost Mail",
    criticalityInput: "medium",
    postureInput: "Strong",
    vendorResidualScore: 88,
  },
  {
    id: 105,
    name: "GlobalNet Telecom",
    criticalityInput: "low",
    postureInput: "No Data",
    vendorResidualScore: 55,
  },
];

/** Sample supplier -> dependency edges for the map in demo mode. */
export const DEMO_TPR_DEPENDENCIES: DependencyEdgeInput[] = [
  { from: 101, to: 102, weight: 80 },
  { from: 101, to: 104, weight: 60 },
  { from: 103, to: 101, weight: 45 },
  { from: 102, to: 105, weight: 30 },
  { from: 103, to: 105, weight: 25 },
];

/**
 * Demo certificate specs keyed by supplier id. `expiresInDays` is relative
 * to "now" so the tracker stays sensible whenever it is rendered.
 */
export interface DemoCertificateSpec {
  name: string;
  issuer?: string;
  /** Days from "now" to the validity end (negative = already expired). */
  expiresInDays: number;
  /** Validity length in days (validFrom = validTo - validityDays). */
  validityDays?: number;
}

export const DEMO_TPR_CERTIFICATE_SPECS: Record<string, DemoCertificateSpec[]> = {
  "101": [
    { name: "SOC 2 Type II", issuer: "A-LIGN", expiresInDays: -30, validityDays: 365 },
    { name: "ISO 27001:2022", issuer: "BSI", expiresInDays: 300, validityDays: 730 },
    { name: "ISO 27017 Cloud Security", issuer: "TUV Rheinland", expiresInDays: 45, validityDays: 365 },
  ],
  "102": [
    { name: "ISO 27001:2022", issuer: "DQS", expiresInDays: 420, validityDays: 730 },
    { name: "Cyber Essentials Plus", issuer: "IASME", expiresInDays: 30, validityDays: 365 },
  ],
  "103": [{ name: "SOC 2 Type I", issuer: "BDO", expiresInDays: -120, validityDays: 365 }],
  "104": [],
  "105": [{ name: "PCI DSS 4.0", issuer: "QSA", expiresInDays: 250, validityDays: 365 }],
};

const CRITICALITY_BASE: Record<SupplierCriticality, number> = {
  critical: 95,
  high: 75,
  medium: 50,
  low: 30,
};

const POSTURE_PENALTY: Record<PostureReadiness, number> = {
  Strong: 0,
  Developing: 10,
  "At Risk": 22,
  "No Data": 30,
};

const TIER_VERDICT: Record<ThirdPartyRiskTier, string> = {
  critical: "Unacceptable residual risk - immediate action required",
  high: "Elevated exposure - manage closely with targeted controls",
  medium: "Acceptable residual risk with periodic monitoring",
  low: "Acceptable residual risk",
};

const TIER_ACTIONS: Record<ThirdPartyRiskTier, string[]> = {
  critical: [
    "Implement an immediate remediation plan with an accountable owner",
    "Escalate to the executive risk committee within 30 days",
    "Enforce contractual security requirements and audit rights",
  ],
  high: [
    "Run targeted control verification within 90 days",
    "Review the supplier's incident response and continuity plans",
  ],
  medium: [
    "Include in the next annual third-party assessment cycle",
    "Request updated security attestations at renewal",
  ],
  low: ["Maintain the standard review cadence", "Monitor posture signals at the annual review"],
};

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Demo composite-score model - mirrors what the engine is expected to return. */
function scoreSupplierProfile(input: ThirdPartySupplierInput): {
  compositeScore: number;
  riskTier: ThirdPartyRiskTier;
} {
  const criticality = input.criticalityInput ?? "medium";
  const posture = input.postureInput ?? "No Data";
  const residual = input.vendorResidualScore ?? 50;
  const composite = clampScore(
    CRITICALITY_BASE[criticality] - POSTURE_PENALTY[posture] + (50 - residual) * 0.4
  );
  const riskTier: ThirdPartyRiskTier =
    composite >= 70 ? "critical" : composite >= 50 ? "high" : composite >= 35 ? "medium" : "low";
  return { compositeScore: composite, riskTier };
}

/** Input object for thirdPartyRisk.aggregateRisk in demo mode. */
export function buildDemoAggregateRiskInput(): AggregateRiskInput {
  return { suppliers: DEMO_TPR_SUPPLIERS };
}

/** Compute the demo aggregate-risk view-model (mirrors aggregateRisk output). */
export function buildDemoAggregateRisk(): AggregateRiskResponse {
  const items: AggregateRiskItem[] = DEMO_TPR_SUPPLIERS.map((supplier) => {
    const { compositeScore, riskTier } = scoreSupplierProfile(supplier);
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      criticality: supplier.criticalityInput ?? "medium",
      postureReadiness: supplier.postureInput ?? "No Data",
      compositeScore,
      riskTier,
      verdict: TIER_VERDICT[riskTier],
      recommendedActions: TIER_ACTIONS[riskTier],
    };
  });
  const count = items.length;
  return {
    items,
    totals: {
      count,
      criticalCount: items.filter((i) => i.riskTier === "critical").length,
      highCount: items.filter((i) => i.riskTier === "high").length,
      mediumCount: items.filter((i) => i.riskTier === "medium").length,
      lowCount: items.filter((i) => i.riskTier === "low").length,
      avgCompositeScore: count
        ? Math.round(items.reduce((acc, i) => acc + i.compositeScore, 0) / count)
        : 0,
    },
  };
}

/** Input object for thirdPartyRisk.certificates in demo mode (dates relative to now). */
export function buildDemoCertificatesInput(now: Date = new Date()): CertificatesInput {
  return { suppliers: buildDemoCertificateInputs(now), now };
}

/** Certificate rows for demo mode - dates relative to `now`. */
export function buildDemoCertificateInputs(now: Date = new Date()): SupplierCertificatesInput[] {
  return DEMO_TPR_SUPPLIERS.map((supplier) => {
    const specs = DEMO_TPR_CERTIFICATE_SPECS[String(supplier.id)] ?? [];
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      certificates: specs.map((spec) => {
        const validTo = new Date(now.getTime() + spec.expiresInDays * 86_400_000);
        const validFrom = new Date(
          validTo.getTime() - (spec.validityDays ?? 365) * 86_400_000
        );
        return {
          name: spec.name,
          issuer: spec.issuer,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
        };
      }),
    };
  });
}

function evaluateCertificate(
  certificate: CertificateInput,
  now: Date
): { status: CertificateStatus; daysUntilExpiry: number | null } {
  const validToMs = new Date(certificate.validTo).getTime();
  const nowMs = now.getTime();
  const daysUntilExpiry = Math.floor((validToMs - nowMs) / 86_400_000);
  if (daysUntilExpiry < 0) return { status: "expired", daysUntilExpiry };
  if (daysUntilExpiry <= 90) return { status: "expiring", daysUntilExpiry };
  return { status: "valid", daysUntilExpiry };
}

/** Compute the demo certificate view-model (mirrors certificates output). */
export function buildDemoCertificates(now: Date = new Date()): CertificatesResponse {
  const inputs = buildDemoCertificateInputs(now);
  const items: CertificateItem[] = [];
  for (const supplier of inputs) {
    if (supplier.certificates.length === 0) {
      items.push({
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        name: "No certificate on file",
        validFrom: "",
        validTo: "",
        status: "missing",
        daysUntilExpiry: null,
      });
    }
    for (const certificate of supplier.certificates) {
      const { status, daysUntilExpiry } = evaluateCertificate(certificate, now);
      items.push({
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        name: certificate.name,
        issuer: certificate.issuer,
        validFrom: certificate.validFrom,
        validTo: certificate.validTo,
        status,
        daysUntilExpiry,
      });
    }
  }
  const suppliersWithCertificates = inputs.filter((s) => s.certificates.length > 0).length;
  return {
    items,
    summary: {
      total: items.length,
      valid: items.filter((i) => i.status === "valid").length,
      expiring: items.filter((i) => i.status === "expiring").length,
      expired: items.filter((i) => i.status === "expired").length,
      coverageRate: inputs.length
        ? Math.round((suppliersWithCertificates / inputs.length) * 100)
        : 0,
    },
  };
}

/** Input object for thirdPartyRisk.supplyChainMap in demo mode. */
export function buildDemoSupplyChainMapInput(): SupplyChainMapInput {
  return { suppliers: DEMO_TPR_SUPPLIERS, dependencies: DEMO_TPR_DEPENDENCIES };
}

/** Compute the demo supply-chain-map view-model (mirrors supplyChainMap output). */
export function buildDemoSupplyChainMap(): SupplyChainMapResponse {
  const nodes: SupplyChainMapNode[] = DEMO_TPR_SUPPLIERS.map((supplier) => {
    const { compositeScore, riskTier } = scoreSupplierProfile(supplier);
    return {
      id: supplier.id,
      name: supplier.name,
      riskTier,
      compositeScore,
      criticality: supplier.criticalityInput ?? "medium",
      postureReadiness: supplier.postureInput ?? "No Data",
    };
  });
  const edges: SupplyChainMapEdge[] = DEMO_TPR_DEPENDENCIES.map((edge) => ({
    from: edge.from,
    to: edge.to,
    weight: edge.weight ?? 50,
  }));
  const count = nodes.length;
  const tierCounts: Record<ThirdPartyRiskTier, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const node of nodes) {
    tierCounts[node.riskTier] += 1;
  }
  return {
    nodes,
    edges,
    summary: {
      tierCounts,
      avgCompositeScore: count
        ? Math.round(nodes.reduce((acc, n) => acc + n.compositeScore, 0) / count)
        : 0,
      edgeCount: edges.length,
    },
  };
}
