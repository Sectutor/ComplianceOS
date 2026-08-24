import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Evidence-files router schema contract (QA cycle 36).
 *
 * Behavioral companion to the static evidenceFilesContractGate.test.ts:
 * while the gate proves the SOURCE exports reusable zod artifacts, these
 * tests prove the artifacts WORK — the create/delete input schemas accept
 * valid payloads and reject malformed ones, and importing the router module
 * never touches the database.
 *
 * Deterministic: pure schema.parse calls over a mocked db module — no DB,
 * no network, no timers -> no flake.
 */

// vi.mock factories are hoisted above const declarations — dbMocks must be
// created through vi.hoisted so the factory can close over it.
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests (see aiCopilotRouter.test.ts):
// evidenceFiles imports { getDb } from '../../db'; none of these tests may
// reach it because we only exercise input validation, never handlers.
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import * as routerModule from '../../server/routers/evidenceFiles';
import { createEvidenceFilesRouter } from '../../server/routers/evidenceFiles';

/** Minimal fake tRPC builder that records each route's input schema.
 *  Each .input() call spawns a FRESH chain object so concurrently-built
 *  routes never overwrite each other's captured schema. */
function buildRouter() {
  const chain = (schema?: unknown): any => {
    const node: any = {
      _schema: schema,
      input: (next: unknown) => chain(next),
      query: () => node,
      mutation: () => node,
    };
    return node;
  };
  const adminProcedure = chain();
  const publicProcedure = chain();
  const t: any = { router: (routes: any) => routes };
  // Factory signature is (t, adminProcedure, publicProcedure).
  const routes = createEvidenceFilesRouter(t, adminProcedure, publicProcedure);
  return routes as Record<string, { _schema: any }>;
}

const VALID_CREATE = {
  evidenceId: 42,
  filename: 'policy-2026.pdf',
  fileKey: 'uploads/policy-2026.pdf',
  url: '/uploads/policy-2026.pdf',
};

describe('evidenceFiles router schema contract (cycle 36)', () => {
  beforeEach(() => {
    dbMocks.getDb.mockClear();
  });

  it('module exports reusable zod schema artifacts for the contract layer', () => {
    const exportedKeys = Object.keys(routerModule);
    // At minimum the create-input schema must be exported (gate enforces the
    // source-level pattern; here we enforce the runtime artifact exists).
    const schemaExports = exportedKeys.filter((k) => /Schema$/.test(k));
    expect(schemaExports.length).toBeGreaterThanOrEqual(1);

    // Every *Schema export must actually behave like a zod schema.
    for (const key of schemaExports) {
      const value = (routerModule as Record<string, unknown>)[key] as any;
      expect(typeof value?.safeParse).toBe('function');
    }
  });

  it('create input schema accepts a valid attach-flow payload', () => {
    const routes = buildRouter();
    const schema = routes.create?._schema;
    expect(schema).toBeTruthy();

    const parsed = schema.parse(VALID_CREATE);
    expect(parsed.evidenceId).toBe(42);
    expect(parsed.filename).toBe('policy-2026.pdf');
    expect(parsed.fileKey).toBe('uploads/policy-2026.pdf');
    expect(parsed.url).toBe('/uploads/policy-2026.pdf');
  });

  it('create input schema honors its documented optional fields', () => {
    const routes = buildRouter();
    const schema = routes.create?._schema;
    expect(schema).toBeTruthy();

    const parsed = schema.parse({
      ...VALID_CREATE,
      originalFilename: 'Policy 2026 (final).pdf',
      mimeType: 'application/pdf',
      size: 2048,
    });
    expect(parsed.originalFilename).toBe('Policy 2026 (final).pdf');
    expect(parsed.mimeType).toBe('application/pdf');
    expect(parsed.size).toBe(2048);
  });

  it('create input schema rejects malformed payloads (BAD_REQUEST boundary)', () => {
    const routes = buildRouter();
    const schema = routes.create?._schema;
    expect(schema).toBeTruthy();

    // Missing required field.
    const missingEvidenceId = { ...VALID_CREATE } as Record<string, unknown>;
    delete missingEvidenceId.evidenceId;
    expect(schema.safeParse(missingEvidenceId).success).toBe(false);

    // Wrong primitive types.
    expect(schema.safeParse({ ...VALID_CREATE, evidenceId: '42' }).success).toBe(false);
    expect(schema.safeParse({ ...VALID_CREATE, size: '2kb' }).success).toBe(false);
    expect(schema.safeParse({ ...VALID_CREATE, filename: 17 }).success).toBe(false);
  });

  it('delete input schema keys on a numeric id and rejects non-numeric ids', () => {
    const routes = buildRouter();
    const schema = routes.delete?._schema;
    expect(schema).toBeTruthy();

    expect(schema.parse({ id: 7 })).toEqual({ id: 7 });
    expect(schema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('input validation never touches the database', () => {
    const routes = buildRouter();
    routes.create?._schema?.parse(VALID_CREATE);
    routes.delete?._schema?.parse({ id: 1 });
    // Only .parse() was exercised — no handler ran.
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});
