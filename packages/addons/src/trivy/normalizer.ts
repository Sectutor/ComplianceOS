/**
 * Trivy Output Normalizer
 *
 * Converts Trivy JSON output into GRCompliance's normalized finding format.
 * Maps CVSS scores to severity levels and creates structured descriptions.
 */

import type { RunResult, NormalizedFinding, RiskSeverity } from '../shared/types';
import type { TrivyRawOutput, TrivyRawVuln, TrivyRawResult } from './runner';

interface NormalizationContext {
  clientId: number;
  target: string;
  source: string;
}

/**
 * Map CVSS score to severity level.
 */
function cvssToSeverity(score: number | undefined): RiskSeverity {
  if (!score) return 'medium';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

/**
 * Map Trivy severity string to internal severity.
 */
function mapSeverity(trivySeverity: string, cvssScore?: number): RiskSeverity {
  // Prefer CVSS score if available
  if (cvssScore !== undefined) return cvssToSeverity(cvssScore);

  const map: Record<string, RiskSeverity> = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  };
  return map[trivySeverity?.toUpperCase()] ?? 'medium';
}

/**
 * Calculate inherent_score from severity.
 */
function severityToScore(severity: RiskSeverity): number {
  switch (severity) {
    case 'critical': return 25;
    case 'high': return 16;
    case 'medium': return 9;
    case 'low': return 4;
    default: return 1;
  }
}

/**
 * Extract the best CVSS score from a Trivy vulnerability.
 */
function getBestCVSS(vuln: TrivyRawVuln): number | undefined {
  if (!vuln.CVSS) return undefined;
  // Prefer NVD score, fall back to any other source
  const scores = Object.values(vuln.CVSS)
    .map(s => s.V3Score)
    .filter((s): s is number => s !== undefined);
  return scores.length > 0 ? Math.max(...scores) : undefined;
}

/**
 * Build a structured description for a vulnerability finding.
 */
function buildDescription(
  vuln: TrivyRawVuln,
  result: TrivyRawResult,
  ctx: NormalizationContext,
): string {
  const lines = [
    `**File:** ${result.Target}`,
    `**Package:** ${vuln.PkgName} ${vuln.InstalledVersion}`,
    `**Fixed in:** ${vuln.FixedVersion || 'N/A'}`,
    `**Published:** ${vuln.PublishedDate || 'Unknown'}`,
    '',
    vuln.Description || 'No description available.',
    '',
    vuln.References?.length
      ? `**References:**\n${vuln.References.map(r => `- ${r}`).join('\n')}`
      : '',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Normalize a single Trivy vulnerability into GRCompliance format.
 */
function normalizeVulnerability(
  vuln: TrivyRawVuln,
  result: TrivyRawResult,
  ctx: NormalizationContext,
): NormalizedFinding {
  const cvssScore = getBestCVSS(vuln);
  const severity = mapSeverity(vuln.Severity, cvssScore);

  return {
    title: `[${vuln.VulnerabilityID}] ${vuln.Title || vuln.PkgName} — ${result.Target}`,
    severity,
    description: buildDescription(vuln, result, ctx),
    frameworkMappings: [
      severity === 'critical' || severity === 'high'
        ? 'ISO.27001.A.12.6.1'
        : 'ISO.27001.A.12.6.2',
      'NIST.CSF.PR.DS-1',
      `CVSS.${cvssScore?.toFixed(1) || 'unknown'}`,
    ],
    resourceId: `${vuln.PkgName}@${vuln.InstalledVersion}`,
    remediation: `Upgrade ${vuln.PkgName} from ${vuln.InstalledVersion} to ${vuln.FixedVersion || 'latest'}`,
    rawEvidence: vuln as unknown as Record<string, unknown>,
  };
}

/**
 * Normalize entire Trivy output into GRCompliance RunResult.
 */
export function normalizeTrivyOutput(
  rawOutput: unknown,
  ctx: NormalizationContext,
): RunResult {
  const output = rawOutput as TrivyRawOutput;

  if (!output.Results || !Array.isArray(output.Results)) {
    return {
      findings: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 },
      durationSeconds: 0,
    };
  }

  const findings: NormalizedFinding[] = [];

  for (const result of output.Results) {
    const vulns = result.Vulnerabilities || [];
    for (const vuln of vulns) {
      findings.push(normalizeVulnerability(vuln, result, ctx));
    }
  }

  const highOrAbove = findings.filter(
    f => f.severity === 'critical' || f.severity === 'high',
  );
  const errors = findings.filter(f => f.severity === 'critical');

  // Build evidence artifacts per result target
  const evidenceArtifacts = output.Results.map(r => ({
    type: 'vulnerability_scan',
    data: {
      target: r.Target,
      class: r.Class,
      type: r.Type,
      vulnCount: r.Vulnerabilities?.length || 0,
      scanDate: new Date().toISOString(),
    },
  }));

  return {
    findings,
    summary: {
      total: findings.length,
      passed: 0,
      failed: highOrAbove.length,
      errors: errors.length,
    },
    evidenceArtifacts,
    durationSeconds: 0,
  };
}
