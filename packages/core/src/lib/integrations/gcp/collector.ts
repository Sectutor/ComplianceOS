/**
 * GCP Evidence Collector (built-in)
 *
 * Manifest-driven evidence collector for Google Cloud Platform. Pulls
 * control-relevant evidence from GCP services (Cloud Storage, IAM, Compute,
 * Cloud SQL) and normalizes it into `CollectedEvidence` records:
 *
 *   - gcp.gcs-bucket-public-access → is public access prevention enforced?
 *   - gcp.iam-sa-key-rotation     → are service-account keys rotated?
 *   - gcp.compute-disk-encryption → are Compute Engine disks encrypted?
 *   - gcp.cloudsql-ssl-required   → is SSL required for Cloud SQL instances?
 *
 * The HTTP client accepts an injectable fetcher so unit tests can drive it
 * with canned responses — no network required. A production deployment injects
 * a fetch that performs the service-account token exchange and signs requests;
 * the default fetcher throws a clear "GCP client not configured" error rather
 * than silently sending unauthenticated requests. When no credentials are
 * configured, the collector emits a single 'error' evidence record rather than
 * throwing, so the batch runner treats it as graceful degradation. Every
 * per-check HTTP failure is converted into an 'error' evidence record — the
 * collector never throws for bad payloads or transient API failures.
 */

import type { IntegrationManifest, IntegrationContext } from '../types';
import type {
  EvidenceCollector,
  CollectedEvidence,
  CollectOptions,
} from '../collector';
import { normalizeEvidence } from '../collector';

/** Minimal Response shape we rely on — keeps the fetcher trivially fake-able. */
export interface GcpFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type GcpFetch = (
  url: string,
  init?: RequestInit,
) => Promise<GcpFetchResponse>;

/** Default fetcher: refuses to send unauthenticated GCP requests. */
function defaultGcpFetch(): GcpFetch {
  return () => {
    throw new Error(
      'GCP client not configured: createGcpEvidenceCollector() requires an injectable fetch. ' +
        'Pass an OAuth-authenticated adapter (or SDK-backed fetcher) so requests are authorized.',
    );
  };
}

export const gcpEvidenceManifest: IntegrationManifest = {
  slug: 'gcp',
  name: 'GCP Evidence',
  version: '1.0.0',
  description:
    'Collects control-mapped evidence from Google Cloud: bucket public access, service-account key rotation, disk encryption, and Cloud SQL SSL.',
  author: {
    name: 'ComplianceOS',
    url: 'https://complianceos.com',
  },
  license: 'MIT',
  category: 'scanner',
  tags: ['gcp', 'google-cloud', 'cloud', 'evidence', 'security'],
  homepage: 'https://cloud.google.com',
  capabilities: {
    read: true,
    sync: true,
  },
  authentication: {
    type: 'apiKey',
    fields: [
      {
        key: 'serviceAccountEmail',
        type: 'string',
        label: 'GCP Service Account Email',
        description: 'Email of the service account used to authenticate.',
        required: true,
      },
      {
        key: 'privateKey',
        type: 'password',
        label: 'GCP Service Account Private Key',
        description: 'Private key of the service account (or a pre-issued access token).',
        required: true,
        sensitive: true,
      },
      {
        key: 'projectId',
        type: 'string',
        label: 'GCP Project ID',
        description: 'Project whose resources are scanned.',
        required: false,
      },
    ],
  },
  actions: [],
  triggers: [],
  rateLimit: {
    requests: 300,
    window: 60,
  },
};

/** Service endpoint builders — the injectable adapter contract. */
const GCP_ENDPOINTS = {
  storage: () => 'https://storage.googleapis.com/storage/v1/b',
  iam: (project: string) =>
    `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`,
  compute: (project: string) =>
    `https://compute.googleapis.com/compute/v1/projects/${project}/aggregated/disks`,
  cloudsql: (project: string) =>
    `https://sqladmin.googleapis.com/sql/v1beta4/projects/${project}/instances`,
};

interface GcpCheckSpec {
  id: string;
  controlId: string;
  type: string;
  title: string;
}

function gcpCheckError(
  spec: GcpCheckSpec,
  description: string,
  now: Date,
): CollectedEvidence {
  return {
    id: spec.id,
    controlId: spec.controlId,
    source: gcpEvidenceManifest.slug,
    type: spec.type,
    status: 'error',
    title: spec.title,
    description,
    collectedAt: now,
  };
}

/**
 * Run one GCP check through the injectable fetcher. Any HTTP failure,
 * unparseable body, or thrown error is converted into a single 'error'
 * evidence record — the batch runner never sees a throw from this collector.
 */
async function runGcpCheck(
  fetcher: GcpFetch,
  url: string,
  headers: Record<string, string>,
  spec: GcpCheckSpec,
  now: Date,
  map: (data: unknown) => CollectedEvidence,
): Promise<CollectedEvidence> {
  try {
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      return gcpCheckError(
        spec,
        `GCP API error ${response.status} on ${url}: ${body?.message ?? 'unknown'}`,
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
    return gcpCheckError(spec, err?.message ?? String(err), now);
  }
}

function gcsBucketPublicAccessEvidence(
  data: unknown,
  now: Date,
): CollectedEvidence {
  const spec: GcpCheckSpec = {
    id: 'gcp-gcs-bucket-public-access',
    controlId: 'gcp.gcs-bucket-public-access',
    type: 'gcs-bucket-public-access',
    title: 'Cloud Storage bucket public access',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.buckets) || Array.isArray(rec?.items);
  const buckets: unknown[] = Array.isArray(rec?.buckets)
    ? (rec?.buckets as unknown[])
    : Array.isArray(rec?.items)
      ? (rec?.items as unknown[])
      : [];
  if (!hasArray) {
    return gcpCheckError(
      spec,
      'Malformed Cloud Storage buckets payload: expected a buckets (or items) array.',
      now,
    );
  }
  if (buckets.length === 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'warning',
      description: 'No Cloud Storage buckets found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const publicBuckets = buckets.filter((bucket) => {
    if (!bucket || typeof bucket !== 'object') return true; // fail-safe
    const recB = bucket as Record<string, unknown>;
    if (recB.publicAccess === true) return true;
    if (recB.publicAccess === false) return false;
    const iamConfig = recB.iamConfiguration &&
      typeof recB.iamConfiguration === 'object'
      ? (recB.iamConfiguration as Record<string, unknown>)
      : null;
    const prevention = iamConfig?.publicAccessPrevention;
    return typeof prevention === 'string' ? prevention !== 'enforced' : true;
  });

  if (publicBuckets.length > 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'fail',
      description: `${publicBuckets.length} of ${buckets.length} bucket(s) are not protected by public access prevention — enforce publicAccessPrevention on all buckets.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: gcpEvidenceManifest.slug,
    status: 'pass',
    description: `All ${buckets.length} bucket(s) enforce public access prevention.`,
    collectedAt: now,
    rawData: data,
  };
}

function iamSaKeyRotationEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: GcpCheckSpec = {
    id: 'gcp-iam-sa-key-rotation',
    controlId: 'gcp.iam-sa-key-rotation',
    type: 'iam-sa-key-rotation',
    title: 'Service account key rotation',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray =
    Array.isArray(rec?.serviceAccounts) || Array.isArray(rec?.accounts);
  const accounts: unknown[] = Array.isArray(rec?.serviceAccounts)
    ? (rec?.serviceAccounts as unknown[])
    : Array.isArray(rec?.accounts)
      ? (rec?.accounts as unknown[])
      : [];
  if (!hasArray) {
    return gcpCheckError(
      spec,
      'Malformed IAM service accounts payload: expected a serviceAccounts array.',
      now,
    );
  }
  if (accounts.length === 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'warning',
      description: 'No service accounts found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  let oldestKeyMs: number | null = null;
  let keyCount = 0;
  for (const account of accounts) {
    if (!account || typeof account !== 'object') continue;
    const recA = account as Record<string, unknown>;
    const keys = Array.isArray(recA.keys) ? (recA.keys as unknown[]) : [];
    for (const key of keys) {
      if (!key || typeof key !== 'object') continue;
      const recK = key as Record<string, unknown>;
      const created = recK.createdAt ?? recK.createdOn ?? recK.createDate;
      const ms =
        created instanceof Date
          ? created.getTime()
          : typeof created === 'string'
            ? new Date(created).getTime()
            : Number.NaN;
      if (!Number.isNaN(ms)) {
        keyCount += 1;
        if (oldestKeyMs === null || ms < oldestKeyMs) oldestKeyMs = ms;
      }
    }
  }

  if (keyCount === 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'pass',
      description: `${accounts.length} service account(s) found with no user-managed keys to rotate.`,
      collectedAt: now,
      rawData: data,
    };
  }

  const ageDays = Math.floor(
    (now.getTime() - oldestKeyMs!) / (1000 * 60 * 60 * 24),
  );
  const status: CollectedEvidence['status'] =
    ageDays > 180 ? 'fail' : ageDays > 90 ? 'warning' : 'pass';
  const description =
    ageDays > 180
      ? `Oldest service account key is ${ageDays} days old (180-day limit) — rotate and delete stale keys.`
      : ageDays > 90
        ? `Oldest service account key is ${ageDays} days old — schedule rotation before the 180-day limit.`
        : `All ${keyCount} service account key(s) are within the 180-day rotation window (oldest ${ageDays} days).`;
  return {
    ...spec,
    source: gcpEvidenceManifest.slug,
    status,
    description,
    collectedAt: now,
    rawData: data,
  };
}

function computeDiskEncryptionEvidence(
  data: unknown,
  now: Date,
): CollectedEvidence {
  const spec: GcpCheckSpec = {
    id: 'gcp-compute-disk-encryption',
    controlId: 'gcp.compute-disk-encryption',
    type: 'compute-disk-encryption',
    title: 'Compute Engine disk encryption',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.disks) || Array.isArray(rec?.items);
  const disks: unknown[] = Array.isArray(rec?.disks)
    ? (rec?.disks as unknown[])
    : Array.isArray(rec?.items)
      ? (rec?.items as unknown[])
      : [];
  if (!hasArray) {
    return gcpCheckError(
      spec,
      'Malformed Compute disks payload: expected a disks (or items) array.',
      now,
    );
  }
  if (disks.length === 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'warning',
      description: 'No Compute Engine disks found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const unencrypted = disks.filter((disk) => {
    if (!disk || typeof disk !== 'object') return true; // fail-safe
    const recD = disk as Record<string, unknown>;
    if (recD.encrypted === true) return false;
    if (recD.encrypted === false) return true;
    const key = recD.diskEncryptionKey ?? recD.kmsKeyName;
    return !key;
  });

  if (unencrypted.length > 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'fail',
      description: `${unencrypted.length} of ${disks.length} disk(s) are NOT encrypted with a customer- or Google-managed key.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: gcpEvidenceManifest.slug,
    status: 'pass',
    description: `All ${disks.length} disk(s) are encrypted.`,
    collectedAt: now,
    rawData: data,
  };
}

function cloudsqlSslRequiredEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: GcpCheckSpec = {
    id: 'gcp-cloudsql-ssl-required',
    controlId: 'gcp.cloudsql-ssl-required',
    type: 'cloudsql-ssl-required',
    title: 'Cloud SQL SSL required',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.instances) || Array.isArray(rec?.items);
  const instances: unknown[] = Array.isArray(rec?.instances)
    ? (rec?.instances as unknown[])
    : Array.isArray(rec?.items)
      ? (rec?.items as unknown[])
      : [];
  if (!hasArray) {
    return gcpCheckError(
      spec,
      'Malformed Cloud SQL instances payload: expected an instances (or items) array.',
      now,
    );
  }
  if (instances.length === 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'warning',
      description: 'No Cloud SQL instances found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const withoutSsl = instances.filter((instance) => {
    if (!instance || typeof instance !== 'object') return true; // fail-safe
    const recI = instance as Record<string, unknown>;
    if (recI.sslRequired === true) return false;
    if (recI.sslRequired === false) return true;
    const settings = recI.settings && typeof recI.settings === 'object'
      ? (recI.settings as Record<string, unknown>)
      : null;
    if (!settings) return true;
    const requireSsl = settings.requireSsl ?? settings.requireSSL;
    if (requireSsl === true) return false;
    const ipConfig = settings.ipConfiguration &&
      typeof settings.ipConfiguration === 'object'
      ? (settings.ipConfiguration as Record<string, unknown>)
      : null;
    if (ipConfig && (ipConfig.requireSsl === true || ipConfig.requireSsl === 'true')) {
      return false;
    }
    return true;
  });

  if (withoutSsl.length > 0) {
    return {
      ...spec,
      source: gcpEvidenceManifest.slug,
      status: 'fail',
      description: `${withoutSsl.length} of ${instances.length} Cloud SQL instance(s) do NOT require SSL — enable SSL enforcement.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: gcpEvidenceManifest.slug,
    status: 'pass',
    description: `All ${instances.length} Cloud SQL instance(s) require SSL.`,
    collectedAt: now,
    rawData: data,
  };
}

async function collectGcpEvidence(
  fetcher: GcpFetch,
  context: IntegrationContext,
  options?: CollectOptions,
): Promise<CollectedEvidence[]> {
  const now = options?.now ?? new Date();
  const slug = gcpEvidenceManifest.slug;
  const token = context.credentials.accessToken ?? context.credentials.token;
  const serviceAccountEmail =
    context.credentials.serviceAccountEmail ??
    context.credentials.clientEmail ??
    context.credentials.client_email;
  const privateKey =
    context.credentials.privateKey ??
    context.credentials.private_key ??
    context.credentials.serviceAccountKey;
  const projectId =
    context.credentials.projectId ?? context.credentials.project_id ?? '-';

  if (!token && !(serviceAccountEmail && privateKey)) {
    return [
      normalizeEvidence(
        {
          id: 'gcp-credentials-missing',
          controlId: 'gcp.authentication',
          source: slug,
          type: 'authentication',
          status: 'error',
          title: 'GCP credentials not configured',
          description:
            'No accessToken/token (or serviceAccountEmail + privateKey) credentials are set for the ' +
            'GCP evidence collector. Add credentials to begin collecting GCP evidence.',
          collectedAt: now,
        },
        slug,
        options,
      ),
    ];
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token ?? privateKey}`,
  };

  const evidence = [
    await runGcpCheck(
      fetcher,
      GCP_ENDPOINTS.storage(),
      headers,
      {
        id: 'gcp-gcs-bucket-public-access',
        controlId: 'gcp.gcs-bucket-public-access',
        type: 'gcs-bucket-public-access',
        title: 'Cloud Storage bucket public access',
      },
      now,
      (data) => gcsBucketPublicAccessEvidence(data, now),
    ),
    await runGcpCheck(
      fetcher,
      GCP_ENDPOINTS.iam(projectId),
      headers,
      {
        id: 'gcp-iam-sa-key-rotation',
        controlId: 'gcp.iam-sa-key-rotation',
        type: 'iam-sa-key-rotation',
        title: 'Service account key rotation',
      },
      now,
      (data) => iamSaKeyRotationEvidence(data, now),
    ),
    await runGcpCheck(
      fetcher,
      GCP_ENDPOINTS.compute(projectId),
      headers,
      {
        id: 'gcp-compute-disk-encryption',
        controlId: 'gcp.compute-disk-encryption',
        type: 'compute-disk-encryption',
        title: 'Compute Engine disk encryption',
      },
      now,
      (data) => computeDiskEncryptionEvidence(data, now),
    ),
    await runGcpCheck(
      fetcher,
      GCP_ENDPOINTS.cloudsql(projectId),
      headers,
      {
        id: 'gcp-cloudsql-ssl-required',
        controlId: 'gcp.cloudsql-ssl-required',
        type: 'cloudsql-ssl-required',
        title: 'Cloud SQL SSL required',
      },
      now,
      (data) => cloudsqlSslRequiredEvidence(data, now),
    ),
  ];

  const capped =
    typeof options?.limit === 'number' ? evidence.slice(0, options.limit) : evidence;
  return capped.map((e) => normalizeEvidence(e, slug, options));
}

/**
 * Create a GCP evidence collector with an optional injectable fetcher
 * (defaults to a fetcher that throws a clear "GCP client not configured"
 * error). Tests pass a fake fetcher.
 */
export function createGcpEvidenceCollector(
  fetch?: GcpFetch,
): EvidenceCollector {
  const doFetch: GcpFetch = fetch ?? defaultGcpFetch();
  return {
    manifest: gcpEvidenceManifest,
    collect(context: IntegrationContext, collectOptions?: CollectOptions) {
      return collectGcpEvidence(doFetch, context, collectOptions);
    },
  };
}

/** Shared built-in instance — requires an injected adapter to function. */
export const gcpEvidenceCollector: EvidenceCollector =
  createGcpEvidenceCollector();
