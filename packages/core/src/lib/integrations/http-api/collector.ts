/**
 * HTTP/API Evidence Collector (built-in)
 *
 * Manifest-driven evidence collector for any HTTP/JSON API endpoint
 * (scanners, GRC tools, internal services). Polls a configurable endpoint and
 * normalizes the JSON payload into `CollectedEvidence` records:
 *
 *   - array payload        → each element is one evidence item
 *   - { items: [...] }     → each element is one evidence item
 *   - single object        → one evidence item
 *
 * Item status is derived from the item's `status` field (or a configurable
 * `statusKey`) using common vocabulary: pass/ok/true/compliant → pass,
 * warning/warn/pending → warning, fail/critical/red → fail, error → error.
 *
 * The HTTP client accepts an injectable fetcher so unit tests can drive it
 * with canned responses — no network required. When no endpoint is
 * configured, the collector emits a single 'error' evidence record rather
 * than throwing, so the batch runner treats it as graceful degradation.
 */

import type { IntegrationManifest, IntegrationContext } from '../types';
import type {
  EvidenceCollector,
  CollectedEvidence,
  CollectOptions,
} from '../collector';

/** Minimal Response shape we rely on — keeps the fetcher trivially fake-able. */
export interface HttpApiFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type HttpApiFetch = (
  input: string,
  init?: RequestInit,
) => Promise<HttpApiFetchResponse>;

export const httpApiEvidenceManifest: IntegrationManifest = {
  slug: 'http-api-evidence',
  name: 'HTTP/API Evidence',
  version: '1.0.0',
  description:
    'Collects control evidence from any HTTP/JSON API endpoint (scanners, GRC tools, internal services).',
  author: {
    name: 'ComplianceOS',
  },
  license: 'MIT',
  category: 'scanner',
  tags: ['http', 'api', 'evidence', 'scanner'],
  capabilities: {
    read: true,
    sync: true,
  },
  authentication: {
    type: 'apiKey',
    fields: [
      {
        key: 'endpoint',
        type: 'string',
        label: 'API Endpoint URL',
        description:
          'JSON endpoint returning evidence items (array, { items: [...] }, or single object).',
        required: true,
        placeholder: 'https://scanner.internal/api/evidence',
      },
      {
        key: 'apiKey',
        type: 'password',
        label: 'API Key (optional)',
        description: 'Sent as Authorization: Bearer <key>.',
        required: false,
        sensitive: true,
      },
    ],
  },
  actions: [],
  triggers: [],
  rateLimit: {
    requests: 100,
    window: 60,
  },
};

/** Map a raw status string to the normalized evidence status vocabulary. */
export function mapHttpApiStatus(raw: unknown): CollectedEvidence['status'] {
  const s = String(raw ?? '').trim().toLowerCase();
  if (['pass', 'passed', 'ok', 'true', 'compliant', 'healthy', 'green', 'success'].includes(s)) {
    return 'pass';
  }
  if (['warning', 'warn', 'pending', 'review', 'yellow', 'unknown'].includes(s)) {
    return 'warning';
  }
  if (['fail', 'failed', 'critical', 'violation', 'non_compliant', 'red', 'false', 'error'].includes(s)) {
    return 'fail';
  }
  return 'warning';
}

/** Small deterministic id derived from the payload so tests are stable. */
export function stableHttpApiItemId(
  source: string,
  type: string,
  index: number,
  item: unknown,
): string {
  const raw = JSON.stringify(item ?? {});
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `${source}-${type}-${index}-${Math.abs(hash).toString(36)}`;
}

async function collectHttpApiEvidence(
  fetcher: HttpApiFetch,
  context: IntegrationContext,
  options?: CollectOptions,
): Promise<CollectedEvidence[]> {
  const now = options?.now ?? new Date();
  const source = httpApiEvidenceManifest.slug;
  const endpoint =
    context.credentials.endpoint ??
    context.credentials.apiUrl ??
    (typeof context.settings.endpoint === 'string' ? context.settings.endpoint : '') ??
    '';
  const apiKey = context.credentials.apiKey ?? context.credentials.token ?? '';
  const type = String(context.settings.type ?? 'api-check');
  const controlId = String(context.settings.controlId ?? 'http-api.generic');
  const titleKey = String(context.settings.titleKey ?? 'title');
  const descriptionKey = String(context.settings.descriptionKey ?? 'description');
  const statusKey = String(context.settings.statusKey ?? 'status');
  const method = String(context.settings.method ?? 'GET').toUpperCase();
  const defaultStatus = String(context.settings.defaultStatus ?? 'warning');

  if (!endpoint) {
    return [
      {
        id: 'http-api-endpoint-missing',
        controlId,
        source,
        type,
        status: 'error',
        title: 'HTTP/API endpoint not configured',
        description:
          'Set the endpoint credential (or settings.endpoint) to begin collecting evidence from this API.',
        collectedAt: now,
      },
    ];
  }

  let response: HttpApiFetchResponse;
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(context.settings.headers as Record<string, string> | undefined),
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    response = await fetcher(endpoint, { method, headers });
  } catch (err: any) {
    return [
      {
        id: 'http-api-request-error',
        controlId,
        source,
        type,
        status: 'error',
        title: 'HTTP/API request failed',
        description: err?.message ?? String(err),
        collectedAt: now,
      },
    ];
  }

  if (!response.ok) {
    return [
      {
        id: 'http-api-http-error',
        controlId,
        source,
        type,
        status: 'error',
        title: `HTTP/API responded with ${response.status}`,
        description: `Endpoint ${endpoint} returned HTTP ${response.status}.`,
        collectedAt: now,
      },
    ];
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const rawItems: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray((body as { items?: unknown[] } | null)?.items)
      ? (body as { items: unknown[] }).items
      : body && typeof body === 'object'
        ? [body]
        : [];

  if (rawItems.length === 0) {
    return [
      {
        id: 'http-api-empty',
        controlId,
        source,
        type,
        status: 'warning',
        title: 'HTTP/API returned no evidence items',
        description: `Endpoint ${endpoint} returned an empty or unparseable payload.`,
        collectedAt: now,
      },
    ];
  }

  const cap = typeof options?.limit === 'number' ? options.limit : 50;
  return rawItems.slice(0, cap).map((item, index) => {
    const rec = item && typeof item === 'object'
      ? (item as Record<string, unknown>)
      : { value: item };

    const rawStatus = rec[statusKey] ?? rec.status;
    const status: CollectedEvidence['status'] =
      rawStatus !== undefined && rawStatus !== null
        ? mapHttpApiStatus(rawStatus)
        : ['pass', 'warning', 'fail', 'error'].includes(defaultStatus)
          ? (defaultStatus as CollectedEvidence['status'])
          : 'warning';

    const title = rec[titleKey] ?? rec.title ?? rec.name ?? `Check ${index + 1}`;
    const description =
      rec[descriptionKey] ??
      rec.description ??
      rec.detail ??
      JSON.stringify(item).slice(0, 500);

    return {
      id: stableHttpApiItemId(source, type, index, item),
      controlId: rec.controlId ? String(rec.controlId) : controlId,
      source,
      type,
      status,
      title: String(title),
      description: String(description),
      collectedAt: now,
      rawData: item,
    };
  });
}

/**
 * Create an HTTP/API evidence collector with an optional injectable fetcher
 * (defaults to global fetch). Tests pass a fake fetcher.
 */
export function createHttpApiEvidenceCollector(
  fetcher?: HttpApiFetch,
): EvidenceCollector {
  const doFetch: HttpApiFetch =
    fetcher ?? ((input, init) => globalThis.fetch(input, init));

  return {
    manifest: httpApiEvidenceManifest,
    collect(context: IntegrationContext, options?: CollectOptions) {
      return collectHttpApiEvidence(doFetch, context, options);
    },
  };
}

/** Shared built-in instance backed by the real fetch API. */
export const httpApiEvidenceCollector: EvidenceCollector =
  createHttpApiEvidenceCollector();
