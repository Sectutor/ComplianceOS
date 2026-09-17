/**
 * AI Copilot — deterministic, dependency-free compliance engine.
 *
 * Cycle 14 (scorecard #10 "AI-powered compliance"): productizes auto-map,
 * evidence suggestion, and policy drafting as a pure, in-app engine that
 * runs entirely on a built-in knowledge base. No LLM calls, no database,
 * no external imports — only plain TypeScript.
 *
 * Design rules:
 * - NEVER throws on any input (empty/undefined → neutral safe shapes).
 * - Deterministic: same input always yields the same output (no Math.random,
 *   no Date, no iteration-order-dependent logic).
 * - Matching is lowercase `includes` + token overlap against keyword
 *   fingerprints; autoMap scores are 0-100 keyword hit ratios.
 * - Neutral "empty" consts mirror the EMPTY_POSTURE pattern used in
 *   server/routers/trustCenter.ts.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** One policy document section (heading + body). */
export interface PolicySection {
  heading: string;
  body: string;
}

/** A framework control reference attached to a drafted policy. */
export interface PolicyControlRef {
  code: string;
  title: string;
}

/** Complete policy draft produced by the built-in engine. */
export interface PolicyDraft {
  title: string;
  purpose: string;
  scope: string;
  sections: PolicySection[];
  controls: PolicyControlRef[];
  reviewCadence: string;
  disclaimer: string;
}

/** A single suggested evidence item. */
export interface EvidenceItem {
  title: string;
  type: string;
  description: string;
  freshness: string;
}

/** Evidence suggestions for a given control. */
export interface EvidenceSuggestions {
  evidence: EvidenceItem[];
  source: "builtin";
}

/** One framework-control match found by autoMap. */
export interface AutoMapMatch {
  framework: string;
  controlId: string;
  controlTitle: string;
  score: number;
  rationale: string;
}

/** Result of mapping a free-text requirement onto the control KB. */
export interface AutoMapResult {
  matches: AutoMapMatch[];
  bestMatch: AutoMapMatch | null;
}

/** Input shape for draftPolicyDraft. */
export interface DraftPolicyInput {
  topic?: string;
  framework?: string;
  orgName?: string;
}

/** Input shape for suggestEvidenceForControl. */
export interface SuggestEvidenceInput {
  controlTitle?: string;
  framework?: string;
}

/** Input shape for autoMapRequirement. */
export interface AutoMapInput {
  requirement?: string;
  frameworks?: string[];
}

/* ------------------------------------------------------------------ */
/* Neutral "empty" shapes (EMPTY_POSTURE pattern)                      */
/* ------------------------------------------------------------------ */

/** Neutral "no content" policy draft returned on invalid/empty input. */
export const EMPTY_POLICY_DRAFT: PolicyDraft = {
  title: "",
  purpose: "",
  scope: "",
  sections: [],
  controls: [],
  reviewCadence: "",
  disclaimer: "",
};

/** Neutral "no suggestions" shape returned on invalid/empty input. */
export const EMPTY_EVIDENCE_SUGGESTIONS: EvidenceSuggestions = {
  evidence: [],
  source: "builtin",
};

/** Neutral "no matches" shape returned on invalid/empty input. */
export const EMPTY_AUTO_MAP_RESULT: AutoMapResult = {
  matches: [],
  bestMatch: null,
};

/* ------------------------------------------------------------------ */
/* Built-in knowledge base                                             */
/* ------------------------------------------------------------------ */

/** A representative control in the built-in catalog. */
interface ControlCatalogEntry {
  framework: string;
  id: string;
  title: string;
  keywords: string[];
}

/**
 * Representative control catalogs (5-10+ entries per framework).
 * Each entry carries keyword fingerprints for deterministic matching
 * (e.g. "access control" → login/logon/MFA/least-privilege terms).
 */
const CONTROL_CATALOG: ControlCatalogEntry[] = [
  // ---------------- SOC 2 (Trust Services Criteria) ----------------
  { framework: "SOC 2", id: "CC1.1", title: "Ethics and integrity are demonstrated by board and management", keywords: ["ethics", "integrity", "tone at the top", "board", "code of conduct"] },
  { framework: "SOC 2", id: "CC6.1", title: "Logical and physical access prevents and detects unauthorized access", keywords: ["access", "unauthorized access", "logical access", "physical access", "authentication"] },
  { framework: "SOC 2", id: "CC6.2", title: "Users are registered and authenticated before accessing systems", keywords: ["user registration", "provisioning", "authentication", "onboarding", "account"] },
  { framework: "SOC 2", id: "CC6.3", title: "Role-based access and least privilege are enforced", keywords: ["least privilege", "role based access", "segregation of duties", "rbac", "privilege"] },
  { framework: "SOC 2", id: "CC6.6", title: "Logical access security protects against malware", keywords: ["malware", "malicious code", "antivirus", "endpoint protection"] },
  { framework: "SOC 2", id: "CC7.2", title: "System operations are monitored to detect deviations from expectations", keywords: ["monitoring", "anomaly", "detection", "alerting", "deviation"] },
  { framework: "SOC 2", id: "CC7.3", title: "Incidents are responded to, escalated, and communicated", keywords: ["incident response", "incident", "escalation", "response", "communication"] },
  { framework: "SOC 2", id: "CC8.1", title: "Changes to infrastructure and software are managed", keywords: ["change management", "change", "deployment", "development", "release"] },
  { framework: "SOC 2", id: "CC9.1", title: "Risk assessment identifies, analyzes, and responds to risk", keywords: ["risk assessment", "risk", "risk analysis", "mitigation"] },
  { framework: "SOC 2", id: "A1.2", title: "Availability commitments are supported by capacity and performance planning", keywords: ["availability", "capacity", "performance", "uptime", "redundancy"] },

  // ---------------- ISO 27001 (2022, Annex A) ----------------
  { framework: "ISO 27001", id: "A.5.1", title: "Policies for information security", keywords: ["policy", "information security policy", "management direction"] },
  { framework: "ISO 27001", id: "A.5.10", title: "Acceptable use of information and other associated assets", keywords: ["acceptable use", "asset use", "misuse"] },
  { framework: "ISO 27001", id: "A.5.15", title: "Access control", keywords: ["access control", "access rights", "authorization", "access"] },
  { framework: "ISO 27001", id: "A.5.25", title: "Assessment and decision on information security events", keywords: ["security event", "event assessment", "classification", "triage"] },
  { framework: "ISO 27001", id: "A.5.28", title: "Collection of evidence", keywords: ["evidence", "forensic", "admissibility"] },
  { framework: "ISO 27001", id: "A.5.33", title: "Information security during disruption", keywords: ["business continuity", "disruption", "continuity", "resilience"] },
  { framework: "ISO 27001", id: "A.5.34", title: "Protection of information systems during audit testing", keywords: ["audit testing", "penetration test", "audit"] },
  { framework: "ISO 27001", id: "A.6.7", title: "Remote working", keywords: ["remote work", "teleworking", "remote access", "work from home"] },
  { framework: "ISO 27001", id: "A.7.5", title: "Assessing information security risks", keywords: ["risk assessment", "risk treatment", "risk analysis", "risk"] },
  { framework: "ISO 27001", id: "A.8.1", title: "User endpoint devices", keywords: ["endpoint", "endpoint device", "device management", "mobile"] },
  { framework: "ISO 27001", id: "A.8.2", title: "Privileged access rights", keywords: ["privileged access", "admin", "administrator", "root", "privilege"] },
  { framework: "ISO 27001", id: "A.8.9", title: "Configuration management", keywords: ["configuration", "hardening", "baseline", "config"] },
  { framework: "ISO 27001", id: "A.8.12", title: "Prevention of information leakage", keywords: ["data loss", "leakage", "exfiltration", "dlp"] },
  { framework: "ISO 27001", id: "A.8.16", title: "Monitoring activities", keywords: ["monitoring", "supervision", "activity monitoring"] },
  { framework: "ISO 27001", id: "A.8.20", title: "Networks security", keywords: ["network security", "network", "firewall", "segmentation"] },
  { framework: "ISO 27001", id: "A.8.28", title: "Secure coding", keywords: ["secure coding", "secure development", "code review", "sdlc"] },

  // ---------------- NIS2 ----------------
  { framework: "NIS2", id: "Art.21(2)(a)", title: "Policies on risk analysis and information system security", keywords: ["risk analysis", "security policy", "risk", "policy"] },
  { framework: "NIS2", id: "Art.21(2)(b)", title: "Incident handling", keywords: ["incident handling", "incident response", "incident"] },
  { framework: "NIS2", id: "Art.21(2)(c)", title: "Business continuity, backup management and crisis management", keywords: ["business continuity", "backup", "crisis management", "disaster recovery"] },
  { framework: "NIS2", id: "Art.21(2)(d)", title: "Supply chain security", keywords: ["supply chain", "supplier", "vendor", "third party"] },
  { framework: "NIS2", id: "Art.21(2)(e)", title: "Security in acquisition, development and maintenance of networks", keywords: ["acquisition", "development", "maintenance", "lifecycle", "networks"] },
  { framework: "NIS2", id: "Art.21(2)(f)", title: "Policies to assess effectiveness of cybersecurity measures", keywords: ["effectiveness", "assessment", "evaluation", "audit"] },
  { framework: "NIS2", id: "Art.21(2)(g)", title: "Cyber hygiene practices and cybersecurity training", keywords: ["training", "awareness", "cyber hygiene", "education"] },
  { framework: "NIS2", id: "Art.21(2)(h)", title: "Cryptography and encryption", keywords: ["encryption", "cryptography", "ciphers"] },
  { framework: "NIS2", id: "Art.21(2)(i)", title: "Human resources security, access control and asset management", keywords: ["human resources", "access control", "asset management", "access"] },
  { framework: "NIS2", id: "Art.21(2)(j)", title: "Use of multi-factor authentication or continuous authentication", keywords: ["mfa", "multi factor", "two factor", "2fa", "authentication"] },
  { framework: "NIS2", id: "Art.23", title: "Reporting obligations for significant incidents", keywords: ["incident reporting", "notification", "significant incident", "report"] },

  // ---------------- GDPR ----------------
  { framework: "GDPR", id: "Art.5(1)(e)", title: "Storage limitation", keywords: ["storage limitation", "retention", "deletion", "data minimisation"] },
  { framework: "GDPR", id: "Art.5(1)(f)", title: "Integrity and confidentiality (security of processing)", keywords: ["security of processing", "confidentiality", "integrity", "processing"] },
  { framework: "GDPR", id: "Art.15", title: "Right of access by the data subject", keywords: ["right of access", "subject access", "data subject", "access request"] },
  { framework: "GDPR", id: "Art.17", title: "Right to erasure", keywords: ["erasure", "right to be forgotten", "deletion"] },
  { framework: "GDPR", id: "Art.25", title: "Data protection by design and by default", keywords: ["privacy by design", "by default", "data protection"] },
  { framework: "GDPR", id: "Art.28", title: "Processors and processing agreements", keywords: ["processor", "contract", "dpa", "processing agreement"] },
  { framework: "GDPR", id: "Art.30", title: "Records of processing activities", keywords: ["records of processing", "ropa", "register"] },
  { framework: "GDPR", id: "Art.32", title: "Security of processing", keywords: ["security of processing", "measures", "pseudonymisation", "encryption"] },
  { framework: "GDPR", id: "Art.33", title: "Notification of a personal data breach", keywords: ["breach notification", "personal data breach", "notification", "supervisory authority"] },
  { framework: "GDPR", id: "Art.35", title: "Data protection impact assessment", keywords: ["dpia", "impact assessment", "high risk", "pia"] },

  // ---------------- HIPAA (Security Rule) ----------------
  { framework: "HIPAA", id: "164.308(a)(1)(i)", title: "Security Management Process", keywords: ["security management", "risk analysis", "risk management", "sanctions"] },
  { framework: "HIPAA", id: "164.308(a)(1)(ii)(D)", title: "Information System Activity Review", keywords: ["activity review", "audit", "system activity"] },
  { framework: "HIPAA", id: "164.308(a)(2)", title: "Assigned Security Responsibility", keywords: ["security official", "responsibility", "security officer"] },
  { framework: "HIPAA", id: "164.308(a)(3)(i)", title: "Workforce Security", keywords: ["workforce", "personnel", "authorization", "supervision"] },
  { framework: "HIPAA", id: "164.308(a)(4)(i)", title: "Information Access Management", keywords: ["access management", "authorization", "access"] },
  { framework: "HIPAA", id: "164.308(a)(5)(i)", title: "Security Awareness and Training", keywords: ["training", "awareness", "workforce training"] },
  { framework: "HIPAA", id: "164.308(a)(6)(i)", title: "Security Incident Procedures", keywords: ["incident", "response", "procedures"] },
  { framework: "HIPAA", id: "164.308(a)(7)(i)", title: "Contingency Plan", keywords: ["contingency", "backup", "disaster recovery", "emergency"] },
  { framework: "HIPAA", id: "164.308(b)(1)", title: "Business Associate Contracts", keywords: ["business associate", "baa", "contract", "ba"] },
  { framework: "HIPAA", id: "164.312(a)(1)", title: "Access Control", keywords: ["access control", "unique user identification", "encryption"] },
  { framework: "HIPAA", id: "164.312(c)(1)", title: "Integrity", keywords: ["integrity", "modification", "alteration"] },
  { framework: "HIPAA", id: "164.312(e)(1)", title: "Transmission Security", keywords: ["transmission", "encryption", "in transit", "network"] },

  // ---------------- PCI DSS v4.0 ----------------
  { framework: "PCI DSS", id: "Req 1", title: "Install and maintain network security controls", keywords: ["firewall", "network security", "segmentation", "network"] },
  { framework: "PCI DSS", id: "Req 2", title: "Apply secure configurations to all system components", keywords: ["configuration", "hardening", "defaults", "config"] },
  { framework: "PCI DSS", id: "Req 3", title: "Protect stored account data", keywords: ["stored data", "encryption at rest", "cardholder data", "pan"] },
  { framework: "PCI DSS", id: "Req 4", title: "Protect cardholder data with strong cryptography during transmission", keywords: ["transmission", "encryption", "tls", "in transit"] },
  { framework: "PCI DSS", id: "Req 5", title: "Protect all systems and networks from malicious software", keywords: ["malware", "antivirus", "anti malware", "software"] },
  { framework: "PCI DSS", id: "Req 6", title: "Develop and maintain secure systems and software", keywords: ["secure coding", "development", "patching", "vulnerability"] },
  { framework: "PCI DSS", id: "Req 7", title: "Restrict access to system components by business need to know", keywords: ["need to know", "least privilege", "access", "authorization"] },
  { framework: "PCI DSS", id: "Req 8", title: "Identify users and authenticate access to system components", keywords: ["authentication", "mfa", "credentials", "passwords"] },
  { framework: "PCI DSS", id: "Req 9", title: "Restrict physical access to cardholder data", keywords: ["physical access", "physical security", "facility"] },
  { framework: "PCI DSS", id: "Req 10", title: "Log and monitor all access to system components and cardholder data", keywords: ["logging", "audit log", "monitoring", "log"] },
  { framework: "PCI DSS", id: "Req 11", title: "Test security of systems and networks regularly", keywords: ["testing", "vulnerability scan", "penetration", "scan"] },
  { framework: "PCI DSS", id: "Req 12", title: "Support information security with organizational policies and programs", keywords: ["policy", "program", "risk assessment", "governance"] },
];

/** An evidence type in the built-in catalog with freshness hints. */
interface EvidenceTypeEntry {
  title: string;
  type: string;
  freshness: string;
  keywords: string[];
}

/**
 * Evidence-type catalog. `freshness` hints when the artifact should be
 * refreshed; `keywords` drive deterministic matching to control titles.
 */
const EVIDENCE_CATALOG: EvidenceTypeEntry[] = [
  { title: "Policy document", type: "policy document", freshness: "Review annually or on material change", keywords: ["policy", "procedure", "standard", "document", "guideline"] },
  { title: "Configuration snapshot", type: "config snapshot", freshness: "Capture on change and at least quarterly", keywords: ["config", "configuration", "hardening", "baseline", "settings"] },
  { title: "Log export", type: "log export", freshness: "Export quarterly or on incident", keywords: ["log", "audit log", "logging", "activity", "monitoring"] },
  { title: "Training record", type: "training record", freshness: "Refresh annually", keywords: ["training", "awareness", "completion", "education", "certification"] },
  { title: "Scan report", type: "scan report", freshness: "Re-scan at least quarterly", keywords: ["scan", "vulnerability", "pentest", "penetration", "test"] },
  { title: "Access review record", type: "access review record", freshness: "Conduct reviews quarterly", keywords: ["access review", "permission", "entitlement", "user access", "revocation"] },
  { title: "Risk assessment report", type: "risk assessment report", freshness: "Annual or on material change", keywords: ["risk assessment", "risk analysis", "risk", "threat"] },
  { title: "Incident report", type: "incident report", freshness: "Within 30 days of incident closure", keywords: ["incident", "breach", "response", "escalation"] },
  { title: "Vendor assessment", type: "vendor assessment", freshness: "Re-assess annually", keywords: ["vendor", "supplier", "third party", "supply chain", "subprocessor"] },
  { title: "Contract / DPA", type: "contract / dpa", freshness: "On renewal or material change", keywords: ["contract", "dpa", "processor", "agreement", "baa"] },
];

/**
 * Built-in policy templates keyed by topic fingerprints. The engine picks
 * the best-matching template deterministically and falls back to GENERIC.
 */
interface PolicyTemplate {
  topic: string;
  keywords: string[];
  purpose: string;
  scope: string;
  sections: PolicySection[];
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    topic: "access control",
    keywords: ["access", "authentication", "mfa", "password", "credential", "identity", "privilege", "login", "account"],
    purpose:
      "Define how access to systems, applications, and data is granted, reviewed, and revoked so that confidentiality, integrity, and availability are protected.",
    scope:
      "All employees, contractors, and third parties, and all systems, applications, and data repositories within the organization's environment, including remote and privileged access.",
    sections: [
      { heading: "Account Provisioning & Authentication", body: "Accounts must be provisioned only after approval, and users must be uniquely identified and authenticated before any access is granted. Authentication should use strong, MFA-protected credentials wherever supported." },
      { heading: "Least Privilege & Role-Based Access", body: "Access rights must follow the principle of least privilege and be granted on a role-based, business-need basis. Segregation of duties must be maintained for sensitive functions." },
      { heading: "Access Reviews", body: "Access entitlements must be reviewed at least quarterly by data owners. Stale, unused, or excessive rights must be removed promptly." },
      { heading: "Privileged Access", body: "Privileged accounts require additional controls, including dedicated accounts, MFA, and heightened monitoring. Standing privileges should be minimized or time-bound." },
      { heading: "Revocation & Offboarding", body: "Access must be revoked within 24 hours of employment termination or role change. Confirmation of revocation must be documented and retained." },
    ],
  },
  {
    topic: "incident response",
    keywords: ["incident", "breach", "response", "containment", "escalation", "cyber attack", "compromise"],
    purpose:
      "Establish a consistent, repeatable process for detecting, responding to, containing, and recovering from security incidents with minimal business impact.",
    scope:
      "All security events and suspected incidents involving organization information assets, personnel, facilities, or third parties acting on its behalf.",
    sections: [
      { heading: "Detection & Reporting", body: "All personnel must report suspected security incidents immediately through the designated channel. Automated monitoring and alerting feed the detection pipeline." },
      { heading: "Triage & Escalation", body: "The incident response team must triage each event against defined severity levels and escalate according to the escalation matrix, including regulatory notification where required." },
      { heading: "Containment, Eradication & Recovery", body: "Containment strategies must be applied to limit damage, root causes removed, and systems restored in priority order based on criticality." },
      { heading: "Communication", body: "Internal and external communications, including breach notifications to authorities and affected parties, must follow the approved communication plan." },
      { heading: "Post-Incident Review", body: "After every significant incident, a lessons-learned review must document root cause, response effectiveness, and improvement actions." },
    ],
  },
  {
    topic: "data protection",
    keywords: ["data protection", "privacy", "personal data", "gdpr", "pii", "data subject", "processing"],
    purpose:
      "Protect personal data and ensure that processing is lawful, fair, transparent, and compliant with applicable privacy regulations such as the GDPR.",
    scope:
      "All personal data processed by the organization, regardless of format or location, including data of customers, employees, and business partners.",
    sections: [
      { heading: "Data Inventory & Classification", body: "The organization must maintain records of processing activities identifying data categories, purposes, and lawful bases for processing." },
      { heading: "Lawful Processing", body: "Personal data may only be processed on a valid lawful basis, with privacy-by-design and privacy-by-default principles applied to new products and processes." },
      { heading: "Data Subject Rights", body: "Requests to exercise data subject rights (access, rectification, erasure, portability, objection) must be handled within applicable legal timeframes." },
      { heading: "Breach Notification", body: "Personal data breaches must be assessed and notified to the supervisory authority within 72 hours when required, and to affected individuals when risk is high." },
      { heading: "Retention & Deletion", body: "Personal data must not be kept longer than necessary. Retention schedules and secure deletion procedures must be documented and enforced." },
    ],
  },
  {
    topic: "backup and business continuity",
    keywords: ["backup", "business continuity", "disaster recovery", "rto", "rpo", "recovery", "crisis"],
    purpose:
      "Ensure that critical data and systems can be recovered within defined objectives following disruption, loss, or disaster.",
    scope:
      "All critical information assets, systems, and processes required to sustain operations, including data stored with cloud and third-party providers.",
    sections: [
      { heading: "Backup Schedules", body: "Backups must be executed according to defined schedules, with frequency aligned to the criticality of each data set and documented recovery objectives." },
      { heading: "Recovery Objectives", body: "Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) must be defined per system tier and reviewed at least annually." },
      { heading: "Storage & Encryption", body: "Backups must be stored separately from primary environments and protected with encryption and access controls. Offsite or isolated copies are required." },
      { heading: "Testing & Validation", body: "Backup restoration must be tested at least quarterly and full business continuity exercises conducted annually, with results documented and remediated." },
      { heading: "Crisis Management", body: "A crisis management team and communication plan must be activated during major disruptions, with defined roles, responsibilities, and decision authority." },
    ],
  },
  {
    topic: "security training",
    keywords: ["training", "awareness", "education", "phishing", "learning", "onboarding"],
    purpose:
      "Build a security-aware culture by providing role-based training and ongoing awareness communications to all personnel.",
    scope:
      "All employees, contractors, and temporary personnel, with role-specific depth for technical, privileged, and management functions.",
    sections: [
      { heading: "Onboarding Training", body: "All new personnel must complete security awareness training before receiving system access, covering core policies and reporting channels." },
      { heading: "Annual & Role-Based Training", body: "Refresher training must be delivered at least annually, supplemented by role-based modules for developers, admins, and incident responders." },
      { heading: "Phishing & Awareness Campaigns", body: "Regular simulated phishing and awareness campaigns must measure susceptibility and reinforce secure behaviors without punitive outcomes." },
      { heading: "Tracking & Compliance", body: "Training completion must be tracked per person and per role; non-completion must trigger follow-up and, where appropriate, access restrictions." },
    ],
  },
  {
    topic: "vendor management",
    keywords: ["vendor", "supplier", "third party", "supply chain", "outsourcing", "subprocessor", "procurement"],
    purpose:
      "Manage third-party and supply chain risk through structured assessment, contractual security requirements, and ongoing monitoring.",
    scope:
      "All vendors, suppliers, subprocessors, and business partners that access, process, or host organization data or provide supporting services.",
    sections: [
      { heading: "Vendor Risk Assessment", body: "Vendors must be risk-assessed before engagement based on data sensitivity, access level, and criticality, with reassessment at least annually." },
      { heading: "Contractual Security Requirements", body: "Contracts must include security and data protection clauses, including data processing agreements where personal data is involved, and audit rights." },
      { heading: "Sub-processor Management", body: "Sub-processor changes must be disclosed and approved in advance, with obligations flowed down in writing." },
      { heading: "Ongoing Monitoring", body: "Vendor security posture must be monitored through attestations, reviews, and incident notifications, with performance reviewed against SLAs." },
      { heading: "Offboarding & Data Return", body: "On termination, vendors must return or destroy organization data and confirm deletion, with access revoked and accounted for." },
    ],
  },
  {
    topic: "risk management",
    keywords: ["risk", "risk assessment", "risk treatment", "risk register", "risk appetite", "threat"],
    purpose:
      "Define a structured approach to identify, assess, treat, and monitor information security and compliance risks across the organization.",
    scope:
      "All information assets, processes, projects, and third-party relationships that could expose the organization to security or compliance risk.",
    sections: [
      { heading: "Risk Identification", body: "Risks must be identified through structured threat assessments, vulnerability findings, incident learnings, and regulatory change monitoring." },
      { heading: "Risk Assessment & Scoring", body: "Risks must be scored using defined likelihood and impact criteria, producing consistent inherent and residual risk ratings." },
      { heading: "Risk Treatment", body: "Each risk must have an explicit treatment decision (mitigate, transfer, accept, or avoid), approved by the appropriate owner." },
      { heading: "Risk Register & Ownership", body: "A central risk register must track all risks with named owners, treatment plans, and due dates, reviewed by management at least quarterly." },
      { heading: "Periodic Review", body: "The risk landscape and the effectiveness of controls must be re-evaluated at least annually or upon material change." },
    ],
  },
  {
    topic: "change management",
    keywords: ["change", "change management", "deployment", "release", "patch", "upgrade", "configuration change"],
    purpose:
      "Ensure that changes to systems, applications, and infrastructure are assessed, approved, tested, and documented before deployment.",
    scope:
      "All production systems and configurations, including software releases, infrastructure changes, patches, and emergency fixes.",
    sections: [
      { heading: "Change Request & Approval", body: "All changes must be logged with business justification and approved by the designated change authority based on risk and impact classification." },
      { heading: "Testing & Validation", body: "Changes must be tested in appropriate environments and validated against acceptance criteria, including regression and security testing." },
      { heading: "Deployment & Rollback", body: "Deployments must follow defined windows and procedures with a tested rollback plan ready for immediate execution if needed." },
      { heading: "Emergency Changes", body: "Emergency changes must follow a reduced approval path, be documented post-change, and undergo retrospective review within a defined period." },
      { heading: "Post-Change Review", body: "Deployments must be reviewed for effectiveness and unintended effects, with lessons fed back into the change process." },
    ],
  },
  {
    topic: "acceptable use",
    keywords: ["acceptable use", "misuse", "internet", "email", "personal use", "assets"],
    purpose:
      "Define acceptable use of organization information assets to reduce misuse, legal exposure, and security risk.",
    scope:
      "All organization-owned or organization-managed devices, networks, accounts, and data, and all personnel granted access to them.",
    sections: [
      { heading: "Permitted Use", body: "Organization assets are provided for business purposes. Incidental personal use is permitted where it does not interfere with duties or introduce risk." },
      { heading: "Prohibited Activities", body: "Unauthorized access, data exfiltration, harassment, illegal activity, and circumvention of security controls are strictly prohibited." },
      { heading: "Personal Use", body: "Personal use must be minimal, lawful, and must not consume excessive resources or expose the organization to liability." },
      { heading: "Monitoring", body: "The organization may monitor use of its assets to the extent permitted by law, with notice provided in advance." },
      { heading: "Non-Compliance", body: "Violations may result in disciplinary action up to and including termination of employment or contract and legal action." },
    ],
  },
  {
    topic: "remote work",
    keywords: ["remote work", "telework", "work from home", "home office", "remote access", "mobile"],
    purpose:
      "Establish secure practices for personnel working outside organization premises so that productivity is not achieved at the expense of security.",
    scope:
      "All personnel working remotely, all remote access channels, and all devices used for remote work, including personal devices where permitted.",
    sections: [
      { heading: "Device Requirements", body: "Remote devices must run supported operating systems with encryption, patching, and endpoint protection enabled before accessing organization resources." },
      { heading: "Connectivity & VPN", body: "Remote connections must traverse the approved VPN or zero-trust access path. Split tunneling must be restricted for sensitive workloads." },
      { heading: "Data Handling", body: "Organization data must not be stored on personal, non-approved devices. Printing and transfer of sensitive data remotely require additional safeguards." },
      { heading: "Physical Safeguards", body: "Remote workers must protect devices and screens from unauthorized viewing and secure physical workspace where sensitive work occurs." },
      { heading: "Support & Reporting", body: "Remote workers must use approved support channels and report loss, theft, or suspected compromise of devices immediately." },
    ],
  },
];

/** Generic fallback template used when no topic template matches. */
const GENERIC_TEMPLATE: PolicyTemplate = {
  topic: "generic",
  keywords: [],
  purpose:
    "Establish the organization's baseline expectations for protecting information assets and meeting applicable compliance obligations.",
  scope:
    "All employees, contractors, and third parties who access or process organization information assets, and all systems and data in scope.",
  sections: [
    { heading: "Policy Statement", body: "The organization is committed to protecting the confidentiality, integrity, and availability of its information assets and complying with all applicable laws, regulations, and contractual obligations." },
    { heading: "Responsibilities", body: "Management is accountable for implementing this policy; every individual with access to organization assets is responsible for adhering to it and reporting suspected violations." },
    { heading: "Enforcement & Exceptions", body: "Exceptions require documented approval from the designated owner. Violations are handled according to the organization's disciplinary and legal procedures." },
    { heading: "Review", body: "This policy is reviewed at least annually and updated upon material changes to the organization, its technology, or its regulatory obligations." },
  ],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalize a framework label to a stable key for comparisons. */
const normalizeKey = (value: string | undefined | null): string =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** True when `text` contains `needle` (case-insensitive). */
const hasText = (text: string, needle: string): boolean =>
  text.length > 0 && needle.length > 0 && text.includes(needle);

/** Split a string into lowercase alphanumeric tokens. */
const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);

/**
 * Strength of a single keyword match against an input string
 * (deterministic, tiered so phrase-verbatim beats bare token overlap):
 *   1.0  - keyword appears verbatim (case-insensitive) in the input, or is a
 *          single-token keyword that appears as a token of the input;
 *   0.7  - multi-token keyword where ALL of its tokens appear in the input;
 *   0.35 - multi-token keyword where AT LEAST ONE of its tokens appears.
 * Returns 0 when nothing matches.
 */
const isKeywordHit = (text: string, inputTokens: Set<string>, keyword: string): number => {
  const k = keyword.toLowerCase();
  const kwTokens = tokenize(k);
  if (kwTokens.length === 0) return 0;
  if (hasText(text, k)) return 1;
  const present = kwTokens.filter((t) => inputTokens.has(t)).length;
  if (present === 0) return 0;
  if (kwTokens.length === 1) return 1;
  if (present === kwTokens.length) return 0.7;
  return 0.35;
};

/**
 * Compute a 0-100 keyword hit ratio for an entry against an input string.
 * Sums per-keyword strengths (isKeywordHit) and normalizes by keyword count.
 */
const scoreByKeywords = (input: string, keywords: string[]): number => {
  if (!input || keywords.length === 0) return 0;
  const text = input.toLowerCase();
  const inputTokens = new Set(tokenize(input));
  let score = 0;
  for (const kw of keywords) score += isKeywordHit(text, inputTokens, kw);
  return Math.min(100, Math.floor((100 * score) / keywords.length));
};

/** Deterministic comparator: score desc, then framework, then control id. */
const compareMatches = (a: AutoMapMatch, b: AutoMapMatch): number => {
  if (b.score !== a.score) return b.score - a.score;
  if (a.framework !== b.framework) return a.framework < b.framework ? -1 : 1;
  if (a.controlId !== b.controlId) return a.controlId < b.controlId ? -1 : 1;
  return 0;
};

/** Capitalize the first letter of a lower-case label for titles. */
const humanizeTopic = (topic: string): string => {
  const cleaned = topic.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Information Security";
  return cleaned
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
};

/** Resolve framework entries from the KB (all frameworks when unset). */
const catalogForFrameworks = (frameworks: string[] | undefined): ControlCatalogEntry[] => {
  if (!frameworks || frameworks.length === 0) return CONTROL_CATALOG;
  const keys = new Set(frameworks.map((f) => normalizeKey(f)).filter(Boolean));
  if (keys.size === 0) return CONTROL_CATALOG;
  return CONTROL_CATALOG.filter((entry) => keys.has(normalizeKey(entry.framework)));
};

/** Human-readable rationale for an autoMap match. */
const buildRationale = (requirement: string, entry: ControlCatalogEntry): string => {
  const text = requirement.toLowerCase();
  const inputTokens = new Set(tokenize(requirement));
  const matched = entry.keywords.filter((kw) => isKeywordHit(text, inputTokens, kw) > 0);
  if (matched.length === 0) return "General relevance to the stated requirement.";
  return `Matched keywords: ${matched.slice(0, 4).join(", ")}${matched.length > 4 ? ", …" : ""}.`;
};

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Draft a policy document from a topic (and optional framework/org name).
 * Never throws; returns EMPTY_POLICY_DRAFT for empty/invalid input.
 */
export const draftPolicyDraft = (input: DraftPolicyInput): PolicyDraft => {
  try {
    const topic = (input?.topic ?? "").trim();
    if (!topic) return { ...EMPTY_POLICY_DRAFT };

    const framework = (input?.framework ?? "").trim();
    const orgName = (input?.orgName ?? "").trim();

    // Pick the best-matching template (deterministic; GENERIC as fallback).
    let template = GENERIC_TEMPLATE;
    let bestScore = 0;
    for (const candidate of POLICY_TEMPLATES) {
      const score = scoreByKeywords(topic, candidate.keywords);
      if (score > bestScore) {
        bestScore = score;
        template = candidate;
      }
    }

    const title = `${orgName ? `${orgName} — ` : ""}${humanizeTopic(topic)} Policy`;

    // Attach controls: framework catalog when requested, otherwise the
    // topic-matched controls from the full KB (stable ordering).
    let controls: PolicyControlRef[];
    if (framework) {
      const normalized = normalizeKey(framework);
      controls = CONTROL_CATALOG.filter(
        (entry) => normalizeKey(entry.framework) === normalized
      )
        .slice(0, 8)
        .map((entry) => ({ code: entry.id, title: entry.title }));
    } else {
      controls = CONTROL_CATALOG
        .map((entry) => ({
          entry,
          score: scoreByKeywords(topic, entry.keywords),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) =>
          b.score !== a.score
            ? b.score - a.score
            : a.entry.framework !== b.entry.framework
              ? a.entry.framework < b.entry.framework
                ? -1
                : 1
              : a.entry.id < b.entry.id
                ? -1
                : 1
        )
        .slice(0, 6)
        .map((c) => ({ code: c.entry.id, title: c.entry.title }));
    }

    return {
      title,
      purpose: template.purpose,
      scope: orgName ? `Applies to ${orgName}. ${template.scope}` : template.scope,
      sections: template.sections,
      controls,
      reviewCadence: "Annually, or within 30 days of a material change.",
      disclaimer:
        "This draft was generated automatically by the ComplianceOS AI Copilot from its built-in knowledge base. It is a starting point, not legal advice — review, tailor, and approve it with your counsel before adoption.",
    };
  } catch {
    // Absolute safety net — the engine must never throw.
    return { ...EMPTY_POLICY_DRAFT };
  }
};

/**
 * Suggest evidence artifacts for a control. Deterministic, built-in only.
 * Never throws; returns EMPTY_EVIDENCE_SUGGESTIONS for empty input.
 */
export const suggestEvidenceForControl = (input: SuggestEvidenceInput): EvidenceSuggestions => {
  try {
    const controlTitle = (input?.controlTitle ?? "").trim();
    if (!controlTitle) return { ...EMPTY_EVIDENCE_SUGGESTIONS };

    const scored = EVIDENCE_CATALOG
      .map((entry) => ({ entry, score: scoreByKeywords(controlTitle, entry.keywords) }))
      .sort((a, b) => b.score - a.score);

    const matched = scored.filter((s) => s.score > 0);
    // Fall back to the first catalog entries in stable order when nothing
    // matched, so the endpoint always returns useful suggestions.
    const selected = (matched.length > 0 ? matched : scored).slice(0, 6);

    const evidence = selected.map(({ entry }) => ({
      title: entry.title,
      type: entry.type,
      description: `Collect a ${entry.type} demonstrating compliance for "${controlTitle}".`,
      freshness: entry.freshness,
    }));

    return { evidence, source: "builtin" };
  } catch {
    // Absolute safety net — the engine must never throw.
    return { ...EMPTY_EVIDENCE_SUGGESTIONS };
  }
};

/**
 * Map a free-text requirement onto the built-in control KB.
 * Scores are 0-100 keyword hit ratios; matches are sorted deterministically
 * and the top match is returned as bestMatch. Never throws.
 */
export const autoMapRequirement = (input: AutoMapInput): AutoMapResult => {
  try {
    const requirement = (input?.requirement ?? "").trim();
    if (!requirement) return { ...EMPTY_AUTO_MAP_RESULT };

    const candidates = catalogForFrameworks(input?.frameworks);
    const matches: AutoMapMatch[] = candidates
      .map((entry) => ({
        framework: entry.framework,
        controlId: entry.id,
        controlTitle: entry.title,
        score: scoreByKeywords(requirement, entry.keywords),
        rationale: buildRationale(requirement, entry),
      }))
      .filter((m) => m.score > 0)
      .sort(compareMatches)
      .slice(0, 10);

    return {
      matches,
      bestMatch: matches.length > 0 ? matches[0] : null,
    };
  } catch {
    // Absolute safety net — the engine must never throw.
    return { ...EMPTY_AUTO_MAP_RESULT };
  }
};
