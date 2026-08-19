import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Trust Center router (server/routers/trustCenter.ts) — contract tests
 * (QA cycle 13, scorecard #8). Mirrors questionnaireRouter.test.ts:
 * the router is a factory `createTrustCenterRouter(t, publicProcedure,
 * protectedProcedure)` tested with a tiny fake tRPC builder — no tRPC server.
 *
 * The DB module (`../../db`) is mocked so `getDb` serves canned rows in
 * query order. Cycle-13 hardening contract:
 *   - every public procedure degrades gracefully on DB failure (never throws);
 *   - getPosture returns the neutral shape
 *     { client: null, complianceScore: 0, status: "No Data", ... } when the
 *     client is missing or the DB is unreachable;
 *   - requestAccess keeps the FORBIDDEN competitor block as the only
 *     intentional error.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createTrustCenterRouter } from '../../server/routers/trustCenter';

function buildFakeTRPC() {
  const procedure: any = {
    input: (_schema: unknown) => procedure,
    query: (handler: any) => ({ type: 'query', handler }),
    mutation: (handler: any) => ({ type: 'mutation', handler }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createTrustCenterRouter(t, procedure, procedure);
  return { router };
}

/**
 * Serve canned rows in query order. Every `select().from(T).where(...)`
 * query consumes the next queued result at its terminal operation:
 * a bare `.where(...)` is a thenable (resolves to the next rows),
 * while `.limit(1)` / `.orderBy(...)` return promises resolving to the
 * next queued rows.
 */
function mockDbRows(...queryResults: unknown[][]) {
  const queue = queryResults.map((rows) => [...rows]);
  const take = async () => (queue.length ? queue.shift() : []);
  const makeWhere = () => {
    const builder: any = {
      then: (resolve: (v: unknown) => void) => {
        resolve(queue.length ? queue.shift() : []);
      },
      limit: () => take(),
      orderBy: () => ({ limit: () => take() }),
    };
    return builder;
  };
  const db: any = {
    select: () => ({ from: () => ({ where: makeWhere }) }),
    insert: () => ({
      values: () => ({
        returning: async () => (queue.length ? queue.shift() : [{ id: 1 }]),
      }),
    }),
    update: () => ({
      set: () => ({ where: async () => undefined }),
    }),
  };
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('trustCenter.getPublicData', () => {
  it('returns documents for the client', async () => {
    const doc = { id: 1, clientId: 5, name: 'SOC 2 Report', fileUrl: 'https://x' };
    mockDbRows([doc]);
    const { router } = buildFakeTRPC();
    const result = await router.getPublicData.handler({ input: { clientId: 5 }, ctx: {} });
    expect(result.documents).toEqual([doc]);
  });

  it('degrades to an empty documents array on DB failure (never throws)', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('pool down'));
    const { router } = buildFakeTRPC();
    const result = await router.getPublicData.handler({ input: { clientId: 5 }, ctx: {} });
    expect(result).toEqual({ documents: [] });
  });
});

describe('trustCenter.getPosture', () => {
  it('computes posture from client + latest compliance snapshot + documents', async () => {
    mockDbRows(
      [{ id: 5, name: 'Acme', industry: 'Fintech', logoUrl: 'https://logo' }], // clients
      [{ clientId: 5, complianceScore: 82, totalControls: 100, implementedControls: 82 }], // latest snapshot
      [{ id: 1, clientId: 5, name: 'ISO 27001', fileUrl: 'https://x' }] // documents
    );
    const { router } = buildFakeTRPC();
    const result = await router.getPosture.handler({ input: { clientId: 5 }, ctx: {} });
    expect(result.client).toEqual({ id: 5, name: 'Acme', industry: 'Fintech', logo: 'https://logo' });
    expect(result.complianceScore).toBe(82);
    expect(result.status).toBe('Strong');
    expect(result.totalControls).toBe(100);
    expect(result.implementedControls).toBe(82);
    expect(result.documents).toHaveLength(1);
  });

  it.each([
    [95, 'Strong'],
    [75, 'Strong'],
    [62, 'Developing'],
    [50, 'Developing'],
    [12, 'At Risk'],
  ])('maps score %i to status %s', async (score, expected) => {
    mockDbRows(
      [{ id: 1, name: 'Acme' }],
      [{ clientId: 1, complianceScore: score, totalControls: 10, implementedControls: 3 }],
      []
    );
    const { router } = buildFakeTRPC();
    const result = await router.getPosture.handler({ input: { clientId: 1 }, ctx: {} });
    expect(result.status).toBe(expected);
  });

  it('returns "No Data" when no snapshot exists', async () => {
    mockDbRows([{ id: 1, name: 'Acme' }], [], []);
    const { router } = buildFakeTRPC();
    const result = await router.getPosture.handler({ input: { clientId: 1 }, ctx: {} });
    expect(result.status).toBe('No Data');
    expect(result.complianceScore).toBe(0);
  });

  it('returns the neutral posture shape for an unknown client', async () => {
    mockDbRows([]);
    const { router } = buildFakeTRPC();
    const result = await router.getPosture.handler({ input: { clientId: 999 }, ctx: {} });
    expect(result).toMatchObject({ client: null, complianceScore: 0, status: 'No Data', totalControls: 0 });
  });

  it('returns the neutral posture shape on DB failure (never throws)', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('pool down'));
    const { router } = buildFakeTRPC();
    const result = await router.getPosture.handler({ input: { clientId: 1 }, ctx: {} });
    expect(result).toMatchObject({ client: null, complianceScore: 0, status: 'No Data', documents: [], badges: [] });
  });
});

describe('trustCenter.requestAccess', () => {
  it('rejects competitor domains with FORBIDDEN', async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.requestAccess.handler({ input: { clientId: 1, email: 'boss@competitor.com', name: 'Boss' }, ctx: {} })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates a visitor and returns success', async () => {
    mockDbRows([], [{ id: 42 }]); // no existing visitor, then inserted row
    const { router } = buildFakeTRPC();
    const result = await router.requestAccess.handler({
      input: { clientId: 1, email: 'bob@acme.com', name: 'Bob', company: 'Acme' },
      ctx: {},
    });
    expect(result).toEqual({ visitorId: 42, success: true });
  });

  it('updates an existing visitor (no duplicate)', async () => {
    mockDbRows([{ id: 7, email: 'bob@acme.com' }]); // existing visitor → update path
    const { router } = buildFakeTRPC();
    const result = await router.requestAccess.handler({
      input: { clientId: 1, email: 'bob@acme.com', name: 'Bob' },
      ctx: {},
    });
    expect(result).toEqual({ visitorId: 7, success: true });
  });

  it('degrades gracefully on DB failure', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('pool down'));
    const { router } = buildFakeTRPC();
    const result = await router.requestAccess.handler({
      input: { clientId: 1, email: 'bob@acme.com', name: 'Bob' },
      ctx: {},
    });
    expect(result).toEqual({ visitorId: null, success: false, reason: 'db_unavailable' });
  });
});

describe('trustCenter.signNDA', () => {
  it('signs a new NDA', async () => {
    mockDbRows([], []); // no existing signature → insert
    const { router } = buildFakeTRPC();
    const result = await router.signNDA.handler({
      input: { clientId: 1, visitorId: 42, signatureText: 'Bob' },
      ctx: { req: { headers: {}, socket: { remoteAddress: '10.0.0.1' } } },
    });
    expect(result).toEqual({ success: true });
  });

  it('is idempotent when already signed', async () => {
    mockDbRows([{ id: 1 }]); // existing signature → early return
    const { router } = buildFakeTRPC();
    const result = await router.signNDA.handler({
      input: { clientId: 1, visitorId: 42, signatureText: 'Bob' },
      ctx: {},
    });
    expect(result).toEqual({ success: true });
  });

  it('degrades gracefully on DB failure', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('pool down'));
    const { router } = buildFakeTRPC();
    const result = await router.signNDA.handler({
      input: { clientId: 1, visitorId: 42, signatureText: 'Bob' },
      ctx: {},
    });
    expect(result).toEqual({ success: false, reason: 'db_unavailable' });
  });
});

describe('trustCenter.getAccessStatus', () => {
  it('reports unsigned visitor without signature', async () => {
    mockDbRows([{ id: 5, email: 'a@b.com' }], []); // visitor exists, no signature
    const { router } = buildFakeTRPC();
    const result = await router.getAccessStatus.handler({
      input: { clientId: 1, email: 'a@b.com' },
      ctx: { user: undefined },
    });
    expect(result.signed).toBe(false);
    expect(result.visitorId).toBe(5);
  });

  it('reports signed visitor when a signature exists', async () => {
    mockDbRows([{ id: 5, email: 'a@b.com' }], [{ id: 1 }]);
    const { router } = buildFakeTRPC();
    const result = await router.getAccessStatus.handler({
      input: { clientId: 1, email: 'a@b.com' },
      ctx: { user: undefined },
    });
    expect(result.signed).toBe(true);
    expect(result.visitorId).toBe(5);
  });

  it('degrades gracefully on DB failure', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('pool down'));
    const { router } = buildFakeTRPC();
    const result = await router.getAccessStatus.handler({
      input: { clientId: 1, email: 'a@b.com' },
      ctx: { user: undefined },
    });
    expect(result).toMatchObject({ signed: false, isLoggedIn: false, status: 'unknown' });
  });
});
