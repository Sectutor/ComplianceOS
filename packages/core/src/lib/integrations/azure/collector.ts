/**
 * Azure Evidence Collector (built-in)
 *
 * Manifest-driven evidence collector for Microsoft Azure. Pulls control-
 * relevant evidence from Azure services (Entra MFA, Defender for Cloud,
 * Storage, SQL) and normalizes it into `CollectedEvidence` records:
 *
 *   - azure.mfa-status          → is MFA enforced for all users?
 *   - azure.defender-plan-status→ is Microsoft Defender for Cloud enabled?
 *   - azure.storage-encryption  → are storage accounts encrypted at rest?
 *   - azure.sql-auditing-enabled→ is SQL auditing enabled on all servers?
 *
 * The HTTP client accepts an injectable fetcher so unit tests can drive it
 * with canned responses — no network required. A production deployment injects
 * a fetch that performs the OAuth token exchange and signs requests; the
 * default fetcher throws a clear "Azure client not configured" error rather
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
export interface AzureFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type AzureFetch = (
  url: string,
  init?: RequestInit,
) => Promise<AzureFetchResponse>;

/** Default fetcher: refuses to send unauthenticated Azure requests. */
function defaultAzureFetch(): AzureFetch {
  return () => {
    throw new Error(
      'Azure client not configured: createAzureEvidenceCollector() requires an injectable fetch. ' +
        'Pass an OAuth-authenticated adapter (or SDK-backed fetcher) so requests are authorized.',
    );
  };
}

export const azureEvidenceManifest: IntegrationManifest = {
  slug: 'azure',
  name: 'Azure Evidence',
  version: '1.0.0',
  description:
    'Collects control-mapped evidence from Microsoft Azure: MFA enforcement, Defender for Cloud status, storage encryption, and SQL auditing.',
  author: {
    name: 'ComplianceOS',
    url: 'https://complianceos.com',
  },
  license: 'MIT',
  category: 'scanner',
  tags: ['azure', 'cloud', 'evidence', 'security'],
  homepage: 'https://azure.microsoft.com',
  capabilities: {
    read: true,
    sync: true,
  },
  authentication: {
    type: 'apiKey',
    fields: [
      {
        key: 'clientId',
        type: 'string',
        label: 'Azure Client (App) ID',
        description: 'Application (client) ID of the service principal.',
        required: true,
      },
      {
        key: 'clientSecret',
        type: 'password',
        label: 'Azure Client Secret',
        description: 'Client secret of the service principal.',
        required: true,
        sensitive: true,
      },
      {
        key: 'tenantId',
        type: 'string',
        label: 'Azure Tenant ID',
        description: 'Directory (tenant) ID.',
        required: true,
      },
      {
        key: 'subscriptionId',
        type: 'string',
        label: 'Azure Subscription ID',
        description: 'Subscription under which resources are scanned.',
        required: false,
      },
    ],
  },
  actions: [],
  triggers: [],
  rateLimit: {
    requests: 600,
    window: 60,
  },
};

const AZURE_API_BASE = 'https://management.azure.com';
const AZURE_API_VERSION = '2024-01-01';

interface AzureCheckSpec {
  id: string;
  controlId: string;
  type: string;
  title: string;
}

function azureCheckError(
  spec: AzureCheckSpec,
  description: string,
  now: Date,
): CollectedEvidence {
  return {
    id: spec.id,
    controlId: spec.controlId,
    source: azureEvidenceManifest.slug,
    type: spec.type,
    status: 'error',
    title: spec.title,
    description,
    collectedAt: now,
  };
}

/**
 * Run one Azure check through the injectable fetcher. Any HTTP failure,
 * unparseable body, or thrown error is converted into a single 'error'
 * evidence record — the batch runner never sees a throw from this collector.
 */
async function runAzureCheck(
  fetcher: AzureFetch,
  url: string,
  headers: Record<string, string>,
  spec: AzureCheckSpec,
  now: Date,
  map: (data: unknown) => CollectedEvidence,
): Promise<CollectedEvidence> {
  try {
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      return azureCheckError(
        spec,
        `Azure API error ${response.status} on ${url}: ${body?.message ?? 'unknown'}`,
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
    return azureCheckError(spec, err?.message ?? String(err), now);
  }
}

function mfaStatusEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AzureCheckSpec = {
    id: 'azure-mfa-status',
    controlId: 'azure.mfa-status',
    type: 'mfa-status',
    title: 'Multi-factor authentication (MFA) enforcement',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.value) || Array.isArray(rec?.users);
  const users: unknown[] = Array.isArray(rec?.value)
    ? (rec?.value as unknown[])
    : Array.isArray(rec?.users)
      ? (rec?.users as unknown[])
      : [];
  if (!hasArray) {
    return azureCheckError(
      spec,
      'Malformed Azure users payload: expected a value array of user records.',
      now,
    );
  }
  if (users.length === 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'warning',
      description: 'No users found to evaluate MFA coverage.',
      collectedAt: now,
      rawData: data,
    };
  }

  const withoutMfa = users.filter((user) => {
    if (!user || typeof user !== 'object') return true; // fail-safe
    const recU = user as Record<string, unknown>;
    const mfaEnabled = recU.mfaEnabled ?? recU.mfaEnforced ?? recU.mfaStatus;
    if (typeof mfaEnabled === 'string') {
      return !['Enabled', 'enabled', 'Enforced', 'enforced', 'true'].includes(mfaEnabled);
    }
    return mfaEnabled !== true;
  });

  if (withoutMfa.length > 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'fail',
      description: `${withoutMfa.length} of ${users.length} user(s) do NOT have MFA enforced — enable MFA (or a conditional access policy) for all users.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: azureEvidenceManifest.slug,
    status: 'pass',
    description: `All ${users.length} user(s) have MFA enabled.`,
    collectedAt: now,
    rawData: data,
  };
}

function defenderPlanStatusEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AzureCheckSpec = {
    id: 'azure-defender-plan-status',
    controlId: 'azure.defender-plan-status',
    type: 'defender-plan-status',
    title: 'Microsoft Defender for Cloud status',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  if (!rec) {
    return azureCheckError(
      spec,
      'Malformed Defender plan payload: expected an object with a status field.',
      now,
    );
  }
  const properties = rec.properties && typeof rec.properties === 'object'
    ? (rec.properties as Record<string, unknown>)
    : {};
  const rawStatus = rec.status ?? properties.status ?? rec.state ?? properties.state;
  const statusText = String(rawStatus ?? '').toLowerCase();

  if (['enabled', 'on', 'active', 'true'].includes(statusText)) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'pass',
      description: 'Microsoft Defender for Cloud is enabled.',
      collectedAt: now,
      rawData: data,
    };
  }
  if (['disabled', 'off', 'inactive', 'false'].includes(statusText)) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'fail',
      description: 'Microsoft Defender for Cloud is DISABLED — enable the Defender plan.',
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: azureEvidenceManifest.slug,
    status: 'warning',
    description: `Defender plan status is "${rawStatus ?? 'unknown'}" — confirm coverage.`,
    collectedAt: now,
    rawData: data,
  };
}

function storageEncryptionEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AzureCheckSpec = {
    id: 'azure-storage-encryption',
    controlId: 'azure.storage-encryption',
    type: 'storage-encryption',
    title: 'Storage account encryption at rest',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray =
    Array.isArray(rec?.value) || Array.isArray(rec?.storageAccounts);
  const accounts: unknown[] = Array.isArray(rec?.value)
    ? (rec?.value as unknown[])
    : Array.isArray(rec?.storageAccounts)
      ? (rec?.storageAccounts as unknown[])
      : [];
  if (!hasArray) {
    return azureCheckError(
      spec,
      'Malformed Azure storage accounts payload: expected a value array.',
      now,
    );
  }
  if (accounts.length === 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'warning',
      description: 'No storage accounts found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const unencrypted = accounts.filter((account) => {
    if (!account || typeof account !== 'object') return true; // fail-safe
    const recA = account as Record<string, unknown>;
    const encryption = recA.encryption && typeof recA.encryption === 'object'
      ? (recA.encryption as Record<string, unknown>)
      : null;
    if (recA.encryptionEnabled === true) return false;
    if (encryption) {
      return encryption.enabled !== true && encryption.status !== 'Enabled';
    }
    return true;
  });

  if (unencrypted.length > 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'fail',
      description: `${unencrypted.length} of ${accounts.length} storage account(s) are NOT encrypted at rest — enable storage service encryption.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: azureEvidenceManifest.slug,
    status: 'pass',
    description: `All ${accounts.length} storage account(s) are encrypted at rest.`,
    collectedAt: now,
    rawData: data,
  };
}

function sqlAuditingEnabledEvidence(data: unknown, now: Date): CollectedEvidence {
  const spec: AzureCheckSpec = {
    id: 'azure-sql-auditing-enabled',
    controlId: 'azure.sql-auditing-enabled',
    type: 'sql-auditing-enabled',
    title: 'SQL server auditing enabled',
  };
  const rec = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null;
  const hasArray = Array.isArray(rec?.value) || Array.isArray(rec?.servers);
  const servers: unknown[] = Array.isArray(rec?.value)
    ? (rec?.value as unknown[])
    : Array.isArray(rec?.servers)
      ? (rec?.servers as unknown[])
      : [];
  if (!hasArray) {
    return azureCheckError(
      spec,
      'Malformed Azure SQL servers payload: expected a value array.',
      now,
    );
  }
  if (servers.length === 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'warning',
      description: 'No SQL servers found to evaluate.',
      collectedAt: now,
      rawData: data,
    };
  }

  const withoutAuditing = servers.filter((server) => {
    if (!server || typeof server !== 'object') return true; // fail-safe
    const recS = server as Record<string, unknown>;
    if (recS.auditingEnabled === true) return false;
    const audit = recS.auditing && typeof recS.auditing === 'object'
      ? (recS.auditing as Record<string, unknown>)
      : null;
    if (audit) return audit.enabled !== true && audit.state !== 'Enabled';
    return true;
  });

  if (withoutAuditing.length > 0) {
    return {
      ...spec,
      source: azureEvidenceManifest.slug,
      status: 'fail',
      description: `${withoutAuditing.length} of ${servers.length} SQL server(s) do NOT have auditing enabled — enable SQL auditing.`,
      collectedAt: now,
      rawData: data,
    };
  }
  return {
    ...spec,
    source: azureEvidenceManifest.slug,
    status: 'pass',
    description: `All ${servers.length} SQL server(s) have auditing enabled.`,
    collectedAt: now,
    rawData: data,
  };
}

async function collectAzureEvidence(
  fetcher: AzureFetch,
  context: IntegrationContext,
  options?: CollectOptions,
): Promise<CollectedEvidence[]> {
  const now = options?.now ?? new Date();
  const slug = azureEvidenceManifest.slug;
  const token = context.credentials.accessToken ?? context.credentials.token;
  const clientId =
    context.credentials.clientId ?? context.credentials.client_id ?? context.credentials.applicationId;
  const clientSecret =
    context.credentials.clientSecret ??
    context.credentials.client_secret ??
    context.credentials.applicationSecret;
  const tenantId = context.credentials.tenantId ?? context.credentials.tenant_id;
  const subscriptionId =
    context.credentials.subscriptionId ?? context.credentials.subscription_id;

  if (!token && !(clientId && clientSecret && tenantId)) {
    return [
      normalizeEvidence(
        {
          id: 'azure-credentials-missing',
          controlId: 'azure.authentication',
          source: slug,
          type: 'authentication',
          status: 'error',
          title: 'Azure credentials not configured',
          description:
            'No accessToken/token (or clientId + clientSecret + tenantId) credentials are set for the ' +
            'Azure evidence collector. Add credentials to begin collecting Azure evidence.',
          collectedAt: now,
        },
        slug,
        options,
      ),
    ];
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token ?? clientSecret}`,
  };

  const q = `api-version=${AZURE_API_VERSION}`;
  const evidence = [
    await runAzureCheck(
      fetcher,
      `${AZURE_API_BASE}/users?${q}`,
      headers,
      {
        id: 'azure-mfa-status',
        controlId: 'azure.mfa-status',
        type: 'mfa-status',
        title: 'Multi-factor authentication (MFA) enforcement',
      },
      now,
      (data) => mfaStatusEvidence(data, now),
    ),
    await runAzureCheck(
      fetcher,
      `${AZURE_API_BASE}/defender/plan?${q}`,
      headers,
      {
        id: 'azure-defender-plan-status',
        controlId: 'azure.defender-plan-status',
        type: 'defender-plan-status',
        title: 'Microsoft Defender for Cloud status',
      },
      now,
      (data) => defenderPlanStatusEvidence(data, now),
    ),
    await runAzureCheck(
      fetcher,
      `${AZURE_API_BASE}/storageAccounts?${q}`,
      headers,
      {
        id: 'azure-storage-encryption',
        controlId: 'azure.storage-encryption',
        type: 'storage-encryption',
        title: 'Storage account encryption at rest',
      },
      now,
      (data) => storageEncryptionEvidence(data, now),
    ),
    await runAzureCheck(
      fetcher,
      `${AZURE_API_BASE}/sqlServers?${q}`,
      headers,
      {
        id: 'azure-sql-auditing-enabled',
        controlId: 'azure.sql-auditing-enabled',
        type: 'sql-auditing-enabled',
        title: 'SQL server auditing enabled',
      },
      now,
      (data) => sqlAuditingEnabledEvidence(data, now),
    ),
  ];

  const capped =
    typeof options?.limit === 'number' ? evidence.slice(0, options.limit) : evidence;
  return capped.map((e) => normalizeEvidence(e, slug, options));
}

/**
 * Create an Azure evidence collector with an optional injectable fetcher
 * (defaults to a fetcher that throws a clear "Azure client not configured"
 * error). Tests pass a fake fetcher.
 */
export function createAzureEvidenceCollector(
  fetch?: AzureFetch,
): EvidenceCollector {
  const doFetch: AzureFetch = fetch ?? defaultAzureFetch();
  return {
    manifest: azureEvidenceManifest,
    collect(context: IntegrationContext, collectOptions?: CollectOptions) {
      return collectAzureEvidence(doFetch, context, collectOptions);
    },
  };
}

/** Shared built-in instance — requires an injected adapter to function. */
export const azureEvidenceCollector: EvidenceCollector =
  createAzureEvidenceCollector();
