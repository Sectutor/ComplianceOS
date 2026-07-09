/**
 * TheHive — Incident Response Addon
 *
 * Bi-directional sync between TheHive cases and GRCompliance risks.
 * Creates cases from Wazuh alerts, syncs case status back.
 */
import { AddonExecutor } from '../runtime/executor.js';
import type { AddonRunConfig, RunResult } from '../shared/types.js';

export interface TheHiveSettings {
  apiUrl: string;
  apiKey: string;
  /** Auto-create cases from GRC risks above this severity */
  minRiskSeverity?: string;
  /** Organization name in TheHive */
  organization?: string;
}

export function registerTheHiveAddon(
  executor: AddonExecutor,
): void {
  executor.register('ir-thehive', async (config: AddonRunConfig) => {
    const settings = config.settings as unknown as TheHiveSettings;
    const startTime = Date.now();

    // Fetch open cases from TheHive
    const cases = await fetchTheHiveCases(settings);
    // Map to GRCompliance risks
    // TODO: POST to GRC risk register

    return {
      findings: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 },
      durationSeconds: (Date.now() - startTime) / 1000,
    };
  });
}

async function fetchTheHiveCases(settings: TheHiveSettings): Promise<any[]> {
  // TODO: GET /api/v1/case?status=Open
  // Headers: Authorization: Bearer <apiKey>
  return [];
}
