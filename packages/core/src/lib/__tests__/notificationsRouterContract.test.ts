import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Notifications tRPC router contract gate (QA cycle 40).
 *
 * Two-layer acceptance gate for server/routers/notifications.ts (mirrors
 * connectorsAuthGate.test.ts / apiV1IncidentsContract.test.ts):
 *
 * 1. Static source scans prove the SOURCE SHAPE:
 *      - notifications.ts exports a createNotificationsRouter FACTORY
 *        receiving (t, clientProcedure, adminProcedure, protectedProcedure);
 *      - the route map is EXACT — every contracted name exists with its
 *        contracted procedure KIND and query/mutation verb, and nothing
 *        extra is mounted;
 *      - every input-bearing route validates through a zod object schema
 *        (failures surface as tRPC BAD_REQUEST) — no bare `throw new Error(`
 *        and no console.log anywhere in the router;
 *      - listing reads are bounded (.limit(...) fed from the input limit);
 *        getUnreadCount is a single-row COUNT aggregate and is exempt;
 *      - routers.ts imports AND mounts the factory as `notifications:` with
 *        all four injected procedures — unmounting it silently breaks the
 *        GlobalNotificationCenter call sites, hence the tripwire.
 *
 * 2. Behavioral tests prove the artifacts WORK over a fully mocked
 *    database (vi.mock '../../db'; drizzle-orm operators are partially
 *    replaced via importOriginal so real sql`` templates keep working):
 *      - a fake tRPC chain records each route's procedure KIND, captured
 *        input schema AND its resolver fn, so handlers can be invoked
 *        directly without HTTP/tRPC machinery;
 *      - getNotifications defaults limit=50 and accepts {limit:20};
 *      - markAsRead rejects non-number ids; getSettings requires clientId;
 *      - markAllAsRead declares no input at all;
 *      - getUnreadCount implements `count || 0` semantics ([{count:7}] -> 7,
 *        [{}] -> 0);
 *      - markAsRead scopes its UPDATE to WHERE id = input.id AND userId =
 *        ctx.user.id (tenant scoping asserted on captured drizzle calls).
 *
 * Deterministic: pure text scans + fully mocked modules — no DB, no network,
 * no timers -> no flake. Never connects to PostgreSQL.
 */

// ---------------------------------------------------------------------------
// Layer 1 — static source-scan gate
// ---------------------------------------------------------------------------

const ROUTERS_PATH = path.resolve('packages/core/src/routers.ts');
const ROUTER_PATH = path.resolve('packages/core/src/server/routers/notifications.ts');

/** The contracted route surface, split by procedure kind. */
const CLIENT_QUERIES = ['getSettings', 'getLogs', 'getNotifications'] as const;
const CLIENT_MUTATIONS = ['updateSettings', 'markAsRead', 'markAllAsRead'] as const;
const PROTECTED_QUERIES = ['getUnreadCount'] as const;
const PROTECTED_MUTATIONS = ['sendEvent'] as const;
const ADMIN_MUTATIONS = ['sendOverdueAlert', 'sendUpcomingAlert', 'sendDailyDigest', 'sendWeeklyDigest'] as const;

const readSrc = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

/** Drop JS comments so docblocks mentioning rules don't trip code scans. */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');

/** Split a t.router({...}) factory body into per-procedure source chunks. */
const procedureChunks = (src: string): Record<string, string> => {
  const parts = src.split(
    /(?=\n\s{2,}[A-Za-z_$][\w$]*\s*:\s*(?:adminProcedure|protectedProcedure|clientProcedure)\b)/
  );
  const map: Record<string, string> = {};
  for (const part of parts) {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(part);
    if (m && !map[m[1]]) map[m[1]] = part;
  }
  return map;
};

describe('notifications router gate — static source scan (cycle 40)', () => {
  const routers = readSrc(ROUTERS_PATH);
  const routerRaw = readSrc(ROUTER_PATH);
  const routerCode = stripComments(routerRaw);
  const factoryStart = routerCode.search(/export\s+const\s+createNotificationsRouter\b/);
  const factoryBody = factoryStart >= 0 ? routerCode.slice(factoryStart) : '';
  const chunks = procedureChunks(factoryBody);

  it('sources under gate are readable', () => {
    expect(routers.length).toBeGreaterThan(1000);
    expect(routerRaw.length).toBeGreaterThan(1000);
  });

  it('notifications.ts declares createNotificationsRouter(t, clientProcedure, adminProcedure, protectedProcedure)', () => {
    expect(factoryStart).toBeGreaterThanOrEqual(0);
    const decl = factoryBody.match(
      /export\s+const\s+createNotificationsRouter\s*=\s*\(([^)]*)\)/
    );
    expect(decl).toBeTruthy();
    const params = decl?.[1] ?? '';
    expect(params).toMatch(/\bt\b/);
    expect(params).toMatch(/\bclientProcedure\b/);
    expect(params).toMatch(/\badminProcedure\b/);
    expect(params).toMatch(/\bprotectedProcedure\b/);
  });

  it('factory exposes exactly the contracted twelve routes', () => {
    const expected = [...CLIENT_QUERIES, ...PROTECTED_QUERIES, ...CLIENT_MUTATIONS, ...PROTECTED_MUTATIONS, ...ADMIN_MUTATIONS].sort();
    expect(Object.keys(chunks).sort()).toEqual(expected);
  });

  it('client routes ride clientProcedure; queries are .query(, mutations .mutation(', () => {
    for (const name of [...CLIENT_QUERIES]) {
      const chunk = chunks[name];
      expect(chunk, `route ${name} must exist`).toBeTruthy();
      expect(chunk, `route ${name} must use clientProcedure`).toMatch(/\bclientProcedure\b/);
      expect(chunk, `route ${name} must be a .query(`).toMatch(/\.query\s*\(/);
    }
    for (const name of [...CLIENT_MUTATIONS]) {
      const chunk = chunks[name];
      expect(chunk, `route ${name} must exist`).toBeTruthy();
      expect(chunk, `route ${name} must use clientProcedure`).toMatch(/\bclientProcedure\b/);
      expect(chunk, `route ${name} must be a .mutation(`).toMatch(/\.mutation\s*\(/);
    }
  });

  it('protected + admin routes keep their elevated kinds (sendEvent protected, alerts/digests admin)', () => {
    for (const name of [...PROTECTED_QUERIES]) {
      expect(chunks[name], `route ${name} must exist`).toBeTruthy();
      expect(chunks[name], `route ${name} must use protectedProcedure`).toMatch(/\bprotectedProcedure\b/);
      expect(chunks[name]).toMatch(/\.query\s*\(/);
    }
    for (const name of [...PROTECTED_MUTATIONS, ...ADMIN_MUTATIONS]) {
      expect(chunks[name], `route ${name} must exist`).toBeTruthy();
      expect(chunks[name], `route ${name} must use protected/admin procedure`).toMatch(
        /\b(?:protectedProcedure|adminProcedure)\b/
      );
      expect(chunks[name]).toMatch(/\.mutation\s*\(/);
    }
    // Exactly four chunks may ride the privileged admin procedure — a fifth
    // one widening the write surface fails here.
    const adminCount = Object.values(chunks).filter((c) => /\badminProcedure\b/.test(c)).length;
    expect(adminCount).toBe(ADMIN_MUTATIONS.length);
  });

  it('every input-bearing route validates through a zod object schema (BAD_REQUEST convention)', () => {
    // The two no-input routes are the ONLY ones allowed to skip .input().
    const NO_INPUT = new Set<string>(['getUnreadCount', 'markAllAsRead']);
    for (const [name, chunk] of Object.entries(chunks)) {
      if (NO_INPUT.has(name)) {
        expect(chunk, `${name} must not declare an input schema`).not.toMatch(/\.input\s*\(/);
      } else {
        expect(chunk, `${name} must validate input via zod.object`).toMatch(
          /\.input\s*\(\s*z\.object\s*\(/
        );
      }
    }
  });

  it('listing reads are bounded; single-row aggregates are exempt', () => {
    // Multi-row reads cap their result set through the input-driven bound.
    expect(chunks.getLogs).toMatch(/\.limit\s*\(\s*input\.limit\s*\)/);
    expect(chunks.getNotifications).toMatch(/\.limit\s*\(\s*input\.limit\s*\)/);
    // Single-row lookups carry an explicit row bound of 1.
    expect(chunks.getSettings).toMatch(/\.limit\s*\(\s*1\s*\)/);
    // getUnreadCount returns ONE aggregate row (count(*)) by shape — exempt,
    // same carve-out as connectorsAuthGate applies to COUNT reads.
    expect(chunks.getUnreadCount).toMatch(/count\s*\(/);
  });

  it('no bare throw new Error(, no TRPCError misuse, no console.log in the router', () => {
    // Failures escape through zod BAD_REQUEST validation or the db layer —
    // never as raw Error instances, never logged.
    expect(routerCode).not.toMatch(/throw\s+new\s+Error\s*\(/);
    expect(routerCode).not.toMatch(/throw\s+new\s+TRPCError/);
    expect(routerCode).not.toMatch(/console\s*\.\s*log/);
  });

  it('tripwire: routers.ts imports AND mounts the factory as notifications:', () => {
    const imported = /import\s*\{[^}]*createNotificationsRouter[^}]*\}\s*from/.test(routers);
    const mounted =
      /notifications\s*:\s*createNotificationsRouter\s*\(\s*t\s*,\s*clientProcedure\s*,\s*adminProcedure\s*,\s*protectedProcedure\s*\)/.test(
        routers
      );
    expect(imported, 'routers.ts must import createNotificationsRouter').toBe(true);
    expect(mounted, 'routers.ts must mount notifications: with all four injected procedures').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — behavioral contract over mocked db + fake tRPC chain
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted above const declarations — mocks must be
// created through vi.hoisted so the factories can close over them.
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

// Partial drizzle-orm replacement: eq/and/desc return tagged plain objects so
// tests can assert on captured WHERE clauses; everything else (sql`...`
// templates used for count(*) / IS NULL, relations needed by ../../schema)
// stays the REAL implementation via importOriginal.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    eq: (col: any, value: unknown) => ({ __op: 'eq', colName: col?.name ?? String(col), value }),
    and: (...conds: unknown[]) => ({ __op: 'and', conds: conds.filter(Boolean) }),
    desc: (col: any) => ({ __op: 'desc', colName: col?.name ?? String(col) }),
  };
});

import * as schema from '../../schema';
import * as notificationsModule from '../../server/routers/notifications';

interface FakeRoute {
  _kind?: 'client' | 'protected' | 'admin';
  _verb?: 'query' | 'mutation';
  _schema?: any;
  _resolver?: (...args: any[]) => Promise<any>;
}

/** Minimal fake tRPC builder that tags each route with the procedure KIND
 *  that built it, records its input schema AND keeps the resolver fn so
 *  behavioral tests invoke handlers directly ({input, ctx}) — no HTTP, no
 *  real tRPC. Each .input() spawns a FRESH chain so concurrently-built
 *  routes never overwrite each other's captured state. */
function buildRouter(): Record<string, FakeRoute> {
  const factory = (notificationsModule as any).createNotificationsRouter;
  if (typeof factory !== 'function') {
    throw new Error(
      'notifications.ts does not export createNotificationsRouter(t, clientProcedure, adminProcedure, protectedProcedure) yet (contract end-state)'
    );
  }
  const chain = (
    kind: 'client' | 'protected' | 'admin',
    verb?: 'query' | 'mutation',
    schemaIn?: unknown,
    resolver?: (...args: any[]) => Promise<any>
  ): any => ({
    _kind: kind,
    _verb: verb,
    _schema: schemaIn,
    _resolver: resolver,
    input: (next: unknown) => chain(kind, undefined, next),
    query: (fn: (...args: any[]) => Promise<any>) => chain(kind, 'query', schemaIn, fn),
    mutation: (fn: (...args: any[]) => Promise<any>) => chain(kind, 'mutation', schemaIn, fn),
  });
  const clientProcedure = chain('client');
  const adminProcedure = chain('admin');
  const protectedProcedure = chain('protected');
  const t: any = { router: (routes: any) => routes };
  return factory(t, clientProcedure, adminProcedure, protectedProcedure) as Record<string, FakeRoute>;
}

/** Contracted route -> procedure-kind map (all twelve routes). */
const EXPECTED_KIND_MAP: Record<string, 'client' | 'protected' | 'admin'> = {
  getSettings: 'client',
  updateSettings: 'client',
  markAsRead: 'client',
  markAllAsRead: 'client',
  getLogs: 'client',
  getNotifications: 'client',
  sendEvent: 'protected',
  getUnreadCount: 'protected',
  sendOverdueAlert: 'admin',
  sendUpcomingAlert: 'admin',
  sendDailyDigest: 'admin',
  sendWeeklyDigest: 'admin',
};

/** Chainable drizzle-like query builder. The object handed to getDb is a
 *  PLAIN, NON-thenable builder (so mockResolvedValue cannot flatten it away,
 *  mirroring apiV1IncidentsContract's chainDb). Terminal steps — .where()
 *  and .limit() — return a real promise that ALSO carries the chaining
 *  methods, so SELECT chains ending in either step resolve to rows when
 *  awaited (getUnreadCount awaits straight after .where(); getLogs chains
 *  orderBy().limit()). Every call is recorded into `captured` for assertion. */
function chainDb(rows: unknown[], captured: Record<string, any> = {}) {
  const builder: any = {};
  const terminal: any = Promise.resolve(rows);
  const methods = {
    select: (...a: any[]) => {
      captured.selectArg = a[0];
      return builder;
    },
    from: (tbl: unknown) => {
      captured.fromTable = tbl;
      return builder;
    },
    where: (...a: any[]) => {
      captured.whereArgs = a;
      return terminal;
    },
    orderBy: (...a: any[]) => {
      captured.orderByArgs = a;
      return builder;
    },
    limit: (n: number) => {
      captured.limit = n;
      return terminal;
    },
    update: (tbl: unknown) => {
      captured.updateTable = tbl;
      return builder;
    },
    set: (patch: unknown) => {
      captured.setArg = patch;
      return builder;
    },
    insert: () => ({
      values: async (v: unknown) => {
        captured.insertValues = v;
        return [];
      },
    }),
  };
  // Chaining may continue past a terminal step via these.
  Object.assign(builder, methods);
  Object.assign(terminal, methods);
  return builder;
}

describe('notifications router behavioral contract (cycle 40)', () => {
  beforeEach(() => {
    dbMocks.getDb.mockReset();
  });

  it('route -> procedure-kind + verb map matches the contract for all twelve routes', () => {
    const routes = buildRouter();
    expect(Object.keys(routes).sort()).toEqual(Object.keys(EXPECTED_KIND_MAP).sort());
    for (const [name, kind] of Object.entries(EXPECTED_KIND_MAP)) {
      expect(routes[name]._kind, `route ${name} must be built from ${kind}`).toBe(kind);
      expect(['query', 'mutation']).toContain(routes[name]._verb);
    }
    for (const q of ['getSettings', 'getLogs', 'getNotifications', 'getUnreadCount']) {
      expect(routes[q]._verb, `${q} must be a query`).toBe('query');
    }
    for (const m of ['updateSettings', 'markAsRead', 'markAllAsRead', 'sendEvent']) {
      expect(routes[m]._verb, `${m} must be a mutation`).toBe('mutation');
    }
  });

  it('getNotifications input defaults limit=50 and accepts an explicit {limit:20}', () => {
    const routes = buildRouter();
    const parsed = routes.getNotifications._schema.parse({});
    expect(parsed.limit).toBe(50);
    expect(routes.getNotifications._schema.parse({ limit: 20 })).toEqual({ limit: 20 });
    expect(routes.getNotifications._schema.safeParse({ limit: 'lots' }).success).toBe(false);
  });

  it('markAsRead rejects a non-number id (zod BAD_REQUEST boundary)', () => {
    const schemaIn = buildRouter().markAsRead._schema;
    expect(schemaIn).toBeTruthy();
    expect(schemaIn.safeParse({ id: 'abc' }).success).toBe(false);
    expect(schemaIn.safeParse({ id: 1.5 }).success).toBe(false);
    expect(schemaIn.safeParse({}).success).toBe(false);
    expect(schemaIn.safeParse({ id: 42 })).toMatchObject({ success: true });
  });

  it('getSettings requires clientId; updateSettings requires clientId too', () => {
    const routes = buildRouter();
    expect(routes.getSettings._schema.safeParse({}).success).toBe(false);
    expect(routes.getSettings._schema.safeParse({ clientId: 'one' }).success).toBe(false);
    expect(routes.getSettings._schema.parse({ clientId: 1 })).toEqual({ clientId: 1 });
    expect(routes.updateSettings._schema.safeParse({ emailEnabled: true }).success).toBe(false);
    expect(routes.updateSettings._schema.safeParse({ clientId: 3 }).success).toBe(true);
  });

  it('markAllAsRead declares NO input schema', () => {
    expect(buildRouter().markAllAsRead._schema).toBeUndefined();
  });

  it('getUnreadCount returns count||0 semantics: [{count:7}] -> 7, [{}] -> 0', async () => {
    const routes = buildRouter();
    const ctx = { user: { id: 'u-1' } };

    dbMocks.getDb.mockResolvedValueOnce(chainDb([{ count: 7 }]));
    await expect(routes.getUnreadCount!._resolver!({ ctx })).resolves.toBe(7);

    dbMocks.getDb.mockResolvedValueOnce(chainDb([{}]));
    await expect(routes.getUnreadCount!._resolver!({ ctx })).resolves.toBe(0);

    dbMocks.getDb.mockResolvedValueOnce(chainDb([]));
    await expect(routes.getUnreadCount!._resolver!({ ctx })).resolves.toBe(0);
  });

  it('getUnreadCount filters unread rows scoped to ctx.user.id', async () => {
    const captured: Record<string, any> = {};
    dbMocks.getDb.mockResolvedValue(chainDb([{ count: 0 }], captured));
    const routes = buildRouter();
    await routes.getUnreadCount!._resolver!({ ctx: { user: { id: 'u-9' } } });
    expect(captured.whereArgs[0]).toMatchObject({ __op: 'and' });
    const conds = captured.whereArgs[0].conds;
    expect(conds).toContainEqual({
      __op: 'eq',
      colName: 'user_id', // drizzle records the DB column name, not the TS key
      value: 'u-9',
    });
    // Second cond is the REAL sql`${readAt} IS NULL` fragment (kept via
    // importOriginal) — present, but not decomposed by the tagged-op walker.
    expect(conds).toHaveLength(2);
    expect(conds[1]).toBeTruthy();
  });

  it('markAsRead scopes its UPDATE to WHERE id = input.id AND userId = ctx.user.id', async () => {
    const captured: Record<string, any> = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const routes = buildRouter();

    await expect(
      routes.markAsRead!._resolver!({ input: { id: 42 }, ctx: { user: { id: 'u-1' } } })
    ).resolves.toEqual({ success: true });

    // Updates the notificationLog table…
    expect(captured.updateTable).toBe((schema as any).notificationLog);
    // …marks readAt with a timestamp…
    expect(captured.setArg.readAt).toBeInstanceOf(Date);
    // ...and NEVER widens the write past this user's own row.
    expect(captured.whereArgs[0]).toMatchObject({ __op: 'and' });
    expect(captured.whereArgs[0].conds).toContainEqual({ __op: 'eq', colName: 'id', value: 42 });
    expect(captured.whereArgs[0].conds).toContainEqual({
      __op: 'eq',
      colName: 'user_id', // drizzle records the DB column name, not the TS key
      value: 'u-1',
    });
  });

  it('getNotifications handler feeds input.limit into .limit() and scopes the read to ctx.user.id', async () => {
    const captured: Record<string, any> = {};
    const rows = [{ id: 1, title: 't' }];
    dbMocks.getDb.mockResolvedValue(chainDb(rows, captured));
    const routes = buildRouter();

    await expect(
      routes.getNotifications!._resolver!({ input: { limit: 20 }, ctx: { user: { id: 'u-7' } } })
    ).resolves.toBe(rows);

    expect(captured.limit).toBe(20);
    expect(captured.fromTable).toBe((schema as any).notificationLog);
    // Single eq() scope (NOT and()-wrapped) — assert the whole tagged object.
    expect(captured.whereArgs[0]).toEqual({
      __op: 'eq',
      colName: 'user_id', // drizzle records the DB column name, not the TS key
      value: 'u-7',
    });
  });

  it('getSettings falls back to contracted defaults when the client has none', async () => {
    const captured: Record<string, any> = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const routes = buildRouter();

    const res = await routes.getSettings!._resolver!({ input: { clientId: 5 }, ctx: {} });
    expect(res).toEqual({
      clientId: 5,
      emailEnabled: true,
      overdueEnabled: true,
      upcomingReviewDays: 7,
      dailyDigestEnabled: false,
      weeklyDigestEnabled: true,
      notifyControlReviews: true,
      notifyPolicyRenewals: true,
      notifyEvidenceExpiration: true,
      notifyRiskReviews: true,
    });
  });

  it('input validation alone never touches the database', () => {
    const routes = buildRouter();
    routes.markAsRead._schema?.safeParse({ id: 'oops' });
    routes.getSettings._schema?.safeParse({});
    routes.getNotifications._schema?.parse({});
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});
