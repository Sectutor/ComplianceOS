import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/**
 * TPRM vendor-risk router (server/routers/vendorRisk.ts) — contract tests.
 *
 * Mirrors evidenceCollectorsRouter.test.ts / accessReviewsRouter.test.ts:
 * the router is a factory `createVendorRiskRouter(t, clientProcedure)` that is
 * fully testable with a tiny fake `t.router` + chainable procedure — no tRPC
 * server setup. The DB connection module (`../../db` → src/db.ts) is mocked so
 * `getDb` returns a fake query-builder (select/from/where) that serves canned
 * rows for the five client-scoped queries the router issues, in order:
 * vendors → vendorScans → vendorAssessments → vendorContracts → vendorDpas.
 *
 * Verifies: input schemas, getOverview { summary, vendors } shape + ordering,
 * graceful empty fallback when the DB fails, and getVendorRisk NOT_FOUND
 * mapping for a missing vendor / unreachable DB.
 */
const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: dbMocks.getDb,
}));

import { createVendorRiskRouter } from '../../server/routers/vendorRisk';

/** Minimal fake tRPC builder that captures input schemas and handlers. */
function buildFakeTRPC() {
  const schemas: any[] = [];
  const clientProcedure: any = {
    input: (schema: unknown) => {
      schemas.push(schema);
      return clientProcedure;
    },
    query: (handler: any) => ({ type: 'query', handler }),
    mutation: (handler: any) => ({ type: 'mutation', handler }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createVendorRiskRouter(t, clientProcedure);
  return { router, schemas };
}

/**
 * Serve canned rows in the exact order loadVendorRiskInputs queries them.
 * Pass one array per table: [vendors, scans, assessments, contracts, dpas].
 */
function mockDbRows(...queryResults: unknown[][]) {
  const queue = queryResults.map((rows) => [...rows]);
  const db: any = {
    select: () => ({
      from: () => ({
        where: async () => (queue.length ? queue.shift() : []),
      }),
    }),
  };
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

/** Fake db whose first query throws (simulates a broken read path). */
function mockDbThrowingQuery() {
  const db: any = {
    select: () => ({
      from: () => ({
        where: async () => {
          throw new Error('query failed');
        },
      }),
    }),
  };
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

const CLIENT_ID = 7;

const VENDOR_ROWS = [
  {
    id: 101,
    clientId: CLIENT_ID,
    name: 'Acme Cloud',
    dataAccess: 'Restricted',
    trustScore: 85,
    recursiveSubprocessors: [{ name: 'S1' }, { name: 'S2' }],
  },
  {
    id: 102,
    clientId: CLIENT_ID,
    name: 'DataWorks',
    dataAccess: 'Internal',
    trustScore: 90,
    recursiveSubprocessors: null,
  },
  {
    id: 103,
    clientId: CLIENT_ID,
    name: 'Legacy Hosting',
    dataAccess: 'Public',
    trustScore: 90,
    recursiveSubprocessors: null,
  },
];

const SCAN_ROWS = [
  {
    id: 1,
    clientId: CLIENT_ID,
    vendorId: 102,
    scanDate: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    riskScore: 30,
  },
  {
    id: 2,
    clientId: CLIENT_ID,
    vendorId: 103,
    scanDate: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    riskScore: 0,
  },
];

const ASSESSMENT_ROWS = [
  {
    id: 1,
    clientId: CLIENT_ID,
    vendorId: 103,
    status: 'In Progress',
    inherentRiskLevel: 'High',
    residualRiskLevel: null,
  },
];

const CONTRACT_ROWS = [{ id: 1, clientId: CLIENT_ID, vendorId: 101, status: 'Active' }];

const DPA_ROWS = [{ id: 1, clientId: CLIENT_ID, vendorId: 101, status: 'Signed' }];

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe('vendorRisk router — input schemas', () => {
  it('validates getOverview: numeric clientId required', () => {
    const { schemas } = buildFakeTRPC();
    const overviewSchema = schemas[0]; // definition order: getOverview first

    expect(() => overviewSchema.parse({})).toThrow();
    expect(() => overviewSchema.parse({ clientId: 'x' })).toThrow();
    expect(overviewSchema.parse({ clientId: CLIENT_ID })).toMatchObject({
      clientId: CLIENT_ID,
    });
  });

  it('validates getVendorRisk: numeric clientId and vendorId required', () => {
    const { schemas } = buildFakeTRPC();
    const vendorRiskSchema = schemas[1];

    expect(() => vendorRiskSchema.parse({})).toThrow();
    expect(() => vendorRiskSchema.parse({ clientId: CLIENT_ID })).toThrow();
    expect(() =>
      vendorRiskSchema.parse({ clientId: CLIENT_ID, vendorId: '101' }),
    ).toThrow();
    expect(
      vendorRiskSchema.parse({ clientId: CLIENT_ID, vendorId: 101 }),
    ).toMatchObject({ clientId: CLIENT_ID, vendorId: 101 });
  });
});

describe('vendorRisk router — getOverview', () => {
  it('returns the { summary, vendors } contract with per-vendor risk rows', async () => {
    mockDbRows(VENDOR_ROWS, SCAN_ROWS, ASSESSMENT_ROWS, CONTRACT_ROWS, DPA_ROWS);
    const { router } = buildFakeTRPC();

    const result = await router.getOverview.handler({ input: { clientId: CLIENT_ID } });

    // summary shape
    expect(result.summary).toMatchObject({
      totalVendors: 3,
      tierCounts: { tier1: 1, tier2: 1, tier3: 1 },
      avgResidualScore: 67.3, // (100 + 70 + 32) / 3
      vendorsDueForReview: [],
    });
    expect(typeof result.summary.updatedAt).toBe('string');

    // vendors shape
    expect(result.vendors).toHaveLength(3);
    const byId = Object.fromEntries(result.vendors.map((v: any) => [v.vendorId, v]));

    // Vendor 101: Restricted→PII (critical), trust 85→clean SOC2, active
    // contract + signed DPA, 2 subprocessors → residual 100 → Tier 3.
    expect(byId[101]).toMatchObject({
      vendorName: 'Acme Cloud',
      dataAccessType: 'PII',
      inherentRisk: 'critical',
      residualScore: 100,
      tier: 'Tier 3 (Medium)',
      riskFactors: {
        hasContract: true,
        hasDpa: true,
        subprocessorCount: 2,
        hasCleanSoc2: true,
      },
    });

    // Vendor 102: Internal→medium, clean SOC2, scan 30 → residual 70 → Tier 2.
    expect(byId[102]).toMatchObject({
      residualScore: 70,
      tier: 'Tier 2 (High)',
      inherentRisk: 'medium',
    });

    // Vendor 103: scan 0 (−60) + 1 open high assessment (−8) → residual 32 → Tier 1.
    expect(byId[103]).toMatchObject({
      residualScore: 32,
      tier: 'Tier 1 (Critical)',
      reviewFrequency: 'Quarterly',
    });

    // Every row carries the full result contract.
    for (const vendor of result.vendors) {
      expect(vendor.vendorId).toBeTypeOf('number');
      expect(vendor.nextReviewDate).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
      expect(vendor.recommendedActions.length).toBeGreaterThanOrEqual(3);
      expect(vendor.recommendedActions.length).toBeLessThanOrEqual(5);
    }
  });

  it('orders vendors worst-first: Tier 1 before Tier 2 before Tier 3', async () => {
    mockDbRows(VENDOR_ROWS, SCAN_ROWS, ASSESSMENT_ROWS, CONTRACT_ROWS, DPA_ROWS);
    const { router } = buildFakeTRPC();

    const result = await router.getOverview.handler({ input: { clientId: CLIENT_ID } });

    expect(result.vendors.map((v: any) => v.vendorId)).toEqual([103, 102, 101]);
  });

  it('returns an empty overview instead of throwing when getDb fails', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('db down'));
    const { router } = buildFakeTRPC();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await router.getOverview.handler({ input: { clientId: CLIENT_ID } });

    consoleSpy.mockRestore();
    expect(result).toEqual({
      summary: {
        totalVendors: 0,
        tierCounts: { tier1: 0, tier2: 0, tier3: 0 },
        avgResidualScore: 0,
        vendorsDueForReview: [],
        updatedAt: expect.any(String),
      },
      vendors: [],
    });
  });

  it('returns an empty overview instead of throwing when a query fails', async () => {
    mockDbThrowingQuery();
    const { router } = buildFakeTRPC();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await router.getOverview.handler({ input: { clientId: CLIENT_ID } });

    consoleSpy.mockRestore();
    expect(result.summary.totalVendors).toBe(0);
    expect(result.vendors).toEqual([]);
  });
});

describe('vendorRisk router — getVendorRisk', () => {
  it('returns the computed tier for a vendor that exists for the client', async () => {
    mockDbRows(VENDOR_ROWS, SCAN_ROWS, ASSESSMENT_ROWS, CONTRACT_ROWS, DPA_ROWS);
    const { router } = buildFakeTRPC();

    const result = await router.getVendorRisk.handler({
      input: { clientId: CLIENT_ID, vendorId: 103 },
    });

    expect(result).toMatchObject({
      vendorId: 103,
      vendorName: 'Legacy Hosting',
      residualScore: 32,
      tier: 'Tier 1 (Critical)',
      reviewFrequency: 'Quarterly',
    });
  });

  it('maps a vendor outside this client to NOT_FOUND', async () => {
    mockDbRows(VENDOR_ROWS, SCAN_ROWS, ASSESSMENT_ROWS, CONTRACT_ROWS, DPA_ROWS);
    const { router } = buildFakeTRPC();

    const call = router.getVendorRisk.handler({
      input: { clientId: CLIENT_ID, vendorId: 999 },
    });

    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Vendor not found for this client',
    });
  });

  it('maps an unreachable DB to NOT_FOUND instead of a hard 500', async () => {
    dbMocks.getDb.mockRejectedValue(new Error('db down'));
    const { router } = buildFakeTRPC();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const call = router.getVendorRisk.handler({
      input: { clientId: CLIENT_ID, vendorId: 101 },
    });

    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Vendor risk data unavailable',
    });
    consoleSpy.mockRestore();
  });
});
