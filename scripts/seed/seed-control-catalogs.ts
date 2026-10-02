/**
 * Idempotent seeding of the control catalogs behind the "Assign Controls" dialog.
 *
 *  - Syncs the in-repo catalogs (ISO 27001, SOC 2, HIPAA, NIST AI RMF) into the
 *    `controls` table — they existed only as TypeScript constants and were never loaded.
 *  - Deepens NIS2 with the Article 21(2) sub-measures (the 10 top-level measures
 *    "21(2)(a)".."21(2)(j)" already exist and are referenced by clients).
 *  - Seeds GDPR, NIST CSF 2.0 categories, OWASP LLM Top 10 (2025), OWASP ASI Top 10
 *    and EU AI Act, which had no catalog at all.
 *
 * Safe to re-run: existing (framework, control_id) pairs are skipped, and rows are
 * de-duplicated within the batch. Nothing is ever updated or deleted.
 *
 * Run with: npx tsx scripts/seed/seed-control-catalogs.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { iso27001Controls } from '../../packages/core/src/data/frameworks/iso27001';
import { soc2Controls } from '../../packages/core/src/data/frameworks/soc2';
import { hipaaControls } from '../../packages/core/src/data/frameworks/hipaa';
import { nistAiRmfControls } from '../../packages/core/src/data/frameworks/nist_ai_rmf';

interface CatalogRow {
  controlId: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  implementationGuidance?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NIS2 Article 21(2) sub-measures — deepen the 10 top-level measures already
// in the table without touching them (clients reference them).
// ─────────────────────────────────────────────────────────────────────────────
const NIS2_SUBMEASURES: CatalogRow[] = [
  // (a) Governance — risk analysis & IS security policies
  { controlId: '21(2)(a).1', name: 'Risk Analysis Methodology', description: 'Maintain a documented, repeatable methodology for analysing risks to network and information systems, including likelihood and impact criteria.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(a).2', name: 'Information System Security Policy Framework', description: 'Establish and approve an information system security policy set covering all critical business functions.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(a).3', name: 'Policy Review and Approval Cycle', description: 'Review and re-approve security policies at least annually and after major changes or incidents.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(a).4', name: 'Risk Treatment Plan', description: 'Maintain a risk treatment plan that tracks decisions to mitigate, accept, transfer or avoid identified risks to closure.', framework: 'NIS2', category: 'Governance' },
  // (b) Security Operations — incident handling
  { controlId: '21(2)(b).1', name: 'Incident Detection and Logging', description: 'Detect anomalous events and record security incidents with sufficient detail for triage and reporting.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(b).2', name: 'Incident Response Playbooks', description: 'Maintain response playbooks covering containment, escalation paths and evidence preservation for major incident classes.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(b).3', name: 'CSIRT Notification Workflow (24h/72h/1m)', description: 'Notify the national CSIRT with an early warning within 24 hours, an incident notification within 72 hours and a final report within one month of significant incidents.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(b).4', name: 'Post-Incident Lessons Learned', description: 'Conduct post-incident reviews and track corrective actions back into policies, controls and training.', framework: 'NIS2', category: 'Security Operations' },
  // (c) Resilience — business continuity
  { controlId: '21(2)(c).1', name: 'Backup Management Policy', description: 'Perform regular, tested backups of critical data with offline or immutable copies.', framework: 'NIS2', category: 'Resilience' },
  { controlId: '21(2)(c).2', name: 'Disaster Recovery Plan and Testing', description: 'Maintain disaster recovery procedures with defined RTO/RPO targets and rehearse them at least annually.', framework: 'NIS2', category: 'Resilience' },
  { controlId: '21(2)(c).3', name: 'Crisis Management Structure', description: 'Define a crisis management team, decision authority and communication plan for major disruptions.', framework: 'NIS2', category: 'Resilience' },
  { controlId: '21(2)(c).4', name: 'Business Continuity Plans', description: 'Maintain business continuity plans for critical services and exercise them on a defined schedule.', framework: 'NIS2', category: 'Resilience' },
  // (d) Governance — supply chain security
  { controlId: '21(2)(d).1', name: 'Supplier Security Due Diligence', description: 'Assess the cybersecurity posture of direct suppliers and service providers before onboarding.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(d).2', name: 'Contractual Security Requirements', description: 'Include security, incident notification and audit requirements in contracts with key ICT suppliers.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(d).3', name: 'Supplier Risk Monitoring', description: 'Continuously monitor supplier security posture, including vulnerabilities in purchased products and services.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(d).4', name: 'Supplier Offboarding and Access Revocation', description: 'Revoke supplier access and return or destroy supplier-held data at the end of relationships.', framework: 'NIS2', category: 'Governance' },
  // (e) Technical Security — acquisition, development and maintenance
  { controlId: '21(2)(e).1', name: 'Secure Development Lifecycle', description: 'Embed security requirements, code review and testing into the acquisition, development and maintenance of systems.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(e).2', name: 'Vulnerability Handling and Disclosure', description: 'Operate a vulnerability handling process and a coordinated vulnerability disclosure policy.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(e).3', name: 'Patch and Update Management', description: 'Track, test and deploy security patches for systems within risk-based timeframes.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(e).4', name: 'Environment Segregation', description: 'Separate development, test and production environments and protect production data used outside production.', framework: 'NIS2', category: 'Technical Security' },
  // (f) Audit — effectiveness assessment
  { controlId: '21(2)(f).1', name: 'Periodic Penetration Testing', description: 'Perform penetration tests on critical systems on a risk-based schedule and track remediation.', framework: 'NIS2', category: 'Audit' },
  { controlId: '21(2)(f).2', name: 'Continuous Vulnerability Scanning', description: 'Scan infrastructure and applications for technical vulnerabilities and prioritise fixes by risk.', framework: 'NIS2', category: 'Audit' },
  { controlId: '21(2)(f).3', name: 'Security Metrics and Audits', description: 'Measure the effectiveness of risk-management measures with KPIs and independent audits.', framework: 'NIS2', category: 'Audit' },
  // (g) Security Operations — cyber hygiene and training
  { controlId: '21(2)(g).1', name: 'Baseline Cyber Hygiene', description: 'Enforce baseline practices: timely updates, least privilege, endpoint protection and secure defaults.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(g).2', name: 'Security Awareness Training', description: 'Train all employees on cybersecurity risks and organisational policies at onboarding and periodically after.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(g).3', name: 'Phishing Simulation Programme', description: 'Run simulated phishing exercises and follow up on failure trends with targeted training.', framework: 'NIS2', category: 'Security Operations' },
  { controlId: '21(2)(g).4', name: 'Role-Specific Security Training', description: 'Provide specialised training for administrators, developers and other high-risk roles.', framework: 'NIS2', category: 'Security Operations' },
  // (h) Technical Security — cryptography
  { controlId: '21(2)(h).1', name: 'Cryptography Policy and Key Management', description: 'Define when cryptography must be used and manage keys across their lifecycle, including rotation and revocation.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(h).2', name: 'Encryption in Transit and at Rest', description: 'Encrypt sensitive data in transit over untrusted networks and at rest on endpoints, servers and backups.', framework: 'NIS2', category: 'Technical Security' },
  // (i) Governance — HR security, access control, asset management
  { controlId: '21(2)(i).1', name: 'HR Security Lifecycle', description: 'Screen candidates, define security responsibilities in contracts and handle secure termination.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(i).2', name: 'Access Control and Least Privilege', description: 'Grant access based on role, review it periodically and revoke it immediately on separation.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(i).3', name: 'Asset Inventory', description: 'Maintain an up-to-date inventory of network and information systems with owners and criticality.', framework: 'NIS2', category: 'Governance' },
  { controlId: '21(2)(i).4', name: 'Secure Asset Disposal', description: 'Sanitise or destroy media and devices containing data before disposal or reuse.', framework: 'NIS2', category: 'Governance' },
  // (j) Technical Security — authentication and communications
  { controlId: '21(2)(j).1', name: 'Multi-Factor Authentication', description: 'Require MFA or continuous authentication for access to critical systems, especially remotely.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(j).2', name: 'Secured Voice, Video and Text Communications', description: 'Protect voice, video and text communication channels used for business with encryption and access control.', framework: 'NIS2', category: 'Technical Security' },
  { controlId: '21(2)(j).3', name: 'Secured Emergency Communication Systems', description: 'Maintain emergency communication channels that remain available when primary systems are compromised.', framework: 'NIS2', category: 'Technical Security' },
];

// ─────────────────────────────────────────────────────────────────────────────
// NIST CSF 2.0 — the 23 official Categories. Subcategory-level rows already in
// the table (GV.OC-01, ID.AM-01, …) are kept and stay unique.
// ─────────────────────────────────────────────────────────────────────────────
const NIST_CSF2_CATEGORIES: CatalogRow[] = [
  { controlId: 'GV.OC', name: 'Organizational Context (GV.OC)', description: 'The circumstances — mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements — surrounding the organization are understood.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.RR', name: 'Roles, Responsibilities, and Authorities (GV.RR)', description: 'Cybersecurity roles, responsibilities, and authorities are established, communicated, understood, and resourced.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.RM', name: 'Risk Management Strategy (GV.RM)', description: 'The organization\u2019s priorities, constraints, risk appetite and tolerance statements, and assurance needs are established, communicated, and monitored.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.RV', name: 'Cybersecurity Risk Management Oversight (GV.RV)', description: 'Outcomes of organization-wide cybersecurity risk management activities and performance are used to inform, improve, and adjust the risk management strategy.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.PO', name: 'Policy (GV.PO)', description: 'Organizational cybersecurity policy is established, communicated, and enforced.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.OV', name: 'Oversight (GV.OV)', description: 'Results of organization-wide cybersecurity risk management activities and performance are used to review and adjust the cybersecurity risk management strategy.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'GV.SC', name: 'Cybersecurity Supply Chain Risk Management (GV.SC)', description: 'Cybersecurity supply chain risk management processes are identified, established, managed, monitored, and improved.', framework: 'NIST CSF', category: 'Govern' },
  { controlId: 'ID.AM', name: 'Asset Management (ID.AM)', description: 'The organization\u2019s assets that enable the organization to achieve business purposes are identified and managed according to their criticality.', framework: 'NIST CSF', category: 'Identify' },
  { controlId: 'ID.RA', name: 'Risk Assessment (ID.RA)', description: 'The cybersecurity risk to the organization, assets, and individuals is understood by the organization.', framework: 'NIST CSF', category: 'Identify' },
  { controlId: 'ID.IM', name: 'Improvement (ID.IM)', description: 'Improvements to organizational cybersecurity risk management processes, procedures and activities are identified across all CSF functions.', framework: 'NIST CSF', category: 'Identify' },
  { controlId: 'PR.AA', name: 'Identity Management, Authentication, and Access Control (PR.AA)', description: 'Access to physical and logical assets is limited only to authorized users, services, and hardware, and managed according to risk.', framework: 'NIST CSF', category: 'Protect' },
  { controlId: 'PR.AT', name: 'Awareness and Training (PR.AT)', description: 'The organization\u2019s personnel are provided with cybersecurity awareness and training so that they can perform their cybersecurity-related tasks.', framework: 'NIST CSF', category: 'Protect' },
  { controlId: 'PR.DS', name: 'Data Security (PR.DS)', description: 'Data are managed consistent with the organization\u2019s risk strategy to protect the confidentiality, integrity, and availability of information.', framework: 'NIST CSF', category: 'Protect' },
  { controlId: 'PR.PS', name: 'Platform Security (PR.PS)', description: 'The hardware, software, and services of physical and virtual platforms are managed consistent with the organization\u2019s risk strategy.', framework: 'NIST CSF', category: 'Protect' },
  { controlId: 'PR.IR', name: 'Technology Infrastructure Resilience (PR.IR)', description: 'Security architecture is managed with the organization\u2019s risk strategy to protect asset confidentiality, integrity, and availability.', framework: 'NIST CSF', category: 'Protect' },
  { controlId: 'DE.CM', name: 'Continuous Monitoring (DE.CM)', description: 'Assets are monitored to identify anomalies and potential adverse events.', framework: 'NIST CSF', category: 'Detect' },
  { controlId: 'DE.AE', name: 'Adverse Event Analysis (DE.AE)', description: 'Anomalies and potential adverse events are analyzed to characterize and detect incidents.', framework: 'NIST CSF', category: 'Detect' },
  { controlId: 'RS.MA', name: 'Incident Management (RS.MA)', description: 'Responses to detected anomalies and potential adverse events are executed and supported.', framework: 'NIST CSF', category: 'Respond' },
  { controlId: 'RS.AN', name: 'Incident Analysis (RS.AN)', description: 'Investigations and analyses of incidents are conducted to ensure an effective response and support recovery activities.', framework: 'NIST CSF', category: 'Respond' },
  { controlId: 'RS.MI', name: 'Incident Response Reporting and Communication (RS.MI)', description: 'Activities are performed to mitigate the impact of incidents by containing them and eradicating their effects.', framework: 'NIST CSF', category: 'Respond' },
  { controlId: 'RS.CO', name: 'Incident Response Reporting and Communication (RS.CO)', description: 'Incident response activities are coordinated with internal and external stakeholders as required.', framework: 'NIST CSF', category: 'Respond' },
  { controlId: 'RC.RP', name: 'Incident Recovery Plan Execution (RC.RP)', description: 'Restoration activities are executed to ensure operational availability of systems and services affected by cybersecurity incidents.', framework: 'NIST CSF', category: 'Recover' },
  { controlId: 'RC.CO', name: 'Incident Recovery Communication (RC.CO)', description: 'Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders.', framework: 'NIST CSF', category: 'Recover' },
];

// ─────────────────────────────────────────────────────────────────────────────
// GDPR — key articles mapped to actionable controls.
// ─────────────────────────────────────────────────────────────────────────────
const GDPR_CONTROLS: CatalogRow[] = [
  { controlId: 'Art. 5', name: 'Principles of Processing', description: 'Ensure personal data is processed lawfully, fairly and transparently, limited to purpose, minimised, accurate, storage-limited, and secure.', framework: 'GDPR', category: 'Principles' },
  { controlId: 'Art. 6', name: 'Lawfulness of Processing', description: 'Identify and document a lawful basis (consent, contract, legal obligation, vital interests, public task, legitimate interests) for every processing activity.', framework: 'GDPR', category: 'Principles' },
  { controlId: 'Art. 7', name: 'Conditions for Consent', description: 'Collect consent that is freely given, specific, informed and unambiguous, with records and easy withdrawal.', framework: 'GDPR', category: 'Principles' },
  { controlId: 'Art. 9', name: 'Special Categories of Personal Data', description: 'Apply heightened conditions (explicit consent or legal exemption) before processing health, biometric or other special category data.', framework: 'GDPR', category: 'Principles' },
  { controlId: 'Art. 12', name: 'Transparent Information and Facilitation of Rights', description: 'Respond to data subject requests within one month, free of charge, with clear information about how rights are exercised.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 13', name: 'Information to Be Provided at Collection', description: 'Give data subjects identity of the controller, purposes, lawful basis, recipients, retention and their rights at the point of collection.', framework: 'GDPR', category: 'Transparency' },
  { controlId: 'Art. 14', name: 'Information Where Data Not Obtained from the Data Subject', description: 'Inform data subjects when their personal data has been obtained from third parties, within one month.', framework: 'GDPR', category: 'Transparency' },
  { controlId: 'Art. 15', name: 'Right of Access', description: 'Provide data subjects with a copy of their personal data and processing details upon verified request.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 16', name: 'Right to Rectification', description: 'Correct inaccurate personal data without undue delay and complete incomplete records.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 17', name: 'Right to Erasure', description: 'Erase personal data on request when no overriding lawful ground applies, including search-engine style removals.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 18', name: 'Right to Restriction of Processing', description: 'Suspend processing (while storing) data when accuracy, lawfulness or necessity is contested.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 19', name: 'Notification Obligation Regarding Rectification or Erasure', description: 'Communicate rectifications, erasures and restrictions to every recipient of the personal data.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 20', name: 'Right to Data Portability', description: 'Provide personal data in a structured, commonly used, machine-readable format for transmission to another controller.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 21', name: 'Right to Object', description: 'Honour objections to processing based on legitimate interests or for direct marketing, and stop such processing.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 22', name: 'Automated Decision-Making and Profiling', description: 'Restrict solely automated decisions with legal or significant effects and provide human review, explanation and contest channels.', framework: 'GDPR', category: 'Data Subject Rights' },
  { controlId: 'Art. 24', name: 'Responsibility of the Controller', description: 'Implement and review technical and organisational measures — including policies — that demonstrate compliant processing.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 25', name: 'Data Protection by Design and by Default', description: 'Build privacy into systems from the design stage and default processing to the minimum necessary.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 26', name: 'Joint Controllers', description: 'Define and document responsibility splits and data subject contact points with joint controllers in a transparent arrangement.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 28', name: 'Processor Engagement and Contracts', description: 'Engage only processors under written contracts with GDPR-mandated terms, sub-processor controls and audit rights.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 30', name: 'Records of Processing Activities', description: 'Maintain records of processing (RoPA) for controllers and processors covering purposes, categories, recipients, transfers and retention.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 32', name: 'Security of Processing', description: 'Apply risk-appropriate technical and organisational security measures such as pseudonymisation, encryption, resilience testing and access control.', framework: 'GDPR', category: 'Security' },
  { controlId: 'Art. 33', name: 'Breach Notification to the Supervisory Authority', description: 'Notify the competent authority of personal data breaches within 72 hours of becoming aware, with required content.', framework: 'GDPR', category: 'Security' },
  { controlId: 'Art. 34', name: 'Breach Notification to Data Subjects', description: 'Inform affected data subjects of high-risk breaches in clear and plain language without undue delay.', framework: 'GDPR', category: 'Security' },
  { controlId: 'Art. 35', name: 'Data Protection Impact Assessment', description: 'Carry out a DPIA for high-risk processing — including systematic monitoring and large-scale special category data — and consult on residual risk.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 36', name: 'Prior Consultation', description: 'Consult the supervisory authority before processing where a DPIA identifies unmitigated high residual risk.', framework: 'GDPR', category: 'Accountability' },
  { controlId: 'Art. 37', name: 'Designation of the Data Protection Officer', description: 'Appoint a DPO where required (public body, large-scale monitoring, or large-scale special category processing).', framework: 'GDPR', category: 'Governance' },
  { controlId: 'Art. 38', name: 'Position of the Data Protection Officer', description: 'Ensure the DPO is involved properly in data protection matters, resourced, independent and not instructed on tasks.', framework: 'GDPR', category: 'Governance' },
  { controlId: 'Art. 39', name: 'Tasks of the Data Protection Officer', description: 'Define DPO duties: advice and monitoring of compliance, awareness and training, DPIA support, and authority cooperation.', framework: 'GDPR', category: 'Governance' },
  { controlId: 'Art. 44', name: 'General Principle for Transfers', description: 'Ensure personal data transferred outside the EEA has an adequacy decision or appropriate safeguards under Chapter V.', framework: 'GDPR', category: 'International Transfers' },
  { controlId: 'Art. 45', name: 'Transfers on the Basis of an Adequacy Decision', description: 'Track adequacy decisions and reassess them for the countries receiving personal data.', framework: 'GDPR', category: 'International Transfers' },
  { controlId: 'Art. 46', name: 'Transfers Subject to Appropriate Safeguards', description: 'Use SCCs, BCRs or other valid instruments with transfer impact assessments where no adequacy decision exists.', framework: 'GDPR', category: 'International Transfers' },
  { controlId: 'Art. 47', name: 'Binding Corporate Rules', description: 'Operate approved binding corporate rules for intra-group transfers where relied upon.', framework: 'GDPR', category: 'International Transfers' },
];

// ─────────────────────────────────────────────────────────────────────────────
// EU AI Act — high-risk provider/deployer obligations and transparency duties.
// ─────────────────────────────────────────────────────────────────────────────
const EU_AI_ACT_CONTROLS: CatalogRow[] = [
  { controlId: 'Art. 4', name: 'AI Literacy', description: 'Ensure staff operating or using AI systems on the organization\u2019s behalf have a sufficient level of AI literacy.', framework: 'EU AI Act', category: 'General Obligations' },
  { controlId: 'Art. 5', name: 'Prohibited AI Practices', description: 'Confirm no prohibited practices are used: subliminal manipulation, exploitation of vulnerabilities, social scoring and untargeted facial scraping.', framework: 'EU AI Act', category: 'Classification' },
  { controlId: 'Art. 6', name: 'High-Risk Classification', description: 'Classify AI systems against Annex III high-risk areas (employment, credit, essential services, biometrics, law enforcement) and Annex I product rules.', framework: 'EU AI Act', category: 'Classification' },
  { controlId: 'Art. 9', name: 'Risk Management System', description: 'Operate a continuous, iterative risk management system across the AI system lifecycle, covering foreseeable misuse and residual risk acceptance.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 10', name: 'Data and Data Governance', description: 'Apply data governance: training, validation and testing sets that are relevant, representative, examined for bias and documented.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 11', name: 'Technical Documentation', description: 'Maintain Annex IV technical documentation demonstrating compliance and keep it up to date before market placement.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 12', name: 'Record-Keeping (Logs)', description: 'Enable automatic event logging over the AI system lifetime to trace its functioning and monitor for risks.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 13', name: 'Transparency and Provision of Information to Deployers', description: 'Provide deployers with instructions for use covering capabilities, limitations, human oversight measures and expected performance.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 14', name: 'Human Oversight', description: 'Design high-risk systems for effective human oversight, including the ability to intervene, override and halt operation.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 15', name: 'Accuracy, Robustness and Cybersecurity', description: 'Meet declared accuracy and robustness metrics and protect the AI system against unauthorised attempts to alter use, outputs or performance.', framework: 'EU AI Act', category: 'High-Risk Requirements' },
  { controlId: 'Art. 16', name: 'Provider Obligations', description: 'Ensure high-risk systems comply with requirements, register them, keep documentation, and enable conformity assessment.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 17', name: 'Quality Management System', description: 'Operate a QMS covering regulatory compliance, resources, data management, testing, versioning and incident handling.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 18', name: 'Documentation Keeping', description: 'Retain technical documentation and logs for at least 10 years after the AI system is placed on the market.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 19', name: 'Automatically Generated Logs', description: 'Keep automatically generated logs under provider control for at least six months where deployers cannot fulfil retention.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 20', name: 'Information Obligations for Serious Incidents', description: 'Track serious incidents, report them to market surveillance authorities and cooperate on investigations.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 22', name: 'Deployer Obligations', description: 'Use high-risk systems per instructions, assign competent human oversight, keep logs and inform affected workers where applicable.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 26', name: 'Deployer Oversight and Use Monitoring', description: 'Monitor operation, validate input data relevance, keep logs at least six months and suspend use on risks.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 27', name: 'Fundamental Rights Impact Assessment', description: 'Perform a fundamental rights impact assessment before first deployment where required (public bodies, certain private services).', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 43', name: 'Conformity Assessment', description: 'Complete the required conformity assessment (internal control or notified body) before placing high-risk systems on the market.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 49', name: 'EU Database Registration', description: 'Register high-risk AI systems in the EU database, keeping registration data current.', framework: 'EU AI Act', category: 'Obligations' },
  { controlId: 'Art. 50', name: 'Transparency Obligations for AI Systems', description: 'Disclose AI interaction (chatbots), label synthetic content and mark deepfakes and AI-generated text on public dissemination.', framework: 'EU AI Act', category: 'Transparency' },
  { controlId: 'Art. 72', name: 'Post-Market Monitoring', description: 'Establish and maintain post-market monitoring matched to the nature of the AI system, feeding serious incident reporting.', framework: 'EU AI Act', category: 'Obligations' },
];

// ─────────────────────────────────────────────────────────────────────────────
// OWASP LLM Top 10 (2025) and OWASP Agentic Security Initiative Top 10.
// ─────────────────────────────────────────────────────────────────────────────
const OWASP_LLM_TOP10: CatalogRow[] = [
  { controlId: 'LLM01', name: 'Prompt Injection', description: 'Direct or indirect manipulation of LLM inputs that causes the model to follow attacker instructions; mitigate with input/output filtering, privilege separation and human approval for sensitive actions.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM02', name: 'Sensitive Information Disclosure', description: 'Leakage of personal data, credentials or proprietary data through model outputs; mitigate with data minimisation, DLP and output filtering.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM03', name: 'Supply Chain', description: 'Compromised models, fine-tunes, plugins or datasets in the AI supply chain; mitigate with provenance checks, SBOMs and vetted sources.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM04', name: 'Data and Model Poisoning', description: 'Manipulation of training or fine-tuning data that embeds backdoors or bias; mitigate with trusted data pipelines, anomaly detection and evaluation holdouts.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM05', name: 'Improper Output Handling', description: 'Passing model output to downstream systems (SQL, shell, HTML) without validation; mitigate by treating model output as untrusted input.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM06', name: 'Excessive Agency', description: 'Granting the model tools, permissions or autonomy beyond what is needed; mitigate with least-privilege tooling, scope limits and human-in-the-loop gates.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM07', name: 'System Prompt Leakage', description: 'Exposure of system prompts containing secrets or rules that attackers can turn into bypass knowledge; mitigate by never treating the system prompt as a secret boundary.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM08', name: 'Vector and Embedding Weaknesses', description: 'RAG/embedding attacks such as cross-context data leakage and unauthorised retrieval; mitigate with per-tenant access control over vector stores.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM09', name: 'Misinformation', description: 'Confident but wrong model outputs relied upon by users or systems; mitigate with grounding, citations, confidence signalling and human review.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
  { controlId: 'LLM10', name: 'Unbounded Consumption', description: 'Resource exhaustion through high-volume or recursive inference; mitigate with rate limits, quotas and cost monitoring.', framework: 'OWASP LLM Top 10', category: 'LLM Application Security' },
];

const OWASP_ASI_TOP10: CatalogRow[] = [
  { controlId: 'ASI01', name: 'Memory and Context Poisoning', description: 'Manipulating agent memory or retrieved context to persist malicious instructions across sessions.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI02', name: 'Tool Misuse', description: 'Inducing agents to call legitimate tools with attacker-chosen parameters or sequences beyond intended use.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI03', name: 'Privilege Compromise', description: 'Escalating an agent\u2019s effective privileges beyond its task scope, including credential reuse across tool calls.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI04', name: 'Resource Overload', description: 'Driving autonomous loops that exhaust compute, API budgets or third-party quotas.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI05', name: 'Cascading Hallucination', description: 'Fabricated agent outputs that propagate through multi-step plans or downstream systems as if they were facts.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI06', name: 'Intent Breaking and Goal Manipulation', description: 'Rewriting agent goals or success criteria mid-run, derailing behaviour without visible failure.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI07', name: 'Misaligned and Deceptive Behaviors', description: 'Agents pursuing unintended strategies, including reward hacking or concealing their true actions from oversight.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI08', name: 'Repudiation and Traceability', description: 'Inability to attribute agent actions to decisions, prompts or tool calls due to insufficient audit trails.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI09', name: 'Identity and Trust Spoofing', description: 'Agents impersonating other agents, users or services to gain trust or bypass authorisation checks.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
  { controlId: 'ASI10', name: 'Autonomous Agent Recursion and Deadlock', description: 'Agents triggering each other in loops or deadlocks that consume resources or corrupt shared state.', framework: 'OWASP ASI', category: 'Agentic AI Security' },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

  // 1. In-repo catalogs, mapped to the controls table shape.
  const fromRepo: CatalogRow[] = [
    ...iso27001Controls.map((c: any) => ({
      controlId: c.id,
      name: c.name,
      description: c.description,
      framework: 'ISO 27001',
      category: c.category,
    })),
    ...soc2Controls.map((c: any) => ({
      controlId: c.id,
      name: c.name,
      description: c.description,
      framework: 'SOC 2',
      category: c.category,
    })),
    ...hipaaControls.map((c: any) => ({
      controlId: c.id,
      name: c.name,
      description: c.description,
      framework: 'HIPAA',
      category: c.category,
      implementationGuidance: c.implementationGuidance,
    })),
    ...nistAiRmfControls.map((c: any) => ({
      controlId: c.id,
      name: c.name,
      description: c.description,
      framework: 'NIST AI RMF',
      category: c.category,
    })),
    ...NIS2_SUBMEASURES,
    ...NIST_CSF2_CATEGORIES,
    ...GDPR_CONTROLS,
    ...EU_AI_ACT_CONTROLS,
    ...OWASP_LLM_TOP10,
    ...OWASP_ASI_TOP10,
  ];

  // 2. De-duplicate and skip everything already in the table.
  const existing = await sql<{ framework: string; control_id: string }>`
    select framework, control_id from controls`;
  const existingKeys = new Set(existing.map((r) => `${r.framework}::${r.control_id.toLowerCase()}`));

  const seen = new Set<string>();
  const toInsert: CatalogRow[] = [];
  let skippedExisting = 0;
  let skippedDuplicate = 0;

  for (const row of fromRepo) {
    const key = `${row.framework}::${String(row.controlId).toLowerCase()}`;
    if (existingKeys.has(key)) { skippedExisting++; continue; }
    if (seen.has(key)) { skippedDuplicate++; continue; }
    seen.add(key);
    toInsert.push(row);
  }

  // 3. Insert.
  let inserted = 0;
  await sql.begin(async (tx) => {
    for (const row of toInsert) {
      await tx`
        insert into controls
          (control_id, name, description, framework, category, implementation_guidance, status, version)
        values
          (${row.controlId}, ${row.name}, ${row.description}, ${row.framework}, ${row.category},
           ${row.implementationGuidance ?? null}, 'active', 1)`;
      inserted++;
    }
  });

  // 4. Report.
  const after = await sql<{ framework: string; n: number }>`
    select framework, count(*)::int as n from controls group by framework order by framework`;
  console.log(`[SeedCatalogs] catalog rows offered: ${fromRepo.length}`);
  console.log(`[SeedCatalogs] inserted: ${inserted}, skipped (existing): ${skippedExisting}, skipped (dup in batch): ${skippedDuplicate}`);
  console.log('[SeedCatalogs] catalog size by framework:');
  for (const r of after) console.log(`  ${r.framework.padEnd(22)} ${r.n}`);

  await sql.end();
}

main().catch((err) => {
  console.error('[SeedCatalogs] failed:', err);
  process.exit(1);
});
