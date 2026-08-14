/**
 * GCP Evidence Collector — unit tests.
 *
 * The collector makes four per-service API calls (Cloud Storage, IAM,
 * Compute Engine, Cloud SQL) through an injectable fetcher — no network.
 * Tests drive it with canned GCP-shaped JSON routed by URL. Covers: evidence
 * count, stable ids, gcp.* controlIds, pass/warning/fail/error derivation,
 * options.limit, injected now, TTL-based expiresAt, graceful handling of
 * malformed payloads and HTTP failures, credentials-missing degradation, the
 * manifest and the shared singleton.
 */
import { describe, it, expect, vi } from 'vitest';
import type { IntegrationContext } from '../integrations/types';
import {
  gcpEvidenceManifest,
  createGcpEvidenceCollector,
  gcpEvidenceCollector,
} from '../integrations/gcp/collector';
import type { GcpFetch } from '../integrations/gcp/collector';
import { collectEvidence } from '../integrations/collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');

type Route = { status: number; body: unknown };

/** Fake fetcher routing by URL substring (the service host discriminates). */
function fakeGcpFetcher(routes: Record<string, Route>): GcpFetch {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    const route = key ? routes[key] : { status: 404, body: { message: 'Not Found' } };
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body,
    };
  });
}

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-gcp',
    userId: 'user-1',
    credentials: {
      projectId: 'acme-prod',
      serviceAccountEmail: 'sa@acme.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----',
    },
    settings: {},
    ...overrides,
  };
}

/** One route per GCP check, defaulting to an all-pass posture. */
function buildRoutes(overrides: Record<string, Route> = {}): Record<string, Route> {
  return {
    'storage.googleapis.com': {
      status: 200,
      body: {
        buckets: [
          { name: 'acme', iamConfiguration: { publicAccessPrevention: 'enforced' } },
        ],
      },
    },
    'iam.googleapis.com': {
      status: 200,
      body: {
        serviceAccounts: [
          { email: 'sa@acme.iam.gserviceaccount.com', keys: [{ createdAt: '2025-12-01T00:00:00.000Z' }] },
        ],
      },
    },
    'compute.googleapis.com': {
      status: 200,
      body: { disks: [{ name: 'web-1', diskEncryptionKey: 'projects/acme/global/keys/k1' }] },
    },
    'sqladmin.googleapis.com': {
      status: 200,
      body: { instances: [{ name: 'sql1', settings: { requireSsl: true } }] },
    },
    ...overrides,
  };
}

const ALL_IDS = [
  'gcp-gcs-bucket-public-access',
  'gcp-iam-sa-key-rotation',
  'gcp-compute-disk-encryption',
  'gcp-cloudsql-ssl-required',
];

describe('gcpEvidenceCollector', () => {
  it('collects one evidence record per GCP check with gcp.* control ids', async () => {
    const fetchMock = fakeGcpFetcher(buildRoutes());
    const collector = createGcpEvidenceCollector(fetchMock);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(evidence).toHaveLength(4);
    expect(evidence.map((e) => e.id)).toEqual(ALL_IDS);

    // control ids carry the documented gcp. prefix
    expect(evidence.every((e) => e.controlId.startsWith('gcp.'))).toBe(true);
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));
    expect(byControl['gcp.gcs-bucket-public-access']?.status).toBe('pass');
    expect(byControl['gcp.iam-sa-key-rotation']?.status).toBe('pass');
    expect(byControl['gcp.compute-disk-encryption']?.status).toBe('pass');
    expect(byControl['gcp.cloudsql-ssl-required']?.status).toBe('pass');

    // normalized source is the manifest slug
    expect(evidence.every((e) => e.source === 'gcp')).toBe(true);
    expect(evidence.every((e) => typeof e.title === 'string' && e.title.length > 0)).toBe(true);
    expect(evidence.every((e) => typeof e.description === 'string' && e.description.length > 0)).toBe(true);
  });

  it('derives fail statuses from the underlying payloads', async () => {
    const collector = createGcpEvidenceCollector(
      fakeGcpFetcher(
        buildRoutes({
          'storage.googleapis.com': {
            status: 200,
            body: { buckets: [{ name: 'acme' }] }, // no prevention → fail
          },
          'iam.googleapis.com': {
            status: 200,
            body: {
              serviceAccounts: [
                { email: 'sa@acme', keys: [{ createdAt: '2025-01-01T00:00:00.000Z' }] }, // 365 days
              ],
            },
          },
          'compute.googleapis.com': {
            status: 200,
            body: { disks: [{ name: 'web-1' }] }, // no key → fail
          },
          'sqladmin.googleapis.com': {
            status: 200,
            body: { instances: [{ name: 'sql1' }] }, // no settings → fail
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['gcp.gcs-bucket-public-access']?.status).toBe('fail');
    expect(byControl['gcp.iam-sa-key-rotation']?.status).toBe('fail');
    expect(byControl['gcp.compute-disk-encryption']?.status).toBe('fail');
    expect(byControl['gcp.cloudsql-ssl-required']?.status).toBe('fail');
  });

  it('derives warning statuses for aging keys and empty resources', async () => {
    const collector = createGcpEvidenceCollector(
      fakeGcpFetcher(
        buildRoutes({
          'iam.googleapis.com': {
            status: 200,
            body: {
              serviceAccounts: [
                { email: 'sa@acme', keys: [{ createdAt: '2025-08-01T00:00:00.000Z' }] }, // 153 days
              ],
            },
          },
          'storage.googleapis.com': { status: 200, body: { buckets: [] } },
          'compute.googleapis.com': { status: 200, body: { disks: [] } },
          'sqladmin.googleapis.com': { status: 200, body: { instances: [] } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['gcp.gcs-bucket-public-access']?.status).toBe('warning');
    expect(byControl['gcp.iam-sa-key-rotation']?.status).toBe('warning');
    expect(byControl['gcp.compute-disk-encryption']?.status).toBe('warning');
    expect(byControl['gcp.cloudsql-ssl-required']?.status).toBe('warning');
  });

  it('produces stable, unique ids across runs', async () => {
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(buildRoutes()));

    const a = await collector.collect(makeContext(), { now: NOW });
    const b = await collector.collect(makeContext(), { now: NOW });

    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
    expect(new Set(a.map((e) => e.id)).size).toBe(a.length);
  });

  it('respects options.limit', async () => {
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW, limit: 2 });

    expect(evidence).toHaveLength(2);
    expect(evidence[0].controlId).toBe('gcp.gcs-bucket-public-access');
    expect(evidence[1].controlId).toBe('gcp.iam-sa-key-rotation');
  });

  it('uses the injected clock for collectedAt', async () => {
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((e) => e.collectedAt.getTime() === NOW.getTime())).toBe(true);
  });

  it('computes expiresAt from evidenceTtlMs for the evidence type', async () => {
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(buildRoutes()));

    const ttl = 48 * 60 * 60 * 1000;
    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'gcs-bucket-public-access': ttl },
    });

    const bucket = evidence.find((e) => e.controlId === 'gcp.gcs-bucket-public-access')!;
    expect(bucket.expiresAt).toEqual(new Date(NOW.getTime() + ttl));
    // types not in the TTL map get no expiresAt
    const disk = evidence.find((e) => e.controlId === 'gcp.compute-disk-encryption')!;
    expect(disk.expiresAt).toBeUndefined();
  });

  it('converts a malformed payload into an error record without throwing', async () => {
    const routes = buildRoutes({
      'storage.googleapis.com': { status: 200, body: {} }, // no buckets array
    });
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(routes));

    let evidence;
    try {
      evidence = await collector.collect(makeContext(), { now: NOW });
    } catch (err) {
      throw new Error(`collect() threw on malformed payload: ${String(err)}`);
    }

    expect(evidence).toHaveLength(4);
    const bucket = evidence.find((e) => e.controlId === 'gcp.gcs-bucket-public-access')!;
    expect(bucket.status).toBe('error');
    expect(bucket.description).toContain('Malformed');
    // the other checks still resolved
    expect(evidence.filter((e) => e.status === 'pass')).toHaveLength(3);
  });

  it('handles fetch rejection and unreadable json() gracefully', async () => {
    const rejectingFetcher: GcpFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const unreadableFetcher: GcpFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('body unreadable');
      },
    }));

    for (const fetcher of [rejectingFetcher, unreadableFetcher]) {
      const collector = createGcpEvidenceCollector(fetcher);
      let evidence;
      try {
        evidence = await collector.collect(makeContext(), { now: NOW });
      } catch (err) {
        throw new Error(`collect() threw on fetch failure: ${String(err)}`);
      }
      expect(evidence).toHaveLength(4);
      expect(evidence.every((e) => e.status === 'error')).toBe(true);
    }
  });

  it('emits error records for non-OK HTTP responses', async () => {
    const routes = buildRoutes({
      'sqladmin.googleapis.com': { status: 503, body: { message: 'Unavailable' } },
    });
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(routes));

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['gcp.cloudsql-ssl-required']?.status).toBe('error');
    expect(byControl['gcp.cloudsql-ssl-required']?.description).toContain('503');
    expect(byControl['gcp.gcs-bucket-public-access']?.status).toBe('pass');
    expect(byControl['gcp.compute-disk-encryption']?.status).toBe('pass');
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const fetchMock = fakeGcpFetcher(buildRoutes());
    const collector = createGcpEvidenceCollector(fetchMock);

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      id: 'gcp-credentials-missing',
      controlId: 'gcp.authentication',
      status: 'error',
    });
  });

  it('accepts a pre-issued accessToken credential alone', async () => {
    const fetchMock = fakeGcpFetcher(buildRoutes());
    const collector = createGcpEvidenceCollector(fetchMock);

    const evidence = await collector.collect(
      makeContext({ credentials: { accessToken: 'tok' } }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('degrades gracefully with the default (non-injected) fetcher', async () => {
    const evidence = await gcpEvidenceCollector.collect(makeContext(), {
      now: NOW,
    });

    expect(evidence).toHaveLength(4);
    expect(evidence.every((e) => e.status === 'error')).toBe(true);
  });

  it('runs end-to-end through collectEvidence normalization', async () => {
    const collector = createGcpEvidenceCollector(fakeGcpFetcher(buildRoutes()));

    const run = await collectEvidence(collector, makeContext(), { now: NOW });

    expect(run.success).toBe(true);
    expect(run.slug).toBe(gcpEvidenceManifest.slug);
    expect(run.evidence).toHaveLength(4);
    expect(run.evidence.every((e) => e.collectedAt instanceof Date)).toBe(true);
  });
});

describe('gcpEvidenceManifest', () => {
  it('declares the expected slug and metadata', () => {
    expect(gcpEvidenceManifest.slug).toBe('gcp');
    expect(typeof gcpEvidenceManifest.name).toBe('string');
    expect(gcpEvidenceManifest.name.length).toBeGreaterThan(0);
    expect(gcpEvidenceManifest.capabilities.read).toBe(true);
    expect(Array.isArray(gcpEvidenceManifest.tags)).toBe(true);
  });

  it('exposes a shared singleton with the same manifest', () => {
    expect(gcpEvidenceCollector).toBeDefined();
    expect(gcpEvidenceCollector.manifest.slug).toBe('gcp');
  });
});
