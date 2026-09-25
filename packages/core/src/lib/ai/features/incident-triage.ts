/**
 * Incident Triage — Auto-classify and route security incidents.
 *
 * When an incident is reported, this module:
 * 1. Classifies the incident type and severity
 * 2. Determines regulatory notification obligations (GDPR 72h, NIS2 24h, HIPAA 60d)
 * 3. Routes to the appropriate response workflow
 * 4. Generates a regulatory deadline checklist
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { incidents } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentTriageResult {
  incidentId: number;
  incidentType: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  regulatoryObligations: Array<{
    regulation: string;
    requirement: string;
    deadline: string;
    deadlineHours: number;
    triggered: boolean;
  }>;
  responseActions: string[];
  suggestedAssignee: string;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulatory deadline rules (hardcoded — these are legal requirements, not AI)
// ─────────────────────────────────────────────────────────────────────────────

const REGULATORY_RULES = [
  {
    regulation: "GDPR",
    requirement: "Art. 33 — Supervisory authority notification",
    deadlineHours: 72,
    triggerCheck: (inc: any) => (inc.affectedUsersCount ?? 0) > 0 || inc.severity === "critical",
  },
  {
    regulation: "GDPR",
    requirement: "Art. 34 — Data subject communication (high risk)",
    deadlineHours: 48,
    triggerCheck: (inc: any) => inc.severity === "critical",
  },
  {
    regulation: "NIS2",
    requirement: "Early warning (significant incident)",
    deadlineHours: 24,
    triggerCheck: (inc: any) => inc.severity === "critical" || inc.severity === "high" || inc.isSignificant === true,
  },
  {
    regulation: "NIS2",
    requirement: "Incident notification (significant incident)",
    deadlineHours: 72,
    triggerCheck: (inc: any) => inc.severity === "critical" || inc.severity === "high" || inc.isSignificant === true,
  },
  {
    regulation: "HIPAA",
    requirement: "Breach notification (60-day window)",
    deadlineHours: 60 * 24,
    triggerCheck: (inc: any) => (inc.affectedUsersCount ?? 0) > 0,
  },
  {
    regulation: "PCI DSS",
    requirement: "Immediate notification to card brands",
    deadlineHours: 24,
    triggerCheck: (inc: any) => (inc.estimatedFinancialLoss ?? 0) > 0 || inc.severity === "critical",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main triage function
// ─────────────────────────────────────────────────────────────────────────────

export async function triageIncident(
  clientId: number,
  incidentId: number,
  userId?: number
): Promise<IncidentTriageResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load incident
  const incRows = await db.select().from(incidents).where(and(eq(incidents.id, incidentId), eq(incidents.clientId, clientId))).limit(1);
  if (incRows.length === 0) return null;
  const inc = incRows[0];

  // 2. Build triage input
  const data = {
    incidentId: inc.id,
    title: inc.title,
    description: inc.description,
    severity: inc.severity,
    status: inc.status,
    cause: inc.cause,
    affectedAssets: inc.affectedAssets,
    affectedUsersCount: inc.affectedUsersCount,
    isSignificant: inc.isSignificant,
    estimatedFinancialLoss: inc.estimatedFinancialLoss,
  };

  // 3. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "incident_triage",
      userId,
      entityType: "incident",
      entityId: incidentId,
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Classify: incident type
      const typeClassification = await provider.classify(
        `Incident: ${sanitizedData.title}\nDescription: ${sanitizedData.description}\nSeverity: ${sanitizedData.severity}`,
        ["Data Breach", "Ransomware", "Phishing", "Insider Threat", "DDoS", "System Compromise", "Unauthorized Access", "Data Leak", "Malware", "Configuration Error", "Physical Security", "Supply Chain Attack"],
        "Classify the security incident into one of the standard incident types."
      );

      // Scorer: severity assessment
      const severityScoring = await provider.score(
        `Security incident assessment: ${sanitizedData.title}`,
        [
          { id: "scope", description: "How many systems/users are affected?", weight: 0.25 },
          { id: "data_sensitivity", description: "How sensitive is the data involved?", weight: 0.25 },
          { id: "business_impact", description: "What is the business operational impact?", weight: 0.2 },
          { id: "containment", description: "How contained is the incident?", weight: 0.15 },
          { id: "recovery_complexity", description: "How complex is recovery?", weight: 0.15 },
        ],
        { min: 0, max: 100, labels: ["Low", "Medium", "High", "Critical"] }
      );

      // Router: which response workflow?
      const routing = await provider.route(
        `Incident type: ${typeClassification.label}\nSeverity: ${severityScoring.label}`,
        [
          { id: "contain_and_eradicate", description: "Immediate containment and eradication for active threats" },
          { id: "investigate_scope", description: "Investigation to determine full scope of compromise" },
          { id: "notify_stakeholders", description: "Regulatory and stakeholder notification workflow" },
          { id: "monitor_and_recover", description: "Monitoring and recovery for contained incidents" },
          { id: "post_incident_review", description: "Post-incident review and lessons learned" },
        ],
        "Route the incident to the most appropriate response workflow based on type and severity."
      );

      return { typeClassification, severityScoring, routing };
    }
  );

  // 4. Calculate regulatory obligations (deterministic — not AI-dependent)
  const regulatoryObligations = REGULATORY_RULES.map((rule) => ({
    regulation: rule.regulation,
    requirement: rule.requirement,
    deadline: `${rule.deadlineHours}h`,
    deadlineHours: rule.deadlineHours,
    triggered: rule.triggerCheck(inc),
  })).filter((o) => o.triggered);

  // 5. Build response actions based on routing
  const responseActions: string[] = [];
  if (!result.dryRun && result.response) {
    const { typeClassification, routing } = result.response;

    responseActions.push(`Classified as: ${typeClassification.label}`);
    responseActions.push(`Response path: ${routing.path}`);

    if (typeClassification.label === "Ransomware" || typeClassification.label === "Data Breach") {
      responseActions.push("1. Immediately isolate affected systems");
      responseActions.push("2. Preserve forensic evidence");
      responseActions.push("3. Activate incident response team");
    }
    if (typeClassification.label === "Phishing") {
      responseActions.push("1. Block sender and indicators of compromise");
      responseActions.push("2. Check for compromised credentials");
      responseActions.push("3. Notify affected users");
    }
  }

  // Map severity
  const severityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
  };

  return {
    incidentId,
    incidentType: result.response?.typeClassification?.label || inc.cause || "Unknown",
    severity: severityMap[inc.severity || "medium"] || "medium",
    confidence: result.response?.typeClassification?.confidence || 0,
    regulatoryObligations,
    responseActions,
    suggestedAssignee: "Security Team Lead",
    reasoning: result.response?.routing?.reasoning || result.error || (result.dryRun ? "Dry-run mode" : ""),
  };
}
