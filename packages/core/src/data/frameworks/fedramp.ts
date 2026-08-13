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

  // --- AU: AUDIT AND ACCOUNTABILITY ---
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

  // --- CM: CONFIGURATION MANAGEMENT ---
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

  // --- IA: IDENTIFICATION AND AUTHENTICATION ---
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

  // --- RA: RISK ASSESSMENT ---
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

  // --- SC: SYSTEM AND COMMUNICATIONS PROTECTION ---
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
];
