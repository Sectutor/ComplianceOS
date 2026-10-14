import { StandardQuestion } from "./standardTemplatesData";

export interface PoolSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    domain: string;
    recommendedQuestions: StandardQuestion[];
}

export const MASTER_QUESTION_BANK: StandardQuestion[] = [
    // ----------------------------------------------------
    // 1. ACCESS CONTROL & IDENTITY MANAGEMENT
    // ----------------------------------------------------
    {
        id: 'qb_iam_01',
        text: 'Is Multi-Factor Authentication (MFA) strictly enforced for all administrative access, VPNs, cloud consoles, and production databases?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.17',
        category: 'Identity & Access Management',
        guidance: 'Specify supported MFA factors (FIDO2, hardware keys, authenticator apps).'
    },
    {
        id: 'qb_iam_02',
        text: 'Is user access to customer environments granted strictly upon the principle of least privilege and Role-Based Access Control (RBAC)?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.15',
        category: 'Identity & Access Management',
        guidance: 'Detail user access approval and quarterly review workflows.'
    },
    {
        id: 'qb_iam_03',
        text: 'Are privileged administrative credentials dedicated and strictly segregated from general business user accounts?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 6.2',
        category: 'Identity & Access Management',
        guidance: 'Confirm administrators do not use privileged accounts for standard email/web browsing.'
    },
    {
        id: 'qb_iam_04',
        text: 'Are access permissions revoked within 24 hours of employee departure or immediate role transfer?',
        type: 'yes_no',
        required: true,
        standard: 'SOC 2 Type II',
        controlId: 'CC6.3',
        category: 'Identity & Access Management',
        guidance: 'Attach offboarding ticket samples or automated de-provisioning logs.'
    },
    {
        id: 'qb_iam_05',
        text: 'Are centralized quarterly access reviews conducted and certified by resource owners across all production infrastructure?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 6.5',
        category: 'Identity & Access Management',
        guidance: 'Provide sample quarterly access review certification report.'
    },
    {
        id: 'qb_iam_06',
        text: 'Do you enforce strong enterprise identity federation (SAML 2.0 / OIDC) for customer tenant administration?',
        type: 'yes_no',
        required: false,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-IAM-01',
        category: 'Identity & Access Management',
        guidance: 'Provide IdP provider details (Okta, Azure AD, Ping, Google).'
    },
    {
        id: 'qb_iam_07',
        text: 'Are service accounts, API tokens, and machine credentials rotated at least every 90 days and managed via dedicated secret vaults?',
        type: 'yes_no',
        required: true,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-IAM-03',
        category: 'Identity & Access Management',
        guidance: 'Confirm secret management tooling (HashiCorp Vault, AWS Secrets Manager).'
    },

    // ----------------------------------------------------
    // 2. DATA PROTECTION & CRYPTOGRAPHY
    // ----------------------------------------------------
    {
        id: 'qb_cry_01',
        text: 'Is customer data encrypted in transit using modern TLS (v1.2 or v1.3) with strong cipher suites across all public and internal microservice endpoints?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.24',
        category: 'Data Protection & Cryptography',
        guidance: 'Provide SSL Labs report or cipher suite configuration summary.'
    },
    {
        id: 'qb_cry_02',
        text: 'Is customer data encrypted at rest across all databases, object storage, and backups using industry-standard algorithms (AES-256)?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.11',
        category: 'Data Protection & Cryptography',
        guidance: 'Confirm key management practices (AWS KMS, Azure Key Vault, Google Cloud KMS).'
    },
    {
        id: 'qb_cry_03',
        text: 'Are cryptographic keys rotated at least annually and managed strictly within FIPS 140-2/3 Level 2+ Hardware Security Modules (HSM)?',
        type: 'yes_no',
        required: true,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-CRY-02',
        category: 'Data Protection & Cryptography',
        guidance: 'Provide key management lifecycle policy documentation.'
    },
    {
        id: 'qb_cry_04',
        text: 'Does your service support Bring Your Own Key (BYOK) or customer-managed encryption keys for tenant-level encryption at rest?',
        type: 'yes_no',
        required: false,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-CRY-01',
        category: 'Data Protection & Cryptography',
        guidance: 'Confirm KMS integration options.'
    },
    {
        id: 'qb_cry_05',
        text: 'Are data masking, tokenization, or DLP controls applied to sensitive customer datasets to ensure production data is never copied into non-production environments?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.12',
        category: 'Data Protection & Cryptography',
        guidance: 'Confirm that production data is never copied unmasked into dev/test.'
    },
    {
        id: 'qb_cry_06',
        text: 'Do you enforce automated data retention rules and execute NIST 800-88 compliant cryptographic data sanitization upon customer contract termination?',
        type: 'yes_no',
        required: true,
        standard: 'SOC 2 Type II',
        controlId: 'C1.1',
        category: 'Data Protection & Cryptography',
        guidance: 'Attach standard certificate of data destruction workflow.'
    },

    // ----------------------------------------------------
    // 3. THIRD-PARTY SUPPLY CHAIN & SUB-PROCESSORS
    // ----------------------------------------------------
    {
        id: 'qb_sup_01',
        text: 'Do you maintain an active, centralized inventory of all third-party service providers, cloud providers, and sub-processors with classification of data processed?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 15.1',
        category: 'Supply Chain & Fourth-Party Risk',
        guidance: 'Ensure all sub-processors handling customer data are cataloged.'
    },
    {
        id: 'qb_sup_02',
        text: 'Do all third-party vendor and sub-processor contracts include explicit requirements for data confidentiality, security safeguards, and mandatory breach notification?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.20',
        category: 'Supply Chain & Fourth-Party Risk',
        guidance: 'Confirm presence of mandatory cybersecurity terms in vendor MSAs and DPAs.'
    },
    {
        id: 'qb_sup_03',
        text: 'Do you conduct annual security reviews and verify compliance attestations (SOC 2, ISO 27001) for all critical vendors in your supply chain?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 15.4',
        category: 'Supply Chain & Fourth-Party Risk',
        guidance: 'Describe cadence for reviewing vendor security certifications.'
    },
    {
        id: 'qb_sup_04',
        text: 'Do you provide at least 30 days prior written notice before onboarding any new sub-processors, granting customers the right to review and object?',
        type: 'yes_no',
        required: true,
        standard: 'GDPR',
        controlId: 'Article 28(4)',
        category: 'Supply Chain & Fourth-Party Risk',
        guidance: 'Provide link to public sub-processor notification registry or RSS feed.'
    },
    {
        id: 'qb_sup_05',
        text: 'Do you maintain formal risk governance and cloud shared responsibility matrices for public cloud providers (AWS, Azure, GCP) hosting customer data?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.22',
        category: 'Supply Chain & Fourth-Party Risk',
        guidance: 'List cloud infrastructure partners and shared responsibility matrices.'
    },

    // ----------------------------------------------------
    // 4. THREAT, VULNERABILITY & PENETRATION TESTING
    // ----------------------------------------------------
    {
        id: 'qb_vuln_01',
        text: 'Do you conduct monthly vulnerability scans across all public IP ranges, container clusters, and internal production networks?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 7.1',
        category: 'Vulnerability & Threat Management',
        guidance: 'State scanner tooling (Qualys, Nessus, Rapid7, AWS Inspector).'
    },
    {
        id: 'qb_vuln_02',
        text: 'Are Critical security vulnerabilities remediated within 14 calendar days and High severity vulnerabilities patched within 30 calendar days?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.8',
        category: 'Vulnerability & Threat Management',
        guidance: 'Provide vulnerability management SLA policy and remediation metrics.'
    },
    {
        id: 'qb_vuln_03',
        text: 'Do you undergo annual independent third-party penetration testing of your external perimeter, APIs, and web applications?',
        type: 'file_upload',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.32',
        category: 'Vulnerability & Threat Management',
        guidance: 'Upload the Executive Summary / Attestation letter of your most recent penetration test.'
    },
    {
        id: 'qb_vuln_04',
        text: 'Is automated Endpoint Detection and Response (EDR) or anti-malware deployed and updated continuously across 100% of servers and corporate endpoints?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 10.1',
        category: 'Vulnerability & Threat Management',
        guidance: 'State EDR vendor (CrowdStrike, SentinelOne, Defender) and fleet coverage.'
    },
    {
        id: 'qb_vuln_05',
        text: 'Do you maintain a Bug Bounty Program or formal Vulnerability Disclosure Policy (VDP) with a designated security.txt reporting point?',
        type: 'yes_no',
        required: false,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-TVM-02',
        category: 'Vulnerability & Threat Management',
        guidance: 'Provide link to public bug bounty or VDP page.'
    },

    // ----------------------------------------------------
    // 5. APPLICATION & API SECURITY (SSDLC)
    // ----------------------------------------------------
    {
        id: 'qb_app_01',
        text: 'Do you enforce a documented Secure Software Development Lifecycle (SSDLC) with mandatory automated SAST/DAST code security scanning in CI/CD?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.25',
        category: 'Application & API Security',
        guidance: 'Detail code security scanning tooling (Snyk, SonarQube, GitHub Advanced Security).'
    },
    {
        id: 'qb_app_02',
        text: 'Do all software releases require documented peer review, automated integration tests, and formal management approval prior to production merge?',
        type: 'yes_no',
        required: true,
        standard: 'SOC 2 Type II',
        controlId: 'CC8.1',
        category: 'Application & API Security',
        guidance: 'Confirm segregation of duties between developers and production deployers.'
    },
    {
        id: 'qb_app_03',
        text: 'Are public application programming interfaces (APIs) protected against unauthorized calls via rate limiting, OAuth 2.0, and Web Application Firewalls (WAF)?',
        type: 'yes_no',
        required: true,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-AIS-02',
        category: 'Application & API Security',
        guidance: 'Confirm WAF and API gateway deployment (Cloudflare, AWS WAF, Akamai).'
    },
    {
        id: 'qb_app_04',
        text: 'Are open-source software libraries and third-party dependencies continuously monitored for known vulnerabilities and supply chain tampering (SCA)?',
        type: 'yes_no',
        required: true,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-AIS-03',
        category: 'Application & API Security',
        guidance: 'State Software Composition Analysis (SCA) tooling.'
    },

    // ----------------------------------------------------
    // 6. BUSINESS CONTINUITY, BACKUPS & DISASTER RECOVERY
    // ----------------------------------------------------
    {
        id: 'qb_bc_01',
        text: 'Are automated daily backups executed for all customer databases and object stores, with encrypted off-site replication?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 11.1',
        category: 'Business Continuity & Disaster Recovery',
        guidance: 'Confirm backup frequency and replication strategy.'
    },
    {
        id: 'qb_bc_02',
        text: 'Are customer databases and computing workloads replicated across multiple independent availability zones (Multi-AZ) or regions?',
        type: 'yes_no',
        required: true,
        standard: 'CSA CAIQ v4',
        controlId: 'CCM-BCR-01',
        category: 'Business Continuity & Disaster Recovery',
        guidance: 'Specify RTO (Recovery Time Objective) and RPO (Recovery Point Objective) targets.'
    },
    {
        id: 'qb_bc_03',
        text: 'Do you conduct full-scale disaster recovery failover exercises and backup data restoration drills at least once every 12 months?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.29',
        category: 'Business Continuity & Disaster Recovery',
        guidance: 'Provide date of last DR exercise and executive summary of test results.'
    },
    {
        id: 'qb_bc_04',
        text: 'Does your service commit to minimum uptime SLAs (e.g., 99.9%+) and maintain a real-time public or authenticated status page?',
        type: 'yes_no',
        required: true,
        standard: 'SOC 2 Type II',
        controlId: 'A1.1',
        category: 'Business Continuity & Disaster Recovery',
        guidance: 'Provide public status page URL or contractual SLA terms.'
    },

    // ----------------------------------------------------
    // 7. INCIDENT MANAGEMENT & BREACH NOTIFICATION
    // ----------------------------------------------------
    {
        id: 'qb_ir_01',
        text: 'Do you maintain a documented and tested Incident Response Plan with designated incident commanders, triage playbooks, and 24/7 escalation contacts?',
        type: 'yes_no',
        required: true,
        standard: 'CIS Controls v8',
        controlId: 'CIS 17.1',
        category: 'Incident Response & Breach Notification',
        guidance: 'Attach Incident Response Plan overview and 24/7 security contact.'
    },
    {
        id: 'qb_ir_02',
        text: 'Do you contractually commit to notifying our security team in writing within 48 to 72 hours of any confirmed security incident impacting customer data?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.5.24',
        category: 'Incident Response & Breach Notification',
        guidance: 'Verify breach notification SLA in enterprise agreement.'
    },
    {
        id: 'qb_ir_03',
        text: 'Are security event logs and system audit trails retained for a minimum of 365 days and actively monitored by a SIEM / SOC?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 27001:2022',
        controlId: 'A.8.15',
        category: 'Incident Response & Breach Notification',
        guidance: 'State SIEM tooling (Splunk, Datadog, SumoLogic) and active log retention.'
    },

    // ----------------------------------------------------
    // 8. AI & GENERATIVE LLM GOVERNANCE
    // ----------------------------------------------------
    {
        id: 'qb_ai_01',
        text: 'Do you guarantee contractually that customer prompts, inputs, embeddings, and generated outputs will NEVER be used to train or improve your foundation models?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 42001',
        controlId: 'A.6.2.2',
        category: 'AI & Generative LLM Governance',
        guidance: 'Attach terms of service or enterprise DPA excerpt with explicit zero-training commitment.'
    },
    {
        id: 'qb_ai_02',
        text: 'What is your maximum retention period for cached customer prompts, completions, and context windows before permanent deletion?',
        type: 'text',
        required: true,
        standard: 'NIST AI RMF',
        controlId: 'GOVERN-1.2',
        category: 'AI & Generative LLM Governance',
        guidance: 'Specify zero-retention / 30-day abuse monitoring terms.'
    },
    {
        id: 'qb_ai_03',
        text: 'Are customer embeddings, RAG knowledge bases, and fine-tuned model adapter weights isolated in dedicated tenant namespaces?',
        type: 'yes_no',
        required: true,
        standard: 'ISO/IEC 42001',
        controlId: 'A.8.4',
        category: 'AI & Generative LLM Governance',
        guidance: 'Provide vector database tenancy and key encryption details.'
    },
    {
        id: 'qb_ai_04',
        text: 'Do you deploy automated prompt injection filtering, jailbreak detection, and output moderation guardrails on your AI endpoints?',
        type: 'yes_no',
        required: true,
        standard: 'OWASP Top 10 LLM',
        controlId: 'LLM01:2025',
        category: 'AI & Generative LLM Governance',
        guidance: 'Detail input/output sanitization and guardrail architecture.'
    },
    {
        id: 'qb_ai_05',
        text: 'Does your enterprise contract include uncapped copyright infringement indemnification for outputs generated by your models?',
        type: 'yes_no',
        required: true,
        standard: 'AI Governance',
        controlId: 'IP-INDEM-01',
        category: 'AI & Generative LLM Governance',
        guidance: 'Reference IP defense and uncapped indemnification clauses.'
    },

    // ----------------------------------------------------
    // 9. PRIVACY & REGULATORY COMPLIANCE (GDPR & HIPAA)
    // ----------------------------------------------------
    {
        id: 'qb_priv_01',
        text: 'Does your organization process personal data strictly upon documented instructions from the controller, as required by GDPR Article 28(3)(a)?',
        type: 'yes_no',
        required: true,
        standard: 'GDPR',
        controlId: 'Article 28(3)(a)',
        category: 'Privacy & Regulatory Compliance',
        guidance: 'Provide standard Data Processing Addendum (DPA).'
    },
    {
        id: 'qb_priv_02',
        text: 'For cross-border data transfers outside the EEA, do you execute the 2021 European Commission Standard Contractual Clauses (SCCs)?',
        type: 'yes_no',
        required: true,
        standard: 'GDPR',
        controlId: 'Article 46',
        category: 'Privacy & Regulatory Compliance',
        guidance: 'Provide TIA template or executive summary.'
    },
    {
        id: 'qb_priv_03',
        text: 'Will your organization execute a standard Business Associate Agreement (BAA) without material modifications for PHI processing?',
        type: 'yes_no',
        required: true,
        standard: 'HIPAA',
        controlId: '45 CFR § 164.502(e)',
        category: 'Privacy & Regulatory Compliance',
        guidance: 'Provide copy of standard enterprise BAA.'
    },
    {
        id: 'qb_priv_04',
        text: 'Please upload your latest independent SOC 2 Type II Report, ISO 27001 Certificate, or CSA STAR Registry Attestation.',
        type: 'file_upload',
        required: true,
        standard: 'Compliance Attestation',
        controlId: 'AUDIT-01',
        category: 'Privacy & Regulatory Compliance',
        guidance: 'Audit report must cover period within the preceding 12 months.'
    }
];

export const SECTION_POOL: PoolSection[] = [
    {
        id: 'sec_iam',
        title: 'Identity & Access Management (IAM)',
        description: 'MFA enforcement, role-based access control (RBAC), credential lifecycle, and quarterly reviews.',
        icon: 'Lock',
        domain: 'Access Control',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Identity & Access Management')
    },
    {
        id: 'sec_crypto',
        title: 'Data Protection & Cryptography',
        description: 'Encryption in transit (TLS 1.2+), encryption at rest (AES-256), KMS key rotation, and data sanitization.',
        icon: 'ShieldCheck',
        domain: 'Cryptography',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Data Protection & Cryptography')
    },
    {
        id: 'sec_supply',
        title: 'Third-Party Supply Chain & Sub-processors',
        description: 'Sub-processor cataloging, mandatory contractual cybersecurity clauses, and fourth-party risk governance.',
        icon: 'Layers',
        domain: 'Supply Chain',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Supply Chain & Fourth-Party Risk')
    },
    {
        id: 'sec_vuln',
        title: 'Threat, Vulnerability & Penetration Testing',
        description: 'Monthly vulnerability scanning, 14-day patch SLAs, annual independent penetration tests, and EDR deployment.',
        icon: 'ShieldAlert',
        domain: 'Vulnerability Management',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Vulnerability & Threat Management')
    },
    {
        id: 'sec_appsec',
        title: 'Application & API Security (SSDLC)',
        description: 'Automated SAST/DAST code analysis, peer code review, API rate limiting, WAF, and open-source SCA.',
        icon: 'Cpu',
        domain: 'AppSec',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Application & API Security')
    },
    {
        id: 'sec_bcdr',
        title: 'Business Continuity & Disaster Recovery',
        description: 'Automated backups, Multi-AZ replication, annual DR failover drills, and uptime SLA commitments.',
        icon: 'Cloud',
        domain: 'Resilience',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Business Continuity & Disaster Recovery')
    },
    {
        id: 'sec_ir',
        title: 'Incident Response & Breach Notification',
        description: 'Tested IR plans, 48-72h contractual breach notification commitments, and 365-day SIEM log retention.',
        icon: 'AlertTriangle',
        domain: 'Incident Response',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Incident Response & Breach Notification')
    },
    {
        id: 'sec_ai',
        title: 'AI & Generative LLM Governance',
        description: 'Zero-data-training guarantee, prompt injection defenses, vector database isolation, and copyright indemnity.',
        icon: 'Sparkles',
        domain: 'AI Governance',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'AI & Generative LLM Governance')
    },
    {
        id: 'sec_privacy',
        title: 'Privacy & Regulatory Compliance (GDPR & HIPAA)',
        description: 'GDPR Article 28 DPA, EU Standard Contractual Clauses (SCCs), HIPAA BAA agreements, and SOC 2 audits.',
        icon: 'Globe',
        domain: 'Privacy & Legal',
        recommendedQuestions: MASTER_QUESTION_BANK.filter(q => q.category === 'Privacy & Regulatory Compliance')
    }
];
