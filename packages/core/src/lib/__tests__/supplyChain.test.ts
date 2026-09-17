import { describe, it, expect } from "vitest";

/**
 * NIS2 supply-chain security engine (lib/nis2/supplyChain.ts) — engine tests
 * (QA cycle 17, NIS2 Phase 3 Task 3.1 / ENISA Measure 5.1).
 *
 * Mirrors incidentClassifier.test.ts: the engine is pure and deterministic,
 * never throws, and accepts an injectable `now` clock. Every function is
 * exercised at its band boundaries, on malformed input, on clock injection,
 * and for input determinism (same input twice => deep-equal).
 *
 * Contract under test:
 *   classifySupplierCriticality(input) -> SupplierCriticalityResult
 *   scoreSupplierSecurityPosture(input) -> SupplierPostureResult
 *   trackSupplierIncident(input) -> TrackSupplierIncidentResult
 *   monitorSecuritySla(input) -> SecuritySlaResult
 */

import {
  classifySupplierCriticality,
  scoreSupplierSecurityPosture,
  trackSupplierIncident,
  monitorSecuritySla,
  SUPPLY_CHAIN_CONTROLS,
  SUPPLY_CHAIN_CONTROL_IDS,
} from "../nis2/supplyChain";

const NOW = new Date("2026-08-19T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Base SLA item factory shared by the monitorSecuritySla suites. */
const baseItem = (
  over: Partial<{ id: string; title: string; cadenceDays: number; lastVerifiedAt: Date; passed: boolean }>
) => ({
  id: "sla-1",
  title: "Pen test report",
  cadenceDays: 30,
  lastVerifiedAt: NOW,
  passed: true,
  ...over,
});

/* ------------------------------------------------------------------ */
/* classifySupplierCriticality                                         */
/* ------------------------------------------------------------------ */

describe("classifySupplierCriticality — scoring & bands", () => {
  it("empty input → Unnamed supplier, low, score 0, fallback rationale", () => {
    const result = classifySupplierCriticality({ now: NOW });
    expect(result.supplierName).toBe("Unnamed supplier");
    expect(result.criticality).toBe("low");
    expect(result.criticalityScore).toBe(0);
    expect(result.rationale).toEqual(["No criticality factors identified"]);
  });

  it("essential services alone (45) → medium", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      servicesEssentialToCriticalFunctions: true,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(45);
    expect(result.criticality).toBe("medium");
    expect(result.rationale[0]).toContain("critical functions");
  });

  it("sensitive data alone (30) → medium", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      processesSensitiveData: true,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(30);
    expect(result.criticality).toBe("medium");
  });

  it("broad network access alone (25) → medium (lower band boundary)", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      networkAccessLevel: "broad",
      now: NOW,
    });
    expect(result.criticalityScore).toBe(25);
    expect(result.criticality).toBe("medium");
  });

  it("restricted network access alone (15) → low", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      networkAccessLevel: "restricted",
      now: NOW,
    });
    expect(result.criticalityScore).toBe(15);
    expect(result.criticality).toBe("low");
  });

  it("annual spend >= 1M alone (10) → low", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      annualSpendEur: 2_000_000,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(10);
    expect(result.criticality).toBe("low");
  });

  it("essential + broad (70) → critical (upper band boundary)", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      servicesEssentialToCriticalFunctions: true,
      networkAccessLevel: "broad",
      now: NOW,
    });
    expect(result.criticalityScore).toBe(70);
    expect(result.criticality).toBe("critical");
  });

  it("essential + sensitive + restricted (90) → critical", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      servicesEssentialToCriticalFunctions: true,
      processesSensitiveData: true,
      networkAccessLevel: "restricted",
      now: NOW,
    });
    expect(result.criticalityScore).toBe(90);
    expect(result.criticality).toBe("critical");
  });

  it("essential + sensitive + broad + spend (110) → clamped to 100 critical", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      servicesEssentialToCriticalFunctions: true,
      processesSensitiveData: true,
      networkAccessLevel: "broad",
      annualSpendEur: 5_000_000,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(100);
    expect(result.criticality).toBe("critical");
  });

  it("subcontractor subtracts 10 (negative never leaks below 0)", () => {
    const result = classifySupplierCriticality({
      supplierName: "SubCo",
      isSubcontractor: true,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(0);
    expect(result.criticality).toBe("low");
    expect(result.rationale[0]).toContain("Subcontractor");
  });

  it("sensitive + broad + spend (65) → high", () => {
    const result = classifySupplierCriticality({
      supplierName: "CloudCo",
      processesSensitiveData: true,
      networkAccessLevel: "broad",
      annualSpendEur: 1_500_000,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(65);
    expect(result.criticality).toBe("high");
  });

  it("rationale order is stable regardless of input order", () => {
    const a = classifySupplierCriticality({
      supplierName: "X",
      processesSensitiveData: true,
      servicesEssentialToCriticalFunctions: true,
      networkAccessLevel: "broad",
      isSubcontractor: true,
      annualSpendEur: 2_000_000,
      now: NOW,
    });
    expect(a.rationale).toEqual([
      "Services are essential to the entity's critical functions (+45)",
      "Supplier processes sensitive data (+30)",
      "Supplier has broad network access to the entity's environment (+25)",
      "Subcontractor relationship — reduced direct exposure (-10)",
      "Annual spend of EUR 1,000,000 or more (+10)",
    ]);
  });
});

describe("classifySupplierCriticality — review cadence & clock", () => {
  it("critical → Quarterly, nextReviewDate = now + 3 months (90 days)", () => {
    const result = classifySupplierCriticality({
      supplierName: "X",
      servicesEssentialToCriticalFunctions: true,
      networkAccessLevel: "broad",
      now: NOW,
    });
    expect(result.reviewFrequency).toBe("Quarterly");
    expect(new Date(result.nextReviewDate).getTime()).toBe(NOW.getTime() + 3 * 30 * DAY_MS);
  });

  it("high → Semi-Annual (180 days)", () => {
    const result = classifySupplierCriticality({
      supplierName: "X",
      processesSensitiveData: true,
      networkAccessLevel: "broad",
      annualSpendEur: 1_500_000,
      now: NOW,
    });
    expect(result.reviewFrequency).toBe("Semi-Annual");
    expect(new Date(result.nextReviewDate).getTime()).toBe(NOW.getTime() + 6 * 30 * DAY_MS);
  });

  it("medium → Annual (360 days)", () => {
    const result = classifySupplierCriticality({
      supplierName: "X",
      processesSensitiveData: true,
      now: NOW,
    });
    expect(result.reviewFrequency).toBe("Annual");
    expect(new Date(result.nextReviewDate).getTime()).toBe(NOW.getTime() + 12 * 30 * DAY_MS);
  });

  it("low → Biennial (720 days)", () => {
    const result = classifySupplierCriticality({ now: NOW });
    expect(result.reviewFrequency).toBe("Biennial");
    expect(new Date(result.nextReviewDate).getTime()).toBe(NOW.getTime() + 24 * 30 * DAY_MS);
  });
});

describe("classifySupplierCriticality — malformed input never throws", () => {
  it("accepts NaN and negative spend as 0", () => {
    expect(() =>
      classifySupplierCriticality({ supplierName: "X", annualSpendEur: Number.NaN, now: NOW })
    ).not.toThrow();
    const result = classifySupplierCriticality({
      supplierName: "X",
      annualSpendEur: -500,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(0);
    expect(result.criticality).toBe("low");
  });

  it("ignores an unknown networkAccessLevel (no points)", () => {
    const result = classifySupplierCriticality({
      supplierName: "X",
      networkAccessLevel: "super-broad" as never,
      now: NOW,
    });
    expect(result.criticalityScore).toBe(0);
    expect(result.criticality).toBe("low");
  });

  it("never throws on undefined input", () => {
    expect(() => classifySupplierCriticality(undefined as never)).not.toThrow();
    const result = classifySupplierCriticality(undefined as never);
    expect(result.supplierName).toBe("Unnamed supplier");
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      supplierName: "Acme",
      servicesEssentialToCriticalFunctions: true,
      processesSensitiveData: true,
      networkAccessLevel: "broad" as const,
      annualSpendEur: 2_000_000,
      now: NOW,
    };
    expect(classifySupplierCriticality(input)).toEqual(classifySupplierCriticality(input));
  });
});

/* ------------------------------------------------------------------ */
/* scoreSupplierSecurityPosture                                        */
/* ------------------------------------------------------------------ */

describe("scoreSupplierSecurityPosture — scoring & readiness", () => {
  it("all controls met → 100 Strong, no gaps, two standard actions", () => {
    const allMet = Object.fromEntries(SUPPLY_CHAIN_CONTROL_IDS.map((id) => [id, true]));
    const result = scoreSupplierSecurityPosture({ supplierName: "Acme", answers: allMet });
    expect(result.score).toBe(100);
    expect(result.readiness).toBe("Strong");
    expect(result.gaps).toEqual([]);
    expect(result.recommendedActions).toEqual([
      "Reassess at next review",
      "Maintain supplier security documentation",
    ]);
  });

  it("no answers → score 0, readiness No Data", () => {
    const result = scoreSupplierSecurityPosture({ supplierName: "Acme" });
    expect(result.score).toBe(0);
    expect(result.readiness).toBe("No Data");
    expect(result.gaps).toHaveLength(8);
  });

  it("empty answers object → No Data", () => {
    const result = scoreSupplierSecurityPosture({ supplierName: "Acme", answers: {} });
    expect(result.readiness).toBe("No Data");
    expect(result.score).toBe(0);
  });

  it("answers with only undefined values → No Data", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: { securityRequirementsInAgreement: undefined },
    });
    expect(result.readiness).toBe("No Data");
    expect(result.score).toBe(0);
  });

  it("securityRequirements(20) + incidentNotification(15) + auditRights(12) = 47 → At Risk", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: {
        securityRequirementsInAgreement: true,
        incidentNotificationCommitment: true,
        auditRights: true,
      },
    });
    expect(result.score).toBe(47);
    expect(result.readiness).toBe("At Risk");
  });

  it("+ vulnerabilityHandling(15) = 62 → still At Risk (below 65)", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: {
        securityRequirementsInAgreement: true,
        incidentNotificationCommitment: true,
        vulnerabilityHandlingProcess: true,
        auditRights: true,
      },
    });
    expect(result.score).toBe(62);
    expect(result.readiness).toBe("At Risk");
  });

  it("+ subcontractingConstraints(10) = 72 → Developing", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: {
        securityRequirementsInAgreement: true,
        incidentNotificationCommitment: true,
        vulnerabilityHandlingProcess: true,
        auditRights: true,
        subcontractingConstraints: true,
      },
    });
    expect(result.score).toBe(72);
    expect(result.readiness).toBe("Developing");
  });

  it("all but businessContinuityProvisions(8) = 92 → Strong", () => {
    const answers = Object.fromEntries(SUPPLY_CHAIN_CONTROL_IDS.map((id) => [id, true]));
    answers.businessContinuityProvisions = false;
    const result = scoreSupplierSecurityPosture({ supplierName: "Acme", answers });
    expect(result.score).toBe(92);
    expect(result.readiness).toBe("Strong");
  });

  it("gaps mirror unmet labels in catalog order", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: { securityRequirementsInAgreement: true },
    });
    expect(result.gaps).toEqual(
      SUPPLY_CHAIN_CONTROLS.filter((c) => c.id !== "securityRequirementsInAgreement").map(
        (c) => c.label
      )
    );
  });

  it("recommendedActions are gap-derived and capped at 5", () => {
    const result = scoreSupplierSecurityPosture({ supplierName: "Acme" });
    expect(result.recommendedActions.length).toBeLessThanOrEqual(5);
    expect(result.recommendedActions[0]).toBe("Add security requirements to the supplier agreement");
  });

  it("controls catalog weights sum to 100 and ids are unique", () => {
    const totalWeight = SUPPLY_CHAIN_CONTROLS.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
    expect(new Set(SUPPLY_CHAIN_CONTROL_IDS).size).toBe(SUPPLY_CHAIN_CONTROL_IDS.length);
  });
});

describe("scoreSupplierSecurityPosture — malformed input never throws", () => {
  it("ignores unknown answer keys (data present → At Risk, not No Data)", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: { madeUpKey: true } as never,
    });
    expect(result.score).toBe(0);
    expect(result.readiness).toBe("At Risk");
  });

  it("non-boolean answer values count as unmet (data present → At Risk)", () => {
    const result = scoreSupplierSecurityPosture({
      supplierName: "Acme",
      answers: { securityRequirementsInAgreement: "yes" as never },
    });
    expect(result.score).toBe(0);
    expect(result.readiness).toBe("At Risk");
  });

  it("never throws on undefined input", () => {
    expect(() => scoreSupplierSecurityPosture(undefined as never)).not.toThrow();
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      supplierName: "Acme",
      answers: {
        securityRequirementsInAgreement: true,
        vulnerabilityHandlingProcess: true,
        auditRights: true,
        businessContinuityProvisions: true,
      },
    };
    expect(scoreSupplierSecurityPosture(input)).toEqual(scoreSupplierSecurityPosture(input));
  });
});

/* ------------------------------------------------------------------ */
/* trackSupplierIncident                                               */
/* ------------------------------------------------------------------ */

describe("trackSupplierIncident — SLA deadline math", () => {
  it("significant incident defaults to a 24h notification SLA", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Ransomware",
      detectedAt: NOW,
      significant: true,
      now: NOW,
    });
    expect(result.significant).toBe(true);
    expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 24 * HOUR_MS);
    expect(result.status).toBe("pending");
    expect(result.daysRemaining).toBe(1);
  });

  it("non-significant incident defaults to a 72h SLA", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Minor outage",
      detectedAt: NOW,
      significant: false,
      now: NOW,
    });
    expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 72 * HOUR_MS);
    expect(result.status).toBe("pending");
    expect(result.daysRemaining).toBe(3);
  });

  it("honours a custom notificationSlaHours", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt: NOW,
      significant: true,
      notificationSlaHours: 48,
      now: NOW,
    });
    expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 48 * HOUR_MS);
  });

  it("missing detectedAt anchors the deadline to now (never throws)", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      significant: true,
      now: NOW,
    });
    expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 24 * HOUR_MS);
  });
});

describe("trackSupplierIncident — status lifecycle", () => {
  it("pending far from deadline", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt: NOW,
      significant: true,
      now: NOW,
    });
    expect(result.status).toBe("pending");
    expect(result.note).toContain("Pending");
  });

  it("due inside the 12h window before the deadline", () => {
    const detectedAt = new Date(NOW.getTime() - 20 * HOUR_MS);
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt,
      significant: true, // deadline = detected + 24h = now + 4h
      now: NOW,
    });
    expect(result.status).toBe("due");
    expect(result.note).toContain("Due in");
    expect(result.daysRemaining).toBe(0); // 4h = 0.17 days -> rounds to 0
  });

  it("overdue past the deadline with negative daysRemaining", () => {
    const detectedAt = new Date(NOW.getTime() - 3 * DAY_MS);
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt,
      significant: true, // deadline = detected + 24h = now - 2 days
      now: NOW,
    });
    expect(result.status).toBe("overdue");
    expect(result.note).toContain("Overdue by 2 days");
    expect(result.daysRemaining).toBe(-2);
  });

  it("submitted once reported, daysRemaining null", () => {
    const reported = new Date(NOW.getTime() - HOUR_MS);
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt: NOW,
      significant: true,
      reportedToEntityAt: reported,
      now: NOW,
    });
    expect(result.status).toBe("submitted");
    expect(result.daysRemaining).toBeNull();
    expect(result.note).toContain("Reported to entity");
  });

  it("acknowledged wins over submitted", () => {
    const result = trackSupplierIncident({
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt: NOW,
      significant: true,
      reportedToEntityAt: new Date(NOW.getTime() - 2 * HOUR_MS),
      acknowledgedAt: new Date(NOW.getTime() - HOUR_MS),
      now: NOW,
    });
    expect(result.status).toBe("acknowledged");
    expect(result.daysRemaining).toBeNull();
    expect(result.note).toContain("Acknowledged by the entity");
  });

  it("invalid SLA hours fall back to the default (no throw)", () => {
    for (const bad of [Number.NaN, -5, 0]) {
      const result = trackSupplierIncident({
        supplierName: "Acme",
        incidentTitle: "Breach",
        detectedAt: NOW,
        significant: true,
        notificationSlaHours: bad,
        now: NOW,
      });
      expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 24 * HOUR_MS);
    }
  });
});

describe("trackSupplierIncident — incidentId slug & determinism", () => {
  it("produces a deterministic kebab-case slug from supplier + title", () => {
    const a = trackSupplierIncident({
      supplierName: "Acme Cloud GmbH",
      incidentTitle: "Breach - Ransomware",
      detectedAt: NOW,
      now: NOW,
    });
    const b = trackSupplierIncident({
      supplierName: "Acme Cloud GmbH",
      incidentTitle: "Breach - Ransomware",
      detectedAt: NOW,
      now: NOW,
    });
    expect(a.incidentId).toBe("acme-cloud-gmbh-breach-ransomware");
    expect(b.incidentId).toBe(a.incidentId);
  });

  it("sanitizes special characters and falls back to untitled-incident when the slug is empty", () => {
    const result = trackSupplierIncident({
      supplierName: "!!!",
      incidentTitle: "???",
      detectedAt: NOW,
      now: NOW,
    });
    // Names are only defaulted when blank; non-blank special-char names pass through.
    expect(result.supplierName).toBe("!!!");
    expect(result.incidentTitle).toBe("???");
    // The combined slug has no alphanumerics -> untitled-incident fallback.
    expect(result.incidentId).toBe("untitled-incident");
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      supplierName: "Acme",
      incidentTitle: "Breach",
      detectedAt: NOW,
      significant: true,
      now: NOW,
    };
    expect(trackSupplierIncident(input)).toEqual(trackSupplierIncident(input));
  });

  it("never throws on undefined input", () => {
    expect(() => trackSupplierIncident(undefined as never)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* monitorSecuritySla                                                  */
/* ------------------------------------------------------------------ */

describe("monitorSecuritySla — statuses & daysUntilDue", () => {
  it("fresh verification → compliant with positive daysUntilDue", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [baseItem({ lastVerifiedAt: new Date(NOW.getTime() - 10 * DAY_MS) })],
      now: NOW,
    });
    expect(result.items[0].status).toBe("compliant");
    expect(result.items[0].daysUntilDue).toBe(20);
  });

  it("just past cadence → at-risk with negative daysUntilDue", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [baseItem({ lastVerifiedAt: new Date(NOW.getTime() - 31 * DAY_MS) })],
      now: NOW,
    });
    expect(result.items[0].status).toBe("at-risk");
    expect(result.items[0].daysUntilDue).toBe(-1);
  });

  it("past 2x cadence → breached", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [baseItem({ lastVerifiedAt: new Date(NOW.getTime() - 61 * DAY_MS) })],
      now: NOW,
    });
    expect(result.items[0].status).toBe("breached");
    expect(result.items[0].daysUntilDue).toBe(-31);
  });

  it("never verified → not-tested with daysUntilDue 0", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [baseItem({ lastVerifiedAt: undefined })],
      now: NOW,
    });
    expect(result.items[0].status).toBe("not-tested");
    expect(result.items[0].daysUntilDue).toBe(0);
    expect(result.items[0].lastVerifiedAt).toBeNull();
  });

  it("passed=false is informational — cadence still drives a compliant status", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [baseItem({ passed: false, lastVerifiedAt: new Date(NOW.getTime() - 5 * DAY_MS) })],
      now: NOW,
    });
    expect(result.items[0].passed).toBe(false);
    expect(result.items[0].status).toBe("compliant");
  });

  it("summary counts each status and total", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [
        baseItem({ id: "a", lastVerifiedAt: new Date(NOW.getTime() - 5 * DAY_MS) }), // compliant
        baseItem({ id: "b", lastVerifiedAt: new Date(NOW.getTime() - 31 * DAY_MS) }), // at-risk
        baseItem({ id: "c", lastVerifiedAt: new Date(NOW.getTime() - 61 * DAY_MS) }), // breached
        baseItem({ id: "d", lastVerifiedAt: undefined }), // not-tested
      ],
      now: NOW,
    });
    expect(result.summary).toEqual({ compliant: 1, atRisk: 1, breached: 1, notTested: 1, total: 4 });
  });
});

describe("monitorSecuritySla — malformed input never throws", () => {
  it("missing items → empty list and zeroed summary", () => {
    const result = monitorSecuritySla({ supplierName: "Acme", now: NOW });
    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({ compliant: 0, atRisk: 0, breached: 0, notTested: 0, total: 0 });
  });

  it("filters out items with invalid cadenceDays (0, negative, NaN)", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [
        baseItem({ id: "ok" }),
        baseItem({ id: "zero", cadenceDays: 0 }),
        baseItem({ id: "neg", cadenceDays: -5 }),
        baseItem({ id: "nan", cadenceDays: Number.NaN }),
      ],
      now: NOW,
    });
    expect(result.items.map((i) => i.id)).toEqual(["ok"]);
    expect(result.summary.total).toBe(1);
  });

  it("invalid lastVerifiedAt (non-Date) counts as not-tested", () => {
    const result = monitorSecuritySla({
      supplierName: "Acme",
      items: [{ id: "x", title: "X", cadenceDays: 30, lastVerifiedAt: "2026-01-01" as never, passed: true }],
      now: NOW,
    });
    expect(result.items[0].status).toBe("not-tested");
  });

  it("items as a non-array → empty list", () => {
    const result = monitorSecuritySla({ supplierName: "Acme", items: "nope" as never, now: NOW });
    expect(result.items).toEqual([]);
  });

  it("never throws on undefined input", () => {
    expect(() => monitorSecuritySla(undefined as never)).not.toThrow();
  });

  it("is deterministic — same input twice deep-equals", () => {
    const input = {
      supplierName: "Acme",
      items: [
        { id: "a", title: "A", cadenceDays: 30, lastVerifiedAt: new Date(NOW.getTime() - 5 * DAY_MS), passed: true },
        { id: "b", title: "B", cadenceDays: 30, lastVerifiedAt: new Date(NOW.getTime() - 61 * DAY_MS), passed: false },
      ],
      now: NOW,
    };
    expect(monitorSecuritySla(input)).toEqual(monitorSecuritySla(input));
  });
});
