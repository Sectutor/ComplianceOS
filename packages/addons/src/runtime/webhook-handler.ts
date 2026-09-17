/**
 * Addon Webhook Handler
 *
 * Generic webhook receiver that accepts tool output from
 * client-managed infrastructure (BYO mode).
 *
 * When a client runs Prowler/Wazuh/OSV-Scanner on their own servers,
 * they can POST the JSON output here. The normalizer processes it
 * the same way as if the addon ran it internally.
 */

import type { RunResult } from '../shared/types';

interface WebhookPayload {
  /** Addon slug that identifies which normalizer to use */
  addonSlug: string;

  /** API key for authentication */
  apiKey: string;

  /** Raw tool output (Prowler JSON, OSV JSON, Wazuh alert JSON) */
  data: unknown;

  /** Optional metadata about the run */
  meta?: {
    toolVersion?: string;
    scannedAt?: string;
    durationSeconds?: number;
    environment?: string;
  };
}

/**
 * Normalizer interface — each addon implements one
 * to convert raw tool output into RunResult format.
 */
export interface ToolNormalizer {
  normalize(rawOutput: unknown): RunResult;
}

export class WebhookHandler {
  private normalizers = new Map<string, ToolNormalizer>();

  /** Register a normalizer for an addon slug */
  register(slug: string, normalizer: ToolNormalizer): void {
    this.normalizers.set(slug, normalizer);
  }

  /**
   * Process an incoming webhook payload.
   *
   * 1. Validate API key (maps to clientId + subscription)
   * 2. Look up normalizer
   * 3. Normalize raw output → RunResult
   * 4. Return normalized result for persistence
   */
  async process(payload: WebhookPayload): Promise<{
    clientId: number;
    runResult: RunResult;
  }> {
    const normalizer = this.normalizers.get(payload.addonSlug);
    if (!normalizer) {
      throw new Error(`No normalizer registered for addon "${payload.addonSlug}"`);
    }

    // Validate API key and resolve to clientId
    // In production, this queries the addon_subscriptions table
    const clientId = await this.resolveApiKey(payload.apiKey, payload.addonSlug);

    // Normalize the raw tool output
    const runResult = normalizer.normalize(payload.data);

    return { clientId, runResult };
  }

  private async resolveApiKey(
    apiKey: string,
    addonSlug: string,
  ): Promise<number> {
    if (!apiKey || apiKey.length < 8) {
      throw new Error('Invalid API key');
    }

    // In production, this queries:
    // SELECT client_id FROM addon_subscriptions
    // WHERE addon_slug = ? AND api_key = ? AND status IN ('active', 'trial')
    //
    // For the stub, we return a placeholder.
    // The real implementation validates against the addon_subscriptions table.
    return 0;
  }
}
