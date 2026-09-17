import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Incidents REST v1 contract gate (QA cycle 39).
 *
 * Three-layer acceptance gate for GET /api/v1/incidents(+/:id):
 *
 * 1. Static source scans prove the SOURCE SHAPE of
 *    server/routers/api-v1.ts (mirrors connectorsAuthGate.test.ts):
 *      - `incidents` is imported from '../../schema';
 *      - BOTH routes are registered BELOW the
 *        `apiV1Router.use(apiKeyMiddleware)` line, so the API-key gate
 *        applies (registering above it would silently bypass auth);
 *      - the list route carries an explicit result bound (.limit(...))
 *        with the contracted default (100) and cap (Math.min(limit, 200));
 *      - every contracted error code (BAD_REQUEST / NOT_FOUND /
 *        INTERNAL_ERROR) is emitted by its owning route;
 *      - nothing is console.logged and no NEW process.env variable is
 *        read beyond the pre-existing COMPLIANCE_API_KEY +
 *        npm_package_version pattern.
 *
 * 2. Schema contract proves the DRIZZLE ENUMS back the query-param
 *    whitelists (incident_severity, incident_status) and that the
 *    router-side allowlists stay in lockstep with '../../schema'.
 *
 * 3. Behavioral tests drive the REAL registered handlers extracted from
 *    the router's layer stack with a fully mocked database (vi.mock
 *    '../../db') and mocked AutopilotEngine -- importing the router NEVER
 *    touches the database; invalid input short-circuits before ANY query
 *    executes; success/failure envelopes match the contracted shapes
 *    ({data,total} / row / {error,code}).
 *
 * Deterministic: pure text scans + fully mocked modules -- no DB, no
 * network, no timers -> no flake.
 */

// ---------------------------------------------------------------------------
// Layer 1 -- static source-scan gate
// ---------------------------------------------------------------------------

const API_V1_PATH = path.resolve('packages/core/src/server/routers/api-v1.ts');
const SCHEMA_PATH = path.resolve('packages/core/src/schema.ts');

const readSrc = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

/** Drop JS comments so docblocks mentioning rules don't trip code scans. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');

/** Pull the string literals out of a `const X = ['a','b'] as const;` decl. */
const parseStringArrayDecl = (src: string, name: string): string[] => {
  const m = new RegExp(`\\b${name}\\s*=\\s*\\[([^\\]]*)\\]`).exec(src);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
};

describe('incidents v1 gate -- static source scan (cycle 39)', () => {
  // Comments stripped first so documentation mentions never count as code.
  const code = stripComments(readSrc(API_V1_PATH));

  const MIDDLEWARE_RE = /apiV1Router\s*\.\s*use\s*\(\s*apiKeyMiddleware\s*\)/;
  const LIST_RE = /apiV1Router\s*\.\s*get\s*\(\s*'\/incidents'\s*,/;
  const DETAIL_RE = /apiV1Router\s*\.\s*get\s*\(\s*'\/incidents\/:id'\s*,/;

  const middlewareMatch = code.match(MIDDLEWARE_RE);
  const listStart = code.search(LIST_RE);
  const detailStart = code.search(DETAIL_RE);
  // Route chunks: list runs until the detail route begins; detail runs to EOF
  // (the router export). Slicing this way keeps per-route assertions honest.
  const listChunk = listStart >= 0 ? code.slice(listStart, detailStart >= 0 ? detailStart : undefined) : '';
  const detailChunk = detailStart >= 0 ? code.slice(detailStart) : '';

  it('source under gate is readable', () => {
    expect(code.length).toBeGreaterThan(5000);
  });

  it('imports `incidents` from ../../schema', () => {
    const raw = readSrc(API_V1_PATH);
    expect(raw).toMatch(
      /import\s*\{[^}]*\bincidents\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/schema['"]/
    );
  });

  it('both incident routes are registered BELOW the apiKeyMiddleware line', () => {
    expect(middlewareMatch, 'apiV1Router.use(apiKeyMiddleware) must exist').toBeTruthy();
    expect(listStart, "GET /incidents must be registered").toBeGreaterThan(-1);
    expect(detailStart, "GET /incidents/:id must be registered").toBeGreaterThan(-1);
    const middlewareIdx = middlewareMatch!.index!;
    expect(listStart, 'list route must sit after the auth middleware').toBeGreaterThan(middlewareIdx);
    expect(detailStart, 'detail route must sit after the auth middleware').toBeGreaterThan(middlewareIdx);
  });

  it('each incident route is registered exactly once', () => {
    expect(code.match(LIST_RE)?.length ?? 0).toBe(1);
    expect(code.match(DETAIL_RE)?.length ?? 0).toBe(1);
  });

  it('list route performs a BOUNDED read (explicit .limit)', () => {
    expect(listChunk).toMatch(/\.limit\s*\(/);
    // Contracted pagination shape: default 100, capped at 200.
    expect(listChunk).toMatch(/\bMath\.min\s*\(\s*limit\s*,\s*200\s*\)/);
    expect(listChunk).toMatch(/\blet\s+limit\s*(?::\s*\w+)?\s*=\s*100\b/);
  });

  it('detail route reads a single row (single-row bound)', () => {
    expect(detailChunk).toMatch(/\.limit\s*\(\s*1\s*\)/);
  });

  it('error codes live in their owning route: BAD_REQUEST everywhere, NOT_FOUND on :id, INTERNAL_ERROR everywhere', () => {
    expect(listChunk, 'list route must emit BAD_REQUEST').toContain("'BAD_REQUEST'");
    expect(detailChunk, 'detail route must emit BAD_REQUEST for a non-int id').toContain("'BAD_REQUEST'");
    expect(detailChunk, 'detail route must emit NOT_FOUND for unknown ids').toContain("'NOT_FOUND'");
    expect(listChunk, 'list route must emit INTERNAL_ERROR on failure').toContain("'INTERNAL_ERROR'");
    expect(detailChunk, 'detail route must emit INTERNAL_ERROR on failure').toContain("'INTERNAL_ERROR'");
  });

  it('detail route parses the id as an integer and looks it up via eq(incidents.id, id)', () => {
    expect(detailChunk).toMatch(/parseInt\s*\(\s*req\.params\.id\s*,\s*10\s*\)/);
    expect(detailChunk).toMatch(/isNaN\s*\(\s*id\s*\)/);
    expect(detailChunk).toMatch(/eq\s*\(\s*incidents\.id\s*,\s*id\s*\)/);
  });

  it('no console.log anywhere in the router', () => {
    expect(code).not.toMatch(/console\s*\.\s*log/);
  });

  it('no NEW process.env reads beyond the pre-existing API_KEY/npm_package_version pattern', () => {
    // Neither incident route may read configuration from the environment.
    expect(listChunk).not.toMatch(/process\s*\.\s*env/);
    expect(detailChunk).not.toMatch(/process\s*\.\s*env/);
    // Whole-file tripwire: any newly introduced env var name fails here.
    // Allowlist = variables that pre-date cycle 39 (COMPLIANCE_API_KEY for
    // the auth gate, npm_package_version for /health). Amend deliberately,
    // never silently.
    const names = [...code.matchAll(/process\s*\.\s*env\s*\.\s*([A-Za-z_$][\w$]*)/g)].map(
      (m) => m[1]
    );
    const ALLOWED = new Set(['COMPLIANCE_API_KEY', 'npm_package_version']);
    const unexpected = [...new Set(names)].filter((n) => !ALLOWED.has(n));
    expect(unexpected, `unexpected process.env reads: ${unexpected.join(', ') || 'none'}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 -- schema contract (drizzle enums back the query-param sets)
// ---------------------------------------------------------------------------

describe('incidents v1 gate -- schema contract (cycle 39)', () => {
  const CONTRACT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
  const CONTRACT_STATUSES = [
    'open',
    'investigating',
    'mitigated',
    'resolved',
    'reported',
  ] as const;

  const readFullSchemaSrc = () => {
    const schemaDir = path.resolve('packages/core/src/schema');
    if (fs.existsSync(schemaDir) && fs.statSync(schemaDir).isDirectory()) {
      return fs.readdirSync(schemaDir).map(f => fs.readFileSync(path.join(schemaDir, f), 'utf8')).join('\n');
    }
    return readSrc(SCHEMA_PATH);
  };
  const schemaSrc = readFullSchemaSrc();

  it('schema source is readable and declares both incident enums as pgEnum', () => {
    expect(schemaSrc.length).toBeGreaterThan(10000);
    expect(schemaSrc).toMatch(/pgEnum\s*\(\s*"incident_severity"/);
    expect(schemaSrc).toMatch(/pgEnum\s*\(\s*"incident_status"/);
  });

  it('pgEnum incidentSeverityEnum == low|medium|high|critical', async () => {
    const schema = await import('../../schema');
    expect(schema.incidentSeverityEnum.enumValues).toEqual([...CONTRACT_SEVERITIES]);
  });

  it('pgEnum incidentStatusEnum == open|investigating|mitigated|resolved|reported', async () => {
    const schema = await import('../../schema');
    expect(schema.incidentStatusEnum.enumValues).toEqual([...CONTRACT_STATUSES]);
  });

  it('router-side query-param allowlists stay in lockstep with the pgEnums', async () => {
    const code = stripComments(readSrc(API_V1_PATH));
    const schema = await import('../../schema');

    const srcSeverities = parseStringArrayDecl(code, 'INCIDENT_SEVERITIES');
    const srcStatuses = parseStringArrayDecl(code, 'INCIDENT_STATUSES');
    expect(srcSeverities.length, 'router declares INCIDENT_SEVERITIES').toBeGreaterThan(0);
    expect(srcStatuses.length, 'router declares INCIDENT_STATUSES').toBeGreaterThan(0);

    expect(srcSeverities).toEqual([...schema.incidentSeverityEnum.enumValues]);
    expect(srcStatuses).toEqual([...schema.incidentStatusEnum.enumValues]);
  });

  it('incidents table exposes the contracted columns', async () => {
    const schema = await import('../../schema');
    const table = schema.incidents as Record<string, unknown>;
    const REQUIRED_COLUMNS = [
      'id',
      'clientId',
      'title',
      'detectedAt',
      'severity',
      'status',
      'isSignificant',
      'earlyWarningSentAt',
      'intermediateReportSentAt',
      'finalReportSentAt',
      'cause',
      'description',
      'crossBorderImpact',
      'reportedToAuthorities',
    ];
    const missing = REQUIRED_COLUMNS.filter((c) => table[c] === undefined);
    expect(missing, `missing incidents columns: ${missing.join(', ') || 'none'}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Layer 3 -- behavioral contract against the real registered handlers
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted above const declarations -- mocks must be
// created through vi.hoisted so the factories can close over them.
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  onboardClient: vi.fn(),
}));

// api-v1.ts imports AutopilotEngine at module scope; replaced wholesale so
// importing the router stays side-effect free.
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
  onboardClient: dbMocks.onboardClient,
}));

vi.mock('../../lib/autopilot/engine', () => ({
  AutopilotEngine: class {},
}));

import * as apiV1Module from '../../server/routers/api-v1';

/** Extract the FINAL handler Express would run for GET routePath directly
 *  off the router's layer stack -- no HTTP server, no supertest needed.
 *  Fails loudly if the route is missing (unfinished backend item). */
function getGetHandler(router: any, routePath: string): (...args: any[]) => Promise<any> {
  for (const layer of router.stack ?? []) {
    const r = layer.route;
    if (r && r.path === routePath && r.methods?.get) {
      const stack = r.stack ?? [];
      return stack[stack.length - 1].handle;
    }
  }
  throw new Error(`GET ${routePath} is not registered on apiV1Router yet (contract end-state)`);
}

/** Minimal fake req/res pair capturing status/json without HTTP. */
function makeReqRes(params: Record<string, string> = {}, query: Record<string, string> = {}) {
  const req: any = { params, query, headers: {} };
  const res: any = { statusCode: 200, body: undefined as unknown };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return { req, res };
}

/** Chainable drizzle-like query builder. getDb resolves to a PLAIN,
 *  NON-thenable builder (so `await getDb()` cannot flatten through it);
 *  every builder method keeps returning the builder until .limit(), which
 *  records the bound and hands back a real promise that ALSO carries the
 *  builder methods -- so `.offset()` can chain afterwards and `await`
 *  yields the rows (mirrors how the routes consume drizzle). Every
 *  .limit/.offset call is recorded for assertion. */
function chainDb(rows: unknown[], captured: { limit?: number; offset?: number } = {}) {
  const builder: any = {};
  const terminal: any = Promise.resolve(rows);
  const api = {
    select: () => builder,
    from: () => builder,
    where: () => builder,
    orderBy: () => builder,
    groupBy: () => builder,
    limit: (n: number) => {
      captured.limit = n;
      return terminal;
    },
    offset: (n: number) => {
      captured.offset = n;
      return terminal;
    },
  };
  Object.assign(builder, api);
  // Chaining continues past .limit() (e.g. .offset()) via these.
  Object.assign(terminal, api);
  return builder;
}

describe('incidents v1 gate -- behavioral contract (cycle 39)', () => {
  let listHandler: (...args: any[]) => Promise<any>;
  let detailHandler: (...args: any[]) => Promise<any>;

  beforeEach(() => {
    dbMocks.getDb.mockReset();
    dbMocks.onboardClient.mockReset();
    const router = (apiV1Module as any).apiV1Router;
    expect(router, 'api-v1.ts must export apiV1Router').toBeTruthy();
    listHandler = getGetHandler(router, '/incidents');
    detailHandler = getGetHandler(router, '/incidents/:id');
  });

  it('both handlers resolve from the router stack (routes wired, not just greppable)', () => {
    expect(typeof listHandler).toBe('function');
    expect(typeof detailHandler).toBe('function');
  });

  it('list rejects an invalid status with 400 BAD_REQUEST and never executes a query', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({}, { status: 'bogus' });
    await listHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    // The handler resolves its db client before validating, but bad input
    // must short-circuit BEFORE any SELECT is built/executed.
    expect(captured.limit).toBeUndefined();
  });

  it('list rejects an invalid severity with 400 BAD_REQUEST and never executes a query', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({}, { severity: 'catastrophic' });
    await listHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    expect(captured.limit).toBeUndefined();
  });

  it('list rejects a non-integer clientId with 400 BAD_REQUEST and never executes a query', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({}, { clientId: 'abc' });
    await listHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    expect(captured.limit).toBeUndefined();
  });

  it('list rejects a non-positive limit with 400 BAD_REQUEST and never executes a query', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({}, { limit: '0' });
    await listHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    expect(captured.limit).toBeUndefined();
  });

  it('list defaults to limit=100/offset=0 when no query params are supplied', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes();
    await listHandler(req, res);
    expect(captured.limit).toBe(100);
    expect(captured.offset).toBe(0);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0 });
  });

  it('list caps an oversized limit at 200 (bounded read enforced at runtime too)', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({}, { limit: '9999', offset: '40' });
    await listHandler(req, res);
    expect(captured.limit).toBe(200);
    expect(captured.offset).toBe(40);
    expect(res.statusCode).toBe(200);
  });

  it('list returns the {data,total} envelope on success', async () => {
    const rows = [{ id: 1, title: 'Breach', severity: 'high', status: 'open' }];
    dbMocks.getDb.mockResolvedValue(chainDb(rows));
    const { req, res } = makeReqRes({}, { clientId: '1', status: 'open', severity: 'high' });
    await listHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: rows, total: 1 });
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it('list maps a db failure to 500 INTERNAL_ERROR', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('connection refused'));
    const { req, res } = makeReqRes();
    await listHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('detail rejects a non-integer id with 400 BAD_REQUEST and never queries', async () => {
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    const { req, res } = makeReqRes({ id: 'seven' });
    await detailHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    expect(captured.limit).toBeUndefined();
  });

  it('detail returns 404 NOT_FOUND for an unknown id', async () => {
    dbMocks.getDb.mockResolvedValue(chainDb([]));
    const { req, res } = makeReqRes({ id: '424242' });
    await detailHandler(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('detail returns the incident row on success', async () => {
    const row = { id: 7, title: 'GDPR breach', status: 'investigating', severity: 'critical' };
    dbMocks.getDb.mockResolvedValue(chainDb([row]));
    const { req, res } = makeReqRes({ id: '7' });
    await detailHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(row);
  });

  it('detail maps a db failure to 500 INTERNAL_ERROR', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('boom'));
    const { req, res } = makeReqRes({ id: '7' });
    await detailHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('no other db surface is reachable from the incidents handlers', async () => {
    // Happy-path pass over both routes; the only mocked db export the
    // handlers may touch is getDb -> query chain.
    const captured: { limit?: number; offset?: number } = {};
    dbMocks.getDb.mockResolvedValue(chainDb([], captured));
    await listHandler(makeReqRes().req, makeReqRes().res);
    await detailHandler(makeReqRes({ id: '1' }).req, makeReqRes({ id: '1' }).res);
    expect(dbMocks.onboardClient).not.toHaveBeenCalled();
  });
});
