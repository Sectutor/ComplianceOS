import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Framework harmonization engine (lib/framework-harmonization.ts) — unit tests.
 *
 * Both exports are DB-backed; per the established repo pattern
 * (cf. vfsMemoryEngineDb.test.ts) ../../db is replaced by a FIFO chainable
 * drizzle stub and ../../schema by placeholder tables, so the REAL
 * harmonization logic runs against deterministic fixture result sets without
 * any database or environment access. Result queues are ordered to match the
 * exact sequence of queries issued by each function under test.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: dbMocks.getDb }));

vi.mock("../../schema", () => ({
  complianceFrameworks: {
    id: "cf.id",
    name: "cf.name",
    shortCode: "cf.shortCode",
    version: "cf.version",
  },
  clientFrameworks: {
    id: "clf.id",
    clientId: "clf.clientId",
    name: "clf.name",
  },
  clientFrameworkControls: {
    id: "cfc.id",
    frameworkId: "cfc.frameworkId",
    controlCode: "cfc.controlCode",
    title: "cfc.title",
    description: "cfc.description",
    status: "cfc.status",
  },
  controls: {
    id: "ctl.id",
    controlId: "ctl.controlId",
    name: "ctl.name",
    framework: "ctl.framework",
  },
  controlMappings: {
    id: "cm.id",
    sourceControlId: "cm.sourceControlId",
    targetControlId: "cm.targetControlId",
    mappingType: "cm.mappingType",
  },
}));

import {
  computeHarmonization,
  listClientFrameworks,
} from "../framework-harmonization";

/** Minimal chainable drizzle stub with a FIFO of result sets. */
function makeDb(results: any[][] = []) {
  const queue = [...results];
  const take = () => (queue.length ? queue.shift() : []);
  const chain: any = {};
  for (const m of ["select", "from", "innerJoin", "on", "insert", "values", "update", "set", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  const terminator = () => {
    const t: any = {};
    t.orderBy = vi.fn(() => Promise.resolve(take()));
    t.limit = vi.fn(() => Promise.resolve(take()));
    t.returning = vi.fn(() => Promise.resolve(take()));
    t.then = (resolve: any, reject: any) => Promise.resolve(take()).then(resolve, reject);
    return t;
  };
  chain.where = vi.fn(() => terminator());
  chain.orderBy = vi.fn(() => Promise.resolve(take()));
  chain.limit = vi.fn(() => Promise.resolve(take()));
  chain.returning = vi.fn(() => Promise.resolve(take()));
  chain.execute = vi.fn(async () => undefined);
  return chain;
}

const SRC_FW = { id: 1, name: "ISO 27001", shortCode: "iso27001", version: "2022" };
const TGT_FW = { id: 2, name: "SOC 2", shortCode: "soc2", version: null };
const CLIENT_SRC_FW = { id: 10, clientId: 7, name: "ISO 27001" };
const CLIENT_TGT_FW = { id: 20, clientId: 7, name: "SOC 2" };

const cfc = (over: Record<string, any> = {}) => ({
  id: 1,
  frameworkId: 20,
  controlCode: "T-1",
  title: "Target Control",
  description: null,
  status: "planned",
  ...over,
});

const globalControl = (over: Record<string, any> = {}) => ({
  id: 100,
  controlId: "A.5.1",
  name: "Policies for information security",
  framework: "ISO 27001",
  ...over,
});

const mapping = (over: Record<string, any> = {}) => ({
  id: 1,
  sourceControlId: 100,
  targetControlId: 200,
  mappingType: "equivalent",
  ...over,
});

/** Full happy-path queue: frameworks -> client frameworks -> CFCs -> globals -> mappings -> target globals. */
function queueHarmonization(over: {
  sourceCFCs?: any[];
  targetCFCs?: any[];
  sourceGlobals?: any[];
  mappings?: any[];
  targetGlobals?: any[];
}) {
  return makeDb([
    [SRC_FW],
    [TGT_FW],
    [CLIENT_SRC_FW],
    [CLIENT_TGT_FW],
    over.sourceCFCs ?? [],
    over.targetCFCs ?? [],
    over.sourceGlobals ?? [],
    over.mappings ?? [],
    over.targetGlobals ?? [],
  ]);
}

let currentDb: ReturnType<typeof makeDb>;

beforeEach(() => {
  currentDb = makeDb();
  dbMocks.getDb.mockReset();
  dbMocks.getDb.mockImplementation(async () => currentDb);
});

describe("computeHarmonization — framework/client resolution errors", () => {
  it("rejects when the source framework shortCode is unknown", async () => {
    currentDb = makeDb([[], [TGT_FW]]);
    await expect(computeHarmonization(7, "nope27001", "soc2")).rejects.toThrow(
      "Source framework 'nope27001' not found",
    );
  });

  it("rejects when the target framework shortCode is unknown", async () => {
    currentDb = makeDb([[SRC_FW], []]);
    await expect(computeHarmonization(7, "iso27001", "nope2")).rejects.toThrow(
      "Target framework 'nope2' not found",
    );
  });

  it("rejects when the client has no source framework subscription", async () => {
    currentDb = makeDb([[SRC_FW], [TGT_FW], []]);
    await expect(computeHarmonization(7, "iso27001", "soc2")).rejects.toThrow(
      "Client has no source framework matching 'ISO 27001'",
    );
  });

  it("rejects when the client has no target framework subscription", async () => {
    currentDb = makeDb([[SRC_FW], [TGT_FW], [CLIENT_SRC_FW], []]);
    await expect(computeHarmonization(7, "iso27001", "soc2")).rejects.toThrow(
      "Client has no target framework matching 'SOC 2'",
    );
  });
});

describe("computeHarmonization — zero-coverage paths", () => {
  const TARGET_CFCS = [
    cfc({ id: 31, controlCode: "T-1", title: "Control One", description: "d1" }),
    cfc({ id: 32, controlCode: "T-2", title: "Control Two", description: null }),
    cfc({ id: 33, controlCode: "T-3", title: "Control Three", description: "d3" }),
  ];

  it("returns zero coverage when no source controls are implemented", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, status: "planned" })],
      targetCFCs: TARGET_CFCS,
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.sourceFramework).toEqual({ id: 1, name: "ISO 27001", shortCode: "iso27001" });
    expect(result.targetFramework).toEqual({ id: 2, name: "SOC 2", shortCode: "soc2" });
    expect(result.totalTargetControls).toBe(3);
    expect(result.coveredBySource).toBe(0);
    expect(result.coveragePercent).toBe(0);
    expect(result.neededAdditional).toBe(3);
    expect(result.equivalentControls).toEqual([]);
    expect(result.uncoveredControls).toEqual([
      { code: "T-1", title: "Control One", description: "d1" },
      { code: "T-2", title: "Control Two", description: null },
      { code: "T-3", title: "Control Three", description: "d3" },
    ]);
  });

  it("returns zero coverage when implemented codes have no global source controls", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "GHOST-1", status: "implemented" })],
      targetCFCs: TARGET_CFCS,
      sourceGlobals: [], // implemented code does not exist globally
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveredBySource).toBe(0);
    expect(result.coveragePercent).toBe(0);
    expect(result.neededAdditional).toBe(3);
  });

  it("returns zero coverage when implemented source controls have no mappings", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" })],
      targetCFCs: TARGET_CFCS,
      sourceGlobals: [globalControl()],
      mappings: [],
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveredBySource).toBe(0);
    expect(result.equivalentControls).toEqual([]);
    expect(result.uncoveredControls).toHaveLength(3);
  });
});

describe("computeHarmonization — coverage computation", () => {
  /** Source implements A.5.1 (global #100) and A.9.2 (global #101). */
  function queueTwoImplemented(targetCFCs: any[]) {
    currentDb = queueHarmonization({
      sourceCFCs: [
        cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" }),
        cfc({ frameworkId: 10, controlCode: "A.9.2", status: "implemented" }),
        cfc({ frameworkId: 10, controlCode: "A.12.1", status: "planned" }), // ignored
      ],
      targetCFCs,
      sourceGlobals: [
        globalControl({ id: 100, controlId: "A.5.1", name: "Policies" }),
        globalControl({ id: 101, controlId: "A.9.2", name: "Access control" }),
      ],
      mappings: [mapping(), mapping({ id: 2, sourceControlId: 101, targetControlId: 201 })],
      targetGlobals: [
        globalControl({ id: 200, controlId: "T-1", name: "SOC2 CC6.1", framework: "SOC 2" }),
        globalControl({ id: 201, controlId: "T-2", name: "SOC2 CC6.2", framework: "SOC 2" }),
      ],
    });
  }

  it("computes partial coverage with equivalents and the remaining gap (1/3 -> 33%)", async () => {
    // Only map the first source control through; second mapping dangles to a
    // target control that does not exist in this scenario's target set.
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" })],
      targetCFCs: [
        cfc({ id: 31, controlCode: "T-1", title: "Control One" }),
        cfc({ id: 32, controlCode: "T-2", title: "Control Two" }),
        cfc({ id: 33, controlCode: "T-3", title: "Control Three" }),
      ],
      sourceGlobals: [globalControl({ id: 100, controlId: "A.5.1", name: "Policies" })],
      mappings: [mapping({ sourceControlId: 100, targetControlId: 200 })],
      targetGlobals: [
        globalControl({ id: 200, controlId: "T-1", name: "SOC2 CC6.1", framework: "SOC 2" }),
      ],
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveredBySource).toBe(1);
    expect(result.coveragePercent).toBe(33); // round(1/3 * 100)
    expect(result.neededAdditional).toBe(2);
    expect(result.equivalentControls).toEqual([
      {
        sourceCode: "A.5.1",
        sourceName: "Policies",
        targetCode: "T-1",
        targetName: "SOC2 CC6.1",
        mappingType: "equivalent",
      },
    ]);
    expect(result.uncoveredControls.map((u) => u.code)).toEqual(["T-2", "T-3"]);
  });

  it("rounds two-thirds up to 67%", async () => {
    queueTwoImplemented([
      cfc({ id: 31, controlCode: "T-1" }),
      cfc({ id: 32, controlCode: "T-2" }),
      cfc({ id: 33, controlCode: "T-3" }),
    ]);
    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveredBySource).toBe(2);
    expect(result.coveragePercent).toBe(67);
    expect(result.neededAdditional).toBe(1);
  });

  it("reaches full coverage: 100%, zero additional, empty uncovered list", async () => {
    queueTwoImplemented([
      cfc({ id: 31, controlCode: "T-1" }),
      cfc({ id: 32, controlCode: "T-2" }),
    ]);
    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveragePercent).toBe(100);
    expect(result.neededAdditional).toBe(0);
    expect(result.uncoveredControls).toEqual([]);
    expect(result.equivalentControls).toHaveLength(2);
  });

  it("dedupes repeated mappings onto the same target control in coveredBySource only", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [
        cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" }),
        cfc({ frameworkId: 10, controlCode: "A.9.2", status: "implemented" }),
      ],
      targetCFCs: [cfc({ id: 31, controlCode: "T-1" })],
      sourceGlobals: [
        globalControl({ id: 100, controlId: "A.5.1", name: "Policies" }),
        globalControl({ id: 101, controlId: "A.9.2", name: "Access control" }),
      ],
      // both source controls map to the same target control #200
      mappings: [
        mapping({ sourceControlId: 100, targetControlId: 200 }),
        mapping({ id: 2, sourceControlId: 101, targetControlId: 200, mappingType: "partial" }),
      ],
      targetGlobals: [globalControl({ id: 200, controlId: "T-1", name: "SOC2 CC6.1" })],
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.coveredBySource).toBe(1); // Set semantics on target codes
    expect(result.equivalentControls).toHaveLength(2); // one entry per mapping
    expect(result.equivalentControls[1].mappingType).toBe("partial");
    expect(result.coveragePercent).toBe(100);
  });

  it("skips mappings whose target global control cannot be resolved (stale reference)", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" })],
      targetCFCs: [cfc({ id: 31, controlCode: "T-1" })],
      sourceGlobals: [globalControl()],
      mappings: [mapping({ targetControlId: 999 })],
      targetGlobals: [], // dangling target reference
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.equivalentControls).toEqual([]);
    expect(result.coveredBySource).toBe(0);
    expect(result.uncoveredControls.map((u) => u.code)).toEqual(["T-1"]);
  });

  it("ignores mapped targets whose code is not part of the client's target controls", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" })],
      targetCFCs: [cfc({ id: 31, controlCode: "T-1" })],
      sourceGlobals: [globalControl()],
      mappings: [mapping()],
      // resolves globally, but its code 'OTHER-9' is not among target CFC codes
      targetGlobals: [globalControl({ id: 200, controlId: "OTHER-9", name: "Unrelated" })],
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.equivalentControls).toEqual([]);
    expect(result.coveredBySource).toBe(0);
  });

  it("handles a target framework with zero controls (percent guard, no division blowups)", async () => {
    currentDb = queueHarmonization({
      sourceCFCs: [cfc({ frameworkId: 10, controlCode: "A.5.1", status: "implemented" })],
      targetCFCs: [],
      sourceGlobals: [globalControl()],
      mappings: [mapping()],
      targetGlobals: [globalControl({ id: 200, controlId: "T-1" })],
    });

    const result = await computeHarmonization(7, "iso27001", "soc2");
    expect(result.totalTargetControls).toBe(0);
    expect(result.coveredBySource).toBe(0);
    expect(result.coveragePercent).toBe(0);
    expect(result.neededAdditional).toBe(0);
    expect(result.equivalentControls).toEqual([]);
    expect(result.uncoveredControls).toEqual([]);
  });
});

describe("listClientFrameworks", () => {
  it("returns [] when the client has no framework subscriptions", async () => {
    currentDb = makeDb([[]]);
    await expect(listClientFrameworks(7)).resolves.toEqual([]);
  });

  it("maps matching compliance frameworks to the ListedFramework shape", async () => {
    currentDb = makeDb([
      [{ id: 10, clientId: 7, name: "ISO 27001" }, { id: 30, clientId: 7, name: "NIS2" }],
      [
        { id: 1, name: "ISO 27001", shortCode: "iso27001", version: "2022" },
        { id: 3, name: "NIS2", shortCode: "nis2", version: null },
      ],
    ]);

    await expect(listClientFrameworks(7)).resolves.toEqual([
      { id: 1, name: "ISO 27001", shortCode: "iso27001", version: "2022" },
      { id: 3, name: "NIS2", shortCode: "nis2", version: null },
    ]);
  });

  it("is deterministic across repeated identical calls", async () => {
    const rows = [
      [{ id: 10, clientId: 7, name: "ISO 27001" }],
      [{ id: 1, name: "ISO 27001", shortCode: "iso27001", version: "2022" }],
    ];
    currentDb = makeDb(rows.map((r) => [...r]));
    const a = await listClientFrameworks(7);
    currentDb = makeDb(rows.map((r) => [...r]));
    const b = await listClientFrameworks(7);
    expect(a).toEqual(b);
  });
});
