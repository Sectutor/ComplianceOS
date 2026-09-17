import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * evidenceScheduler tests — fully mocked DB, no live connection.
 *
 * The scheduler imports `getDb` from `../db`, the `evidence` table from
 * `../schema`, and the real (pure) collector engine from
 * `./integrations/collector`. Here `../db` and `../schema` are mocked; the
 * collector engine and a tiny fake registry drive the collection step, so the
 * db flow (select due rows → insert collected artifacts → update scheduled
 * row) is exercised deterministically.
 */
const schedulerMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  evidenceTable: {
    id: 'evidence.id',
    clientId: 'evidence.clientId',
    clientControlId: 'evidence.clientControlId',
    evidenceId: 'evidence.evidenceId',
    systemId: 'evidence.systemId',
    description: 'evidence.description',
    type: 'evidence.type',
    status: 'evidence.status',
    dueDate: 'evidence.dueDate',
    lastVerified: 'evidence.lastVerified',
    expirationDate: 'evidence.expirationDate',
    updatedAt: 'evidence.updatedAt',
  },
}));

vi.mock('../../db', () => ({ getDb: schedulerMocks.getDb }));
vi.mock('../../schema', () => ({ evidence: schedulerMocks.evidenceTable }));

import {
  runDueEvidenceCollections,
  mapCollectedStatus,
} from '../evidenceScheduler';
import type { EvidenceCollector } from '../integrations/collector';

const NOW = new Date('2026-01-15T10:30:00.000Z');

/** Chainable drizzle-like db mock with captured inserts/updates. */
function makeDb(dueRows: unknown[]) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    limit: () => Promise.resolve(dueRows),
  };
  const insertChain = {
    values: (v: Record<string, unknown>) => {
      inserts.push(v);
      return Promise.resolve(undefined);
    },
  };
  const updateChain = {
    set: (v: Record<string, unknown>) => {
      updates.push(v);
      return updateChain;
    },
    where: () => Promise.resolve(undefined),
  };

  return {
    db: {
      select: () => selectChain,
      insert: () => insertChain,
      update: () => updateChain,
    },
    inserts,
    updates,
  };
}

function fakeCollector(evidence: unknown[]): EvidenceCollector {
  return {
    manifest: {
      slug: 'fake-evidence',
      name: 'Fake Evidence',
      version: '1.0.0',
      description: 'test collector',
      author: { name: 'ComplianceOS' },
      license: 'MIT',
      category: 'scanner',
      tags: [],
      capabilities: { read: true },
      authentication: { type: 'none', fields: [] },
      actions: [],
      triggers: [],
    },
    collect: vi.fn(async () => evidence),
  };
}

function fakeRegistry(collector: EvidenceCollector) {
  return {
    has: (slug: string) => slug === collector.manifest.slug,
    get: (slug: string) => (slug === collector.manifest.slug ? collector : undefined),
    list: () => [collector],
  };
}

const dueRow = {
  id: 7,
  clientId: 2,
  clientControlId: 3,
  status: 'pending',
  systemId: null,
  dueDate: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  schedulerMocks.getDb.mockReset();
});

describe('runDueEvidenceCollections', () => {
  it('awaits getDb() and persists collected evidence (regression: db.select is not a function)', async () => {
    const collector = fakeCollector([
      { id: 'e1', controlId: 'http.tls', source: 'fake', type: 'api-check', status: 'pass', title: 'TLS', description: 'ok', collectedAt: NOW },
      { id: 'e2', controlId: 'http.ports', source: 'fake', type: 'api-check', status: 'fail', title: 'Ports', description: 'bad', collectedAt: NOW },
    ]);
    const { db, inserts, updates } = makeDb([dueRow]);
    schedulerMocks.getDb.mockResolvedValue(db);

    const summary = await runDueEvidenceCollections({
      registry: fakeRegistry(collector) as any,
      now: NOW,
    });

    expect(schedulerMocks.getDb).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({
      dueRows: 1,
      processedRows: 1,
      collectedItems: 2,
      failedRuns: 0,
      updatedRows: 1,
      insertedRows: 2,
      skipped: false,
    });

    // Two collected artifacts were inserted as new evidence rows.
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({
      clientId: 2,
      clientControlId: 3,
      evidenceId: 'e1',
      // normalizeEvidence forces source = collector slug
      systemId: 'fake-evidence',
      status: 'collected',
      lastVerified: NOW,
    });
    expect(inserts[1].status).toBe('rejected'); // fail → rejected

    // The scheduled row itself is flipped to collected.
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ status: 'collected', lastVerified: NOW });
  });

  it('does nothing when no rows are due', async () => {
    const collector = fakeCollector([]);
    const { db, inserts, updates } = makeDb([]);
    schedulerMocks.getDb.mockResolvedValue(db);

    const summary = await runDueEvidenceCollections({
      registry: fakeRegistry(collector) as any,
      now: NOW,
    });

    expect(summary.dueRows).toBe(0);
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('isolates a throwing collector and still marks the row collected', async () => {
    const collector: EvidenceCollector = {
      manifest: {
        slug: 'broken-evidence',
        name: 'Broken',
        version: '1.0.0',
        description: 'throwing collector',
        author: { name: 'ComplianceOS' },
        license: 'MIT',
        category: 'scanner',
        tags: [],
        capabilities: { read: true },
        authentication: { type: 'none', fields: [] },
        actions: [],
        triggers: [],
      },
      collect: vi.fn(async () => {
        throw new Error('upstream scanner unreachable');
      }),
    };
    const { db, inserts, updates } = makeDb([dueRow]);
    schedulerMocks.getDb.mockResolvedValue(db);

    const summary = await runDueEvidenceCollections({
      registry: fakeRegistry(collector) as any,
      now: NOW,
    });

    expect(summary.failedRuns).toBe(1);
    expect(summary.collectedItems).toBe(0);
    expect(summary.insertedRows).toBe(0);
    expect(summary.updatedRows).toBe(1); // scheduled row still flipped
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(1);
  });

  it('runs only the collector matching row.systemId when one is set', async () => {
    const a = fakeCollector([{ id: 'a1', controlId: 'x', source: 'a', type: 't', status: 'pass', title: 'A', description: 'a', collectedAt: NOW }]);
    const b = fakeCollector([{ id: 'b1', controlId: 'y', source: 'b', type: 't', status: 'pass', title: 'B', description: 'b', collectedAt: NOW }]);
    const registry = {
      has: (slug: string) => slug === 'a' || slug === 'b',
      get: (slug: string) => (slug === 'a' ? a : slug === 'b' ? b : undefined),
      list: () => [a, b],
    };
    const { db, inserts } = makeDb([{ ...dueRow, systemId: 'b' }]);
    schedulerMocks.getDb.mockResolvedValue(db);

    const summary = await runDueEvidenceCollections({
      registry: registry as any,
      now: NOW,
    });

    expect(b.collect).toHaveBeenCalledTimes(1);
    expect(a.collect).not.toHaveBeenCalled();
    expect(summary.collectedItems).toBe(1);
    // source is normalized to the collector slug that produced the item
    expect(inserts[0].systemId).toBe('fake-evidence');
  });

  it('accepts an injected db without calling getDb()', async () => {
    const collector = fakeCollector([]);
    const { db } = makeDb([]);

    await runDueEvidenceCollections({
      db,
      registry: fakeRegistry(collector) as any,
      now: NOW,
    });

    expect(schedulerMocks.getDb).not.toHaveBeenCalled();
  });
});

describe('mapCollectedStatus', () => {
  it('maps evidence statuses onto the evidence table enum', () => {
    expect(mapCollectedStatus('pass')).toBe('collected');
    expect(mapCollectedStatus('warning')).toBe('collected');
    expect(mapCollectedStatus('fail')).toBe('rejected');
    expect(mapCollectedStatus('error')).toBe('pending');
  });
});
