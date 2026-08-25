/**
 * Cyber Resilience — data contract + hooks (cycle 41)
 * ===================================================
 * UI-side typed view of the `cyber.*` tRPC procedures consumed by
 * `pages/cyber/CyberIncidentDetail.tsx` and
 * `pages/nis2/NIS2CyberResilienceHub.tsx`.
 *
 * WHY THIS MODULE EXISTS (UI-STANDARD §16 — typed contract layer):
 * the `cyber` router is assembled through a factory
 * (`createCyberRouter`, `packages/core/src/server/routers/cyber.ts`),
 * a pattern under which the AppRouter type inference collapses, so raw
 * `trpc.cyber.getIncident`-style call sites fail with TS2339 at compile
 * time even though the endpoints are live. Per §16 we declare the expected
 * input/output contracts here, cast the tRPC client once, and export
 * `retry: false` hooks that the pages consume instead of raw
 * `trpc.cyber.*` calls. Runtime behavior is identical to the direct calls.
 *
 * -----------------------------------------------------------------------
 * Mirrored procedures (packages/core/src/server/routers/cyber.ts):
 *
 * 1) cyber.getMappings  (clientProcedure query, ~L29)
 *    input:  { clientId: number, framework?: string }
 *    output: CyberNis2MappingRow[]   // enriched nis2Mappings rows
 *
 * 2) cyber.getIncidents (clientProcedure query, ~L553)
 *    input:  { clientId: number }
 *    output: CyberIncidentRecord[]
 *
 * 3) cyber.getIncident  (clientProcedure query, ~L562)
 *    input:  { clientId: number, incidentId: number }
 *    output: CyberIncidentRecord     // NOT_FOUND when the id does not exist
 *
 * 4) cyber.updateIncident (clientProcedure mutation, ~L585)
 *    input:  CyberUpdateIncidentInput
 *    output: { success: boolean }
 * -----------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

/** NIS2 Art. 23 incident severity scale. */
export type CyberIncidentSeverity = "low" | "medium" | "high" | "critical";

/** Lifecycle of an Art. 23 incident record. */
export type CyberIncidentStatus =
  | "open"
  | "investigating"
  | "mitigated"
  | "resolved"
  | "reported";

/**
 * One row of the `incidents` table as returned by cyber.getIncident(s).
 * Timestamps arrive as Date over superjson but are kept permissive
 * (`string | Date | null`) so consumers can normalize defensively.
 */
export interface CyberIncidentRecord {
  id: number;
  clientId: number;
  title: string;
  detectedAt?: string | Date | null;
  severity?: CyberIncidentSeverity | null;
  /** NIS2 Art. 23 classification. */
  isSignificant?: boolean | null;
  significanceCriteria?: string[] | null;
  affectedUsersCount?: number | null;
  /** Minutes of service disruption. */
  serviceDisruptionDuration?: number | null;
  /** Cents. */
  estimatedFinancialLoss?: number | null;
  /** Art. 21(2)(c) BCP/DR bridge flag. */
  isContinuityTriggered?: boolean | null;
  /** 24h early warning milestone (ISO or Date). */
  earlyWarningSentAt?: string | Date | null;
  /** 72h notification milestone. */
  intermediateReportSentAt?: string | Date | null;
  /** 1-month final report milestone. */
  finalReportSentAt?: string | Date | null;
  cause?: string | null;
  description?: string | null;
  affectedAssets?: string | null;
  crossBorderImpact?: boolean | null;
  status?: CyberIncidentStatus | null;
  reportedToAuthorities?: boolean | null;
  reporterName?: string | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

/**
 * One enriched row of cyber.getMappings (nis2Mappings joined with the
 * client's assessment-derived control statuses). Only the identity and
 * status fields are contracted; enrichment extras stay opaque.
 */
export interface CyberNis2MappingRow {
  id: number;
  /** Legacy mapping-level status, e.g. "implemented". */
  status?: string | null;
  /** Assessment-derived status: implemented | in_progress | not_started | not_applicable. */
  clientStatus?: string | null;
  implementedCount?: number;
  inProgressCount?: number;
  totalEvidence?: number;
}

/** Input of cyber.updateIncident (mirrors the zod schema on the router). */
export interface CyberUpdateIncidentInput {
  clientId: number;
  incidentId: number;
  title?: string;
  severity?: CyberIncidentSeverity;
  cause?: string;
  description?: string;
  crossBorderImpact?: boolean;
  affectedAssets?: string;
  status?: CyberIncidentStatus;
  reportedToAuthorities?: boolean;
  // NIS2 fields
  isSignificant?: boolean;
  significanceCriteria?: string[];
  affectedUsersCount?: number;
  serviceDisruptionDuration?: number;
  estimatedFinancialLoss?: number;
  isContinuityTriggered?: boolean;
  earlyWarningSentAt?: string | null;
  intermediateReportSentAt?: string | null;
  finalReportSentAt?: string | null;
}

/** Input of cyber.getMappings. */
export interface CyberGetMappingsInput {
  clientId: number;
  framework?: string;
}

/** Input of cyber.getIncidents. */
export interface CyberGetIncidentsInput {
  clientId: number;
}

/** Input of cyber.getIncident. */
export interface CyberGetIncidentInput {
  clientId: number;
  incidentId: number;
}

/** Output of cyber.updateIncident. */
export interface CyberUpdateIncidentResult {
  success: boolean;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset)  */
/* ------------------------------------------------------------------ */

export interface CyberQueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export interface CyberMutationLike<TInput, TResult> {
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

interface CyberQueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
}

/** Error shape surfaced by tRPC (only what the UI reads). */
export interface CyberTrpcError {
  message?: string;
}

/* ------------------------------------------------------------------ */
/* One-time client cast (UI-STANDARD §16)                              */
/* ------------------------------------------------------------------ */

interface CyberTrpcContract {
  cyber: {
    getMappings: {
      useQuery: (
        input: CyberGetMappingsInput,
        opts?: CyberQueryOptions
      ) => CyberQueryLike<CyberNis2MappingRow[]>;
    };
    getIncidents: {
      useQuery: (
        input: CyberGetIncidentsInput,
        opts?: CyberQueryOptions
      ) => CyberQueryLike<CyberIncidentRecord[]>;
    };
    getIncident: {
      useQuery: (
        input: CyberGetIncidentInput,
        opts?: CyberQueryOptions
      ) => CyberQueryLike<CyberIncidentRecord>;
    };
    updateIncident: {
      useMutation: (opts?: {
        retry?: boolean | number;
        onSuccess?: (data: CyberUpdateIncidentResult) => void;
        onError?: (error: CyberTrpcError) => void;
      }) => CyberMutationLike<CyberUpdateIncidentInput, CyberUpdateIncidentResult>;
    };
  };
}

const cyberApi = trpc as unknown as CyberTrpcContract;

/* ------------------------------------------------------------------ */
/* Hooks — retry: false everywhere (UI-STANDARD §16)                   */
/* ------------------------------------------------------------------ */

/**
 * NIS2 framework control mappings for a client (cyber.getMappings).
 * Disabled while no client is selected; a missing endpoint surfaces via
 * `isError` and consumers render their degraded state.
 */
export function useCyberNis2Mappings(
  clientId: number,
  framework = "NIS2"
): CyberQueryLike<CyberNis2MappingRow[]> {
  return cyberApi.cyber.getMappings.useQuery(
    { clientId, framework },
    { enabled: !!clientId, retry: false }
  );
}

/**
 * All incidents for a client, oldest first (cyber.getIncidents).
 */
export function useCyberIncidents(
  clientId: number
): CyberQueryLike<CyberIncidentRecord[]> {
  return cyberApi.cyber.getIncidents.useQuery(
    { clientId },
    { enabled: !!clientId, retry: false }
  );
}

/**
 * A single incident (cyber.getIncident). Throws NOT_FOUND server-side for
 * unknown ids; consumers branch on `isLoading` / `data`.
 */
export function useCyberIncident(
  clientId: number,
  incidentId: number
): CyberQueryLike<CyberIncidentRecord> {
  return cyberApi.cyber.getIncident.useQuery(
    { clientId, incidentId },
    { enabled: !!clientId && !!incidentId, retry: false }
  );
}

/**
 * Update one incident (cyber.updateIncident). Global handlers may be
 * supplied at hook level; per-call handlers passed to `.mutate` still win,
 * exactly like the raw tRPC mutation.
 */
export function useCyberUpdateIncident(handlers?: {
  onSuccess?: (data: CyberUpdateIncidentResult) => void;
  onError?: (error: CyberTrpcError) => void;
}): CyberMutationLike<CyberUpdateIncidentInput, CyberUpdateIncidentResult> {
  return cyberApi.cyber.updateIncident.useMutation({
    ...(handlers ?? {}),
    retry: false,
  });
}
