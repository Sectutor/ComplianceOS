/**
 * Wazuh SIEM — Addon Implementation
 *
 * Integrates Wazuh for log ingestion, SIEM correlation, and threat hunting.
 * Modes:
 * 1. Managed: GRCompliance runs Wazuh Docker stack (indexer + server + dashboard)
 * 2. BYO: Client connects an existing Wazuh instance via API
 */
import { AddonExecutor } from '../runtime/executor.js';
import { FindingsPusher } from '../runtime/pusher.js';
import type { AddonRunConfig, RunResult, NormalizedFinding } from '../shared/types.js';

export interface WazuhSettings {
  /** Wazuh API URL (e.g. http://wazuh-server:55000) */
  apiUrl: string;
  /** API credentials */
  username?: string;
  password?: string;
  /** API key (alternative to username/password) */
  apiKey?: string;
  /** Frequency of alert polling in seconds */
  pollInterval?: number;
  /** Minimum alert level to escalate (0-15) */
  minAlertLevel?: number;
  /** Agent IDs to monitor (empty = all agents) */
  agentIds?: string[];
}

export function registerWazuhAddon(
  executor: AddonExecutor,
  pusher: FindingsPusher,
): void {
  executor.register('siem-wazuh', async (config: AddonRunConfig) => {
    const settings = config.settings as unknown as WazuhSettings;
    const startTime = Date.now();
    const findings: NormalizedFinding[] = [];

    // Poll Wazuh API for new alerts
    const alerts = await pollWazuhAlerts(settings, config);
    for (const raw of alerts) {
      findings.push({
        title: raw.rule?.description || 'Wazuh Alert',
        severity: mapWazuhLevel(raw.rule?.level ?? 0),
        description: raw.full_log || '',
        frameworkMappings: [],
        rawEvidence: raw,
      });
      await pusher.pushRisk({
        clientId: config.clientId,
        title: raw.rule?.description || 'Wazuh Alert',
        severity: mapWazuhLevel(raw.rule?.level ?? 0),
        description: raw.full_log || '',
        frameworkMappings: [],
        source: 'wazuh',
        rawEvidence: raw,
      });
    }

    return {
      findings,
      summary: {
        total: findings.length,
        passed: findings.length,
        failed: 0,
        errors: 0,
      },
      durationSeconds: (Date.now() - startTime) / 1000,
    };
  });
}

async function pollWazuhAlerts(
  settings: WazuhSettings,
  config: AddonRunConfig,
): Promise<any[]> {
  // TODO: Implement Wazuh REST API client
  // GET /security/alerts?limit=100&offset=0
  // Headers: Authorization: Bearer <token>
  return [];
}

function mapWazuhLevel(level: number): 'info' | 'low' | 'medium' | 'high' | 'critical' {
  if (level >= 15) return 'critical';
  if (level >= 12) return 'high';
  if (level >= 7) return 'medium';
  if (level >= 4) return 'low';
  return 'info';
}
