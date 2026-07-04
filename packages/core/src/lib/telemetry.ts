/**
 * Telemetry & Outbound Control
 *
 * Defines which outbound connections are MANDATORY (license enforcement)
 * and which are OPTIONAL (AI, threat intel, analytics, update checks).
 *
 * When NO_TELEMETRY=true, only license-related outbound calls are allowed.
 *
 * Use: `isTelemetryAllowed('feature_name')` before making any non-essential
 * outbound HTTP call.
 */

/* ------------------------------------------------------------------ */
/*  Feature classification                                             */
/* ------------------------------------------------------------------ */

export type TelemetryFeature =
  | 'license_validation'       // MANDATORY – always allowed
  | 'license_activation'       // MANDATORY – always allowed
  | 'license_renewal'          // MANDATORY – always allowed
  | 'ai_drafting'              // OPTIONAL  – requires ENABLE_AI=true + !NO_TELEMETRY
  | 'ai_risk_triage'           // OPTIONAL  – requires ENABLE_AI=true + !NO_TELEMETRY
  | 'ai_evidence_analysis'     // OPTIONAL  – requires ENABLE_AI=true + !NO_TELEMETRY
  | 'threat_intel'             // OPTIONAL  – requires ENABLE_THREAT_SCHEDULER=true
  | 'analytics'                // OPTIONAL  – requires NO_TELEMETRY=false
  | 'update_check'             // OPTIONAL  – requires NO_TELEMETRY=false
  | 'email_outbound'           // OPTIONAL  – requires SMTP configured
  | 'integration_webhook';     // OPTIONAL  – per-integration

/* ------------------------------------------------------------------ */
/*  Allowed set                                                        */
/* ------------------------------------------------------------------ */

const MANDATORY_FEATURES: Set<TelemetryFeature> = new Set<TelemetryFeature>([
  'license_validation',
  'license_activation',
  'license_renewal',
]);

/* ------------------------------------------------------------------ */
/*  Check                                                              */
/* ------------------------------------------------------------------ */

/**
 * Returns `true` if the given telemetry feature is allowed under current
 * environment configuration.
 *
 * MANDATORY features always return `true`.
 * OPTIONAL features return `false` when `NO_TELEMETRY=true` unless the
 * feature has its own explicit enable flag.
 */
export function isTelemetryAllowed(feature: TelemetryFeature): boolean {
  // Mandatory features are never blocked
  if (MANDATORY_FEATURES.has(feature)) return true;

  const noTelemetry = process.env.NO_TELEMETRY === 'true';
  if (noTelemetry) return false;

  // Feature-specific opt-in flags
  switch (feature) {
    case 'ai_drafting':
    case 'ai_risk_triage':
    case 'ai_evidence_analysis':
      return process.env.ENABLE_AI === 'true';

    case 'threat_intel':
      return process.env.ENABLE_THREAT_SCHEDULER === 'true';

    case 'analytics':
    case 'update_check':
      return process.env.ENABLE_ANALYTICS === 'true' &&
        process.env.NO_TELEMETRY !== 'true';

    case 'email_outbound':
      return !!(process.env.SMTP_HOST && process.env.SMTP_PORT);

    case 'integration_webhook':
      return true; // allowed by default; individual integrations gate themselves

    default:
      return !noTelemetry;
  }
}

/**
 * Returns a summary object describing which features are enabled.
 */
export function getTelemetryStatus(): Record<TelemetryFeature, boolean> {
  const features: TelemetryFeature[] = [
    'license_validation',
    'license_activation',
    'license_renewal',
    'ai_drafting',
    'ai_risk_triage',
    'ai_evidence_analysis',
    'threat_intel',
    'analytics',
    'update_check',
    'email_outbound',
    'integration_webhook',
  ];

  const status: Record<string, boolean> = {};
  for (const f of features) {
    status[f] = isTelemetryAllowed(f);
  }
  return status as Record<TelemetryFeature, boolean>;
}

/**
 * Log telemetry configuration at startup.
 */
export function logTelemetryStatus(): void {
  console.log('[Telemetry] === Outbound Communication Status ===');
  const status = getTelemetryStatus();
  for (const [feature, allowed] of Object.entries(status)) {
    const label = allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.log(`[Telemetry]   ${label}  ${feature}`);
  }
  console.log('[Telemetry] ======================================');
}
