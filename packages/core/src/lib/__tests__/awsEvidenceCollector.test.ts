/**
 * AWS Evidence Collector — unit tests.
 *
 * The collector makes four per-service API calls (IAM, S3, EC2, CloudTrail)
 * through an injectable fetcher — no network. Tests drive it with canned
 * AWS-shaped JSON routed by URL. Covers: evidence count, stable ids, aws.*
 * controlIds, pass/warning/fail/error derivation per check, options.limit,
 * injected now, TTL-based expiresAt, graceful handling of malformed payloads
 * and HTTP failures, credentials-missing degradation, the manifest and the
 * shared singleton.
 */
import { describe, it, expect, vi } from 'vitest';
import type { IntegrationContext } from '../integrations/types';
import {
  awsEvidenceManifest,
  createAwsEvidenceCollector,
  awsEvidenceCollector,
} from '../integrations/aws/collector';
import type { AwsFetch } from '../integrations/aws/collector';
import { collectEvidence } from '../integrations/collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');

type Route = { status: number; body: unknown };

/** Fake fetcher routing by URL substring (the Action= query discriminates). */
function fakeAwsFetcher(routes: Record<string, Route>): AwsFetch {
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
    connectionId: 'conn-aws',
    userId: 'user-1',
    credentials: {
      accessKeyId: 'AKIA_TEST',
      secretAccessKey: 'secret',
      region: 'us-east-1',
    },
    settings: {},
    ...overrides,
  };
}

/** One route per AWS check, defaulting to an all-pass posture. */
function buildRoutes(overrides: Record<string, Route> = {}): Record<string, Route> {
  return {
    ListAccessKeys: {
      status: 200,
      body: {
        AccessKeys: [
          { UserName: 'alice', Status: 'Active', CreateDate: '2025-12-01T00:00:00.000Z' },
        ],
      },
    },
    ListBuckets: {
      status: 200,
      body: { Buckets: [{ Name: 'acme', Encryption: { SSEAlgorithm: 'AES256' } }] },
    },
    DescribeInstances: {
      status: 200,
      body: { Instances: [{ InstanceId: 'i-1' }] },
    },
    DescribeTrails: {
      status: 200,
      body: { TrailList: [{ Name: 'main', IsLogging: true }] },
    },
    ...overrides,
  };
}

const ALL_IDS = [
  'aws-iam-access-key-age',
  'aws-s3-bucket-encryption',
  'aws-ec2-public-ports',
  'aws-cloudtrail-enabled',
];

describe('awsEvidenceCollector', () => {
  it('collects one evidence record per AWS check with aws.* control ids', async () => {
    const fetchMock = fakeAwsFetcher(buildRoutes());
    const collector = createAwsEvidenceCollector(fetchMock);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(evidence).toHaveLength(4);
    expect(evidence.map((e) => e.id)).toEqual(ALL_IDS);

    // control ids carry the documented aws. prefix
    expect(evidence.every((e) => e.controlId.startsWith('aws.'))).toBe(true);
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));
    expect(byControl['aws.iam-access-key-age']?.status).toBe('pass');
    expect(byControl['aws.s3-bucket-encryption']?.status).toBe('pass');
    expect(byControl['aws.ec2-public-ports']?.status).toBe('pass');
    expect(byControl['aws.cloudtrail-enabled']?.status).toBe('pass');

    // normalized source is the manifest slug
    expect(evidence.every((e) => e.source === 'aws')).toBe(true);
    expect(evidence.every((e) => typeof e.title === 'string' && e.title.length > 0)).toBe(true);
    expect(evidence.every((e) => typeof e.description === 'string' && e.description.length > 0)).toBe(true);
  });

  it('derives warning/fail statuses from the underlying payloads', async () => {
    const collector = createAwsEvidenceCollector(
      fakeAwsFetcher(
        buildRoutes({
          ListAccessKeys: {
            status: 200,
            body: {
              AccessKeys: [
                { UserName: 'alice', Status: 'Active', CreateDate: '2025-10-03T00:00:00.000Z' }, // exactly 90 days → warning
              ],
            },
          },
          ListBuckets: {
            status: 200,
            body: { Buckets: [{ Name: 'acme' }] }, // no encryption → fail
          },
          DescribeInstances: {
            status: 200,
            body: { Instances: [{ InstanceId: 'i-1', PublicIpAddress: '1.2.3.4' }] }, // public, no open ports → warning
          },
          DescribeTrails: {
            status: 200,
            body: { TrailList: [] }, // no trails → fail
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['aws.iam-access-key-age']?.status).toBe('warning');
    expect(byControl['aws.s3-bucket-encryption']?.status).toBe('fail');
    expect(byControl['aws.ec2-public-ports']?.status).toBe('warning');
    expect(byControl['aws.cloudtrail-enabled']?.status).toBe('fail');
  });

  it('derives fail statuses for exposed + open instances and stale keys', async () => {
    const collector = createAwsEvidenceCollector(
      fakeAwsFetcher(
        buildRoutes({
          ListAccessKeys: {
            status: 200,
            body: {
              AccessKeys: [
                { UserName: 'alice', Status: 'Active', CreateDate: '2025-01-01T00:00:00.000Z' }, // 365 days
              ],
            },
          },
          DescribeInstances: {
            status: 200,
            body: {
              Instances: [
                { InstanceId: 'i-1', PublicIpAddress: '1.2.3.4', OpenPorts: [22] },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['aws.iam-access-key-age']?.status).toBe('fail');
    expect(byControl['aws.ec2-public-ports']?.status).toBe('fail');
  });

  it('produces stable, unique ids across runs', async () => {
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(buildRoutes()));

    const a = await collector.collect(makeContext(), { now: NOW });
    const b = await collector.collect(makeContext(), { now: NOW });

    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
    expect(new Set(a.map((e) => e.id)).size).toBe(a.length);
  });

  it('respects options.limit', async () => {
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW, limit: 2 });

    expect(evidence).toHaveLength(2);
    expect(evidence[0].controlId).toBe('aws.iam-access-key-age');
    expect(evidence[1].controlId).toBe('aws.s3-bucket-encryption');
  });

  it('uses the injected clock for collectedAt', async () => {
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((e) => e.collectedAt.getTime() === NOW.getTime())).toBe(true);
  });

  it('computes expiresAt from evidenceTtlMs for the evidence type', async () => {
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(buildRoutes()));

    const ttl = 24 * 60 * 60 * 1000;
    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'iam-access-key-age': ttl },
    });

    const iam = evidence.find((e) => e.controlId === 'aws.iam-access-key-age')!;
    expect(iam.expiresAt).toEqual(new Date(NOW.getTime() + ttl));
    // types not in the TTL map get no expiresAt
    const s3 = evidence.find((e) => e.controlId === 'aws.s3-bucket-encryption')!;
    expect(s3.expiresAt).toBeUndefined();
  });

  it('converts a malformed payload into an error record without throwing', async () => {
    const routes = buildRoutes({
      ListAccessKeys: { status: 200, body: {} }, // no AccessKeys array
    });
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(routes));

    let evidence;
    try {
      evidence = await collector.collect(makeContext(), { now: NOW });
    } catch (err) {
      throw new Error(`collect() threw on malformed payload: ${String(err)}`);
    }

    expect(evidence).toHaveLength(4);
    const iam = evidence.find((e) => e.controlId === 'aws.iam-access-key-age')!;
    expect(iam.status).toBe('error');
    expect(iam.description).toContain('Malformed');
    // the other checks still resolved
    expect(evidence.filter((e) => e.status === 'pass')).toHaveLength(3);
  });

  it('handles fetch rejection and unreadable json() gracefully', async () => {
    const rejectingFetcher: AwsFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const unreadableFetcher: AwsFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('body unreadable');
      },
    }));

    for (const fetcher of [rejectingFetcher, unreadableFetcher]) {
      const collector = createAwsEvidenceCollector(fetcher);
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
      ListAccessKeys: { status: 500, body: { message: 'Internal Server Error' } },
      ListBuckets: { status: 403, body: null },
    });
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(routes));

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['aws.iam-access-key-age']?.status).toBe('error');
    expect(byControl['aws.iam-access-key-age']?.description).toContain('500');
    expect(byControl['aws.s3-bucket-encryption']?.status).toBe('error');
    expect(byControl['aws.ec2-public-ports']?.status).toBe('pass');
    expect(byControl['aws.cloudtrail-enabled']?.status).toBe('pass');
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const fetchMock = fakeAwsFetcher(buildRoutes());
    const collector = createAwsEvidenceCollector(fetchMock);

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      id: 'aws-credentials-missing',
      controlId: 'aws.authentication',
      status: 'error',
    });
  });

  it('degrades gracefully with the default (non-injected) fetcher', async () => {
    const evidence = await awsEvidenceCollector.collect(makeContext(), {
      now: NOW,
    });

    // The default fetcher refuses to send unsigned requests → per-check errors,
    // never a throw.
    expect(evidence).toHaveLength(4);
    expect(evidence.every((e) => e.status === 'error')).toBe(true);
  });

  it('runs end-to-end through collectEvidence normalization', async () => {
    const collector = createAwsEvidenceCollector(fakeAwsFetcher(buildRoutes()));

    const run = await collectEvidence(collector, makeContext(), { now: NOW });

    expect(run.success).toBe(true);
    expect(run.slug).toBe(awsEvidenceManifest.slug);
    expect(run.evidence).toHaveLength(4);
    expect(run.evidence.every((e) => e.collectedAt instanceof Date)).toBe(true);
  });
});

describe('awsEvidenceManifest', () => {
  it('declares the expected slug and metadata', () => {
    expect(awsEvidenceManifest.slug).toBe('aws');
    expect(typeof awsEvidenceManifest.name).toBe('string');
    expect(awsEvidenceManifest.name.length).toBeGreaterThan(0);
    expect(awsEvidenceManifest.capabilities.read).toBe(true);
    expect(Array.isArray(awsEvidenceManifest.tags)).toBe(true);
  });

  it('exposes a shared singleton with the same manifest', () => {
    expect(awsEvidenceCollector).toBeDefined();
    expect(awsEvidenceCollector.manifest.slug).toBe('aws');
  });
});
