/**
 * NIS2 Security Command - data contract + hooks (cycle 38)
 * =========================================================
 * UI-side typed view of the `nis2Dashboard.*` tRPC procedures the backend
 * agent is building in parallel (registered as `nis2Dashboard:` on the
 * AppRouter in `packages/core/src/routers.ts`). Powers the
 * "NIS2 Security Command" dashboard section
 * (`pages/cyber/Nis2DashboardPanels.tsx`):
 *
 *   1. controlHealth   - Article 21 control health across 12 ENISA measures
 *   2. domainSummary   - 8 security-domain rollups (risk .. policy)
 *   3. incidentClock   - significant incidents + next regulatory deadline
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if a procedure is not live
 * yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an error;
 * the panels degrade to Skeleton loading and a graceful EmptyState
 * ("Connect the nis2Dashboard.<procedure> API"). No spinner-forever, no
 * crash, no fake data as primary state (17).
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (protected queries):
 *
 * 1) nis2Dashboard.controlHealth
 *    input:  { clientId }
 *    output: { measures: Array<{ id, article, title,
 *                                status: 'compliant'|'at-risk'|'non-compliant'|'no-data',
 *                                score,           // 0-100
 *                                metrics: Array<{ label, value }>,
 *                                alertCount }>,
 *              generatedAt }        // ISO-8601
 *    // exactly 12 measures, canonical id order MEASURE_IDS
 *
 * 2) nis2Dashboard.domainSummary
 *    input:  { clientId }
 *    output: { domains: Array<{ key, title,
 *                               status: 'healthy'|'watch'|'critical'|'no-data',
 *                               primary, secondary, alertCount }> }
 *    // exactly 8 domains, canonical key order DOMAIN_KEYS
 *
 * 3) nis2Dashboard.incidentClock
 *    input:  { clientId }
 *    output: { openSignificant: number,
 *              nextDeadline: null | { label, dueAt,       // ISO-8601
 *                                     hoursRemaining,     // signed; negative = overdue
 *                                     incidentId: number|null,
 *                                     incidentTitle } }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

/** Badge variants actually supported by the Badge component. */
export type Nis2BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz fill for score bars / heat cells (UI-STANDARD 18 exception). */
export type Nis2VizClass = string;

/** The 12 fixed ENISA measure ids, canonical order (backend contract). */
export const MEASURE_IDS = [
  "policies",
  "riskManagement",
  "incidentHandling",
  "businessContinuity",
  "supplyChain",
  "vulnerabilityMgmt",
  "effectiveness",
  "cyberHygiene",
  "cryptography",
  "hrSecurity",
  "accessControl",
  "assetManagement",
] as const;

export type Nis2MeasureId = (typeof MEASURE_IDS)[number];

/** The 8 fixed security-domain keys, canonical order (backend contract). */
export const DOMAIN_KEYS = [
  "risk",
  "incident",
  "bcp",
  "supplyChain",
  "asset",
  "training",
  "access",
  "policy",
] as const;

export type Nis2DomainKey = (typeof DOMAIN_KEYS)[number];

/** Compliance state of one Article 21 measure. */
export type Nis2MeasureStatus = "compliant" | "at-risk" | "non-compliant" | "no-data";

/** Rollup state of one security domain. */
export type Nis2DomainStatus = "healthy" | "watch" | "critical" | "no-data";

/* --- nis2Dashboard.controlHealth ------------------------------------- */

/** One label/value evidence chip attached to a measure. */
export interface Nis2MeasureMetric {
  label: string;
  value: string;
}

/** One Article 21 measure returned by controlHealth. */
export interface Nis2Measure {
  /** Stable slug from MEASURE_IDS. */
  id: string;
  /** NIS2 article citation, e.g. "Art. 21(2)(d)". */
  article: string;
  title: string;
  status: Nis2MeasureStatus;
  /** Effectiveness score 0-100 (higher = better; 0 when no-data). */
  score: number;
  metrics: Nis2MeasureMetric[];
  /** Open alerts feeding this measure. */
  alertCount: number;
}

/** Input of nis2Dashboard.controlHealth. */
export interface Nis2ControlHealthInput {
  clientId: number;
}

/** Output of nis2Dashboard.controlHealth. */
export interface Nis2ControlHealthResponse {
  /** Canonical-order measures (UI sorts defensively via MEASURE_IDS). */
  measures: Nis2Measure[];
  /** ISO-8601 snapshot timestamp. */
  generatedAt: string;
}

/* --- nis2Dashboard.domainSummary ------------------------------------- */

/** One security-domain rollup returned by domainSummary. */
export interface Nis2DomainSummaryEntry {
  /** Stable key from DOMAIN_KEYS. */
  key: string;
  title: string;
  status: Nis2DomainStatus;
  /** Headline fact, e.g. "3 significant incidents open". */
  primary: string;
  /** Supporting fact, e.g. "MTTR 41h vs 72h target". */
  secondary: string;
  alertCount: number;
}

/** Input of nis2Dashboard.domainSummary. */
export interface Nis2DomainSummaryInput {
  clientId: number;
}

/** Output of nis2Dashboard.domainSummary. */
export interface Nis2DomainSummaryResponse {
  domains: Nis2DomainSummaryEntry[];
}

/* --- nis2Dashboard.incidentClock ------------------------------------- */

/** Next regulatory reporting deadline for a significant incident. */
export interface Nis2IncidentDeadline {
  /** Clock label, e.g. "24-hour early warning" / "72-hour notification". */
  label: string;
  /** ISO-8601 due instant. */
  dueAt: string;
  /** Signed hours remaining; negative means overdue. */
  hoursRemaining: number;
  incidentId: number | null;
  incidentTitle: string;
}

/** Input of nis2Dashboard.incidentClock. */
export interface Nis2IncidentClockInput {
  clientId: number;
}

/** Output of nis2Dashboard.incidentClock. */
export interface Nis2IncidentClockResponse {
  openSignificant: number;
  /** Nearest running regulatory clock, or null when calm. */
  nextDeadline: Nis2IncidentDeadline | null;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query result shapes (runtime is a superset)           */
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

interface Nis2DashboardApi {
  nis2Dashboard: {
    controlHealth: {
      useQuery: (
        input: Nis2ControlHealthInput,
        opts?: QueryOptions
      ) => QueryLike<Nis2ControlHealthResponse>;
    };
    domainSummary: {
      useQuery: (
        input: Nis2DomainSummaryInput,
        opts?: QueryOptions
      ) => QueryLike<Nis2DomainSummaryResponse>;
    };
    incidentClock: {
      useQuery: (
        input: Nis2IncidentClockInput,
        opts?: QueryOptions
      ) => QueryLike<Nis2IncidentClockResponse>;
    };
  };
}

export const nis2DashboardApi = trpc as unknown as Nis2DashboardApi;

/** Placeholder input used only while a query is disabled (never rendered). */
const HIDDEN_NIS2_INPUT = { clientId: 0 };

/* ------------------------------------------------------------------ */
/* Empty shapes + predicates - stable degraded defaults (16)           */
/* ------------------------------------------------------------------ */

export const EMPTY_CONTROL_HEALTH: Nis2ControlHealthResponse = {
  measures: [],
  generatedAt: "",
};

export const EMPTY_DOMAIN_SUMMARY: Nis2DomainSummaryResponse = {
  domains: [],
};

export const EMPTY_INCIDENT_CLOCK: Nis2IncidentClockResponse = {
  openSignificant: 0,
  nextDeadline: null,
};

/**
 * True when the control-health payload carries no usable measures.
 * A payload with fewer than the contractual 12 measures still renders
 * (defensive), only a fully-empty payload degrades to EmptyState.
 */
export function isControlHealthEmpty(data?: Nis2ControlHealthResponse | null): boolean {
  return !data || !Array.isArray(data.measures) || data.measures.length === 0;
}

/** True when the domain summary carries no usable domain rollups. */
export function isDomainSummaryEmpty(data?: Nis2DomainSummaryResponse | null): boolean {
  return !data || !Array.isArray(data.domains) || data.domains.length === 0;
}

/**
 * True when the incident-clock payload itself is missing. NOTE: an all-calm
 * clock ({ openSignificant: 0, nextDeadline: null }) is VALID data and must
 * render its calm state, never an EmptyState.
 */
export function isIncidentClockEmpty(data?: Nis2IncidentClockResponse | null): boolean {
  return !data;
}

/**
 * Defensive canonical ordering: backend owns order, but a partial/out-of-order
 * payload must not shuffle the Article 21 grid. Unknown ids keep arrival order
 * at the end so nothing silently disappears.
 */
export function sortMeasuresCanonically(measures: Nis2Measure[]): Nis2Measure[] {
  const rank = new Map<string, number>(MEASURE_IDS.map((id, index) => [id, index]));
  return [...measures].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra === undefined && rb === undefined) return 0;
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return ra - rb;
  });
}

/** Same defensive canonical ordering for the 8 domain keys. */
export function sortDomainsCanonically(domains: Nis2DomainSummaryEntry[]): Nis2DomainSummaryEntry[] {
  const rank = new Map<string, number>(DOMAIN_KEYS.map((key, index) => [key, index]));
  return [...domains].sort((a, b) => {
    const ra = rank.get(a.key);
    const rb = rank.get(b.key);
    if (ra === undefined && rb === undefined) return 0;
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return ra - rb;
  });
}

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)         */
/* ------------------------------------------------------------------ */

/**
 * Article 21 control health across the 12 ENISA measures. Client-scoped -
 * pass null for `input` to keep the query disabled (demo mode renders its
 * own builder payload instead).
 */
export function useNis2ControlHealth(
  input: Nis2ControlHealthInput | null,
  enabled = true
): QueryLike<Nis2ControlHealthResponse> {
  return nis2DashboardApi.nis2Dashboard.controlHealth.useQuery(input ?? HIDDEN_NIS2_INPUT, {
    enabled: enabled && input !== null && input.clientId > 0,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Security-domain rollups across the 8 canonical domains. Client-scoped -
 * pass null for `input` to keep the query disabled.
 */
export function useNis2DomainSummary(
  input: Nis2DomainSummaryInput | null,
  enabled = true
): QueryLike<Nis2DomainSummaryResponse> {
  return nis2DashboardApi.nis2Dashboard.domainSummary.useQuery(input ?? HIDDEN_NIS2_INPUT, {
    enabled: enabled && input !== null && input.clientId > 0,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Significant-incident counter + nearest regulatory clock. Client-scoped -
 * pass null for `input` to keep the query disabled.
 */
export function useNis2IncidentClock(
  input: Nis2IncidentClockInput | null,
  enabled = true
): QueryLike<Nis2IncidentClockResponse> {
  return nis2DashboardApi.nis2Dashboard.incidentClock.useQuery(input ?? HIDDEN_NIS2_INPUT, {
    enabled: enabled && input !== null && input.clientId > 0,
    retry: false,
    staleTime: 15_000,
  });
}

/* ------------------------------------------------------------------ */
/* Meta helpers (badges token-based; bars/cells use the documented     */
/* data-viz exception with dark: variants - UI-STANDARD 2 + 18)        */
/* ------------------------------------------------------------------ */

export interface MeasureStatusMeta {
  label: string;
  badgeVariant: Nis2BadgeVariant;
  /** Score-bar fill classes (data-viz exception, dark-mode paired). */
  barClass: Nis2VizClass;
  /** Token-based status text class. */
  textClass: string;
}

/** Measure compliance state -> badge + bar + text styling. */
export const MEASURE_STATUS_META: Record<Nis2MeasureStatus, MeasureStatusMeta> = {
  compliant: {
    label: "Compliant",
    badgeVariant: "success",
    barClass: "bg-emerald-500 dark:bg-emerald-400",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  "at-risk": {
    label: "At Risk",
    badgeVariant: "warning",
    barClass: "bg-amber-500 dark:bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  "non-compliant": {
    label: "Non-Compliant",
    badgeVariant: "error",
    barClass: "bg-red-500 dark:bg-red-400",
    textClass: "text-red-600 dark:text-red-400",
  },
  "no-data": {
    label: "No Data",
    badgeVariant: "outline",
    barClass: "bg-muted-foreground/30 dark:bg-muted-foreground/40",
    textClass: "text-muted-foreground",
  },
};

export interface DomainStatusMeta {
  label: string;
  badgeVariant: Nis2BadgeVariant;
  /** Left accent border classes (semantic tokens, UI-STANDARD 2). */
  accentClass: string;
  /** Token-based status text class. */
  textClass: string;
}

/** Domain rollup state -> badge + accent styling. */
export const DOMAIN_STATUS_META: Record<Nis2DomainStatus, DomainStatusMeta> = {
  healthy: {
    label: "Healthy",
    badgeVariant: "success",
    accentClass: "border-l-[var(--success)]",
    textClass: "text-[var(--success)] dark:text-emerald-400",
  },
  watch: {
    label: "Watch",
    badgeVariant: "warning",
    accentClass: "border-l-[var(--warning)]",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    label: "Critical",
    badgeVariant: "error",
    accentClass: "border-l-[var(--error)]",
    textClass: "text-red-600 dark:text-red-400",
  },
  "no-data": {
    label: "No Data",
    badgeVariant: "outline",
    accentClass: "border-l-border",
    textClass: "text-muted-foreground",
  },
};

/** Heat bands driving score bars + the Article 21 heatmap strip. */
export type HeatBand = "green" | "amber" | "red" | "empty";

export interface HeatBandMeta {
  label: string;
  /** Legend/heatmap cell fill (data-viz exception, dark-mode paired). */
  cellClass: Nis2VizClass;
  /** Small text on/near the band (token-based). */
  textClass: string;
}

/** Heat band -> cell fill + label styling. */
export const HEAT_BAND_META: Record<HeatBand, HeatBandMeta> = {
  green: {
    label: "Strong",
    cellClass: "bg-emerald-500 dark:bg-emerald-400",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    label: "Watch",
    cellClass: "bg-amber-500 dark:bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  red: {
    label: "Critical",
    cellClass: "bg-red-500 dark:bg-red-400",
    textClass: "text-red-600 dark:text-red-400",
  },
  empty: {
    label: "No data",
    cellClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Clamp a score into the contractual 0-100 range (guards bad payloads). */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Format a 0-100 score as a compact integer string ("86"). Non-finite
 * payloads degrade to "0" so bars/tooltips never render "NaN".
 */
export function formatScore(score: number): string {
  return String(clampScore(score));
}

/**
 * Map a measure/domain status OR a numeric score onto the shared heat band.
 * Statuses win over scores when given; numeric scores band at >=80 green,
 * >=50 amber, else red. Non-finite scores band to "empty".
 */
export function heatBand(input: Nis2MeasureStatus | Nis2DomainStatus | number): HeatBand {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return "empty";
    if (input >= 80) return "green";
    if (input >= 50) return "amber";
    return "red";
  }
  switch (input) {
    case "compliant":
    case "healthy":
      return "green";
    case "at-risk":
    case "watch":
      return "amber";
    case "non-compliant":
    case "critical":
      return "red";
    default:
      return "empty";
  }
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the demo payload is deterministic: every deadline and
 * timestamp derives from this instant (never Date.now at module level).
 */
export const DEMO_NIS2_BASE_DATE = new Date("2026-09-15T00:00:00.000Z");

const HOURS_MS = 3_600_000;

/** ISO instant `hours` from the fixed demo base (may be negative). */
const demoIso = (hoursFromBase: number): string =>
  new Date(DEMO_NIS2_BASE_DATE.getTime() + hoursFromBase * HOURS_MS).toISOString();

/** Input object for nis2Dashboard.controlHealth in demo mode. */
export function buildDemoControlHealthInput(): Nis2ControlHealthInput {
  return { clientId: 0 };
}

/** Compute the demo control-health view-model (mirrors controlHealth output). */
export function buildDemoControlHealth(): Nis2ControlHealthResponse {
  // Exactly the 12 contractual measure ids, canonical order.
  const demoMeasures: Nis2Measure[] = [
    {
      id: "policies",
      article: "Art. 21(2)(a)",
      title: "Policies on risk analysis & information security",
      status: "compliant",
      score: 88,
      metrics: [
        { label: "Approved policies", value: "14/14" },
        { label: "Last board review", value: "Aug 2026" },
      ],
      alertCount: 0,
    },
    {
      id: "riskManagement",
      article: "Art. 21(2)(a)",
      title: "Risk-management measures",
      status: "at-risk",
      score: 74,
      metrics: [
        { label: "Risks past review", value: "4" },
        { label: "High risks untreated", value: "2" },
      ],
      alertCount: 2,
    },
    {
      id: "incidentHandling",
      article: "Art. 21(2)(b)",
      title: "Incident handling",
      status: "compliant",
      score: 84,
      metrics: [
        { label: "Playbooks exercised", value: "6/6" },
        { label: "Mean triage time", value: "38 min" },
      ],
      alertCount: 0,
    },
    {
      id: "businessContinuity",
      article: "Art. 21(2)(c)",
      title: "Business continuity, backup & crisis management",
      status: "at-risk",
      score: 71,
      metrics: [
        { label: "Backup restore tests", value: "9/10" },
        { label: "DR drill overdue", value: "1 site" },
      ],
      alertCount: 1,
    },
    {
      id: "supplyChain",
      article: "Art. 21(2)(d)",
      title: "Supply chain security",
      status: "non-compliant",
      score: 44,
      metrics: [
        { label: "Vendors unassessed", value: "3" },
        { label: "Critical SBOM gaps", value: "5" },
      ],
      alertCount: 3,
    },
    {
      id: "vulnerabilityMgmt",
      article: "Art. 21(2)(e)",
      title: "Security in acquisition & vulnerability handling",
      status: "at-risk",
      score: 68,
      metrics: [
        { label: "Criticals > 30d old", value: "7" },
        { label: "Patch SLA met", value: "91%" },
      ],
      alertCount: 2,
    },
    {
      id: "effectiveness",
      article: "Art. 21(2)(f)",
      title: "Effectiveness of risk-management measures",
      status: "compliant",
      score: 79,
      metrics: [
        { label: "KPIs reported", value: "11/12" },
        { label: "Drift alerts", value: "1 low" },
      ],
      alertCount: 0,
    },
    {
      id: "cyberHygiene",
      article: "Art. 21(2)(g)",
      title: "Basic cyber hygiene practices & training",
      status: "compliant",
      score: 82,
      metrics: [
        { label: "Phishing sim pass", value: "94%" },
        { label: "Staff trained", value: "212/228" },
      ],
      alertCount: 0,
    },
    {
      id: "cryptography",
      article: "Art. 21(2)(h)",
      title: "Cryptography & encryption policies",
      status: "compliant",
      score: 91,
      metrics: [
        { label: "TLS 1.2+ endpoints", value: "99.2%" },
        { label: "Keys rotated < 90d", value: "100%" },
      ],
      alertCount: 0,
    },
    {
      id: "hrSecurity",
      article: "Art. 21(2)(i)",
      title: "HR security & access control concepts",
      status: "at-risk",
      score: 66,
      metrics: [
        { label: "Joiner/leaver SLA", value: "96%" },
        { label: "Offboarding backlog", value: "2" },
      ],
      alertCount: 1,
    },
    {
      id: "accessControl",
      article: "Art. 21(2)(i)",
      title: "Access & asset management policies",
      status: "compliant",
      score: 87,
      metrics: [
        { label: "MFA coverage", value: "97%" },
        { label: "Privileged reviews", value: "Q3 done" },
      ],
      alertCount: 0,
    },
    {
      id: "assetManagement",
      article: "Art. 21(2)(i)",
      title: "Asset inventory & management",
      status: "no-data",
      score: 0,
      metrics: [{ label: "Collector sync", value: "pending" }],
      alertCount: 0,
    },
  ];

  return {
    measures: sortMeasuresCanonically(demoMeasures),
    generatedAt: demoIso(-2),
  };
}

/** Input object for nis2Dashboard.domainSummary in demo mode. */
export function buildDemoDomainSummaryInput(): Nis2DomainSummaryInput {
  return { clientId: 0 };
}

/** Compute the demo domain view-model (mirrors domainSummary output). */
export function buildDemoDomainSummary(): Nis2DomainSummaryResponse {
  // Exactly the 8 contractual domain keys, canonical order.
  const demoDomains: Nis2DomainSummaryEntry[] = [
    {
      key: "risk",
      title: "Risk Management",
      status: "healthy",
      primary: "Risk register current",
      secondary: "38 active risks · 4 high",
      alertCount: 0,
    },
    {
      key: "incident",
      title: "Incident Response",
      status: "watch",
      primary: "3 significant incidents open",
      secondary: "MTTR 41h vs 72h target",
      alertCount: 2,
    },
    {
      key: "bcp",
      title: "Business Continuity",
      status: "watch",
      primary: "DR test overdue at 1 site",
      secondary: "Last full drill Mar 2026",
      alertCount: 1,
    },
    {
      key: "supplyChain",
      title: "Supply Chain",
      status: "critical",
      primary: "3 critical vendors unassessed",
      secondary: "12 critical vendors tracked",
      alertCount: 4,
    },
    {
      key: "asset",
      title: "Asset Management",
      status: "healthy",
      primary: "Inventory sweep current",
      secondary: "1,284 managed assets",
      alertCount: 0,
    },
    {
      key: "training",
      title: "Training & Hygiene",
      status: "healthy",
      primary: "Phishing sim pass 94%",
      secondary: "Next campaign Oct 2026",
      alertCount: 0,
    },
    {
      key: "access",
      title: "Access Control",
      status: "watch",
      primary: "MFA coverage 97%",
      secondary: "6 privileged accounts in review",
      alertCount: 1,
    },
    {
      key: "policy",
      title: "Policy & Governance",
      status: "healthy",
      primary: "All policies acknowledged",
      secondary: "98% acknowledgement rate",
      alertCount: 0,
    },
  ];

  return { domains: sortDomainsCanonically(demoDomains) };
}

/** Input object for nis2Dashboard.incidentClock in demo mode. */
export function buildDemoIncidentClockInput(): Nis2IncidentClockInput {
  return { clientId: 0 };
}

/**
 * Compute the demo incident-clock view-model (mirrors incidentClock output).
 * The 24h early-warning deadline sits 18h from the fixed demo base, so
 * hoursRemaining is a deterministic 18 - no Date.now anywhere.
 */
export function buildDemoIncidentClock(): Nis2IncidentClockResponse {
  const dueAt = demoIso(18);
  const hoursRemaining = Math.round(
    (new Date(dueAt).getTime() - DEMO_NIS2_BASE_DATE.getTime()) / HOURS_MS
  );
  return {
    openSignificant: 3,
    nextDeadline: {
      label: "24-hour early warning",
      dueAt,
      hoursRemaining,
      incidentId: 4711,
      incidentTitle: "Ransomware staging detected on file server",
    },
  };
}
