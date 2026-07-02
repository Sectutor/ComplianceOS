/**
 * Cloud Scanner (Prowler) — Addon Implementation
 *
 * This addon runs Prowler scans against client cloud accounts and
 * pushes findings into GRCompliance's risk register and evidence store.
 *
 * Handles two modes:
 * 1. Managed: GRCompliance runs Prowler via Docker on the infrastructure host
 * 2. BYO: Client runs Prowler themselves and sends results via webhook
 */

import { AddonExecutor } from '../runtime/executor';
import { FindingsPusher } from '../runtime/pusher';
import type { AddonRunConfig, RunResult, NormalizedFinding } from '../shared/types';
import { normalizeProwlerOutput } from './normalizer';
import { runProwlerScan, type ProwlerScanConfig } from './runner';

/**
 * Register the Prowler addon handler with the executor.
 * Called once at application startup.
 */
export function registerProwlerAddon(
  executor: AddonExecutor,
  pusher: FindingsPusher,
): void {
  executor.register('cloud-scanner', async (config: AddonRunConfig) => {
    const settings = config.settings as unknown as ProwlerSettings;
    const startTime = Date.now();

    // Validate settings
    const hasAnyAccount =
      (settings.awsAccounts?.length ?? 0) > 0 ||
      (settings.azureSubscriptions?.length ?? 0) > 0 ||
      (settings.gcpProjects?.length ?? 0) > 0;

    if (!hasAnyAccount) {
      throw new Error(
        'No cloud accounts configured. Add at least one AWS, Azure, or GCP account in addon settings.',
      );
    }

    const frameworks = settings.frameworks ?? ['nist_csf_2.0', 'soc2'];
    const allFindings: NormalizedFinding[] = [];
    let totalChecks = 0;
    let totalFailed = 0;

    // Scan each AWS account
    for (const account of settings.awsAccounts ?? []) {
      console.log(`[Prowler] Scanning AWS account: ${account.name}`);

      const scanConfig: ProwlerScanConfig = {
        provider: 'aws',
        accountName: account.name,
        regions: account.regions?.length ? account.regions : ['us-east-1'],
        frameworks,
        credentials: {
          accessKeyId: account.accessKeyId || '',
          secretAccessKey: account.secretAccessKey || '',
        },
        timeout: 600,
      };

      const rawOutput = await runProwlerScan(scanConfig);

      // Normalize output to GRCompliance format
      const result = normalizeProwlerOutput(rawOutput, {
        clientId: config.clientId,
        provider: 'aws',
        accountName: account.name,
        source: 'prowler',
      });

      allFindings.push(...result.findings);
      totalChecks += result.summary.total;
      totalFailed += result.summary.failed;

      // Push scan summary as evidence
      pusher.pushEvidence({
        clientId: config.clientId,
        title: `Prowler Scan — AWS ${account.name}`,
        artifactType: 'scan_result',
        artifactData: {
          provider: 'aws',
          account: account.name,
          totalChecks: result.summary.total,
          passed: result.summary.total - result.summary.failed,
          failed: result.summary.failed,
          frameworks,
          scanDate: new Date().toISOString(),
          region: account.regions?.join(', ') || 'us-east-1',
        },
        source: 'prowler',
      });
    }

    // Push all findings as risks
    for (const finding of allFindings) {
      pusher.pushRisk({
        clientId: config.clientId,
        title: finding.title,
        severity: finding.severity,
        description: finding.description,
        frameworkMappings: finding.frameworkMappings,
        source: 'prowler',
        resourceId: finding.resourceId,
        remediation: finding.remediation,
        rawEvidence: finding.rawEvidence,
      });
    }

    // Flush everything to the database
    const result = await pusher.flush();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    return {
      findings: allFindings,
      summary: {
        total: totalChecks,
        passed: totalChecks - totalFailed,
        failed: totalFailed,
        errors: allFindings.filter((f) => f.severity === 'critical').length,
      },
      evidenceArtifacts: [
        {
          type: 'prowler_scan_summary',
          data: {
            scanDate: new Date().toISOString(),
            accountsScanned: settings.awsAccounts?.length ?? 0,
            totalChecks,
            failedChecks: totalFailed,
            frameworks,
          },
        },
      ],
      durationSeconds: elapsed,
    };
  });
}

/**
 * Settings schema for the Prowler addon.
 * Stored as JSON in addon_subscriptions.settings.
 */
export interface ProwlerSettings {
  awsAccounts?: {
    name: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    regions: string[];
  }[];
  azureSubscriptions?: {
    name: string;
    tenantId: string;
    subscriptionId: string;
  }[];
  gcpProjects?: {
    name: string;
    projectId: string;
    serviceAccountKey?: string;
  }[];
  frameworks: string[];
  schedule: 'daily' | 'weekly' | 'monthly';
}

/**
 * Default settings for a new Prowler subscription.
 */
export function defaultProwlerSettings(): ProwlerSettings {
  return {
    awsAccounts: [],
    azureSubscriptions: [],
    gcpProjects: [],
    frameworks: ['nist_csf_2.0', 'soc2'],
    schedule: 'weekly',
  };
}
