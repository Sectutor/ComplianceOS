import { getDb } from "../db";
import * as schema from "../schema";
import { eq, and, lt, gte, lte, isNull, sql } from "drizzle-orm";

export interface UrgentItem {
  id: number;
  evidenceId: string;
  owner: string | null;
  expirationDate: Date | null;
  daysUntilExpiry: number;
  status: string | null;
  controlName: string | null;
}

export interface EvidenceExpiryStats {
  total: number;
  expired: number;
  expiring30: number;
  expiring90: number;
  noExpiry: number;
  urgentItems: UrgentItem[];
}

export async function getEvidenceExpiryStats(clientId: number): Promise<EvidenceExpiryStats> {
  const db = await getDb();
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Fetch all evidence for this client, joining with clientControls and controls for the control name
  const allEvidence = await db
    .select({
      id: schema.evidence.id,
      clientId: schema.evidence.clientId,
      clientControlId: schema.evidence.clientControlId,
      evidenceId: schema.evidence.evidenceId,
      description: schema.evidence.description,
      framework: schema.evidence.framework,
      type: schema.evidence.type,
      status: schema.evidence.status,
      dueDate: schema.evidence.dueDate,
      owner: schema.evidence.owner,
      expirationDate: schema.evidence.expirationDate,
      intervalDays: schema.evidence.intervalDays,
      lastVerified: schema.evidence.lastVerified,
      controlName: schema.controls.name,
    })
    .from(schema.evidence)
    .leftJoin(
      schema.clientControls,
      eq(schema.evidence.clientControlId, schema.clientControls.id)
    )
    .leftJoin(
      schema.controls,
      eq(schema.clientControls.controlId, schema.controls.id)
    )
    .where(eq(schema.evidence.clientId, clientId));

  const total = allEvidence.length;

  // Count expired (expirationDate < now, status != 'expired')
  const expired = allEvidence.filter(
    (e) => e.expirationDate && new Date(e.expirationDate) < now && e.status !== 'expired'
  ).length;

  // Count expiring within 30 days (expirationDate between now and 30 days from now)
  const expiring30 = allEvidence.filter(
    (e) =>
      e.expirationDate &&
      new Date(e.expirationDate) >= now &&
      new Date(e.expirationDate) <= in30Days
  ).length;

  // Count expiring within 90 days (expirationDate between 30 and 90 days from now)
  const expiring90 = allEvidence.filter(
    (e) =>
      e.expirationDate &&
      new Date(e.expirationDate) > in30Days &&
      new Date(e.expirationDate) <= in90Days
  ).length;

  // Count with no expiration set
  const noExpiry = allEvidence.filter((e) => !e.expirationDate).length;

  // Build urgent items: items where expirationDate exists, sorted soonest first, top 5
  const itemsWithExpiry = allEvidence
    .filter((e) => e.expirationDate)
    .map((e) => ({
      id: e.id,
      evidenceId: e.evidenceId,
      owner: e.owner,
      expirationDate: e.expirationDate,
      daysUntilExpiry: Math.round(
        (new Date(e.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
      status: e.status,
      controlName: e.controlName || null,
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 5);

  return {
    total,
    expired,
    expiring30,
    expiring90,
    noExpiry,
    urgentItems: itemsWithExpiry,
  };
}
