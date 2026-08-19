/**
 * NIS2 Article 23 incident classification & severity scoring engine.
 *
 * Cycle 15 (NIS2 Implementation Plan Phase 2 Task 2.1, Must Have #1): turns raw
 * incident signals into a deterministic significance assessment, a 0-100
 * severity score, an ENISA threat-category match, and concrete NIS2 reporting
 * deadlines with live statuses.
 *
 * Design rules (house pattern — mirrors lib/vendor/vendorRisk.ts and
 * lib/ai/copilot.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no iteration-order
 *   dependent logic. Same input always yields the same output.
 * - NEVER throws: malformed input (missing/invalid dates, negative numbers,
 *   NaN, non-object input) is clamped to 0 / treated as false and yields a
 *   neutral safe shape.
 * - Injectable clock: `now` parameters default to `new Date()` but can be
 *   pinned in tests.
 *
 * Significance model — NIS2 Article 23(3):
 *   An incident is significant when ANY of the following holds:
 *     - operational disruption > 120 minutes
 *     - more than 1000 users affected
 *     - financial loss > EUR 10,000 (1,000,000 euro-cents)
 *     - impact on public safety / public health
 *     - critical infrastructure or essential services affected
 *     - confidentiality, integrity or authenticity of data compromised
 *     - cross-border impact (multiple member states affected)
 *
 * Severity model (additive, weighted, clamped to 0-100):
 *     public safety            +40   critical infrastructure   +35
 *     data integrity           +30   cross-border impact       +20
 *     affectedUsers > 1000     +20   durationMinutes > 120     +15
 *     financialLoss > EUR 10k  +15
 *   score >= 80 => critical | >= 55 => high | >= 30 => medium | else low.
 *
 * The related, simpler shapes in lib/cyber/incident-logic.ts are left intact
 * for compatibility; this engine supersedes them for new callers.
 */

import { ENISA_THREAT_TAXONOMY } from "../threat-intel/enisa-taxonomy";
import { COMPETENT_AUTHORITIES } from "../nis2/competent-authorities";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Incident severity band (higher score = more severe). */
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

/** NIS2 reporting deadline labels. */
export type Nis2Deadline = "24h" | "72h" | "1mo";

/** Lifecycle status of a single reporting deadline. */
export type DeadlineStatus = "pending" | "due" | "overdue";

/**
 * Everything `classifyIncident` needs to assess one incident.
 *
 * @param detectedAt — when the incident was detected (required by contract;
 *   the engine defensively tolerates missing/invalid values at runtime).
 * @param cause — free-text description; matched against the ENISA taxonomy
 *   for the threat category.
 * @param affectedUsers — count of users affected.
 * @param durationMinutes — operational disruption duration in minutes.
 * @param financialLossCents — financial loss in euro-cents (1,000,000 = EUR
 *   10,000, the NIS2 significance threshold used here).
 * @param publicSafetyImpact — impact on public safety or public health.
 * @param criticalInfrastructureAffected — essential/critical services hit.
 * @param dataIntegrityCompromised — confidentiality/integrity/authenticity
 *   of data compromised.
 * @param crossBorderImpact — incident affects entities/users in more than
 *   one member state.
 */
export interface IncidentClassificationInput {
  cause?: string;
  affectedUsers?: number;
  durationMinutes?: number;
  financialLossCents?: number;
  publicSafetyImpact?: boolean;
  criticalInfrastructureAffected?: boolean;
  dataIntegrityCompromised?: boolean;
  crossBorderImpact?: boolean;
  detectedAt: Date;
}

/** Output of `classifyIncident` for a single incident. */
export interface IncidentClassificationResult {
  /** 0-100 severity score, higher = more severe. */
  score: number;
  severity: IncidentSeverity;
  /** True when ANY NIS2 Article 23(3) significance criterion is met. */
  isSignificant: boolean;
  /** Human-readable reasons, one per triggered criterion (stable order). */
  reasons: string[];
  /** ENISA threat taxonomy category name (entry name; "Other" fallback). */
  category: string;
  /** ENISA threat taxonomy entry id ("TH-000" fallback). */
  categoryId: string;
  /** NIS2 early-warning label: "24h" when significant, else null. */
  nextDeadline: Nis2Deadline | null;
}

/** Output of `getReportingDeadlines`. */
export interface ReportingDeadlines {
  earlyWarning: Date;
  incidentNotification: Date;
  finalReport: Date;
  earlyWarningStatus: DeadlineStatus;
  incidentNotificationStatus: DeadlineStatus;
  finalReportStatus: DeadlineStatus;
}

/** Input for `buildCsirtTemplate`. */
export interface CsirtTemplateInput {
  countryCode: string;
  incidentTitle: string;
  incidentSummary?: string;
  severity: IncidentSeverity;
  detectedAt?: Date;
}

/** Output of `buildCsirtTemplate` (plain text, no HTML). */
export interface CsirtTemplate {
  subject: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Neutral "empty" shapes                                              */
/* ------------------------------------------------------------------ */

/** Neutral zeroed result returned on malformed/empty input. */
export const EMPTY_INCIDENT_CLASSIFICATION: IncidentClassificationResult = {
  score: 0,
  severity: "low",
  isSignificant: false,
  reasons: [],
  category: "Other",
  categoryId: "TH-000",
  nextDeadline: null,
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** NIS2 Art. 23(3) significance thresholds. */
const SIGNIFICANT_DURATION_MINUTES = 120;
const SIGNIFICANT_AFFECTED_USERS = 1000;
const SIGNIFICANT_LOSS_CENTS = 1_000_000; // EUR 10,000

/** Severity score weights (documented in the header). */
const WEIGHT_PUBLIC_SAFETY = 40;
const WEIGHT_CRITICAL_INFRASTRUCTURE = 35;
const WEIGHT_DATA_INTEGRITY = 30;
const WEIGHT_CROSS_BORDER = 20;
const WEIGHT_AFFECTED_USERS = 20;
const WEIGHT_DURATION = 15;
const WEIGHT_FINANCIAL_LOSS = 15;

/** Severity bands (score thresholds). */
const SEVERITY_CRITICAL = 80;
const SEVERITY_HIGH = 55;
const SEVERITY_MEDIUM = 30;

const FINAL_REPORT_DAYS = 30;
const DUE_WINDOW_HOURS = 12;

/**
 * Ordered cause-keyword -> taxonomy entry mapping (case-insensitive includes
 * against the normalized cause text; first hit wins).
 *
 * "Data Breach" and "Social Engineering" are declared categories in the
 * ENISAThreat type but have no dedicated catalog entry in this build, so they
 * deterministically resolve to their closest sibling entries:
 *   - data breach        -> TH-002 Advanced Malware Delivery (malware is the
 *     leading breach vector in ENISA Threat Landscape 2024)
 *   - social engineering -> TH-005 Targeted Phishing & BEC (phishing/BEC is
 *     the taxonomy's social-engineering vector)
 * Ordering is deliberate: specific vectors (ransomware, phishing) are checked
 * before generic outcomes (breach), and DDoS keywords before "flooding" so a
 * "DDoS flood" classifies as TH-003, not TH-008.
 */
const CATEGORY_KEYWORD_MAP: ReadonlyArray<{ keyword: string; categoryId: string }> = [
  { keyword: "ransomware", categoryId: "TH-001" },
  { keyword: "ransom", categoryId: "TH-001" },
  { keyword: "extortion", categoryId: "TH-001" },
  { keyword: "malware", categoryId: "TH-002" },
  { keyword: "trojan", categoryId: "TH-002" },
  { keyword: "spyware", categoryId: "TH-002" },
  { keyword: "virus", categoryId: "TH-002" },
  { keyword: "keylogger", categoryId: "TH-002" },
  { keyword: "phishing", categoryId: "TH-005" },
  { keyword: "spear phishing", categoryId: "TH-005" },
  { keyword: "business email compromise", categoryId: "TH-005" },
  { keyword: "bec", categoryId: "TH-005" },
  { keyword: "social engineering", categoryId: "TH-005" },
  { keyword: "smishing", categoryId: "TH-005" },
  { keyword: "vishing", categoryId: "TH-005" },
  { keyword: "ddos", categoryId: "TH-003" },
  { keyword: "denial of service", categoryId: "TH-003" },
  { keyword: "dos attack", categoryId: "TH-003" },
  { keyword: "volumetric", categoryId: "TH-003" },
  { keyword: "botnet", categoryId: "TH-003" },
  { keyword: "supply chain", categoryId: "TH-004" },
  { keyword: "third-party", categoryId: "TH-004" },
  { keyword: "third party", categoryId: "TH-004" },
  { keyword: "supplier", categoryId: "TH-004" },
  { keyword: "vendor compromise", categoryId: "TH-004" },
  { keyword: "insider", categoryId: "TH-006" },
  { keyword: "employee sabotage", categoryId: "TH-006" },
  { keyword: "disgruntled", categoryId: "TH-006" },
  { keyword: "privilege abuse", categoryId: "TH-006" },
  { keyword: "zero-day", categoryId: "TH-007" },
  { keyword: "0-day", categoryId: "TH-007" },
  { keyword: "exploit", categoryId: "TH-007" },
  { keyword: "breach", categoryId: "TH-002" },
  { keyword: "exfiltration", categoryId: "TH-002" },
  { keyword: "data leak", categoryId: "TH-002" },
  { keyword: "unauthorized access", categoryId: "TH-002" },
  { keyword: "natural disaster", categoryId: "TH-008" },
  { keyword: "earthquake", categoryId: "TH-008" },
  { keyword: "hurricane", categoryId: "TH-008" },
  { keyword: "storm", categoryId: "TH-008" },
  { keyword: "flooding", categoryId: "TH-008" },
  { keyword: "fire", categoryId: "TH-008" },
  { keyword: "power outage", categoryId: "TH-008" },
  { keyword: "data center damage", categoryId: "TH-008" },
];

/** Fallback label per taxonomy id (defensive; entry lookup is primary). */
const CATEGORY_ID_LABELS: Record<string, string> = {
  "TH-001": "Ransomware Operations",
  "TH-002": "Advanced Malware Delivery",
  "TH-003": "Volumetric DDoS Attacks",
  "TH-004": "Supply Chain Compromise",
  "TH-005": "Targeted Phishing & BEC",
  "TH-006": "Malicious Insider Activity",
  "TH-007": "Zero-day exploitation",
  "TH-008": "Physical Infrastructure Damage",
};

/** NIS2 Art. 23(3) significance statement per severity band. */
const SEVERITY_SIGNIFICANCE_STATEMENT: Record<IncidentSeverity, string> = {
  critical:
    "This incident is assessed as CRITICAL and meets the NIS2 Article 23(3) significance criteria. Immediate early-warning notification applies.",
  high: "This incident is assessed as HIGH severity and meets the NIS2 Article 23(3) significance criteria. Early-warning notification applies.",
  medium:
    "This incident is assessed as MEDIUM severity. Re-assess against the NIS2 Article 23(3) significance criteria before submitting a formal notification.",
  low: "This incident is assessed as LOW severity and does not currently meet the NIS2 Article 23(3) significance threshold.",
};

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** Coerce a number to a non-negative finite value; anything else -> 0. */
const toNonNegative = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

/** Coerce a flag to a strict boolean (non-true -> false). */
const toFlag = (value: boolean | undefined): boolean => value === true;

/** Coerce a date to a valid Date; invalid input -> `fallback`. */
const toValidDate = (value: Date | undefined, fallback: Date): Date =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : fallback;

/** Coerce a severity label to a known band; unknown -> "low". */
const toSeverity = (value: unknown): IncidentSeverity =>
  value === "critical" || value === "high" || value === "medium" || value === "low" ? value : "low";

/** Compute a deadline lifecycle status against the reference clock. */
const deadlineStatus = (deadlineMs: number, nowMs: number): DeadlineStatus => {
  if (nowMs >= deadlineMs) return "overdue";
  if (nowMs >= deadlineMs - DUE_WINDOW_HOURS * HOUR_MS) return "due";
  return "pending";
};

/* ------------------------------------------------------------------ */
/* Category matching                                                   */
/* ------------------------------------------------------------------ */

/**
 * Match a free-text cause against the ENISA threat taxonomy.
 * Case-insensitive keyword matching against `CATEGORY_KEYWORD_MAP`; resolves
 * the winning id through `ENISA_THREAT_TAXONOMY` so the returned category
 * name comes from the taxonomy itself. Falls back to "Other" / "TH-000".
 */
function matchCategory(cause: string): { category: string; categoryId: string } {
  const text = cause.toLowerCase();
  for (const { keyword, categoryId } of CATEGORY_KEYWORD_MAP) {
    if (text.includes(keyword)) {
      const entry = ENISA_THREAT_TAXONOMY.find((t) => t.id === categoryId);
      return {
        category: entry ? entry.name : (CATEGORY_ID_LABELS[categoryId] ?? "Other"),
        categoryId: entry ? entry.id : categoryId,
      };
    }
  }
  return { category: "Other", categoryId: "TH-000" };
}

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Classify a single incident against the NIS2 Article 23(3) significance
 * criteria, produce an additive 0-100 severity score, and resolve the ENISA
 * threat category from the free-text cause.
 *
 * Never throws; malformed input yields `EMPTY_INCIDENT_CLASSIFICATION`
 * (score 0, low severity, not significant, category "Other" / "TH-000").
 */
export function classifyIncident(input: IncidentClassificationInput): IncidentClassificationResult {
  if (!input || typeof input !== "object") {
    return { ...EMPTY_INCIDENT_CLASSIFICATION };
  }

  const cause = typeof input.cause === "string" ? input.cause : "";
  const affectedUsers = toNonNegative(input.affectedUsers);
  const durationMinutes = toNonNegative(input.durationMinutes);
  const financialLossCents = toNonNegative(input.financialLossCents);
  const publicSafetyImpact = toFlag(input.publicSafetyImpact);
  const criticalInfrastructureAffected = toFlag(input.criticalInfrastructureAffected);
  const dataIntegrityCompromised = toFlag(input.dataIntegrityCompromised);
  const crossBorderImpact = toFlag(input.crossBorderImpact);

  // --- NIS2 Article 23(3) significance -------------------------------
  const reasons: string[] = [];
  if (durationMinutes > SIGNIFICANT_DURATION_MINUTES) {
    reasons.push("Operational disruption exceeds 120 minutes");
  }
  if (affectedUsers > SIGNIFICANT_AFFECTED_USERS) {
    reasons.push("Large number of users affected (>1000)");
  }
  if (financialLossCents > SIGNIFICANT_LOSS_CENTS) {
    reasons.push("Significant financial loss detected (above EUR 10,000)");
  }
  if (publicSafetyImpact) {
    reasons.push("Direct impact on public safety or public health");
  }
  if (criticalInfrastructureAffected) {
    reasons.push("Critical infrastructure or essential services affected");
  }
  if (dataIntegrityCompromised) {
    reasons.push("Confidentiality, integrity or authenticity of data compromised");
  }
  if (crossBorderImpact) {
    reasons.push("Cross-border impact (entities or users in multiple member states affected)");
  }
  const isSignificant = reasons.length > 0;

  // --- Severity score (additive, clamped 0-100) ----------------------
  let score = 0;
  if (publicSafetyImpact) score += WEIGHT_PUBLIC_SAFETY;
  if (criticalInfrastructureAffected) score += WEIGHT_CRITICAL_INFRASTRUCTURE;
  if (dataIntegrityCompromised) score += WEIGHT_DATA_INTEGRITY;
  if (crossBorderImpact) score += WEIGHT_CROSS_BORDER;
  if (affectedUsers > SIGNIFICANT_AFFECTED_USERS) score += WEIGHT_AFFECTED_USERS;
  if (durationMinutes > SIGNIFICANT_DURATION_MINUTES) score += WEIGHT_DURATION;
  if (financialLossCents > SIGNIFICANT_LOSS_CENTS) score += WEIGHT_FINANCIAL_LOSS;
  score = Math.max(0, Math.min(100, score));

  const severity: IncidentSeverity =
    score >= SEVERITY_CRITICAL ? "critical" : score >= SEVERITY_HIGH ? "high" : score >= SEVERITY_MEDIUM ? "medium" : "low";

  const { category, categoryId } = matchCategory(cause);

  return {
    score,
    severity,
    isSignificant,
    reasons,
    category,
    categoryId,
    nextDeadline: isSignificant ? "24h" : null,
  };
}

/**
 * Compute the three NIS2 reporting deadlines relative to detection time and
 * their lifecycle statuses against the injected reference clock:
 *   - early warning          : detectedAt + 24h
 *   - incident notification  : detectedAt + 72h
 *   - final report           : detectedAt + 30 days
 *
 * Status semantics (injectable `now`, default `new Date()`):
 *   pending  = now is more than 12h before the deadline
 *   due      = now is inside the 12h window before the deadline
 *   overdue  = now is at or past the deadline
 *
 * Never throws: an invalid `detectedAt` anchors the deadlines to `now`
 * (all deadlines land in the future -> pending); an invalid `now` defaults
 * to the real clock.
 */
export function getReportingDeadlines(detectedAt: Date, now?: Date): ReportingDeadlines {
  const safeNow = toValidDate(now, new Date());
  const safeDetected = toValidDate(detectedAt, safeNow);

  const detectedMs = safeDetected.getTime();
  const nowMs = safeNow.getTime();

  const earlyWarningMs = detectedMs + 24 * HOUR_MS;
  const incidentNotificationMs = detectedMs + 72 * HOUR_MS;
  const finalReportMs = detectedMs + FINAL_REPORT_DAYS * DAY_MS;

  return {
    earlyWarning: new Date(earlyWarningMs),
    incidentNotification: new Date(incidentNotificationMs),
    finalReport: new Date(finalReportMs),
    earlyWarningStatus: deadlineStatus(earlyWarningMs, nowMs),
    incidentNotificationStatus: deadlineStatus(incidentNotificationMs, nowMs),
    finalReportStatus: deadlineStatus(finalReportMs, nowMs),
  };
}

/**
 * Build a concise plain-text CSIRT notification template addressed to the
 * NIS2 competent authority for `countryCode` (registry: lib/nis2/
 * competent-authorities.ts). Unknown country codes produce generic
 * "competent authority" wording. Never throws; invalid detected-at falls
 * back to the current time.
 */
export function buildCsirtTemplate(input: CsirtTemplateInput): CsirtTemplate {
  try {
    const title = (input?.incidentTitle ?? "").trim() || "Untitled incident";
    const severity = toSeverity(input?.severity);
    const summary = (input?.incidentSummary ?? "").trim();
    const detected = toValidDate(input?.detectedAt, new Date());
    const countryCode = (input?.countryCode ?? "").trim().toUpperCase();

    const authority = COMPETENT_AUTHORITIES.find((ca) => ca.countryCode === countryCode);

    const subject = `[NIS2] Incident notification: ${title} (${severity})`;

    const lines: string[] = [
      `NIS2 INCIDENT NOTIFICATION - ${title.toUpperCase()}`,
      "=============================================",
      "",
      `Severity: ${severity}`,
      `Detected at: ${detected.toISOString()}`,
      "",
      "NIS2 Article 23(3) assessment:",
      SEVERITY_SIGNIFICANCE_STATEMENT[severity],
      "",
      "Summary:",
      summary ? summary : "(not provided)",
      "",
      "Report to:",
    ];

    if (authority) {
      const acronym = authority.acronym ? ` (${authority.acronym})` : "";
      lines.push(`${authority.authorityName}${acronym} - ${authority.countryName}`);
      const contactEmail = (authority.incidentEmail ?? authority.email ?? "").trim();
      if (contactEmail) {
        lines.push(`Email: ${contactEmail}`);
      }
      if (authority.reportingPortal) {
        lines.push(`Reporting portal: ${authority.reportingPortal}`);
      }
      lines.push(`Website: ${authority.website}`);
    } else {
      lines.push(
        "The competent authority for NIS2 incident reporting in the member state where the entity is established.",
        `No authority registry entry exists for country code "${countryCode}". Verify the correct authority before sending.`
      );
    }

    lines.push(
      "",
      "This template was generated by ComplianceOS. Verify current national reporting requirements before submission."
    );

    return { subject, body: lines.join("\n") };
  } catch {
    // Absolute safety net — the template builder must never throw.
    return {
      subject: "[NIS2] Incident notification",
      body: "NIS2 incident notification template. Verify the correct competent authority before submission.",
    };
  }
}
