/**
 * NIS2 Threat Landscape - data contract + hooks
 * ==============================================
 * UI-side typed view of the `threatLandscape.*` tRPC procedures the backend
 * agent is building (registered as `threatLandscape:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 1 Task 1.1 - ENISA Measure 2.1 "Risk
 * Management Framework" (NIS2 Article 21(1) and 21(2)(a)): the four
 * procedures power the "NIS2 Threat Landscape Integration" section on the
 * Cyber Dashboard (landscape summary strip, threat-event classification,
 * sector scenario generation and the TARA workbook).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the threatLandscape.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) threatLandscape.classify
 *    input:  { id?, title?, description?, source? }
 *    output: { id, title, categoryId, categoryName,
 *              impactLevel: 'Low'|'Medium'|'High'|'Critical',
 *              nis2Articles: string[], matchedKeywords: string[],
 *              confidence: 0|1 }
 *            (first ENISA taxonomy entry whose keyword matches wins;
 *             TH-000 "Other" + confidence 0 when nothing matches)
 *
 * 2) threatLandscape.scenarios
 *    input:  { sector?, limit? }
 *    output: { items: Array<{ id, title, description, baseThreatId,
 *              categoryId, categoryName,
 *              likelihood: 'Low'|'Medium'|'High', potentialImpact,
 *              recommendedControls: string[], industrySector: string[],
 *              nis2Articles: string[] }>, total }
 *            (sector match case-insensitive; "Any" scenarios always
 *             eligible; missing sector or no match -> general scenarios)
 *
 * 3) threatLandscape.tara
 *    input:  { assets?: Array<{ id?, name?, criticality? }>,
 *              scenarios?: Array<...> }
 *    output: { rows: Array<{ assetId, assetName, scenarioId,
 *              scenarioTitle, categoryId, categoryName,
 *              inherentLikelihood, inherentImpact, riskScore,
 *              riskBand: 'critical'|'high'|'medium'|'low',
 *              mitigations: string[], nis2Articles: string[] }>,
 *              summary: { totalRows, perBand: { critical, high, medium,
 *              low }, avgRiskScore, topRisks:
 *              Array<{ assetId, assetName, scenarioId, riskScore,
 *              riskBand }> } }
 *            (riskScore = likelihood(1-3) * criticality(1-4), 1-12;
 *             band: critical >= 9, high >= 6, medium >= 3, low < 3)
 *
 * 4) threatLandscape.summary
 *    input:  { events?: Array<{ id?, title?, description?, severity?,
 *              occurredAt? }>, sector?, now?, clock? }
 *    output: { totalEvents, categoryCounts: Array<{ categoryId,
 *              categoryName, count }>, severityCounts: { critical, high,
 *              medium, low, unknown }, recentEvents:
 *              Array<{ id, title, categoryId, categoryName, severity,
 *              occurredAt: string|null }> (max 5),
 *              trend: { last30d, prior30d, delta },
 *              exposureScore: number (0-100),
 *              recommendations: string[] (max 5) }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** ENISA impact level of a classified threat (taxonomy contract). */
export type ThreatImpactLevel = "Low" | "Medium" | "High" | "Critical";

/** Coerced severity bucket used by the landscape summary. */
export type ThreatLandscapeSeverity = "critical" | "high" | "medium" | "low" | "unknown";

/** Scenario likelihood value honored by the TARA engine. */
export type ThreatScenarioLikelihood = "Low" | "Medium" | "High";

/** TARA risk band derived from the 1-12 risk score. */
export type TaraRiskBand = "critical" | "high" | "medium" | "low";

/** Badge variants actually supported by the Badge component. */
export type ThreatBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type ThreatBarClass = "progress-success" | "progress-warning" | "progress-error";

/** Wall-clock input accepted by the pure summary engine (superjson-safe). */
export type ThreatClockInput = string | number | Date | null | undefined;

/* --- threatLandscape.classify ---------------------------------------- */

/** One event row fed into the classifier (input side). */
export interface ThreatEventInput {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  source?: string | null;
}

/** Output of threatLandscape.classify. */
export interface ThreatClassification {
  id: string | number;
  title: string;
  categoryId: string;
  categoryName: string;
  impactLevel: ThreatImpactLevel;
  nis2Articles: string[];
  matchedKeywords: string[];
  /** 1 on an exact keyword hit, 0 for the TH-000 fallback. */
  confidence: number;
}

/* --- threatLandscape.scenarios --------------------------------------- */

/** Input of threatLandscape.scenarios. */
export interface ThreatScenariosInput {
  /** Sector filter, e.g. "Energy"; missing/empty returns general scenarios. */
  sector?: string | null;
  /** Positive integer cap applied last; invalid/absent -> no limit. */
  limit?: number | null;
}

/** One threat scenario item (ENISA category + NIS2 articles attached). */
export interface ThreatScenarioItem {
  id: string;
  title: string;
  description: string;
  baseThreatId: string;
  categoryId: string;
  categoryName: string;
  likelihood: ThreatScenarioLikelihood;
  potentialImpact: string;
  recommendedControls: string[];
  industrySector: string[];
  nis2Articles: string[];
}

/** Output of threatLandscape.scenarios. */
export interface ThreatScenariosResponse {
  items: ThreatScenarioItem[];
  total: number;
}

/* --- threatLandscape.tara -------------------------------------------- */

/** One asset row fed into the TARA engine (input side). */
export interface TaraAssetInput {
  id?: string | number | null;
  name?: string | null;
  /** Asset criticality; mapped to the impact score (Critical 4 .. Low 1). */
  criticality?: string | null;
}

/** One scenario row accepted by the TARA engine (input side). */
export interface TaraScenarioInput {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  baseThreatId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  likelihood?: string | null;
  potentialImpact?: string | null;
  recommendedControls?: string[] | null;
  industrySector?: string[] | null;
  nis2Articles?: string[] | null;
}

/** Input of threatLandscape.tara. */
export interface TaraTemplateInput {
  assets?: Array<TaraAssetInput> | null;
  scenarios?: Array<TaraScenarioInput> | null;
}

/** One computed TARA row (asset x scenario). */
export interface TaraRow {
  assetId: string | number;
  assetName: string;
  scenarioId: string | number;
  scenarioTitle: string;
  categoryId: string;
  categoryName: string;
  /** 1-3 from the scenario likelihood (Low 1 / Medium 2 / High 3). */
  inherentLikelihood: number;
  /** 1-4 from the asset criticality (Critical 4 .. Low 1). */
  inherentImpact: number;
  /** inherentLikelihood * inherentImpact, integer 1-12. */
  riskScore: number;
  riskBand: TaraRiskBand;
  /** Merged ISO 27001 controls (deduplicated, first-seen order). */
  mitigations: string[];
  nis2Articles: string[];
}

/** One top-risk entry of the TARA summary. */
export interface TaraTopRisk {
  assetId: string | number;
  assetName: string;
  scenarioId: string | number;
  riskScore: number;
  riskBand: TaraRiskBand;
}

/** TARA rollup summary. */
export interface TaraSummary {
  totalRows: number;
  perBand: { critical: number; high: number; medium: number; low: number };
  avgRiskScore: number;
  /** Top 5 risks sorted by score, then asset name, then scenario id. */
  topRisks: TaraTopRisk[];
}

/** Output of threatLandscape.tara. */
export interface TaraTemplateResponse {
  rows: TaraRow[];
  summary: TaraSummary;
}

/* --- threatLandscape.summary ----------------------------------------- */

/** One threat event row fed into the landscape summary (input side). */
export interface ThreatLandscapeEventInput {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  occurredAt?: ThreatClockInput;
}

/** Input of threatLandscape.summary (clock pins the 30-day windows). */
export interface ThreatLandscapeSummaryInput {
  events?: Array<ThreatLandscapeEventInput> | null;
  sector?: string | null;
  /** Pin "now": epoch-ms number or ISO-8601 string. */
  now?: string | number | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** Category count entry of the landscape summary. */
export interface ThreatCategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}

/** One recent event row of the landscape summary. */
export interface RecentThreatEvent {
  id: string | number;
  title: string;
  categoryId: string;
  categoryName: string;
  severity: ThreatLandscapeSeverity;
  /** ISO-8601 timestamp when valid; null when the input occurredAt is invalid. */
  occurredAt: string | null;
}

/** 30-day trend window vs the injected clock. */
export interface ThreatTrend {
  last30d: number;
  prior30d: number;
  /** last30d - prior30d. */
  delta: number;
}

/** Output of threatLandscape.summary. */
export interface ThreatLandscapeSummary {
  totalEvents: number;
  categoryCounts: ThreatCategoryCount[];
  severityCounts: Record<ThreatLandscapeSeverity, number>;
  recentEvents: RecentThreatEvent[];
  trend: ThreatTrend;
  /** 0-100 exposure score (base 40 + 20 per applicable sector scenario). */
  exposureScore: number;
  recommendations: string[];
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_THREAT_CLASSIFICATION: ThreatClassification = {
  id: "",
  title: "",
  categoryId: "",
  categoryName: "",
  impactLevel: "Low",
  nis2Articles: [],
  matchedKeywords: [],
  confidence: 0,
};

export const EMPTY_THREAT_SCENARIOS: ThreatScenariosResponse = {
  items: [],
  total: 0,
};

export const EMPTY_TARA_TEMPLATE: TaraTemplateResponse = {
  rows: [],
  summary: {
    totalRows: 0,
    perBand: { critical: 0, high: 0, medium: 0, low: 0 },
    avgRiskScore: 0,
    topRisks: [],
  },
};

const zeroSeverityCounts = (): Record<ThreatLandscapeSeverity, number> => ({
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  unknown: 0,
});

export const EMPTY_THREAT_SUMMARY: ThreatLandscapeSummary = {
  totalEvents: 0,
  categoryCounts: [],
  severityCounts: zeroSeverityCounts(),
  recentEvents: [],
  trend: { last30d: 0, prior30d: 0, delta: 0 },
  exposureScore: 0,
  recommendations: [],
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

interface ThreatLandscapeTrpc {
  threatLandscape: {
    classify: {
      useQuery: (input: ThreatEventInput, opts?: QueryOptions) => QueryLike<ThreatClassification>;
    };
    scenarios: {
      useQuery: (input: ThreatScenariosInput, opts?: QueryOptions) => QueryLike<ThreatScenariosResponse>;
    };
    tara: {
      useQuery: (input: TaraTemplateInput, opts?: QueryOptions) => QueryLike<TaraTemplateResponse>;
    };
    summary: {
      useQuery: (input: ThreatLandscapeSummaryInput, opts?: QueryOptions) => QueryLike<ThreatLandscapeSummary>;
    };
  };
}

const threatLandscapeApi = trpc as unknown as ThreatLandscapeTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_CLASSIFY_INPUT: ThreatEventInput = {};
const HIDDEN_SCENARIOS_INPUT: ThreatScenariosInput = {};
const HIDDEN_TARA_INPUT: TaraTemplateInput = {};
const HIDDEN_SUMMARY_INPUT: ThreatLandscapeSummaryInput = {};

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Classify a threat event against the ENISA Threat Taxonomy 2024
 * (Art. 21(2)(a)). Client-scoped - pass null for `input` to keep the query
 * disabled (e.g. before the user submits the classifier form).
 */
export function useThreatClassification(
  clientId: number,
  input: ThreatEventInput | null,
  enabled = true
): QueryLike<ThreatClassification> {
  return threatLandscapeApi.threatLandscape.classify.useQuery(input ?? HIDDEN_CLASSIFY_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Sector threat scenarios from the built-in catalog (ENISA category + NIS2
 * articles attached). Client-scoped - pass null for `input` to keep the
 * query disabled (e.g. before the user picks a sector).
 */
export function useThreatScenarios(
  clientId: number,
  input: ThreatScenariosInput | null,
  enabled = true
): QueryLike<ThreatScenariosResponse> {
  return threatLandscapeApi.threatLandscape.scenarios.useQuery(input ?? HIDDEN_SCENARIOS_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * TARA workbook (asset x scenario risk rows + rollup summary). Client-scoped
 * - pass null for `input` to keep the query disabled (no workbook yet).
 */
export function useTaraTemplate(
  clientId: number,
  input: TaraTemplateInput | null,
  enabled = true
): QueryLike<TaraTemplateResponse> {
  return threatLandscapeApi.threatLandscape.tara.useQuery(input ?? HIDDEN_TARA_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Threat landscape summary (category/severity counts, recent events,
 * 30-day trend, exposure score and recommendations). Client-scoped - pass
 * null for `input` to keep the query disabled.
 */
export function useThreatLandscapeSummary(
  clientId: number,
  input: ThreatLandscapeSummaryInput | null,
  enabled = true
): QueryLike<ThreatLandscapeSummary> {
  return threatLandscapeApi.threatLandscape.summary.useQuery(input ?? HIDDEN_SUMMARY_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)      */
/* ------------------------------------------------------------------ */

export interface ThreatCategoryMeta {
  label: string;
  badgeVariant: ThreatBadgeVariant;
}

/**
 * ENISA Threat Taxonomy 2024 category ids (TH-000..TH-008) -> badge
 * label/variant. TH-000 is the unclassified "Other" fallback.
 */
export const THREAT_CATEGORY_META: Record<string, ThreatCategoryMeta> = {
  "TH-000": { label: "Other", badgeVariant: "secondary" },
  "TH-001": { label: "Ransomware", badgeVariant: "error" },
  "TH-002": { label: "Malware", badgeVariant: "warning" },
  "TH-003": { label: "DoS/DDoS", badgeVariant: "info" },
  "TH-004": { label: "Supply Chain", badgeVariant: "warning" },
  "TH-005": { label: "Phishing", badgeVariant: "info" },
  "TH-006": { label: "Insider", badgeVariant: "warning" },
  "TH-007": { label: "Misc", badgeVariant: "secondary" },
  "TH-008": { label: "Natural Disaster", badgeVariant: "outline" },
};

/** Category badge meta for any categoryId (falls back to the raw id). */
export function threatCategoryMeta(categoryId: string, fallbackLabel?: string): ThreatCategoryMeta {
  return (
    THREAT_CATEGORY_META[categoryId] ?? {
      label: fallbackLabel ?? categoryId,
      badgeVariant: "secondary",
    }
  );
}

export interface ThreatSeverityMeta {
  label: string;
  badgeVariant: ThreatBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: ThreatBarClass;
}

/** Threat-event severity -> badge label/variant + score-bar fill. */
export const SEVERITY_META: Record<ThreatLandscapeSeverity, ThreatSeverityMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "progress-error" },
  high: { label: "High", badgeVariant: "warning", barClass: "progress-warning" },
  medium: { label: "Medium", badgeVariant: "warning", barClass: "progress-warning" },
  low: { label: "Low", badgeVariant: "info", barClass: "progress-success" },
  unknown: { label: "Unknown", badgeVariant: "secondary", barClass: "progress-warning" },
};

/** Stable render order for severity counters (critical first). */
export const THREAT_SEVERITY_ORDER: ThreatLandscapeSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface RiskBandMeta {
  label: string;
  badgeVariant: ThreatBadgeVariant;
  /** Token-based class for the risk score value (dark-mode safe). */
  textClass: string;
}

/** TARA risk band -> badge label/variant + score color. */
export const RISK_BAND_META: Record<TaraRiskBand, RiskBandMeta> = {
  critical: { label: "Critical", badgeVariant: "error", textClass: "text-[var(--error-foreground)]" },
  high: { label: "High", badgeVariant: "warning", textClass: "text-[var(--warning-foreground)]" },
  medium: { label: "Medium", badgeVariant: "info", textClass: "text-foreground" },
  low: { label: "Low", badgeVariant: "secondary", textClass: "text-muted-foreground" },
};

/** Stable render order for TARA per-band tiles. */
export const RISK_BAND_ORDER: TaraRiskBand[] = ["critical", "high", "medium", "low"];

export interface ImpactLevelMeta {
  label: string;
  badgeVariant: ThreatBadgeVariant;
}

/** Classified threat impact level -> badge label/variant. */
export const IMPACT_LEVEL_META: Record<ThreatImpactLevel, ImpactLevelMeta> = {
  Critical: { label: "Critical", badgeVariant: "error" },
  High: { label: "High", badgeVariant: "warning" },
  Medium: { label: "Medium", badgeVariant: "warning" },
  Low: { label: "Low", badgeVariant: "info" },
};

export interface LikelihoodMeta {
  label: string;
  badgeVariant: ThreatBadgeVariant;
}

/** Scenario likelihood -> badge label/variant. */
export const LIKELIHOOD_META: Record<ThreatScenarioLikelihood, LikelihoodMeta> = {
  High: { label: "High", badgeVariant: "error" },
  Medium: { label: "Medium", badgeVariant: "warning" },
  Low: { label: "Low", badgeVariant: "info" },
};

export interface TrendDeltaMeta {
  label: string;
  /** Arrow glyph; a positive delta means more events (worsening). */
  glyph: "↑" | "↓" | "→";
  /** Token-based class for the trend value (dark-mode safe). */
  textClass: string;
  badgeVariant: ThreatBadgeVariant;
}

/** 30-day trend delta -> label, arrow glyph + semantic colors. */
export const TREND_DELTA_META: Record<"up" | "down" | "flat", TrendDeltaMeta> = {
  up: {
    label: "Events up",
    glyph: "↑",
    textClass: "text-[var(--error-foreground)]",
    badgeVariant: "error",
  },
  down: {
    label: "Events down",
    glyph: "↓",
    textClass: "text-[var(--success-foreground)]",
    badgeVariant: "success",
  },
  flat: {
    label: "Events flat",
    glyph: "→",
    textClass: "text-muted-foreground",
    badgeVariant: "secondary",
  },
};

/** Trend direction key for a signed delta (positive = more events). */
export function trendDeltaDirection(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** TARA risk band from the 1-12 score (mirrors the engine thresholds). */
export function riskBandForScore(score: number): TaraRiskBand {
  if (score >= 9) return "critical";
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/** Exposure score -> score-bar fill (>=70 red, >=45 amber, else green). */
export function exposureBarClass(score: number): ThreatBarClass {
  if (score >= 70) return "progress-error";
  if (score >= 45) return "progress-warning";
  return "progress-success";
}

/** Classification confidence (0-1) -> score-bar fill (>=0.8 green). */
export function confidenceBarClass(confidence: number): ThreatBarClass {
  if (confidence >= 0.8) return "progress-success";
  if (confidence >= 0.5) return "progress-warning";
  return "progress-error";
}

/** Confidence label for a 0-1 classifier output ("100%" / "0%"). */
export function formatConfidence(confidence: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return `${pct}%`;
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the threat-landscape demo is deterministic: every
 * occurredAt and derived trend/exposure stat is computed from this instant.
 */
export const DEMO_THREAT_BASE_DATE = new Date("2026-09-15T00:00:00.000Z");

const DAY_MS = 86_400_000;

const demoIso = (daysFromBase: number): string =>
  new Date(DEMO_THREAT_BASE_DATE.getTime() + daysFromBase * DAY_MS).toISOString();

/** Demo sector (Energy has dedicated SC-ENE + shared scenarios). */
export const DEMO_SECTOR = "Energy";

/**
 * Sample threat events (input side) fed into the summary engine: mixed
 * categories, severities and recency so every chip, count and badge is
 * represented, with a clear last-30d / prior-30d trend signal.
 */
export const DEMO_THREAT_EVENTS: ThreatLandscapeEventInput[] = [
  {
    id: 1,
    title: "LockBit ransomware campaign targeting backup repositories",
    description: "Ransomware encrypted backup volumes and demanded double extortion payment.",
    severity: "critical",
    occurredAt: demoIso(-2),
  },
  {
    id: 2,
    title: "Spear-phishing email targeting finance administrators",
    description: "Credential harvesting campaign impersonating the CFO with urgency.",
    severity: "high",
    occurredAt: demoIso(-5),
  },
  {
    id: 3,
    title: "SCADA remote-access gateway exposed on the internet",
    description: "Malware delivered through an exposed gateway into the OT network.",
    severity: "critical",
    occurredAt: demoIso(-9),
  },
  {
    id: 4,
    title: "Compromised dependency in the software supply chain",
    description: "An upstream open-source package was modified with a backdoor.",
    severity: "medium",
    occurredAt: demoIso(-14),
  },
  {
    id: 5,
    title: "Volumetric DDoS against the customer portal",
    description: "Sustained DNS flood saturating public-facing bandwidth.",
    severity: "medium",
    occurredAt: demoIso(-20),
  },
  {
    id: 6,
    title: "Insider data exfiltration attempt via removable media",
    description: "Privileged user attempted to copy business records to a USB drive.",
    severity: "low",
    occurredAt: demoIso(-34),
  },
  {
    id: 7,
    title: "Zero-day exploit in the edge VPN gateway",
    description: "Pre-patch exploit for an unknown VPN vulnerability under active use.",
    severity: "critical",
    occurredAt: demoIso(-38),
  },
  {
    id: 8,
    title: "Legacy scan artifact - weak cipher suite detected",
    description: "Historical configuration export flagged deprecated TLS ciphers.",
    severity: "unknown",
    occurredAt: demoIso(-47),
  },
];

/**
 * Demo category per event id (the summary engine derives categories by
 * keyword matching; the demo builder pins the same result deterministically).
 */
const DEMO_EVENT_CATEGORIES: Record<string, { categoryId: string; categoryName: string }> = {
  1: { categoryId: "TH-001", categoryName: "Ransomware" },
  2: { categoryId: "TH-005", categoryName: "Phishing" },
  3: { categoryId: "TH-002", categoryName: "Malware" },
  4: { categoryId: "TH-004", categoryName: "Supply Chain" },
  5: { categoryId: "TH-003", categoryName: "DoS/DDoS" },
  6: { categoryId: "TH-006", categoryName: "Insider" },
  7: { categoryId: "TH-007", categoryName: "Misc" },
  8: { categoryId: "TH-000", categoryName: "Other" },
};

/** Sample threat event used to pre-fill the classifier tool in demo mode. */
export const DEMO_THREAT_CLASSIFICATION_INPUT: ThreatEventInput = {
  id: "demo-alert",
  title: "Ransomware encrypting backup repositories",
  description:
    "Detection rule fired: encryption behaviour on the backup cluster followed by an extortion demand.",
  source: "SOC alert queue",
};

/** Sample assets fed into the TARA workbook in demo mode. */
export const DEMO_TARA_ASSETS: TaraAssetInput[] = [
  { id: "asset-1", name: "SCADA / OT Network", criticality: "critical" },
  { id: "asset-2", name: "Customer Portal", criticality: "high" },
  { id: "asset-3", name: "File & Backup Infrastructure", criticality: "medium" },
  { id: "asset-4", name: "Office Workstation Fleet", criticality: "low" },
];

/**
 * Sample scenarios (subset of the frozen catalog) used by the demo scenario
 * generator and the demo TARA workbook. Deterministic catalog order.
 */
export const DEMO_SCENARIO_ITEMS: ThreatScenarioItem[] = [
  {
    id: "SC-ENE-01",
    title: "SCADA/OT Network Intrusion via Remote Access",
    description:
      "Malware delivered through an exposed remote-access gateway into the SCADA/OT network.",
    baseThreatId: "TH-002",
    categoryId: "TH-002",
    categoryName: "Malware",
    likelihood: "High",
    potentialImpact: "Disruption of energy supply with national impact.",
    recommendedControls: ["A.8.20", "A.8.16"],
    industrySector: ["Energy", "Utilities"],
    nis2Articles: ["21(2)(d)", "21(2)(j)"],
  },
  {
    id: "SC-MFG-01",
    title: "Industrial Control System (ICS) Sabotage",
    description:
      "Compromise of OT networks leading to unauthorized manipulation of manufacturing equipment.",
    baseThreatId: "TH-006",
    categoryId: "TH-006",
    categoryName: "Insider",
    likelihood: "Low",
    potentialImpact: "Physical damage to assets and environmental risk.",
    recommendedControls: ["A.8.20", "A.7.12"],
    industrySector: ["Manufacturing", "Energy"],
    nis2Articles: ["21(2)(i)", "21(2)(j)"],
  },
  {
    id: "SC-GEN-01",
    title: "Phishing of High-Privilege Admin",
    description: "Spear-phishing targeting IT admins to gain cloud infrastructure control.",
    baseThreatId: "TH-005",
    categoryId: "TH-005",
    categoryName: "Phishing",
    likelihood: "High",
    potentialImpact: "Full infrastructure takeover and data exfiltration.",
    recommendedControls: ["A.5.15", "A.8.5"],
    industrySector: ["Any"],
    nis2Articles: ["21(2)(j)", "21(2)(g)"],
  },
  {
    id: "SC-GEN-02",
    title: "Supply Chain Compromise of Managed Service Provider",
    description:
      "Compromise of an upstream managed service provider used to pivot into the organization's environment.",
    baseThreatId: "TH-004",
    categoryId: "TH-004",
    categoryName: "Supply Chain",
    likelihood: "Medium",
    potentialImpact: "Widespread lateral movement and long-term persistence.",
    recommendedControls: ["A.5.19", "A.5.20", "A.5.22"],
    industrySector: ["Any"],
    nis2Articles: ["21(2)(g)"],
  },
  {
    id: "SC-GEN-03",
    title: "Malicious Insider Data Exfiltration",
    description: "Authorized user exfiltrates sensitive data for personal gain or sabotage.",
    baseThreatId: "TH-006",
    categoryId: "TH-006",
    categoryName: "Insider",
    likelihood: "Medium",
    potentialImpact: "Data breach, regulatory fines and reputational damage.",
    recommendedControls: ["A.6.1", "A.6.2", "A.8.12"],
    industrySector: ["Any"],
    nis2Articles: ["21(2)(i)", "21(2)(j)"],
  },
];

/** Input object for threatLandscape.classify in demo mode. */
export function buildDemoThreatClassificationInput(): ThreatEventInput {
  return { ...DEMO_THREAT_CLASSIFICATION_INPUT };
}

/** Compute the demo classification view-model (mirrors classify output). */
export function buildDemoThreatClassification(): ThreatClassification {
  return {
    id: DEMO_THREAT_CLASSIFICATION_INPUT.id ?? "demo-alert",
    title: DEMO_THREAT_CLASSIFICATION_INPUT.title ?? "",
    categoryId: "TH-001",
    categoryName: "Ransomware",
    impactLevel: "Critical",
    nis2Articles: ["21(2)(c)", "21(2)(j)"],
    matchedKeywords: ["ransomware", "encryption", "extortion"],
    confidence: 1,
  };
}

/** Input object for threatLandscape.scenarios in demo mode. */
export function buildDemoThreatScenariosInput(): ThreatScenariosInput {
  return { sector: DEMO_SECTOR, limit: DEMO_SCENARIO_ITEMS.length };
}

/** Compute the demo scenarios view-model (mirrors scenarios output). */
export function buildDemoThreatScenarios(): ThreatScenariosResponse {
  return {
    items: DEMO_SCENARIO_ITEMS.map((item) => ({
      ...item,
      recommendedControls: [...item.recommendedControls],
      industrySector: [...item.industrySector],
      nis2Articles: [...item.nis2Articles],
    })),
    total: DEMO_SCENARIO_ITEMS.length,
  };
}

/** Input object for threatLandscape.tara in demo mode. */
export function buildDemoTaraTemplateInput(): TaraTemplateInput {
  return {
    assets: DEMO_TARA_ASSETS.map((asset) => ({ ...asset })),
    scenarios: buildDemoThreatScenarios().items,
  };
}

/** Numeric score per scenario likelihood (mirrors the engine). */
const DEMO_LIKELIHOOD_SCORE: Record<ThreatScenarioLikelihood, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

/** Numeric score per asset criticality (mirrors the engine). */
const DEMO_CRITICALITY_SCORE: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Compute the demo TARA workbook (mirrors tara output, deterministic). */
export function buildDemoTaraTemplate(): TaraTemplateResponse {
  const rows: TaraRow[] = [];
  for (const asset of DEMO_TARA_ASSETS) {
    const inherentImpact = DEMO_CRITICALITY_SCORE[(asset.criticality ?? "low").toLowerCase()] ?? 1;
    for (const scenario of DEMO_SCENARIO_ITEMS) {
      const inherentLikelihood = DEMO_LIKELIHOOD_SCORE[scenario.likelihood] ?? 1;
      const riskScore = inherentLikelihood * inherentImpact;
      rows.push({
        assetId: asset.id ?? `asset-${rows.length + 1}`,
        assetName: asset.name ?? "Unnamed asset",
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        categoryId: scenario.categoryId,
        categoryName: scenario.categoryName,
        inherentLikelihood,
        inherentImpact,
        riskScore,
        riskBand: riskBandForScore(riskScore),
        mitigations: [...scenario.recommendedControls],
        nis2Articles: [...scenario.nis2Articles],
      });
    }
  }

  rows.sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      a.assetName.localeCompare(b.assetName) ||
      String(a.scenarioId).localeCompare(String(b.scenarioId))
  );

  const perBand = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) perBand[row.riskBand] += 1;
  const avgRiskScore =
    rows.length > 0
      ? Math.round((rows.reduce((acc, row) => acc + row.riskScore, 0) / rows.length) * 10) / 10
      : 0;

  return {
    rows,
    summary: {
      totalRows: rows.length,
      perBand,
      avgRiskScore,
      topRisks: rows.slice(0, 5).map((row) => ({
        assetId: row.assetId,
        assetName: row.assetName,
        scenarioId: row.scenarioId,
        riskScore: row.riskScore,
        riskBand: row.riskBand,
      })),
    },
  };
}

/** Input object for threatLandscape.summary in demo mode. */
export function buildDemoThreatSummaryInput(): ThreatLandscapeSummaryInput {
  return { events: DEMO_THREAT_EVENTS.map((event) => ({ ...event })), sector: DEMO_SECTOR };
}

/** Severity for a demo event (anything outside the valid buckets -> unknown). */
function demoSeverityFor(severity: string | null | undefined): ThreatLandscapeSeverity {
  const value = (severity ?? "").toLowerCase();
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "unknown";
}

/** Compute the demo landscape summary (mirrors summary output, deterministic). */
export function buildDemoThreatSummary(): ThreatLandscapeSummary {
  const severityCounts = zeroSeverityCounts();
  const categoryMap = new Map<string, ThreatCategoryCount>();

  const baseTime = DEMO_THREAT_BASE_DATE.getTime();
  let last30d = 0;
  let prior30d = 0;

  for (const event of DEMO_THREAT_EVENTS) {
    const severity = demoSeverityFor(event.severity);
    severityCounts[severity] += 1;

    const category = DEMO_EVENT_CATEGORIES[String(event.id)];
    if (category) {
      const existing = categoryMap.get(category.categoryId);
      if (existing) existing.count += 1;
      else categoryMap.set(category.categoryId, { ...category, count: 1 });
    }

    const occurredTime =
      typeof event.occurredAt === "number" || typeof event.occurredAt === "string"
        ? new Date(event.occurredAt).getTime()
        : event.occurredAt instanceof Date
          ? event.occurredAt.getTime()
          : Number.NaN;
    if (Number.isFinite(occurredTime)) {
      const daysAgo = Math.round((baseTime - occurredTime) / DAY_MS);
      if (daysAgo >= 0 && daysAgo < 30) last30d += 1;
      else if (daysAgo >= 30 && daysAgo < 60) prior30d += 1;
    }
  }

  const recentEvents: RecentThreatEvent[] = DEMO_THREAT_EVENTS.map((event) => {
    const category = DEMO_EVENT_CATEGORIES[String(event.id)];
    const occurredTime =
      typeof event.occurredAt === "number" || typeof event.occurredAt === "string"
        ? new Date(event.occurredAt).toISOString()
        : event.occurredAt instanceof Date
          ? event.occurredAt.toISOString()
          : null;
    return {
      id: event.id ?? "",
      title: event.title ?? "",
      categoryId: category?.categoryId ?? "TH-000",
      categoryName: category?.categoryName ?? "Other",
      severity: demoSeverityFor(event.severity),
      occurredAt:
        occurredTime && !Number.isNaN(new Date(occurredTime).getTime()) ? occurredTime : null,
    };
  })
    .sort((a, b) => {
      const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 5);

  const categoryCounts = [...categoryMap.values()].sort((a, b) => b.count - a.count);

  // Applicable sector scenarios (mirror the engine: sector entry or "Any").
  const applicableCount = DEMO_SCENARIO_ITEMS.filter((scenario) =>
    scenario.industrySector.some(
      (entry) => entry === "Any" || DEMO_SECTOR.toLowerCase().includes(entry.toLowerCase())
    )
  ).length;
  const exposureScore = Math.min(100, 40 + applicableCount * 20);

  const criticalHigh = severityCounts.critical + severityCounts.high;
  const recommendations: string[] = [
    `${criticalHigh} critical/high events in the last 60 days - prioritize the ${categoryCounts[0]?.categoryName ?? "top"} category for immediate remediation.`,
    `Exposure score is ${exposureScore}/100 for the ${DEMO_SECTOR} sector - review the ${applicableCount} applicable threat scenarios in the TARA workbook.`,
    `Trend is ${TREND_DELTA_META[trendDeltaDirection(last30d - prior30d)].label} (${last30d} events last 30 days vs ${prior30d} prior) - ${last30d > prior30d ? "tighten detection and monitoring coverage" : "keep the current detection cadence"}.`,
    `Validate NIS2 Art. 21(2) incident-handling readiness against the ${recentEvents.length} most recent landscape events.`,
    "Re-run the classifier on new SOC alerts before triage to keep the ENISA taxonomy mapping current.",
  ];

  return {
    totalEvents: DEMO_THREAT_EVENTS.length,
    categoryCounts,
    severityCounts,
    recentEvents,
    trend: { last30d, prior30d, delta: last30d - prior30d },
    exposureScore,
    recommendations: recommendations.slice(0, 5),
  };
}
