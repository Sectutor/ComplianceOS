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
            title: 'Foundation, Scope, Governance & Risk Strategy',
            clauseRef: 'Clauses 4.1–4.3, 5.1–5.3, 6.1–6.2, 8.2',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'm1_scope',
                    title: 'Define ISMS Scope Statement & Interested Parties',
                    desc: 'Identify organizational boundaries, regulatory requirements (GDPR/NIS2), and publish executive scope statement.',
                    link: `/clients/${clientId}/iso27001/governance?tab=scope`,
                    cta: 'Go to Scope',
                    articleRef: 'Clauses 4.1–4.3'
                },
                {
                    id: 'm1_policy',
                    title: 'Draft & Publish Master Information Security Policy',
                    desc: 'Formalize executive leadership commitment, core security principles, and publish the organization-wide Information Security Policy.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Create Policy',
                    articleRef: 'Clause 5.2'
                },
                {
                    id: 'm1_objectives',
                    title: 'Establish Measurable Security Objectives & KPIs',
                    desc: 'Define measurable information security objectives aligned with business goals and establish metrics to track fulfillment.',
                    link: `/clients/${clientId}/iso27001/governance?tab=objectives`,
                    cta: 'Set Objectives',
                    articleRef: 'Clause 6.2'
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
                    link: `/clients/${clientId}/risks/vulnerabilities`,
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
            clauseRef: 'Clause 6.1.3, 7.2–7.5, Annex A (A.5–A.8)',
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
                    title: 'Author & Approve Topic-Specific Annex A Policies',
                    desc: 'Draft and approve mandatory operational policies: Access Control, Incident Response, Cryptography, Backup, BC/DR, and Vendor Security.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Generate Policies',
                    articleRef: 'Clause 7.5 & A.5.1'
                },
                {
                    id: 'm2_docs',
                    title: 'Maintain Mandatory Document Tracker & Version Control',
                    desc: 'Track document approval dates, annual review intervals, document owners, and version history in the ISMS Document Register.',
                    link: `/clients/${clientId}/iso27001/documents`,
                    cta: 'Document Register',
                    articleRef: 'Clause 7.5'
                },
                {
                    id: 'm2_awareness',
                    title: 'Roll Out Employee Awareness & Policy Acknowledgments',
                    desc: 'Conduct employee security training and track mandatory read-and-sign policy acknowledgments.',
                    link: `/clients/${clientId}/training/management`,
                    cta: 'Go to Training',
                    articleRef: 'Clause 7.2 & 7.3'
                },
                {
                    id: 'm2_evidence',
                    title: 'Attach Operational & Technical Evidence',
                    desc: 'Collect configuration evidence (MFA enforcement, EDR telemetry, backup test logs) and map to controls.',
                    link: `/evidence`,
                    cta: 'Go to Evidence',
                    articleRef: 'Clause 8.1 & 9.1'
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
            title: 'PII Discovery, Policy Baseline & Article 30 ROPA',
            clauseRef: 'Articles 5, 6, 9, 13, 14, 24, 30',
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
                    id: 'gdpr_m1_policy',
                    title: 'Draft & Publish Master Data Protection Policy',
                    desc: 'Formalize organizational privacy governance, data protection principles, and staff handling obligations.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Create Policy',
                    articleRef: 'Art. 24'
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
                    title: 'Publish External Privacy Notices & Employee Disclosures',
                    desc: 'Publish transparent, plain-language privacy notices detailing controller info, DPO contact, and user rights.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Author Notices',
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
            title: 'ICT Governance, Policy Baseline & Risk Architecture',
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
                    id: 'dora_m1_rmf_policy',
                    title: 'Author Board-Approved ICT Risk Management Framework Policy',
                    desc: 'Draft and formalize the core DORA ICT security strategy, risk tolerance limits, and operational governance rules.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Create Policy',
                    articleRef: 'Art. 5 & 6'
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
                    link: `/clients/${clientId}/business-continuity`,
                    cta: 'BCP Plans',
                    articleRef: 'Art. 11 & 12'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Resilience Testing, Protection & Incident Reporting Hub',
            clauseRef: 'DORA Articles 9, 10–14, 17–23, 24–27',
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
                    id: 'dora_m2_incident_policy',
                    title: 'Draft Major ICT Incident Management & Reporting SOP',
                    desc: 'Document statutory classification criteria for major incidents, escalation triggers, and regulatory notification templates.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Author SOP',
                    articleRef: 'Art. 17 & 18'
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
                    id: 'dora_m3_tprm_policy',
                    title: 'Author Policy on Use of ICT Third-Party Providers',
                    desc: 'Establish formal governance rules for engaging, assessing, and monitoring third-party cloud and IT services.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'TPRM Policy',
                    articleRef: 'Art. 28(2)'
                },
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
                    link: `/clients/${clientId}/business-continuity`,
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
            title: 'Entity Scope, Governance Mandate & Risk Policies',
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
                    id: 'nis2_m1_policy',
                    title: 'Draft Article 21 Master Cybersecurity Risk Policies',
                    desc: 'Establish the written organizational cybersecurity governance framework, all-hazards risk analysis policy, and statutory compliance objectives.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Create Policy',
                    articleRef: 'Art. 21(2)(a)'
                },
                {
                    id: 'nis2_m1_risk_policy',
                    title: 'Deploy All-Hazards Cyber Risk Analysis Workflows',
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
            title: 'Operational Baseline, Policy Suite & Supply Chain',
            clauseRef: 'NIS2 Article 21(2)(b)–(j)',
            badgeColor: 'bg-orange-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-orange-50/70',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700',
            tasks: [
                {
                    id: 'nis2_m2_policies',
                    title: 'Author Article 21 Minimum Security Policy Suite',
                    desc: 'Publish mandatory topic policies: Incident Handling (b), Backup & Crisis (c), Supply Chain (d), CVD Vulnerabilities (e), Crypto (h), and Access/MFA (i, j).',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Generate Policies',
                    articleRef: 'Art. 21(2)'
                },
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
                    link: `/clients/${clientId}/business-continuity`,
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
                    id: 'fed_m1_policies',
                    title: 'Author 14 NIST SP 800-171 Family Security Policies',
                    desc: 'Draft and formally approve governance policies across all 14 NIST families (Access Control, Identification, Audit, Media Protection, Incident Response, etc.).',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Policy Center',
                    articleRef: 'NIST §3.1–3.14'
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
                    link: `/clients/${clientId}/federal/ssp-171`,
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
                },
                {
                    id: 'fed_m2_irp',
                    title: 'Draft Incident Response Plan with DoD 72-Hour DC3 Reporting SOP',
                    desc: 'Document cyber incident handling procedures, evidence preservation protocols, and mandatory 72-hour reporting to DoD Cyber Crime Center (DC3).',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Incident SOP',
                    articleRef: 'DFARS 7012(c)'
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

/**
 * SOC 2 Type II Attestation 90-Day Implementation Roadmap Spec
 */
export const getSoc2Roadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'soc2',
    title: '90-Day SOC 2 Type II Implementation Roadmap',
    shortTitle: 'SOC 2 90-Day Roadmap',
    subtitle: '12-week operational schedule across AICPA Trust Services Criteria (Security, Availability, Confidentiality, Processing Integrity, Privacy).',
    frameworkBadge: 'AICPA SOC 2 Type II • Trust Services Criteria',
    color: 'blue',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Scoping, Trust Services Criteria (TSC) & Governance Baseline',
            clauseRef: 'CC1.1–CC1.5, CC2.1–CC2.3 (Control Environment)',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'soc2_m1_scoping',
                    title: 'Define Trust Services Scope & In-Scope Systems Boundary',
                    desc: 'Determine in-scope categories (Security mandatory, plus Availability, Confidentiality, etc.) and delineate cloud boundaries.',
                    link: `/clients/${clientId}/readiness/wizard/SOC2`,
                    cta: 'Scoping Wizard',
                    articleRef: 'TSC CC1.1'
                },
                {
                    id: 'soc2_m1_policies',
                    title: 'Author & Publish 14 Mandatory SOC 2 Security Policies',
                    desc: 'Draft, executive-approve, and publish the 14 mandatory SOC 2 governance policies: Information Security, Access Control, Change Management, Incident Response, Cryptography, Vendor Management, Code of Conduct, and Whistleblower.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Policy Center',
                    articleRef: 'TSC CC2.1'
                },
                {
                    id: 'soc2_m1_system_desc',
                    title: 'Draft Section III System Description & Principal Service Commitments',
                    desc: 'Document system architecture, boundaries, infrastructure components, software, people, data flows, and subservice organization carve-outs per AICPA DC 200.',
                    link: `/clients/${clientId}/soc2/program-guide?tab=system-description`,
                    cta: 'System Description Studio',
                    articleRef: 'AICPA DC 200'
                },
                {
                    id: 'soc2_m1_roles',
                    title: 'Establish Security Roles, Org Chart & Background Checks',
                    desc: 'Define security responsibilities, reporting hierarchies, and enforce mandatory pre-employment background screening.',
                    link: `/clients/${clientId}/people`,
                    cta: 'People & Roles',
                    articleRef: 'TSC CC1.2'
                },
                {
                    id: 'soc2_m1_assets',
                    title: 'Inventory Production Cloud Infrastructure & Data Stores',
                    desc: 'Catalogue AWS/GCP/Azure resources, Kubernetes clusters, production databases, and classify customer data sensitivity.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'Asset Register',
                    articleRef: 'TSC CC6.1'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Technical Safeguards, CI/CD Gates & Automated Evidence Sync',
            clauseRef: 'CC6.1–CC6.8 (Logical Access), CC7.1–CC7.5 (Operations), CC8.1 (Change Mgmt)',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-100',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'soc2_m2_mfa',
                    title: 'Enforce SSO, MFA & Quarterly Access Reviews',
                    desc: 'Mandate hardware-token MFA across production environments and perform quarterly user access certification.',
                    link: `/clients/${clientId}/people`,
                    cta: 'Access Reviews',
                    articleRef: 'TSC CC6.2'
                },
                {
                    id: 'soc2_m2_change_mgmt',
                    title: 'Establish Formal Change Management SOP & CI/CD Deployment Gates',
                    desc: 'Enforce peer code review requirements, automated unit/integration test gates, segregation of duties between dev and prod, and change approval tickets.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'Change SOP',
                    articleRef: 'TSC CC8.1'
                },
                {
                    id: 'soc2_m2_evidence',
                    title: 'Connect Cloud Evidence Integrations & Automated Proof Sync',
                    desc: 'Integrate AWS, GitHub, Okta, and Google Workspace to continuously collect point-in-time configuration proof.',
                    link: `/clients/${clientId}/evidence`,
                    cta: 'Evidence Vault',
                    articleRef: 'TSC CC7.1'
                },
                {
                    id: 'soc2_m2_vulns',
                    title: 'Implement Automated SAST/DAST & Vulnerability SLAs',
                    desc: 'Integrate code scanning in CI/CD pipelines and enforce strict remediation windows (Critical <7d, High <14d).',
                    link: `/clients/${clientId}/risks/vulnerabilities`,
                    cta: 'Vulnerabilities',
                    articleRef: 'TSC CC7.1'
                },
                {
                    id: 'soc2_m2_vendor',
                    title: 'Execute Vendor Risk Assessments for In-Scope Subprocessors',
                    desc: 'Review SOC 2 Type II reports and security credentials for all Tier 1 third-party vendors handling customer data.',
                    link: `/clients/${clientId}/vendors`,
                    cta: 'Vendor Register',
                    articleRef: 'TSC CC9.2'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Disaster Recovery Drill, Pen Test & CPA Audit Clean Room',
            clauseRef: 'CC7.3 (Incident Response), A1.2 (Disaster Recovery), CC4.1 (Monitoring)',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'soc2_m3_drills',
                    title: 'Execute Business Continuity & Disaster Recovery Tabletop Drill',
                    desc: 'Simulate cloud region failover, test database restoration from air-gapped snapshots, and document RTO/RPO results.',
                    link: `/clients/${clientId}/business-continuity`,
                    cta: 'BCP Drills',
                    articleRef: 'TSC A1.2'
                },
                {
                    id: 'soc2_m3_incidents',
                    title: 'Run Incident Response Simulation & CSIRT Runbook Test',
                    desc: 'Conduct tabletop simulation of a credential breach or data spill, verifying alerting and escalation playbooks.',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Incident Center',
                    articleRef: 'TSC CC7.3'
                },
                {
                    id: 'soc2_m3_pentest',
                    title: 'Commission Independent Third-Party Penetration Test',
                    desc: 'Complete annual gray-box web application and external network penetration test, remediating any High/Critical findings.',
                    link: `/clients/${clientId}/compliance-journey`,
                    cta: 'Pen Test Review',
                    articleRef: 'TSC CC4.1'
                },
                {
                    id: 'soc2_m3_cpa',
                    title: 'Lock CPA Auditor Clean Room & Evidence Request List (RL)',
                    desc: 'Package population samples, policy approvals, access logs, and system description for the CPA auditor.',
                    link: `/clients/${clientId}/soc2/program-guide?tab=auditor`,
                    cta: 'Auditor Room',
                    articleRef: 'Type II Observation'
                }
            ]
        }
    ]
});

/**
 * HIPAA Security & Privacy Rule 90-Day Implementation Roadmap Spec
 */
export const getHipaaRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'hipaa',
    title: '90-Day HIPAA Compliance Implementation Roadmap',
    shortTitle: 'HIPAA 90-Day Roadmap',
    subtitle: '12-week operational schedule across the Security Rule (Administrative, Physical, Technical Safeguards), Privacy Rule, and Breach Notification.',
    frameworkBadge: 'HIPAA • 45 CFR Parts 160 & 164',
    color: 'cyan',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'ePHI Data Flow Scoping, Security Risk Analysis & Policy Baseline',
            clauseRef: '45 CFR §164.308(a)(1) (Security Management Process)',
            badgeColor: 'bg-cyan-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-100',
            textColor: 'text-cyan-700',
            tasks: [
                {
                    id: 'hipaa_m1_scoping',
                    title: 'Map Electronic Protected Health Information (ePHI) Flows',
                    desc: 'Identify where ePHI is created, received, maintained, or transmitted across applications, databases, and third-party vendors.',
                    link: `/clients/${clientId}/privacy/inventory`,
                    cta: 'Data Flow Map',
                    articleRef: '§164.308(a)(1)'
                },
                {
                    id: 'hipaa_m1_risk',
                    title: 'Conduct Comprehensive Security Risk Analysis (SRA)',
                    desc: 'Assess vulnerabilities and threats to the confidentiality, integrity, and availability of all held ePHI per NIST SP 800-30.',
                    link: `/clients/${clientId}/risks/assessments`,
                    cta: 'Risk Assessment',
                    articleRef: '§164.308(a)(1)(ii)(A)'
                },
                {
                    id: 'hipaa_m1_sra_doc',
                    title: 'Formalize Security Risk Analysis (SRA) Report & Remediation Plan',
                    desc: 'Compile comprehensive NIST SP 800-30 based risk analysis report identifying all technical, administrative, and physical vulnerabilities affecting ePHI.',
                    link: `/clients/${clientId}/risks/assessments`,
                    cta: 'SRA Documentation',
                    articleRef: '§164.308(a)(1)'
                },
                {
                    id: 'hipaa_m1_officers',
                    title: 'Designate Privacy & Security Officers & Governance Hierarchy',
                    desc: 'Formally assign statutory HIPAA Privacy and Security Officers with documented executive authority.',
                    link: `/clients/${clientId}/people`,
                    cta: 'Assign Officers',
                    articleRef: '§164.308(a)(2)'
                },
                {
                    id: 'hipaa_m1_policies',
                    title: 'Publish Core HIPAA Security & Privacy Policies',
                    desc: 'Enforce written statutory policies: Sanction Policy, Information System Activity Review, Minimum Necessary, Access Authorization, and Notice of Privacy Practices.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'HIPAA Policies',
                    articleRef: '§164.316'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Technical Safeguards, BAA Ledger & Workforce Training',
            clauseRef: '45 CFR §164.312 (Technical Safeguards), §164.502 (BAAs)',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'hipaa_m2_technical',
                    title: 'Enforce Technical Safeguards (AES-256 Encryption & TLS 1.3)',
                    desc: 'Ensure ePHI is encrypted in transit and at rest with strict unique user identification and automatic logoff controls.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'Technical Safeguards',
                    articleRef: '§164.312(a)–(e)'
                },
                {
                    id: 'hipaa_m2_baa',
                    title: 'Execute Business Associate Agreements (BAAs) with all Vendors',
                    desc: 'Audit all cloud hosting, email, EHR, and analytics vendors handling ePHI and verify countersigned BAAs.',
                    link: `/clients/${clientId}/vendors`,
                    cta: 'BAA Ledger',
                    articleRef: '§164.502(e)'
                },
                {
                    id: 'hipaa_m2_physical',
                    title: 'Document Physical Safeguards & Device Controls',
                    desc: 'Enforce workstation use policies, device media controls, hardware disposal logs, and mobile device encryption.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'Device Controls',
                    articleRef: '§164.310'
                },
                {
                    id: 'hipaa_m2_training',
                    title: 'Administer Mandatory Workforce HIPAA & Security Awareness Training',
                    desc: 'Train all staff on ePHI handling, password security, social engineering, and the corporate sanction policy.',
                    link: `/clients/${clientId}/training/management`,
                    cta: 'Training Management',
                    articleRef: '§164.308(a)(5)'
                },
                {
                    id: 'hipaa_m2_access_review',
                    title: 'Execute Information System Activity & Audit Trail Review Procedure',
                    desc: 'Implement formal procedures for regularly reviewing audit logs, access reports, and security incident tracking reports per §164.308(a)(1)(ii)(D).',
                    link: `/clients/${clientId}/evidence`,
                    cta: 'Audit Trail SOP',
                    articleRef: '§164.308(a)(1)'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Breach Notification Playbook, Contingency Plan & OCR Clean Room',
            clauseRef: '45 CFR §164.400–414 (Breach Notification), §164.308(a)(7) (Contingency)',
            badgeColor: 'bg-teal-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-teal-50/70',
            borderColor: 'border-teal-100',
            textColor: 'text-teal-700',
            tasks: [
                {
                    id: 'hipaa_m3_breach',
                    title: 'Validate 60-Day OCR Breach Notification Playbook',
                    desc: 'Establish 4-factor risk assessment protocol for breaches, individual notices (<60 days), and media announcements for >500 records.',
                    link: `/clients/${clientId}/cyber/incidents`,
                    cta: 'Breach Notification',
                    articleRef: '§164.404'
                },
                {
                    id: 'hipaa_m3_audit_trail',
                    title: 'Audit Trail Review & Tamper-Proof Activity Logging',
                    desc: 'Verify centralized log retention for ePHI access, unauthorized attempts, and administrative role modifications.',
                    link: `/clients/${clientId}/evidence`,
                    cta: 'Audit Logs',
                    articleRef: '§164.312(b)'
                },
                {
                    id: 'hipaa_m3_contingency',
                    title: 'Test Data Backup & Disaster Recovery Contingency Plan',
                    desc: 'Execute testing of emergency mode operation plans and verify rapid restoration of ePHI from immutable backups.',
                    link: `/clients/${clientId}/business-continuity`,
                    cta: 'Contingency Test',
                    articleRef: '§164.308(a)(7)'
                },
                {
                    id: 'hipaa_m3_ocr_cleanroom',
                    title: 'Assemble OCR Audit Clean Room & Compliance Binder',
                    desc: 'Package SRA reports, policy acknowledgment records, BAA repository, and incident drill documentation.',
                    link: `/clients/${clientId}/hipaa/program-guide?tab=auditor`,
                    cta: 'OCR Clean Room',
                    articleRef: 'OCR Protocol'
                }
            ]
        }
    ]
});

/**
 * Business Continuity & BIA 90-Day Implementation Roadmap Spec
 */
export const getBcpRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'bcp',
    title: '90-Day Business Continuity & Disaster Recovery Roadmap',
    shortTitle: 'BCP 90-Day Roadmap',
    subtitle: '12-week operational schedule across Business Impact Analysis (BIA), recovery strategies, call trees, and live simulation exercises.',
    frameworkBadge: 'ISO 22301:2019 • Business Continuity',
    color: 'emerald',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Business Impact Analysis (BIA), Critical Functions & RTO/RPO',
            clauseRef: 'ISO 22301 Clause 8.2.2 (BIA)',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'bcp_m1_bia',
                    title: 'Execute Business Impact Analysis (BIA) across Core Departments',
                    desc: 'Identify critical business activities, revenue impact per hour of downtime, and legal/regulatory compliance obligations.',
                    link: `/clients/${clientId}/business-continuity/processes`,
                    cta: 'BIA Matrix',
                    articleRef: 'Clause 8.2.2'
                },
                {
                    id: 'bcp_m1_rtorpo',
                    title: 'Establish Maximum Tolerable Period of Disruption (MTPD), RTO & RPO',
                    desc: 'Define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for all critical databases and software systems.',
                    link: `/clients/${clientId}/business-continuity/processes`,
                    cta: 'Set RTO/RPO',
                    articleRef: 'Clause 8.2.2'
                },
                {
                    id: 'bcp_m1_policy',
                    title: 'Author & Publish Business Continuity Policy & Governance Charter',
                    desc: 'Formulate organizational policy establishing executive BCP sponsorship, testing frequencies, crisis management roles, and departmental compliance duties per ISO 22301 Clause 5.2.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'BCP Policy',
                    articleRef: 'Clause 5.2'
                },
                {
                    id: 'bcp_m1_dependencies',
                    title: 'Map Interdependencies, Single Points of Failure & Cloud Infrastructure',
                    desc: 'Document single points of failure (SPOF) across single-zone cloud databases, critical SaaS tooling, and key personnel.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'SPOF Analysis',
                    articleRef: 'Clause 8.2.3'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Disaster Recovery Plans, Call Trees & Immutable Backups',
            clauseRef: 'ISO 22301 Clause 8.3–8.4 (Strategies & Plans)',
            badgeColor: 'bg-blue-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            tasks: [
                {
                    id: 'bcp_m2_strategies',
                    title: 'Formulate Business Continuity & Disaster Recovery Plans',
                    desc: 'Document step-by-step restoration procedures for cloud failover, facility denial, ransomware lockout, and supply outages.',
                    link: `/clients/${clientId}/business-continuity/plans`,
                    cta: 'Recovery Plans',
                    articleRef: 'Clause 8.4'
                },
                {
                    id: 'bcp_m2_calltrees',
                    title: 'Construct Crisis Communication Call Trees & Escalation Chains',
                    desc: 'Build incident command structures, primary/secondary notification paths, and emergency mass notification contact lists.',
                    link: `/clients/${clientId}/business-continuity/call-tree`,
                    cta: 'Call Trees',
                    articleRef: 'Clause 8.4.3'
                },
                {
                    id: 'bcp_m2_backups',
                    title: 'Validate Air-Gapped Immutable Backups & Replication Schedules',
                    desc: 'Ensure backup retention policies comply with RPO requirements and are protected against ransomware lateral tampering.',
                    link: `/clients/${clientId}/evidence`,
                    cta: 'Backup Proof',
                    articleRef: 'Clause 8.3'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Live Tabletop Exercise, After-Action Report (AAR) & Governance Sign-off',
            clauseRef: 'ISO 22301 Clause 8.5 (Exercise Programme), Clause 9.3 (Mgmt Review)',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-100',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'bcp_m3_tabletop',
                    title: 'Execute Annual Multi-Department Tabletop Simulation',
                    desc: 'Simulate unexpected cloud outage or ransomware crisis, testing decision-making velocity and failover coordination.',
                    link: `/clients/${clientId}/business-continuity/exercises`,
                    cta: 'Exercise Center',
                    articleRef: 'Clause 8.5'
                },
                {
                    id: 'bcp_m3_aar',
                    title: 'Publish After-Action Report (AAR) & Remediation Plan',
                    desc: 'Catalogue gaps discovered during exercises, assign engineering remediation owners, and update recovery procedures.',
                    link: `/clients/${clientId}/business-continuity/exercises`,
                    cta: 'AAR Reports',
                    articleRef: 'Clause 8.5'
                },
                {
                    id: 'bcp_m3_audit',
                    title: 'Executive Board BCP Presentation & Annual Policy Sign-off',
                    desc: 'Deliver continuity readiness briefing to Executive Leadership and secure Board approval for the upcoming cycle.',
                    link: `/clients/${clientId}/business-continuity/plans`,
                    cta: 'Board Sign-off',
                    articleRef: 'Clause 9.3'
                }
            ]
        }
    ]
});

/**
 * Third-Party Vendor Risk Management (TPRM) 90-Day Implementation Roadmap Spec
 */
export const getTprmRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'tprm',
    title: '90-Day Third-Party Risk Management (TPRM) Roadmap',
    shortTitle: 'TPRM 90-Day Roadmap',
    subtitle: '12-week operational schedule across vendor inventory, criticality tiering, security questionnaires, and continuous posture monitoring.',
    frameworkBadge: 'NIST SP 800-161 • Supply Chain Risk',
    color: 'amber',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Vendor Inventory, Procurement Gate & Criticality Tiering',
            clauseRef: 'NIST 800-161 §3.1 (Supplier Identification)',
            badgeColor: 'bg-amber-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-100',
            textColor: 'text-amber-700',
            tasks: [
                {
                    id: 'tprm_m1_inventory',
                    title: 'Build Comprehensive Vendor & Subprocessor Inventory',
                    desc: 'Catalogue all SaaS vendors, cloud providers, hardware suppliers, and outsourced service partners in a single register.',
                    link: `/clients/${clientId}/vendors`,
                    cta: 'Vendor Register',
                    articleRef: 'NIST §3.1'
                },
                {
                    id: 'tprm_m1_tiering',
                    title: 'Apply 4-Tier Criticality Classification Model',
                    desc: 'Score vendors based on data sensitivity, production network access, and business operational substitutability.',
                    link: `/clients/${clientId}/vendors/overview`,
                    cta: 'Tiering Matrix',
                    articleRef: 'NIST §3.2'
                },
                {
                    id: 'tprm_m1_policy',
                    title: 'Publish TPRM Policy & Mandatory Procurement Intake Gate',
                    desc: 'Mandate that no new software or cloud service can be expensed or deployed without pre-procurement security approval.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'TPRM Policy',
                    articleRef: 'Governance'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Due Diligence Assessments, Certifications & Contract Clauses',
            clauseRef: 'NIST 800-161 §3.3 (Due Diligence & Contracts)',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-100',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'tprm_m2_sig',
                    title: 'Dispatch Standardized Security Questionnaires (SIG / CAIQ)',
                    desc: 'Send automated security assessments to Tier 1 and Tier 2 vendors evaluating encryption, access controls, and backups.',
                    link: `/clients/${clientId}/vendors/templates`,
                    cta: 'Assessments',
                    articleRef: 'NIST §3.3'
                },
                {
                    id: 'tprm_m2_soc2_review',
                    title: 'Collect & Analyze Vendor SOC 2 Type II / ISO 27001 Certificates',
                    desc: 'Review vendor auditor opinions, user control considerations (UCCs), and carve-out exceptions in subservice providers.',
                    link: `/clients/${clientId}/vendors`,
                    cta: 'Audit Reports',
                    articleRef: 'Assurance'
                },
                {
                    id: 'tprm_m2_clauses',
                    title: 'Enforce Mandatory Security, DPA & 24-Hour Breach Clauses',
                    desc: 'Ensure supplier agreements mandate 24-hour security incident disclosure and audit rights.',
                    link: `/clients/${clientId}/vendors/contracts`,
                    cta: 'Contract Clauses',
                    articleRef: 'Legal Terms'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Residual Scoring, Continuous Attack Surface Monitoring & Offboarding',
            clauseRef: 'NIST 800-161 §3.4 (Monitoring & Termination)',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'tprm_m3_scoring',
                    title: 'Calculate Vendor Residual Risk Scores & Concentration Risk',
                    desc: 'Quantify cumulative exposure across key cloud providers and enforce compensating controls for high-risk partners.',
                    link: `/clients/${clientId}/vendors/overview`,
                    cta: 'Risk Matrix',
                    articleRef: 'Scoring'
                },
                {
                    id: 'tprm_m3_continuous',
                    title: 'Enable Continuous External Security Score Monitoring',
                    desc: 'Track automated vendor security posture changes, expired SSL certificates, and leaked domain credentials.',
                    link: `/clients/${clientId}/vendors`,
                    cta: 'Monitoring',
                    articleRef: 'Monitoring'
                },
                {
                    id: 'tprm_m3_offboarding',
                    title: 'Formalize Vendor Offboarding & Access Deprovisioning Protocol',
                    desc: 'Enforce immediate API token revocation, VPN credential termination, and data purge attestations upon vendor offboarding.',
                    link: `/clients/${clientId}/people`,
                    cta: 'Offboarding',
                    articleRef: 'Termination'
                }
            ]
        }
    ]
});

/**
 * Enterprise Risk Management (ERM) 90-Day Implementation Roadmap Spec
 */
export const getErmRoadmap = (clientId: number): FrameworkRoadmapSpec => ({
    id: 'erm',
    title: '90-Day Enterprise Risk Management (ERM) Roadmap',
    shortTitle: 'ERM 90-Day Roadmap',
    subtitle: '12-week operational schedule across risk context, asset-based threat modeling, FAIR quantitative analysis, and Board reporting.',
    frameworkBadge: 'ISO 31000 / ISO 27005 • Enterprise Risk',
    color: 'purple',
    months: [
        {
            month: 1,
            weeks: 'Weeks 1 to 4',
            title: 'Context, Risk Appetite Scales & Asset Valuation',
            clauseRef: 'ISO 31000 §5.3 / ISO 27005 Clause 5 (Context)',
            badgeColor: 'bg-purple-600 text-white',
            badgeText: 'Month 1 • Weeks 1 to 4',
            bgLight: 'bg-purple-50/70',
            borderColor: 'border-purple-100',
            textColor: 'text-purple-700',
            tasks: [
                {
                    id: 'erm_m1_context',
                    title: 'Define Corporate Risk Criteria, 5x5 Matrix & Risk Appetite',
                    desc: 'Formalize likelihood and impact definitions (Financial, Operational, Legal, Reputational) and set executive risk thresholds.',
                    link: `/clients/${clientId}/risks/framework`,
                    cta: 'Risk Context',
                    articleRef: 'ISO §5.3'
                },
                {
                    id: 'erm_m1_assets',
                    title: 'Catalogue Enterprise Assets & Classify Criticality',
                    desc: 'Map enterprise software systems, cloud databases, intellectual property, and key operational facilities.',
                    link: `/clients/${clientId}/risks/assets`,
                    cta: 'Asset Register',
                    articleRef: 'ISO §5.4'
                },
                {
                    id: 'erm_m1_taxonomy',
                    title: 'Establish Unified Enterprise Risk Taxonomy',
                    desc: 'Structure standardized risk categories: Cybersecurity, Operational, Regulatory Compliance, Third-Party, and Strategic.',
                    link: `/clients/${clientId}/risks/framework`,
                    cta: 'Taxonomy',
                    articleRef: 'Classification'
                },
                {
                    id: 'erm_m1_policy',
                    title: 'Author & Publish Enterprise Risk Management Policy',
                    desc: 'Formulate organizational policy establishing executive risk oversight, risk reporting cadences, escalation trigger levels, and line-of-defense governance per ISO 31000 §5.2.',
                    link: `/clients/${clientId}/policies`,
                    cta: 'ERM Policy',
                    articleRef: 'ISO 31000 §5.2'
                }
            ]
        },
        {
            month: 2,
            weeks: 'Weeks 5 to 8',
            title: 'Threat Scenario Modeling, Inherent Scoring & Treatment Plans (RTP)',
            clauseRef: 'ISO 31000 §5.4 / ISO 27005 Clause 6 (Risk Assessment & Treatment)',
            badgeColor: 'bg-indigo-600 text-white',
            badgeText: 'Month 2 • Weeks 5 to 8',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-100',
            textColor: 'text-indigo-700',
            tasks: [
                {
                    id: 'erm_m2_scenarios',
                    title: 'Conduct Asset-Based Threat Scenario Modeling',
                    desc: 'Identify plausible threat events (e.g. ransomware exfiltration, insider threat, cloud misconfiguration) across assets.',
                    link: `/clients/${clientId}/risks/threats`,
                    cta: 'Threat Scenarios',
                    articleRef: 'Clause 6.1'
                },
                {
                    id: 'erm_m2_assessment',
                    title: 'Score Inherent Risks & Perform FAIR Quantitative Analysis',
                    desc: 'Calculate inherent risk ratings (1-25) and model probable annualized loss expectancy (ALE) for top threat scenarios.',
                    link: `/clients/${clientId}/risks/register`,
                    cta: 'Risk Register',
                    articleRef: 'Clause 6.2'
                },
                {
                    id: 'erm_m2_treatment',
                    title: 'Formulate Risk Treatment Plans (RTP) & Assign Owners',
                    desc: 'Decide treatment options (Mitigate, Avoid, Transfer, Accept) and assign action items with target resolution dates.',
                    link: `/clients/${clientId}/risks/treatment-plan`,
                    cta: 'Treatment Plans',
                    articleRef: 'Clause 6.3'
                }
            ]
        },
        {
            month: 3,
            weeks: 'Weeks 9 to 12',
            title: 'Residual Scoring, Key Risk Indicators (KRIs) & Board Governance',
            clauseRef: 'ISO 31000 §5.6 / ISO 27005 Clause 7 (Monitoring & Review)',
            badgeColor: 'bg-emerald-600 text-white',
            badgeText: 'Month 3 • Weeks 9 to 12',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-100',
            textColor: 'text-emerald-700',
            tasks: [
                {
                    id: 'erm_m3_residual',
                    title: 'Compute Residual Risk Ratings Post-Control Implementation',
                    desc: 'Evaluate control effectiveness and verify that all residual risks sit within the approved corporate risk appetite boundary.',
                    link: `/clients/${clientId}/risks/register`,
                    cta: 'Residual Scores',
                    articleRef: 'Clause 7.1'
                },
                {
                    id: 'erm_m3_kri',
                    title: 'Deploy Automated Key Risk Indicators (KRIs) & Threshold Alerts',
                    desc: 'Configure early warning metrics (e.g. unpatched critical CVE count, employee phishing failure rate, BIA expiry).',
                    link: `/clients/${clientId}/risks/heatmap`,
                    cta: 'KRI Dashboard',
                    articleRef: 'Clause 7.2'
                },
                {
                    id: 'erm_m3_board',
                    title: 'Generate Executive Risk Heatmap & Board Governance Report',
                    desc: 'Produce executive PDF/dashboard briefing for the Board Audit & Risk Committee with quarter-over-quarter trendlines.',
                    link: `/clients/${clientId}/risks/report`,
                    cta: 'Executive Report',
                    articleRef: 'Governance'
                }
            ]
        }
    ]
});

