/**
 * Authoritative Statutory Framework Policy Suites
 * Comprehensive corporate compliance suites mapped to statutory articles, regulatory standards (RTS/ITS), and audit criteria.
 */

export interface PolicyDirectives {
    purposeText: string;
    scopeText: string;
    coreRules: { title: string; rules: string[] }[];
    procedures: { step: string; action: string }[];
    monitoringEvidence: string[];
}

export interface FrameworkPolicyDefinition {
    id: string;
    name: string;
    statutoryRef: string;
    clauseBadge: string;
    description: string;
    keyControls: string[];
    directives: PolicyDirectives;
    defaultContent: (companyName: string) => string;
}

export interface FrameworkSuite {
    frameworkId: string;
    frameworkName: string;
    shortName: string;
    badge: string;
    color: string;
    bgLight: string;
    borderColor: string;
    textColor: string;
    description: string;
    statutoryBody: string;
    policies: FrameworkPolicyDefinition[];
}

/**
 * Builds a comprehensive, multi-page, audit-ready compliance policy document
 */
export function buildPolicyDocument(
    companyName: string,
    policyName: string,
    statutoryRef: string,
    clauseBadge: string,
    frameworkName: string,
    statutoryBody: string,
    directives: PolicyDirectives
): string {
    const today = new Date();
    const effectiveDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const nextReview = new Date(today.setFullYear(today.getFullYear() + 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const coreRulesFormatted = directives.coreRules.map((section, idx) => {
        const rulesList = section.rules.map(r => `  - ${r}`).join('\n');
        return `#### 4.${idx + 1} ${section.title}\n${rulesList}`;
    }).join('\n\n');

    const proceduresFormatted = directives.procedures.map((proc, idx) => {
        return `| **Step ${idx + 1}: ${proc.step}** | ${proc.action} |`;
    }).join('\n');

    const evidenceList = directives.monitoringEvidence.map(e => `- **Evidence Artifact:** ${e}`).join('\n');

    return `# ${policyName}

| Document Metadata | Specification |
| :--- | :--- |
| **Organization Name** | ${companyName} |
| **Document Classification** | Internal Compliance — Confidential |
| **Regulatory Authority** | ${statutoryBody} |
| **Statutory / Standard Basis** | ${frameworkName} • ${statutoryRef} (${clauseBadge}) |
| **Document Version** | 1.0 (Approved Production Baseline) |
| **Effective Date** | ${effectiveDate} |
| **Next Review Schedule** | ${nextReview} (Mandatory Annual Cycle) |
| **Policy Governance** | Executive Management Body, CISO & Legal Counsel |

---

### 1. Purpose & Statutory Alignment
${directives.purposeText} This policy constitutes an official corporate governance requirement of ${companyName} designed to demonstrate full conformity with ${frameworkName}, specifically enforcing ${statutoryRef}.

---

### 2. Scope & Applicability
${directives.scopeText}
- **Covered Entities:** All wholly owned subsidiaries, operational units, and regional business branches of ${companyName}.
- **Covered Environments:** Production cloud platforms (AWS, GCP, Azure), staging/development enclaves, and internal operational networks.
- **Covered Personnel:** 100% of executive leaders, full-time employees, contractors, temporary workers, and third-party vendors accessing ${companyName}'s systems.

---

### 3. Roles & Responsibilities

| Role / Function | Operational Responsibilities |
| :--- | :--- |
| **Executive Management Body** | Maintains ultimate statutory accountability, approves policy baselines, allocates budget, and reviews audit findings at least annually. |
| **Chief Information Security Officer (CISO)** | Directs enterprise implementation, monitors control effectiveness, supervises remediation SLAs, and interfaces with regulatory auditors. |
| **System Owners & Technical Leads** | Implement mandatory technical configurations, enforce automated testing gates, and maintain evidence logs within their applications. |
| **Workforce Members & Contractors** | Strictly adhere to established operational standards, complete annual compliance training, and report anomalies immediately. |

---

### 4. Mandatory Technical Directives & Control Standards

${coreRulesFormatted}

---

### 5. Implementation Procedures & Standard Operating Protocols

| Procedure Stage | Operating Mandate |
| :--- | :--- |
${proceduresFormatted}

---

### 6. Continuous Monitoring, Telemetry & Audit Evidence
${companyName} maintains continuous surveillance and automated evidence collection to ensure persistent conformity with this policy:
${evidenceList}
- **Log Centralization:** Relevant security events and administrative actions are streamed in real time to an immutable, centralized SIEM repository.
- **Independent Verification:** Internal audit teams or independent third-party assessors audit compliance with this policy at least once every 12 months.

---

### 7. Exceptions & Non-Compliance Enforcement
7.1 **Policy Exceptions:** Any technical or operational inability to comply with this policy requires a formal Exception Request submitted to the CISO. Exceptions must detail compensating security controls, risk rating, and a remediation roadmap not exceeding 90 days. Approved exceptions must be logged in the Enterprise Risk Register.  
7.2 **Disciplinary Sanctions:** Willful disregard or unauthorized deviation from this policy threatens the security posture and regulatory standing of ${companyName} and will result in disciplinary action up to and including immediate termination of employment or contract, and potential civil or statutory liability.

---

### 8. Document Revision & Approval Schedule

| Version | Approval Date | Change Summary | Approved By |
| :--- | :--- | :--- | :--- |
| **v1.0** | ${effectiveDate} | Initial baseline formalization and regulatory alignment. | Chief Information Security Officer & Management Board |
`;
}

function makePolicy(
    id: string,
    name: string,
    statutoryRef: string,
    clauseBadge: string,
    description: string,
    keyControls: string[],
    frameworkName: string,
    statutoryBody: string,
    directives: PolicyDirectives
): FrameworkPolicyDefinition {
    return {
        id,
        name,
        statutoryRef,
        clauseBadge,
        description,
        keyControls,
        directives,
        defaultContent: (c: string) => buildPolicyDocument(
            c || "Organization",
            name,
            statutoryRef,
            clauseBadge,
            frameworkName,
            statutoryBody,
            directives
        )
    };
}

export const FRAMEWORK_POLICY_SUITES: Record<string, FrameworkSuite> = {
    // -------------------------------------------------------------------------
    // 1. EU DORA (Regulation (EU) 2022/2554 & RTS/ITS) - 12 COMPREHENSIVE POLICIES
    // -------------------------------------------------------------------------
    dora: {
        frameworkId: 'dora',
        frameworkName: 'EU DORA (Regulation 2022/2554)',
        shortName: 'DORA',
        badge: 'EU Regulation 2022/2554 • Financial Sector Digital Operational Resilience',
        color: 'bg-cyan-700',
        bgLight: 'bg-cyan-50/70 dark:bg-cyan-950/20',
        borderColor: 'border-cyan-200 dark:border-cyan-800/60',
        textColor: 'text-cyan-800 dark:text-cyan-300',
        description: 'Comprehensive statutory ICT governance, resilience testing, and risk management policy package for financial entities and critical ICT third-party service providers (CTPPs).',
        statutoryBody: 'European Supervisory Authorities (EBA, EIOPA, ESMA) & National Competent Authorities',
        policies: [
            makePolicy(
                'dora-ict-risk',
                'ICT Risk Management Framework Master Policy',
                'DORA Articles 5 & 6',
                'Art. 5 & 6',
                'Establishes management body accountability, risk tolerance thresholds, defense-in-depth architecture, and the annual ICT risk strategy review.',
                ['Management body ultimate accountability', 'Continuous risk identification', 'Annual review & board sign-off'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'This policy defines the comprehensive governance structure, management body responsibilities, and defense-in-depth ICT framework required to ensure digital operational resilience across all financial activities.',
                    scopeText: 'Applies to all Information and Communication Technology (ICT) assets, business processing systems, networks, third-party software enclaves, and cloud infrastructure.',
                    coreRules: [
                        {
                            title: 'Management Body Ultimate Accountability',
                            rules: [
                                'The Management Board bears ultimate statutory responsibility for governing, approving, and overseeing all ICT risk management strategies.',
                                'Mandatory digital operational resilience training must be completed by all board members annually.',
                                'The Board reviews and approves the Digital Operational Resilience Strategy, risk tolerance thresholds, and annual ICT budget at least annually.'
                            ]
                        },
                        {
                            title: 'Defense-in-Depth Architecture & Risk Assessment',
                            rules: [
                                'Technical security controls must be deployed across perimeter, network, host, application, and data layers to eliminate single points of failure.',
                                'Comprehensive all-hazards ICT risk assessments must be executed annually or upon any material change to infrastructure.',
                                'ICT risks must be quantified against business impact criteria, evaluating financial loss, market disruption, and client impact.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Annual Strategy Formulation', action: 'CISO drafts the digital operational resilience roadmap; Board formally debates and approves the strategy.' },
                        { step: 'Continuous Risk Register Updates', action: 'Risk analysts log emerging vulnerabilities, threat intel alerts, and audit findings with quantitative severity ratings.' },
                        { step: 'Executive Board Escalation', action: 'Any breach of risk tolerance or failure of critical ICT controls triggers immediate emergency notification to the Board Chair.' }
                    ],
                    monitoringEvidence: [
                        'Board meeting minutes documenting annual ICT resilience strategy approval and resource allocation.',
                        'Enterprise ICT Risk Register showing quantitative impact scoring and treatment status.',
                        'Board member training completion certificates on digital operational resilience.'
                    ]
                }
            ),
            makePolicy(
                'dora-incident-reporting',
                'Major ICT-Related Incident Classification & Notification Policy',
                'DORA Articles 17–23 & JC 2023 83',
                'Art. 17–23',
                'Defines quantitative impact criteria for major ICT incidents and sets strict statutory reporting timelines (4h / 72h / 1 month) to competent financial regulators.',
                ['4h initial notification SLA', '72h intermediate status report', '1-month final root cause analysis'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Establishes the quantitative criteria for classifying major ICT incidents and defines mandatory statutory notification procedures to competent financial supervisory authorities within strict deadlines.',
                    scopeText: 'Covers all production systems, digital banking/financial APIs, cloud providers, and transactional databases supporting critical or important business functions.',
                    coreRules: [
                        {
                            title: 'Major Incident Classification Thresholds',
                            rules: [
                                'An incident is classified as Major if it impacts critical functions and exceeds: > 10% of active clients or > 100,000 users affected; or direct financial impact > €100,000; or unexpected service downtime > 2 hours.',
                                'Incidents compromising data integrity of financial transaction records or customer credentials must be classified as Major automatically.'
                            ]
                        },
                        {
                            title: 'Statutory Supervisory Notification Deadlines',
                            rules: [
                                'Initial Notification: Transmit to the competent national authority within 4 hours of classification (and no later than 24 hours after detection).',
                                'Intermediate Report: Transmit within 72 hours detailing containment measures, counterparty impacts, and recovery progress.',
                                'Final Report: Transmit within 1 month providing exhaustive forensic root cause analysis and permanent corrective actions.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Incident Triage & Scoring', action: 'Security Incident Response Team (SIRT) calculates quantitative thresholds using the DORA classification matrix.' },
                        { step: 'Supervisory Dispatch', action: 'Compliance Officer submits the standardized European Supervisory Authority XML/JSON notification payload.' },
                        { step: 'Post-Incident Forensic RCA', action: 'Lead forensic investigator compiles the detailed root cause analysis and logs CAPA items in the corrective action tracker.' }
                    ],
                    monitoringEvidence: [
                        'Incident triage logs with automated DORA quantitative criteria calculation snapshots.',
                        'Supervisory authority submission receipts with exact transmission timestamps.',
                        'Post-incident forensic root cause reports and remediation tickets.'
                    ]
                }
            ),
            makePolicy(
                'dora-bcp-dr',
                'ICT Business Continuity & Disaster Recovery Policy',
                'DORA Articles 11 & 12',
                'Art. 11 & 12',
                'Mandates annual Business Impact Analyses (BIA), Maximum Tolerable Downtime (MTD), RTO/RPO targets, and full disaster recovery failover testing.',
                ['Annual BIA for critical functions', 'Multi-region failover testing', 'RTO < 2h & RPO < 15m targets'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Ensures the continuous availability and prompt restoration of critical financial processing systems, defining recovery targets and disaster failover mandates.',
                    scopeText: 'Encompasses all core transactional systems, client-facing portals, payment gateways, and underlying cloud infrastructure.',
                    coreRules: [
                        {
                            title: 'Business Impact Analysis & Recovery Metrics',
                            rules: [
                                'An annual Business Impact Analysis (BIA) must quantify Maximum Tolerable Period of Disruption (MTPD) for every core business function.',
                                'Recovery Time Objective (RTO) for critical transaction processing must not exceed 2 hours.',
                                'Recovery Point Objective (RPO) for core customer ledger and transaction databases must not exceed 15 minutes.'
                            ]
                        },
                        {
                            title: 'Redundancy & Live Failover Testing',
                            rules: [
                                'Primary transactional infrastructure must maintain automated multi-availability-zone failover with geographical separation.',
                                'Simulated disaster recovery failover tests must be executed in production-equivalent environments at least annually.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Annual BIA Execution', action: 'Business continuity lead interviews process owners, calculates financial loss per hour of downtime, and updates RTO/RPO metrics.' },
                        { step: 'Disaster Simulation Drill', action: 'Engineering triggers simulated primary region isolation; verify secondary cluster promotes to active status within RTO.' },
                        { step: 'Audit Certification', action: 'Independent auditor verifies failover test logs, data consistency hashes, and sign-offs from the Operations Director.' }
                    ],
                    monitoringEvidence: [
                        'Annual Business Impact Analysis (BIA) signed report with quantitative loss metrics.',
                        'Documented DR failover drill execution logs showing automated transition under 2 hours.',
                        'Continuous database replication lag monitoring graphs showing RPO adherence.'
                    ]
                }
            ),
            makePolicy(
                'dora-resilience-testing',
                'Digital Operational Resilience Testing & TLPT Policy',
                'DORA Articles 24–27 & RTS on TLPT',
                'Art. 24–27',
                'Annual testing program covering vulnerability assessments, open source software scanning, scenario testing, and Threat-Led Penetration Testing (TIBER-EU).',
                ['Annual vulnerability scans', 'Third-party code audits', 'Triennial Threat-Led Pentests (TLPT)'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Defines the enterprise testing framework for assessing system vulnerabilities, resilience to advanced cyber threats, and threat-led penetration testing in accordance with DORA Chapter IV.',
                    scopeText: 'Applies to all production applications, container clusters, network perimeters, external APIs, and outsourced ICT service connections.',
                    coreRules: [
                        {
                            title: 'Continuous & Annual Testing Program',
                            rules: [
                                'Automated vulnerability scanning across external and internal endpoints must execute on a weekly basis.',
                                'Static Application Security Testing (SAST) and software dependency scanning must gate all code deployments.',
                                'Independent third-party penetration testing of external attack surfaces must occur at least annually.'
                            ]
                        },
                        {
                            title: 'Advanced Threat-Led Penetration Testing (TLPT)',
                            rules: [
                                'When designated by supervisory authorities, advanced Threat-Led Penetration Testing (TLPT) conforming to the TIBER-EU framework must be conducted every 3 years.',
                                'TLPT tests must execute on live production systems and include in-scope critical third-party ICT service providers.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Testing Scope Determination', action: 'Identify all critical financial services, underlying systems, and external vendor dependencies for the annual test cycle.' },
                        { step: 'CREST Certified Execution', action: 'Contract accredited external ethical hacking teams to execute simulated red-team attacks.' },
                        { step: 'Remediation Roadmap', action: 'All Critical findings must be remediated within 14 calendar days; High findings within 30 days.' }
                    ],
                    monitoringEvidence: [
                        'Annual external penetration test report signed by CREST/GIAC certified assessors.',
                        'Continuous vulnerability scanner dashboard exports showing zero unmitigated critical CVEs.',
                        'TLPT test summary report submitted to supervisory authorities.'
                    ]
                }
            ),
            makePolicy(
                'dora-third-party-governance',
                'ICT Third-Party Service Provider Governance & Register Policy',
                'DORA Article 28 & Implementing Standards',
                'Art. 28',
                'Governs the full lifecycle of ICT contracts, concentration risks, the mandatory Register of Information, and statutory audit access clauses.',
                ['Mandatory Register of Information', 'Pre-contractual due diligence', 'Contractual right to audit'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Establishes the management framework for identifying, monitoring, and mitigating risks stemming from third-party ICT service providers, including the statutory Register of Information.',
                    scopeText: 'Applies to all third-party software, cloud providers (AWS, Azure, GCP), SaaS vendors, and managed security service providers (MSPs).',
                    coreRules: [
                        {
                            title: 'Mandatory Register of Information',
                            rules: [
                                'A comprehensive Register of Information must catalog all contractual arrangements for ICT services across the enterprise.',
                                'The register must explicitly differentiate providers supporting critical or important functions from standard ICT suppliers.',
                                'The register must be submitted to competent supervisory authorities annually or upon supervisory request.'
                            ]
                        },
                        {
                            title: 'Mandatory Contractual Safeguards',
                            rules: [
                                'All contracts with ICT providers must guarantee unrestricted audit and inspection access for the organization and regulatory authorities.',
                                'Service Level Agreements (SLAs) with quantitative performance indicators must be legally binding in all vendor contracts.',
                                'Vendors must contractually commit to reporting security incidents to the organization within 24 hours of discovery.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Vendor Pre-Contract Due Diligence', action: 'Third-Party Risk team reviews vendor SOC 2 reports, ISO 27001 certificates, and operational resilience disclosures.' },
                        { step: 'Register of Information Entry', action: 'Log contract details, critical service mapping, and subcontractor chains into the central register.' },
                        { step: 'Annual Performance Review', action: 'Review vendor SLA adherence, incident frequency, and financial stability scorecards.' }
                    ],
                    monitoringEvidence: [
                        'Current Register of Information conforming to European Supervisory Authority ITS schema.',
                        'Signed vendor contracts containing explicit statutory audit and inspection clauses.',
                        'Annual third-party security due diligence review scorecards.'
                    ]
                }
            ),
            makePolicy(
                'dora-subcontracting-exit',
                'ICT Subcontracting & Exit Strategy Policy',
                'DORA Articles 28(8) & 30 & RTS on Subcontracting',
                'Art. 28(8) & 30',
                'Sets rules for multi-tier subcontractor monitoring, continuous chain of compliance, and documented, executable transition/exit plans.',
                ['Subcontractor pre-approval', 'Concentration risk limits', 'Tested exit strategies'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Governs the conditions under which ICT third parties may subcontract services supporting critical functions, and mandates executable transition and exit strategies.',
                    scopeText: 'All critical ICT third-party vendors and their downstream subcontracting partners.',
                    coreRules: [
                        {
                            title: 'Subcontracting Oversight & Approval',
                            rules: [
                                'Third-party providers supporting critical functions may not subcontract services without prior written notification and formal approval.',
                                'The primary contractor remains strictly liable for subcontractor compliance with all operational resilience requirements.'
                            ]
                        },
                        {
                            title: 'Executable Transition & Exit Strategies',
                            rules: [
                                'Every critical ICT service must maintain a documented exit plan defining alternative providers or in-house repatriation procedures.',
                                'Exit plans must guarantee complete data export in standardized, open formats without vendor lock-in.',
                                'Exit plans must be tested through operational simulation at least once every 24 months.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Subcontractor Chain Mapping', action: 'Map all downstream subcontractors and evaluate concentration risk across the supply chain.' },
                        { step: 'Exit Plan Testing', action: 'Simulate vendor termination; test data extraction, cryptographic key transfer, and system cutover.' },
                        { step: 'Contractual Exit Clauses', action: 'Enforce transition assistance clauses requiring the incumbent provider to maintain operations during handover.' }
                    ],
                    monitoringEvidence: [
                        'Documented exit plans for all critical ICT third-party arrangements.',
                        'Exit strategy simulation test reports with data export validation hashes.',
                        'Subcontractor chain registry with explicit approval records.'
                    ]
                }
            ),
            makePolicy(
                'dora-asset-management',
                'ICT Asset Management & Configuration Policy',
                'DORA Article 8 & RTS on ICT Risk Management',
                'Art. 8',
                'Mandates an exhaustive, automated inventory of hardware, software, virtual assets, and network endpoints with continuous configuration hardening.',
                ['Automated asset discovery', 'CIS/NIST baseline hardening', 'Quarterly configuration audits'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Mandates the continuous discovery, identification, classification, and hardening of all ICT hardware, software, virtual, and cloud assets.',
                    scopeText: 'All physical servers, virtual machines, cloud instances, container pods, network switches, endpoints, and microservices.',
                    coreRules: [
                        {
                            title: 'Automated CMDB & Asset Classification',
                            rules: [
                                'A Configuration Management Database (CMDB) must discover and catalog all ICT assets automatically in real time.',
                                'Every asset must be mapped to its designated system owner, classification tier, and associated business function.',
                                'Shadow IT and unauthorized computing instances are strictly forbidden; automated discovery tools must alert on rogue devices within 1 hour.'
                            ]
                        },
                        {
                            title: 'Baseline Configuration Hardening',
                            rules: [
                                'All operating systems, databases, and network appliances must conform to approved hardening benchmarks (e.g. CIS Benchmarks Level 1/2).',
                                'Automated configuration compliance scanners must detect and remediate configuration drift continuously.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Asset Provisioning Enrollment', action: 'New computing instances must be provisioned via hardened Infrastructure-as-Code (IaC) templates and registered in CMDB.' },
                        { step: 'Configuration Drift Audit', action: 'Weekly automated audits compare running configurations against hardened golden images.' },
                        { step: 'Asset Decommissioning', action: 'Decommissioned assets are purged from DNS, access rights revoked, and storage cryptographically erased.' }
                    ],
                    monitoringEvidence: [
                        'Real-time CMDB export showing 100% asset reconciliation with cloud provider inventories.',
                        'Automated CIS benchmark compliance scan reports.',
                        'Asset disposal certificates confirming cryptographic data sanitization.'
                    ]
                }
            ),
            makePolicy(
                'dora-access-control',
                'Logical Access Control & Identity Management Policy',
                'DORA Article 9(1) & RTS on ICT Risk',
                'Art. 9(1)',
                'Enforces Zero Trust architecture, strict Role-Based Access Control (RBAC), Phishing-Resistant MFA, and privileged access management (PAM).',
                ['Mandatory MFA on all access', 'Just-in-Time PAM access', 'Quarterly entitlement review'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Enforces strict identity verification, least privilege access, and Zero Trust architecture across all financial computing resources.',
                    scopeText: 'All corporate user accounts, administrative identities, service accounts, and API access tokens.',
                    coreRules: [
                        {
                            title: 'Least Privilege & Zero Trust Architecture',
                            rules: [
                                'Access rights are provisioned strictly on a need-to-know basis mapped to defined corporate roles (RBAC).',
                                'Default access permissions for any newly created account are set to Deny All.',
                                'Privileged administrative accounts must use separate, dedicated credentials and may never be used for routine email or browsing.'
                            ]
                        },
                        {
                            title: 'Authentication & Session Security',
                            rules: [
                                'Phishing-resistant Multi-Factor Authentication (FIDO2 / WebAuthn) is mandatory across all internal and cloud entry points.',
                                'Privileged sessions must operate through a Privileged Access Management (PAM) vault with session recording enabled.',
                                'Access rights must be recertified quarterly by department managers; uncertified accounts are locked automatically.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'User Onboarding Provisioning', action: 'HR submits ticketing request; automated identity system provisions minimum necessary role assignments.' },
                        { step: 'Immediate Departure Revocation', action: 'HR notification triggers immediate automated account deprovisioning within 2 hours.' },
                        { step: 'Quarterly Entitlement Attestation', action: 'System owners review and sign off on active access lists in the identity governance dashboard.' }
                    ],
                    monitoringEvidence: [
                        'Quarterly access review sign-off sheets with manager signatures.',
                        'Identity provider MFA enforcement reports showing 100% compliance.',
                        'PAM vault audit logs capturing all administrative command sessions.'
                    ]
                }
            ),
            makePolicy(
                'dora-cryptography',
                'Cryptography, Key Management & Secure Communications Policy',
                'DORA Article 9(2) & RTS on ICT Risk Art. 7',
                'Art. 9(2)',
                'Sets cryptographic standards for data at rest and in transit, post-quantum readiness, automated certificate renewal, and Hardware Security Modules (HSMs).',
                ['AES-256 at rest & TLS 1.3 in transit', 'HSM key isolation', 'Annual cryptographic review'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Establishes cryptographic standards, algorithm requirements, and key management controls for protecting financial data integrity and confidentiality.',
                    scopeText: 'All data stored in persistent storage, databases, backups, and data transmitted across internal and external networks.',
                    coreRules: [
                        {
                            title: 'Cryptographic Algorithm Standards',
                            rules: [
                                'Data at rest must be encrypted using AES-256-GCM or ChaCha20-Poly1305 across all databases, volumes, and object stores.',
                                'Data in transit must enforce TLS 1.3 (or TLS 1.2 with perfect forward secrecy ciphers); legacy protocols (TLS 1.0, 1.1, SSL 3.0) are blocked.',
                                'Deprecated ciphers and hashing algorithms (DES, 3DES, RC4, MD5, SHA-1) are strictly prohibited.'
                            ]
                        },
                        {
                            title: 'Key Management Lifecycle',
                            rules: [
                                'Master cryptographic keys must be generated and isolated inside FIPS 140-2/3 Level 3 Hardware Security Modules (HSM) or cloud KMS.',
                                'Master keys must be rotated at least annually or immediately upon suspected compromise.',
                                'Plaintext cryptographic keys must never be committed to source code or logged in plain text.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Key Generation & Ceremony', action: 'Keys generated within HSM using dual-custody controls and split knowledge procedures.' },
                        { step: 'Automated Certificate Renewal', action: 'TLS certificates are monitored and automatically renewed 30 days prior to expiration.' },
                        { step: 'Annual Algorithm Review', action: 'CISO reviews cryptographic baseline against ENISA and EBA post-quantum advisory guidelines.' }
                    ],
                    monitoringEvidence: [
                        'Cloud KMS key rotation logs verifying annual automatic key rotation.',
                        'SSL/TLS automated scanner results verifying TLS 1.3 enforcement and zero weak ciphers.',
                        'Cryptographic inventory mapping algorithms, key lengths, and data stores.'
                    ]
                }
            ),
            makePolicy(
                'dora-change-patch',
                'ICT Change, Patch & Release Management Policy',
                'DORA Article 9(4) & RTS on ICT Risk',
                'Art. 9(4)',
                'Governs software changes, branch protection, CI/CD automated gates, critical vulnerability patching windows (48h for zero-days), and rollback SOPs.',
                ['Zero-day patch SLA < 48 hours', 'Automated CI/CD security gating', 'Peer review & separate environments'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Establishes rigorous change control and vulnerability patching standards to ensure software changes do not compromise digital operational resilience.',
                    scopeText: 'All software codebases, microservices, database schemas, infrastructure-as-code, and network device configurations.',
                    coreRules: [
                        {
                            title: 'Segregation of Environments & Change Control',
                            rules: [
                                'Development, staging, and production environments must be logically and physically separated.',
                                'All code changes must undergo mandatory peer review by at least one qualified engineer prior to merging.',
                                'Developers must not have direct write or deployment privileges to production environments.'
                            ]
                        },
                        {
                            title: 'Vulnerability Remediation SLAs',
                            rules: [
                                'Critical vulnerabilities (CVSS >= 9.0 / active zero-days) must be patched or mitigated within 48 hours.',
                                'High vulnerabilities (CVSS 7.0–8.9) must be patched within 7 calendar days.',
                                'Medium vulnerabilities (CVSS 4.0–6.9) must be patched within 30 calendar days.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Pull Request Automated Gate', action: 'Automated CI/CD pipeline runs unit tests, SAST security scan, and container image vulnerability checks.' },
                        { step: 'Change Advisory Review', action: 'Material changes to critical financial modules require formal review and sign-off by the Change Advisory Board (CAB).' },
                        { step: 'Automated Rollback SOP', action: 'Every production deployment must maintain an automated rollback capability triggered if health checks fail.' }
                    ],
                    monitoringEvidence: [
                        'Git repository branch protection configuration reports showing enforced peer reviews.',
                        'CI/CD pipeline execution logs verifying automated security test pass criteria.',
                        'Patch management ticket metrics demonstrating adherence to 48-hour critical patch SLAs.'
                    ]
                }
            ),
            makePolicy(
                'dora-crisis-comms',
                'Crisis Communication & Customer Escalation Policy',
                'DORA Article 14',
                'Art. 14',
                'Pre-drafted public statements, designated spokesperson protocol, counterparty disclosure obligations, and encrypted alternative communication channels.',
                ['Single point of contact (SPoC)', 'Pre-approved crisis templates', 'Out-of-band communication trees'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Ensures structured, timely, and compliant communication with clients, regulators, counterparties, and the public during a major ICT crisis.',
                    scopeText: 'All internal and external corporate communications during declared major ICT incidents and operational emergencies.',
                    coreRules: [
                        {
                            title: 'Designated Spokesperson & Crisis Team',
                            rules: [
                                'A dedicated Crisis Communications Team (CCT) led by the CISO and Corporate Communications Officer directs all messaging during major incidents.',
                                'Unauthorized personnel are strictly prohibited from making public statements or communicating with media regarding active incidents.',
                                'Pre-approved communications templates for major outage and ransomware scenarios must be maintained and reviewed annually.'
                            ]
                        },
                        {
                            title: 'Client Notification & Alternative Channels',
                            rules: [
                                'Financial clients impacted by significant disruptions must be informed without undue delay using verified secure channels.',
                                'Public status pages must be hosted on external infrastructure completely decoupled from primary production systems.',
                                'An out-of-band encrypted communications channel must be maintained for executive crisis coordination.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Crisis Declaration', action: 'CISO formally declares a Major ICT Crisis and convenes the Crisis Communications Team.' },
                        { step: 'Client Advisory Release', action: 'Deploy pre-approved template update to affected institutional clients within 2 hours of classification.' },
                        { step: 'External Status Page Update', action: 'Update external status dashboard with concise incident progress reports every 60 minutes.' }
                    ],
                    monitoringEvidence: [
                        'Crisis communication playbook and pre-approved response statement templates.',
                        'Independent status page hosting configuration and uptime records.',
                        'Crisis communication tabletop simulation drill reports.'
                    ]
                }
            ),
            makePolicy(
                'dora-threat-intel',
                'Threat Intelligence & Cyber Information-Sharing Policy',
                'DORA Article 45',
                'Art. 45',
                'Establishes arrangements for exchange of cyber threat information, Indicators of Compromise (IoCs), tactics, techniques, and procedures (TTPs) within trusted financial communities.',
                ['TLP-standardized sharing', 'Automated IoC ingestion', 'Annual information-sharing audit'],
                'EU DORA (Regulation 2022/2554)',
                'European Supervisory Authorities (EBA, EIOPA, ESMA)',
                {
                    purposeText: 'Establishes guidelines for participating in trusted threat intelligence sharing arrangements and ingesting actionable cyber threat indicators into defensive infrastructure.',
                    scopeText: 'All threat intelligence feeds, security operations platforms, firewall rules, and intelligence-sharing relationships.',
                    coreRules: [
                        {
                            title: 'Information-Sharing Arrangements',
                            rules: [
                                'The organization participates in trusted financial sector cyber threat intelligence communities (e.g. FS-ISAC, national CERT networks).',
                                'All shared cyber threat data must strictly adhere to the Traffic Light Protocol (TLP:RED, TLP:AMBER, TLP:GREEN, TLP:CLEAR).',
                                'Sharing of threat indicators must never disclose client personal data, confidential financial balances, or proprietary trade secrets.'
                            ]
                        },
                        {
                            title: 'Automated IoC Ingestion & Defense',
                            rules: [
                                'Actionable Indicators of Compromise (IoCs) and malicious IP/domain feeds must be ingested automatically into SIEM and firewall rulesets.',
                                'Threat intelligence analysts must review high-severity threat reports within 24 hours to assess internal vulnerability exposure.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Feed Ingestion Verification', action: 'Threat intelligence platform automatically ingests trusted MISP/STIX/TAXII feeds.' },
                        { step: 'Proactive Threat Hunting', action: 'Security analysts query SIEM telemetry against newly published APT tactics, techniques, and procedures (TTPs).' },
                        { step: 'Community Disclosure', action: 'Sanitize internal indicators and contribute novel threat signatures back to the financial sharing community.' }
                    ],
                    monitoringEvidence: [
                        'Active membership agreement with FS-ISAC or national financial cyber sharing forum.',
                        'Automated STIX/TAXII feed ingestion logs in SIEM platform.',
                        'Threat hunting reports detailing retrospective searches against novel IoCs.'
                    ]
                }
            )
        ]
    },

    // -------------------------------------------------------------------------
    // 2. ISO/IEC 27001:2022 (Clauses 5–10 & Annex A Controls) - 16 POLICIES
    // -------------------------------------------------------------------------
    iso27001: {
        frameworkId: 'iso27001',
        frameworkName: 'ISO/IEC 27001:2022 ISMS',
        shortName: 'ISO 27001',
        badge: 'International Standard • Clauses 5.2 & Annex A Controls',
        color: 'bg-blue-600',
        bgLight: 'bg-blue-50/70 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-800/60',
        textColor: 'text-blue-700 dark:text-blue-400',
        description: 'Complete corporate Information Security Management System (ISMS) policy suite covering all 93 controls across Organizational, People, Physical, and Technological themes.',
        statutoryBody: 'ISO/IEC Accredited Certification Bodies (UKAS, DAkkS, ANAB)',
        policies: [
            makePolicy(
                'iso-isms-master',
                'Information Security Master Policy & Objectives',
                'ISO/IEC 27001:2022 Clause 5.2',
                'Clause 5.2',
                'Top management security commitment, ISMS scope, measurable security objectives, and framework for setting corporate infosec goals.',
                ['Executive management commitment', 'Measurable annual objectives', 'Annual ISMS review'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Defines top management commitment, strategic direction, and measurable objectives for the corporate Information Security Management System (ISMS) in full compliance with Clause 5.2.',
                    scopeText: 'All business functions, corporate physical facilities, cloud infrastructures, customer-facing applications, and employee workstations.',
                    coreRules: [
                        {
                            title: 'Executive Leadership Commitment',
                            rules: [
                                'Executive leadership establishes that information security is an essential strategic objective and actively supports ISMS execution.',
                                'Measurable security objectives are defined annually, tracked quarterly, and reviewed during formal Management Reviews.',
                                'Mandatory annual ISMS compliance targets include: >= 99.9% availability, zero unresolved critical audit findings, and 100% staff training.'
                            ]
                        },
                        {
                            title: 'Continuous Improvement (Clause 10)',
                            rules: [
                                'The ISMS must continually improve its suitability, adequacy, and effectiveness through internal audits and corrective action workflows.',
                                'Non-conformities must trigger formal Corrective and Preventive Actions (CAPA) with root cause analyses.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Annual Objectives Setting', action: 'CISO and Executive Committee set measurable security KPIs for the calendar year.' },
                        { step: 'Quarterly Metric Review', action: 'Security metrics dashboard presented to Executive Committee; identify lagging indicators.' },
                        { step: 'Management Review Meeting (Clause 9.3)', action: 'Formal annual ISMS Management Review meeting; record official minutes and resource allocations.' }
                    ],
                    monitoringEvidence: [
                        'Signed minutes of the annual Clause 9.3 Management Review meeting.',
                        'Measurable security objectives scorecard tracking quarterly KPI attainment.',
                        'Formal ISMS Scope Document defining organizational boundaries.'
                    ]
                }
            ),
            makePolicy(
                'iso-access-control',
                'Access Control & User Provisioning Policy',
                'ISO/IEC 27001:2022 Controls A.5.15–A.5.18 & A.8.2',
                'Controls A.5.15 & A.8.2',
                'Governs identity lifecycle, role-based access control, privileged access restriction, password hygiene, and access rights revocation upon departure.',
                ['Need-to-know access model', 'Quarterly entitlement review', 'Immediate departure deprovisioning'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Restricts access to information processing facilities and digital assets strictly to authorized users, enforcing the principles of need-to-know and least privilege.',
                    scopeText: 'All corporate accounts, single sign-on (SSO) systems, cloud provider consoles, and physical secure areas.',
                    coreRules: [
                        {
                            title: 'User Access Lifecycle Management',
                            rules: [
                                'Access rights are granted based on formal business role requirements (RBAC) and require manager authorization.',
                                'Deprovisioning upon employee or contractor departure must be completed within 24 hours of notification.',
                                'Privileged administrative access requires separate, dedicated accounts with session auditing.'
                            ]
                        },
                        {
                            title: 'Access Rights Recertification',
                            rules: [
                                'Department managers must recertify access rights for all team members at least quarterly.',
                                'Accounts inactive for more than 90 days must be automatically disabled.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Access Request & Approval', action: 'Submit formal access ticket specifying role and justification; manager approves via workflow.' },
                        { step: 'Quarterly Entitlement Audit', action: 'Identity system generates access manifest; department heads verify and sign off.' },
                        { step: 'Termination Deprovisioning', action: 'Automated identity connector disables user in SSO directory, terminating all cloud sessions.' }
                    ],
                    monitoringEvidence: [
                        'Signed quarterly access recertification reports.',
                        'Identity directory logs demonstrating departure deprovisioning within 24 hours.',
                        'Privileged account access review audit trails.'
                    ]
                }
            ),
            makePolicy(
                'iso-info-classification',
                'Information Classification, Handling & Labelling Policy',
                'ISO/IEC 27001:2022 Controls A.5.12 & A.5.13',
                'Controls A.5.12 & A.5.13',
                'Establishes a 4-tier classification scheme (Public, Internal, Confidential, Restricted) with handling, transmission, and disposal standards for each level.',
                ['4-tier classification hierarchy', 'Visual document labelling', 'Cryptographic disposal of Restricted data'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures that corporate and client information receives an appropriate level of protection in accordance with its importance and sensitivity.',
                    scopeText: 'All electronic documents, databases, email correspondence, paper records, and physical media.',
                    coreRules: [
                        {
                            title: 'Classification Hierarchy',
                            rules: [
                                'Public: Freely disclosable to external parties without authorization.',
                                'Internal: Standard operational documents; unauthorized disclosure causes minor business harm.',
                                'Confidential: Customer records, financial statements, contracts; requires encryption in transit.',
                                'Restricted: Highly sensitive intellectual property, cryptographic keys, executive strategy; requires encryption at rest and strict access controls.'
                            ]
                        },
                        {
                            title: 'Handling & Labeling Mandates',
                            rules: [
                                'Restricted documents must display prominent classification markings in header/footer.',
                                'Restricted and Confidential files must never be stored on unencrypted removable drives or personal devices.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Information Asset Tagging', action: 'Information owners assign classification tags during document creation or database schema design.' },
                        { step: 'Data Loss Prevention (DLP) Enforcement', action: 'DLP filters automatically block outbound transmission of Restricted data via unapproved channels.' },
                        { step: 'Secure Destruction', action: 'Restricted media must undergo certified cryptographic erasure or physical cross-cut shredding.' }
                    ],
                    monitoringEvidence: [
                        'Automated DLP tool alerts and blocking incident logs.',
                        'Asset inventory records showing classification tier assignments.',
                        'Certificates of destruction for disposed storage media.'
                    ]
                }
            ),
            makePolicy(
                'iso-incident-mgmt',
                'Information Security Incident Management Policy',
                'ISO/IEC 27001:2022 Controls A.5.24–A.5.28',
                'Controls A.5.24–A.5.28',
                'Structured incident response lifecycle: reporting, assessment, containment, forensic investigation, root-cause analysis, and post-incident lessons learned.',
                ['Centralized incident reporting', 'Severity triage matrix', 'Mandatory post-incident reviews'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Establishes a consistent, structured approach to managing information security incidents, minimizing operational harm, and preserving forensic evidence.',
                    scopeText: 'All personnel, computing assets, networks, and cloud infrastructure.',
                    coreRules: [
                        {
                            title: 'Mandatory Incident Reporting',
                            rules: [
                                'All employees and contractors must report suspected security incidents immediately to the designated Security Operations Center.',
                                'Employees must not attempt independent forensic investigations that could compromise digital evidence integrity.'
                            ]
                        },
                        {
                            title: 'Incident Lifecycle & Post-Mortems',
                            rules: [
                                'Every reported incident must follow the 6-stage lifecycle: Detection, Triage, Containment, Eradication, Recovery, Lessons Learned.',
                                'All Critical (P1) and High (P2) incidents require a formal Root Cause Analysis (RCA) and post-mortem review within 5 business days.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Incident Intake & Triage', action: 'SOC lead categorizes incident severity (P1 to P4) based on impacted asset sensitivity.' },
                        { step: 'Containment & Chain of Custody', action: 'Isolate affected nodes; preserve memory dumps and forensic disk snapshots using write-blockers.' },
                        { step: 'Post-Incident Lessons Learned', action: 'SIRT conducts post-mortem meeting; document remediation action items in the CAPA register.' }
                    ],
                    monitoringEvidence: [
                        'Incident ticket register tracking triage times, containment duration, and resolution.',
                        'Formal Root Cause Analysis (RCA) post-mortem reports.',
                        'Chain-of-custody documentation for forensic digital evidence.'
                    ]
                }
            ),
            makePolicy(
                'iso-supplier-security',
                'Supplier & Cloud Service Provider Security Policy',
                'ISO/IEC 27001:2022 Controls A.5.19–A.5.22',
                'Controls A.5.19–A.5.22',
                'Third-party security assessments, contractual security requirements, cloud shared responsibility mapping, and annual vendor audit reviews.',
                ['Vendor security questionnaires', 'SOC 2 / ISO 27001 certificate collection', 'Annual supplier risk audit'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Mitigates risks associated with third-party suppliers, contractors, and cloud service providers accessing corporate information assets.',
                    scopeText: 'All external vendors, SaaS providers, outsourced software contractors, and facility services.',
                    coreRules: [
                        {
                            title: 'Pre-Engagement Due Diligence',
                            rules: [
                                'All new suppliers accessing confidential data must complete a formal Information Security Due Diligence Assessment prior to contract signature.',
                                'Suppliers must provide valid ISO/IEC 27001 certificates, SOC 2 Type II reports, or complete equivalent security questionnaires.'
                            ]
                        },
                        {
                            title: 'Contractual Security Mandates',
                            rules: [
                                'Contracts must include mandatory clauses for: Right to Audit, prompt 24-hour incident notification, and secure data return upon termination.',
                                'Suppliers must be formally re-assessed at least once every 12 months.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Vendor Risk Tiering', action: 'Categorize vendor into High, Medium, or Low risk based on volume and sensitivity of data processed.' },
                        { step: 'Security Agreement Execution', action: 'Execute binding Data Protection Addendum (DPA) and contractual security exhibits.' },
                        { step: 'Annual Re-Assessment', action: 'Collect updated SOC 2 / ISO certificates; review SLA performance and incident history.' }
                    ],
                    monitoringEvidence: [
                        'Vendor risk register showing risk tiering and annual re-assessment status.',
                        'Current copies of supplier SOC 2 Type II and ISO 27001 certificates.',
                        'Executed supplier agreements containing statutory audit and security clauses.'
                    ]
                }
            ),
            makePolicy(
                'iso-cryptography',
                'Cryptography & Encryption Key Management Policy',
                'ISO/IEC 27001:2022 Control A.8.24',
                'Control A.8.24',
                'Authoritative algorithms, minimum key lengths, lifecycle management of cryptographic keys, and prohibited legacy protocols.',
                ['Approved cryptographic standards', 'Hardware Key Isolation (KMS)', 'Annual key rotation'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures proper and effective use of cryptography to protect the confidentiality, authenticity, and integrity of information assets.',
                    scopeText: 'All cryptographic algorithms, key management infrastructure, data storage systems, and communication channels.',
                    coreRules: [
                        {
                            title: 'Authorized Cryptographic Algorithms',
                            rules: [
                                'Symmetric Encryption: AES with minimum 256-bit keys (GCM mode preferred).',
                                'Asymmetric Encryption: RSA with minimum 3072-bit keys or Elliptic Curve Cryptography (ECC) with minimum 256-bit curves.',
                                'Hashing: SHA-256 or SHA-3; MD5 and SHA-1 are strictly prohibited for security purposes.'
                            ]
                        },
                        {
                            title: 'Cryptographic Key Lifecycle',
                            rules: [
                                'Keys must be stored in secure key vaults (e.g. AWS KMS, HashiCorp Vault) and never hardcoded in source code or configuration files.',
                                'Encryption keys must be rotated at least once every 365 days.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Key Generation & Storage', action: 'Generate keys within managed KMS using cryptographically secure random number generators.' },
                        { step: 'Automated Key Rotation', action: 'Configure automatic annual key rotation on cloud KMS keys.' },
                        { step: 'Compromised Key Revocation', action: 'Immediately revoke compromised keys, re-encrypt affected data stores, and generate incident report.' }
                    ],
                    monitoringEvidence: [
                        'Cloud KMS key inventory showing automated annual rotation enabled.',
                        'Static code analysis scan reports verifying absence of hardcoded private keys.',
                        'TLS configuration reports confirming TLS 1.3 enforcement across all domains.'
                    ]
                }
            ),
            makePolicy(
                'iso-physical-security',
                'Physical & Environmental Security Policy',
                'ISO/IEC 27001:2022 Controls A.7.1–A.7.14',
                'Controls A.7.1–A.7.14',
                'Physical security perimeter, entry badge controls, visitor logging, clean rooms, datacenter protection, and equipment siting rules.',
                ['Badge access perimeter', 'CCTV monitoring with 90-day retention', 'Visitor escort enforcement'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Prevents unauthorized physical access, damage, and interference to corporate premises, equipment, and information assets.',
                    scopeText: 'All corporate headquarters, regional offices, server rooms, and leased datacenter facilities.',
                    coreRules: [
                        {
                            title: 'Physical Security Perimeters',
                            rules: [
                                'Corporate facilities must be protected by electronic card-key access control systems.',
                                'Server rooms and network closets must maintain secondary biometric or high-security key card access restricted strictly to authorized IT personnel.',
                                'CCTV surveillance must monitor facility entry/exit points; footage must be retained for at least 90 days.'
                            ]
                        },
                        {
                            title: 'Visitor Management',
                            rules: [
                                'All visitors must present valid photo identification, sign the visitor register, wear a visible badge, and remain escorted at all times.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Visitor Check-In Protocol', action: 'Reception validates identity, logs arrival timestamp, and notifies designated employee escort.' },
                        { step: 'Quarterly Physical Access Review', action: 'Audit electronic badge logs; revoke access for departed contractors and employees.' },
                        { step: 'Environmental Controls Testing', action: 'Quarterly testing of server room fire suppression systems, HVAC, and UPS battery backups.' }
                    ],
                    monitoringEvidence: [
                        'Electronic physical access badge audit logs.',
                        'Physical visitor sign-in register archives.',
                        'Server room fire suppression and UPS maintenance test records.'
                    ]
                }
            ),
            makePolicy(
                'iso-teleworking',
                'Mobile Device & Teleworking Security Policy',
                'ISO/IEC 27001:2022 Controls A.6.7 & A.8.1',
                'Controls A.6.7 & A.8.1',
                'Mandatory device encryption, remote wipe capabilities, MDM agent enforcement, and public Wi-Fi security rules for remote workforces.',
                ['Full-disk BitLocker/FileVault encryption', 'Centralized MDM enrollment', 'Mandatory VPN on public networks'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Protects corporate information accessed, processed, or stored on mobile computing devices and through teleworking environments.',
                    scopeText: 'All corporate-issued and approved personal (BYOD) laptops, smartphones, tablets, and remote home office environments.',
                    coreRules: [
                        {
                            title: 'Endpoint Device Hardening',
                            rules: [
                                'All laptops must enforce full-disk encryption (BitLocker with TPM / FileVault) prior to deployment.',
                                'All endpoints must be enrolled in corporate Mobile Device Management (MDM) with automated patching and remote wipe enabled.',
                                'End-point detection and response (EDR) antivirus agents must be active and continuously updated.'
                            ]
                        },
                        {
                            title: 'Teleworking Operational Security',
                            rules: [
                                'Personnel working remotely must never connect corporate devices to unencrypted public Wi-Fi without using corporate VPN.',
                                'Workstations must not be used by family members or unauthorized third parties.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Device Provisioning & Enrollment', action: 'IT configures device with standard golden image and verifies MDM enrollment.' },
                        { step: 'Lost/Stolen Device Escalation', action: 'Employee reports missing device within 1 hour; IT executes immediate remote cryptographic wipe.' },
                        { step: 'Compliance Verification', action: 'Automated MDM policy verifies encryption status and EDR health before granting network access.' }
                    ],
                    monitoringEvidence: [
                        'MDM dashboard report showing 100% full-disk encryption across all corporate laptops.',
                        'EDR active agent connectivity and signature update logs.',
                        'Remote wipe drill execution records.'
                    ]
                }
            ),
            makePolicy(
                'iso-backup-policy',
                'Backup, Archival & Data Restoration Policy',
                'ISO/IEC 27001:2022 Control A.8.13',
                'Control A.8.13',
                'Backup frequency schedules, immutable off-site snapshots, encryption of backup archives, and quarterly restoration validation drills.',
                ['Automated daily snapshots', 'Immutable WORM storage', 'Quarterly test restorations'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures that backup copies of information, software, and system images are regularly created and tested in accordance with agreed business continuity needs.',
                    scopeText: 'All production databases, cloud persistent storage volumes, virtual machine images, and code repositories.',
                    coreRules: [
                        {
                            title: 'Backup Schedules & Redundancy',
                            rules: [
                                'Automated daily snapshots and weekly full backups must be executed for all production data stores.',
                                'Backups must be encrypted at rest using AES-256 and replicated to a geographically distinct cloud region.',
                                'Backup storage must enforce immutable Write-Once-Read-Many (WORM) policies to defend against ransomware modification.'
                            ]
                        },
                        {
                            title: 'Mandatory Restoration Testing',
                            rules: [
                                'Restoration drills must be performed on non-production systems at least quarterly to verify data integrity and restoration times.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Daily Automated Backup Job', action: 'Cloud automated backup schedule triggers snapshots; logs success/failure status in monitoring tool.' },
                        { step: 'Quarterly Restoration Drill', action: 'Engineer restores random snapshot into staging; runs data integrity checks and records timing.' },
                        { step: 'Backup Retention Pruning', action: 'Automated lifecycle policy archives monthly snapshots and purges expired backups.' }
                    ],
                    monitoringEvidence: [
                        'Daily automated backup execution success dashboards.',
                        'Quarterly restoration drill sign-off reports showing successful test restorations.',
                        'Cloud storage bucket policy showing immutable WORM / Object Lock configuration.'
                    ]
                }
            ),
            makePolicy(
                'iso-logging-monitoring',
                'Logging, Monitoring & Audit Trail Policy',
                'ISO/IEC 27001:2022 Controls A.8.15 & A.8.16',
                'Controls A.8.15 & A.8.16',
                'System event logging, administrative action recording, NTP time synchronization, tamper-evident log centralization, and SIEM alerting.',
                ['Centralized SIEM ingestion', 'Immutable 365-day log retention', 'NTP synchronized timestamps'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures the recording, monitoring, and analysis of system events to detect information security events, facilitate investigations, and maintain forensic accountability.',
                    scopeText: 'All production servers, network firewalls, cloud infrastructure APIs, authentication systems, and database engines.',
                    coreRules: [
                        {
                            title: 'Mandatory Event Logging Scope',
                            rules: [
                                'Audit logs must capture: successful/failed authentication, privilege escalation, file/record deletion, and network firewall denies.',
                                'All system clocks must synchronize via Network Time Protocol (NTP) to authoritative stratum-1 time sources.',
                                'Log entries must record: timestamp (UTC), user ID, originating IP, event type, and outcome.'
                            ]
                        },
                        {
                            title: 'Log Protection & Retention',
                            rules: [
                                'Logs must be streamed in real time to a centralized, tamper-evident SIEM repository.',
                                'Audit logs must be retained for a minimum of 365 days; access to log data is strictly read-only.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Log Forwarding Configuration', action: 'Syslog/CloudTrail agents forward events to centralized SIEM; verify continuous data flow.' },
                        { step: 'SIEM Alert Rule Tuning', action: 'Security engineers configure threshold alerts for brute-force logins and unauthorized privilege usage.' },
                        { step: 'Log Integrity Verification', action: 'Automated cryptographic hashing verifies that log archives have not been altered or truncated.' }
                    ],
                    monitoringEvidence: [
                        'SIEM dashboard showing real-time event ingestion across all production assets.',
                        'NTP synchronization status reports across server clusters.',
                        'Audit log retention policy verifying 365-day archive duration.'
                    ]
                }
            ),
            makePolicy(
                'iso-sdlc-security',
                'Secure Software Development Lifecycle (SDLC) Policy',
                'ISO/IEC 27001:2022 Controls A.8.25–A.8.31',
                'Controls A.8.25–A.8.31',
                'Security requirements in software architecture, automated SAST/DAST testing, branch protection, dependency vulnerability scans, and code reviews.',
                ['Automated SAST/DAST CI/CD checks', 'Mandatory peer review before merge', 'Separate development and production'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Embeds security standards throughout the software development lifecycle to identify and eliminate security vulnerabilities before deployment.',
                    scopeText: 'All internally developed software applications, APIs, microservices, and Infrastructure-as-Code modules.',
                    coreRules: [
                        {
                            title: 'Secure Development Gates',
                            rules: [
                                'Developers must follow industry secure coding guidelines (OWASP Top 10, CWE).',
                                'All code changes must be submitted via pull requests and approved by at least one independent reviewer.',
                                'Direct commits to primary/production branches are strictly prevented via repository branch protection.'
                            ]
                        },
                        {
                            title: 'Automated Security Testing in CI/CD',
                            rules: [
                                'Automated Static Application Security Testing (SAST) and software dependency vulnerability scanning must run on every commit.',
                                'Builds with unmitigated Critical or High vulnerabilities are automatically blocked from merging.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Threat Modeling in Design', action: 'Security team conducts threat modeling session during architectural planning of major features.' },
                        { step: 'CI/CD Pipeline Scanning', action: 'GitHub Actions / GitLab CI pipeline executes SAST, secret detection, and container image scans.' },
                        { step: 'Production Release Sign-Off', action: 'Lead engineer verifies all automated tests passed before triggering production deployment.' }
                    ],
                    monitoringEvidence: [
                        'GitHub/GitLab repository branch protection settings verifying mandatory approvals.',
                        'CI/CD pipeline test logs showing automated SAST and dependency scan execution.',
                        'Threat modeling documentation for major software architecture releases.'
                    ]
                }
            ),
            makePolicy(
                'iso-vulnerability-mgmt',
                'Technical Vulnerability & Patch Management Policy',
                'ISO/IEC 27001:2022 Controls A.8.8 & A.8.19',
                'Controls A.8.8 & A.8.19',
                'Continuous automated vulnerability discovery, risk-based prioritization, remediation SLAs, and third-party penetration testing schedules.',
                ['Weekly automated vulnerability scanning', 'CVSS-based remediation SLAs', 'Annual third-party penetration test'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Establishes a systematic process for identifying, evaluating, and remediating technical vulnerabilities across all operating systems, applications, and networks.',
                    scopeText: 'All external IP ranges, internal network segments, cloud environments, container images, and software dependencies.',
                    coreRules: [
                        {
                            title: 'Vulnerability Assessment Cadence',
                            rules: [
                                'Automated vulnerability scanning must execute across all production infrastructure and container registries at least weekly.',
                                'An independent third-party penetration test must be conducted on all customer-facing systems at least annually.'
                            ]
                        },
                        {
                            title: 'Remediation Timelines (SLAs)',
                            rules: [
                                'Critical Vulnerabilities (CVSS >= 9.0): Remediated or mitigated within 72 hours.',
                                'High Vulnerabilities (CVSS 7.0–8.9): Remediated within 14 calendar days.',
                                'Medium Vulnerabilities (CVSS 4.0–6.9): Remediated within 30 calendar days.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Automated Scan Ingestion', action: 'Vulnerability scanner discovers new CVEs; automatically creates tracking tickets in Jira.' },
                        { step: 'Engineering Remediation', action: 'Engineering deploys updated software packages or configuration fixes to staging.' },
                        { step: 'Re-Scan Verification', action: 'Scanner runs validation scan confirming the vulnerability is eradicated before closing ticket.' }
                    ],
                    monitoringEvidence: [
                        'Weekly vulnerability scan reports demonstrating zero overdue Critical/High findings.',
                        'Annual external penetration test report from independent accredited assessors.',
                        'Ticket tracking metrics showing remediation within mandated SLA timeframes.'
                    ]
                }
            ),
            makePolicy(
                'iso-clear-desk-screen',
                'Clear Desk & Clear Screen Policy',
                'ISO/IEC 27001:2022 Control A.7.7',
                'Control A.7.7',
                'Standards for unattended workstations, automatic screen locking (5 minutes), secure document destruction, and clean physical whiteboard rules.',
                ['5-minute idle screen lock', 'Cross-cut paper shredding', 'Locked storage for sensitive documents'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Reduces risks of unauthorized access, loss, and physical damage to information on desks, screens, and in unattended office spaces.',
                    scopeText: 'All physical office spaces, conference rooms, remote home workspaces, and computing displays.',
                    coreRules: [
                        {
                            title: 'Workstation Screen Locking',
                            rules: [
                                'Workstations must automatically lock screens after a maximum of 5 minutes of inactivity.',
                                'Employees must manually lock workstation screens whenever leaving their workspace unattended.',
                                'Monitors positioned near exterior windows or visitor paths must utilize privacy screen filters.'
                            ]
                        },
                        {
                            title: 'Clean Desk & Document Protection',
                            rules: [
                                'Sensitive or Confidential documents must not be left unattended on desks and must be stored in locked pedestals outside office hours.',
                                'Whiteboards in meeting rooms containing architectural diagrams or customer data must be erased immediately following meetings.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'GPO / MDM Screen Lock Configuration', action: 'Enforce 5-minute screen timeout policy via centralized MDM across all computers.' },
                        { step: 'Periodic Physical Walkthroughs', action: 'Security team conducts random evening physical walkthrough audits of office spaces.' },
                        { step: 'Secure Document Shredding', action: 'Sensitive physical papers deposited in locked shredding consoles for certified destruction.' }
                    ],
                    monitoringEvidence: [
                        'MDM policy profile verifying enforced 5-minute screen lock timeout.',
                        'Physical security walkthrough audit logs and non-conformance records.',
                        'Certificates of destruction from certified document shredding vendors.'
                    ]
                }
            ),
            makePolicy(
                'iso-network-security',
                'Network Security Management & Segmentation Policy',
                'ISO/IEC 27001:2022 Controls A.8.20–A.8.23',
                'Controls A.8.20–A.8.23',
                'Network zoning, firewall change control, wireless security, micro-segmentation between production and office networks, and VPN controls.',
                ['VPC network isolation', 'Default-deny firewall ingress', 'WPA3 Enterprise Wi-Fi'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Protects the security of information in networks and establishes architectural controls to segment and defend corporate data traffic.',
                    scopeText: 'All virtual private clouds (VPCs), physical switches, routers, corporate Wi-Fi networks, and VPN concentrators.',
                    coreRules: [
                        {
                            title: 'Network Zoning & Isolation',
                            rules: [
                                'Production cloud environments must reside in dedicated Virtual Private Clouds (VPCs) segregated from development and corporate office networks.',
                                'Database tiers must be placed in private subnets with no direct public internet routing or ingress.',
                                'Firewalls and Security Groups must enforce explicit Default Deny ingress rules.'
                            ]
                        },
                        {
                            title: 'Wireless & Remote Access Security',
                            rules: [
                                'Corporate Wi-Fi must enforce WPA3-Enterprise authentication tied to 802.1X user credentials.',
                                'Guest Wi-Fi networks must be logically air-gapped from internal corporate networks.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Firewall Rule Review', action: 'Security team conducts quarterly review of all cloud security group and firewall ingress rules.' },
                        { step: 'Network Micro-Segmentation', action: 'Deploy Kubernetes Network Policies / VPC peering route tables restricting pod-to-pod communication.' },
                        { step: 'Intrusion Detection Monitoring', action: 'Network intrusion detection systems (IDS) analyze flow logs for anomalous data exfiltration.' }
                    ],
                    monitoringEvidence: [
                        'Cloud network architecture diagrams showing VPC segregation and private subnet isolation.',
                        'Quarterly firewall rule review sign-off sheets.',
                        'VPC flow log analysis reports and automated anomaly alerts.'
                    ]
                }
            ),
            makePolicy(
                'iso-hr-security',
                'Human Resources Security & Disciplinary Policy',
                'ISO/IEC 27001:2022 Controls A.6.1–A.6.6',
                'Controls A.6.1–A.6.6',
                'Pre-employment background verification, signed confidentiality agreements, mandatory onboarding security training, and disciplinary processes.',
                ['Pre-employment screening', 'Signed NDA on day 1', 'Annual mandatory security retraining'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures that employees and contractors understand their security responsibilities, are suitable for their roles, and adhere to corporate security policies.',
                    scopeText: 'All prospective candidates, active employees, executives, and third-party contractors.',
                    coreRules: [
                        {
                            title: 'Pre-Employment Screening & Agreements',
                            rules: [
                                'Identity and background verification checks must be completed for all candidates prior to formal offer acceptance.',
                                'All employees and contractors must sign binding Non-Disclosure Agreements (NDAs) and Information Security Acceptable Use Agreements on Day 1.'
                            ]
                        },
                        {
                            title: 'Mandatory Training & Disciplinary Process',
                            rules: [
                                'All workforce members must complete information security awareness training within 14 days of start date and annually thereafter.',
                                'Security violations are subject to formal disciplinary action under corporate HR policy up to and including termination.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Candidate Screening Protocol', action: 'HR conducts criminal background checks, employment history verification, and credential validation.' },
                        { step: 'Automated Training Enrollment', action: 'New hires enrolled in LMS; automated reminders trigger until 100% completion is recorded.' },
                        { step: 'Annual Policy Re-Attestation', action: 'All employees review and electronically re-sign security policies during annual compliance drive.' }
                    ],
                    monitoringEvidence: [
                        'LMS training compliance reports showing 100% workforce completion.',
                        'Signed employee confidentiality agreements and acceptable use acknowledgments.',
                        'HR background screening completion audit records.'
                    ]
                }
            ),
            makePolicy(
                'iso-business-continuity',
                'Business Continuity & Redundancy Policy',
                'ISO/IEC 27001:2022 Controls A.5.29, A.5.30 & A.8.14',
                'Controls A.5.29 & A.8.14',
                'Information security continuity in adverse situations, redundancy of processing facilities, crisis management, and continuity plan testing.',
                ['Multi-region processing redundancy', 'Annual continuity drills', 'Incident emergency response teams'],
                'ISO/IEC 27001:2022 ISMS',
                'Accredited Certification Body',
                {
                    purposeText: 'Ensures that information security continuity is embedded in business continuity management systems, maintaining security during adverse operational events.',
                    scopeText: 'All core processing environments, critical staff teams, and business resilience operations.',
                    coreRules: [
                        {
                            title: 'Security Continuity Planning',
                            rules: [
                                'Information security controls must be designed to remain fully effective during crises, emergency operations, and disaster recovery.',
                                'Redundant processing facilities and cloud services must maintain identical security controls as primary production sites.'
                            ]
                        },
                        {
                            title: 'Testing & Verification Cadence',
                            rules: [
                                'Business continuity and disaster recovery plans must be exercised and tested at least once every 12 months.',
                                'Post-exercise evaluations must identify gaps and update operational continuity runbooks.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Business Impact Assessment', action: 'Identify critical business processes and verify security control resilience during simulated outages.' },
                        { step: 'Redundancy Verification', action: 'Verify multi-region infrastructure auto-scaling and database replication integrity.' },
                        { step: 'Annual Tabletop Exercise', action: 'Executive team executes crisis tabletop exercise simulating severe cyber disruptions.' }
                    ],
                    monitoringEvidence: [
                        'Documented Business Continuity Plan (BCP) and Disaster Recovery (DR) runbooks.',
                        'Annual business continuity tabletop exercise test reports.',
                        'Cloud multi-region redundancy architecture documentation.'
                    ]
                }
            )
        ]
    },

    // -------------------------------------------------------------------------
    // 3. AICPA SOC 2 TYPE II (Trust Services Criteria CC1–CC9) - 13 COMPREHENSIVE POLICIES
    // -------------------------------------------------------------------------
    soc2: {
        frameworkId: 'soc2',
        frameworkName: 'AICPA SOC 2 Type II',
        shortName: 'SOC 2',
        badge: 'AICPA Trust Services Criteria • Security, Availability, Confidentiality',
        color: 'bg-emerald-600',
        bgLight: 'bg-emerald-50/70 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800/60',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        description: 'Comprehensive statutory policy suite for AICPA SOC 2 Type II audit examinations across Security, Availability, and Confidentiality trust categories.',
        statutoryBody: 'AICPA & Licensed Independent CPA Attestation Auditors',
        policies: [
            makePolicy(
                'soc2-governance-master',
                'Information Security & Corporate Governance Policy',
                'AICPA TSC CC1.1, CC1.2, CC2.1',
                'CC1.1 / CC2.1',
                'Demonstrates executive tone-at-the-top, organizational hierarchy, ethics, risk governance, and security commitment for SOC 2 Type II attestation.',
                ['Tone at the top', 'Code of conduct', 'Security committee meetings'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Demonstrates management commitment to ethical values, organizational integrity, risk oversight, and customer data security in alignment with COSO Principle 1 and AICPA TSC CC1.1.',
                    scopeText: 'All corporate operations, employees, officers, contractors, and computing systems supporting customer services.',
                    coreRules: [
                        {
                            title: 'Tone at the Top & Ethical Standards',
                            rules: [
                                'Executive leadership establishes an organizational culture of security awareness, transparency, and strict adherence to service commitments.',
                                'A formal Information Security Committee meets quarterly to evaluate risk metrics, audit findings, and compliance roadmaps.'
                            ]
                        },
                        {
                            title: 'Organizational Hierarchy & Segregation of Duties',
                            rules: [
                                'Organizational charts clearly delineate security, engineering, finance, and operational responsibilities to prevent conflicting duties.',
                                'Security personnel operate independently from software delivery teams with direct reporting access to the Board.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Quarterly Committee Convening', action: 'Security Committee convenes to review control testing results, penetration tests, and audit deliverables.' },
                        { step: 'Annual Policy Approval', action: 'CISO and CEO review and approve corporate security policies annually.' },
                        { step: 'Employee Code of Conduct Attestation', action: 'All employees electronically sign the corporate Code of Conduct upon onboarding and annually.' }
                    ],
                    monitoringEvidence: [
                        'Signed quarterly Information Security Committee meeting minutes.',
                        'Current organizational hierarchy charts detailing security reporting lines.',
                        '100% signed employee Code of Conduct attestation records.'
                    ]
                }
            ),
            makePolicy(
                'soc2-logical-access',
                'Logical Access & Identity Management Policy',
                'AICPA TSC CC6.1, CC6.2, CC6.3',
                'CC6.1–CC6.3',
                'Covers RBAC, mandatory MFA, annual access recertification, credential complexity, and same-day termination deprovisioning.',
                ['Same-day deprovisioning', 'Quarterly access certification', 'Enforced MFA'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Restricts logical access to customer data, production environments, and administrative consoles strictly to authorized personnel in accordance with TSC CC6.1–CC6.3.',
                    scopeText: 'All production servers, cloud consoles, databases, code repositories, and identity directories.',
                    coreRules: [
                        {
                            title: 'User Access Lifecycle Management',
                            rules: [
                                'Access to production infrastructure is provisioned strictly on a least-privilege, need-to-know basis.',
                                'Mandatory Multi-Factor Authentication (MFA) is enforced across 100% of accounts accessing corporate networks and cloud consoles.',
                                'Employee termination triggers automated account deprovisioning across all systems within 24 hours of HR notice.'
                            ]
                        },
                        {
                            title: 'Periodic Access Recertification',
                            rules: [
                                'System owners must conduct formal logical access reviews at least quarterly to certify active permissions.',
                                'Inactive accounts (>90 days without login) are automatically disabled by the identity directory.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Access Request Workflow', action: 'Manager submits ticket detailing business need; CISO or system owner approves before provisioning.' },
                        { step: 'Quarterly Access Audit', action: 'Identity provider exports access lists; system owners certify or revoke access; retain audit sign-offs.' },
                        { step: 'Emergency Access Revocation', action: 'HR marks departure in HRIS; automated webhook revokes SSO tokens and active cloud sessions immediately.' }
                    ],
                    monitoringEvidence: [
                        'Quarterly user access certification sign-off reports.',
                        'Deprovisioning ticket logs demonstrating termination within 24 hours.',
                        'Identity provider MFA enforcement reports showing 100% active MFA.'
                    ]
                }
            ),
            makePolicy(
                'soc2-change-management',
                'Change Management & Secure Software Development Policy',
                'AICPA TSC CC8.1',
                'CC8.1',
                'Peer review requirements, CI/CD automated test gates, branch protection, database migration controls, and emergency hotfix SOPs.',
                ['Mandatory peer reviews', 'Automated CI/CD security gates', 'Separate staging/prod environments'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Governs the authorization, testing, and deployment of software changes and infrastructure modifications to prevent unauthorized alterations and outages.',
                    scopeText: 'All application source code, API services, database schemas, and Infrastructure-as-Code (IaC) templates.',
                    coreRules: [
                        {
                            title: 'Segregation of Environments & Branch Protection',
                            rules: [
                                'Development, staging, and production environments must be logically and physically separated.',
                                'Developers are strictly prohibited from having direct write or deployment access to production environments.',
                                'Repository branch protection rules must require at least one independent peer approval before code can be merged.'
                            ]
                        },
                        {
                            title: 'Automated CI/CD Testing Gates',
                            rules: [
                                'Automated pipelines must execute unit tests, integration tests, and SAST security scans on every pull request.',
                                'Emergency changes (hotfixes) require documented post-deployment review and managerial sign-off within 24 hours.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Pull Request Review', action: 'Engineer creates pull request; independent reviewer inspects code quality, security, and logic.' },
                        { step: 'Automated Pipeline Execution', action: 'CI/CD pipeline runs test suite; blocks deployment if any automated security or unit test fails.' },
                        { step: 'Staged Deployment & Monitoring', action: 'Deploy to staging, verify health metrics, then trigger automated production canary deployment.' }
                    ],
                    monitoringEvidence: [
                        'GitHub/GitLab branch protection rule configuration screenshots.',
                        'Sample pull request audit trails showing independent peer approvals and passing CI/CD tests.',
                        'Emergency change log documenting approvals for expedited hotfixes.'
                    ]
                }
            ),
            makePolicy(
                'soc2-risk-assessment',
                'Enterprise Risk Assessment & Treatment Policy',
                'AICPA TSC CC3.1, CC3.2',
                'CC3.1 / CC3.2',
                'Framework for identifying, rating, and managing business, fraud, and environmental risks impacting service commitments.',
                ['Formal risk catalog', 'Fraud risk analysis', 'Management treatment tracking'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Establishes the enterprise methodology for identifying, analyzing, and treating risks that could impact the achievement of SOC 2 Trust Services Criteria.',
                    scopeText: 'All operational processes, cloud environments, corporate facilities, and vendor relationships.',
                    coreRules: [
                        {
                            title: 'Annual Risk Assessment Methodology',
                            rules: [
                                'A formal enterprise risk assessment must be conducted at least annually or upon significant architectural changes.',
                                'Risks must be evaluated across Likelihood and Impact matrices, incorporating fraud risk and technological obsolescence.',
                                'All risks rated High or Critical must have a documented Risk Treatment Plan with assigned owners and remediation deadlines.'
                            ]
                        },
                        {
                            title: 'Risk Register Maintenance',
                            rules: [
                                'The CISO maintains the centralized Risk Register, updating mitigation status and residual risk scores quarterly.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Threat & Vulnerability Identification', action: 'Conduct risk interviews with department leads and review vulnerability assessment data.' },
                        { step: 'Risk Scoring & Prioritization', action: 'Calculate inherent and residual risk scores using standardized 5x5 probability/impact matrix.' },
                        { step: 'Executive Committee Review', action: 'Present Risk Register and Treatment Plans to the Security Committee for formal sign-off.' }
                    ],
                    monitoringEvidence: [
                        'Annual Enterprise Risk Assessment report signed by Executive Management.',
                        'Updated Enterprise Risk Register showing treatment progress and residual risk scores.',
                        'Fraud risk assessment documentation.'
                    ]
                }
            ),
            makePolicy(
                'soc2-bcp-dr',
                'Disaster Recovery & Business Continuity Policy',
                'AICPA TSC A1.2, A1.3',
                'TSC A1.2 / A1.3',
                'Backup frequency, failover procedures, RTO/RPO targets, and documented restoration testing to satisfy Availability criteria.',
                ['RTO & RPO targets', 'Automated daily snapshots', 'Annual restoration drill'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Ensures the ongoing availability of customer services, defining recovery objectives and disaster recovery operational procedures.',
                    scopeText: 'All customer-facing SaaS applications, cloud infrastructure, core database clusters, and supporting services.',
                    coreRules: [
                        {
                            title: 'Service Availability & Recovery Objectives',
                            rules: [
                                'Customer service commitments mandate maintaining >= 99.9% platform availability.',
                                'Recovery Time Objective (RTO) is defined as <= 4 hours for full platform restoration.',
                                'Recovery Point Objective (RPO) is defined as <= 1 hour for transactional customer data.'
                            ]
                        },
                        {
                            title: 'Automated Backups & Annual Testing',
                            rules: [
                                'Database snapshots and persistent volume backups must execute automatically on a daily schedule and be stored off-site.',
                                'A simulated disaster recovery restoration exercise must be conducted and documented at least annually.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Daily Automated Backup', action: 'Cloud automated backup schedules take daily snapshots; verify completion alerts.' },
                        { step: 'Annual DR Tabletop & Restoration', action: 'Simulate region loss; restore data from backup into isolated staging; verify data consistency.' },
                        { step: 'Availability SLA Monitoring', action: 'Automated synthetic monitoring tracks uptime 24/7; triggers alerts if latency or errors spike.' }
                    ],
                    monitoringEvidence: [
                        'Annual Disaster Recovery test report with restoration timings and executive sign-off.',
                        'Daily automated backup logs demonstrating snapshot success and replication.',
                        'Customer-facing uptime dashboard reports verifying >= 99.9% availability.'
                    ]
                }
            ),
            makePolicy(
                'soc2-vendor-mgmt',
                'Vendor Risk Management & Subservice Organization Policy',
                'AICPA TSC CC9.2',
                'CC9.2',
                'Evaluation and annual monitoring of third-party cloud vendors (AWS, GitHub, Datadog) and customer CUEC expectations.',
                ['Annual SOC 2 Type II collection', 'DPA agreements', 'Subservice carve-out review'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Governs the evaluation, onboarding, and ongoing security monitoring of third-party vendors and subservice organizations supporting customer operations.',
                    scopeText: 'All third-party cloud hosting providers, software-as-a-service vendors, and IT contractors.',
                    coreRules: [
                        {
                            title: 'Vendor Onboarding & Security Due Diligence',
                            rules: [
                                'All third-party vendors accessing customer data or production infrastructure must undergo formal security risk assessment prior to contracting.',
                                'Subservice organizations (e.g. AWS, GCP, GitHub) must provide current SOC 2 Type II reports annually.'
                            ]
                        },
                        {
                            title: 'Complementary User Entity Controls (CUECs)',
                            rules: [
                                'The organization must review subservice SOC 2 reports annually to identify Complementary User Entity Controls (CUECs) and verify internal implementation.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Pre-Contract Security Evaluation', action: 'Security team reviews vendor security posture, certifications, and data handling practices.' },
                        { step: 'Annual SOC 2 Review', action: 'Obtain current SOC 2 Type II report; review auditor opinion and CUECs; log in vendor register.' },
                        { step: 'Vendor Risk Tiering Update', action: 'Re-assess vendor risk score annually; adjust monitoring controls accordingly.' }
                    ],
                    monitoringEvidence: [
                        'Vendor inventory register with assigned risk tiers and annual review dates.',
                        'Archived copies of current SOC 2 Type II reports for all critical subservice providers.',
                        'Documented review of vendor Complementary User Entity Controls (CUECs).'
                    ]
                }
            ),
            makePolicy(
                'soc2-data-protection',
                'Data Protection, Retention & Disposal Policy',
                'AICPA TSC C1.1, C1.2',
                'TSC C1.1 / C1.2',
                'Tenant data isolation, encryption in transit and rest, data retention schedules, and certified cryptographic erasure upon contract termination.',
                ['Multi-tenant isolation', 'Retention schedules', 'Certified erasure'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Ensures the confidentiality and integrity of customer data throughout its lifecycle, enforcing tenant data segregation, encryption, and certified disposal.',
                    scopeText: 'All customer data stored, processed, or transmitted across corporate cloud environments.',
                    coreRules: [
                        {
                            title: 'Logical Tenant Isolation',
                            rules: [
                                'Customer data in multi-tenant environments must be logically segregated using tenant identifiers and database-level row access controls.',
                                'Application logic must enforce strict boundary checks preventing cross-tenant data access.'
                            ]
                        },
                        {
                            title: 'Data Retention & Certified Decommissioning',
                            rules: [
                                'Customer data must be retained only for the duration specified in customer agreements.',
                                'Upon contract termination, customer data must be cryptographically erased within 30 days, with a certificate of destruction issued.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Multi-Tenant Boundary Testing', action: 'Automated integration tests verify that API queries for Tenant A cannot return data belonging to Tenant B.' },
                        { step: 'Lifecycle Purge Execution', action: 'Automated database purge jobs delete expired records in accordance with retention schedules.' },
                        { step: 'Termination Data Deletion', action: 'Customer offboarding workflow triggers cryptographic data wipe; logs completion timestamp.' }
                    ],
                    monitoringEvidence: [
                        'Automated unit and integration test logs verifying multi-tenant data isolation.',
                        'Customer data retention schedule matrix.',
                        'Sample certificates of customer data destruction upon offboarding.'
                    ]
                }
            ),
            makePolicy(
                'soc2-cryptography',
                'Cryptography & Encryption Key Storage Policy',
                'AICPA TSC CC6.1, CC6.7',
                'CC6.1 / CC6.7',
                'Encryption across transit and storage, AWS KMS / Cloud KMS configuration, strict envelope encryption, and key rotation.',
                ['Envelope encryption with KMS', 'TLS 1.3 enforced', 'Annual key rotation'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Defines encryption requirements for protecting customer data in transit and at rest, and establishes cryptographic key management controls.',
                    scopeText: 'All databases, persistent storage, communication channels, and encryption keys.',
                    coreRules: [
                        {
                            title: 'Encryption Mandates',
                            rules: [
                                'Customer data at rest must be encrypted using AES-256 via Cloud Key Management Services (KMS).',
                                'All external and internal network communications transmitting customer data must enforce TLS 1.3 or TLS 1.2 with forward secrecy.'
                            ]
                        },
                        {
                            title: 'Key Lifecycle & Storage',
                            rules: [
                                'Encryption keys must be managed inside FIPS 140-2 validated cloud KMS; direct access to private keys is strictly prevented.',
                                'Cloud KMS keys must enforce automated annual key rotation.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'KMS Configuration', action: 'Configure cloud KMS master keys with restrictive IAM policies and automated rotation enabled.' },
                        { step: 'TLS Inspection', action: 'Automated weekly scans inspect web endpoints and load balancers to verify TLS 1.3 enforcement.' },
                        { step: 'Secret Scanning', action: 'Automated pre-commit hooks and repository scanners detect and block hardcoded cryptographic secrets.' }
                    ],
                    monitoringEvidence: [
                        'Cloud KMS key configuration exports verifying AES-256 and automated annual rotation.',
                        'SSL Labs A+ rating certificates or equivalent endpoint TLS scanner reports.',
                        'Repository secret scanner audit logs showing zero committed keys.'
                    ]
                }
            ),
            makePolicy(
                'soc2-vuln-pentest',
                'Vulnerability Management & Penetration Testing Policy',
                'AICPA TSC CC7.1',
                'CC7.1',
                'Weekly vulnerability scanning, static code analysis (SAST), annual third-party penetration testing, and remediation SLAs.',
                ['Annual external penetration test', 'Weekly dependency scanning', 'Remediation tracking'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Establishes continuous vulnerability identification, assessment, and remediation procedures to protect against unauthorized access and system exploits.',
                    scopeText: 'All external IP addresses, production container images, APIs, and software dependencies.',
                    coreRules: [
                        {
                            title: 'Vulnerability Scanning & Penetration Testing',
                            rules: [
                                'Automated vulnerability scanning must be performed across all production infrastructure and container images weekly.',
                                'An independent, certified third-party penetration testing firm must test the production application at least annually.'
                            ]
                        },
                        {
                            title: 'Remediation Timelines',
                            rules: [
                                'Critical vulnerabilities must be remediated or mitigated within 7 business days.',
                                'High vulnerabilities must be remediated within 30 calendar days.',
                                'Remediation exceptions must be approved by the CISO and logged in the Risk Register.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Automated Scan Execution', action: 'Vulnerability scanners scan production assets weekly; alert security team of new CVEs.' },
                        { step: 'Annual Pentest Engagement', action: 'Engage external testing firm; establish test scope; execute comprehensive black-box and grey-box tests.' },
                        { step: 'Remediation Tracking', action: 'Log all pentest findings in tracking system; verify re-test resolution before closing.' }
                    ],
                    monitoringEvidence: [
                        'Annual third-party penetration test report and letter of attestation.',
                        'Weekly vulnerability scan reports showing remediation compliance.',
                        'Jira tracking tickets documenting remediation of identified vulnerabilities.'
                    ]
                }
            ),
            makePolicy(
                'soc2-logging-monitoring',
                'System Logging, Anomaly Detection & Monitoring Policy',
                'AICPA TSC CC7.2',
                'CC7.2',
                'CloudTrail, VPC Flow Logs, and application audit logging, automated alert generation, and 24/7 incident response monitoring.',
                ['CloudTrail log streaming', 'Real-time alert thresholds', '1-year log retention'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Ensures the continuous collection, monitoring, and analysis of system and audit logs to detect security anomalies and support incident investigations.',
                    scopeText: 'All cloud control planes, application logs, database access logs, and network edge gateways.',
                    coreRules: [
                        {
                            title: 'Centralized Audit Logging Scope',
                            rules: [
                                'Audit logs must capture: successful and failed logins, IAM policy alterations, database queries on sensitive tables, and admin actions.',
                                'CloudTrail / Cloud Audit Logs must be enabled across all production regions and streamed to a centralized, secured bucket.',
                                'Logs must be retained for at least 365 days; log storage must enforce tamper-proof Write-Once-Read-Many (WORM) policies.'
                            ]
                        },
                        {
                            title: 'Real-Time Alerting',
                            rules: [
                                'Automated alert rules must trigger on: root account usage, unauthorized API calls, multiple failed MFA attempts, and abnormal data downloads.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Log Collection Setup', action: 'Configure CloudTrail, VPC Flow Logs, and application log forwarders streaming to SIEM.' },
                        { step: 'Alert Threshold Tuning', action: 'Configure alerting rules in monitoring tool (Datadog/Grafana/SIEM) with pager escalation.' },
                        { step: 'Periodic Log Review', action: 'Security team conducts weekly reviews of security alert summaries and administrative actions.' }
                    ],
                    monitoringEvidence: [
                        'CloudTrail configuration screenshots showing multi-region logging enabled.',
                        'SIEM alert rule dashboard configuration and sample incident escalation tickets.',
                        'Log retention bucket policy verifying 365-day archive duration.'
                    ]
                }
            ),
            makePolicy(
                'soc2-incident-response',
                'Security Incident Response & Customer Notification SLA Policy',
                'AICPA TSC CC7.3, CC7.4',
                'CC7.3 / CC7.4',
                'Incident triage runbooks, notification SLAs to impacted customers within contractual timeframes, and post-mortem RCA documentation.',
                ['Customer notification SLA', 'Documented post-mortems', 'Incident escalation runbook'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Defines the enterprise incident response lifecycle and establishes contractual customer notification commitments during confirmed security breaches.',
                    scopeText: 'All potential and confirmed information security incidents impacting customer data or system availability.',
                    coreRules: [
                        {
                            title: 'Incident Response Lifecycle',
                            rules: [
                                'The Incident Response Team (IRT) must maintain 24/7 on-call readiness to triage suspected security events.',
                                'The response lifecycle encompasses: Detection, Analysis, Containment, Eradication, Recovery, and Post-Mortem.'
                            ]
                        },
                        {
                            title: 'Customer Notification Commitments',
                            rules: [
                                'In the confirmed event of unauthorized access to or compromise of customer data, affected customers must be notified within 48 hours.',
                                'Customer notifications must include: nature of incident, data categories affected, containment actions, and point of contact.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Incident Escalation', action: 'On-call engineer triages alert; declares security incident; convenes Incident Response Team.' },
                        { step: 'Containment & Eradication', action: 'Isolate compromised credentials or computing nodes; rotate affected API keys; patch vulnerability.' },
                        { step: 'Post-Mortem & Reporting', action: 'Publish Root Cause Analysis (RCA) within 5 business days; document preventative engineering items.' }
                    ],
                    monitoringEvidence: [
                        'Security Incident Response Plan (SIRP) runbook documentation.',
                        'Sample post-mortem RCA reports detailing root cause and remediation.',
                        'Customer notification communication templates and delivery confirmation logs.'
                    ]
                }
            ),
            makePolicy(
                'soc2-code-of-conduct',
                'Employee Code of Conduct & HR Security Policy',
                'AICPA TSC CC1.4, CC1.5',
                'CC1.4 / CC1.5',
                'Whistleblower mechanisms, disciplinary actions, annual policy acknowledgment, background checks, and acceptable technology use.',
                ['Signed code of conduct', 'Background vetting', 'Whistleblower protection'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Establishes human resources security controls, acceptable technology use standards, and ethical conduct guidelines for all personnel.',
                    scopeText: 'All full-time and part-time employees, executive officers, and third-party contractors.',
                    coreRules: [
                        {
                            title: 'Background Screening & Onboarding',
                            rules: [
                                'Pre-employment background verification (criminal history, identity, education) must be completed prior to hire date.',
                                'All new personnel must sign the Code of Conduct, Confidentiality Agreement, and Acceptable Use Policy on their first day.'
                            ]
                        },
                        {
                            title: 'Whistleblower Protection & Sanctions',
                            rules: [
                                'Personnel must have access to an anonymous whistleblower reporting channel with strict non-retaliation protections.',
                                'Violations of security policies are subject to progressive disciplinary sanctions up to and including termination.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Background Check Verification', action: 'HR receives third-party background screening report; confirms clearance before onboarding.' },
                        { step: 'Annual Policy Re-Acknowledgment', action: 'All employees electronically sign annual compliance acknowledgments in HR portal.' },
                        { step: 'Departure Check-Out', action: 'HR conducts exit interview; verifies retrieval of company laptop and security token.' }
                    ],
                    monitoringEvidence: [
                        'HR onboarding records showing completed background screening prior to hire date.',
                        'Signed Code of Conduct and Acceptable Use acknowledgments for all staff.',
                        'Whistleblower reporting policy and intake channel documentation.'
                    ]
                }
            ),
            makePolicy(
                'soc2-physical-security',
                'Physical Security & Datacenter Protection Policy',
                'AICPA TSC CC6.4, CC6.5',
                'CC6.4 / CC6.5',
                'Physical safeguards at corporate offices, environmental controls, visitor logs, and reliance on AWS/GCP datacenter certifications.',
                ['Office badge access', 'AWS SOC 2 Type II reliance', 'Physical visitor logging'],
                'AICPA SOC 2 Type II',
                'Independent CPA Attestation Auditor',
                {
                    purposeText: 'Governs physical security safeguards at corporate offices and establishes reliance on Tier-3/4 cloud datacenter physical protections.',
                    scopeText: 'All corporate facilities, leased office spaces, and cloud datacenter infrastructure.',
                    coreRules: [
                        {
                            title: 'Corporate Facility Physical Controls',
                            rules: [
                                'All office entrances must be secured by electronic badge access control; access logs must be retained for at least 90 days.',
                                'Visitors must sign the visitor log, wear visible badges, and be escorted at all times by company employees.'
                            ]
                        },
                        {
                            title: 'Cloud Datacenter Physical Security Reliance',
                            rules: [
                                'Production systems are hosted in Tier-3/Tier-4 cloud facilities (e.g. AWS, GCP) with 24/7 security guards and biometric access.',
                                'The organization reviews cloud provider SOC 2 Type II reports annually to verify datacenter physical safeguards.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Facility Access Provisioning', action: 'HR requests office badge provisioning; security activates keycard for approved zones.' },
                        { step: 'Visitor Escort Enforcement', action: 'Reception logs visitor arrival; employee escort accompanies visitor during visit.' },
                        { step: 'Cloud Provider Audit Verification', action: 'Obtain and review annual SOC 2 Type II report for AWS/GCP datacenter physical controls.' }
                    ],
                    monitoringEvidence: [
                        'Office electronic badge entry system logs.',
                        'Completed physical visitor sign-in registers.',
                        'Documented annual review of AWS/GCP SOC 2 Type II physical datacenter controls.'
                    ]
                }
            )
        ]
    },

    // -------------------------------------------------------------------------
    // 4. EU NIS2 DIRECTIVE (EU 2022/2555 Art. 21) - 12 COMPREHENSIVE POLICIES
    // -------------------------------------------------------------------------
    nis2: {
        frameworkId: 'nis2',
        frameworkName: 'NIS2 Directive (EU 2022/2555)',
        shortName: 'NIS2',
        badge: 'EU Directive 2022/2555 • Article 21 Statutory Measures',
        color: 'bg-orange-600',
        bgLight: 'bg-orange-50/70 dark:bg-orange-950/20',
        borderColor: 'border-orange-200 dark:border-orange-800/60',
        textColor: 'text-orange-700 dark:text-orange-400',
        description: 'Mandatory statutory cybersecurity risk-management policy suite required for Essential and Important entities under NIS2 Article 21.',
        statutoryBody: 'EU Member State CSIRTs & National Competent Authorities',
        policies: [
            makePolicy(
                'nis2-cyber-risk',
                'Cyber Risk Analysis & Information System Security Policy',
                'NIS2 Article 21(2)(a)',
                'Art. 21(2)(a)',
                'Enterprise-wide methodology for all-hazards cyber risk assessments, risk appetite, and continuous risk monitoring.',
                ['Annual risk assessments', 'Quantitative impact scoring', 'Management approval gates'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Defines the all-hazards cybersecurity risk assessment methodology and system security requirements mandated for Essential and Important entities under NIS2 Article 21(2)(a).',
                    scopeText: 'All operational technologies, cloud platforms, network perimeters, and digital assets supporting essential services.',
                    coreRules: [
                        {
                            title: 'All-Hazards Cyber Risk Methodology',
                            rules: [
                                'Cyber risk assessments must encompass technical cyber threats, supply chain disruptions, human error, and physical environmental hazards.',
                                'Risk assessments must be conducted at least annually or prior to introducing material technological changes.',
                                'The management body must review and formally approve the cyber risk analysis and risk treatment strategy.'
                            ]
                        },
                        {
                            title: 'Continuous Risk Registry',
                            rules: [
                                'All identified risks must be tracked in an Enterprise Risk Register with assigned operational owners and mitigation target dates.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'All-Hazards Risk Assessment', action: 'Risk team evaluates threat landscape, internal vulnerabilities, and impact on essential services.' },
                        { step: 'Management Board Sign-Off', action: 'Board reviews risk posture, debates treatment proposals, and formally votes to approve.' },
                        { step: 'Continuous Metric Tracking', action: 'Quarterly review of residual risk levels and mitigation milestone progress.' }
                    ],
                    monitoringEvidence: [
                        'Annual All-Hazards Cyber Risk Assessment report approved by the Management Board.',
                        'Active Enterprise Cyber Risk Register with documented mitigation deadlines.',
                        'Board meeting minutes documenting risk tolerance approval.'
                    ]
                }
            ),
            makePolicy(
                'nis2-incident-handling',
                'Incident Handling & 24h Early Warning Reporting Policy',
                'NIS2 Article 21(2)(b) & Article 23',
                'Art. 21(2)(b) & 23',
                '24-hour early warning notice, 72-hour incident notification, and 1-month final report to national CSIRTs.',
                ['24h early warning submission', '72h incident notification', '1-month final report'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Establishes mandatory procedures for incident detection, containment, triage, and statutory notifications to national CSIRTs and competent authorities within strict NIS2 Article 23 deadlines.',
                    scopeText: 'All network and information systems supporting essential or important services.',
                    coreRules: [
                        {
                            title: 'Statutory Reporting Deadlines to National CSIRTs',
                            rules: [
                                '24-Hour Early Warning: Submit to national CSIRT / competent authority within 24 hours of becoming aware of a significant incident.',
                                '72-Hour Incident Notification: Submit detailed assessment within 72 hours, including initial severity and compromise indicators.',
                                '1-Month Final Report: Submit comprehensive forensic report within 1 month (or upon resolution) detailing root cause, impact, and remedies.'
                            ]
                        },
                        {
                            title: 'Customer & Counterparty Notification',
                            rules: [
                                'Where a significant incident is likely to impact service provision, affected service recipients must be informed without undue delay.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Incident Detection & Triage', action: 'Security team detects anomaly; evaluates significance against NIS2 Article 23 criteria.' },
                        { step: '24h Early Warning Dispatch', action: 'Incident Commander submits initial early warning report to national CSIRT portal.' },
                        { step: 'Forensic Investigation & Final Report', action: 'Forensic team investigates root cause; compiles final report and submits within 1 month.' }
                    ],
                    monitoringEvidence: [
                        'CSIRT portal submission receipts with verified transmission timestamps.',
                        'Incident management ticket records tracking 24h and 72h notification milestones.',
                        'Final post-incident forensic root cause reports.'
                    ]
                }
            ),
            makePolicy(
                'nis2-bcp-crisis',
                'Business Continuity, Backup & Crisis Management Policy',
                'NIS2 Article 21(2)(c)',
                'Art. 21(2)(c)',
                'Air-gapped backup operations, disaster recovery, emergency personnel response teams, and crisis escalation protocols.',
                ['Immutable air-gapped backups', 'Crisis management call tree', 'Annual DR failover drills'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Ensures business continuity, disaster recovery, and crisis management readiness to maintain essential service delivery during major cyber events.',
                    scopeText: 'All core operational infrastructure, cloud platforms, and emergency personnel teams.',
                    coreRules: [
                        {
                            title: 'Immutable & Air-Gapped Backups',
                            rules: [
                                'Critical operational data and system configurations must be backed up daily to immutable, air-gapped storage to prevent ransomware destruction.',
                                'Backup restorations must be tested on isolated staging systems at least quarterly.'
                            ]
                        },
                        {
                            title: 'Crisis Management & Call Trees',
                            rules: [
                                'A designated Crisis Management Team (CMT) must maintain emergency procedures and an active call tree with verified contact numbers.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Automated Immutable Backup', action: 'Backup schedule triggers daily snapshots with Object Lock / WORM immutability.' },
                        { step: 'Quarterly Restoration Test', action: 'Perform test restoration of random database backups; verify data integrity and record timing.' },
                        { step: 'Annual Crisis Simulation', action: 'Execute annual crisis tabletop drill simulating complete network isolation.' }
                    ],
                    monitoringEvidence: [
                        'Cloud backup configuration showing immutable WORM Object Lock.',
                        'Quarterly backup restoration drill test logs.',
                        'Crisis Management Plan and updated emergency call tree documentation.'
                    ]
                }
            ),
            makePolicy(
                'nis2-supply-chain',
                'Supply Chain & Direct Supplier Security Policy',
                'NIS2 Article 21(2)(d)',
                'Art. 21(2)(d)',
                'Evaluates vulnerabilities of direct suppliers, cybersecurity posture of MSPs/cloud vendors, and contractual security mandates.',
                ['Direct supplier risk tiering', 'Mandatory security audit clauses', 'Supply chain vulnerability alerts'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Mitigates supply chain cybersecurity risks by governing relationships with direct suppliers and service providers in accordance with NIS2 Article 21(2)(d).',
                    scopeText: 'All direct suppliers, managed service providers (MSPs), cloud providers, and software development contractors.',
                    coreRules: [
                        {
                            title: 'Supplier Risk Assessment & Tiering',
                            rules: [
                                'Direct suppliers must be evaluated regarding their cybersecurity practices and overall quality of products and cybersecurity measures.',
                                'Suppliers providing managed IT, software, or cloud services must maintain certified baseline cybersecurity standards (e.g. ISO 27001, SOC 2).'
                            ]
                        },
                        {
                            title: 'Contractual Security Obligations',
                            rules: [
                                'Supplier contracts must mandate: immediate incident notification, right to audit, and secure development commitments.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Supplier Security Due Diligence', action: 'Procurement and security teams review vendor cybersecurity posture before contracting.' },
                        { step: 'Contractual Clause Enforcement', action: 'Incorporate standard NIS2 supply chain security exhibits into all vendor contracts.' },
                        { step: 'Annual Supplier Review', action: 'Review supplier compliance, incident records, and security certifications annually.' }
                    ],
                    monitoringEvidence: [
                        'Direct supplier risk assessment catalog.',
                        'Executed supplier contracts with explicit cybersecurity clauses.',
                        'Annual supplier cybersecurity review scorecards.'
                    ]
                }
            ),
            makePolicy(
                'nis2-cvd-vulnerability',
                'Network System Security & Vulnerability Handling Policy',
                'NIS2 Article 21(2)(e)',
                'Art. 21(2)(e)',
                'Security in network acquisition, continuous vulnerability scanning, automated zero-day patching, and SBOM tracking.',
                ['Continuous vulnerability scanning', 'Software bill of materials (SBOM)', 'Patching within 72 hours'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Governs security in network and information systems acquisition, development, maintenance, and technical vulnerability handling pursuant to Article 21(2)(e).',
                    scopeText: 'All network equipment, firewalls, servers, container clusters, and third-party software components.',
                    coreRules: [
                        {
                            title: 'Security in System Acquisition & Maintenance',
                            rules: [
                                'All new network and information systems must undergo formal cybersecurity evaluation prior to procurement or deployment.',
                                'Software Bill of Materials (SBOM) must be maintained for all internally developed and commercially acquired applications.'
                            ]
                        },
                        {
                            title: 'Vulnerability Remediation & Patching',
                            rules: [
                                'Critical vulnerabilities must be remediated or mitigated within 72 hours of patch release.',
                                'High vulnerabilities must be remediated within 14 calendar days.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Pre-Acquisition Review', action: 'Evaluate third-party hardware/software against cybersecurity baseline requirements.' },
                        { step: 'Automated Vulnerability Scanning', action: 'Continuous scanners inspect network perimeters and container registries.' },
                        { step: 'Patch Deployment & Verification', action: 'Deploy tested security patches to staging, then roll out to production.' }
                    ],
                    monitoringEvidence: [
                        'Software Bill of Materials (SBOM) repository exports.',
                        'Automated vulnerability scanner reports confirming zero overdue critical CVEs.',
                        'Pre-procurement cybersecurity assessment checklists.'
                    ]
                }
            ),
            makePolicy(
                'nis2-cvd-standard',
                'Coordinated Vulnerability Disclosure (CVD) Standard',
                'NIS2 Article 12(1) & Article 21(2)(e)',
                'Art. 12 & 21(2)(e)',
                'Public security.txt discovery endpoint, safe harbor policy for ethical security researchers, and triage SLAs.',
                ['Public security.txt endpoint', 'Researcher safe harbor terms', '48h triage SLA'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Establishes a structured Coordinated Vulnerability Disclosure (CVD) policy and safe harbor framework for ethical security researchers in accordance with NIS2 Article 12(1).',
                    scopeText: 'All public websites, external APIs, and internet-facing services operated by the organization.',
                    coreRules: [
                        {
                            title: 'Public Disclosure Endpoint & Safe Harbor',
                            rules: [
                                'A standardized /.well-known/security.txt file must be published across all public domains providing security contact information and PGP keys.',
                                'The organization pledges safe harbor (no legal action) for security researchers acting in good faith and adhering to responsible disclosure guidelines.'
                            ]
                        },
                        {
                            title: 'Triage & Remediation Timelines',
                            rules: [
                                'External vulnerability reports must receive initial acknowledgment within 48 hours of receipt.',
                                'Validated vulnerabilities must be remediated in coordination with national CSIRTs before public release.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Security.txt Maintenance', action: 'Publish and maintain current security.txt file with valid PGP public key and security email.' },
                        { step: 'Report Intake & Triage', action: 'Security team verifies submitted vulnerability report; acknowledges receipt within 48 hours.' },
                        { step: 'Coordinated Remediation', action: 'Patch vulnerability; notify researcher; coordinate public disclosure date.' }
                    ],
                    monitoringEvidence: [
                        'Published /.well-known/security.txt file conforming to RFC 9116.',
                        'CVD intake log documenting researcher reports, acknowledgment times, and remediation dates.',
                        'Public Hall of Fame recognition records for contributing ethical researchers.'
                    ]
                }
            ),
            makePolicy(
                'nis2-effectiveness',
                'Cybersecurity Measures Effectiveness Assessment Policy',
                'NIS2 Article 21(2)(f)',
                'Art. 21(2)(f)',
                'Internal audit audits, executive risk reporting, metric scorecards, and independent supervisory verification.',
                ['Annual internal security audit', 'Quarterly KPI metrics to board', 'Independent assessment'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Establishes the policy and procedures for assessing the effectiveness of cybersecurity risk-management measures pursuant to NIS2 Article 21(2)(f).',
                    scopeText: 'All technical and organizational cybersecurity measures deployed across the enterprise.',
                    coreRules: [
                        {
                            title: 'Periodic Effectiveness Audits',
                            rules: [
                                'The effectiveness of all cybersecurity measures must be evaluated through formal internal audits at least annually.',
                                'Independent external cybersecurity assessments must be conducted at least once every 24 months.'
                            ]
                        },
                        {
                            title: 'Management Board Metrics Reporting',
                            rules: [
                                'Cybersecurity effectiveness scorecards must be presented to the Management Board quarterly, highlighting control gaps and remediation progress.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Annual Audit Execution', action: 'Internal audit team executes control testing against NIS2 Article 21 requirements.' },
                        { step: 'Audit Findings Remediation', action: 'Log all identified control deficiencies in corrective action register with target completion dates.' },
                        { step: 'Board Metric Presentation', action: 'CISO presents quarterly cybersecurity effectiveness scorecard to the Board of Directors.' }
                    ],
                    monitoringEvidence: [
                        'Annual Internal Cybersecurity Audit report detailing control effectiveness testing.',
                        'Quarterly cybersecurity KPI scorecards delivered to the Management Board.',
                        'Corrective Action Plan (CAPA) tracking register.'
                    ]
                }
            ),
            makePolicy(
                'nis2-hygiene-training',
                'Basic Cyber Hygiene Practices & Cybersecurity Training Policy',
                'NIS2 Article 20 & Article 21(2)(g)',
                'Art. 20 & 21(2)(g)',
                'Mandatory executive management board training, regular employee phishing drills, software hygiene, and clean desk standards.',
                ['Statutory management body training', 'Quarterly simulated phishing drills', 'Mandatory cyber hygiene rules'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Enforces basic cyber hygiene standards and establishes mandatory cybersecurity training for management body members and employees pursuant to Articles 20 and 21(2)(g).',
                    scopeText: 'All members of the management body, full-time and part-time employees, and third-party contractors.',
                    coreRules: [
                        {
                            title: 'Statutory Management Body Training',
                            rules: [
                                'Members of the management body must undergo formal cybersecurity training regularly to acquire sufficient knowledge to assess cyber risks.',
                                'Training must cover: cyber threat landscape, executive legal liabilities, and risk management principles.'
                            ]
                        },
                        {
                            title: 'Workforce Cyber Hygiene & Phishing Drills',
                            rules: [
                                'All employees must complete cyber hygiene training within 14 days of start date and annually thereafter.',
                                'Simulated phishing exercises must be conducted quarterly; repeat failers must undergo targeted retraining.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Executive Training Delivery', action: 'Deliver specialized executive cyber training modules to the Board of Directors annually.' },
                        { step: 'Workforce Awareness Program', action: 'Deploy interactive online training modules covering password security, phishing, and social engineering.' },
                        { step: 'Phishing Simulation Testing', action: 'Execute simulated phishing campaigns; track click rates and assign immediate micro-training.' }
                    ],
                    monitoringEvidence: [
                        'Management Board cybersecurity training completion certificates and syllabus.',
                        'LMS training compliance reports showing 100% employee completion.',
                        'Quarterly simulated phishing campaign metric reports.'
                    ]
                }
            ),
            makePolicy(
                'nis2-cryptography',
                'Cryptography & Encryption Usage Policy',
                'NIS2 Article 21(2)(h)',
                'Art. 21(2)(h)',
                'Standards for data encryption at rest and in transit, post-quantum readiness, and algorithm key management.',
                ['Full encryption at rest and transit', 'Strong forward-secrecy ciphers', 'Key rotation SOPs'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Governs the use of cryptography and, where appropriate, end-to-end encryption to protect the confidentiality and integrity of network and information systems under Article 21(2)(h).',
                    scopeText: 'All sensitive customer data, corporate communications, storage volumes, and network transmissions.',
                    coreRules: [
                        {
                            title: 'Mandatory Encryption Standards',
                            rules: [
                                'All sensitive and operational data at rest must be encrypted using approved algorithms (AES-256 or equivalent).',
                                'All data in transit across public networks must enforce modern cryptographic protocols (TLS 1.3 preferred, TLS 1.2 minimum).',
                                'End-to-end encryption must be implemented for sensitive communications and remote administrative access.'
                            ]
                        },
                        {
                            title: 'Key Security & Protection',
                            rules: [
                                'Cryptographic keys must be managed in secure key vaults with restricted access controls and automated annual rotation.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Storage Encryption Configuration', action: 'Enable default AES-256 encryption across all cloud storage buckets and database clusters.' },
                        { step: 'Endpoint Transport Hardening', action: 'Configure load balancers and web servers to disable deprecated ciphers and enforce TLS 1.3.' },
                        { step: 'Key Lifecycle Auditing', action: 'Review key management configurations and audit access logs quarterly.' }
                    ],
                    monitoringEvidence: [
                        'Cloud storage encryption audit reports confirming 100% encryption at rest.',
                        'External SSL/TLS cipher suite scan reports verifying modern protocol enforcement.',
                        'Key management system access and rotation logs.'
                    ]
                }
            ),
            makePolicy(
                'nis2-hr-access-assets',
                'Human Resources Security, Access Control & Asset Management Policy',
                'NIS2 Article 21(2)(i)',
                'Art. 21(2)(i)',
                'Employee vetting, asset lifecycle tracking, hardware decommissioning, and strict role-based access control.',
                ['Asset ownership register', 'Employee departure protocol', 'Need-to-know access control'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Establishes integrated human resources security, access control policies, and asset management procedures in full compliance with NIS2 Article 21(2)(i).',
                    scopeText: 'All personnel, computing equipment, software licenses, and access credentials.',
                    coreRules: [
                        {
                            title: 'Human Resources Security Controls',
                            rules: [
                                'Background verification checks must be completed for all candidates prior to granting system access.',
                                'All personnel must sign confidentiality agreements and understand their cybersecurity responsibilities.'
                            ]
                        },
                        {
                            title: 'Asset Management & Access Control',
                            rules: [
                                'An accurate, up-to-date asset inventory must catalog all hardware, software, and network assets.',
                                'Access to essential network and information systems is granted strictly based on role necessity and least privilege.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Pre-Employment Vetting', action: 'HR verifies candidate identity and credentials before issuing employment contract.' },
                        { step: 'Asset Registration & Tagging', action: 'Assign asset tag, record serial number, and assign formal owner in the IT asset register.' },
                        { step: 'Departure Deprovisioning', action: 'Revoke system access and retrieve all company hardware within 24 hours of employee departure.' }
                    ],
                    monitoringEvidence: [
                        'Up-to-date IT asset inventory register.',
                        'Employee onboarding background check confirmation logs.',
                        'Access deprovisioning checklist records signed by IT and HR.'
                    ]
                }
            ),
            makePolicy(
                'nis2-mfa-continuous',
                'Multi-Factor Authentication (MFA) & Continuous Authentication Policy',
                'NIS2 Article 21(2)(j)',
                'Art. 21(2)(j)',
                'Enforces hardware MFA tokens, WebAuthn/FIDO2, and continuous risk-based authentication for all corporate services.',
                ['Enforced MFA for all employees', 'FIDO2 / hardware token support', 'Blocking legacy basic auth'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Mandates the use of multi-factor authentication and continuous authentication solutions for accessing network and information systems under Article 21(2)(j).',
                    scopeText: 'All corporate user accounts, remote access VPNs, cloud administrative consoles, and email services.',
                    coreRules: [
                        {
                            title: 'Mandatory Multi-Factor Authentication',
                            rules: [
                                'Multi-Factor Authentication (MFA) is mandatory for 100% of workforce accounts accessing corporate systems.',
                                'Phishing-resistant MFA (FIDO2 / WebAuthn hardware tokens) is required for all administrative and privileged access.',
                                'Legacy single-factor and basic authentication protocols are strictly disabled across all directories and APIs.'
                            ]
                        },
                        {
                            title: 'Continuous Risk-Based Verification',
                            rules: [
                                'Adaptive authentication systems must evaluate device health, geolocation anomalies, and user risk score before granting access.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'MFA Enrollment Enforcement', action: 'Identity provider enforces mandatory MFA registration during initial user onboarding.' },
                        { step: 'Hardware Token Issuance', action: 'Issue FIDO2 hardware security keys to system administrators and privileged users.' },
                        { step: 'Anomalous Sign-In Triage', action: 'Automated identity protection system blocks impossible travel sign-ins and alerts SOC.' }
                    ],
                    monitoringEvidence: [
                        'Identity provider MFA enforcement report showing 100% user coverage.',
                        'Hardware token distribution register for privileged administrators.',
                        'Identity protection conditional access policy configuration screenshots.'
                    ]
                }
            ),
            makePolicy(
                'nis2-emergency-comms',
                'Secured Emergency Voice, Video & Text Communications Policy',
                'NIS2 Article 21(2)(j)',
                'Art. 21(2)(j)',
                'Maintains isolated, out-of-band communication infrastructure during catastrophic network isolation or ransomware takeover.',
                ['Out-of-band communications channel', 'End-to-end encrypted messaging', 'Separate infrastructure hosting'],
                'NIS2 Directive (EU 2022/2555)',
                'EU Member State CSIRTs & National Competent Authorities',
                {
                    purposeText: 'Ensures the availability and confidentiality of secured emergency voice, video, and text communication systems during major network compromises or outages pursuant to Article 21(2)(j).',
                    scopeText: 'All executive management members, Incident Response Team members, and operational crisis coordinators.',
                    coreRules: [
                        {
                            title: 'Decoupled Emergency Communications Infrastructure',
                            rules: [
                                'Emergency communications channels must be hosted on external infrastructure completely independent from primary corporate systems.',
                                'Emergency voice, video, and text platforms must enforce end-to-end encryption.',
                                'Crisis team members must maintain pre-installed, pre-configured emergency communication applications on mobile devices.'
                            ]
                        },
                        {
                            title: 'Periodic Emergency Channel Drills',
                            rules: [
                                'The emergency communications system must be tested semi-annually through unannounced alert drills.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Emergency Channel Setup', action: 'Configure dedicated end-to-end encrypted messaging platform (e.g. Signal / encrypted out-of-band suite).' },
                        { step: 'Semi-Annual Alert Drill', action: 'Trigger surprise broadcast message to all crisis team members; measure response time.' },
                        { step: 'Contact Roster Verification', action: 'Quarterly review of crisis team phone numbers, personal email addresses, and secure handles.' }
                    ],
                    monitoringEvidence: [
                        'Emergency communications channel roster and configuration documentation.',
                        'Semi-annual emergency broadcast drill test results.',
                        'Independent hosting architecture verification for emergency channels.'
                    ]
                }
            )
        ]
    },

    // -------------------------------------------------------------------------
    // 5. EU GDPR (Regulation (EU) 2016/679) - 8 COMPREHENSIVE POLICIES
    // -------------------------------------------------------------------------
    gdpr: {
        frameworkId: 'gdpr',
        frameworkName: 'EU GDPR (Regulation 2016/679)',
        shortName: 'GDPR',
        badge: 'EU General Data Protection Regulation • Articles 5, 24 & 32',
        color: 'bg-indigo-600',
        bgLight: 'bg-indigo-50/70 dark:bg-indigo-950/20',
        borderColor: 'border-indigo-200 dark:border-indigo-800/60',
        textColor: 'text-indigo-700 dark:text-indigo-400',
        description: 'Comprehensive statutory privacy governance package establishing legal lawful bases, data subject rights, 72-hour breach rules, and cross-border data transfer safeguards.',
        statutoryBody: 'European Data Protection Board (EDPB) & National Data Protection Authorities (DPA)',
        policies: [
            makePolicy(
                'gdpr-master-privacy',
                'Master Data Protection & Privacy Governance Policy',
                'GDPR Articles 5, 24 & 32',
                'Art. 5, 24 & 32',
                'Enforces the 7 foundational data protection principles, Data Protection Officer (DPO) duties, and enterprise privacy accountability.',
                ['DPO appointment & governance', 'Article 30 Record of Processing (ROPA)', 'Accountability documentation'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Defines the enterprise data protection principles, governance framework, and organizational accountability required under GDPR Articles 5, 24, and 32.',
                    scopeText: 'All processing of personal data relating to identifiable individuals across all corporate operations and systems.',
                    coreRules: [
                        {
                            title: 'Core Data Protection Principles (Article 5)',
                            rules: [
                                'Lawfulness, Fairness & Transparency: Personal data must be processed lawfully, fairly, and transparently.',
                                'Purpose Limitation: Collected strictly for specified, explicit, and legitimate purposes.',
                                'Data Minimization: Adequate, relevant, and limited to what is necessary.',
                                'Accuracy: Maintained accurate and kept up to date.',
                                'Storage Limitation: Kept in a form permitting identification for no longer than necessary.',
                                'Integrity & Confidentiality: Processed securely, protected against unauthorized access, loss, or destruction.'
                            ]
                        },
                        {
                            title: 'Accountability & Article 30 ROPA',
                            rules: [
                                'The organization must maintain a comprehensive Record of Processing Activities (ROPA) under Article 30.',
                                'A Data Protection Officer (DPO) oversees privacy compliance and serves as the contact point for supervisory authorities.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'ROPA Maintenance', action: 'Review and update Record of Processing Activities semi-annually across all departments.' },
                        { step: 'DPO Oversight', action: 'DPO conducts quarterly privacy audits and advises on high-risk processing initiatives.' },
                        { step: 'Employee Privacy Training', action: 'Mandatory GDPR awareness training completed by all staff within 14 days of onboarding.' }
                    ],
                    monitoringEvidence: [
                        'Article 30 Record of Processing Activities (ROPA) signed register.',
                        'DPO formal appointment letter and supervisory authority registration receipt.',
                        'Staff privacy training completion records.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-retention-erasure',
                'Data Retention, Archival & Certified Erasure Policy',
                'GDPR Article 5(1)(e) & Article 17',
                'Art. 5(1)(e) & 17',
                'Retention schedules by data category, automated lifecycle deletion rules, and certified cryptographic erasure protocols.',
                ['Data retention schedules', 'Automated purges', 'Cryptographic deletion standards'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Governs the storage limitation principle under GDPR Article 5(1)(e), defining data retention periods and certified cryptographic deletion procedures.',
                    scopeText: 'All personal data stored across databases, file systems, cloud storage buckets, and backup archives.',
                    coreRules: [
                        {
                            title: 'Data Retention Schedules',
                            rules: [
                                'Personal data must be categorized and retained only for the duration specified in the corporate Retention Schedule.',
                                'Customer account data must be deleted or anonymized within 90 days following account closure, unless statutory tax retention applies.'
                            ]
                        },
                        {
                            title: 'Certified Deletion & Right to be Forgotten (Article 17)',
                            rules: [
                                'Personal data subject to verified erasure requests must be permanently expunged across all production databases within 30 days.',
                                'Backup copies must age out according to standard rotation schedules (maximum 90 days).'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Automated Lifecycle Purging', action: 'Database automated jobs identify records exceeding retention limits and purge them.' },
                        { step: 'Erasure Request Processing', action: 'Privacy team receives erasure request; executes multi-system deletion workflow.' },
                        { step: 'Deletion Confirmation', action: 'Generate cryptographic hash confirmation verifying permanent erasure across databases.' }
                    ],
                    monitoringEvidence: [
                        'Enterprise Data Retention Schedule matrix defining periods per data category.',
                        'Automated database purge execution logs.',
                        'Right to erasure request fulfillment audit records.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-dsar-procedure',
                'Data Subject Rights (DSAR) Fulfillment Procedure',
                'GDPR Articles 12–23',
                'Articles 12–23',
                'Procedures for receiving, verifying identity, and fulfilling Access, Rectification, Erasure, Portability, and Objection requests within 30 days.',
                ['Identity verification checklist', '30-day fulfillment SLA', 'Electronic export formatting'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Establishes standardized procedures for receiving, verifying identity, and fulfilling Data Subject Access Requests (DSARs) within statutory deadlines.',
                    scopeText: 'All requests submitted by data subjects exercising rights under GDPR Chapter III (Articles 12–23).',
                    coreRules: [
                        {
                            title: 'Statutory 30-Day Response Mandate',
                            rules: [
                                'All valid data subject rights requests must be fulfilled free of charge without undue delay and within 1 calendar month.',
                                'Where requests are complex, a 2-month extension may be applied, provided notice is sent to the data subject within month 1.'
                            ]
                        },
                        {
                            title: 'Identity Verification & Portability',
                            rules: [
                                'Strict identity verification must be completed before releasing personal data to prevent unauthorized disclosure.',
                                'Data Portability requests must be delivered in a structured, commonly used, and machine-readable format (JSON/CSV).'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Request Intake & Identity Verification', action: 'Log incoming request in DSAR portal; verify requester identity using two-factor challenge.' },
                        { step: 'Data Collection & Redaction', action: 'Query all database enclaves; redact third-party personal data to protect other individuals.' },
                        { step: 'Secure Delivery', action: 'Deliver encrypted export package via authenticated self-service portal.' }
                    ],
                    monitoringEvidence: [
                        'Centralized DSAR tracking register showing intake dates and fulfillment within 30 days.',
                        'Identity verification logs for all processed requests.',
                        'Sample redacted electronic export packages.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-breach-notification',
                '72-Hour Personal Data Breach Notification & Response Policy',
                'GDPR Articles 33 & 34',
                'Articles 33 & 34',
                'Risk assessment methodology for data breaches, 72-hour notification to supervisory authorities, and direct communication to affected data subjects.',
                ['72-hour supervisory notification clock', 'Breach register documentation', 'High-risk subject notification triggers'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Defines the mandatory protocol for evaluating, containing, and reporting personal data breaches to supervisory authorities within 72 hours under GDPR Article 33.',
                    scopeText: 'All security events resulting in accidental or unlawful destruction, loss, alteration, or unauthorized disclosure of personal data.',
                    coreRules: [
                        {
                            title: '72-Hour Supervisory Authority Notification',
                            rules: [
                                'In the event of a personal data breach, the Lead Supervisory Authority must be notified within 72 hours of becoming aware.',
                                'Notification must detail: nature of breach, categories and approximate number of data subjects, and mitigation measures taken.'
                            ]
                        },
                        {
                            title: 'Data Subject Communication (Article 34)',
                            rules: [
                                'When the breach is likely to result in a high risk to the rights and freedoms of individuals, affected data subjects must be notified without undue delay.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Breach Assessment & Severity Scoring', action: 'DPO and SIRT evaluate breach likelihood, volume, and potential harm using ENISA criteria.' },
                        { step: 'Supervisory Submission', action: 'DPO submits formal notification payload via lead DPA electronic breach portal within 72 hours.' },
                        { step: 'Individual Communication', action: 'Deploy direct email/letter notices to affected data subjects providing clear remediation guidance.' }
                    ],
                    monitoringEvidence: [
                        'DPA electronic breach notification submission receipts with timestamps.',
                        'Internal Personal Data Breach Register documenting all incidents and assessments.',
                        'Data subject notification copies and delivery logs.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-international-transfers',
                'International Data Transfers & SCCs Policy',
                'GDPR Articles 44–49 & Schrems II',
                'Articles 44–49',
                'Transfer Impact Assessments (TIA), Standard Contractual Clauses (SCCs), Binding Corporate Rules, and supplementary technical transfer measures.',
                ['Transfer Impact Assessment (TIA)', 'Execution of EU standard contractual clauses', 'End-to-end encryption in transit'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Governs the transfer of personal data outside the European Economic Area (EEA), ensuring adequate safeguards under GDPR Chapter V and the Schrems II ruling.',
                    scopeText: 'All cross-border data transfers to third-party vendors, overseas cloud datacenters, or international corporate subsidiaries.',
                    coreRules: [
                        {
                            title: 'Transfer Mechanisms & Safeguards',
                            rules: [
                                'Personal data may only be transferred to third countries with an adequacy decision or supported by valid Standard Contractual Clauses (SCCs).',
                                'A formal Transfer Impact Assessment (TIA) must evaluate third-country laws regarding government surveillance access.'
                            ]
                        },
                        {
                            title: 'Supplementary Technical Measures',
                            rules: [
                                'Transferred data must be protected by strong end-to-end encryption with encryption keys retained exclusively within the EEA.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Transfer Mapping & TIA', action: 'Privacy team maps international data flows and conducts formal Transfer Impact Assessment.' },
                        { step: 'Execution of EU SCCs', action: 'Execute European Commission approved Standard Contractual Clauses with data importer.' },
                        { step: 'Technical Control Verification', action: 'Verify encryption mechanisms prevent third-party government eavesdropping during transit.' }
                    ],
                    monitoringEvidence: [
                        'Completed Transfer Impact Assessments (TIA) for all international vendors.',
                        'Executed Standard Contractual Clauses (SCCs) modules.',
                        'Data flow inventory documenting geographical storage locations.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-privacy-by-design',
                'Privacy by Design, Privacy by Default & DPIA Policy',
                'GDPR Articles 25 & 35',
                'Articles 25 & 35',
                'Data Protection Impact Assessment (DPIA) triggers, technical privacy safeguards (pseudonymization), and default privacy settings.',
                ['Mandatory pre-release DPIA', 'Pseudonymization baseline', 'Default restrictive settings'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Ensures data protection is embedded into the design of software systems and business processes by default, and governs Data Protection Impact Assessments (DPIAs).',
                    scopeText: 'All new software products, major features, data processing activities, and system architecture designs.',
                    coreRules: [
                        {
                            title: 'Privacy by Design & Default (Article 25)',
                            rules: [
                                'Data protection principles must be integrated into technology architecture from the inception of development.',
                                'Default privacy settings must be set to the most restrictive level (e.g. no pre-checked consent boxes).'
                            ]
                        },
                        {
                            title: 'Mandatory DPIA Execution (Article 35)',
                            rules: [
                                'A formal Data Protection Impact Assessment (DPIA) is mandatory prior to processing involving new technologies or high risk to individuals.',
                                'DPIAs must evaluate necessity, proportionality, risks, and mitigation measures; CISO and DPO must formally sign off.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'DPIA Threshold Screening', action: 'Product managers complete DPIA screening questionnaire during product design phase.' },
                        { step: 'DPIA Risk Assessment', action: 'DPO evaluates privacy risks, mandates pseudonymization controls, and documents residual risks.' },
                        { step: 'Implementation Verification', action: 'Security team verifies that default privacy controls are active before production launch.' }
                    ],
                    monitoringEvidence: [
                        'Completed and signed Data Protection Impact Assessments (DPIA).',
                        'Product architecture design documents demonstrating pseudonymization controls.',
                        'Default user privacy settings configuration audits.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-subprocessors-dpa',
                'Third-Party Data Processing Agreements (DPA) & Subprocessor Policy',
                'GDPR Article 28',
                'Article 28',
                'Mandatory contractual DPA terms for all vendors processing personal data, subprocessor change notifications, and audit rights.',
                ['Standard DPA execution', 'Subprocessor public ledger', 'Right to object to new processors'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Governs the contractual and operational safeguards required when engaging processors or subprocessors handling personal data under GDPR Article 28.',
                    scopeText: 'All third-party vendors, cloud providers, payment processors, and analytics partners processing personal data.',
                    coreRules: [
                        {
                            title: 'Mandatory Data Processing Agreements (Article 28)',
                            rules: [
                                'A legally binding Data Processing Agreement (DPA) must be executed before disclosing personal data to any third-party processor.',
                                'DPAs must mandate: processing only on documented instructions, confidentiality commitments, security measures, and deletion upon termination.'
                            ]
                        },
                        {
                            title: 'Subprocessor Notification & Objection',
                            rules: [
                                'A public list of current subprocessors must be maintained.',
                                'Clients must be notified at least 30 days prior to engaging new subprocessors, with a right to object.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'DPA Execution Protocol', action: 'Legal and procurement verify vendor executes standard DPA meeting Article 28 requirements.' },
                        { step: 'Subprocessor Registry Maintenance', action: 'Maintain public subprocessor webpage detailing vendor names, locations, and roles.' },
                        { step: 'New Subprocessor Notification', action: 'Send automated email notification to client privacy contacts 30 days before cutover.' }
                    ],
                    monitoringEvidence: [
                        'Centralized repository of executed Data Processing Agreements (DPAs).',
                        'Public subprocessor register with change tracking history.',
                        'Subprocessor notification dispatch logs.'
                    ]
                }
            ),
            makePolicy(
                'gdpr-employee-privacy',
                'Employee & Workplace Data Privacy Policy',
                'GDPR Article 88 & National Employment Laws',
                'Article 88',
                'Rules for handling personnel files, workplace surveillance/monitoring, background check records, and employee health data.',
                ['Employee privacy notice', 'Workplace monitoring transparency', 'Secure HR record segregation'],
                'EU GDPR (Regulation 2016/679)',
                'European Data Protection Board & National DPAs',
                {
                    purposeText: 'Protects the privacy rights of workforce members, defining lawful handling of employee personal records and workplace monitoring rules under Article 88.',
                    scopeText: 'All current employees, job applicants, former employees, and temporary agency personnel.',
                    coreRules: [
                        {
                            title: 'Lawful Processing of Employee Records',
                            rules: [
                                'Employee personal data is processed strictly for employment contract execution, payroll, and statutory legal obligations.',
                                'Employee personal records must be stored in encrypted HR systems accessible only to authorized HR personnel.'
                            ]
                        },
                        {
                            title: 'Workplace Monitoring Transparency',
                            rules: [
                                'Covert workplace surveillance or keystroke logging is strictly prohibited.',
                                'Employees must receive an Employee Privacy Notice detailing what technical logs are collected for cybersecurity purposes.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Employee Notice Delivery', action: 'Provide comprehensive Employee Privacy Notice during onboarding documentation.' },
                        { step: 'HR Record Access Governance', action: 'Enforce strict RBAC permissions restricting access to personnel and medical records.' },
                        { step: 'Former Employee Data Purge', action: 'Purge non-statutory employee records 24 months post-departure; retain payroll records per legal tax schedules.' }
                    ],
                    monitoringEvidence: [
                        'Employee Privacy Notice signed acknowledgment records.',
                        'HR information system access permission audit logs.',
                        'Workplace monitoring transparency disclosures.'
                    ]
                }
            )
        ]
    },

    // -------------------------------------------------------------------------
    // 6. HIPAA (45 CFR PARTS 160 & 164) - 10 COMPREHENSIVE POLICIES
    // -------------------------------------------------------------------------
    hipaa: {
        frameworkId: 'hipaa',
        frameworkName: 'HIPAA Security & Privacy Rule',
        shortName: 'HIPAA',
        badge: '45 CFR Parts 160 & 164 • Administrative, Physical & Technical Safeguards',
        color: 'bg-teal-600',
        bgLight: 'bg-teal-50/70 dark:bg-teal-950/20',
        borderColor: 'border-teal-200 dark:border-teal-800/60',
        textColor: 'text-teal-700 dark:text-teal-400',
        description: 'Comprehensive statutory health information security and privacy policy suite satisfying all Administrative, Physical, and Technical safeguards of 45 CFR Parts 160 and 164.',
        statutoryBody: 'U.S. Department of Health and Human Services (HHS) Office for Civil Rights (OCR)',
        policies: [
            makePolicy(
                'hipaa-security-master',
                'HIPAA Information Security Master Policy',
                '45 CFR §164.308(a)(1)',
                '§164.308(a)(1)',
                'Enterprise framework for electronic Protected Health Information (ePHI) risk management, assigned security officer duties, and sanctions.',
                ['Designated Security Official', 'Annual SRA risk assessment', 'Workforce sanction enforcement'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Establishes the enterprise security management process for electronic Protected Health Information (ePHI) to comply with 45 CFR §164.308(a)(1).',
                    scopeText: 'All electronic Protected Health Information (ePHI) created, received, maintained, or transmitted across corporate systems.',
                    coreRules: [
                        {
                            title: 'Security Management Process & Security Official',
                            rules: [
                                'A designated HIPAA Security Official is formally appointed with direct authority to oversee ePHI safeguards.',
                                'A comprehensive Security Risk Analysis (SRA) must be conducted at least annually to identify vulnerabilities in systems containing ePHI.',
                                'A formal Risk Management Plan must prioritize and track remediation of identified vulnerabilities.'
                            ]
                        },
                        {
                            title: 'Workforce Sanctions Policy',
                            rules: [
                                'Appropriate disciplinary sanctions must be applied against workforce members who fail to comply with HIPAA security policies.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Annual Security Risk Analysis (SRA)', action: 'Conduct comprehensive SRA covering all EHR databases, medical devices, and cloud endpoints.' },
                        { step: 'Remediation Roadmap Execution', action: 'Log all identified ePHI vulnerabilities in risk management plan; execute remediation items.' },
                        { step: 'Security Official Oversight', action: 'HIPAA Security Official conducts quarterly reviews of audit logs and control effectiveness.' }
                    ],
                    monitoringEvidence: [
                        'Annual HIPAA Security Risk Analysis (SRA) signed audit report.',
                        'Formal appointment letter designating the HIPAA Security Official.',
                        'Remediation tracking plan showing mitigation of identified ePHI risks.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-workforce-security',
                'Workforce Security, Access Authorization & Sanctions Policy',
                '45 CFR §164.308(a)(3) & (4)',
                '§164.308(a)(3)(4)',
                'Governs workforce clearance procedures, role-based ePHI access privileges, termination procedures, and disciplinary sanctions for violations.',
                ['Formal clearance process', 'Mandatory 24h deprovisioning', 'Documented workforce sanctions'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Ensures that all workforce members have appropriate access to ePHI and prevents unauthorized individuals from accessing sensitive health information.',
                    scopeText: 'All employees, clinicians, medical contractors, administrative staff, and interns.',
                    coreRules: [
                        {
                            title: 'Workforce Clearance & Authorization',
                            rules: [
                                'Workforce members must undergo appropriate background screening prior to receiving access to ePHI.',
                                'Access to ePHI is granted strictly on a role-based, least-privilege basis aligned with clinical or operational job functions.',
                                'Termination of employment triggers immediate revocation of all electronic and physical access to ePHI within 24 hours.'
                            ]
                        },
                        {
                            title: 'Workforce Sanctions Enforcement',
                            rules: [
                                'Violations of HIPAA rules are subject to formal progressive sanctions: Written Warning, Suspension, Immediate Termination, and potential referral for criminal prosecution.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Workforce Clearance', action: 'HR conducts background checks and issues clearance approval before IT provisions credentials.' },
                        { step: 'Role-Based Provisioning', action: 'Supervisors submit access requests selecting pre-defined clinical or billing role profiles.' },
                        { step: 'Departure Deprovisioning', action: 'HR submits departure ticket; IT immediately disables user accounts across all EHR and cloud platforms.' }
                    ],
                    monitoringEvidence: [
                        'Employee background clearance verification records.',
                        'Access provisioning approval tickets with manager signatures.',
                        'Deprovisioning audit logs demonstrating account termination within 24 hours.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-emergency-mode',
                'Contingency Plan, Emergency Mode & Disaster Recovery Policy',
                '45 CFR §164.308(a)(7)',
                '§164.308(a)(7)',
                'Data backup plans, disaster recovery operations, emergency mode operational procedures, and testing/revision protocols for clinical systems.',
                ['Automated ePHI daily backups', 'Emergency mode operating plan', 'Annual restoration testing'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Establishes policies and procedures for responding to an emergency or other occurrence (e.g. fire, vandalism, cyber incident) that damages systems containing ePHI.',
                    scopeText: 'All electronic Protected Health Information databases, clinical imaging archives (PACS), and EHR systems.',
                    coreRules: [
                        {
                            title: 'Data Backup & Disaster Recovery Plan',
                            rules: [
                                'An automated Data Backup Plan must create retrievable exact copies of all electronic PHI on a daily basis.',
                                'Backups must be encrypted at rest (AES-256) and replicated to an off-site, geographically separate facility.'
                            ]
                        },
                        {
                            title: 'Emergency Mode Operation Plan',
                            rules: [
                                'Documented procedures must enable the continuation of critical clinical functions while operating in emergency mode.',
                                'Contingency plans must be tested and revised through simulated operational drills at least annually.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Daily Automated ePHI Backup', action: 'Automated backup engine creates encrypted snapshot of all patient databases daily.' },
                        { step: 'Emergency Mode Transition', action: 'In a disaster, clinical lead activates emergency paper charting and read-only local EHR caches.' },
                        { step: 'Annual Restoration Testing', action: 'Test restore random ePHI snapshot into isolated recovery environment; verify patient record integrity.' }
                    ],
                    monitoringEvidence: [
                        'Daily automated backup execution success logs.',
                        'Annual contingency plan restoration drill test report.',
                        'Documented Emergency Mode Operations Plan for clinical staff.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-technical-access',
                'Technical Access Control & Workstation Security Policy',
                '45 CFR §164.312(a) & §164.310(b)(c)',
                '§164.312(a) & §164.310',
                'Unique user identification, emergency access ("break-glass") procedures, automatic logoff, encryption, and physical workstation protections.',
                ['Unique user ID for every clinician', 'Break-glass emergency override', 'Automatic logoff < 5 minutes'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Implements technical and physical controls to allow access to ePHI only to authorized persons and software programs pursuant to 45 CFR §164.312(a).',
                    scopeText: 'All clinical workstations, mobile tablets, EHR software applications, and medical terminals.',
                    coreRules: [
                        {
                            title: 'Technical Access Controls',
                            rules: [
                                'Unique User Identification: Every clinician and staff member must use a unique username; generic or shared accounts are strictly prohibited.',
                                'Emergency Access ("Break-Glass"): Documented emergency access procedures must allow rapid patient record access during life-critical emergencies, with all override actions immutably audited.',
                                'Automatic Logoff: Workstations accessing ePHI must automatically terminate or lock sessions after a maximum of 5 minutes of inactivity.'
                            ]
                        },
                        {
                            title: 'Physical Workstation Security',
                            rules: [
                                'Workstation monitors displaying ePHI must be positioned away from patient view or equipped with privacy filters.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Unique Credential Issuance', action: 'Issue individual user accounts linked to verified clinician credentials.' },
                        { step: 'Automatic Screen Timeout', action: 'Enforce 5-minute screen lock GPO/MDM policy across all clinical endpoints.' },
                        { step: 'Break-Glass Audit Review', action: 'Security team reviews all emergency access overrides monthly to detect unauthorized record snooping.' }
                    ],
                    monitoringEvidence: [
                        'Identity directory user list verifying zero shared accounts.',
                        'MDM configuration policy confirming 5-minute automated screen timeout.',
                        'Monthly Break-Glass emergency access audit logs.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-baa-governance',
                'Business Associate Agreement (BAA) Governance Policy',
                '45 CFR §164.308(b) & §164.502(e)',
                '§164.308(b)',
                'Mandatory execution of written Business Associate Agreements, annual vendor compliance verifications, and subcontractor liability chains.',
                ['Mandatory BAA prior to ePHI disclosure', 'BAA repository tracking', 'Annual vendor security reviews'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Ensures satisfactory assurances that Business Associates will appropriately safeguard electronic Protected Health Information through binding agreements.',
                    scopeText: 'All third-party vendors, cloud providers, IT consultants, billing agencies, and legal advisors accessing ePHI.',
                    coreRules: [
                        {
                            title: 'Mandatory Written BAA Execution',
                            rules: [
                                'A valid, signed Business Associate Agreement (BAA) must be executed before disclosing any ePHI to a third party.',
                                'BAAs must legally obligate the Business Associate to implement appropriate administrative, physical, and technical safeguards.',
                                'Business Associates must contractually agree to report any security incidents or breaches to the organization within 5 business days.'
                            ]
                        },
                        {
                            title: 'Subcontractor Compliance Chain',
                            rules: [
                                'Business Associates must ensure that any subcontractors that create, receive, maintain, or transmit ePHI agree to identical restrictions.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Vendor BAA Determination', action: 'Legal and privacy teams determine if prospective vendor meets HIPAA Business Associate definition.' },
                        { step: 'BAA Execution & Archival', action: 'Execute standard BAA agreement; archive signed document in centralized contract repository.' },
                        { step: 'Annual Vendor Verification', action: 'Review vendor security certifications and confirm ongoing BAA validity annually.' }
                    ],
                    monitoringEvidence: [
                        'Centralized Business Associate Agreement (BAA) repository with executed contracts.',
                        'Vendor risk assessment scorecards for all active Business Associates.',
                        'Annual BAA audit verification sign-offs.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-audit-controls',
                'Audit Controls, Logging & Transmission Security Policy',
                '45 CFR §164.312(b) & §164.312(e)',
                '§164.312(b)(e)',
                'Hardware, software, and procedural mechanisms that record and examine activity in systems containing ePHI, plus end-to-end encryption in transit.',
                ['Audit logging of all ePHI queries', 'End-to-end TLS 1.3 encryption', '6-year audit log retention'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Implements hardware, software, and procedural mechanisms that record and examine activity in information systems containing or using ePHI under §164.312(b).',
                    scopeText: 'All electronic medical records, database queries, patient portal logins, and network communication channels.',
                    coreRules: [
                        {
                            title: 'Comprehensive ePHI Audit Logging',
                            rules: [
                                'Audit logs must record all view, create, update, and delete actions on patient health records.',
                                'Log records must capture: timestamp, user identifier, patient record ID, terminal identity, and action taken.',
                                'Audit logs must be maintained for a minimum statutory retention period of 6 years (§164.316(b)(2)).'
                            ]
                        },
                        {
                            title: 'Transmission Security',
                            rules: [
                                'ePHI transmitted across public networks must be encrypted using strong modern encryption (TLS 1.3 preferred, TLS 1.2 minimum).'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'EHR Audit Trail Configuration', action: 'Enable granular audit logging across all database engines and application servers.' },
                        { step: 'Automated Anomaly Detection', action: 'Deploy automated monitoring looking for VIP patient access, mass exports, or unusual hour queries.' },
                        { step: 'Tamper-Resistant Archiving', action: 'Stream audit logs to immutable cloud storage bucket with 6-year retention lock.' }
                    ],
                    monitoringEvidence: [
                        'EHR audit trail sample reports capturing user access to patient charts.',
                        'Cloud storage bucket policy showing 6-year immutable retention configuration.',
                        'Transmission encryption verification reports confirming TLS 1.3.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-media-disposal',
                'Media Disposal, Reuse & Device Decommissioning Policy',
                '45 CFR §164.310(d)',
                '§164.310(d)',
                'Governs physical receipt and removal of hardware and electronic media containing ePHI, cryptographic sanitization, and NIST 800-88 certified destruction.',
                ['NIST 800-88 degaussing/shredding', 'Certificate of destruction', 'Physical media inventory tracking'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Governs the receipt and removal of hardware and electronic media containing ePHI, and sets standards for certified sanitization and final disposal.',
                    scopeText: 'All hard drives, backup tapes, USB media, clinical workstations, server disks, and smartphone flash storage.',
                    coreRules: [
                        {
                            title: 'Media Sanitization & NIST SP 800-88 Standards',
                            rules: [
                                'Prior to disposal or reuse, all electronic media containing ePHI must be sanitized in accordance with NIST SP 800-88 Guidelines for Media Sanitization.',
                                'Hard drives destined for disposal must undergo certified physical destruction (shredding/degaussing) by an accredited vendor.',
                                'A Certificate of Destruction detailing serial numbers must be obtained for every destroyed storage asset.'
                            ]
                        },
                        {
                            title: 'Accountability & Chain of Custody',
                            rules: [
                                'A formal inventory must track media movement from retirement through final destruction.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Media Retirement Inventory', action: 'Log retiring drive serial numbers, origin system, and date taken out of service.' },
                        { step: 'Secure Destruction Custody', action: 'Store drives in locked secure bin until collection by certified destruction vendor.' },
                        { step: 'Certificate Reconciliation', action: 'Reconcile vendor Certificate of Destruction against inventory before closing disposal ticket.' }
                    ],
                    monitoringEvidence: [
                        'Vendor Certificates of Destruction detailing sanitized device serial numbers.',
                        'Hardware decommissioning inventory tracking records.',
                        'NIST 800-88 sanitization verification logs.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-npp-patient-rights',
                'Notice of Privacy Practices (NPP) & Patient Rights Policy',
                '45 CFR §164.520 & §164.524',
                '§164.520 & §164.524',
                'Procedures for delivering the Notice of Privacy Practices, honoring patient requests for inspection and copy of medical records within 30 days.',
                ['NPP publication & delivery', '30-day record copy fulfillment', 'Patient accounting of disclosures'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Defines patient privacy rights and establishes procedures for publishing the Notice of Privacy Practices (NPP) and fulfilling medical record access requests.',
                    scopeText: 'All clinical encounters, patient registration desks, patient portals, and health information management operations.',
                    coreRules: [
                        {
                            title: 'Notice of Privacy Practices (NPP) Delivery',
                            rules: [
                                'The organization must deliver the Notice of Privacy Practices (NPP) to every patient on or before the first date of service delivery.',
                                'The current NPP must be prominently posted at all clinical facilities and on the public website.'
                            ]
                        },
                        {
                            title: 'Patient Right to Inspect & Copy Records (§164.524)',
                            rules: [
                                'Patients have the statutory right to inspect and obtain an electronic copy of their health records within 30 calendar days.',
                                'Electronic copies must be delivered in the format requested by the patient (e.g. PDF, portal download) at reasonable cost.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'NPP Delivery & Acknowledgment', action: 'Patient registration staff deliver NPP; collect electronic or paper acknowledgment.' },
                        { step: 'Record Request Intake', action: 'Health Information Management (HIM) logs patient record copy request; verifies identity.' },
                        { step: 'Record Export & Delivery', action: 'Export requested medical records from EHR; deliver to patient within 30 calendar days.' }
                    ],
                    monitoringEvidence: [
                        'Published Notice of Privacy Practices document and website link.',
                        'Signed patient NPP acknowledgment logs in EHR.',
                        'HIM patient record access request fulfillment log showing 30-day compliance.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-minimum-necessary',
                'Minimum Necessary Standard for PHI Use & Disclosure',
                '45 CFR §164.502(b) & §164.514(d)',
                '§164.502(b)',
                'Defines protocols restricting ePHI requests and disclosures to the minimum necessary amount required to accomplish intended clinical or billing purposes.',
                ['Role-based data masking', 'Routine disclosure protocols', 'Non-routine disclosure review'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Enforces the statutory Minimum Necessary standard under 45 CFR §164.502(b), restricting workforce access and disclosures of PHI to the minimum needed.',
                    scopeText: 'All internal workforce queries, clinical chart reviews, insurance billing submissions, and external disclosures.',
                    coreRules: [
                        {
                            title: 'Role-Based PHI Access Limits',
                            rules: [
                                'Workforce members may only access the specific categories of PHI necessary to accomplish their assigned operational duties.',
                                'Billing personnel must have access restricted to financial, demographic, and diagnostic codes; clinical notes are masked.',
                                'Exceptions apply to treatment disclosures between healthcare providers, authorizations, and compliance investigations.'
                            ]
                        },
                        {
                            title: 'Non-Routine Disclosure Review',
                            rules: [
                                'Non-routine disclosures of PHI must be reviewed individually by the HIPAA Privacy Official to ensure minimum necessary limits.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Role-Based Masking Configuration', action: 'Configure EHR user roles with field-level permissions masking sensitive clinical sections.' },
                        { step: 'Non-Routine Disclosure Approval', action: 'Submit disclosure request to Privacy Officer; verify that only requested data elements are included.' },
                        { step: 'Accounting of Disclosures', action: 'Record non-routine disclosures in the HIPAA Accounting of Disclosures register.' }
                    ],
                    monitoringEvidence: [
                        'EHR role-based field access permissions matrix.',
                        'Non-routine PHI disclosure approval requests signed by Privacy Officer.',
                        'Accounting of Disclosures ledger.'
                    ]
                }
            ),
            makePolicy(
                'hipaa-breach-notification',
                'Security Incident Response & Breach Notification Rule SOP',
                '45 CFR §164.308(a)(6) & §164.400–414',
                '§164.400–414',
                'Harm assessment under the 4-factor risk test, individual notification without unreasonable delay (max 60 days), and HHS OCR portal reporting.',
                ['4-factor breach risk assessment', '60-day individual notification clock', 'HHS OCR portal reporting'],
                'HIPAA Security & Privacy Rule (45 CFR)',
                'HHS Office for Civil Rights (OCR)',
                {
                    purposeText: 'Defines standard operating procedures for investigating suspected security incidents and fulfilling statutory Breach Notification Rule obligations under 45 CFR Part 164 Subpart D.',
                    scopeText: 'All acquisitions, accesses, uses, or disclosures of unsecured Protected Health Information in violation of the Privacy Rule.',
                    coreRules: [
                        {
                            title: 'Mandatory 4-Factor Risk Assessment',
                            rules: [
                                'Any unauthorized acquisition of unsecured PHI is presumed to be a breach unless a 4-factor risk assessment demonstrates a low probability of compromise:',
                                '  1. Nature and extent of PHI involved (identifiers, clinical sensitivity).',
                                '  2. Unauthorized person who used or received the PHI.',
                                '  3. Whether the PHI was actually viewed or acquired.',
                                '  4. Extent to which the risk has been mitigated.'
                            ]
                        },
                        {
                            title: 'Statutory Notification Deadlines',
                            rules: [
                                'Individual Notification: Written notice must be provided without unreasonable delay and in no case later than 60 calendar days from discovery.',
                                'HHS OCR Reporting: Breaches affecting >= 500 individuals must be reported to HHS OCR contemporaneously with individual notice. Smaller breaches (< 500) reported annually.'
                            ]
                        }
                    ],
                    procedures: [
                        { step: 'Incident Discovery & Preservation', action: 'Contain compromised system; preserve forensic logs; convene Incident Response Team.' },
                        { step: '4-Factor Risk Assessment', action: 'Privacy and Security Officials execute formal 4-factor harm assessment; document findings.' },
                        { step: 'Individual & HHS Notification', action: 'Dispatch written breach letters to affected individuals and submit report to HHS OCR portal.' }
                    ],
                    monitoringEvidence: [
                        'Completed 4-factor breach risk assessment worksheets.',
                        'HHS OCR breach portal submission receipts.',
                        'Individual notification letter copies and certified postal dispatch receipts.'
                    ]
                }
            )
        ]
    }
};

export const ALL_FRAMEWORK_SUITES: FrameworkSuite[] = Object.values(FRAMEWORK_POLICY_SUITES);

export function getFrameworkSuite(frameworkId: string): FrameworkSuite | undefined {
    const clean = frameworkId.toLowerCase().trim();
    if (clean.includes('nis2')) return FRAMEWORK_POLICY_SUITES.nis2;
    if (clean.includes('iso')) return FRAMEWORK_POLICY_SUITES.iso27001;
    if (clean.includes('soc')) return FRAMEWORK_POLICY_SUITES.soc2;
    if (clean.includes('dora')) return FRAMEWORK_POLICY_SUITES.dora;
    if (clean.includes('gdpr') || clean.includes('privacy')) return FRAMEWORK_POLICY_SUITES.gdpr;
    if (clean.includes('hipaa')) return FRAMEWORK_POLICY_SUITES.hipaa;
    return FRAMEWORK_POLICY_SUITES[clean];
}
