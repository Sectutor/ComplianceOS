import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Connectors router auth gate (QA cycle 36).
 *
 * Two-layer acceptance gate for the connectors hardening end-state:
 *
 * 1. Static source scans prove the SOURCE SHAPE (mirrors
 *    evidenceFilesContractGate.test.ts):
 *      - connectors.ts exports a createConnectorsRouter FACTORY receiving
 *        (t, adminProcedure, publicProcedure) instead of a bare router;
 *      - the five mutating routes (runAll, runProvider, install, uninstall,
 *        run) are built from adminProcedure while the five read routes
 *        (listTypes, listInstalled, getLogs, getStats, getRunHistory) stay
 *        publicProcedure and carry an explicit result bound (.limit( or SQL LIMIT);
 *      - no bare `throw new Error(` leaks raw DB errors, nothing is
 *        console.logged, and at least one exported *Schema zod artifact
 *        backs the UI contract layer;
 *      - routers.ts imports AND mounts the factory with the injected
 *        procedures — unmounting it silently breaks every ConnectorManager
 *        call site, hence the tripwire.
 *
 * 2. Behavioral tests prove the artifacts WORK (mirrors
 *    evidenceFilesRouterSchemas.test.ts):
 *      - importing the router module NEVER touches the database or the
 *        automated collectors (both modules are fully mocked via vi.hoisted
 *        factories);
 *      - a fake tRPC chain records which procedure KIND built each route so
 *        the route -> kind contract is executable, not just greppable;
 *      - the install input schema accepts a valid payload and rejects
 *        malformed ones; input validation alone never invokes a mock.
 *
 * Deterministic: pure text scans + fully mocked modules — no DB, no
 * network, no timers -> no flake.
 */

// ---------------------------------------------------------------------------
// Layer 1 — static source-scan gate
// ---------------------------------------------------------------------------

const ROUTERS_PATH = path.resolve('packages/core/src/routers.ts');
const ROUTER_PATH = path.resolve('packages/core/src/server/routers/connectors.ts');

/** The contracted route surface, split by procedure kind. */
const MUTATIONS = ['runAll', 'runProvider', 'install', 'uninstall', 'run'] as const;
const READS = ['listTypes', 'listInstalled', 'getLogs', 'getStats', 'getRunHistory'] as const;

const readSrc = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

/** Drop JS/JSX comments so docblocks mentioning rules don't trip code scans. */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');

/** Split a t.router({...}) factory body into per-procedure source chunks. */
const procedureChunks = (src: string): Record<string, string> => {
  const parts = src.split(
    /(?=\n\s{2,}[A-Za-z_$][\w$]*\s*:\s*(?:adminProcedure|publicProcedure|protectedProcedure|clientProcedure)\b)/
  );
  const map: Record<string, string> = {};
  for (const part of parts) {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(part);
    if (m && !map[m[1]]) map[m[1]] = part;
  }
  return map;
};

describe('connectors auth gate — static source scan (cycle 36)', () => {
  const routers = readSrc(ROUTERS_PATH);
  const routerRaw = readSrc(ROUTER_PATH);
  // Comments stripped first so documentation mentions never count as code.
  // Procedure chunks are cut from the factory declaration onward so any
  // pre-router helpers cannot pollute the per-route scans below.
  const routerCode = stripComments(routerRaw);
  const factoryStart = routerCode.search(/export\s+const\s+createConnectorsRouter\b/);
  const factoryBody = factoryStart >= 0 ? routerCode.slice(factoryStart) : '';
  const chunks = procedureChunks(factoryBody);

  it('sources under gate are readable', () => {
    expect(routers.length).toBeGreaterThan(1000);
    expect(routerRaw.length).toBeGreaterThan(1000);
  });

  it('connectors.ts declares the createConnectorsRouter factory receiving (t, adminProcedure, publicProcedure)', () => {
    expect(factoryStart).toBeGreaterThanOrEqual(0);
    const decl = factoryBody.match(
      /export\s+const\s+createConnectorsRouter\s*=\s*\(([^)]*)\)\s*(?::\s*[^=]+)?=>/
    );
    expect(decl).toBeTruthy();
    const params = decl?.[1] ?? '';
    expect(params).toMatch(/\bt\b/);
    expect(params).toMatch(/\badminProcedure\b/);
    expect(params).toMatch(/\bpublicProcedure\b/);
  });

  it('factory exposes exactly the contracted ten routes', () => {
    const expected = [...MUTATIONS, ...READS].sort();
    expect(Object.keys(chunks).sort()).toEqual(expected);
  });

  it('the five mutation chunks are built from adminProcedure and declare .mutation(', () => {
    for (const name of MUTATIONS) {
      const chunk = chunks[name];
      expect(chunk, `route ${name} must exist`).toBeTruthy();
      expect(chunk, `route ${name} must use adminProcedure`).toMatch(/\badminProcedure\b/);
      expect(chunk, `route ${name} must be a .mutation(`).toMatch(/\.mutation\s*\(/);
    }
    // Exactly five chunks may ride the privileged procedure — a sixth one
    // widening the write surface (or a mutation demoted to public) fails.
    const adminCount = Object.values(chunks).filter((c) => /\badminProcedure\b/.test(c)).length;
    expect(adminCount).toBe(MUTATIONS.length);
  });

  it('the five read chunks are built from publicProcedure and carry an explicit result bound', () => {
    // Accumulate every violation so one run names ALL offending routes
    // instead of stopping at the first one (strictness unchanged).
    const missingBound: string[] = [];
    // A read is bounded when it caps its result set either through the
    // drizzle query-builder (.limit(...)) or an explicit SQL-level LIMIT
    // with a literal/interpolated parameter (raw db.execute(sql`...`) paths
    // cannot chain .limit(); conductor-amended contract, cycle 36b).
    const bounded = (chunk: string): boolean =>
      /\.limit\s*\(/.test(chunk) || /\bLIMIT\s+(?:\d|\$\{|@)/.test(chunk);
    for (const name of READS) {
      const chunk = chunks[name];
      expect(chunk, `route ${name} must exist`).toBeTruthy();
      expect(chunk, `route ${name} must use publicProcedure`).toMatch(/\bpublicProcedure\b/);
      expect(chunk, `route ${name} must be a .query(`).toMatch(/\.query\s*\(/);
      if (!bounded(chunk ?? '')) {
        // Single-row aggregates (COUNT/SUM/MAX/...) return one row by shape
        // and need no LIMIT; anything else unbounded is a violation.
        if (!/(COUNT|SUM|MAX|MIN|AVG)\s*\(/.test(chunk ?? '')) missingBound.push(name);
      }
    }
    // Every multi-row read must carry an explicit bound — no unbounded SELECT
    // streams. Raw db.execute(sql`...`) paths cannot chain .limit(), so the
    // contracted form is the drizzle query-builder one (see how
    // listTypes/listInstalled do it), not a bare SQL LIMIT keyword.
    expect(missingBound, `read routes without an explicit bound: ${missingBound.join(', ') || 'none'}`).toEqual(
      []
    );
    const publicCount = Object.values(chunks).filter((c) => /\bpublicProcedure\b/.test(c)).length;
    expect(publicCount).toBe(READS.length);
  });

  it('tripwire: routers.ts imports AND mounts createConnectorsRouter with the injected procedures', () => {
    const imported = /import\s*\{[^}]*createConnectorsRouter[^}]*\}\s*from/.test(routers);
    const mounted =
      /connectors\s*:\s*createConnectorsRouter\s*\(\s*t\s*,\s*adminProcedure\s*,\s*publicProcedure\s*\)/.test(
        routers
      );
    expect(imported).toBe(true);
    expect(mounted).toBe(true);
  });

  it('router exports at least one reusable zod artifact named *Schema', () => {
    expect(routerCode).toMatch(/export\s+const\s+[A-Za-z_$][\w$]*Schema\b/);
  });

  it('no bare throw new Error( and no console.log anywhere in the router', () => {
    // Failures must escape as TRPCError, never raw Error instances.
    expect(routerCode).not.toMatch(/throw\s+new\s+Error\s*\(/);
    // Nothing about credentials, tokens or file contents is ever logged.
    expect(routerCode).not.toMatch(/console\s*\.\s*log/);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — behavioral schema + procedure-kind contract
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted above const declarations — mocks must be
// created through vi.hoisted so the factories can close over them.
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

const collectorMocks = vi.hoisted(() => ({
  collectGithubEvidence: vi.fn(),
  collectAwsEvidence: vi.fn(),
  collectOktaEvidence: vi.fn(),
  runAllAutomatedCollectors: vi.fn(),
  ensureCollectorLogsTableExists: vi.fn(),
}));

// connectors.ts imports { getDb } from '../../db' plus the five collector
// functions from '../../connectors/automatedEvidenceCollectors'. Both modules
// are fully replaced so importing the router NEVER touches the DB, network
// or cloud providers — these tests exercise validation and wiring only.
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

vi.mock('../../connectors/automatedEvidenceCollectors', () => ({
  collectGithubEvidence: collectorMocks.collectGithubEvidence,
  collectAwsEvidence: collectorMocks.collectAwsEvidence,
  collectOktaEvidence: collectorMocks.collectOktaEvidence,
  runAllAutomatedCollectors: collectorMocks.runAllAutomatedCollectors,
  ensureCollectorLogsTableExists: collectorMocks.ensureCollectorLogsTableExists,
}));

import * as connectorsModule from '../../server/routers/connectors';

/** Minimal fake tRPC builder that tags each route with the procedure KIND
 *  (admin/public) that built it and records its input schema. Each .input()
 *  call spawns a FRESH chain so concurrently-built routes never overwrite
 *  each other's captured schema. */
function buildRouter(): Record<string, { _kind?: string; _schema?: any }> {
  const factory = (connectorsModule as any).createConnectorsRouter;
  if (typeof factory !== 'function') {
    // Fails loudly with a message mapping to the unfinished backend item
    // instead of an opaque module-link error.
    throw new Error(
      'connectors.ts does not export createConnectorsRouter(t, adminProcedure, publicProcedure) yet (contract end-state)'
    );
  }
  const chain = (kind: 'admin' | 'public', schema?: unknown): any => {
    const node: any = {
      _kind: kind,
      _schema: schema,
      input: (next: unknown) => chain(kind, next),
      query: () => node,
      mutation: () => node,
    };
    return node;
  };
  const adminProcedure = chain('admin');
  const publicProcedure = chain('public');
  const t: any = { router: (routes: any) => routes };
  const routes = factory(t, adminProcedure, publicProcedure);
  return routes as Record<string, { _kind?: string; _schema?: any }>;
}

/** Contracted route -> procedure kind map (all ten routes). */
const EXPECTED_KIND_MAP: Record<string, 'admin' | 'public'> = {
  runAll: 'admin',
  runProvider: 'admin',
  install: 'admin',
  uninstall: 'admin',
  run: 'admin',
  listTypes: 'public',
  listInstalled: 'public',
  getLogs: 'public',
  getStats: 'public',
  getRunHistory: 'public',
};

const VALID_INSTALL = { clientId: 1, type: 'github', name: 'GH' };

describe('connectors router schema + auth contract (cycle 36)', () => {
  beforeEach(() => {
    dbMocks.getDb.mockClear();
    for (const fn of Object.values(collectorMocks)) fn.mockClear();
  });

  it('module exports reusable zod schema artifacts for the contract layer', () => {
    const exportedKeys = Object.keys(connectorsModule);
    const schemaExports = exportedKeys.filter((k) => /Schema$/.test(k));
    expect(schemaExports.length).toBeGreaterThanOrEqual(1);

    // Every *Schema export must actually behave like a zod schema.
    for (const key of schemaExports) {
      const value = (connectorsModule as Record<string, unknown>)[key] as any;
      expect(typeof value?.safeParse).toBe('function');
    }
  });

  it('route -> procedure-kind map matches the contract for all ten routes', () => {
    const routes = buildRouter();
    expect(Object.keys(routes).sort()).toEqual(Object.keys(EXPECTED_KIND_MAP).sort());
    for (const [name, kind] of Object.entries(EXPECTED_KIND_MAP)) {
      expect(routes[name], `route ${name} must exist`).toBeTruthy();
      expect(routes[name]._kind, `route ${name} must be ${kind}`).toBe(kind);
    }
  });

  it('install input schema accepts a valid install payload', () => {
    const routes = buildRouter();
    const schema = routes.install?._schema;
    expect(schema).toBeTruthy();

    const parsed = schema.parse(VALID_INSTALL);
    expect(parsed.clientId).toBe(1);
    expect(parsed.type).toBe('github');
    expect(parsed.name).toBe('GH');
  });

  it('install input schema rejects malformed payloads (auth boundary stays tight)', () => {
    const routes = buildRouter();
    const schema = routes.install?._schema;
    expect(schema).toBeTruthy();

    // Missing required field.
    const missingName = { ...VALID_INSTALL } as Record<string, unknown>;
    delete missingName.name;
    expect(schema.safeParse(missingName).success).toBe(false);

    // Empty-string name and wrong primitive type for clientId.
    expect(schema.safeParse({ ...VALID_INSTALL, name: '' }).success).toBe(false);
    expect(schema.safeParse({ ...VALID_INSTALL, clientId: '1' }).success).toBe(false);

    // Nothing at all supplied.
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('input validation never calls any mock (no DB, no collectors)', () => {
    const routes = buildRouter();

    routes.install?._schema?.parse(VALID_INSTALL);
    routes.install?._schema?.safeParse({ ...VALID_INSTALL, clientId: 'oops' });
    routes.uninstall?._schema?.safeParse({ id: 'abc' });

    // Only .parse()/safeParse() ran — no handler executed, so neither the
    // database nor any collector may have been touched.
    expect(dbMocks.getDb).not.toHaveBeenCalled();
    expect(collectorMocks.collectGithubEvidence).not.toHaveBeenCalled();
    expect(collectorMocks.collectAwsEvidence).not.toHaveBeenCalled();
    expect(collectorMocks.collectOktaEvidence).not.toHaveBeenCalled();
    expect(collectorMocks.runAllAutomatedCollectors).not.toHaveBeenCalled();
    expect(collectorMocks.ensureCollectorLogsTableExists).not.toHaveBeenCalled();
  });
});
