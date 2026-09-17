/**
 * Dependency Scanner (Trivy) — Addon Implementation
 *
 * Registers the Trivy scan handler with the addon executor.
 * Runs vulnerability scans against configured targets and pushes
 * findings into GRCompliance's risk register and evidence store.
 */

import { AddonExecutor } from '../runtime/executor';
import { FindingsPusher } from '../runtime/pusher';
import type { AddonRunConfig, RunResult } from '../shared/types';
import { normalizeTrivyOutput } from './normalizer';
import { runTrivyScan, type TrivyScanConfig } from './runner';

/**
 * Register the Trivy addon handler with the executor.
 * Called once at application startup.
 */
export function registerTrivyAddon(
  executor: AddonExecutor,
  pusher: FindingsPusher,
): void {
  executor.register('dep-scanner', async (runConfig: AddonRunConfig) => {
    // Merge settings with defaults — handles corrupt/missing settings from DB
    const defaults = defaultTrivySettings();
    const raw = runConfig.settings as any;
    const settings: TrivySettings = {
      repos: Array.isArray(raw?.repos) ? raw.repos : defaults.repos,
      directories: Array.isArray(raw?.directories) ? raw.directories : defaults.directories,
      sbomFiles: Array.isArray(raw?.sbomFiles) ? raw.sbomFiles : defaults.sbomFiles,
      minSeverity: raw?.minSeverity || defaults.minSeverity,
      scanType: raw?.scanType || defaults.scanType,
      schedule: raw?.schedule || defaults.schedule,
      timeout: typeof raw?.timeout === 'number' ? raw.timeout : defaults.timeout,
    };

    const startTime = Date.now();

    // Resolve scan targets from settings — always returns at least ['.']
    const targets = getScanTargets(settings);

    const minSeverity = settings.minSeverity ?? 'MEDIUM';
    const scanType = settings.scanType ?? 'fs';
    const allFindings: any[] = [];
    let totalVulns = 0;
    let totalHigh = 0;

    // Scan each target
    for (const target of targets) {
      console.log(`[Trivy] Scanning: ${target}`);

      const scanConfig: TrivyScanConfig = {
        target,
        minSeverity,
        scanType,
        timeout: settings.timeout ?? 120,
      };

      const rawOutput = await runTrivyScan(scanConfig);

      // Normalize output
      const result = normalizeTrivyOutput(rawOutput, {
        clientId: runConfig.clientId,
        target,
        source: 'trivy',
      });

      allFindings.push(...result.findings);
      totalVulns += result.summary.total;
      totalHigh += result.summary.failed;

      // Push scan summary as evidence
      pusher.pushEvidence({
        clientId: runConfig.clientId,
        title: `Trivy Scan — ${target}`,
        artifactType: 'vulnerability_scan',
        artifactData: {
          target,
          scanType,
          totalVulnerabilities: result.summary.total,
          highOrAbove: result.summary.failed,
          critical: result.summary.errors,
          scanDate: new Date().toISOString(),
          minSeverity,
        },
        source: 'trivy',
      });
    }

    // Push all findings as risks
    for (const finding of allFindings) {
      pusher.pushRisk({
        clientId: runConfig.clientId,
        title: finding.title,
        severity: finding.severity,
        description: finding.description,
        frameworkMappings: finding.frameworkMappings,
        source: 'trivy',
        resourceId: finding.resourceId,
        remediation: finding.remediation,
        rawEvidence: finding.rawEvidence,
      });
    }

    // Flush everything to the database
    let flushResult;
    try {
      flushResult = await pusher.flush();
    } catch (flushErr: any) {
      console.error('[Trivy] pusher.flush() threw:', flushErr.message, flushErr.stack?.split('\n').slice(0,4).join('\n'));
      throw new Error(`pusher.flush failed: ${flushErr.message}`);
    }
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    return {
      findings: allFindings,
      summary: {
        total: totalVulns,
        passed: totalVulns - totalHigh,
        failed: totalHigh,
        errors: allFindings.filter(f => f.severity === 'critical').length,
      },
      evidenceArtifacts: [
        {
          type: 'trivy_scan_summary',
          data: {
            scanDate: new Date().toISOString(),
            targetsScanned: targets.length,
            totalVulnerabilities: totalVulns,
            highOrAbove: totalHigh,
            minSeverity,
          },
        },
      ],
      durationSeconds: elapsed,
    };
  });
}

/**
 * Resolve scan targets from settings.
 */
function getScanTargets(settings: TrivySettings): string[] {
  const targets: string[] = [];

  // Default to current directory when nothing is configured
  const hasAnyTarget =
    (settings.repos && settings.repos.length > 0) ||
    (settings.directories && settings.directories.length > 0) ||
    (settings.sbomFiles && settings.sbomFiles.length > 0);

  if (!hasAnyTarget) {
    targets.push('.');
    return targets;
  }

  if (settings.repos && settings.repos.length > 0) {
    targets.push(...settings.repos.map((r: any) => r.url || r));
  }

  if (settings.directories && settings.directories.length > 0) {
    targets.push(...settings.directories);
  }

  if (settings.sbomFiles && settings.sbomFiles.length > 0) {
    targets.push(...settings.sbomFiles);
  }

  return targets;
}

/**
 * Settings schema for the Trivy addon.
 * Stored as JSON in addon_subscriptions.settings.
 */
export interface TrivySettings {
  /** Git repository URLs to scan */
  repos?: { url: string; branch?: string }[];
  /** Local directory paths to scan */
  directories?: string[];
  /** SBOM file paths to scan */
  sbomFiles?: string[];
  /** Minimum severity to report */
  minSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Scan type: filesystem, sbom, repo, image, rootfs */
  scanType?: 'fs' | 'sbom' | 'repo' | 'image' | 'rootfs';
  /** Scan schedule: daily, weekly, monthly */
  schedule?: 'daily' | 'weekly' | 'monthly';
  /** Timeout in seconds per scan */
  timeout?: number;
}

/**
 * Default settings for a new Trivy subscription.
 */
export function defaultTrivySettings(): TrivySettings {
  return {
    repos: [],
    directories: ['./'],
    sbomFiles: [],
    minSeverity: 'MEDIUM',
    scanType: 'fs',
    schedule: 'weekly',
    timeout: 120,
  };
}
