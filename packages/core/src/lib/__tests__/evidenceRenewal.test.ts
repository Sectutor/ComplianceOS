import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * evidenceRenewal tests (QA cycle 6) — fully mocked DB, no live connection.
 *
 * Follows the riskHeatmap.test.ts pattern: vi.mock `../../db` (getDb),
 * `../../schema` (evidence table) and `../evidenceCollectorConnections`
 * (listCollectorConnections / runCollectorConnection). The pure helpers
 * (normalizeSlug / selectDueForRenewal / connectionForRow /
 * computeRenewalResult / buildDueForRenewalWhere) are tested directly, and
 * the DB-backed loop (runEvidenceRenewal / getRenewalStateSummary) is driven
 * with an injectable chainable thenable db so every query/update is asserted
 * against the mock, never a live database.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  // safeDispatchWebhookEvent is fired fire-and-forget on expired evidence;
  // mocked so the real dispatch (extra getDb calls + console noise) never
  // runs inside this suite.
  safeDispatchWebhookEvent: vi.fn(),
  listCollectorConnections: vi.fn(),
  runCollectorConnection: vi.fn(),
  evidence: {
    id: 'ev.id',
    clientId: 'ev.clientId',
    status: 'ev.status',
    systemId: 'ev.systemId',
    evidenceId: 'ev.evidenceId',
    type: 'ev.type',
    intervalDays: 'ev.intervalDays',
    lastVerified: 'ev.lastVerified',
    expirationDate: 'ev.expirationDate',
    dueDate: 'ev.dueDate',
    updatedAt: 'ev.updatedAt',
  },
}));

vi.mock('../../db', () => ({ getDb: mocks.getDb }));
vi.mock('../webhooks/webhookEvents', () => ({
  safeDispatchWebhookEvent: mocks.safeDispatchWebhookEvent,
}));
vi.mock('../../schema', () => ({ evidence: mocks.evidence }));
vi.mock('../evidenceCollectorConnections', () => ({
  listCollectorConnections: mocks.listCollectorConnections,
  runCollectorConnection: mocks.runCollectorConnection,
}));

type Renewal = typeof import('../evidenceRenewal');
let renewal: Renewal;

const NOW = new Date('2026-08-14T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const CHAIN_METHODS = [
  'select',
  'from',
  'where',
  'orderBy',
  'limit',
  'insert',
  'values',
  'update',
  'set',
  'returning',
  'execute',
] as const;

function makeDb() {
  const queue: unknown[] = [];
  const calls: Record<string, unknown[][]> = {};
  for (const name of CHAIN_METHODS) calls[name] = [];

  function makeChain(): any {
    const chain: any = {};
    for (const name of CHAIN_METHODS) {
      chain[name] = vi.fn((...args: unknown[]) => {
        calls[name].push(args);
        return makeChain();
      });
    }
    chain.then = (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason?: unknown) => unknown
    ) => {
      const entry = queue.shift();
      const promise =
        entry && typeof entry === 'object' && '__reject' in entry
          ? Promise.reject((entry as { __reject: unknown }).__reject)
          : Promise.resolve(entry);
      return promise.then(onFulfilled, onRejected);
    };
    return chain;
  }

  const db = makeChain();
  delete db.then;
  return { db, queue, calls };
}

function rejectQueue(err: Error) {
  return { __reject: err };
}

const CONNECTED_GITHUB = {
  id: 10,
  clientId: 7,
  provider: 'github',
  name: 'Prod GitHub',
  status: 'connected',
};

beforeEach(async () => {
  vi.resetModules();
  renewal = await import('../evidenceRenewal');
  mocks.getDb.mockReset();
  mocks.listCollectorConnections.mockReset();
  mocks.runCollectorConnection.mockReset();
});

// ---------------------------------------------------------------------------
// Pure: normalizeSlug
// ---------------------------------------------------------------------------

describe('normalizeSlug', () => {
  it('lowercases and collapses non-alphanumerics to hyphens', () => {
    expect(renewal.normalizeSlug('GitHub')).toBe('github');
    expect(renewal.normalizeSlug('AWS/EC2')).toBe('aws-ec2');
    expect(renewal.normalizeSlug('  http api  ')).toBe('http-api');
  });

  it('strips the -evidence manifest suffix so systemId matches provider', () => {
    expect(renewal.normalizeSlug('github-evidence')).toBe('github');
    expect(renewal.normalizeSlug('HTTP-API-EVIDENCE')).toBe('http-api');
    expect(renewal.normalizeSlug('http-api')).toBe('http-api');
  });

  it('returns empty string for null/undefined/empty input', () => {
    expect(renewal.normalizeSlug(null)).toBe('');
    expect(renewal.normalizeSlug(undefined)).toBe('');
    expect(renewal.normalizeSlug('')).toBe('');
    expect(renewal.normalizeSlug('---')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Pure: selectDueForRenewal
// ---------------------------------------------------------------------------

describe('selectDueForRenewal', () => {
  const row = (over: Partial<{ id: number; clientId: number; status: string; expirationDate: Date }>) => ({
    id: 1,
    clientId: 7,
    status: 'verified',
    expirationDate: new Date(NOW.getTime() + 3 * DAY),
    ...over,
  });

  it('selects verified/collected/expired rows expiring within the default 7-day horizon', () => {
    const rows = [
      row({ id: 1, expirationDate: new Date(NOW.getTime() - 1 * DAY) }), // already expired
      row({ id: 2, expirationDate: new Date(NOW.getTime() + 3 * DAY) }), // expiring soon
      row({ id: 3, status: 'collected', expirationDate: new Date(NOW.getTime() + 7 * DAY) }), // at horizon edge
      row({ id: 4, status: 'expired', expirationDate: new Date(NOW.getTime() - 2 * DAY) }), // expired, renewable
      row({ id: 5, expirationDate: new Date(NOW.getTime() + 30 * DAY) }), // beyond horizon
      row({ id: 6, expirationDate: null }), // never expires
      row({ id: 7, status: 'pending', expirationDate: new Date(NOW.getTime() + 1 * DAY) }), // not renewable
    ];
    const due = renewal.selectDueForRenewal(rows, NOW);
    expect(due.map((r) => r.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('respects a custom horizonDays', () => {
    const rows = [
      row({ id: 1, expirationDate: new Date(NOW.getTime() + 1 * DAY) }),
      row({ id: 2, expirationDate: new Date(NOW.getTime() + 3 * DAY) }),
    ];
    expect(renewal.selectDueForRenewal(rows, NOW, { horizonDays: 2 }).map((r) => r.id)).toEqual([1]);
    expect(renewal.selectDueForRenewal(rows, NOW, { horizonDays: 3 }).map((r) => r.id)).toEqual([1, 2]);
  });

  it('is case-insensitive on status and tolerant of missing/empty input', () => {
    const rows = [row({ id: 1, status: 'Verified', expirationDate: new Date(NOW.getTime() + 1 * DAY) })];
    expect(renewal.selectDueForRenewal(rows, NOW).map((r) => r.id)).toEqual([1]);
    expect(renewal.selectDueForRenewal([], NOW)).toEqual([]);
    expect(renewal.selectDueForRenewal(undefined as never, NOW)).toEqual([]);
    expect(renewal.selectDueForRenewal([{ id: 1 } as never, null as never], NOW)).toEqual([]);
  });

  it('treats invalid expiration dates as never expiring (defensive)', () => {
    const rows = [row({ id: 1, expirationDate: 'not-a-real-date' as never })];
    expect(renewal.selectDueForRenewal(rows, NOW)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pure: connectionForRow
// ---------------------------------------------------------------------------

describe('connectionForRow', () => {
  const row = { id: 1, clientId: 7, systemId: 'github-evidence' };

  it('matches a connected connection via normalized provider slug', () => {
    expect(renewal.connectionForRow(row, [CONNECTED_GITHUB])).toEqual(CONNECTED_GITHUB);
  });

  it('is case-insensitive and accepts the bare provider slug', () => {
    expect(renewal.connectionForRow({ ...row, systemId: 'GitHub' }, [CONNECTED_GITHUB])).toBeTruthy();
    expect(renewal.connectionForRow({ ...row, systemId: 'github' }, [CONNECTED_GITHUB])).toBeTruthy();
  });

  it('ignores connections that are not connected', () => {
    expect(
      renewal.connectionForRow(row, [
        { ...CONNECTED_GITHUB, status: 'error' },
        { ...CONNECTED_GITHUB, status: 'disconnected' },
      ])
    ).toBeUndefined();
  });

  it('returns undefined when there is no match or the row has no systemId', () => {
    expect(renewal.connectionForRow(row, [])).toBeUndefined();
    expect(renewal.connectionForRow({ ...row, systemId: 'gitlab' }, [CONNECTED_GITHUB])).toBeUndefined();
    expect(renewal.connectionForRow({ ...row, systemId: null }, [CONNECTED_GITHUB])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pure: computeRenewalResult
// ---------------------------------------------------------------------------

describe('computeRenewalResult', () => {
  it("decides 'renew' when a connected collector exists for the source", () => {
    const decision = renewal.computeRenewalResult(
      { id: 1, clientId: 7, status: 'verified', systemId: 'github-evidence', evidenceId: 'ev-1', expirationDate: new Date(NOW.getTime() - DAY) },
      NOW,
      { connections: [CONNECTED_GITHUB] }
    );
    expect(decision.action).toBe('renew');
    expect(decision.reason).toContain('github');
  });

  it("decides 'expire' with a remediation note when no connection exists", () => {
    const decision = renewal.computeRenewalResult(
      { id: 2, clientId: 7, status: 'verified', systemId: 'gitlab', evidenceId: 'ev-2', expirationDate: new Date(NOW.getTime() - DAY) },
      NOW,
      { connections: [CONNECTED_GITHUB] }
    );
    expect(decision.action).toBe('expire');
    expect(decision.reason).toContain('No connected evidence collector');
    expect(decision.remediationNote).toContain('ev-2');
    expect(decision.remediationNote).toContain('gitlab');
    expect(decision.remediationNote).toContain('client 7');
  });

  it("decides 'skip' when the row is not actually due", () => {
    const decision = renewal.computeRenewalResult(
      { id: 3, clientId: 7, systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() + 30 * DAY) },
      NOW,
      { connections: [CONNECTED_GITHUB] }
    );
    expect(decision.action).toBe('skip');
    expect(decision.reason).toContain('not due');
    expect(decision.remediationNote).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pure: buildDueForRenewalWhere (must not throw with mocked columns)
// ---------------------------------------------------------------------------

describe('buildDueForRenewalWhere', () => {
  it('builds a truthy where clause for the default and custom horizons', () => {
    expect(renewal.buildDueForRenewalWhere(NOW)).toBeTruthy();
    expect(renewal.buildDueForRenewalWhere(NOW, 14)).toBeTruthy();
    expect(renewal.buildDueForRenewalWhere(NOW, 0)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// DB-backed: runEvidenceRenewal
// ---------------------------------------------------------------------------

describe('runEvidenceRenewal', () => {
  it('renews a due row via the injected collector and refreshes expiration', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      {
        id: 1,
        clientId: 7,
        status: 'verified',
        systemId: 'github-evidence',
        evidenceId: 'ev-1',
        intervalDays: 90,
        expirationDate: new Date(NOW.getTime() - DAY),
      },
    ]);
    queue.push({}); // updateEvidenceRow
    const runCollector = vi.fn(async () => ({ ok: true }));

    const summary = await renewal.runEvidenceRenewal({
      db,
      now: NOW,
      limit: 5,
      connections: [CONNECTED_GITHUB],
      runCollector,
    });

    expect(summary).toMatchObject({ dueRows: 1, renewedRows: 1, expiredRows: 0, failedRenewals: 0, skippedRows: 0, remediationNotes: [], horizonDays: 7 });
    expect(runCollector).toHaveBeenCalledWith(CONNECTED_GITHUB, 7, NOW);
    expect(calls.limit[0][0]).toBe(5);
    expect(calls.update[0][0]).toBe(mocks.evidence);
    expect(calls.set[0][0]).toMatchObject({
      status: 'verified',
      lastVerified: NOW,
      expirationDate: new Date(NOW.getTime() + 90 * DAY),
    });
    expect(calls.set[0][0].updatedAt).toBeInstanceOf(Date);
  });

  it('defaults intervalDays to 365 when the row has none', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 2, clientId: 7, status: 'verified', systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({});
    const runCollector = vi.fn(async () => ({ ok: true }));

    await renewal.runEvidenceRenewal({ db, now: NOW, connections: [CONNECTED_GITHUB], runCollector });

    expect(calls.set[0][0].expirationDate).toEqual(new Date(NOW.getTime() + 365 * DAY));
  });

  it('marks a due row without a connection as expired with a remediation note', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 3, clientId: 7, status: 'verified', systemId: 'gitlab', evidenceId: 'ev-3', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({});

    const summary = await renewal.runEvidenceRenewal({ db, now: NOW, connections: [CONNECTED_GITHUB] });

    expect(summary).toMatchObject({ dueRows: 1, expiredRows: 1, renewedRows: 0, failedRenewals: 0 });
    expect(summary.remediationNotes.join(' ')).toContain('ev-3');
    expect(calls.set[0][0]).toMatchObject({ status: 'expired', updatedAt: NOW });
  });

  it('skips rows returned by the query that are no longer due (defensive)', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 4, clientId: 7, status: 'verified', systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() + 30 * DAY) },
    ]);

    const summary = await renewal.runEvidenceRenewal({ db, now: NOW, connections: [CONNECTED_GITHUB] });

    expect(summary).toMatchObject({ dueRows: 1, skippedRows: 1, renewedRows: 0, expiredRows: 0 });
    expect(calls.update).toHaveLength(0);
  });

  it('records failed collector runs and marks the row expired', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 5, clientId: 7, status: 'verified', systemId: 'github-evidence', evidenceId: 'ev-5', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({});
    const runCollector = vi.fn(async () => ({ ok: false, message: 'collector exploded' }));

    const summary = await renewal.runEvidenceRenewal({ db, now: NOW, connections: [CONNECTED_GITHUB], runCollector });

    expect(summary).toMatchObject({ dueRows: 1, failedRenewals: 1, expiredRows: 1, renewedRows: 0 });
    expect(summary.remediationNotes.join(' ')).toContain('collector exploded');
    expect(calls.set[0][0].status).toBe('expired');
  });

  it('defensively expires the row if the connection vanishes after the decision', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 9, clientId: 7, status: 'verified', systemId: 'github-evidence', evidenceId: 'ev-9', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({});
    // find-stub: reports a match on the first probe (decision = renew) and
    // none on the second (defensive no-connection branch). A real array can
    // never behave this way, so the stub is the only way to reach that code.
    const vanishing = {
      find: vi.fn().mockReturnValueOnce(CONNECTED_GITHUB).mockReturnValueOnce(undefined),
    };

    const summary = await renewal.runEvidenceRenewal({ db, now: NOW, connections: vanishing as never });

    expect(summary).toMatchObject({ dueRows: 1, failedRenewals: 1, expiredRows: 1, renewedRows: 0 });
    expect(summary.remediationNotes.join(' ')).toContain('No collector connection found for evidence #9');
    expect(calls.set[0][0].status).toBe('expired');
  });

  it('uses id-based fallbacks in the failure remediation note', async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 11, clientId: 7, status: 'verified', systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() - DAY) }, // no evidenceId
    ]);
    queue.push({});
    const runCollector = vi.fn(async () => ({ ok: false })); // no message either

    const summary = await renewal.runEvidenceRenewal({ db, now: NOW, connections: [CONNECTED_GITHUB], runCollector });

    expect(summary.failedRenewals).toBe(1);
    const note = summary.remediationNotes.join(' ');
    expect(note).toContain('evidence #11');
    expect(note).toContain('collector error');
  });

  it('falls back to getDb, listCollectorConnections and runCollectorConnection when not injected', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 6, clientId: 7, status: 'verified', systemId: 'github-evidence', evidenceId: 'ev-6', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({});
    mocks.getDb.mockResolvedValue(db);
    mocks.listCollectorConnections.mockResolvedValue([CONNECTED_GITHUB]);
    mocks.runCollectorConnection.mockResolvedValue({ ok: true });

    const summary = await renewal.runEvidenceRenewal({ now: NOW });

    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(mocks.listCollectorConnections).toHaveBeenCalledWith(7, db);
    expect(mocks.runCollectorConnection).toHaveBeenCalledWith(10, 7, db, { now: NOW });
    expect(summary).toMatchObject({ renewedRows: 1 });
    expect(calls.update[0][0]).toBe(mocks.evidence);
  });

  it('caches connections per client across rows', async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 7, clientId: 7, status: 'verified', systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() - DAY) },
      { id: 8, clientId: 7, status: 'verified', systemId: 'github-evidence', expirationDate: new Date(NOW.getTime() - DAY) },
    ]);
    queue.push({}); // update row 7
    queue.push({}); // update row 8
    mocks.getDb.mockResolvedValue(db);
    mocks.listCollectorConnections.mockResolvedValue([CONNECTED_GITHUB]);
    mocks.runCollectorConnection.mockResolvedValue({ ok: true });

    const summary = await renewal.runEvidenceRenewal({ now: NOW });

    expect(mocks.listCollectorConnections).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ dueRows: 2, renewedRows: 2 });
  });

  it('propagates db failures as thrown errors', async () => {
    const { db, queue } = makeDb();
    queue.push(rejectQueue(new Error('db down')));

    await expect(renewal.runEvidenceRenewal({ db, now: NOW })).rejects.toThrow('db down');
  });
});

// ---------------------------------------------------------------------------
// DB-backed: getRenewalStateSummary
// ---------------------------------------------------------------------------

describe('getRenewalStateSummary', () => {
  it('counts due, expired, verified and collected rows', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1 }, { id: 2 }]); // due
    queue.push([{ id: 3 }]); // expired
    queue.push([{ id: 4 }, { id: 5 }, { id: 6 }]); // verified
    queue.push([]); // collected

    const summary = await renewal.getRenewalStateSummary({ db, now: NOW });

    expect(summary).toEqual({
      horizonDays: 7,
      dueForRenewal: 2,
      expired: 1,
      verified: 3,
      collected: 0,
      completedAt: NOW.toISOString(),
    });
    expect(calls.where).toHaveLength(4);
  });

  it('uses the injected custom horizonDays and falls back to getDb when db omitted', async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    queue.push([]);
    queue.push([]);
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await renewal.getRenewalStateSummary({ now: NOW, horizonDays: 14 });

    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(summary.horizonDays).toBe(14);
  });

  it('coerces non-array query results to zero counts', async () => {
    const { db, queue } = makeDb();
    queue.push(undefined); // due
    queue.push(null); // expired
    queue.push({ not: 'an array' }); // verified
    queue.push(undefined); // collected

    const summary = await renewal.getRenewalStateSummary({ db, now: NOW });

    expect(summary).toMatchObject({ dueForRenewal: 0, expired: 0, verified: 0, collected: 0 });
  });

  it('falls back to the current time and default horizon when not provided', async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    queue.push([]);
    queue.push([]);
    queue.push([]);

    const summary = await renewal.getRenewalStateSummary({ db });

    expect(summary.horizonDays).toBe(7);
    expect(typeof summary.completedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// QA cycle 6 (QA pass): empty-due path + constant/edge coverage
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('exposes the documented defaults', () => {
    expect(renewal.DEFAULT_RENEWAL_HORIZON_DAYS).toBe(7);
    expect(renewal.DEFAULT_RENEWAL_INTERVAL_MS).toBe(12 * 60 * 60 * 1000);
    expect([...renewal.RENEWABLE_STATUSES]).toEqual(['verified', 'collected', 'expired']);
  });
});

describe('runEvidenceRenewal (empty due set)', () => {
  it('returns a zeroed summary and performs no writes when nothing is due', async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // select -> no due rows
    mocks.getDb.mockResolvedValue(db);
    mocks.listCollectorConnections.mockResolvedValue([]);

    const summary = await renewal.runEvidenceRenewal({ now: NOW });

    expect(summary).toEqual({
      dueRows: 0,
      renewedRows: 0,
      expiredRows: 0,
      skippedRows: 0,
      failedRenewals: 0,
      remediationNotes: [],
      horizonDays: 7,
      completedAt: NOW,
    });
    expect(mocks.listCollectorConnections).not.toHaveBeenCalled();
    expect(calls.update).toHaveLength(0);
    expect(calls.insert).toHaveLength(0);
  });

  it('returns a zeroed summary with a custom horizon when the select is empty', async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await renewal.runEvidenceRenewal({ now: NOW, horizonDays: 14, limit: 3 });

    expect(summary).toMatchObject({ dueRows: 0, horizonDays: 14 });
    expect(summary.completedAt).toBeInstanceOf(Date);
  });
});

describe('selectDueForRenewal (string dates)', () => {
  it('accepts ISO-8601 string expirationDate values', () => {
    const rows = [
      {
        id: 1,
        clientId: 7,
        status: 'verified',
        expirationDate: new Date(NOW.getTime() + 2 * DAY).toISOString(),
      },
      {
        id: 2,
        clientId: 7,
        status: 'verified',
        expirationDate: new Date(NOW.getTime() + 30 * DAY).toISOString(),
      },
    ];
    expect(renewal.selectDueForRenewal(rows, NOW).map((r) => r.id)).toEqual([1]);
  });
});
