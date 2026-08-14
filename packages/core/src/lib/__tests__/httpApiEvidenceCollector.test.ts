/**
 * HTTP/API Evidence Collector — unit tests.
 *
 * The collector is driven by an injectable fake fetcher, so no network is
 * required. Covers: array / { items } / single-object payloads, status
 * mapping, missing endpoint, fetch failure, non-OK responses, empty payloads,
 * and the batch-runner integration (`collectEvidence` normalization).
 */
import { describe, it, expect, vi } from 'vitest';
import type { IntegrationContext } from '../integrations/types';
import {
  httpApiEvidenceManifest,
  createHttpApiEvidenceCollector,
  mapHttpApiStatus,
  stableHttpApiItemId,
} from '../integrations/http-api/collector';
import type { HttpApiFetch } from '../integrations/http-api/collector';
import { collectEvidence } from '../integrations/collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function fakeFetcher(body: unknown, status = 200): HttpApiFetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-http',
    userId: 'user-1',
    credentials: { endpoint: 'https://scanner.internal/api/evidence' },
    settings: {},
    ...overrides,
  };
}

describe('httpApiEvidenceCollector', () => {
  it('collects an array payload and maps statuses + controlId', async () => {
    const fetchMock = fakeFetcher([
      { status: 'pass', title: 'TLS config', controlId: 'http.tls' },
      { status: 'fail', title: 'Open port 22' },
      { status: 'warning', title: 'Deprecated cipher' },
    ]);
    const collector = createHttpApiEvidenceCollector(fetchMock);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://scanner.internal/api/evidence',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(evidence).toHaveLength(3);
    expect(evidence[0]).toMatchObject({
      controlId: 'http.tls',
      source: 'http-api-evidence',
      status: 'pass',
      title: 'TLS config',
      collectedAt: NOW,
    });
    expect(evidence[1].status).toBe('fail');
    expect(evidence[2].status).toBe('warning');
  });

  it('sends the API key as a Bearer token when configured', async () => {
    const fetchMock = fakeFetcher([]);
    const collector = createHttpApiEvidenceCollector(fetchMock);

    await collector.collect(
      makeContext({
        credentials: {
          endpoint: 'https://scanner.internal/api/evidence',
          apiKey: 'secret-key',
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key',
        }),
      }),
    );
  });

  it('supports { items: [...] } payloads', async () => {
    const collector = createHttpApiEvidenceCollector(
      fakeFetcher({ items: [{ status: 'ok', title: 'A' }, { status: 'failed', title: 'B' }] }),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(2);
    expect(evidence[0].status).toBe('pass');
    expect(evidence[1].status).toBe('fail');
  });

  it('treats a single object payload as one evidence item', async () => {
    const collector = createHttpApiEvidenceCollector(
      fakeFetcher({ status: 'compliant', title: 'Single check' }),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(1);
    expect(evidence[0].status).toBe('pass');
  });

  it('emits an error record (not a throw) when the endpoint is missing', async () => {
    const collector = createHttpApiEvidenceCollector(fakeFetcher([]));

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      id: 'http-api-endpoint-missing',
      status: 'error',
      source: 'http-api-evidence',
    });
  });

  it('emits an error record when the fetch throws', async () => {
    const failingFetch: HttpApiFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED 127.0.0.1:8080');
    });
    const collector = createHttpApiEvidenceCollector(failingFetch);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      id: 'http-api-request-error',
      status: 'error',
    });
    expect(evidence[0].description).toContain('ECONNREFUSED');
  });

  it('emits an error record for non-OK responses', async () => {
    const collector = createHttpApiEvidenceCollector(fakeFetcher(null, 503));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe('http-api-http-error');
    expect(evidence[0].description).toContain('503');
  });

  it('emits a warning record for empty payloads', async () => {
    const collector = createHttpApiEvidenceCollector(fakeFetcher({ items: [] }));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe('http-api-empty');
    expect(evidence[0].status).toBe('warning');
  });

  it('is captured by the batch runner without crashing the run', async () => {
    const collector = createHttpApiEvidenceCollector(
      fakeFetcher([{ status: 'pass', title: 'TLS' }]),
    );

    const run = await collectEvidence(collector, makeContext(), { now: NOW });

    expect(run.success).toBe(true);
    expect(run.evidence).toHaveLength(1);
    expect(run.evidence[0].source).toBe('http-api-evidence');
    // normalizeEvidence stamps collectedAt when not set
    expect(run.evidence[0].collectedAt).toBeInstanceOf(Date);
  });

  it('respects the limit option', async () => {
    const collector = createHttpApiEvidenceCollector(
      fakeFetcher(Array.from({ length: 10 }, (_, i) => ({ status: 'ok', title: `c${i}` }))),
    );

    const evidence = await collector.collect(makeContext(), { limit: 3, now: NOW });

    expect(evidence).toHaveLength(3);
  });
});

describe('httpApiEvidenceManifest', () => {
  it('declares the expected slug and category', () => {
    expect(httpApiEvidenceManifest.slug).toBe('http-api-evidence');
    expect(httpApiEvidenceManifest.category).toBe('scanner');
    expect(httpApiEvidenceManifest.authentication.type).toBe('apiKey');
  });
});

describe('helpers', () => {
  it('maps common status vocabulary', () => {
    expect(mapHttpApiStatus('pass')).toBe('pass');
    expect(mapHttpApiStatus('ok')).toBe('pass');
    expect(mapHttpApiStatus('compliant')).toBe('pass');
    expect(mapHttpApiStatus('warning')).toBe('warning');
    expect(mapHttpApiStatus('pending')).toBe('warning');
    expect(mapHttpApiStatus('fail')).toBe('fail');
    expect(mapHttpApiStatus('critical')).toBe('fail');
    expect(mapHttpApiStatus('red')).toBe('fail');
    expect(mapHttpApiStatus('')).toBe('warning');
  });

  it('produces stable, deterministic ids', () => {
    const a = stableHttpApiItemId('s', 't', 1, { x: 1 });
    const b = stableHttpApiItemId('s', 't', 1, { x: 1 });
    const c = stableHttpApiItemId('s', 't', 1, { x: 2 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
