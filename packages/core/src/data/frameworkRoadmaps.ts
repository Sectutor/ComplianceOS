export interface RoadmapTask {
    id: string;
    title: string;
    desc: string;
    link: string;
    cta: string;
    action?: string;
    articleRef?: string;
}

export interface RoadmapMonth {
    month: number;
    weeks: string;
    title: string;
    clauseRef: string;
    badgeColor: string;
    badgeText: string;
    bgLight: string;
    borderColor: string;
    textColor: string;
    tasks: RoadmapTask[];
}

export interface FrameworkRoadmapSpec {
    id: string;
    title: string;
    shortTitle: string;
    subtitle: string;
    frameworkBadge: string;
    color: string;
    months: RoadmapMonth[];
}

/**
 * ISO 27001:2022 90-Day Implementation Roadmap Spec
 */
export const getIso27001Roadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'iso27001',
    title: '90-Day ISO/IEC 27001:2022 Implementation Roadmap',
    shortTitle: 'ISO 27001 90-Day Roadmap',
    subtitle: 'Interactive 12-week operational schedule structured into 3 monthly milestones from initial scope to external certification.',
    frameworkBadge: 'ISO/IEC 27001:2022 • Global ISMS Standard',
    color: 'blue',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Foundation, Scope, Asset Inventory & Risk Strategy',
            clauseRef: 'Clauses 4.1–4.3, 5.1–5.3, 6.1, 8.2',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'm1_scope',
                    title: 'Define ISMS Scope Statement & Interested Parties',
                    desc: 'Identify organizational boundaries, regulatory requirements (GDPR/NIS2), and publish executive commitment.',
                    link: `/clients/${clientId}/iso27001/governance`,
                    cta: 'Go to Scope',
                    articleRef: 'Clauses 4.1–4.3'
                },
                {
                    id: 'm1_assets',
                    title: 'Catalog Information Assets & Assign Owners',
                    desc: 'Register cloud infrastructure (AWS/Azure), code repositories, SaaS apps, and endpoints with CIA ratings.',
                    link: `/clients/${clientId}/iso27001/assets`,
                    cta: 'Go to Assets',
                    articleRef: 'Clause 8 / A.5.9'
                },
                {
                    id: 'm1_risks',
                    title: 'Execute ISO 27005 Threat & Vulnerability Risk Assessment',
                    desc: 'Identify threat scenarios, compute inherent risk scores (1-25), and set corporate risk appetite thresholds.',
                    link: `/clients/${clientId}/iso27001/risks`,
                    cta: 'Go to Risks',
                    articleRef: 'Clause 6.1.2'
                },
                {
                    id: 'm1_rtp',
                    title: 'Formulate Risk Treatment Plan (RTP)',
                    desc: 'Assign risk owners, define treatment options (Mitigate, Transfer, Avoid, Accept), and set target resolution dates.',
                    link: `/clients/${clientId}/iso27001/risks`,
                    cta: 'Manage RTP',
                    articleRef: 'Clause 6.1.3'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Controls, Policies & Statement of Applicability (SoA)',
            clauseRef: 'Clause 6.1.3, 7.2–7.5, Annex A (93 Controls)',
            badgeColor: 'bg-purple-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-purple-50/70',
            borderColor: 'border-purple-100',
            textColor: 'text-purple-700',
            tasks: [
                {
                    id: 'm2_soa',
                    title: 'Complete Statement of Applicability (SoA)',
                    desc: 'Document applicability and formal justifications for all 93 controls across Organizational, People, Physical, and Tech themes.',
                    link: `/clients/${clientId}/iso27001/soa`,
                    cta: 'Go to SoA',
                    articleRef: 'Clause 6.1.3'
                },
                {
                    id: 'm2_policies',
                    title: 'Publish & Approve Mandatory ISMS Policies',
                    desc: 'Customize and approve Access Control, Cryptography, Incident Response, Backup, and Vendor Security policies.',
                    link: `/clients/${clientId}/iso27001/documents`,
                    cta: 'Go to Policies',
                    articleRef: 'Clause 7.5'
                },
                {
                    id: 'm2_awareness',
                    title: 'Roll Out Employee Awareness & Policy Acknowledgments',
                    desc: 'Conduct employee security training and track mandatory read-and-sign policy acknowledgments.',
                    link: `/clients/${clientId}/training`,
                    cta: 'Go to Training',
                    articleRef: 'Clause 7.2 & 7.3'
                },
                {
                    id: 'm2_evidence',
                    title: 'Attach Operational & Technical Evidence',
                    desc: 'Collect configuration evidence (MFA enforcement, EDR telemetry, backup test logs) and map to controls.',
                    link: `/evidence`,
                    cta: 'Go to Evidence',
                    articleRef: 'Clause 9.1'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Internal Audit, Management Review & Certification',
            clauseRef: 'Clauses 9.1–9.3, 10.1–10.2, Stage 1 / Stage 2',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'm3_audit',
                    title: 'Execute Full ISMS Internal Audit (Clause 9.2)',
                    desc: 'Conduct an objective internal audit across all clauses (4-10) and active Annex A controls, recording sample evidence.',
                    link: `/clients/${clientId}/iso27001/audit`,
                    cta: 'Go to Internal Audit',
                    articleRef: 'Clause 9.2'
                },
                {
                    id: 'm3_capa',
                    title: 'Log Root Cause Analysis & Remediate Non-Conformities (CAPA)',
                    desc: 'Perform RCA on any audit findings, implement corrective actions, and verify remediation before external audit.',
                    link: `/clients/${clientId}/iso27001/audit`,
                    cta: 'Manage CAPA',
                    articleRef: 'Clause 10.1 & 10.2'
                },
                {
                    id: 'm3_mgmt',
                    title: 'Hold Formal Management Review Meeting (Clause 9.3)',
                    desc: 'Convene executive leadership, review live ISMS telemetry, and record formal signed meeting minutes.',
                    link: `/clients/${clientId}/iso27001/management-review`,
                    cta: 'Go to Review',
                    articleRef: 'Clause 9.3'
                },
                {
                    id: 'm3_cert',
                    title: 'Stage 1 & Stage 2 Certification Audit Clean Room',
                    desc: 'Generate the complete Audit Dossier and provide accredited external auditors access to the Clean Room.',
                    link: `#`,
                    cta: 'Open Dossier',
                    action: 'open_dossier',
                    articleRef: 'Stage 1 / Stage 2'
                }
            ]
        }
    ]
});

/**
 * GDPR 90-Day Implementation Roadmap Spec
 */
export const getGdprRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'gdpr',
    title: '90-Day GDPR & Privacy Implementation Roadmap',
    shortTitle: 'GDPR 90-Day Roadmap',
    subtitle: '12-week operational journey from raw data discovery to Article 30 ROPA, DPIAs, and regulatory audit readiness.',
    frameworkBadge: 'EU 2016/679 • GDPR Compliance',
    color: 'sky',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'PII Discovery, Data Mapping & Article 30 ROPA',
            clauseRef: 'Articles 5, 6, 9, 30',
            badgeColor: 'bg-sky-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-sky-50/70',
            borderColor: 'border-sky-200',
            textColor: 'text-sky-700',
            tasks: [
                {
                    id: 'gdpr_m1_inventory',
                    title: 'Automated PII Asset Discovery & Data Classification',
                    desc: 'Catalog databases, S3 buckets, and SaaS apps storing customer/employee PII with sensitivity tiers.',
                    link: `/clients/${clientId}/privacy/inventory`,
                    cta: 'Data Inventory',
                    articleRef: 'Art. 30(1)'
                },
                {
                    id: 'gdpr_m1_ropa',
                    title: 'Compile Article 30 Records of Processing Activities (ROPA)',
                    desc: 'Log processing activities (HR, Marketing, Analytics, Core Product) with legal bases and retention schedules.',
                    link: `/clients/${clientId}/privacy/ropa`,
                    cta: 'Manage ROPA',
                    articleRef: 'Art. 30'
                },
                {
                    id: 'gdpr_m1_lawful_basis',
                    title: 'Validate Lawful Bases & Consent Architectures',
                    desc: 'Review consent mechanisms, cookie consent banners, and legitimate interest assessments (LIA).',
                    link: `/clients/${clientId}/privacy/ropa`,
                    cta: 'Review Bases',
                    articleRef: 'Art. 6 & 7'
                },
                {
                    id: 'gdpr_m1_retention',
                    title: 'Establish Data Minimization & Retention Schedules',
                    desc: 'Define time limits for erasure and automated data lifecycle rules across production databases and logs.',
                    link: `/clients/${clientId}/privacy/inventory`,
                    cta: 'Set Retention',
                    articleRef: 'Art. 5(1)(e)'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Data Subject Rights, Notices & Vendor DPAs',
            clauseRef: 'Articles 12–23, 28, 44–49',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-200',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'gdpr_m2_dsar',
                    title: 'Deploy Automated DSAR Intake & 30-Day Response SLA',
                    desc: 'Configure intake portal for access, rectification, erasure (right to be forgotten), and data portability.',
                    link: `/clients/${clientId}/privacy/dsar`,
                    cta: 'DSAR Portal',
                    articleRef: 'Art. 12–20'
                },
                {
                    id: 'gdpr_m2_privacy_notice',
                    title: 'Update External Privacy Policies & Employee Notices',
                    desc: 'Publish transparent, plain-language privacy notices detailing controller info, DPO contact, and user rights.',
                    link: `/clients/${clientId}/privacy/program-guide`,
                    cta: 'View Guide',
                    articleRef: 'Art. 13 & 14'
                },
                {
                    id: 'gdpr_m2_dpas',
                    title: 'Execute Data Processing Agreements (DPAs) with Subprocessors',
                    desc: 'Verify all third-party cloud vendors (AWS, Stripe, CRM) have signed Article 28 DPAs with standard contractual clauses.',
                    link: `/clients/${clientId}/vendors/overview`,
                    cta: 'Vendor DPAs',
                    articleRef: 'Art. 28'
                },
                {
                    id: 'gdpr_m2_schrems',
                    title: 'Conduct Cross-Border Transfer Impact Assessments (TIA)',
                    desc: 'Evaluate EU-to-US/third-country data transfers, supplementary technical safeguards, and SCC compliance.',
                    link: `/clients/${clientId}/privacy/transfers`,
                    cta: 'Run TIAs',
                    articleRef: 'Art. 44–49'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'DPIA Risk Assessments, Breach SLA & Audit Clean Room',
            clauseRef: 'Articles 32, 33–34, 35–36, 37–39',
            badgeColor: 'bg-teal-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-teal-50/70',
            borderColor: 'border-teal-200',
            textColor: 'text-teal-700',
            tasks: [
                {
                    id: 'gdpr_m3_dpia',
                    title: 'Perform Data Protection Impact Assessments (DPIA)',
                    desc: 'Execute systematic risk evaluations for high-risk processing, automated profiling, and biometric telemetry.',
                    link: `/clients/${clientId}/privacy/dpia`,
                    cta: 'Execute DPIA',
                    articleRef: 'Art. 35'
                },
                {
                    id: 'gdpr_m3_breach',
                    title: 'Test 72-Hour Personal Data Breach Notification SLA',
                    desc: 'Run a simulated breach tabletop exercise to verify incident logging and prompt DPA notification procedures.',
                    link: `/clients/${clientId}/privacy/breaches`,
                    cta: 'Breach Register',
                    articleRef: 'Art. 33 & 34'
                },
                {
                    id: 'gdpr_m3_security',
                    title: 'Verify Technical Security Measures (TOMs)',
                    desc: 'Confirm encryption at rest and in transit, pseudonymization, vulnerability scanning, and access controls.',
                    link: `/clients/${clientId}/controls`,
                    cta: 'View TOMs',
                    articleRef: 'Art. 32'
                },
                {
                    id: 'gdpr_m3_audit',
                    title: 'Package Auditor & DPO Accountability Clean Room',
                    desc: 'Assemble ROPA exports, signed DPAs, DPIA findings, and policy sign-offs into an inspection-ready dossier.',
                    link: `/clients/${clientId}/privacy/program-guide`,
                    cta: 'Open Clean Room',
                    articleRef: 'Art. 5(2)'
                }
            ]
        }
    ]
});

/**
 * DORA (Digital Operational Resilience Act) 90-Day Implementation Roadmap Spec
 */
export const getDoraRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'dora',
    title: '90-Day DORA Implementation Roadmap (Regulation EU 2022/2554)',
    shortTitle: 'DORA 90-Day Roadmap',
    subtitle: '12-week operational schedule across the 5 DORA pillars: ICT Risk, Incident Reporting, Testing, TPRM, and Information Sharing.',
    frameworkBadge: 'Regulation (EU) 2022/2554 • Financial Resilience',
    color: 'emerald',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'ICT Governance, Asset Architecture & Risk Framework',
            clauseRef: 'DORA Articles 5–7, 8–9',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-200',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'dora_m1_governance',
                    title: 'Establish Management Body ICT Oversight & Accountability',
                    desc: 'Formulate Board-level digital resilience mandate, define risk tolerance, and document executive training schedule.',
                    link: `/clients/${clientId}/dora`,
                    cta: 'Resilience Mandate',
                    articleRef: 'Art. 5'
                },
                {
                    id: 'dora_m1_assets',
                    title: 'Map Critical or Important ICT Assets & System Architecture',
                    desc: 'Catalog all core banking, trading, payment, and cloud dependencies with interconnectivity mapping.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'ICT Assets',
                    articleRef: 'Art. 8'
                },
                {
                    id: 'dora_m1_risk_framework',
                    title: 'Deploy DORA-Aligned ICT Risk Management Framework',
                    desc: 'Implement risk assessment workflows evaluating threat vectors, single points of failure (SPOF), and RTO/RPO targets.',
                    link: `/clients/${clientId}/risks/register`,
                    cta: 'Risk Register',
                    articleRef: 'Art. 6 & 7'
                },
                {
                    id: 'dora_m1_bcp',
                    title: 'Draft ICT Business Continuity & Disaster Recovery Plans',
                    desc: 'Specify recovery procedures, backup redundancy (immutable storage), and alternate site failover procedures.',
                    link: `/clients/${clientId}/business-continuity/overview`,
                    cta: 'BCP Plans',
                    articleRef: 'Art. 11 & 12'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Resilience Testing, Protection & Incident Reporting Hub',
            clauseRef: 'DORA Articles 10–14, 17–23, 24–27',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'dora_m2_protection',
                    title: 'Enforce Defense-in-Depth & Identity Protection',
                    desc: 'Implement mandatory phishing-resistant MFA, network micro-segmentation, and automated patch management.',
                    link: `/clients/${clientId}/controls`,
                    cta: 'Security Controls',
                    articleRef: 'Art. 9'
                },
                {
                    id: 'dora_m2_incident_protocol',
                    title: 'Establish Major ICT Incident Classification & 4h/24h Notification',
                    desc: 'Configure automated thresholds for major ICT incidents, initial notification within 4h, and intermediate/final reports.',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Incident Center',
                    articleRef: 'Art. 17–20'
                },
                {
                    id: 'dora_m2_resilience_testing',
                    title: 'Establish Digital Operational Resilience Testing Program',
                    desc: 'Schedule vulnerability assessments, network penetration tests, and gap analysis for annual testing requirements.',
                    link: `/clients/${clientId}/gap-analysis`,
                    cta: 'Resilience Tests',
                    articleRef: 'Art. 24 & 25'
                },
                {
                    id: 'dora_m2_tlier_readiness',
                    title: 'Scope Threat-Led Penetration Testing (TLPT / TIBER-EU)',
                    desc: 'Determine applicability of advanced TLPT based on system criticality and financial sector systemic impact.',
                    link: `/clients/${clientId}/dora`,
                    cta: 'TLPT Scoping',
                    articleRef: 'Art. 26 & 27'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'ICT Third-Party Risk Management (TPRM) & Exit Strategies',
            clauseRef: 'DORA Articles 28–44',
            badgeColor: 'bg-purple-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-purple-50/70',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-700',
            tasks: [
                {
                    id: 'dora_m3_vendor_register',
                    title: 'Register All ICT Third-Party Providers in Information Register',
                    desc: 'Maintain standard ESA register of information covering all contractual arrangements supporting critical services.',
                    link: `/clients/${clientId}/vendors/overview`,
                    cta: 'Vendor Register',
                    articleRef: 'Art. 28(3)'
                },
                {
                    id: 'dora_m3_contracts',
                    title: 'Audit Contractual Provisions & Right to Audit Clauses',
                    desc: 'Enforce mandatory contractual clauses: full audit rights, data locations, security guarantees, and sub-outsourcing notice.',
                    link: `/clients/${clientId}/vendors/contracts`,
                    cta: 'Audit Contracts',
                    articleRef: 'Art. 30'
                },
                {
                    id: 'dora_m3_concentration',
                    title: 'Assess ICT Concentration Risk & Multi-Cloud Redundancy',
                    desc: 'Analyze critical vendor dependency concentration (e.g. AWS/Azure SPOFs) and evaluate alternate provider feasibility.',
                    link: `/clients/${clientId}/vendors/overview`,
                    cta: 'Concentration Risk',
                    articleRef: 'Art. 29'
                },
                {
                    id: 'dora_m3_exit_strategy',
                    title: 'Formulate Documented Exit Strategies & Transition Plans',
                    desc: 'Establish actionable exit plans for critical ICT services with data migration pathways and minimum service transition SLAs.',
                    link: `/clients/${clientId}/business-continuity/overview`,
                    cta: 'Exit Plans',
                    articleRef: 'Art. 28(8)'
                }
            ]
        }
    ]
});

/**
 * NIS2 Directive 90-Day Implementation Roadmap Spec
 */
export const getNis2Roadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'nis2',
    title: '90-Day NIS2 Directive Implementation Roadmap (Directive EU 2022/2555)',
    shortTitle: 'NIS2 90-Day Roadmap',
    subtitle: '12-week operational schedule across Entity Classification, Article 21 Security Measures, and Article 23 CSIRT Rapid Reporting.',
    frameworkBadge: 'Directive (EU) 2022/2555 • Critical Infrastructure',
    color: 'amber',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Entity Scope, Governance Mandate & All-Hazards Risk',
            clauseRef: 'NIS2 Articles 2, 3, 20, 21.2.a',
            badgeColor: 'bg-amber-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-200',
            textColor: 'text-amber-700',
            tasks: [
                {
                    id: 'nis2_m1_classification',
                    title: 'Classify Entity as Essential or Important Entity',
                    desc: 'Execute formal jurisdictional and sector size assessment (Annex I/II sectors: Energy, Health, Digital, Transport, Finance).',
                    link: `/clients/${clientId}/nis2/entity-classification`,
                    cta: 'Entity Wizard',
                    articleRef: 'Art. 2 & 3'
                },
                {
                    id: 'nis2_m1_management',
                    title: 'Formalize Executive Management Oversight & Cyber Training',
                    desc: 'Document statutory management liability compliance and ensure board members complete mandatory cybersecurity training.',
                    link: `/clients/${clientId}/nis2/management-liability`,
                    cta: 'Management Board',
                    articleRef: 'Art. 20'
                },
                {
                    id: 'nis2_m1_national_reg',
                    title: 'Register with National Competent Authority & CSIRT',
                    desc: 'Complete national regulatory registry submission with primary IP ranges and responsible officer contacts.',
                    link: `/clients/${clientId}/nis2/entity-registry`,
                    cta: 'Entity Registry',
                    articleRef: 'Art. 27'
                },
                {
                    id: 'nis2_m1_risk_policy',
                    title: 'Deploy All-Hazards Cyber Risk Analysis Policies',
                    desc: 'Establish systematic risk assessment workflows addressing physical security, system vulnerabilities, and human factors.',
                    link: `/clients/${clientId}/risks/register`,
                    cta: 'Risk Register',
                    articleRef: 'Art. 21(2)(a)'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Operational Baseline, Supply Chain & Cryptography',
            clauseRef: 'NIS2 Article 21(2)(b)–(j)',
            badgeColor: 'bg-orange-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-orange-50/70',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700',
            tasks: [
                {
                    id: 'nis2_m2_sec_measures',
                    title: 'Implement Article 21 10-Point Technical Security Measures',
                    desc: 'Benchmark baseline controls: access management, MFA, secure communications, backup management, and hygiene.',
                    link: `/clients/${clientId}/nis2/security-measures`,
                    cta: 'Art. 21 Controls',
                    articleRef: 'Art. 21(2)'
                },
                {
                    id: 'nis2_m2_supply_chain',
                    title: 'Audit Direct Suppliers & Supply Chain Security Posture',
                    desc: 'Assess vulnerabilities specific to direct suppliers, verify supplier security practices, and record vendor risk tiers.',
                    link: `/clients/${clientId}/nis2/supply-chain`,
                    cta: 'Supply Chain',
                    articleRef: 'Art. 21(2)(d)'
                },
                {
                    id: 'nis2_m2_crypto',
                    title: 'Verify Cryptography & End-to-End Encryption Standards',
                    desc: 'Audit transport layer encryption (TLS 1.3), AES-256 at rest, and secret/key lifecycle management across production.',
                    link: `/clients/${clientId}/controls`,
                    cta: 'Crypto Controls',
                    articleRef: 'Art. 21(2)(h)'
                },
                {
                    id: 'nis2_m2_bcp',
                    title: 'Operationalize Crisis Management & Backup Redundancy',
                    desc: 'Test immutable off-site backups, crisis communication procedures, and emergency operations call trees.',
                    link: `/clients/${clientId}/business-continuity/overview`,
                    cta: 'Continuity Hub',
                    articleRef: 'Art. 21(2)(c)'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'CSIRT Early Warning Protocol & Supervisory Audit Pack',
            clauseRef: 'NIS2 Articles 20, 23, 32–34',
            badgeColor: 'bg-rose-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-rose-50/70',
            borderColor: 'border-rose-200',
            textColor: 'text-rose-700',
            tasks: [
                {
                    id: 'nis2_m3_early_warning',
                    title: 'Deploy 24h Early Warning & 72h Incident Notification System',
                    desc: 'Configure automated incident threshold workflows to dispatch 24h Early Warning and 72h Incident Reports to national CSIRTs.',
                    link: `/clients/${clientId}/nis2/incident-reporting`,
                    cta: 'Incident Reporting',
                    articleRef: 'Art. 23(1)–(4)'
                },
                {
                    id: 'nis2_m3_final_report',
                    title: 'Standardize 1-Month Incident Final Reporting Process',
                    desc: 'Establish post-incident RCA templates detailing root cause, mitigation applied, and cross-border impact calculations.',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Incident Posture',
                    articleRef: 'Art. 23(4)(c)'
                },
                {
                    id: 'nis2_m3_cross_border',
                    title: 'Map Cross-Border Single Point of Contact (SPOC) Obligations',
                    desc: 'Document European cross-border reporting routes if providing digital services in multiple EU Member States.',
                    link: `/clients/${clientId}/nis2/cross-border`,
                    cta: 'Cross-Border',
                    articleRef: 'Art. 26'
                },
                {
                    id: 'nis2_m3_audit_bundle',
                    title: 'Generate NIS2 Supervisory Inspection Audit Bundle',
                    desc: 'Package executive sign-offs, Article 21 control verification evidence, and supplier risk matrices for supervisory audit.',
                    link: `/clients/${clientId}/nis2/audit-bundle`,
                    cta: 'Audit Bundle',
                    articleRef: 'Art. 32'
                }
            ]
        }
    ]
});

/**
 * Federal (CMMC 2.0 / FedRAMP / NIST 800-171) 90-Day Implementation Roadmap Spec
 */
export const getFederalRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'federal',
    title: '90-Day Federal Implementation Roadmap (CMMC 2.0 & FedRAMP)',
    shortTitle: 'Federal 90-Day Roadmap',
    subtitle: '12-week operational schedule across CUI boundary isolation, 110 NIST 800-171 controls, SSP generation, and 3PAO assessment readiness.',
    frameworkBadge: 'DFARS 252.204-7012 • CMMC Level 2 • FedRAMP Moderate',
    color: 'blue',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'CUI Enclave Boundary, Contracts & Scoping',
            clauseRef: 'DFARS 7012, NIST 800-171 §3.1–3.3',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'fed_m1_contracts',
                    title: 'Catalog DoD Contracts & Review DFARS 7012 / CMMC Clauses',
                    desc: 'Identify active federal contracts, subcontracts, and task orders containing DFARS 252.204-7012 or FAR 52.204-21.',
                    link: `/clients/${clientId}/federal/contracts`,
                    cta: 'Contract Tracker',
                    articleRef: 'DFARS 7012'
                },
                {
                    id: 'fed_m1_cui_quiz',
                    title: 'Execute Controlled Unclassified Information (CUI) Applicability Review',
                    desc: 'Determine exact CUI categories handled (e.g. CTI, Nuclear, Law Enforcement) and identify data flow diagrams.',
                    link: `/clients/${clientId}/federal/cui-quiz`,
                    cta: 'CUI Quiz',
                    articleRef: '32 CFR 2002'
                },
                {
                    id: 'fed_m1_boundary',
                    title: 'Define Authorization Boundary & CUI Enclave Segmentation',
                    desc: 'Isolate systems storing, processing, or transmitting CUI to minimize assessment scope and FedRAMP boundary.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'Scope Boundary',
                    articleRef: 'NIST §3.1.3'
                },
                {
                    id: 'fed_m1_gap',
                    title: 'Execute Baseline Gap Analysis Against 110 NIST 800-171 Controls',
                    desc: 'Assess implementation status across Access Control, Identification, Incident Response, and Media Protection.',
                    link: `/clients/${clientId}/federal/assessment-171`,
                    cta: 'NIST 171 Audit',
                    articleRef: 'NIST 800-171'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Technical Hardening, FIPS 140 & System Security Plan (SSP)',
            clauseRef: 'NIST 800-171 §3.4–3.14, FedRAMP Baselines',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-200',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'fed_m2_fips',
                    title: 'Validate FIPS 140-2/3 Validated Cryptographic Modules',
                    desc: 'Verify that all endpoint disk encryption, VPN tunnels, and TLS configurations use CMVP-validated crypto modules.',
                    link: `/clients/${clientId}/federal/fips-140`,
                    cta: 'FIPS 140 Tracker',
                    articleRef: 'NIST §3.13.11'
                },
                {
                    id: 'fed_m2_mfa',
                    title: 'Enforce Phishing-Resistant MFA & Strict Session Control',
                    desc: 'Implement CAC/PIV or FIDO2 WebAuthn hardware tokens for all local and remote administrative access to CUI.',
                    link: `/clients/${clientId}/controls`,
                    cta: 'MFA Controls',
                    articleRef: 'NIST §3.5.3'
                },
                {
                    id: 'fed_m2_ssp',
                    title: 'Author & Publish System Security Plan (SSP)',
                    desc: 'Draft comprehensive technical narratives documenting control implementation for all 110 controls.',
                    link: `/clients/${clientId}/federal/ssp`,
                    cta: 'SSP Editor',
                    articleRef: 'NIST §3.12.4'
                },
                {
                    id: 'fed_m2_poam',
                    title: 'Establish Formal Plan of Action & Milestones (POA&M)',
                    desc: 'Document any unmet controls with scheduled remediation milestones, resource requirements, and risk acceptance justifications.',
                    link: `/clients/${clientId}/federal/poam`,
                    cta: 'POA&M Tracker',
                    articleRef: 'NIST §3.12.2'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'SPRS Score, Tabletop Incident Drill & 3PAO Clean Room',
            clauseRef: 'SPRS Scoring, CMMC C3PAO, FedRAMP ATO',
            badgeColor: 'bg-cyan-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-200',
            textColor: 'text-cyan-700',
            tasks: [
                {
                    id: 'fed_m3_sprs',
                    title: 'Calculate & Submit Official SPRS Score (-203 to +110)',
                    desc: 'Compute DoD Assessment Methodology score and prepare payload for submission to Supplier Performance Risk System.',
                    link: `/clients/${clientId}/federal/sprs`,
                    cta: 'SPRS Calculator',
                    articleRef: 'DFARS 7019/7020'
                },
                {
                    id: 'fed_m3_incident_drill',
                    title: 'Run DoD Cyber Incident Tabletop & DIBNet 72h Drill',
                    desc: 'Simulate confirmed CUI spill incident and verify reporting mechanisms to DoD Cyber Crime Center (DC3) / DIBNet.',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Incident Center',
                    articleRef: 'DFARS 7012(c)'
                },
                {
                    id: 'fed_m3_c3pao',
                    title: 'Assemble Security Assessment Report (SAR) & Evidence Dossier',
                    desc: 'Package configuration screenshots, STIG checklists, and policy approvals for third-party C3PAO or 3PAO review.',
                    link: `/clients/${clientId}/federal/sar`,
                    cta: 'SAR Dossier',
                    articleRef: 'FedRAMP / CMMC'
                },
                {
                    id: 'fed_m3_ato',
                    title: 'Engage Authorizing Official (AO) / Schedule C3PAO Audit',
                    desc: 'Finalize pre-assessment dry run and lock authorization package for official certification review.',
                    link: `/clients/${clientId}/federal/fedramp`,
                    cta: 'FedRAMP Packages',
                    articleRef: 'ATO Gate'
                }
            ]
        }
    ]
});
