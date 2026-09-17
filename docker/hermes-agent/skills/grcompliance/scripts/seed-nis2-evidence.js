/**
 * Seed NIS2 evidence from CISOvault findings
 *
 * Maps top CISOvault findings as evidence against NIS2 controls
 * for client_id=1.
 *
 * Run: docker cp <this-file> complianceos-app-1:/tmp/seed-nis2.js
 *      NODE_PATH=/app/node_modules docker exec -w /app complianceos-app-1 node /tmp/seed-nis2.js
 */
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = 1;

async function main() {
  console.log("=".repeat(60));
  console.log("NIS2 Evidence Seeder — CISOvault → GRC Evidence Mapping");
  console.log("=".repeat(60));

  // Step 1: Get NIS2 controls
  const controlsRes = await pool.query(
    "SELECT id, control_id AS cid, name, description FROM controls WHERE framework = 'NIS2' ORDER BY control_id"
  );
  const controls = controlsRes.rows;
  console.log(`\n📋 Found ${controls.length} NIS2 controls`);

  // Step 2: Create client_controls (no API endpoint exists for this)
  const ccMap = {};
  for (const c of controls) {
    const existing = await pool.query(
      "SELECT id FROM client_controls WHERE client_id=$1 AND control_id=$2",
      [CLIENT_ID, c.id]
    );
    if (existing.rows.length > 0) {
      ccMap[c.cid] = existing.rows[0].id;
      console.log(`  ✅ ${c.cid} — existing client_control ID ${existing.rows[0].id}`);
    } else {
      const ins = await pool.query(
        `INSERT INTO client_controls (client_id, control_id, status, owner)
         VALUES ($1, $2, 'not_implemented', 'System') RETURNING id`,
        [CLIENT_ID, c.id]
      );
      ccMap[c.cid] = ins.rows[0].id;
      console.log(`  ✅ ${c.cid} — created client_control ID ${ins.rows[0].id}`);
    }
  }

  // Step 3: Create evidence records
  const evidenceMap = [
    { controlId: "21(2)(a)", evidenceId: "CISOV-RISK-MGMT-001",
      description: "CISOvault domain recon identified SPF/DMARC, TLS, and subdomain risks requiring risk assessment framework" },
    { controlId: "21(2)(a)", evidenceId: "CISOV-RISK-MGMT-002",
      description: "CISOvault scan of verifyfix.com completed — 19 subdomains discovered, TLS validation failed, SPF/DMARC missing" },
    { controlId: "21(2)(b)", evidenceId: "CISOV-INCIDENT-001",
      description: "CISOvault incident response procedures tested via security scan findings — 375 open incidents tracked" },
    { controlId: "21(2)(c)", evidenceId: "CISOV-BCP-001",
      description: "CISOvault business continuity evidence: 183 scans performed across multiple domains with consistent availability logging" },
    { controlId: "21(2)(d)", evidenceId: "CISOV-SUPPLY-001",
      description: "CISOvault subdomain enumeration found 19 accessible subdomains on verifyfix.com — supply chain surface mapped" },
    { controlId: "21(2)(d)", evidenceId: "CISOV-SUPPLY-002",
      description: "CISOvault dependency scan identified lodash prototype pollution (CVE-2025-13465) in supply chain dependencies" },
    { controlId: "21(2)(d)", evidenceId: "CISOV-SUPPLY-003",
      description: "CISOvault vendor assessment: 15 vendors tracked in GRC, supply chain risk from subdomain exposure documented" },
    { controlId: "21(2)(e)", evidenceId: "CISOV-DEV-001",
      description: "CISOvault secure development finding: dummy_app missing helmet, rate-limit, and CORS middleware in Express" },
    { controlId: "21(2)(e)", evidenceId: "CISOV-DEV-002",
      description: "CISOvault code analysis: lodash version needs upgrade from 4.17.21 to 4.17.23 for prototype pollution fix" },
    { controlId: "21(2)(g)", evidenceId: "CISOV-HYGIENE-001",
      description: "CISOvault email security scan: SPF missing on verifyfix.com, DMARC record absent — email spoofing risk" },
    { controlId: "21(2)(g)", evidenceId: "CISOV-HYGIENE-002",
      description: "CISOvault hygiene scan: SPF uses softfail (~all) on 2-ist.com, DMARC set to p=none — needs hardening" },
    { controlId: "21(2)(g)", evidenceId: "CISOV-HYGIENE-003",
      description: "CISOvault security headers scan: Nginx missing 7 security headers — inject remediation applied" },
    { controlId: "21(2)(h)", evidenceId: "CISOV-CRYPTO-001",
      description: "CISOvault TLS scan: Certificate validation failed for verifyfix.com — MITM risk confirmed" },
    { controlId: "21(2)(h)", evidenceId: "CISOV-CRYPTO-002",
      description: "CISOvault crypto audit: TLS certificate could not be retrieved for 2-ist.com — encryption posture unclear" },
    { controlId: "21(2)(i)", evidenceId: "CISOV-ACCESS-001",
      description: "CISOvault info leak scan: email addresses and HTML comments found in page source — data leakage risk" },
    { controlId: "21(2)(j)", evidenceId: "CISOV-MFA-001",
      description: "CISOvault security assessment: missing security headers include X-Frame-Options, HSTS, CSP, X-Content-Type-Options" },
    { controlId: "21(2)(j)", evidenceId: "CISOV-MFA-002",
      description: "CISOvault auto-remediation: 7 security headers injected into Nginx config — XSS, clickjacking, MIME-sniffing protections active" },
  ];

  const evRes = await pool.query("SELECT evidence_id FROM evidence WHERE client_id=$1", [CLIENT_ID]);
  const existingEv = new Set(evRes.rows.map(r => r.evidence_id));

  let created = 0, skipped = 0;
  for (const ev of evidenceMap) {
    if (existingEv.has(ev.evidenceId)) { skipped++; continue; }
    const ccId = ccMap[ev.controlId];
    if (!ccId) { skipped++; continue; }
    try {
      await pool.query(
        `INSERT INTO evidence (client_id, client_control_id, evidence_id, description, status, framework)
         VALUES ($1, $2, $3, $4, 'collected', 'NIS2')`,
        [CLIENT_ID, ccId, ev.evidenceId, ev.description]
      );
      created++;
    } catch (err) {
      console.log(`  ❌ ${ev.evidenceId} failed: ${err.message.substring(0, 100)}`);
      skipped++;
    }
  }
  console.log(`\n📊 Created: ${created}, Skipped: ${skipped}`);

  // Step 4: Update controls with evidence to in_progress
  const updateRes = await pool.query(`
    UPDATE client_controls cc SET status = 'in_progress'
    WHERE cc.id = ANY(SELECT e.client_control_id FROM evidence e WHERE e.status='collected' AND e.client_id=$1)
    AND cc.client_id=$1 AND cc.status='not_implemented'
    AND cc.control_id IN (SELECT id FROM controls WHERE framework='NIS2')
    RETURNING cc.id
  `, [CLIENT_ID]);
  console.log(`✅ Updated ${updateRes.rows.length} controls to 'in_progress'`);

  // Step 5: Verify
  const verify = await pool.query(`
    SELECT c.control_id, c.name, cc.status, COUNT(e.id)::int AS ev_count
    FROM controls c
    LEFT JOIN client_controls cc ON cc.control_id=c.id AND cc.client_id=$1
    LEFT JOIN evidence e ON e.client_control_id=cc.id
    WHERE c.framework='NIS2' GROUP BY c.control_id, c.name, cc.status ORDER BY c.control_id
  `, [CLIENT_ID]);

  console.log(`\n📊 NIS2 Readiness Summary for Client ${CLIENT_ID}:`);
  let imp=0, ip=0, ni=0;
  verify.rows.forEach(r => {
    console.log(`  [${r.status||'no_map'}] ${r.control_id} — ${r.name.substring(0,50)} (${r.ev_count} evidence)`);
    if (r.status==='implemented') imp++; else if (r.status==='in_progress') ip++; else ni++;
  });
  console.log(`\n📊 ${imp} implemented + ${ip} in_progress + ${ni} not_implemented out of ${verify.rows.length}`);

  await pool.end();
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
