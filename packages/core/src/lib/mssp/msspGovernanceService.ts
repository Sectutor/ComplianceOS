import { getDb } from "../../db";
import { clients, clientControls, controls, riskAssessments } from "../../schema";
import { eq, inArray, sql, and } from "drizzle-orm";

export interface ClientSummary {
  clientId: number;
  clientName: string;
  passRate: number;
  totalControls: number;
  implementedControls: number;
  openRisksCount: number;
}

export interface MsspPartner {
  id: number;
  name: string;
  whiteLabelDomain?: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}

let msspTablesEnsured = false;

export async function ensureMsspTablesExist() {
  if (msspTablesEnsured) return;
  const db = await getDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mssp_partners (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        white_label_domain VARCHAR(255),
        logo_url TEXT,
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mssp_client_assignments (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(partner_id, client_id)
      );
    `);
    msspTablesEnsured = true;
  } catch (err) {
    console.error("[MsspGovernanceService] Error creating mssp tables:", err);
  }
}

/**
 * Create a new MSSP / GRC Partner Account
 */
export async function createMsspPartner(
  name: string,
  whiteLabelDomain?: string
): Promise<MsspPartner> {
  await ensureMsspTablesExist();
  const db = await getDb();

  const res = await db.execute(sql`
    INSERT INTO mssp_partners (name, white_label_domain)
    VALUES (${name}, ${whiteLabelDomain || null})
    RETURNING id, name, white_label_domain as "whiteLabelDomain", created_at as "createdAt";
  `);

  const row = (res.rows || res)[0] as any;
  return {
    id: row.id,
    name: row.name,
    whiteLabelDomain: row.whiteLabelDomain,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/**
 * Assign a client organization to an MSSP partner
 */
export async function assignClientToPartner(partnerId: number, clientId: number) {
  await ensureMsspTablesExist();
  const db = await getDb();

  await db.execute(sql`
    INSERT INTO mssp_client_assignments (partner_id, client_id)
    VALUES (${partnerId}, ${clientId})
    ON CONFLICT (partner_id, client_id) DO NOTHING;
  `);
}

/**
 * Compute multi-tenant portfolio risk & compliance rollup across all partner clients
 */
export async function getMsspPortfolioRollup(partnerId: number) {
  const clientSummaries: ClientSummary[] = [];
  
  await ensureMsspTablesExist();
  const db = await getDb();

  // 1. Fetch assigned clients
  const assignmentsRes = await db.execute(sql`
    SELECT client_id FROM mssp_client_assignments WHERE partner_id = ${partnerId};
  `);
  const assignedRows = (assignmentsRes.rows || assignmentsRes) as any[];
  let clientIds = assignedRows.map((r) => r.client_id);

  // If no specific assignments yet, default to all active clients for demonstration
  if (clientIds.length === 0) {
    const allClients = await db.select({ id: clients.id }).from(clients);
    clientIds = allClients.map((c) => c.id);
  }

  if (clientIds.length === 0) {
    return {
      partnerId,
      totalClients: 0,
      averagePassRate: 100,
      totalControlsAssessed: 0,
      totalOpenRisks: 0,
      clientSummaries,
    };
  }

  // 2. Fetch client details & controls stats per client
  let aggregatePassRateSum = 0;
  let totalControlsAssessed = 0;

  for (const cId of clientIds) {
    const [clientObj] = await db.select().from(clients).where(eq(clients.id, cId));

    const ctrlRows = await db
      .select({ id: clientControls.id, status: clientControls.status })
      .from(clientControls)
      .where(eq(clientControls.clientId, cId));

    const totalCtrls = ctrlRows.length;
    const implemented = ctrlRows.filter((c) => c.status === "implemented").length;
    const passRate = totalCtrls > 0 ? Math.round((implemented / totalCtrls) * 100) : 100;

    const riskRows = await db
      .select({ id: riskAssessments.id })
      .from(riskAssessments)
      .where(eq(riskAssessments.clientId, cId));

    aggregatePassRateSum += passRate;
    totalControlsAssessed += totalCtrls;

    clientSummaries.push({
      clientId: cId,
      clientName: clientObj?.name || `Client #${cId}`,
      passRate,
      totalControls: totalCtrls,
      implementedControls: implemented,
      openRisksCount: riskRows.length,
    });
  }

  const averagePassRate =
    clientSummaries.length > 0 ? Math.round(aggregatePassRateSum / clientSummaries.length) : 100;

  return {
    partnerId,
    totalClients: clientSummaries.length,
    averagePassRate,
    totalControlsAssessed,
    clientSummaries,
    timestamp: new Date().toISOString(),
  };
}
