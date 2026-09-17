/**
 * Evidence Collector Connections — unit tests (contract).
 *
 * These tests define the contract for the collector-connection backend
 * (packages/core/src/lib/evidenceCollectorConnections.ts):
 *
 *   - Pure helpers (maskCredential / maskCredentials / isSecretField /
 *     listCollectorProviders / getCollectorProvider) are tested directly.
 *   - All store operations accept an optional `db` argument; when it is
 *     omitted the implementation is expected to fall back to a module-level
 *     in-memory store. That in-memory fallback is what these tests exercise —
 *     no live database, no network.
 *   - test/run inject a fake fetcher (fetchImpl / globalThis.fetch swap)
 *     returning canned JSON, so no real HTTP requests are ever made.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  maskCredential,
  maskCredentials,
  isSecretField,
  listCollectorProviders,
  getCollectorProvider,
  listCollectorConnections,
  saveCollectorConnection,
  deleteCollectorConnection,
  testCollectorConnection,
  runCollectorConnection,
} from '../evidenceCollectorConnections';

const NOW = new Date('2026-08-14T12:00:00.000Z');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function fakeFetch(body: unknown): ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body } satisfies FakeResponse));
}

function throwingFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async () => {
    throw new Error('ECONNREFUSED');
  });
}

const AWS_INPUT = {
  clientId: 1,
  provider: 'aws' as const,
  name: 'Prod AWS',
  credentials: {
    accessKeyId: 'AKIA_TEST123',
    secretAccessKey: 'super-secret-value-42',
    region: 'us-east-1',
  },
  settings: { region: 'us-east-1' },
};

const HTTP_API_INPUT = {
  clientId: 5,
  provider: 'http-api' as const,
  name: 'Scanner API',
  credentials: {
    endpoint: 'https://scanner.test/evidence',
    apiUrl: 'https://scanner.test/evidence',
    apiKey: 'test-key',
  },
  settings: {},
};

describe('maskCredential', () => {
  it('masks short values entirely and keeps only the tail of longer ones', () => {
    expect(maskCredential('')).toBe('');
    expect(maskCredential('abc')).toBe('••••');
    expect(maskCredential('ABCDEF123456')).toBe('••••3456');
  });

  it('never leaks the raw value in the masked output', () => {
    const raw = 'mySuperSecretValue123';
    const masked = maskCredential(raw);
    expect(masked).not.toContain(raw);
    expect(masked).not.toContain('mySuper');
  });
});

describe('maskCredentials', () => {
  it('masks every value in the map', () => {
    const masked = maskCredentials({ a: 'x', b: 'ABCDEF123456' });
    expect(masked.a).toBe('••••');
    expect(masked.b).toBe('••••3456');
    expect(Object.keys(masked).sort()).toEqual(['a', 'b']);
  });

  it('returns an empty object for empty input', () => {
    expect(maskCredentials({})).toEqual({});
  });
});

describe('listCollectorProviders / getCollectorProvider', () => {
  it('returns the five collector manifests sorted by slug', () => {
    const providers = listCollectorProviders();
    expect(providers).toHaveLength(5);
    const slugs = providers.map((p) => p.slug);
    expect(slugs.sort()).toEqual(['aws', 'azure', 'gcp', 'github', 'http-api']);
    expect(slugs).toEqual([...slugs].sort());
  });

  it('declares authentication fields on every provider manifest', () => {
    for (const manifest of listCollectorProviders()) {
      expect(manifest.authentication).toBeDefined();
      expect(Array.isArray(manifest.authentication.fields)).toBe(true);
      expect(manifest.authentication.fields.length).toBeGreaterThan(0);
    }
  });

  it('resolves known providers and undefined for unknown slugs', () => {
    expect(getCollectorProvider('aws')?.slug).toBe('aws');
    expect(getCollectorProvider('http-api')?.slug).toBe('http-api');
    expect(getCollectorProvider('nope')).toBeUndefined();
  });
});

describe('isSecretField', () => {
  it('flags sensitive credential fields and ignores the rest', () => {
    const aws = getCollectorProvider('aws');
    expect(aws).toBeDefined();
    if (!aws) return;
    expect(isSecretField(aws, 'secretAccessKey')).toBe(true);
    expect(isSecretField(aws, 'accessKeyId')).toBe(false);
    expect(isSecretField(aws, 'region')).toBe(false);
  });
});

describe('saveCollectorConnection (in-memory, no db)', () => {
  it('persists a connection without exposing credentials', async () => {
    const conn = await saveCollectorConnection(AWS_INPUT);

    expect(conn.id).toBeTruthy();
    expect(conn.clientId).toBe(1);
    expect(conn.provider).toBe('aws');
    expect(conn.name).toBe('Prod AWS');
    expect(conn.status).toBe('disconnected');
    expect(conn.lastRunAt).toBeNull();
    expect(conn.lastRunSummary).toBeNull();
    expect(conn.errorMessage).toBeNull();
    expect(typeof conn.createdAt).toBe('string');
    expect(typeof conn.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(conn.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(conn.updatedAt))).toBe(false);

    // credentials never leak into the returned connection
    expect((conn as Record<string, unknown>).credentials).toBeUndefined();
    const serialized = JSON.stringify(conn);
    expect(serialized).not.toContain('super-secret-value-42');
    expect(serialized).not.toContain('AKIA_TEST123');
  });

  it('upserts: saving again with the same provider+clientId+name updates instead of duplicating', async () => {
    const first = await saveCollectorConnection(AWS_INPUT);
    const second = await saveCollectorConnection({
      ...AWS_INPUT,
      credentials: { accessKeyId: 'AKIA_NEW', secretAccessKey: 'new-secret' },
    });

    const rows = (await listCollectorConnections(1)).filter(
      (c) => c.provider === 'aws' && c.name === 'Prod AWS',
    );
    // either the same row was updated (same id) or there is exactly one row
    expect(second.id === first.id || rows.length === 1).toBe(true);
  });

  it('rejects when a required manifest credential field is missing or empty', async () => {
    await expect(
      saveCollectorConnection({ ...AWS_INPUT, credentials: {} }),
    ).rejects.toThrow(/Missing required credential field/);

    await expect(
      saveCollectorConnection({
        ...AWS_INPUT,
        credentials: { accessKeyId: '', secretAccessKey: 's', region: 'us-east-1' },
      }),
    ).rejects.toThrow(/Missing required credential field/);
  });

  it('rejects unknown providers', async () => {
    await expect(
      saveCollectorConnection({
        clientId: 2,
        provider: 'sap' as never,
        name: 'Bad',
        credentials: { x: 'y' },
      }),
    ).rejects.toThrow(Error);
  });
});

describe('listCollectorConnections (in-memory, no db)', () => {
  it('filters by clientId and returns connections newest first', async () => {
    await saveCollectorConnection({
      clientId: 7,
      provider: 'aws',
      name: 'first',
      credentials: { accessKeyId: 'AKIA1', secretAccessKey: 's1' },
    });
    await sleep(5);
    await saveCollectorConnection({
      clientId: 7,
      provider: 'aws',
      name: 'second',
      credentials: { accessKeyId: 'AKIA2', secretAccessKey: 's2' },
    });
    await sleep(5);
    await saveCollectorConnection({
      clientId: 7,
      provider: 'aws',
      name: 'third',
      credentials: { accessKeyId: 'AKIA3', secretAccessKey: 's3' },
    });
    await saveCollectorConnection({
      clientId: 8,
      provider: 'aws',
      name: 'other-client',
      credentials: { accessKeyId: 'AKIA4', secretAccessKey: 's4' },
    });

    const list = await listCollectorConnections(7);
    expect(list).toHaveLength(3);
    expect(list.every((c) => c.clientId === 7)).toBe(true);
    expect(list.map((c) => c.name)).toEqual(['third', 'second', 'first']);

    const times = list.map((c) => Date.parse(c.createdAt));
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }

    expect(await listCollectorConnections(8)).toHaveLength(1);
    expect(await listCollectorConnections(999)).toHaveLength(0);
  });
});

describe('deleteCollectorConnection (in-memory, no db)', () => {
  it('removes an existing connection and reports false for missing ones', async () => {
    const conn = await saveCollectorConnection({
      clientId: 9,
      provider: 'aws',
      name: 'To delete',
      credentials: { accessKeyId: 'AKIAX', secretAccessKey: 's' },
    });

    expect(await deleteCollectorConnection(conn.id, 9)).toBe(true);
    expect(
      (await listCollectorConnections(9)).some((c) => c.id === conn.id),
    ).toBe(false);
    expect(await deleteCollectorConnection(conn.id, 9)).toBe(false);
  });

  it('does not delete a connection owned by another client', async () => {
    const conn = await saveCollectorConnection({
      clientId: 10,
      provider: 'aws',
      name: 'Other client',
      credentials: { accessKeyId: 'AKIAY', secretAccessKey: 's' },
    });

    expect(await deleteCollectorConnection(conn.id, 999)).toBe(false);
    expect(
      (await listCollectorConnections(10)).some((c) => c.id === conn.id),
    ).toBe(true);
  });
});

describe('testCollectorConnection', () => {
  it('returns not-found for an unknown connection', async () => {
    const result = await testCollectorConnection('does-not-exist', 1);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Connection not found');
  });

  it('marks a reachable http-api connection as connected', async () => {
    const conn = await saveCollectorConnection(HTTP_API_INPUT);
    const fetchImpl = fakeFetch({
      items: [{ title: 'A', status: 'pass' }],
    });

    const result = await testCollectorConnection(
      conn.id,
      HTTP_API_INPUT.clientId,
      undefined,
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);

    const updated = (await listCollectorConnections(HTTP_API_INPUT.clientId)).find(
      (c) => c.id === conn.id,
    );
    expect(updated?.status).toBe('connected');
  });

  it('marks a failing http-api connection as error', async () => {
    const conn = await saveCollectorConnection(HTTP_API_INPUT);
    const fetchImpl = throwingFetch();

    const result = await testCollectorConnection(
      conn.id,
      HTTP_API_INPUT.clientId,
      undefined,
      fetchImpl,
    );

    expect(result.ok).toBe(false);
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);

    const updated = (await listCollectorConnections(HTTP_API_INPUT.clientId)).find(
      (c) => c.id === conn.id,
    );
    expect(updated?.status).toBe('error');
  });
});

describe('runCollectorConnection', () => {
  it('collects evidence and summarizes a successful run', async () => {
    const conn = await saveCollectorConnection({
      ...HTTP_API_INPUT,
      clientId: 6,
      name: 'Scanner Run',
    });
    const fetchImpl = fakeFetch({
      items: [
        { title: 'A', status: 'pass' },
        { title: 'B', status: 'pass' },
        { title: 'C', status: 'warning' },
      ],
    });

    const realFetch = globalThis.fetch;
    (globalThis as { fetch: unknown }).fetch = fetchImpl;
    let run;
    try {
      run = await runCollectorConnection(conn.id, 6, undefined, {
        now: NOW,
        fetchImpl,
      } as never);
    } finally {
      (globalThis as { fetch: unknown }).fetch = realFetch;
    }

    expect(fetchImpl).toHaveBeenCalled();
    expect(run.connectionId).toBe(conn.id);
    expect(run.provider).toBe('http-api');
    expect(run.ok).toBe(true);
    expect(run.total).toBe(3);
    expect(run.passed).toBe(2);
    expect(run.warning).toBe(1);
    expect(run.failed).toBe(0);
    expect(run.error).toBe(0);
    expect(typeof run.message).toBe('string');
    expect(run.message.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(run.completedAt))).toBe(false);

    expect(run.evidence).toHaveLength(3);
    expect(run.evidence[0].status).toBe('pass');
    expect(run.evidence[1].status).toBe('pass');
    expect(run.evidence[2].status).toBe('warning');
    expect(typeof run.evidence[0].collectedAt).toBe('string');
    expect(Number.isNaN(Date.parse(run.evidence[0].collectedAt))).toBe(false);

    const updated = (await listCollectorConnections(6)).find(
      (c) => c.id === conn.id,
    );
    expect(updated?.lastRunAt).not.toBeNull();
    expect(updated?.lastRunSummary).toEqual({
      total: 3,
      passed: 2,
      warning: 1,
      failed: 0,
      error: 0,
    });
  });

  it('returns not-found for an unknown connection', async () => {
    const result = await runCollectorConnection('nope', 6);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Connection not found');
  });

  it('marks a failed run as error', async () => {
    const conn = await saveCollectorConnection({
      ...HTTP_API_INPUT,
      clientId: 6,
      name: 'Failing Scanner',
    });
    const fetchImpl = throwingFetch();

    const realFetch = globalThis.fetch;
    (globalThis as { fetch: unknown }).fetch = fetchImpl;
    let run;
    try {
      run = await runCollectorConnection(conn.id, 6, undefined, {
        now: NOW,
        fetchImpl,
      } as never);
    } finally {
      (globalThis as { fetch: unknown }).fetch = realFetch;
    }

    expect(run.ok).toBe(false);

    const updated = (await listCollectorConnections(6)).find(
      (c) => c.id === conn.id,
    );
    expect(updated?.status).toBe('error');
  });
});
