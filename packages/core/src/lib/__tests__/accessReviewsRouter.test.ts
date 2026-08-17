import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Access Reviews router (P2 #7) — unit tests (contract).
 *
 * Mirrors evidenceCollectorsRouter.test.ts: the router is a factory
 * `createAccessReviewsRouter(t, clientProcedure, adminProcedure)` that is
 * fully testable with a tiny fake `t.router` + chainable procedures — no tRPC
 * server setup. The lib module (../accessReviews) is mocked so we verify zod
 * validation, argument delegation and the listHistory contract (certified /
 * revoked only) without a database.
 *
 * Contract procedures: list({clientId}), getSummary({clientId}),
 * createCycle({clientId,name,dueDate,description?}), provision({clientId,cycleId}),
 * listTasks({cycleId,status?}), certify({taskId,note?}), revoke({taskId,note?}),
 * runOverdueCheck({clientId}), listHistory({clientId}).
 *
 * NOTE: the router/lib may not be committed yet (backend agent works in
 * parallel); these tests encode the contract and run the moment the new
 * createAccessReviewsRouter lands.
 */
const routerMocks = vi.hoisted(() => ({
  createCycle: vi.fn(),
  provisionCycle: vi.fn(),
  listCycles: vi.fn(),
  listTasks: vi.fn(),
  certifyTask: vi.fn(),
  revokeTask: vi.fn(),
  runOverdueCheck: vi.fn(),
  getSummary: vi.fn(),
  listHistory: vi.fn(),
}));

vi.mock('../accessReviews', () => ({
  createCycle: routerMocks.createCycle,
  provisionCycle: routerMocks.provisionCycle,
  listCycles: routerMocks.listCycles,
  listTasks: routerMocks.listTasks,
  certifyTask: routerMocks.certifyTask,
  revokeTask: routerMocks.revokeTask,
  runOverdueCheck: routerMocks.runOverdueCheck,
  getSummary: routerMocks.getSummary,
  listHistory: routerMocks.listHistory,
}));

// Canonical location per the P2 #7 contract: packages/core/src/server/routers/accessReviews.ts
import { createAccessReviewsRouter } from '../../server/routers/accessReviews';

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
  // Same signature as the production wiring (routers.ts passes a premium
  // client procedure and an admin procedure).
  const router = createAccessReviewsRouter(t, procedure, procedure);
  return { router, schemas };
}

const DUE_DATE = new Date('2026-09-30T00:00:00.000Z');

const CYCLE = {
  id: 1,
  clientId: 5,
  name: 'Q3 Access Review',
  dueDate: DUE_DATE,
  description: 'Quarterly recertification',
  status: 'draft',
  createdAt: '2026-08-16T10:00:00.000Z',
};

const TASK = {
  id: 1,
  cycleId: 1,
  userId: 11,
  role: 'Admin',
  status: 'pending',
  dueDate: DUE_DATE,
};

beforeEach(() => {
  for (const mock of Object.values(routerMocks)) mock.mockReset();
});

describe('accessReviews router — list', () => {
  it('validates a numeric clientId', () => {
    const { schemas } = buildFakeTRPC();
    const listSchema = schemas[0]; // definition order: list first

    expect(() => listSchema.parse({})).toThrow();
    expect(() => listSchema.parse({ clientId: 'x' })).toThrow();
    expect(listSchema.parse({ clientId: 3 })).toMatchObject({ clientId: 3 });
  });

  it('delegates to listCycles with the clientId', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.listCycles.mockResolvedValue([CYCLE]);

    const result = await router.list.handler({ input: { clientId: 5 } });

    expect(routerMocks.listCycles).toHaveBeenCalledWith(5);
    expect(result).toEqual([CYCLE]);
  });
});

describe('accessReviews router — getSummary', () => {
  it('validates a numeric clientId', () => {
    const { schemas } = buildFakeTRPC();
    const summarySchema = schemas[1];

    expect(() => summarySchema.parse({})).toThrow();
    expect(summarySchema.parse({ clientId: 5 })).toMatchObject({ clientId: 5 });
  });

  it('delegates to getSummary with the clientId', async () => {
    const { router } = buildFakeTRPC();
    const summary = { total: 4, pending: 2, certified: 1, revoked: 1, overdue: 0 };
    routerMocks.getSummary.mockResolvedValue(summary);

    const result = await router.getSummary.handler({ input: { clientId: 5 } });

    expect(routerMocks.getSummary).toHaveBeenCalledWith(5);
    expect(result).toEqual(summary);
  });
});

describe('accessReviews router — createCycle', () => {
  it('validates clientId, name and dueDate', () => {
    const { schemas } = buildFakeTRPC();
    const createSchema = schemas[2];

    expect(() => createSchema.parse({})).toThrow();
    expect(() => createSchema.parse({ clientId: 5, name: '', dueDate: DUE_DATE })).toThrow();
    expect(() => createSchema.parse({ clientId: 5, name: 'Q3', dueDate: '2026-09-30' })).toThrow(); // not a Date
    expect(
      createSchema.parse({ clientId: 5, name: 'Q3', dueDate: DUE_DATE }),
    ).toMatchObject({ clientId: 5, name: 'Q3', dueDate: DUE_DATE });
    // description is optional
    expect(
      createSchema.parse({ clientId: 5, name: 'Q3', dueDate: DUE_DATE, description: 'note' }),
    ).toMatchObject({ description: 'note' });
  });

  it('forwards the full input to createCycle', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.createCycle.mockResolvedValue(CYCLE);

    const input = { clientId: 5, name: 'Q3 Access Review', dueDate: DUE_DATE, description: 'Quarterly recertification' };
    const result = await router.createCycle.handler({ input });

    expect(routerMocks.createCycle).toHaveBeenCalledWith(input);
    expect(result).toEqual(CYCLE);
  });
});

describe('accessReviews router — provision', () => {
  it('validates clientId and cycleId', () => {
    const { schemas } = buildFakeTRPC();
    const provisionSchema = schemas[3];

    expect(() => provisionSchema.parse({})).toThrow();
    expect(provisionSchema.parse({ clientId: 5, cycleId: 3 })).toMatchObject({
      clientId: 5,
      cycleId: 3,
    });
  });

  it('delegates to provisionCycle(clientId, cycleId)', async () => {
    const { router } = buildFakeTRPC();
    const provisionResult = { provisioned: 2, existing: 0, userIds: [11, 12] };
    routerMocks.provisionCycle.mockResolvedValue(provisionResult);

    const result = await router.provision.handler({ input: { clientId: 5, cycleId: 3 } });

    expect(routerMocks.provisionCycle).toHaveBeenCalledWith(5, 3);
    expect(result).toEqual(provisionResult);
  });
});

describe('accessReviews router — listTasks', () => {
  it('accepts a cycleId and an optional status', () => {
    const { schemas } = buildFakeTRPC();
    const listTasksSchema = schemas[4];

    expect(() => listTasksSchema.parse({})).toThrow();
    expect(listTasksSchema.parse({ cycleId: 3 })).toMatchObject({ cycleId: 3 });
    expect(listTasksSchema.parse({ cycleId: 3, status: 'pending' })).toMatchObject({
      cycleId: 3,
      status: 'pending',
    });
  });

  it('delegates to listTasks(cycleId, status)', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.listTasks.mockResolvedValue([TASK]);

    const result = await router.listTasks.handler({ input: { cycleId: 3, status: 'pending' } });

    expect(routerMocks.listTasks).toHaveBeenCalledWith(3, 'pending');
    expect(result).toEqual([TASK]);
  });
});

describe('accessReviews router — certify', () => {
  it('validates taskId and optional note', () => {
    const { schemas } = buildFakeTRPC();
    const certifySchema = schemas[5];

    expect(() => certifySchema.parse({})).toThrow();
    expect(certifySchema.parse({ taskId: 5 })).toMatchObject({ taskId: 5 });
    expect(certifySchema.parse({ taskId: 5, note: 'verified' })).toMatchObject({ note: 'verified' });
  });

  it('delegates to certifyTask(taskId, note)', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.certifyTask.mockResolvedValue({ id: 5, status: 'certified', note: 'verified' });

    const result = await router.certify.handler({ input: { taskId: 5, note: 'verified' } });

    expect(routerMocks.certifyTask).toHaveBeenCalledWith(5, 'verified');
    expect(result).toMatchObject({ id: 5, status: 'certified' });
  });
});

describe('accessReviews router — revoke', () => {
  it('validates taskId and optional note', () => {
    const { schemas } = buildFakeTRPC();
    const revokeSchema = schemas[6];

    expect(() => revokeSchema.parse({})).toThrow();
    expect(revokeSchema.parse({ taskId: 6 })).toMatchObject({ taskId: 6 });
  });

  it('delegates to revokeTask(taskId, note)', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.revokeTask.mockResolvedValue({ id: 6, status: 'revoked', note: 'offboarded' });

    const result = await router.revoke.handler({ input: { taskId: 6, note: 'offboarded' } });

    expect(routerMocks.revokeTask).toHaveBeenCalledWith(6, 'offboarded');
    expect(result).toMatchObject({ id: 6, status: 'revoked' });
  });
});

describe('accessReviews router — runOverdueCheck', () => {
  it('validates a numeric clientId', () => {
    const { schemas } = buildFakeTRPC();
    const overdueSchema = schemas[7];

    expect(() => overdueSchema.parse({})).toThrow();
    expect(overdueSchema.parse({ clientId: 5 })).toMatchObject({ clientId: 5 });
  });

  it('delegates to runOverdueCheck(clientId)', async () => {
    const { router } = buildFakeTRPC();
    const overdueResult = { overdue: 1, checkedAt: '2026-08-16T12:00:00.000Z' };
    routerMocks.runOverdueCheck.mockResolvedValue(overdueResult);

    const result = await router.runOverdueCheck.handler({ input: { clientId: 5 } });

    expect(routerMocks.runOverdueCheck).toHaveBeenCalledWith(5);
    expect(result).toEqual(overdueResult);
  });
});

describe('accessReviews router — listHistory', () => {
  it('validates a numeric clientId', () => {
    const { schemas } = buildFakeTRPC();
    const historySchema = schemas[8];

    expect(() => historySchema.parse({})).toThrow();
    expect(historySchema.parse({ clientId: 5 })).toMatchObject({ clientId: 5 });
  });

  it('delegates to listHistory(clientId) and returns only certified/revoked', async () => {
    const { router } = buildFakeTRPC();
    const history = [
      { id: 2, clientId: 5, userId: 12, status: 'certified', reviewedAt: '2026-08-15T10:00:00.000Z' },
      { id: 3, clientId: 5, userId: 13, status: 'revoked', reviewedAt: '2026-08-15T11:00:00.000Z' },
    ];
    routerMocks.listHistory.mockResolvedValue(history);

    const result = await router.listHistory.handler({ input: { clientId: 5 } });

    expect(routerMocks.listHistory).toHaveBeenCalledWith(5);
    expect(result).toEqual(history);
    expect(
      result.every((h: { status: string }) => h.status === 'certified' || h.status === 'revoked'),
    ).toBe(true);
  });
});
