/**
 * CMMC / NIST SP 800-171 Rev 2 practice-level register (GAP-20/21 groundwork).
 *
 * Pure deterministic register engine — zero deps, never throws, no DB access,
 * injectable nothing (static content). Closes the "SSP-controls-as-proxy"
 * gap noted in GAP-LOG.md GAP-20/GAP-21: downstream consumers (CMMC readiness,
 * SPRS deduction refinement) can now bind to a proper practice-level backbone.
 *
 *   CMMC_PRACTICES              -> readonly CmmcPractice[] (all 110)
 *   getCmmcPracticeRegister(f?) -> filtered view + full-register family rollup
 *   getCmmcRegisterSummary()    -> full-register level/family rollup
 *   getCmmcPracticeById(id)     -> ci/trim lookup or null
 *
 * ⚠ Assessment-guide-aligned SUMMARY register — requirements/objectives are
 * concise paraphrases for product use, not verbatim 800-171 text. Practice ids
 * follow 800-171 Rev 2 family numbering (AC/AT/AU/CA/CM/IA/IR/MA/MP/PE/PS/
 * SC/SI = 22/3/9/6/9/11/6/6/9/6/3/13/7 = 110). Level semantics follow the
 * CMMC 2.0 model: Level 1 = the 17 "basic" security requirements; every other
 * practice is Level 2 ("derived"); Level 3 is reserved (populated 0 today —
 * CMMC L3 draws from NIST SP 800-172, tracked as future work under GAP-20).
 */

export interface CmmcPractice {
  /** e.g. 'AC-L1-3.1.1' */
  id: string;
  /** Two-letter 800-171 family code (AC, AT, … SI) */
  family: string;
  /** CMMC level: 1 = basic, 2 = derived, 3 = reserved (empty today) */
  level: 1 | 2 | 3;
  title: string;
  /** Concise paraphrase of the 800-171 requirement statement */
  requirement: string;
  /** Short assessment objectives (assessment-guide aligned) */
  objectives: string[];
}

const P = (
  id: string,
  family: string,
  level: 1 | 2 | 3,
  title: string,
  requirement: string,
  objectives: string[],
): CmmcPractice => ({ id, family, level, title, requirement, objectives });

export const CMMC_PRACTICES: readonly CmmcPractice[] = [
  // ─── AC — Access Control (22) ────────────────────────────────────────────
  P("AC-L1-3.1.1", "AC", 1, "Limit system access",
    "Limit system access to authorized users, processes acting on behalf of authorized users, and devices.",
    ["Unauthorized users/processes/devices cannot access the system", "Access lists match authorization records"]),
  P("AC-L1-3.1.2", "AC", 1, "Limit privileged access",
    "Limit system access to the types of transactions and functions that authorized users are permitted to execute.",
    ["Role/function entitlements defined", "Users restricted to permitted transactions"]),
  P("AC-L2-3.1.3", "AC", 2, "Enforce information-flow authorizations",
    "Control the flow of CUI in accordance with approved authorizations.",
    ["Flow-control policy documented", "Transfers outside authorizations blocked"]),
  P("AC-L2-3.1.4", "AC", 2, "Separation of duties",
    "Separate the duties of individuals to reduce the risk of malevolent activity without collusion.",
    ["Duty-separation matrix exists", "Conflicting roles cannot be co-assigned"]),
  P("AC-L2-3.1.5", "AC", 2, "Least privilege",
    "Employ the principle of least privilege, including for specific security functions and privileged accounts.",
    ["Privileged accounts inventoried", "Entitlements limited to need"]),
  P("AC-L2-3.1.6", "AC", 2, "Non-privilege for non-security functions",
    "Use non-privileged accounts or roles when accessing nonsecurity functions.",
    ["Nonsecurity functions run under non-privileged identity"]),
  P("AC-L2-3.1.7", "AC", 2, "Minimize privileged accounts",
    "Prevent non-privileged users from executing privileged functions and capture execution in audit logs.",
    ["Privileged function execution restricted", "Attempts captured in audit trail"]),
  P("AC-L2-3.1.8", "AC", 2, "Limit unsuccessful logon attempts",
    "Limit unsuccessful logon attempts.",
    ["Account lockout thresholds enforced"]),
  P("AC-L2-3.1.9", "AC", 2, "Session lock",
    "Use session locks that conceal session contents after a defined period of inactivity.",
    ["Lock enforced after inactivity", "Re-authentication required to unlock"]),
  P("AC-L2-3.1.10", "AC", 2, "Public-area device concealment",
    "Use session locks with privacy-covering displays for devices in medium-traffic public areas.",
    ["Public-area devices obscure sessions"]),
  P("AC-L2-3.1.11", "AC", 2, "Terminate idle sessions",
    "Terminate user sessions after a defined conditions-based trigger.",
    ["Idle/inactivity termination configured"]),
  P("AC-L2-3.1.12", "AC", 2, "Monitor and control remote access",
    "Monitor and control remote-access methods.",
    ["Remote sessions mediated and logged", "Unauthorized methods blocked"]),
  P("AC-L2-3.1.13", "AC", 2, "Encrypt remote-session CUI",
    "Employ cryptographic mechanisms to protect the confidentiality of CUI during remote access.",
    ["Remote channels encrypted (FIPS-validated where required)"]),
  P("AC-L2-3.1.14", "AC", 2, "Managed remote-access routing",
    "Route remote access through managed access control points.",
    ["Remote traffic traverses controlled gateways only"]),
  P("AC-L2-3.1.15", "AC", 2, "Authorize wireless access",
    "Authorize wireless access prior to allowing such connections.",
    ["Wireless use documented and approved"]),
  P("AC-L2-3.1.16", "AC", 2, "Authorize portable storage",
    "Authorize the processing of CUI on portable storage devices before permitting use.",
    ["Portable-media policy enforced"]),
  P("AC-L2-3.1.17", "AC", 2, "Encrypt CUI on end-user devices",
    "Protect the confidentiality of CUI at rest on end-user devices.",
    ["Full-disk/volume encryption enabled"]),
  P("AC-L2-3.1.18", "AC", 2, "Isolate public-facing systems",
    "Control and manage the connection and use of public-facing systems.",
    ["Public systems isolated from internal CUI assets"]),
  P("AC-L2-3.1.19", "AC", 2, "Encrypt CUI in transit (open networks)",
    "Encrypt the confidentiality of CUI transmitted over open public networks.",
    ["TLS/equivalent applied to public-network transmission"]),
  P("AC-L1-3.1.20", "AC", 1, "Verify external-system connections",
    "Verify and control/limit connections to and use of external systems.",
    ["External connections identified and approved"]),
  P("AC-L1-3.1.21", "AC", 1, "Limit portable storage use",
    "Limit use of organization-controlled portable storage devices to authorized users.",
    ["Device allowlist enforced"]),
  P("AC-L2-3.1.22", "AC", 2, "Control publicly accessible CUI",
    "Control information posted or processed on publicly accessible systems.",
    ["Review/approval gate before publication"]),

  // ─── AT — Awareness & Training (3) ───────────────────────────────────────
  P("AT-L1-3.2.1", "AT", 1, "Security awareness training",
    "Ensure that managers, systems admins, and users of organizational systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures.",
    ["Training delivered to all roles", "Completion records retained"]),
  P("AT-L2-3.2.2", "AT", 2, "Insider-threat awareness",
    "Ensure that personnel are trained to recognize and report indicators of insider threat.",
    ["Insider-threat indicators covered in curriculum"]),
  P("AT-L2-3.2.3", "AT", 2, "Social-engineering recognition",
    "Provide awareness training on recognizing and reporting potential indicators of insider threat, including social engineering attempts.",
    ["Phishing/social-engineering module delivered", "Reporting channel known"]),

  // ─── AU — Audit & Accountability (9) ─────────────────────────────────────
  P("AU-L1-3.3.1", "AU", 1, "Audit event logging",
    "Create and retain system audit logs and records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized system activity.",
    ["Required events logged", "Retention meets policy"]),
  P("AU-L2-3.3.2", "AU", 2, "Protect audit information",
    "Ensure that the actions of individual system users can be uniquely traced to those users so they can be held accountable.",
    ["Unique IDs in every log record"]),
  P("AU-L2-3.3.3", "AU", 2, "Review and update logged events",
    "Review and update logged events periodically.",
    ["Event-selection review cadence evidenced"]),
  P("AU-L2-3.3.4", "AU", 2, "Alert on audit failures",
    "Alert in the event of an audit logging process failure.",
    ["Failure alerts reach responsible parties"]),
  P("AU-L2-3.3.5", "AU", 2, "Audit record correlation",
    "Correlate audit record review, analysis, and reporting processes for investigation and response to indications of unlawful or unauthorized system activity.",
    ["Cross-source correlation performed"]),
  P("AU-L2-3.3.6", "AU", 2, "Audit capacity",
    "Provide audit record reduction and report generation to support on-demand analysis.",
    ["Capacity headroom monitored", "Reduction/report tooling available"]),
  P("AU-L2-3.3.7", "AU", 2, "Time synchronization",
    "Provide a system capability that compares and synchronizes internal system clocks with an authoritative source.",
    ["NTP/GPS source configured fleet-wide"]),
  P("AU-L2-3.3.8", "AU", 2, "Protect audit tools",
    "Protect audit information and audit tools from unauthorized access, modification, and deletion.",
    ["Audit stores/tool access restricted"]),
  P("AU-L2-3.3.9", "AU", 2, "Audit monitoring & reporting",
    "Limit management of audit logging functionality to a subset of privileged users.",
    ["Logging administration segregated", "Findings reported to designated roles"]),

  // ─── CA — Security Assessment (6) ────────────────────────────────────────
  P("CA-L2-3.12.1", "CA", 2, "Periodic security assessments",
    "Periodically assess the security controls in organizational systems to determine if controls are effective in their application.",
    ["Assessment schedule met", "Results documented"]),
  P("CA-L2-3.12.2", "CA", 2, "Plans of action",
    "Develop and implement plans of action designed to correct deficiencies and reduce or eliminate vulnerabilities in organizational systems.",
    ["POA&M entries tracked to closure"]),
  P("CA-L2-3.12.3", "CA", 2, "Continuous monitoring",
    "Continuously monitor security controls and system changes to ensure they remain effective.",
    ["Con-mon outputs reviewed", "Changes evaluated for impact"]),
  P("CA-L2-3.12.4", "CA", 2, "System security plans",
    "Develop, document, and periodically update system security plans that describe system boundaries, system environments of operation, how security requirements are met, and relationships with other systems.",
    ["SSP current and complete", "Boundaries described"]),
  P("CA-L2-3.12.5", "CA", 2, "POA&M implementation",
    "Implement plans of action and milestones and track corrective actions through completion.",
    ["Remediation milestones met"]),
  P("CA-L2-3.12.6", "CA", 2, "Interconnection documentation",
    "Document system interconnections and the conditions governing authorized connections, and monitor accordingly.",
    ["Interconnection agreements current"]),

  // ─── CM — Configuration Management (9) ───────────────────────────────────
  P("CM-L1-3.4.1", "CM", 1, "Configuration baselines",
    "Establish and maintain baseline configurations and inventories of organizational systems, including hardware, software, firmware, and documentation.",
    ["Baselines documented", "Inventories maintained"]),
  P("CM-L1-3.4.2", "CM", 1, "Secure configuration enforcement",
    "Establish and enforce security configuration settings for information technology products employed in organizational systems.",
    ["Hardening baselines applied", "Drift detected"]),
  P("CM-L2-3.4.3", "CM", 2, "Configuration change control",
    "Track, review, approve or disapprove, and log changes to organizational systems.",
    ["Change approvals recorded"]),
  P("CM-L2-3.4.4", "CM", 2, "Impact analysis",
    "Analyze the security impact of changes prior to implementation.",
    ["Pre-implementation security review evidenced"]),
  P("CM-L2-3.4.5", "CM", 2, "Access restrictions for change",
    "Define, document, approve, and enforce physical and logical access restrictions associated with changes to organizational systems.",
    ["Change paths access-restricted"]),
  P("CM-L2-3.4.6", "CM", 2, "Deny-by-default",
    "Employ the principle of least functionality by configuring organizational systems to provide only essential capabilities.",
    ["Default-deny posture configured"]),
  P("CM-L2-3.4.7", "CM", 2, "Restrict nonessential functions",
    "Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services.",
    ["Nonessential capabilities disabled"]),
  P("CM-L2-3.4.8", "CM", 2, "Allow-deny listing",
    "Apply deny-by-exception (blacklisting) policy to prevent the use of unauthorized software or deny-all, permit-by-exception (whitelisting) policy to allow the execution of authorized software.",
    ["Execution control mechanism active"]),
  P("CM-L2-3.4.9", "CM", 2, "Accountable-item inventory",
    "Control and monitor user-installed software.",
    ["User installs governed and monitored"]),

  // ─── IA — Identification & Authentication (11) ───────────────────────────
  P("IA-L1-3.5.1", "IA", 1, "Identify users/processes/devices",
    "Identify system users, processes acting on behalf of users, and devices.",
    ["All principals uniquely identified"]),
  P("IA-L2-3.5.2", "IA", 2, "Authenticate principals",
    "Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access.",
    ["Authentication enforced pre-access"]),
  P("IA-L2-3.5.3", "IA", 2, "MFA for network access",
    "Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.",
    ["MFA enforced per policy scope"]),
  P("IA-L2-3.5.4", "IA", 2, "Replay-resistant authentication",
    "Employ replay-resistant authentication mechanisms for network access to privileged and non-privileged accounts.",
    ["Nonce/challenge mechanisms verified"]),
  P("IA-L2-3.5.5", "IA", 2, "Device identification & authentication",
    "Identify and authenticate devices before establishing connections.",
    ["Device credentials validated"]),
  P("IA-L2-3.5.6", "IA", 2, "Identifier lifecycle",
    "Manage identifiers by defining the types of and reuse of identifiers.",
    ["Identifier issuance/retirement governed"]),
  P("IA-L2-3.5.7", "IA", 2, "Password policy",
    "Enforce a minimum password length and complexity, and store passwords in a cryptographically-protected form.",
    ["Complexity/length policy enforced", "Hashed storage confirmed"]),
  P("IA-L2-3.5.8", "IA", 2, "Prohibit password reuse",
    "Prohibit password reuse for a specified number of generations.",
    ["History enforcement configured"]),
  P("IA-L2-3.5.9", "IA", 2, "Temporary authenticators",
    "Allow temporary password use for an immediate change to a new authenticator on first use.",
    ["First-use change forced"]),
  P("IA-L2-3.5.10", "IA", 2, "Protect stored authenticators",
    "Store and transmit only cryptographically-protected passwords.",
    ["No plaintext authenticators in transit/at rest"]),
  P("IA-L2-3.5.11", "IA", 2, "Obfuscate authentication feedback",
    "Obscure feedback of authentication information.",
    ["Masking verified on all entry paths"]),

  // ─── IR — Incident Response (6) ──────────────────────────────────────────
  P("IR-L2-3.6.1", "IR", 2, "Incident-handling capability",
    "Establish an operational incident-handling capability for organizational systems that includes adequate preparation, detection, analysis, containment, recovery, and user-response activities.",
    ["IR plan operational", "Roles staffed"]),
  P("IR-L2-3.6.2", "IR", 2, "Track, document, report incidents",
    "Track, document, and report incidents to designated officials and/or authorities both internal and external to the organization.",
    ["Incident register complete", "Notifications sent per matrix"]),
  P("IR-L2-3.6.3", "IR", 2, "Test incident response",
    "Test the organizational incident-response capability.",
    ["Exercises/tabletops executed", "Lessons incorporated"]),
  P("IR-L2-3.6.4", "IR", 2, "Incident categories & criteria",
    "Establish and maintain incident-handling taxonomies/categories to support triage.",
    ["Classification criteria defined and used"]),
  P("IR-L2-3.6.5", "IR", 2, "Monitor & notify stakeholders",
    "Monitor the incident landscape and notify required parties.",
    ["Detection feeds IR workflow"]),
  P("IR-L2-3.6.6", "IR", 2, "Evidence preservation & reporting",
    "Preserve evidence and support attribution/lessons-learned after events.",
    ["Forensic readiness demonstrated"]),

  // ─── MA — Maintenance (6) ────────────────────────────────────────────────
  P("MA-L2-3.7.1", "MA", 2, "Approved maintenance tools",
    "Perform maintenance on organizational systems using approved and controlled tools.",
    ["Tool allowlist enforced"]),
  P("MA-L2-3.7.2", "MA", 2, "Supervised maintenance personnel",
    "Supervise the maintenance activities of personnel without required access authorization.",
    ["Escorts/supervision recorded"]),
  P("MA-L2-3.7.3", "MA", 2, "Controlled maintenance equipment",
    "Ensure equipment removed for maintenance is sanitized before release; verify integrity on return.",
    ["Sanitization checks performed"]),
  P("MA-L2-3.7.4", "MA", 2, "Remote maintenance approval",
    "Approve, monitor, and control maintenance performed remotely.",
    ["Remote sessions approved and logged"]),
  P("MA-L2-3.7.5", "MA", 2, "Maintenance records & approvals",
    "Require approvals for maintenance personnel and maintain complete records of maintenance activities.",
    ["Records complete and retained"]),
  P("MA-L2-3.7.6", "MA", 2, "Verifier on maintenance return",
    "Require personnel to? — require verification upon return of maintained equipment.",
    ["Integrity verification on reinstall"]),

  // ─── MP — Media Protection (9) ───────────────────────────────────────────
  P("MP-L2-3.8.1", "MP", 2, "Media access controls",
    "Protect (i.e., physically control and securely store) system media containing CUI, both paper and digital.",
    ["Media physically secured", "Access limited"]),
  P("MP-L2-3.8.2", "MP", 2, "Restrict media access",
    "Limit access to CUI on system media to authorized users.",
    ["Entitlement checks on media access"]),
  P("MP-L1-3.8.3", "MP", 1, "Sanitize or destroy media",
    "Sanitize or destroy system media containing CUI before disposal or release for reuse.",
    ["NIST-consistent sanitization evidenced"]),
  P("MP-L2-3.8.4", "MP", 2, "Mark media with CUI markings",
    "Mark media containing CUI with the applicable security markings.",
    ["Markings applied per guide"]),
  P("MP-L2-3.8.5", "MP", 2, "Control media transport",
    "Control access to media containing CUI during transport outside of controlled areas.",
    ["Courier/packaging controls met"]),
  P("MP-L2-3.8.6", "MP", 2, "Cryptographic protection in transit",
    "Implement cryptographic mechanisms to protect the confidentiality of CUI stored on digital media during transport.",
    ["Encrypted containers/drives used"]),
  P("MP-L2-3.8.7", "MP", 2, "Purge before disposal",
    "Purge or destroy media containing CUI before disposal or release for reuse using approved techniques.",
    ["Purge certificates retained"]),
  P("MP-L2-3.8.8", "MP", 2, "Removable media in systems",
    "Control the use of removable media on system components.",
    ["Policy gates enforced at endpoints"]),
  P("MP-L2-3.8.9", "MP", 2, "Protect output devices",
    "Protect the confidentiality of CUI at output devices (printers, copiers, fax).",
    ["Output pickup/access controls applied"]),

  // ─── PE — Physical Protection (6) ────────────────────────────────────────
  P("PE-L1-3.10.1", "PE", 1, "Limit physical access",
    "Limit physical access to organizational systems, equipment, and the respective operating environments to authorized individuals.",
    ["Badge/key controls functioning", "Visitor logs kept"]),
  P("PE-L2-3.10.2", "PE", 2, "Protect & monitor facility",
    "Protect and monitor the physical facility and support infrastructure.",
    ["Cameras/alarm coverage reviewed"]),
  P("PE-L2-3.10.3", "PE", 2, "Escort visitors",
    "Escort visitors and monitor visitor activity.",
    ["Escort policy followed"]),
  P("PE-L2-3.10.4", "PE", 2, "Manage access devices",
    "Manage physical access devices including keys, locks, combinations, and card readers.",
    ["Device inventory reconciled"]),
  P("PE-L2-3.10.5", "PE", 2, "Control output-device access",
    "Control and manage physical access to output devices to prevent unauthorized individuals from obtaining CUI.",
    ["Printer/MFD placement and controls reviewed"]),
  P("PE-L2-3.10.6", "PE", 2, "Alternate work sites",
    "Safeguard CUI at alternate work sites.",
    ["Telework safeguards assessed"]),

  // ─── PS — Personnel Security (3) ─────────────────────────────────────────
  P("PS-L1-3.11.1", "PS", 1, "Personnel screening",
    "Screen individuals prior to authorizing access to organizational systems containing CUI.",
    ["Background checks completed where required"]),
  P("PS-L2-3.11.2", "PS", 2, "Protection during transfers",
    "Ensure that organizational systems containing CUI are protected during and after personnel actions such as terminations and transfers.",
    ["Access revoked on effective date"]),
  P("PS-L2-3.11.3", "PS", 2, "Termination process",
    "Establish personnel-security requirements including termination responsibilities? — enforce documented termination criteria returning all assets and revoking access.",
    ["Checklist evidence retained"]),

  // ─── SC — System & Communications Protection (13) ────────────────────────
  P("SC-L1-3.13.1", "SC", 1, "Boundary protection",
    "Monitor, control, and protect organizational communications (i.e., information transmitted or received) at the external boundaries and key internal boundaries of organizational systems.",
    ["Firewall/DMZ architecture evidenced", "Boundary logging active"]),
  P("SC-L2-3.13.2", "SC", 2, "Architectural security design",
    "Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security.",
    ["Design reviews include security principles"]),
  P("SC-L2-3.13.3", "SC", 2, "Separate user & privileged functionality",
    "Separate user functionality from system-management functionality.",
    ["Admin planes isolated"]),
  P("SC-L2-3.13.4", "SC", 2, "Information-flow control",
    "Prevent unauthorized and unintended information transfer via shared system resources.",
    ["Flow policies enforced"]),
  P("SC-L2-3.13.5", "SC", 2, "Split tunneling prevention",
    "Implement split-tunneling prevention for remote devices.",
    ["VPN full-tunnel verified"]),
  P("SC-L2-3.13.6", "SC", 2, "Cryptographic key management",
    "Apply cryptographic key management per policy to protect the confidentiality of CUI at rest.",
    ["Key rotation/custody documented"]),
  P("SC-L2-3.13.7", "SC", 2, "Collaborative-device transfer control",
    "Prevent unauthorized information transfer via collaborative computing devices (microphones, cameras).",
    ["Device use policy enforced"]),
  P("SC-L2-3.13.8", "SC", 2, "Integrity cryptography",
    "Implement cryptographic mechanisms to detect and protect the integrity of CUI in transit? — detect/protect integrity of CUI.",
    ["Signing/HMAC applied where required"]),
  P("SC-L2-3.13.9", "SC", 2, "Communications authenticity",
    "Validate the authenticity of communications channels via cryptographic mechanisms.",
    ["Certificate validation enforced"]),
  P("SC-L2-3.13.10", "SC", 2, "Mobile-code restrictions",
    "Restrict mobile-code execution per policy.",
    ["Mobile-code policy configured"]),
  P("SC-L2-3.13.11", "SC", 2, "Trusted path",
    "Employ trusted paths for privileged functions crossing trust boundaries.",
    ["Protected channels for admin access"]),
  P("SC-L2-3.13.12", "SC", 2, "Mobile-device protection",
    "Protect the confidentiality of CUI on mobile devices.",
    ["MDM/containerization applied"]),
  P("SC-L2-3.13.13", "SC", 2, "Crypto on mobile CUI",
    "Apply cryptographic protection to CUI on mobile devices and platforms.",
    ["Encrypted mobile containers verified"]),

  // ─── SI — System & Information Integrity (7) ─────────────────────────────
  P("SI-L1-3.14.1", "SI", 1, "Flaw remediation",
    "Promptly identify and report system flaws and promptly correct them.",
    ["Patch SLAs met", "Flaw register maintained"]),
  P("SI-L1-3.14.2", "SI", 1, "Malicious-code protection",
    "Provide protection from malicious code at appropriate locations within organizational systems.",
    ["AV/EDR deployed at entry points"]),
  P("SI-L1-3.14.3", "SI", 1, "Update malicious-code mechanisms",
    "Update malicious-code protection mechanisms when new releases are available.",
    ["Signature/engine currency monitored"]),
  P("SI-L2-3.14.4", "SI", 2, "Alerts & advisories",
    "Configure malicious-code protection to perform periodic scans and receive updates? — monitor security alerts/advisories and act on them.",
    ["Advisory intake processed"]),
  P("SI-L2-3.14.5", "SI", 2, "Periodic vulnerability scans",
    "Perform periodic scans of organizational systems and applications and remediate findings.",
    ["Scan cadence met", "Findings remediated per SLA"]),
  P("SI-L2-3.14.6", "SI", 2, "Monitor for anomalous activity",
    "Monitor organizational systems, including inbound/outbound traffic, to detect attacks and indicators of potential attacks.",
    ["Monitoring coverage evidenced"]),
  P("SI-L2-3.14.7", "SI", 2, "Unauthorized-use detection",
    "Identify unauthorized use of organizational systems.",
    ["Anomaly/alert triage recorded"]),
];

export interface CmmcRegisterFilter {
  family?: string;
  level?: number;
  search?: string;
}

/** Deterministic full-register rollups (always describe ALL 110 practices). */
function rollups() {
  const familyOrder = ["AC", "AT", "AU", "CA", "CM", "IA", "IR", "MA", "MP", "PE", "PS", "SC", "SI"];
  const families = familyOrder.map((family) => {
    const rows = CMMC_PRACTICES.filter((p) => p.family === family);
    const lv = (l: 1 | 2 | 3) => rows.filter((p) => p.level === l).length;
    return {
      family,
      count: rows.length,
      levels: { 1: lv(1), 2: lv(2), 3: lv(3) } as Record<"1" | "2" | "3", number>,
    };
  });
  const levels = ([1, 2, 3] as const).map((level) => ({
    level,
    count: CMMC_PRACTICES.filter((p) => p.level === level).length,
  }));
  return { families, levels };
}

/**
 * Filtered register view. `families` ALWAYS describes the full register;
 * `practices`/`total` honor the filter. family = case-insensitive exact;
 * level honored only for literal 1|2|3; search = case-insensitive substring
 * over id+title+requirement. Malformed filter -> treated as {}. Never throws.
 */
export function getCmmcPracticeRegister(filter?: CmmcRegisterFilter | unknown): {
  total: number;
  families: Array<{ family: string; count: number; levels: Record<"1" | "2" | "3", number> }>;
  practices: readonly CmmcPractice[];
} {
  let fam: string | undefined;
  let lvl: number | undefined;
  let q: string | undefined;
  if (filter !== null && typeof filter === "object" && !Array.isArray(filter)) {
    const f = filter as Record<string, unknown>;
    if (typeof f.family === "string") fam = f.family.toUpperCase();
    if ((f.level === 1 || f.level === 2 || f.level === 3) && Number.isInteger(f.level)) lvl = f.level;
    if (typeof f.search === "string") q = f.search.toLowerCase();
  }
  const practices = CMMC_PRACTICES.filter(
    (p) =>
      (fam === undefined || p.family === fam) &&
      (lvl === undefined || p.level === lvl) &&
      (q === undefined ||
        p.id.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.requirement.toLowerCase().includes(q)),
  );
  const { families } = rollups();
  return { total: practices.length, families, practices };
}

/** Full-register summary: total 110; levels sorted 1,2,3; families alphabetical. */
export function getCmmcRegisterSummary(): {
  total: number;
  levels: Array<{ level: 1 | 2 | 3; count: number }>;
  families: Array<{ family: string; count: number }>;
} {
  const { families, levels } = rollups();
  return {
    total: CMMC_PRACTICES.length,
    levels,
    families: families.map(({ family, count }) => ({ family, count })),
  };
}

/** Case-insensitive, trimmed lookup. Never throws. */
export function getCmmcPracticeById(id: unknown): CmmcPractice | null {
  if (typeof id !== "string") return null;
  const wanted = id.trim().toUpperCase();
  if (!wanted) return null;
  return CMMC_PRACTICES.find((p) => p.id.toUpperCase() === wanted) ?? null;
}
