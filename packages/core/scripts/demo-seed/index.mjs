#!/usr/bin/env node
/**
 * Demo Data Engine orchestrator.
 *   node --env-file=.env scripts/demo-seed/index.mjs --tenant nordwind [--reset] [--scale full|light]
 */
import postgres from "postgres";
import { log } from "./util.mjs";
import { seedPhase0 } from "./phase0-org.mjs";
import { seedPhase1 } from "./phase1-governance.mjs";
import { seedPhase2 } from "./phase2-risk.mjs";
import { seedPhase3 } from "./phase3-controls-policies.mjs";
import { seedPhase4 } from "./phase4-modules.mjs";
import { seedPhase5 } from "./phase5-reports-federal.mjs";

const args = process.argv.slice(2);
const getArg = (k, d) => {
  const i = args.indexOf("--" + k);
  return i >= 0 ? (args[i + 1]?.startsWith("--") ? true : args[i + 1]) : d;
};
const tenant = getArg("tenant", "nordwind");
const doReset = args.includes("--reset");
const scale = getArg("scale", "full");

const sql = postgres(process.env.DATABASE_URL, { max: 5 });

// Tables to cascade-wipe on reset (children first not required — no hard FK enforcement used here,
// but order is safest). All filtered by client_id at runtime via subquery on demo tenants.
async function findDemoClients() {
  return sql`
    SELECT id FROM clients
    WHERE name IN ('Nordwind Logistics GmbH', 'Apex Federal Solutions Inc.')
       OR email LIKE 'demo+%@grcompliance.local'`;
}

async function reset() {
  const names = tenant === "nordwind" ? ["Nordwind Logistics GmbH"] : ["Apex Federal Solutions Inc."];
  const rows = await sql`
    SELECT id FROM clients WHERE name = ANY(${names})`;
  if (!rows.length) { log("reset: nothing to wipe"); return; }
  const ids = rows.map(r => r.id);
  log(`reset: wiping ${ids.length} demo client(s):`, ids.join(","));
  // wipe every table that has client_id
  const tables = await sql`
    SELECT DISTINCT table_name FROM information_schema.columns
    WHERE column_name='client_id' AND table_schema='public' AND table_name NOT IN ('clients')`;
  for (const t of tables) {
    const n = await sql`DELETE FROM ${sql(t.table_name)} WHERE client_id = ANY(${ids}) RETURNING 1`;
    if (n.length) log(`  wiped ${t.table_name}: ${n.length}`);
  }
  await sql`DELETE FROM user_clients WHERE client_id = ANY(${ids})`;
  await sql`DELETE FROM clients WHERE id = ANY(${ids})`;
  log("reset complete");
}

async function main() {
  if (doReset) await reset();

  log(`seeding tenant=${tenant} scale=${scale}`);
  const p0 = await seedPhase0(sql, tenant);
  const p1 = await seedPhase1(sql, p0.clientId);
  const p2 = await seedPhase2(sql, p0.clientId, tenant);
  const p3 = await seedPhase3(sql, p0.clientId, tenant);
  const p4 = await seedPhase4(sql, p0.clientId, tenant);
  const p5 = await seedPhase5(sql, p0.clientId, tenant);
  log("RESULT", JSON.stringify({ clientId: p0.clientId, ...p1, ...p2, ...p3, ...p4, ...p5 }));
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
