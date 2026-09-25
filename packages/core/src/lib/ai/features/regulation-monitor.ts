/**
 * Regulation Change Monitor — Detect and alert on regulation changes.
 *
 * Monitors configured regulation sources for changes:
 * 1. Periodically fetches regulation content
 * 2. Hashes and compares to detect changes
 * 3. Analyzes impact on existing controls and policies
 * 4. Generates alerts with specific change descriptions
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { regulationWatch, clientControls, clientPolicies } from "../../../schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RegulationChangeAlert {
  regulationName: string;
  regulationUrl?: string;
  changeDetected: boolean;
  changeDescription?: string;
  affectedControls: string[];
  affectedPolicies: string[];
  requiredActions: string[];
  severity: "critical" | "moderate" | "informational";
  lastChecked: string;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main monitoring function
// ─────────────────────────────────────────────────────────────────────────────

export async function checkRegulationChanges(
  clientId: number,
  userId?: number
): Promise<RegulationChangeAlert[]> {
  const db = await getDb();
  if (!db) return [];

  // 1. Load watched regulations
  const watched = await db.select().from(regulationWatch).where(
    and(eq(regulationWatch.clientId, clientId), eq(regulationWatch.isActive, true))
  );

  const alerts: RegulationChangeAlert[] = [];

  for (const reg of watched) {
    if (!reg.regulationUrl) continue;

    try {
      // 2. Fetch current content (with timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(reg.regulationUrl, {
        headers: { "User-Agent": "ComplianceOS-RegulationMonitor/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const content = await response.text();
      const contentHash = crypto.createHash("sha256").update(content).digest("hex");

      // 3. Compare hash
      if (reg.lastContentHash === contentHash) {
        // No change — update lastChecked
        await db.update(regulationWatch)
          .set({ lastCheckedAt: new Date() })
          .where(eq(regulationWatch.id, reg.id));
        continue;
      }

      // 4. Change detected! Analyze impact
      const alert = await analyzeRegulationChange(clientId, reg, content, userId);
      if (alert) {
        alerts.push(alert);
      }

      // 5. Update the watch record
      await db.update(regulationWatch)
        .set({
          lastContentHash: contentHash,
          lastCheckedAt: new Date(),
          lastChangedAt: new Date(),
        })
        .where(eq(regulationWatch.id, reg.id));

    } catch (err: any) {
      console.error(`[RegulationMonitor] Failed to check ${reg.regulationName}:`, err.message);
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Change analysis
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeRegulationChange(
  clientId: number,
  reg: any,
  newContent: string,
  userId?: number
): Promise<RegulationChangeAlert | null> {
  const db = await getDb();
  if (!db) return null;

  // Load affected controls and policies
  const affectedControls = await db.select().from(clientControls).where(eq(clientControls.clientId, clientId));
  const affectedPolicies = await db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId));

  const data = {
    regulationName: reg.regulationName,
    regulationContent: newContent.slice(0, 8000),
    previousContentSnippet: reg.lastContentHash ? "Previously cached content" : "First time check",
    affectedControlIds: reg.affectedControls || [],
    existingPolicies: affectedPolicies.map((p) => p.name).join(", ") || "None",
  };

  // Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "regulation_monitor",
      userId,
      entityType: "regulation",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Extractor: what changed?
      const extraction = await provider.extract(
        `New regulation text for ${sanitizedData.regulationName}:\n\n${sanitizedData.regulationContent}`,
        {
          keyChanges: { type: "string[]", description: "List of key changes or new requirements", required: true },
          newObligations: { type: "string[]", description: "New obligations introduced", required: false },
          modifiedObligations: { type: "string[]", description: "Existing obligations that were modified", required: false },
          removedObligations: { type: "string[]", description: "Obligations that were removed or relaxed", required: false },
        }
      );

      // Scorer: impact severity
      const impactScoring = await provider.score(
        `Regulation change detected for ${sanitizedData.regulationName}`,
        [
          { id: "scope_of_change", description: "How broad is the change in scope?", weight: 0.3 },
          { id: "compliance_impact", description: "How much does this affect compliance requirements?", weight: 0.3 },
          { id: "implementation_effort", description: "How much effort to implement changes?", weight: 0.2 },
          { id: "deadline_urgency", description: "How urgent is the deadline?", weight: 0.2 },
        ],
        { min: 0, max: 100, labels: ["Informational", "Moderate", "Significant", "Critical"] }
      );

      return { extraction, impactScoring };
    }
  );

  // Build alert
  const severityMap: Record<string, RegulationChangeAlert["severity"]> = {
    "Critical": "critical",
    "Significant": "critical",
    "Moderate": "moderate",
    "Informational": "informational",
  };

  const changes = result.response?.extraction?.extracted;
  const requiredActions: string[] = [];

  if (changes?.newObligations?.length) {
    requiredActions.push(`Address ${changes.newObligations.length} new obligation(s) introduced`);
  }
  if (changes?.modifiedObligations?.length) {
    requiredActions.push(`Update controls for ${changes.modifiedObligations.length} modified obligation(s)`);
  }
  if (changes?.removedObligations?.length) {
    requiredActions.push(`Review ${changes.removedObligations.length} removed obligation(s) — may affect control mapping`);
  }

  return {
    regulationName: reg.regulationName,
    regulationUrl: reg.regulationUrl || undefined,
    changeDetected: true,
    changeDescription: changes?.keyChanges?.join("; ") || "Content has changed",
    affectedControls: reg.affectedControls || [],
    affectedPolicies: affectedPolicies.map((p) => p.name || "").filter(Boolean),
    requiredActions,
    severity: severityMap[result.response?.impactScoring?.label || "Informational"] || "informational",
    lastChecked: new Date().toISOString(),
    reasoning: result.response?.impactScoring?.reasoning || (result.dryRun ? "Dry-run mode" : ""),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Add a regulation to watch list
// ─────────────────────────────────────────────────────────────────────────────

export async function addRegulationToWatch(
  clientId: number,
  regulationName: string,
  regulationUrl: string,
  affectedControls?: string[]
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already watching
    const existing = await db.select().from(regulationWatch).where(
      and(eq(regulationWatch.clientId, clientId), eq(regulationWatch.regulationName, regulationName))
    ).limit(1);

    if (existing.length > 0) {
      // Update existing
      await db.update(regulationWatch)
        .set({
          regulationUrl,
          affectedControls,
          isActive: true,
          lastCheckedAt: new Date(),
        })
        .where(eq(regulationWatch.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(regulationWatch).values({
        clientId,
        regulationName,
        regulationUrl,
        affectedControls,
        isActive: true,
        lastCheckedAt: new Date(),
      });
    }

    return true;
  } catch (err: any) {
    console.error(`[RegulationMonitor] Failed to add regulation:`, err.message);
    return false;
  }
}
