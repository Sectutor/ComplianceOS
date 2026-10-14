export interface StandardQuestion {
    id: string;
    text: string;
    type: 'yes_no' | 'text' | 'file_upload' | 'multiple_choice';
    required: boolean;
    standard: string;
    controlId: string;
    guidance: string;
    category?: string;
    tier?: 'critical' | 'standard' | 'physical_onprem';
    options?: string[];
    enabled?: boolean;
}

export interface StandardSection {
    title: string;
    description?: string;
    questions: StandardQuestion[];
}

export interface StandardTemplateDefinition {
    idKey: string;
    name: string;
    framework: string;
    description: string;
    sections: StandardSection[];
}

export const STANDARD_TEMPLATES: StandardTemplateDefinition[] = [
    {
        idKey: 'iso27001-2022',
        name: 'ISO/IEC 27001:2022 Comprehensive Supplier Security Evaluation',
        framework: 'ISO/IEC 27001:2022',
        description: 'Exhaustive third-party risk assessment mapped to ISO/IEC 27001:2022 Annex A controls (Organizational, People, Physical, and Technological). Customize by deselecting controls not applicable to your engagement.',
        sections: [
            {
                title: 'Organizational Governance & Supplier Management (Annex A.5)',
                description: 'Supplier governance, legal compliance, risk assessment, and supply chain controls.',
                questions: [
                    {
                        id: 'iso_5_1',
                        text: 'Are information security policies defined, formally approved by management, and reviewed at least annually?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.1',
                        tier: 'critical',
                        guidance: 'Provide executive summary or policy approval log dated within 12 months.'
                    },
                    {
                        id: 'iso_5_2',
                        text: 'Are information security roles and responsibilities clearly assigned and segregated to prevent unauthorized modifications?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.2',
                        tier: 'standard',
                        guidance: 'Confirm organizational security reporting structure.'
                    },
                    {
                        id: 'iso_5_4',
                        text: 'Does executive management actively review and enforce information security compliance across the enterprise?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.4',
                        tier: 'standard',
                        guidance: 'Confirm management review meeting minutes or audit charter.'
                    },
                    {
                        id: 'iso_5_8',
                        text: 'Do you maintain formal relationships with relevant authorities and cybersecurity special interest groups?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.8',
                        tier: 'standard',
                        guidance: 'List memberships (e.g. FS-ISAC, FIRST, Infragard, CISA alerts).'
                    },
                    {
                        id: 'iso_5_19',
                        text: 'Do you enforce a documented Information Security Policy for Supplier Relationships across all outsourced engagements?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.19',
                        tier: 'critical',
                        guidance: 'Provide supplier risk policy overview.'
                    },
                    {
                        id: 'iso_5_20',
                        text: 'Are information security requirements, SLA penalties, and confidentiality obligations addressed in all customer and vendor contracts?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.20',
                        tier: 'critical',
                        guidance: 'Confirm presence of mandatory cybersecurity terms in MSAs.'
                    },
                    {
                        id: 'iso_5_21',
                        text: 'Do you manage security risks across your own fourth-party / ICT supply chain with mandatory flow-down security clauses?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.21',
                        tier: 'critical',
                        guidance: 'Describe sub-processor assessment and monitoring cadence.'
                    },
                    {
                        id: 'iso_5_22',
                        text: 'Do you maintain formal security governance for cloud services used to host or process client workloads?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.22',
                        tier: 'critical',
                        guidance: 'Provide cloud shared responsibility matrix and list cloud hosting providers.'
                    },
                    {
                        id: 'iso_5_23',
                        text: 'Do you maintain information security readiness for business continuity and disaster recovery failover?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.23',
                        tier: 'critical',
                        guidance: 'Specify RTO and RPO targets.'
                    },
                    {
                        id: 'iso_5_24',
                        text: 'Do you have a tested Incident Management Plan that commits to notifying impacted clients within 48 to 72 hours of a confirmed breach?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.24',
                        tier: 'critical',
                        guidance: 'Attach Incident Response Plan overview and breach notification commitment.'
                    },
                    {
                        id: 'iso_5_29',
                        text: 'Is operational business continuity tested at least annually via tabletop simulations or live infrastructure failover exercises?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.29',
                        tier: 'standard',
                        guidance: 'Provide date of last DR exercise and summary of results.'
                    },
                    {
                        id: 'iso_5_30',
                        text: 'Are redundant computing facilities or multi-availability zone architectures implemented to meet uptime SLA requirements?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.5.30',
                        tier: 'critical',
                        guidance: 'Confirm multi-AZ or multi-region replication architecture.'
                    }
                ]
            },
            {
                title: 'People & Human Resource Security (Annex A.6)',
                description: 'Pre-employment screening, confidentiality agreements, and security awareness training.',
                questions: [
                    {
                        id: 'iso_6_1',
                        text: 'Are background checks (criminal history, identity, education) conducted for all personnel prior to gaining access to systems?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.6.1',
                        tier: 'critical',
                        guidance: 'Confirm background check policy and third-party screening provider.'
                    },
                    {
                        id: 'iso_6_2',
                        text: 'Are all employees and contractors required to sign legally binding Non-Disclosure Agreements (NDAs) prior to employment?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.6.2',
                        tier: 'standard',
                        guidance: 'Confirm NDA execution workflow.'
                    },
                    {
                        id: 'iso_6_3',
                        text: 'Do all workforce members complete mandatory security awareness and anti-phishing training upon hire and annually thereafter?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.6.3',
                        tier: 'standard',
                        guidance: 'Attach security training curriculum summary and annual completion rate.'
                    },
                    {
                        id: 'iso_6_4',
                        text: 'Is there a formal disciplinary process in place for handling employee security policy violations?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.6.4',
                        tier: 'standard',
                        guidance: 'Confirm HR disciplinary policy.'
                    },
                    {
                        id: 'iso_6_5',
                        text: 'Are all system access rights revoked within 24 hours upon employee termination or role change?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.6.5',
                        tier: 'critical',
                        guidance: 'Attach offboarding policy and automated de-provisioning evidence.'
                    }
                ]
            },
            {
                title: 'Physical & Environmental Security (Annex A.7)',
                description: 'Perimeter protection, equipment placement, and clear desk policy (can be excluded for pure remote SaaS).',
                questions: [
                    {
                        id: 'iso_7_1',
                        text: 'Are physical security perimeters (badged access, mantraps, security guards) implemented for all offices and datacenters?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.7.1',
                        tier: 'physical_onprem',
                        guidance: 'Provide datacenter physical security attestations (SOC 2 Type II or ISO certs).'
                    },
                    {
                        id: 'iso_7_2',
                        text: 'Are physical access logs to secure areas retained for at least 90 days and reviewed on a regular cadence?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.7.2',
                        tier: 'physical_onprem',
                        guidance: 'Confirm CCTV / badge log retention period.'
                    },
                    {
                        id: 'iso_7_4',
                        text: 'Are environmental safeguards (fire suppression, HVAC, backup generators) deployed to protect against service outages?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.7.4',
                        tier: 'physical_onprem',
                        guidance: 'Confirm datacenter power and environmental redundancy.'
                    },
                    {
                        id: 'iso_7_10',
                        text: 'Do you enforce a documented Clear Desk and Clear Screen policy for all work areas handling sensitive data?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.7.10',
                        tier: 'physical_onprem',
                        guidance: 'Provide clear desk policy excerpt.'
                    }
                ]
            },
            {
                title: 'Technological & Technical Controls (Annex A.8)',
                description: 'Access governance, encryption, network security, secure SDLC, vulnerability management, and penetration testing.',
                questions: [
                    {
                        id: 'iso_8_1',
                        text: 'Are all corporate user endpoints (laptops, mobile devices) managed via centralized MDM with disk encryption enforced?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.1',
                        tier: 'critical',
                        guidance: 'Confirm MDM tooling (Jamf, Intune) and BitLocker / FileVault enforcement.'
                    },
                    {
                        id: 'iso_8_2',
                        text: 'Is privileged administrative access dedicated, strictly segregated, and restricted based on the principle of least privilege?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.2',
                        tier: 'critical',
                        guidance: 'Confirm privileged access management (PAM) controls.'
                    },
                    {
                        id: 'iso_8_3',
                        text: 'Is access to applications and source code repositories restricted using role-based access control (RBAC)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.3',
                        tier: 'standard',
                        guidance: 'Detail user access approval and quarterly review workflows.'
                    },
                    {
                        id: 'iso_8_5',
                        text: 'Is Multi-Factor Authentication (MFA) strictly enforced for all administrative access, VPNs, cloud consoles, and production databases?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.5',
                        tier: 'critical',
                        guidance: 'Specify supported MFA factors (FIDO2, hardware keys, authenticator apps).'
                    },
                    {
                        id: 'iso_8_7',
                        text: 'Is automated Endpoint Detection and Response (EDR) or anti-malware deployed and updated continuously across all servers and endpoints?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.7',
                        tier: 'critical',
                        guidance: 'State EDR vendor (CrowdStrike, SentinelOne, Defender) and fleet coverage.'
                    },
                    {
                        id: 'iso_8_8',
                        text: 'Do you conduct monthly vulnerability scans and remediate Critical CVEs within 14 days and High CVEs within 30 days?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.8',
                        tier: 'critical',
                        guidance: 'Provide vulnerability management SLA policy and scanner tooling.'
                    },
                    {
                        id: 'iso_8_9',
                        text: 'Are baseline configurations and CIS benchmarks maintained and audited for all production servers and container clusters?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.9',
                        tier: 'standard',
                        guidance: 'Cite baseline standards used (CIS Benchmark, DISA STIG).'
                    },
                    {
                        id: 'iso_8_11',
                        text: 'Is customer data encrypted at rest across all databases, backups, and file storage systems using AES-256 or equivalent?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.11',
                        tier: 'critical',
                        guidance: 'Confirm key management practices (AWS KMS, Azure Key Vault, HashiCorp).'
                    },
                    {
                        id: 'iso_8_12',
                        text: 'Are data masking, tokenization, or DLP controls applied to sensitive customer datasets in non-production environments?',
                        type: 'yes_no',
                        required: false,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.12',
                        tier: 'standard',
                        guidance: 'Confirm that production data is never copied unmasked into dev/test.'
                    },
                    {
                        id: 'iso_8_15',
                        text: 'Are centralized audit logs retained for a minimum of 365 days and monitored 24/7 by a Security Operations Center (SOC) / SIEM?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.15',
                        tier: 'critical',
                        guidance: 'State SIEM tooling (Splunk, Datadog, SumoLogic) and active log retention.'
                    },
                    {
                        id: 'iso_8_20',
                        text: 'Are production networks segregated from internal office networks and test environments using firewalls and VPC security groups?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.20',
                        tier: 'critical',
                        guidance: 'Describe network architecture and perimeter segregation.'
                    },
                    {
                        id: 'iso_8_24',
                        text: 'Is customer data in transit encrypted using modern TLS (v1.2 or v1.3) with perfect forward secrecy across all public endpoints?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.24',
                        tier: 'critical',
                        guidance: 'Provide SSL Labs report or cipher suite configuration summary.'
                    },
                    {
                        id: 'iso_8_25',
                        text: 'Do you enforce a documented Secure Software Development Lifecycle (SSDLC) including automated SAST/DAST code analysis?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.25',
                        tier: 'critical',
                        guidance: 'Detail code security scanning tooling (Snyk, SonarQube, GitHub Advanced Security).'
                    },
                    {
                        id: 'iso_8_28',
                        text: 'Do all production releases require documented peer code review, automated testing, and management approval prior to merge?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.28',
                        tier: 'standard',
                        guidance: 'Confirm segregation of duties between developers and production deployers.'
                    },
                    {
                        id: 'iso_8_32',
                        text: 'Do you conduct annual independent third-party penetration testing of external perimeter, APIs, and web applications?',
                        type: 'file_upload',
                        required: true,
                        standard: 'ISO/IEC 27001:2022',
                        controlId: 'A.8.32',
                        tier: 'critical',
                        guidance: 'Upload the Executive Summary / Attestation letter of your most recent penetration test.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'cis-controls-v8',
        name: 'CIS Critical Security Controls v8 Comprehensive Assessment',
        framework: 'CIS Controls v8',
        description: 'Exhaustive assessment aligned with Center for Internet Security (CIS) Controls v8 Safeguards across all 18 Control Families, highlighting Control 15 (Service Provider Management).',
        sections: [
            {
                title: 'CIS Control 15: Service Provider Management',
                description: 'Identification, evaluation, contract terms, and continuous monitoring of third-party service providers.',
                questions: [
                    {
                        id: 'cis_15_1',
                        text: 'Do you maintain an active, centralized inventory of all third-party service providers and sub-processors with classification of data processed?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.1',
                        tier: 'critical',
                        guidance: 'Ensure all sub-processors handling customer data are cataloged.'
                    },
                    {
                        id: 'cis_15_2',
                        text: 'Do you execute a formal Service Provider Management Policy establishing baseline security vetting criteria?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.2',
                        tier: 'critical',
                        guidance: 'Provide policy statement covering partner vetting and contractual terms.'
                    },
                    {
                        id: 'cis_15_3',
                        text: 'Do all service provider contracts include explicit terms for data protection, independent audit rights, and prompt breach notification?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.3',
                        tier: 'critical',
                        guidance: 'Confirm mandatory security clauses in vendor MSAs and DPAs.'
                    },
                    {
                        id: 'cis_15_4',
                        text: 'Do you perform annual security assessments and review compliance attestations (SOC 2, ISO 27001) for all critical vendors?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.4',
                        tier: 'critical',
                        guidance: 'Describe cadence for reviewing vendor security certifications.'
                    },
                    {
                        id: 'cis_15_5',
                        text: 'Do you actively monitor third-party vulnerabilities and threats impacting dependencies and services in your architecture?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.5',
                        tier: 'standard',
                        guidance: 'Detail Software Bill of Materials (SBOM) or third-party monitoring tooling.'
                    },
                    {
                        id: 'cis_15_6',
                        text: 'Do you maintain secure decommissioning and automated offboarding procedures when terminating relationships with service providers?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.6',
                        tier: 'standard',
                        guidance: 'Confirm verification of data destruction certificates upon contract termination.'
                    },
                    {
                        id: 'cis_15_7',
                        text: 'Do you verify that service providers securely sanitize or return all proprietary client data within 30 days of termination?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 15.7',
                        tier: 'critical',
                        guidance: 'Attach standard certificate of data destruction template.'
                    }
                ]
            },
            {
                title: 'CIS Controls 5 & 6: Account Management & Access Control',
                description: 'Credential governance, administrative segregation, and multi-factor authentication.',
                questions: [
                    {
                        id: 'cis_5_1',
                        text: 'Do you maintain an accurate inventory of all enterprise and cloud accounts with centralized identity provisioning?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 5.1',
                        tier: 'critical',
                        guidance: 'Provide identity provider details (Okta, Azure AD, Google Workspace).'
                    },
                    {
                        id: 'cis_5_2',
                        text: 'Are default vendor passwords and credentials changed before deployment on any production hardware or software?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 5.2',
                        tier: 'critical',
                        guidance: 'Confirm baseline password policy.'
                    },
                    {
                        id: 'cis_5_3',
                        text: 'Are inactive user and service accounts disabled automatically after 45 days of non-use?',
                        type: 'yes_no',
                        required: false,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 5.3',
                        tier: 'standard',
                        guidance: 'Confirm account dormancy policy.'
                    },
                    {
                        id: 'cis_6_1',
                        text: 'Is Multi-Factor Authentication (MFA) established for all enterprise accounts, administrative consoles, and remote VPNs?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 6.1',
                        tier: 'critical',
                        guidance: 'Provide MFA enforcement configuration attestation.'
                    },
                    {
                        id: 'cis_6_2',
                        text: 'Are privileged administrative credentials dedicated and strictly segregated from general business user accounts?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 6.2',
                        tier: 'critical',
                        guidance: 'Confirm administrators do not use privileged accounts for standard email/browsing.'
                    },
                    {
                        id: 'cis_6_3',
                        text: 'Is access to customer repositories, cloud storage, and databases granted strictly upon role-based least privilege?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 6.3',
                        tier: 'critical',
                        guidance: 'Provide RBAC approval workflow.'
                    },
                    {
                        id: 'cis_6_5',
                        text: 'Do you conduct centralized quarterly reviews of all access permissions and revoke unneeded privileges promptly?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 6.5',
                        tier: 'standard',
                        guidance: 'Provide sample quarterly access review certification.'
                    }
                ]
            },
            {
                title: 'CIS Control 3: Data Protection & Cryptography',
                description: 'Classification, access control lists, retention, and encryption safeguards.',
                questions: [
                    {
                        id: 'cis_3_1',
                        text: 'Do you maintain an active Data Management & Classification Policy with explicit handling standards for sensitive client data?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 3.1',
                        tier: 'standard',
                        guidance: 'Attach data classification tier definitions.'
                    },
                    {
                        id: 'cis_3_3',
                        text: 'Do you configure data access control lists (ACLs) to enforce need-to-know access across all customer repositories?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 3.3',
                        tier: 'critical',
                        guidance: 'Confirm access permission enforcement mechanism.'
                    },
                    {
                        id: 'cis_3_4',
                        text: 'Do you enforce automated data retention rules and execute NIST 800-88 compliant secure disposal upon lifecycle completion?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 3.4',
                        tier: 'standard',
                        guidance: 'Confirm data retention schedules.'
                    },
                    {
                        id: 'cis_3_10',
                        text: 'Is customer data encrypted in transit using modern TLS 1.2+ across all external and internal microservice communications?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 3.10',
                        tier: 'critical',
                        guidance: 'Provide SSL Labs report or TLS cipher configuration.'
                    },
                    {
                        id: 'cis_3_11',
                        text: 'Is customer data encrypted at rest across all databases, object stores, and backups using industry-standard algorithms (AES-256)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 3.11',
                        tier: 'critical',
                        guidance: 'Confirm key management practices.'
                    }
                ]
            },
            {
                title: 'CIS Controls 4, 7 & 10: Configuration, Vulnerability & Malware Defenses',
                description: 'Secure baselines, vulnerability remediation SLAs, and automated endpoint detection.',
                questions: [
                    {
                        id: 'cis_4_1',
                        text: 'Do you maintain hardened baseline configurations (e.g., CIS Benchmarks Level 1/2) for all operating systems and cloud instances?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 4.1',
                        tier: 'standard',
                        guidance: 'Cite baseline benchmark standard used.'
                    },
                    {
                        id: 'cis_7_1',
                        text: 'Do you run an automated vulnerability management program with monthly scans across all external and internal assets?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 7.1',
                        tier: 'critical',
                        guidance: 'State scanner tooling (Qualys, Nessus, Rapid7, AWS Inspector).'
                    },
                    {
                        id: 'cis_7_4',
                        text: 'Are Critical security patches deployed within 14 calendar days and High severity vulnerabilities remediated within 30 days?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 7.4',
                        tier: 'critical',
                        guidance: 'Confirm remediation SLA policies.'
                    },
                    {
                        id: 'cis_10_1',
                        text: 'Is automated Endpoint Detection and Response (EDR) or anti-malware deployed across all servers and endpoints?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 10.1',
                        tier: 'critical',
                        guidance: 'Provide EDR tooling vendor and coverage percentage.'
                    },
                    {
                        id: 'cis_10_2',
                        text: 'Are anti-malware and EDR signature definitions updated automatically at least once daily?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 10.2',
                        tier: 'standard',
                        guidance: 'Confirm automatic update mechanisms.'
                    }
                ]
            },
            {
                title: 'CIS Controls 8, 11 & 17: Audit Logs, Backups & Incident Response',
                description: 'Logging infrastructure, immutable backups, and breach notification.',
                questions: [
                    {
                        id: 'cis_8_2',
                        text: 'Are audit logs generated for all user authentication events, privilege escalations, and database modifications?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 8.2',
                        tier: 'critical',
                        guidance: 'Detail logged event categories.'
                    },
                    {
                        id: 'cis_8_5',
                        text: 'Are audit logs shipped to a centralized, tamper-resistant log management system and retained for at least 1 year?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 8.5',
                        tier: 'critical',
                        guidance: 'Confirm log retention and write-once immutability.'
                    },
                    {
                        id: 'cis_11_1',
                        text: 'Do you perform regular automated backups of customer data and maintain off-site or cross-region immutable copies?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 11.1',
                        tier: 'critical',
                        guidance: 'Confirm backup frequency and replication strategy.'
                    },
                    {
                        id: 'cis_11_2',
                        text: 'Do you test backup data restoration at least semi-annually to ensure operational recoverability?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 11.2',
                        tier: 'standard',
                        guidance: 'Provide date of last successful restoration drill.'
                    },
                    {
                        id: 'cis_17_1',
                        text: 'Do you maintain an active Incident Response Plan with designated personnel, communication playbooks, and 24/7 escalation?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 17.1',
                        tier: 'critical',
                        guidance: 'Include incident escalation path and 24/7 security contact.'
                    },
                    {
                        id: 'cis_18_1',
                        text: 'Do you undergo annual independent third-party penetration testing of your external attack surface?',
                        type: 'file_upload',
                        required: true,
                        standard: 'CIS Controls v8',
                        controlId: 'CIS 18.1',
                        tier: 'critical',
                        guidance: 'Attach penetration test attestation letter.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'csa-caiq-v4',
        name: 'CSA CAIQ v4 Comprehensive Cloud Assessment',
        framework: 'CSA CAIQ v4',
        description: 'Exhaustive Cloud Security Alliance Consensus Assessments Initiative Questionnaire v4 mapped across all major Cloud Controls Matrix (CCM) domains.',
        sections: [
            {
                title: 'Application & Interface Security (AIS)',
                description: 'Cloud API security, microservice boundaries, and secure development pipelines.',
                questions: [
                    {
                        id: 'caiq_ais_01',
                        text: 'Do you perform automated Static (SAST) and Dynamic (DAST) application security testing during your software development lifecycle?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-AIS-01',
                        tier: 'critical',
                        guidance: 'Detail code scanning tooling and gating rules for production release.'
                    },
                    {
                        id: 'caiq_ais_02',
                        text: 'Are public application programming interfaces (APIs) protected against unauthorized calls via rate limiting, OAuth 2.0, and Web Application Firewalls (WAF)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-AIS-02',
                        tier: 'critical',
                        guidance: 'Confirm WAF and API gateway deployment.'
                    },
                    {
                        id: 'caiq_ais_03',
                        text: 'Are open-source software libraries and third-party dependencies continuously monitored for vulnerabilities (SCA)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-AIS-03',
                        tier: 'standard',
                        guidance: 'State Software Composition Analysis (SCA) tooling.'
                    }
                ]
            },
            {
                title: 'Identity & Access Management (IAM)',
                description: 'User access governance, federation, privileged access, and tenant isolation.',
                questions: [
                    {
                        id: 'caiq_iam_01',
                        text: 'Do you enforce strong identity federation (SAML 2.0 / OIDC) and Multi-Factor Authentication for cloud console and tenant administration?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-IAM-01',
                        tier: 'critical',
                        guidance: 'Provide IdP provider details (Okta, Azure AD, Ping).'
                    },
                    {
                        id: 'caiq_iam_02',
                        text: 'Is strict multi-tenant isolation enforced at the compute, network, and database layers so no customer data is co-mingled or accessible across tenants?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-IAM-02',
                        tier: 'critical',
                        guidance: 'Describe logical and physical isolation architecture.'
                    },
                    {
                        id: 'caiq_iam_03',
                        text: 'Are service accounts, API keys, and machine identities rotated at least every 90 days and stored in secure secret vaults?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-IAM-03',
                        tier: 'standard',
                        guidance: 'Confirm secret management tooling (Vault, Secrets Manager).'
                    }
                ]
            },
            {
                title: 'Cryptography, Encryption & Key Management (CRY)',
                description: 'Key lifecycle, Hardware Security Modules (HSM), and customer-managed keys.',
                questions: [
                    {
                        id: 'caiq_cry_01',
                        text: 'Does your service support Bring Your Own Key (BYOK) or customer-managed encryption keys for data at rest?',
                        type: 'yes_no',
                        required: false,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-CRY-01',
                        tier: 'standard',
                        guidance: 'Confirm KMS integration options.'
                    },
                    {
                        id: 'caiq_cry_02',
                        text: 'Are cryptographic keys rotated at least annually, and managed strictly within FIPS 140-2/3 Level 2+ Hardware Security Modules (HSM)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-CRY-02',
                        tier: 'critical',
                        guidance: 'Provide key management lifecycle policy documentation.'
                    },
                    {
                        id: 'caiq_cry_03',
                        text: 'Are deprecated cryptographic ciphers (TLS 1.0, 1.1, RC4, 3DES, SHA-1) disabled across all ingress gateways?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-CRY-03',
                        tier: 'critical',
                        guidance: 'Confirm cipher suites supported.'
                    }
                ]
            },
            {
                title: 'Data Security, Privacy & Lifecycle (DSP)',
                description: 'Data classification, residency, export capabilities, and deletion guarantees.',
                questions: [
                    {
                        id: 'caiq_dsp_01',
                        text: 'Can customers designate and restrict geographic data residency regions where their data is stored and processed?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-DSP-01',
                        tier: 'critical',
                        guidance: 'List supported hosting regions (e.g., US, EU, UK, APAC).'
                    },
                    {
                        id: 'caiq_dsp_02',
                        text: 'Do you allow complete data export in standard open formats (JSON, CSV, SQL dump) upon customer request?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-DSP-02',
                        tier: 'standard',
                        guidance: 'Confirm data portability and exit workflows.'
                    },
                    {
                        id: 'caiq_dsp_03',
                        text: 'Do you guarantee permanent cryptographic erasure of customer data from active databases and backups within 30 days of contract termination?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-DSP-03',
                        tier: 'critical',
                        guidance: 'Provide certificate of destruction workflow.'
                    }
                ]
            },
            {
                title: 'Business Continuity, Disaster Recovery & Resilience (BCR)',
                description: 'Service uptime, cross-region replication, and failover validation.',
                questions: [
                    {
                        id: 'caiq_bcr_01',
                        text: 'Are customer databases and storage volumes replicated across multiple independent availability zones or regions?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-BCR-01',
                        tier: 'critical',
                        guidance: 'Specify RTO and RPO targets.'
                    },
                    {
                        id: 'caiq_bcr_02',
                        text: 'Do you conduct and document full-scale disaster recovery failover exercises at least once every 12 months?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-BCR-02',
                        tier: 'standard',
                        guidance: 'Attach most recent DR drill test summary or executive report.'
                    }
                ]
            },
            {
                title: 'Threat & Vulnerability Management (TVM)',
                description: 'Perimeter scanning, patch management, and intrusion prevention.',
                questions: [
                    {
                        id: 'caiq_tvm_01',
                        text: 'Do you perform continuous vulnerability scanning across all containers, virtual machines, and cloud storage buckets?',
                        type: 'yes_no',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-TVM-01',
                        tier: 'critical',
                        guidance: 'Provide scanning cadence and remediation windows.'
                    },
                    {
                        id: 'caiq_tvm_02',
                        text: 'Do you maintain a Bug Bounty Program or formal Vulnerability Disclosure Policy (VDP) with a security.txt contact?',
                        type: 'yes_no',
                        required: false,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-TVM-02',
                        tier: 'standard',
                        guidance: 'Provide link to public bug bounty or VDP page.'
                    }
                ]
            },
            {
                title: 'Third-Party Attestations & Certifications',
                description: 'Independent audit reports and compliance attestations.',
                questions: [
                    {
                        id: 'caiq_attest_01',
                        text: 'Please upload your latest SOC 2 Type II Report, ISO 27001 Certificate, or CSA STAR Level 1/2 Registry Attestation.',
                        type: 'file_upload',
                        required: true,
                        standard: 'CSA CAIQ v4',
                        controlId: 'CCM-STA-01',
                        tier: 'critical',
                        guidance: 'Audit report must cover period within the preceding 12 months.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'soc2-type2',
        name: 'SOC 2 Type II Comprehensive Vendor Trust Review',
        framework: 'SOC 2 Type II',
        description: 'Rigorous vendor evaluation based on AICPA Trust Services Criteria (Security, Availability, Confidentiality, and Processing Integrity).',
        sections: [
            {
                title: 'Common Criteria: Logical Access & Network Boundaries',
                description: 'Trust Services Criteria CC6.1 - CC6.8 access security controls.',
                questions: [
                    {
                        id: 'soc2_cc6_1',
                        text: 'Does the organization restrict logical access to customer systems through unique user credentials, MFA, and role-based permissions?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.1',
                        tier: 'critical',
                        guidance: 'Reference SOC 2 section covering logical access controls.'
                    },
                    {
                        id: 'soc2_cc6_2',
                        text: 'Are new user registrations and access permissions authorized by resource owners prior to credential provisioning?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.2',
                        tier: 'standard',
                        guidance: 'Provide access approval audit evidence.'
                    },
                    {
                        id: 'soc2_cc6_3',
                        text: 'Are access permissions revoked within 24 hours of employee departure or immediate role transfer?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.3',
                        tier: 'critical',
                        guidance: 'Attach offboarding ticket samples.'
                    },
                    {
                        id: 'soc2_cc6_6',
                        text: 'Are perimeter boundary defenses (firewalls, VPC security groups, intrusion prevention) implemented to prevent unauthorized network entry?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.6',
                        tier: 'critical',
                        guidance: 'Confirm segmentation of production and non-production network segments.'
                    },
                    {
                        id: 'soc2_cc6_7',
                        text: 'Is data transmitted across public networks encrypted using TLS 1.2 or higher with approved cipher suites?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.7',
                        tier: 'critical',
                        guidance: 'Verify transmission encryption settings.'
                    },
                    {
                        id: 'soc2_cc6_8',
                        text: 'Are endpoint detection and malicious code protections deployed and updated automatically across all infrastructure?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC6.8',
                        tier: 'critical',
                        guidance: 'Provide confirmation of anti-malware and host-based intrusion detection.'
                    }
                ]
            },
            {
                title: 'System Operations & Change Management',
                description: 'Trust Services Criteria CC7.1 - CC8.1 operational controls.',
                questions: [
                    {
                        id: 'soc2_cc7_1',
                        text: 'Does the organization maintain continuous infrastructure monitoring and logging with centralized SIEM alert triage?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC7.1',
                        tier: 'critical',
                        guidance: 'Confirm log retention period (minimum 90 days active, 1 year archive).'
                    },
                    {
                        id: 'soc2_cc7_2',
                        text: 'Does the organization monitor for vulnerabilities and execute timely remediation within established SLA windows?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC7.2',
                        tier: 'critical',
                        guidance: 'Provide vulnerability management policy.'
                    },
                    {
                        id: 'soc2_cc8_1',
                        text: 'Do all software and infrastructure changes require documented peer review, automated testing, and formal management approval prior to production release?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'CC8.1',
                        tier: 'critical',
                        guidance: 'Detail change control board (CCB) process and segregation of duties.'
                    }
                ]
            },
            {
                title: 'Availability & Confidentiality Commitments',
                description: 'Trust Services Criteria A1.1 - C1.2 commitments.',
                questions: [
                    {
                        id: 'soc2_a1_1',
                        text: 'Does your service commit to minimum uptime SLAs (e.g., 99.9%+) and maintain real-time public/authenticated status pages?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'A1.1',
                        tier: 'standard',
                        guidance: 'Provide public status page link or SLA terms.'
                    },
                    {
                        id: 'soc2_a1_2',
                        text: 'Are automated backups executed daily with automated integrity validation and encrypted off-site replication?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'A1.2',
                        tier: 'critical',
                        guidance: 'Confirm backup restoration cadence.'
                    },
                    {
                        id: 'soc2_c1_1',
                        text: 'Does the organization enforce secure data disposal procedures (NIST 800-88 compliant) upon termination of services or customer request?',
                        type: 'yes_no',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'C1.1',
                        tier: 'critical',
                        guidance: 'Confirm certificate of destruction workflow.'
                    },
                    {
                        id: 'soc2_report',
                        text: 'Please upload your latest SOC 2 Type II Audit Report with clean opinion (unmodified auditor opinion).',
                        type: 'file_upload',
                        required: true,
                        standard: 'SOC 2 Type II',
                        controlId: 'Audit Attestation',
                        tier: 'critical',
                        guidance: 'Upload complete auditor report including Service Organization Description and testing matrix.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'ai-governance',
        name: 'AI & Generative LLM Vendor Security & Governance',
        framework: 'ISO/IEC 42001 & NIST AI RMF',
        description: 'Comprehensive risk evaluation for AI/LLM technology vendors covering model training, customer data boundaries, prompt injection, output guardrails, and IP indemnity.',
        sections: [
            {
                title: 'Model Training & Customer Data Boundaries',
                description: 'Verification that proprietary client prompts and datasets are never used to train public or foundation models.',
                questions: [
                    {
                        id: 'ai_train_01',
                        text: 'Do you guarantee contractually that customer prompts, inputs, and generated outputs will NOT be used to train, fine-tune, or improve your foundation models?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 42001',
                        controlId: 'A.6.2.2',
                        tier: 'critical',
                        guidance: 'Attach terms of service or enterprise DPA excerpt with explicit zero-training commitment.'
                    },
                    {
                        id: 'ai_train_02',
                        text: 'What is your maximum retention period for cached customer prompts, embeddings, and context windows before permanent deletion?',
                        type: 'text',
                        required: true,
                        standard: 'NIST AI RMF',
                        controlId: 'GOVERN-1.2',
                        tier: 'critical',
                        guidance: 'Specify zero-retention / 30-day abuse monitoring terms.'
                    },
                    {
                        id: 'ai_train_03',
                        text: 'Are customer embeddings and fine-tuned adapter weights stored in physically or cryptographically isolated tenant namespaces?',
                        type: 'yes_no',
                        required: true,
                        standard: 'ISO/IEC 42001',
                        controlId: 'A.8.4',
                        tier: 'critical',
                        guidance: 'Provide vector database tenancy and key encryption details.'
                    }
                ]
            },
            {
                title: 'Model Security, Guardrails & Adversarial Defenses',
                description: 'Protections against prompt injection, jailbreaks, data poisoning, and unsafe generations.',
                questions: [
                    {
                        id: 'ai_sec_01',
                        text: 'Do you deploy automated prompt injection filtering, jailbreak detection, and output moderation guardrails on your AI endpoints?',
                        type: 'yes_no',
                        required: true,
                        standard: 'OWASP Top 10 LLM',
                        controlId: 'LLM01:2025',
                        tier: 'critical',
                        guidance: 'Detail input/output sanitization and guardrail architecture.'
                    },
                    {
                        id: 'ai_sec_02',
                        text: 'Do you perform regular adversarial red teaming specifically targeting your AI models and RAG data retrieval pipelines?',
                        type: 'file_upload',
                        required: true,
                        standard: 'NIST AI RMF',
                        controlId: 'MEASURE-2.5',
                        tier: 'critical',
                        guidance: 'Upload third-party AI red teaming executive summary or attestation.'
                    },
                    {
                        id: 'ai_sec_03',
                        text: 'Do you enforce rate-limiting, token-consumption caps, and DDoS defenses to prevent automated resource exhaustion against model APIs?',
                        type: 'yes_no',
                        required: true,
                        standard: 'OWASP Top 10 LLM',
                        controlId: 'LLM04:2025',
                        tier: 'standard',
                        guidance: 'Detail API throttling and token quotas.'
                    }
                ]
            },
            {
                title: 'Copyright, Intellectual Property & Legal Liability',
                description: 'Legal protections, training dataset provenance, and indemnification.',
                questions: [
                    {
                        id: 'ai_legal_01',
                        text: 'Does your enterprise contract include copyright infringement indemnification for outputs generated by your models?',
                        type: 'yes_no',
                        required: true,
                        standard: 'AI Governance',
                        controlId: 'IP-INDEM-01',
                        tier: 'critical',
                        guidance: 'Reference IP defense and uncapped indemnification clauses.'
                    },
                    {
                        id: 'ai_legal_02',
                        text: 'Do you maintain formal policies ensuring compliance with the European Union Artificial Intelligence Act (EU AI Act)?',
                        type: 'yes_no',
                        required: false,
                        standard: 'EU AI Act',
                        controlId: 'REG-AI-01',
                        tier: 'standard',
                        guidance: 'Specify system risk tier classification under EU AI Act.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'hipaa-security',
        name: 'HIPAA & HITECH Healthcare Business Associate (BAA) Assessment',
        framework: 'HIPAA Security Rule',
        description: 'Comprehensive evaluation for third-party vendors handling Protected Health Information (PHI) under HIPAA Administrative, Physical, and Technical safeguards.',
        sections: [
            {
                title: 'Administrative Safeguards & BAA Execution',
                description: 'Formal agreements and workforce security governance for healthcare data.',
                questions: [
                    {
                        id: 'hipaa_baa_01',
                        text: 'Will your organization execute a standard Business Associate Agreement (BAA) without material reservations?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.502(e)',
                        tier: 'critical',
                        guidance: 'Provide copy of standard enterprise BAA.'
                    },
                    {
                        id: 'hipaa_adm_01',
                        text: 'Do all workforce members receiving access to PHI undergo mandatory annual HIPAA privacy and security awareness training?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.308(a)(5)',
                        tier: 'critical',
                        guidance: 'Provide training syllabus and completion tracking proof.'
                    },
                    {
                        id: 'hipaa_adm_02',
                        text: 'Do you have a designated Chief Information Security Officer (CISO) and HIPAA Privacy/Security Officer responsible for compliance?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.308(a)(2)',
                        tier: 'standard',
                        guidance: 'Provide contact details of designated Privacy Officer.'
                    }
                ]
            },
            {
                title: 'Technical Safeguards & PHI Encryption',
                description: 'Access controls, audit logging, and encryption for ePHI.',
                questions: [
                    {
                        id: 'hipaa_tech_01',
                        text: 'Is electronic Protected Health Information (ePHI) encrypted in transit and at rest using FIPS 140-2 validated cryptographic modules?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.312(a)(2)(iv)',
                        tier: 'critical',
                        guidance: 'Confirm cipher suites and certificate authorities.'
                    },
                    {
                        id: 'hipaa_tech_02',
                        text: 'Do you maintain tamper-evident audit logs of all access, modifications, and deletions of electronic PHI records for at least 6 years?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.312(b)',
                        tier: 'critical',
                        guidance: 'Detail SIEM centralized logging and immutable retention policies.'
                    },
                    {
                        id: 'hipaa_tech_03',
                        text: 'Do all systems processing ePHI enforce automatic session logouts after a maximum of 15 minutes of inactivity?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HIPAA',
                        controlId: '45 CFR § 164.312(a)(2)(iii)',
                        tier: 'standard',
                        guidance: 'Confirm timeout configuration.'
                    }
                ]
            },
            {
                title: 'Breach Notification & Incident Response',
                description: 'Breach reporting procedures mandated under the HITECH Act.',
                questions: [
                    {
                        id: 'hipaa_breach_01',
                        text: 'Do you contractually commit to notifying Covered Entities of any suspected or confirmed breach of unsecured PHI within 5 business days or less?',
                        type: 'yes_no',
                        required: true,
                        standard: 'HITECH',
                        controlId: '45 CFR § 164.410',
                        tier: 'critical',
                        guidance: 'Verify timeline in incident response policy and BAA.'
                    }
                ]
            }
        ]
    },
    {
        idKey: 'gdpr-privacy',
        name: 'GDPR Privacy & Cross-Border Data Processing (DPA) Review',
        framework: 'GDPR / EU 2016/679',
        description: 'Data privacy due diligence for external processors handling EU personal data under Article 28 and Chapter V International Data Transfers.',
        sections: [
            {
                title: 'Processor Obligations & Article 28 Mandatory Terms',
                description: 'Contractual terms required by Article 28 of the GDPR.',
                questions: [
                    {
                        id: 'gdpr_art28_01',
                        text: 'Does your organization process personal data strictly upon documented instructions from the controller, as required by GDPR Article 28(3)(a)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'GDPR',
                        controlId: 'Article 28(3)(a)',
                        tier: 'critical',
                        guidance: 'Provide standard Data Processing Addendum (DPA).'
                    },
                    {
                        id: 'gdpr_subproc_01',
                        text: 'Do you provide at least 30 days prior written notice before onboarding any new sub-processors, granting the customer the right to object?',
                        type: 'yes_no',
                        required: true,
                        standard: 'GDPR',
                        controlId: 'Article 28(4)',
                        tier: 'critical',
                        guidance: 'Provide link to public sub-processor notification registry or RSS feed.'
                    }
                ]
            },
            {
                title: 'International Transfers & EU SCCs',
                description: 'Safeguards for data transfers outside the European Economic Area.',
                questions: [
                    {
                        id: 'gdpr_transfer_01',
                        text: 'For data transferred outside the EEA, do you execute the 2021 European Commission Standard Contractual Clauses (SCCs) and complete a Transfer Impact Assessment (TIA)?',
                        type: 'yes_no',
                        required: true,
                        standard: 'GDPR',
                        controlId: 'Article 46 & Chapter V',
                        tier: 'critical',
                        guidance: 'Provide TIA template or executive summary.'
                    }
                ]
            },
            {
                title: 'Data Subject Rights & Breach Notification',
                description: 'Handling DSAR requests and 72-hour breach obligations.',
                questions: [
                    {
                        id: 'gdpr_dsar_01',
                        text: 'Do you provide technical capabilities or self-serve APIs to assist customers in fulfilling data subject requests (erasure, access, portability) within 14 days?',
                        type: 'yes_no',
                        required: true,
                        standard: 'GDPR',
                        controlId: 'Articles 15-22',
                        tier: 'critical',
                        guidance: 'Detail deletion and data export mechanisms.'
                    },
                    {
                        id: 'gdpr_breach_01',
                        text: 'Do you guarantee prompt notification of personal data breaches to the controller without undue delay and within 48 hours of becoming aware?',
                        type: 'yes_no',
                        required: true,
                        standard: 'GDPR',
                        controlId: 'Article 33(2)',
                        tier: 'critical',
                        guidance: 'Verify notification timeline in DPA.'
                    }
                ]
            }
        ]
    }
];
