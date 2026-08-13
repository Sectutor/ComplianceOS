import { getDb } from "../../db";
import { auditFindings } from "../../schema";
import { eq } from "drizzle-orm";

export interface LogAuditorFindingInput {
  clientId: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  auditorId: number;
  slaDays?: 30 | 60 | 90;
}

export async function logAuditorFinding(input: LogAuditorFindingInput) {
  const db = await getDb();

  const [inserted] = await db
    .insert(auditFindings)
    .values({
      clientId: input.clientId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "open",
      authorId: input.auditorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const slaDays = input.slaDays || (input.severity === "critical" ? 30 : input.severity === "high" ? 60 : 90);
  const capDueDate = new Date();
  capDueDate.setDate(capDueDate.getDate() + slaDays);

  return {
    success: true,
    findingId: inserted.id,
    title: inserted.title,
    severity: inserted.severity,
    status: inserted.status,
    slaDays,
    capDueDate: capDueDate.toISOString(),
  };
}

export async function getCapRemediationStatus(clientId: number) {
  const db = await getDb();

  const findingsList = await db
    .select()
    .from(auditFindings)
    .where(eq(auditFindings.clientId, clientId));

  const total = findingsList.length;
  const openCount = findingsList.filter((f) => f.status === "open").length;
  const remediatedCount = findingsList.filter((f) => f.status === "remediated" || f.status === "closed").length;

  return {
    clientId,
    totalFindings: total,
    openFindings: openCount,
    remediatedFindings: remediatedCount,
    capSlaCompliancePercentage: total > 0 ? Math.round((remediatedCount / total) * 100) : 100,
    findings: findingsList,
  };
}
