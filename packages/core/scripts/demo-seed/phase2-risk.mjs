/**
 * Phase 2: Assets (100+), vulnerability scan findings, threat catalog,
 * risk register (risk_scenarios), risk assessments, treatment plans.
 */
import { Rng, bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";

const ASSET_CATALOG = {
  nordwind: [
    // [name, type, category, criticality, location, description, isPD]
    ["CargoTrack TMS Production", "Application", "Business Applications", "Very High", "AWS eu-central-1", "Core transport management platform — order intake, dispatch, route optimization, POD. Revenue-critical.", true],
    ["CargoTrack TMS Staging", "Application", "Business Applications", "Medium", "AWS eu-central-1", "Pre-production environment for CargoTrack releases and UAT.", false],
    ["CargoTrack API Gateway", "Service", "Infrastructure", "Very High", "AWS eu-central-1", "Kong API gateway fronting all CargoTrack microservices; TLS termination, rate limiting.", true],
    ["Customer Portal (React)", "Application", "Business Applications", "High", "Vercel EU", "Self-service portal for 400+ retail customers: bookings, tracking, invoices.", true],
    ["Driver Mobile App Backend", "Service", "Business Applications", "High", "AWS eu-central-1", "Backend for Android/iOS driver app: job updates, ePOD signatures, GPS telemetry.", true],
    ["SAP S/4HANA Finance", "Application", "Business Applications", "Very High", "On-prem Munich DC-1", "Financial accounting, controlling, vendor management. On-prem VM cluster.", true],
    ["Datev Payroll Interface", "Application", "Business Applications", "High", "On-prem Munich DC-1", "Nightly payroll data exchange with Datev Lohn & Gehalt.", true],
    ["Exchange Online Tenant", "Service", "End-User Computing", "Very High", "Microsoft 365 (EU data boundary)", "Corporate email and calendar for all 250 staff.", true],
    ["SharePoint Online Intranet", "Service", "End-User Computing", "Medium", "Microsoft 365 (EU)", "Policies, HR documents, department sites.", true],
    ["MS Teams Telephony", "Service", "End-User Computing", "Medium", "Microsoft 365", "Softphone and conferencing platform.", false],
    ["Active Directory (on-prem)", "Directory", "Identity & Access", "Very High", "Munich DC-1", "Authoritative on-prem directory; synced to Entra ID via AD Connect.", true],
    ["Entra ID Tenant", "Directory", "Identity & Access", "Very High", "Microsoft Entra (EU)", "Cloud identity, SSO, MFA/conditional access policies.", true],
    ["Okta Workforce (pilot)", "Directory", "Identity & Access", "Low", "Okta EU cells", "Pilot for warehouse handheld SSO.", false],
    ["Munich DC-1 ESXi Cluster", "Infrastructure", "Data Center", "Very High", "Munich HQ DC-1", "6-node vSphere cluster hosting finance, AD, file services.", false],
    ["Hamburg DC-2 ESXi Cluster", "Infrastructure", "Data Center", "High", "Hamburg cross-dock", "3-node cluster; DR target for DC-1 tier-1 VMs.", false],
    ["FortiGate FG-600 Firewall Pair", "Network", "Network Security", "Very High", "Munich DC-1", "HA firewall pair; north-south inspection, IPsec tunnels to AWS.", false],
    ["Cisco Catalyst Core Switches", "Network", "Network Infrastructure", "High", "Munich DC-1", "Core/distribution switching, 10G uplinks.", false],
    ["Warehouse Wi-Fi (Rotterdam)", "Network", "Network Infrastructure", "Medium", "Rotterdam site", "Aruba Wi-Fi 6 for handheld scanners and printers.", false],
    ["Zabbix Monitoring", "Service", "IT Operations", "Medium", "Munich DC-1", "Infrastructure and service monitoring, alerting to on-call.", false],
    ["Veeam Backup Infrastructure", "Service", "IT Operations", "Very High", "Munich DC-1 + Wasabi EU", "Backup of all virtualized workloads; 3-2-1 with immutable copies.", false],
    ["Jira + Confluence (DC)", "Application", "Software Development", "Medium", "Munich DC-1", "Engineering ticketing and documentation (data-center edition).", true],
    ["GitLab Self-Managed", "Service", "Software Development", "High", "Munich DC-1", "Source control, CI/CD runners, container registry.", true],
    ["SonarQube", "Service", "Software Development", "Low", "Munich DC-1", "Static code analysis in CI pipeline.", false],
    ["HashiCorp Vault", "Service", "Security Tooling", "Very High", "Munich DC-1", "Secrets management for CI/CD and production services.", false],
    ["CrowdStrike Falcon Fleet", "Endpoint Security", "Security Tooling", "Very High", "All endpoints", "EDR agent on ~380 endpoints and servers.", false],
    ["Employee Windows Laptops", "Endpoint", "End-User Computing", "High", "Fleet (Intune managed)", "~300 managed laptops with BitLocker, Defender, Intune compliance.", true],
    ["Warehouse Handheld Scanners", "Endpoint", "Operational Technology", "Medium", "All warehouses", "Zebra scanners running locked-down Android; inventory and ePOD.", false],
    ["Fleet Telematics Platform", "Service", "Operational Technology", "High", "Vendor SaaS (Webfleet EU)", "GPS tracking, driver behavior, tachograph data for 140 trucks.", true],
    ["Tachograph Analysis System", "Application", "Operational Technology", "Medium", "Vendor SaaS", "EU driving-time compliance analysis (idha.online).", true],
    ["WMS Warehouse Management", "Application", "Business Applications", "Very High", "Munich DC-1", "In-house warehouse management: goods receipt, picking, packing, inventory.", true],
    ["EDI Gateway (Seeburger)", "Service", "Integration", "High", "Munich DC-1", "B2B EDI exchange with retail customers (EDIFACT/X12).", true],
    ["Power BI Reports Workspace", "Service", "Analytics", "Medium", "Microsoft 365 (EU)", "Management KPIs, ops dashboards; embedded gateway to SAP.", true],
    ["HR Works Personnel File", "Application", "Business Applications", "High", "Vendor SaaS (DE)", "Digital personnel files, absences, master data.", true],
    ["Recruiting ATS (Personio)", "Application", "Business Applications", "Medium", "Vendor SaaS (DE)", "Applicant tracking, onboarding workflows.", true],
    ["Nordwind Website + CMS", "Application", "Public Web", "Low", "Hosted EU", "Marketing website with quote request form.", false],
    ["Zendesk Support Desk", "Service", "Business Applications", "Medium", "Zendesk EU instance", "Customer support tickets for portal users.", true],
    ["Print Server + MFPs", "Infrastructure", "End-User Computing", "Low", "Munich HQ", "Follow-me printing with badge release.", true],
    ["CCTV / Video Surveillance", "OT", "Physical Security", "Medium", "All warehouses", "Camera systems at dock doors and yards; retention 30 days.", true],
    ["Access Control System (DOM)", "OT", "Physical Security", "High", "All sites", "Badge access to offices, warehouses, server rooms.", false],
    ["UPS + Generator Munich DC-1", "Facilities", "Data Center", "High", "Munich DC-1", "Power protection for core infrastructure.", false],
    ["Customer Master Data DB", "Database", "Databases", "Very High", "AWS RDS PostgreSQL", "Customer contracts, contacts, billing addresses. GDPR-relevant.", true],
    ["CargoTrack Order DB", "Database", "Databases", "Very High", "AWS Aurora PostgreSQL", "Orders, shipments, events; PII of consignees.", true],
    ["Telemetry Timeseries DB", "Database", "Databases", "High", "AWS Timestream", "Vehicle GPS and sensor telemetry.", false],
    ["Analytics Data Lake", "Database", "Databases", "Medium", "AWS S3 + Athena", "Curated analytics zone fed by operational systems.", true],
    ["Backup Object Storage", "Storage", "Storage", "Very High", "Wasabi eu-central", "Immutable Veeam backup repository.", false],
    ["File Services (DFS)", "Storage", "Storage", "High", "Munich DC-1", "Legacy file shares; being migrated to SharePoint.", true],
  ],
  apex: [
    ["ApexCloud Gov Platform", "Application", "Production CSP", "Very High", "AWS GovCloud us-gov-east-1", "FedRAMP Moderate in-scope IaaS/PaaS offering: identity, log analytics, secure file exchange for 14 agencies.", true],
    ["ApexCloud Control Plane", "Service", "Production CSP", "Very High", "AWS GovCloud us-gov-east-1", "Orchestration, tenant provisioning, CMDB.", true],
    ["ApexCloud Logging Pipeline", "Service", "Production CSP", "Very High", "AWS GovCloud", "Centralized audit log ingestion (CloudTrail, VPC FL, app logs) — 7yr retention for federal customers.", true],
    ["Agency Identity Bridge", "Service", "Identity & Access", "Very High", "AWS GovCloud", "SAML/OIDC federation between agency IdPs and ApexCloud; PIV/CAC support.", true],
    ["Secure File Exchange (SFE)", "Application", "Production CSP", "Very High", "AWS GovCloud", "FISMA Moderate file transfer with ATO boundaries; CUI in transit/at rest.", true],
    ["CUI Enclave Network Segment", "Infrastructure", "Boundary Defense", "Very High", "Arlington HQ + GovCloud", "Segregated enclave per DFARS 7012; dedicated AD forest, no internet egress.", true],
    ["Corporate IT Network", "Network", "Corporate", "Medium", "Arlington HQ", "Corporate LAN/WLAN — outside CUI enclave scope but ESP-controlled.", false],
    ["Corporate Active Directory", "Directory", "Identity & Access", "High", "Arlington HQ", "Corporate domain; trust to enclave forest denied by design.", false],
    ["Azure AD Corporate Tenant", "Directory", "Identity & Access", "High", "Microsoft 365 GCC", "Email (GCC High adjacent), productivity for corporate staff.", false],
    ["Jira + Confluence Cloud (Gov)", "Service", "Collaboration", "Medium", "Atlassian Government Cloud", "Program management docs and tickets for federal programs.", true],
    ["GitLab Dedicated (GovCloud)", "Service", "Software Development", "High", "AWS GovCloud", "Source control and CI/CD for platform code; signed commits required.", true],
    ["Nessus Professional Scanner", "Endpoint Security", "Assessment", "High", "Arlington HQ", "Authenticated scans of enclave and corporate assets monthly.", false],
    ["Splunk Enterprise Security", "Service", "SOC Tooling", "Very High", "AWS GovCloud", "SIEM for enclave; 24x7 monitored by cleared analysts.", true],
    ["Tanium Endpoint Platform", "Endpoint Security", "Endpoint Management", "High", "GovCloud + corporate", "Asset discovery, patch enforcement, endpoint queries.", false],
    ["Cleared Analyst Workstations", "Endpoint", "Endpoints", "High", "SCIF, Arlington", "30 analyst workstations handling CUI; smart-card enforced.", true],
    ["Developer Workstations", "Endpoint", "Endpoints", "Medium", "Corporate", "60 developer laptops; enclave access via VDI only.", false],
    ["Enclave VDI Farm", "Infrastructure", "Virtualization", "Very High", "AWS GovCloud", "Horizon VDI — the ONLY path from corporate into the CUI enclave.", true],
    ["PKI / Certificate Services", "Service", "Cryptography", "Very High", "Enclave, FIPS 140-2 HSM", "Internal CA for enclave TLS and code signing; DoD ECA bridge.", false],
    ["Key Management (KMS) - FedRAMP", "Service", "Cryptography", "Very High", "AWS GovCloud", "CMKs for all enclave data stores; annual rotation.", false],
    ["Backup & Archival (SFE)", "Storage", "Resilience", "High", "AWS GovCloud + tape vault", "Immutable backups for federal customer data; off-site tape rotation.", true],
    ["Disaster Recovery Site", "Facilities", "Resilience", "High", "Ashburn colo", "Warm DR for control plane; quarterly failover test.", false],
    ["Visitor Management System", "OT", "Physical Security", "Medium", "Arlington HQ", "Badge issuance, escort logging, visitor NDA capture.", false],
    ["SCIF Access Control", "OT", "Physical Security", "Very High", "SCIF, Arlington", "Two-person rule badge + PIN; ICD 705 compliant.", true],
    ["HRIS (Workday Gov)", "Application", "Corporate Apps", "High", "Workday US", "Personnel security: clearance status, Form SF-86 tracking, terminations.", true],
    ["Contracts & Billing (Deltek)", "Application", "Corporate Apps", "High", "Deltek Costpoint", "Federal contract billing, CLIN tracking, DFARS clause library.", true],
    ["Timesheet System (deltek T&E)", "Application", "Corporate Apps", "Medium", "Deltek", "DCAA-compliant timekeeping.", false],
    ["Training LMS (Skillsoft)", "Service", "GRC", "Medium", "Skillsoft US", "Annual security awareness + role-based cleared training records.", true],
    ["Policy Library (SharePoint GCC)", "Service", "GRC", "Medium", "GCC tenant", "Master SSP, POA&M working copies, procedure documents.", true],
    ["Vulnerability Remediation Tracker", "Service", "GRC", "High", "Corporate Jira", "Tracks POA&M items and IAV remediation SLAs.", false],
    ["Threat Intel Feeds (CISA/DoD)", "Service", "SOC Tooling", "High", "Splunk integrations", "CISA Known Exploited Vulns, IAV feeds, ACAS data import.", false],
  ],
};

const VULN_TEMPLATES = [
  ["CVE-2024-21762", "FortiOS Out-of-Bounds Write", "critical", 9.8, "Fortinet FortiOS SSL VPN heap overflow allowing remote code execution. Actively exploited in the wild."],
  ["CVE-2023-48795", "Terrapin SSH Prefix Truncation", "medium", 5.9, "SSH protocol downgrade enabling integrity attack against BPP-based connections."],
  ["CVE-2024-3400", "PAN-OS GlobalProtect Command Injection", "critical", 10.0, "Unauthenticated arbitrary file write leading to root RCE on PAN-OS firewalls."],
  ["CVE-2023-44487", "HTTP/2 Rapid Reset DDoS", "high", 7.5, "Protocol-level DoS via crafted stream resets overwhelming server resources."],
  ["CVE-2024-6387", "regreSSHion OpenSSH RCE", "high", 8.1, "Race condition in OpenSSH signal handler permitting unauthenticated RCE on glibc Linux."],
  ["CVE-2023-4966", "Citrix Bleed Token Leak", "critical", 9.4, "Session token memory leak bypassing MFA on NetScaler ADC."],
  ["CVE-2024-21413", " Outlook Moniker Link RCE", "high", 9.8, "Crafted URLs bypassing Protected View to execute code via Outlook preview."],
  ["CVE-2025-24813", "Tomcat Partial PUT Deserialization", "critical", 9.8, "Path equivalence flaw enabling remote code execution via session persistence uploads."],
  ["CVE-2024-27198", "JetBrains TeamCity Auth Bypass", "critical", 9.8, "Authentication bypass permitting full administrative takeover of CI servers."],
  ["CVE-2023-34362", "MOVEit Transfer SQL Injection", "critical", 9.8, "SQLi leading to RCE and mass data exfiltration; widely exploited by FIN11."],
  ["CVE-2024-4577", "PHP CGI Argument Injection", "critical", 9.8, "Windows-only CGI argument injection enabling unauthenticated RCE."],
  ["SMBv1 Legacy Protocol Enabled", null, "high", 7.5, "Deprecated SMBv1 protocol detected; enables EternalBlue-class exploitation and NTLM relay."],
  ["TLS 1.0/1.1 Still Accepted", null, "low", 3.7, "Legacy TLS versions accepted on a public listener; violates baseline crypto policy."],
  ["Default SNMP Community Strings", null, "medium", 5.3, "Devices respond to 'public' community string exposing configuration details."],
  ["Outdated WordPress Plugins (multiple)", null, "medium", 6.1, "Several plugins >90 days behind with known XSS vulnerabilities on marketing site."],
  ["Unpatched Java Runtime (17.0.x < latest)", null, "medium", 6.5, "Multiple CVEs fixed in current LTS build; application owner has not scheduled restart window."],
];

const THREAT_CATALOG = {
  nordwind: [
    ["Ransomware & Double Extortion", "Cyber Crime", "Encryption of WMS/CargoTrack plus exfiltration of customer data with leak-site publication threat.", 4, 5],
    ["Phishing-driven Credential Theft", "Cyber Crime", "Spear-phishing against operations staff harvesting O365 credentials; MFA fatigue push attacks.", 4, 4],
    ["Supply Chain Compromise (SaaS)", "Supply Chain", "Compromise of a logistics SaaS provider (telematics, EDI) cascading into our estate.", 3, 4],
    ["Insider Data Exfiltration", "Insider Threat", "Departing employee exporting customer master data or pricing before leaving.", 2, 4],
    ["DDoS on Customer Portal", "Cyber Crime", "Volumetric or application-layer attack during peak fulfilment season.", 3, 3],
    ["Ransomware on OT / Warehouse Systems", "Cyber Crime", "Lateral movement from IT into warehouse scanner network halting shipping.", 2, 5],
    ["GDPR Personal Data Breach", "Compliance", "Accidental exposure or unlawful processing of consignee personal data triggering Art. 33 notification.", 3, 4],
    ["Cloud Misconfiguration Exposure", "Operational", "Public S3 bucket or permissive security group exposing order data.", 3, 4],
    ["Third-party Logistics Partner Breach", "Supply Chain", "Subcontractor forwarding partner compromised, affecting shared shipment data.", 3, 3],
    ["Business Email Compromise", "Cyber Crime", "Invoice fraud via spoofed supplier communications targeting finance team.", 4, 3],
    ["Physical Intrusion at Warehouse", "Physical", "Unauthorized after-hours access to high-value goods storage areas.", 2, 3],
    ["Ransomware via Remote Access", "Cyber Crime", "Compromise of vendor remote-support tunnels into DC-1.", 2, 5],
  ],
  apex: [
    ["Nation-State APT Targeting Cleared Contractors", "Nation State", "APT29/FTO-aligned intrusion targeting federal contractor networks for CUI collection.", 3, 5],
    ["CUI Spillage via Email Misdelivery", "Human Error", "CUI sent over non-enclave email channels violating DFARS handling rules.", 3, 4],
    ["Supply Chain Compromise of Build Pipeline", "Supply Chain", "Malicious dependency or compromised runner injecting backdoor into shipped platform code.", 2, 5],
    ["PIV Credential Theft / Cloning", "Insider Threat", "Stolen smart card used within enclave access windows.", 2, 5],
    ["Insider Unauthorized Disclosure", "Insider Threat", "Cleared employee exfiltrating controlled data for external actor.", 2, 5],
    ["Ransomware on Corporate Network", "Cyber Crime", "Corporate-side ransomware disrupting contract delivery timelines.", 4, 3],
    ["Zero-day in Edge Appliance", "Technical", "Exploitation of internet-facing VPN/web appliance pre-patch.", 3, 4],
    ["Foreign Ownership/Nexus Supply Risk", "Compliance", "Covered article/service from restricted entity entering supply chain (Section 889).", 2, 4],
    ["Cloud Misconfiguration in GovCloud", "Operational", "Overly permissive IAM policy or public S3 within authorization boundary.", 2, 4],
    ["Denial of Service Against SFE", "Cyber Crime", "Availability attack on Secure File Exchange degrading agency mission.", 2, 3],
    ["Loss of Facility Clearance Key Personnel", "Business", "Attrition of cleared staff jeopardizing program staffing minimums.", 3, 2],
    ["Audit Finding Escalation (CMMC)", "Compliance", "Failed CMMC assessment blocking new DoS awards.", 2, 4],
  ],
};

const RISK_LIBRARY = [
  // [title, description, threatCategory, vulnText, cat(1-5), imp(1-5), privacyImpact, csfFunction]
  ["Ransomware encryption of {sys}", "Successful ransomware deployment encrypting {sys} would halt {op} operations for an estimated 3-7 days. Recovery depends on backup restoration SLAs; double-extortion adds regulatory notification burden under GDPR Art. 33 / contractual breach clauses.", "Cyber Crime", "EDR coverage gaps on legacy servers; flat backup network segment", 3, 5, false, "respond"],
  ["Credential theft against {dept} staff", "Phishing campaign harvesting credentials of {dept} personnel could grant initial access to {sys}. MFA coverage is high but not universal (service accounts, legacy protocols).", "Cyber Crime", "Partial phishing-resistant MFA; SMTP legacy auth exceptions", 4, 4, true, "identify"],
  ["Data exposure via cloud misconfiguration", "Misconfigured object storage or overly permissive IAM roles could expose customer personal data publicly. Continuous posture scanning covers primary accounts only.", "Operational", "No continuous CSPM on secondary cloud account", 3, 4, true, "identify"],
  ["Supply chain compromise via {vendor}", "A compromise of {vendor} could provide a trusted update channel into our environment. Vendor SBOM transparency and attestation are not yet contractual requirements.", "Supply Chain", "No SBOM requirement in vendor contracts", 2, 5, false, "supply_chain"],
  ["Insider exfiltration of customer data", "A departing insider could bulk-export customer or pricing data. Egress monitoring exists but DLP policies are in tuning phase.", "Insider Threat", "DLP policy coverage incomplete for cloud drives", 2, 4, true, "protect"],
  ["DDoS degradation of public-facing services", "Volumetric attack on public endpoints during peak period would degrade availability and customer trust. Mitigation relies on upstream scrubbing with manual activation.", "Cyber Crime", "Manual DDoS mitigation activation; no always-on scrubbing", 3, 3, false, "respond"],
  ["Regulatory breach: late breach notification", "Failure to detect and report a personal data breach within 72h would trigger supervisory authority fines and reputational damage. Detection-to-triage time currently averages 40h.", "Compliance", "Mean detection time exceeds 72h window budget", 2, 5, true, "govern"],
  ["Physical intrusion into server facilities", "Unauthorized physical access to hosting facilities could enable hardware tampering or theft. Badge system logs are reviewed weekly, not continuously.", "Physical", "Weekly (not continuous) access log review", 2, 4, false, "protect"],
  ["Single point of failure in core infrastructure", "Loss of {sys} without functioning failover would cause extended outage. DR runbook exists but last full-failover test is >12 months old.", "Operational", "DR test overdue; runbook stale", 2, 4, false, "recover"],
  ["Business email compromise / invoice fraud", "Spoofed supplier emails could redirect payments. Verification procedures are documented but adoption is uneven in peak periods.", "Cyber Crime", "Uneven adherence to payment verification SOP", 4, 3, false, "detect"],
  ["Vulnerability exploitation on internet-facing assets", "Unpatched critical vulnerability on edge systems could be exploited before the next patch cycle completes (14-day SLA vs. active exploitation windows).", "Technical", "Patch SLA 14d exceeds KEV exploitation timeline", 3, 4, false, "identify"],
  ["Third-party data processing without valid DPA", "{vendor} processes personal data without an executed Art. 28 agreement, creating GDPR liability and audit findings.", "Compliance", "Missing Art. 28 DPAs for legacy vendors", 3, 3, true, "govern"],
];

export async function seedPhase2(sql, clientId, slug) {
  const rng = new Rng(4000 + clientId);
  const out = {};
  const emps = await sql`SELECT id, first_name, last_name FROM employees WHERE client_id = ${clientId}`;
  const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
  const catalog = ASSET_CATALOG[slug];
  const ops = slug === "nordwind" ? "freight booking and fulfilment" : "federal customer service delivery";
  const vendors = slug === "nordwind"
    ? ["Webfleet", "Seeburger AG", "Datev", "Personio", "Zendesk", "Vercel"]
    : ["Atlassian Government Cloud", "Splunk", "Tanium", "Deltek", "Skillsoft"];

  // --- assets ---
  const assetRows = catalog.map(([name, type, category, crit, loc, desc, isPD], i) => ({
    client_id: clientId,
    name, type, category, description: desc,
    criticality: crit,
    valuation_c: rng.weighted([[1,15],[2,20],[3,25],[4,25],[5,15]]),
    valuation_i: crit === "Very High" ? 5 : rng.int(2, 4),
    valuation_a: crit === "Very High" || crit === "High" ? rng.int(4, 5) : rng.int(2, 3),
    owner: empName(),
    data_owner: isPD ? empName() : null,
    is_personal_data: !!isPD,
    data_sensitivity: isPD ? rng.pick(["internal", "confidential"]) : "internal",
    status: "active",
    location: loc,
    department: rng.pick(["IT Operations", "Software Engineering", "Information Security", "Finance & Controlling"]),
    ip_address: rng.chance(0.4) ? `10.${rng.int(0,40)}.${rng.int(0,255)}.${rng.int(2,254)}` : null,
    os: type === "Endpoint" ? "Windows 11 23H2" : rng.pick(["Ubuntu 22.04 LTS","Debian 12","Windows Server 2022"]),
    tags: JSON.stringify([slug === "nordwind" ? "isms-in-scope" : (desc.includes("CUI")||loc.includes("GovCloud")||crit==="Very High" ? "cui-enclave" : "corporate")]),
    created_at: agoDays(rng.int(120, 700)),
    updated_at: agoDays(rng.int(0, 60)),
    last_scanned_at: agoDays(rng.int(0, 14)),
  }));
  out.assets = await bulkInsert(sql, "assets",
    ["client_id","name","type","category","description","criticality","valuation_c","valuation_i","valuation_a","owner","data_owner","is_personal_data","data_sensitivity","status","location","department","ip_address","os","tags","created_at","updated_at","last_scanned_at"], assetRows);
  const assetIds = (await sql`SELECT id, name, criticality FROM assets WHERE client_id=${clientId}`).map(a => ({ id: a.id, name: a.name, crit: a.criticality }));

  // --- vulnerabilities (scan findings mapped to assets) ---
  const vulnRows = [];
  for (let i = 0; i < 110; i++) {
    const [cve, name, sev, cvss, desc] = VULN_TEMPLATES[i % VULN_TEMPLATES.length];
    const affected = rng.shuffle(assetIds.filter(a => a.crit !== "Low")).slice(0, rng.int(1, 4));
    const status = rng.weighted([["open", 35], ["mitigated", 15], ["remediated", 40], ["accepted", 10]]);
    vulnRows.push({
      client_id: clientId,
      vulnerability_id: `VULN-${String(i + 1).padStart(4, "0")}`,
      cve_id: cve,
      name: name || cve,
      description: desc,
      cvss_score: Math.round(cvss * 10),
      severity: sev,
      affected_assets: JSON.stringify(affected.map(a => ({ assetId: a.id, assetName: a.name }))),
      discovery_date: agoDays(rng.int(1, 120)),
      source: rng.pick(["Qualys authenticated scan", "Nessus scan", "Penetration test", "Bug bounty", "Vendor advisory"]),
      exploitability: cvss >= 9 ? "exploit_available" : rng.pick(["poc_available", "no_public_exploit", "weaponized"]),
      impact: sev === "critical" ? "very_high" : rng.pick(["moderate", "high", "low"]),
      status,
      owner: empName(),
      remediation_plan: status === "remediated" ? "Patch deployed via change request; verified by rescan." :
        status === "accepted" ? "Risk accepted by CISO pending hardware refresh (documented exception)." :
        "Patch window scheduled; interim mitigation via WAF/virtual patching.",
      due_date: daysFromNow(rng.int(-20, 45)),
      last_review_date: agoDays(rng.int(0, 30)),
      created_at: agoDays(rng.int(1, 130)),
      updated_at: agoDays(rng.int(0, 20)),
    });
  }
  out.vulnerabilities = await bulkInsert(sql, "vulnerabilities",
    ["client_id","vulnerability_id","cve_id","name","description","cvss_score","severity","affected_assets","discovery_date","source","exploitability","impact","status","owner","remediation_plan","due_date","last_review_date","created_at","updated_at"], vulnRows);

  // --- threats ---
  const threatRows = THREAT_CATALOG[slug].map(([name, category, desc, like, imp], i) => ({
    client_id: clientId,
    threat_id: `TH-${new Date().getFullYear()}-${String(i + 1).padStart(3, "0")}`,
    name, description: desc, category,
    source: category === "Nation State" ? "State-sponsored actor" : rng.pick(["External", "Internal", "Partner"]),
    intent: rng.pick(["Financial gain", "Espionage", "Disruption", "Opportunistic"]),
    likelihood: like, potential_impact: imp,
    affected_assets: JSON.stringify(rng.shuffle(assetIds).slice(0, rng.int(2, 5)).map(a => ({ assetId: a.id, assetName: a.name }))),
    detection_method: rng.pick(["SIEM correlation rule", "EDR alert", "Threat intel feed match", "User report", "Red team finding"]),
    status: rng.weighted([["active", 60], ["monitored", 30], ["dormant", 10]]),
    owner: empName(),
    last_review_date: agoDays(rng.int(5, 90)),
    scenario: desc,
    created_at: agoDays(rng.int(60, 400)),
    updated_at: agoDays(rng.int(0, 30)),
  }));
  out.threats = await bulkInsert(sql, "threats",
    ["client_id","threat_id","name","description","category","source","intent","likelihood","potential_impact","affected_assets","detection_method","status","owner","last_review_date","scenario","created_at","updated_at"], threatRows);

  // --- risk register (risk_scenarios) ---
  const riskRows = [];
  const total = 80;
  for (let i = 0; i < total; i++) {
    const lib = RISK_LIBRARY[i % RISK_LIBRARY.length];
    const [title, desc, tCat, vulnTxt, cat, imp, priv, csf] = lib;
    const asset = rng.pick(assetIds);
    const vendor = rng.pick(vendors);
    const sysName = title.includes("{vendor}") ? vendor : asset.name;
    const l = Math.min(5, cat + rng.int(-1, 1));
    const im = Math.min(5, Math.max(1, imp + rng.int(-1, 1)));
    const inhScore = l * im;
    const inhBand = inhScore >= 15 ? "Very High" : inhScore >= 10 ? "High" : inhScore >= 5 ? "Medium" : "Low";
    // residual after controls
    const rl = Math.max(1, Math.min(5, l - rng.int(0, 2)));
    const ri = Math.max(1, Math.min(5, im - rng.int(0, 2)));
    const rScore = rl * ri;
    const rBand = rScore >= 15 ? "Very High" : rScore >= 10 ? "High" : rScore >= 5 ? "Medium" : "Low";
    const filledTitle = (title + "")
      .replace("{sys}", sysName).replace("{dept}", rng.pick(["Finance", "Operations", "Sales"]))
      .replace("{vendor}", vendor).replace("{op}", slug === "nordwind" ? "fulfilment" : "customer deliverables");
    const filledDesc = (desc + "").replace(/\{sys\}/g, sysName)
      .replace("{dept}", "Operations").replace("{vendor}", vendor).replace("{op}", ops);
    const status = rng.weighted([["identified", 10], ["analyzed", 20], ["treatment_pending", 15], ["treatment_in_progress", 25], ["monitored", 20], ["closed", 10]]);
    riskRows.push({
      client_id: clientId,
      assessment_type: "asset",
      asset_id: title.includes("{vendor}") ? null : asset.id,
      title: filledTitle,
      description: filledDesc,
      threat_category: tCat,
      vulnerability: vulnTxt,
      likelihood: l, impact: im,
      inherent_risk_score: inhScore, inherent_risk: inhBand, inherent_score: inhScore,
      residual_likelihood: rl, residual_impact: ri, residual_score: rScore, residual_risk: rBand,
      status,
      owner: empName(),
      privacy_impact: priv,
      csf_function: csf,
      custom_mitigation_plan: status !== "identified" ?
        `Mitigation plan for "${filledTitle}": strengthen preventive controls, verify detective coverage in SIEM, assign treatment owner and review quarterly.` : null,
      created_at: agoDays(rng.int(10, 360)),
      updated_at: agoDays(rng.int(0, 45)),
    });
  }
  await bulkInsert(sql, "risk_scenarios",
    ["client_id","assessment_type","asset_id","title","description","threat_category","vulnerability","likelihood","impact","inherent_risk_score","inherent_risk","inherent_score","residual_likelihood","residual_impact","residual_score","residual_risk","status","owner","privacy_impact","csf_function","custom_mitigation_plan","created_at","updated_at"], riskRows);
  out.risks = riskRows.length;

  const scenIds = (await sql`SELECT id, title, inherent_score, residual_score FROM risk_scenarios WHERE client_id=${clientId}`);

  // --- risk assessments ---
  const raRows = scenIds.map((s, i) => {
    const assessor = empName();
    const status = rng.weighted([["approved", 55], ["reviewed", 30], ["draft", 15]]);
    return {
      client_id: clientId,
      risk_id: s.id,
      assessment_id: `RA-${String(i + 1).padStart(4, "0")}`,
      title: s.title,
      assessment_date: agoDays(rng.int(5, 200)),
      assessor,
      method: rng.pick(["ISO 27005 qualitative", "NIST 800-30", "Scenario analysis", "FAIR-lite"]),
      threat_description: s.title,
      vulnerability_description: "See linked risk scenario vulnerability notes",
      affected_assets: JSON.stringify([]),
      likelihood: rng.int(1, 5), impact: rng.int(1, 5),
      inherent_risk: rng.pick(["Low", "Medium", "High"]),
      existing_controls: "EDR, SIEM alerting, least-privilege RBAC, awareness training",
      control_effectiveness: rng.pick(["effective", "partially_effective", "ineffective"]),
      residual_risk: rng.pick(["Low", "Medium", "High"]),
      risk_owner: assessor,
      treatment_option: rng.weighted([["mitigate", 60], ["accept", 15], ["transfer", 10], ["avoid", 5]]),
      recommended_actions: "Proceed with planned treatment; track completion in governance queue.",
      priority: rng.pick(["P1", "P2", "P3"]),
      review_due_date: daysFromNow(rng.int(-10, 120)),
      status,
      next_review_date: daysFromNow(rng.int(30, 180)),
      created_at: agoDays(rng.int(5, 200)),
      updated_at: agoDays(rng.int(0, 30)),
    };
  });
  out.risk_assessments = await bulkInsert(sql, "risk_assessments",
    ["client_id","risk_id","assessment_id","title","assessment_date","assessor","method","threat_description","vulnerability_description","affected_assets","likelihood","impact","inherent_risk","existing_controls","control_effectiveness","residual_risk","risk_owner","treatment_option","recommended_actions","priority","review_due_date","status","next_review_date","created_at","updated_at"], raRows);

  // --- treatments (for assessed risks) ---
  const trRows = [];
  const treatable = await sql`
    SELECT ra.id as ra_id, ra.risk_id, ra.risk_owner, ra.treatment_option
    FROM risk_assessments ra WHERE ra.client_id=${clientId}`;
  for (const t of treatable) {
    if (!rng.chance(0.85)) continue; // some risks have no treatment yet (user can create)
    const strategy = t.treatment_option || "mitigate";
    const status = rng.weighted([["planned", 20], ["in_progress", 30], ["implemented", 35], ["overdue", 10]]);
    trRows.push({
      client_id: clientId,
      risk_scenario_id: t.risk_id,
      risk_assessment_id: t.ra_id,
      strategy,
      treatment_type: strategy,
      justification: strategy === "accept"
        ? "Residual risk within appetite after compensating controls; acceptance documented for annual review."
        : strategy === "transfer"
        ? "Coverage transferred via cyber insurance and contractual liability clauses."
        : "Control gap identified in assessment; implementation reduces residual score to target band.",
      status: status === "overdue" ? "planned" : status,
      owner: t.risk_owner || empName(),
      priority: rng.pick(["P1", "P2", "P3"]),
      due_date: daysFromNow(rng.int(status === "overdue" ? -45 : 5, 120)),
      implementation_date: status === "implemented" ? agoDays(rng.int(1, 60)) : null,
      estimated_cost: rng.int(2, 60) * 1000,
      created_at: agoDays(rng.int(5, 150)),
      updated_at: agoDays(rng.int(0, 20)),
    });
  }
  out.treatments = await bulkInsert(sql, "risk_treatments",
    ["client_id","risk_scenario_id","risk_assessment_id","strategy","treatment_type","justification","status","owner","priority","due_date","implementation_date","estimated_cost","created_at","updated_at"], trRows);

  log(`phase2:`, JSON.stringify(out));
  return out;
}
