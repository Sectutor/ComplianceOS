/**
 * GCP evidence collector — unit tests.
 *
 * Drives the collector with a fake fetcher (no network required) to verify
 * deterministic status mapping, graceful degradation on malformed payloads /
 * API errors, credential checks, normalization and the limit option.
 */
import { describe, it, expect } from 'vitest';
import type { IntegrationContext } from '../../types';
import {
  gcpEvidenceManifest,
  createGcpEvidenceCollector,
} from '../collector';
import type { GcpFetch } from '../collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const PROJECT = 'my-project';
const BUCKETS_URL = 'https://storage.googleapis.com/storage/v1/b';
const IAM_URL = `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts`;
const DISKS_URL = `https://compute.googleapis.com/compute/v1/projects/${PROJECT}/aggregated/disks`;
const SQL_URL = `https://sqladmin.googleapis.com/sql/v1beta4/projects/${PROJECT}/instances`;

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-gcp-1',
    userId: 'user-1',
    credentials: {
      serviceAccountEmail: 'scanner@my-project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----secret',
      projectId: PROJECT,
    },
    settings: {},
    ...overrides,
  };
}

function fakeFetcher(
  routes: Record<string, { status: number; body: unknown }>,
): GcpFetch {
  return async (input: string) => {
    const route = routes[String(input)];
    if (!route) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      };
    }
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body,
    };
  };
}

function buildRoutes(overrides: Record<string, unknown> = {}) {
  return {
    [BUCKETS_URL]: {
      status: 200,
      body: {
        buckets: [
          { name: 'public-data', iamConfiguration: { publicAccessPrevention: 'enforced' } },
        ],
      },
    },
    [IAM_URL]: {
      status: 200,
      body: {
        serviceAccounts: [
          {
            email: 'svc@my-project.iam.gserviceaccount.com',
            keys: [{ keyId: 'k1', createdAt: new Date(NOW.getTime() - 30 * DAY).toISOString() }],
          },
        ],
      },
    },
    [DISKS_URL]: {
      status: 200,
      body: {
        disks: [{ name: 'disk-1', encrypted: true }],
      },
    },
    [SQL_URL]: {
      status: 200,
      body: {
        instances: [{ name: 'db-1', sslRequired: true }],
      },
    },
    ...overrides,
  };
}

describe('GCP evidence collector', () => {
  it('collects all four GCP evidence types with pass statuses for a healthy project', async () => {
    const collector = createGcpEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(4);
    const byId = Object.fromEntries(evidence.map((e) => [e.id, e]));

    expect(byId['gcp-gcs-bucket-public-access']?.status).toBe('pass');
    expect(byId['gcp-iam-sa-key-rotation']?.status).toBe('pass');
    expect(byId['gcp-compute-disk-encryption']?.status).toBe('pass');
    expect(byId['gcp-cloudsql-ssl-required']?.status).toBe('pass');

    expect(byId['gcp-gcs-bucket-public-access']?.controlId).toBe(
      'gcp.gcs-bucket-public-access',
    );
    expect(byId['gcp-gcs-bucket-public-access']?.source).toBe('gcp');
    expect(byId['gcp-gcs-bucket-public-access']?.collectedAt).toEqual(NOW);
  });

  it('fails when a bucket is not protected by public access prevention', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [BUCKETS_URL]: {
            status: 200,
            body: {
              buckets: [
                { name: 'secure', iamConfiguration: { publicAccessPrevention: 'enforced' } },
                { name: 'exposed', publicAccess: true },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-gcs-bucket-public-access');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('fails when a service account key exceeds the 180-day rotation window', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: {
            status: 200,
            body: {
              serviceAccounts: [
                {
                  email: 'svc@my-project.iam.gserviceaccount.com',
                  keys: [
                    { keyId: 'k-old', createdAt: new Date(NOW.getTime() - 300 * DAY).toISOString() },
                    { keyId: 'k-new', createdAt: new Date(NOW.getTime() - 10 * DAY).toISOString() },
                  ],
                },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-iam-sa-key-rotation');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('300 days');
  });

  it('warns when a service account key is inside the 90-180 day buffer', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: {
            status: 200,
            body: {
              serviceAccounts: [
                {
                  email: 'svc@my-project.iam.gserviceaccount.com',
                  keys: [{ keyId: 'k-mid', createdAt: new Date(NOW.getTime() - 120 * DAY).toISOString() }],
                },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    expect(
      evidence.find((e) => e.id === 'gcp-iam-sa-key-rotation')?.status,
    ).toBe('warning');
  });

  it('fails when a Compute disk is not encrypted', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [DISKS_URL]: {
            status: 200,
            body: {
              disks: [
                { name: 'disk-enc', encrypted: true },
                { name: 'disk-plain', encrypted: false },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-compute-disk-encryption');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('fails when a Cloud SQL instance does not require SSL', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [SQL_URL]: {
            status: 200,
            body: {
              instances: [
                { name: 'db-secure', sslRequired: true },
                { name: 'db-insecure', settings: { ipConfiguration: { requireSsl: false } } },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-cloudsql-ssl-required');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('turns a malformed payload into an error evidence without throwing', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [BUCKETS_URL]: { status: 200, body: { unexpected: 'shape' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-gcs-bucket-public-access');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('Malformed');
    expect(evidence).toHaveLength(4);
  });

  it('turns an HTTP 500 into an error evidence without aborting the batch', async () => {
    const collector = createGcpEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: { status: 500, body: { message: 'boom' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'gcp-iam-sa-key-rotation');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('500');
    expect(evidence.filter((e) => e.status !== 'error')).toHaveLength(3);
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const collector = createGcpEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0].status).toBe('error');
    expect(evidence[0].controlId).toBe('gcp.authentication');
  });

  it('falls back to project "-" when no projectId credential is set', async () => {
    const seen: string[] = [];
    const fetcher: GcpFetch = async (input: string) => {
      seen.push(String(input));
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const collector = createGcpEvidenceCollector(fetcher);

    await collector.collect(
      makeContext({
        credentials: { serviceAccountEmail: 'svc@x.iam.gserviceaccount.com', privateKey: 'k' },
      }),
      { now: NOW },
    );

    expect(seen.some((u) => u.includes('/projects/-/serviceAccounts'))).toBe(true);
  });

  it('computes expiresAt from the per-type TTL and respects the limit option', async () => {
    const collector = createGcpEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'gcs-bucket-public-access': 5 * DAY },
      limit: 2,
    });

    expect(evidence).toHaveLength(2);
    const bucket = evidence.find((e) => e.id === 'gcp-gcs-bucket-public-access');
    expect(bucket?.expiresAt).toEqual(new Date(NOW.getTime() + 5 * DAY));
  });

  it('exposes the GCP evidence manifest for discovery', () => {
    expect(gcpEvidenceManifest.slug).toBe('gcp');
    expect(gcpEvidenceManifest.category).toBe('scanner');
    expect(gcpEvidenceManifest.authentication.type).toBe('apiKey');
    expect(gcpEvidenceManifest.capabilities.read).toBe(true);
    expect(
      gcpEvidenceManifest.authentication.fields.map((f) => f.key),
    ).toContain('privateKey');
  });
});
