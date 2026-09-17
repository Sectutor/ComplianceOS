export interface DocumentItem {
    id: string;
    category: string;
    categoryLabel: string;
    clause: string;
    title: string;
    description: string;
    status: "not_started" | "draft" | "review" | "approved";
    owner: string;
    actionLink: string;
    actionLabel: string;
    lastUpdated?: string;
    version?: string;
    auditTip?: string;
}

export interface FrameworkDocumentConfig {
    frameworkId: string;
    frameworkName: string;
    badge: string;
    description: string;
    categories: { id: string; label: string }[];
    documents: DocumentItem[];
}

export const getSoc2Documents = (clientId: number): FrameworkDocumentConfig => ({
    frameworkId: "soc2",
    frameworkName: "SOC 2 Type II",
    badge: "AICPA Trust Services Criteria • Type II",
    description: "Complete catalog of mandatory governance policies, operational procedures, and audit evidentiary records required for AICPA SOC 2 Type II attestation.",
    categories: [
        { id: "all", label: "All Items" },
        { id: "governance", label: "Governance Policies" },
        { id: "operational", label: "Operational SOPs" },
        { id: "records", label: "Evidentiary Records" },
    ],
    documents: [
        {
            id: "soc2-system-desc",
            category: "governance",
            categoryLabel: "Governance Policies",
            clause: "AICPA DC 200",
            title: "Section III System Description",
            description: "Principal service commitments, system boundaries, components (infrastructure, software, people, procedures, data), and subservice organization carve-outs.",
            status: "draft",
            owner: "CISO / CTO",
            actionLink: `/clients/${clientId}/soc2/program-guide?tab=system-description`,
            actionLabel: "System Description Studio",
            lastUpdated: "2025-01-15",
            version: "0.8",
            auditTip: "CPA auditors inspect Section III for alignment with real cloud architecture and contractual SLA commitments."
        },
        {
            id: "soc2-infosec-policy",
            category: "governance",
            categoryLabel: "Governance Policies",
            clause: "TSC CC2.1",
            title: "Information Security Master Policy",
            description: "Executive tone-at-the-top mandate outlining organizational security expectations, role definitions, and mandatory annual review cadence.",
            status: "approved",
            owner: "Executive Leadership",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Policy Center",
            lastUpdated: "2025-01-10",
            version: "1.0",
            auditTip: "Requires documented annual executive approval with date stamps and signature."
        },
        {
            id: "soc2-access-control",
            category: "governance",
            categoryLabel: "Governance Policies",
            clause: "TSC CC6.1, CC6.2, CC6.3",
            title: "Access Control & Identity Management Policy",
            description: "Rules for RBAC, least privilege, unique credentials, mandatory phishing-resistant MFA, and privileged administrative controls.",
            status: "approved",
            owner: "SecOps / IT",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Policy Center",
            lastUpdated: "2025-01-18",
            version: "1.0",
            auditTip: "Auditors check whether access revocation occurs within 24 hours of employee termination."
        },
        {
            id: "soc2-change-mgmt",
            category: "operational",
            categoryLabel: "Operational SOPs",
            clause: "TSC CC8.1",
            title: "Change Management & SDLC Standard",
            description: "Procedures for pull request peer reviews, automated CI/CD security gating, segregation of duties between dev and prod, and rollback runbooks.",
            status: "approved",
            owner: "Head of Engineering",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Policy Center",
            lastUpdated: "2025-01-22",
            version: "1.0",
            auditTip: "Ensure no direct commits to main/production branches are permitted by branch protection rules."
        },
        {
            id: "soc2-incident-response",
            category: "operational",
            categoryLabel: "Operational SOPs",
            clause: "TSC CC7.3, CC7.4",
            title: "Incident Response Plan & Communication SOP",
            description: "CSIRT roles, severity matrix, triage containment protocols, customer disclosure communication templates, and post-mortem review workflows.",
            status: "review",
            owner: "SecOps",
            actionLink: `/clients/${clientId}/cyber/incidents`,
            actionLabel: "Incident Center",
            lastUpdated: "2025-02-01",
            version: "0.9",
            auditTip: "Auditors require proof of an annual tabletop incident response exercise."
        },
        {
            id: "soc2-bcp-dr",
            category: "operational",
            categoryLabel: "Operational SOPs",
            clause: "TSC A1.2, A1.3",
            title: "Disaster Recovery & Business Continuity Plan",
            description: "Procedures for cloud region failover, immutable backup restoration, database failover, and annual simulation tests.",
            status: "review",
            owner: "DevOps / Infrastructure",
            actionLink: `/clients/${clientId}/business-continuity`,
            actionLabel: "BCP Center",
            lastUpdated: "2025-02-05",
            version: "0.9",
            auditTip: "Auditors require documented RTO/RPO restoration logs from the annual DR test."
        },
        {
            id: "soc2-tprm",
            category: "governance",
            categoryLabel: "Governance Policies",
            clause: "TSC CC9.2",
            title: "Vendor Management & Subprocessor Due Diligence Policy",
            description: "Procurement security intake gates, annual vendor SOC 2 review, DPA requirements, and offboarding access revocation.",
            status: "draft",
            owner: "Legal / Procurement",
            actionLink: `/clients/${clientId}/vendors`,
            actionLabel: "Vendor Register",
            lastUpdated: "2025-02-10",
            version: "0.7",
            auditTip: "Maintain current SOC 2 Type II reports or ISO certifications on file for all subservice organizations."
        },
        {
            id: "soc2-crypto",
            category: "operational",
            categoryLabel: "Operational SOPs",
            clause: "TSC CC6.6, CC6.7",
            title: "Cryptography & Key Management Standard",
            description: "Mandated AES-256 and TLS 1.3 encryption baselines, KMS envelope encryption, key rotation intervals, and secret storage rules.",
            status: "approved",
            owner: "Engineering",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Policy Center",
            lastUpdated: "2025-01-25",
            version: "1.0",
            auditTip: "Auditors will request configuration screenshots showing SSL/TLS ciphers and KMS auto-rotation enabled."
        },
        {
            id: "soc2-risk-matrix",
            category: "records",
            categoryLabel: "Evidentiary Records",
            clause: "TSC CC3.1, CC3.2",
            title: "Annual Risk Assessment & Treatment Matrix",
            description: "Comprehensive registry of identified threats, likelihood/impact scoring, and executive-approved treatment decisions.",
            status: "approved",
            owner: "Risk Manager",
            actionLink: `/clients/${clientId}/risks/assessments`,
            actionLabel: "Risk Assessment",
            lastUpdated: "2025-01-12",
            version: "1.0",
            auditTip: "Must reflect fraud risk assessment and changes in corporate operating environment."
        },
        {
            id: "soc2-access-review-records",
            category: "records",
            categoryLabel: "Evidentiary Records",
            clause: "TSC CC6.2",
            title: "Quarterly User Access Review Records",
            description: "Manager sign-off documentation certifying active users across AWS, GitHub, Google Workspace, and production databases.",
            status: "review",
            owner: "IT / SecOps",
            actionLink: `/clients/${clientId}/people`,
            actionLabel: "Access Reviews",
            lastUpdated: "2025-02-01",
            version: "Q1-2025",
            auditTip: "Auditors sample users removed during the audit period to verify timely deprovisioning."
        },
        {
            id: "soc2-pentest-report",
            category: "records",
            categoryLabel: "Evidentiary Records",
            clause: "TSC CC4.1, CC7.1",
            title: "Annual Third-Party Penetration Test Report",
            description: "Executive summary and remediation validation letter from independent security firm covering external attack surface.",
            status: "approved",
            owner: "SecOps",
            actionLink: `/clients/${clientId}/compliance-journey`,
            actionLabel: "Pen Test Review",
            lastUpdated: "2025-01-05",
            version: "2025.1",
            auditTip: "All Critical and High vulnerabilities must show verified remediation within stated SLAs."
        },
        {
            id: "soc2-dr-exercise-record",
            category: "records",
            categoryLabel: "Evidentiary Records",
            clause: "TSC A1.3",
            title: "Disaster Recovery Test Record & Restoration Proof",
            description: "Detailed report documenting successful backup restoration, time elapsed to recovery, and post-exercise action items.",
            status: "draft",
            owner: "Infrastructure",
            actionLink: `/clients/${clientId}/business-continuity`,
            actionLabel: "BCP Drills",
            lastUpdated: "2025-02-12",
            version: "0.5",
            auditTip: "Ensure the test explicitly documents RTO and RPO metrics achieved."
        }
    ]
});

export const getHipaaDocuments = (clientId: number): FrameworkDocumentConfig => ({
    frameworkId: "hipaa",
    frameworkName: "HIPAA Security & Privacy",
    badge: "45 CFR Parts 160 & 164 • Security & Privacy Rule",
    description: "Statutory documentation catalog required by the HHS Office for Civil Rights (OCR) for healthcare providers, clearinghouses, and business associates handling ePHI.",
    categories: [
        { id: "all", label: "All Items" },
        { id: "safeguards", label: "Administrative & Physical" },
        { id: "technical", label: "Technical & Privacy" },
        { id: "records", label: "Mandatory Records" },
    ],
    documents: [
        {
            id: "hipaa-sra-report",
            category: "records",
            categoryLabel: "Mandatory Records",
            clause: "45 CFR §164.308(a)(1)(ii)(A)",
            title: "Comprehensive Security Risk Analysis (SRA) Report",
            description: "Statutory risk analysis identifying all threats and vulnerabilities to the confidentiality, integrity, and availability of held ePHI per NIST SP 800-30.",
            status: "approved",
            owner: "HIPAA Security Officer",
            actionLink: `/clients/${clientId}/risks/assessments`,
            actionLabel: "SRA Assessment",
            lastUpdated: "2025-01-14",
            version: "1.0",
            auditTip: "The #1 finding in OCR enforcement actions is failure to conduct an enterprise-wide SRA."
        },
        {
            id: "hipaa-risk-mgmt-plan",
            category: "records",
            categoryLabel: "Mandatory Records",
            clause: "45 CFR §164.308(a)(1)(ii)(B)",
            title: "Risk Management Remediation Plan",
            description: "Continuous risk mitigation roadmap detailing security measures implemented to reduce risks identified in the SRA to reasonable and appropriate levels.",
            status: "review",
            owner: "Security Officer",
            actionLink: `/clients/${clientId}/risks/assessments`,
            actionLabel: "Risk Plan",
            lastUpdated: "2025-01-20",
            version: "0.9",
            auditTip: "Must prioritize High and Critical risks with target remediation completion dates."
        },
        {
            id: "hipaa-sanction-policy",
            category: "safeguards",
            categoryLabel: "Administrative & Physical",
            clause: "45 CFR §164.308(a)(1)(ii)(C)",
            title: "Workforce Sanction Policy",
            description: "Written disciplinary policy applied consistently against workforce members who fail to comply with corporate security and privacy standards.",
            status: "approved",
            owner: "HR / Legal",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Sanction Policy",
            lastUpdated: "2025-01-10",
            version: "1.0",
            auditTip: "Must specify progressive discipline tiers up to and including immediate termination."
        },
        {
            id: "hipaa-audit-review-procedure",
            category: "safeguards",
            categoryLabel: "Administrative & Physical",
            clause: "45 CFR §164.308(a)(1)(ii)(D)",
            title: "Information System Activity Review Procedure",
            description: "Standard operating procedure for regular audits of access logs, tracking reports, and security incident logs.",
            status: "approved",
            owner: "Security Officer",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Review SOP",
            lastUpdated: "2025-01-18",
            version: "1.0",
            auditTip: "Document frequency of review (e.g. monthly) and retain sampling log evidence."
        },
        {
            id: "hipaa-officer-designation",
            category: "safeguards",
            categoryLabel: "Administrative & Physical",
            clause: "45 CFR §164.308(a)(2) & §164.530(a)",
            title: "Privacy & Security Officer Formal Designations",
            description: "Formal documentation designating statutory HIPAA Privacy and Security Officers with executive mandates.",
            status: "approved",
            owner: "Executive Leadership",
            actionLink: `/clients/${clientId}/people`,
            actionLabel: "Assign Officers",
            lastUpdated: "2025-01-05",
            version: "1.0",
            auditTip: "OCR requires proof that designated officers have appropriate authority and resources."
        },
        {
            id: "hipaa-incident-breach-sop",
            category: "safeguards",
            categoryLabel: "Administrative & Physical",
            clause: "45 CFR §164.308(a)(6) & §164.400–414",
            title: "Incident Response & 60-Day Breach Notification SOP",
            description: "Protocols for 4-factor breach risk assessment, notifications to affected individuals (<60 days), HHS OCR, and media.",
            status: "review",
            owner: "Privacy & Security Officers",
            actionLink: `/clients/${clientId}/cyber/incidents`,
            actionLabel: "Incident Center",
            lastUpdated: "2025-02-01",
            version: "0.9",
            auditTip: "Breaches affecting 500+ individuals require HHS notification without unreasonable delay and <60 days."
        },
        {
            id: "hipaa-baa-repository",
            category: "records",
            categoryLabel: "Mandatory Records",
            clause: "45 CFR §164.502(e) & §164.504(e)",
            title: "Business Associate Agreement (BAA) Repository",
            description: "Fully executed and countersigned BAAs for all vendors, contractors, and cloud hosts handling or touching ePHI.",
            status: "approved",
            owner: "Legal / Compliance",
            actionLink: `/clients/${clientId}/vendors`,
            actionLabel: "BAA Register",
            lastUpdated: "2025-01-25",
            version: "Active",
            auditTip: "Ensure BAAs include required Breach Notification timelines (often 24-72 hours) and subcontractor flow-down terms."
        },
        {
            id: "hipaa-training-records",
            category: "records",
            categoryLabel: "Mandatory Records",
            clause: "45 CFR §164.308(a)(5) & §164.530(j)",
            title: "Workforce Training Records (6-Year Retention)",
            description: "Attendance logs, comprehension quiz scores, and signed acknowledgments maintained for the mandatory 6-year statutory retention period.",
            status: "approved",
            owner: "HR / Training",
            actionLink: `/clients/${clientId}/training/management`,
            actionLabel: "Training Roster",
            lastUpdated: "2025-02-05",
            version: "2025",
            auditTip: "Training must be provided to each new workforce member within a reasonable period of joining."
        },
        {
            id: "hipaa-encryption-standard",
            category: "technical",
            categoryLabel: "Technical & Privacy",
            clause: "45 CFR §164.312(a)(2)(iv) & (e)",
            title: "Transmission & At-Rest Encryption Standard",
            description: "FIPS/NIST compliant encryption for ePHI across databases, object storage, backups, and TLS communications.",
            status: "approved",
            owner: "Engineering",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Encryption Policy",
            lastUpdated: "2025-01-20",
            version: "1.0",
            auditTip: "Failure to encrypt portable devices or cloud buckets containing ePHI creates an irrebuttable breach presumption."
        },
        {
            id: "hipaa-minimum-necessary",
            category: "technical",
            categoryLabel: "Technical & Privacy",
            clause: "45 CFR §164.502(b)",
            title: "Minimum Necessary Standard Operating Procedure",
            description: "Protocols restricting routine and non-routine disclosures and access requests to the minimum ePHI necessary.",
            status: "approved",
            owner: "Privacy Officer",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Privacy Policies",
            lastUpdated: "2025-01-15",
            version: "1.0",
            auditTip: "Must establish role-based access protocols delineating exactly who needs access to which categories of ePHI."
        }
    ]
});

export const getFederalDocuments = (clientId: number): FrameworkDocumentConfig => ({
    frameworkId: "federal",
    frameworkName: "Federal & Defense (NIST 800-171 / CMMC)",
    badge: "DFARS 252.204-7012 • CMMC Level 2 • FedRAMP",
    description: "Statutory defense contractor documentation suite required for safeguarding Controlled Unclassified Information (CUI) and passing C3PAO third-party assessments.",
    categories: [
        { id: "all", label: "All Items" },
        { id: "plans", label: "System Plans" },
        { id: "policies", label: "14-Family Policies" },
        { id: "records", label: "Assessment Records" },
    ],
    documents: [
        {
            id: "fed-ssp",
            category: "plans",
            categoryLabel: "System Plans",
            clause: "NIST 800-171 §3.12.4",
            title: "System Security Plan (SSP)",
            description: "Primary authorization document describing system boundary, operational environment, interconnected systems, and implementation details for all 110 controls.",
            status: "draft",
            owner: "Program Manager / CISO",
            actionLink: `/clients/${clientId}/federal/ssp-171`,
            actionLabel: "SSP Editor",
            lastUpdated: "2025-02-01",
            version: "0.9",
            auditTip: "C3PAO assessors evaluate control implementation against the exact narratives written in the SSP."
        },
        {
            id: "fed-poam",
            category: "plans",
            categoryLabel: "System Plans",
            clause: "NIST 800-171 §3.12.2",
            title: "Plan of Action and Milestones (POA&M)",
            description: "Formal remediation schedule for unmet controls, identifying corrective tasks, resource allocations, milestone completion dates, and risk acceptance justifications.",
            status: "approved",
            owner: "Security Architect",
            actionLink: `/clients/${clientId}/federal/poam`,
            actionLabel: "POA&M Tracker",
            lastUpdated: "2025-02-05",
            version: "1.0",
            auditTip: "CMMC Level 2 allows POA&M only for certain 1-point controls, which must be closed within 180 days of assessment."
        },
        {
            id: "fed-boundary-diagram",
            category: "plans",
            categoryLabel: "System Plans",
            clause: "NIST 800-171 §3.1.3",
            title: "CUI Authorization Boundary & Data Flow Diagram",
            description: "Architectural schematics delineating enclave boundaries, external interfaces, cryptographic boundaries, and CUI flow paths.",
            status: "approved",
            owner: "Network Architect",
            actionLink: `/clients/${clientId}/risks/assets`,
            actionLabel: "Scope Assets",
            lastUpdated: "2025-01-20",
            version: "1.0",
            auditTip: "Enclave isolation dramatically reduces CMMC assessment costs and auditor scope."
        },
        {
            id: "fed-sprs-scorecard",
            category: "records",
            categoryLabel: "Assessment Records",
            clause: "DFARS 252.204-7019/7020",
            title: "SPRS Scorecard & Assessment Submission Record",
            description: "Calculated score (-203 to +110) based on the DoD Assessment Methodology, submitted to the Supplier Performance Risk System.",
            status: "approved",
            owner: "Compliance Director",
            actionLink: `/clients/${clientId}/federal/sprs`,
            actionLabel: "SPRS Tool",
            lastUpdated: "2025-01-15",
            version: "SPRS-2025",
            auditTip: "Required for DoD contract award eligibility under DFARS 252.204-7019."
        },
        {
            id: "fed-fips-certs",
            category: "records",
            categoryLabel: "Assessment Records",
            clause: "NIST 800-171 §3.13.11",
            title: "FIPS 140-2/3 Cryptographic Validation Certificates",
            description: "NIST CMVP certificate ledger verifying that all VPN endpoints, wireless, and disk encryption mechanisms utilize validated cryptographic modules.",
            status: "approved",
            owner: "SecOps",
            actionLink: `/clients/${clientId}/federal/fips-140`,
            actionLabel: "FIPS Tracker",
            lastUpdated: "2025-01-28",
            version: "CMVP-Valid",
            auditTip: "Non-validated commercial crypto algorithms (even AES) fail NIST 800-171 3.13.11."
        },
        {
            id: "fed-sar-dossier",
            category: "records",
            categoryLabel: "Assessment Records",
            clause: "NIST 800-171 §3.12.1",
            title: "Security Assessment Report (SAR) & C3PAO Dossier",
            description: "Third-party assessment report cataloging findings, technical testing results, and certification recommendation.",
            status: "review",
            owner: "C3PAO / Assessor",
            actionLink: `/clients/${clientId}/federal/sar`,
            actionLabel: "SAR Dossier",
            lastUpdated: "2025-02-10",
            version: "0.8",
            auditTip: "Maintained in the official C3PAO assessment package for DIBCAC review."
        },
        {
            id: "fed-irp-dod",
            category: "policies",
            categoryLabel: "14-Family Policies",
            clause: "DFARS 252.204-7012(c)",
            title: "Incident Response Plan & DoD 72-Hour DC3 Reporting SOP",
            description: "Mandated procedures for isolating compromised systems, preserving forensic images for 90 days, and reporting cyber incidents to DC3 / DIBNet within 72 hours.",
            status: "approved",
            owner: "Incident Response Lead",
            actionLink: `/clients/${clientId}/cyber/incidents`,
            actionLabel: "Incident SOP",
            lastUpdated: "2025-01-22",
            version: "1.0",
            auditTip: "Requires a valid DoD Medium Assurance Certificate for submitting DIBNet incident reports."
        },
        {
            id: "fed-14-policies",
            category: "policies",
            categoryLabel: "14-Family Policies",
            clause: "NIST 800-171 §3.1–3.14",
            title: "14-Family Security Policy & Governance Suite",
            description: "Formal policies covering Access Control, Awareness & Training, Audit, Configuration Management, Identification, Incident Response, Maintenance, Media, Personnel, Physical, Risk, Security Assessment, System Protection, and System Integrity.",
            status: "approved",
            owner: "CISO",
            actionLink: `/clients/${clientId}/policies`,
            actionLabel: "Policy Center",
            lastUpdated: "2025-01-18",
            version: "1.0",
            auditTip: "Every policy must be reviewed annually and mapped directly to NIST 800-171 controls."
        }
    ]
});

export const getFrameworkDocuments = (framework: string, clientId: number): FrameworkDocumentConfig | null => {
    switch (framework.toLowerCase()) {
        case "soc2":
            return getSoc2Documents(clientId);
        case "hipaa":
            return getHipaaDocuments(clientId);
        case "federal":
            return getFederalDocuments(clientId);
        default:
            return null;
    }
};
