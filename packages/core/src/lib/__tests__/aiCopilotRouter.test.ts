import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

/**
 * AI Copilot router (server/routers/aiCopilot.ts) — contract tests
 * (QA cycle 14, scorecard #10).
 *
 * Mirrors trustCenterRouter.test.ts / questionnaireRouter.test.ts: the router
 * is a factory `createAiCopilotRouter(t, protectedProcedure, publicProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engine
 * underneath (lib/ai/copilot.ts) is deterministic and pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test:
 *   status           public.query      -> { available: true, mode: 'builtin', capabilities: [...] }
 *   draftPolicy      protected.query   input { topic, framework?, orgName? }
 *   suggestEvidence  protected.query   input { controlTitle, framework? }
 *   autoMap          protected.query   input { requirement, frameworks? }
 *
 * Hardening contract:
 *   - status works with no DB at all (pure capability advertisement);
 *   - handlers never throw for valid (incl. degenerate) input — the only
 *     intentional rejection is zod BAD_REQUEST (a ZodError at the schema
 *     layer, surfaced as TRPCError 'BAD_REQUEST' by the tRPC server);
 *   - everything is deterministic.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — aiCopilot never touches it,
// and this asserts that fact (see the status test).
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createAiCopilotRouter } from '../../server/routers/aiCopilot';

/** Minimal fake tRPC builder that captures input schemas and handlers. */
function buildFakeTRPC() {
  const schemas: any[] = [];
  const procedure: any = {
    input: (schema: unknown) => {
      schemas.push(schema);
      return procedure;
    },
    query: (handler: any) => ({ type: 'query', handler }),
    mutation: (handler: any) => ({ type: 'mutation', handler }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createAiCopilotRouter(t, procedure, procedure);
  return { router, schemas };
}

/**
 * Find the zod schema that ACCEPTS `accepts` and REJECTS `rejects`
 * (default {}). Each procedure's input schema is uniquely identifiable by its
 * required key (topic / controlTitle / requirement).
 */
function findSchema(schemas: any[], accepts: Record<string, unknown>, rejects: Record<string, unknown> = {}) {
  return schemas.find((s: any) => {
    try {
      s.parse(accepts);
    } catch {
      return false; // must accept the valid payload
    }
    try {
      s.parse(rejects);
      return false; // must reject the invalid payload
    } catch {
      return true;
    }
  });
}

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('aiCopilot router — route shape', () => {
  it('exposes status, draftPolicy, suggestEvidence and autoMap procedures', () => {
    const { router } = buildFakeTRPC();
    for (const name of ['status', 'draftPolicy', 'suggestEvidence', 'autoMap']) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe('function');
    }
  });
});

describe('aiCopilot router — status', () => {
  it('reports availability with builtin mode and capabilities, without touching the DB', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.status.handler({ ctx: {} });

    expect(result.available).toBe(true);
    expect(result.mode).toBe('builtin');
    expect(Array.isArray(result.capabilities)).toBe(true);
    for (const capability of ['draftPolicy', 'suggestEvidence', 'autoMap']) {
      expect(result.capabilities).toContain(capability);
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe('aiCopilot router — draftPolicy', () => {
  it('returns the documented draft shape for a representative input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.draftPolicy.handler({
      input: { topic: 'Access Control', framework: 'SOC 2', orgName: 'Acme Corp' },
      ctx: {},
    });

    expect(typeof result.title).toBe('string');
    expect(result.title.length).toBeGreaterThan(0);
    expect(typeof result.purpose).toBe('string');
    expect(typeof result.scope).toBe('string');
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThan(0);
    for (const section of result.sections) {
      expect(typeof section.heading).toBe('string');
      expect(typeof section.body).toBe('string');
    }
    expect(Array.isArray(result.controls)).toBe(true);
    expect(result.controls.length).toBeGreaterThan(0);
    for (const control of result.controls) {
      expect(typeof control.code).toBe('string');
      expect(typeof control.title).toBe('string');
    }
    expect(typeof result.reviewCadence).toBe('string');
    expect(typeof result.disclaimer).toBe('string');

    // orgName flows through to scope/purpose at the router boundary too
    expect(`${result.scope} ${result.purpose}`.toLowerCase()).toContain('acme corp');
  });

  it('never throws for minimal valid input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.draftPolicy.handler({ input: { topic: 'x' }, ctx: {} });
    expect(result.title).toBeDefined();
    expect(result.disclaimer).toBeDefined();
  });
});

describe('aiCopilot router — suggestEvidence', () => {
  it('returns builtin evidence entries for a known control', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.suggestEvidence.handler({
      input: { controlTitle: 'Access Control' },
      ctx: {},
    });

    expect(result.source).toBe('builtin');
    expect(result.evidence.length).toBeGreaterThan(0);
    for (const entry of result.evidence) {
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(entry.freshness).toBeDefined();
    }
  });

  it('never throws for an unknown (but valid) control keyword', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.suggestEvidence.handler({
      input: { controlTitle: 'no-such-control-xyz' },
      ctx: {},
    });
    expect(result.source).toBe('builtin');
    expect(Array.isArray(result.evidence)).toBe(true);
  });
});

describe('aiCopilot router — autoMap', () => {
  it('returns ranked matches with bestMatch for a representative requirement', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.autoMap.handler({
      input: {
        requirement: 'Enforce multi-factor authentication for all remote access',
        frameworks: ['SOC 2', 'ISO 27001'],
      },
      ctx: {},
    });

    expect(result.matches.length).toBeGreaterThan(0);
    for (const match of result.matches) {
      expect(typeof match.framework).toBe('string');
      expect(typeof match.controlId).toBe('string');
      expect(typeof match.controlTitle).toBe('string');
      expect(typeof match.score).toBe('number');
      expect(match.score).toBeGreaterThanOrEqual(0);
      expect(match.score).toBeLessThanOrEqual(100);
      expect(typeof match.rationale).toBe('string');
    }
    // bestMatch is the top-ranked match; matches sorted by score desc
    expect(result.bestMatch).toEqual(result.matches[0]);
    const scores = result.matches.map((m: any) => m.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('never throws for an unmappable (but valid) requirement', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.autoMap.handler({
      input: { requirement: 'zzz-no-such-requirement' },
      ctx: {},
    });
    expect(Array.isArray(result.matches)).toBe(true);
    expect(result.bestMatch).toBeNull();
  });
});

describe('aiCopilot router — zod validation (BAD_REQUEST, never a raw crash)', () => {
  it('draftPolicy requires a topic (string)', () => {
    const { schemas } = buildFakeTRPC();
    const schema = findSchema(schemas, { topic: 'Access Control' });

    expect(schema, 'draftPolicy schema').toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // missing required topic
    expect(() => schema.parse({ framework: 'SOC 2', orgName: 'Acme' })).toThrow(ZodError); // still no topic
    expect(() => schema.parse({ topic: 42 })).toThrow(ZodError); // wrong type
    // valid: topic only, or with optional extras
    expect(schema.parse({ topic: 'Access Control' }).topic).toBe('Access Control');
    expect(
      schema.parse({ topic: 'Access Control', framework: 'SOC 2', orgName: 'Acme Corp' }).orgName
    ).toBe('Acme Corp');
  });

  it('suggestEvidence requires a controlTitle (string)', () => {
    const { schemas } = buildFakeTRPC();
    const schema = findSchema(schemas, { controlTitle: 'MFA' });

    expect(schema, 'suggestEvidence schema').toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // missing required controlTitle
    expect(() => schema.parse({ controlTitle: 42 })).toThrow(ZodError); // wrong type
    expect(schema.parse({ controlTitle: 'MFA' }).controlTitle).toBe('MFA');
    expect(schema.parse({ controlTitle: 'MFA', framework: 'SOC 2' }).framework).toBe('SOC 2');
  });

  it('autoMap requires a requirement (string) and accepts optional frameworks', () => {
    const { schemas } = buildFakeTRPC();
    const schema = findSchema(schemas, { requirement: 'x' });

    expect(schema, 'autoMap schema').toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // missing required requirement
    expect(() => schema.parse({ frameworks: ['SOC 2'] })).toThrow(ZodError); // still no requirement
    expect(() => schema.parse({ requirement: 42 })).toThrow(ZodError); // wrong type
    expect(schema.parse({ requirement: 'x' }).requirement).toBe('x');
    expect(schema.parse({ requirement: 'x', frameworks: ['SOC 2', 'ISO 27001'] }).frameworks).toEqual([
      'SOC 2',
      'ISO 27001',
    ]);
    expect(schema.parse({ requirement: 'x', frameworks: [] }).frameworks).toEqual([]);
  });
});
