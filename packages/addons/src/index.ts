/**
 * @complianceos/addons — ComplianceOS Addon Marketplace
 *
 * Optional paid addons that extend GRCompliance with external tool integrations:
 * - Cloud Scanner (Prowler): automated cloud compliance scanning
 * - Endpoint SIEM (Wazuh): real-time endpoint detection and SIEM
 * - Dependency Scanner (OSV-Scanner): open-source dependency vulnerability scanning
 *
 * Each addon runs inside the same GRCompliance process — same UI, same auth,
 * same database. External CLI tools run as Docker containers on the host.
 *
 * @license Commercial (ComplianceOS Premium)
 */

// Addon registry
export { ADDON_REGISTRY, getAddonBySlug, listAddons, ADDON_CATEGORIES } from './registry.js';
export type { AddonManifest } from './registry.js';

// Database schema
export { addonSubscriptions, addonRunLogs } from './shared/schema.js';

// Types
export type {
  RiskSeverity,
  RunTrigger,
  RunStatus,
  SubscriptionStatus,
  AddonRunConfig,
  NormalizedFinding,
  RunResult,
  AddonSettingsSchema,
  AddonRunHandler,
} from './shared/types.js';

// Runtime
export { AddonExecutor } from './runtime/executor.js';
export { setExecutor, getExecutor, hasExecutor } from './runtime/executor-instance.js';
export { FindingsPusher } from './runtime/pusher.js';
export { WebhookHandler } from './runtime/webhook-handler.js';
export type { ToolNormalizer } from './runtime/webhook-handler.js';
