import { describe, it, expect } from "vitest";
import {
  article21BandForMeasure,
  computeArticle21Heatmap,
  computeControlHealth,
  computeDomainSummary,
  computeIncidentClock,
  EMPTY_CONTROL_HEALTH,
  EMPTY_DOMAIN_SUMMARY,
  EMPTY_INCIDENT_CLOCK,
} from "../nis2/controlHealth";

/**
 * NIS2 control-health dashboard engine (lib/nis2/controlHealth.ts) — QA
 * contract tests (cycle 38).
 *
 * Pinned engine contract (verified against the shipped implementation):
 *   - pure, deterministic, ZERO runtime deps, NEVER throws;
 *   - injectable clock via `options.clock?: () => Date` on the report
 *     builders and a `now?: Date | null` second argument on the incident
 *     clock (defaults to the real clock);
 *   - computeControlHealth -> ALL TWELVE Article 21(2)(a)-(l) measure cards
 *     in canonical catalog order: { id, article, title, status:
 *     'compliant'|'at-risk'|'non-compliant'|'no-data', score (0-100, 1
 *     decimal), metrics chips, alertCount }; unusable inputs degrade the
 *     affected card to 'no-data' (score 0, metrics [], alertCount 0);
 *   - bands: score >= 80 compliant, >= 50 at-risk, else non-compliant;
 *     article21BandForMeasure maps those to green/amber/red and no-data /
 *     malformed to 'empty';
 *   - computeDomainSummary -> the eight fixed dashboard domains in
 *     canonical order (risk/incident/bcp/supplyChain/asset/training/access/
 *     policy); empty domain rows -> 'no-data'; alertCount > 4 OR any
 *     critical item -> 'critical'; 1..4 alerts OR an at-risk measure score
 *     -> 'watch'; otherwise 'healthy';
 *   - computeIncidentClock -> Art. 23 reporting clock anchored at
 *     detectedAt +24h / +72h / +30d; a milestone whose sent-marker
 *     (earlyWarningSentAt / intermediateReportSentAt / finalReportSentAt)
 *     holds a valid date is satisfied; resolved/closed and insignificant
 *     incidents are excluded; the EARLIEST unmet deadline wins with signed
 *     hoursRemaining rounded to 1 decimal.
 *
 * Fixtures deliberately use loose records so the suite exercises the
 * coercion contract rather than rigid typing.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Fixed anchor used by every clock-sensitive test in this file. */
const NOW = new Date("2026-09-01T12:00:00.000Z");
const NOW_MS = NOW.getTime();
const iso = (msOffsetFromNow: number): string =>
  new Date(NOW_MS + msOffsetFromNow).toISOString();
const clockAtNow = () => new Date(NOW_MS);

type AnyRow = Record<string, any>;

const MEASURE_IDS = [
  "policies",
  "riskManagement",
  "incidentHandling",
  "businessContinuity",
  "supplyChain",
  "vulnerabilityMgmt",
  "effectiveness",
  "cyberHygiene",
  "cryptography",
  "hrSecurity",
  "accessControl",
  "assetManagement",
] as const;

const DOMAIN_KEYS = [
  "risk",
  "incident",
  "bcp",
  "supplyChain",
  "asset",
  "training",
  "access",
  "policy",
] as const;

const measureById = (report: AnyRow, id: string): AnyRow =>
  report.measures.find((m: AnyRow) => m.id === id);

const domainByKey = (summary: AnyRow, key: string): AnyRow =>
  summary.domains.find((d: AnyRow) => d.key === key);

/* ------------------------------------------------------------------ */
/* Canonical catalog & empty shapes                                    */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — canonical catalogs and empty shapes", () => {
  it("always reports all 12 Article 21(2) measures in canonical order with article suffixes", () => {
    const report = computeControlHealth({}, { clock: clockAtNow });
    expect(report.measures.map((m: AnyRow) => m.id)).toEqual([...MEASURE_IDS]);
    expect(report.measures.map((m: AnyRow) => m.article)).toEqual([
      "21(2)(a)",
      "21(2)(b)",
      "21(2)(c)",
      "21(2)(d)",
      "21(2)(e)",
      "21(2)(f)",
      "21(2)(g)",
      "21(2)(h)",
      "21(2)(i)",
      "21(2)(j)",
      "21(2)(k)",
      "21(2)(l)",
    ]);
  });

  it("reports every untouched measure as no-data with score 0, no chips and zero alerts", () => {
    const report = computeControlHealth({}, { clock: clockAtNow });
    const hr = measureById(report, "hrSecurity");
    expect(hr.status).toBe("no-data");
    expect(hr.score).toBe(0);
    expect(hr.metrics).toEqual([]);
    expect(hr.alertCount).toBe(0);
  });

  it("stamps generatedAt from the injected clock verbatim", () => {
    const report = computeControlHealth({}, { clock: clockAtNow });
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it("exposes the documented EMPTY_* degradation shapes", () => {
    expect(EMPTY_CONTROL_HEALTH).toEqual({ measures: [], generatedAt: "" });
    expect(EMPTY_DOMAIN_SUMMARY).toEqual({ domains: [] });
    expect(EMPTY_INCIDENT_CLOCK).toEqual({ openSignificant: 0, nextDeadline: null });
  });
});

/* ------------------------------------------------------------------ */
/* Score / status bands                                                */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — score/status bands", () => {
  it("bands a fully approved policy register as compliant (score 100)", () => {
    const report = computeControlHealth(
      { policies: [{ approvalStatus: "approved" }] },
      { clock: clockAtNow }
    );
    const policies = measureById(report, "policies");
    expect(policies.status).toBe("compliant");
    expect(policies.score).toBe(100);
    expect(policies.alertCount).toBe(0);
  });

  it("lands a 16/20 approved register exactly ON the compliant threshold (80)", () => {
    // approvedShare*100 = 80, no overdue reviews -> exactly COMPLIANT_THRESHOLD.
    const policies = Array.from({ length: 20 }, (_: unknown, i: number) =>
      i < 16 ? { approvalStatus: "approved" } : { status: "draft" }
    );
    const report = computeControlHealth({ policies }, { clock: clockAtNow });
    const policiesCard = measureById(report, "policies");
    expect(policiesCard.score).toBe(80);
    expect(policiesCard.status).toBe("compliant");
  });

  it("drops below-threshold registers to at-risk (3/4 approved -> 75)", () => {
    const report = computeControlHealth(
      {
        policies: [
          { approvalStatus: "approved" },
          { approvalStatus: "approved" },
          { approvalStatus: "approved" },
          { status: "draft" },
        ],
      },
      { clock: clockAtNow }
    );
    const policies = measureById(report, "policies");
    expect(policies.score).toBe(75);
    expect(policies.status).toBe("at-risk");
    expect(policies.alertCount).toBe(1); // the single unapproved policy
  });

  it("bands heavily unapproved registers as non-compliant (overdue penalties applied)", () => {
    const report = computeControlHealth(
      {
        policies: [
          { approvalStatus: "approved" },
          { status: "draft", reviewDueDate: iso(-2 * DAY_MS) },
          { status: "draft", reviewDueDate: iso(-3 * DAY_MS) },
          { status: "draft" },
        ],
      },
      { clock: clockAtNow }
    );
    const policies = measureById(report, "policies");
    // 25% approved (25) - 2 overdue * 5 = 15
    expect(policies.score).toBe(15);
    expect(policies.status).toBe("non-compliant");
    expect(policies.alertCount).toBe(4); // clamp(total): 2 overdue + 3 unapproved -> capped at 4
  });

  describe("article21BandForMeasure — float edges of the banding primitive", () => {
    it("keeps 79.95 on the amber side of the green edge (raw-score path)", () => {
      expect(article21BandForMeasure({ status: "no-data", score: 79.95 })).toBe("amber");
      expect(article21BandForMeasure({ status: "no-data", score: 80 })).toBe("green");
    });

    it("keeps 49.95 on the red side of the amber edge (raw-score path)", () => {
      expect(article21BandForMeasure({ status: "no-data", score: 49.95 })).toBe("red");
      expect(article21BandForMeasure({ status: "no-data", score: 50 })).toBe("amber");
    });

    it("maps declared statuses directly and treats null/undefined as empty", () => {
      expect(article21BandForMeasure({ status: "compliant", score: 99 })).toBe("green");
      expect(article21BandForMeasure({ status: "at-risk", score: 55 })).toBe("amber");
      expect(article21BandForMeasure({ status: "non-compliant", score: 12 })).toBe("red");
      expect(article21BandForMeasure(null)).toBe("empty");
      expect(article21BandForMeasure(undefined)).toBe("empty");
    });

    it("bands a zero-scored no-data card as empty (never red)", () => {
      // Untouched cards carry score 0 + status 'no-data' — the raw-score
      // path must not bleed them into the red band.
      expect(article21BandForMeasure({ status: "no-data", score: 0 })).toBe("empty");
      expect(article21BandForMeasure({ status: "no-data" })).toBe("empty");
    });
  });

  it("rounds fractional scores to exactly 1 decimal (2-of-3 vendor coverage -> 66.7)", () => {
    const report = computeControlHealth(
      {
        vendors: [{ id: 1 }, { id: 2 }, { id: 3 }],
        vendorAssessments: [
          { vendorId: 1, status: "completed" },
          { vendorId: 2, status: "completed" },
        ],
      },
      { clock: clockAtNow }
    );
    const supplyChain = measureById(report, "supplyChain");
    expect(supplyChain.score).toBe(66.7);
    expect(supplyChain.status).toBe("at-risk"); // raw 66.666.. stays under 80
  });
});

/* ------------------------------------------------------------------ */
/* Malformed input never throws                                        */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — malformed input never throws", () => {
  it("survives null / undefined / primitive rows structs with a full no-data report", () => {
    for (const junk of [null, undefined, 42, "rows", true]) {
      const report = computeControlHealth(junk as any, { clock: clockAtNow });
      expect(report.measures).toHaveLength(12);
      for (const m of report.measures) expect(m.status).toBe("no-data");
    }
  });

  it("treats non-array collections as empty instead of throwing", () => {
    const report = computeControlHealth(
      { policies: "nope", risks: { nested: true }, incidents: 7 } as any,
      { clock: clockAtNow }
    );
    expect(measureById(report, "policies").status).toBe("no-data");
    expect(measureById(report, "riskManagement").status).toBe("no-data");
    expect(measureById(report, "incidentHandling").status).toBe("no-data");
  });

  it("drops garbage entries from row arrays but still counts valid ones", () => {
    const summary = computeDomainSummary(
      {
        risks: [null, 42, "garbage", undefined, { status: "identified", residualScore: 20 }] as any,
      },
      { clock: clockAtNow }
    );
    const risk = domainByKey(summary, "risk");
    // the ONE valid risk was counted despite interleaved junk (high-residual alert)
    expect(risk.alertCount).toBe(1);
    expect(risk.status).toBe("critical"); // residualScore 20 >= 17 -> critical item
  });

  it("survives NaN/garbage dates everywhere and keeps usable data flowing", () => {
    expect(() =>
      computeControlHealth(
        {
          policies: [{ approvalStatus: "approved", reviewDueDate: "not-a-date" }],
          incidents: [{ status: "open", isSignificant: true, detectedAt: "junk" }],
        },
        { clock: clockAtNow }
      )
    ).not.toThrow();
    // the undated-but-valid incident still counts toward openSignificant...
    const clock = computeIncidentClock(
      [{ status: "open", isSignificant: true, detectedAt: "junk" }],
      NOW
    );
    expect(clock.openSignificant).toBe(1);
    expect(clock.nextDeadline).toBeNull(); // ...but cannot anchor a deadline
  });

  it("never throws on a poisoned clock (falls back to the real clock)", () => {
    const report = computeControlHealth({}, { clock: () => new Date("garbage") });
    expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
    expect(report.measures).toHaveLength(12);
  });

  it("survives fully malformed incident rows in the clock", () => {
    expect(() => computeIncidentClock([null, 7, "x", [], {}] as any, NOW)).not.toThrow();
    expect(computeIncidentClock([null, 7, "x", [], {}] as any, NOW)).toEqual({
      openSignificant: 0,
      nextDeadline: null,
    });
  });
});

/* ------------------------------------------------------------------ */
/* Determinism                                                         */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — determinism", () => {
  const ROWS = () => ({
    policies: [{ approvalStatus: "approved" }, { status: "draft", reviewDueDate: iso(-DAY_MS) }],
    vendors: [{ id: 1 }, { id: 2, criticality: "High" }],
    vendorAssessments: [{ vendorId: 1, status: "completed" }],
    incidents: [{ id: 5, status: "open", isSignificant: true, detectedAt: iso(-6 * HOUR_MS), title: "Leak" }],
  });

  it("returns deep-equal reports for repeated identical calls", () => {
    expect(computeControlHealth(ROWS(), { clock: clockAtNow })).toEqual(
      computeControlHealth(ROWS(), { clock: clockAtNow })
    );
  });

  it("returns deep-equal domain summaries for repeated identical calls", () => {
    expect(computeDomainSummary(ROWS(), { clock: clockAtNow })).toEqual(
      computeDomainSummary(ROWS(), { clock: clockAtNow })
    );
  });

  it("returns deep-equal incident clocks for repeated identical calls", () => {
    expect(computeIncidentClock(ROWS().incidents, NOW)).toEqual(
      computeIncidentClock(ROWS().incidents, NOW)
    );
  });

  it("breaks deadline ties deterministically on the LOWER incident id", () => {
    const twins = [
      { id: 9, status: "open", isSignificant: true, detectedAt: iso(-2 * HOUR_MS), title: "Twin B" },
      { id: 4, status: "open", isSignificant: true, detectedAt: iso(-2 * HOUR_MS), title: "Twin A" },
    ];
    const clock = computeIncidentClock(twins, NOW);
    expect(clock.nextDeadline.incidentId).toBe(4);
    expect(clock.nextDeadline.incidentTitle).toBe("Twin A");
  });

  it("renders the heatmap as a full canonical-key map defaulting to 'empty'", () => {
    const bands = computeArticle21Heatmap([]);
    expect(Object.keys(bands)).toEqual([...MEASURE_IDS]);
    expect(Object.values(bands).every((b: string) => b === "empty")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Injectable clock                                                    */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — injectable clock", () => {
  /** One open significant incident whose 24h anchor sits `offsetFromNowMs` from NOW. */
  const incidentWith24hAnchorAt = (offsetFromNowMs: number): AnyRow[] => [
    {
      id: 1,
      status: "open",
      isSignificant: true,
      detectedAt: iso(offsetFromNowMs - 24 * HOUR_MS),
      title: "Anchor probe",
    },
  ];

  it("shifts hoursRemaining by exactly the delta between two reference times", () => {
    const tenHoursEarlier = new Date(NOW_MS - 10 * HOUR_MS);
    const base = computeIncidentClock(incidentWith24hAnchorAt(18 * HOUR_MS), NOW);
    const earlier = computeIncidentClock(incidentWith24hAnchorAt(18 * HOUR_MS), tenHoursEarlier);
    expect(base.nextDeadline.hoursRemaining).toBe(18);
    expect(earlier.nextDeadline.hoursRemaining).toBe(28);
  });

  it("reports NEGATIVE hoursRemaining once a deadline is overdue", () => {
    const clock = computeIncidentClock(incidentWith24hAnchorAt(-24 * HOUR_MS), NOW);
    expect(clock.nextDeadline.hoursRemaining).toBe(-24);
  });

  it("reports POSITIVE hoursRemaining for upcoming deadlines", () => {
    const clock = computeIncidentClock(incidentWith24hAnchorAt(30 * HOUR_MS), NOW);
    expect(clock.nextDeadline.hoursRemaining).toBe(30);
  });

  it("rounds hoursRemaining to exactly 1 decimal (2h06m -> 2.1 witness)", () => {
    const clock = computeIncidentClock(
      [
        {
          id: 2,
          status: "open",
          isSignificant: true,
          detectedAt: iso(-(72 * HOUR_MS) + 2 * HOUR_MS + 6 * 60 * 1000),
          earlyWarningSentAt: iso(-HOUR_MS), // 24h milestone satisfied
          title: "Decimal witness",
        },
      ],
      NOW
    );
    expect(clock.nextDeadline.label).toBe("72h Incident Notification");
    expect(clock.nextDeadline.hoursRemaining).toBe(2.1);
  });

  it("accepts a Date, null (real clock fallback) without throwing", () => {
    expect(() => computeIncidentClock(incidentWith24hAnchorAt(HOUR_MS), null)).not.toThrow();
    const clock = computeIncidentClock(incidentWith24hAnchorAt(HOUR_MS), null);
    expect(typeof clock.openSignificant).toBe("number");
  });
});

/* ------------------------------------------------------------------ */
/* Deadline selection                                                  */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — deadline selection", () => {
  it("anchors milestones at detectedAt +24h/+72h/+30d and picks the earliest unmet", () => {
    const clock = computeIncidentClock(
      [{ id: 1, status: "open", isSignificant: true, detectedAt: iso(-6 * HOUR_MS), title: "Fresh breach" }],
      NOW
    );
    expect(clock.openSignificant).toBe(1);
    expect(clock.nextDeadline.label).toBe("24h Early Warning");
    expect(clock.nextDeadline.dueAt).toBe(iso(18 * HOUR_MS));
    expect(clock.nextDeadline.hoursRemaining).toBe(18);
    expect(clock.nextDeadline.incidentId).toBe(1);
    expect(clock.nextDeadline.incidentTitle).toBe("Fresh breach");
  });

  it("advances to the 72h notification once the early warning is sent", () => {
    const clock = computeIncidentClock(
      [
        {
          id: 2,
          status: "open",
          isSignificant: true,
          detectedAt: iso(-HOUR_MS),
          earlyWarningSentAt: iso(-30 * 60 * 1000),
          title: "Notified",
        },
      ],
      NOW
    );
    expect(clock.nextDeadline.label).toBe("72h Incident Notification");
    expect(clock.nextDeadline.hoursRemaining).toBe(71);
  });

  it("advances to the 30-day final report once warning + notification are sent", () => {
    const clock = computeIncidentClock(
      [
        {
          id: 3,
          status: "open",
          isSignificant: true,
          detectedAt: iso(-29 * DAY_MS),
          earlyWarningSentAt: iso(-29 * DAY_MS + HOUR_MS),
          intermediateReportSentAt: iso(-28 * DAY_MS),
          title: "Long runner",
        },
      ],
      NOW
    );
    expect(clock.nextDeadline.label).toBe("30-day Final Report");
    expect(clock.nextDeadline.hoursRemaining).toBe(24);
  });

  it("stops owing deadlines once EVERY milestone is satisfied, but keeps counting the incident", () => {
    // Phase 1: a fully reported incident still counts as open+significant,
    // yet contributes NO candidate deadline.
    const fullyReported = {
      id: 4,
      status: "open",
      isSignificant: true,
      detectedAt: iso(-40 * DAY_MS),
      earlyWarningSentAt: iso(-39 * DAY_MS),
      intermediateReportSentAt: iso(-38 * DAY_MS),
      finalReportSentAt: iso(-10 * DAY_MS),
      title: "Fully reported",
    };
    expect(computeIncidentClock([fullyReported], NOW)).toEqual({
      openSignificant: 1,
      nextDeadline: null,
    });
    // Phase 2: alongside a fresh breach, the fresh one drives the clock.
    const clock = computeIncidentClock(
      [
        fullyReported,
        { id: 5, status: "open", isSignificant: true, detectedAt: iso(-HOUR_MS), title: "Fresh breach" },
      ],
      NOW
    );
    expect(clock.openSignificant).toBe(2);
    expect(clock.nextDeadline.incidentId).toBe(5);
    expect(clock.nextDeadline.label).toBe("24h Early Warning");
  });

  it("skips milestones across incidents and picks the globally earliest unmet deadline", () => {
    const clock = computeIncidentClock(
      [
        { id: 10, status: "open", isSignificant: true, detectedAt: iso(-2 * DAY_MS), title: "Older" },
        { id: 11, status: "open", isSignificant: true, detectedAt: iso(-HOUR_MS), title: "Newer" },
      ],
      NOW
    );
    // Older incident's 24h anchor is already overdue -> wins over Newer's.
    expect(clock.nextDeadline.incidentId).toBe(10);
    expect(clock.nextDeadline.hoursRemaining).toBe(-24);
    expect(clock.openSignificant).toBe(2);
  });

  it("excludes resolved/closed incidents from openSignificant and deadline candidates", () => {
    const clock = computeIncidentClock(
      [
        { id: 20, status: "resolved", isSignificant: true, detectedAt: iso(-HOUR_MS), title: "Done" },
        { id: 21, status: "Closed", isSignificant: true, detectedAt: iso(-2 * HOUR_MS), title: "Also done" },
        { id: 22, status: "mitigated", isSignificant: true, detectedAt: iso(23 * HOUR_MS - 30 * DAY_MS), title: "Still owes report" },
      ],
      NOW
    );
    // mitigated is NOT closed for clock purposes and still owes its final report
    expect(clock.openSignificant).toBe(1);
    expect(clock.nextDeadline.incidentId).toBe(22);
  });

  it("excludes insignificant incidents entirely", () => {
    const clock = computeIncidentClock(
      [
        { id: 30, status: "open", isSignificant: false, detectedAt: iso(-HOUR_MS), title: "Minor" },
        { id: 31, status: "open", detectedAt: iso(-2 * HOUR_MS), title: "Flag missing" },
      ],
      NOW
    );
    expect(clock.openSignificant).toBe(0);
    expect(clock.nextDeadline).toBeNull();
  });

  it("resolves to the empty clock shape when nothing is pending", () => {
    expect(computeIncidentClock([], NOW)).toEqual({ openSignificant: 0, nextDeadline: null });
    expect(computeIncidentClock(undefined, NOW)).toEqual({ openSignificant: 0, nextDeadline: null });
  });
});

/* ------------------------------------------------------------------ */
/* Domain summaries                                                    */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — domain summaries", () => {
  it("always reports all 8 domains in canonical order", () => {
    const summary = computeDomainSummary({}, { clock: clockAtNow });
    expect(summary.domains.map((d: AnyRow) => d.key)).toEqual([...DOMAIN_KEYS]);
  });

  it("reports untouched domains as no-data with zero alerts", () => {
    const summary = computeDomainSummary({}, { clock: clockAtNow });
    const training = domainByKey(summary, "training");
    expect(training.status).toBe("no-data");
    expect(training.alertCount).toBe(0);
  });

  it("bands a clean, low-alert domain as healthy", () => {
    const summary = computeDomainSummary(
      { risks: [{ status: "treated", residualScore: 5 }] },
      { clock: clockAtNow }
    );
    const risk = domainByKey(summary, "risk");
    expect(risk.status).toBe("healthy");
    expect(risk.alertCount).toBe(0);
    expect(typeof risk.primary).toBe("string");
    expect(risk.primary.length).toBeGreaterThan(0);
  });

  it("escalates a domain to watch on 1..4 alerts (overdue access reviews)", () => {
    const summary = computeDomainSummary(
      {
        accessCampaigns: [
          { status: "in_progress", dueDate: iso(-DAY_MS) },
          { status: "in_progress", dueDate: iso(-2 * DAY_MS) },
        ],
      },
      { clock: clockAtNow }
    );
    const access = domainByKey(summary, "access");
    expect(access.alertCount).toBe(2);
    expect(access.status).toBe("watch");
  });

  it("escalates a domain to critical on any critical item (open significant incident)", () => {
    const summary = computeDomainSummary(
      { incidents: [{ status: "open", isSignificant: true, severity: "low" }] },
      { clock: clockAtNow }
    );
    expect(domainByKey(summary, "incident").status).toBe("critical");
  });

  it("escalates a domain to critical when alertCount exceeds 4 (six overdue policies)", () => {
    const sixOverdue = Array.from({ length: 6 }, () => ({
      status: "draft",
      reviewDueDate: iso(-DAY_MS),
    }));
    const summary = computeDomainSummary({ policies: sixOverdue }, { clock: clockAtNow });
    const policy = domainByKey(summary, "policy");
    expect(policy.alertCount).toBe(6);
    expect(policy.status).toBe("critical");
  });

  it("also flags critical severity incidents even when insignificant", () => {
    const summary = computeDomainSummary(
      { incidents: [{ status: "open", isSignificant: false, severity: "critical" }] },
      { clock: clockAtNow }
    );
    expect(domainByKey(summary, "incident").status).toBe("critical");
  });

  it("aggregates inventory gaps per asset domain (missing owner/valuation)", () => {
    const summary = computeDomainSummary(
      { assets: [{ owner: "alice", valuationC: 3 }, { owner: "", valuationC: null }] },
      { clock: clockAtNow }
    );
    const asset = domainByKey(summary, "asset");
    expect(asset.alertCount).toBe(1);
    expect(asset.status).toBe("watch");
  });

  it("produces a four-band witness payload in one call (healthy/watch/critical/no-data)", () => {
    const summary = computeDomainSummary(
      {
        risks: [{ status: "treated", residualScore: 5 }], // healthy
        policies: [{ approvalStatus: "approved" }], // healthy
        accessCampaigns: [{ status: "in_progress", dueDate: iso(-DAY_MS) }], // watch
        incidents: [{ status: "open", isSignificant: true }], // critical
        // training/bcp/supplyChain/asset left empty -> no-data
      },
      { clock: clockAtNow }
    );
    expect(domainByKey(summary, "risk").status).toBe("healthy");
    expect(domainByKey(summary, "policy").status).toBe("healthy");
    expect(domainByKey(summary, "access").status).toBe("watch");
    expect(domainByKey(summary, "incident").status).toBe("critical");
    expect(domainByKey(summary, "training").status).toBe("no-data");
    expect(domainByKey(summary, "bcp").status).toBe("no-data");
    expect(domainByKey(summary, "supplyChain").status).toBe("no-data");
    expect(domainByKey(summary, "asset").status).toBe("no-data");
  });
});

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

describe("controlHealth engine — heatmap", () => {
  it("maps computed measure statuses onto green/amber/red bands", () => {
    const report = computeControlHealth(
      {
        policies: [{ approvalStatus: "approved" }], // compliant -> green
        vendors: [{ id: 1 }, { id: 2 }, { id: 3 }], // supplyChain 66.7 -> amber
        vendorAssessments: [
          { vendorId: 1, status: "completed" },
          { vendorId: 2, status: "completed" },
        ],
        accessCampaigns: [
          { status: "in_progress", dueDate: iso(-DAY_MS) },
          { status: "in_progress", dueDate: iso(-2 * DAY_MS) },
        ], // accessControl -> non-compliant -> red
      },
      { clock: clockAtNow }
    );
    const bands = computeArticle21Heatmap(report.measures);
    expect(bands.policies).toBe("green");
    expect(bands.supplyChain).toBe("amber");
    expect(bands.accessControl).toBe("red");
    expect(bands.hrSecurity).toBe("empty"); // untouched measure renders empty
  });

  it("keeps unknown ids out of the canonical band map", () => {
    const bands = computeArticle21Heatmap([{ id: "bogus-measure", status: "compliant", score: 90 }]);
    expect(Object.keys(bands)).toEqual([...MEASURE_IDS]);
    expect(Object.values(bands).every((b: string) => b === "empty")).toBe(true);
  });

  it("bands malformed entries as empty without throwing", () => {
    expect(() => computeArticle21Heatmap([null, 42, "x"] as any)).not.toThrow();
    const bands = computeArticle21Heatmap([null, 42, "x"] as any);
    expect(Object.values(bands).every((b: string) => b === "empty")).toBe(true);
  });

  it("is deterministic for repeated calls with identical input", () => {
    const measures = computeControlHealth(
      { policies: [{ approvalStatus: "approved" }] },
      { clock: clockAtNow }
    ).measures;
    expect(computeArticle21Heatmap(measures)).toEqual(computeArticle21Heatmap(measures));
  });
});
