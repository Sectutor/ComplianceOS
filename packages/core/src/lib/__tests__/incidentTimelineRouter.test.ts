import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

/**
 * NIS2 incident timeline router (server/routers/incidentTimeline.ts) —
 * contract tests (QA cycle 16, NIS2 Phase 2 Task 2.2).
 *
 * Mirrors incidentClassifierRouter.test.ts: the router is a factory
 * `createIncidentTimelineRouter(t, protectedProcedure)` tested with a tiny
 * fake tRPC builder — no tRPC server, no DB. The engine underneath
 * (lib/cyber/incidentTimeline.ts) is pure; the router only validates input
 * with zod and forwards to the engine.
 *
 * Contract under test — exactly TWO protected `.query` procedures (never
 * mutations), sharing one zod input schema:
 *   timeline     protected.query  input IncidentTimelineInput
 *   escalations  protected.query  input IncidentTimelineInput
 * Schema shape: detectedAt required date; severity enum optional;
 * isSignificant boolean optional; earlyWarningSentAt / notificationSentAt /
 * finalReportSentAt optional dates; now optional date.
 *
 * Hardening contract:
 *   - handlers forward to the engine and never throw for valid (incl.
 *     degenerate) input — the only intentional rejection is zod BAD_REQUEST
 *     (ZodError at the schema layer);
 *   - the router is pure: it never touches the DB.
 *
 * The fake builder attaches the input schema to each captured query route
 * (router.timeline.schema, router.escalations.schema) so the zod contract is
 * asserted directly, exactly like the cycle 15 classifier router test.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the incident timeline
// router never touches it, and this asserts that fact.
vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createIncidentTimelineRouter } from '../../server/routers/incidentTimeline';

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
  const router = createIncidentTimelineRouter(t, procedure);
  return { router };
}

const DETECTED_AT = new Date('2026-08-18T08:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('incidentTimeline router — route shape', () => {
  it('exposes exactly the two documented query procedures (timeline, escalations) and no mutations', () => {
    const { router } = buildFakeTRPC();
    expect(Object.keys(router).sort()).toEqual(['escalations', 'timeline']);
    for (const name of ['timeline', 'escalations']) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe('function');
      expect(router[name].type, `route "${name}" type`).toBe('query');
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    expect(Object.values(router).every((route: any) => route?.type !== 'mutation')).toBe(true);
  });
});

describe('incidentTimeline router — timeline', () => {
  it('returns the documented IncidentTimeline shape for a representative input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.timeline.handler({
      input: { detectedAt: DETECTED_AT, now: DETECTED_AT },
      ctx: {},
    });

    expect(Array.isArray(result.phases)).toBe(true);
    expect(result.phases).toHaveLength(4);
    expect(result.phases.map((p: any) => p.id)).toEqual([
      'detection',
      'early-warning',
      'notification',
      'final-report',
    ]);
    for (const phase of result.phases) {
      expect(phase.at).toBeInstanceOf(Date);
      expect(typeof phase.label).toBe('string');
      expect(['completed', 'current', 'upcoming']).toContain(phase.status);
    }
    expect(['detection', 'early-warning', 'notification', 'final-report']).toContain(result.currentPhase);
    expect(typeof result.isComplete).toBe('boolean');
  });

  it('never throws for minimal valid input (detectedAt only); detection stays completed', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.timeline.handler({
      input: { detectedAt: DETECTED_AT, now: DETECTED_AT },
      ctx: {},
    });
    expect(result.phases[0].id).toBe('detection');
    expect(result.phases[0].status).toBe('completed');
    expect(result.currentPhase).toBe('early-warning');
    expect(result.isComplete).toBe(false);
  });

  it('forwards the injected clock: all sentAt present and <= now => complete timeline', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.timeline.handler({
      input: {
        detectedAt: DETECTED_AT,
        earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
        notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
        finalReportSentAt: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
        now: new Date(DETECTED_AT.getTime() + 4 * HOUR_MS),
      },
      ctx: {},
    });
    expect(result.phases.every((p: any) => p.status === 'completed')).toBe(true);
    expect(result.currentPhase).toBe('final-report');
    expect(result.isComplete).toBe(true);
  });

  it('never touches the DB', async () => {
    const { router } = buildFakeTRPC();
    await router.timeline.handler({ input: { detectedAt: DETECTED_AT, now: DETECTED_AT }, ctx: {} });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe('incidentTimeline router — escalations', () => {
  it('returns an array of escalation triggers for a representative input', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.escalations.handler({
      input: {
        detectedAt: DETECTED_AT,
        isSignificant: true,
        severity: 'high',
        now: new Date(DETECTED_AT.getTime() + 73 * HOUR_MS),
      },
      ctx: {},
    });

    expect(Array.isArray(result)).toBe(true);
    const ids = result.map((t: any) => t.id);
    expect(ids).toContain('sev-escalation');
    expect(ids).toContain('notif-overdue');
    expect(new Set(ids).size).toBe(ids.length); // never duplicates an id
    for (const trigger of result) {
      expect(['info', 'warning', 'critical']).toContain(trigger.level);
      expect(typeof trigger.title).toBe('string');
      expect(typeof trigger.detail).toBe('string');
    }
  });

  it('isSignificant false => exactly one monitor trigger (level info)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.escalations.handler({
      input: { detectedAt: DETECTED_AT, now: DETECTED_AT },
      ctx: {},
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('monitor');
    expect(result[0].level).toBe('info');
  });

  it('never throws for minimal valid input (detectedAt only)', async () => {
    const { router } = buildFakeTRPC();
    const result = await router.escalations.handler({
      input: { detectedAt: DETECTED_AT, now: DETECTED_AT },
      ctx: {},
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it('never touches the DB', async () => {
    const { router } = buildFakeTRPC();
    await router.escalations.handler({
      input: { detectedAt: DETECTED_AT, isSignificant: true, severity: 'critical', now: DETECTED_AT },
      ctx: {},
    });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe('incidentTimeline router — zod validation (BAD_REQUEST, never a raw crash)', () => {
  it('timeline requires detectedAt (Date) and rejects bad optional field types', () => {
    const { router } = buildFakeTRPC();
    const schema = router.timeline.schema;

    expect(schema).toBeDefined();
    // required detectedAt
    expect(() => schema.parse({})).toThrow(ZodError);
    expect(() => schema.parse({ isSignificant: true })).toThrow(ZodError);
    expect(() => schema.parse({ detectedAt: 'not-a-date' })).toThrow(ZodError);
    // optional fields still type-checked
    expect(() => schema.parse({ detectedAt: DETECTED_AT, severity: 'extreme' })).toThrow(ZodError); // invalid enum
    expect(() => schema.parse({ detectedAt: DETECTED_AT, isSignificant: 'yes' })).toThrow(ZodError); // wrong type
    expect(() => schema.parse({ detectedAt: DETECTED_AT, earlyWarningSentAt: 'soon' })).toThrow(ZodError);
    expect(() => schema.parse({ detectedAt: DETECTED_AT, notificationSentAt: 123 })).toThrow(ZodError);
    expect(() => schema.parse({ detectedAt: DETECTED_AT, finalReportSentAt: 'later' })).toThrow(ZodError);
    expect(() => schema.parse({ detectedAt: DETECTED_AT, now: 'soon' })).toThrow(ZodError);
    // valid payloads
    expect(schema.parse({ detectedAt: DETECTED_AT }).detectedAt).toBeInstanceOf(Date);
    for (const severity of ['low', 'medium', 'high', 'critical']) {
      expect(schema.parse({ detectedAt: DETECTED_AT, severity }).severity).toBe(severity);
    }
    const parsed = schema.parse({
      detectedAt: DETECTED_AT,
      severity: 'high',
      isSignificant: true,
      earlyWarningSentAt: DETECTED_AT,
      notificationSentAt: DETECTED_AT,
      finalReportSentAt: DETECTED_AT,
      now: DETECTED_AT,
    });
    expect(parsed.severity).toBe('high');
    expect(parsed.isSignificant).toBe(true);
    expect(parsed.earlyWarningSentAt).toBeInstanceOf(Date);
    expect(parsed.notificationSentAt).toBeInstanceOf(Date);
    expect(parsed.finalReportSentAt).toBeInstanceOf(Date);
    expect(parsed.now).toBeInstanceOf(Date);
  });

  it('escalations shares the same zod input schema (identical accept/reject behavior)', () => {
    const { router } = buildFakeTRPC();
    const timelineSchema = router.timeline.schema;
    const escalationsSchema = router.escalations.schema;

    expect(escalationsSchema).toBeDefined();
    const rejects = (payload: unknown) => {
      expect(() => timelineSchema.parse(payload)).toThrow(ZodError);
      expect(() => escalationsSchema.parse(payload)).toThrow(ZodError);
    };
    const accepts = (payload: unknown) => {
      expect(() => timelineSchema.parse(payload)).not.toThrow();
      expect(() => escalationsSchema.parse(payload)).not.toThrow();
    };

    rejects({}); // missing detectedAt
    rejects({ detectedAt: 'not-a-date' }); // wrong type
    rejects({ detectedAt: DETECTED_AT, severity: 'extreme' }); // invalid severity enum
    rejects({ detectedAt: DETECTED_AT, isSignificant: 'yes' }); // wrong boolean type
    rejects({ detectedAt: DETECTED_AT, now: 42 }); // wrong date type
    accepts({ detectedAt: DETECTED_AT });
    accepts({ detectedAt: DETECTED_AT, severity: 'critical', isSignificant: true });
    accepts({
      detectedAt: DETECTED_AT,
      earlyWarningSentAt: DETECTED_AT,
      notificationSentAt: DETECTED_AT,
      finalReportSentAt: DETECTED_AT,
      now: DETECTED_AT,
    });
  });
});
