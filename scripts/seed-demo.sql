-- ComplianceOS Demo Seed: AcmeCorp Demo
-- Matches the exact Supabase schema columns
-- Run: docker exec -i complianceos-db-1 psql -U complianceos -d complianceos < scripts/seed-demo.sql
BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DEMO CLIENT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO clients (id, name, description, industry, size, status, created_at, updated_at)
SELECT 1, 'AcmeCorp CyberSecurity', 'Series B cybersecurity startup. 200 employees, headquartered in Berlin with offices in London and Singapore.', 'Cybersecurity', '200', 'active', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USERS (open_id required for Supabase schema NOT NULL constraint)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO users (id, open_id, name, email, role, created_at) VALUES
  (1, 'demo-admin-1', 'Alex Chen', 'admin@complianceos.local', 'owner', now()),
  (2, 'demo-user-2', 'Sarah Miller', 'compliance@acmecorp.com', 'admin', now()),
  (3, 'demo-user-3', 'James Wilson', 'auditor@acmecorp.com', 'auditor', now()),
  (4, 'demo-user-4', 'David Park', 'engineering@acmecorp.com', 'editor', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_clients (user_id, client_id, role) VALUES
  (1, 1, 'owner'), (2, 1, 'admin'),
  (3, 1, 'auditor'), (4, 1, 'editor')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FRAMEWORKS (reference: keep all from seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO client_frameworks (client_id, name, status)
SELECT 1, name, 'active' FROM compliance_frameworks
WHERE name IN ('NIS2', 'ISO 27001', 'NIST CSF', 'SOC 2')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ASSETS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO assets (id, client_id, name, type, description, owner, location, status, valuation_c, valuation_i, valuation_a, created_at) VALUES
  (1, 1, 'Production Web App', 'application', 'Customer-facing SaaS platform (Node.js/React)', 'Engineering', 'AWS eu-central-1', 'active', 4, 5, 5, now()),
  (2, 1, 'Corporate Database', 'database', 'PostgreSQL 15 with PII and billing data', 'Engineering', 'AWS eu-central-1', 'active', 5, 5, 5, now()),
  (3, 1, 'Employee Endpoints', 'endpoint', '200 MacBooks + Windows laptops, CrowdStrike managed', 'IT', 'Berlin / Remote', 'active', 2, 3, 3, now()),
  (4, 1, 'AWS Cloud Infrastructure', 'cloud', 'ECS, S3, RDS, Lambda — 45 services', 'Engineering', 'AWS eu-central-1', 'active', 4, 5, 5, now()),
  (5, 1, 'Internal API Gateway', 'application', 'Kong API Gateway for 25 microservices', 'Engineering', 'AWS eu-central-1', 'active', 3, 4, 4, now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RISK SCENARIOS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO risk_scenarios (id, client_id, title, description, threat_category, likelihood, impact, inherent_risk_score, status, owner, created_at) VALUES
  (1, 1, 'No MFA on Production SSH', 'Engineers bypass MFA for direct SSH into production. No PAM solution.', 'Access Control', 4, 5, 20, 'open', 'Alex Chen', now()),
  (2, 1, 'Unpatched Apache Struts', 'Legacy payment module uses Struts 2.5.33 with known RCE.', 'Vulnerability Management', 3, 5, 15, 'open', 'David Park', now()),
  (3, 1, 'Vendor Data Breach', 'Customer consent data on OneTrust. Supply-chain risk.', 'Third Party Risk', 3, 4, 12, 'open', 'Sarah Miller', now()),
  (4, 1, 'Outdated NPM Dependencies', '45 packages with known vulns in frontend monorepo.', 'Supply Chain', 4, 2, 8, 'open', 'David Park', now()),
  (5, 1, 'Backup Restoration Not Tested', 'Daily backups configured but not restored in 14 months.', 'Business Continuity', 2, 4, 8, 'open', 'Sarah Miller', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. INCIDENTS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO incidents (id, client_id, title, description, severity, status, detected_at, created_at) VALUES
  (1, 1, 'Phishing Campaign — Fake O365 Login', '23 employees clicked simulated link. 4 entered credentials.', 'medium', 'closed', now() - interval '120 days', now()),
  (2, 1, 'S3 Bucket Misconfiguration', 'Customer bucket exposed for 6 hours. No data exfiltration.', 'high', 'closed', now() - interval '45 days', now()),
  (3, 1, 'Suspicious API Calls from Unknown IPs', 'Rate spike from unknown AWS accounts. Credential stuffing.', 'high', 'open', now() - interval '3 days', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. EVIDENCE
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO evidence (id, client_id, evidence_id, client_control_id, description, framework, type, status, owner, created_at) VALUES
  (1, 1, 'ev-001', 1, 'AWS SOC 2 Type II Report (2025)', 'ISO 27001', 'report', 'verified', 'Sarah Miller', now()),
  (2, 1, 'ev-002', 1, 'Q2 2025 Penetration Test Report', 'NIST CSF', 'report', 'verified', 'James Wilson', now()),
  (3, 1, 'ev-003', 1, 'Employee Training Records Q2', 'ISO 27001', 'report', 'collected', 'Sarah Miller', now()),
  (4, 1, 'ev-004', 1, 'Weekly Vulnerability Scan', 'NIS2', 'scan_result', 'verified', 'David Park', now()),
  (5, 1, 'ev-005', 1, 'Business Continuity Plan v3.2', 'NIS2', 'policy', 'verified', 'Sarah Miller', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. VENDORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO vendors (id, client_id, name, category, criticality, status, created_at) VALUES
  (1, 1, 'Amazon Web Services', 'Cloud Infrastructure', 'critical', 'active', now()),
  (2, 1, 'Slack Technologies', 'Communication', 'high', 'active', now()),
  (3, 1, 'Stripe Inc.', 'Payment Processing', 'critical', 'active', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_assessments (client_id, vendor_id, type, status, score, created_at) VALUES
  (1, 1, 'SOC 2 Review', 'completed', 94, now()),
  (1, 2, 'Security Questionnaire', 'completed', 87, now()),
  (1, 3, 'PCI DSS Review', 'pending', NULL, now())
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO notification_log (user_id, type, title, message, sent_at, channel, status) VALUES
  (1, 'warning', 'Pentest Report Expiring', 'Q2 Pentest Report expires in 30 days.', now(), 'in_app', 'sent'),
  (1, 'error', 'Apache Struts Remediation Overdue', 'Struts upgrade 7 days past due.', now(), 'in_app', 'sent'),
  (2, 'info', 'Vendor Assessment Due', 'Stripe PCI DSS due in 30 days.', now(), 'in_app', 'sent'),
  (2, 'success', 'IR Plan v2.0 Approved', 'Incident Response Plan approved.', now(), 'in_app', 'sent')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. COMPLIANCE CERTIFICATES
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'in_progress', 'NIS2-DEMO-001', now(), now() + interval '365 days', now()
FROM compliance_frameworks WHERE name = 'NIS2'
ON CONFLICT DO NOTHING;

INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'active', 'ISO27001-DEMO-001', now() - interval '60 days', now() + interval '305 days', now()
FROM compliance_frameworks WHERE name = 'ISO 27001'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '[Seed Complete]' AS status;
SELECT 'clients' AS tbl, count(*) FROM clients WHERE id = 1
UNION ALL SELECT 'users', count(*) FROM users WHERE id IN (1,2,3,4)
UNION ALL SELECT 'assets', count(*) FROM assets WHERE client_id = 1
UNION ALL SELECT 'risks', count(*) FROM risk_scenarios WHERE client_id = 1
UNION ALL SELECT 'evidence', count(*) FROM evidence WHERE client_id = 1
UNION ALL SELECT 'vendors', count(*) FROM vendors WHERE client_id = 1
UNION ALL SELECT 'incidents', count(*) FROM incidents WHERE client_id = 1
UNION ALL SELECT 'notifications', count(*) FROM notification_log
ORDER BY tbl;

COMMIT;
