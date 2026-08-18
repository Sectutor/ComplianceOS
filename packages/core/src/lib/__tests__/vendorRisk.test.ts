import { describe, it, expect } from 'vitest';
import {
  computeVendorRiskTier,
  buildVendorRiskOverview,
  type VendorRiskInput,
  type VendorRiskResult,
} from '../vendor/vendorRisk';

/**
 * TPRM vendor-risk tiering (vendorRisk.ts) — pure-lib unit tests.
 *
 * Covers the documented scoring model end to end:
 *   residual = 100 −20(no SOC2) −min(60−scan,60) −min(open,3)*8
 *             +5(contract) +8(DPA) −min(max(subs−2,0),4)*3, clamp [0,100]
 * plus tier mapping, injectable-clock nextReviewDate, the 3-5 recommended
 * actions contract and portfolio overview aggregation.
 */

const NOW = new Date('2026-08-18T12:00:00.000Z');

/** UTC calendar date N months after `date` — the contract is "now + N months". */
function utcDateAfterMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function utcDateOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function tier(input: VendorRiskInput): VendorRiskResult {
  return computeVendorRiskTier(input);
}

/** Build a full VendorRiskResult with sane defaults for overview tests. */
function makeRow(overrides: Partial<VendorRiskResult>): VendorRiskResult {
  return {
    vendorId: 1,
    vendorName: 'Vendor',
    dataAccessType: null,
    inherentRisk: 'medium',
    residualScore: 80,
    tier: 'Tier 3 (Medium)',
    reviewFrequency: 'Annual',
    nextReviewDate: '2027-08-18T12:00:00.000Z',
    recommendedActions: ['Reassess at next review window'],
    riskFactors: {
      latestScanRiskScore: null,
      openHighCriticalAssessments: 0,
      hasContract: false,
      hasDpa: false,
      subprocessorCount: 0,
      hasCleanSoc2: false,
    },
    ...overrides,
  };
}

describe('computeVendorRiskTier — baseline & echo fields', () => {
  it('defaults a bare vendor to residual 80 (only the no-SOC2 −20 applies) and Tier 3', () => {
    const result = tier({ vendor: { id: 1, name: 'Acme' } });

    expect(result.vendorId).toBe(1);
    expect(result.vendorName).toBe('Acme');
    expect(result.dataAccessType).toBeNull();
    expect(result.inherentRisk).toBe('medium');
    expect(result.residualScore).toBe(80);
    expect(result.tier).toBe('Tier 3 (Medium)');
    expect(result.reviewFrequency).toBe('Annual');
    expect(result.riskFactors).toEqual({
      latestScanRiskScore: null,
      openHighCriticalAssessments: 0,
      hasContract: false,
      hasDpa: false,
      subprocessorCount: 0,
      hasCleanSoc2: false,
    });
  });

  it('maps data access type to inherent risk (PII/ePHI/Infrastructure = critical, else medium)', () => {
    for (const access of ['PII', 'ePHI', 'Infrastructure'] as const) {
      expect(
        tier({ vendor: { id: 1, name: 'x', dataAccessType: access } }).inherentRisk,
      ).toBe('critical');
    }
    for (const access of ['None', undefined] as const) {
      const result = tier({ vendor: { id: 1, name: 'x', dataAccessType: access } });
      expect(result.inherentRisk).toBe('medium');
    }
    expect(
      tier({ vendor: { id: 1, name: 'x', dataAccessType: 'None' } }).dataAccessType,
    ).toBe('None');
  });
});

describe('computeVendorRiskTier — scoring adjustments', () => {
  it('charges −20 when there is no clean SOC 2 attestation', () => {
    expect(tier({ vendor: { id: 1, name: 'x' } }).residualScore).toBe(80);
    expect(
      tier({ vendor: { id: 1, name: 'x', hasCleanSoc2: true } }).residualScore,
    ).toBe(100);
  });

  it('subtracts (60 − scan) when the latest scan score is below 60, capped at 60', () => {
    const base = { vendor: { id: 1, name: 'x', hasCleanSoc2: true } };
    expect(tier({ ...base, latestScanRiskScore: 59 }).residualScore).toBe(99);
    expect(tier({ ...base, latestScanRiskScore: 20 }).residualScore).toBe(60);
    expect(tier({ ...base, latestScanRiskScore: 0 }).residualScore).toBe(40); // cap −60
    // Scores >= 60 are safe: no penalty.
    expect(tier({ ...base, latestScanRiskScore: 60 }).residualScore).toBe(100);
    expect(tier({ ...base, latestScanRiskScore: 100 }).residualScore).toBe(100);
    // null/undefined scan scores are treated as "no signal".
    expect(tier({ ...base, latestScanRiskScore: null }).residualScore).toBe(100);
  });

  it('charges 8 per open high/critical assessment, capped at 3 (−24 max)', () => {
    const base = { vendor: { id: 1, name: 'x', hasCleanSoc2: true } };
    expect(tier({ ...base, openHighCriticalAssessments: 1 }).residualScore).toBe(92);
    expect(tier({ ...base, openHighCriticalAssessments: 3 }).residualScore).toBe(76);
    expect(tier({ ...base, openHighCriticalAssessments: 5 }).residualScore).toBe(76); // cap
    expect(tier({ ...base, openHighCriticalAssessments: 0 }).residualScore).toBe(100);
  });

  it('adds +5 for an on-file contract and +8 for a signed DPA', () => {
    const base = {
      vendor: { id: 1, name: 'x', hasCleanSoc2: true },
      openHighCriticalAssessments: 3,
    };
    const withoutDocs = tier(base).residualScore; // 76
    expect(withoutDocs).toBe(76);
    expect(tier({ ...base, hasContract: true }).residualScore).toBe(81);
    expect(tier({ ...base, hasDpa: true }).residualScore).toBe(84);
    expect(tier({ ...base, hasContract: true, hasDpa: true }).residualScore).toBe(89);
  });

  it('charges −3 per subprocessor beyond 2, capped at 4 (−12 max)', () => {
    const base = { vendor: { id: 1, name: 'x', hasCleanSoc2: true } };
    expect(tier({ ...base, subprocessorCount: 2 }).residualScore).toBe(100);
    expect(tier({ ...base, subprocessorCount: 3 }).residualScore).toBe(97);
    expect(tier({ ...base, subprocessorCount: 5 }).residualScore).toBe(91);
    expect(tier({ ...base, subprocessorCount: 6 }).residualScore).toBe(88);
    expect(tier({ ...base, subprocessorCount: 20 }).residualScore).toBe(88); // cap
  });
});

describe('computeVendorRiskTier — clamp & tier boundaries', () => {
  it('clamps the worst-case input to 0 (Tier 1)', () => {
    const result = tier({
      vendor: { id: 1, name: 'x' }, // no SOC 2
      latestScanRiskScore: 0, // −60
      openHighCriticalAssessments: 10, // −24
      hasContract: false,
      hasDpa: false,
      subprocessorCount: 20, // −12
    });

    expect(result.residualScore).toBe(0);
    expect(result.tier).toBe('Tier 1 (Critical)');
  });

  it('clamps the best-case input to 100 (Tier 3)', () => {
    const result = tier({
      vendor: { id: 1, name: 'x', hasCleanSoc2: true },
      latestScanRiskScore: 100,
      openHighCriticalAssessments: 0,
      hasContract: true,
      hasDpa: true,
      subprocessorCount: 0,
    });

    expect(result.residualScore).toBe(100);
    expect(result.tier).toBe('Tier 3 (Medium)');
  });

  it('maps residual scores to tiers at the documented boundaries', () => {
    // <50 → Tier 1, <75 → Tier 2, else Tier 3. Scan score drives the boundary:
    // residual = 100 − (60 − scan) for a clean vendor with no other signals.
    expect(tier({ vendor: { id: 1, name: 'x', hasCleanSoc2: true }, latestScanRiskScore: 9 }).tier)
      .toBe('Tier 1 (Critical)'); // residual 49
    expect(tier({ vendor: { id: 1, name: 'x', hasCleanSoc2: true }, latestScanRiskScore: 10 }).tier)
      .toBe('Tier 2 (High)'); // residual 50
    expect(tier({ vendor: { id: 1, name: 'x', hasCleanSoc2: true }, latestScanRiskScore: 34 }).tier)
      .toBe('Tier 2 (High)'); // residual 74
    expect(tier({ vendor: { id: 1, name: 'x', hasCleanSoc2: true }, latestScanRiskScore: 35 }).tier)
      .toBe('Tier 3 (Medium)'); // residual 75
  });
});

describe('computeVendorRiskTier — nextReviewDate with injected clock', () => {
  it('computes +3 months for Tier 1 (Quarterly)', () => {
    const result = tier({
      vendor: { id: 1, name: 'x', hasCleanSoc2: true },
      latestScanRiskScore: 0, // residual 40 → Tier 1
      now: NOW,
    });

    expect(result.tier).toBe('Tier 1 (Critical)');
    expect(result.reviewFrequency).toBe('Quarterly');
    expect(utcDateOf(result.nextReviewDate)).toBe(utcDateAfterMonths(NOW, 3));
    expect(utcDateOf(result.nextReviewDate)).toBe('2026-11-18');
  });

  it('computes +6 months for Tier 2 (Semi-Annual)', () => {
    const result = tier({
      vendor: { id: 1, name: 'x', hasCleanSoc2: true },
      latestScanRiskScore: 10, // residual 50 → Tier 2
      now: NOW,
    });

    expect(result.tier).toBe('Tier 2 (High)');
    expect(result.reviewFrequency).toBe('Semi-Annual');
    expect(utcDateOf(result.nextReviewDate)).toBe(utcDateAfterMonths(NOW, 6));
    expect(utcDateOf(result.nextReviewDate)).toBe('2027-02-18');
  });

  it('computes +12 months for Tier 3 (Annual)', () => {
    const result = tier({
      vendor: { id: 1, name: 'x' }, // residual 80 → Tier 3
      now: NOW,
    });

    expect(result.tier).toBe('Tier 3 (Medium)');
    expect(result.reviewFrequency).toBe('Annual');
    expect(utcDateOf(result.nextReviewDate)).toBe(utcDateAfterMonths(NOW, 12));
    expect(utcDateOf(result.nextReviewDate)).toBe('2027-08-18');
  });

  it('defaults the clock to now and produces a valid future ISO date', () => {
    const result = tier({ vendor: { id: 1, name: 'x' } });

    expect(result.nextReviewDate).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    expect(new Date(result.nextReviewDate).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('computeVendorRiskTier — recommendedActions contract', () => {
  const GAP_ACTIONS = [
    'Mandate annual SOC 2 Type II submission',
    'Execute DPA with SCCs',
    'Follow up on outstanding assessments',
    'Review threat-intel scan findings (CVE/breach matches)',
  ];

  it('returns exactly the 3 fallbacks for a fully clean vendor', () => {
    const result = tier({
      vendor: { id: 1, name: 'x', hasCleanSoc2: true },
      latestScanRiskScore: 80,
      openHighCriticalAssessments: 0,
      hasDpa: true,
    });

    expect(result.recommendedActions).toEqual([
      'Reassess at next review window',
      'Maintain accurate vendor inventory and contacts',
      'Keep vendor security documentation (SOC 2 / DPA) current',
    ]);
  });

  it('reflects each gap with its verbatim action', () => {
    const allGaps = tier({
      vendor: { id: 1, name: 'x' }, // no SOC2, no DPA
      latestScanRiskScore: 20,
      openHighCriticalAssessments: 2,
    });

    expect(allGaps.recommendedActions).toEqual(GAP_ACTIONS);
  });

  it('always returns between 3 and 5 actions for any input', () => {
    const inputs: VendorRiskInput[] = [
      { vendor: { id: 1, name: 'x' } },
      { vendor: { id: 1, name: 'x', hasCleanSoc2: true }, hasDpa: true },
      {
        vendor: { id: 1, name: 'x', hasCleanSoc2: true },
        latestScanRiskScore: 10,
        openHighCriticalAssessments: 3,
        hasContract: true,
        hasDpa: false,
        subprocessorCount: 8,
      },
      { vendor: { id: 1, name: 'x' }, latestScanRiskScore: 0 },
      { vendor: { id: 1, name: 'x', hasCleanSoc2: true }, hasContract: true },
      { vendor: { id: 1, name: 'x', hasCleanSoc2: true, dataAccessType: 'ePHI' } },
    ];

    for (const input of inputs) {
      const actions = tier(input).recommendedActions;
      expect(actions.length).toBeGreaterThanOrEqual(3);
      expect(actions.length).toBeLessThanOrEqual(5);
      expect(new Set(actions).size).toBe(actions.length); // no duplicates
    }
  });
});

describe('computeVendorRiskTier — determinism', () => {
  it('produces identical output for identical input (including nextReviewDate)', () => {
    const input: VendorRiskInput = {
      vendor: { id: 7, name: 'DataWorks', dataAccessType: 'ePHI' },
      latestScanRiskScore: 30,
      openHighCriticalAssessments: 2,
      hasContract: true,
      hasDpa: false,
      subprocessorCount: 5,
      now: NOW,
    };

    expect(tier(input)).toEqual(tier(input));
    expect(tier({ ...input, vendor: { ...input.vendor } })).toEqual(tier(input));
  });
});

describe('buildVendorRiskOverview — aggregation', () => {
  it('counts tiers and totals across the portfolio', () => {
    const overview = buildVendorRiskOverview(
      [
        makeRow({ vendorId: 1, tier: 'Tier 1 (Critical)' }),
        makeRow({ vendorId: 2, tier: 'Tier 1 (Critical)' }),
        makeRow({ vendorId: 3, tier: 'Tier 2 (High)' }),
        makeRow({ vendorId: 4, tier: 'Tier 3 (Medium)' }),
      ],
      NOW,
    );

    expect(overview.totalVendors).toBe(4);
    expect(overview.tierCounts).toEqual({ tier1: 2, tier2: 1, tier3: 1 });
  });

  it('averages residual scores rounded to one decimal', () => {
    const rows = [80, 55, 92].map((residualScore, i) =>
      makeRow({ vendorId: i + 1, residualScore }),
    );
    const overview = buildVendorRiskOverview(rows, NOW);

    expect(overview.avgResidualScore).toBe(75.7);

    const overview2 = buildVendorRiskOverview(
      [makeRow({ residualScore: 10 }), makeRow({ residualScore: 20 })],
      NOW,
    );
    expect(overview2.avgResidualScore).toBe(15);

    expect(buildVendorRiskOverview([makeRow({ residualScore: 100 })], NOW).avgResidualScore).toBe(100);
  });

  it('includes only vendors with nextReviewDate <= now and sorts ascending', () => {
    const rows = [
      makeRow({ vendorId: 3, nextReviewDate: '2026-12-01T00:00:00.000Z' }),
      makeRow({ vendorId: 1, nextReviewDate: '2026-01-15T00:00:00.000Z' }),
      makeRow({ vendorId: 2, nextReviewDate: '2026-06-01T00:00:00.000Z' }), // exactly `now` → due
    ];
    const overview = buildVendorRiskOverview(rows, new Date('2026-06-01T00:00:00.000Z'));

    expect(overview.vendorsDueForReview.map((r) => r.vendorId)).toEqual([1, 2]);
  });

  it('drives the due-for-review list from computeVendorRiskTier nextReviewDate', () => {
    // Tier 1 vendor anchored to a past review → due now; Tier 3 vendor anchored
    // to the same past date → not due yet (annual cadence).
    const tier1 = computeVendorRiskTier({
      vendor: { id: 1, name: 'Crit', hasCleanSoc2: true },
      latestScanRiskScore: 0,
      now: new Date('2026-01-15T00:00:00.000Z'), // next review 2026-04-15
    });
    const tier3 = computeVendorRiskTier({
      vendor: { id: 2, name: 'Calm' },
      now: new Date('2026-01-15T00:00:00.000Z'), // next review 2027-01-15
    });

    const overview = buildVendorRiskOverview([tier1, tier3], new Date('2026-05-01T00:00:00.000Z'));

    expect(overview.vendorsDueForReview.map((r) => r.vendorId)).toEqual([1]);
  });

  it('stamps updatedAt with the injected now', () => {
    const overview = buildVendorRiskOverview([], NOW);
    expect(overview.updatedAt).toBe(NOW.toISOString());
  });

  it('returns a zeroed overview for an empty portfolio', () => {
    const overview = buildVendorRiskOverview([], NOW);

    expect(overview).toEqual({
      totalVendors: 0,
      tierCounts: { tier1: 0, tier2: 0, tier3: 0 },
      avgResidualScore: 0,
      vendorsDueForReview: [],
      updatedAt: NOW.toISOString(),
    });
  });
});
