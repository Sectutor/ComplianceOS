/**
 * NIS2 Threat Landscape Integration engine.
 *
 * Cycle 25 (NIS2 Implementation Plan Phase 1 Task 1.1 — ENISA Measure 2.1
 * "Risk Management Framework" / NIS2 Article 21(1) and 21(2)(a)): classifies
 * threat events against the ENISA Threat Taxonomy 2024, generates sector
 * threat scenarios from a built-in catalog, builds a Threat and Risk
 * Assessment (TARA) workbook over assets x scenarios, and summarizes the
 * whole landscape (category/severity rollups, recent events, 30-day trend,
 * exposure score and recommendations).
 * Pure view-model logic — no DB, no network, no side effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/securityMetrics.ts and
 * lib/nis2/evidenceRepository.ts):
 * - Pure and deterministic: no I/O, no DB, no random sources, no
 *   iteration-order dependent logic. Same input always yields the same
 *   output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   dates, NaN numbers, non-array collections, unknown enum strings) is
 *   coerced to safe neutral values and yields the documented safe shape
 *   (the exported EMPTY_* frozen constants).
 * - Injectable clock: each function accepts an optional `now` (epoch-ms
 *   number, ISO-8601 string or Date) or a `clock` factory `() => Date`;
 *   when both are missing it defaults to the current time. Tests may pin
 *   the clock for reproducibility. Date objects for row timestamps are also
 *   accepted by the engine (never throws); the tRPC layer rejects them with
 *   BAD_REQUEST before they reach the engine.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h).
 * - All numeric outputs are rounded deterministically: averages/scores to
 *   1 decimal (half-up), counts to whole numbers.
 */

import { ENISA_THREAT_TAXONOMY } from "../../lib/threat-intel/enisa-taxonomy";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by the engine functions. */
export interface ThreatLandscapeOptions {
  /** Pin "now": ISO-8601 string, epoch-ms number or Date object. */
  now?: string | number | Date | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** ENISA impact level of a classified threat (taxonomy contract). */
export type ThreatImpactLevel = "Low" | "Medium" | "High" | "Critical";

/** Coerced severity bucket used by the landscape summary. */
export type ThreatLandscapeSeverity = "critical" | "high" | "medium" | "low" | "unknown";

/** Scenario likelihood value honored by the TARA engine. */
export type ThreatScenarioLikelihood = "Low" | "Medium" | "High";

/** TARA risk band derived from the 1-12 risk score. */
export type TaraRiskBand = "critical" | "high" | "medium" | "low";

/* --- threatLandscape.classify --------------------------------------- */

/** One event row fed into `classifyThreatEvent`. */
export interface ThreatEventInput {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  source?: string | null;
}

/** Output of `classifyThreatEvent`. */
export interface ThreatClassification {
  id: string | number;
  title: string;
  categoryId: string;
  categoryName: string;
  impactLevel: ThreatImpactLevel;
  nis2Articles: string[];
  matchedKeywords: string[];
  confidence: number;
}

/* --- threatLandscape.scenarios -------------------------------------- */

/** Input for `generateThreatScenarios`. */
export interface ThreatScenariosInput {
  sector?: string | null;
  limit?: number | null;
}

/** One threat scenario item (ENISA category + NIS2 articles attached). */
export interface ThreatScenarioItem {
  id: string;
  title: string;
  description: string;
  baseThreatId: string;
  categoryId: string;
  categoryName: string;
  likelihood: ThreatScenarioLikelihood;
  potentialImpact: string;
  recommendedControls: string[];
  industrySector: string[];
  nis2Articles: string[];
}

/** Output of `generateThreatScenarios`. */
export interface ThreatScenariosResponse {
  items: ThreatScenarioItem[];
  total: number;
}

/* --- threatLandscape.tara ------------------------------------------- */

/** One asset row fed into `buildTaraTemplate`. */
export interface TaraAssetInput {
  id?: string | number | null;
  name?: string | null;
  criticality?: string | null;
}

/** One scenario row accepted by `buildTaraTemplate` (prefer the output of `generateThreatScenarios`). */
export interface TaraScenarioInput {
  id?: string | number | null;
  /** Alternative identifier field (accepted alongside `id`). */
  scenarioId?: string | number | null;
  title?: string | null;
  description?: string | null;
  baseThreatId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  likelihood?: string | null;
  potentialImpact?: string | null;
  recommendedControls?: string[] | null;
  /** Fallback mitigation list used when `recommendedControls` is absent. */
  mitigations?: string[] | null;
  industrySector?: string[] | null;
  nis2Articles?: string[] | null;
}

/** Input for `buildTaraTemplate`. */
export interface TaraTemplateInput {
  assets?: Array<TaraAssetInput> | null;
  scenarios?: Array<TaraScenarioInput> | null;
}

/** One computed TARA row (asset x scenario). */
export interface TaraRow {
  assetId: string | number;
  assetName: string;
  scenarioId: string | number;
  scenarioTitle: string;
  categoryId: string;
  categoryName: string;
  inherentLikelihood: number;
  inherentImpact: number;
  riskScore: number;
  riskBand: TaraRiskBand;
  mitigations: string[];
  nis2Articles: string[];
}

/** One top-risk entry of the TARA summary. */
export interface TaraTopRisk {
  assetId: string | number;
  assetName: string;
  scenarioId: string | number;
  riskScore: number;
  riskBand: TaraRiskBand;
}

/** TARA rollup summary. */
export interface TaraSummary {
  totalRows: number;
  perBand: { critical: number; high: number; medium: number; low: number };
  avgRiskScore: number;
  topRisks: TaraTopRisk[];
}

/** Output of `buildTaraTemplate`. */
export interface TaraTemplateResponse {
  rows: TaraRow[];
  summary: TaraSummary;
}

/* --- threatLandscape.summary ---------------------------------------- */

/** One threat event row fed into `summarizeThreatLandscape`. */
export interface ThreatLandscapeEventInput {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  occurredAt?: Date | string | number | null;
}

/** Input for `summarizeThreatLandscape`. */
export interface ThreatLandscapeSummaryInput extends ThreatLandscapeOptions {
  events?: Array<ThreatLandscapeEventInput> | null;
  sector?: string | null;
}

/** Category count entry of the landscape summary. */
export interface ThreatCategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}

/** One recent event row of the landscape summary. */
export interface RecentThreatEvent {
  id: string | number;
  title: string;
  categoryId: string;
  categoryName: string;
  severity: ThreatLandscapeSeverity;
  /** ISO-8601 timestamp when valid; null when the input occurredAt is invalid. */
  occurredAt: string | null;
}

/** 30-day trend window vs the injected clock. */
export interface ThreatTrend {
  last30d: number;
  prior30d: number;
  /** last30d - prior30d. */
  delta: number;
}

/** Output of `summarizeThreatLandscape`. */
export interface ThreatLandscapeSummary {
  totalEvents: number;
  categoryCounts: ThreatCategoryCount[];
  severityCounts: Record<ThreatLandscapeSeverity, number>;
  recentEvents: RecentThreatEvent[];
  trend: ThreatTrend;
  /** 0-100 exposure score (see the function JSDoc for the formula). */
  exposureScore: number;
  recommendations: string[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cap on deterministic recommendations in the landscape summary. */
const MAX_RECOMMENDATIONS = 5;
/** Cap on recent events in the landscape summary. */
const MAX_RECENT_EVENTS = 5;
/** Cap on top risks in the TARA summary. */
const MAX_TOP_RISKS = 5;
/** ENISA fallback category used when no taxonomy entry matches. */
const UNCLASSIFIED_CATEGORY_ID = "TH-000";

/** Numeric score per scenario likelihood (invalid/missing -> 1). */
const LIKELIHOOD_SCORE: Readonly<Record<string, number>> = deepFreeze({
  low: 1,
  medium: 2,
  high: 3,
});

/** Numeric score per asset criticality (invalid/missing -> 1). */
const CRITICALITY_SCORE: Readonly<Record<string, number>> = deepFreeze({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
});

/** Numeric exposure weight per severity bucket (invalid -> unknown weight). */
const SEVERITY_WEIGHT: Readonly<Record<ThreatLandscapeSeverity, number>> = deepFreeze({
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  unknown: 1,
});

/** Valid severity buckets (anything else coerces to "unknown"). */
const VALID_SEVERITIES: ReadonlySet<string> = new Set([
  "critical",
  "high",
  "medium",
  "low",
]);

/**
 * QA-pinned keyword catalog keyed to the ENISA taxonomy ids. Entries mirror
 * the taxonomy order (TH-001..TH-008); matching is case-insensitive
 * substring over the event title (first) then description. The winning
 * category is the one with the MOST matched keywords (ties break toward the
 * earliest entry); matchedKeywords are reported in this map's order.
 */
const THREAT_KEYWORD_CATALOG: ReadonlyArray<{
  threatId: string;
  keywords: readonly string[];
}> = deepFreeze([
  {
    threatId: "TH-001",
    keywords: ["ransomware", "ransom", "encryption", "double extortion", "extortion"],
  },
  {
    threatId: "TH-002",
    keywords: ["malware", "trojan", "spyware", "botnet", "keylogger"],
  },
  {
    threatId: "TH-003",
    keywords: ["ddos", "denial of service", "dos", "flood", "volumetric"],
  },
  {
    threatId: "TH-004",
    keywords: ["supply chain", "third-party", "third party", "vendor", "supplier"],
  },
  {
    threatId: "TH-005",
    keywords: ["phishing", "spear-phishing", "spear phishing", "bec", "business email compromise"],
  },
  {
    threatId: "TH-006",
    keywords: ["insider", "insider threat", "disgruntled", "employee", "privileged access misuse"],
  },
  {
    threatId: "TH-007",
    keywords: ["zero-day", "zero day", "zeroday", "0-day", "0day"],
  },
  {
    threatId: "TH-008",
    keywords: ["physical", "natural disaster", "power grid", "earthquake", "data center"],
  },
]);

/**
 * Built-in sector scenario catalog (frozen, deterministic catalog order).
 * Mirrors lib/threat-intel/scenario-generator.ts: one scenario per covered
 * sector plus the general "Any" scenario; every item carries its ENISA
 * category (categoryId / categoryName) and the NIS2 articles of its base
 * threat.
 */
const THREAT_SCENARIO_CATALOG: ReadonlyArray<ThreatScenarioItem> = deepFreeze([
  {
    id: "SC-FIN-01",
    title: "Financial Transaction Interception",
    description:
      "Man-in-the-middle attack targeting SWIFT/SEPA transaction processing systems.",
    baseThreatId: "TH-002",
    categoryId: "TH-002",
    categoryName: "Malware",
    likelihood: "Medium",
    potentialImpact: "High financial loss and regulatory fines under NIS2.",
    recommendedControls: ["A.8.24", "A.8.16"],
    industrySector: ["Finance", "Banking"],
    nis2Articles: ["21(2)(d)", "21(2)(j)"],
  },
  {
    id: "SC-HC-01",
    title: "Patient Data Ransomware",
    description:
      "Targeted ransomware attack on Hospital Information Systems (HIS) causing operational shutdown.",
    baseThreatId: "TH-001",
    categoryId: "TH-001",
    categoryName: "Ransomware",
    likelihood: "High",
    potentialImpact: "Threat to life and massive data privacy breach (GDPR + NIS2).",
    recommendedControls: ["A.5.29", "A.8.1"],
    industrySector: ["Healthcare", "Pharma"],
    nis2Articles: ["21(2)(b)", "21(2)(c)"],
  },
  {
    id: "SC-MFG-01",
    title: "Industrial Control System Sabotage",
    description:
      "Compromise of OT networks leading to unauthorized manipulation of manufacturing equipment.",
    baseThreatId: "TH-006",
    categoryId: "TH-006",
    categoryName: "Insider",
    likelihood: "Low",
    potentialImpact: "Physical damage to assets and environmental risk.",
    recommendedControls: ["A.8.20", "A.7.12"],
    industrySector: ["Manufacturing", "Energy"],
    nis2Articles: ["21(2)(i)", "21(2)(j)"],
  },
  {
    id: "SC-GEN-01",
    title: "Phishing of High-Privilege Admin",
    description:
      "Spear-phishing targeting IT admins to gain cloud infrastructure control.",
    baseThreatId: "TH-005",
    categoryId: "TH-005",
    categoryName: "Phishing",
    likelihood: "High",
    potentialImpact: "Full infrastructure takeover and data exfiltration.",
    recommendedControls: ["A.5.15", "A.8.5"],
    industrySector: ["Any"],
    nis2Articles: ["21(2)(j)", "21(2)(g)"],
  },
]);

/** Zeroed threat classification (exported safe shape for malformed input). */
export const EMPTY_THREAT_CLASSIFICATION: ThreatClassification = deepFreeze({
  id: "",
  title: "",
  categoryId: UNCLASSIFIED_CATEGORY_ID,
  categoryName: "Other",
  impactLevel: "Medium",
  nis2Articles: [],
  matchedKeywords: [],
  confidence: 0,
});

/** Empty threat scenario list (exported safe shape for malformed input). */
export const EMPTY_THREAT_SCENARIO_LIST: ThreatScenariosResponse = deepFreeze({
  items: [],
  total: 0,
});

/** Empty TARA workbook (exported safe shape for malformed input). */
export const EMPTY_TARA_TEMPLATE: TaraTemplateResponse = deepFreeze({
  rows: [],
  summary: {
    totalRows: 0,
    perBand: { critical: 0, high: 0, medium: 0, low: 0 },
    avgRiskScore: 0,
    topRisks: [],
  },
});

/** Empty threat landscape summary (exported safe shape for malformed input). */
export const EMPTY_THREAT_LANDSCAPE_SUMMARY: ThreatLandscapeSummary = deepFreeze({
  totalEvents: 0,
  categoryCounts: [],
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
  recentEvents: [],
  trend: { last30d: 0, prior30d: 0, delta: 0 },
  exposureScore: 0,
  recommendations: [],
});

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** True for plain non-null, non-array objects. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively freeze plain objects and arrays (frozen-constant contract). */
function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value);
  }
  if (isObject(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    return Object.freeze(value);
  }
  return value;
}

/** Coerce a value to epoch milliseconds, or null when invalid. */
const toTimeMs = (value: unknown): number | null => {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
};

/** Resolve the injectable clock from an options-like object, else current time. */
const toClock = (opts: unknown): Date => {
  const options = isObject(opts) ? opts : {};
  const now = toTimeMs(options.now);
  if (now !== null) {
    return new Date(now);
  }
  if (typeof options.clock === "function") {
    try {
      const fromClock = options.clock();
      if (fromClock instanceof Date && !Number.isNaN(fromClock.getTime())) {
        return fromClock;
      }
    } catch {
      // a throwing clock factory must never break the engine - fall through
    }
  }
  return new Date();
};

/** Coerce an id-like field to the emitted id value, or "" when missing. */
const toIdValue = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

/** Coerce a name; missing/non-string -> "". */
const toName = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

/** Coerce a severity; missing/invalid -> "unknown". */
const toSeverity = (value: unknown): ThreatLandscapeSeverity => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (VALID_SEVERITIES.has(normalized)) {
      return normalized as ThreatLandscapeSeverity;
    }
  }
  return "unknown";
};

/** Round to 1 decimal, half-up, compensating floating-point error and -0. */
const round1 = (value: number): number => {
  const rounded = Math.round((value + 1e-12) * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

/** Compare id values ascending (numbers numerically before strings lexically). */
const compareIdsAsc = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a.localeCompare(b);
};

/** Non-empty trimmed strings, deduplicated, in first-seen order. */
const toUniqueStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const trimmed = typeof entry === "string" ? entry.trim() : "";
    if (trimmed === "" || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

/**
 * TARA risk band from a 1-12 risk score: critical >= 9, high >= 6,
 * medium >= 3, low < 3.
 */
const toRiskBand = (riskScore: number): TaraRiskBand => {
  if (riskScore >= 9) return "critical";
  if (riskScore >= 6) return "high";
  if (riskScore >= 3) return "medium";
  return "low";
};

/** NIS2 articles of a taxonomy base threat by id, or [] when unknown. */
const taxonomyArticlesFor = (baseThreatId: string): string[] => {
  const threat = ENISA_THREAT_TAXONOMY.find((entry) => entry.id === baseThreatId);
  return threat ? [...threat.nis2ArticleMapping] : [];
};

/* ------------------------------------------------------------------ */
/* Classification internals                                            */
/* ------------------------------------------------------------------ */

interface TextMatches {
  /** Matched keywords per taxonomy id, in catalog order. */
  byCategory: Map<string, string[]>;
  total: number;
}

interface Span {
  start: number;
  end: number;
}

/**
 * Match the QA-pinned keyword catalog against one lowercase text.
 *
 * An occurrence of a keyword only counts when it does NOT fall strictly
 * inside the text span of an already-matched (longer) keyword occurrence —
 * e.g. the "dos" inside a matched "ddos", the "ransom" inside a matched
 * "ransomware", or the "extortion" inside a matched "double extortion" are
 * the SAME hit, not extra ones. Supersets still count alongside their
 * substrings ("spear-phishing" alongside "phishing", "insider threat"
 * alongside "insider"), and a standalone second occurrence of a contained
 * keyword counts again ("double extortion extortion" yields both keywords).
 *
 * Returns the matched canonical keywords per category (catalog order) and
 * the overall matched-keyword count.
 */
const matchKeywordsInText = (lowerText: string): TextMatches => {
  const spans: Span[] = [];
  const byCategory = new Map<string, string[]>();
  let total = 0;

  for (const group of THREAT_KEYWORD_CATALOG) {
    const matched: string[] = [];
    for (const keyword of group.keywords) {
      const kw = keyword.toLowerCase();
      if (kw === "") continue;
      let added = false;
      let idx = lowerText.indexOf(kw);
      while (idx !== -1) {
        const end = idx + kw.length;
        const contained = spans.some((span) => idx >= span.start && end <= span.end);
        if (!contained) {
          spans.push({ start: idx, end });
          added = true;
        }
        idx = lowerText.indexOf(kw, idx + 1);
      }
      if (added) {
        matched.push(keyword);
      }
    }
    if (matched.length > 0) {
      byCategory.set(group.threatId, matched);
      total += matched.length;
    }
  }

  return { byCategory, total };
};

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Classify a threat event against the ENISA Threat Taxonomy 2024
 * (lib/threat-intel/enisa-taxonomy.ts) using the QA-pinned keyword map.
 *
 * Matching rule: the title is scanned first; if ANY title keyword hits,
 * those hits win (title takes precedence over the description). Otherwise
 * the description is scanned. The winning category is the one with the MOST
 * matched keywords; ties break toward the earliest taxonomy entry
 * (TH-001 < TH-002 < ...). matchedKeywords are the canonical (lowercase,
 * deduplicated) keyword strings in taxonomy-map order.
 *
 * confidence = min(1, 0.2 * matchedKeywords.length) rounded to 1 decimal
 * (1 keyword -> 0.2, 2 -> 0.4, ... 5+ -> 1.0). Fallback (no match):
 * categoryId "TH-000", categoryName "Other", impactLevel "Medium",
 * confidence 0, matchedKeywords [] and nis2Articles []. categoryName mirrors
 * the taxonomy `category` label; impactLevel and nis2Articles pass through
 * from the matched taxonomy entry; id/title pass through with "" fallbacks.
 * Never throws - malformed input yields `EMPTY_THREAT_CLASSIFICATION`.
 */
export function classifyThreatEvent(
  event: ThreatEventInput | null | undefined
): ThreatClassification {
  if (!isObject(event)) {
    return { ...EMPTY_THREAT_CLASSIFICATION };
  }
  const id = toIdValue(event.id);
  const title = toName(event.title);
  const description = toName(event.description);

  let matches = matchKeywordsInText(title.toLowerCase());
  if (matches.total === 0) {
    matches = matchKeywordsInText(description.toLowerCase());
  }

  if (matches.total === 0) {
    return {
      id,
      title,
      categoryId: UNCLASSIFIED_CATEGORY_ID,
      categoryName: "Other",
      impactLevel: "Medium",
      nis2Articles: [],
      matchedKeywords: [],
      confidence: 0,
    };
  }

  // Winner: most matched keywords; ties break toward the earliest catalog entry.
  let winnerId = UNCLASSIFIED_CATEGORY_ID;
  let winnerKeywords: string[] = [];
  for (const group of THREAT_KEYWORD_CATALOG) {
    const found = matches.byCategory.get(group.threatId);
    if (found && found.length > winnerKeywords.length) {
      winnerId = group.threatId;
      winnerKeywords = found;
    }
  }

  const threat = ENISA_THREAT_TAXONOMY.find((entry) => entry.id === winnerId);
  if (!threat) {
    return { ...EMPTY_THREAT_CLASSIFICATION, id, title };
  }

  return {
    id,
    title,
    categoryId: threat.id,
    categoryName: threat.category,
    impactLevel: threat.impactLevel,
    nis2Articles: [...threat.nis2ArticleMapping],
    matchedKeywords: winnerKeywords,
    confidence: Math.min(1, round1(0.2 * winnerKeywords.length)),
  };
}

/**
 * Generate threat scenarios for a sector from the built-in catalog (a frozen
 * mirror of lib/threat-intel/scenario-generator.ts with ENISA category and
 * NIS2 articles attached), returned in deterministic catalog order.
 *
 * Sector match (case-insensitive): a scenario qualifies when it carries the
 * "Any" tag OR the lowercased input sector CONTAINS one of the scenario's
 * sector tokens (so "Banking Group Ltd" matches "Banking"). Missing, empty,
 * blank or non-string sector -> the general ("Any") scenarios only.
 * `limit` (positive finite number, floored) is applied LAST, after sector
 * matching; 0 / negative / NaN / Infinity are ignored. Omitted input
 * (`undefined`) behaves like `{}` (the documented defaults). Malformed
 * (other non-object) input yields `EMPTY_THREAT_SCENARIO_LIST`
 * { items: [], total: 0 }. Never throws.
 */
export function generateThreatScenarios(
  input: ThreatScenariosInput | null | undefined
): ThreatScenariosResponse {
  // Omitted argument behaves exactly like an empty options object (defaults),
  // NOT like the malformed empty shape.
  if (input === undefined) {
    input = {};
  }
  if (!isObject(input)) {
    return { ...EMPTY_THREAT_SCENARIO_LIST };
  }

  const sector = typeof input.sector === "string" ? input.sector.trim().toLowerCase() : "";
  const rawLimit = input.limit;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.floor(rawLimit)
      : null;

  const isGeneral = (scenario: ThreatScenarioItem): boolean =>
    scenario.industrySector.some((entry) => typeof entry === "string" && entry.trim().toLowerCase() === "any");

  let matched: ReadonlyArray<ThreatScenarioItem>;
  if (sector === "") {
    matched = THREAT_SCENARIO_CATALOG.filter(isGeneral);
  } else {
    matched = THREAT_SCENARIO_CATALOG.filter(
      (scenario) =>
        isGeneral(scenario) ||
        scenario.industrySector.some(
          (entry) => typeof entry === "string" && sector.includes(entry.trim().toLowerCase())
        )
    );
  }

  const sliced = limit !== null ? matched.slice(0, limit) : matched;
  const items = sliced.map((item) => ({
    ...item,
    recommendedControls: [...item.recommendedControls],
    industrySector: [...item.industrySector],
    nis2Articles: [...item.nis2Articles],
  }));
  return { items, total: items.length };
}

/**
 * Build a Threat and Risk Assessment (TARA) workbook: one row per asset x
 * applicable scenario. inherentLikelihood maps the scenario likelihood
 * (Low 1 / Medium 2 / High 3; unknown -> 1); inherentImpact maps the asset
 * criticality (Critical 4 / High 3 / Medium 2 / Low 1; unknown/absent -> 1);
 * riskScore = inherentLikelihood * inherentImpact (integer 1..12); riskBand:
 * critical >= 9, high >= 6, medium >= 3, low < 3. mitigations come from the
 * scenario's recommendedControls, falling back to its mitigations, else [].
 * nis2Articles come from the scenario when provided, else from the taxonomy
 * base-threat lookup, else []. Scenario rows accept either `scenarioId` or
 * `id`; assets without a name fall back to "". Rows sort riskScore DESC,
 * then assetName ASC, then scenarioId ASC. The summary reports totalRows,
 * perBand counts, avgRiskScore (1 decimal, half-up) and the top 5 risks
 * (same sort). Never throws - malformed input (non-object, or missing /
 * null / non-array / empty assets or scenarios) yields the zeroed
 * `EMPTY_TARA_TEMPLATE`.
 */
export function buildTaraTemplate(
  input: TaraTemplateInput | null | undefined
): TaraTemplateResponse {
  if (!isObject(input)) {
    return { ...EMPTY_TARA_TEMPLATE };
  }
  const rawAssets = Array.isArray(input.assets) ? input.assets : [];
  const rawScenarios = Array.isArray(input.scenarios) ? input.scenarios : [];

  const rows: TaraRow[] = [];
  for (const rawAsset of rawAssets) {
    const asset = isObject(rawAsset) ? rawAsset : {};
    const assetId = toIdValue(asset.id);
    const assetName = toName(asset.name);
    const criticality = toName(asset.criticality).toLowerCase();
    const inherentImpact = CRITICALITY_SCORE[criticality] ?? 1;

    for (const rawScenario of rawScenarios) {
      const scenario = isObject(rawScenario) ? rawScenario : {};
      const scenarioId = toIdValue(scenario.scenarioId ?? scenario.id);
      const scenarioTitle = toName(scenario.title);
      const categoryId = toName(scenario.categoryId);
      const categoryName = toName(scenario.categoryName);
      const baseThreatId = toName(scenario.baseThreatId);
      const likelihood = toName(scenario.likelihood).toLowerCase();
      const inherentLikelihood = LIKELIHOOD_SCORE[likelihood] ?? 1;
      const riskScore = inherentLikelihood * inherentImpact;

      const scenarioArticles = toUniqueStrings(scenario.nis2Articles);
      const nis2Articles =
        scenarioArticles.length > 0 ? scenarioArticles : taxonomyArticlesFor(baseThreatId);

      const controls = toUniqueStrings(scenario.recommendedControls);
      const mitigations =
        controls.length > 0 ? controls : toUniqueStrings(scenario.mitigations);

      rows.push({
        assetId,
        assetName,
        scenarioId,
        scenarioTitle,
        categoryId,
        categoryName,
        inherentLikelihood,
        inherentImpact,
        riskScore,
        riskBand: toRiskBand(riskScore),
        mitigations,
        nis2Articles,
      });
    }
  }

  rows.sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      a.assetName.localeCompare(b.assetName) ||
      compareIdsAsc(a.scenarioId, b.scenarioId)
  );

  const perBand: TaraSummary["perBand"] = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    perBand[row.riskBand] += 1;
  }
  const avgRiskScore =
    rows.length > 0
      ? round1(rows.reduce((sum, row) => sum + row.riskScore, 0) / rows.length)
      : 0;
  const topRisks: TaraTopRisk[] = rows.slice(0, MAX_TOP_RISKS).map((row) => ({
    assetId: row.assetId,
    assetName: row.assetName,
    scenarioId: row.scenarioId,
    riskScore: row.riskScore,
    riskBand: row.riskBand,
  }));

  return {
    rows,
    summary: {
      totalRows: rows.length,
      perBand,
      avgRiskScore,
      topRisks,
    },
  };
}

/**
 * Summarize the threat landscape: total events (garbage rows included);
 * category counts (each event classified through `classifyThreatEvent`,
 * unclassified rows rolled up under TH-000/Other, sorted categoryId asc)
 * and severity counts (all five buckets always present, invalid severities
 * coerced to "unknown"); the top 5 recent events sorted occurredAt DESC
 * then id ASC (numeric ids before string ids) with invalid/missing
 * occurredAt rows sorting LAST (id asc among themselves) and emitted with
 * occurredAt null (valid rows as ISO-8601 strings); a 30-day trend vs the
 * injectable clock (last30d = events aged 0..30 days, prior30d = events
 * aged 30..60 days, future-dated and invalid events excluded,
 * delta = last30d - prior30d); an exposureScore in [0,100] =
 * round1(100 * sum(severity weights) / (n * 5)) with weights critical 5,
 * high 4, medium 3, low 2, unknown 1 (0 when empty); and up to 5 fixed
 * deterministic recommendations in severity precedence order
 * (critical -> high -> medium -> low -> unknown, zero buckets omitted).
 * The optional `sector` is accepted for API compatibility and does not
 * change the output. Never throws - malformed input (non-object, or a
 * non-array `events` value) yields the zeroed
 * `EMPTY_THREAT_LANDSCAPE_SUMMARY`.
 */
export function summarizeThreatLandscape(
  input: ThreatLandscapeSummaryInput | null | undefined
): ThreatLandscapeSummary {
  if (!isObject(input)) {
    return { ...EMPTY_THREAT_LANDSCAPE_SUMMARY };
  }
  const rawEvents = input.events;
  if (rawEvents !== undefined && rawEvents !== null && !Array.isArray(rawEvents)) {
    return { ...EMPTY_THREAT_LANDSCAPE_SUMMARY };
  }
  const nowMs = toClock(input).getTime();

  interface NormalizedEvent {
    id: string | number;
    title: string;
    severity: ThreatLandscapeSeverity;
    categoryId: string;
    categoryName: string;
    occurredMs: number | null;
    occurredAt: string | null;
  }

  const normalized: NormalizedEvent[] = [];
  for (const rawEvent of Array.isArray(rawEvents) ? rawEvents : []) {
    const row = isObject(rawEvent) ? rawEvent : {};
    const classification = classifyThreatEvent(row as ThreatEventInput);
    const occurredMs = toTimeMs(row.occurredAt);
    normalized.push({
      id: toIdValue(row.id),
      title: toName(row.title),
      severity: toSeverity(row.severity),
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      occurredMs,
      occurredAt: occurredMs !== null ? new Date(occurredMs).toISOString() : null,
    });
  }

  const severityCounts: Record<ThreatLandscapeSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
  const categoryMap = new Map<string, ThreatCategoryCount>();
  for (const event of normalized) {
    severityCounts[event.severity] += 1;
    const existing = categoryMap.get(event.categoryId);
    if (existing) {
      existing.count += 1;
    } else {
      categoryMap.set(event.categoryId, {
        categoryId: event.categoryId,
        categoryName: event.categoryName,
        count: 1,
      });
    }
  }

  const categoryCounts = [...categoryMap.values()].sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId)
  );

  const recentEvents = [...normalized]
    .sort((a, b) => {
      const aValid = a.occurredMs !== null;
      const bValid = b.occurredMs !== null;
      // Valid timestamps first, most recent first; invalid rows sort LAST.
      if (aValid && bValid && a.occurredMs !== b.occurredMs) {
        return b.occurredMs! - a.occurredMs!;
      }
      if (aValid !== bValid) {
        return aValid ? -1 : 1;
      }
      // Ties (and the invalid tail) break by id ascending.
      return compareIdsAsc(a.id, b.id);
    })
    .slice(0, MAX_RECENT_EVENTS)
    .map(({ id, title, categoryId, categoryName, severity, occurredAt }) => ({
      id,
      title,
      categoryId,
      categoryName,
      severity,
      occurredAt,
    }));

  let last30d = 0;
  let prior30d = 0;
  for (const event of normalized) {
    const ms = event.occurredMs;
    if (ms === null || ms > nowMs) continue;
    const ageMs = nowMs - ms;
    if (ageMs <= 30 * DAY_MS) {
      last30d += 1;
    } else if (ageMs <= 60 * DAY_MS) {
      prior30d += 1;
    }
  }
  const trend: ThreatTrend = { last30d, prior30d, delta: last30d - prior30d };

  let weightSum = 0;
  for (const event of normalized) {
    weightSum += SEVERITY_WEIGHT[event.severity];
  }
  const exposureScore =
    normalized.length > 0
      ? Math.min(100, Math.max(0, round1((100 * weightSum) / (normalized.length * 5))))
      : 0;

  const recommendationTemplates: ReadonlyArray<[ThreatLandscapeSeverity, string]> = [
    ["critical", "Address ${n} critical threat event(s)"],
    ["high", "Investigate ${n} high-severity threat event(s)"],
    ["medium", "Review ${n} medium-severity threat event(s)"],
    ["low", "Monitor ${n} low-severity threat event(s)"],
    ["unknown", "Reclassify ${n} unclassified threat event(s)"],
  ];
  const recommendations: string[] = [];
  for (const [severity, template] of recommendationTemplates) {
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;
    const count = severityCounts[severity];
    if (count > 0) {
      recommendations.push(template.replace("${n}", String(count)));
    }
  }

  return {
    totalEvents: normalized.length,
    categoryCounts,
    severityCounts,
    recentEvents,
    trend,
    exposureScore,
    recommendations,
  };
}
