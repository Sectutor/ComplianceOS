export interface FedRampControl {
  controlId: string;
  family: string;
  name: string;
  description: string;
  baseline: "Low" | "Moderate" | "High";
  guidance: string;
}

export const FEDRAMP_CONTROLS: FedRampControl[] = [
  // --- AC: ACCESS CONTROL ---
  {
    controlId: "AC-1",
    family: "Access Control",
    name: "Access Control Policy and Procedures",
    description: "Develop, document, and disseminate access control policy and procedures to manage account access.",
    baseline: "Low",
    guidance: "Formally document access control responsibilities, role assignments, and review cadences.",
  },
  {
    controlId: "AC-2",
    family: "Access Control",
    name: "Account Management",
    description: "Manage system accounts, specify authorized users, roles, access permissions, and approval procedures.",
    baseline: "Low",
    guidance: "Implement formal user onboarding/offboarding workflows with quarterly access reviews.",
  },
  {
    controlId: "AC-3",
    family: "Access Control",
    name: "Access Enforcement",
    description: "Enforce approved authorizations for logical access to information and system resources.",
    baseline: "Low",
    guidance: "Implement role-based access control (RBAC) and least privilege principle across all endpoints.",
  },
  {
    controlId: "AC-7",
    family: "Access Control",
    name: "Unsuccessful Logon Attempts",
    description: "Enforce a limit of consecutive invalid logon attempts by a user and automatically lock account.",
    baseline: "Low",
    guidance: "Lock accounts for 15 minutes after 5 consecutive invalid login attempts.",
  },
  {
    controlId: "AC-17",
    family: "Access Control",
    name: "Remote Access Management",
    description: "Establish and document usage restrictions, configuration guidelines, and implementation guidance for remote access.",
    baseline: "Moderate",
    guidance: "Mandate encrypted VPN / TLS 1.3 tunnels with MFA for all remote administrative access.",
  },
  {
    controlId: "AC-18",
    family: "Access Control",
    name: "Wireless Access",
    description: "Establish usage restrictions, configuration guidelines, connection requirements, and implementation guidance for wireless access.",
    baseline: "Moderate",
    guidance: "Disable unauthenticated wireless connections and enforce WPA3-Enterprise authentication.",
  },

  // --- AT: AWARENESS AND TRAINING ---
  {
    controlId: "AT-1",
    family: "Awareness and Training",
    name: "Awareness and Training Policy and Procedures",
    description: "Develop, document, and disseminate security awareness and training policy and procedures.",
    baseline: "Low",
    guidance: "Publish annual security awareness training policy covering mandatory employee training requirements.",
  },
  {
    controlId: "AT-2",
    family: "Awareness and Training",
    name: "Literacy Training and Awareness",
    description: "Provide basic security literacy training to information system users as part of initial onboarding and annually thereafter.",
    baseline: "Low",
    guidance: "Require 100% completion of annual security awareness modules covering phishing, social engineering, and password safety.",
  },
  {
    controlId: "AT-3",
    family: "Awareness and Training",
    name: "Role-Based Security Training",
    description: "Provide role-based security training to personnel with significant security responsibilities.",
    baseline: "Moderate",
    guidance: "Conduct specialized training for system administrators, developers, and incident responders annually.",
  },

  // --- AU: AUDIT AND ACCOUNTABILITY ---
  {
    controlId: "AU-1",
    family: "Audit and Accountability",
    name: "Audit and Accountability Policy and Procedures",
    description: "Develop, document, and disseminate audit and accountability policy and procedures.",
    baseline: "Low",
    guidance: "Document logging standards, retention schedules, and SIEM monitoring procedures.",
  },
  {
    controlId: "AU-2",
    family: "Audit and Accountability",
    name: "Event Logging",
    description: "Identify and document the types of events that the system is capable of logging in support of audit requirements.",
    baseline: "Low",
    guidance: "Log user authentication, privilege escalation, file access, and administrative actions.",
  },
  {
    controlId: "AU-6",
    family: "Audit and Accountability",
    name: "Audit Record Review, Analysis, and Reporting",
    description: "Review and analyze system audit records for indications of unusual or suspicious activity.",
    baseline: "Moderate",
    guidance: "Implement automated SIEM alert monitoring and weekly log audit reviews.",
  },
  {
    controlId: "AU-9",
    family: "Audit and Accountability",
    name: "Protection of Audit Information",
    description: "Protect audit information and audit logging tools from unauthorized access, modification, and deletion.",
    baseline: "Low",
    guidance: "Store audit logs in read-only write-once-read-many (WORM) storage or append-only S3 bucket.",
  },

  // --- CA: ASSESSMENT, AUTHORIZATION, AND MONITORING ---
  {
    controlId: "CA-1",
    family: "Assessment, Authorization, and Monitoring",
    name: "Assessment, Authorization, and Monitoring Policy",
    description: "Develop, document, and disseminate security assessment and authorization policy and procedures.",
    baseline: "Low",
    guidance: "Establish formal authorization boundaries and annual security assessment schedules.",
  },
  {
    controlId: "CA-2",
    family: "Assessment, Authorization, and Monitoring",
    name: "Control Assessments",
    description: "Assess security controls in the system to determine the extent to which controls are implemented correctly.",
    baseline: "Low",
    guidance: "Conduct annual third-party independent security control assessments (3PAO / SAR).",
  },
  {
    controlId: "CA-3",
    family: "Assessment, Authorization, and Monitoring",
    name: "Information Exchange",
    description: "Approve and manage information exchanges between organizational systems and external entities.",
    baseline: "Moderate",
    guidance: "Maintain formal Interconnection Security Agreements (ISA) and MOUs for all external system connections.",
  },
  {
    controlId: "CA-7",
    family: "Assessment, Authorization, and Monitoring",
    name: "Continuous Monitoring",
    description: "Establish a continuous monitoring strategy and implement continuous monitoring in accordance with the strategy.",
    baseline: "Low",
    guidance: "Deliver monthly ConMon reports, vulnerability scan results, and POA&M updates to the FedRAMP PMO.",
  },

  // --- CM: CONFIGURATION MANAGEMENT ---
  {
    controlId: "CM-1",
    family: "Configuration Management",
    name: "Configuration Management Policy and Procedures",
    description: "Develop, document, and disseminate configuration management policy and procedures.",
    baseline: "Low",
    guidance: "Establish formal change control board (CCB) approval processes for all production changes.",
  },
  {
    controlId: "CM-2",
    family: "Configuration Management",
    name: "Baseline Configuration",
    description: "Develop, document, and maintain under configuration control, a current baseline configuration of the system.",
    baseline: "Low",
    guidance: "Maintain Infrastructure-as-Code (Terraform/CloudFormation) and container image golden baselines.",
  },
  {
    controlId: "CM-6",
    family: "Configuration Management",
    name: "Configuration Settings",
    description: "Establish and document mandatory configuration settings for information technology products.",
    baseline: "Low",
    guidance: "Apply CIS Benchmarks / DISA STIGs across all operating systems and cloud services.",
  },
  {
    controlId: "CM-8",
    family: "Configuration Management",
    name: "Information System Component Inventory",
    description: "Develop and document an inventory of system components that accurately reflects the system boundaries.",
    baseline: "Low",
    guidance: "Maintain automated asset inventory tracking all virtual servers, containers, databases, and IP addresses.",
  },

  // --- CP: CONTINGENCY PLANNING ---
  {
    controlId: "CP-1",
    family: "Contingency Planning",
    name: "Contingency Planning Policy and Procedures",
    description: "Develop, document, and disseminate contingency planning policy and procedures.",
    baseline: "Low",
    guidance: "Publish formal Contingency Plan (CP) detailing RTO, RPO, and disaster recovery responsibilities.",
  },
  {
    controlId: "CP-2",
    family: "Contingency Planning",
    name: "Contingency Plan",
    description: "Develop a contingency plan for the system addressing system restoration without compromise.",
    baseline: "Low",
    guidance: "Review and update CP annually; ensure disaster recovery procedures cover multi-region failover.",
  },
  {
    controlId: "CP-7",
    family: "Contingency Planning",
    name: "Alternate Processing Site",
    description: "Establish an alternate processing site including necessary agreements for site operations.",
    baseline: "Moderate",
    guidance: "Maintain geographically separated secondary cloud region with automated failover capabilities.",
  },
  {
    controlId: "CP-9",
    family: "Contingency Planning",
    name: "System Backups",
    description: "Conduct backups of user-level information, system-level information, and security-related documentation.",
    baseline: "Low",
    guidance: "Perform daily incremental and weekly full encrypted backups with quarterly restoration testing.",
  },

  // --- IA: IDENTIFICATION AND AUTHENTICATION ---
  {
    controlId: "IA-1",
    family: "Identification and Authentication",
    name: "Identification and Authentication Policy and Procedures",
    description: "Develop, document, and disseminate identification and authentication policy and procedures.",
    baseline: "Low",
    guidance: "Document identity lifecycle management, IAM standards, and MFA technical controls.",
  },
  {
    controlId: "IA-2",
    family: "Identification and Authentication",
    name: "Identification and Authentication (Organizational Users)",
    description: "Uniquely identify and authenticate organizational users (or processes acting on behalf of users).",
    baseline: "Low",
    guidance: "Mandate unique username IDs and Multi-Factor Authentication (MFA) for all system users.",
  },
  {
    controlId: "IA-5",
    family: "Identification and Authentication",
    name: "Authenticator Management",
    description: "Manage system authenticators including passwords, tokens, certificates, and cryptographic keys.",
    baseline: "Low",
    guidance: "Enforce 14+ character passwords, 90-day max secret rotation, and FIDO2 hardware MFA keys.",
  },

  // --- IR: INCIDENT RESPONSE ---
  {
    controlId: "IR-1",
    family: "Incident Response",
    name: "Incident Response Policy and Procedures",
    description: "Develop, document, and disseminate incident response policy and procedures.",
    baseline: "Low",
    guidance: "Maintain incident response policy detailing severity levels, triage steps, and notification chains.",
  },
  {
    controlId: "IR-4",
    family: "Incident Response",
    name: "Incident Handling",
    description: "Implement an incident handling capability for security incidents that includes preparation, detection, analysis, containment, recovery, and user response.",
    baseline: "Low",
    guidance: "Execute formal Incident Response Plan (IRP) with defined escalation roles and playbooks.",
  },
  {
    controlId: "IR-6",
    family: "Incident Response",
    name: "Incident Reporting",
    description: "Require personnel to report suspected security incidents to the organizational incident response capability.",
    baseline: "Low",
    guidance: "Report FedRAMP incidents to US-CERT / FedRAMP PMO within required statutory timelines (1 hour).",
  },

  // --- MA: MAINTENANCE ---
  {
    controlId: "MA-1",
    family: "Maintenance",
    name: "System Maintenance Policy and Procedures",
    description: "Develop, document, and disseminate system maintenance policy and procedures.",
    baseline: "Low",
    guidance: "Document scheduled maintenance windows, emergency patching protocols, and vendor maintenance access controls.",
  },
  {
    controlId: "MA-2",
    family: "Maintenance",
    name: "Controlled Maintenance",
    description: "Schedule, perform, document, and review records of maintenance and repairs on system components.",
    baseline: "Low",
    guidance: "Log all system maintenance activities in change management tickets and review quarterly.",
  },
  {
    controlId: "MA-4",
    family: "Maintenance",
    name: "Nonlocal Maintenance",
    description: "Approve and monitor nonlocal maintenance and diagnostic activities.",
    baseline: "Moderate",
    guidance: "Require explicit admin authorization and session recording for all remote maintenance tools.",
  },

  // --- MP: MEDIA PROTECTION ---
  {
    controlId: "MP-1",
    family: "Media Protection",
    name: "Media Protection Policy and Procedures",
    description: "Develop, document, and disseminate media protection policy and procedures.",
    baseline: "Low",
    guidance: "Document physical and digital media handling, transport encryption, and sanitization standards.",
  },
  {
    controlId: "MP-6",
    family: "Media Protection",
    name: "Media Sanitization",
    description: "Sanitize system media prior to disposal, release out of organizational control, or release for reuse.",
    baseline: "Low",
    guidance: "Sanitize digital media according to NIST SP 800-88 Guidelines for Media Sanitization.",
  },

  // --- PE: PHYSICAL AND ENVIRONMENTAL PROTECTION ---
  {
    controlId: "PE-1",
    family: "Physical and Environmental Protection",
    name: "Physical and Environmental Protection Policy",
    description: "Develop, document, and disseminate physical and environmental protection policy and procedures.",
    baseline: "Low",
    guidance: "Rely on FedRAMP Authorized IaaS/PaaS datacenter SOC 2 Type II physical security attestations.",
  },
  {
    controlId: "PE-3",
    family: "Physical and Environmental Protection",
    name: "Physical Access Control",
    description: "Enforce physical access authorizations at entry points to facilities hosting information systems.",
    baseline: "Low",
    guidance: "Verify cloud provider physical access controls (biometric entry, 24/7 guards, visitor logs).",
  },

  // --- PL: PLANNING ---
  {
    controlId: "PL-1",
    family: "Planning",
    name: "Security Planning Policy and Procedures",
    description: "Develop, document, and disseminate security planning policy and procedures.",
    baseline: "Low",
    guidance: "Maintain formal security planning framework aligning system architecture with NIST SP 800-53 controls.",
  },
  {
    controlId: "PL-2",
    family: "Planning",
    name: "System Security Plan (SSP)",
    description: "Develop a system security plan for the system that describes system boundaries, operational environment, and implemented controls.",
    baseline: "Low",
    guidance: "Maintain an up-to-date FedRAMP System Security Plan (SSP) and update after major system changes.",
  },

  // --- PS: PERSONNEL SECURITY ---
  {
    controlId: "PS-1",
    family: "Personnel Security",
    name: "Personnel Security Policy and Procedures",
    description: "Develop, document, and disseminate personnel security policy and procedures.",
    baseline: "Low",
    guidance: "Document background screening requirements, NDA agreements, and termination procedures.",
  },
  {
    controlId: "PS-3",
    family: "Personnel Security",
    name: "Personnel Screening",
    description: "Screen individuals prior to authorizing access to the system.",
    baseline: "Low",
    guidance: "Conduct criminal background checks, employment verification, and credit checks for all onboarding staff.",
  },
  {
    controlId: "PS-4",
    family: "Personnel Security",
    name: "Personnel Termination",
    description: "Upon termination of employment, disable system access, conduct exit interviews, and retrieve property.",
    baseline: "Low",
    guidance: "Disable user accounts immediately upon termination notification (within 24 hours).",
  },

  // --- RA: RISK ASSESSMENT ---
  {
    controlId: "RA-1",
    family: "Risk Assessment",
    name: "Risk Assessment Policy and Procedures",
    description: "Develop, document, and disseminate risk assessment policy and procedures.",
    baseline: "Low",
    guidance: "Establish risk management taxonomy, likelihood/impact scoring matrix, and review cadences.",
  },
  {
    controlId: "RA-3",
    family: "Risk Assessment",
    name: "Risk Assessment Execution",
    description: "Assess risk, including the likelihood and magnitude of harm, from the operation of information systems.",
    baseline: "Low",
    guidance: "Conduct formal NIST SP 800-30 annual risk assessments and maintain Plan of Action and Milestones (POA&M).",
  },
  {
    controlId: "RA-5",
    family: "Risk Assessment",
    name: "Vulnerability Monitoring and Scanning",
    description: "Monitor and scan for vulnerabilities in the system and hosted applications.",
    baseline: "Moderate",
    guidance: "Perform weekly automated vulnerability scans and monthly authenticated infrastructure penetration scans.",
  },

  // --- SA: SYSTEM AND SERVICES ACQUISITION ---
  {
    controlId: "SA-1",
    family: "System and Services Acquisition",
    name: "System and Services Acquisition Policy",
    description: "Develop, document, and disseminate system and services acquisition policy and procedures.",
    baseline: "Low",
    guidance: "Establish vendor risk assessment protocols and third-party software evaluation criteria.",
  },
  {
    controlId: "SA-4",
    family: "System and Services Acquisition",
    name: "Acquisition Process",
    description: "Include security functional requirements, strength of mechanism requirements, and assurance requirements in acquisition contracts.",
    baseline: "Low",
    guidance: "Mandate security SLA language, SOC 2 / FedRAMP verification, and data protection terms in vendor contracts.",
  },
  {
    controlId: "SA-9",
    family: "System and Services Acquisition",
    name: "External System Services",
    description: "Require that providers of external system services comply with organizational security requirements.",
    baseline: "Moderate",
    guidance: "Verify that external SaaS / cloud services maintain active FedRAMP authorizations or SOC 2 Type II reports.",
  },

  // --- SC: SYSTEM AND COMMUNICATIONS PROTECTION ---
  {
    controlId: "SC-1",
    family: "System and Communications Protection",
    name: "System and Communications Protection Policy",
    description: "Develop, document, and disseminate system and communications protection policy and procedures.",
    baseline: "Low",
    guidance: "Document network architecture, perimeter security controls, encryption standards, and firewall rules.",
  },
  {
    controlId: "SC-7",
    family: "System and Communications Protection",
    name: "Boundary Protection",
    description: "Monitor and control communications at external boundaries of the system and key internal boundaries.",
    baseline: "Low",
    guidance: "Deploy Web Application Firewalls (WAF), VPC Security Groups, and Next-Gen Firewalls.",
  },
  {
    controlId: "SC-8",
    family: "System and Communications Protection",
    name: "Transmission Confidentiality and Integrity",
    description: "Protect the confidentiality and integrity of transmitted information.",
    baseline: "Moderate",
    guidance: "Enforce TLS 1.3 for all data in transit across public and internal networks.",
  },
  {
    controlId: "SC-28",
    family: "System and Communications Protection",
    name: "Protection of Information at Rest",
    description: "Protect the confidentiality and integrity of information at rest.",
    baseline: "Moderate",
    guidance: "Enforce AES-256 encryption for all databases, EBS volumes, S3 buckets, and backup archives.",
  },

  // --- SI: SYSTEM AND INFORMATION INTEGRITY ---
  {
    controlId: "SI-1",
    family: "System and Information Integrity",
    name: "System and Information Integrity Policy",
    description: "Develop, document, and disseminate system and information integrity policy and procedures.",
    baseline: "Low",
    guidance: "Document flaw remediation SLAs, endpoint protection standards, and integrity monitoring procedures.",
  },
  {
    controlId: "SI-2",
    family: "System and Information Integrity",
    name: "Flaw Remediation",
    description: "Identify, report, and correct system flaws; test software updates before installation.",
    baseline: "Low",
    guidance: "Remediate critical vulnerabilities within 30 days and high vulnerabilities within 90 days per FedRAMP SLA.",
  },
  {
    controlId: "SI-3",
    family: "System and Information Integrity",
    name: "Malicious Code Protection",
    description: "Implement malicious code protection mechanisms at system entry and exit points.",
    baseline: "Low",
    guidance: "Deploy EDR / Antivirus agents across all compute instances and container build pipelines.",
  },
  {
    controlId: "SI-4",
    family: "System and Information Integrity",
    name: "Information System Monitoring",
    description: "Monitor the system to detect attacks and indicators of potential attacks.",
    baseline: "Moderate",
    guidance: "Implement continuous intrusion detection systems (IDS) and log correlation alerts.",
  },

  // --- SR: SUPPLY CHAIN RISK MANAGEMENT ---
  {
    controlId: "SR-1",
    family: "Supply Chain Risk Management",
    name: "Supply Chain Risk Management Policy and Procedures",
    description: "Develop, document, and disseminate supply chain risk management policy and procedures.",
    baseline: "Low",
    guidance: "Document supply chain security requirements, component sourcing standards, and software bill of materials (SBOM) policies.",
  },
  {
    controlId: "SR-2",
    family: "Supply Chain Risk Management",
    name: "Supply Chain Risk Management Plan",
    description: "Develop a supply chain risk management plan for managing supply chain risks associated with the system.",
    baseline: "Moderate",
    guidance: "Conduct annual supply chain risk assessments and inspect open-source software dependencies.",
  },
  {
    controlId: "SR-3",
    family: "Supply Chain Risk Management",
    name: "Supply Chain Controls and Processes",
    description: "Establish supply chain security requirements for suppliers and subcontractors.",
    baseline: "Moderate",
    guidance: "Enforce automated SBOM dependency scanning in CI/CD pipelines to detect compromise in third-party packages.",
  },

  // --- PM: PROGRAM MANAGEMENT ---
  {
    controlId: "PM-1",
    family: "Program Management",
    name: "Information Security Program Plan",
    description: "Develop and disseminate an organization-wide information security program plan.",
    baseline: "Low",
    guidance: "Maintain strategic security roadmap approved by executive leadership and CISO.",
  },

  // --- PT: PERSONALLY IDENTIFIABLE INFORMATION PROCESSING AND TRANSPARENCY ---
  {
    controlId: "PT-1",
    family: "Personally Identifiable Information Processing and Transparency",
    name: "PII Processing and Transparency Policy",
    description: "Develop, document, and disseminate PII processing and transparency policy and procedures.",
    baseline: "Low",
    guidance: "Publish Privacy Impact Assessments (PIA) and privacy policy notices detailing data collection practices.",
  }
];

export const fedrampLowControls = FEDRAMP_CONTROLS.filter(c => c.baseline === "Low");
export const fedrampModerateControls = FEDRAMP_CONTROLS.filter(c => c.baseline === "Moderate" || c.baseline === "Low");
export const fedrampHighControls = FEDRAMP_CONTROLS;
