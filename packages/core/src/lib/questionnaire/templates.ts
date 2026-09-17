/**
 * Built-in questionnaire templates.
 *
 * `questionCount` is always DERIVED from `questions.length` (never a
 * hardcoded lie). All templates keep stable `id`/`name` values so existing
 * consumers keep working.
 */

export type ResponseType = "yes_no" | "yes_no_na" | "text";

export type QuestionTemplate = {
  questionId: string;
  question: string;
  focusArea: string;
  subFocusArea?: string;
  responseType?: ResponseType; // defaults to "yes_no_na"
};

export type QuestionTemplateSet = {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  questionCount: number; // derived = questions.length
  questions: QuestionTemplate[];
};

function makeTemplate(tpl: Omit<QuestionTemplateSet, "questionCount">): QuestionTemplateSet {
  return {
    ...tpl,
    questionCount: tpl.questions.length,
  };
}

const sigLite: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "sig-lite",
  name: "SIG Lite (Standard Information Gathering)",
  description: "SIG Lite-style third-party security assessment across core control domains (governance, access control, data protection, testing, cryptography, incident response and more).",
  category: "Standard Assessment",
  version: "1.0",
  questions: [
    { questionId: "A.1", question: "Do you maintain a documented Information Security Policy?", focusArea: "Governance", subFocusArea: "Policy Framework", responseType: "yes_no_na" },
    { questionId: "A.2", question: "Is your security program formally owned by a named role (e.g., CISO) with defined responsibilities?", focusArea: "Governance", subFocusArea: "Organization", responseType: "yes_no_na" },
    { questionId: "A.3", question: "Do you perform an organization-wide risk assessment at least annually?", focusArea: "Governance", subFocusArea: "Risk Management", responseType: "yes_no_na" },
    { questionId: "A.4", question: "Are security policies reviewed and updated at least annually?", focusArea: "Governance", subFocusArea: "Policy Framework", responseType: "yes_no_na" },
    { questionId: "B.1", question: "Is multi-factor authentication (MFA) enforced for all remote access?", focusArea: "Access Control", subFocusArea: "Authentication", responseType: "yes_no" },
    { questionId: "B.2", question: "Is access to systems granted based on least privilege and job responsibilities?", focusArea: "Access Control", subFocusArea: "Authorization", responseType: "yes_no_na" },
    { questionId: "B.3", question: "Are user access rights reviewed and revoked promptly upon role change or termination?", focusArea: "Access Control", subFocusArea: "Access Reviews", responseType: "yes_no_na" },
    { questionId: "B.4", question: "Is privileged (administrator) access separated from standard user access and logged?", focusArea: "Access Control", subFocusArea: "Privileged Access", responseType: "yes_no_na" },
    { questionId: "C.1", question: "Are data backups performed on a defined schedule and tested for restoration?", focusArea: "Data Protection", subFocusArea: "Backup & Recovery", responseType: "yes_no_na" },
    { questionId: "C.2", question: "Is data encrypted at rest using strong encryption (e.g., AES-256)?", focusArea: "Data Protection", subFocusArea: "Encryption at Rest", responseType: "yes_no_na" },
    { questionId: "C.3", question: "Is data encrypted in transit using TLS 1.2 or higher?", focusArea: "Data Protection", subFocusArea: "Encryption in Transit", responseType: "yes_no_na" },
    { questionId: "C.4", question: "Do you maintain a data retention schedule and securely dispose of data when no longer needed?", focusArea: "Data Protection", subFocusArea: "Lifecycle Management", responseType: "yes_no_na" },
    { questionId: "D.1", question: "Do you undergo independent third-party penetration testing at least annually?", focusArea: "Security Testing", subFocusArea: "Penetration Testing", responseType: "yes_no_na" },
    { questionId: "D.2", question: "Are internal and external vulnerabilities scanned on a recurring schedule with remediation tracking?", focusArea: "Security Testing", subFocusArea: "Vulnerability Management", responseType: "yes_no_na" },
    { questionId: "D.3", question: "Is security testing (SAST/DAST) integrated into your software development lifecycle?", focusArea: "Security Testing", subFocusArea: "Secure SDLC", responseType: "yes_no_na" },
    { questionId: "E.1", question: "Do you maintain a formal cryptographic key management process (generation, rotation, revocation)?", focusArea: "Cryptography", subFocusArea: "Key Management", responseType: "yes_no_na" },
    { questionId: "F.1", question: "Do you have a documented incident response plan that is tested at least annually?", focusArea: "Incident Response", subFocusArea: "IR Plan", responseType: "yes_no_na" },
    { questionId: "F.2", question: "What is your SLA for notifying customers of a confirmed data breach?", focusArea: "Incident Response", subFocusArea: "Breach Notification", responseType: "text" },
    { questionId: "G.1", question: "Do you assess the security posture of your own third-party vendors and subprocessors?", focusArea: "Vendor Management", subFocusArea: "Subprocessor Oversight", responseType: "yes_no_na" },
    { questionId: "H.1", question: "Do you conduct background checks and require confidentiality agreements for employees with access to customer data?", focusArea: "Human Resources", subFocusArea: "Personnel Security", responseType: "yes_no_na" },
  ],
};

const caiqV4: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "caiq-v4",
  name: "CCM CAIQ v4 (Cloud Security Alliance)",
  description: "Cloud-native security assessment mapping one question to each CCM v4 control domain (AIS, BCR, CCC, CEF, DSI, DCS, GRM, HRS, IVS, LOG, MON, SEF, STA, TVM, UEM).",
  category: "Cloud Security",
  version: "4.0",
  questions: [
    { questionId: "AIS-01", question: "Are application security testing procedures integrated into CI/CD pipelines?", focusArea: "Application & Interface Security", subFocusArea: "AIS", responseType: "yes_no_na" },
    { questionId: "BCR-01", question: "Do you test your Business Continuity & Disaster Recovery plan at least annually?", focusArea: "BC/DR", subFocusArea: "BCR", responseType: "yes_no_na" },
    { questionId: "CCC-01", question: "Is change management enforced with audit logs for production infrastructure?", focusArea: "Change Control & Configuration", subFocusArea: "CCC", responseType: "yes_no_na" },
    { questionId: "CEF-01", question: "Do you manage encryption keys with defined rotation, storage, and revocation procedures?", focusArea: "Cryptography & Key Management", subFocusArea: "CEF", responseType: "yes_no_na" },
    { questionId: "DSI-01", question: "Do you maintain a data classification scheme covering the full data lifecycle?", focusArea: "Data Security & Lifecycle", subFocusArea: "DSI", responseType: "yes_no_na" },
    { questionId: "DCS-01", question: "Are physical access controls enforced at all data center facilities hosting customer data?", focusArea: "Data Center Security", subFocusArea: "DCS", responseType: "yes_no_na" },
    { questionId: "GRM-01", question: "Do you operate an enterprise risk management framework with defined risk appetite?", focusArea: "Governance & Risk Management", subFocusArea: "GRM", responseType: "yes_no_na" },
    { questionId: "HRS-01", question: "Are background checks and security responsibilities included in the employee lifecycle?", focusArea: "Human Resources Security", subFocusArea: "HRS", responseType: "yes_no_na" },
    { questionId: "IVS-01", question: "Is identity lifecycle management enforced with periodic access recertification?", focusArea: "Identity & Access Management", subFocusArea: "IVS", responseType: "yes_no_na" },
    { questionId: "LOG-01", question: "Are audit logs captured, retained, and protected against tampering for at least one year?", focusArea: "Logging & Monitoring", subFocusArea: "LOG", responseType: "yes_no_na" },
    { questionId: "LOG-02", question: "Are security events centralized and monitored with defined alerting thresholds?", focusArea: "Logging & Monitoring", subFocusArea: "LOG", responseType: "yes_no_na" },
    { questionId: "MON-01", question: "Do you have a documented incident response process with defined roles and escalation?", focusArea: "Monitoring & Incident Response", subFocusArea: "MON", responseType: "yes_no_na" },
    { questionId: "MON-02", question: "Are incidents communicated to customers in accordance with contractual SLAs?", focusArea: "Monitoring & Incident Response", subFocusArea: "MON", responseType: "yes_no_na" },
    { questionId: "SEF-01", question: "Do all employees complete security awareness training at least annually?", focusArea: "Security Education & Awareness", subFocusArea: "SEF", responseType: "yes_no_na" },
    { questionId: "STA-01", question: "Do you assess third-party and subprocessor risk before engagement and on a recurring basis?", focusArea: "Supply Chain & Transparency", subFocusArea: "STA", responseType: "yes_no_na" },
    { questionId: "TVM-01", question: "Do you operate a continuous vulnerability management program with remediation SLAs?", focusArea: "Threat & Vulnerability Management", subFocusArea: "TVM", responseType: "yes_no_na" },
    { questionId: "UEM-01", question: "Are all endpoints managed, patched, and protected with security software?", focusArea: "Universal Endpoint Management", subFocusArea: "UEM", responseType: "yes_no_na" },
  ],
};

const vsaq: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "vsaq",
  name: "VSAQ (Vendor Security Assessment Questionnaire)",
  description: "VSAQ-style lightweight framework for SaaS vendor evaluation covering security operations, access control, data protection, incident response and more.",
  category: "Vendor Risk",
  version: "1.0",
  questions: [
    { questionId: "VSAQ-1", question: "Do you have a dedicated Security Operations Center or Incident Response team?", focusArea: "Security Operations", subFocusArea: "Team & Staffing", responseType: "yes_no_na" },
    { questionId: "VSAQ-2", question: "Are employee workstations managed with MDM and full-disk encryption?", focusArea: "Endpoint Security", subFocusArea: "Device Management", responseType: "yes_no_na" },
    { questionId: "VSAQ-3", question: "What is your SLA for notifying customers of a confirmed data breach?", focusArea: "Breach Notification", subFocusArea: "SLA", responseType: "text" },
    { questionId: "VSAQ-4", question: "Is multi-factor authentication required for all production systems and administrative access?", focusArea: "Access Control", subFocusArea: "Authentication", responseType: "yes_no" },
    { questionId: "VSAQ-5", question: "Do you perform background checks on employees with access to customer data?", focusArea: "Personnel Security", subFocusArea: "Background Checks", responseType: "yes_no_na" },
    { questionId: "VSAQ-6", question: "Do you perform application penetration testing at least annually?", focusArea: "Web Application Security", subFocusArea: "Penetration Testing", responseType: "yes_no_na" },
    { questionId: "VSAQ-7", question: "Is all customer data encrypted at rest and in transit?", focusArea: "Data Protection", subFocusArea: "Encryption", responseType: "yes_no_na" },
    { questionId: "VSAQ-8", question: "Do you maintain a current list of subprocessors and re-assess their security posture regularly?", focusArea: "Subprocessors", subFocusArea: "Vendor Management", responseType: "yes_no_na" },
    { questionId: "VSAQ-9", question: "Do you hold an independent certification such as SOC 2 Type II or ISO 27001?", focusArea: "Certifications", subFocusArea: "Audit & Compliance", responseType: "yes_no_na" },
    { questionId: "VSAQ-10", question: "Is your business continuity and disaster recovery plan tested at least annually?", focusArea: "Business Continuity", subFocusArea: "BC/DR", responseType: "yes_no_na" },
    { questionId: "VSAQ-11", question: "Do all employees complete security awareness training at least annually?", focusArea: "Security Training", subFocusArea: "Awareness", responseType: "yes_no_na" },
    { questionId: "VSAQ-12", question: "Do you have a documented data retention and secure deletion process?", focusArea: "Data Lifecycle", subFocusArea: "Retention", responseType: "yes_no_na" },
  ],
};

const cisCsat: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "cis-csat",
  name: "CIS CSAT v8 (Controls Self-Assessment)",
  description: "Self-assessment aligned to CIS Critical Security Controls v8 covering core Implementation Group controls.",
  category: "Framework Alignment",
  version: "8.0",
  questions: [
    { questionId: "CIS-1.1", question: "Do you maintain a complete, current inventory of all enterprise assets connected to your environment?", focusArea: "CIS Control 1 - Inventory of Enterprise Assets", subFocusArea: "Asset Discovery", responseType: "yes_no_na" },
    { questionId: "CIS-2.1", question: "Do you maintain a current inventory of all authorized software and its versions?", focusArea: "CIS Control 2 - Inventory of Software Assets", subFocusArea: "Software Inventory", responseType: "yes_no_na" },
    { questionId: "CIS-3.1", question: "Have you established and maintained a data management process (inventory, classification, retention)?", focusArea: "CIS Control 3 - Data Protection", subFocusArea: "Data Management", responseType: "yes_no_na" },
    { questionId: "CIS-4.1", question: "Have you established and maintained a secure configuration process for enterprise assets and software?", focusArea: "CIS Control 4 - Secure Configuration", subFocusArea: "Configuration Management", responseType: "yes_no_na" },
    { questionId: "CIS-5.1", question: "Do you establish and maintain an inventory and management process for all accounts (human and service)?", focusArea: "CIS Control 5 - Account Management", subFocusArea: "Account Lifecycle", responseType: "yes_no_na" },
    { questionId: "CIS-6.1", question: "Is access to enterprise assets and software limited through a formal access control model?", focusArea: "CIS Control 6 - Access Control Management", subFocusArea: "Access Governance", responseType: "yes_no_na" },
    { questionId: "CIS-7.1", question: "Do you continuously discover, prioritize, and remediate vulnerabilities across your environment?", focusArea: "CIS Control 7 - Continuous Vulnerability Management", subFocusArea: "Vulnerability Management", responseType: "yes_no_na" },
    { questionId: "CIS-8.1", question: "Do you collect audit logs and retain them for a defined period (e.g., 90+ days)?", focusArea: "CIS Control 8 - Audit Log Management", subFocusArea: "Logging", responseType: "yes_no_na" },
    { questionId: "CIS-9.1", question: "Are email and web browser protections (e.g., DMARC, DNS filtering) enforced?", focusArea: "CIS Control 9 - Email & Web Protections", subFocusArea: "Perimeter Defenses", responseType: "yes_no_na" },
    { questionId: "CIS-10.1", question: "Are anti-malware defenses deployed and kept current on all enterprise assets?", focusArea: "CIS Control 10 - Malware Defenses", subFocusArea: "Endpoint Protection", responseType: "yes_no_na" },
    { questionId: "CIS-11.1", question: "Do you establish and maintain data recovery procedures, including backups and periodic restore testing?", focusArea: "CIS Control 11 - Data Recovery", subFocusArea: "Backup & Restore", responseType: "yes_no_na" },
    { questionId: "CIS-13.1", question: "Do you monitor network infrastructure for unauthorized activity and maintain network defense capabilities?", focusArea: "CIS Control 13 - Network Monitoring & Defense", subFocusArea: "Network Security", responseType: "yes_no_na" },
    { questionId: "CIS-17.1", question: "Do you have an incident response plan with defined roles, escalation, and post-incident reviews?", focusArea: "CIS Control 17 - Incident Response Management", subFocusArea: "IR Process", responseType: "yes_no_na" },
    { questionId: "CIS-18.1", question: "Do you test the effectiveness of your controls via penetration testing at least annually?", focusArea: "CIS Control 18 - Penetration Testing", subFocusArea: "Security Testing", responseType: "yes_no_na" },
  ],
};

const soc2: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "soc2",
  name: "SOC 2 Trust Services Criteria",
  description: "SOC 2 readiness assessment covering the Trust Services Criteria: Common Criteria (CC1-CC9) plus Availability (A1), Confidentiality (C1) and Privacy (PI1).",
  category: "Audit & Compliance",
  version: "2017",
  questions: [
    { questionId: "CC1-01", question: "Does the organization maintain a documented code of conduct/ethics that is communicated to all employees?", focusArea: "CC - Control Environment", subFocusArea: "CC1.1 Integrity & Ethics", responseType: "yes_no_na" },
    { questionId: "CC1-02", question: "Are organizational structures and reporting lines defined to support accountability for controls?", focusArea: "CC - Control Environment", subFocusArea: "CC1.3 Organizational Structure", responseType: "yes_no_na" },
    { questionId: "CC1-03", question: "Does the board/management provide oversight of internal control, including independent review of management?", focusArea: "CC - Control Environment", subFocusArea: "CC1.4/5 Governance", responseType: "yes_no_na" },
    { questionId: "CC2-01", question: "Are control responsibilities communicated internally to all personnel?", focusArea: "CC - Communication", subFocusArea: "CC2.1/2 Internal Communication", responseType: "yes_no_na" },
    { questionId: "CC2-02", question: "Are security commitments communicated externally to customers, regulators, and other stakeholders?", focusArea: "CC - Communication", subFocusArea: "CC2.3 External Communication", responseType: "yes_no_na" },
    { questionId: "CC3-01", question: "Does the organization perform an entity-level risk assessment covering fraud, change, and new technologies?", focusArea: "CC - Risk Assessment", subFocusArea: "CC3.1/2 Risk Identification", responseType: "yes_no_na" },
    { questionId: "CC4-01", question: "Are controls monitored on an ongoing basis and separately evaluated (e.g., internal audit) periodically?", focusArea: "CC - Monitoring of Controls", subFocusArea: "CC4.1/2 Monitoring", responseType: "yes_no_na" },
    { questionId: "CC5-01", question: "Are policies and procedures designed and implemented to support the achievement of control objectives?", focusArea: "CC - Control Activities", subFocusArea: "CC5.1/2 Policy Deployment", responseType: "yes_no_na" },
    { questionId: "CC6-01", question: "Is access to systems granted based on job responsibilities and revoked upon role change?", focusArea: "CC - Logical & Physical Access", subFocusArea: "CC6.1 Access Grant/Revoke", responseType: "yes_no_na" },
    { questionId: "CC6-02", question: "Is multi-factor authentication required for remote access and privileged accounts?", focusArea: "CC - Logical & Physical Access", subFocusArea: "CC6.2 Authentication", responseType: "yes_no" },
    { questionId: "CC6-03", question: "Is access terminated promptly for terminated employees and are credentials deprovisioned?", focusArea: "CC - Logical & Physical Access", subFocusArea: "CC6.3 Termination", responseType: "yes_no_na" },
    { questionId: "CC6-04", question: "Are physical access controls (badges, cameras, visitor logs) enforced at facilities hosting systems?", focusArea: "CC - Logical & Physical Access", subFocusArea: "CC6.4 Physical Access", responseType: "yes_no_na" },
    { questionId: "CC7-01", question: "Do you identify and patch vulnerabilities on a defined schedule?", focusArea: "CC - System Operations", subFocusArea: "CC7.1 Vulnerability Management", responseType: "yes_no_na" },
    { questionId: "CC7-02", question: "Do you monitor system activity for anomalous behavior (e.g., SIEM, IDS/IPS)?", focusArea: "CC - System Operations", subFocusArea: "CC7.2/3 Monitoring", responseType: "yes_no_na" },
    { questionId: "CC7-03", question: "Do you have a documented incident response plan with defined roles, testing, and lessons learned?", focusArea: "CC - System Operations", subFocusArea: "CC7.4/5 Incident Response", responseType: "yes_no_na" },
    { questionId: "CC8-01", question: "Is a change management process enforced with testing, approval, and audit trails for production changes?", focusArea: "CC - Change Management", subFocusArea: "CC8.1/2 Change Control", responseType: "yes_no_na" },
    { questionId: "CC9-01", question: "Do you identify and mitigate risks arising from vendors and business partners (business disruption, subservice providers)?", focusArea: "CC - Risk Mitigation", subFocusArea: "CC9.1 Vendor Risk", responseType: "yes_no_na" },
    { questionId: "CC9-02", question: "Do you maintain business continuity and disaster recovery plans aligned to availability commitments?", focusArea: "CC - Risk Mitigation", subFocusArea: "CC9.2 BC/DR", responseType: "yes_no_na" },
    { questionId: "A1-01", question: "Are availability commitments (e.g., uptime SLAs) monitored and reported against on a recurring basis?", focusArea: "A1 - Availability", subFocusArea: "A1.1 Commitments", responseType: "yes_no_na" },
    { questionId: "A1-02", question: "Do you perform capacity planning to meet availability commitments under expected growth?", focusArea: "A1 - Availability", subFocusArea: "A1.2 Capacity", responseType: "yes_no_na" },
    { questionId: "A1-03", question: "Are backups and restores tested periodically against defined RPO/RTO targets?", focusArea: "A1 - Availability", subFocusArea: "A1.3 Recovery", responseType: "yes_no_na" },
    { questionId: "C1-01", question: "Do you identify and protect confidential information in accordance with confidentiality commitments (e.g., encryption, access restriction)?", focusArea: "C1 - Confidentiality", subFocusArea: "C1.1/2 Confidentiality", responseType: "yes_no_na" },
    { questionId: "PI1-01", question: "Do you maintain a privacy notice and obtain consent before collecting or using personal information?", focusArea: "PI1 - Privacy", subFocusArea: "PI1.1/2 Notice & Choice", responseType: "yes_no_na" },
    { questionId: "PI1-02", question: "Do you support data subject rights (access, correction, deletion) with defined processes?", focusArea: "PI1 - Privacy", subFocusArea: "PI1.5/6 Data Subject Rights", responseType: "yes_no_na" },
  ],
};

const iso27001: Omit<QuestionTemplateSet, "questionCount"> = {
  id: "iso27001",
  name: "ISO/IEC 27001 Annex A",
  description: "ISO/IEC 27001 Annex A readiness assessment spanning policies, HR security, asset management, access control, cryptography, physical security, operations, communications, suppliers, incidents, business continuity and compliance.",
  category: "Framework Alignment",
  version: "2022",
  questions: [
    { questionId: "A.5.1", question: "Is an Information Security Policy framework documented, approved by management, and reviewed at planned intervals?", focusArea: "A.5 - Information Security Policies", subFocusArea: "A.5.1 Policies", responseType: "yes_no_na" },
    { questionId: "A.5.2", question: "Are security policies and topics communicated to all employees and relevant external parties?", focusArea: "A.5 - Information Security Policies", subFocusArea: "A.5.1 Communication", responseType: "yes_no_na" },
    { questionId: "A.6.1", question: "Do you screen all job candidates prior to employment and require confidentiality agreements?", focusArea: "A.6 - Human Resources Security", subFocusArea: "A.7.1 Screening", responseType: "yes_no_na" },
    { questionId: "A.6.2", question: "Are security roles and responsibilities defined in employment terms and enforced through onboarding/offboarding?", focusArea: "A.6 - Human Resources Security", subFocusArea: "A.7.1 Terms & Conditions", responseType: "yes_no_na" },
    { questionId: "A.6.3", question: "Do all employees complete information security awareness training at least annually?", focusArea: "A.6 - Human Resources Security", subFocusArea: "A.6.3 Awareness", responseType: "yes_no_na" },
    { questionId: "A.7.1", question: "Do you maintain a current inventory of information assets with assigned ownership?", focusArea: "A.7 - Asset Management", subFocusArea: "A.8.1 Responsibility", responseType: "yes_no_na" },
    { questionId: "A.7.2", question: "Do you maintain an information classification scheme applied across all assets?", focusArea: "A.7 - Asset Management", subFocusArea: "A.8.2 Classification", responseType: "yes_no_na" },
    { questionId: "A.8.1", question: "Are user access rights granted based on least privilege with formal approval?", focusArea: "A.8 - Access Control", subFocusArea: "A.9.1 Business Requirements", responseType: "yes_no_na" },
    { questionId: "A.9.1", question: "Are access rights reviewed at regular intervals and revoked upon role change or termination?", focusArea: "A.9 - Access Control", subFocusArea: "A.9.2 User Access Management", responseType: "yes_no_na" },
    { questionId: "A.9.2", question: "Is multi-factor authentication enforced for privileged and remote access?", focusArea: "A.9 - Access Control", subFocusArea: "A.9.4 Authentication", responseType: "yes_no" },
    { questionId: "A.10.1", question: "Do you have a documented cryptography policy covering encryption of data at rest and in transit?", focusArea: "A.10 - Cryptography", subFocusArea: "A.10.1 Controls", responseType: "yes_no_na" },
    { questionId: "A.11.1", question: "Are physical security perimeters and entry controls enforced at all facilities housing information assets?", focusArea: "A.11 - Physical & Environmental Security", subFocusArea: "A.11.1 Secure Areas", responseType: "yes_no_na" },
    { questionId: "A.12.1", question: "Is a formal change management process in place with approval, testing, and rollback for operational changes?", focusArea: "A.12 - Operations Security", subFocusArea: "A.12.1 Operational Procedures", responseType: "yes_no_na" },
    { questionId: "A.12.2", question: "Are malware protection and backup/restore procedures in place and tested?", focusArea: "A.12 - Operations Security", subFocusArea: "A.12.2/3 Malware & Backup", responseType: "yes_no_na" },
    { questionId: "A.13.1", question: "Are networks segregated and is information exchanged securely with external parties?", focusArea: "A.13 - Communications Security", subFocusArea: "A.13.1 Network Security", responseType: "yes_no_na" },
    { questionId: "A.14.1", question: "Is security incorporated into the software development lifecycle, including security testing before release?", focusArea: "A.14 - Acquisition, Development & Maintenance", subFocusArea: "A.14.2 Development", responseType: "yes_no_na" },
    { questionId: "A.15.1", question: "Are security requirements included in supplier agreements and are supplier relationships monitored?", focusArea: "A.15 - Supplier Relationships", subFocusArea: "A.15.1/2 Suppliers", responseType: "yes_no_na" },
    { questionId: "A.16.1", question: "Do you have a documented incident management process with defined roles, escalation, and lessons learned?", focusArea: "A.16 - Incident Management", subFocusArea: "A.16.1 Response", responseType: "yes_no_na" },
    { questionId: "A.17.1", question: "Is your business continuity plan documented, tested, and aligned to recovery objectives?", focusArea: "A.17 - Business Continuity", subFocusArea: "A.17.1/2 Continuity", responseType: "yes_no_na" },
    { questionId: "A.18.1", question: "Do you regularly review compliance with legal, regulatory, contractual, and internal policy requirements?", focusArea: "A.18 - Compliance", subFocusArea: "A.18.1/2 Compliance", responseType: "yes_no_na" },
  ],
};

export const BUILTIN_TEMPLATES: QuestionTemplateSet[] = [
  makeTemplate(sigLite),
  makeTemplate(caiqV4),
  makeTemplate(vsaq),
  makeTemplate(cisCsat),
  makeTemplate(soc2),
  makeTemplate(iso27001),
];

export function getBuiltinTemplate(id: string): QuestionTemplateSet | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
