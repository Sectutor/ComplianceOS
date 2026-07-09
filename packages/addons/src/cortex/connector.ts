/**
 * Cortex — Analyzer Addon
 *
 * Runs Cortex analyzers on IOCs from TheHive cases.
 * Supports VirusTotal, AbuseIPDB, Shodan, URLScan.io and more.
 */
import { AddonExecutor } from '../runtime/executor.js';
import type { AddonRunConfig, RunResult } from '../shared/types.js';

export interface CortexSettings {
  apiUrl: string;
  apiKey: string;
  /** Comma-separated analyzer IDs to run */
  enabledAnalyzers?: string;
  /** Max TLP level (0=clear, 1=green, 2=amber, 3=red) */
  maxTlp?: number;
}

export function registerCortexAddon(
  executor: AddonExecutor,
): void {
  executor.register('analyzer-cortex', async (config: AddonRunConfig) => {
    const startTime = Date.now();

    // TODO: Run Cortex analyzers on observable data
    // POST /api/analyzer/{id}/run

    return {
      findings: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 },
      durationSeconds: (Date.now() - startTime) / 1000,
    };
  });
}
