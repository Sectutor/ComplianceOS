import { describe, it, expect } from "vitest";

/**
 * NIS2 Threat Landscape Integration engine (lib/nis2/threatLandscape.ts) —
 * engine tests (QA cycle 25, NIS2 Phase 1 Task 1.1 / ENISA Threat Landscape).
 *
 * Mirrors securityMetrics.test.ts / evidenceRepository.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable `now` clock
 * (Date | epoch-ms number | ISO-8601 string) or a `clock` factory where time
 * matters. Every function is exercised at its band boundaries, on malformed
 * input, on clock injection, and for input determinism (same input twice =>
 * deep-equal).
 *
 * Contract under test:
 *   classifyThreatEvent(event?)       -> { id, title, categoryId, categoryName,
 *                                          impactLevel, nis2Articles,
 *                                          matchedKeywords, confidence }
 *   generateThreatScenarios(input?)   -> { items, total }
 *   buildTaraTemplate(input?)         -> { rows, summary }
 *   summarizeThreatLandscape(input?)  -> { totalEvents, categoryCounts,
 *                                          severityCounts, recentEvents, trend,
 *                                          exposureScore, recommendations }
 *
 * ------------------------------------------------------------------
 * CLASSIFICATION MODEL (classifyThreatEvent)
 * ------------------------------------------------------------------
 * Keyword matching runs against the ENISA threat taxonomy
 * (lib/threat-intel/enisa-taxonomy.ts) with the following QA-pinned keyword
 * map (case-insensitive substring match over title, then description):
 *
 *   TH-001 Ransomware      ["ransomware", "ransom", "encryption",
 *                           "double extortion", "extortion"]
 *   TH-002 Malware         ["malware", "trojan", "spyware", "botnet",
 *                           "keylogger"]
 *   TH-003 DoS/DDoS        ["ddos", "denial of service", "dos", "flood",
 *                           "volumetric"]
 *   TH-004 Supply Chain    ["supply chain", "third-party", "third party",
 *                           "vendor", "supplier"]
 *   TH-005 Phishing        ["phishing", "spear-phishing", "spear phishing",
 *                           "bec", "business email compromise"]
 *   TH-006 Insider         ["insider", "insider threat", "disgruntled",
 *                           "employee", "privileged access misuse"]
 *   TH-007 Misc (0-day)    ["zero-day", "zero day", "zeroday", "0-day",
 *                           "0day"]
 *   TH-008 Natural Disaster["physical", "natural disaster", "power grid",
 *                           "earthquake", "data center"]
 *
 * Matching rule: the title is scanned first; if ANY title keyword hits, those
 * hits win (title takes precedence over the description). Otherwise the
 * description is scanned. The winning category is the one with the most
 * matched keywords; ties break toward the earliest taxonomy entry
 * (TH-001 < TH-002 < ...). matchedKeywords are the canonical (lowercase,
 * deduplicated) keyword strings in taxonomy-map order.
 *
 * confidence = min(1, 0.2 * matchedKeywords.length) rounded to 1 decimal
 * (1 keyword -> 0.2, 2 -> 0.4, 3 -> 0.6, 4 -> 0.8, 5+ -> 1.0). Fallback
 * (no match): categoryId "TH-000", categoryName "Other", impactLevel
 * "Medium", confidence 0, matchedKeywords [] and nis2Articles [].
 *
 * categoryName mirrors the taxonomy `category` label (e.g. "Ransomware",
 * "Malware", "DoS/DDoS", "Supply Chain", "Phishing", "Insider", "Misc",
 * "Natural Disaster"); impactLevel and nis2Articles passthrough from the
 * matched taxonomy entry. id/title passthrough with "" fallbacks. Malformed
 * (undefined / null / primitives / empty-string text) -> fallback shape.
 *
 * ------------------------------------------------------------------
 * SCENARIO MODEL (generateThreatScenarios)
 * ------------------------------------------------------------------
 * Catalog (from lib/threat-intel/scenario-generator.ts), returned in catalog
 * order:
 *   SC-FIN-01 Financial Transaction Interception  baseThreatId TH-002
 *             sectors ["Finance","Banking"]       likelihood Medium
 *   SC-HC-01  Patient Data Ransomware             baseThreatId TH-001
 *             sectors ["Healthcare","Pharma"]     likelihood High
 *   SC-MFG-01 Industrial Control System Sabotage  baseThreatId TH-006
 *             sectors ["Manufacturing","Energy"]  likelihood Low
 *   SC-GEN-01 Phishing of High-Privilege Admin    baseThreatId TH-005
 *             sectors ["Any"]                     likelihood High
 *
 * Sector match (case-insensitive): a scenario qualifies when its "Any" tag
 * applies OR the lowercased input sector CONTAINS one of the scenario's
 * sector tokens (so "Banking Group Ltd" matches "Banking"; "Finance" matches
 * exactly). No match / missing / empty sector -> the general ("Any")
 * scenarios only. limit (positive int) is applied last; 0 / negative / NaN /
 * Infinity are ignored; fractional positive limits are floored. Items carry
 * id/title/description/baseThreatId/categoryId/categoryName/likelihood/
 * potentialImpact/recommendedControls/industrySector where categoryId and
 * categoryName are resolved from baseThreatId against the taxonomy. Malformed
 * (non-object input) -> { items: [], total: 0 }.
 *
 * ------------------------------------------------------------------
 * TARA MODEL (buildTaraTemplate)
 * ------------------------------------------------------------------
 * Cross-product of assets x scenarios. Asset item { id?, name?, criticality? }
 * where criticality {Critical:4, High:3, Medium:2, Low:1} (case-insensitive,
 * unknown/missing -> 1). Scenario item { id?/scenarioId?, title?,
 * likelihood?, recommendedControls?, mitigations?, nis2Articles?,
 * baseThreatId? } where likelihood {Low:1, Medium:2, High:3}
 * (case-insensitive, unknown/missing -> 1). riskScore = inherentImpact *
 * inherentLikelihood (1..12). Bands: critical >= 9, high >= 6, medium >= 3,
 * low < 3. Rows sorted riskScore DESC -> assetName ASC -> scenarioId ASC.
 * topRisks capped at 5 with the same sort. avgRiskScore = 1 decimal
 * (Math.round(sum/n*10)/10). mitigations come from recommendedControls,
 * falling back to mitigations, else []. nis2Articles come from the scenario's
 * own nis2Articles, else resolved from baseThreatId via the taxonomy, else [].
 * Malformed (non-object input, or assets/scenarios missing / null / not an
 * array) -> zeroed EMPTY shape:
 *   { rows: [], summary: { totalRows: 0, perBand: { critical: 0, high: 0,
 *     medium: 0, low: 0 }, avgRiskScore: 0, topRisks: [] } }
 *
 * ------------------------------------------------------------------
 * SUMMARY MODEL (summarizeThreatLandscape)
 * ------------------------------------------------------------------
 * Events { id?, title?, description?, severity?, occurredAt? }. totalEvents =
 * the length of the events array (malformed rows still count). Each event is
 * classified through the same keyword rules as classifyThreatEvent;
 * categoryCounts aggregates { categoryId, categoryName, count } sorted
 * categoryId asc (unclassified rows roll up under TH-000/Other; empty events
 * -> []). severityCounts always exposes all five keys
 * { critical, high, medium, low, unknown } with invalid/missing severities
 * coerced to "unknown" (case-insensitive).
 *
 * recentEvents keeps at most 5 events sorted occurredAt desc, id asc
 * (numbers before strings) with invalid/missing occurredAt LAST (id asc
 * among themselves). trend compares against the injectable clock:
 *   last30d  = events with occurredAt >= now - 30d (0..30 days ago,
 *              exclusive of the future)
 *   prior30d = events with occurredAt >= now - 60d AND < now - 30d
 *              (30..60 days ago, exactly-60d still counts)
 *   delta    = last30d - prior30d
 * Future events and events older than 60d fall in neither window.
 *
 * exposureScore (QA-documented formula): severity weights critical 5, high 4,
 * medium 3, low 2, unknown 1; score = round1(100 * sum(weights) / (n * 5))
 * for n > 0 else 0, clamped to [0, 100] (all-critical -> 100, all-high -> 80,
 * all-medium -> 60, all-low -> 40, all-unknown -> 20).
 *
 * recommendations (deterministic, max 5, fixed precedence order
 * critical -> high -> medium -> low -> unknown, zero buckets omitted):
 *   `Address ${n} critical threat event(s)`
 *   `Investigate ${n} high-severity threat event(s)`
 *   `Review ${n} medium-severity threat event(s)`
 *   `Monitor ${n} low-severity threat event(s)`
 *   `Reclassify ${n} unclassified threat event(s)`
 *
 * Malformed input -> zeroed EMPTY shape:
 *   { totalEvents: 0, categoryCounts: [], severityCounts: { critical: 0,
 *     high: 0, medium: 0, low: 0, unknown: 0 }, recentEvents: [],
 *     trend: { last30d: 0, prior30d: 0, delta: 0 }, exposureScore: 0,
 *     recommendations: [] }
 */

const NOW = new Date("2026-08-21T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString();
const epoch = (daysFromNow: number) => NOW.getTime() + daysFromNow * DAY_MS;

import {
  classifyThreatEvent,
  generateThreatScenarios,
  buildTaraTemplate,
  summarizeThreatLandscape,
} from "../nis2/threatLandscape";

/* ================================================================== */
/* classifyThreatEvent                                                 */
/* ================================================================== */

describe("classifyThreatEvent — taxonomy keyword hits", () => {
  it("classifies a title mentioning ransomware as TH-001 / Ransomware / Critical", () => {
    const result = classifyThreatEvent({
      id: 1,
      title: "Ransomware attack on production systems",
      description: "Files encrypted overnight",
    });
    expect(result.categoryId).toBe("TH-001");
    expect(result.categoryName).toBe("Ransomware");
    expect(result.impactLevel).toBe("Critical");
    expect(result.matchedKeywords).toContain("ransomware");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("matches keywords in the description when the title has none", () => {
    const result = classifyThreatEvent({
      title: "Incident 42",
      description: "Double extortion ransomware campaign detected",
    });
    expect(result.categoryId).toBe("TH-001");
    expect(result.matchedKeywords).toEqual(["ransomware", "double extortion"]);
  });

  it("maps malware / trojan mentions to TH-002 / Malware / High", () => {
    const result = classifyThreatEvent({ title: "trojan malware delivery via email" });
    expect(result.categoryId).toBe("TH-002");
    expect(result.categoryName).toBe("Malware");
    expect(result.impactLevel).toBe("High");
    expect(result.matchedKeywords).toEqual(["malware", "trojan"]);
  });

  it("maps ddos / flood mentions to TH-003 / DoS/DDoS", () => {
    const result = classifyThreatEvent({
      title: "Gateway overload",
      description: "volumetric DDoS flood against the internet gateway",
    });
    expect(result.categoryId).toBe("TH-003");
    expect(result.categoryName).toBe("DoS/DDoS");
    expect(result.matchedKeywords).toEqual(["ddos", "flood", "volumetric"]);
  });

  it("maps supply chain mentions to TH-004 / Supply Chain / Critical", () => {
    const result = classifyThreatEvent({
      title: "supply chain compromise via third-party vendor",
    });
    expect(result.categoryId).toBe("TH-004");
    expect(result.categoryName).toBe("Supply Chain");
    expect(result.impactLevel).toBe("Critical");
    expect(result.matchedKeywords).toContain("supply chain");
  });

  it("maps phishing / BEC mentions to TH-005 / Phishing", () => {
    const result = classifyThreatEvent({
      description: "business email compromise spear-phishing campaign",
    });
    expect(result.categoryId).toBe("TH-005");
    expect(result.categoryName).toBe("Phishing");
    expect(result.impactLevel).toBe("High");
    expect(result.matchedKeywords).toEqual(["phishing", "spear-phishing", "business email compromise"]);
  });

  it("maps insider mentions to TH-006 / Insider", () => {
    const result = classifyThreatEvent({ title: "Malicious insider threat activity detected" });
    expect(result.categoryId).toBe("TH-006");
    expect(result.categoryName).toBe("Insider");
    expect(result.impactLevel).toBe("High");
    expect(result.matchedKeywords).toEqual(["insider", "insider threat"]);
  });

  it("maps zero-day mentions to TH-007 / Misc", () => {
    const result = classifyThreatEvent({ description: "zero-day and zero day exploitation of the VPN gateway" });
    expect(result.categoryId).toBe("TH-007");
    expect(result.categoryName).toBe("Misc");
    expect(result.impactLevel).toBe("Critical");
    expect(result.matchedKeywords).toEqual(["zero-day", "zero day"]);
  });

  it("maps physical / natural-disaster mentions to TH-008 / Natural Disaster", () => {
    const result = classifyThreatEvent({ title: "Physical damage to the data center" });
    expect(result.categoryId).toBe("TH-008");
    expect(result.categoryName).toBe("Natural Disaster");
    expect(result.impactLevel).toBe("High");
    expect(result.matchedKeywords).toEqual(["physical", "data center"]);
  });

  it("is case-insensitive", () => {
    expect(classifyThreatEvent({ title: "RANSOMWARE" }).categoryId).toBe("TH-001");
    expect(classifyThreatEvent({ title: "DdOs flood" }).categoryId).toBe("TH-003");
    expect(classifyThreatEvent({ title: "SPEAR-PHISHING" }).categoryId).toBe("TH-005");
  });

  it("lets the title win when title and description match different categories", () => {
    const result = classifyThreatEvent({
      title: "phishing campaign",
      description: "ransomware encryption payload attached",
    });
    expect(result.categoryId).toBe("TH-005");
    expect(result.matchedKeywords).toEqual(["phishing"]);
  });

  it("deduplicates matched keywords and keeps map order", () => {
    const result = classifyThreatEvent({ title: "Ransomware ransomware encryption" });
    expect(result.matchedKeywords).toEqual(["ransomware", "encryption"]);
  });
});

describe("classifyThreatEvent — fallback and passthrough", () => {
  it("falls back to TH-000 / Other / Medium / confidence 0 / empty arrays for unknown text", () => {
    const result = classifyThreatEvent({ id: 9, title: "mystery event", description: "something odd happened" });
    expect(result).toMatchObject({
      id: 9,
      categoryId: "TH-000",
      categoryName: "Other",
      impactLevel: "Medium",
      confidence: 0,
      matchedKeywords: [],
      nis2Articles: [],
    });
  });

  it("passes through id and title with safe fallbacks", () => {
    expect(classifyThreatEvent({ id: 7, title: "Ransomware" }).id).toBe(7);
    expect(classifyThreatEvent({ id: "abc", title: "Ransomware" }).id).toBe("abc");
    expect(classifyThreatEvent({ id: "k", title: "Ransomware" }).title).toBe("Ransomware");
    expect(classifyThreatEvent({ title: "Ransomware" }).id).toBe("");
    expect(classifyThreatEvent({ id: 1 }).title).toBe("");
  });

  it("passes through nis2Articles from the matched taxonomy entry", () => {
    expect(classifyThreatEvent({ title: "ransomware" }).nis2Articles).toEqual(["21(2)(b)", "21(2)(c)"]);
    expect(classifyThreatEvent({ title: "malware" }).nis2Articles).toEqual(["21(2)(d)", "21(2)(j)"]);
    expect(classifyThreatEvent({ title: "ddos" }).nis2Articles).toEqual(["21(2)(e)"]);
  });

  it("passes through impactLevel from the matched taxonomy entry", () => {
    expect(classifyThreatEvent({ title: "zero-day" }).impactLevel).toBe("Critical");
    expect(classifyThreatEvent({ title: "natural disaster" }).impactLevel).toBe("High");
  });

  it("returns the fallback shape for malformed input (undefined / null / non-object / empty text)", () => {
    const fallback = {
      id: "",
      title: "",
      categoryId: "TH-000",
      categoryName: "Other",
      impactLevel: "Medium",
      nis2Articles: [],
      matchedKeywords: [],
      confidence: 0,
    };
    expect(classifyThreatEvent(undefined)).toEqual(fallback);
    expect(classifyThreatEvent(null as never)).toEqual(fallback);
    expect(classifyThreatEvent(42 as never)).toEqual(fallback);
    expect(classifyThreatEvent("x" as never)).toEqual(fallback);
    expect(classifyThreatEvent([] as never)).toEqual(fallback);
    expect(classifyThreatEvent({ title: "" })).toEqual(fallback);
    expect(classifyThreatEvent({ title: "   " })).toEqual(fallback);
    expect(classifyThreatEvent({ description: "" })).toEqual(fallback);
  });

  it("never throws on garbage input", () => {
    expect(() =>
      classifyThreatEvent({
        title: 42 as never,
        description: true as never,
        id: { nested: 1 } as never,
        source: Symbol("x") as never,
      })
    ).not.toThrow();
  });
});

describe("classifyThreatEvent — confidence and determinism", () => {
  it("confidence follows the documented keyword-count formula (0.2 per keyword, max 1.0)", () => {
    expect(classifyThreatEvent({ title: "ransomware" }).confidence).toBe(0.2);
    expect(classifyThreatEvent({ title: "ransomware encryption" }).confidence).toBe(0.4);
    expect(classifyThreatEvent({ title: "ransomware encryption double extortion extortion" }).confidence).toBe(0.8);
    expect(classifyThreatEvent({ title: "ransomware encryption extortion double extortion ransom" }).confidence).toBe(1);
  });

  it("confidence stays within [0, 1] for any input", () => {
    const cases = [
      { title: "ransomware malware ddos phishing insider zero-day supply chain" },
      { title: "  " },
      { title: "a b c d e f g h i j k" },
    ];
    for (const input of cases) {
      const c = classifyThreatEvent(input).confidence;
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = {
      id: 3,
      title: "Targeted ransomware with double extortion",
      description: "encryption of backup repositories",
      source: "SIEM",
    };
    expect(classifyThreatEvent(input)).toEqual(classifyThreatEvent(input));
  });
});

/* ================================================================== */
/* generateThreatScenarios                                             */
/* ================================================================== */

describe("generateThreatScenarios — sector matching", () => {
  it("returns the sector scenario plus the Any scenario for an exact sector match", () => {
    const result = generateThreatScenarios({ sector: "Finance" });
    expect(result.items.map((s) => s.id)).toEqual(["SC-FIN-01", "SC-GEN-01"]);
    expect(result.total).toBe(2);
  });

  it("matches substrings of the sector string (input contains the catalog token)", () => {
    const result = generateThreatScenarios({ sector: "Banking Group Ltd" });
    expect(result.items.map((s) => s.id)).toEqual(["SC-FIN-01", "SC-GEN-01"]);
  });

  it("sector matching is case-insensitive", () => {
    expect(generateThreatScenarios({ sector: "finance" }).items.map((s) => s.id)).toEqual(["SC-FIN-01", "SC-GEN-01"]);
    expect(generateThreatScenarios({ sector: "HEALTHCARE" }).items.map((s) => s.id)).toEqual(["SC-HC-01", "SC-GEN-01"]);
  });

  it("maps pharma to SC-HC-01", () => {
    expect(generateThreatScenarios({ sector: "Pharma" }).items.map((s) => s.id)).toEqual(["SC-HC-01", "SC-GEN-01"]);
  });

  it("maps energy / manufacturing sectors to SC-MFG-01", () => {
    expect(generateThreatScenarios({ sector: "Energy Grid" }).items.map((s) => s.id)).toEqual(["SC-MFG-01", "SC-GEN-01"]);
    expect(generateThreatScenarios({ sector: "Manufacturing" }).items.map((s) => s.id)).toEqual(["SC-MFG-01", "SC-GEN-01"]);
  });

  it("falls back to the general Any scenarios when the sector does not match", () => {
    const result = generateThreatScenarios({ sector: "Agriculture" });
    expect(result.items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
    expect(result.total).toBe(1);
  });

  it("falls back to the general Any scenarios for a missing / empty sector", () => {
    expect(generateThreatScenarios({}).items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
    expect(generateThreatScenarios(undefined).items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
    expect(generateThreatScenarios({ sector: null }).items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
    expect(generateThreatScenarios({ sector: "" }).items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
    expect(generateThreatScenarios({ sector: "   " }).items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
  });
});

describe("generateThreatScenarios — limit and shape", () => {
  it("applies the positive limit last, after sector matching", () => {
    expect(generateThreatScenarios({ sector: "Finance", limit: 1 }).items.map((s) => s.id)).toEqual(["SC-FIN-01"]);
    expect(generateThreatScenarios({ sector: "Finance", limit: 99 }).items.map((s) => s.id)).toEqual(["SC-FIN-01", "SC-GEN-01"]);
  });

  it("ignores non-positive, NaN and infinite limits", () => {
    const expected = ["SC-FIN-01", "SC-GEN-01"];
    expect(generateThreatScenarios({ sector: "Finance", limit: 0 }).items.map((s) => s.id)).toEqual(expected);
    expect(generateThreatScenarios({ sector: "Finance", limit: -5 }).items.map((s) => s.id)).toEqual(expected);
    expect(generateThreatScenarios({ sector: "Finance", limit: Number.NaN }).items.map((s) => s.id)).toEqual(expected);
    expect(generateThreatScenarios({ sector: "Finance", limit: Number.POSITIVE_INFINITY }).items.map((s) => s.id)).toEqual(expected);
  });

  it("floors fractional positive limits", () => {
    expect(generateThreatScenarios({ sector: "Finance", limit: 1.9 }).items.map((s) => s.id)).toEqual(["SC-FIN-01"]);
  });

  it("emits the full documented item shape with taxonomy-resolved categoryId/categoryName", () => {
    const result = generateThreatScenarios({ sector: "Finance" });
    const fin = result.items.find((s) => s.id === "SC-FIN-01")!;
    expect(fin).toMatchObject({
      id: "SC-FIN-01",
      baseThreatId: "TH-002",
      categoryId: "TH-002",
      categoryName: "Malware",
      likelihood: "Medium",
      industrySector: ["Finance", "Banking"],
    });
    expect(fin.title.length).toBeGreaterThan(0);
    expect(fin.description.length).toBeGreaterThan(0);
    expect(fin.potentialImpact.length).toBeGreaterThan(0);
    expect(Array.isArray(fin.recommendedControls)).toBe(true);
    expect(fin.recommendedControls.length).toBeGreaterThan(0);

    const gen = result.items.find((s) => s.id === "SC-GEN-01")!;
    expect(gen).toMatchObject({ baseThreatId: "TH-005", categoryId: "TH-005", categoryName: "Phishing", likelihood: "High" });
  });

  it("returns items in deterministic catalog order", () => {
    const result = generateThreatScenarios({ sector: "Energy" });
    // catalog order: SC-MFG-01 before the Any scenario SC-GEN-01
    expect(result.items.map((s) => s.id)).toEqual(["SC-MFG-01", "SC-GEN-01"]);
  });

  it("returns the empty list for malformed (non-object) input", () => {
    expect(generateThreatScenarios(null as never)).toEqual({ items: [], total: 0 });
    expect(generateThreatScenarios(42 as never)).toEqual({ items: [], total: 0 });
    expect(generateThreatScenarios("nope" as never)).toEqual({ items: [], total: 0 });
    expect(generateThreatScenarios([] as never)).toEqual({ items: [], total: 0 });
  });

  it("never throws on garbage field values and treats non-string sector as absent", () => {
    expect(() => generateThreatScenarios({ sector: 42 as never, limit: "x" as never })).not.toThrow();
    const result = generateThreatScenarios({ sector: 42 as never, limit: "x" as never });
    expect(result.items.map((s) => s.id)).toEqual(["SC-GEN-01"]);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = { sector: "Banking Group", limit: 2 };
    expect(generateThreatScenarios(input)).toEqual(generateThreatScenarios(input));
  });
});

/* ================================================================== */
/* buildTaraTemplate                                                   */
/* ================================================================== */

const EMPTY_TARA = {
  rows: [],
  summary: {
    totalRows: 0,
    perBand: { critical: 0, high: 0, medium: 0, low: 0 },
    avgRiskScore: 0,
    topRisks: [],
  },
};

describe("buildTaraTemplate — riskScore math and bands", () => {
  it("computes riskScore = likelihood x impact across the reachable product table", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 1, name: "A", criticality: "Critical" }, // 4
        { id: 2, name: "B", criticality: "High" }, // 3
        { id: 3, name: "C", criticality: "Medium" }, // 2
        { id: 4, name: "D", criticality: "Low" }, // 1
      ],
      scenarios: [
        { id: "S1", likelihood: "High" }, // 3
        { id: "S2", likelihood: "Medium" }, // 2
      ],
    });
    const score = (assetName: string, scenarioId: string) =>
      result.rows.find((r) => r.assetName === assetName && r.scenarioId === scenarioId)!.riskScore;
    expect(score("A", "S1")).toBe(12); // 4x3
    expect(score("A", "S2")).toBe(8); // 4x2
    expect(score("B", "S1")).toBe(9); // 3x3
    expect(score("B", "S2")).toBe(6); // 3x2
    expect(score("C", "S2")).toBe(4); // 2x2
    expect(score("D", "S1")).toBe(3); // 1x3
    expect(score("D", "S2")).toBe(2); // 1x2
  });

  it("maps bands at the reachable boundaries: 12/9 critical, 8/6 high, 4/3 medium, 2/1 low", () => {
    const bandOf = (criticality: string, likelihood: string) =>
      buildTaraTemplate({
        assets: [{ id: 1, name: "A", criticality }],
        scenarios: [{ id: "S1", likelihood }],
      }).rows[0].riskBand;
    expect(bandOf("Critical", "High")).toBe("critical"); // 12
    expect(bandOf("High", "High")).toBe("critical"); // 9
    expect(bandOf("Critical", "Medium")).toBe("high"); // 8
    expect(bandOf("High", "Medium")).toBe("high"); // 6
    expect(bandOf("Medium", "Medium")).toBe("medium"); // 4
    expect(bandOf("High", "Low")).toBe("medium"); // 3
    expect(bandOf("Medium", "Low")).toBe("low"); // 2
    expect(bandOf("Low", "Low")).toBe("low"); // 1
  });

  it("coerces unknown / missing criticality to impact 1", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 1, name: "A", criticality: "bogus" },
        { id: 2, name: "B" },
        { id: 3, name: "C", criticality: null },
      ],
      scenarios: [{ id: "S1", likelihood: "High" }],
    });
    for (const row of result.rows) {
      expect(row.inherentImpact).toBe(1);
      expect(row.riskScore).toBe(3); // 1 x 3
      expect(row.riskBand).toBe("medium");
    }
  });

  it("coerces unknown / missing likelihood to 1", () => {
    const result = buildTaraTemplate({
      assets: [{ id: 1, name: "A", criticality: "Critical" }],
      scenarios: [
        { id: "S1", likelihood: "bogus" },
        { id: "S2" },
        { id: "S3", likelihood: null },
      ],
    });
    for (const row of result.rows) {
      expect(row.inherentLikelihood).toBe(1);
      expect(row.riskScore).toBe(4); // 4 x 1
      expect(row.riskBand).toBe("medium");
    }
  });

  it("likelihood and criticality are case-insensitive", () => {
    const result = buildTaraTemplate({
      assets: [{ id: 1, name: "A", criticality: "CRITICAL" }],
      scenarios: [{ id: "S1", likelihood: "high" }],
    });
    expect(result.rows[0]).toMatchObject({ inherentLikelihood: 3, inherentImpact: 4, riskScore: 12, riskBand: "critical" });
  });
});

describe("buildTaraTemplate — sorting, summary and shapes", () => {
  it("produces one row per asset x scenario cross product", () => {
    const result = buildTaraTemplate({
      assets: [{ id: 1, name: "A" }, { id: 2, name: "B" }],
      scenarios: [{ id: "S1" }, { id: "S2" }, { id: "S3" }],
    });
    expect(result.rows).toHaveLength(6);
    expect(result.summary.totalRows).toBe(6);
  });

  it("sorts rows by riskScore desc, then assetName asc, then scenarioId asc", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 1, name: "c", criticality: "High" }, // 3
        { id: 2, name: "a", criticality: "Critical" }, // 4
        { id: 3, name: "b", criticality: "Critical" }, // 4
      ],
      scenarios: [
        { id: "S2", likelihood: "High" },
        { id: "S1", likelihood: "High" },
      ],
    });
    // rows: a/4x3=12, b/4x3=12, c/3x3=9 -> (12 tie) assetName asc a,b then c
    expect(result.rows.map((r) => `${r.assetName}:${r.scenarioId}:${r.riskScore}`)).toEqual([
      "a:S1:12",
      "a:S2:12",
      "b:S1:12",
      "b:S2:12",
      "c:S1:9",
      "c:S2:9",
    ]);
  });

  it("caps topRisks at 5 with the same sort order", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 1, name: "A", criticality: "Critical" },
        { id: 2, name: "B", criticality: "High" },
        { id: 3, name: "C", criticality: "Medium" },
        { id: 4, name: "D", criticality: "Low" },
      ],
      scenarios: [{ id: "S1", likelihood: "High" }, { id: "S2", likelihood: "Medium" }],
    });
    expect(result.summary.topRisks).toHaveLength(5);
    expect(result.summary.topRisks.map((r) => `${r.assetName}:${r.scenarioId}:${r.riskScore}`)).toEqual([
      "A:S1:12",
      "B:S1:9",
      "A:S2:8",
      "B:S2:6",
      "C:S1:6",
    ]);
    expect(result.summary.topRisks[0]).toMatchObject({
      assetId: 1,
      assetName: "A",
      scenarioId: "S1",
      riskScore: 12,
      riskBand: "critical",
    });
  });

  it("computes perBand counts and avgRiskScore (1 decimal) across a full spread", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 1, name: "A", criticality: "Critical" },
        { id: 2, name: "B", criticality: "High" },
        { id: 3, name: "C", criticality: "Medium" },
        { id: 4, name: "D", criticality: "Low" },
      ],
      scenarios: [{ id: "S1", likelihood: "High" }, { id: "S2", likelihood: "Medium" }],
    });
    // scores: 12,8,9,6,6,4,3,2 -> critical 2, high 3, medium 2, low 1
    expect(result.summary.perBand).toEqual({ critical: 2, high: 3, medium: 2, low: 1 });
    expect(result.summary.totalRows).toBe(8);
    // (12+8+9+6+6+4+3+2)/8 = 50/8 = 6.25 -> 6.3
    expect(result.summary.avgRiskScore).toBe(6.3);
  });

  it("rounds avgRiskScore to 1 decimal ((12+9+8+6)/4 -> 8.8; (8+6+2)/3 -> 5.3)", () => {
    const run = (assets: unknown[], scenarios: unknown[]) =>
      buildTaraTemplate({ assets: assets as never[], scenarios: scenarios as never[] }).summary.avgRiskScore;
    expect(run([{ id: 1, name: "A", criticality: "Critical" }, { id: 2, name: "B", criticality: "High" }], [{ id: "S1", likelihood: "High" }, { id: "S2", likelihood: "Medium" }])).toBe(8.8); // (12+9+8+6)/4 = 8.75
    expect(run([{ id: 1, name: "A", criticality: "Critical" }, { id: 2, name: "B", criticality: "High" }, { id: 3, name: "C", criticality: "Low" }], [{ id: "S1", likelihood: "Medium" }])).toBe(5.3); // (8+6+2)/3 = 5.33
  });

  it("fills mitigations from recommendedControls, falling back to mitigations, else []", () => {
    const result = buildTaraTemplate({
      assets: [{ id: 1, name: "A", criticality: "High" }],
      scenarios: [
        { id: "S1", recommendedControls: ["A.8.24", "A.8.16"] },
        { id: "S2", mitigations: ["Segment the network"] },
        { id: "S3" },
      ],
    });
    expect(result.rows.find((r) => r.scenarioId === "S1")!.mitigations).toEqual(["A.8.24", "A.8.16"]);
    expect(result.rows.find((r) => r.scenarioId === "S2")!.mitigations).toEqual(["Segment the network"]);
    expect(result.rows.find((r) => r.scenarioId === "S3")!.mitigations).toEqual([]);
  });

  it("resolves nis2Articles from baseThreatId via the taxonomy, or uses explicit overrides", () => {
    const result = buildTaraTemplate({
      assets: [{ id: 1, name: "A", criticality: "High" }],
      scenarios: [
        { id: "S1", baseThreatId: "TH-001" },
        { id: "S2", baseThreatId: "TH-005" },
        { id: "S3", baseThreatId: "TH-999", nis2Articles: ["21(2)(a)"] },
        { id: "S4" },
      ],
    });
    expect(result.rows.find((r) => r.scenarioId === "S1")!.nis2Articles).toEqual(["21(2)(b)", "21(2)(c)"]);
    expect(result.rows.find((r) => r.scenarioId === "S2")!.nis2Articles).toEqual(["21(2)(j)", "21(2)(g)"]);
    expect(result.rows.find((r) => r.scenarioId === "S3")!.nis2Articles).toEqual(["21(2)(a)"]);
    expect(result.rows.find((r) => r.scenarioId === "S4")!.nis2Articles).toEqual([]);
  });

  it("accepts scenarioId or id and falls back safely for missing identifiers", () => {
    const result = buildTaraTemplate({
      assets: [
        { id: 5, name: "A", criticality: "High" },
        { id: 6, criticality: "High" },
        { name: "C", criticality: "High" },
      ],
      scenarios: [
        { scenarioId: "SC-X", title: "T", likelihood: "High" },
        { id: "SC-Y", title: "T", likelihood: "High" },
        { likelihood: "High" },
      ],
    });
    expect(result.rows.find((r) => r.scenarioId === "SC-X")!.scenarioTitle).toBe("T");
    expect(result.rows.find((r) => r.scenarioId === "SC-Y")!.scenarioTitle).toBe("T");
    expect(result.rows.some((r) => r.assetId === 6 && r.assetName === "")).toBe(true);
    expect(result.rows.some((r) => r.assetName === "C" && r.assetId === "")).toBe(true);
  });
});

describe("buildTaraTemplate — malformed input and safety", () => {
  it("returns the zeroed EMPTY shape for non-object input", () => {
    expect(buildTaraTemplate(undefined)).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate(null as never)).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate(42 as never)).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate("nope" as never)).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate([] as never)).toEqual(EMPTY_TARA);
  });

  it("returns the zeroed EMPTY shape when assets are missing / null / non-array / empty", () => {
    expect(buildTaraTemplate({})).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: null })).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: "x" as never })).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: [] as never, scenarios: [{ id: "S1" }] })).toEqual(EMPTY_TARA);
  });

  it("returns the zeroed EMPTY shape when scenarios are missing / null / non-array / empty", () => {
    expect(buildTaraTemplate({ assets: [{ id: 1, name: "A" }] })).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: [{ id: 1, name: "A" }], scenarios: null })).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: [{ id: 1, name: "A" }], scenarios: 42 as never })).toEqual(EMPTY_TARA);
    expect(buildTaraTemplate({ assets: [{ id: 1, name: "A" }], scenarios: [] })).toEqual(EMPTY_TARA);
  });

  it("never throws on garbage rows (null, primitives, invalid enum strings)", () => {
    expect(() =>
      buildTaraTemplate({
        assets: [null, 42, "x", {}, { id: 1, criticality: "bogus" }],
        scenarios: [null, {}, { id: "S", likelihood: "bogus", recommendedControls: "nope" as never }],
      })
    ).not.toThrow();
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = {
      assets: [
        { id: 1, name: "A", criticality: "Critical" },
        { id: 2, name: "B", criticality: "Low" },
      ],
      scenarios: [{ id: "S1", title: "T", likelihood: "High", recommendedControls: ["A.8.24"] }],
    };
    expect(buildTaraTemplate(input)).toEqual(buildTaraTemplate(input));
  });
});

/* ================================================================== */
/* summarizeThreatLandscape                                            */
/* ================================================================== */

const EMPTY_SUMMARY = {
  totalEvents: 0,
  categoryCounts: [],
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
  recentEvents: [],
  trend: { last30d: 0, prior30d: 0, delta: 0 },
  exposureScore: 0,
  recommendations: [],
};

const ev = (over: Record<string, unknown>) => ({
  id: 1,
  title: "mystery",
  severity: "low",
  occurredAt: iso(-5),
  ...over,
});

describe("summarizeThreatLandscape — counts and classification rollups", () => {
  it("counts totalEvents as the length of the events array (garbage rows included)", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1 }),
        ev({ id: 2 }),
        null as never,
        42 as never,
        {},
      ],
      now: NOW.toISOString(),
    });
    expect(result.totalEvents).toBe(5);
  });

  it("aggregates categoryCounts and sorts categoryId ascending", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, title: "Ransomware outbreak" }),
        ev({ id: 2, title: "phishing campaign" }),
        ev({ id: 3, title: "ransomware again" }),
        ev({ id: 4, title: "DDoS flood" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.categoryCounts).toEqual([
      { categoryId: "TH-001", categoryName: "Ransomware", count: 2 },
      { categoryId: "TH-003", categoryName: "DoS/DDoS", count: 1 },
      { categoryId: "TH-005", categoryName: "Phishing", count: 1 },
    ]);
  });

  it("rolls unclassifiable events up under TH-000 / Other", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, title: "odd occurrence" }), ev({ id: 2 }), ev({ id: 3, title: "" })],
      now: NOW.toISOString(),
    });
    expect(result.categoryCounts).toEqual([{ categoryId: "TH-000", categoryName: "Other", count: 3 }]);
  });

  it("returns an empty categoryCounts list for an empty events array", () => {
    const result = summarizeThreatLandscape({ events: [], now: NOW.toISOString() });
    expect(result.categoryCounts).toEqual([]);
  });

  it("coerces severities into the known buckets (invalid -> unknown, case-insensitive)", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, severity: "critical" }),
        ev({ id: 2, severity: "CRITICAL" }),
        ev({ id: 3, severity: "High" }),
        ev({ id: 4, severity: "medium" }),
        ev({ id: 5, severity: "bogus" }),
        ev({ id: 6, severity: null }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.severityCounts).toEqual({ critical: 2, high: 1, medium: 1, low: 0, unknown: 2 });
  });

  it("always exposes all five severityCounts keys, zeroed for empty input", () => {
    const result = summarizeThreatLandscape({ events: [], now: NOW.toISOString() });
    expect(result.severityCounts).toEqual({ critical: 0, high: 0, medium: 0, low: 0, unknown: 0 });
  });
});

describe("summarizeThreatLandscape — recentEvents", () => {
  it("sorts recentEvents by occurredAt descending", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, occurredAt: iso(-10) }),
        ev({ id: 2, occurredAt: iso(-1) }),
        ev({ id: 3, occurredAt: iso(-3) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.recentEvents.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("breaks occurredAt ties by id ascending", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 2, occurredAt: iso(-3) }),
        ev({ id: 1, occurredAt: iso(-3) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.recentEvents.map((e) => e.id)).toEqual([1, 2]);
  });

  it("caps recentEvents at 5 events", () => {
    const result = summarizeThreatLandscape({
      events: Array.from({ length: 7 }, (_, i) => ev({ id: i + 1, occurredAt: iso(-(i + 1)) })),
      now: NOW.toISOString(),
    });
    expect(result.recentEvents).toHaveLength(5);
    expect(result.recentEvents.map((e) => e.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("places events with invalid occurredAt last, sorted by id asc", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 3, occurredAt: iso(-10) }),
        ev({ id: 1, occurredAt: iso(-1) }),
        ev({ id: 5, occurredAt: "not-a-date" }),
        ev({ id: 2, occurredAt: null }),
        ev({ id: 4, occurredAt: undefined }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.recentEvents.map((e) => e.id)).toEqual([1, 3, 2, 4, 5]);
  });

  it("keeps only the earliest invalid rows when the cap cuts into them", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, occurredAt: iso(-1) }),
        ev({ id: 2, occurredAt: iso(-2) }),
        ev({ id: 3, occurredAt: iso(-3) }),
        ev({ id: 9, occurredAt: null }),
        ev({ id: 8, occurredAt: null }),
        ev({ id: 7, occurredAt: null }),
      ],
      now: NOW.toISOString(),
    });
    // 3 valid + 2 smallest invalid ids
    expect(result.recentEvents.map((e) => e.id)).toEqual([1, 2, 3, 7, 8]);
  });

  it("sorts numeric ids before string ids on occurredAt ties", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: "0", occurredAt: iso(-3) }),
        ev({ id: 1, occurredAt: iso(-3) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.recentEvents.map((e) => e.id)).toEqual([1, "0"]);
  });

  it("emits invalid occurredAt rows with occurredAt null and valid rows as ISO strings", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: "not-a-date" }), ev({ id: 2, occurredAt: iso(-1) })],
      now: NOW.toISOString(),
    });
    expect(result.recentEvents.map((e) => e.occurredAt)).toEqual([iso(-1), null]);
  });
});

describe("summarizeThreatLandscape — trend windows vs the injectable clock", () => {
  it("counts last30d within 30 days and prior30d in the 30-60 day window", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, occurredAt: iso(-10) }),
        ev({ id: 2, occurredAt: iso(-5) }),
        ev({ id: 3, occurredAt: iso(-40) }),
        ev({ id: 4, occurredAt: iso(-31) }),
        ev({ id: 5, occurredAt: iso(-61) }), // outside both windows
        ev({ id: 6, occurredAt: iso(+2) }), // future -> outside both windows
      ],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 2, prior30d: 2, delta: 0 });
  });

  it("treats exactly 30 days ago as last30d (>= now - 30d)", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: epoch(-30) })],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 1, prior30d: 0, delta: 1 });
  });

  it("treats 30 days + 1ms ago as prior30d", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: NOW.getTime() - (30 * DAY_MS + 1) })],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 0, prior30d: 1, delta: -1 });
  });

  it("treats 29.999 days ago as last30d", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: NOW.getTime() - 29.999 * DAY_MS })],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 1, prior30d: 0, delta: 1 });
  });

  it("treats exactly 60 days ago as prior30d (>= now - 60d)", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: epoch(-60) })],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 0, prior30d: 1, delta: -1 });
  });

  it("counts an event occurring exactly at `now` as last30d (future-exclusive boundary)", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, occurredAt: epoch(0) }), // exactly now -> last30d
        ev({ id: 2, occurredAt: epoch(1) }), // strictly future -> excluded
      ],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 1, prior30d: 0, delta: 1 });
  });

  it("computes delta = last30d - prior30d", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, occurredAt: iso(-2) }),
        ev({ id: 2, occurredAt: iso(-3) }),
        ev({ id: 3, occurredAt: iso(-35) }),
        ev({ id: 4, occurredAt: iso(-50) }),
        ev({ id: 5, occurredAt: iso(-200) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.trend).toEqual({ last30d: 2, prior30d: 2, delta: 0 });
  });
});

describe("summarizeThreatLandscape — clock injection", () => {
  it("accepts now as an ISO string, epoch number and Date object", () => {
    const events = [
      ev({ id: 1, occurredAt: iso(-10) }),
      ev({ id: 2, occurredAt: iso(-40) }),
    ];
    const byIso = summarizeThreatLandscape({ events, now: NOW.toISOString() });
    const byEpoch = summarizeThreatLandscape({ events, now: NOW.getTime() });
    const byDate = summarizeThreatLandscape({ events, now: NOW });
    expect(byIso.trend).toEqual({ last30d: 1, prior30d: 1, delta: 0 });
    expect(byEpoch).toEqual(byIso);
    expect(byDate).toEqual(byIso);
  });

  it("accepts a clock factory", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: iso(-10) })],
      clock: () => NOW,
    });
    expect(result.trend.last30d).toBe(1);
  });

  it("falls back to the clock factory when `now` is present but invalid", () => {
    const events = [ev({ id: 1, occurredAt: iso(-10) }), ev({ id: 2, occurredAt: iso(-40) })];
    const viaFactory = summarizeThreatLandscape({ events, now: "not-a-date", clock: () => NOW });
    expect(viaFactory).toEqual(summarizeThreatLandscape({ events, now: NOW.toISOString() }));
  });

  it("now takes precedence over the clock factory", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: iso(-10) })],
      now: NOW.toISOString(),
      clock: () => new Date(epoch(999)),
    });
    expect(result.trend).toEqual({ last30d: 1, prior30d: 0, delta: 1 });
  });

  it("tolerates a throwing clock factory (never throws)", () => {
    expect(() =>
      summarizeThreatLandscape({
        events: [ev({ id: 1, occurredAt: iso(+500) })],
        clock: () => {
          throw new Error("boom");
        },
      })
    ).not.toThrow();
  });

  it("falls back to a real clock when no clock is provided (future-dated events keep counts stable)", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: iso(+3650) }), ev({ id: 2, occurredAt: new Date() })],
    });
    expect(result.totalEvents).toBe(2);
    // the future event is never in either window regardless of the real clock
    expect(result.trend.prior30d).toBe(0);
    expect(result.trend.last30d).toBe(1);
  });

  it("event occurredAt accepts Date objects at engine level", () => {
    const result = summarizeThreatLandscape({
      events: [ev({ id: 1, occurredAt: new Date(epoch(-10)) })],
      now: NOW.toISOString(),
    });
    expect(result.trend.last30d).toBe(1);
    expect(result.recentEvents.map((e) => e.id)).toEqual([1]);
  });
});

describe("summarizeThreatLandscape — exposureScore", () => {
  it("follows the documented severity-weighted formula (critical 5, high 4, medium 3, low 2, unknown 1)", () => {
    const run = (severities: string[]) =>
      summarizeThreatLandscape({
        events: severities.map((severity, i) => ev({ id: i + 1, severity })),
        now: NOW.toISOString(),
      }).exposureScore;
    expect(run(["critical"])).toBe(100);
    expect(run(["high"])).toBe(80);
    expect(run(["medium"])).toBe(60);
    expect(run(["low"])).toBe(40);
    expect(run(["bogus"])).toBe(20); // unknown weight 1
    expect(run(["critical", "bogus"])).toBe(60); // (5+1)/10*100
    expect(run(["critical", "high"])).toBe(90); // (5+4)/10*100
  });

  it("rounds fractional exposure scores to 1 decimal (2 critical + 1 medium -> 86.7)", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, severity: "critical" }),
        ev({ id: 2, severity: "critical" }),
        ev({ id: 3, severity: "medium" }),
      ],
      now: NOW.toISOString(),
    });
    // (5+5+3)/15*100 = 86.666.. -> 86.7
    expect(result.exposureScore).toBe(86.7);
  });

  it("is 0 for an empty event list and clamps to [0, 100]", () => {
    const empty = summarizeThreatLandscape({ events: [], now: NOW.toISOString() });
    expect(empty.exposureScore).toBe(0);
    const maxed = summarizeThreatLandscape({
      events: Array.from({ length: 50 }, (_, i) => ev({ id: i + 1, severity: "critical" })),
      now: NOW.toISOString(),
    });
    expect(maxed.exposureScore).toBeLessThanOrEqual(100);
    expect(maxed.exposureScore).toBeGreaterThanOrEqual(0);
  });
});

describe("summarizeThreatLandscape — recommendations", () => {
  it("emits fixed deterministic strings in severity precedence order", () => {
    const result = summarizeThreatLandscape({
      events: [
        ev({ id: 1, severity: "critical" }),
        ev({ id: 2, severity: "critical" }),
        ev({ id: 3, severity: "high" }),
        ev({ id: 4, severity: "bogus" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.recommendations).toEqual([
      "Address 2 critical threat event(s)",
      "Investigate 1 high-severity threat event(s)",
      "Reclassify 1 unclassified threat event(s)",
    ]);
  });

  it("omits zero buckets and never exceeds 5 entries", () => {
    const onlyMedium = summarizeThreatLandscape({
      events: [ev({ id: 1, severity: "medium" }), ev({ id: 2, severity: "medium" })],
      now: NOW.toISOString(),
    });
    expect(onlyMedium.recommendations).toEqual(["Review 2 medium-severity threat event(s)"]);

    const allBuckets = summarizeThreatLandscape({
      events: [
        ev({ id: 1, severity: "critical" }),
        ev({ id: 2, severity: "high" }),
        ev({ id: 3, severity: "medium" }),
        ev({ id: 4, severity: "low" }),
        ev({ id: 5, severity: "unknown-thing" }),
      ],
      now: NOW.toISOString(),
    });
    expect(allBuckets.recommendations).toEqual([
      "Address 1 critical threat event(s)",
      "Investigate 1 high-severity threat event(s)",
      "Review 1 medium-severity threat event(s)",
      "Monitor 1 low-severity threat event(s)",
      "Reclassify 1 unclassified threat event(s)",
    ]);
    expect(allBuckets.recommendations.length).toBeLessThanOrEqual(5);
  });

  it("returns an empty recommendations list for zero events", () => {
    expect(summarizeThreatLandscape({ events: [], now: NOW.toISOString() }).recommendations).toEqual([]);
  });
});

describe("summarizeThreatLandscape — malformed input, sector passthrough and determinism", () => {
  it("returns the zeroed EMPTY shape for malformed input", () => {
    expect(summarizeThreatLandscape(undefined)).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape(null as never)).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape(42 as never)).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape("nope" as never)).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape([] as never)).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape({ events: "nope" as never })).toEqual(EMPTY_SUMMARY);
    expect(summarizeThreatLandscape({ events: {} as never })).toEqual(EMPTY_SUMMARY);
  });

  it("returns the zeroed EMPTY shape for a valid empty events array", () => {
    expect(summarizeThreatLandscape({ events: [], now: NOW.toISOString() })).toEqual(EMPTY_SUMMARY);
  });

  it("never throws on garbage rows", () => {
    expect(() =>
      summarizeThreatLandscape({
        events: [
          null,
          42,
          "x",
          {},
          { id: 1, occurredAt: "not-a-date", severity: 7 as never, title: true as never },
          { id: 2, occurredAt: Number.NaN },
        ],
        now: NOW.toISOString(),
      })
    ).not.toThrow();
  });

  it("accepts a sector string without changing the deterministic output", () => {
    const base = { events: [ev({ id: 1, title: "Ransomware", severity: "critical", occurredAt: iso(-5) })], now: NOW.toISOString() };
    const withSector = summarizeThreatLandscape({ ...base, sector: "Finance" });
    const withoutSector = summarizeThreatLandscape(base);
    expect(withSector).toEqual(withoutSector);
    expect(() => summarizeThreatLandscape({ ...base, sector: 42 as never })).not.toThrow();
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = {
      events: [
        ev({ id: 1, title: "Ransomware outbreak", severity: "critical", occurredAt: iso(-2) }),
        ev({ id: 2, title: "phishing campaign", severity: "high", occurredAt: iso(-40) }),
        ev({ id: 3, title: "mystery", severity: "bogus", occurredAt: "nope" }),
      ],
      now: NOW.toISOString(),
    };
    expect(summarizeThreatLandscape(input)).toEqual(summarizeThreatLandscape(input));
  });
});
