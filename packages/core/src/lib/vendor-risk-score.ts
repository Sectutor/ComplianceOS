import type { VendorAssessment } from '../schema';
import type { VendorScan } from '../schema';
import type { VendorCveMatch } from '../schema';
import type { VendorBreach } from '../schema';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VendorWithRelations {
  assessments?: VendorAssessment[];
  scans?: VendorScan[];
  cves?: VendorCveMatch[];
  breaches?: VendorBreach[];
}

export interface VendorRiskScore {
  /** Computed score 0-100 */
  score: number;
  /** Risk tier label */
  tier: 'low' | 'medium' | 'high' | 'critical';
  /** Human-friendly label with icon */
  label: string;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Derive severity from a CVSS score string. */
function cvssToSeverity(cvss: string | null | undefined): 'critical' | 'high' | 'medium' | 'low' | null {
  if (cvss == null) return null;
  const num = parseFloat(cvss);
  if (isNaN(num)) return null;
  if (num >= 9.0) return 'critical';
  if (num >= 7.0) return 'high';
  if (num >= 4.0) return 'medium';
  if (num >= 0.1) return 'low';
  return null;
}

/** Weighted severity points used for the CVE sub-score. */
function severityCvePoints(severity: string | null | undefined): number {
  switch (severity) {
    case 'critical': return 10;
    case 'high': return 5;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

/** Weighted severity points used for the breach sub-score. */
function severityBreachPoints(severity: string | null | undefined): number {
  switch (severity) {
    case 'Critical': return 25;
    case 'High': return 15;
    case 'Medium': return 10;
    case 'Low': return 3;
    default: return 0;
  }
}

// ── Sub-scores ─────────────────────────────────────────────────────────────────

function assessmentScore(
  assessments: VendorAssessment[] | undefined,
): { score: number; available: boolean } {
  if (!assessments || assessments.length === 0) {
    return { score: 0, available: false };
  }

  // Pick latest assessment by createdAt
  const sorted = [...assessments].sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  const latest = sorted[0];

  // score is 0-100, so it maps directly
  const rawScore = latest.score ?? 0;
  const clamped = Math.max(0, Math.min(100, rawScore));

  // Invert so that a HIGH assessment score → LOW risk contribution
  // (assessment measures health, not risk)
  return { score: 100 - clamped, available: true };
}

function scanRiskScore(scans: VendorScan[] | undefined): { score: number; available: boolean } {
  if (!scans || scans.length === 0) {
    return { score: 0, available: false };
  }

  const sorted = [...scans].sort((a, b) => {
    const aDate = a.scanDate ? new Date(a.scanDate).getTime() : 0;
    const bDate = b.scanDate ? new Date(b.scanDate).getTime() : 0;
    return bDate - aDate;
  });

  const latest = sorted[0];
  const rawScore = latest.riskScore ?? 0;
  return { score: Math.max(0, Math.min(100, rawScore)), available: true };
}

function cveSeverityScore(cves: VendorCveMatch[] | undefined): { score: number; available: boolean } {
  if (!cves || cves.length === 0) {
    return { score: 0, available: false };
  }

  // Only consider Active CVEs
  const active = cves.filter(
    (c) => (c.status ?? 'Active').toLowerCase() === 'active',
  );
  if (active.length === 0) return { score: 0, available: false };

  let totalPoints = 0;
  for (const cve of active) {
    const sev = cvssToSeverity(cve.cvssScore);
    totalPoints += severityCvePoints(sev);
  }

  return { score: Math.min(100, totalPoints), available: true };
}

function breachScore(breaches: VendorBreach[] | undefined): { score: number; available: boolean } {
  if (!breaches || breaches.length === 0) {
    return { score: 0, available: false };
  }

  let totalPoints = 0;
  for (const breach of breaches) {
    totalPoints += severityBreachPoints(breach.severity);
  }

  return { score: Math.min(100, totalPoints), available: true };
}

// ── Public API ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  assessment: 0.30,
  scan: 0.25,
  cve: 0.25,
  breach: 0.20,
} as const;

export function computeVendorRiskScore(vendor: VendorWithRelations): VendorRiskScore {
  const ass = assessmentScore(vendor.assessments);
  const scn = scanRiskScore(vendor.scans);
  const cve = cveSeverityScore(vendor.cves);
  const brc = breachScore(vendor.breaches);

  const available: { weight: number; score: number }[] = [];

  if (ass.available) available.push({ weight: WEIGHTS.assessment, score: ass.score });
  if (scn.available) available.push({ weight: WEIGHTS.scan, score: scn.score });
  if (cve.available) available.push({ weight: WEIGHTS.cve, score: cve.score });
  if (brc.available) available.push({ weight: WEIGHTS.breach, score: brc.score });

  // If nothing available, default to low risk
  if (available.length === 0) {
    return { score: 0, tier: 'low', label: '🟢 Low Risk' };
  }

  // Redistribute weights proportionally
  const totalWeight = available.reduce((sum, a) => sum + a.weight, 0);
  let weightedScore = 0;
  for (const a of available) {
    weightedScore += (a.weight / totalWeight) * a.score;
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

  let tier: VendorRiskScore['tier'];
  let label: string;

  if (finalScore <= 20) {
    tier = 'low';
    label = '🟢 Low Risk';
  } else if (finalScore <= 50) {
    tier = 'medium';
    label = '🟡 Medium Risk';
  } else if (finalScore <= 75) {
    tier = 'high';
    label = '🟠 High Risk';
  } else {
    tier = 'critical';
    label = '🔴 Critical Risk';
  }

  return { score: finalScore, tier, label };
}
