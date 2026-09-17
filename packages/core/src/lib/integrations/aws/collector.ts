/**
 * AWS Evidence Collector (built-in)
 *
 * Manifest-driven evidence collector for AWS. Pulls control-relevant
 * evidence from AWS services (IAM, S3, EC2, CloudTrail) and normalizes it
 * into `CollectedEvidence` records:
 *
 *   - aws.iam-access-key-age   → are IAM access keys rotated within 90 days?
 *   - aws.s3-bucket-encryption → are S3 buckets encrypted at rest?
 *   - aws.ec2-public-ports     → are EC2 instances exposed with public ports?
 *   - aws.cloudtrail-enabled   → is CloudTrail audit logging enabled?
 *
 * The HTTP client accepts an injectable fetcher so unit tests can drive it
 * with canned responses — no network required. A production deployment
 * injects a SigV4-signed adapter (or SDK-backed fetch); the default fetcher
 * throws a clear "AWS client not configured" error rather than silently
 * sending unsigned requests. When no credentials are configured, the collector
 * emits a single 'error' evidence record rather than throwing, so the batch
 * runner treats it as graceful degradation. Every per-check HTTP failure is
 * converted into an 'error' evidence record — the collector never throws for
 * bad payloads or transient API failures.
 */

import type { IntegrationManifest, IntegrationContext } from '../types';
import type {
  EvidenceCollector,
  CollectedEvidence,
  CollectOptions,
} from '../collector';
import { normalizeEvidence } from '../collector';

/** Minimal Response shape we rely on — keeps the fetcher trivially fake-able. */
export interface AwsFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type AwsFetch = (
  url: string,
  init?: RequestInit,
) => Promise<AwsFetchResponse>;

/** Default fetcher: refuses to send unsigned AWS requests. */
function defaultAwsFetch(): AwsFetch {
  return () => {
    throw new Error(
      'AWS client not configured: createAwsEvidenceCollector() requires an injectable fetch. ' +
        'Pass a SigV4-signed adapter (or SDK-backed fetcher) so requests are authenticated.',
    );
  };
}

export const awsEvidenceManifest: IntegrationManifest = {
  slug: 'aws',
  name: 'AWS Evidence',
  version: '1.0.0',
  description:
    'Collects control-mapped evidence from AWS: IAM access key age, S3 bucket encryption, EC2 public port exposure, and CloudTrail enablement.',
  author: {
    name: 'ComplianceOS',
    url: 'https://complianceos.com',
  },
  license: 'MIT',
  category: 'scanner',
  tags: ['aws', 'cloud', 'evidence', 'security'],
  homepage: 'https://aws.amazon.com',
  capabilities: {
    read: true,
    sync: true,
  },
  authentication: {
    type: 'apiKey',
    fields: [
      {
        key: 'accessKeyId',
        type: 'string',
        label: 'AWS Access Key ID',
        description: 'Access key used to authenticate against the AWS APIs.',
        required: true,
      },
      {
        key: 'secretAccessKey',
        type: 'password',
        label: 'AWS Secret Access Key',
        description: 'Secret key paired with the access key ID.',
        required: true,
        sensitive: true,
      },
      {
        key: 'region',
        type: 'string',
        label: 'AWS Region',
        description: 'Default region for regional services (e.g. us-east-1).',
        required: false,
        placeholder: 'us-east-1',
      },
    ],
  },
  actions: [],
  triggers: [],
  rateLimit: {
    requests: 1000,
    window: 60,
  },
};

/** Service endpoint builders — the injectable adapter contract. */
const AWS_ENDPOINTS = {
  iam: () => 'https://iam.amazonaws.com',
  s3: (region: string) => `https://s3.${region}.amazonaws.com`,
  ec2: (region: string) => `https://ec2.${region}.amazonaws.com`,
  cloudtrail: (region: string) => `https://cloudtrail.${region}.amazonaws.com`,
};

interface AwsCheckSpec {
  id: string;
  controlId: string;
  type: string;
  title: string;
}

function awsCheckError(
  spec: AwsCheckSpec,
  description: string,
  now: Date,
): CollectedEvidence {
  return {
    id: spec.id,
    controlId: spec.controlId,
    source: awsEvidenceManifest.slug,
    type: spec.type,
    status: 'error',
    title: spec.title,
    description,
    collectedAt: now,
  };
}

/**
 * Run one AWS check through the injectable fetcher. Any HTTP failure,
 * unparseable body, or thrown error is converted into a single 'error'
 * evidence record — the batch runner never sees a throw from this collector.
 */
async function runAwsCheck(
  fetcher: AwsFetch,
  url: string,
  headers: Record<string, string>,
  spec: AwsCheckSpec,
  now: Date,
  map: (data: unknown) => CollectedEvidence,
): Promise<CollectedEvidence> {
  try {
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      return awsCheckError(
        spec,
        `AWS API error ${response.status} on ${url}: ${body?.message ?? 'unknown'}`,
        now,
      );
    }
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return map(data);
  } catch (err: any) {
    return awsCheckError(spec, err?.message ?? String(err), now);
  }
}

function iamAccessKeyAgeEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AwsCheckSpec = {
    id: 'aws-iam-access-key-age',
    controlId: 'aws.iam-access-key-age',
    type: 'iam-access-key-age',
    title: 'IAM access key rotation',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const keys: unknown[] = Array.isArray(rec?.AccessKeys)
    ? (rec?.AccessKeys as unknown[])
    : Array.isArray(rec?.accessKeys)
      ? (rec?.accessKeys as unknown[])
      : [];
  if (!Array.isArray(rec?.AccessKeys) && !Array.isArray(rec?.accessKeys)) {
    return awsCheckError(
      spec,
      'Malformed IAM ListAccessKeys payload: expected an AccessKeys array.',
      now,
    );
  }
  if (keys.length === 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'pass',
      description: 'No IAM access keys found — nothing to rotate.',
      collectedAt: now,
      rawData: data,
    };
  }

  let oldestCreateMs: number | null = null;
  let activeCount = 0;
  for (const key of keys) {
    const recK = key && typeof key === 'object'
      ? (key as Record<string, unknown>)
      : {};
    const status = String(recK.Status ?? recK.status ?? 'Active');
    if (status !== 'Active') continue;
    activeCount += 1;
    const created = recK.CreateDate ?? recK.createDate ?? recK.createdAt;
    const ms =
      created instanceof Date
        ? created.getTime()
        : typeof created === 'string'
          ? new Date(created).getTime()
          : Number.NaN;
    if (!Number.isNaN(ms) && (oldestCreateMs === null || ms < oldestCreateMs)) {
      oldestCreateMs = ms;
    }
  }

  if (activeCount === 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'pass',
      description: 'No active IAM access keys found.',
      collectedAt: now,
      rawData: data,
    };
  }
  if (oldestCreateMs === null) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'warning',
      description:
        'Active IAM access keys found, but none had a parseable creation date.',
      collectedAt: now,
      rawData: data,
    };
  }

  const ageDays = Math.floor(
    (now.getTime() - oldestCreateMs) / (1000 * 60 * 60 * 24),
  );
  const status: CollectedEvidence['status'] =
    ageDays > 90 ? 'fail' : ageDays > 60 ? 'warning' : 'pass';
  const description =
    ageDays > 90
      ? `Oldest active IAM access key is ${ageDays} days old (90-day limit) — rotate it now.`
      : ageDays > 60
        ? `Oldest active IAM access key is ${ageDays} days old — schedule rotation before the 90-day limit.`
        : `All active IAM access keys are within the 90-day rotation window (oldest ${ageDays} days).`;
  return {
    ...spec,
    source: awsEvidenceManifest.slug,
    status,
    description,
    collectedAt: now,
    rawData: data,
  };
}

function s3BucketEncryptionEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AwsCheckSpec = {
    id: 'aws-s3-bucket-encryption',
    controlId: 'aws.s3-bucket-encryption',
    type: 's3-bucket-encryption',
    title: 'S3 bucket encryption at rest',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.Buckets) || Array.isArray(rec?.buckets);
  const buckets: unknown[] = Array.isArray(rec?.Buckets)
    ? (rec?.Buckets as unknown[])
    : Array.isArray(rec?.buckets)
      ? (rec?.buckets as unknown[])
      : [];
  if (!hasArray) {
    return awsCheckError(
      spec,
      'Malformed S3 ListBuckets payload: expected a Buckets array.',
      now,
    );
  }
  if (buckets.length === 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'warning',
      description: 'No S3 buckets found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const unencrypted = buckets.filter((bucket) => {
    if (!bucket || typeof bucket !== 'object') return true; // fail-safe
    const recB = bucket as Record<string, unknown>;
    const enc = recB.Encryption ?? recB.encryption;
    const encryptedFlag = recB.encrypted;
    if (encryptedFlag === true) return false;
    if (enc && typeof enc === 'object') {
      const algo = (enc as Record<string, unknown>).SSEAlgorithm ??
        (enc as Record<string, unknown>).sseAlgorithm;
      return !algo;
    }
    return true;
  });

  if (unencrypted.length > 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'fail',
      description: `${unencrypted.length} of ${buckets.length} S3 bucket(s) are NOT encrypted at rest — enable default encryption (SSE-S3/SSE-KMS).`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: awsEvidenceManifest.slug,
    status: 'pass',
    description: `All ${buckets.length} S3 bucket(s) are encrypted at rest.`,
    collectedAt: now,
    rawData: data,
  };
}

function ec2PublicPortsEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AwsCheckSpec = {
    id: 'aws-ec2-public-ports',
    controlId: 'aws.ec2-public-ports',
    type: 'ec2-public-ports',
    title: 'EC2 public port exposure',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.Instances) || Array.isArray(rec?.instances);
  const instances: unknown[] = Array.isArray(rec?.Instances)
    ? (rec?.Instances as unknown[])
    : Array.isArray(rec?.instances)
      ? (rec?.instances as unknown[])
      : [];
  if (!hasArray) {
    return awsCheckError(
      spec,
      'Malformed EC2 DescribeInstances payload: expected an Instances array.',
      now,
    );
  }
  if (instances.length === 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'pass',
      description: 'No EC2 instances found — nothing exposed.',
      collectedAt: now,
      rawData: data,
    };
  }

  const publicInstances = instances.filter((inst) => {
    if (!inst || typeof inst !== 'object') return false;
    const recI = inst as Record<string, unknown>;
    const publicIp = recI.PublicIpAddress ?? recI.publicIpAddress ?? recI.publicIp;
    return typeof publicIp === 'string' && publicIp.length > 0;
  });
  const openInstances = publicInstances.filter((inst) => {
    if (!inst || typeof inst !== 'object') return false;
    const recI = inst as Record<string, unknown>;
    const openPorts = recI.OpenPorts ?? recI.openPorts;
    const sgOpen = recI.SecurityGroupOpen ?? recI.securityGroupOpen ?? false;
    return (Array.isArray(openPorts) && openPorts.length > 0) || sgOpen === true;
  });

  if (openInstances.length > 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'fail',
      description: `${openInstances.length} EC2 instance(s) have a public IP AND open inbound ports (e.g. 0.0.0.0/0) — restrict security group ingress.`,
      collectedAt: now,
      rawData: data,
    };
  }
  if (publicInstances.length > 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'warning',
      description: `${publicInstances.length} EC2 instance(s) have public IPs — confirm inbound access is restricted by security groups.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: awsEvidenceManifest.slug,
    status: 'pass',
    description: `No EC2 instances are publicly exposed.`,
    collectedAt: now,
    rawData: data,
  };
}

function cloudtrailEnabledEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AwsCheckSpec = {
    id: 'aws-cloudtrail-enabled',
    controlId: 'aws.cloudtrail-enabled',
    type: 'cloudtrail-enabled',
    title: 'CloudTrail audit logging enabled',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray =
    Array.isArray(rec?.TrailList) ||
    Array.isArray(rec?.trailList) ||
    Array.isArray(rec?.trails);
  const trails: unknown[] = Array.isArray(rec?.TrailList)
    ? (rec?.TrailList as unknown[])
    : Array.isArray(rec?.trailList)
      ? (rec?.trailList as unknown[])
      : Array.isArray(rec?.trails)
        ? (rec?.trails as unknown[])
        : [];
  if (!hasArray) {
    return awsCheckError(
      spec,
      'Malformed CloudTrail DescribeTrails payload: expected a TrailList array.',
      now,
    );
  }
  if (trails.length === 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'fail',
      description: 'No CloudTrail trails found — enable CloudTrail for audit logging.',
      collectedAt: now,
      rawData: data,
    };
  }

  const logging = trails.filter((trail) => {
    if (!trail || typeof trail !== 'object') return false;
    const recT = trail as Record<string, unknown>;
    return recT.IsLogging === true || recT.isLogging === true;
  });

  if (logging.length > 0) {
    return {
      ...spec,
      source: awsEvidenceManifest.slug,
      status: 'pass',
      description: `${logging.length} CloudTrail trail(s) are actively logging API activity.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: awsEvidenceManifest.slug,
    status: 'warning',
    description: 'CloudTrail trails exist, but none is actively logging.',
    collectedAt: now,
    rawData: data,
  };
}

async function collectAwsEvidence(
  fetcher: AwsFetch,
  defaultRegion: string,
  context: IntegrationContext,
  options?: CollectOptions,
): Promise<CollectedEvidence[]> {
  const now = options?.now ?? new Date();
  const slug = awsEvidenceManifest.slug;
  const accessKeyId =
    context.credentials.accessKeyId ??
    context.credentials.access_key_id ??
    context.credentials.awsAccessKeyId;
  const secretAccessKey =
    context.credentials.secretAccessKey ??
    context.credentials.secret_access_key ??
    context.credentials.awsSecretAccessKey;
  const region = context.credentials.region ?? defaultRegion;

  if (!accessKeyId || !secretAccessKey) {
    return [
      normalizeEvidence(
        {
          id: 'aws-credentials-missing',
          controlId: 'aws.authentication',
          source: slug,
          type: 'authentication',
          status: 'error',
          title: 'AWS credentials not configured',
          description:
            'No accessKeyId/secretAccessKey credentials are set for the AWS evidence collector. ' +
            'Add credentials to begin collecting AWS evidence.',
          collectedAt: now,
        },
        slug,
        options,
      ),
    ];
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${region}/complianceos`,
    'X-Amz-Date': now.toISOString(),
  };

  const evidence = [
    await runAwsCheck(
      fetcher,
      `${AWS_ENDPOINTS.iam()}?Action=ListAccessKeys&Version=2010-05-08`,
      headers,
      {
        id: 'aws-iam-access-key-age',
        controlId: 'aws.iam-access-key-age',
        type: 'iam-access-key-age',
        title: 'IAM access key rotation',
      },
      now,
      (data) => iamAccessKeyAgeEvidence(data, now),
    ),
    await runAwsCheck(
      fetcher,
      `${AWS_ENDPOINTS.s3(region)}?Action=ListBuckets&Version=2006-03-01`,
      headers,
      {
        id: 'aws-s3-bucket-encryption',
        controlId: 'aws.s3-bucket-encryption',
        type: 's3-bucket-encryption',
        title: 'S3 bucket encryption at rest',
      },
      now,
      (data) => s3BucketEncryptionEvidence(data, now),
    ),
    await runAwsCheck(
      fetcher,
      `${AWS_ENDPOINTS.ec2(region)}?Action=DescribeInstances&Version=2016-11-15`,
      headers,
      {
        id: 'aws-ec2-public-ports',
        controlId: 'aws.ec2-public-ports',
        type: 'ec2-public-ports',
        title: 'EC2 public port exposure',
      },
      now,
      (data) => ec2PublicPortsEvidence(data, now),
    ),
    await runAwsCheck(
      fetcher,
      `${AWS_ENDPOINTS.cloudtrail(region)}?Action=DescribeTrails&Version=2013-11-01`,
      headers,
      {
        id: 'aws-cloudtrail-enabled',
        controlId: 'aws.cloudtrail-enabled',
        type: 'cloudtrail-enabled',
        title: 'CloudTrail audit logging enabled',
      },
      now,
      (data) => cloudtrailEnabledEvidence(data, now),
    ),
  ];

  const capped =
    typeof options?.limit === 'number' ? evidence.slice(0, options.limit) : evidence;
  return capped.map((e) => normalizeEvidence(e, slug, options));
}

/**
 * Create an AWS evidence collector with an optional injectable fetcher
 * (defaults to a fetcher that throws a clear "AWS client not configured"
 * error). Tests pass a fake fetcher.
 */
export function createAwsEvidenceCollector(
  fetch?: AwsFetch,
  options: { region?: string } = {},
): EvidenceCollector {
  const doFetch: AwsFetch = fetch ?? defaultAwsFetch();
  const region = options.region ?? 'us-east-1';
  return {
    manifest: awsEvidenceManifest,
    collect(context: IntegrationContext, collectOptions?: CollectOptions) {
      return collectAwsEvidence(doFetch, region, context, collectOptions);
    },
  };
}

/** Shared built-in instance — requires an injected adapter to function. */
export const awsEvidenceCollector: EvidenceCollector =
  createAwsEvidenceCollector();
