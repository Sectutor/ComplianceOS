import { describe, it, expect } from "vitest";

/**
 * NIS2 third-party risk scoring engine (lib/nis2/thirdPartyRisk.ts) — engine
 * tests (QA cycle 18, NIS2 Phase 3 Task 3.2).
 *
 * Mirrors supplyChain.test.ts / incidentClassifier.test.ts: the engine is pure
 * and deterministic, never throws, and accepts an injectable `now` clock where
 * time matters. Every function is exercised at its band boundaries, on
 * malformed input, on clock injection, and for input determinism (same input
 * twice => deep-equal).
 *
 * Contract under test:
 *   aggregateSupplierRisk(input)    -> { items[], totals }
 *   trackSupplierCertificate(input) -> { items[], summary }
 *   buildSupplyChainMap(input)      -> { nodes[], edges[], summary }
 *
 * Composite model (aggregateSupplierRisk):
 *   criticalityNumeric = map of the classified criticality band
 *     (critical=90 | high=70 | medium=50 | low=30 | unknown=0). The band is
 *     classified internally from the NIS2 factor inputs (essential services /
 *     sensitive data / network access / subcontractor / spend), so the
 *     unknown=0 arm is defensive only — classifySupplierCriticality always
 *     returns a valid band.
 *   postureScore = weighted security-posture score derived from `answers`
 *     (scoreSupplierSecurityPosture; no answers => 0 / "No Data").
 *   residualScore = explicit vendorResidualScore (clamped 0-100) when given,
 *     else derived from vendor-risk signals when present, else absent.
 *   composite = round(0.4*criticality + 0.4*posture + 0.2*residual) when a
 *     residual exists, otherwise the residual weight is redistributed 50/50:
 *     round(0.5*criticality + 0.5*posture). Clamped to 0-100.
 *   riskTier: critical >= 75 | high >= 55 | medium >= 30 | low < 30.
 *   totals.avgCompositeScore = mean of the items' composite scores rounded to
 *   one decimal (0 when empty). Items are sorted composite desc, name asc.
 *
 * Band edges are evaluated on the UNROUNDED weighted sum (conductor fix, cycle 18): a raw composite of 74.99 tiers high (not critical), 54.99 tiers medium, 29.99 tiers low. Only the exposed compositeScore is rounded to an integer. The boundary tests below assert this behavior.
 *
 * Certificate model (trackSupplierCertificate):
 *   status vs injected now: valid (validTo - now > 90d), expiring
 *   (0 <= validTo - now <= 90d), expired (validTo < now). Suppliers without
 *   certificates yield one row with status "missing". A certificate with an
 *   invalid/missing validTo is neutral-safe "valid" with daysUntilExpiry null
 *   (documented in the engine). summary.total = items.length (certificate
 *   rows + missing rows); coverageRate = suppliers with >= 1 valid-or-expiring
 *   cert / total suppliers, 0-1, rounded to 3 decimals by the engine. Rows
 *   keep input order.
 *
 * Supply-chain map model (buildSupplyChainMap):
 *   input suppliers are evaluated with the same composite model; nodes are
 *   sorted by compositeScore desc then name asc and carry
 *   { id, name, riskTier, compositeScore, criticality, postureReadiness }.
 *   Edges come from the top-level `dependencies` array ({ from, to, weight? })
 *   and are output as { from, to, weight } sorted by from asc, then to asc
 *   (String order). Default edge weight = source node's riskTier map
 *   (critical 1.0 | high 0.8 | medium 0.5 | low 0.3); explicit weights win.
 *   summary = { tierCounts, avgCompositeScore (1 decimal), edgeCount }.
 */

import {
  aggregateSupplierRisk,
  trackSupplierCertificate,
  buildSupplyChainMap,
} from "../nis2/thirdPartyRisk";

const NOW = new Date("2026-08-19T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

/** Posture answers with every control met -> posture score 100. */
const POSTURE_100 = {
  securityRequirementsInAgreement: true,
  incidentNotificationCommitment: true,
  vulnerabilityHandlingProcess: true,
  auditRights: true,
  subcontractingConstraints: true,
  terminationExitProvisions: true,
  dataProtectionMeasures: true,
  businessContinuityProvisions: true,
};

/** Posture answers summing to 70: 20+15+15+12+8. */
const POSTURE_70 = {
  securityRequirementsInAgreement: true,
  incidentNotificationCommitment: true,
  vulnerabilityHandlingProcess: true,
  auditRights: true,
  businessContinuityProvisions: true,
};

/** Posture answers summing to 60: 20+15+15+10. */
const POSTURE_60 = {
  securityRequirementsInAgreement: true,
  incidentNotificationCommitment: true,
  vulnerabilityHandlingProcess: true,
  subcontractingConstraints: true,
};

/** Criticality factors -> criticality score 100 -> band critical. */
const CRITICAL_FACTORS = {
  servicesEssentialToCriticalFunctions: true,
  processesSensitiveData: true,
  networkAccessLevel: "broad",
} as const;

/** Empty-result contract for aggregateSupplierRisk. */
const ZEROED_TOTALS = {
  count: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  avgCompositeScore: 0,
};

/** Empty-result contract for trackSupplierCertificate. */
const ZEROED_CERT_SUMMARY = {
  total: 0,
  valid: 0,
  expiring: 0,
  expired: 0,
  coverageRate: 0,
};

/** Empty-result contract for buildSupplyChainMap. */
const ZEROED_MAP_SUMMARY = {
  tierCounts: { critical: 0, high: 0, medium: 0, low: 0 },
  avgCompositeScore: 0,
  edgeCount: 0,
};

/* ------------------------------------------------------------------ */
/* aggregateSupplierRisk — weight math                                 */
/* ------------------------------------------------------------------ */

describe("aggregateSupplierRisk — 40/40/20 weight math", () => {
  it("critical(90) + posture 100 + residual 100 -> 96, risk tier critical", () => {
    const result = aggregateSupplierRisk({
      suppliers: [
        {
          supplierId: 1,
          supplierName: "CloudCo",
          ...CRITICAL_FACTORS,
          answers: POSTURE_100,
          vendorResidualScore: 100,
        },
      ],
    });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.compositeScore).toBe(96); // round(0.4*90 + 0.4*100 + 0.2*100)
    expect(item.riskTier).toBe("critical");
    // echo / derived fields
    expect(item.supplierId).toBe(1);
    expect(item.supplierName).toBe("CloudCo");
    expect(item.criticality).toBe("critical");
    expect(item.postureReadiness).toBe("Strong");
    expect(item.vendorTier).toBe("Tier 3 (Medium)");
    expect(typeof item.verdict).toBe("string");
    expect(item.verdict.length).toBeGreaterThan(0);
    expect(Array.isArray(item.recommendedActions)).toBe(true);
    expect(item.recommendedActions.length).toBeGreaterThan(0);
    for (const action of item.recommendedActions) {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(0);
    }
  });

  it("each classified criticality band contributes its documented numeric value (posture 0, residual 0)", () => {
    // composite = round(0.4 * bandNumeric + 0.4*0 + 0.2*0)
    const cases = [
      { band: "critical", factors: CRITICAL_FACTORS, expected: 36 }, // 0.4*90
      { band: "high", factors: { processesSensitiveData: true, networkAccessLevel: "broad", annualSpendEur: 2_000_000 }, expected: 28 }, // 0.4*70
      { band: "medium", factors: { processesSensitiveData: true, networkAccessLevel: "restricted" }, expected: 20 }, // 0.4*50
      { band: "low", factors: {}, expected: 12 }, // 0.4*30
    ] as const;

    for (const c of cases) {
      const result = aggregateSupplierRisk({
        suppliers: [{ supplierId: c.band, ...c.factors, vendorResidualScore: 0 }],
      });
      expect(result.items[0].compositeScore, `band "${c.band}"`).toBe(c.expected);
    }
  });

  it("a supplier with no criticality factors is classified low (numeric 30) — never throws, band never unknown", () => {
    const result = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, answers: POSTURE_100, vendorResidualScore: 100 }],
    });
    expect(result.items[0].criticality).toBe("low");
    expect(result.items[0].compositeScore).toBe(72); // round(0.4*30 + 0.4*100 + 0.2*100)
  });

  it("supplierId supports string ids and supplierName falls back safely", () => {
    const result = aggregateSupplierRisk({
      suppliers: [{ supplierId: "acme-1", answers: { securityRequirementsInAgreement: true } }],
    });
    expect(result.items[0].supplierId).toBe("acme-1");
    expect(typeof result.items[0].supplierName).toBe("string");
  });

  it("out-of-range vendorResidualScore clamps to 0-100 and never throws", () => {
    const result = aggregateSupplierRisk({
      suppliers: [
        { supplierId: 1, ...CRITICAL_FACTORS, answers: POSTURE_100, vendorResidualScore: 150 },
        { supplierId: 2, ...CRITICAL_FACTORS, answers: POSTURE_100, vendorResidualScore: -20 },
        { supplierId: 3, ...CRITICAL_FACTORS, answers: POSTURE_100, vendorResidualScore: Number.NaN },
      ],
    });
    expect(result.items).toHaveLength(3);
    for (const item of result.items) {
      expect(item.compositeScore).toBeGreaterThanOrEqual(0);
      expect(item.compositeScore).toBeLessThanOrEqual(100);
    }
  });
});

describe("aggregateSupplierRisk — 50/50 redistribution when residual is missing", () => {
  it("critical(90) + posture 100 without residual -> 95 (50/50, not residual=0)", () => {
    const result = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, ...CRITICAL_FACTORS, answers: POSTURE_100 }],
    });
    expect(result.items[0].compositeScore).toBe(95); // round(0.5*90 + 0.5*100)
    expect(result.items[0].riskTier).toBe("critical");
    // residual absent -> vendorTier stays absent (optional field)
    expect(result.items[0].vendorTier).toBeUndefined();
  });

  it("redistribution is materially different from treating the residual as 0", () => {
    const noResidual = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, ...CRITICAL_FACTORS, answers: { terminationExitProvisions: true } }],
    });
    // posture 10; round(0.5*90 + 0.5*10) = 50 -> medium
    expect(noResidual.items[0].compositeScore).toBe(50);
    expect(noResidual.items[0].riskTier).toBe("medium");

    const withResidual = aggregateSupplierRisk({
      suppliers: [
        { supplierId: 1, ...CRITICAL_FACTORS, answers: { terminationExitProvisions: true }, vendorResidualScore: 100 },
      ],
    });
    // round(0.4*90 + 0.4*10 + 0.2*100) = 60 -> high
    expect(withResidual.items[0].compositeScore).toBe(60);
    expect(withResidual.items[0].riskTier).toBe("high");
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      suppliers: [
        { supplierId: 1, supplierName: "CloudCo", processesSensitiveData: true, answers: POSTURE_60 },
        { supplierId: 2, supplierName: "DataWorks", answers: { auditRights: true }, vendorResidualScore: 40 },
      ],
    };
    expect(aggregateSupplierRisk(input)).toEqual(aggregateSupplierRisk(input));
  });
});

/* ------------------------------------------------------------------ */
/* aggregateSupplierRisk — tier band boundaries                        */
/* ------------------------------------------------------------------ */

describe("aggregateSupplierRisk — risk tier band boundaries", () => {
  it("75 -> critical; a raw composite of 74.99 must tier high (band edge is exact)", () => {
    // round(0.4*90 + 0.4*70 + 0.2*55) = round(75) = 75 -> critical
    const at = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, ...CRITICAL_FACTORS, answers: POSTURE_70, vendorResidualScore: 55 }],
    });
    expect(at.items[0].compositeScore).toBe(75);
    expect(at.items[0].riskTier).toBe("critical");

    // raw composite = 0.4*90 + 0.4*70 + 0.2*54.95 = 74.99 -> high (>= 55),
    // NOT critical: the tier is computed from the unrounded weighted sum.
    const below = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, ...CRITICAL_FACTORS, answers: POSTURE_70, vendorResidualScore: 54.95 }],
    });
    expect(below.items[0].riskTier).toBe("high");
  });

  it("55 -> high; a raw composite of 54.99 must tier medium (spec)", () => {
    // medium band (sensitive data -> 50), posture 60, no residual: round(0.5*50 + 0.5*60) = 55 -> high
    const at = aggregateSupplierRisk({
      suppliers: [{ supplierId: 1, processesSensitiveData: true, answers: POSTURE_60 }],
    });
    expect(at.items[0].compositeScore).toBe(55);
    expect(at.items[0].riskTier).toBe("high");

    // raw composite = 0.4*50 + 0.4*60 + 0.2*54.95 = 54.99 -> medium (>= 30):
    // tier from the unrounded weighted sum keeps the edge exact.
    const below = aggregateSupplierRisk({
      suppliers: [
        { supplierId: 1, processesSensitiveData: true, answers: POSTURE_60, vendorResidualScore: 54.95 },
      ],
    });
    expect(below.items[0].riskTier).toBe("medium");
  });

  it("30 -> medium; a raw composite of 29.99 must tier low (spec)", () => {
    // low band (30), posture 30, no residual: round(0.5*30 + 0.5*30) = 30 -> medium
    const at = aggregateSupplierRisk({
      suppliers: [
        {
          supplierId: 1,
          answers: { incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true },
        },
      ],
    });
    expect(at.items[0].compositeScore).toBe(30);
    expect(at.items[0].riskTier).toBe("medium");

    // raw composite = 0.4*30 + 0.4*30 + 0.2*29.95 = 29.99 -> low (< 30):
    // tier from the unrounded weighted sum keeps the edge exact.
    const below = aggregateSupplierRisk({
      suppliers: [
        {
          supplierId: 1,
          answers: { incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true },
          vendorResidualScore: 29.95,
        },
      ],
    });
    expect(below.items[0].riskTier).toBe("low");
  });
});

/* ------------------------------------------------------------------ */
/* aggregateSupplierRisk — totals & rounding                           */
/* ------------------------------------------------------------------ */

describe("aggregateSupplierRisk — totals & rounding", () => {
  it("counts risk tiers and averages composite scores (avg rounded to 1 decimal)", () => {
    const result = aggregateSupplierRisk({
      suppliers: [
        { supplierId: 1, ...CRITICAL_FACTORS, answers: POSTURE_100, vendorResidualScore: 100 }, // 96 critical
        { supplierId: 2, processesSensitiveData: true, networkAccessLevel: "broad", annualSpendEur: 2_000_000, answers: POSTURE_60 }, // 65 high
        { supplierId: 3, processesSensitiveData: true, answers: { securityRequirementsInAgreement: true, auditRights: true, businessContinuityProvisions: true } }, // 45 medium
        { supplierId: 4, answers: { terminationExitProvisions: true } }, // 20 low
      ],
    });

    expect(result.items.map((i) => i.compositeScore)).toEqual([96, 65, 45, 20]);
    expect(result.totals).toEqual({
      count: 4,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 1,
      lowCount: 1,
      avgCompositeScore: 56.5, // (96 + 65 + 45 + 20) / 4
    });
  });

  it("empty input -> zeroed totals, no items, no throw", () => {
    expect(aggregateSupplierRisk({ suppliers: [] }).totals).toEqual(ZEROED_TOTALS);
    expect(aggregateSupplierRisk({ suppliers: [] }).items).toEqual([]);
  });

  it("malformed input -> zeroed totals, never throws", () => {
    for (const bad of [undefined, null, 42, "nope", { suppliers: "nope" }, { suppliers: 42 }]) {
      const result = aggregateSupplierRisk(bad as never);
      expect(result.totals).toEqual(ZEROED_TOTALS);
      expect(result.items).toEqual([]);
    }
    // null entries inside a valid array are tolerated (never throw)
    const withNull = aggregateSupplierRisk({ suppliers: [null] as never });
    expect(Array.isArray(withNull.items)).toBe(true);
    expect(withNull.totals.count).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      suppliers: [
        { supplierId: "a", supplierName: "Acme", ...CRITICAL_FACTORS, answers: POSTURE_60, vendorResidualScore: 40 },
        { supplierId: "b", supplierName: "Beta", answers: { auditRights: true } },
      ],
    };
    expect(aggregateSupplierRisk(input)).toEqual(aggregateSupplierRisk(input));
  });
});

/* ------------------------------------------------------------------ */
/* trackSupplierCertificate — clock injection & statuses               */
/* ------------------------------------------------------------------ */

describe("trackSupplierCertificate — status vs injected clock", () => {
  it("valid certificate beyond 90 days -> valid with positive daysUntilExpiry", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        {
          supplierId: 1,
          supplierName: "CloudCo",
          certificates: [
            { name: "ISO 27001", issuer: "TÜV", validFrom: NOW, validTo: new Date(NOW.getTime() + 200 * DAY_MS) },
          ],
        },
      ],
    });

    const item = result.items[0];
    expect(item.status).toBe("valid");
    expect(item.daysUntilExpiry).toBe(200);
    expect(item.supplierId).toBe(1);
    expect(item.supplierName).toBe("CloudCo");
    expect(item.name).toBe("ISO 27001");
    expect(item.issuer).toBe("TÜV");
    expect(item.validTo).toBeInstanceOf(Date);
  });

  it("90 days out -> expiring (inclusive boundary), 91 days out -> valid", () => {
    const at90 = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        { supplierId: 1, certificates: [{ name: "SOC 2", validTo: new Date(NOW.getTime() + 90 * DAY_MS) }] },
      ],
    });
    expect(at90.items[0].status).toBe("expiring");
    expect(at90.items[0].daysUntilExpiry).toBe(90);

    const at91 = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        { supplierId: 2, certificates: [{ name: "SOC 2", validTo: new Date(NOW.getTime() + 91 * DAY_MS) }] },
      ],
    });
    expect(at91.items[0].status).toBe("valid");
    expect(at91.items[0].daysUntilExpiry).toBe(91);
  });

  it("past validTo -> expired with negative daysUntilExpiry", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        { supplierId: 1, certificates: [{ name: "ISO 9001", validTo: new Date(NOW.getTime() - 5 * DAY_MS) }] },
      ],
    });
    expect(result.items[0].status).toBe("expired");
    expect(result.items[0].daysUntilExpiry).toBe(-5);
  });

  it("is deterministic with a pinned clock — same input twice deep-equals", () => {
    const input = {
      now: NOW,
      suppliers: [
        {
          supplierId: 1,
          supplierName: "CloudCo",
          certificates: [
            { name: "A", issuer: "X", validFrom: NOW, validTo: new Date(NOW.getTime() + 200 * DAY_MS) },
            { name: "B", validTo: new Date(NOW.getTime() + 30 * DAY_MS) },
          ],
        },
      ],
    };
    expect(trackSupplierCertificate(input)).toEqual(trackSupplierCertificate(input));
  });
});

/* ------------------------------------------------------------------ */
/* trackSupplierCertificate — missing certs & coverage rate            */
/* ------------------------------------------------------------------ */

describe("trackSupplierCertificate — missing certificates & coverageRate", () => {
  it("supplier without certificates -> one row with status missing; summary.total counts rows", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        { supplierId: 1, supplierName: "NoCerts Inc", certificates: [] },
        { supplierId: 2, supplierName: "NoKey At All" },
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((i) => i.status === "missing")).toBe(true);
    expect(result.items.map((i) => i.supplierId)).toEqual([1, 2]);
    expect(result.items[0].name).toBeNull();
    expect(result.items[0].daysUntilExpiry).toBeNull();
    // total counts every row (certificates + missing rows); coverageRate 0
    expect(result.summary).toEqual({ ...ZEROED_CERT_SUMMARY, total: 2 });
  });

  it("coverageRate counts suppliers with >= 1 valid/expiring cert; expired-only and no-cert suppliers are uncovered", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        {
          supplierId: 1,
          supplierName: "Covered",
          certificates: [{ name: "ISO 27001", validTo: new Date(NOW.getTime() + 200 * DAY_MS) }],
        },
        {
          supplierId: 2,
          supplierName: "ExpiredOnly",
          certificates: [{ name: "Old SOC 2", validTo: new Date(NOW.getTime() - 10 * DAY_MS) }],
        },
        { supplierId: 3, supplierName: "NoCerts" },
      ],
    });

    // rows: valid, expired, missing (input order)
    expect(result.items.map((i) => i.status)).toEqual(["valid", "expired", "missing"]);
    // engine rounds coverageRate to 3 decimals: 1/3 -> 0.333
    expect(result.summary).toEqual({
      total: 3,
      valid: 1,
      expiring: 0,
      expired: 1,
      coverageRate: 0.333,
    });
    expect(result.summary.coverageRate).toBeCloseTo(1 / 3, 3);
  });

  it("a supplier with one valid and one expired certificate is covered exactly once", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        {
          supplierId: 1,
          certificates: [
            { name: "New", validTo: new Date(NOW.getTime() + 100 * DAY_MS) },
            { name: "Old", validTo: new Date(NOW.getTime() - 100 * DAY_MS) },
          ],
        },
        { supplierId: 2 },
      ],
    });

    expect(result.items.map((i) => i.status)).toEqual(["valid", "expired", "missing"]);
    expect(result.summary).toEqual({
      total: 3,
      valid: 1,
      expiring: 0,
      expired: 1,
      coverageRate: 0.5,
    });
  });

  it("invalid certificate dates never throw and keep summary counts consistent", () => {
    const result = trackSupplierCertificate({
      now: NOW,
      suppliers: [
        {
          supplierId: 1,
          certificates: [{ name: "Bad date", validTo: "2026-01-01" as never }],
        },
      ],
    });
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.summary.total).toBe(
      result.summary.valid + result.summary.expiring + result.summary.expired
    );
    expect(result.summary.coverageRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.coverageRate).toBeLessThanOrEqual(1);
  });

  it("malformed input -> empty items and zeroed summary, never throws", () => {
    for (const bad of [undefined, null, 42, { suppliers: "nope" }]) {
      const result = trackSupplierCertificate(bad as never);
      expect(result.summary).toEqual(ZEROED_CERT_SUMMARY);
      expect(result.items).toEqual([]);
    }
    // a null supplier row is tolerated and yields a neutral missing row
    const withNull = trackSupplierCertificate({ suppliers: [null] as never, now: NOW });
    expect(Array.isArray(withNull.items)).toBe(true);
    expect(withNull.summary.total).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* buildSupplyChainMap — deterministic ordering                        */
/* ------------------------------------------------------------------ */

describe("buildSupplyChainMap — deterministic ordering", () => {
  it("sorts nodes by compositeScore desc, then name asc (scores evaluated from factors/answers)", () => {
    const result = buildSupplyChainMap({
      suppliers: [
        // Acme: 95 = round(0.5*90 + 0.5*100) critical band, posture 100, no residual
        { supplierId: 1, supplierName: "Zeta", ...CRITICAL_FACTORS, answers: POSTURE_100 },
        { supplierId: 2, supplierName: "Acme", ...CRITICAL_FACTORS, answers: POSTURE_100 },
        // Mid: 50 = round(0.5*50 + 0.5*50) medium band, posture 50
        {
          supplierId: 3,
          supplierName: "Mid",
          processesSensitiveData: true,
          answers: { securityRequirementsInAgreement: true, incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true },
        },
        // LowCo: 30 = round(0.5*30 + 0.5*30) low band, posture 30
        {
          supplierId: 4,
          supplierName: "LowCo",
          answers: { incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true },
        },
      ],
    });

    expect(result.nodes.map((n) => n.name)).toEqual(["Acme", "Zeta", "Mid", "LowCo"]);
    expect(result.nodes.map((n) => n.compositeScore)).toEqual([95, 95, 50, 30]);
  });

  it("nodes carry the documented shape { id, name, riskTier, compositeScore, criticality, postureReadiness }", () => {
    const result = buildSupplyChainMap({
      suppliers: [{ supplierId: 1, supplierName: "Acme", ...CRITICAL_FACTORS, answers: POSTURE_100 }],
    });
    expect(result.nodes[0]).toMatchObject({
      id: 1,
      name: "Acme",
      riskTier: "critical",
      compositeScore: 95,
      criticality: "critical",
      postureReadiness: "Strong",
    });
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      suppliers: [
        { supplierId: 1, supplierName: "Zeta", ...CRITICAL_FACTORS, answers: POSTURE_100 },
        { supplierId: 2, supplierName: "Acme", processesSensitiveData: true, answers: POSTURE_60 },
      ],
    };
    expect(buildSupplyChainMap(input)).toEqual(buildSupplyChainMap(input));
  });
});

describe("buildSupplyChainMap — tierCounts, avgCompositeScore, default edge weights", () => {
  it("counts tiers, averages scores, and applies per-tier default edge weights from top-level dependencies", () => {
    const result = buildSupplyChainMap({
      suppliers: [
        { supplierId: 1, supplierName: "Acme", ...CRITICAL_FACTORS, answers: POSTURE_100 }, // 95 critical
        {
          supplierId: 2,
          supplierName: "Zeta",
          processesSensitiveData: true,
          networkAccessLevel: "broad",
          annualSpendEur: 2_000_000, // high band
          answers: POSTURE_60, // posture 60 -> 65 high
        },
        {
          supplierId: 3,
          supplierName: "Mid",
          processesSensitiveData: true, // medium band
          answers: { securityRequirementsInAgreement: true, incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true }, // posture 50 -> 50 medium
        },
        {
          supplierId: 4,
          supplierName: "LowCo",
          answers: { terminationExitProvisions: true }, // posture 10 -> 20 low
        },
      ],
      dependencies: [
        { from: 1, to: 2 }, // source critical -> 1.0
        { from: 2, to: 3 }, // source high -> 0.8
        { from: 3, to: 4 }, // source medium -> 0.5
        { from: 4, to: 1 }, // source low -> 0.3
        { from: 3, to: 2, weight: 0.42 }, // explicit weight overrides the default
      ],
    });

    // tier counts from the evaluated risk tiers
    expect(result.summary.tierCounts).toEqual({ critical: 1, high: 1, medium: 1, low: 1 });
    // avg = (95 + 65 + 50 + 20) / 4 = 57.5 (exact at 1 decimal)
    expect(result.summary.avgCompositeScore).toBe(57.5);
    expect(result.summary.edgeCount).toBe(5);
    expect(result.edges).toHaveLength(5);

    const edgeWeight = (from: number, to: number): number | undefined =>
      result.edges.find((e) => e.from === from && e.to === to)?.weight;

    expect(edgeWeight(1, 2)).toBe(1.0); // critical default
    expect(edgeWeight(2, 3)).toBe(0.8); // high default
    expect(edgeWeight(3, 4)).toBe(0.5); // medium default
    expect(edgeWeight(4, 1)).toBe(0.3); // low default
    expect(edgeWeight(3, 2)).toBe(0.42); // explicit weight kept
  });

  it("suppliers without dependencies produce zero edges and edgeCount 0", () => {
    const result = buildSupplyChainMap({
      suppliers: [{ supplierId: 1, supplierName: "Solo", ...CRITICAL_FACTORS, answers: POSTURE_100 }],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toEqual([]);
    expect(result.summary.edgeCount).toBe(0);
    expect(result.summary.tierCounts).toEqual({ critical: 1, high: 0, medium: 0, low: 0 });
  });

  it("malformed input -> empty nodes/edges and zeroed summary, never throws", () => {
    for (const bad of [undefined, null, 42, { suppliers: "nope" }]) {
      const result = buildSupplyChainMap(bad as never);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.summary).toEqual(ZEROED_MAP_SUMMARY);
    }
  });

  it("garbage suppliers never throw and stay within 0-100", () => {
    const result = buildSupplyChainMap({
      suppliers: [
        { supplierId: 1, supplierName: "NaNCo", answers: { madeUpKey: true } as never },
        null as never,
        { supplierId: 3, ...CRITICAL_FACTORS, answers: POSTURE_100, vendorResidualScore: Number.NaN },
      ],
    });
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(result.nodes.every((n) => typeof n.name === "string")).toBe(true);
    expect(result.summary.edgeCount).toBe(0);
    expect(result.summary.avgCompositeScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.avgCompositeScore).toBeLessThanOrEqual(100);
  });
});
