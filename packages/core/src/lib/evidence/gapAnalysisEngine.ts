import { getDb } from "../../db";
import { clientControls, controls, evidence } from "../../schema";
import { eq } from "drizzle-orm";

export interface EvidenceGapItem {
  controlId: string;
  controlName: string;
  category: string;
  status: string;
  missingEvidenceType: string;
  severity: "critical" | "high" | "medium";
}

export async function analyzeClientEvidenceGaps(clientId: number) {
  const db = await getDb();

  const ctrlRows = await db
    .select({
      id: clientControls.id,
      controlId: controls.controlId,
      controlName: controls.name,
      category: controls.category,
      status: clientControls.status,
    })
    .from(clientControls)
    .leftJoin(controls, eq(clientControls.controlId, controls.id))
    .where(eq(clientControls.clientId, clientId));

  const evidenceRows = await db
    .select()
    .from(evidence)
    .where(eq(evidence.clientId, clientId));

  const evidenceControlIds = new Set(evidenceRows.map((e) => e.clientControlId));

  const missingGaps: EvidenceGapItem[] = [];

  for (const c of ctrlRows) {
    if (!c.controlId) continue;
    const hasProof = evidenceControlIds.has(c.id);

    if (!hasProof) {
      missingGaps.push({
        controlId: c.controlId,
        controlName: c.controlName || "Security Control",
        category: c.category || "General",
        status: c.status || "implemented",
        missingEvidenceType: c.category?.includes("Access")
          ? "IdP MFA Configuration Screenshot"
          : c.category?.includes("Crypto")
          ? "KMS Key Rotation Verification Log"
          : "Policy Sign-off & Automated Audit Log",
        severity: c.controlId.startsWith("AC") || c.controlId.startsWith("A.5") ? "critical" : "high",
      });
    }
  }

  const totalAssessed = ctrlRows.length;
  const fulfilled = totalAssessed - missingGaps.length;
  const auditReadinessScore = totalAssessed > 0 ? Math.round((fulfilled / totalAssessed) * 100) : 100;

  return {
    clientId,
    totalControlsAssessed: totalAssessed,
    controlsWithEvidence: fulfilled,
    missingGapCount: missingGaps.length,
    auditReadinessScore,
    missingGaps,
    timestamp: new Date().toISOString(),
  };
}
