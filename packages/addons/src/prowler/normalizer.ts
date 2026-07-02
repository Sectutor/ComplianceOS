/**
 * Prowler Output Normalizer
 *
 * Converts Prowler's JSON output into GRCompliance's normalized finding format.
 *
 * Prowler output format (simplified):
 * {
 *   "prowler_version": "4.0.0",
 *   "summary": { "total": 100, "passed": 85, "failed": 15 },
 *   "findings": [
 *     {
 *       "check_id": "s3_bucket_public_access",
 *       "check_title": "S3 Buckets Public Access",
 *       "status": "FAIL",
 *       "region": "us-east-1",
 *       "resource_id": "arn:aws:s3:::my-bucket",
 *       "resource_name": "my-bucket",
 *       "resource_type": "AwsS3Bucket",
 *       "severity": "high",
 *       "description": "S3 Bucket my-bucket is publicly accessible",
 *       "remediation": "Block public access at bucket level",
 *       "compliance": {
 *         "nist_csf_2.0": ["PR.AC-1", "PR.AC-3"],
 *         "soc2": ["CC6.1", "CC6.3"]
 *       }
 *     }
 *   ]
 * }
 */

import type { RunResult, NormalizedFinding, RiskSeverity } from '../shared/types';

interface ProwlerFinding {
  check_id: string;
  check_title: string;
  status: string;
  region: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  severity: string;
  description: string;
  remediation: string;
  compliance?: Record<string, string[]>;
}

interface ProwlerOutput {
  prowler_version: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  findings: ProwlerFinding[];
}

/**
 * Context for the normalization — adds metadata to each finding.
 */
interface NormalizationContext {
  clientId: number;
  provider: string;
  accountName: string;
  source: string;
}

/**
 * Map Prowler's severity to GRCompliance's severity.
 */
function mapSeverity(prowlerSeverity: string): RiskSeverity {
  const map: Record<string, RiskSeverity> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    informational: 'info',
    info: 'info',
  };

  // Prowler sometimes uses status instead of severity for the classification
  if (prowlerSeverity === 'FAIL' || prowlerSeverity === 'FAIL') {
    return 'high';
  }
  if (prowlerSeverity === 'PASS') {
    return 'info';
  }

  return map[prowlerSeverity.toLowerCase()] ?? 'info';
}

/**
 * Extract framework mappings from Prowler's compliance field.
 */
function extractFrameworkMappings(finding: ProwlerFinding): string[] {
  const mappings: string[] = [];

  if (finding.compliance) {
    for (const [framework, controls] of Object.entries(finding.compliance)) {
      for (const control of controls) {
        // Normalize framework name
        const frameworkShort = framework
          .replace('nist_csf_2.0', 'NIST.CSF')
          .replace('soc2', 'SOC2')
          .replace('iso_27001', 'ISO.27001')
          .replace('hipaa', 'HIPAA')
          .replace('pci_dss', 'PCI.DSS');

        mappings.push(`${frameworkShort}.${control}`);
      }
    }
  }

  return mappings;
}

/**
 * Normalize a single Prowler finding into GRCompliance format.
 */
function normalizeFinding(
  finding: ProwlerFinding,
  ctx: NormalizationContext,
): NormalizedFinding {
  const frameworkMappings = extractFrameworkMappings(finding);

  const description = [
    `**Cloud:** ${ctx.provider} — ${ctx.accountName}`,
    `**Region:** ${finding.region}`,
    `**Resource:** ${finding.resource_name} (${finding.resource_id})`,
    `**Type:** ${finding.resource_type}`,
    finding.description,
    '',
    `**Remediation:** ${finding.remediation}`,
  ].join('\n');

  return {
    title: `[${ctx.provider}] ${finding.check_title} — ${finding.resource_name}`,
    severity: mapSeverity(finding.severity || finding.status),
    description,
    frameworkMappings,
    resourceId: finding.resource_id,
    remediation: finding.remediation,
    rawEvidence: finding as unknown as Record<string, unknown>,
  };
}

/**
 * Normalize entire Prowler output into GRCompliance RunResult.
 */
export function normalizeProwlerOutput(
  rawOutput: unknown,
  ctx: NormalizationContext,
): RunResult {
  const output = rawOutput as ProwlerOutput;

  if (!output.findings || !Array.isArray(output.findings)) {
    return {
      findings: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 },
      durationSeconds: 0,
    };
  }

  const findings = output.findings.map((f) => normalizeFinding(f, ctx));
  const failures = findings.filter(
    (f) =>
      f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium',
  );
  const errors = findings.filter((f) => f.severity === 'critical');

  return {
    findings,
    summary: {
      total: findings.length,
      passed: findings.length - failures.length,
      failed: failures.length,
      errors: errors.length,
    },
    evidenceArtifacts: [
      {
        type: 'prowler_scan_summary',
        data: {
          provider: ctx.provider,
          account: ctx.accountName,
          version: output.prowler_version,
          totalChecks: output.summary?.total ?? findings.length,
          totalPassed: output.summary?.passed ?? 0,
          totalFailed: output.summary?.failed ?? 0,
          scanDate: new Date().toISOString(),
        },
      },
    ],
    durationSeconds: 0,
  };
}
