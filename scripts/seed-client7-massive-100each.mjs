import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seedMassive() {
  await client.connect();
  console.log('[massive-seed] Connected to database');

  const clientId = parseInt(process.argv[2] || '7', 10);
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600000);

  console.log(`[massive-seed] Starting massive seed (~100 each) for Client ${clientId}...`);

  // 0. Clean prior test records for Client 7
  await client.query('DELETE FROM autopilot_actions WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM client_policies WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM risk_treatments WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM risk_scenarios WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM risk_assessments WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM vulnerabilities WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM questionnaires WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM dsar_requests WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM vendor_contracts WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM evidence WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM bc_plans WHERE client_id = $1', [clientId]);
  await client.query('DELETE FROM incidents WHERE client_id = $1', [clientId]);

  console.log('[massive-seed] Cleaned existing tables for Client 7.');

  // =========================================================================
  // 1. POLICIES (~100 items)
  // =========================================================================
  console.log('[massive-seed] Generating 100 Policies...');
  const policyDefinitions = [
    // 20 Policies missing MFA clause (Access Control / Auth)
    ...[
      "Corporate Access Control Policy", "Privileged Identity Management Policy", "Remote VPN Authentication Policy",
      "Cloud Infrastructure IAM Policy", "Customer Portal Authentication Baseline", "Database Administrator Access Policy",
      "Production Jumpbox Access Control Policy", "Multi-Tenant API Gateway Security Policy", "Developer Machine Access Policy",
      "SSH Key Management & Bastion Access Policy", "Third-Party Support Remote Access Policy", "Zero Trust Identity Architecture Policy",
      "Executive Mobile Device Access Policy", "Staging Environment User Access Policy", "Internal Microservices Authentication Standard",
      "Container Registry Access Control Policy", "Kubernetes RBAC Governance Policy", "Code Repository & Git Access Policy",
      "Single Sign-On (SSO) Enforcement Policy", "Biometric and Device Authentication Policy"
    ].map((name, i) => ({
      name,
      status: "approved",
      version: 1,
      content: "This policy establishes strict password complexity (minimum 16 alphanumeric characters), quarterly rotation, and automatic workstation screen lock after 5 minutes of inactivity. Administrative accounts must have dedicated credentials separate from standard email accounts.", // Intentionally missing MFA
      updatedAt: daysAgo(20 + i * 2),
      nextReviewDate: daysAhead(180 + i * 5),
      owner: "CISO"
    })),

    // 20 Policies missing 72h regulatory breach notification SLA (Incident / Breach)
    ...[
      "Incident Management & Response Plan", "Security Operations Center Escalation Procedure", "Data Breach Protocol & Notification Standard",
      "Cyber Extortion and Ransomware Response Policy", "Distributed Denial of Service (DDoS) Response Policy", "Customer Data Spill Containment Procedure",
      "Malware Outbreak and Host Isolation Standard", "Third-Party Cloud Incident Coordination Plan", "Insider Threat Incident Investigation Policy",
      "Forensic Evidence Preservation Protocol", "Emergency Response Team Operating Guidelines", "Critical Infrastructure Failure & IR Policy",
      "Executive Crisis Communication Standard", "Physical Security Breach Response Plan", "Payment Gateway Security Incident Policy",
      "Supply Chain Compromise Mitigation Policy", "Phishing & Social Engineering Incident Standard", "Unauthorized Data Modification Escalation Policy",
      "API Compromise and Credential Revocation Policy", "Security Vulnerability Disclosure Incident Policy"
    ].map((name, i) => ({
      name,
      status: "approved",
      version: 1,
      content: "All personnel must report suspected security anomalies to the Security Operations Center. The Incident Commander will classify severity into P1, P2, P3, and notify internal stakeholders, customers, and board members according to severity matrices.", // Intentionally missing 72-hour SLA
      updatedAt: daysAgo(30 + i * 3),
      nextReviewDate: daysAhead(150 + i * 4),
      owner: "SecOps Lead"
    })),

    // 30 Policies Overdue for Annual Review (>365 days / past next_review_date)
    ...[
      "Information Security Governance Charter", "Acceptable Use of IT Assets Policy", "Data Classification and Handling Policy",
      "Asset Inventory and Disposal Standard", "Cryptographic Key Management Policy", "Secure Software Development Lifecycle (SSDLC) Policy",
      "Open Source Software Governance Policy", "Physical and Environmental Security Standard", "Clear Desk and Clear Screen Policy",
      "Business Continuity and Resilience Governance Policy", "Human Resources Information Security Policy", "Employee Onboarding and Offboarding Security Standard",
      "Mobile Device & Bring Your Own Device (BYOD) Policy", "Network Segmentation and Firewall Architecture Standard", "Wireless Network Security Policy",
      "Email and Anti-Spam Security Standard", "Log Retention and Audit Trail Governance Policy", "Vulnerability Management and Remediation Standard",
      "Threat Intelligence and Threat Modeling Policy", "Change Management and Production Deployment Standard", "Backup and Data Recovery Governance Standard",
      "Capacity Management and Resource Monitoring Policy", "Supplier and Vendor Security Due Diligence Policy", "Cross-Border Data Transfer and Standard Contractual Clauses Policy",
      "Data Retention and Scheduled Destruction Standard", "Intellectual Property Protection and Non-Disclosure Standard", "Whistleblower and Security Violation Reporting Standard",
      "Teleworking and Hybrid Remote Work Standard", "Security Awareness Training and Phishing Simulation Standard", "External Audit Coordination and Independent Review Policy"
    ].map((name, i) => ({
      name,
      status: "approved",
      version: 2,
      content: "Annual corporate security policy defining baseline controls, operational roles, management review meetings, and compliance commitments under ISO/IEC 27001 and AICPA SOC 2 standards.",
      updatedAt: daysAgo(380 + i * 5),
      nextReviewDate: daysAgo(15 + i * 2),
      owner: "Compliance Director"
    })),

    // 30 Policies Stuck in "Review" Status (>21 days)
    ...[
      "Enterprise Artificial Intelligence (EU AI Act) Compliance Policy", "Generative AI and Large Language Model (LLM) Usage Policy", "Zero Trust Architecture Implementation Standard",
      "Microservice Mesh Security & mTLS Baseline", "Serverless Function Security Standard", "Infrastructure-as-Code (Terraform/CloudFormation) Governance Policy",
      "Cloud Security Posture Management (CSPM) Baseline", "Software Bill of Materials (SBOM) Generation and Tracking Policy", "Secret Management and Automated Token Rotation Policy",
      "Quantum-Resistant Cryptography Migration Strategy", "Automated CI/CD Pipeline Security Gate Standard", "Third-Party SaaS Integration and OAuth Scope Standard",
      "Container Image Hardening and Vulnerability Scanning Standard", "Database Transparent Data Encryption (TDE) Baseline", "Privacy-by-Design and DPIA Execution Standard",
      "API Security Top 10 Guardrails Standard", "Production Chaos Engineering and Resilience Testing Standard", "Ephemeral Environment Security and Automated Teardown Standard",
      "Internal Bug Bounty Program Standard", "Hardware Security Module (HSM) Operational Policy", "Edge Computing & CDN Security Standard",
      "Decentralized Identity and Credential Verification Standard", "Synthetic Data Generation and Privacy Standard", "Supply Chain Provenance Verification Policy",
      "Automated Penetration Testing and BAS Standard", "Cloud Cost Governance and Resource Quota Policy", "Data Lake Access Control & Tokenization Standard",
      "Developer Sandboxing and Data Masking Policy", "Production Secret Zeroization Standard", "Autonomous Agent Monitoring and Ethical AI Policy"
    ].map((name, i) => ({
      name,
      status: "review",
      version: 1,
      content: "Draft policy under formal stakeholder review. Outlines technical controls, operational responsibilities, risk assessment procedures, and audit metrics.",
      updatedAt: daysAgo(25 + i * 2),
      nextReviewDate: daysAhead(90 + i * 3),
      owner: "Security Architect"
    }))
  ];

  for (const pol of policyDefinitions) {
    await client.query(`
      INSERT INTO client_policies (client_id, name, status, version, content, owner, updated_at, next_review_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [clientId, pol.name, pol.status, pol.version, pol.content, pol.owner, pol.updatedAt, pol.nextReviewDate]);
  }
  console.log(`[massive-seed] ✅ Seeded ${policyDefinitions.length} Policies.`);

  // =========================================================================
  // 2. RISKS & TREATMENTS (~100 items)
  // =========================================================================
  console.log('[massive-seed] Generating 100 Risks, Treatments & Assessments...');
  const riskScenariosData = [
    // 50 High/Critical Risk Scenarios exceeding appetite (threshold 6)
    { title: "Public S3 Storage Bucket Misconfiguration & PII Leak", cat: "Cloud", l: 5, i: 5, score: 25, band: "critical" },
    { title: "Ransomware Infiltration via Compromised External RDP Jumpbox", cat: "Endpoint", l: 4, i: 5, score: 20, band: "critical" },
    { title: "Production Database Credential Leak via CI/CD Build Logs", cat: "DevOps", l: 4, i: 5, score: 20, band: "critical" },
    { title: "Unpatched Critical RCE on Internet-Facing Ingress Controller", cat: "Infrastructure", l: 4, i: 4, score: 16, band: "critical" },
    { title: "Supply Chain Compromise via Backdoored NPM Core Dependency", cat: "Application", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Session Hijacking via Cross-Site Scripting on User Dashboard", cat: "Application", l: 4, i: 4, score: 16, band: "critical" },
    { title: "Hardcoded Master JWT Secret in Mobile Client Binary", cat: "Mobile", l: 4, i: 4, score: 16, band: "critical" },
    { title: "Prompt Injection Exfiltrating System Instructions in AI Bot", cat: "AI Safety", l: 4, i: 3, score: 12, band: "high" },
    { title: "Unrestricted IAM Over-Privileged Wildcard Permissions in AWS", cat: "Cloud", l: 4, i: 4, score: 16, band: "critical" },
    { title: "Lack of Multi-Region Disaster Recovery Cloud Redundancy", cat: "Continuity", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Database Backup Snapshot Exposed to Public AWS Accounts", cat: "Cloud", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Insider Threat Data Exfiltration by Terminated Privileged Staff", cat: "Personnel", l: 3, i: 4, score: 12, band: "high" },
    { title: "SMS-Based MFA Interception via Telecommunication SIM Swapping", cat: "Identity", l: 3, i: 4, score: 12, band: "high" },
    { title: "BGP Prefix Hijacking Diverting Customer Web Traffic", cat: "Network", l: 2, i: 5, score: 10, band: "high" },
    { title: "Unencrypted Medical Records Stored on Production File Storage", cat: "Privacy", l: 3, i: 5, score: 15, band: "critical" },
    { title: "API Authentication Token Spraying Attack Bypassing Rate Limits", cat: "API", l: 4, i: 3, score: 12, band: "high" },
    { title: "Lack of Immutable WORM Storage for Ransomware Backup Resilience", cat: "Backup", l: 3, i: 4, score: 12, band: "high" },
    { title: "Compromised Third-Party Customer Support SaaS Tool", cat: "Vendor", l: 3, i: 4, score: 12, band: "high" },
    { title: "DNS Cache Poisoning & Subdomain Takeover on Dormant Subdomains", cat: "Network", l: 3, i: 3, score: 9, band: "high" },
    { title: "Kubernetes Kubelet API Unauthenticated Remote Execution", cat: "Infrastructure", l: 3, i: 5, score: 15, band: "critical" },
    { title: "SQL Injection in Customer Invoicing Microservice Endpoint", cat: "Application", l: 3, i: 4, score: 12, band: "high" },
    { title: "Zero-Day Vulnerability in Web Server SSL Acceleration Module", cat: "Infrastructure", l: 2, i: 5, score: 10, band: "high" },
    { title: "Unsanitized Production PII Replicated to Developer Staging Env", cat: "Privacy", l: 4, i: 3, score: 12, band: "high" },
    { title: "Executive Account Takeover via Advanced Spear-Phishing", cat: "Social", l: 3, i: 4, score: 12, band: "high" },
    { title: "Third-Party Payment Gateway API Outage during Peak Billing", cat: "Vendor", l: 3, i: 4, score: 12, band: "high" },
    { title: "DDoS Attack Overwhelming Edge Cloudflare Load Balancers", cat: "Network", l: 3, i: 3, score: 9, band: "high" },
    { title: "Unrestricted Docker Socket Mounted in Multi-Tenant Container", cat: "Infrastructure", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Legacy Cryptographic Hash (MD5/SHA1) Used for Password Hashes", cat: "Cryptography", l: 2, i: 5, score: 10, band: "high" },
    { title: "Loss of Primary Cloud Master KMS Customer Encryption Keys", cat: "Cryptography", l: 1, i: 5, score: 7, band: "high" },
    { title: "Insecure Direct Object Reference (IDOR) Exposing Customer Invoices", cat: "Application", l: 4, i: 3, score: 12, band: "high" },
    { title: "Stale Active Directory Service Accounts with Domain Admin Rights", cat: "Identity", l: 3, i: 4, score: 12, band: "high" },
    { title: "Failure of Automated Nightly Production Database Backups", cat: "Backup", l: 3, i: 4, score: 12, band: "high" },
    { title: "Corporate Laptop Stolen with Unencrypted Local BitLocker Key", cat: "Physical", l: 2, i: 4, score: 8, band: "high" },
    { title: "Unrestricted Outbound Traffic Permitting Reverse Shell C2", cat: "Network", l: 3, i: 4, score: 12, band: "high" },
    { title: "Production Sentry Logs Storing Full Unmasked Credit Card Numbers", cat: "Compliance", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Employee Wire Transfer Fraud via Deepfake Audio Impersonation", cat: "Social", l: 2, i: 5, score: 10, band: "high" },
    { title: "Malicious Pull Request Merged Without Code Review Signoff", cat: "DevOps", l: 2, i: 4, score: 8, band: "high" },
    { title: "Hardware Security Appliance Power Redundancy Failure", cat: "Physical", l: 2, i: 4, score: 8, band: "high" },
    { title: "Unauthorized Container Image Pulled from Public Docker Hub", cat: "DevOps", l: 3, i: 3, score: 9, band: "high" },
    { title: "Server-Side Request Forgery (SSRF) to Cloud Metadata Endpoint", cat: "Application", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Bypassed Web Application Firewall (WAF) via Chunked Encoding", cat: "Network", l: 3, i: 3, score: 9, band: "high" },
    { title: "Lack of Audit Logging for Sensitive User Data Access", cat: "Compliance", l: 3, i: 4, score: 12, band: "high" },
    { title: "Third-Party Email Relay Compromise Sending Spam from Domain", cat: "Reputation", l: 3, i: 3, score: 9, band: "high" },
    { title: "Broken Object Level Authorization on Multi-Tenant Healthcare API", cat: "Application", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Unencrypted Internal Traffic between Kubernetes Cluster Pods", cat: "Infrastructure", l: 3, i: 3, score: 9, band: "high" },
    { title: "Uncontrolled Personal USB Flash Drives Used in Server Room", cat: "Physical", l: 2, i: 4, score: 8, band: "high" },
    { title: "Stale SSL/TLS Wildcard Certificate Expiring Without Auto-Renewal", cat: "Infrastructure", l: 3, i: 4, score: 12, band: "high" },
    { title: "Exposure of Internal Elasticsearch Cluster on Port 9200", cat: "Database", l: 3, i: 5, score: 15, band: "critical" },
    { title: "Lack of Cryptographic Signature Verification on Firmware Updates", cat: "Hardware", l: 2, i: 5, score: 10, band: "high" },
    { title: "Automated Scraping of Proprietary Machine Learning Training Sets", cat: "AI Safety", l: 3, i: 3, score: 9, band: "high" }
  ];

  const insertedScenarioIds = [];
  for (const s of riskScenariosData) {
    const res = await client.query(`
      INSERT INTO risk_scenarios (
        client_id, title, description, category, likelihood, impact,
        residual_likelihood, residual_impact, residual_score, residual_risk,
        inherent_score, inherent_risk, status, owner, assessment_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $5, $6, $7, $8, 20, 'critical', 'analyzed', 'SecOps Lead', 'scenario')
      RETURNING id
    `, [clientId, s.title, `Automated assessment of ${s.title} under ISO 27005 risk framework.`, s.cat, s.l, s.i, s.score, s.band]);
    insertedScenarioIds.push(res.rows[0].id);
  }

  // 30 Overdue Risk Treatments linked to scenarios
  const treatmentStrategies = [
    "Deploy CrowdStrike Falcon EDR with automated host isolation across production jumpboxes",
    "Enable AWS GuardDuty and AWS Macie automated S3 bucket public access remediation",
    "Implement HashiCorp Vault automated dynamic secrets rotation for all production databases",
    "Deploy Palo Alto VM-Series Next-Gen Firewall with SSL decryption in cloud transit VPC",
    "Enforce GitHub branch protection rules requiring 2 senior reviewer sign-offs and CI pass",
    "Migrate all user and administrator accounts to FIDO2 WebAuthn hardware security keys",
    "Implement Wiz Cloud Security Posture Management (CSPM) with automated blocker alerts",
    "Configure AWS S3 Object Lock in WORM compliance mode for immutable backup retention",
    "Deploy Cloudflare Magic Transit DDoS mitigation and automated BGP route scrubbing",
    "Implement Istio service mesh mutual TLS (mTLS) with strict cryptographic mode across all pods",
    "Deploy Snyk container scanning in CI/CD pipeline to block unapproved base images",
    "Implement Datadog Cloud SIEM automated anomaly detection rules for privileged IAM actions",
    "Configure AWS Secrets Manager automatic rotation for RDS PostgreSQL database passwords",
    "Implement CyberArk Privileged Session Manager for recording all bastion SSH/RDP sessions",
    "Deploy Okta Adaptive MFA with device trust certificates and IP geofencing restrictions",
    "Conduct comprehensive third-party red team penetration test on customer portal APIs",
    "Configure CloudWatch Real-Time Alarms for unauthorized root account login attempts",
    "Deploy Falco runtime container security monitoring to detect unauthorized shell spawns",
    "Implement Data Loss Prevention (DLP) agents on all corporate MacBook and Windows laptops",
    "Configure automated TLS certificate issuance and renewal via Let's Encrypt / Certbot",
    "Enforce PostgreSQL Row-Level Security (RLS) policies for multi-tenant database isolation",
    "Deploy SonarQube static application security testing (SAST) in GitLab CI pipelines",
    "Implement automated weekly database snapshot restore verification drills in staging",
    "Configure AWS KMS Customer Managed Keys (CMK) with automated annual key rotation",
    "Implement Prisma Cloud runtime vulnerability scanner on all Kubernetes worker nodes",
    "Deploy Cloudflare WAF OWASP Core Ruleset with automated bot challenge mode enabled",
    "Implement Splunk automated forwarders on all Linux production syslog daemons",
    "Configure Google Workspace context-aware access restricting admin consoles to office IPs",
    "Conduct tabletop ransomware simulation drill with executive leadership and legal counsel",
    "Implement automated offboarding orchestrator revoking SSO and VPN within 10 minutes"
  ];

  for (let i = 0; i < treatmentStrategies.length; i++) {
    const scId = insertedScenarioIds[i % insertedScenarioIds.length];
    await client.query(`
      INSERT INTO risk_treatments (
        client_id, risk_scenario_id, treatment_type, strategy, status,
        due_date, priority, owner
      )
      VALUES ($1, $2, 'mitigate', $3, 'in_progress', $4, $5, 'SecOps Lead')
    `, [
      clientId,
      scId,
      treatmentStrategies[i],
      daysAgo(10 + i * 2), // Overdue by 10 to 68 days
      i < 15 ? 'critical' : 'high'
    ]);
  }

  // 20 High-Impact Orphan Risk Assessments (inherent score >= 12, owner = NULL)
  const orphanRisks = [
    "Unauthenticated GraphQL Introspection Exposing Internal Schema",
    "Unrestricted File Upload Permitting Remote PHP/JSP Web Shell Execution",
    "Zero-Day Memory Corruption in Core C++ Payment Engine",
    "Plaintext API Keys Found in Customer Support Chat Transcripts",
    "Dormant AWS VPC Peering Connection to Unaudited Third-Party Account",
    "Subdomain Takeover on Unclaimed AWS S3 Bucket CNAME Record",
    "Unauthorized Extraction of Customer Biometric Authentication Hashes",
    "Lack of Disaster Recovery Site in Secondary Cloud Geographic Zone",
    "Production Database Admin Password Shared in Internal Slack Channel",
    "Missing Rate Limiting on Password Reset SMS Dispatch Endpoint",
    "Unvalidated Redirects Enabling Credential Harvesting Phishing Links",
    "Exposure of Spring Boot Actuator Endpoints (/env, /heapdump)",
    "Unencrypted Customer Credit Card PANs in Application Temporary Files",
    "Vulnerability in Zero-Trust Network Access (ZTNA) Agent",
    "Hardcoded AWS Secret Access Key in Production Dockerfile",
    "Missing Multi-Factor Authentication on Emergency Root Cloud Account",
    "Unauthorized Git Mirroring of Proprietary Intellectual Property",
    "Denial of Service via Unbounded XML Entity Expansion (Billion Laughs)",
    "Insecure Deserialization in Java RMI Background Processing Service",
    "Telemetry SDK Transmitting Unhashed Personal Identifiable Information"
  ];

  for (let i = 0; i < orphanRisks.length; i++) {
    await client.query(`
      INSERT INTO risk_assessments (
        client_id, assessment_id, title, inherent_score, status, risk_owner
      )
      VALUES ($1, $2, $3, $4, 'draft', NULL)
    `, [
      clientId,
      `RA-ORPHAN-${100 + i}`,
      orphanRisks[i],
      14 + (i % 8) // 14 to 21
    ]);
  }
  console.log(`[massive-seed] ✅ Seeded 50 Scenarios, 30 Overdue Treatments, 20 Orphan Assessments (100 Total).`);

  // =========================================================================
  // 3. VULNERABILITIES (~100 items)
  // =========================================================================
  console.log('[massive-seed] Generating 100 Vulnerabilities with breached SLAs...');
  const cveList = [
    // 35 Critical CVEs (CVSS 9.0 - 10.0, SLA: 7 days, ages 10-60 days)
    { id: "CVE-2024-3094", name: "liblzma xz-utils SSH Backdoor Pre-auth RCE", cvss: 100, sev: "critical", age: 25 },
    { id: "CVE-2024-21626", name: "runc container breakout host filesystem overwrite", cvss: 86, sev: "critical", age: 30 },
    { id: "CVE-2024-6387", name: "regreSSHion OpenSSH unauthenticated RCE in glibc", cvss: 98, sev: "critical", age: 22 },
    { id: "CVE-2024-4577", name: "PHP CGI argument injection remote code execution", cvss: 98, sev: "critical", age: 35 },
    { id: "CVE-2024-3400", name: "Palo Alto PAN-OS GlobalProtect command injection", cvss: 100, sev: "critical", age: 40 },
    { id: "CVE-2024-1709", name: "ConnectWise ScreenConnect authentication bypass", cvss: 100, sev: "critical", age: 45 },
    { id: "CVE-2024-23897", name: "Jenkins CLI arbitrary file read and RCE", cvss: 98, sev: "critical", age: 32 },
    { id: "CVE-2023-46604", name: "Apache ActiveMQ OpenWire remote code execution", cvss: 98, sev: "critical", age: 50 },
    { id: "CVE-2023-22515", name: "Atlassian Confluence broken access control 0-day", cvss: 100, sev: "critical", age: 60 },
    { id: "CVE-2023-4966", name: "Citrix Bleed NetScaler memory disclosure", cvss: 94, sev: "critical", age: 55 },
    { id: "CVE-2024-21887", name: "Ivanti Connect Secure web command injection", cvss: 91, sev: "critical", age: 28 },
    { id: "CVE-2023-34362", name: "MOVEit Transfer SQL injection pre-auth RCE", cvss: 98, sev: "critical", age: 65 },
    { id: "CVE-2023-38606", name: "Apple WebKit and Kernel memory corruption zero-day", cvss: 98, sev: "critical", age: 42 },
    { id: "CVE-2024-0204", name: "Fortra GoAnywhere MFT auth bypass vulnerability", cvss: 98, sev: "critical", age: 38 },
    { id: "CVE-2023-27997", name: "Fortinet FortiOS SSL-VPN heap buffer overflow RCE", cvss: 98, sev: "critical", age: 48 },
    { id: "CVE-2024-38077", name: "Windows Remote Desktop Licensing service RCE", cvss: 98, sev: "critical", age: 20 },
    { id: "CVE-2024-27198", name: "JetBrains TeamCity authentication bypass RCE", cvss: 98, sev: "critical", age: 26 },
    { id: "CVE-2023-20198", name: "Cisco IOS XE Web UI privilege escalation", cvss: 100, sev: "critical", age: 52 },
    { id: "CVE-2023-3519", name: "Citrix ADC unauthenticated remote code execution", cvss: 98, sev: "critical", age: 58 },
    { id: "CVE-2024-24919", name: "Check Point Security Gateway information disclosure", cvss: 96, sev: "critical", age: 24 },
    { id: "CVE-2024-21413", name: "Microsoft Outlook remote code execution preview pane", cvss: 98, sev: "critical", age: 31 },
    { id: "CVE-2023-20887", name: "VMware Aria Operations for Networks command injection", cvss: 98, sev: "critical", age: 46 },
    { id: "CVE-2023-42793", name: "JetBrains TeamCity root token disclosure", cvss: 98, sev: "critical", age: 39 },
    { id: "CVE-2024-20353", name: "Cisco ASA and FTD SSL VPN denial of service & reboot", cvss: 93, sev: "critical", age: 27 },
    { id: "CVE-2023-29357", name: "Microsoft SharePoint Server elevation of privilege", cvss: 98, sev: "critical", age: 54 },
    { id: "CVE-2024-28987", name: "SolarWinds Web Help Desk hardcoded credential RCE", cvss: 91, sev: "critical", age: 19 },
    { id: "CVE-2024-37085", name: "VMware ESXi Active Directory auth bypass", cvss: 98, sev: "critical", age: 21 },
    { id: "CVE-2024-38112", name: "Windows MSHTML platform spoofing vulnerability", cvss: 93, sev: "critical", age: 18 },
    { id: "CVE-2023-36884", name: "Office and Windows HTML remote code execution", cvss: 98, sev: "critical", age: 62 },
    { id: "CVE-2024-43451", name: "Microsoft NTLM hash disclosure zero-day", cvss: 90, sev: "critical", age: 15 },
    { id: "CVE-2024-20359", name: "Cisco Persistent Local Code Execution vulnerability", cvss: 90, sev: "critical", age: 23 },
    { id: "CVE-2023-32409", name: "WebKit Web Content sandbox restriction bypass", cvss: 98, sev: "critical", age: 49 },
    { id: "CVE-2024-29972", name: "Zyxel NAS pre-authentication command injection", cvss: 98, sev: "critical", age: 33 },
    { id: "CVE-2024-40766", name: "SonicWall SonicOS improper access control", cvss: 93, sev: "critical", age: 17 },
    { id: "CVE-2023-2868", name: "Barracuda ESG unauthenticated remote command injection", cvss: 98, sev: "critical", age: 66 },

    // 40 High CVEs (CVSS 7.0 - 8.9, SLA: 14 days, ages 20-90 days)
    ...[
      "CVE-2023-4863:libwebp heap buffer overflow in WebP lossless decoding:88:35",
      "CVE-2023-38545:curl SOCKS5 heap buffer overflow vulnerability:88:42",
      "CVE-2023-44487:HTTP/2 Rapid Reset DDoS amplification attack:75:55",
      "CVE-2024-21658:Kube-apiserver authorization bypass on custom resources:82:28",
      "CVE-2024-21410:Microsoft Exchange Server NTLM relay vulnerability:88:34",
      "CVE-2024-30078:Windows Wi-Fi driver remote code execution packet:88:25",
      "CVE-2023-48795:Terrapin SSH prefix truncation cryptographic attack:75:48",
      "CVE-2024-27351:Golang crypto/x509 infinite loop certificate verification:75:29",
      "CVE-2024-38063:Windows TCP/IP Remote Code Execution IPv6 packet:88:19",
      "CVE-2023-22527:Atlassian Confluence template injection OGNL:88:51",
      "CVE-2024-28000:WordPress Litespeed Cache privilege escalation:88:22",
      "CVE-2024-38856:Apache OFBiz pre-authentication remote code execution:88:21",
      "CVE-2024-23113:Fortinet FortiOS format string vulnerability in fgfmd:88:30",
      "CVE-2023-46805:Ivanti Connect Secure authentication bypass:82:44",
      "CVE-2024-20358:Cisco ASA and FTD software command injection:88:32",
      "CVE-2024-21762:FortiOS out-of-bounds write in sslvpnd:88:36",
      "CVE-2023-28252:Windows Common Log File System (CLFS) elevation:78:62",
      "CVE-2024-47575:FortiManager missing authentication in fgfmsd:88:18",
      "CVE-2023-36563:Microsoft WordPad information disclosure vulnerability:75:53",
      "CVE-2024-26169:Windows Error Reporting Service privilege escalation:78:37",
      "CVE-2024-30088:Windows Kernel elevation of privilege vulnerability:78:26",
      "CVE-2023-20109:Cisco Catalyst SD-WAN privilege escalation:78:57",
      "CVE-2024-21338:Windows Kernel AppLocker driver local privilege escalation:78:40",
      "CVE-2023-41064:Apple ImageIO buffer overflow executing arbitrary code:88:49",
      "CVE-2024-20656:Visual Studio Code remote code execution in workspace:78:33",
      "CVE-2023-38831:WinRAR spoofed file extension remote execution:78:59",
      "CVE-2024-20931:Oracle WebLogic Server remote code execution:88:41",
      "CVE-2023-32434:WebKit integer overflow executing arbitrary code:88:47",
      "CVE-2024-35250:Windows Kernel-Mode Driver elevation of privilege:78:27",
      "CVE-2023-42115:Exim Mail Server remote code execution in NTLM:88:43",
      "CVE-2024-21893:Ivanti Neurons Server-Side Request Forgery:82:35",
      "CVE-2023-36033:Windows DWM Core Library elevation of privilege:78:50",
      "CVE-2024-20399:Cisco NX-OS Software command injection vulnerability:88:24",
      "CVE-2023-24932:Secure Boot Security Feature Bypass vulnerability:78:64",
      "CVE-2024-21412:Microsoft Windows SmartScreen security feature bypass:78:38",
      "CVE-2023-36025:Windows SmartScreen security feature bypass zero-day:78:52",
      "CVE-2024-26229:Windows CSC Service elevation of privilege:78:30",
      "CVE-2023-23397:Microsoft Outlook NTLM credential theft via calendar:88:70",
      "CVE-2024-20356:Cisco Firepower Threat Defense software DoS:75:31",
      "CVE-2024-38021:Microsoft Office remote code execution vulnerability:88:20"
    ].map((raw) => {
      const [id, name, cvssStr, ageStr] = raw.split(":");
      return { id, name, cvss: parseInt(cvssStr, 10), sev: "high", age: parseInt(ageStr, 10) };
    }),

    // 25 Medium CVEs (CVSS 4.0 - 6.9, SLA: 30 days, ages 45-120 days)
    ...[
      "CVE-2023-38039:iCal4j denial of service via recursion parsing:55:65",
      "CVE-2024-25062:libxml2 use-after-free in xmlFreeInputStream:65:50",
      "CVE-2023-34462:Netty sniHandler memory leak during TLS handshake:65:80",
      "CVE-2024-22243:Spring Framework URL parsing open redirect vulnerability:61:55",
      "CVE-2023-45853:MiniZip buffer overflow in zipOpenNewFileInZip4_64:65:90",
      "CVE-2024-24576:Rust standard library command injection on Windows:58:60",
      "CVE-2023-38546:curl cookie injection with empty domain:53:75",
      "CVE-2024-28180:go-jose improper handling of highly compressed payloads:59:48",
      "CVE-2023-45803:Urllib3 request body memory leak on redirect:53:85",
      "CVE-2024-27306:aiohttp HTTP request smuggling in server:53:62",
      "CVE-2023-37920:Certifi removal of e-Tugra root certificate:53:95",
      "CVE-2024-24786:Protobuf-go infinite loop in unmarshal:55:58",
      "CVE-2023-47038:Perl undefined behavior in regular expression engine:55:88",
      "CVE-2024-29025:Netty denial of service through POST multipart:53:64",
      "CVE-2023-32681:Requests session cookie leakage to subdomains:61:92",
      "CVE-2024-24785:Golang net/mail parsing denial of service:53:66",
      "CVE-2023-45288:Golang net/http HTTP/2 continuous frame reset DoS:65:70",
      "CVE-2024-28849:Follow-redirects cookie leak during cross-domain:53:57",
      "CVE-2023-44270:PostgreSQL unquoted search_path during installation:65:100",
      "CVE-2024-34064:Jinja2 HTML attribute injection vulnerability:61:52",
      "CVE-2023-39410:PostgreSQL extension script injection in CREATE:65:105",
      "CVE-2024-22195:Jinja2 attribute injection in compiler:61:63",
      "CVE-2023-32001:Node.js policy bypass via Module._load:65:110",
      "CVE-2024-21503:MySQL Server optimizer query denial of service:53:72",
      "CVE-2023-40167:Node.js HTTP request smuggling via chunked transfer:65:115"
    ].map((raw) => {
      const [id, name, cvssStr, ageStr] = raw.split(":");
      return { id, name, cvss: parseInt(cvssStr, 10), sev: "medium", age: parseInt(ageStr, 10) };
    })
  ];

  for (let i = 0; i < cveList.length; i++) {
    const c = cveList[i];
    await client.query(`
      INSERT INTO vulnerabilities (
        client_id, vulnerability_id, cve_id, name, description,
        severity, cvss_score, discovery_date, status, owner
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', 'SecOps Remediation Team')
    `, [
      clientId,
      `VULN-2024-${String(i + 1).padStart(3, '0')}`,
      c.id,
      c.name,
      `Security flaw identified in production software inventory. CVSS ${c.cvss / 10}. Remediate per organizational SLA.`,
      c.sev,
      c.cvss,
      daysAgo(c.age)
    ]);
  }
  console.log(`[massive-seed] ✅ Seeded ${cveList.length} Vulnerabilities.`);

  // =========================================================================
  // 4. SLA CLOCKS: QUESTIONNAIRES, DSARs, CONTRACTS, INCIDENTS (~100 items)
  // =========================================================================
  console.log('[massive-seed] Generating 100 Vendor, DSAR, Contract & Incident Deadlines...');

  // 40 Vendor Questionnaires (20 Overdue by 5-30 days, 20 Approaching in 1-7 days)
  const vendorNames = [
    "Amazon Web Services", "Microsoft Azure Cloud", "Google Cloud Platform", "Salesforce CRM", "Stripe Payment Infrastructure",
    "Datadog Cloud Monitoring", "Cloudflare Edge Network", "Okta Identity Management", "CrowdStrike Falcon Platform", "GitHub Enterprise Cloud",
    "Snowflake Data Cloud", "MongoDB Atlas Global", "HashiCorp Cloud Platform", "Twilio Communications API", "Workday Human Capital",
    "HubSpot Inbound Marketing", "Zendesk Enterprise Support", "Atlassian Jira & Confluence", "Slack Technologies", "Zoom Video Communications",
    "Palo Alto Networks Cloud", "Splunk Cloud Services", "DocuSign Digital Signatures", "Vercel Frontend Platform", "Supabase Cloud Database",
    "Sentry Application Monitoring", "SendGrid Email Infrastructure", "Figma Design Collaboration", "Notion Workspace Enterprise", "Box Enterprise Cloud Content",
    "ServiceNow Enterprise ITSM", "Auth0 Identity as a Service", "Ping Identity Federation", "Zscaler Zero Trust Exchange", "New Relic Observability",
    "Elasticsearch Cloud Platform", "Redis Enterprise Cloud", "Fastly Edge Cloud Platform", "Wiz Cloud Security Platform", "Postman API Platform"
  ];

  for (let i = 0; i < vendorNames.length; i++) {
    const isOverdue = i < 25;
    const dueOffset = isOverdue ? -1 * (5 + (i % 25)) : (1 + (i % 6));
    await client.query(`
      INSERT INTO questionnaires (
        client_id, name, vendor_name, sender_name, status, progress, due_date
      )
      VALUES ($1, $2, $3, 'Vendor Risk Management Office', 'sent', $4, $5)
    `, [
      clientId,
      `Annual ${vendorNames[i]} SOC 2 & ISO 27001 Third-Party Security Review`,
      vendorNames[i],
      isOverdue ? (i % 30) : 0,
      isOverdue ? daysAgo(Math.abs(dueOffset)) : daysAhead(dueOffset)
    ]);
  }

  // 35 GDPR / CCPA Data Subject Access Requests (DSARs)
  const dsarSubjects = [
    { name: "Elena Rostova", email: "elena.rostova@berlin-tech.de", type: "Deletion", overdueDays: 4 },
    { name: "Marcus Vance", email: "marcus.vance@london-fintech.co.uk", type: "Access", overdueDays: 8 },
    { name: "Sophia Laurent", email: "sophia.laurent@paris-consulting.fr", type: "Portability", overdueDays: 2 },
    { name: "Lars Lindholm", email: "lars.lindholm@stockholm-saas.se", type: "Deletion", overdueDays: 6 },
    { name: "Matteo Rossi", email: "matteo.rossi@milan-design.it", type: "Rectification", overdueDays: 12 },
    { name: "Clara Schumann", email: "clara.schumann@munich-cloud.de", type: "Access", overdueDays: 1 },
    { name: "Jan de Vries", email: "jan.devries@amsterdam-ventures.nl", type: "Deletion", overdueDays: 5 },
    { name: "Isabella Silva", email: "isabella.silva@lisbon-startups.pt", type: "Access", overdueDays: 15 },
    { name: "Nikolai Ivanov", email: "nikolai.ivanov@prague-agency.cz", type: "Portability", overdueDays: 3 },
    { name: "Emma Watson", email: "emma.watson@manchester-retail.co.uk", type: "Deletion", overdueDays: 9 },
    { name: "Hans Gruber", email: "hans.gruber@vienna-logistics.at", type: "Access", overdueDays: 7 },
    { name: "Chloe Lefevre", email: "chloe.lefevre@lyon-biotech.fr", type: "Deletion", overdueDays: 11 },
    { name: "Finn O'Connor", email: "finn.oconnor@dublin-software.ie", type: "Access", overdueDays: 4 },
    { name: "Astrid Jensen", email: "astrid.jensen@copenhagen-data.dk", type: "Portability", overdueDays: 6 },
    { name: "Alejandro Gomez", email: "alejandro.gomez@madrid-media.es", type: "Deletion", overdueDays: 10 },
    // 20 requests approaching statutory deadline (1-3 days remaining)
    { name: "Oliver Smith", email: "oliver.smith@birmingham-eng.co.uk", type: "Access", dueInDays: 1 },
    { name: "Aria Montgomery", email: "aria.montgomery@boston-health.org", type: "Deletion", dueInDays: 2 },
    { name: "Liam Gallagher", email: "liam.gallagher@manchester-sound.co.uk", type: "Portability", dueInDays: 1 },
    { name: "Mia Tanaka", email: "mia.tanaka@tokyo-connect.jp", type: "Access", dueInDays: 3 },
    { name: "Noah Campbell", email: "noah.campbell@edinburgh-ai.scot", type: "Deletion", dueInDays: 2 },
    { name: "Zoe Kravitz", email: "zoe.kravitz@la-creative.com", type: "Access", dueInDays: 1 },
    { name: "Lucas Meyer", email: "lucas.meyer@zurich-quant.ch", type: "Rectification", dueInDays: 2 },
    { name: "Amara Patel", email: "amara.patel@mumbai-tech.in", type: "Deletion", dueInDays: 3 },
    { name: "Gabriel Dubois", email: "gabriel.dubois@geneva-law.ch", type: "Access", dueInDays: 1 },
    { name: "Hannah Abbott", email: "hannah.abbott@oxford-press.ac.uk", type: "Portability", dueInDays: 2 },
    { name: "David Kim", email: "david.kim@seoul-semicon.kr", type: "Deletion", dueInDays: 1 },
    { name: "Sven Nygard", email: "sven.nygard@oslo-energy.no", type: "Access", dueInDays: 3 },
    { name: "Fatima Al-Mansoor", email: "fatima.mansoor@dubai-fin.ae", type: "Deletion", dueInDays: 2 },
    { name: "Jack Taylor", email: "jack.taylor@sydney-cyber.au", type: "Access", dueInDays: 1 },
    { name: "Camila Fernandez", email: "camila.fernandez@buenosaires-dev.ar", type: "Portability", dueInDays: 2 },
    { name: "Ethan Hunt", email: "ethan.hunt@imf-secure.gov", type: "Deletion", dueInDays: 1 },
    { name: "Giselle Bundchen", email: "giselle.b@saopaulo-fashion.br", type: "Access", dueInDays: 3 },
    { name: "Klaus Schmidt", email: "klaus.schmidt@frankfurt-bank.de", type: "Deletion", dueInDays: 2 },
    { name: "Yuki Takahashi", email: "yuki.takahashi@kyoto-robotics.jp", type: "Access", dueInDays: 1 },
    { name: "Zara Phillips", email: "zara.phillips@bristol-marine.co.uk", type: "Rectification", dueInDays: 2 }
  ];

  for (let i = 0; i < dsarSubjects.length; i++) {
    const s = dsarSubjects[i];
    const isOverdue = s.overdueDays !== undefined;
    const targetDate = isOverdue ? daysAgo(s.overdueDays) : daysAhead(s.dueInDays);
    const requestDate = isOverdue ? daysAgo(30 + s.overdueDays) : daysAgo(28 - s.dueInDays);

    await client.query(`
      INSERT INTO dsar_requests (
        client_id, request_id, request_type, subject_name, subject_email,
        status, priority, due_date, request_date
      )
      VALUES ($1, $2, $3, $4, $5, 'In Progress', 'critical', $6, $7)
    `, [
      clientId,
      `DSAR-2026-${String(101 + i).padStart(3, '0')}`,
      s.type,
      s.name,
      s.email,
      targetDate,
      requestDate
    ]);
  }

  // 15 Vendor Contracts (Expired without auto-renewal or in critical 30-day notice window)
  const contractVendors = [
    { title: "Snowflake Enterprise Data Warehouse Master Agreement", vendorId: 135, expiredDays: 10 },
    { title: "Palo Alto Networks Prisma Cloud Security Contract", vendorId: 136, expiredDays: 25 },
    { title: "CrowdStrike OverWatch Threat Hunting Service Agreement", vendorId: 138, expiredDays: 5 },
    { title: "Salesforce CRM Premier Success Service Level Contract", vendorId: 142, expiredDays: 14 },
    { title: "Twilio Telecommunications Voice & SMS Aggregator Agreement", vendorId: 145, expiredDays: 18 },
    { title: "Cloudflare Enterprise Plan with Bot Management Addon", vendorId: 140, noticeDays: 15 },
    { title: "Datadog Infrastructure Monitoring & APM Pro License", vendorId: 141, noticeDays: 20 },
    { title: "Okta Identity Cloud Workforce Enterprise Tier Contract", vendorId: 137, noticeDays: 10 },
    { title: "GitHub Enterprise Cloud Seats & Copilot Business Agreement", vendorId: 139, noticeDays: 28 },
    { title: "HubSpot Marketing Hub Enterprise Subscription", vendorId: 143, noticeDays: 12 },
    { title: "Microsoft 365 E5 Security & Compliance Addon Agreement", vendorId: 135, expiredDays: 30 },
    { title: "Google Workspace Enterprise Standard Cloud Agreement", vendorId: 136, noticeDays: 18 },
    { title: "Intuit QuickBooks Online Advanced Payroll SLA", vendorId: 144, expiredDays: 8 },
    { title: "AWS Reserved Instance & Savings Plan Enterprise Addendum", vendorId: 135, noticeDays: 5 },
    { title: "Fastly High-Volume Edge CDN Delivery Agreement", vendorId: 140, expiredDays: 12 }
  ];

  const vRows = await client.query('SELECT id FROM vendors WHERE client_id = $1', [clientId]);
  const availableVendorIds = vRows.rows.map(r => r.id);
  const fallbackVendorId = availableVendorIds[0] || 135;

  for (let i = 0; i < contractVendors.length; i++) {
    const c = contractVendors[i];
    const vendorId = availableVendorIds[i % availableVendorIds.length] || fallbackVendorId;
    const isExpired = c.expiredDays !== undefined;
    const endDate = isExpired ? daysAgo(c.expiredDays) : daysAhead(c.noticeDays);
    await client.query(`
      INSERT INTO vendor_contracts (
        client_id, vendor_id, title, description, start_date, end_date, auto_renew,
        status, notice_period, value, owner
      )
      VALUES ($1, $2, $3, 'Enterprise vendor contractual master agreement with strict notice and SLA terms.', $4, $5, false, $6, '30 days', '$120,000/yr', 'Procurement Office')
    `, [
      clientId,
      vendorId,
      c.title,
      daysAgo(365),
      endDate,
      isExpired ? 'expired' : 'active'
    ]);
  }

  // 10 Active Incidents Breaching NIS2 24h Early Warning or 72h Notification Deadlines
  const nis2Incidents = [
    { title: "Unauthorized Production Database Replica Data Transfer", hours: 34, sig: true },
    { title: "Ransomware Execution on Secondary Backup Server Node", hours: 48, sig: true },
    { title: "Suspected Compromise of Master CI/CD Deployment Token", hours: 26, sig: true },
    { title: "Credential Stuffing Spike Against Corporate VPN Concentrator", hours: 78, sig: true },
    { title: "Cross-Site Scripting Injection Exploited on Checkout Service", hours: 30, sig: true },
    { title: "Unidentified Foreign IP Accessing Production Cloud Key Vault", hours: 25, sig: true },
    { title: "Internal Phishing Campaign with 14 Confirmed Credential Submissions", hours: 80, sig: true },
    { title: "Distributed Denial of Service Exhausting API Gateway CPU Quotas", hours: 28, sig: true },
    { title: "Loss of Encrypted Backup Hard Drive During Datacenter Transit", hours: 42, sig: true },
    { title: "Suspected Supply Chain Malware in Upstream Container Base Image", hours: 31, sig: true }
  ];

  for (let i = 0; i < nis2Incidents.length; i++) {
    const inc = nis2Incidents[i];
    await client.query(`
      INSERT INTO incidents (
        client_id, title, description, status, severity,
        is_significant, detected_at, early_warning_sent_at
      )
      VALUES ($1, $2, 'Confirmed significant security event meeting NIS2 Article 23 criteria.', 'investigating', 'critical', $3, $4, NULL)
    `, [
      clientId,
      inc.title,
      inc.sig,
      hoursAgo(inc.hours)
    ]);
  }
  console.log(`[massive-seed] ✅ Seeded 40 Questionnaires, 35 DSARs, 15 Contracts, 10 Incidents (100 Total).`);

  // =========================================================================
  // 5. EVIDENCE RECORDS & CONTROLS (~100 items)
  // =========================================================================
  console.log('[massive-seed] Generating 100 Evidence Items across controls...');
  const ccRows = await client.query('SELECT id FROM client_controls WHERE client_id = $1 LIMIT 100', [clientId]);
  const controlIds = ccRows.rows.map(r => r.id);

  const evidenceRecords = [
    // 45 Expiring Evidence Items (expires in 1 to 28 days)
    ...[
      "Annual External Web Application & API Penetration Test Report", "SOC 2 Type II Independent Auditor Attestation Report",
      "ISO 27001 Surveillance Audit Statement of Applicability Signoff", "Quarterly Privileged User Access Review Certification",
      "Semi-Annual Firewall Rulebase and NAT Configuration Audit", "Quarterly Disaster Recovery Failover Test Execution Log",
      "Annual Information Security Awareness Employee Completion Roster", "Cloud KMS Master Encryption Key Annual Rotation Certificate",
      "PCI DSS v4.0 Attestation of Compliance (AoC) Certificate", "External Vulnerability Scanning ASV Clean Scan Attestation",
      "Third-Party Cloud Vendor DPA and Standard Contractual Clauses Review", "Annual Incident Response Simulation Tabletop Drill Minutes",
      "Quarterly Database Backup Restoration and Integrity Verification", "Static Application Security Testing (SAST) Clean Baseline Audit",
      "Annual Physical Datacenter Badge Access and Visitor Log Audit", "Mobile Device Management (MDM) Compliance and Encryption Audit",
      "Employee Background Check and Sanctions Screening Certificate", "Enterprise Password Vault Master Key Custody Signoff",
      "Software Bill of Materials (SBOM) Component Dependency Audit", "Business Impact Analysis (BIA) Annual Executive Approval",
      "Annual Data Protection Impact Assessment (DPIA) on Customer AI", "Clean Desk Policy Physical Office Spot-Check Inspection Audit",
      "Serverless Function Dependency Vulnerability Scan Attestation", "Container Base Image Hardening and CIS Benchmark Scan Log",
      "Anti-Malware Real-Time Definition Update Verification Report", "External DNS Zone Transfer and SPF/DKIM/DMARC Security Record",
      "Corporate Insurance Cyber Liability Policy Renewal Schedule", "Cryptographic Hardware Security Module (HSM) Health Attestation",
      "Employee Security Code of Conduct Annual Re-acknowledgment Log", "AWS Well-Architected Security Pillar Review Findings",
      "Quarterly SaaS Shadow IT Discovery and Authorization Audit", "Database Transparent Data Encryption (TDE) Certificate",
      "Zero Trust Network Access (ZTNA) Device Posture Verification Log", "Security Operations Center (SOC) 24/7 SLA Performance Metric",
      "External Threat Intelligence Feed Integration Validation Report", "Cloud Infrastructure As Code (IaC) Drift Detection Log",
      "Single Sign-On (SSO) Protocol SAML Certificate Renewal Proof", "Annual Customer Data Retention and Purge Verification Audit",
      "Supply Chain Vendor Security Scorecard Re-assessment Review", "Executive Incident Escalation Call Tree Annual Test Verification",
      "Kubernetes Cluster CIS Benchmark Compliance Audit Report", "Biometric Authentication Template Encryption Security Proof",
      "Third-Party Sub-processor List Regulatory Publication Proof", "Production Database Query Audit Logging Integrity Proof",
      "Emergency Operations Center Secondary Communications Drill Log"
    ].map((desc, i) => ({
      desc,
      status: "verified",
      expirationDate: daysAhead(1 + (i % 28)),
      framework: i % 2 === 0 ? "ISO 27001" : "SOC 2"
    })),

    // 45 EXPIRED Evidence Items (expired 2 to 75 days ago)
    ...[
      "Annual Multi-Region Cloud Disaster Recovery Tabletop Drill Report", "Quarterly Active Directory Terminated User Access Deprovisioning Log",
      "Bi-Annual Network Penetration Test and Lateral Movement Assessment", "Annual Customer Data Encryption at Rest Cryptographic Verification",
      "Third-Party Vendor Risk Re-assessment for Critical Cloud Host", "Quarterly Production Database User Permission Matrix Audit",
      "Annual Emergency Power Generator Load Bank Test Report", "Quarterly Physical Datacenter CCTV Footage Retention Verification",
      "Bi-Annual Wireless Network Rogue AP Sweep and WPA3 Enterprise Audit", "Quarterly Customer Support Representative Security Protocol Audit",
      "Annual Source Code Repository Branch Protection Enforcement Proof", "Semi-Annual Clean Workspace and Hardware Locking Inspection",
      "Quarterly Cloud Security Group Inbound Port 22/3389 Lockdown Audit", "Annual Cryptographic Protocol TLS 1.2+ Deprecation Verification",
      "Quarterly Employee Phishing Simulation Campaign Metrics Report", "Annual Security Governance Board Charter Re-authorization Signoff",
      "Quarterly Software Patching SLA Metric Compliance Verification Log", "Semi-Annual Cloud Storage Object Versioning and Lifecycle Audit",
      "Annual Executive Cryptographic Key Custody Agreement Signature", "Quarterly Microservices mTLS Certificate Expiration Audit",
      "Annual Data Classification Mapping and Inventory Attestation", "Quarterly Redundant Internet ISP Circuit Failover Verification",
      "Semi-Annual Privileged Jumpbox MFA Session Audit Log", "Annual Supplier DPA Signatures and Sub-processor Consent Audit",
      "Quarterly Open Source License and Security Vulnerability Scan", "Annual Fire Suppression System Inspection and Certification",
      "Semi-Annual Mobile App Binary Obfuscation and Tamper Test", "Quarterly Incident Ticket Root Cause Analysis Review Roster",
      "Annual External Code Review of Payment Gateway Integration", "Quarterly Production Container Base Image Freshness Audit",
      "Semi-Annual Cloud IAM Inactive Access Key Revocation Report", "Annual Customer Confidentiality and Data Handling Signoff",
      "Quarterly Internal Vulnerability Remediation Ticket SLA Audit", "Semi-Annual Disaster Recovery Secondary Site Data Sync Log",
      "Annual Cyber Incident Breach Insurance Compliance Certificate", "Quarterly Threat Model Review for High-Risk Microservices",
      "Semi-Annual Security Awareness Training Completion Compliance Audit", "Annual Hardware Asset Disposal and Certificate of Destruction Log",
      "Quarterly Network Intrusion Detection System (NIDS) Signature Log", "Semi-Annual Database Transparent Encryption Key Rotation Log",
      "Annual SOC 2 Type II System Description and Control Matrix Signoff", "Quarterly Third-Party SDK Privacy and Telemetry Inspection",
      "Semi-Annual Corporate Laptop Disk Encryption Enforcement Audit", "Annual Disaster Recovery Communications Satellite Phone Drill",
      "Quarterly Production Application Log Redaction of Sensitive PII Audit"
    ].map((desc, i) => ({
      desc,
      status: "verified",
      expirationDate: daysAgo(2 + (i % 60)),
      framework: i % 2 === 0 ? "ISO 27001" : "SOC 2"
    })),

    // 10 Active/Valid Evidence Items
    ...[
      "Clean Network Architecture Diagram with DMZ and Ingress Zones", "Approved Business Continuity Plan Executive Charter v4.0",
      "CISO Appointment and Governance Responsibility Letter", "Corporate Information Security Policy Hierarchy Document",
      "Approved Data Protection Officer (DPO) Statutory Registration Proof", "ISO 27001:2022 Stage 1 Certification Audit Report",
      "AICPA SOC 2 Type II Audit Engagement Letter and Scope Document", "Cybersecurity Incident Response Retainer Master Services Agreement",
      "Enterprise Cloud Service Provider BAA (Business Associate Agreement)", "Official Regulatory DPA Registration with European Supervisory Authority"
    ].map((desc, i) => ({
      desc,
      status: "verified",
      expirationDate: daysAhead(180 + i * 15),
      framework: "ISO 27001"
    }))
  ];

  for (let i = 0; i < evidenceRecords.length; i++) {
    const e = evidenceRecords[i];
    const ctrlId = controlIds[i % controlIds.length];
    await client.query(`
      INSERT INTO evidence (
        client_id, client_control_id, evidence_id, description,
        framework, status, expiration_date, owner
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Compliance Lead')
    `, [
      clientId,
      ctrlId,
      `EVID-MASSIVE-${String(i + 1).padStart(3, '0')}`,
      e.desc,
      e.framework,
      e.status,
      e.expirationDate
    ]);
  }
  console.log(`[massive-seed] ✅ Seeded ${evidenceRecords.length} Evidence Records.`);

  // =========================================================================
  // 6. BUSINESS CONTINUITY PLANS (~20 items)
  // =========================================================================
  console.log('[massive-seed] Generating 20 Business Continuity & Disaster Recovery Plans...');
  const bcPlanTitles = [
    "Global Production Cloud Infrastructure & Payment Gateway BCP", "Core Customer Invoicing and Subscription Billing DRP",
    "Customer Support Center Voice and Ticket Routing BCP", "Corporate Email, Slack & Enterprise Identity Recovery Plan",
    "Production Database Multi-Region Failover and Data Recovery Plan", "Employee Remote Work & Secondary Communications Continuity Plan",
    "Supply Chain Hardware Logistics & Procurement Disruption Plan", "Critical Third-Party SaaS Outage & Vendor Fallback Procedure",
    "Executive Leadership Succession and Emergency Crisis Operations Plan", "Datacenter Physical Destruction & Complete Cloud Migration DRP",
    "Cyber Extortion and Total Infrastructure Rebuild Recovery Plan", "Healthcare Client Protected Health Information (PHI) Safe Recovery Plan",
    "Real-Time Fraud Detection Engine Standby Failover Plan", "Public Relations and Regulatory Communication Crisis Plan",
    "Mobile Application API Redirection and Standby Ingress Plan", "Enterprise Single Sign-On (IdP) Offline Emergency Access Plan",
    "Internal Git Repository & Artifact Storage Disaster Recovery Plan", "DNS Provider Total Blackout & Secondary Anycast Failover Plan",
    "Cloud Storage Ransomware Corruption Restore & Rollback Plan", "Hardware Token Authentication Emergency Fallback Plan"
  ];

  for (let i = 0; i < bcPlanTitles.length; i++) {
    await client.query(`
      INSERT INTO bc_plans (
        client_id, title, version, status, next_test_date, last_tested_date, content
      )
      VALUES ($1, $2, '2.1', 'active', $3, NULL, 'Standard operating procedures for disaster recovery.')
    `, [
      clientId,
      bcPlanTitles[i],
      daysAgo(15 + i * 5) // Overdue test date by 15 to 110 days, never tested
    ]);
  }
  console.log(`[massive-seed] ✅ Seeded ${bcPlanTitles.length} Business Continuity Plans.`);

  console.log('\n=============================================================');
  console.log('[massive-seed] 🎉 FULL ENTERPRISE DATASET (100+ PER CATEGORY) SEEDED!');
  console.log('=============================================================\n');

  await client.end();
}

seedMassive().catch((err) => {
  console.error('[massive-seed] Error seeding massive dataset:', err);
  process.exit(1);
});
