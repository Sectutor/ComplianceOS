-- ComplianceOS Demo Data Seed
-- Creates missing tables + inserts demo data for one client
-- Auto-generated from live database introspection
-- Usage: docker exec -i complianceos-db-1 psql -U complianceos -d complianceos < scripts/seed-demo.sql

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE MISSING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_scenarios (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    likelihood INTEGER DEFAULT 2,
    impact_score INTEGER DEFAULT 3,
    inherent_risk_level VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    risk_scenario_id INTEGER REFERENCES risk_scenarios(id),
    assessment_date TIMESTAMP,
    assessor_id INTEGER REFERENCES users(id),
    inherent_likelihood INTEGER,
    inherent_impact INTEGER,
    residual_likelihood INTEGER,
    residual_impact INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_treatments (
    id SERIAL PRIMARY KEY,
    risk_assessment_id INTEGER REFERENCES risk_assessments(id),
    treatment_type VARCHAR(50) NOT NULL,
    description TEXT,
    owner VARCHAR(255),
    target_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    description TEXT,
    framework VARCHAR(100),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    collected_by INTEGER REFERENCES users(id),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id SERIAL PRIMARY KEY,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    risk_level VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'active',
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    detected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remediation_tasks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    risk_treatment_id INTEGER REFERENCES risk_treatments(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_versions (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL REFERENCES client_policies(id),
    version VARCHAR(20) NOT NULL,
    content_snippet TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DEMO DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CLIENT
INSERT INTO clients (id, name, description, industry, size, status, created_at)
SELECT 1, 'AcmeCorp CyberSecurity', 'Demo client for ComplianceOS evaluation', 'Cybersecurity', '200', 'active', now()
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 1);

-- 2. USERS
INSERT INTO users (id, email, name, role, created_at) VALUES
  (1, 'admin@complianceos.local', 'Alex Chen', 'owner', now()),
  (2, 'compliance@acmecorp.com', 'Sarah Miller', 'admin', now()),
  (3, 'auditor@acmecorp.com', 'James Wilson', 'auditor', now()),
  (4, 'engineering@acmecorp.com', 'David Park', 'editor', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_clients (user_id, client_id, role, created_at) VALUES
  (1, 1, 'owner', now()), (2, 1, 'admin', now()),
  (3, 1, 'auditor', now()), (4, 1, 'editor', now())
ON CONFLICT DO NOTHING;

-- 3. FRAMEWORKS
INSERT INTO client_frameworks (client_id, name, status)
SELECT 1, name, 'active' FROM compliance_frameworks
WHERE name IN ('NIS2', 'ISO 27001', 'NIST CSF', 'SOC 2')
ON CONFLICT DO NOTHING;

-- 4. ASSETS (uses varchar owner, not owner_id)
INSERT INTO assets (id, client_id, name, type, description, owner, location, status, created_at) VALUES
  (1, 1, 'Production Web App', 'application', 'Customer-facing SaaS platform (Node.js/React)', 'David Park (Engineering)', 'AWS us-east-1', 'active', now()),
  (2, 1, 'Corporate Database', 'database', 'PostgreSQL 15 with PII and billing data', 'David Park (Engineering)', 'AWS us-east-1', 'active', now()),
  (3, 1, 'Employee Endpoints', 'endpoint', '200 MacBooks + Windows laptops, CrowdStrike-managed', 'Sarah Miller (Compliance)', 'Remote', 'active', now()),
  (4, 1, 'AWS Cloud Infrastructure', 'cloud', 'ECS, S3, RDS, Lambda — 45 services', 'David Park (Engineering)', 'AWS us-east-1', 'active', now()),
  (5, 1, 'Internal API Gateway', 'application', 'Kong API Gateway for microservices', 'David Park (Engineering)', 'AWS us-east-1', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 5. RISK SCENARIOS
INSERT INTO risk_scenarios (id, client_id, title, description, category, likelihood, impact_score, inherent_risk_level, status, created_at) VALUES
  (1, 1, 'No MFA on Production SSH Access', 'Engineers bypass MFA for direct SSH into production boxes. No PAM solution deployed.', 'Access Control', 4, 5, 'critical', 'open', now()),
  (2, 1, 'Unpatched Apache Struts CVE-2023-50164', 'Legacy payment module uses Apache Struts 2.5.33 with known RCE vulnerability.', 'Vulnerability Management', 3, 5, 'high', 'open', now()),
  (3, 1, 'Third-Party Vendor Data Breach', 'Customer consent data hosted on OneTrust — supply-chain risk if vendor compromised.', 'Third Party Risk', 3, 4, 'high', 'open', now()),
  (4, 1, 'Outdated NPM Dependencies', 'Frontend monorepo has 45 packages with known vulns (12 MEDIUM, 2 HIGH).', 'Supply Chain', 4, 2, 'medium', 'open', now()),
  (5, 1, 'Insufficient Backup Restoration Testing', 'Daily backups configured but full restoration not tested in 14 months.', 'Business Continuity', 2, 4, 'medium', 'open', now())
ON CONFLICT (id) DO NOTHING;

-- 6. RISK ASSESSMENTS
INSERT INTO risk_assessments (id, client_id, risk_scenario_id, assessment_date, assessor_id, inherent_likelihood, inherent_impact, residual_likelihood, residual_impact, status, created_at)
VALUES
  (1, 1, 1, now() - interval '30 days', 1, 4, 5, 2, 3, 'approved', now()),
  (2, 1, 2, now() - interval '14 days', 2, 3, 5, 1, 3, 'approved', now()),
  (3, 1, 3, now() - interval '60 days', 2, 3, 4, 3, 4, 'approved', now()),
  (4, 1, 4, now() - interval '7 days', 4, 4, 2, 2, 1, 'draft', now()),
  (5, 1, 5, now() - interval '90 days', 1, 2, 4, 1, 2, 'approved', now())
ON CONFLICT (id) DO NOTHING;

-- 7. RISK TREATMENTS
INSERT INTO risk_treatments (id, risk_assessment_id, treatment_type, description, owner, target_date, status, created_at) VALUES
  (1, 1, 'mitigate', 'Deploy Teleport PAM with GitHub OIDC + MFA. Deprecate direct SSH.', 'David Park', now() + interval '60 days', 'in_progress', now()),
  (2, 2, 'remediate', 'Upgrade Apache Struts to 2.5.34. Run regression tests before prod deploy.', 'David Park', now() - interval '7 days', 'overdue', now()),
  (3, 3, 'accept', 'Accept risk. OneTrust SOC 2 Type II reviewed; DP clauses cover liability.', 'Alex Chen', now() + interval '180 days', 'approved', now()),
  (4, 4, 'mitigate', 'Run npm audit weekly. Enable Dependabot auto-PR for patches.', 'David Park', now() + interval '30 days', 'planned', now()),
  (5, 5, 'mitigate', 'Schedule quarterly restoration drills. Create runbook for BCP team.', 'Sarah Miller', now() + interval '45 days', 'approved', now())
ON CONFLICT (id) DO NOTHING;

-- 8. EVIDENCE
INSERT INTO evidence (id, client_id, description, framework, type, status, collected_by, due_date, created_at) VALUES
  (1, 1, 'AWS SOC 2 Type II Report (2025)', 'ISO 27001', 'report', 'verified', 2, now() + interval '320 days', now()),
  (2, 1, 'CrowdStrike MFA Enforcement Policy Screenshot', 'NIS2', 'screenshot', 'verified', 2, now() + interval '30 days', now()),
  (3, 1, 'Q2 2025 Penetration Test Report', 'NIST CSF', 'report', 'verified', 3, now() + interval '30 days', now()),
  (4, 1, 'Employee Security Training Records Q2 2025', 'ISO 27001', 'report', 'collected', 2, now() + interval '10 days', now()),
  (5, 1, 'Weekly Vulnerability Scan — Production', 'NIS2', 'scan_result', 'verified', 4, now() + interval '5 days', now()),
  (6, 1, 'Business Continuity Plan v3.2 (Approved)', 'NIS2', 'policy', 'verified', 2, now() + interval '275 days', now()),
  (7, 1, 'Phishing Simulation Results (March 2025)', 'ISO 27001', 'log', 'expired', 3, now() - interval '35 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO evidence_files (evidence_id, file_name, file_type, file_size, uploaded_by, created_at)
VALUES
  (1, 'aws-soc2-2025.pdf', 'application/pdf', 2450000, 2, now()),
  (2, 'crowdstrike-mfa-config.png', 'image/png', 320000, 2, now()),
  (3, 'pentest-q2-2025-report.pdf', 'application/pdf', 4100000, 3, now()),
  (5, 'nessus-scan-prod-2026-07-02.json', 'application/json', 1560000, 4, now())
ON CONFLICT DO NOTHING;

-- 9. POLICIES (uses actual client_policies schema: content, owner, version=integer)
INSERT INTO client_policies (id, client_id, name, content, status, version, owner, created_at, updated_at) VALUES
  (1, 1, 'Information Security Policy', 'Enterprise security framework: access control, encryption, incident response.', 'approved', 3, 'Alex Chen', now() - interval '120 days', now()),
  (2, 1, 'Data Protection & Privacy Policy', 'GDPR-compliant data handling for EU customer PII.', 'approved', 2, 'Sarah Miller', now() - interval '200 days', now()),
  (3, 1, 'Acceptable Use Policy', 'Rules for company devices, network access, software install.', 'approved', 1, 'Sarah Miller', now() - interval '365 days', now()),
  (4, 1, 'Incident Response Plan', 'NIST 800-61 aligned: roles, comms, escalation matrix.', 'approved', 2, 'Alex Chen', now() - interval '90 days', now()),
  (5, 1, 'Vendor Security Policy', 'Third-party risk assessment, SLA, termination procedures.', 'draft', 1, 'Sarah Miller', now() - interval '30 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO policy_versions (policy_id, version, content_snippet, created_by, created_at) VALUES
  (1, '3.0', 'Initial 2025 version with NIS2 alignment', 1, now() - interval '120 days'),
  (1, '3.2', 'Updated encryption standards', 1, now() - interval '5 days'),
  (4, '1.0', 'Based on NIST 800-61 Rev 2', 2, now() - interval '180 days'),
  (4, '2.0', 'Added ransomware annex and crisis comms', 1, now())
ON CONFLICT DO NOTHING;

-- 10. VENDORS
INSERT INTO vendors (id, client_id, name, category, risk_level, status, website, created_at) VALUES
  (1, 1, 'Amazon Web Services', 'Cloud Infrastructure', 'high', 'active', 'aws.amazon.com', now()),
  (2, 1, 'Slack Technologies', 'Communication', 'medium', 'active', 'slack.com', now()),
  (3, 1, 'Stripe Inc.', 'Payment Processing', 'critical', 'active', 'stripe.com', now())
ON CONFLICT (id) DO NOTHING;

-- vendor_assessments uses vendor_name (varchar), not vendor_id
INSERT INTO vendor_assessments (id, client_id, vendor_name, assessment_type, status, score, created_at) VALUES
  (1, 1, 'Amazon Web Services', 'SOC 2 Type II Review', 'completed', 92, now()),
  (2, 1, 'Slack Technologies', 'Security Questionnaire', 'completed', 85, now()),
  (3, 1, 'Stripe Inc.', 'PCI DSS Attestation Review', 'pending', NULL, now())
ON CONFLICT (id) DO NOTHING;

-- 11. INCIDENTS
INSERT INTO incidents (id, client_id, title, description, severity, status, detected_at, created_at) VALUES
  (1, 1, 'Phishing Campaign — Fake O365 Login', '23 employees clicked simulated link. 4 entered credentials.', 'medium', 'closed', now() - interval '120 days', now()),
  (2, 1, 'S3 Bucket Misconfiguration — Public Read', 'Customer feedback bucket exposed for 6 hours. No data exfiltration.', 'high', 'closed', now() - interval '45 days', now()),
  (3, 1, 'Suspicious API Calls from Unknown IPs', 'Rate spike from unknown AWS accounts. Possible credential misuse.', 'high', 'open', now() - interval '3 days', now())
ON CONFLICT (id) DO NOTHING;

-- 12. REMEDIATION TASKS (uses varchar assignee, not assignee_id)
INSERT INTO remediation_tasks (id, client_id, risk_treatment_id, title, description, assignee, priority, status, due_date, created_at) VALUES
  (1, 1, 1, 'Deploy Teleport PAM Cluster', 'Set up Teleport with GitHub OIDC + MFA. Migrate 12 engineers.', 'David Park', 'critical', 'in_progress', now() + interval '60 days', now()),
  (2, 1, 1, 'Revoke SSH Key-Based Access', 'Audit all SSH keys, revoke stale ones, enforce cert-based auth.', 'David Park', 'high', 'pending', now() + interval '30 days', now()),
  (3, 1, 2, 'Upgrade Apache Struts to 2.5.34', 'Patch payment module. Run regression tests.', 'David Park', 'critical', 'overdue', now() - interval '7 days', now()),
  (4, 1, 4, 'Enable Dependabot Security Alerts', 'Turn on Dependabot across all 12 repos. Auto-PR for patches.', 'David Park', 'medium', 'pending', now() + interval '14 days', now()),
  (5, 1, 5, 'Q3 Backup Restoration Drill', 'Schedule full restoration test for critical databases.', 'Sarah Miller', 'high', 'planned', now() + interval '45 days', now())
ON CONFLICT (id) DO NOTHING;

-- 13. NOTIFICATIONS
INSERT INTO notification_log (user_id, client_id, type, title, message, is_read, created_at) VALUES
  (1, 1, 'warning', 'Pentest Report Expiring', 'Q2 Pentest Report expires in 30 days.', false, now() - interval '1 day'),
  (1, 1, 'error', 'Apache Struts Remediation Overdue', 'Struts upgrade 7 days past due. Severity: HIGH.', false, now()),
  (2, 1, 'info', 'Vendor Assessment Due', 'Stripe PCI DSS Attestation due in 30 days.', false, now()),
  (2, 1, 'success', 'IR Plan v2.0 Approved', 'Incident Response Plan version 2.0 approved.', true, now() - interval '2 days'),
  (1, 1, 'warning', 'NIS2 Control Gap: Access Control', 'Control 21(2)(a) not implemented for 45 days.', false, now() - interval '3 days'),
  (4, 1, 'info', 'Task Assigned: Deploy MFA for SSH', 'Deploy Teleport PAM cluster assigned to you.', false, now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- 14. COMPLIANCE CERTIFICATES (uses issue_date/expiry_date)
INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'in_progress', 'NIS2-DEMO-2026', now(), now() + interval '365 days', now()
FROM compliance_frameworks WHERE name = 'NIS2'
ON CONFLICT DO NOTHING;

INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'active', 'ISO-DEMO-2026-001', now() - interval '60 days', now() + interval '305 days', now()
FROM compliance_frameworks WHERE name = 'ISO 27001'
ON CONFLICT DO NOTHING;

-- 15. CLIENT CONTROLS
INSERT INTO client_controls (client_id, control_id, status, updated_at, created_at)
SELECT 1, c.id,
  CAST(
    CASE
      WHEN c.framework = 'NIS2' AND c.control_id IN ('21(2)(a)','21(2)(b)') THEN 'in_progress'
      WHEN c.framework = 'NIS2' AND c.control_id IN ('21(2)(c)') THEN 'not_implemented'
      WHEN c.framework = 'NIS2' THEN 'implemented'
      WHEN c.framework = 'NIST CSF' AND c.control_id IN ('DE.CM-1','PR.AC-3') THEN 'in_progress'
      ELSE 'implemented'
    END AS client_control_status
  ), now(), now()
FROM controls c WHERE c.status = 'active' LIMIT 25
ON CONFLICT DO NOTHING;

-- 16. AUDIT LOG (table already exists from migration)
INSERT INTO audit_logs (client_id, user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
  (1, 1, 'login', 'session', 1, '{"msg":"Login from IP 203.0.113.42"}', '203.0.113.42', now() - interval '2 hours'),
  (1, 2, 'evidence.upload', 'evidence', 4, '{"msg":"Uploaded training records CSV"}', '10.0.0.15', now() - interval '20 hours'),
  (1, 4, 'control.update', 'client_controls', NULL, '{"msg":"Updated IA-2 to in_progress"}', '10.0.0.22', now() - interval '3 days'),
  (1, 1, 'policy.approve', 'client_policies', 4, '{"msg":"Approved IR Plan v2.0"}', '203.0.113.42', now() - interval '2 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '[Seed Complete] Demo data loaded for AcmeCorp CyberSecurity' AS status;
SELECT count(*) AS clients FROM clients WHERE id = 1;
SELECT count(*) AS users FROM user_clients WHERE client_id = 1;
SELECT count(*) AS assets FROM assets WHERE client_id = 1;
SELECT count(*) AS risks FROM risk_scenarios WHERE client_id = 1;
SELECT count(*) AS evidence FROM evidence WHERE client_id = 1;
SELECT count(*) AS policies FROM client_policies WHERE client_id = 1;
SELECT count(*) AS vendors FROM vendors WHERE client_id = 1;
SELECT count(*) AS incidents FROM incidents WHERE client_id = 1;
SELECT count(*) AS tasks FROM remediation_tasks WHERE client_id = 1;
SELECT count(*) AS notifications FROM notification_log WHERE client_id = 1;

COMMIT;
