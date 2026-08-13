export interface Nis2Control {
  controlId: string;
  article: string;
  name: string;
  description: string;
  guidance: string;
}

export const NIS2_CONTROLS: Nis2Control[] = [
  {
    controlId: "NIS2-ART21-1",
    article: "Article 21(2)(a)",
    name: "Risk Analysis and Information System Security Policies",
    description: "Policies on risk analysis and information system security shall be established, documented, and reviewed regularly.",
    guidance: "Perform formal risk assessments annually and maintain approved cybersecurity policies.",
  },
  {
    controlId: "NIS2-ART21-2",
    article: "Article 21(2)(b)",
    name: "Incident Handling and Emergency Escalation",
    description: "Incident handling processes for prevention, detection, and response to security incidents shall be established.",
    guidance: "Establish 24-hour mandatory initial incident notification mechanisms to national CSIRTs.",
  },
  {
    controlId: "NIS2-ART21-3",
    article: "Article 21(2)(c)",
    name: "Business Continuity and Crisis Management",
    description: "Business continuity processes such as backup management, disaster recovery, and crisis management shall be maintained.",
    guidance: "Maintain immutable backups and conduct annual business continuity DR simulations.",
  },
  {
    controlId: "NIS2-ART21-4",
    article: "Article 21(2)(d)",
    name: "Supply Chain Security and Vendor Due Diligence",
    description: "Supply chain security including security-related aspects concerning relationships with direct suppliers and service providers.",
    guidance: "Assess vendor security posture and enforce contractual security requirements on key ICT suppliers.",
  },
  {
    controlId: "NIS2-ART21-5",
    article: "Article 21(2)(e)",
    name: "Security in Network and Information Systems Acquisition",
    description: "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure.",
    guidance: "Implement Coordinated Vulnerability Disclosure (CVD) and secure SDLC practices.",
  },
  {
    controlId: "NIS2-ART21-6",
    article: "Article 21(2)(f)",
    name: "Cybersecurity Risk Management Effectiveness Testing",
    description: "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures.",
    guidance: "Perform periodic penetration testing, vulnerability scanning, and internal compliance audits.",
  },
  {
    controlId: "NIS2-ART21-7",
    article: "Article 21(2)(g)",
    name: "Cyber Hygiene and Training",
    description: "Basic cyber hygiene practices and cybersecurity training across the organization.",
    guidance: "Mandate annual cybersecurity training for all employees and specialized training for executive management.",
  },
  {
    controlId: "NIS2-ART21-8",
    article: "Article 21(2)(h)",
    name: "Use of Cryptography and Encryption",
    description: "Policies and procedures regarding the use of cryptography and, where appropriate, encryption.",
    guidance: "Enforce end-to-end encryption for data in transit and strong cryptography for stored data.",
  },
  {
    controlId: "NIS2-ART21-9",
    article: "Article 21(2)(i)",
    name: "Human Resources Security and Access Control",
    description: "Human resources security, access control policies and asset management.",
    guidance: "Perform background checks, enforce offboarding access revocation, and maintain an asset inventory.",
  },
  {
    controlId: "NIS2-ART21-10",
    article: "Article 21(2)(j)",
    name: "Multi-Factor Authentication and Secured Communications",
    description: "The use of multi-factor authentication or continuous authentication solutions, secured voice, video and text communications.",
    guidance: "Enforce MFA for all user logins and encrypt voice/text communication channels.",
  },
];
