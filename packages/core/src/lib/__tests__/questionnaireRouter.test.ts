import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Questionnaire router (server/routers/questionnaire.ts) — contract tests for
 * the new auto-scoring procedures (QA cycle 12, scorecard #6).
 *
 * Mirrors vendorRiskRouter.test.ts / accessReviewsRouter.test.ts: the router
 * is a factory `createQuestionnaireRouter(t, clientProcedure, publicProcedure)`
 * tested with a tiny fake `t.router` + chainable procedures — no tRPC server.
 * The DB module (`../../db`) is mocked so `getDb` serves canned rows in query
 * order for the `score` procedure (questionnaire row, then question rows):
 *   db.select().from(questionnaires).where(...).limit(1)
 *   db.select().from(questionnaireQuestions).where(...)   // terminal where
 * (the shipped score procedure reads questions with a terminal `.where(...)`,
 * unlike `get` which chains `.orderBy(...)` — the mock supports both via a
 * thenable `where` result).
 *
 * New procedure contract:
 *   score       clientProcedure.query, input { id: number | string } ->
 *               { questionnaireId, score, summary } | null
 *               unknown id => null; DB failure => graceful empty score (never throws)
 *   scoreAnswers clientProcedure.query, input { questions: [...] } ->
 *               { score, summary }; pure passthrough, never touches the DB,
 *               never throws.
 *
 * NOTE: the refactored factory may not be committed yet (backend agent works
 * in parallel) — these tests encode the contract and run the moment
 * createQuestionnaireRouter lands.
 */
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createQuestionnaireRouter } from '../../server/routers/questionnaire';

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
  const router = createQuestionnaireRouter(t, procedure, procedure);
  return { router, schemas };
}

/**
 * Serve canned rows in query order for the score procedure's two queries:
 * [questionnaireRow(s)] then [questionRows].
 *
 * The `where` result is a THENABLE builder: awaiting it directly (terminal
 * `.where(...)`, used by the questions query) resolves to the next queued
 * rows, while `.limit(1)` / `.orderBy(...)` (used by the questionnaire query)
 * return the next queued rows as a promise.
 */
function mockDbRows(...queryResults: unknown[][]) {
  const queue = queryResults.map((rows) => [...rows]);
  const take = async () => (queue.length ? queue.shift() : []);
  const makeWhere = () => {
    const thenable: any = {
      then: (resolve: (v: unknown) => void) => {
        resolve(queue.length ? queue.shift() : []);
      },
      limit: () => take(),
      orderBy: () => take(),
    };
    return thenable;
  };
  const db: any = { select: () => ({ from: () => ({ where: makeWhere }) }) };
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

const QUESTIONNAIRE_ROW = {
  id: 42,
  clientId: 7,
  name: 'SOC 2 Type II Assessment',
  status: 'in_progress',
  progress: 50,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

/** 2 yes + 1 no + 1 partial => complianceScore 63, readiness "Developing". */
const QUESTION_ROWS = [
  { id: 1, questionnaireId: 42, questionId: 'CC1.1', question: 'Is MFA enforced for remote access?', focusArea: 'CC1.1', answer: 'yes', status: 'pending' },
  { id: 2, questionnaireId: 42, questionId: 'CC2.1', question: 'Is an asset inventory maintained?', focusArea: 'CC2.1', answer: 'Yes', status: 'pending' },
  { id: 3, questionnaireId: 42, questionId: 'CC3.1', question: 'Are backups restored and tested?', focusArea: 'CC3.1', answer: 'no', status: 'pending' },
  { id: 4, questionnaireId: 42, questionId: 'CC4.1', question: 'Is change management enforced?', focusArea: 'CC4.1', answer: 'partial', status: 'pending' },
];

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('questionnaire router — route shape', () => {
  it('exposes the score, scoreAnswers, listTemplates, get and saveQuestions routes', () => {
    const { router } = buildFakeTRPC();
    for (const name of ['score', 'scoreAnswers', 'listTemplates', 'get', 'saveQuestions']) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler).toBe('function');
    }
  });
});

describe('questionnaire router — score', () => {
  it('returns { questionnaireId, score, summary } with engine math for a known questionnaire', async () => {
    mockDbRows([QUESTIONNAIRE_ROW], QUESTION_ROWS);
    const { router } = buildFakeTRPC();

    const result = await router.score.handler({ input: { id: 42 } });

    expect(result).toMatchObject({
      questionnaireId: 42,
      score: {
        total: 4,
        answered: 4,
        passed: 2,
        failed: 1,
        partial: 1,
        completionRate: 100,
        complianceScore: 63, // (2 + 0.5*1) / 4 * 100 = 62.5 -> Math.round -> 63
        readiness: 'Developing',
      },
      summary: { label: 'Developing', tone: 'warning' },
    });
    expect(result.score.focusAreas).toHaveLength(4);
    expect(typeof result.summary.description).toBe('string');
    expect(result.summary.description.length).toBeGreaterThan(0);
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it('parses a string id ("42") as a number and returns the questionnaire row id', async () => {
    mockDbRows([QUESTIONNAIRE_ROW], QUESTION_ROWS);
    const { router } = buildFakeTRPC();

    const result = await router.score.handler({ input: { id: '42' } });

    expect(result).not.toBeNull();
    expect(result.questionnaireId).toBe(42);
    expect(result.score.complianceScore).toBe(63);
  });

  it('returns a null-safe empty score for a NaN string id (never throws)', async () => {
    const { router } = buildFakeTRPC();

    const result = await router.score.handler({ input: { id: 'not-a-number' } });

    expect(result).not.toBeNull();
    expect(result.score.complianceScore).toBe(0);
    expect(result.score.readiness).toBe('No Data');
    expect(result.summary.label).toBe('No Data');
  });

  it('returns null (not a throw) when the questionnaire does not exist', async () => {
    mockDbRows([]); // no questionnaire row
    const { router } = buildFakeTRPC();

    const result = await router.score.handler({ input: { id: 999 } });

    expect(result).toBeNull();
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it('returns a graceful empty score when getDb rejects (never throws)', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('db down'));
    const { router } = buildFakeTRPC();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await router.score.handler({ input: { id: 42 } });

    consoleSpy.mockRestore();
    expect(result).not.toBeNull();
    expect(result.score).toMatchObject({ complianceScore: 0, readiness: 'No Data' });
    expect(result.summary).toMatchObject({ label: 'No Data', tone: 'neutral' });
    expect(result.questionnaireId).toBeDefined();
  });

  it('returns a graceful empty score when the questions query throws (never throws)', async () => {
    let queryCalls = 0;
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => {
            queryCalls++;
            if (queryCalls === 1) return { limit: async () => [QUESTIONNAIRE_ROW] };
            throw new Error('query failed');
          },
        }),
      }),
    };
    dbMocks.getDb.mockResolvedValue(db);
    const { router } = buildFakeTRPC();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await router.score.handler({ input: { id: 42 } });

    consoleSpy.mockRestore();
    expect(result).not.toBeNull();
    expect(result.score.readiness).toBe('No Data');
    expect(result.score.complianceScore).toBe(0);
    expect(result.summary.label).toBe('No Data');
  });

  it('returns an empty "No Data" score when the questionnaire exists but has no question rows', async () => {
    mockDbRows([QUESTIONNAIRE_ROW]); // questionnaire row, then empty questions result
    const { router } = buildFakeTRPC();

    const result = await router.score.handler({ input: { id: 42 } });

    expect(result).not.toBeNull();
    expect(result.questionnaireId).toBe(42);
    expect(result.score).toMatchObject({
      total: 0,
      answered: 0,
      complianceScore: 0,
      completionRate: 0,
      readiness: 'No Data',
    });
    expect(result.score.focusAreas).toEqual([]);
    expect(result.summary).toMatchObject({ label: 'No Data', tone: 'neutral' });
  });
});

describe('questionnaire router — scoreAnswers (pure passthrough)', () => {
  it('scores answers without touching the DB', async () => {
    const { router } = buildFakeTRPC();
    const input = {
      questions: [
        { questionId: 'q1', answer: 'yes', focusArea: 'A' },
        { questionId: 'q2', answer: 'no', focusArea: 'A' },
        { questionId: 'q3', answer: 'partial', focusArea: 'B' },
        { questionId: 'q4', answer: 'n/a', focusArea: 'B' },
      ],
    };

    const result = await router.scoreAnswers.handler({ input });

    expect(dbMocks.getDb).not.toHaveBeenCalled();
    expect(result.score).toMatchObject({
      total: 4,
      answered: 4, // neutral counts as answered in the engine
      passed: 1,
      failed: 1,
      partial: 1,
      neutral: 1,
      completionRate: 100,
      complianceScore: 38, // (1 + 0.5*1) / 4 * 100 = 37.5 -> 38
      readiness: 'At Risk',
    });
    expect(result.summary).toMatchObject({ label: 'At Risk', tone: 'danger' });
  });

  it('returns a zero score for an empty questions array without touching the DB', async () => {
    const { router } = buildFakeTRPC();

    const result = await router.scoreAnswers.handler({ input: { questions: [] } });

    expect(dbMocks.getDb).not.toHaveBeenCalled();
    expect(result.score).toMatchObject({ total: 0, complianceScore: 0, readiness: 'No Data' });
    expect(result.summary.label).toBe('No Data');
  });

  it('never throws even for unexpected shapes (graceful)', async () => {
    const { router } = buildFakeTRPC();

    const result = await router.scoreAnswers.handler({ input: { questions: [{ questionId: 'x' }] } });

    expect(result.score).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});

describe('questionnaire router — input schemas', () => {
  it('defines a schema that validates score id as number | string', () => {
    const { schemas } = buildFakeTRPC();
    // Required `id` (parse({}) throws) accepting number AND string. Several
    // routes share this exact union shape (get, complete, export*, score);
    // the first match is behaviorally identical to the score schema.
    // NOTE: a schema must ACCEPT { id: 42 } and { id: '42' }, and must REJECT
    // {} — a schema that throws on { id: 42 } (e.g. autoAnswer needing
    // clientId+questions) is NOT a match.
    const idSchema = schemas.find((s: any) => {
      try {
        s.parse({ id: 42 });
        s.parse({ id: '42' });
      } catch {
        return false; // must accept number AND string id
      }
      try {
        s.parse({});
        return false; // must throw: id is required
      } catch {
        return true;
      }
    });

    expect(idSchema).toBeDefined();
    expect(() => idSchema.parse({})).toThrow();
    expect(() => idSchema.parse({ id: null })).toThrow();
    expect(() => idSchema.parse({ id: {} })).toThrow();
    expect(idSchema.parse({ id: 42 })).toMatchObject({ id: 42 });
    expect(idSchema.parse({ id: '42' })).toMatchObject({ id: '42' });
  });

  it('rejects a scoreAnswers question without a questionId (zod)', () => {
    const { schemas } = buildFakeTRPC();
    // The scoreAnswers schema is the one that REQUIRES `questions`
    // (parse({}) throws) and accepts a minimal questions array; other
    // questions-bearing routes (autoAnswer, saveQuestions, generateAnswers)
    // also require clientId/questionnaireId, so they fail the find.
    const scoreAnswersSchema = schemas.find((s: any) => {
      try {
        s.parse({}); // must throw: questions is required
      } catch {
        try {
          s.parse({ questions: [{ questionId: 'q1' }] });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    });

    expect(scoreAnswersSchema).toBeDefined();
    expect(() => scoreAnswersSchema.parse({})).toThrow();
    expect(() => scoreAnswersSchema.parse({ questions: 'nope' })).toThrow();
    expect(() => scoreAnswersSchema.parse({ questions: [{ answer: 'yes' }] })).toThrow();
    expect(() => scoreAnswersSchema.parse({ questions: [{ questionId: 123 }] })).toThrow();
  });

  it('accepts a valid scoreAnswers payload', () => {
    const { schemas } = buildFakeTRPC();
    const scoreAnswersSchema = schemas.find((s: any) => {
      try {
        s.parse({}); // must throw: questions is required
      } catch {
        try {
          s.parse({ questions: [{ questionId: 'q1' }] });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    });

    const parsed = scoreAnswersSchema.parse({
      questions: [{ questionId: 'q1', answer: 'yes', focusArea: 'A' }],
    });
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].questionId).toBe('q1');
  });
});
