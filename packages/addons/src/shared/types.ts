/**
 * Shared TypeScript types for the addon system.
 */

import type { AddonManifest } from '../registry';

/** Severity levels that map to GRCompliance's risk system */
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** What triggered an addon run */
export type RunTrigger = 'scheduled' | 'manual' | 'webhook' | 'onboarding';

/** Status of an addon run */
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Status of an addon subscription */
export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'payment_failed'
  | 'expired'
  | 'cancelled';

/** Configuration passed to an addon's run handler */
export interface AddonRunConfig {
  clientId: number;
  subscriptionId: number;
  addonSlug: string;
  manifest: AddonManifest;
  settings: Record<string, unknown>;
}

/** A single finding from any tool, normalized to GRCompliance schema */
export interface NormalizedFinding {
  title: string;
  severity: RiskSeverity;
  description: string;
  frameworkMappings: string[];
  resourceId?: string;
  remediation?: string;
  rawEvidence: Record<string, unknown>;
}

/** Summary of a completed addon run */
export interface RunResult {
  findings: NormalizedFinding[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
  evidenceArtifacts?: {
    type: string;
    data: Record<string, unknown>;
  }[];
  durationSeconds: number;
}

/** Schema for addon settings forms */
export interface AddonSettingsSchema {
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'password' | 'json';
  key: string;
  label: string;
  defaultValue?: unknown;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  helpText?: string;
}

/** A handler function that an addon registers to execute its logic */
export type AddonRunHandler = (config: AddonRunConfig) => Promise<RunResult>;
