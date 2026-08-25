/**
 * Federal Workflow Intelligence — data contract + hooks (GAP-22)
 * ==============================================================
 * UI-side typed view of the `federalWorkflows.*` tRPC procedures consumed by
 * `pages/federal/FederalWorkflowsPanels.tsx` (rendered as the trailing
 * section of `pages/federal/FederalHub.tsx`).
 *
 * WHY THIS MODULE EXISTS (UI-STANDARD §16 — typed contract layer):
 * the router is assembled through a factory
 * (`createFederalWorkflowRouter`, packages/core/src/server/routers/federal-workflows.ts,
 * mounted at key `federalWorkflows` in packages/core/src/routers.ts),
 * a pattern under which AppRouter type inference collapses, so raw
 * `trpc.federalWorkflows.*` call sites fail with TS2339 at compile time even
 * though the endpoints are live. Per §16 we declare the expected input/output
 * contracts here, cast the tRPC client once, and export `retry: false` hooks
 * that the panel consumes instead of raw `trpc.federalWorkflows.*` calls.
 * Runtime behavior is identical to the direct calls.
 *
 * -----------------------------------------------------------------------
 * Mirrored procedures (packages/core/src/server/routers/federal-workflows.ts):
 *
 * 1) federalWorkflows.getSprsBreakdown   (clientProcedure query)
 *    input:  { clientId }
 *    output: SprsBreakdownResult            // live SPRS score from POA&M state
 *
 * 2) federalWorkflows.getReportingClocks (clientProcedure query)
 *    input:  { clientId }
 *    output: ReportingClocksResult          // DFARS 7012 / CIRCIA 72h clocks
 *
 * 3) federalWorkflows.getConMonDashboard (clientProcedure query)
 *    input:  { clientId }
 *    output: ConMonDashboardResult          // control posture + POA&M aging
 *
 * 4) federalWorkflows.getCmmcReadiness   (clientProcedure query)
 *    input:  { clientId }
 *    output: CmmcReadinessResult            // SS/PB proxy band + gaps
 *                                           // (early-return {ready:false} when no SSP)
 *
 * 5) federalWorkflows.syncSarToPoam      (clientProcedure mutation)
 *    input:  { clientId, sarId }
 *    output: SyncSarToPoamResult
 *
 * 6) federalWorkflows.exportSspOscal     (clientProcedure mutation)
 *    input:  { clientId, sspId }
 *    output: OscalExportPayload             // OSCAL 1.1.2 SSP document
 *
 * 7) federalWorkflows.exportPoamOscal    (clientProcedure mutation)
 *    input:  { clientId, poamId }
 *    output: OscalExportPayload             // OSCAL 1.1.2 POA&M document
 *
 * 8) federalWorkflows.exportPoamEmassCsv (clientProcedure mutation)
 *    input:  { clientId, poamId }
 *    output: EmassCsvExportResult           // { filename, csv, itemCount }
 *
 * 9) federalWorkflows.cmmcPractices       (protected pure query)
 *    input:  { family?, level?, search? }  // zod-guarded, all optional
 *    output: CmmcRegisterResult            // NIST SP 800-171 Rev 2 register
 *                                           // (families = full-register
 *                                           // rollup; practices honor filter)
 * -----------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

/**
 * Output of federalWorkflows.getSprsBreakdown — DoD Assessment Methodology
 * score computed live from open POA&M items (starts at 110).
 */
export interface SprsBreakdownResult {
  /** Always 110 under the basic self-assessment model. */
  startingScore: number;
  /** Total points deducted across affected 800-171 families. */
  deduction: number;
  /** startingScore - deduction, floor 0. */
  score: number;
  /** Distinct unmet 800-171 practice numbers feeding the deduction. */
  unmetPracticeCount: number;
  /** Affected NIST 800-171 control families, e.g. "3.1", "3.13". */
  familiesAffected: string[];
  /** Open POA&M item count that produced the deduction. */
  openPoamItems: number;
  note?: string | null;
}

/** One incident's DFARS 252.204-7012 / CIRCIA reporting clock. */
export interface ReportingClock {
  incidentId: number;
  title?: string | null;
  severity?: string | null;
  detectedAt?: string | Date | null;
  reportedToAuthorities?: boolean | null;
  dfars7012Applies?: boolean | null;
  /** ISO timestamp of detection + 72h. */
  dfarsReportDueBy?: string | Date | null;
  /** Null once reported. */
  hoursRemainingForDibNet?: number | null;
  /** Raw server status, e.g. "reported" | "on-track" | "URGENT (<24h)" | "OVERDUE" | "unknown". */
  dibnetStatus?: string | null;
  circiaReportDueBy?: string | Date | null;
  /** "reported" | "pending" | ... */
  circiaStatus?: string | null;
  /** Detection + 90 days evidence-retention horizon. */
  evidenceRetentionUntil?: string | Date | null;
  /** Significant incidents must feed FISMA reporting. */
  fismaFeedRequired?: boolean | null;
}

export interface ReportingClocksResult {
  clocks: ReportingClock[];
  note?: string | null;
}

/** Control-posture rollup across the workspace SSPs. */
export interface ConMonControlPosture {
  total: number;
  implemented: number;
  partial: number;
  inherited: number;
}

/** One past-due, still-open POA&M item (continuous-monitoring aging). */
export interface ConMonOverduePoamItem {
  id: number;
  weakness?: string | null;
  /** original_risk_rating, e.g. "high" | "moderate" | "low". */
  risk?: string | null;
  daysOverdue: number;
}

/** RMF workflow step summary row. */
export interface ConMonRmfStep {
  system?: string | null;
  currentStep?: string | number | null;
  status?: string | null;
}

/** One FISMA system row of the ConMon dashboard. */
export interface ConMonSystem {
  id: number;
  name?: string | null;
  acronym?: string | null;
  /** FIPS 199 overall impact level: low | moderate | high. */
  fips199?: string | null;
  status?: string | null;
  /** 3-year re-authorization proxy (updatedAt + 3y). */
  authorizationCycleEnds?: string | Date | null;
}

/** Output of federalWorkflows.getConMonDashboard. */
export interface ConMonDashboardResult {
  systems: ConMonSystem[];
  controlPosture: ConMonControlPosture;
  overduePoamItems: ConMonOverduePoamItem[];
  rmfSteps: ConMonRmfStep[];
  significantChangePending: boolean;
}

/**
 * Output of federalWorkflows.getCmmcReadiness. The endpoint early-returns
 * `{ ready: false, reason: "No SSP on file" }` when the client has no SSP —
 * the normalizer maps that onto the zeroed shape with `ready`/`reason` set,
 * and `isEmptyCmmcReadiness` detects it for the degraded render.
 */
export interface CmmcReadinessResult {
  assessedControls: number;
  implemented: number;
  partial: number;
  planned: number;
  evidenceBackedControls: number;
  openWeaknesses: number;
  /** 0-100 SS/PB-weighted readiness percentage. */
  readinessPct: number;
  /** Band label from the server, e.g. "SS/PB 3 (Generally Effective)". */
  ssPBProxy?: string | null;
  cmmcL2Target?: string | null;
  gapsToClose: string[];
  ready?: boolean | null;
  reason?: string | null;
}

/** Inputs of the export/sync mutations (mirror the zod schemas). */
export interface SyncSarToPoamInput {
  clientId: number;
  sarId: number;
}
export interface SspOscalExportInput {
  clientId: number;
  sspId: number;
}
export interface PoamOscalExportInput {
  clientId: number;
  poamId: number;
}
export interface EmassCsvExportInput {
  clientId: number;
  poamId: number;
}

/** Result of federalWorkflows.syncSarToPoam. */
export interface SyncSarToPoamResult {
  poamId: number;
  findingsTotal: number;
  actionable: number;
  created: number;
}

/**
 * Shape of the two OSCAL export payloads. The documents carry model-specific
 * sections (systemCharacteristics/controlImplementationSrc for SSPs,
 * observations/tasks for POA&Ms) which stay opaque here — the panel serializes
 * whatever arrives into a JSON download.
 */
export interface OscalExportPayload {
  oscalVersion?: string;
  uuid?: string;
  metadata?: {
    title?: string;
    lastModified?: string;
    version?: string;
    oscalModel?: string;
  };
  [key: string]: unknown;
}

/** Result of federalWorkflows.exportPoamEmassCsv. */
export interface EmassCsvExportResult {
  filename?: string;
  csv?: string;
  itemCount?: number;
  note?: string | null;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset)  */
/* ------------------------------------------------------------------ */

export interface FederalWorkflowQueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export interface FederalWorkflowMutationLike<TInput, TResult> {
  mutate: (
    input: TInput,
    options?: {
      onSuccess?: (data: TResult) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
}

interface FederalWorkflowQueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
}

/** Error shape surfaced by tRPC (only what the UI reads). */
export interface FederalWorkflowTrpcError {
  message?: string;
}

/* ------------------------------------------------------------------ */
/* One-time client cast (UI-STANDARD §16)                              */
/* ------------------------------------------------------------------ */

interface FederalWorkflowsTrpcContract {
  federalWorkflows: {
    getSprsBreakdown: {
      useQuery: (
        input: { clientId: number },
        opts?: FederalWorkflowQueryOptions
      ) => FederalWorkflowQueryLike<SprsBreakdownResult>;
    };
    getReportingClocks: {
      useQuery: (
        input: { clientId: number },
        opts?: FederalWorkflowQueryOptions
      ) => FederalWorkflowQueryLike<ReportingClocksResult>;
    };
    getConMonDashboard: {
      useQuery: (
        input: { clientId: number },
        opts?: FederalWorkflowQueryOptions
      ) => FederalWorkflowQueryLike<ConMonDashboardResult>;
    };
    getCmmcReadiness: {
      useQuery: (
        input: { clientId: number },
        opts?: FederalWorkflowQueryOptions
      ) => FederalWorkflowQueryLike<CmmcReadinessResult>;
    };
    syncSarToPoam: {
      useMutation: (opts?: {
        retry?: boolean | number;
        onSuccess?: (data: SyncSarToPoamResult) => void;
        onError?: (error: FederalWorkflowTrpcError) => void;
      }) => FederalWorkflowMutationLike<SyncSarToPoamInput, SyncSarToPoamResult>;
    };
    exportSspOscal: {
      useMutation: (opts?: {
        retry?: boolean | number;
        onSuccess?: (data: OscalExportPayload) => void;
        onError?: (error: FederalWorkflowTrpcError) => void;
      }) => FederalWorkflowMutationLike<SspOscalExportInput, OscalExportPayload>;
    };
    exportPoamOscal: {
      useMutation: (opts?: {
        retry?: boolean | number;
        onSuccess?: (data: OscalExportPayload) => void;
        onError?: (error: FederalWorkflowTrpcError) => void;
      }) => FederalWorkflowMutationLike<PoamOscalExportInput, OscalExportPayload>;
    };
    exportPoamEmassCsv: {
      useMutation: (opts?: {
        retry?: boolean | number;
        onSuccess?: (data: EmassCsvExportResult) => void;
        onError?: (error: FederalWorkflowTrpcError) => void;
      }) => FederalWorkflowMutationLike<EmassCsvExportInput, EmassCsvExportResult>;
    };
    cmmcPractices: {
      useQuery: (
        input: CmmcPracticesInput,
        opts?: FederalWorkflowQueryOptions
      ) => FederalWorkflowQueryLike<CmmcRegisterResult>;
    };
  };
}

const federalWorkflowsApi = trpc as unknown as FederalWorkflowsTrpcContract;

/* ------------------------------------------------------------------ */
/* Hooks — queries, retry: false everywhere (UI-STANDARD §16)          */
/* ------------------------------------------------------------------ */

/** Live SPRS score breakdown from open POA&M items (getSprsBreakdown). */
export function useSprsBreakdownQuery(
  clientId: number
): FederalWorkflowQueryLike<SprsBreakdownResult> {
  return federalWorkflowsApi.federalWorkflows.getSprsBreakdown.useQuery(
    { clientId },
    { enabled: clientId > 0, retry: false }
  );
}

/** DFARS 7012 / CIRCIA reporting clocks per incident (getReportingClocks). */
export function useReportingClocksQuery(
  clientId: number
): FederalWorkflowQueryLike<ReportingClocksResult> {
  return federalWorkflowsApi.federalWorkflows.getReportingClocks.useQuery(
    { clientId },
    { enabled: clientId > 0, retry: false }
  );
}

/** Continuous-monitoring dashboard: posture + POA&M aging (getConMonDashboard). */
export function useConMonDashboardQuery(
  clientId: number
): FederalWorkflowQueryLike<ConMonDashboardResult> {
  return federalWorkflowsApi.federalWorkflows.getConMonDashboard.useQuery(
    { clientId },
    { enabled: clientId > 0, retry: false }
  );
}

/** CMMC L2 readiness band + gaps (getCmmcReadiness). */
export function useCmmcReadinessQuery(
  clientId: number
): FederalWorkflowQueryLike<CmmcReadinessResult> {
  return federalWorkflowsApi.federalWorkflows.getCmmcReadiness.useQuery(
    { clientId },
    { enabled: clientId > 0, retry: false }
  );
}

/* ------------------------------------------------------------------ */
/* Hooks — mutations, retry: false everywhere (UI-STANDARD §16)        */
/* ------------------------------------------------------------------ */

/** SAR findings → POA&M sync (syncSarToPoam). */
export function useSyncSarToPoamMutation(handlers?: {
  onSuccess?: (data: SyncSarToPoamResult) => void;
  onError?: (error: FederalWorkflowTrpcError) => void;
}): FederalWorkflowMutationLike<SyncSarToPoamInput, SyncSarToPoamResult> {
  return federalWorkflowsApi.federalWorkflows.syncSarToPoam.useMutation({
    ...(handlers ?? {}),
    retry: false,
  });
}

/** SSP → OSCAL 1.1.2 JSON document (exportSspOscal). */
export function useExportSspOscalMutation(handlers?: {
  onSuccess?: (data: OscalExportPayload) => void;
  onError?: (error: FederalWorkflowTrpcError) => void;
}): FederalWorkflowMutationLike<SspOscalExportInput, OscalExportPayload> {
  return federalWorkflowsApi.federalWorkflows.exportSspOscal.useMutation({
    ...(handlers ?? {}),
    retry: false,
  });
}

/** POA&M → OSCAL 1.1.2 JSON document (exportPoamOscal). */
export function useExportPoamOscalMutation(handlers?: {
  onSuccess?: (data: OscalExportPayload) => void;
  onError?: (error: FederalWorkflowTrpcError) => void;
}): FederalWorkflowMutationLike<PoamOscalExportInput, OscalExportPayload> {
  return federalWorkflowsApi.federalWorkflows.exportPoamOscal.useMutation({
    ...(handlers ?? {}),
    retry: false,
  });
}

/** POA&M → eMASS-compatible CSV (exportPoamEmassCsv). */
export function useExportPoamEmassCsvMutation(handlers?: {
  onSuccess?: (data: EmassCsvExportResult) => void;
  onError?: (error: FederalWorkflowTrpcError) => void;
}): FederalWorkflowMutationLike<EmassCsvExportInput, EmassCsvExportResult> {
  return federalWorkflowsApi.federalWorkflows.exportPoamEmassCsv.useMutation({
    ...(handlers ?? {}),
    retry: false,
  });
}

/* ------------------------------------------------------------------ */
/* Tolerant normalizers (defensive against partial payloads)           */
/* ------------------------------------------------------------------ */

function toNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function toStrOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toDateLike(value: unknown): string | Date | null {
  if (value instanceof Date) return value;
  return toStrOrNull(value);
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeSprsBreakdown(raw: unknown): SprsBreakdownResult {
  const src = isRecord(raw) ? raw : {};
  const familiesAffected = toArray<string>(src.familiesAffected).filter(
    (family) => typeof family === "string"
  );
  return {
    startingScore: toNum(src.startingScore, 110),
    deduction: toNum(src.deduction),
    score: toNum(src.score),
    unmetPracticeCount: toNum(src.unmetPracticeCount),
    familiesAffected,
    openPoamItems: toNum(src.openPoamItems),
    note: toStrOrNull(src.note),
  };
}

export function normalizeReportingClocks(raw: unknown): ReportingClocksResult {
  const src = isRecord(raw) ? raw : {};
  const clocks = toArray<Record<string, unknown>>(src.clocks).map((entry) => ({
    incidentId: toNum(entry.incidentId),
    title: toStrOrNull(entry.title),
    severity: toStrOrNull(entry.severity),
    detectedAt: toDateLike(entry.detectedAt),
    reportedToAuthorities: entry.reportedToAuthorities === true,
    dfars7012Applies: entry.dfars7012Applies === true,
    dfarsReportDueBy: toDateLike(entry.dfarsReportDueBy),
    hoursRemainingForDibNet:
      entry.hoursRemainingForDibNet === null || entry.hoursRemainingForDibNet === undefined
        ? null
        : toNum(entry.hoursRemainingForDibNet),
    dibnetStatus: toStrOrNull(entry.dibnetStatus),
    circiaReportDueBy: toDateLike(entry.circiaReportDueBy),
    circiaStatus: toStrOrNull(entry.circiaStatus),
    evidenceRetentionUntil: toDateLike(entry.evidenceRetentionUntil),
    fismaFeedRequired: entry.fismaFeedRequired === true,
  }));
  return {
    clocks,
    note: toStrOrNull(src.note),
  };
}

export function normalizeConMonDashboard(raw: unknown): ConMonDashboardResult {
  const src = isRecord(raw) ? raw : {};
  const postureSrc = isRecord(src.controlPosture) ? src.controlPosture : {};
  const posture = {
    total: toNum(postureSrc.total),
    implemented: toNum(postureSrc.implemented),
    partial: toNum(postureSrc.partial),
    inherited: toNum(postureSrc.inherited),
  };
  const overduePoamItems = toArray<Record<string, unknown>>(src.overduePoamItems).map(
    (entry) => ({
      id: toNum(entry.id),
      weakness: toStrOrNull(entry.weakness),
      risk: toStrOrNull(entry.risk),
      daysOverdue: toNum(entry.daysOverdue),
    })
  );
  return {
    systems: toArray<Record<string, unknown>>(src.systems).map((entry) => ({
      id: toNum(entry.id),
      name: toStrOrNull(entry.name),
      acronym: toStrOrNull(entry.acronym),
      fips199: toStrOrNull(entry.fips199),
      status: toStrOrNull(entry.status),
      authorizationCycleEnds: toDateLike(entry.authorizationCycleEnds),
    })),
    controlPosture: posture,
    overduePoamItems,
    rmfSteps: toArray<Record<string, unknown>>(src.rmfSteps).map((entry) => ({
      system: toStrOrNull(entry.system),
      currentStep:
        typeof entry.currentStep === "number" || typeof entry.currentStep === "string"
          ? entry.currentStep
          : null,
      status: toStrOrNull(entry.status),
    })),
    significantChangePending: src.significantChangePending === true,
  };
}

export function normalizeCmmcReadiness(raw: unknown): CmmcReadinessResult {
  const src = isRecord(raw) ? raw : {};
  const hasNumbers =
    src.assessedControls !== undefined ||
    src.readinessPct !== undefined ||
    src.implemented !== undefined;
  // Early "No SSP on file" shape → zeroed readiness with the reason intact.
  if (!hasNumbers) {
    return {
      ...EMPTY_CMMC_READINESS,
      reason: toStrOrNull(src.reason) ?? "No SSP on file",
      ready: false,
    };
  }
  return {
    assessedControls: toNum(src.assessedControls),
    implemented: toNum(src.implemented),
    partial: toNum(src.partial),
    planned: toNum(src.planned),
    evidenceBackedControls: toNum(src.evidenceBackedControls),
    openWeaknesses: toNum(src.openWeaknesses),
    readinessPct: toNum(src.readinessPct),
    ssPBProxy: toStrOrNull(src.ssPBProxy),
    cmmcL2Target: toStrOrNull(src.cmmcL2Target),
    gapsToClose: toArray<string>(src.gapsToClose).filter((gap) => typeof gap === "string"),
    ready: typeof src.ready === "boolean" ? src.ready : null,
    reason: toStrOrNull(src.reason),
  };
}

/* ------------------------------------------------------------------ */
/* EMPTY_* shapes + predicates                                         */
/* ------------------------------------------------------------------ */

export const EMPTY_SPRS_BREAKDOWN: SprsBreakdownResult = {
  startingScore: 110,
  deduction: 0,
  score: 110,
  unmetPracticeCount: 0,
  familiesAffected: [],
  openPoamItems: 0,
  note: null,
};

export const EMPTY_REPORTING_CLOCKS: ReportingClocksResult = {
  clocks: [],
  note: null,
};

export const EMPTY_CON_MON_DASHBOARD: ConMonDashboardResult = {
  systems: [],
  controlPosture: { total: 0, implemented: 0, partial: 0, inherited: 0 },
  overduePoamItems: [],
  rmfSteps: [],
  significantChangePending: false,
};

export const EMPTY_CMMC_READINESS: CmmcReadinessResult = {
  assessedControls: 0,
  implemented: 0,
  partial: 0,
  planned: 0,
  evidenceBackedControls: 0,
  openWeaknesses: 0,
  readinessPct: 0,
  ssPBProxy: null,
  cmmcL2Target: null,
  gapsToClose: [],
  ready: false,
  reason: null,
};

export function isEmptySprsBreakdown(result: SprsBreakdownResult): boolean {
  return (
    result.openPoamItems <= 0 &&
    result.deduction <= 0 &&
    result.unmetPracticeCount <= 0
  );
}

export function isEmptyReportingClocks(result: ReportingClocksResult): boolean {
  return result.clocks.length === 0;
}

/** Empty-state titles shared by the panels (copy lives with the contract). */
export const CLOCKS_EMPTY_TITLE = "No incidents on reporting clocks";
export const CONMON_EMPTY_TITLE = "No continuous-monitoring data yet";
export const CMMC_EMPTY_TITLE = "No SSP on file";

export function isEmptyConMonDashboard(result: ConMonDashboardResult): boolean {
  return (
    result.overduePoamItems.length === 0 &&
    result.systems.length === 0 &&
    result.controlPosture.total <= 0
  );
}

export function isEmptyCmmcReadiness(result: CmmcReadinessResult): boolean {
  return result.ready === false || result.assessedControls <= 0;
}

/* ------------------------------------------------------------------ */
/* META maps (bands / statuses → labels + Badge variants)              */
/* ------------------------------------------------------------------ */

export type FederalBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "error"
  | "info";

/** SPRS score bands (max 110 under the DoD Assessment Methodology). */
export interface BandMeta {
  label: string;
  badgeVariant: FederalBadgeVariant;
  barClass: string;
}

export function sprsBandMeta(score: number): BandMeta {
  if (score >= 103) {
    return { label: "Strong posture", badgeVariant: "success", barClass: "bg-[var(--success-foreground)]" };
  }
  if (score >= 88) {
    return { label: "Acceptable", badgeVariant: "info", barClass: "bg-[var(--info-foreground)]" };
  }
  if (score >= 60) {
    return { label: "At risk", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" };
  }
  return { label: "Critical", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" };
}

/** Canonical keys for the raw DIBNet status strings sent by the router. */
export type DibnetStatusKey = "reported" | "urgent" | "overdue" | "on-track" | "unknown";

export function normalizeDibnetStatus(raw: string | null | undefined): DibnetStatusKey {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("report")) return "reported";
  if (value.includes("urgent")) return "urgent";
  if (value.includes("overdue")) return "overdue";
  if (value.includes("track")) return "on-track";
  return "unknown";
}

export const DIBNET_STATUS_META: Record<DibnetStatusKey, BandMeta> = {
  reported: {
    label: "DIBNet reported",
    badgeVariant: "success",
    barClass: "bg-[var(--success-foreground)]",
  },
  "on-track": {
    label: "On track",
    badgeVariant: "success",
    barClass: "bg-[var(--success-foreground)]",
  },
  urgent: {
    label: "URGENT (<24h)",
    badgeVariant: "warning",
    barClass: "bg-[var(--warning-foreground)]",
  },
  overdue: {
    label: "OVERDUE",
    badgeVariant: "error",
    barClass: "bg-[var(--error-foreground)]",
  },
  unknown: {
    label: "Clock unknown",
    badgeVariant: "outline",
    barClass: "bg-muted-foreground",
  },
};

export type CirciaStatusKey = "reported" | "pending" | "unknown";

export function normalizeCirciaStatus(raw: string | null | undefined): CirciaStatusKey {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("report")) return "reported";
  if (value.includes("pending")) return "pending";
  return value ? "pending" : "unknown";
}

export const CIRCIA_STATUS_META: Record<CirciaStatusKey, BandMeta> = {
  reported: {
    label: "CISA reported",
    badgeVariant: "success",
    barClass: "bg-[var(--success-foreground)]",
  },
  pending: {
    label: "Pending",
    badgeVariant: "warning",
    barClass: "bg-[var(--warning-foreground)]",
  },
  unknown: {
    label: "Unknown",
    badgeVariant: "outline",
    barClass: "bg-muted-foreground",
  },
};

export const SEVERITY_META: Record<string, BandMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" },
  high: { label: "High", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" },
  moderate: { label: "Moderate", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" },
  medium: { label: "Medium", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" },
  low: { label: "Low", badgeVariant: "info", barClass: "bg-[var(--info-foreground)]" },
};

export function severityMeta(raw: string | null | undefined): BandMeta {
  const value = (raw ?? "").toLowerCase();
  return SEVERITY_META[value] ?? {
    label: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unrated",
    badgeVariant: "outline",
    barClass: "bg-muted-foreground",
  };
}

export const RISK_RATING_META: Record<string, BandMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" },
  high: { label: "High", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" },
  moderate: { label: "Moderate", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" },
  medium: { label: "Medium", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" },
  low: { label: "Low", badgeVariant: "info", barClass: "bg-[var(--info-foreground)]" },
};

export function riskRatingMeta(raw: string | null | undefined): BandMeta {
  const value = (raw ?? "").toLowerCase();
  return RISK_RATING_META[value] ?? {
    label: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unrated",
    badgeVariant: "outline",
    barClass: "bg-muted-foreground",
  };
}

/** CMMC SS/PB band from the readiness percentage (mirrors server thresholds). */
export function cmmcBandMeta(readinessPct: number): BandMeta {
  if (readinessPct >= 88) {
    return { label: "SS/PB 5 (Effective)", badgeVariant: "success", barClass: "bg-[var(--success-foreground)]" };
  }
  if (readinessPct >= 75) {
    return { label: "SS/PB 4 (Substantially Effective)", badgeVariant: "info", barClass: "bg-[var(--info-foreground)]" };
  }
  if (readinessPct >= 60) {
    return { label: "SS/PB 3 (Generally Effective)", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" };
  }
  if (readinessPct >= 40) {
    return { label: "SS/PB 2 (Partially Effective)", badgeVariant: "warning", barClass: "bg-[var(--warning-foreground)]" };
  }
  return { label: "SS/PB 1 (Inadequate)", badgeVariant: "error", barClass: "bg-[var(--error-foreground)]" };
}

/**
 * Family weights mirrored from the router (FAMILY_WEIGHTS_171) — used purely
 * to scale the per-family deduction bars relative to the heaviest family.
 */
export const FAMILY_WEIGHTS_171: Record<string, number> = {
  "3.1": 32, "3.2": 3, "3.3": 12, "3.4": 7, "3.5": 9,
  "3.6": 9, "3.7": 4, "3.8": 9, "3.9": 3, "3.10": 6,
  "3.11": 6, "3.12": 5, "3.13": 44, "3.14": 8,
};

export function familyWeight(family: string): number {
  return FAMILY_WEIGHTS_171[family] ?? 0;
}

/* ------------------------------------------------------------------ */
/* Formatting + download helpers                                       */
/* ------------------------------------------------------------------ */

/** Tolerant timestamp formatting; returns null when unparsable. */
export function formatWorkflowTimestamp(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Combined DIBNet badge label incl. the live hour countdown when present. */
export function dibnetBadgeLabel(clock: ReportingClock): string {
  const key = normalizeDibnetStatus(clock.dibnetStatus);
  const base = DIBNET_STATUS_META[key].label;
  if (
    (key === "urgent" || key === "on-track") &&
    typeof clock.hoursRemainingForDibNet === "number"
  ) {
    return `${base} · ${clock.hoursRemainingForDibNet}h left`;
  }
  return base;
}

/** Client-side download of an in-memory string via Blob/objectURL. */
export function downloadStringAsFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Filename for an OSCAL JSON download derived from the payload uuid. */
export function oscalFilename(payload: OscalExportPayload | undefined, fallbackBase: string): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const uuid = payload?.uuid ? String(payload.uuid) : null;
  return `${(uuid ?? fallbackBase).replace(/[^\w.-]+/g, "_")}_${dateStamp}.json`;
}

/* ------------------------------------------------------------------ */
/* Demo-mode builders (UI-STANDARD §17)                                */
/*                                                                      */
/* All relative timestamps derive from a FIXED demo clock so the sample */
/* data is deterministic across renders and never drifts.               */
/* ------------------------------------------------------------------ */

/** Fixed demo clock: 2026-09-01T12:00:00Z. */
export const DEMO_NOW_ISO = "2026-09-01T12:00:00.000Z";
const DEMO_NOW_MS = new Date(DEMO_NOW_ISO).getTime();

function isoHoursBeforeNow(hours: number): string {
  return new Date(DEMO_NOW_MS - hours * 3_600_000).toISOString();
}

function isoDaysBeforeNow(days: number): string {
  return new Date(DEMO_NOW_MS - days * 86_400_000).toISOString();
}

export function buildDemoSprsBreakdown(): SprsBreakdownResult {
  return {
    startingScore: 110,
    deduction: 28,
    score: 82,
    unmetPracticeCount: 9,
    familiesAffected: ["3.1", "3.3", "3.11", "3.12", "3.13"],
    openPoamItems: 14,
    note: "Basic self-assessment model per DFARS 252.204-7019/7020. Closing the associated POA&M items raises this score.",
  };
}

export function buildDemoReportingClocks(): ReportingClocksResult {
  return {
    clocks: [
      {
        incidentId: 9021,
        title: "Ransomware indicators on engineering file share",
        severity: "critical",
        detectedAt: isoHoursBeforeNow(96),
        reportedToAuthorities: false,
        dfars7012Applies: true,
        dfarsReportDueBy: isoHoursBeforeNow(24),
        hoursRemainingForDibNet: 0,
        dibnetStatus: "OVERDUE",
        circiaReportDueBy: isoHoursBeforeNow(24),
        circiaStatus: "pending",
        evidenceRetentionUntil: isoDaysBeforeNow(-66), // detection + 90d
        fismaFeedRequired: true,
      },
      {
        incidentId: 9017,
        title: "Credential stuffing burst against VPN gateway",
        severity: "high",
        detectedAt: isoHoursBeforeNow(63),
        reportedToAuthorities: false,
        dfars7012Applies: true,
        dfarsReportDueBy: new Date(DEMO_NOW_MS + 9 * 3_600_000).toISOString(),
        hoursRemainingForDibNet: 9,
        dibnetStatus: "URGENT (<24h)",
        circiaReportDueBy: new Date(DEMO_NOW_MS + 9 * 3_600_000).toISOString(),
        circiaStatus: "pending",
        evidenceRetentionUntil: isoDaysBeforeNow(-27),
        fismaFeedRequired: false,
      },
      {
        incidentId: 9003,
        title: "Malware quarantined on marketing laptop",
        severity: "low",
        detectedAt: isoHoursBeforeNow(8),
        reportedToAuthorities: false,
        dfars7012Applies: true,
        dfarsReportDueBy: new Date(DEMO_NOW_MS + 64 * 3_600_000).toISOString(),
        hoursRemainingForDibNet: 64,
        dibnetStatus: "on-track",
        circiaReportDueBy: new Date(DEMO_NOW_MS + 64 * 3_600_000).toISOString(),
        circiaStatus: "pending",
        evidenceRetentionUntil: isoDaysBeforeNow(-82),
        fismaFeedRequired: false,
      },
      {
        incidentId: 8890,
        title: "Phishing campaign — supplier email compromise attempt",
        severity: "medium",
        detectedAt: isoDaysBeforeNow(30),
        reportedToAuthorities: true,
        dfars7012Applies: true,
        dfarsReportDueBy: isoDaysBeforeNow(29.75),
        hoursRemainingForDibNet: null,
        dibnetStatus: "reported",
        circiaReportDueBy: isoDaysBeforeNow(29.75),
        circiaStatus: "reported",
        evidenceRetentionUntil: isoDaysBeforeNow(-60),
        fismaFeedRequired: false,
      },
    ],
    note: "DFARS 252.204-7012 requires reporting covered cyber incidents to DoD via DIBNet within 72h of detection and preserving images/evidence for 90 days.",
  };
}

export function buildDemoConMonDashboard(): ConMonDashboardResult {
  return {
    systems: [
      {
        id: 31,
        name: "Defense Contract Management Enclave",
        acronym: "DCME",
        fips199: "moderate",
        status: "operating",
        authorizationCycleEnds: isoDaysBeforeNow(-320),
      },
      {
        id: 32,
        name: "CUI Processing Sandbox",
        acronym: "CUI-SBX",
        fips199: "moderate",
        status: "development",
        authorizationCycleEnds: isoDaysBeforeNow(-140),
      },
    ],
    controlPosture: {
      total: 163,
      implemented: 118,
      partial: 27,
      inherited: 18,
    },
    overduePoamItems: [
      { id: 5011, weakness: "AC-2(3) — account reviews not evidenced for Q2", risk: "high", daysOverdue: 214 },
      { id: 5004, weakness: "SC-28 — CUI at rest encryption gaps on legacy NAS", risk: "high", daysOverdue: 96 },
      { id: 4987, weakness: "IR-8 — incident response plan missing tabletop results", risk: "moderate", daysOverdue: 41 },
      { id: 5120, weakness: "CM-6 — configuration baseline drift on jump hosts", risk: "moderate", daysOverdue: 12 },
      { id: 5126, weakness: "AU-6 — audit log review cadence behind schedule", risk: "low", daysOverdue: 3 },
    ],
    rmfSteps: [
      { system: "DCME", currentStep: 6, status: "ongoing" },
      { system: "CUI-SBX", currentStep: 3, status: "in-progress" },
    ],
    significantChangePending: false,
  };
}

export function buildDemoCmmcReadiness(): CmmcReadinessResult {
  return {
    assessedControls: 110,
    implemented: 78,
    partial: 19,
    planned: 13,
    evidenceBackedControls: 84,
    openWeaknesses: 14,
    readinessPct: 61,
    ssPBProxy: "SS/PB 3 (Generally Effective)",
    cmmcL2Target:
      "All 110 NIST 800-171 practices + Annex A at MATURITY LEVEL 3 with full evidence coverage",
    gapsToClose: [
      "19 partially-implemented controls need completion",
      "13 planned-only controls need implementation",
      "26 controls lack linked evidence",
      "14 open POA&M weaknesses",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* CMMC Practice Register — NIST SP 800-171 Rev 2 (cmmcPractices)      */
/*                                                                      */
/* Mirrors `federalWorkflows.cmmcPractices` (protected pure query):     */
/*   input:  { family?, level?, search? }   — zod-guarded, optional     */
/*   output: { total, families[], practices[] }                         */
/* `families` is ALWAYS the full-register rollup; `practices` honor the */
/* current family/level/search filter.                                  */
/* ------------------------------------------------------------------ */

/** CMMC maturity level of a practice (NIST SP 800-171 Rev 2). */
export type CmmcPracticeLevel = 1 | 2 | 3;

/** One NIST SP 800-171 Rev 2 practice row. */
export interface CmmcPractice {
  /** Canonical practice id, e.g. "AC-L1-3.1.1". */
  id: string;
  /** Two-letter family code, e.g. "AC". */
  family: string;
  level: CmmcPracticeLevel;
  /** Short title, e.g. "Limit system access to authorized users". */
  title: string;
  /** Full requirement statement text. */
  requirement: string;
  /** Assessment objective sub-statements. */
  objectives: string[];
}

/** Per-family rollup row with per-level mini-counts. */
export interface CmmcFamilyRollup {
  family: string;
  count: number;
  levels: Record<CmmcPracticeLevel, number>;
}

/** Output of federalWorkflows.cmmcPractices. */
export interface CmmcRegisterResult {
  /** Total practices in the register (110 for full SP 800-171 Rev 2). */
  total: number;
  /** Always the FULL-register family rollup regardless of filters. */
  families: CmmcFamilyRollup[];
  /** Practices honoring the family/level/search filter. */
  practices: CmmcPractice[];
}

/** Input of federalWorkflows.cmmcPractices (all fields optional). */
export interface CmmcPracticesInput {
  family?: string;
  level?: CmmcPracticeLevel;
  search?: string;
}

/**
 * Hook over `trpc.federalWorkflows.cmmcPractices.useQuery` (retry: false,
 * UI-STANDARD §16). Input vars drive server-side filtering; the endpoint is
 * a pure reference query so there is no clientId gate here — panels scope
 * rendering themselves.
 */
export function useCmmcPractices(
  input: CmmcPracticesInput
): FederalWorkflowQueryLike<CmmcRegisterResult> {
  return federalWorkflowsApi.federalWorkflows.cmmcPractices.useQuery(input, {
    retry: false,
  });
}

/** Tolerant normalizer for partial cmmcPractices payloads. */
export function normalizeCmmcRegister(raw: unknown): CmmcRegisterResult {
  const src = isRecord(raw) ? raw : {};
  const levelsOf = (value: unknown): Record<CmmcPracticeLevel, number> => {
    const rec = isRecord(value) ? value : {};
    return {
      1: toNum(rec["1"]),
      2: toNum(rec["2"]),
      3: toNum(rec["3"]),
    };
  };
  const levelOf = (value: unknown): CmmcPracticeLevel => {
    const num = toNum(value);
    if (num === 2) return 2;
    if (num === 3) return 3;
    return 1;
  };
  const practices = toArray<Record<string, unknown>>(src.practices).map((entry) => ({
    id: typeof entry.id === "string" ? entry.id : "",
    family: typeof entry.family === "string" ? entry.family : "",
    level: levelOf(entry.level),
    title: typeof entry.title === "string" ? entry.title : "",
    requirement: typeof entry.requirement === "string" ? entry.requirement : "",
    objectives: toArray<string>(entry.objectives).filter(
      (objective) => typeof objective === "string"
    ),
  }));
  return {
    total: toNum(src.total),
    families: toArray<Record<string, unknown>>(src.families).map((entry) => ({
      family: typeof entry.family === "string" ? entry.family : "",
      count: toNum(entry.count),
      levels: levelsOf(entry.levels),
    })),
    practices,
  };
}

/* ------------------------------------------------------------------ */
/* EMPTY_* shape + predicate + shared copy                              */
/* ------------------------------------------------------------------ */

export const EMPTY_CMMC_REGISTER: CmmcRegisterResult = {
  total: 0,
  families: [],
  practices: [],
};

export function isEmptyCmmcRegister(result: CmmcRegisterResult): boolean {
  return result.total <= 0 && result.practices.length === 0;
}

/** Empty-state titles shared by the CMMC register panel (copy w/ contract). */
export const CMMC_REGISTER_EMPTY_TITLE = "No practices match the current filters";

/* ------------------------------------------------------------------ */
/* META maps — maturity-level badges + family display names             */
/* ------------------------------------------------------------------ */

/** Badge metadata for a CMMC maturity level (UI-STANDARD token variants). */
export interface LevelBadgeMeta {
  label: string;
  shortLabel: string;
  badgeVariant: FederalBadgeVariant;
}

export const LEVEL_META: Record<CmmcPracticeLevel, LevelBadgeMeta> = {
  1: { label: "Level 1", shortLabel: "L1", badgeVariant: "secondary" },
  2: { label: "Level 2", shortLabel: "L2", badgeVariant: "default" },
  3: { label: "Level 3", shortLabel: "L3", badgeVariant: "info" },
};

export function levelMeta(level: number): LevelBadgeMeta {
  if (level === 2) return LEVEL_META[2];
  if (level === 3) return LEVEL_META[3];
  return LEVEL_META[1];
}

/** Canonical two-letter family order for NIST SP 800-171 Rev 2 (14 families). */
export const NIST_800_171_FAMILY_ORDER = [
  "AC", "AT", "AU", "CA", "CM", "IA", "IR",
  "MA", "MP", "PE", "PS", "RA", "SC", "SI",
] as const;

export type CmmcFamilyCode = (typeof NIST_800_171_FAMILY_ORDER)[number];

/** Two-letter code → human display name for the 14 SP 800-171 families. */
export const FAMILY_DISPLAY_NAMES: Record<CmmcFamilyCode, string> = {
  AC: "Access Control",
  AT: "Awareness & Training",
  AU: "Audit & Accountability",
  CA: "Security Assessment",
  CM: "Configuration Management",
  IA: "Identification & Authentication",
  IR: "Incident Response",
  MA: "Maintenance",
  MP: "Media Protection",
  PE: "Physical Protection",
  PS: "Personnel Security",
  RA: "Risk Assessment",
  SC: "System & Communications Protection",
  SI: "System & Information Integrity",
};

export function familyDisplayName(family: string): string {
  return FAMILY_DISPLAY_NAMES[family as CmmcFamilyCode] ?? family;
}

/** Stable sort rank so distribution rows follow the canonical order. */
export function familyOrderRank(family: string): number {
  const index = (NIST_800_171_FAMILY_ORDER as readonly string[]).indexOf(family);
  return index >= 0 ? index : NIST_800_171_FAMILY_ORDER.length;
}

/* ------------------------------------------------------------------ */
/* Demo-mode builders (UI-STANDARD §17)                                 */
/*                                                                      */
/* DEMO_CMMC_PRACTICES carries representative REAL practice ids from    */
/* NIST SP 800-171 Rev 2 covering all 14 families; the builder derives  */
/* the family rollup from it so counts stay internally consistent.      */
/* ------------------------------------------------------------------ */

export const DEMO_CMMC_PRACTICES: CmmcPractice[] = [
  {
    id: "AC-L1-3.1.1",
    family: "AC",
    level: 1,
    title: "Limit system access to authorized users",
    requirement:
      "Limit system access to authorized users, processes acting on behalf of authorized users, and devices (including other systems).",
    objectives: [
      "Authorized users are determined and documented",
      "Processes acting on behalf of users covered",
      "Devices (incl. other systems) covered",
    ],
  },
  {
    id: "AC-L2-3.1.12",
    family: "AC",
    level: 2,
    title: "Control remote access sessions",
    requirement:
      "Control remote access sessions, where feasible, by limiting session duration, terminating sessions after defined conditions, and monitoring for unauthorized access.",
    objectives: [
      "Remote access session limits defined",
      "Session termination conditions enforced",
      "Unauthorized access monitored",
    ],
  },
  {
    id: "AT-L1-3.2.1",
    family: "AT",
    level: 1,
    title: "Security awareness training",
    requirement:
      "Ensure that managers, systems administrators, and users of organizational systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures related to the security of those systems.",
    objectives: [
      "Awareness activities cover all roles",
      "Risks of user activities communicated",
      "Applicable policies referenced",
    ],
  },
  {
    id: "AU-L1-3.3.1",
    family: "AU",
    level: 1,
    title: "Create and retain system audit logs",
    requirement:
      "Create and retain system audit logs and records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized system activity.",
    objectives: [
      "Audit logs created for covered events",
      "Logs retained per policy",
      "Records support investigation & reporting",
    ],
  },
  {
    id: "CA-L2-3.12.1",
    family: "CA",
    level: 2,
    title: "Periodically assess security controls",
    requirement:
      "Periodically assess the security controls in organizational systems to determine if the controls are effective in their application.",
    objectives: [
      "Assessment cadence defined",
      "Control effectiveness determined",
      "Findings feed remediation",
    ],
  },
  {
    id: "CM-L1-3.4.1",
    family: "CM",
    level: 1,
    title: "Establish baseline configurations",
    requirement:
      "Establish and enforce security configuration settings for information technology products employed in organizational systems.",
    objectives: [
      "Baseline configurations established",
      "Settings enforced via technical means",
      "Deviations tracked",
    ],
  },
  {
    id: "IA-L1-3.5.1",
    family: "IA",
    level: 1,
    title: "Identify system users and devices",
    requirement:
      "Identify system users, processes acting on behalf of users, and devices.",
    objectives: [
      "Users uniquely identified",
      "Processes acting for users identified",
      "Devices identified",
    ],
  },
  {
    id: "IR-L1-3.6.1",
    family: "IR",
    level: 1,
    title: "Operational incident-handling capability",
    requirement:
      "Establish an operational incident-handling capability for organizational systems that includes adequate preparation, detection, analysis, containment, recovery, and user response activities.",
    objectives: [
      "Capability documented & resourced",
      "Preparation through recovery covered",
      "Users know response duties",
    ],
  },
  {
    id: "IR-L2-3.6.2",
    family: "IR",
    level: 2,
    title: "Track, document and report incidents",
    requirement:
      "Track, document, and report incidents to designated officials and/or authorities both internal and external to the organization.",
    objectives: [
      "Incidents tracked & documented",
      "Internal officials notified",
      "External authorities notified when required",
    ],
  },
  {
    id: "MA-L1-3.7.1",
    family: "MA",
    level: 1,
    title: "Perform system maintenance",
    requirement: "Perform maintenance on organizational systems.",
    objectives: [
      "Maintenance scheduled & performed",
      "Maintenance records retained",
    ],
  },
  {
    id: "MP-L1-3.8.1",
    family: "MP",
    level: 1,
    title: "Protect system media containing CUI",
    requirement:
      "Protect (i.e., physically control and securely store) system media containing CUI, both paper and digital.",
    objectives: [
      "Paper media physically controlled",
      "Digital media securely stored",
      "Access limited to authorized roles",
    ],
  },
  {
    id: "PE-L1-3.10.1",
    family: "PE",
    level: 1,
    title: "Limit physical access to systems",
    requirement:
      "Limit physical access to organizational systems, equipment, and the respective operating environments to authorized individuals.",
    objectives: [
      "Physical access lists maintained",
      "Operating environments restricted",
      "Visitor access controlled",
    ],
  },
  {
    id: "PS-L1-3.9.1",
    family: "PS",
    level: 1,
    title: "Screen individuals prior to access",
    requirement:
      "Screen individuals prior to authorizing access to organizational systems containing CUI.",
    objectives: [
      "Screening completed pre-access",
      "Rescreening criteria defined",
    ],
  },
  {
    id: "RA-L2-3.11.1",
    family: "RA",
    level: 2,
    title: "Periodically assess risk",
    requirement:
      "Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational systems.",
    objectives: [
      "Risk assessment cadence defined",
      "Operations, assets & individuals covered",
      "Results modify posture",
    ],
  },
  {
    id: "SC-L1-3.13.1",
    family: "SC",
    level: 1,
    title: "Monitor and protect communications boundaries",
    requirement:
      "Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational systems) at the external boundaries and key internal boundaries of organizational systems.",
    objectives: [
      "External boundaries protected",
      "Key internal boundaries identified",
      "Boundary traffic monitored",
    ],
  },
  {
    id: "SI-L1-3.14.1",
    family: "SI",
    level: 1,
    title: "Identify, report and correct system flaws",
    requirement:
      "Identify, report, and correct system flaws in a timely manner.",
    objectives: [
      "Flaws identified & reported",
      "Flaws corrected within SLA",
      "Corrective actions tracked",
    ],
  },
];

export function buildDemoCmmcRegister(): CmmcRegisterResult {
  const rollups = new Map<string, Record<CmmcPracticeLevel, number>>();
  for (const practice of DEMO_CMMC_PRACTICES) {
    const levels = rollups.get(practice.family) ?? { 1: 0, 2: 0, 3: 0 };
    levels[practice.level] += 1;
    rollups.set(practice.family, levels);
  }
  return {
    total: DEMO_CMMC_PRACTICES.length,
    // Full canonical 14-family axis so the distribution table renders every row.
    families: NIST_800_171_FAMILY_ORDER.map((family) => {
      const levels = rollups.get(family) ?? { 1: 0, 2: 0, 3: 0 };
      return {
        family,
        count: levels[1] + levels[2] + levels[3],
        levels,
      };
    }),
    practices: DEMO_CMMC_PRACTICES,
  };
}
