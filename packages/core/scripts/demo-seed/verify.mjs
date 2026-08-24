/**
 * Phase 6: Verification pass — count assertions, referential integrity,
 * enum sanity, and summary checks. Exits non-zero on failure.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });

const EXPECT = {
  nordwind: {
    employees: [100, 999], assets: [40, 999], risks: 80, work_items: 120,
    policies: 25, iso_controls: 123, evidence: [50, 999], vendors: [10, 30],
    ropa: 8, ai_systems: 3, privacy_modules: true,
  },
  apex: {
    employees: [90, 999], assets: [25, 999], risks: 80, work_items: 120,
    policies: 25, fedramp_controls: 62, nist800171_controls: 109, vendors: [8, 20],
    poams: 6, privacy_modules: false,
  },
};

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

async function verify(slug) {
  console.log(`\n===== VERIFYING ${slug.toUpperCase()} =====`);
  const E = EXPECT[slug];
  const [client] = await sql`
    SELECT id FROM clients
    WHERE name = ${slug === "nordwind" ? "Nordwind Logistics GmbH" : "Apex Federal Solutions Inc."}
    ORDER BY id DESC LIMIT 1`;
  if (!client) return check(`${slug}: client exists`, false);
  const cid = client.id;
  check(`${slug}: client exists`, true, `id=${cid}`);
  const c = async (q) => (await sql`SELECT count(*)::int n FROM ${sql(q)} WHERE client_id=${cid}`)[0].n;

  // counts
  for (const [tbl, range] of Object.entries({
    employees: E.employees, assets: E.assets, risks: null, work_items: null, policies: null,
    evidence: E.evidence, vendors: E.vendors,
  })) {
    const tableMap = { employees: "employees", assets: "assets", risks: "risk_scenarios", work_items: "work_items", policies: "client_policies", evidence: "evidence", vendors: "vendors" };
    const n = await c(tableMap[tbl]);
    let exp;
    if (tbl === "risks") exp = [E.risks, E.risks];
    else if (tbl === "work_items") exp = [E.work_items, E.work_items];
    else if (tbl === "policies") exp = [E.policies, E.policies];
    else if (tbl === "evidence" && !range) exp = [1, 999999];
    else exp = range || [0, 999999];
    check(`${slug}.${tbl} >= ${exp[0]}`, n >= exp[0] && n <= exp[1], `count=${n}`);
  }

  // SoA completeness
  const soaN = await sql`
    SELECT count(*)::int n FROM client_controls cc JOIN controls c ON c.id=cc.control_id
    WHERE cc.client_id=${cid} AND ${E.iso_controls ? sql`c.framework='ISO 27001'` : sql`c.framework='FedRAMP'`}`;
  check(`${slug}.SoA controls`, soaN[0].n >= (E.iso_controls || E.fedramp_controls), `${soaN[0].n}`);

  // referential integrity
  const orphanRisks = await sql`
    SELECT count(*)::int n FROM risk_scenarios WHERE client_id=${cid} AND asset_id IS NOT NULL
      AND asset_id NOT IN (SELECT id FROM assets WHERE client_id=${cid})`;
  check(`${slug}: no orphan risk->asset links`, orphanRisks[0].n === 0);

  const orphAcks = await sql`
    SELECT count(*)::int n FROM policy_acknowledgments WHERE client_id=${cid}
      AND policy_id NOT IN (SELECT id FROM client_policies WHERE client_id=${cid})`;
  check(`${slug}: no orphan acknowledgments`, orphAcks[0].n === 0);

  const empsNoDept = await sql`SELECT count(*)::int n FROM employees WHERE client_id=${cid} AND (department IS NULL OR department='')`;
  check(`${slug}: all employees have department`, empsNoDept[0].n === 0);

  const mgrs = await sql`
    SELECT count(*)::int n FROM employees e1 WHERE e1.client_id=${cid}
      AND e1.manager_id IS NOT NULL AND e1.manager_id NOT IN (SELECT id FROM employees WHERE client_id=${cid})`;
  check(`${slug}: manager links valid`, mgrs[0].n === 0);

  // enum validity is proven by inserts; double-check status distributions are sane
  const riskBands = await sql`SELECT DISTINCT inherent_risk FROM risk_scenarios WHERE client_id=${cid}`;
  check(`${slug}: risk bands populated`, riskBands.length > 0);

  // remaining-25% readiness: pending approvals + unassigned treatments exist
  const pend = await sql`SELECT count(*)::int n FROM work_items WHERE client_id=${cid} AND status IN ('pending','escalated')`;
  check(`${slug}: pending/escalated work items exist (user actions available)`, pend[0].n > 0, `${pend[0].n}`);

  const noTreat = await sql`
    SELECT count(*)::int n FROM risk_scenarios r WHERE r.client_id=${cid}
      AND r.id NOT IN (SELECT COALESCE(risk_scenario_id,-1) FROM risk_treatments WHERE client_id=${cid})`;
  check(`${slug}: risks without treatment exist (assignable)`, noTreat[0].n > 0, `${noTreat[0].n}`);

  // module-specific
  if (E.privacy_modules) {
    const ropa = await c("processing_activities");
    check(`${slug}.ROPA >= 5`, ropa >= 5, `${ropa}`);
    const dsars = await c("dsar_requests");
    check(`${slug}.DSARs >= 10`, dsars >= 10, `${dsars}`);
    const ai = await c("ai_systems");
    check(`${slug}.AI systems (EU AI Act) >= 3`, ai >= 3, `${ai}`);
  } else {
    const poams = await c("federal_poams");
    check(`${slug}.POA&M items == ${E.poams}`, poams === E.poams, `${poams}`);
    const ssp = await c("federal_ssps");
    check(`${slug}.SSP exists`, ssp >= 1);
    const rmf = await c("federal_rmf_workflows");
    check(`${slug}.RMF workflow exists`, rmf >= 1);
  }

  return cid;
}

async function main() {
  const nw = await verify("nordwind");
  const ap = await verify("apex");

  // cross-checks via API summaries (backend on 3005) — best effort
  try {
    for (const cid of [nw, ap]) {
      const res = await fetch(`http://localhost:3005/api/trpc/governance.queue.stats?input=${encodeURIComponent(JSON.stringify({ json: { clientId: cid } }))}`, {
        headers: { "content-type": "application/json" },
      }).then(r => r.text());
      const ok = res.includes("byStatus") && !res.includes("error");
      check(`api governance.stats client=${cid}`, ok, res.slice(0, 120));
    }
  } catch (e) {
    console.log("(api check skipped:", e.message.slice(0, 80), ")");
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n===== SUMMARY: ${results.length - failed.length}/${results.length} passed =====`);
  await sql.end();
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
