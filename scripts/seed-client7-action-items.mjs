/**
 * Seeds the Action Center "capabilities showcase" dataset for Client 7 (LaTorre LTD).
 *
 * Populates every category the Action Center scans (packages/core/src/lib/action-center.ts)
 * with realistic volumes of overdue / expiring / failing records, so a fresh install
 * demonstrates the full issue-management experience (2,000+ actionable items).
 *
 * Runs AFTER scripts/bootstrap-db.ts and scripts/seed-client7-massive-100each.mjs.
 * Re-runnable: previously seeded rows are tagged and deleted before re-seeding.
 *
 * Tag format: titles/names start with "[AISEED]", tokens/ids with "aiseed-".
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = 7;
const TAG = '[AISEED]';
const now = new Date();
const daysFromNow = (d) => new Date(now.getTime() + d * 86400000);
const daysAgo = (d) => new Date(now.getTime() - d * 86400000);

async function main() {
  await client.connect();
  console.log('[action-seed] Connected to database');

  // ---------- Clean previously seeded rows ----------
  await client.query(`DELETE FROM implementation_tasks WHERE title LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM implementation_plans WHERE title LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM evidence WHERE description LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM vendor_assessment_requests WHERE token LIKE 'aiseed-%'`);
  await client.query(`DELETE FROM vendor_assessment_templates WHERE name LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM policy_reviews WHERE policy_name LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM policy_exceptions WHERE reason LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM access_review_assignments WHERE campaign_id IN (SELECT id FROM access_review_campaigns WHERE name LIKE $1)`, [TAG + '%']);
  await client.query(`DELETE FROM access_review_campaigns WHERE name LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM cloud_connections WHERE name LIKE $1`, [TAG + '%']);
  await client.query(`DELETE FROM autopilot_actions WHERE metadata->>'source' = 'capabilities-showcase'`);
  await client.query(`DELETE FROM autopilot_runs WHERE results->>'source' = 'capabilities-showcase'`);
  console.log('[action-seed] Cleaned previous seed rows');

  // ---------- 1. Overdue implementation tasks (control_overdue) ----------
  const planIds = [];
  for (const wave of ['ISO 27001 Implementation Wave 1', 'ISO 27001 Implementation Wave 2', 'SOC 2 Type II Readiness Program']) {
    const r = await client.query(
      `INSERT INTO implementation_plans (client_id, title, description, planned_start_date, planned_end_date, created_by_id)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`,
      [CLIENT_ID, `${TAG} ${wave}`, 'Capabilities showcase implementation program', daysAgo(90), daysFromNow(120)]
    );
    planIds.push(r.rows[0].id);
  }

  const taskVerbs = ['Deploy', 'Configure', 'Review', 'Harden', 'Document', 'Remediate', 'Validate', 'Audit'];
  const taskObjects = ['MFA enforcement', 'logging pipeline', 'backup jobs', 'access reviews', 'incident runbooks', 'encryption at rest', 'vendor registers', 'network segmentation', 'endpoint agents', 'vulnerability scanners'];
  const taskStatuses = ['in_progress', 'todo', 'review', 'backlog'];
  const TASKS = 1200;
  for (let i = 0; i < TASKS; i++) {
    const planId = planIds[i % planIds.length];
    const title = `${TAG} Task ${i + 1}: ${taskVerbs[i % taskVerbs.length]} ${taskObjects[(i * 3) % taskObjects.length]}`;
    const status = taskStatuses[i % taskStatuses.length];
    const start = daysAgo(10 + (i % 80));
    const end = daysAgo(1 + (i % 120)); // all overdue
    await client.query(
      `INSERT INTO implementation_tasks (implementation_plan_id, title, description, status, progress_percentage, assignee_id, planned_start_date, planned_end_date, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
      [planId, title, 'Capabilities showcase task', status, 10 + (i % 80), 1 + (i % 10), start, end]
    );
  }
  console.log(`[action-seed] Seeded ${TASKS} overdue implementation tasks`);

  // ---------- 2. Expiring evidence (evidence_expiring) ----------
  const ccIds = (await client.query(`SELECT id FROM client_controls WHERE client_id = $1 ORDER BY id`, [CLIENT_ID])).rows.map(r => r.id);
  const EVIDENCE = 300;
  for (let i = 0; i < EVIDENCE; i++) {
    const cc = ccIds[i % ccIds.length];
    await client.query(
      `INSERT INTO evidence (client_id, client_control_id, evidence_id, description, framework, type, status, owner, location, last_verified, expiration_date, interval_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        CLIENT_ID, cc, `aiseed-EV-${1000 + i}`,
        `${TAG} Expiring evidence artifact #${i + 1}`,
        i % 2 === 0 ? 'SOC 2' : 'ISO 27001',
        i % 3 === 0 ? 'screenshot' : i % 3 === 1 ? 'document' : 'log_export',
        'collected', 'Compliance Team', 's3://complianceos-demo/evidence',
        daysAgo(5 + (i % 20)), daysFromNow(1 + (i % 28)), 90,
      ]
    );
  }
  console.log(`[action-seed] Seeded ${EVIDENCE} expiring evidence items`);

  // ---------- 3. Past-due vendor assessments (vendor_assessment_due) ----------
  const tpl = await client.query(
    `INSERT INTO vendor_assessment_templates (client_id, name, description, created_by)
     VALUES ($1, $2, $3, 1) RETURNING id`,
    [CLIENT_ID, `${TAG} Standard Vendor Security Assessment`, 'Capabilities showcase assessment template']
  );
  const templateId = tpl.rows[0].id;
  const vendorIds = (await client.query(`SELECT id FROM vendors WHERE client_id = $1 ORDER BY id`, [CLIENT_ID])).rows.map(r => r.id);
  const VEND_REQS = 400;
  for (let i = 0; i < VEND_REQS; i++) {
    const vendorId = vendorIds.length ? vendorIds[i % vendorIds.length] : 1;
    await client.query(
      `INSERT INTO vendor_assessment_requests (client_id, vendor_id, template_id, token, recipient_email, status, sent_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        CLIENT_ID, vendorId, templateId,
        `aiseed-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 10)}`,
        `vendor${vendorId}.seed@latorre.local`, 'sent',
        daysAgo(45 + (i % 10)), daysAgo(1 + (i % 30)),
      ]
    );
  }
  console.log(`[action-seed] Seeded ${VEND_REQS} past-due vendor assessment requests`);

  // ---------- 4. Policy reviews pending (policy_review_due) ----------
  const POL_REVIEWS = 200;
  for (let i = 0; i < POL_REVIEWS; i++) {
    await client.query(
      `INSERT INTO policy_reviews (client_id, policy_review_id, policy_name, policy_content, status)
       VALUES ($1, $2, $3, $4, 'analyzing')`,
      [
        CLIENT_ID, `aiseed-${1000 + i}`,
        `${TAG} Policy review ${i + 1}: Acceptable Use & Security Standards`,
        'Capabilities showcase policy content requiring review and signature acknowledgment.',
      ]
    );
  }
  console.log(`[action-seed] Seeded ${POL_REVIEWS} pending policy reviews`);

  // ---------- 5. Expiring policy exceptions (exception_expiring) ----------
  const policyIds = (await client.query(`SELECT id FROM client_policies WHERE client_id = $1 ORDER BY id LIMIT 20`, [CLIENT_ID])).rows.map(r => r.id);
  const EXCEPTIONS = 250;
  for (let i = 0; i < EXCEPTIONS; i++) {
    await client.query(
      `INSERT INTO policy_exceptions (policy_id, employee_id, reason, expiration_date, status)
       VALUES ($1, $2, $3, $4, 'approved')`,
      [
        policyIds.length ? policyIds[i % policyIds.length] : null,
        1 + (i % 10),
        `${TAG} Compensating control in place pending remediation #${i + 1}`,
        daysFromNow(1 + (i % 28)),
      ]
    );
  }
  console.log(`[action-seed] Seeded ${EXCEPTIONS} expiring policy exceptions`);

  // ---------- 6. Pending access reviews (access_review_pending) ----------
  const camp = await client.query(
    `INSERT INTO access_review_campaigns (client_id, name, status, due_date, created_by_id)
     VALUES ($1, $2, 'in_progress', $3, 1) RETURNING id`,
    [CLIENT_ID, `${TAG} Quarterly Access Certification`, daysFromNow(14)]
  );
  const campaignId = camp.rows[0].id;
  const REVIEWS = 300;
  for (let i = 0; i < REVIEWS; i++) {
    await client.query(
      `INSERT INTO access_review_assignments (campaign_id, reviewer_id, reviewee_id, status)
       VALUES ($1, 1, $2, 'pending')`,
      [campaignId, 1 + (i % 10)]
    );
  }
  console.log(`[action-seed] Seeded ${REVIEWS} pending access review assignments`);

  // ---------- 7. Failed cloud connectors (connector_failed) ----------
  const providers = ['aws', 'azure', 'gcp', 'okta', 'm365'];
  for (let i = 0; i < 10; i++) {
    const provider = providers[i % providers.length];
    await client.query(
      `INSERT INTO cloud_connections (client_id, provider, name, credentials, status, error_message)
       VALUES ($1, $2, $3, $4, 'error', $5)`,
      [
        CLIENT_ID, provider, `${TAG} ${provider.toUpperCase()} Collector ${i + 1}`,
        '{"tenant":"capabilities-showcase"}',
        'Authentication failed: credentials expired or permissions revoked',
      ]
    );
  }
  console.log(`[action-seed] Seeded 10 failed cloud connectors`);

  // ---------- 8. Pending Sentinel actions (drives the Action Center badge) ----------
  const run = await client.query(
    `INSERT INTO autopilot_runs (client_id, started_at, completed_at, status, modules_executed, results, duration)
     VALUES ($1, $2, $3, 'completed', $4, $5, 42000) RETURNING id`,
    [CLIENT_ID, daysAgo(1), daysAgo(1), JSON.stringify(["policy", "evidence", "risk", "vendor"]), JSON.stringify({ source: "capabilities-showcase" })]
  );
  const runId = run.rows[0].id;

  const actionTypes = [
    { type: "policy_update", label: "Update policy clause" },
    { type: "evidence_request", label: "Request refreshed evidence" },
    { type: "risk_mitigation", label: "Apply risk mitigation" },
    { type: "vendor_review", label: "Escalate vendor review" },
    { type: "access_review", label: "Revoke stale access" },
    { type: "exception_review", label: "Re-evaluate exception" },
  ];
  const ACTIONS = 2200;
  for (let i = 0; i < ACTIONS; i++) {
    const def = actionTypes[i % actionTypes.length];
    const priority = i % 10 < 3 ? "critical" : i % 10 < 7 ? "high" : "medium";
    await client.query(
      `INSERT INTO autopilot_actions (run_id, client_id, type, title, description, priority, status, target_entity, metadata, ai_rationale)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
      [
        runId, CLIENT_ID, def.type,
        `${TAG} ${def.label}: ${taskObjects[(i * 7) % taskObjects.length]} (#${i + 1})`,
        `Sentinel detected drift during autonomous patrol. ${def.label} recommended based on current control evidence and risk posture.`,
        priority,
        JSON.stringify({ type: "client", id: CLIENT_ID }),
        JSON.stringify({ source: "capabilities-showcase", batch: Math.floor(i / 100) }),
        "Confidence 92% — pattern matched against framework baseline requirements; human sign-off required before execution.",
      ]
    );
  }
  console.log(`[action-seed] Seeded ${ACTIONS} pending Sentinel actions`);

  console.log('\n=============================================================');
  console.log('[action-seed] 🎉 ACTION CENTER CAPABILITIES DATASET SEEDED!');
  console.log('=============================================================\n');

  await client.end();
}

main().catch((err) => {
  console.error('[action-seed] Error seeding action items dataset:', err);
  process.exit(1);
});
