/**
 * AWS evidence collector — unit tests.
 *
 * Drives the collector with a fake fetcher (no network required) to verify
 * deterministic status mapping, graceful degradation on malformed payloads /
 * API errors, credential checks, normalization (slug source, injected clock,
 * TTL-based expiresAt) and the limit option.
 */
import { describe, it, expect } from 'vitest';
import type { IntegrationContext } from '../../types';
import {
  awsEvidenceManifest,
  createAwsEvidenceCollector,
} from '../collector';
import type { AwsFetch } from '../collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const REGION = 'us-east-1';

const IAM_URL = `https://iam.amazonaws.com?Action=ListAccessKeys&Version=2010-05-08`;
const S3_URL = `https://s3.${REGION}.amazonaws.com?Action=ListBuckets&Version=2006-03-01`;
const EC2_URL = `https://ec2.${REGION}.amazonaws.com?Action=DescribeInstances&Version=2016-11-15`;
const CT_URL = `https://cloudtrail.${REGION}.amazonaws.com?Action=DescribeTrails&Version=2013-11-01`;

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-aws-1',
    userId: 'user-1',
    credentials: {
      accessKeyId: 'AKIA_TEST',
      secretAccessKey: 'secret',
      region: REGION,
    },
    settings: {},
    ...overrides,
  };
}

/** Route map: exact URL → { status, body }. Missing routes → 404. */
function fakeFetcher(
  routes: Record<string, { status: number; body: unknown }>,
): AwsFetch {
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
    [IAM_URL]: {
      status: 200,
      body: {
        AccessKeys: [
          {
            AccessKeyId: 'AKIA_NEW',
            Status: 'Active',
            CreateDate: new Date(NOW.getTime() - 20 * DAY).toISOString(),
          },
        ],
      },
    },
    [S3_URL]: {
      status: 200,
      body: {
        Buckets: [{ Name: 'secure-bucket', Encryption: { SSEAlgorithm: 'aws:kms' } }],
      },
    },
    [EC2_URL]: {
      status: 200,
      body: {
        Instances: [{ InstanceId: 'i-1', PublicIpAddress: null, OpenPorts: [] }],
      },
    },
    [CT_URL]: {
      status: 200,
      body: { TrailList: [{ Name: 'main-trail', IsLogging: true }] },
    },
    ...overrides,
  };
}

describe('AWS evidence collector', () => {
  it('collects all four AWS evidence types with pass statuses for a healthy account', async () => {
    const collector = createAwsEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(4);
    const byId = Object.fromEntries(evidence.map((e) => [e.id, e]));

    expect(byId['aws-iam-access-key-age']?.status).toBe('pass');
    expect(byId['aws-s3-bucket-encryption']?.status).toBe('pass');
    expect(byId['aws-ec2-public-ports']?.status).toBe('pass');
    expect(byId['aws-cloudtrail-enabled']?.status).toBe('pass');

    // controlId + source normalization
    expect(byId['aws-iam-access-key-age']?.controlId).toBe('aws.iam-access-key-age');
    expect(byId['aws-s3-bucket-encryption']?.source).toBe('aws');
    expect(byId['aws-s3-bucket-encryption']?.collectedAt).toEqual(NOW);
  });

  it('fails when the oldest active IAM access key exceeds the 90-day limit', async () => {
    const collector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: {
            status: 200,
            body: {
              AccessKeys: [
                {
                  AccessKeyId: 'AKIA_OLD',
                  Status: 'Active',
                  CreateDate: new Date(NOW.getTime() - 200 * DAY).toISOString(),
                },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'aws-iam-access-key-age');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('200 days');
  });

  it('warns when the oldest IAM key is inside the 60-90 day buffer', async () => {
    const collector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: {
            status: 200,
            body: {
              AccessKeys: [
                {
                  AccessKeyId: 'AKIA_MID',
                  Status: 'Active',
                  CreateDate: new Date(NOW.getTime() - 75 * DAY).toISOString(),
                },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    expect(
      evidence.find((e) => e.id === 'aws-iam-access-key-age')?.status,
    ).toBe('warning');
  });

  it('fails when any S3 bucket lacks encryption', async () => {
    const collector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [S3_URL]: {
            status: 200,
            body: {
              Buckets: [
                { Name: 'encrypted', Encryption: { SSEAlgorithm: 'aws:kms' } },
                { Name: 'plain', Encryption: null },
                { Name: 'legacy', encrypted: false },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'aws-s3-bucket-encryption');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('2 of 3');
  });

  it('fails when an EC2 instance is public with open ports and warns on public-only', async () => {
    const openCollector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [EC2_URL]: {
            status: 200,
            body: {
              Instances: [
                { InstanceId: 'i-1', PublicIpAddress: '203.0.113.9', OpenPorts: [22, 3389] },
              ],
            },
          },
        }),
      ),
    );
    const open = await openCollector.collect(makeContext(), { now: NOW });
    expect(open.find((e) => e.id === 'aws-ec2-public-ports')?.status).toBe('fail');

    const publicOnlyCollector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [EC2_URL]: {
            status: 200,
            body: {
              Instances: [
                { InstanceId: 'i-1', PublicIpAddress: '203.0.113.9', OpenPorts: [] },
              ],
            },
          },
        }),
      ),
    );
    const publicOnly = await publicOnlyCollector.collect(makeContext(), { now: NOW });
    expect(publicOnly.find((e) => e.id === 'aws-ec2-public-ports')?.status).toBe(
      'warning',
    );
  });

  it('fails when no CloudTrail trails exist and warns when none are logging', async () => {
    const noneCollector = createAwsEvidenceCollector(
      fakeFetcher(buildRoutes({ [CT_URL]: { status: 200, body: { TrailList: [] } } })),
    );
    const none = await noneCollector.collect(makeContext(), { now: NOW });
    expect(none.find((e) => e.id === 'aws-cloudtrail-enabled')?.status).toBe('fail');

    const idleCollector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [CT_URL]: {
            status: 200,
            body: { TrailList: [{ Name: 't1', IsLogging: false }] },
          },
        }),
      ),
    );
    const idle = await idleCollector.collect(makeContext(), { now: NOW });
    expect(idle.find((e) => e.id === 'aws-cloudtrail-enabled')?.status).toBe(
      'warning',
    );
  });

  it('turns a malformed payload into an error evidence without throwing', async () => {
    const collector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [S3_URL]: { status: 200, body: { unexpected: 'shape' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'aws-s3-bucket-encryption');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('Malformed');
    // The other three checks still produced evidence
    expect(evidence).toHaveLength(4);
  });

  it('turns an HTTP 500 into an error evidence without aborting the batch', async () => {
    const collector = createAwsEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [IAM_URL]: { status: 500, body: { message: 'Internal Server Error' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'aws-iam-access-key-age');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('500');
    expect(evidence.filter((e) => e.status !== 'error')).toHaveLength(3);
  });

  it('turns a thrown fetcher error into error evidence (default/adapter failure)', async () => {
    const boom: AwsFetch = async () => {
      throw new Error('AWS client not configured');
    };
    const collector = createAwsEvidenceCollector(boom);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(4);
    expect(evidence.every((e) => e.status === 'error')).toBe(true);
    expect(evidence[0].description).toContain('AWS client not configured');
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const collector = createAwsEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0].status).toBe('error');
    expect(evidence[0].controlId).toBe('aws.authentication');
  });

  it('honors the region option when no region credential is present', async () => {
    const seen: string[] = [];
    const fetcher: AwsFetch = async (input: string) => {
      seen.push(String(input));
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const collector = createAwsEvidenceCollector(fetcher, { region: 'eu-west-1' });

    await collector.collect(
      makeContext({ credentials: { accessKeyId: 'AKIA_X', secretAccessKey: 's' } }),
      { now: NOW },
    );

    expect(seen.some((u) => u.includes('s3.eu-west-1.amazonaws.com'))).toBe(true);
    expect(seen.some((u) => u.includes('ec2.eu-west-1.amazonaws.com'))).toBe(true);
  });

  it('computes expiresAt from the per-type TTL and respects the limit option', async () => {
    const collector = createAwsEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'iam-access-key-age': 7 * DAY },
      limit: 2,
    });

    expect(evidence).toHaveLength(2);
    const keyAge = evidence.find((e) => e.id === 'aws-iam-access-key-age');
    expect(keyAge?.expiresAt).toEqual(new Date(NOW.getTime() + 7 * DAY));
  });

  it('exposes the AWS evidence manifest for discovery', () => {
    expect(awsEvidenceManifest.slug).toBe('aws');
    expect(awsEvidenceManifest.category).toBe('scanner');
    expect(awsEvidenceManifest.authentication.type).toBe('apiKey');
    expect(awsEvidenceManifest.capabilities.read).toBe(true);
    expect(
      awsEvidenceManifest.authentication.fields.map((f) => f.key),
    ).toContain('secretAccessKey');
  });
});
