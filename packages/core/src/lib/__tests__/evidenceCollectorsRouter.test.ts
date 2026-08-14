import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/**
 * Evidence collectors router — unit tests (contract).
 *
 * The router is a factory `createEvidenceCollectorsRouter(t, protectedProcedure)`
 * that mirrors the management router pattern, so it is fully testable with a
 * tiny fake `t.router` + chainable `protectedProcedure` — no tRPC server setup.
 * The collector-connection lib module is mocked (same vi.mock interception
 * pattern as the other router tests), which lets us verify zod validation,
 * argument delegation and error wrapping without a database.
 */
const routerMocks = vi.hoisted(() => ({
  listCollectorProviders: vi.fn(),
  getCollectorProvider: vi.fn(),
  listCollectorConnections: vi.fn(),
  saveCollectorConnection: vi.fn(),
  deleteCollectorConnection: vi.fn(),
  testCollectorConnection: vi.fn(),
  runCollectorConnection: vi.fn(),
}));

vi.mock('../evidenceCollectorConnections', () => ({
  maskCredential: (v: string) => v,
  maskCredentials: (c: Record<string, string>) => c,
  isSecretField: () => false,
  listCollectorProviders: routerMocks.listCollectorProviders,
  getCollectorProvider: routerMocks.getCollectorProvider,
  listCollectorConnections: routerMocks.listCollectorConnections,
  saveCollectorConnection: routerMocks.saveCollectorConnection,
  deleteCollectorConnection: routerMocks.deleteCollectorConnection,
  testCollectorConnection: routerMocks.testCollectorConnection,
  runCollectorConnection: routerMocks.runCollectorConnection,
}));

import { createEvidenceCollectorsRouter } from '../../routers/evidenceCollectors';

/** Minimal fake tRPC builder that captures input schemas and handlers. */
function buildFakeTRPC() {
  const schemas: any[] = [];
  const protectedProcedure: any = {
    input: (schema: unknown) => {
      schemas.push(schema);
      return protectedProcedure;
    },
    query: (handler: any) => ({ type: 'query', handler }),
    mutation: (handler: any) => ({ type: 'mutation', handler }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createEvidenceCollectorsRouter(t, protectedProcedure);
  return { router, schemas };
}

const VALID_SAVE_INPUT = {
  clientId: 1,
  provider: 'aws',
  name: 'Prod AWS',
  credentials: { accessKeyId: 'AKIA123', secretAccessKey: 'secret' },
  settings: { region: 'us-east-1' },
};

const MANIFESTS = [{ slug: 'aws' }, { slug: 'azure' }];

const CONNECTION = {
  id: 'c1',
  clientId: 3,
  provider: 'aws',
  name: 'Prod AWS',
  status: 'connected',
  lastRunAt: null,
  lastRunSummary: null,
  errorMessage: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  updatedAt: '2026-08-14T10:00:00.000Z',
};

beforeEach(() => {
  for (const mock of Object.values(routerMocks)) mock.mockReset();
});

describe('evidenceCollectors router — listProviders', () => {
  it('returns the provider manifests from the lib', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.listCollectorProviders.mockResolvedValue(MANIFESTS);

    const result = await router.listProviders.handler({});

    expect(routerMocks.listCollectorProviders).toHaveBeenCalledTimes(1);
    expect(result).toBe(MANIFESTS);
  });
});

describe('evidenceCollectors router — list', () => {
  it('validates a numeric clientId', () => {
    const { schemas } = buildFakeTRPC();
    // schema order: list, save, remove, test, run
    const listSchema = schemas[0];

    expect(() => listSchema.parse({})).toThrow();
    expect(() => listSchema.parse({ clientId: 'x' })).toThrow();
    expect(listSchema.parse({ clientId: 3 })).toMatchObject({ clientId: 3 });
  });

  it('delegates to listCollectorConnections with the clientId', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.listCollectorConnections.mockResolvedValue([CONNECTION]);

    const result = await router.list.handler({ input: { clientId: 3 } });

    expect(routerMocks.listCollectorConnections).toHaveBeenCalledWith(3);
    expect(result).toEqual([CONNECTION]);
  });
});

describe('evidenceCollectors router — save', () => {
  it('rejects unknown providers and empty names', () => {
    const { schemas } = buildFakeTRPC();
    const saveSchema = schemas[1];

    expect(() =>
      saveSchema.parse({ ...VALID_SAVE_INPUT, provider: 'bad' }),
    ).toThrow();
    expect(() =>
      saveSchema.parse({ ...VALID_SAVE_INPUT, name: '' }),
    ).toThrow();
    expect(() =>
      saveSchema.parse({ ...VALID_SAVE_INPUT, name: 'x' }),
    ).not.toThrow();
    expect(saveSchema.parse(VALID_SAVE_INPUT)).toMatchObject({
      provider: 'aws',
      name: 'Prod AWS',
    });
  });

  it('forwards the full input to saveCollectorConnection', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.saveCollectorConnection.mockResolvedValue(CONNECTION);

    const result = await router.save.handler({ input: VALID_SAVE_INPUT });

    expect(routerMocks.saveCollectorConnection).toHaveBeenCalledWith(
      VALID_SAVE_INPUT,
    );
    expect(result).toEqual(CONNECTION);
  });
});

describe('evidenceCollectors router — remove', () => {
  it('validates id + clientId', () => {
    const { schemas } = buildFakeTRPC();
    const removeSchema = schemas[2];

    expect(() => removeSchema.parse({})).toThrow();
    expect(removeSchema.parse({ id: 'c1', clientId: 3 })).toMatchObject({
      id: 'c1',
      clientId: 3,
    });
  });

  it('delegates to deleteCollectorConnection(id, clientId)', async () => {
    const { router } = buildFakeTRPC();
    routerMocks.deleteCollectorConnection.mockResolvedValue(true);

    const result = await router.remove.handler({
      input: { id: 'c1', clientId: 3 },
    });

    expect(routerMocks.deleteCollectorConnection).toHaveBeenCalledWith('c1', 3);
    expect(result).toBe(true);
  });
});

describe('evidenceCollectors router — test', () => {
  it('validates id + clientId', () => {
    const { schemas } = buildFakeTRPC();
    const testSchema = schemas[3];

    expect(() => testSchema.parse({})).toThrow();
    expect(testSchema.parse({ id: 'c1', clientId: 3 })).toMatchObject({
      id: 'c1',
      clientId: 3,
    });
  });

  it('delegates to testCollectorConnection(id, clientId)', async () => {
    const { router } = buildFakeTRPC();
    const testResult = {
      ok: true,
      message: 'Connected',
      checkedAt: '2026-08-14T10:00:00.000Z',
    };
    routerMocks.testCollectorConnection.mockResolvedValue(testResult);

    const result = await router.test.handler({
      input: { id: 'c1', clientId: 3 },
    });

    expect(routerMocks.testCollectorConnection).toHaveBeenCalledWith('c1', 3);
    expect(result).toEqual(testResult);
  });
});

describe('evidenceCollectors router — run', () => {
  it('validates id + clientId', () => {
    const { schemas } = buildFakeTRPC();
    const runSchema = schemas[4];

    expect(() => runSchema.parse({})).toThrow();
    expect(runSchema.parse({ id: 'c1', clientId: 3 })).toMatchObject({
      id: 'c1',
      clientId: 3,
    });
  });

  it('delegates to runCollectorConnection(id, clientId)', async () => {
    const { router } = buildFakeTRPC();
    const runResult = {
      connectionId: 'c1',
      provider: 'aws',
      ok: true,
      total: 0,
      passed: 0,
      warning: 0,
      failed: 0,
      error: 0,
      message: 'Done',
      completedAt: '2026-08-14T10:00:00.000Z',
      evidence: [],
    };
    routerMocks.runCollectorConnection.mockResolvedValue(runResult);

    const result = await router.run.handler({
      input: { id: 'c1', clientId: 3 },
    });

    expect(routerMocks.runCollectorConnection).toHaveBeenCalledWith('c1', 3);
    expect(result).toEqual(runResult);
  });
});

describe('evidenceCollectors router — error wrapping', () => {
  it.each([
    ['listProviders', 'listCollectorProviders', {}],
    ['list', 'listCollectorConnections', { input: { clientId: 3 } }],
    ['save', 'saveCollectorConnection', { input: VALID_SAVE_INPUT }],
    ['remove', 'deleteCollectorConnection', { input: { id: 'c1', clientId: 3 } }],
    ['test', 'testCollectorConnection', { input: { id: 'c1', clientId: 3 } }],
    ['run', 'runCollectorConnection', { input: { id: 'c1', clientId: 3 } }],
  ] as const)(
    '%s wraps lib failures in a TRPCError with the evidence-collector prefix',
    async (endpoint, libFn, args) => {
      const { router } = buildFakeTRPC();
      routerMocks[libFn].mockRejectedValue(new Error('db down'));

      const call = router[endpoint].handler(args as never);

      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(
        router[endpoint].handler(args as never),
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
      await expect(
        router[endpoint].handler(args as never),
      ).rejects.toThrow(/^Evidence collector failed: /);
    },
  );
});
