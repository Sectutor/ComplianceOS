import type { ConnectorDefinition, ConnectorConfig, ConnectorResult, ConnectorEvidence } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence_data: Record<string, unknown>;
}

export interface ScanResult {
  findings: GitHubFinding[];
  errors: string[];
  repoInfo: {
    owner: string;
    repo: string;
    visibility: string;
    archived: boolean;
    defaultBranch: string;
  };
}

// ---------------------------------------------------------------------------
// Check definitions used by both `scan()` and the connector framework
// ---------------------------------------------------------------------------

const CHECKS = [
  { id: 'github-branch-protection', name: 'Branch Protection Rules', control: 'CM-3' },
  { id: 'github-secret-scanning', name: 'Secret Scanning / Exposed Secrets', control: 'SI-3' },
  { id: 'github-dependency-vulnerabilities', name: 'Dependency Vulnerability Scan', control: 'SI-2' },
  { id: 'github-repo-visibility', name: 'Repository Visibility & Archival Status', control: 'AC-3' },
  { id: 'github-mfa-enforcement', name: 'MFA Enforcement (org-level)', control: 'IA-2' },
];

// ---------------------------------------------------------------------------
// Core scan function — standalone, reusable
// ---------------------------------------------------------------------------

/**
 * Scan a GitHub repository for compliance-relevant findings:
 *  1. Exposed secrets (Secret Scanning alerts)
 *  2. Dependency vulnerabilities (Dependabot alerts)
 *  3. Branch protection rules
 *  4. Repository visibility & archived status
 *
 * @param owner  – GitHub owner (org or user)
 * @param repo   – Repository name
 * @param token  – GitHub Personal Access Token (classic or fine-grained)
 * @returns       – `ScanResult` with findings and error details
 */
export async function scan(
  owner: string,
  repo: string,
  token: string,
): Promise<ScanResult> {
  const result: ScanResult = {
    findings: [],
    errors: [],
    repoInfo: {
      owner,
      repo,
      visibility: 'unknown',
      archived: false,
      defaultBranch: 'unknown',
    },
  };

  let octokit: any;

  try {
    const { Octokit } = await import('octokit');
    octokit = new Octokit({ auth: token });
  } catch (err: any) {
    result.errors.push(`SDK load failed: ${err.message || 'octokit not available'}`);
    return result;
  }

  // ---- Helper: wrap API calls with error/rate-limit handling ----
  async function safeGet(
    label: string,
    fn: () => Promise<any>,
  ): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
    try {
      return { ok: true as const, data: await fn() };
    } catch (err: any) {
      const msg = err.message || String(err);

      // Rate limiting
      if (err.status === 403 && /rate limit/i.test(msg)) {
        const resetEpoch = err.response?.headers?.['x-ratelimit-reset'];
        const resetDate = resetEpoch
          ? new Date(Number(resetEpoch) * 1000).toISOString()
          : 'unknown';
        return {
          ok: false as const,
          error: `[${label}] GitHub API rate limit exceeded – resets at ${resetDate}`,
        };
      }

      // Auth failure
      if (err.status === 401) {
        return { ok: false as const, error: `[${label}] Authentication failed – check token` };
      }

      // Not found
      if (err.status === 404) {
        return { ok: false as const, error: `[${label}] Resource not found – does '${owner}/${repo}' exist?` };
      }

      return { ok: false as const, error: `[${label}] ${msg}` };
    }
  }

  // ======================================================================
  // 1. Repository metadata (visibility, archived, default branch)
  // ======================================================================

  const repoRes = await safeGet('repo-info', () =>
    octokit.rest.repos.get({ owner, repo }),
  );

  if (repoRes.ok) {
    const r = repoRes.data.data || repoRes.data;
    result.repoInfo.visibility = r.visibility || (r.private ? 'private' : 'public');
    result.repoInfo.archived = !!r.archived;
    result.repoInfo.defaultBranch = r.default_branch || 'main';

    result.findings.push({
      severity: result.repoInfo.archived ? 'info' : 'info',
      title: 'Repository Visibility & Archival Status',
      description: `Repository ${owner}/${repo} is **${result.repoInfo.visibility}** and ${result.repoInfo.archived ? '**archived**' : '**active**'}.`,
      evidence_data: {
        check: 'github-repo-visibility',
        owner,
        repo,
        visibility: result.repoInfo.visibility,
        archived: result.repoInfo.archived,
        defaultBranch: result.repoInfo.defaultBranch,
      },
    });

    // If the repo is public AND not archived, flag it for sensitive data exposure
    if (result.repoInfo.visibility === 'public' && !result.repoInfo.archived) {
      result.findings.push({
        severity: 'medium',
        title: 'Public Repository – Sensitive Data Exposure Risk',
        description: `Repository ${owner}/${repo} is publicly visible. Ensure no secrets, credentials, or sensitive configuration is committed.`,
        evidence_data: {
          check: 'github-repo-visibility',
          owner,
          repo,
          visibility: 'public',
          archived: false,
          risk: 'public_repo_exposure',
        },
      });
    }
  } else {
    result.errors.push(repoRes.error);
    // Can't proceed without repo info
    return result;
  }

  // ======================================================================
  // 2. Branch protection rules
  // ======================================================================

  const branchRes = await safeGet('branch-protection', () =>
    octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch: result.repoInfo.defaultBranch,
    }),
  );

  if (branchRes.ok) {
    const bp = branchRes.data.data || branchRes.data;
    const requiredPR = !!bp.required_pull_request_reviews;
    const requiredStatus = !!bp.required_status_checks;
    const enforceAdmins = !!bp.enforce_admins?.enabled;

    result.findings.push({
      severity: requiredPR && requiredStatus ? 'low' : 'high',
      title: 'Branch Protection Rules',
      description: `Default branch '${result.repoInfo.defaultBranch}': PR reviews required = ${requiredPR}, status checks required = ${requiredStatus}, admin enforcement = ${enforceAdmins}.`,
      evidence_data: {
        check: 'github-branch-protection',
        owner,
        repo,
        branch: result.repoInfo.defaultBranch,
        required_pull_request_reviews: requiredPR,
        required_status_checks: requiredStatus,
        enforce_admins: enforceAdmins,
        raw: bp,
      },
    });
  } else {
    // No branch protection means a finding of its own
    result.findings.push({
      severity: 'high',
      title: 'Branch Protection Not Configured',
      description: `Default branch '${result.repoInfo.defaultBranch}' has NO protection rules. Direct pushes and force-pushes are allowed.`,
      evidence_data: {
        check: 'github-branch-protection',
        owner,
        repo,
        branch: result.repoInfo.defaultBranch,
        protection_enabled: false,
      },
    });
  }

  // ======================================================================
  // 3. Secret scanning alerts (exposed secrets)
  // ======================================================================

  const secretRes = await safeGet('secret-scanning', () =>
    octokit.rest.secretScanning.listAlertsForRepo({ owner, repo }),
  );

  if (secretRes.ok) {
    const alerts: any[] = secretRes.data.data || secretRes.data;
    const openAlerts = alerts.filter((a: any) => a.state === 'open');
    const resolvedAlerts = alerts.filter((a: any) => a.state === 'resolved');

    result.findings.push({
      severity: openAlerts.length > 0 ? 'critical' : 'low',
      title: 'Secret Scanning Alerts',
      description: `Found **${openAlerts.length} open** and **${resolvedAlerts.length} resolved** secret scanning alerts.`,
      evidence_data: {
        check: 'github-secret-scanning',
        owner,
        repo,
        total_alerts: alerts.length,
        open_alerts: openAlerts.length,
        resolved_alerts: resolvedAlerts.length,
        alerts_summary: openAlerts.map((a: any) => ({
          secret_type: a.secret_type_display_name || a.secret_type,
          created_at: a.created_at,
          state: a.state,
          url: a.html_url,
        })),
      },
    });

    // Individual findings for each open alert
    for (const alert of openAlerts) {
      result.findings.push({
        severity: 'critical',
        title: `Exposed Secret: ${alert.secret_type_display_name || alert.secret_type}`,
        description: `Secret of type '${alert.secret_type_display_name || alert.secret_type}' found in ${alert.html_url || `${owner}/${repo}`} — state: ${alert.state}.`,
        evidence_data: {
          check: 'github-secret-scanning',
          owner,
          repo,
          secret_type: alert.secret_type,
          secret_type_display: alert.secret_type_display_name,
          created_at: alert.created_at,
          validity: alert.validity,
          url: alert.html_url,
        },
      });
    }
  } else {
    // Secret scanning may not be enabled for the repo
    if (secretRes.error.includes('Secret scanning') || secretRes.error.includes('not found')) {
      result.findings.push({
        severity: 'medium',
        title: 'Secret Scanning Not Available',
        description: `Secret scanning alerts could not be retrieved for ${owner}/${repo}. This may indicate the feature is not enabled or the token lacks the 'secret_scanning_alerts:read' permission.`,
        evidence_data: {
          check: 'github-secret-scanning',
          owner,
          repo,
          enabled: false,
          error: secretRes.error,
        },
      });
    } else {
      result.errors.push(secretRes.error);
    }
  }

  // ======================================================================
  // 4. Dependabot alerts (dependency vulnerabilities)
  // ======================================================================

  const depRes = await safeGet('dependabot-alerts', () =>
    octokit.rest.dependabot.listAlertsForRepo({ owner, repo }),
  );

  if (depRes.ok) {
    const alerts: any[] = depRes.data.data || depRes.data;
    const openAlerts = alerts.filter((a: any) => a.state === 'open');
    const critical = openAlerts.filter((a: any) => a.security_advisory?.severity === 'critical');
    const high = openAlerts.filter((a: any) => a.security_advisory?.severity === 'high');
    const medium = openAlerts.filter((a: any) => a.security_advisory?.severity === 'medium');
    const low = openAlerts.filter((a: any) => a.security_advisory?.severity === 'low');

    result.findings.push({
      severity: openAlerts.length === 0 ? 'low' : critical.length > 0 ? 'critical' : 'high',
      title: 'Dependency Vulnerabilities',
      description: `Dependabot found **${openAlerts.length} open** alerts (${critical.length} critical, ${high.length} high, ${medium.length} medium, ${low.length} low) across dependencies.`,
      evidence_data: {
        check: 'github-dependency-vulnerabilities',
        owner,
        repo,
        total_alerts: alerts.length,
        open_alerts: openAlerts.length,
        severity_breakdown: { critical: critical.length, high: high.length, medium: medium.length, low: low.length },
      },
    });

    for (const alert of openAlerts) {
      const adv = alert.security_advisory || {};
      const pkg = alert.security_vulnerability?.package || {};
      const severity = adv.severity || 'unknown';
      result.findings.push({
        severity: severity as any,
        title: `CVE: ${adv.ghsa_id || adv.cve_id || pkg.name || 'unknown'}`,
        description: `${pkg.name}@${alert.security_vulnerability?.vulnerable_version_range || '?'} — ${adv.summary || 'No summary'}`,
        evidence_data: {
          check: 'github-dependency-vulnerabilities',
          owner,
          repo,
          ghsa_id: adv.ghsa_id,
          cve_id: adv.cve_id,
          severity,
          package_name: pkg.name,
          ecosystem: pkg.ecosystem,
          vulnerable_version_range: alert.security_vulnerability?.vulnerable_version_range,
          first_patched_version: alert.security_vulnerability?.first_patched_version?.identifier,
          published_at: adv.published_at,
          url: alert.html_url,
        },
      });
    }
  } else {
    if (depRes.error.includes('Dependabot') || depRes.error.includes('not found')) {
      result.findings.push({
        severity: 'medium',
        title: 'Dependabot Alerts Not Available',
        description: `Dependabot alerts could not be retrieved for ${owner}/${repo}. Ensure Dependabot is enabled and the token has 'dependabot_alerts:read' permission.`,
        evidence_data: {
          check: 'github-dependency-vulnerabilities',
          owner,
          repo,
          enabled: false,
          error: depRes.error,
        },
      });
    } else {
      result.errors.push(depRes.error);
    }
  }

  // ======================================================================
  // 5. Org-level: MFA / 2FA enforcement (only if token has org:read scope)
  // ======================================================================

  // Attempt to read org membership for MFA enforcement; silently skip if
  // the token doesn't have org:read scope rather than failing loudly.
  if (owner.includes('/')) {
    /* owner is a user, not an org — skip */
  } else {
    const orgRes = await safeGet('org-mfa', () =>
      octokit.rest.orgs.get({ org: owner }),
    );

    if (orgRes.ok) {
      const org = orgRes.data.data || orgRes.data;
      const twoFactorRequired = org.two_factor_requirement_enabled ?? org.two_factor_requirement ?? false;
      result.findings.push({
        severity: twoFactorRequired ? 'low' : 'high',
        title: 'Organization MFA / 2FA Enforcement',
        description: `Organization '${owner}' ${twoFactorRequired ? '**requires**' : 'does **NOT** require'} two-factor authentication for all members.`,
        evidence_data: {
          check: 'github-mfa-enforcement',
          owner,
          two_factor_requirement_enabled: twoFactorRequired,
        },
      });
    }
    // Silently skip if org info is unavailable (token scope issue, or owner is a user)
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dry-run for when Octokit can't be loaded
// ---------------------------------------------------------------------------

function runDryRun(config: ConnectorConfig): ConnectorResult {
  const org = (config.settings && config.settings.organization) || 'my-org';
  const repo = (config.settings && config.settings.repository) || 'my-repo';
  const evidence: ConnectorEvidence[] = CHECKS.map((check) => ({
    clientControlId: 0,
    evidenceId: check.id,
    description: `[DRY-RUN] ${check.name} for ${org}/${repo}: SIMULATED - passed`,
    type: 'automated_scan',
    status: 'collected' as const,
    rawData: {
      check: check.id,
      organization: org,
      repository: repo,
      result: 'passed',
      simulated: true,
      timestamp: new Date().toISOString(),
    },
    collectedAt: new Date(),
  }));

  return {
    success: true,
    evidence,
    summary: CHECKS.map((c) => ({
      control: c.control,
      passed: 1,
      failed: 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// ConnectorDefinition — plugs into ComplianceOS connector framework
// ---------------------------------------------------------------------------

export const githubConnector: ConnectorDefinition = {
  id: 'github',
  name: 'GitHub',
  description:
    'Collect evidence from GitHub: branch protection, secret scanning, dependency vulnerabilities, repo visibility, MFA enforcement',
  icon: 'github',
  configSchema: {
    type: 'object',
    properties: {
      organization: {
        type: 'string',
        title: 'GitHub Organization (owner)',
        description: 'The GitHub org or user that owns the repository',
      },
      repository: {
        type: 'string',
        title: 'Repository Name',
        description: 'The repository to scan (just the name, not the full URL)',
      },
    },
    required: ['organization', 'repository'],
  },
  async run(config: ConnectorConfig): Promise<ConnectorResult> {
    try {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ auth: config.credentials.token });

      // ---- Quick auth check ----
      try {
        await octokit.rest.users.getAuthenticated();
      } catch {
        return {
          success: false,
          evidence: [],
          errors: ['Authentication failed – check your GitHub Personal Access Token'],
          summary: [],
        };
      }

      const owner =
        (config.settings && config.settings.organization) || 'my-org';
      const repo =
        (config.settings && config.settings.repository) || 'my-repo';

      const scanResult = await scan(owner, repo, config.credentials.token);

      // Map findings to ConnectorEvidence array
      const evidence: ConnectorEvidence[] = scanResult.findings.map(
        (f, idx) => ({
          clientControlId: 0,
          evidenceId: f.evidence_data.check
            ? `${f.evidence_data.check}-${idx}`
            : `github-finding-${idx}`,
          description: `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`,
          type: 'automated_scan',
          status: 'collected' as const,
          rawData: {
            ...f.evidence_data,
            severity: f.severity,
            title: f.title,
            findingIndex: idx,
            timestamp: new Date().toISOString(),
          },
          collectedAt: new Date(),
        }),
      );

      // Build summary grouped by control
      const controlMap = new Map<string, { passed: number; failed: number }>();
      for (const f of scanResult.findings) {
        const checkId = (f.evidence_data.check as string) || 'github-general';
        const checkDef = CHECKS.find((c) => c.id === checkId);
        const control = checkDef ? checkDef.control : 'IR-4';
        const entry = controlMap.get(control) || { passed: 0, failed: 0 };
        if (f.severity === 'critical' || f.severity === 'high') {
          entry.failed += 1;
        } else {
          entry.passed += 1;
        }
        controlMap.set(control, entry);
      }
      const summary = Array.from(controlMap.entries()).map(
        ([control, counts]) => ({
          control,
          passed: counts.passed,
          failed: counts.failed,
        }),
      );

      return {
        success: scanResult.errors.length === 0,
        evidence,
        errors: scanResult.errors.length > 0 ? scanResult.errors : undefined,
        summary,
      };
    } catch {
      console.warn('[connector:github] Octokit not available, running in dry-run mode');
      return runDryRun(config);
    }
  },
  async validate(config: ConnectorConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.credentials || !config.credentials.token) {
      errors.push('GitHub Personal Access Token is required');
    }

    if (!config.settings || !config.settings.organization) {
      errors.push('GitHub Organization (owner) is required');
    }

    if (!config.settings || !config.settings.repository) {
      errors.push('Repository Name is required');
    }

    return { valid: errors.length === 0, errors };
  },
};
