export interface Iso27001Control2022 {
  controlId: string;
  theme: "Organizational" | "People" | "Physical" | "Technological";
  name: string;
  description: string;
  guidance: string;
}

export const ISO27001_2022_CONTROLS: Iso27001Control2022[] = [
  // --- Organizational Controls (A.5) ---
  {
    controlId: "A.5.1",
    theme: "Organizational",
    name: "Policies for Information Security",
    description: "Information security policy and topic-specific policies shall be defined, approved by management, published, and communicated to personnel.",
    guidance: "Review information security policies at least annually or upon significant organizational changes.",
  },
  {
    controlId: "A.5.7",
    theme: "Organizational",
    name: "Threat Intelligence",
    description: "Information relating to information security threats shall be collected and analyzed to produce threat intelligence.",
    guidance: "Ingest CISA KEVs, NVD CVE feeds, and vendor security advisories into central threat monitoring.",
  },
  {
    controlId: "A.5.15",
    theme: "Organizational",
    name: "Access Control",
    description: "Rules to control physical and logical access to information and other associated assets shall be established and implemented.",
    guidance: "Implement role-based access control (RBAC), least privilege, and formal access request approvals.",
  },
  {
    controlId: "A.5.23",
    theme: "Organizational",
    name: "Information Security for Use of Cloud Services",
    description: "Processes for acquisition, use, management, and exit from cloud services shall be established in accordance with information security requirements.",
    guidance: "Audit cloud service provider SOC 2 Type II reports annually and enforce secure tenant configurations.",
  },
  {
    controlId: "A.5.30",
    theme: "Organizational",
    name: "ICT Readiness for Business Continuity",
    description: "ICT readiness shall be planned, implemented, maintained, and tested based on business continuity objectives.",
    guidance: "Conduct annual disaster recovery (DR) simulations and backup restoration tests.",
  },

  // --- People Controls (A.6) ---
  {
    controlId: "A.6.1",
    theme: "People",
    name: "Screening",
    description: "Background verification checks on all candidates for employment shall be carried out prior to joining the organization.",
    guidance: "Perform criminal background checks and reference verifications for all new hires.",
  },
  {
    controlId: "A.6.3",
    theme: "People",
    name: "Information Security Awareness, Education, and Training",
    description: "Personnel of the organization shall receive appropriate information security awareness, education, and training.",
    guidance: "Mandate annual security awareness training and monthly phishing simulations.",
  },

  // --- Physical Controls (A.7) ---
  {
    controlId: "A.7.1",
    theme: "Physical",
    name: "Physical Security Perimeters",
    description: "Security perimeters shall be defined and used to protect areas that contain information and other associated assets.",
    guidance: "Enforce badge access, CCTV monitoring, and visitor logs at all physical data centers and offices.",
  },
  {
    controlId: "A.7.10",
    theme: "Physical",
    name: "Storage Media",
    description: "Storage media shall be managed through their lifecycle of acquisition, use, transportation, and disposal.",
    guidance: "Cryptographically wipe or physically shred retired hard drives and storage media.",
  },

  // --- Technological Controls (A.8) ---
  {
    controlId: "A.8.1",
    theme: "Technological",
    name: "User Endpoint Devices",
    description: "Information stored on, processed by or accessible via user endpoint devices shall be protected.",
    guidance: "Deploy Endpoint Detection & Response (EDR), disk encryption (BitLocker/FileVault), and MDM enforcement.",
  },
  {
    controlId: "A.8.7",
    theme: "Technological",
    name: "Protection Against Malware",
    description: "Protection against malware shall be implemented and supported by appropriate user awareness.",
    guidance: "Configure anti-malware tools with real-time scanning and automatic definition updates.",
  },
  {
    controlId: "A.8.9",
    theme: "Technological",
    name: "Configuration Management",
    description: "Configurations, including security configurations, of hardware, software, services and networks shall be established and maintained.",
    guidance: "Apply CIS Benchmarks and maintain Infrastructure-as-Code versioning.",
  },
  {
    controlId: "A.8.12",
    theme: "Technological",
    name: "Data Leakage Prevention",
    description: "Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.",
    guidance: "Implement DLP rules to block unauthorized transmission of PII, ePHI, and financial data.",
  },
  {
    controlId: "A.8.24",
    theme: "Technological",
    name: "Use of Cryptography",
    description: "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.",
    guidance: "Enforce AES-256 for data at rest and TLS 1.3 for data in transit with KMS key rotation.",
  },
  {
    controlId: "A.8.28",
    theme: "Technological",
    name: "Secure Coding",
    description: "Secure coding principles shall be applied to software development.",
    guidance: "Incorporate SAST, DAST, dependency scanning, and mandatory peer code reviews in CI/CD pipelines.",
  },
];
