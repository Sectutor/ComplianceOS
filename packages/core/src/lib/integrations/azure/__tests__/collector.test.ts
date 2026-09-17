/**
 * Azure evidence collector — unit tests.
 *
 * Drives the collector with a fake fetcher (no network required) to verify
 * deterministic status mapping, graceful degradation on malformed payloads /
 * API errors, credential checks, normalization and the limit option.
 */
import { describe, it, expect } from 'vitest';
import type { IntegrationContext } from '../../types';
import {
  azureEvidenceManifest,
  createAzureEvidenceCollector,
} from '../collector';
import type { AzureFetch } from '../collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const BASE = 'https://management.azure.com';
const Q = 'api-version=2024-01-01';
const USERS_URL = `${BASE}/users?${Q}`;
const DEFENDER_URL = `${BASE}/defender/plan?${Q}`;
const STORAGE_URL = `${BASE}/storageAccounts?${Q}`;
const SQL_URL = `${BASE}/sqlServers?${Q}`;

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-azure-1',
    userId: 'user-1',
    credentials: {
      clientId: 'app-123',
      clientSecret: 'secret',
      tenantId: 'tenant-abc',
      subscriptionId: 'sub-1',
    },
    settings: {},
    ...overrides,
  };
}

function fakeFetcher(
  routes: Record<string, { status: number; body: unknown }>,
): AzureFetch {
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
    [USERS_URL]: {
      status: 200,
      body: {
        value: [
          { id: 'u-1', mfaEnabled: true },
          { id: 'u-2', mfaEnabled: true },
        ],
      },
    },
    [DEFENDER_URL]: {
      status: 200,
      body: { plan: 'Microsoft Defender for Cloud', status: 'Enabled' },
    },
    [STORAGE_URL]: {
      status: 200,
      body: {
        value: [{ name: 'acct1', encryptionEnabled: true }],
      },
    },
    [SQL_URL]: {
      status: 200,
      body: {
        value: [{ name: 'sql1', auditingEnabled: true }],
      },
    },
    ...overrides,
  };
}

describe('Azure evidence collector', () => {
  it('collects all four Azure evidence types with pass statuses for a healthy tenant', async () => {
    const collector = createAzureEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(4);
    const byId = Object.fromEntries(evidence.map((e) => [e.id, e]));

    expect(byId['azure-mfa-status']?.status).toBe('pass');
    expect(byId['azure-defender-plan-status']?.status).toBe('pass');
    expect(byId['azure-storage-encryption']?.status).toBe('pass');
    expect(byId['azure-sql-auditing-enabled']?.status).toBe('pass');

    expect(byId['azure-mfa-status']?.controlId).toBe('azure.mfa-status');
    expect(byId['azure-mfa-status']?.source).toBe('azure');
    expect(byId['azure-mfa-status']?.collectedAt).toEqual(NOW);
  });

  it('fails when any user lacks MFA', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [USERS_URL]: {
            status: 200,
            body: {
              value: [
                { id: 'u-1', mfaEnabled: true },
                { id: 'u-2', mfaEnabled: false },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'azure-mfa-status');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('fails when Defender for Cloud is disabled', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [DEFENDER_URL]: { status: 200, body: { status: 'Disabled' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    expect(
      evidence.find((e) => e.id === 'azure-defender-plan-status')?.status,
    ).toBe('fail');
  });

  it('warns when Defender status is unknown', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [DEFENDER_URL]: { status: 200, body: { status: 'Pending' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    expect(
      evidence.find((e) => e.id === 'azure-defender-plan-status')?.status,
    ).toBe('warning');
  });

  it('fails when a storage account is not encrypted', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [STORAGE_URL]: {
            status: 200,
            body: {
              value: [
                { name: 'encrypted', encryptionEnabled: true },
                { name: 'plain', encryptionEnabled: false },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'azure-storage-encryption');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('fails when a SQL server has auditing disabled', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [SQL_URL]: {
            status: 200,
            body: {
              value: [
                { name: 'sql-audited', auditing: { enabled: true } },
                { name: 'sql-plain', auditing: { enabled: false } },
              ],
            },
          },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'azure-sql-auditing-enabled');

    expect(item?.status).toBe('fail');
    expect(item?.description).toContain('1 of 2');
  });

  it('turns a malformed payload into an error evidence without throwing', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [USERS_URL]: { status: 200, body: { unexpected: 'shape' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'azure-mfa-status');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('Malformed');
    expect(evidence).toHaveLength(4);
  });

  it('turns an HTTP 500 into an error evidence without aborting the batch', async () => {
    const collector = createAzureEvidenceCollector(
      fakeFetcher(
        buildRoutes({
          [STORAGE_URL]: { status: 500, body: { message: 'boom' } },
        }),
      ),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });
    const item = evidence.find((e) => e.id === 'azure-storage-encryption');

    expect(item?.status).toBe('error');
    expect(item?.description).toContain('500');
    expect(evidence.filter((e) => e.status !== 'error')).toHaveLength(3);
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const collector = createAzureEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0].status).toBe('error');
    expect(evidence[0].controlId).toBe('azure.authentication');
  });

  it('computes expiresAt from the per-type TTL and respects the limit option', async () => {
    const collector = createAzureEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(makeContext(), {
      now: NOW,
      evidenceTtlMs: { 'mfa-status': 3 * DAY },
      limit: 3,
    });

    expect(evidence).toHaveLength(3);
    const mfa = evidence.find((e) => e.id === 'azure-mfa-status');
    expect(mfa?.expiresAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
  });

  it('exposes the Azure evidence manifest for discovery', () => {
    expect(azureEvidenceManifest.slug).toBe('azure');
    expect(azureEvidenceManifest.category).toBe('scanner');
    expect(azureEvidenceManifest.authentication.type).toBe('apiKey');
    expect(azureEvidenceManifest.capabilities.read).toBe(true);
    expect(
      azureEvidenceManifest.authentication.fields.map((f) => f.key),
    ).toEqual(['clientId', 'clientSecret', 'tenantId', 'subscriptionId']);
  });
});
