
export const hipaaControls = [
    // ═══════════════════════════════════════════════════
    // §164.308 — ADMINISTRATIVE SAFEGUARDS
    // ═══════════════════════════════════════════════════

    // §164.308(a)(1) — Security Management Process
    {
        "id": "164.308(a)(1)",
        "name": "Security Management Process",
        "description": "Implement policies and procedures to prevent, detect, contain, and correct security violations.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish a formal security management process that includes risk analysis, risk management, sanction policy, and information system activity review."
    },
    {
        "id": "164.308(a)(1)(ii)(A)",
        "name": "Risk Analysis",
        "description": "Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic protected health information held by the covered entity or business associate.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Perform periodic risk assessments. Document asset inventory, threat sources, vulnerabilities, likelihood, impact, and risk level. Use NIST SP 800-30 methodology."
    },
    {
        "id": "164.308(a)(1)(ii)(B)",
        "name": "Risk Management",
        "description": "Implement security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level to comply with §164.306(a).",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement controls based on risk analysis findings. Prioritize remediation by risk level. Document risk treatment decisions (accept, mitigate, transfer, avoid)."
    },
    {
        "id": "164.308(a)(1)(ii)(C)",
        "name": "Sanction Policy",
        "description": "Apply appropriate sanctions against workforce members who fail to comply with the security policies and procedures of the covered entity or business associate.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish and communicate a formal sanction policy. Document enforcement actions. Integrate with HR disciplinary procedures."
    },
    {
        "id": "164.308(a)(1)(ii)(D)",
        "name": "Information System Activity Review",
        "description": "Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement log review procedures. Define review frequency. Use SIEM or log management tools. Document findings and corrective actions."
    },

    // §164.308(a)(2) — Assigned Security Responsibility
    {
        "id": "164.308(a)(2)",
        "name": "Assigned Security Responsibility",
        "description": "Identify the security official who is responsible for the development and implementation of the policies and procedures required by this subpart for the covered entity or business associate.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Designate a HIPAA Security Officer. Document the role, responsibilities, and authority. Ensure adequate resources and executive support."
    },

    // §164.308(a)(3) — Workforce Security
    {
        "id": "164.308(a)(3)",
        "name": "Workforce Security",
        "description": "Implement policies and procedures to ensure that all members of its workforce have appropriate access to electronic protected health information, and to prevent those workforce members who do not have access from obtaining access to ePHI.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement role-based access controls. Establish onboarding and offboarding procedures for ePHI access."
    },
    {
        "id": "164.308(a)(3)(ii)(A)",
        "name": "Authorization and/or Supervision",
        "description": "Implement procedures for the authorization and/or supervision of workforce members who work with electronic protected health information or in locations where it might be accessed.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Define authorization levels. Implement supervision policies for personnel handling ePHI. Document access authorization decisions."
    },
    {
        "id": "164.308(a)(3)(ii)(B)",
        "name": "Workforce Clearance Procedure",
        "description": "Implement procedures to determine that the access of a workforce member to electronic protected health information is appropriate.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish background check procedures. Verify access needs before granting ePHI access. Periodic access reviews."
    },
    {
        "id": "164.308(a)(3)(ii)(C)",
        "name": "Termination Procedures",
        "description": "Implement procedures for terminating access to electronic protected health information when the employment of, or other arrangement with, a workforce member ends.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Immediately revoke access upon termination. Recover keys, badges, and devices. Disable accounts within defined timeframe. Document termination process."
    },

    // §164.308(a)(4) — Information Access Management
    {
        "id": "164.308(a)(4)",
        "name": "Information Access Management",
        "description": "Implement policies and procedures for authorizing access to electronic protected health information.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish access management policies. Implement least-privilege principle. Define access request, approval, and review processes."
    },
    {
        "id": "164.308(a)(4)(ii)(A)",
        "name": "Isolating Health Care Clearinghouse Functions",
        "description": "If a health care clearinghouse is part of a larger organization, the clearinghouse must implement policies and procedures that protect the electronic protected health information of the clearinghouse from unauthorized access by the larger organization.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement network segmentation. Apply logical access controls. Restrict data flows between clearinghouse and parent organization."
    },
    {
        "id": "164.308(a)(4)(ii)(B)",
        "name": "Access Authorization",
        "description": "Implement policies and procedures for granting access to electronic protected health information, for example, through access to a workstation, transaction, program, process, or other mechanism.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Define formal access authorization workflow. Require manager approval. Document access grants and periodic review cycles."
    },
    {
        "id": "164.308(a)(4)(ii)(C)",
        "name": "Access Establishment and Modification",
        "description": "Implement policies and procedures that, based upon the covered entity's or business associate's access authorization policies, establish, document, review, and modify a user's right of access to a workstation, transaction, program, or process.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Document access provisioning procedures. Track modifications to access rights. Perform periodic access reviews (quarterly recommended)."
    },

    // §164.308(a)(5) — Security Awareness and Training
    {
        "id": "164.308(a)(5)",
        "name": "Security Awareness and Training",
        "description": "Implement a security awareness and training program for all members of its workforce (including management).",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Develop comprehensive security awareness program. Include initial and ongoing training. Track completion and comprehension. Cover ePHI handling, incident reporting, and social engineering."
    },
    {
        "id": "164.308(a)(5)(ii)(A)",
        "name": "Security Reminders",
        "description": "Periodic security updates.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Send regular security bulletins, newsletters, or alerts. Address emerging threats. Document distribution and acknowledgment."
    },
    {
        "id": "164.308(a)(5)(ii)(B)",
        "name": "Protection from Malicious Software",
        "description": "Procedures for guarding against, detecting, and reporting malicious software.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Deploy enterprise antimalware solutions. Implement EDR/XDR. Configure automatic updates. Train workforce on recognizing malware indicators."
    },
    {
        "id": "164.308(a)(5)(ii)(C)",
        "name": "Log-in Monitoring",
        "description": "Procedures for monitoring log-in attempts and reporting discrepancies.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement failed login alerting. Configure account lockout policies. Monitor for brute force and credential stuffing attacks. Integrate with SIEM."
    },
    {
        "id": "164.308(a)(5)(ii)(D)",
        "name": "Password Management",
        "description": "Procedures for creating, changing, and safeguarding passwords.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement password complexity requirements. Enforce password rotation policies. Use password managers. Implement MFA where feasible."
    },

    // §164.308(a)(6) — Security Incident Procedures
    {
        "id": "164.308(a)(6)",
        "name": "Security Incident Procedures",
        "description": "Implement policies and procedures to address security incidents.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish formal incident response plan. Define incident categories and escalation procedures. Conduct tabletop exercises."
    },
    {
        "id": "164.308(a)(6)(ii)",
        "name": "Response and Reporting",
        "description": "Identify and respond to suspected or known security incidents; mitigate, to the extent practicable, harmful effects of security incidents that are known to the covered entity or business associate; and document security incidents and their outcomes.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement incident detection and triage process. Document all incidents. Perform root cause analysis. Report breaches per Breach Notification Rule (§164.400-414)."
    },

    // §164.308(a)(7) — Contingency Plan
    {
        "id": "164.308(a)(7)",
        "name": "Contingency Plan",
        "description": "Establish (and implement as needed) policies and procedures for responding to an emergency or other occurrence (fire, vandalism, system failure, natural disaster) that damages systems that contain ePHI.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Develop a comprehensive contingency plan covering data backup, disaster recovery, and emergency operations. Test plans annually."
    },
    {
        "id": "164.308(a)(7)(ii)(A)",
        "name": "Data Backup Plan",
        "description": "Establish and implement procedures to create and maintain retrievable exact copies of electronic protected health information.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Implement automated backups. Store backups off-site or in geographically separated locations. Encrypt backup media. Test restore procedures regularly."
    },
    {
        "id": "164.308(a)(7)(ii)(B)",
        "name": "Disaster Recovery Plan",
        "description": "Establish (and implement as needed) procedures to restore any loss of data.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Define RTO and RPO objectives. Document recovery procedures for critical systems. Identify alternate processing sites. Test recovery procedures annually."
    },
    {
        "id": "164.308(a)(7)(ii)(C)",
        "name": "Emergency Mode Operation Plan",
        "description": "Establish (and implement as needed) procedures to enable continuation of critical business processes for protection of the security of ePHI while operating in emergency mode.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Identify critical processes and systems. Define manual procedures for emergency operations. Ensure ePHI access during emergencies while maintaining security."
    },
    {
        "id": "164.308(a)(7)(ii)(D)",
        "name": "Testing and Revision Procedures",
        "description": "Implement procedures for periodic testing and revision of contingency plans.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Test contingency plans at least annually. Conduct tabletop and functional exercises. Document test results and update plans based on findings."
    },
    {
        "id": "164.308(a)(7)(ii)(E)",
        "name": "Applications and Data Criticality Analysis",
        "description": "Assess the relative criticality of specific applications and data in support of other contingency plan components.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Classify applications by criticality. Perform business impact analysis (BIA). Prioritize recovery sequence based on criticality assessment."
    },

    // §164.308(a)(8) — Evaluation
    {
        "id": "164.308(a)(8)",
        "name": "Evaluation",
        "description": "Perform a periodic technical and nontechnical evaluation, based initially upon the standards implemented under this rule and, subsequently, in response to environmental or operational changes affecting the security of ePHI.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Conduct periodic security evaluations. Include both technical (penetration testing, vulnerability scanning) and nontechnical (policy review, compliance audit) assessments. Evaluate after significant changes."
    },

    // §164.308(b)(1) — Business Associate Contracts
    {
        "id": "164.308(b)(1)",
        "name": "Business Associate Contracts and Other Arrangements",
        "description": "A covered entity may permit a business associate to create, receive, maintain, or transmit electronic protected health information on the covered entity's behalf only if the covered entity obtains satisfactory assurances that the business associate will appropriately safeguard the information.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Establish written agreements (BAAs) with all business associates. Include security requirements, breach notification obligations, and termination provisions. Maintain a BA inventory."
    },
    {
        "id": "164.308(b)(4)",
        "name": "Written Contract or Other Arrangement",
        "description": "Document the satisfactory assurances through a written contract or other arrangement with the business associate.",
        "category": "Administrative Safeguards",
        "implementationGuidance": "Execute formal Business Associate Agreements (BAAs). Include provisions for security safeguards, breach reporting timelines, and subcontractor requirements."
    },

    // ═══════════════════════════════════════════════════
    // §164.310 — PHYSICAL SAFEGUARDS
    // ═══════════════════════════════════════════════════

    // §164.310(a)(1) — Facility Access Controls
    {
        "id": "164.310(a)(1)",
        "name": "Facility Access Controls",
        "description": "Implement policies and procedures to limit physical access to its electronic information systems and the facility or facilities in which they are housed, while ensuring that properly authorized access is allowed.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Implement layered physical security (perimeter, building, floor, room). Use access cards, biometrics, or security guards. Maintain visitor logs."
    },
    {
        "id": "164.310(a)(2)(i)",
        "name": "Contingency Operations",
        "description": "Establish (and implement as needed) procedures that allow facility access in support of restoration of lost data under the disaster recovery plan and emergency mode operations plan in the event of an emergency.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Define emergency facility access procedures. Maintain alternate access credentials. Coordinate with disaster recovery plans."
    },
    {
        "id": "164.310(a)(2)(ii)",
        "name": "Facility Security Plan",
        "description": "Implement policies and procedures to safeguard the facility and the equipment therein from unauthorized physical access, tampering, and theft.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Develop a facility security plan. Include physical access controls, surveillance, intrusion detection, and environmental controls (fire, flood, temperature)."
    },
    {
        "id": "164.310(a)(2)(iii)",
        "name": "Access Control and Validation Procedures",
        "description": "Implement procedures to control and validate a person's access to facilities based on their role or function, including visitor control, and control of access to software programs for testing and revision.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Implement role-based physical access. Require visitor escorts. Badge-controlled server rooms. Log all physical access events."
    },
    {
        "id": "164.310(a)(2)(iv)",
        "name": "Maintenance Records",
        "description": "Implement policies and procedures to document repairs and modifications to the physical components of a facility which are related to security (e.g., hardware, walls, doors, and locks).",
        "category": "Physical Safeguards",
        "implementationGuidance": "Maintain records of all physical security modifications. Track maintenance of locks, cameras, access systems. Document vendor maintenance visits."
    },

    // §164.310(b) — Workstation Use
    {
        "id": "164.310(b)",
        "name": "Workstation Use",
        "description": "Implement policies and procedures that specify the proper functions to be performed, the manner in which those functions are to be performed, and the physical attributes of the surroundings of a specific workstation or class of workstation that can access electronic protected health information.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Define acceptable use policies for workstations. Specify physical positioning requirements (screen privacy). Define clean desk policies. Restrict workstation locations accessing ePHI."
    },

    // §164.310(c) — Workstation Security
    {
        "id": "164.310(c)",
        "name": "Workstation Security",
        "description": "Implement physical safeguards for all workstations that access electronic protected health information, to restrict access to authorized users.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Implement cable locks, screen locks, privacy filters. Secure workstations in locked areas. Implement auto-lock screen timeouts. Encrypt hard drives."
    },

    // §164.310(d)(1) — Device and Media Controls
    {
        "id": "164.310(d)(1)",
        "name": "Device and Media Controls",
        "description": "Implement policies and procedures that govern the receipt and removal of hardware and electronic media that contain electronic protected health information into and out of a facility, and the movement of these items within the facility.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Establish asset tracking procedures. Implement media sanitization procedures (NIST SP 800-88). Control removable media usage."
    },
    {
        "id": "164.310(d)(2)(i)",
        "name": "Disposal",
        "description": "Implement policies and procedures to address the final disposition of electronic protected health information, and/or the hardware or electronic media on which it is stored.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Implement secure disposal procedures (degaussing, destruction, cryptographic erasure). Maintain disposal records. Use certified e-waste vendors."
    },
    {
        "id": "164.310(d)(2)(ii)",
        "name": "Media Re-use",
        "description": "Implement procedures for removal of electronic protected health information from electronic media before the media are made available for re-use.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Sanitize media before reuse per NIST SP 800-88 guidelines. Verify sanitization effectiveness. Document media reuse procedures."
    },
    {
        "id": "164.310(d)(2)(iii)",
        "name": "Accountability",
        "description": "Maintain a record of the movements of hardware and electronic media and any person responsible therefore.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Implement asset management system. Track hardware and media assignments. Log transfers and movements. Conduct periodic inventory audits."
    },
    {
        "id": "164.310(d)(2)(iv)",
        "name": "Data Backup and Storage",
        "description": "Create a retrievable, exact copy of electronic protected health information, when needed, before movement of equipment.",
        "category": "Physical Safeguards",
        "implementationGuidance": "Perform backups before equipment relocation. Verify backup integrity. Store backup copies securely. Document backup procedures for equipment moves."
    },

    // ═══════════════════════════════════════════════════
    // §164.312 — TECHNICAL SAFEGUARDS
    // ═══════════════════════════════════════════════════

    // §164.312(a)(1) — Access Control
    {
        "id": "164.312(a)(1)",
        "name": "Access Control",
        "description": "Implement technical policies and procedures for electronic information systems that maintain electronic protected health information to allow access only to those persons or software programs that have been granted access rights as specified in §164.308(a)(4).",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement role-based access control (RBAC). Apply least-privilege principle. Integrate with identity management systems."
    },
    {
        "id": "164.312(a)(2)(i)",
        "name": "Unique User Identification",
        "description": "Assign a unique name and/or number for identifying and tracking user identity.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Assign unique user IDs to all users. Prohibit shared accounts. Implement naming conventions. Track user identity across all systems."
    },
    {
        "id": "164.312(a)(2)(ii)",
        "name": "Emergency Access Procedure",
        "description": "Establish (and implement as needed) procedures for obtaining necessary electronic protected health information during an emergency.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Define break-glass procedures. Secure emergency access credentials. Log and audit all emergency access. Review emergency access events post-incident."
    },
    {
        "id": "164.312(a)(2)(iii)",
        "name": "Automatic Logoff",
        "description": "Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Configure session timeouts (15-30 minutes recommended). Implement screensaver locks. Apply timeout policies consistently across applications."
    },
    {
        "id": "164.312(a)(2)(iv)",
        "name": "Encryption and Decryption",
        "description": "Implement a mechanism to encrypt and decrypt electronic protected health information.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement AES-256 encryption for data at rest. Use TLS 1.2+ for data in transit. Manage encryption keys securely. Document encryption implementation."
    },

    // §164.312(b) — Audit Controls
    {
        "id": "164.312(b)",
        "name": "Audit Controls",
        "description": "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement comprehensive audit logging. Log access, modifications, and deletions of ePHI. Retain logs per retention policy. Use SIEM for centralized log management and alerting."
    },

    // §164.312(c)(1) — Integrity
    {
        "id": "164.312(c)(1)",
        "name": "Integrity",
        "description": "Implement policies and procedures to protect electronic protected health information from improper alteration or destruction.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement data integrity controls. Use checksums, digital signatures, or hashing. Implement database integrity constraints. Monitor for unauthorized modifications."
    },
    {
        "id": "164.312(c)(2)",
        "name": "Mechanism to Authenticate Electronic Protected Health Information",
        "description": "Implement electronic mechanisms to corroborate that electronic protected health information has not been altered or destroyed in an unauthorized manner.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement integrity verification mechanisms (digital signatures, MAC, hash functions). Verify data integrity during transmission and storage. Alert on integrity failures."
    },

    // §164.312(d) — Person or Entity Authentication
    {
        "id": "164.312(d)",
        "name": "Person or Entity Authentication",
        "description": "Implement procedures to verify that a person or entity seeking access to electronic protected health information is the one claimed.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement multi-factor authentication (MFA). Use strong authentication methods (biometrics, hardware tokens, certificates). Verify identity before granting access."
    },

    // §164.312(e)(1) — Transmission Security
    {
        "id": "164.312(e)(1)",
        "name": "Transmission Security",
        "description": "Implement technical security measures to guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Encrypt all ePHI in transit using TLS 1.2+. Implement VPN for remote access. Secure email using S/MIME or PGP. Monitor network traffic for anomalies."
    },
    {
        "id": "164.312(e)(2)(i)",
        "name": "Integrity Controls",
        "description": "Implement security measures to ensure that electronically transmitted electronic protected health information is not improperly modified without detection until disposed of.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Implement message authentication codes (MAC). Use TLS with integrity verification. Monitor for man-in-the-middle attacks. Verify data integrity on receipt."
    },
    {
        "id": "164.312(e)(2)(ii)",
        "name": "Encryption",
        "description": "Implement a mechanism to encrypt electronic protected health information whenever deemed appropriate.",
        "category": "Technical Safeguards",
        "implementationGuidance": "Encrypt ePHI during transmission using industry-standard protocols (TLS 1.2+, IPsec). Document encryption decisions and exceptions. Review encryption standards annually."
    },

    // ═══════════════════════════════════════════════════
    // §164.314 — ORGANIZATIONAL REQUIREMENTS
    // ═══════════════════════════════════════════════════
    {
        "id": "164.314(a)(1)",
        "name": "Business Associate Contracts or Other Arrangements",
        "description": "The contract or other arrangement required by §164.308(b)(4) must meet the requirements of this section.",
        "category": "Organizational Requirements",
        "implementationGuidance": "Execute BAAs that include: safeguard requirements, breach reporting obligations, return/destruction of ePHI on termination, and compliance with Security Rule."
    },
    {
        "id": "164.314(a)(2)(i)",
        "name": "Business Associate Contracts — Implementation Specifications",
        "description": "The contract between a covered entity and a business associate must provide that the business associate will implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of ePHI.",
        "category": "Organizational Requirements",
        "implementationGuidance": "Include specific safeguard requirements in BAAs. Require BA to report security incidents. Allow CE to terminate contract for material breach."
    },
    {
        "id": "164.314(b)(1)",
        "name": "Requirements for Group Health Plans",
        "description": "A group health plan must ensure that its plan documents require the plan sponsor to implement reasonable and appropriate administrative, physical, and technical safeguards to protect ePHI.",
        "category": "Organizational Requirements",
        "implementationGuidance": "Amend group health plan documents to include security safeguard requirements. Restrict plan sponsor access to ePHI. Implement adequate separation of duties."
    },

    // ═══════════════════════════════════════════════════
    // §164.316 — POLICIES AND PROCEDURES & DOCUMENTATION
    // ═══════════════════════════════════════════════════
    {
        "id": "164.316(a)",
        "name": "Policies and Procedures",
        "description": "Implement reasonable and appropriate policies and procedures to comply with the standards, implementation specifications, or other requirements of this subpart. This standard is not to be construed to permit or excuse an action that violates any other standard, implementation specification, or other requirements of this subpart.",
        "category": "Documentation Requirements",
        "implementationGuidance": "Develop comprehensive security policies and procedures. Align with risk analysis findings. Review and update policies periodically. Ensure policies are accessible to workforce."
    },
    {
        "id": "164.316(b)(1)",
        "name": "Documentation",
        "description": "Maintain the policies and procedures implemented to comply with this subpart in written (which may be electronic) form; and if an action, activity, or assessment is required to be documented, maintain a written (which may be electronic) record of the action, activity, or assessment.",
        "category": "Documentation Requirements",
        "implementationGuidance": "Maintain all security documentation. Include policies, procedures, risk assessments, and audit results. Implement version control and change tracking."
    },
    {
        "id": "164.316(b)(2)(i)",
        "name": "Time Limit",
        "description": "Retain the documentation required by this section for 6 years from the date of its creation or the date when it last was in effect, whichever is later.",
        "category": "Documentation Requirements",
        "implementationGuidance": "Implement 6-year minimum retention policy. Apply retention to all security-related documentation. Use secure, accessible storage. Implement disposition procedures after retention period."
    },
    {
        "id": "164.316(b)(2)(ii)",
        "name": "Availability",
        "description": "Make documentation available to those persons responsible for implementing the procedures to which the documentation pertains.",
        "category": "Documentation Requirements",
        "implementationGuidance": "Ensure security documentation is accessible to responsible personnel. Use a document management system. Implement access controls on documentation. Provide training on document location and use."
    },
    {
        "id": "164.316(b)(2)(iii)",
        "name": "Updates",
        "description": "Review documentation periodically, and update as needed, in response to environmental or operational changes affecting the security of the electronic protected health information.",
        "category": "Documentation Requirements",
        "implementationGuidance": "Review policies at least annually. Update after significant changes (systems, personnel, regulations). Track review dates and approvals. Communicate updates to workforce."
    }
];
