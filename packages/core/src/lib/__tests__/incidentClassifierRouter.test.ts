import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

/**
 * NIS2 incident classifier router (server/routers/incidentClassifier.ts) —
 * contract tests (QA cycle 15, NIS2 incident classifier).
 *
 * Mirrors aiCopilotRouter.test.ts / trustCenterRouter.test.ts: the router is a
 * factory `createIncidentClassifierRouter(t, protectedProcedure)` tested with a
 * tiny fake tRPC builder — no tRPC server, no DB. The engine underneath
 * (lib/cyber/incidentClassifier.ts) is pure; the router only validates input
 * with zod and forwards to the engine.
 *
 * Contract under test — all three are `.query` procedures (never mutations):
 *   classify      protected.query  input IncidentClassificationInput (detectedAt required)
 *   deadlines     protected.query  input { detectedAt, now? }
 *   csirtTemplate protected.query  input { countryCode, incidentTitle, severity,
 *                                          incidentSummary?, detectedAt? }
 *
 * Hardening contract:
 *   - handlers never throw for valid (incl. degenerate) input — the only
 *     intentional rejection is zod BAD_REQUEST (ZodError at the schema layer);
 *   - unknown country codes still produce a template (no throw);
 *   - the router is pure: it never touches the DB.
 *
 * NOTE: unlike aiCopilotRouter.test.ts, classify and deadlines share the
 * `detectedAt` required key, so schemas cannot be identified by probing
 * payloads alone. The fake builder therefore attaches the input schema to each
 * captured query route (router.classify.schema, ...) — same builder shape,
 * unambiguous identification.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the incident classifier
// never touches it, and this asserts that fact.
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createIncidentClassifierRouter } from '../../server/routers/incidentClassifier';

/** Minimal fake tRPC builder that attaches the input schema to each route. */
function buildFakeTRPC() {
  let currentSchema: unknown = null;
  const procedure: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return procedure;
    },
    query: (handler: any) => ({ type: 'query', handler, schema: currentSchema }),
    mutation: (handler: any) => ({ type: 'mutation', handler, schema: currentSchema }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createIncidentClassifierRouter(t, procedure);
  return { router };
}

const DETECTED_AT = new Date('2026-08-18T08:00:00.000Z');

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('incidentClassifier router — route shape', () => {
  it('exposes classify, deadlines and csirtTemplate, all as query procedures (no mutations)', () => {
    const { router } = buildFakeTRPC();
    for (const name of ['classify', 'deadlines', 'csirtTemplate']) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe('function');
      expect(router[name].type, `route "${name}" type`).toBe('query');
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== 'mutation')).toBe(true);
  });
});

describe('incidentClassifier router — classify', () => {
  it('returns the documented engine shape for a representative input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classify.handler({
      input: { detectedAt: DETECTED_AT, cause: 'ransomware attack', affectedUsers: 5000 },
      ctx: {},
    });

    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
    expect(typeof result.isSignificant).toBe('boolean');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.category).toBe('string');
    expect(typeof result.categoryId).toBe('string');
    expect(result.nextDeadline === '24h' || result.nextDeadline === '72h' || result.nextDeadline === '1mo' || result.nextDeadline === null).toBe(true);
  });

  it('never throws for minimal valid input (detectedAt only)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classify.handler({ input: { detectedAt: DETECTED_AT }, ctx: {} });
    expect(result.isSignificant).toBe(false);
    expect(result.severity).toBe('low');
  });

  it('never touches the DB', async () => {
    const { router } = buildFakeTRPC();
    await router.classify.handler({ input: { detectedAt: DETECTED_AT, cause: 'phishing' }, ctx: {} });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe('incidentClassifier router — deadlines', () => {
  it('returns three deadlines plus statuses with the default now (omitted)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.deadlines.handler({ input: { detectedAt: DETECTED_AT }, ctx: {} });

    expect(result.earlyWarning.getTime()).toBe(DETECTED_AT.getTime() + 24 * 60 * 60 * 1000);
    expect(result.incidentNotification.getTime()).toBe(DETECTED_AT.getTime() + 72 * 60 * 60 * 1000);
    expect(result.finalReport.getTime()).toBe(DETECTED_AT.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (const status of [result.earlyWarningStatus, result.incidentNotificationStatus, result.finalReportStatus]) {
      expect(['pending', 'due', 'overdue']).toContain(status);
    }
  });

  it('respects an explicit injected now (statuses computed against it)', async () => {
    const { router } = buildFakeTRPC();
    const now = new Date(DETECTED_AT.getTime() + 25 * 60 * 60 * 1000); // past the 24h early warning
    const result = await router.deadlines.handler({ input: { detectedAt: DETECTED_AT, now }, ctx: {} });

    expect(result.earlyWarningStatus).toBe('overdue');
    expect(result.incidentNotificationStatus).toBe('pending');
    expect(result.finalReportStatus).toBe('pending');
  });
});

describe('incidentClassifier router — csirtTemplate', () => {
  it('returns subject and body for a valid input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.csirtTemplate.handler({
      input: { countryCode: 'DE', incidentTitle: 'Ransomware on file server', severity: 'high' },
      ctx: {},
    });

    expect(typeof result.subject).toBe('string');
    expect(result.subject.length).toBeGreaterThan(0);
    expect(typeof result.body).toBe('string');
    expect(result.body.length).toBeGreaterThan(0);
  });

  it('never throws for an unknown country code (generic template)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.csirtTemplate.handler({
      input: { countryCode: 'ZZ', incidentTitle: 'Outage', severity: 'medium' },
      ctx: {},
    });
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it('tolerates omitted optional fields (incidentSummary, detectedAt)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.csirtTemplate.handler({
      input: { countryCode: 'NL', incidentTitle: 'Phishing wave', severity: 'low' },
      ctx: {},
    });
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
  });
});

describe('incidentClassifier router — zod validation (BAD_REQUEST, never a raw crash)', () => {
  it('classify requires detectedAt (Date)', () => {
    const { router } = buildFakeTRPC();
    const schema = router.classify.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // missing detectedAt
    expect(() => schema.parse({ cause: 'ransomware' })).toThrow(ZodError); // still no detectedAt
    expect(() => schema.parse({ detectedAt: 'not-a-date' })).toThrow(ZodError); // wrong type
    // valid: detectedAt alone, or with optional fields
    expect(schema.parse({ detectedAt: DETECTED_AT }).detectedAt).toBeInstanceOf(Date);
    expect(
      schema.parse({ detectedAt: DETECTED_AT, cause: 'ddos', affectedUsers: 500 }).affectedUsers
    ).toBe(500);
  });

  it('deadlines requires detectedAt and accepts an optional now', () => {
    const { router } = buildFakeTRPC();
    const schema = router.deadlines.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // missing detectedAt
    expect(() => schema.parse({ now: DETECTED_AT })).toThrow(ZodError); // still no detectedAt
    expect(() => schema.parse({ detectedAt: 'not-a-date' })).toThrow(ZodError); // wrong type
    expect(() => schema.parse({ detectedAt: DETECTED_AT, now: 'not-a-date' })).toThrow(ZodError);
    // valid: detectedAt only, or with now
    expect(schema.parse({ detectedAt: DETECTED_AT }).detectedAt).toBeInstanceOf(Date);
    expect(schema.parse({ detectedAt: DETECTED_AT, now: DETECTED_AT }).now).toBeInstanceOf(Date);
  });

  it('csirtTemplate requires countryCode, incidentTitle and a valid severity', () => {
    const { router } = buildFakeTRPC();
    const schema = router.csirtTemplate.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({})).toThrow(ZodError); // all required fields missing
    expect(() => schema.parse({ countryCode: 'DE' })).toThrow(ZodError); // missing title + severity
    expect(() => schema.parse({ countryCode: 'DE', incidentTitle: 'X' })).toThrow(ZodError); // missing severity
    expect(() => schema.parse({ countryCode: 'DE', incidentTitle: 'X', severity: 'extreme' })).toThrow(ZodError); // invalid enum
    expect(() => schema.parse({ countryCode: 42, incidentTitle: 'X', severity: 'high' })).toThrow(ZodError); // wrong type
    // valid: minimal, and with optional fields
    expect(schema.parse({ countryCode: 'DE', incidentTitle: 'X', severity: 'high' }).severity).toBe('high');
    expect(
      schema.parse({ countryCode: 'DE', incidentTitle: 'X', severity: 'low', incidentSummary: 's', detectedAt: DETECTED_AT })
        .detectedAt
    ).toBeInstanceOf(Date);
  });
});
