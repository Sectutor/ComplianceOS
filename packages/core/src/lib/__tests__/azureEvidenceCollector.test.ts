/**
 * Azure Evidence Collector — unit tests.
 *
 * The collector makes four per-service API calls (Entra users, Defender plan,
 * storage accounts, SQL servers) through an injectable fetcher — no network.
 * Tests drive it with canned Azure-shaped JSON routed by URL. Covers: evidence
 * count, stable ids, azure.* controlIds, pass/warning/fail/error derivation,
 * options.limit, injected now, TTL-based expiresAt, graceful handling of
 * malformed payloads and HTTP failures, credentials-missing degradation, the
 * manifest and the shared singleton.
 */
import { describe, it, expect, vi } from 'vitest';
import type { IntegrationContext } from '../integrations/types';
import {
  azureEvidenceManifest,
  createAzureEvidenceCollector,
  azureEvidenceCollector,
} from '../integrations/azure/collector';
import type { AzureFetch } from '../integrations/azure/collector';
import { collectEvidence } from '../integrations/collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');

type Route = { status: number; body: unknown };

/** Fake fetcher routing by URL substring (the endpoint path discriminates). */
function fakeAzureFetcher(routes: Record<string, Route>): AzureFetch {
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
    connectionId: 'conn-azure',
    userId: 'user-1',
    credentials: {
      tenantId: 'tenant-test',
      clientId: 'app-test',
      clientSecret: 'secret',
    },
    settings: {},
    ...overrides,
  };
}

/** One route per Azure check, defaulting to an all-pass posture. */
function buildRoutes(overrides: Record<string, Route> = {}): Record<string, Route> {
  return {
    '/users?': {
      status: 200,
      body: { value: [{ userPrincipalName: 'alice@acme', mfaEnabled: true }] },
    },
    '/defender/plan?': {
      status: 200,
      body: { status: 'Enabled' },
    },
    '/storageAccounts?': {
      status: 200,
      body: { value: [{ name: 'acme', encryption: { enabled: true } }] },
    },
    '/sqlServers?': {
      status: 200,
      body: { value: [{ name: 'sql1', auditingEnabled: true }] },
    },
    ...overrides,
  };
}

const ALL_IDS = [
  'azure-mfa-status',
  'azure-defender-plan-status',
  'azure-storage-encryption',
  'azure-sql-auditing-enabled',
];

describe('azureEvidenceCollector', () => {
  it('collects one evidence record per Azure check with azure.* control ids', async () => {
    const fetchMock = fakeAzureFetcher(buildRoutes());
    const collector = createAzureEvidenceCollector(fetchMock);

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(evidence).toHaveLength(4);
    expect(evidence.map((e) => e.id)).toEqual(ALL_IDS);

    // control ids carry the documented azure. prefix
    expect(evidence.every((e) => e.controlId.startsWith('azure.'))).toBe(true);
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));
    expect(byControl['azure.mfa-status']?.status).toBe('pass');
    expect(byControl['azure.defender-plan-status']?.status).toBe('pass');
    expect(byControl['azure.storage-encryption']?.status).toBe('pass');
    expect(byControl['azure.sql-auditing-enabled']?.status).toBe('pass');

    // normalized source is the manifest slug
    expect(evidence.every((e) => e.source === 'azure')).toBe(true);
    expect(evidence.every((e) => typeof e.title === 'string' && e.title.length > 0)).toBe(true);
    expect(evidence.every((e) => typeof e.description === 'string' && e.description.length > 0)).toBe(true);
  });

  it('derives fail/warning statuses from the underlying payloads', async () => {
    const collector = createAzureEvidenceCollector(
      fakeAzureFetcher(
        buildRoutes({
          '/users?': {
            status: 200,
            body: { value: [{ userPrincipalName: 'alice@acme', mfaEnabled: false }] }, // fail
          },
          '/defender/plan?': {
            status: 200,
            body: { status: 'Disabled' }, // fail
          },
          '/storageAccounts?': {
            status: 200,
            body: { value: [{ name: 'acme' }] }, // no encryption → fail
          },
          '/sqlServers?': {
            status: 200,
            body: { value: [{ name: 'sql1', auditingEnabled: false }] }, // fail
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['azure.mfa-status']?.status).toBe('fail');
    expect(byControl['azure.defender-plan-status']?.status).toBe('fail');
    expect(byControl['azure.storage-encryption']?.status).toBe('fail');
    expect(byControl['azure.sql-auditing-enabled']?.status).toBe('fail');
  });

  it('derives warning statuses for unknown/empty states', async () => {
    const collector = createAzureEvidenceCollector(
      fakeAzureFetcher(
        buildRoutes({
          '/defender/plan?': { status: 200, body: { status: 'Unknown' } },
          '/storageAccounts?': { status: 200, body: { value: [] } },
          '/sqlServers?': { status: 200, body: { value: [] } },
          '/users?': { status: 200, body: { value: [] } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['azure.mfa-status']?.status).toBe('warning');
    expect(byControl['azure.defender-plan-status']?.status).toBe('warning');
    expect(byControl['azure.storage-encryption']?.status).toBe('warning');
    expect(byControl['azure.sql-auditing-enabled']?.status).toBe('warning');
  });

  it('produces stable, unique ids across runs', async () => {
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(buildRoutes()));

    const a = await collector.collect(makeContext(), { now: NOW });
    const b = await collector.collect(makeContext(), { now: NOW });

    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
    expect(new Set(a.map((e) => e.id)).size).toBe(a.length);
  });

  it('respects options.limit', async () => {
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW, limit: 2 });

    expect(evidence).toHaveLength(2);
    expect(evidence[0].controlId).toBe('azure.mfa-status');
    expect(evidence[1].controlId).toBe('azure.defender-plan-status');
  });

  it('uses the injected clock for collectedAt', async () => {
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((e) => e.collectedAt.getTime() === NOW.getTime())).toBe(true);
  });

  it('computes expiresAt from evidenceTtlMs for the evidence type', async () => {
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(buildRoutes()));

    const ttl = 12 * 60 * 60 * 1000;
    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'mfa-status': ttl },
    });

    const mfa = evidence.find((e) => e.controlId === 'azure.mfa-status')!;
    expect(mfa.expiresAt).toEqual(new Date(NOW.getTime() + ttl));
    // types not in the TTL map get no expiresAt
    const storage = evidence.find((e) => e.controlId === 'azure.storage-encryption')!;
    expect(storage.expiresAt).toBeUndefined();
  });

  it('converts a malformed payload into an error record without throwing', async () => {
    const routes = buildRoutes({
      '/users?': { status: 200, body: {} }, // no value array
    });
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(routes));

    let evidence;
    try {
      evidence = await collector.collect(makeContext(), { now: NOW });
    } catch (err) {
      throw new Error(`collect() threw on malformed payload: ${String(err)}`);
    }

    expect(evidence).toHaveLength(4);
    const mfa = evidence.find((e) => e.controlId === 'azure.mfa-status')!;
    expect(mfa.status).toBe('error');
    expect(mfa.description).toContain('Malformed');
    // the other checks still resolved
    expect(evidence.filter((e) => e.status === 'pass')).toHaveLength(3);
  });

  it('handles fetch rejection and unreadable json() gracefully', async () => {
    const rejectingFetcher: AzureFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const unreadableFetcher: AzureFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('body unreadable');
      },
    }));

    for (const fetcher of [rejectingFetcher, unreadableFetcher]) {
      const collector = createAzureEvidenceCollector(fetcher);
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
      '/users?': { status: 500, body: { message: 'Internal Server Error' } },
    });
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(routes));

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const byControl = Object.fromEntries(evidence.map((e) => [e.controlId, e]));

    expect(byControl['azure.mfa-status']?.status).toBe('error');
    expect(byControl['azure.mfa-status']?.description).toContain('500');
    expect(byControl['azure.storage-encryption']?.status).toBe('pass');
    expect(byControl['azure.sql-auditing-enabled']?.status).toBe('pass');
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const fetchMock = fakeAzureFetcher(buildRoutes());
    const collector = createAzureEvidenceCollector(fetchMock);

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      id: 'azure-credentials-missing',
      controlId: 'azure.authentication',
      status: 'error',
    });
  });

  it('accepts a pre-issued accessToken credential alone', async () => {
    const fetchMock = fakeAzureFetcher(buildRoutes());
    const collector = createAzureEvidenceCollector(fetchMock);

    const evidence = await collector.collect(
      makeContext({ credentials: { accessToken: 'tok' } }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('degrades gracefully with the default (non-injected) fetcher', async () => {
    const evidence = await azureEvidenceCollector.collect(makeContext(), {
      now: NOW,
    });

    expect(evidence).toHaveLength(4);
    expect(evidence.every((e) => e.status === 'error')).toBe(true);
  });

  it('runs end-to-end through collectEvidence normalization', async () => {
    const collector = createAzureEvidenceCollector(fakeAzureFetcher(buildRoutes()));

    const run = await collectEvidence(collector, makeContext(), { now: NOW });

    expect(run.success).toBe(true);
    expect(run.slug).toBe(azureEvidenceManifest.slug);
    expect(run.evidence).toHaveLength(4);
    expect(run.evidence.every((e) => e.collectedAt instanceof Date)).toBe(true);
  });
});

describe('azureEvidenceManifest', () => {
  it('declares the expected slug and metadata', () => {
    expect(azureEvidenceManifest.slug).toBe('azure');
    expect(typeof azureEvidenceManifest.name).toBe('string');
    expect(azureEvidenceManifest.name.length).toBeGreaterThan(0);
    expect(azureEvidenceManifest.capabilities.read).toBe(true);
    expect(Array.isArray(azureEvidenceManifest.tags)).toBe(true);
  });

  it('exposes a shared singleton with the same manifest', () => {
    expect(azureEvidenceCollector).toBeDefined();
    expect(azureEvidenceCollector.manifest.slug).toBe('azure');
  });
});
