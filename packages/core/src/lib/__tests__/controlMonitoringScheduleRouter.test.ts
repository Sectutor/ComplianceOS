import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

/**
 * Control Monitoring router — getScheduleConfig / updateScheduleConfig tests.
 *
 * The router is a factory `createControlMonitoringRouter(t, protectedProcedure)`
 * that mirrors the management router pattern, so it is fully testable with a
 * tiny fake `t.router` + chainable `protectedProcedure` — no tRPC server setup.
 * The engine module is mocked (same vi.mock interception pattern as the other
 * engine tests), which lets us verify zod validation and handler behavior
 * without a database.
 */
const routerMocks = vi.hoisted(() => ({
  getClientAutoTestSchedule: vi.fn(),
  setClientAutoTestSchedule: vi.fn(),
}));

vi.mock("../controlAutoTestEngine", () => ({
  runControlAutoTest: vi.fn(),
  runAllControlAutoTestsForClient: vi.fn(),
  getClientTestRunHistory: vi.fn(),
  isAutoTestDue: vi.fn(),
  getClientAutoTestSchedule: routerMocks.getClientAutoTestSchedule,
  setClientAutoTestSchedule: routerMocks.setClientAutoTestSchedule,
}));

import { createControlMonitoringRouter } from "../../routers/controlMonitoring";

/** Minimal fake tRPC builder that captures input schemas and handlers. */
function buildFakeTRPC() {
  const schemas: any[] = [];
  const protectedProcedure: any = {
    input: (schema: unknown) => {
      schemas.push(schema);
      return protectedProcedure;
    },
    query: (handler: any) => ({ type: "query", handler }),
    mutation: (handler: any) => ({ type: "mutation", handler }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createControlMonitoringRouter(t, protectedProcedure);
  return { router, schemas };
}

const SCHEDULE = { enabled: false, intervalHours: 12, lastRunAt: null };

beforeEach(() => {
  routerMocks.getClientAutoTestSchedule.mockReset();
  routerMocks.setClientAutoTestSchedule.mockReset();
});

describe("controlMonitoring router — getScheduleConfig", () => {
  it("returns the client auto-test schedule from the engine", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.getClientAutoTestSchedule.mockResolvedValue(SCHEDULE);

    const result = await router.getScheduleConfig.handler({
      input: { clientId: 7 },
    });

    expect(routerMocks.getClientAutoTestSchedule).toHaveBeenCalledWith(7);
    expect(result).toEqual(SCHEDULE);
  });

  it("wraps engine failures in a TRPCError", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.getClientAutoTestSchedule.mockRejectedValue(new Error("db down"));

    await expect(
      router.getScheduleConfig.handler({ input: { clientId: 7 } }),
    ).rejects.toThrow(TRPCError);
  });
});

describe("controlMonitoring router — updateScheduleConfig", () => {
  it("passes the partial config through to the engine upsert", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.setClientAutoTestSchedule.mockResolvedValue(SCHEDULE);

    const result = await router.updateScheduleConfig.handler({
      input: { clientId: 7, enabled: false, intervalHours: 12 },
    });

    expect(routerMocks.setClientAutoTestSchedule).toHaveBeenCalledWith(7, {
      enabled: false,
      intervalHours: 12,
    });
    expect(result).toEqual(SCHEDULE);
  });

  it("wraps engine failures in a TRPCError", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.setClientAutoTestSchedule.mockRejectedValue(new Error("boom"));

    await expect(
      router.updateScheduleConfig.handler({
        input: { clientId: 7, enabled: true },
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("validates intervalHours as an integer within 1..168", () => {
    const { schemas } = buildFakeTRPC();
    // schema order: runControlAutoTest, runAllForClient, history,
    // getScheduleConfig, updateScheduleConfig
    const updateSchema = schemas[4];

    // rejects out-of-range / non-integer values
    expect(() => updateSchema.parse({ clientId: 1, intervalHours: 0 })).toThrow();
    expect(() => updateSchema.parse({ clientId: 1, intervalHours: 169 })).toThrow();
    expect(() => updateSchema.parse({ clientId: 1, intervalHours: 1.5 })).toThrow();
    expect(() => updateSchema.parse({ clientId: 1, intervalHours: "6" })).toThrow();

    // accepts the boundary values
    expect(updateSchema.parse({ clientId: 1, intervalHours: 1 })).toMatchObject({
      clientId: 1,
      intervalHours: 1,
    });
    expect(updateSchema.parse({ clientId: 1, intervalHours: 168 })).toMatchObject({
      clientId: 1,
      intervalHours: 168,
    });

    // optional fields may be omitted entirely
    expect(updateSchema.parse({ clientId: 1 })).toMatchObject({ clientId: 1 });
    expect(updateSchema.parse({ clientId: 1, enabled: false })).toMatchObject({
      clientId: 1,
      enabled: false,
    });
  });

  it("requires clientId", () => {
    const { schemas } = buildFakeTRPC();
    const updateSchema = schemas[4];
    expect(() => updateSchema.parse({})).toThrow();
  });
});
