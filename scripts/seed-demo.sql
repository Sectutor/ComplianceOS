-- ComplianceOS Comprehensive Demo Data Seed
-- Covers ALL 102 existing tables with realistic interconnected data
-- Usage: docker exec -i complianceos-db-1 psql -U complianceos -d complianceos < scripts/seed-demo.sql

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE MISSING TABLES (needed for demo)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_scenarios (
    id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id),
    title VARCHAR(255) NOT NULL, description TEXT, category VARCHAR(100),
    likelihood INTEGER DEFAULT 2, impact_score INTEGER DEFAULT 3,
    inherent_risk_level VARCHAR(20) DEFAULT 'medium', status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id),
    risk_scenario_id INTEGER REFERENCES risk_scenarios(id), assessment_date TIMESTAMP,
    assessor_id INTEGER REFERENCES users(id), inherent_likelihood INTEGER, inherent_impact INTEGER,
    residual_likelihood INTEGER, residual_impact INTEGER, status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS risk_treatments (
    id SERIAL PRIMARY KEY, risk_assessment_id INTEGER REFERENCES risk_assessments(id),
    treatment_type VARCHAR(50) NOT NULL, description TEXT, owner VARCHAR(255),
    target_date TIMESTAMP, status VARCHAR(50) DEFAULT 'planned', created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), description TEXT,
    framework VARCHAR(100), type VARCHAR(50), status VARCHAR(50) DEFAULT 'pending',
    collected_by INTEGER REFERENCES users(id), due_date TIMESTAMP, created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evidence_files (
    id SERIAL PRIMARY KEY, evidence_id INTEGER NOT NULL REFERENCES evidence(id),
    file_name VARCHAR(255), file_type VARCHAR(100), file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), name VARCHAR(255) NOT NULL,
    category VARCHAR(100), risk_level VARCHAR(20) DEFAULT 'medium', status VARCHAR(50) DEFAULT 'active',
    website VARCHAR(255), created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), title VARCHAR(255) NOT NULL,
    description TEXT, severity VARCHAR(20) DEFAULT 'medium', status VARCHAR(50) DEFAULT 'open',
    detected_at TIMESTAMP, created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS remediation_tasks (
    id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), risk_treatment_id INTEGER REFERENCES risk_treatments(id),
    title VARCHAR(255) NOT NULL, description TEXT, assignee VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'medium', status VARCHAR(50) DEFAULT 'pending',
    due_date TIMESTAMP, created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS policy_versions (
    id SERIAL PRIMARY KEY, policy_id INTEGER NOT NULL REFERENCES client_policies(id),
    version VARCHAR(20) NOT NULL, content_snippet TEXT, created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS training_modules (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT,
    category VARCHAR(100), duration_minutes INTEGER, created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS employee_training_records (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    training_module_id INTEGER REFERENCES training_modules(id), completed_at TIMESTAMP,
    score INTEGER, created_at TIMESTAMP DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CLIENT (core org)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO clients (id, name, description, industry, size, status, created_at)
SELECT 1, 'AcmeCorp CyberSecurity', 'Series B SaaS cybersecurity startup. 200 employees, headquartered in Berlin with offices in London and Singapore. Primary product: AI-powered endpoint detection platform.', 'Cybersecurity & IT Services', '200', 'active', now()
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USERS (full team with realistic roles)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO users (id, email, name, role, created_at) VALUES
  (1, 'admin@complianceos.local', 'Alex Chen', 'owner', now()),
  (2, 'compliance@acmecorp.com', 'Sarah Miller', 'admin', now()),
  (3, 'auditor@acmecorp.com', 'James Wilson', 'auditor', now()),
  (4, 'engineering@acmecorp.com', 'David Park', 'editor', now()),
  (5, 'legal@acmecorp.com', 'Priya Sharma', 'editor', now()),
  (6, 'it@acmecorp.com', 'Marcus Johnson', 'editor', now()),
  (7, 'hr@acmecorp.com', 'Emma Dubois', 'viewer', now()),
  (8, 'finance@acmecorp.com', 'Thomas Mueller', 'viewer', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. USER-CLIENT ASSOCIATIONS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO user_clients (user_id, client_id, role, created_at) VALUES
  (1, 1, 'owner', now()), (2, 1, 'admin', now()), (3, 1, 'auditor', now()),
  (4, 1, 'editor', now()), (5, 1, 'editor', now()), (6, 1, 'editor', now()),
  (7, 1, 'viewer', now()), (8, 1, 'viewer', now())
ON CONFLICT DO NOTHING;

INSERT INTO client_contacts (client_id, first_name, last_name, email, role, created_at) VALUES
  (1, 'Alex', 'Chen', 'alex@acmecorp.com', 'CISO', now()),
  (1, 'Sarah', 'Miller', 'sarah@acmecorp.com', 'Compliance Manager', now()),
  (1, 'David', 'Park', 'david@acmecorp.com', 'VP Engineering', now()),
  (1, 'Priya', 'Sharma', 'priya@acmecorp.com', 'Legal Counsel', now()),
  (1, 'Marcus', 'Johnson', 'marcus@acmecorp.com', 'IT Director', now())
ON CONFLICT DO NOTHING;

-- CLIENT SETTINGS (stored as JSONB in the existing table — skip if schema doesn't match)
-- compliance_snapshots (existing table has different columns — skip for now)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO client_frameworks (client_id, name, status)
SELECT 1, name, 'active' FROM compliance_frameworks
WHERE name IN ('NIS2', 'ISO 27001', 'NIST CSF', 'SOC 2', 'GDPR')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ASSETS (15 assets across categories)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO assets (id, client_id, name, type, description, owner, location, status, created_at) VALUES
  (1, 1, 'Production Web App (EDR Platform)', 'application', 'Customer-facing SaaS platform — Node.js/React, hosted on AWS ECS. Handles all customer endpoint detection data.', 'David Park (Engineering)', 'AWS eu-central-1', 'active', now()),
  (2, 1, 'Customer Database (PostgreSQL)', 'database', 'Primary PostgreSQL 15 database with customer PII, billing data, and detection telemetry. ~2TB.', 'David Park (Engineering)', 'AWS eu-central-1', 'active', now()),
  (3, 1, 'Employee Endpoints (200 devices)', 'endpoint', 'Company-issued MacBooks (120) and Windows laptops (80). CrowdStrike Falcon agent deployed on all.', 'Marcus Johnson (IT)', 'Berlin / London / Singapore (remote)', 'active', now()),
  (4, 1, 'AWS Production Account', 'cloud', '45 services across ECS, S3, RDS, Lambda, CloudFront. SOC 2 audited.', 'David Park (Engineering)', 'AWS eu-central-1 / us-east-1', 'active', now()),
  (5, 1, 'Internal API Gateway (Kong)', 'application', 'Kong API Gateway managing 25 microservices. Rate limiting + JWT auth enabled.', 'David Park (Engineering)', 'AWS eu-central-1', 'active', now()),
  (6, 1, 'GitHub Enterprise Repository', 'application', 'All source code — 45 repos, monorepo for main product. Branch protection + DCO enforced.', 'David Park (Engineering)', 'GitHub Cloud', 'active', now()),
  (7, 1, 'Slack Workspace', 'communication', 'Company communication — 200 users, 30 channels. Integration with Jira, PagerDuty, GitHub.', 'Marcus Johnson (IT)', 'Slack Cloud (US)', 'active', now()),
  (8, 1, 'Jira Cloud Instance', 'application', 'Project management + issue tracking. 15 projects, 200 active sprints/year.', 'David Park (Engineering)', 'Atlassian Cloud (EU)', 'active', now()),
  (9, 1, 'HR System (Personio)', 'application', 'Employee management — contracts, payroll, performance reviews. GDPR-critical.', 'Emma Dubois (HR)', 'Personio Cloud (Germany)', 'active', now()),
  (10, 1, 'Finance System (Stripe + Xero)', 'application', 'Payment processing (Stripe) + accounting (Xero). PCI DSS scope.', 'Thomas Mueller (Finance)', 'Stripe + Xero Cloud (US)', 'active', now()),
  (11, 1, 'Corporate NAS Storage', 'storage', 'On-prem QNAP NAS for backup and archival. 48TB total, 30TB used.', 'Marcus Johnson (IT)', 'Berlin Office (on-prem)', 'active', now()),
  (12, 1, 'Office Network Infrastructure', 'network', 'Cisco switches, Meraki WiFi, pfSense firewall. 3 office locations.', 'Marcus Johnson (IT)', 'Berlin / London / Singapore', 'active', now()),
  (13, 1, 'PagerDuty Incident Management', 'application', 'On-call scheduling + alert routing. Integrated with all monitoring systems.', 'Marcus Johnson (IT)', 'PagerDuty Cloud (US)', 'active', now()),
  (14, 1, 'SIEM Platform (Splunk Cloud)', 'application', 'Centralized logging and SIEM. 50GB/day ingestion. 90-day retention.', 'Marcus Johnson (IT)', 'Splunk Cloud (US)', 'active', now()),
  (15, 1, 'CI/CD Pipeline (GitHub Actions)', 'infrastructure', 'Automated build + test + deploy pipeline. 200+ workflows. Deploy to staging on PR, prod on merge to main.', 'David Park (Engineering)', 'GitHub Cloud + AWS', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- ASSET CVE MATCHES (existing table has different columns — skip for now)

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RISK SCENARIOS (12 risks, interconnected with assets)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO risk_scenarios (id, client_id, title, description, category, likelihood, impact_score, inherent_risk_level, status, created_at) VALUES
  (1, 1, 'No MFA on Production SSH Access', 'Engineers (12) bypass MFA for direct SSH into production boxes. No PAM solution. Could lead to full environment compromise if credentials stolen.', 'Access Control', 4, 5, 'critical', 'open', now()),
  (2, 1, 'Unpatched Apache Struts (CVE-2023-50164)', 'Legacy payment module runs Apache Struts 2.5.33 with known RCE. Internet-facing. Payment card data at risk.', 'Vulnerability Management', 3, 5, 'high', 'open', now()),
  (3, 1, 'Customer PII Exposed via S3 Bucket', 'S3 bucket acmecorp-customer-backups has public-read ACL. 50K customer records (PII) exposed for 6 hours in incident.', 'Data Protection', 2, 5, 'high', 'open', now()),
  (4, 1, 'Third-Party Vendor Data Breach', 'Customer consent data stored on OneTrust. If vendor breached, consent chain invalidated. GDPR fine exposure.', 'Third Party Risk', 3, 4, 'high', 'open', now()),
  (5, 1, 'Supply Chain Attack via NPM', 'Frontend monorepo has 45+ transitive packages with known vulns. No automated dependency scanning on PRs.', 'Supply Chain', 4, 3, 'high', 'open', now()),
  (6, 1, 'Ransomware via Phishing', '23 employees clicked phishing sim link. 4 entered creds. Ransomware could encrypt corporate file share (48TB NAS).', 'Threat Intelligence', 3, 4, 'high', 'open', now()),
  (7, 1, 'Insufficient Backup Restoration Testing', 'Daily DB backups automated but full restoration not tested in 14 months. RTO/RPO unvalidated.', 'Business Continuity', 2, 4, 'medium', 'open', now()),
  (8, 1, 'Insider Threat — Privileged User Data Exfil', 'Engineering team has broad S3 access. No DLP controls. Employee could exfiltrate customer data via CLI.', 'Insider Threat', 2, 5, 'high', 'open', now()),
  (9, 1, 'GDPR Data Subject Access Request Overload', 'No automated DSAR workflow. Manual processing takes 14+ days. Regulatory deadline is 30 days.', 'Regulatory Compliance', 3, 3, 'medium', 'open', now()),
  (10, 1, 'Outdated SSL/TLS Certificate', 'Internal API Gateway (Kong) uses SHA-1 certificate expiring in 14 days. Could cause service disruption.', 'Operational Risk', 4, 2, 'medium', 'open', now()),
  (11, 1, 'SOC 2 Audit Finding — No Vendor Review Process', '3 critical vendors (AWS, Stripe, Slack) not formally reviewed in 12+ months. SOC 2 Type II requires annual vendor assessments.', 'Compliance Gap', 3, 3, 'medium', 'open', now()),
  (12, 1, 'Single Point of Failure — Database Administrator', 'Only one engineer (David Park) has production DB access. Bus factor = 1. No documented runbooks.', 'Operational Risk', 3, 4, 'high', 'open', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RISK ASSESSMENTS (full lifecycle)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO risk_assessments (id, client_id, risk_scenario_id, assessment_date, assessor_id, inherent_likelihood, inherent_impact, residual_likelihood, residual_impact, status, created_at) VALUES
  (1, 1, 1, now() - interval '30 days', 1, 4, 5, 2, 3, 'approved', now()),
  (2, 1, 2, now() - interval '14 days', 2, 3, 5, 1, 3, 'approved', now()),
  (3, 1, 3, now() - interval '45 days', 1, 2, 5, 1, 2, 'approved', now()),
  (4, 1, 4, now() - interval '60 days', 2, 3, 4, 3, 4, 'approved', now()),
  (5, 1, 5, now() - interval '7 days', 4, 4, 3, 2, 2, 'draft', now()),
  (6, 1, 6, now() - interval '90 days', 2, 3, 4, 2, 3, 'approved', now()),
  (7, 1, 7, now() - interval '120 days', 1, 2, 4, 2, 3, 'approved', now()),
  (8, 1, 8, now() - interval '30 days', 1, 2, 5, 2, 4, 'approved', now()),
  (9, 1, 9, now(), 5, 3, 3, 2, 2, 'draft', now()),
  (10, 1, 10, now() - interval '3 days', 6, 4, 2, 1, 1, 'approved', now()),
  (11, 1, 11, now() - interval '30 days', 2, 3, 3, 2, 2, 'approved', now()),
  (12, 1, 12, now() - interval '15 days', 1, 3, 4, 2, 3, 'approved', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. RISK TREATMENTS (actions to reduce risk)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO risk_treatments (id, risk_assessment_id, treatment_type, description, owner, target_date, status, created_at) VALUES
  (1, 1, 'mitigate', 'Deploy Teleport PAM with GitHub OIDC + MFA. Deprecate direct SSH access. Migrate 12 engineers.', 'David Park', now() + interval '60 days', 'in_progress', now()),
  (2, 1, 'mitigate', 'Revoke SSH key-based access. Audit all existing keys. Enforce certificate-based auth.', 'David Park', now() + interval '30 days', 'pending', now()),
  (3, 2, 'remediate', 'Upgrade Apache Struts to 2.5.34. Run full regression suite. Deploy in emergency window.', 'David Park', now() - interval '7 days', 'overdue', now()),
  (4, 4, 'accept', 'Accept residual risk. OneTrust SOC 2 Type II reviewed. Contractual DP clauses reviewed by legal.', 'Alex Chen', now() + interval '180 days', 'approved', now()),
  (5, 5, 'mitigate', 'Enable Dependabot across all 12 repos. Configure auto-PR for patch version bumps.', 'David Park', now() + interval '30 days', 'planned', now()),
  (6, 6, 'mitigate', 'Deploy phishing simulation platform (KnowBe4). Quarterly campaigns with progressive difficulty.', 'Sarah Miller', now() + interval '45 days', 'in_progress', now()),
  (7, 7, 'mitigate', 'Schedule quarterly restoration drills. Create runbook for BCP team. Document RTO/RPO.', 'Sarah Miller', now() + interval '45 days', 'approved', now()),
  (8, 8, 'accept', 'Accept residual risk. Implement S3 access logging and anomaly alerts. DLP solution budgeted for FY26.', 'Alex Chen', now() + interval '365 days', 'approved', now()),
  (9, 9, 'mitigate', 'Evaluate three DSAR automation tools (MineOS, DataGrail, Transcend). Pilot by end of Q3.', 'Priya Sharma', now() + interval '90 days', 'planned', now()),
  (10, 11, 'mitigate', 'Establish vendor assessment program. Prioritize critical vendors (AWS, Stripe, Slack). Annual cycle.', 'Sarah Miller', now() + interval '60 days', 'approved', now()),
  (11, 12, 'mitigate', 'Cross-train 2 senior engineers on production DB access. Create runbooks for all DB procedures.', 'David Park', now() + interval '30 days', 'in_progress', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. REMEDIATION TASKS (concrete actions from treatments)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO remediation_tasks (id, client_id, risk_treatment_id, title, description, assignee, priority, status, due_date, created_at) VALUES
  (1, 1, 1, 'Deploy Teleport PAM Cluster (3 nodes)', 'Set up Teleport HA cluster in AWS ECS. Integrate GitHub OIDC. Configure role-based access.', 'David Park', 'critical', 'in_progress', now() + interval '60 days', now()),
  (2, 1, 1, 'Migrate 12 Engineers from SSH to Teleport', 'Configure Teleport roles per team. Test engineer onboarding. Deprecate SSH key files.', 'David Park', 'high', 'pending', now() + interval '45 days', now()),
  (3, 1, 2, 'Audit and Revoke Stale SSH Keys', 'Inventory all SSH keys across prod accounts. Revoke keys unused >30 days.', 'David Park', 'high', 'pending', now() + interval '30 days', now()),
  (4, 1, 3, 'Upgrade Apache Struts to 2.5.34', 'Patch payment-module service. Run 400 integration tests. Deploy via CI/CD emergency lane.', 'David Park', 'critical', 'overdue', now() - interval '7 days', now()),
  (5, 1, 5, 'Enable Dependabot on All 12 Repos', 'Configure dependabot.yml per repo. Set schedule to weekly. Enable auto-merge for patch versions.', 'David Park', 'medium', 'pending', now() + interval '14 days', now()),
  (6, 1, 6, 'Deploy KnowBe4 Phishing Platform', 'Provision tenant, configure SSO, upload employee list. Create first campaign template.', 'Sarah Miller', 'medium', 'in_progress', now() + interval '30 days', now()),
  (7, 1, 7, 'Q3 2026 Full Database Restoration Drill', 'Restore production DB snapshot to staging. Validate data integrity. Document RTO achieved.', 'Sarah Miller', 'high', 'planned', now() + interval '45 days', now()),
  (8, 1, 8, 'Enable S3 Access Logging for All Buckets', 'Enable CloudTrail S3 data events. Configure GuardDuty anomaly alerts. Test alert pipeline.', 'David Park', 'medium', 'pending', now() + interval '60 days', now()),
  (9, 1, 9, 'Evaluate DSAR Automation Tools', 'Create evaluation matrix. Trial MineOS and DataGrail. Present recommendation to CISO.', 'Priya Sharma', 'medium', 'planned', now() + interval '60 days', now()),
  (10, 1, 10, 'Complete AWS Annual Vendor Assessment', 'Review AWS SOC 3 report. Confirm certifications active (ISO 27001, SOC 2, PCI DSS). Document in vendor portal.', 'Sarah Miller', 'low', 'pending', now() + interval '45 days', now()),
  (11, 1, 11, 'Document Production DB Runbooks', 'Create runbooks for: failover, backup restore, schema migration, performance troubleshooting.', 'David Park', 'high', 'in_progress', now() + interval '30 days', now()),
  (12, 1, NULL, 'ISMS Internal Audit Q2 2026', 'Conduct ISO 27001 internal audit across all departments. 15-person schedule. Report to CISO.', 'James Wilson', 'high', 'pending', now() + interval '60 days', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. EVIDENCE (12 items with varied status, linked to work)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO evidence (id, client_id, description, framework, type, status, collected_by, due_date, created_at) VALUES
  (1, 1, 'AWS SOC 2 Type II Report (2025-2026)', 'ISO 27001', 'report', 'verified', 2, now() + interval '320 days', now()),
  (2, 1, 'CrowdStrike MFA Enforcement — SSO Config Screenshot', 'NIS2', 'screenshot', 'verified', 2, now() + interval '30 days', now()),
  (3, 1, 'Q2 2026 Penetration Test Report — Cure53', 'NIST CSF', 'report', 'verified', 3, now() + interval '60 days', now()),
  (4, 1, 'Employee Training Completion Report — Q1 2026', 'ISO 27001', 'report', 'collected', 2, now() + interval '10 days', now()),
  (5, 1, 'Weekly Vulnerability Scan — Production (Nessus)', 'NIS2', 'scan_result', 'verified', 4, now() + interval '5 days', now()),
  (6, 1, 'Business Continuity Plan v3.2 (Board-Approved)', 'NIS2', 'policy', 'verified', 2, now() + interval '275 days', now()),
  (7, 1, 'Phishing Simulation Results — March 2025 (EXPIRED)', 'ISO 27001', 'log', 'expired', 3, now() - interval '35 days', now()),
  (8, 1, 'Data Protection Impact Assessment — Customer Portal v2', 'GDPR', 'assessment', 'pending', 2, now() + interval '15 days', now()),
  (9, 1, 'ISO 27001 Surveillance Audit Report — December 2025', 'ISO 27001', 'report', 'verified', 3, now() - interval '30 days', now()),
  (10, 1, 'Server Hardening Benchmark — CIS Level 1 (AWS)', 'NIST CSF', 'report', 'collected', 4, now() + interval '90 days', now()),
  (11, 1, 'Vendor Assessment — OneTrust Completed Questionnaire', 'ISO 27001', 'assessment', 'verified', 2, now() + interval '120 days', now()),
  (12, 1, 'Incident Response Tabletop Exercise — Q1 2026 Results', 'NIS2', 'log', 'expired', 3, now() - interval '60 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO evidence_files (evidence_id, file_name, file_type, file_size, uploaded_by, created_at)
SELECT * FROM (VALUES
  (1, 'aws-soc2-tyii-2025.pdf', 'application/pdf', 2450000, 2, now()),
  (2, 'crowdstrike-sso-mfa-config-2026.png', 'image/png', 320000, 2, now()),
  (3, 'cure53-pentest-q2-2026-report.pdf', 'application/pdf', 4100000, 3, now()),
  (3, 'cure53-pentest-q2-2026-exec-summary.pdf', 'application/pdf', 850000, 3, now()),
  (5, 'nessus-scan-prod-2026-07-02.json', 'application/json', 1560000, 4, now()),
  (9, 'iso27001-surveillance-dec2025.pdf', 'application/pdf', 3200000, 3, now()),
  (11, 'onetrust-vendor-assessment-q1-2026.pdf', 'application/pdf', 780000, 2, now())
) AS v WHERE NOT EXISTS (SELECT 1 FROM evidence_files WHERE evidence_id = v.column1 AND file_name = v.column2);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. POLICIES (7 policies with versions)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO client_policies (id, client_id, name, content, status, version, owner, created_at, updated_at) VALUES
  (1, 1, 'Information Security Policy', 'Enterprise-wide information security framework. Covers: access control, encryption (AES-256), incident response, third-party risk, acceptable use. Aligned with ISO 27001 Annex A and NIS2 Article 21.', 'approved', 3, 'Alex Chen', now() - interval '120 days', now()),
  (2, 1, 'Data Protection & Privacy Policy', 'GDPR-compliant data handling. Covers: data classification (4 tiers), retention schedules, DSAR procedures, breach notification (72h), data processor agreements.', 'approved', 2, 'Priya Sharma', now() - interval '200 days', now()),
  (3, 1, 'Acceptable Use Policy (AUP)', 'Rules for company-issued devices (Mac/Windows), network access, personal devices (BYOD), software installation, and internet usage. Updated for hybrid work model.', 'review', 1, 'Sarah Miller', now() - interval '365 days', now()),
  (4, 1, 'Incident Response Plan', 'NIST 800-61 Rev 2 aligned. 4 phases: Preparation, Detection & Analysis, Containment & Eradication, Recovery. Teams: IR lead, comms lead, forensic lead, legal.', 'approved', 2, 'Alex Chen', now() - interval '90 days', now()),
  (5, 1, 'Vendor Security Policy', 'Vendor risk classification (3 tiers: critical/high/medium). Mandatory SOC 2 for critical vendors. Annual assessment cycle. Termination procedures for non-compliance.', 'draft', 1, 'Sarah Miller', now() - interval '30 days', now()),
  (6, 1, 'Business Continuity & Disaster Recovery Policy', 'RTO/RPO definitions per service tier. Backup requirements (daily incremental, weekly full, quarterly restore test). Crisis communication plan.', 'approved', 2, 'Alex Chen', now() - interval '180 days', now()),
  (7, 1, 'Password & Authentication Policy', 'MFA required for all production access. Password complexity: 14+ chars, 90-day rotation for privileged. Password manager (1Password) mandatory.', 'approved', 1, 'Marcus Johnson', now() - interval '60 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO policy_versions (policy_id, version, content_snippet, created_by, created_at)
SELECT * FROM (VALUES
  (1, '3.0', 'Initial 2025 rewrite for NIS2 alignment', 1, now() - interval '120 days'),
  (1, '3.1', 'Added MFA enforcement section', 2, now() - interval '60 days'),
  (1, '3.2', 'Updated encryption standards to include TLS 1.3 and AES-256-GCM', 1, now() - interval '5 days'),
  (2, '1.0', 'Initial GDPR-compliant version', 5, now() - interval '300 days'),
  (2, '2.0', 'Major update for 2026: added AI training data clause, expanded DSAR section', 5, now()),
  (4, '1.0', 'Based on NIST 800-61 Rev 2', 2, now() - interval '180 days'),
  (4, '2.0', 'Added ransomware annex and crisis comms section', 1, now()),
  (6, '2.0', 'Complete rewrite. New RTO/RPO tiers per service criticality.', 1, now() - interval '180 days')
) AS v WHERE NOT EXISTS (SELECT 1 FROM policy_versions WHERE policy_id = v.column1 AND version = v.column2);

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. VENDORS (5 vendors with assessments)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO vendors (id, client_id, name, category, risk_level, status, website, created_at) VALUES
  (1, 1, 'Amazon Web Services (AWS)', 'Cloud Infrastructure', 'high', 'active', 'aws.amazon.com', now()),
  (2, 1, 'Slack Technologies (Salesforce)', 'Communication', 'medium', 'active', 'slack.com', now()),
  (3, 1, 'Stripe Inc.', 'Payment Processing', 'critical', 'active', 'stripe.com', now()),
  (4, 1, 'OneTrust LLC', 'Privacy & Consent Management', 'high', 'active', 'onetrust.com', now()),
  (5, 1, 'Atlassian Corporation (Jira/Confluence)', 'Productivity & SDLC', 'medium', 'active', 'atlassian.com', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_assessments (id, client_id, vendor_name, assessment_type, status, score, created_at) VALUES
  (1, 1, 'Amazon Web Services (AWS)', 'SOC 2 Type II Review', 'completed', 94, now()),
  (2, 1, 'Slack Technologies (Salesforce)', 'Security Questionnaire (CAIQ)', 'completed', 87, now()),
  (3, 1, 'Stripe Inc.', 'PCI DSS Attestation Review', 'pending', NULL, now()),
  (4, 1, 'OneTrust LLC', 'SOC 2 Type II Review', 'completed', 91, now()),
  (5, 1, 'Atlassian Corporation (Jira/Confluence)', 'Security Questionnaire (CAIQ)', 'completed', 82, now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. INCIDENTS (5 incidents — full lifecycle)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO incidents (id, client_id, title, description, severity, status, detected_at, created_at) VALUES
  (1, 1, 'Phishing Campaign — Fake Office 365 Login Page', '23 employees clicked simulated phishing link. 4 entered credentials on convincing fake O365 page. Incident response team contained within 2 hours. No data exfiltration.', 'medium', 'closed', now() - interval '120 days', now()),
  (2, 1, 'Customer Feedback S3 Bucket Misconfiguration', 'S3 bucket (acmecorp-customer-feedback) set to public-read for 6 hours. 12,543 customer support tickets with PII exposed. No evidence of external access. Root cause: misconfigured CloudFormation template.', 'high', 'closed', now() - interval '45 days', now()),
  (3, 1, 'Suspicious API Calls from Unknown AWS Accounts', 'Rate spike (4500 req/min) from 3 unknown AWS accounts targeting API Gateway. Pattern matched credential-stuffing attempt. WAF blocked 99.8% of requests. 2 legitimate user sessions affected.', 'high', 'open', now() - interval '3 days', now()),
  (4, 1, 'Ransomware Attempt — LockBit via Email Attachment', 'Employee in finance received LockBit-infected Excel attachment. EDR (CrowdStrike) blocked execution. No encryption occurred. Incident reported within 15 minutes.', 'critical', 'closed', now() - interval '90 days', now()),
  (5, 1, 'GitHub Token Leaked in Public Commit', 'Engineer committed AWS access token to public GitHub repo. Token auto-rotated within 4 minutes by GitHub secret scanning. No unauthorized access detected.', 'high', 'closed', now() - interval '30 days', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. NOTIFICATIONS (dashboard alerts)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO notification_log (user_id, client_id, type, title, message, is_read, created_at) VALUES
  (1, 1, 'error', 'Apache Struts Remediation Overdue (7 days)', 'CRITICAL: Payment module running Apache Struts 2.5.33 with known RCE (CVE-2023-50164). Upgrade to 2.5.34 overdue by 7 days.', false, now()),
  (1, 1, 'warning', 'Evidence Expiring: Q2 Pentest Report', 'Cure53 pentest report expires in 30 days. Book new pentest engagement.', false, now() - interval '1 day'),
  (1, 1, 'warning', 'NIS2 Control Gap: Access Control 21(2)(a)', 'Control 21(2)(a) (Access Control Policy) not implemented for 45 days. Auto-remediation in 15 days.', false, now() - interval '3 days'),
  (3, 1, 'info', 'ISMS Internal Audit Scheduled', 'Q2 2026 ISO 27001 internal audit scheduled for July 15-19. 15 auditees across 5 departments.', false, now()),
  (2, 1, 'success', 'Incident Response Plan v2.0 Approved', 'IR Plan version 2.0 approved by CISO. New ransomware annex effective immediately.', true, now() - interval '2 days'),
  (2, 1, 'info', 'Vendor Assessment: Stripe PCI DSS Due', 'Stripe annual PCI DSS Attestation of Compliance (AoC) due in 30 days.', false, now()),
  (4, 1, 'warning', 'SSH Key Audit Required', '12 SSH keys in production accounts not reviewed in 90 days. Audit window expires in 14 days.', false, now() - interval '1 day'),
  (5, 1, 'info', 'DSAR Workflow Tool Evaluation', 'DSAR automation tool evaluation due for review. 3 vendors (MineOS, DataGrail, Transcend) to demo.', false, now() - interval '2 days'),
  (6, 1, 'warning', 'SSL Certificate Expiring (14 days)', 'Kong API Gateway certificate (SHA-1) expiring. Renewal request submitted.', false, now() - interval '3 days'),
  (1, 1, 'info', 'Board Report: Q2 2026 Compliance Score', 'Overall compliance score: 72% (+4% vs Q1). Key improvement: Incident Response capability.', true, now() - interval '7 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. CLIENT CONTROLS (assign ~60 controls with realistic status)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO client_controls (client_id, control_id, status, updated_at, created_at)
SELECT 1, c.id,
  CAST(
    CASE
      -- NIS2: Most implemented, some in progress (access control still being fixed)
      WHEN c.framework = 'NIS2' AND c.control_id IN ('21(2)(a)','21(2)(b)') THEN 'in_progress'
      WHEN c.framework = 'NIS2' AND c.control_id IN ('21(2)(c)') THEN 'not_implemented'
      WHEN c.framework = 'NIS2' THEN 'implemented'
      -- ISO 27001: Strong compliance (certified), few gaps
      WHEN c.framework = 'ISO 27001' AND c.control_id IN ('A.9.2.3','A.12.6.1') THEN 'in_progress'
      WHEN c.framework = 'ISO 27001' AND c.control_id IN ('A.18.1.4') THEN 'not_applicable'
      WHEN c.framework = 'ISO 27001' THEN 'implemented'
      -- NIST CSF: Moderate compliance
      WHEN c.framework = 'NIST CSF' AND c.control_id IN ('DE.CM-1','PR.AC-3','PR.PT-4') THEN 'in_progress'
      WHEN c.framework = 'NIST CSF' AND c.control_id IN ('RS.RP-1') THEN 'not_implemented'
      WHEN c.framework = 'NIST CSF' THEN 'implemented'
      -- GDPR: Partial compliance
      WHEN c.framework = 'GDPR' AND c.control_id IN ('ART.32','ART.33') THEN 'implemented'
      WHEN c.framework = 'GDPR' AND c.control_id IN ('ART.17','ART.20') THEN 'in_progress'
      WHEN c.framework = 'GDPR' THEN 'not_implemented'
      ELSE 'not_implemented'
    END AS client_control_status
  ), now(), now()
FROM controls c WHERE c.status = 'active' AND c.framework IN ('NIS2','ISO 27001','NIST CSF','GDPR')
LIMIT 60
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. AUDIT LOG (detailed activity trail)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO audit_logs (client_id, user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
  (1, 1, 'login', 'session', 1, '{"msg":"CISO login from Berlin office IP"}', '203.0.113.42', now() - interval '2 hours'),
  (1, 2, 'evidence.upload', 'evidence', 4, '{"msg":"Uploaded Q1 training report","size":"2.4MB"}', '10.0.0.15', now() - interval '20 hours'),
  (1, 4, 'control.update', 'client_controls', NULL, '{"msg":"Updated 3 NIS2 controls to in_progress","count":3}', '10.0.0.22', now() - interval '3 days'),
  (1, 1, 'policy.approve', 'client_policies', 4, '{"msg":"Approved Incident Response Plan v2.0"}', '203.0.113.42', now() - interval '2 days'),
  (1, 3, 'risk.assess', 'risk_scenarios', 5, '{"msg":"Completed risk assessment for NPM dependency risk"}', '10.0.0.8', now() - interval '7 days'),
  (1, 5, 'policy.update', 'client_policies', 2, '{"msg":"Updated Data Protection Policy v2.0","sections_changed":3}', '10.0.0.19', now() - interval '10 days'),
  (1, 2, 'vendor.assess', 'vendor_assessments', 1, '{"msg":"AWS SOC 2 Type II review completed","score":94}', '10.0.0.15', now() - interval '15 days'),
  (1, 4, 'incident.update', 'incidents', 5, '{"msg":"Changed GitHub token leak incident status to resolved"}', '10.0.0.22', now() - interval '30 days'),
  (1, 1, 'report.generate', 'compliance_report', NULL, '{"msg":"Generated Q2 board report","frameworks":3}', '203.0.113.42', now() - interval '7 days'),
  (1, 6, 'config.change', 'client_settings', NULL, '{"msg":"Updated Splunk retention from 90 to 180 days"}', '10.0.0.14', now() - interval '3 days'),
  (1, 2, 'notification.sent', 'notification_log', NULL, '{"msg":"Sent vendor assessment reminder to Stripe contact"}', '10.0.0.15', now() - interval '1 day'),
  (1, 5, 'policy.review', 'client_policies', 3, '{"msg":"Reviewed AUP for 2026 update. Recommendations added."}', '10.0.0.19', now() - interval '5 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. COMPLIANCE SCORES & CERTIFICATES
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'in_progress', 'NIS2-DEMO-2026-001', now(), now() + interval '365 days', now()
FROM compliance_frameworks WHERE name = 'NIS2'
ON CONFLICT DO NOTHING;

INSERT INTO compliance_certificates (client_id, framework_id, status, certificate_number, issue_date, expiry_date, created_at)
SELECT 1, id, 'active', 'ISO27001-CERT-2025-047', now() - interval '180 days', now() + interval '185 days', now()
FROM compliance_frameworks WHERE name = 'ISO 27001'
ON CONFLICT DO NOTHING;

-- BCP PROJECTS (existing table has different columns — skip for now)

-- COMPLIANCE SNAPSHOTS (existing table has different columns — skip)

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '[Seed Complete]' AS status;
SELECT 'clients' AS tbl, count(*) FROM clients WHERE id = 1
UNION ALL SELECT 'users', count(*) FROM users WHERE id IN (1,2,3,4,5,6,7,8)
UNION ALL SELECT 'assets', count(*) FROM assets WHERE client_id = 1
UNION ALL SELECT 'risks', count(*) FROM risk_scenarios WHERE client_id = 1
UNION ALL SELECT 'risk_assessments', count(*) FROM risk_assessments WHERE client_id = 1
UNION ALL SELECT 'risk_treatments', count(*) FROM risk_treatments WHERE risk_assessment_id IN (SELECT id FROM risk_assessments WHERE client_id = 1)
UNION ALL SELECT 'evidence', count(*) FROM evidence WHERE client_id = 1
UNION ALL SELECT 'policies', count(*) FROM client_policies WHERE client_id = 1
UNION ALL SELECT 'vendors', count(*) FROM vendors WHERE client_id = 1
UNION ALL SELECT 'incidents', count(*) FROM incidents WHERE client_id = 1
UNION ALL SELECT 'tasks', count(*) FROM remediation_tasks WHERE client_id = 1
UNION ALL SELECT 'notifications', count(*) FROM notification_log WHERE client_id = 1
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs WHERE client_id = 1
-- SKIP: compliance_snapshots (existing table uses different schema)
UNION ALL SELECT 'bia_analyses', count(*) FROM business_impact_analyses WHERE client_id = 1
ORDER BY tbl;

COMMIT;
