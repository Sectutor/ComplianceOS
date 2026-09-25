/**
 * AI Autopilot — Wires all 12 AI features into the autopilot scheduler.
 *
 * Runs periodic AI-powered analysis for all enabled features.
 * Each run:
 * 1. Checks which features are enabled for the client
 * 2. Runs only enabled features through the privacy gatekeeper
 * 3. Stores results for dashboard display
 * 4. Logs all activity to the audit log
 */

import { getDb } from "../../db";
import { aiFeatureToggles, aiPrivacySettings } from "../../schema/ai-features";
import { eq, and } from "drizzle-orm";

// Feature modules
import { batchClassifyEvidence } from "./features/evidence-classifier";
import { prioritizeGaps } from "./features/gap-prioritizer";
import { batchScoreVendors } from "./features/vendor-risk-scorer";
import { scoreAuditReadiness } from "./features/audit-readiness";
import { generateRemediationPlan } from "./features/remediation-orchestrator";
import { checkRegulationChanges } from "./features/regulation-monitor";
import { checkExternalAiPermission } from "./privacy-gatekeeper";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AutopilotRunResult {
  clientId: number;
  timestamp: string;
  featuresRun: string[];
  featuresSkipped: string[];
  featuresFailed: string[];
  results: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main autopilot tick — runs all enabled AI features for a client
// ─────────────────────────────────────────────────────────────────────────────

export async function runAiAutopilot(clientId: number): Promise<AutopilotRunResult> {
  const startTime = Date.now();
  const result: AutopilotRunResult = {
    clientId,
    timestamp: new Date().toISOString(),
    featuresRun: [],
    featuresSkipped: [],
    featuresFailed: [],
    results: {},
  };

  const db = await getDb();
  if (!db) return result;

  // 1. Check master switch
  const privacyRows = await db.select().from(aiPrivacySettings)
    .where(eq(aiPrivacySettings.clientId, clientId))
    .limit(1);

  const privacy = privacyRows[0];
  if (!privacy || !privacy.externalAiEnabled) {
    return result; // Master switch off — skip everything
  }

  // 2. Load enabled feature toggles
  const toggles = await db.select().from(aiFeatureToggles)
    .where(and(eq(aiFeatureToggles.clientId, clientId), eq(aiFeatureToggles.isEnabled, true)));

  const enabledFeatures = new Set(toggles.map((t: any) => t.featureId));

  // 3. Run each enabled feature
  const featureRunners: Record<string, () => Promise<any>> = {
    evidence_classifier: async () => {
      // Get recent unclassified evidence
      const { evidence } = await import("../../schema");
      const recentEvidence = await db.select().from(evidence)
        .where(eq(evidence.clientId, clientId))
        .limit(10);
      return batchClassifyEvidence(clientId, recentEvidence.map((e: any) => e.id));
    },
    gap_prioritizer: async () => prioritizeGaps(clientId),
    vendor_risk_scorer: async () => batchScoreVendors(clientId),
    audit_readiness: async () => scoreAuditReadiness(clientId),
    remediation_orchestrator: async () => generateRemediationPlan(clientId),
    regulation_monitor: async () => checkRegulationChanges(clientId),
  };

  for (const [featureId, runner] of Object.entries(featureRunners)) {
    if (!enabledFeatures.has(featureId)) {
      result.featuresSkipped.push(featureId);
      continue;
    }

    try {
      const featureResult = await runner();
      result.featuresRun.push(featureId);
      result.results[featureId] = featureResult;
    } catch (err: any) {
      result.featuresFailed.push(featureId);
      result.results[featureId] = { error: err.message };
    }
  }

  // Features that require specific entity IDs (not batch-run)
  // These are triggered on-demand, not on schedule:
  // - incident_triage (triggered on incident creation)
  // - dsar_classifier (triggered on DSAR receipt)
  // - policy_extractor (triggered on regulation text upload)
  // - control_mapper (triggered on framework addition)
  // - compliance_query (triggered on user query)
  // - confidence_escalation (wrapper, not standalone)

  const onDemandFeatures = [
    "incident_triage", "dsar_classifier", "policy_extractor",
    "control_mapper", "compliance_query", "confidence_escalation",
  ];
  for (const fw of onDemandFeatures) {
    if (enabledFeatures.has(fw)) {
      result.featuresSkipped.push(`${fw} (on-demand only)`);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Run AI autopilot for ALL active clients (for MSP/cron mode)
// ─────────────────────────────────────────────────────────────────────────────

export async function runAiAutopilotAllClients(): Promise<AutopilotRunResult[]> {
  const db = await getDb();
  if (!db) return [];

  // Find all clients with external AI enabled
  const enabledClients = await db.select().from(aiPrivacySettings)
    .where(eq(aiPrivacySettings.externalAiEnabled, true));

  const results: AutopilotRunResult[] = [];
  for (const client of enabledClients) {
    try {
      const result = await runAiAutopilot(client.clientId);
      results.push(result);
    } catch (err: any) {
      console.error(`[AIAutopilot] Failed for client ${client.clientId}:`, err.message);
      results.push({
        clientId: client.clientId,
        timestamp: new Date().toISOString(),
        featuresRun: [],
        featuresSkipped: [],
        featuresFailed: ["all"],
        results: { error: err.message },
      });
    }
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────═
// Trigger on-demand features from event handlers
// ────────────────────────────────────────────────────────────────═════════════

/**
 * Call this when a new incident is created.
 */
export async function onIncidentCreated(clientId: number, incidentId: number): Promise<void> {
  const check = await checkExternalAiPermission(clientId, "incident_triage");
  if (!check.allowed && !check.isDryRun) return;

  const { triageIncident } = await import("./features/incident-triage");
  await triageIncident(clientId, incidentId);
}

/**
 * Call this when a new DSAR is received.
 */
export async function onDSARReceived(clientId: number, requestId: number): Promise<void> {
  const check = await checkExternalAiPermission(clientId, "dsar_classifier");
  if (!check.allowed && !check.isDryRun) return;

  const { classifyDSAR } = await import("./features/dsar-classifier");
  await classifyDSAR(clientId, requestId);
}

/**
 * Call this when a new framework is added to a client's program.
 */
export async function onFrameworkAdded(
  clientId: number,
  newFramework: string,
  existingFrameworks: string[]
): Promise<void> {
  const check = await checkExternalAiPermission(clientId, "control_mapper");
  if (!check.allowed && !check.isDryRun) return;

  const { mapControlsAcrossFrameworks } = await import("./features/control-mapper");
  for (const existingFw of existingFrameworks) {
    await mapControlsAcrossFrameworks(clientId, existingFw, newFramework);
  }
}
