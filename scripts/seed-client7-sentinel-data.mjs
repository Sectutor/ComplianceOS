import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();
  console.log('[seed] Connected to database');

  const clientId = 7;
  const now = new Date();

  // Helper date offset generators
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600000);

  console.log(`[seed] Seeding data for Client ${clientId} (LaTorre LTD)...`);

  // 1. Clean existing stale/duplicate autopilot_actions for Client 7 to ensure clean inbox state
  await client.query('DELETE FROM autopilot_actions WHERE client_id = $1', [clientId]);
  console.log('[seed] Cleared old autopilot actions for Client 7');

  // 2. Client Policies
  const testPolicyNames = [
    'Access Control & Authentication Policy',
    'Incident Response and Breach Management Policy',
    'Information Security Governance Policy',
    'Third-Party Cloud Vendor Security Policy'
  ];
  await client.query('DELETE FROM client_policies WHERE client_id = $1 AND name = ANY($2)', [clientId, testPolicyNames]);

  // Policy 1: Access Control missing MFA clause
  await client.query(`
    INSERT INTO client_policies (client_id, name, status, version, content, owner, updated_at, next_review_date)
    VALUES ($1, $2, 'approved', 1, $3, 'CISO', $4, $5)
  `, [
    clientId,
    'Access Control & Authentication Policy',
    'Standard company policy on password complexity, workstation locking, and user account lifecycle. Privileged administrative accounts must be logged and monitored for unauthorized changes.',
    daysAgo(30),
    daysAhead(300)
  ]);

  // Policy 2: Incident Response missing 72-hour breach SLA clause
  await client.query(`
    INSERT INTO client_policies (client_id, name, status, version, content, owner, updated_at, next_review_date)
    VALUES ($1, $2, 'approved', 1, $3, 'Security Lead', $4, $5)
  `, [
    clientId,
    'Incident Response and Breach Management Policy',
    'Procedures for identifying, triaging, and remediating internal security events. All employees must report phishing and suspicious access attempts to the internal IT helpdesk.',
    daysAgo(40),
    daysAhead(280)
  ]);

  // Policy 3: Information Security Governance - Overdue for annual review (>365 days)
  await client.query(`
    INSERT INTO client_policies (client_id, name, status, version, content, owner, updated_at, next_review_date)
    VALUES ($1, $2, 'approved', 2, $3, 'Executive Sponsor', $4, $5)
  `, [
    clientId,
    'Information Security Governance Policy',
    'Overarching information security charter, management commitment, and resource allocation for regulatory alignment across ISO 27001 and SOC 2.',
    daysAgo(410),
    daysAgo(45)
  ]);

  // Policy 4: Third-Party Vendor Policy - Stuck in review (>21 days)
  await client.query(`
    INSERT INTO client_policies (client_id, name, status, version, content, owner, updated_at, next_review_date)
    VALUES ($1, $2, 'review', 1, $3, 'Procurement Manager', $4, $5)
  `, [
    clientId,
    'Third-Party Cloud Vendor Security Policy',
    'Criteria for evaluating third-party vendor risks, SOC 2 report collection, and mandatory contractual privacy clauses before onboarding.',
    daysAgo(28),
    daysAhead(180)
  ]);

  console.log('[seed] Inserted 4 test policies (Missing MFA, Missing 72h SLA, Overdue review, Stuck in review)');

  // 3. Risk Scenarios & Treatments
  const testRiskTitles = [
    'Unrestricted S3 Bucket / Cloud Storage Public Access',
    'Ransomware Infiltration via Exposed Management Endpoints'
  ];
  await client.query('DELETE FROM risk_scenarios WHERE client_id = $1 AND title = ANY($2)', [clientId, testRiskTitles]);

  // Scenario 1: Residual score 18 above appetite 6
  await client.query(`
    INSERT INTO risk_scenarios (
      client_id, title, description, category, likelihood, impact,
      residual_likelihood, residual_impact, residual_score, residual_risk,
      inherent_score, inherent_risk, status, owner, assessment_type
    )
    VALUES ($1, $2, $3, 'Cloud Infrastructure', 4, 5, 4, 4, 18, 'critical', 20, 'critical', 'analyzed', 'Cloud Platform Lead', 'scenario')
  `, [
    clientId,
    'Unrestricted S3 Bucket / Cloud Storage Public Access',
    'Misconfigured IAM permissions or public bucket policies permitting unauthorized anonymous read/write access to production customer data.'
  ]);

  // Scenario 2: With overdue treatment
  const s2 = await client.query(`
    INSERT INTO risk_scenarios (
      client_id, title, description, category, likelihood, impact,
      residual_likelihood, residual_impact, residual_score, residual_risk,
      inherent_score, inherent_risk, status, owner, assessment_type
    )
    VALUES ($1, $2, $3, 'Endpoint Security', 4, 4, 3, 5, 15, 'high', 16, 'high', 'analyzed', 'Head of Infrastructure', 'scenario')
    RETURNING id
  `, [
    clientId,
    'Ransomware Infiltration via Exposed Management Endpoints',
    'Ransomware payloads executing on unmonitored administrative jumpboxes and lateral movement across production VPC.'
  ]);

  // Clean up any previous test treatments
  await client.query(`
    DELETE FROM risk_treatments 
    WHERE client_id = $1 AND strategy LIKE '%CrowdStrike%'
  `, [clientId]);

  // Treatment overdue by 18 days
  await client.query(`
    INSERT INTO risk_treatments (
      client_id, risk_scenario_id, treatment_type, strategy, status,
      due_date, priority, owner
    )
    VALUES ($1, $2, 'mitigate', $3, 'in_progress', $4, 'critical', 'SecOps Lead')
  `, [
    clientId,
    s2.rows[0].id,
    'Deploy CrowdStrike Falcon EDR agent with automated network isolation policy on all cloud jumpboxes',
    daysAgo(18)
  ]);

  // Risk Assessment: Unassigned high-impact risk
  await client.query(`
    DELETE FROM risk_assessments WHERE client_id = $1 AND title = $2
  `, [clientId, 'Hardcoded Production Master API Keys in Mobile Application Codebase']);

  await client.query(`
    INSERT INTO risk_assessments (
      client_id, assessment_id, title, inherent_score, status, risk_owner
    )
    VALUES ($1, 'RA-2026-088', $2, 16, 'draft', NULL)
  `, [
    clientId,
    'Hardcoded Production Master API Keys in Mobile Application Codebase'
  ]);

  console.log('[seed] Inserted risk scenarios, overdue treatment, and unassigned high-impact risk');

  // 4. Vulnerabilities
  const testVulnIds = ['VULN-2024-3094', 'VULN-2024-21626', 'VULN-2023-4863'];
  await client.query('DELETE FROM vulnerabilities WHERE client_id = $1 AND vulnerability_id = ANY($2)', [clientId, testVulnIds]);

  // Critical CVE (18 days old, SLA 7 days, overdue by 11 days)
  await client.query(`
    INSERT INTO vulnerabilities (
      client_id, vulnerability_id, cve_id, name, description,
      severity, cvss_score, discovery_date, status, owner
    )
    VALUES ($1, 'VULN-2024-3094', 'CVE-2024-3094', $2, $3, 'critical', 100, $4, 'open', 'SecOps Team')
  `, [
    clientId,
    'Malicious upstream backdoor in xz-utils (liblzma) allowing unauthorized SSH access',
    'Compromised upstream release tarballs containing payload that injects malicious code during build time to hijack OpenSSH auth.',
    daysAgo(18)
  ]);

  // High CVE (26 days old, SLA 14 days, overdue by 12 days)
  await client.query(`
    INSERT INTO vulnerabilities (
      client_id, vulnerability_id, cve_id, name, description,
      severity, cvss_score, discovery_date, status, owner
    )
    VALUES ($1, 'VULN-2024-21626', 'CVE-2024-21626', $2, $3, 'high', 86, $4, 'open', 'DevOps Lead')
  `, [
    clientId,
    'runc container breakout allowing unauthorized host filesystem manipulation',
    'File-descriptor leak vulnerability in runc versions <= 1.1.11 enabling a malicious container process to access the host /proc.',
    daysAgo(26)
  ]);

  // Medium CVE (45 days old, SLA 30 days, overdue by 15 days)
  await client.query(`
    INSERT INTO vulnerabilities (
      client_id, vulnerability_id, cve_id, name, description,
      severity, cvss_score, discovery_date, status, owner
    )
    VALUES ($1, 'VULN-2023-4863', 'CVE-2023-4863', $2, $3, 'medium', 68, $4, 'open', 'Frontend Team')
  `, [
    clientId,
    'Heap buffer overflow in libwebp lossless decoder',
    'Out-of-bounds write vulnerability in libwebp library when rendering specially crafted WebP images.',
    daysAgo(45)
  ]);

  console.log('[seed] Inserted 3 SLA-breached vulnerabilities (Critical CVSS 10.0, High CVSS 8.6, Medium)');

  // 5. Vendor Questionnaires
  const testQNames = [
    'Annual Third-Party SOC 2 Type II Security Assurance Audit',
    'Quarterly ISO 27001 Vendor Re-certification Questionnaire'
  ];
  await client.query('DELETE FROM questionnaires WHERE client_id = $1 AND name = ANY($2)', [clientId, testQNames]);

  // Overdue questionnaire (12 days overdue)
  await client.query(`
    INSERT INTO questionnaires (
      client_id, name, vendor_name, sender_name, status, progress, due_date
    )
    VALUES ($1, $2, 'AWS Cloud Infrastructure', 'Security Assurance', 'sent', 15, $3)
  `, [
    clientId,
    'Annual Third-Party SOC 2 Type II Security Assurance Audit',
    daysAgo(12)
  ]);

  // Approaching questionnaire (due in 3 days)
  await client.query(`
    INSERT INTO questionnaires (
      client_id, name, vendor_name, sender_name, status, progress, due_date
    )
    VALUES ($1, $2, 'Datadog Cloud Monitoring', 'Vendor Management', 'sent', 0, $3)
  `, [
    clientId,
    'Quarterly ISO 27001 Vendor Re-certification Questionnaire',
    daysAhead(3)
  ]);

  // 6. DSAR Requests (GDPR Statutory Clocks)
  const testDsarIds = ['DSAR-2026-009', 'DSAR-2026-010'];
  await client.query('DELETE FROM dsar_requests WHERE client_id = $1 AND request_id = ANY($2)', [clientId, testDsarIds]);

  // DSAR 1: Due in 2 days (48h statutory window warning)
  await client.query(`
    INSERT INTO dsar_requests (
      client_id, request_id, request_type, subject_name, subject_email,
      status, priority, due_date, request_date
    )
    VALUES ($1, 'DSAR-2026-009', 'Deletion', 'Elena Rostova', 'elena.rostova@client-eu.org', 'In Progress', 'critical', $2, $3)
  `, [
    clientId,
    daysAhead(2),
    daysAgo(28)
  ]);

  // DSAR 2: Breached statutory window (overdue by 4 days)
  await client.query(`
    INSERT INTO dsar_requests (
      client_id, request_id, request_type, subject_name, subject_email,
      status, priority, due_date, request_date
    )
    VALUES ($1, 'DSAR-2026-010', 'Access', 'Marcus Vance', 'marcus.vance@techcorp.uk', 'In Progress', 'critical', $2, $3)
  `, [
    clientId,
    daysAgo(4),
    daysAgo(34)
  ]);

  console.log('[seed] Inserted questionnaires and DSAR statutory deadline records');

  // 7. Evidence Records (Compliance Sentinel)
  const ccRes = await client.query('SELECT id FROM client_controls WHERE client_id = $1 LIMIT 2', [clientId]);
  const controlId1 = ccRes.rows[0]?.id || 2697;
  const controlId2 = ccRes.rows[1]?.id || 2698;

  const testEvidIds = ['EVID-PT-2025', 'EVID-DR-2024'];
  await client.query('DELETE FROM evidence WHERE client_id = $1 AND evidence_id = ANY($2)', [clientId, testEvidIds]);

  // Evidence 1: Expiring in 4 days
  await client.query(`
    INSERT INTO evidence (
      client_id, client_control_id, evidence_id, description,
      framework, status, expiration_date, owner
    )
    VALUES ($1, $2, 'EVID-PT-2025', $3, 'ISO 27001', 'verified', $4, 'Head of Security')
  `, [
    clientId,
    controlId1,
    'Annual Third-Party Web Application Penetration Test Report',
    daysAhead(4)
  ]);

  // Evidence 2: EXPIRED 12 days ago
  await client.query(`
    INSERT INTO evidence (
      client_id, client_control_id, evidence_id, description,
      framework, status, expiration_date, owner
    )
    VALUES ($1, $2, 'EVID-DR-2024', $3, 'SOC 2', 'verified', $4, 'BCP Coordinator')
  `, [
    clientId,
    controlId2,
    'Annual Multi-Region Cloud Disaster Recovery Tabletop Exercise & RTO/RPO Drill Report',
    daysAgo(12)
  ]);

  console.log('[seed] Inserted expiring and expired evidence items');

  // 8. Business Continuity Plans (BC Guardian)
  const testBcTitles = ['Global SaaS Production Cloud Services & Payment Gateway BCP'];
  await client.query('DELETE FROM bc_plans WHERE client_id = $1 AND title = ANY($2)', [clientId, testBcTitles]);

  await client.query(`
    INSERT INTO bc_plans (
      client_id, title, version, status, next_test_date, last_tested_date, content
    )
    VALUES ($1, $2, '1.2', 'active', $3, NULL, 'Standard business continuity procedures.')
  `, [
    clientId,
    'Global SaaS Production Cloud Services & Payment Gateway BCP',
    daysAgo(45)
  ]);

  console.log('[seed] Inserted untested BC Plan overdue by 45 days');

  // 9. Incidents (SLA Hound - NIS2 24h Early Warning SLA breach)
  const testIncTitles = ['Suspected Unauthorized Production Database Exfiltration'];
  await client.query('DELETE FROM incidents WHERE client_id = $1 AND title = ANY($2)', [clientId, testIncTitles]);

  await client.query(`
    INSERT INTO incidents (
      client_id, title, description, status, severity,
      is_significant, detected_at, early_warning_sent_at
    )
    VALUES ($1, $2, $3, 'investigating', 'critical', true, $4, NULL)
  `, [
    clientId,
    'Suspected Unauthorized Production Database Exfiltration',
    'High volume egress traffic detected originating from production replica towards an unclassified foreign IP.',
    hoursAgo(32)
  ]);

  console.log('[seed] Inserted critical incident breaching NIS2 24h Early Warning clock');

  console.log('\n[seed] ✅ All test records successfully inserted for Client 7!');
  await client.end();
}

seed().catch((err) => {
  console.error('[seed] Error seeding test data:', err);
  process.exit(1);
});
