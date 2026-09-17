/**
 * Section 889 + federal contracts seed for Apex (789).
 * Adds section_889 columns additively (safe if re-run), seeds 2 contracts
 * with DFARS/889 clause flags, and verifies.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const CLIENT = 789;

// Additive schema extension: Section 889 representation tracking
await sql`ALTER TABLE federal_contracts ADD COLUMN IF NOT EXISTS section_889_status varchar(50) DEFAULT 'not_required'`;
await sql`ALTER TABLE federal_contracts ADD COLUMN IF NOT EXISTS section_889_representative varchar(255)`;
await sql`ALTER TABLE federal_contracts ADD COLUMN IF NOT EXISTS section_889_date timestamp`;

const existing = await sql`select count(*)::int as n from federal_contracts where client_id=${CLIENT}`;
if (existing[0].n === 0) {
  await sql`
    INSERT INTO federal_contracts (client_id, title, agency_name, contract_number, type, status,
      dfars_7012, dfars_7019, dfars_7020, dfars_7021, far_52_204_21, cmmc_level,
      section_889_status, section_889_representative, section_889_date)
    VALUES
    (${CLIENT}, 'DoD CIO — Secure Identity Analytics Platform', 'Department of Defense', 'HQ0034-26-C-0021', 'prime', 'active',
      true, true, true, true, true, 'L2',
      'compliant', 'R. Okafor (Contracts)', now()),
    (${CLIENT}, 'DHMSM Data Migration Support (Subcontract to Leidos)', 'Defense Health Agency', 'HT0018-24-F-0102', 'subcontractor', 'active',
      true, true, false, false, true, null,
      'compliant', 'R. Okafor (Contracts)', now())`;
}
const v = await sql`select title, type, dfars_7012, cmmc_level, section_889_status from federal_contracts where client_id=${CLIENT}`;
console.log("VERIFY contracts:", JSON.stringify(v));
await sql.end();
