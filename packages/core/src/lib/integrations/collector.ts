/**
 * Automated Evidence Collection — manifest-driven collector engine.
 *
 * Collectors are lightweight integrations (each backed by an IntegrationManifest)
 * that pull evidence from external systems and normalize it into a common
 * CollectedEvidence shape. A registry drives the built-in set and runAll()
 * executes every registered collector while isolating per-collector failures,
 * so one broken source never blocks the rest of the batch.
 *
 * Design goals (Vanta-class parity for "Automated Evidence Collection"):
 * - Manifest-driven: every collector declares its manifest (auth, capabilities,
 *   category) so discovery/UI can render it without custom code.
 * - Deterministic & testable: `now` can be injected and TTLs can be provided
 *   per evidence type to compute `expiresAt` for auto-renewal.
 * - No DB dependency: this module is pure orchestration/normalization.
 */

import type { IntegrationManifest, IntegrationContext } from './types';

/** Status of a single piece of collected evidence. */
export type EvidenceStatus = 'pass' | 'warning' | 'fail' | 'error';

/** Normalized evidence artifact produced by a collector. */
export interface CollectedEvidence {
  /** Stable identifier for the evidence artifact. */
  id: string;
  /** Control this evidence maps to (e.g. "github.branch-protection"). */
  controlId: string;
  /** Collector slug that produced this evidence. */
  source: string;
  /** Evidence kind, e.g. "branch-protection", "vulnerability-scan". */
  type: string;
  status: EvidenceStatus;
  title: string;
  description: string;
  /** When the evidence was captured. */
  collectedAt: Date;
  /** When the evidence is considered stale (drives renewal reminders). */
  expiresAt?: Date;
  /** Raw payload captured from the source system. */
  rawData?: unknown;
}

/** Options passed to a collector run. */
export interface CollectOptions {
  /** Injectable clock for deterministic tests. */
  now?: Date;
  /** TTL (ms) per evidence type — used to compute `expiresAt`. */
  evidenceTtlMs?: Record<string, number>;
  /** Cap on the number of evidence items returned per collector. */
  limit?: number;
}

/** A single registered evidence collector. */
export interface EvidenceCollector {
  /** Integration manifest describing the source (auth, category, capabilities). */
  manifest: IntegrationManifest;
  /** Pull evidence from the source system and normalize it. */
  collect(
    context: IntegrationContext,
    options?: CollectOptions,
  ): Promise<CollectedEvidence[]>;
}

/** Result of running one collector. */
export interface CollectorRunResult {
  slug: string;
  success: boolean;
  evidence: CollectedEvidence[];
  errors: string[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

/** Aggregated result of running the full collector set. */
export interface CollectorRunSummary {
  results: CollectorRunResult[];
  totalEvidence: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  errorCount: number;
  completedAt: Date;
}

/**
 * Ensure an evidence record is fully normalized: force the collector slug as
 * source, validate/set the collection time, and compute `expiresAt` from the
 * configured per-type TTL when the collector did not provide one.
 */
export function normalizeEvidence(
  raw: CollectedEvidence,
  source: string,
  options: CollectOptions = {},
): CollectedEvidence {
  const now = options.now ?? new Date();
  const collectedAt =
    raw.collectedAt instanceof Date && !Number.isNaN(raw.collectedAt.getTime())
      ? raw.collectedAt
      : now;
  const ttl = options.evidenceTtlMs?.[raw.type];

  return {
    ...raw,
    source,
    collectedAt,
    expiresAt:
      raw.expiresAt ??
      (ttl && ttl > 0 ? new Date(collectedAt.getTime() + ttl) : undefined),
  };
}

/**
 * Run a single collector safely. A throwing collector is converted into a
 * failed CollectorRunResult instead of propagating — runAll() relies on this.
 */
export async function collectEvidence(
  collector: EvidenceCollector,
  context: IntegrationContext,
  options: CollectOptions = {},
): Promise<CollectorRunResult> {
  const startedAt = options.now ?? new Date();
  const errors: string[] = [];
  let rawEvidence: CollectedEvidence[] = [];

  try {
    rawEvidence = await collector.collect(context, options);
  } catch (err: any) {
    errors.push(err?.message ?? String(err));
  }

  let evidence = (Array.isArray(rawEvidence) ? rawEvidence : []).map((e) =>
    normalizeEvidence(e, collector.manifest.slug, options),
  );

  if (typeof options.limit === 'number' && evidence.length > options.limit) {
    evidence = evidence.slice(0, options.limit);
  }

  const completedAt = new Date();
  return {
    slug: collector.manifest.slug,
    success: errors.length === 0,
    evidence,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}

/** Aggregate multiple collector run results into a summary. */
export function summarizeResults(
  results: CollectorRunResult[],
): CollectorRunSummary {
  const evidence = results.flatMap((r) => r.evidence);
  return {
    results,
    totalEvidence: evidence.length,
    passedCount: evidence.filter((e) => e.status === 'pass').length,
    warningCount: evidence.filter((e) => e.status === 'warning').length,
    failedCount: evidence.filter((e) => e.status === 'fail').length,
    errorCount: evidence.filter((e) => e.status === 'error').length,
    completedAt: new Date(),
  };
}

/**
 * Manifest-driven registry of evidence collectors.
 * New sources are added by registering another EvidenceCollector — no changes
 * to the engine or the batch runner are required.
 */
export class EvidenceCollectorRegistry {
  private collectors = new Map<string, EvidenceCollector>();

  register(collector: EvidenceCollector): void {
    if (this.collectors.has(collector.manifest.slug)) {
      console.warn(
        `[EvidenceCollectorRegistry] Collector ${collector.manifest.slug} already registered, overwriting`,
      );
    }
    this.collectors.set(collector.manifest.slug, collector);
  }

  get(slug: string): EvidenceCollector | undefined {
    return this.collectors.get(slug);
  }

  has(slug: string): boolean {
    return this.collectors.has(slug);
  }

  list(): EvidenceCollector[] {
    return Array.from(this.collectors.values());
  }

  /** Run every registered collector and aggregate the normalized results. */
  async runAll(
    context: IntegrationContext,
    options: CollectOptions = {},
  ): Promise<CollectorRunSummary> {
    const results = await Promise.all(
      this.list().map((collector) => collectEvidence(collector, context, options)),
    );
    return summarizeResults(results);
  }
}

/** Shared registry used by the built-in collectors. */
export const evidenceCollectorRegistry = new EvidenceCollectorRegistry();
