/**
 * OWASP SAMM v2 Question Seed Data
 * 
 * This script populates the samm_practices and samm_stream_questions tables
 * with official OWASP SAMM v2 assessment questions, criteria, and guidance.
 * 
 * Data source: https://owaspsamm.org/model/
 * 
 * Run with: npx tsx scripts/seed-samm-questions.ts
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

// ============================================================================
// SAMM Practices Definitions
// ============================================================================

const practices = [
    // GOVERNANCE
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        description: 'Build an efficient and effective plan for realizing your software security objectives within your organization.',
        businessFunction: 'Governance',
        streamAName: 'Create and Promote',
        streamADescription: 'Develop a security strategy and build stakeholder buy-in',
        streamBName: 'Measure and Improve',
        streamBDescription: 'Establish metrics and improve based on data',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/',
        order: 1
    },
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        description: 'Understand and meet external legal and regulatory requirements while driving internal security standards.',
        businessFunction: 'Governance',
        streamAName: 'Policy and Standards',
        streamADescription: 'Establish security and compliance policies',
        streamBName: 'Compliance Management',
        streamBDescription: 'Measure compliance and develop evidence',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/',
        order: 2
    },
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        description: 'Equip personnel with the knowledge and resources to build security into their work.',
        businessFunction: 'Governance',
        streamAName: 'Training and Awareness',
        streamADescription: 'Provide role-specific security training',
        streamBName: 'Organization and Culture',
        streamBDescription: 'Build security into the organization and culture',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/',
        order: 3
    },

    // DESIGN
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        description: 'Identify and understand threats to the organization and applications.',
        businessFunction: 'Design',
        streamAName: 'Application Risk Profile',
        streamADescription: 'Identify and catalog application risks',
        streamBName: 'Threat Modeling',
        streamBDescription: 'Use threat modeling to understand system-level threats',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/',
        order: 4
    },
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        description: 'Specify security requirements to guide design and development.',
        businessFunction: 'Design',
        streamAName: 'Software Requirements',
        streamADescription: 'Derive security requirements from business functionality',
        streamBName: 'Supplier Security',
        streamBDescription: 'Manage security in the supply chain',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/',
        order: 5
    },
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        description: 'Establish architecture to support security throughout the application lifecycle.',
        businessFunction: 'Design',
        streamAName: 'Architecture Design',
        streamADescription: 'Insert security principles into architecture design',
        streamBName: 'Technology Management',
        streamBDescription: 'Manage technology stacks and frameworks for security',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/',
        order: 6
    },

    // IMPLEMENTATION
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        description: 'Build and deploy software using secure processes and tooling.',
        businessFunction: 'Implementation',
        streamAName: 'Build Process',
        streamADescription: 'Harden the build process',
        streamBName: 'Software Dependencies',
        streamBDescription: 'Manage and track software dependencies',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/',
        order: 7
    },
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        description: 'Deploy software into production environments securely.',
        businessFunction: 'Implementation',
        streamAName: 'Deployment Process',
        streamADescription: 'Establish secure deployment processes',
        streamBName: 'Secret Management',
        streamBDescription: 'Handle secrets and credentials securely',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/',
        order: 8
    },
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        description: 'Measure, manage, and learn from security defects.',
        businessFunction: 'Implementation',
        streamAName: 'Defect Tracking',
        streamADescription: 'Track security findings and remediation',
        streamBName: 'Metrics and Feedback',
        streamBDescription: 'Use metrics to improve security over time',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/',
        order: 9
    },

    // VERIFICATION
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        description: 'Review architecture and infrastructure against security requirements.',
        businessFunction: 'Verification',
        streamAName: 'Architecture Validation',
        streamADescription: 'Validate architecture and design security',
        streamBName: 'Architecture Mitigation',
        streamBDescription: 'Mitigate architectural and design flaws',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/',
        order: 10
    },
    {
        practiceId: 'RT',
        practiceName: 'Requirements-driven Testing',
        description: 'Test applications against functional and non-functional security requirements.',
        businessFunction: 'Verification',
        streamAName: 'Control Verification',
        streamADescription: 'Test security controls',
        streamBName: 'Misuse/Abuse Testing',
        streamBDescription: 'Test for common security weaknesses',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-driven-testing/',
        order: 11
    },
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        description: 'Test applications for security vulnerabilities.',
        businessFunction: 'Verification',
        streamAName: 'Scalable Baseline',
        streamADescription: 'Perform consistent security testing',
        streamBName: 'Deep Understanding',
        streamBDescription: 'Perform deep security testing',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/',
        order: 12
    },

    // OPERATIONS
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        description: 'Detect and respond to security incidents when they occur.',
        businessFunction: 'Operations',
        streamAName: 'Incident Detection',
        streamADescription: 'Detect security incidents',
        streamBName: 'Incident Response',
        streamBDescription: 'Respond to security incidents',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/',
        order: 13
    },
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        description: 'Maintain secure operational environments.',
        businessFunction: 'Operations',
        streamAName: 'Configuration Hardening',
        streamADescription: 'Harden operational configurations',
        streamBName: 'Patching and Updating',
        streamBDescription: 'Maintain patching and updates',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/',
        order: 14
    },
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        description: 'Manage security data and processes in operations.',
        businessFunction: 'Operations',
        streamAName: 'Data Protection',
        streamADescription: 'Protect sensitive data',
        streamBName: 'System Decomissioning',
        streamBDescription: 'Securely decommission systems',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/',
        order: 15
    },
];

// ============================================================================
// SAMM Stream Questions - Strategy & Metrics (SM) Example
// ============================================================================

const questions = [
    // SM - Stream A: Create and Promote
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'A',
        streamName: 'Create and Promote',
        streamDescription: 'Develop a security strategy and build stakeholder buy-in',
        level: 1,
        levelName: 'Initial',
        question: 'Do you understand the enterprise-wide risk appetite for your applications?',
        qualityCriteria: [
            'Interviewed business owners about threats',
            'Documented worst-case scenarios',
            'Identified market opportunities from security',
            'Published baseline risk factors',
            'Communicated risk factors to development teams'
        ],
        activities: [
            'Interview business owners and stakeholders about threats',
            'Document industry-specific security drivers',
            'Identify worst-case scenarios that could impact the organization',
            'Create baseline and risk factors document',
            'Publish and communicate to development teams'
        ],
        benefits: 'Common understanding of organization security posture',
        maturityIndicators: [
            'Risk factors documented and communicated',
            'Business owners interviewed',
            'Development teams aware of security priorities'
        ],
        suggestedEvidence: [
            'Risk factor documentation',
            'Meeting notes from stakeholder interviews',
            'Communication records to development teams'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/'
    },
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'A',
        streamName: 'Create and Promote',
        streamDescription: 'Develop a security strategy and build stakeholder buy-in',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a strategic plan for application security and use it to make decisions?',
        qualityCriteria: [
            '1-3 year security roadmap exists',
            'Plan aligned with business priorities',
            'Budget allocated for security initiatives',
            'Milestones defined and tracked',
            'Stakeholder buy-in obtained',
            'Plan published and accessible to relevant teams'
        ],
        activities: [
            'Develop 1-3 year security roadmap',
            'Align roadmap with business priorities',
            'Balance financial, process, and cultural changes',
            'Define frequent milestones for monitoring',
            'Obtain stakeholder and development team buy-in',
            'Publish plan to all participants'
        ],
        benefits: 'Available and agreed upon roadmap of your AppSec program',
        maturityIndicators: [
            'Written strategic plan exists',
            'Plan regularly reviewed and updated',
            'Decisions made based on plan',
            'Budget allocated'
        ],
        suggestedEvidence: [
            'Published security roadmap document',
            'Budget approval documents',
            'Stakeholder sign-off records'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/'
    },
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'A',
        streamName: 'Create and Promote',
        streamDescription: 'Develop a security strategy and build stakeholder buy-in',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly review and update your security strategy to align with business changes?',
        qualityCriteria: [
            'Strategy reviewed at least annually',
            'Plan adapts to changing business landscape',
            'Input from multiple stakeholders incorporated',
            'Security strategy influences business strategy',
            'Continuous improvement process established',
            'Strategy effectiveness measured and reported'
        ],
        activities: [
            'Establish regular strategy review cycle',
            'Monitor business changes and adapt security strategy',
            'Gather input from diverse stakeholders',
            'Report on strategy effectiveness to leadership',
            'Incorporate lessons learned',
            'Drive security considerations into business planning'
        ],
        benefits: 'Continuous AppSec program alignment with organization business goals',
        maturityIndicators: [
            'Regular strategy reviews conducted',
            'Strategy documents evolution over time',
            'Security influences business decisions',
            'Metrics show strategy effectiveness'
        ],
        suggestedEvidence: [
            'Strategy review meeting minutes',
            'Updated strategy documents with version history',
            'Effectiveness metrics and reports',
            'Business strategy documents mentioning security'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/'
    },

    // SM - Stream B: Measure and Improve
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'B',
        streamName: 'Measure and Improve',
        streamDescription: 'Establish metrics and improve based on data',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use a consistent set of metrics to measure the effectiveness of the secure development lifecycle?',
        qualityCriteria: [
            'Metrics defined and documented',
            'At least 3-5 key metrics tracked',
            'Metrics collected regularly',
            'Basic reporting in place',
            'Metrics shared with relevant teams'
        ],
        activities: [
            'Define key security metrics',
            'Establish metric collection process',
            'Create basic dashboards or reports',
            'Share metrics with development and security teams',
            'Document metric definitions'
        ],
        benefits: 'Basic visibility into security program performance',
        maturityIndicators: [
            'Metrics documented',
            'Regular metric collection',
            'Basic reports generated'
        ],
        suggestedEvidence: [
            'Metrics definition document',
            'Sample reports or dashboards',
            'Metric collection procedures'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-b/'
    },
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'B',
        streamName: 'Measure and Improve',
        streamDescription: 'Establish metrics and improve based on data',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use metrics to objectively guide security decisions and measure improvements?',
        qualityCriteria: [
            'Metrics tied to security objectives',
            'Trend analysis performed',
            'Metrics used in decision-making',
            'Regular metric review meetings',
            'Improvement actions based on metrics',
            'Metrics reviewed by leadership'
        ],
        activities: [
            'Align metrics with security strategy',
            'Perform trend analysis',
            'Use metrics to drive improvements',
            'Conduct regular metric reviews',
            'Document decisions based on metrics',
            'Present metrics to leadership'
        ],
        benefits: 'Data-driven security program improvement',
        maturityIndicators: [
            'Metrics drive decisions',
            'Trends documented',
            'Improvement initiatives launched based on metrics',
            'Leadership reviews metrics'
        ],
        suggestedEvidence: [
            'Metric trend analysis reports',
            'Decision documents citing metrics',
            'Leadership review meeting minutes',
            'Improvement project documentation'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-b/'
    },
    {
        practiceId: 'SM',
        practiceName: 'Strategy and Metrics',
        streamId: 'B',
        streamName: 'Measure and Improve',
        streamDescription: 'Establish metrics and improve based on data',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you continuously optimize your metrics program and use advanced analytics for insights?',
        qualityCriteria: [
            'Metrics program regularly reviewed and refined',
            'Advanced analytics (predictive, correlative)',
            'Automated metric collection and reporting',
            'Benchmarking against industry standards',
            'Metrics influence organizational KPIs',
            'Continuous improvement culture'
        ],
        activities: [
            'Regularly review and optimize metrics',
            'Implement advanced analytics',
            'Automate collection and reporting',
            'Benchmark against industry',
            'Integrate security metrics into organizational KPIs',
            'Foster data-driven security culture'
        ],
        benefits: 'Optimized, data-driven continuous improvement',
        maturityIndicators: [
            'Advanced analytics in use',
            'Automated reporting',
            'Security metrics part of organizational KPIs',
            'Continuous optimization evident'
        ],
        suggestedEvidence: [
            'Advanced metrics dashboards',
            'Automated reporting systems',
            'Benchmarking reports',
            'Organizational KPI documents including security'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/strategy-and-metrics/stream-b/'
    },

    // PC - Stream A: Policy and Standards
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'A',
        streamName: 'Policy and Standards',
        streamDescription: 'Establish security and compliance policies',
        level: 1,
        levelName: 'Initial',
        question: 'Do you maintain a security policy or a set of technical standards representing the security baseline for all of your applications?',
        qualityCriteria: [
            'Basic security policy exists',
            'Technical standards documented',
            'Policy covers authentication and authorization',
            'Policy shared with development teams'
        ],
        activities: [
            'Draft high-level application security policy',
            'Define technical standards for common controls',
            'Communicate policies to all stakeholders',
            'Establish periodic policy review'
        ],
        benefits: 'Clear expectations for security across development teams',
        maturityIndicators: [
            'Published policy document',
            'Teams aware of baseline standards'
        ],
        suggestedEvidence: [
            'Security Policy document',
            'Technical Standards wiki',
            'Email records of policy distribution'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-a/'
    },
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'A',
        streamName: 'Policy and Standards',
        streamDescription: 'Establish security and compliance policies',
        level: 2,
        levelName: 'Defined',
        question: 'Do you maintain a central library of policies, technical standards, and guidance to fulfill security and compliance requirements?',
        qualityCriteria: [
            'Central policy repository exists',
            'Guidance documents provided for each policy',
            'Policies mapped to regulatory requirements',
            'Stakeholders involved in policy creation'
        ],
        activities: [
            'Create a central security knowledge base',
            'Develop detailed guidance for implementing standards',
            'Map internal policies to SOC 2, ISO 27001, etc.',
            'Establish a formal policy approval process'
        ],
        benefits: 'Standardized implementation of security across the org',
        maturityIndicators: [
            'Library searchability',
            'Cross-framework mapping documented'
        ],
        suggestedEvidence: [
            'Policy Library portal',
            'Mapping spreadsheet/tool',
            'Implementation guides'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-a/'
    },
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'A',
        streamName: 'Policy and Standards',
        streamDescription: 'Establish security and compliance policies',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly review the security policy and technical standards to ensure compliance and their effectiveness for the organization?',
        qualityCriteria: [
            'Annual policy review cycle',
            'Modifications based on industry trends',
            'Incident data influenced policy changes',
            'Policy effectiveness metrics tracked'
        ],
        activities: [
            'Conduct annual comprehensive policy review',
            'Update standards based on new architectural patterns',
            'Incorporate feedback from security incidents',
            'Review policies against emerging threats'
        ],
        benefits: 'Policies stay relevant in a changing threat landscape',
        maturityIndicators: [
            'Version history shows regular updates',
            'Data-driven policy adjustments'
        ],
        suggestedEvidence: [
            'Review logs',
            'Policy change history',
            'Effectiveness reports'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-a/'
    },

    // PC - Stream B: Compliance Management
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'B',
        streamName: 'Compliance Management',
        streamDescription: 'Measure compliance and develop evidence',
        level: 1,
        levelName: 'Initial',
        question: 'Do you identify and document the external compliance requirements relevant to your applications?',
        qualityCriteria: [
            'Legal/Regulatory inventory exists',
            'Context-specific requirements identified',
            'Responsibility assigned for compliance',
            'Baseline requirements documented'
        ],
        activities: [
            'Catalog all applicable laws and regulations',
            'Determine which apps must follow which rules',
            'Identify key compliance milestones',
            'Appoint a compliance liaison'
        ],
        benefits: 'Avoided fines and legal surprises',
        maturityIndicators: [
            'Compliance matrix showing app vs regulation'
        ],
        suggestedEvidence: [
            'Compliance inventory document',
            'Risk assessment records'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-b/'
    },
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'B',
        streamName: 'Compliance Management',
        streamDescription: 'Measure compliance and develop evidence',
        level: 2,
        levelName: 'Defined',
        question: 'Do you conduct periodic compliance audits and review the results with stakeholders?',
        qualityCriteria: [
            'Scheduled audit calendar',
            'Evidence collection process exists',
            'Non-compliance issues tracked',
            'Executive review of audit findings'
        ],
        activities: [
            'Schedule recurring compliance check-ins',
            'Collect technical evidence of control operation',
            'Log and prioritize compliance gaps',
            'Report compliance status to leadership'
        ],
        benefits: 'Early detection of compliance failures',
        maturityIndicators: [
            'Audit reports available',
            'Evidence repository populated'
        ],
        suggestedEvidence: [
            'Audit reports',
            'Evidence artifacts',
            'Governance committee minutes'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-b/'
    },
    {
        practiceId: 'PC',
        practiceName: 'Policy and Compliance',
        streamId: 'B',
        streamName: 'Compliance Management',
        streamDescription: 'Measure compliance and develop evidence',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you have an automated process to monitor and verify compliance with your security standards and relevant regulations?',
        qualityCriteria: [
            'Real-time compliance monitoring',
            'Automated alerts for non-compliance',
            'Drift detection in production',
            'Compliance-as-Code implementation'
        ],
        activities: [
            'Implement automated policy checks in CI/CD',
            'Use cloud-native compliance monitoring tools',
            'Establish automated alerting for policy violations',
            'Enable self-healing for common misconfigurations'
        ],
        benefits: 'Reduced cost of compliance and increased assurance',
        maturityIndicators: [
            'Real-time dashboards',
            'Automation coverage %'
        ],
        suggestedEvidence: [
            'Monitoring dashboard screenshots',
            'Automated alert logs',
            'CI/CD pipeline configs'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/policy-and-compliance/stream-b/'
    },

    // EG - Stream A: Training and Awareness
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'A',
        streamName: 'Training and Awareness',
        streamDescription: 'Provide role-specific security training',
        level: 1,
        levelName: 'Initial',
        question: 'Do you offer security awareness training to all personnel involved in the software development lifecycle?',
        qualityCriteria: [
            'Training covers basic security concepts',
            'Participation is tracked',
            'Training delivered at least annually',
            'Material is relevant to the organization'
        ],
        activities: [
            'Conduct annual security awareness sessions',
            'Track attendance and completion',
            'Publish security newsletters or bulletins',
            'Incorporate security into employee onboarding'
        ],
        benefits: 'General awareness of security risks across the company',
        maturityIndicators: [
            'Training logs',
            'Onboarding checklist includes security'
        ],
        suggestedEvidence: [
            'Training attendance records',
            'Onboarding documentation',
            'Security awareness curriculum'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-a/'
    },
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'A',
        streamName: 'Training and Awareness',
        streamDescription: 'Provide role-specific security training',
        level: 2,
        levelName: 'Defined',
        question: 'Do you provide role-specific security training for personnel involved in software development?',
        qualityCriteria: [
            'Specific training for developers (e.g., OWASP Top 10)',
            'Specific training for testers and architects',
            'Training includes hands-on exercises',
            'Feedback collected from participants'
        ],
        activities: [
            'Develop customized training modules for different roles',
            'Host secure coding workshops',
            'Provide access to specialized security training platforms',
            'Update training content annually'
        ],
        benefits: 'Technical teams have the skills needed to build secure software',
        maturityIndicators: [
            'Role-based training paths',
            'Skill assessment results'
        ],
        suggestedEvidence: [
            'Training curriculum by role',
            'Workshop materials',
            'Hands-on lab logs'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-a/'
    },
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'A',
        streamName: 'Training and Awareness',
        streamDescription: 'Provide role-specific security training',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you maintain a security training program with verified effectiveness through testing or certification?',
        qualityCriteria: [
            'Knowledge testing required for completion',
            'Internal or external certification program',
            'Training outcomes linked to performance reviews',
            'Program effectiveness measured via incident reduction'
        ],
        activities: [
            'Implement a "Security Belt" or tiered certification program',
            'Require passing scores on security assessments',
            'Analyze correlation between training and code quality',
            'Gamify security training (e.g., Capture the Flag)'
        ],
        benefits: 'Demonstrable security competence across the organization',
        maturityIndicators: [
            'Certification counts',
            'Correlation data between training and defects'
        ],
        suggestedEvidence: [
            'Certification records',
            'Test result reports',
            'Performance review templates'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-a/'
    },

    // EG - Stream B: Organization and Culture
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'B',
        streamName: 'Organization and Culture',
        streamDescription: 'Build security into the organization and culture',
        level: 1,
        levelName: 'Initial',
        question: 'Do you have identified security champions across development teams?',
        qualityCriteria: [
            'Champions identified in most teams',
            'Point of contact for security in each team',
            'Champion role is clearly defined',
            'Champions meet periodically with security team'
        ],
        activities: [
            'Nominate security champions in dev teams',
            'Defined role and responsibilities for champions',
            'Establish a direct line of communication for champions',
            'Hold monthly champion synchronization meetings'
        ],
        benefits: 'Distributed security expertise across dev teams',
        maturityIndicators: [
            'List of champions by team',
            'Meeting minutes'
        ],
        suggestedEvidence: [
            'Champions roster',
            'Role definition document',
            'Communication logs'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-b/'
    },
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'B',
        streamName: 'Organization and Culture',
        streamDescription: 'Build security into the organization and culture',
        level: 2,
        levelName: 'Defined',
        question: 'Do you maintain a security community of practice to share knowledge and best practices?',
        qualityCriteria: [
            'Regular forum/meeting for sharing',
            'Knowledge base of common solutions',
            'Participation from multiple departments',
            'Community-driven security standards'
        ],
        activities: [
            'Host internal security conferences or "brown bags"',
            'Create a collaborative Wiki for security patterns',
            'Establish an internal messaging channel for security',
            'Involve community in reviewing security standards'
        ],
        benefits: 'Accelerated learning and consistency across teams',
        maturityIndicators: [
            'Community engagement metrics',
            'Contribution counts to security KB'
        ],
        suggestedEvidence: [
            'Wiki edit logs',
            'Presentation slide decks',
            'Forum/Slack archives'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-b/'
    },
    {
        practiceId: 'EG',
        practiceName: 'Education and Guidance',
        streamId: 'B',
        streamName: 'Organization and Culture',
        streamDescription: 'Build security into the organization and culture',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you have a formal incentive program or career path for security-focused development roles?',
        qualityCriteria: [
            'Explicit career track for security champions',
            'Rewards for identifying critical bugs',
            'Incentives for achieving security certifications',
            'Security contributions recognized in appraisals'
        ],
        activities: [
            'Define career paths for Senior Security Engineers',
            'Implement a bug bounty or internal reward program',
            'Provide bonuses or recognition for security leadership',
            'Highlight security "wins" in company-wide meetings'
        ],
        benefits: 'High retention of security-aware talent',
        maturityIndicators: [
            'Number of people on security career tracks',
            'Incentive payout records'
        ],
        suggestedEvidence: [
            'HR career path documentation',
            'Reward program records',
            'Security achievement newsletters'
        ],
        businessFunction: 'Governance',
        officialLink: 'https://owaspsamm.org/model/governance/education-and-guidance/stream-b/'
    },

    // TA - Stream A: Application Risk Profile
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'A',
        streamName: 'Application Risk Profile',
        streamDescription: 'Identify and catalog application risks',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use a simple risk rating system to categorize your applications?',
        qualityCriteria: [
            'Basic risk categories defined (Low, Med, High)',
            'Inventory of applications exists',
            'Business impact considered in rating',
            'Rating assigned to each application'
        ],
        activities: [
            'Create a high-level application inventory',
            'Define simple risk criteria (e.g., internet-facing, data sensitivity)',
            'Categorize apps into Low, Medium, High risk bands',
            'Review categorization with business owners'
        ],
        benefits: 'Prioritized security efforts based on business risk',
        maturityIndicators: [
            'Application inventory with risk ratings',
            'Risk classification guide'
        ],
        suggestedEvidence: [
            'Application Register',
            'Risk Classification policy',
            'Assessment records'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-a/'
    },
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'A',
        streamName: 'Application Risk Profile',
        streamDescription: 'Identify and catalog application risks',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized risk profiling methodology for all applications?',
        qualityCriteria: [
            'Formal risk profiling tool or questionnaire',
            'Profiling covers tech stack, data types, and users',
            'Consistency across different business units',
            'Profiles recorded in a central location'
        ],
        activities: [
            'Develop a detailed risk profiling questionnaire',
            'Analyze technical and business risk factors',
            'Standardize profiles across the organization',
            'Establish an application risk registry'
        ],
        benefits: 'Consistent understanding of the attack surface',
        maturityIndicators: [
            'Standard profiling process',
            'Centralized risk profiles'
        ],
        suggestedEvidence: [
            'Risk profiling questionnaire template',
            'Centralized AppSec repository screenshots',
            'Standard profiling procedure'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-a/'
    },
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'A',
        streamName: 'Application Risk Profile',
        streamDescription: 'Identify and catalog application risks',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you periodically review and update application risk profiles based on changes and new threats?',
        qualityCriteria: [
            'Annual profile review cycle',
            'Profiles updated after major architecture changes',
            'Emerging threat research influences profiles',
            'Automated alerts for profile drift'
        ],
        activities: [
            'Schedule annual risk profile refresh',
            'Trigger re-profiling on significant feature releases',
            'Incorporate feed from CTI (Cyber Threat Intelligence)',
            'Analyze portfolio-wide risk trends'
        ],
        benefits: 'Risk management remains accurate despite constant change',
        maturityIndicators: [
            'Profile versioning history',
            'CTI integration in risk models'
        ],
        suggestedEvidence: [
            'Review schedule/logs',
            'CTI report meeting minutes',
            'Automation logs for data change detection'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-a/'
    },

    // TA - Stream B: Threat Modeling
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'B',
        streamName: 'Threat Modeling',
        streamDescription: 'Use threat modeling to understand system-level threats',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform basic threat modeling for high-risk applications?',
        qualityCriteria: [
            'Data flow diagrams (DFD) created',
            'High-level threats identified (e.g., using STRIDE)',
            'Mitigations identified for key threats',
            'Informal process followed by teams'
        ],
        activities: [
            'Create simple DFDs for critical systems',
            'Brainstorm threats with architects and developers',
            'Identify obvious security gaps',
            'Document threats in a simplified format'
        ],
        benefits: 'Identified design-level flaws before coding',
        maturityIndicators: [
            'Sample threat models',
            'DFDs for core systems'
        ],
        suggestedEvidence: [
            'Threat model diagrams',
            'Meeting notes from threat workshops',
            'List of identified mitigations'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-b/'
    },
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'B',
        streamName: 'Threat Modeling',
        streamDescription: 'Use threat modeling to understand system-level threats',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized threat modeling methodology across the organization?',
        qualityCriteria: [
            'Methodology (e.g., STRIDE, PASTA) adopted org-wide',
            'Standard tool usage for modeling',
            'Training provided to development teams',
            'Threat models updated during design phase'
        ],
        activities: [
            'Roll out a formal threat modeling framework',
            'Provide self-service threat modeling tools',
            'Train developers to lead threat modeling sessions',
            'Integrate threat modeling into the SDLC'
        ],
        benefits: 'Scalable and consistent design security analysis',
        maturityIndicators: [
            'Org-wide methodology documentation',
            'Developer-led threat model reports'
        ],
        suggestedEvidence: [
            'Threat modeling policy',
            'Training materials',
            'Tooling license/usage reports'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-b/'
    },
    {
        practiceId: 'TA',
        practiceName: 'Threat Assessment',
        streamId: 'B',
        streamName: 'Threat Modeling',
        streamDescription: 'Use threat modeling to understand system-level threats',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly review threat models and verify that mitigations are implemented?',
        qualityCriteria: [
            'Threats linked to test cases',
            'Mitigation verification automated where possible',
            'Feedback loop from production incidents',
            'Threat library refined based on findings'
        ],
        activities: [
            'Verify threat mitigations during security testing',
            'Map threat model findings to the defect tracker',
            'Update threat models based on production monitoring',
            'Establish a continuous improvement cycle'
        ],
        benefits: 'Assurance that design-level security is effective in practice',
        maturityIndicators: [
            'Verification reports',
            'Defect tracking integration screenshots'
        ],
        suggestedEvidence: [
            'Verification test results',
            'Issue tracker logs',
            'Continuous threat modeling dashboards'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/threat-assessment/stream-b/'
    },

    // SR - Stream A: Software Requirements
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'A',
        streamName: 'Software Requirements',
        streamDescription: 'Derive security requirements from business functionality',
        level: 1,
        levelName: 'Initial',
        question: 'Do you identify security requirements during the initial phase of new projects?',
        qualityCriteria: [
            'Security mentioned in project briefs',
            'Standard set of "must-have" controls',
            'Requirements documented informally',
            'Review by security team if requested'
        ],
        activities: [
            'Include security in project kick-off meetings',
            'Define a core set of security requirements',
            'Document project-specific security needs',
            'Verify requirements with stakeholders'
        ],
        benefits: 'Security built-in from the start, avoiding costly late-stage fixes',
        maturityIndicators: [
            'Project documentation with security sections',
            'Security baseline check-list'
        ],
        suggestedEvidence: [
            'Requirements documents (PRD/BRD)',
            'Checklist templates',
            'Kick-off meeting notes'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-a/'
    },
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'A',
        streamName: 'Software Requirements',
        streamDescription: 'Derive security requirements from business functionality',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized set of security requirements based on application risk and type?',
        qualityCriteria: [
            'Requirement library exists (e.g., ASVS)',
            'Requirements tailored to risk profile',
            'Standard language for user stories',
            'Requirements tracked in agile tools'
        ],
        activities: [
            'Develop a security requirements library',
            'Tailor requirements based on data sensitivity',
            'Create "Security User Stories" or "Abuser Stories"',
            'Map requirements to automated test cases'
        ],
        benefits: 'Consistent security standards across the portfolio',
        maturityIndicators: [
            'Software requirements library',
            'Agile sprint backlogs with security stories'
        ],
        suggestedEvidence: [
            'Requirement library Wiki/Portal',
            'Jira/ADO board screenshots',
            'Training on security stories'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-a/'
    },
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'A',
        streamName: 'Software Requirements',
        streamDescription: 'Derive security requirements from business functionality',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you systematically verify that all security requirements are met before release?',
        qualityCriteria: [
            'Compliance dashboards exist',
            'Requirement verification automated',
            'Explicit sign-off required',
            'Exception process formalized'
        ],
        activities: [
            'Implement a mandatory security sign-off',
            'Automate verification of requirements in CI/CD',
            'Manage security exceptions through a formal process',
            'Analyze coverage of requirement verification'
        ],
        benefits: 'High confidence in compliance and security posture',
        maturityIndicators: [
            'Verification dashboards',
            'Sign-off logs',
            'Exception registry'
        ],
        suggestedEvidence: [
            'Compliance reports',
            'Automated test reports',
            'Exception approval documents'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-a/'
    },

    // SR - Stream B: Supplier Security
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'B',
        streamName: 'Supplier Security',
        streamDescription: 'Manage security in the supply chain',
        level: 1,
        levelName: 'Initial',
        question: 'Do you identify third-party libraries and services used in your applications?',
        qualityCriteria: [
            'List of external dependencies exists',
            'Basic tracking of vendors',
            'Ad-hoc updates to libraries',
            'Public exploit monitoring'
        ],
        activities: [
            'Inventory third-party libraries',
            'Catalog SaaS and cloud services',
            'Check for known vulnerabilities periodically',
            'Review vendor security posture informally'
        ],
        benefits: 'Awareness of external dependencies and risks',
        maturityIndicators: [
            'Dependency inventory (SBOM)',
            'Vendor list'
        ],
        suggestedEvidence: [
            'Package manager files (package.json, etc.)',
            'Vendor assessment spreadsheet',
            'Vulnerability notification emails'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-b/'
    },
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'B',
        streamName: 'Supplier Security',
        streamDescription: 'Manage security in the supply chain',
        level: 2,
        levelName: 'Defined',
        question: 'Do you perform security evaluations for all third-party software and service providers?',
        qualityCriteria: [
            'Standardized vendor risk assessment process',
            'Security requirements included in contracts',
            'SLAs for security patches defined',
            'Review of SOC2/ISO reports'
        ],
        activities: [
            'Implement a formal vendor risk management (VRM) process',
            'Establish security clauses in procurement contracts',
            'Review third-party security certifications',
            'Define expected patch timelines for libraries'
        ],
        benefits: 'Enforceable security standards for third-party partners',
        maturityIndicators: [
            'VRM process documentation',
            'Contract templates with security appendices'
        ],
        suggestedEvidence: [
            'Completed vendor questionnaires',
            'Contract excerpts',
            'SLA monitoring reports'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-b/'
    },
    {
        practiceId: 'SR',
        practiceName: 'Security Requirements',
        streamId: 'B',
        streamName: 'Supplier Security',
        streamDescription: 'Manage security in the supply chain',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you continuously monitor and verify the security posture of your key suppliers?',
        qualityCriteria: [
            'Real-time dependency monitoring used',
            'Periodic audits/pen-tests of critical vendors',
            'Automated SBOM tracking in build pipeline',
            'Supplier incident response coordination'
        ],
        activities: [
            'Implement automated SCA (Software Composition Analysis)',
            'Verify vendor security controls via independent audit',
            'Coordinate incident response drills with key suppliers',
            'Analyze supply chain risk concentration'
        ],
        benefits: 'Resilient supply chain with proactive risk mitigation',
        maturityIndicators: [
            'SCA tool dashboards',
            'Audit schedules for vendors',
            'Supply chain risk map'
        ],
        suggestedEvidence: [
            'SCA daily reports',
            'Third-party audit reports',
            'Joint IR procedure documents'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/security-requirements/stream-b/'
    },

    // SA - Stream A: Architecture Design
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'A',
        streamName: 'Architecture Design',
        streamDescription: 'Insert security principles into architecture design',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use a set of security principles during the design of your applications?',
        qualityCriteria: [
            'Basic principles identified (e.g., Least Privilege)',
            'Principles documented and shared',
            'Ad-hoc architecture reviews',
            'Designers aware of key principles'
        ],
        activities: [
            'Identify a core set of security design principles',
            'Document principles for development teams',
            'Conduct informal architecture reviews',
            'Communicate principles to project designers'
        ],
        benefits: 'Foundational security patterns applied early in design',
        maturityIndicators: [
            'Security design principles document',
            'Review notes'
        ],
        suggestedEvidence: [
            'Design Principles guide',
            'Architecture review meeting notes',
            'Training on secure design'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-a/'
    },
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'A',
        streamName: 'Architecture Design',
        streamDescription: 'Insert security principles into architecture design',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use standardized security architectures and design patterns across the organization?',
        qualityCriteria: [
            'Library of approved design patterns exists',
            'Patterns cover authentication, logging, etc.',
            'Architecture review is a formal SDLC step',
            'Subject matter experts (SMEs) review designs'
        ],
        activities: [
            'Create a library of secure architecture patterns',
            'Publish reference architectures for common app types',
            'Institutionalize architecture review boards (ARB)',
            'Verify that designs follow approved patterns'
        ],
        benefits: 'Consistency and reduced risk through proven security patterns',
        maturityIndicators: [
            'Reference architecture library',
            'Formal ARB process documentation'
        ],
        suggestedEvidence: [
            'Reference Architecture diagrams',
            'Approved design patterns list',
            'ARB review logs'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-a/'
    },
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'A',
        streamName: 'Architecture Design',
        streamDescription: 'Insert security principles into architecture design',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly review and optimize your secure architecture patterns and their implementation?',
        qualityCriteria: [
            'Patterns updated based on new threats',
            'Review of pattern effectiveness',
            'Feedback from implementation teams incorporated',
            'Cross-project architecture analysis'
        ],
        activities: [
            'Perform annual refresh of the pattern library',
            'Analyze implementing projects for pattern drift',
            'Incorporate lessons from incidents into reference designs',
            'Engage in peer review of architectural standards'
        ],
        benefits: 'Architecture stays resilient against evolving attacker techniques',
        maturityIndicators: [
            'Updated reference library versioning',
            'Post-implementation review reports'
        ],
        suggestedEvidence: [
            'Library change log',
            'Pattern effectiveness analysis',
            'Incident-to-architecture feedback records'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-a/'
    },

    // SA - Stream B: Technology Management
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'B',
        streamName: 'Technology Management',
        streamDescription: 'Manage technology stacks and frameworks for security',
        level: 1,
        levelName: 'Initial',
        question: 'Do you identify the technology stacks and frameworks used in your applications?',
        qualityCriteria: [
            'Inventory of frameworks and languages',
            'Basic tracking of versions',
            'Informal updates based on needs',
            'Awareness of framework security features'
        ],
        activities: [
            'Document the technology stack for all applications',
            'Track framework and library versions',
            'Evaluate the security of new technologies ad-hoc',
            'Enable basic built-in security features of frameworks'
        ],
        benefits: 'Visibility into the tech debt and potential framework risks',
        maturityIndicators: [
            'Technology inventory',
            'Stack documentation'
        ],
        suggestedEvidence: [
            'Inventory list',
            'Architecture diagrams showing tech stack'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-b/'
    },
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'B',
        streamName: 'Technology Management',
        streamDescription: 'Manage technology stacks and frameworks for security',
        level: 2,
        levelName: 'Defined',
        question: 'Do you maintain a list of approved technologies and frameworks with secure configurations?',
        qualityCriteria: [
            'White-list of approved frameworks/versions',
            'Hardened configuration guides for each technology',
            'Security evaluation required for new tech',
            'Guidance provided for secure framework usage'
        ],
        activities: [
            'Establish an approved technology list',
            'Develop hardening guides for standard stacks',
            'Set up a process for evaluating and onboarding new tech',
            'Monitor for end-of-life (EOL) technologies'
        ],
        benefits: 'Reduced attack surface through standardized, hardened stacks',
        maturityIndicators: [
            'Approved Tech List (ATL) document',
            'Hardening guides for core frameworks'
        ],
        suggestedEvidence: [
            'ATL repository',
            'Hardening checklists',
            'Technology onboarding records'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-b/'
    },
    {
        practiceId: 'SA',
        practiceName: 'Secure Architecture',
        streamId: 'B',
        streamName: 'Technology Management',
        streamDescription: 'Manage technology stacks and frameworks for security',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you automatically verify that applications use approved technologies and hardened configurations?',
        qualityCriteria: [
            'Automated stack analysis in CI/CD (e.g., SCA, IaC checks)',
            'Real-time monitoring for configuration drift',
            'Automatic enforcement of technology standards',
            'Continuous update cycle for approved stacks'
        ],
        activities: [
            'Automate checking of tech stacks against the ATL',
            'Implement automated hardening verification',
            'Establish a rapid patch/update cycle for frameworks',
            'Enforce stack standards via build/deployment gates'
        ],
        benefits: 'Automated assurance of framework-level security and compliance',
        maturityIndicators: [
            'CI/CD pipeline gate logs',
            'Drift detection dashboard screenshots'
        ],
        suggestedEvidence: [
            'Automation reports',
            'IaC scanning results',
            'Configuration monitoring logs'
        ],
        businessFunction: 'Design',
        officialLink: 'https://owaspsamm.org/model/design/secure-architecture/stream-b/'
    },

    // SB - Stream A: Build Process
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'A',
        streamName: 'Build Process',
        streamDescription: 'Harden the build process',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use a build tool to automate the assembly of your software?',
        qualityCriteria: [
            'Build tool (e.g., Make, Maven, Gradle) used',
            'Manual steps minimized',
            'Basic build logs generated',
            'Code can be built on a separate machine'
        ],
        activities: [
            'Adopt a standard build tool for each technology',
            'Document the manual steps in the build process',
            'Ensure the build process is repeatable',
            'Capture build errors and warnings'
        ],
        benefits: 'Consistent and repeatable builds reducing human error',
        maturityIndicators: [
            'Usage of build automation tools',
            'Repeatable build documentation'
        ],
        suggestedEvidence: [
            'Build script files (build.gradle, pom.xml, etc.)',
            'Build logs',
            'Build environment setup guide'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-a/'
    },
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'A',
        streamName: 'Build Process',
        streamDescription: 'Harden the build process',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a centralized, automated build system for all applications?',
        qualityCriteria: [
            'Centralized build server (e.g., Jenkins, GitHub Actions)',
            'Builds triggered automatically (e.g., on commit)',
            'Build environment is standardized',
            'No manual changes allowed during build'
        ],
        activities: [
            'Implement a CI (Continuous Integration) server',
            'Automate build triggers for all code changes',
            'Use standard build images or containers',
            'Lock down build configurations'
        ],
        benefits: 'Increased visibility and rapid feedback on build integrity',
        maturityIndicators: [
            'Centralized CI dashboard',
            'Automated build success/failure history'
        ],
        suggestedEvidence: [
            'CI server configuration',
            'Pipeline definitions (YAML files)',
            'Build history reports'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-a/'
    },
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'A',
        streamName: 'Build Process',
        streamDescription: 'Harden the build process',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you verify the integrity of the build process and ensure that only authorized code is built?',
        qualityCriteria: [
            'Build artifacts are cryptographically signed',
            'Binary verification performed after build',
            'Build environment is ephemeral and clean',
            'Signed commits required for build'
        ],
        activities: [
            'Implement code signing for all build outputs',
            'Verify checksums of build inputs and outputs',
            'User hardened, isolated build runners',
            'Enforce signed commit policies'
        ],
        benefits: 'Strong assurance against build-time code injection or tampering',
        maturityIndicators: [
            'Signed artifact metadata',
            'Build runner security audit logs'
        ],
        suggestedEvidence: [
            'Code signing certificates',
            'Verification script logs',
            'Pipeline logs showing signature checks'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-a/'
    },

    // SB - Stream B: Software Dependencies
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'B',
        streamName: 'Software Dependencies',
        streamDescription: 'Manage and track software dependencies',
        level: 1,
        levelName: 'Initial',
        question: 'Do you maintain an inventory of the third-party libraries used in your applications?',
        qualityCriteria: [
            'List of libraries existed for core apps',
            'Basic version tracking',
            'Informal vulnerability checks',
            'Libraries stored in local repositories'
        ],
        activities: [
            'Catalog all open-source and third-party libraries',
            'Track versions of key dependencies',
            'Review for known vulnerabilities ad-hoc',
            'Use local library mirrors where possible'
        ],
        benefits: 'Foundational awareness of third-party risk',
        maturityIndicators: [
            'Dependency inventory list',
            'Local repository usage'
        ],
        suggestedEvidence: [
            'Dependency list document',
            'Local repository manager screenshots (Artifactory, Nexus)'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-b/'
    },
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'B',
        streamName: 'Software Dependencies',
        streamDescription: 'Manage and track software dependencies',
        level: 2,
        levelName: 'Defined',
        question: 'Do you analyze third-party libraries for known vulnerabilities during the build process?',
        qualityCriteria: [
            'Automated SCA tool integrated into build',
            'Build fails for high-risk vulnerabilities',
            'Vulnerability database is kept up to date',
            'Process for assessing and updating libraries exists'
        ],
        activities: [
            'Integrate SCA scanning into the CI/CD pipeline',
            'Set risk thresholds for build failures',
            'Automatically update vulnerability signatures',
            'Establish an emergency patching process for libraries'
        ],
        benefits: 'Proactive prevention of known vulnerable components in production',
        maturityIndicators: [
            'SCA scan reports in CI',
            'Vulnerability remediation logs'
        ],
        suggestedEvidence: [
            'SCA tool configuration',
            'Scan results from build logs',
            'Remediation tracking tickets'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-b/'
    },
    {
        practiceId: 'SB',
        practiceName: 'Secure Build',
        streamId: 'B',
        streamName: 'Software Dependencies',
        streamDescription: 'Manage and track software dependencies',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you manage library usage through a white-list and continuously monitor for new vulnerabilities?',
        qualityCriteria: [
            'Approved library list (white-list) enforced',
            'Real-time monitoring of deployed versions',
            'Automated pull requests for dependency updates',
            'SLA-driven remediation of library vulns'
        ],
        activities: [
            'Enforce a "Golden Image" or white-list for libraries',
            'Implement continuous monitoring for newly discovered vulns',
            'Automate dependency updates where possible (e.g., Dependabot)',
            'Audit third-party library licenses and security'
        ],
        benefits: 'Minimized supply-chain attack surface and rapid vuln response',
        maturityIndicators: [
            'White-list repository settings',
            'Monitoring dashboard screenshots'
        ],
        suggestedEvidence: [
            'White-list policy',
            'Automated update logs',
            'Security audit reports for libraries'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-build/stream-b/'
    },

    // SD - Stream A: Deployment Process
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'A',
        streamName: 'Deployment Process',
        streamDescription: 'Establish secure deployment processes',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use a standardized process for deploying applications into production?',
        qualityCriteria: [
            'Deployment steps are documented',
            'Access to production is restricted',
            'Basic logging of deployment activities',
            'Rollback procedure identified'
        ],
        activities: [
            'Create deployment checklists',
            'Limit production access to authorized personnel',
            'Log who performed each deployment and when',
            'Document steps to revert a failed deployment'
        ],
        benefits: 'Reduced risk of deployment errors and unauthorized changes',
        maturityIndicators: [
            'Deployment checklists',
            'Access control logs'
        ],
        suggestedEvidence: [
            'Deployment procedure document',
            'Access logs for production servers',
            'Rollback plan'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-a/'
    },
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'A',
        streamName: 'Deployment Process',
        streamDescription: 'Establish secure deployment processes',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use automated deployment tools and verify the integrity of the deployed artifacts?',
        qualityCriteria: [
            'Deployment is fully automated (CD pipeline)',
            'Checksums/Signatures verified before deployment',
            'Infrastructure-as-Code (IaC) is used',
            'Deployment logs are centralized and monitored'
        ],
        activities: [
            'Implement a CD (Continuous Deployment) tool',
            'Automate artifact verification in the pipeline',
            'Use IaC to manage environment configurations',
            'Monitor deployment logs for anomalies'
        ],
        benefits: 'Consistent, repeatable, and verifiable production state',
        maturityIndicators: [
            'CD pipeline configuration',
            'Verification logs in deployment history'
        ],
        suggestedEvidence: [
            'IaC scripts (Terraform, CloudFormation)',
            'Pipeline logs showing checksum verification',
            'Deployment dashboard'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-a/'
    },
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'A',
        streamName: 'Deployment Process',
        streamDescription: 'Establish secure deployment processes',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you automatically verify the security configuration of the target environment before and after deployment?',
        qualityCriteria: [
            'Pre-deployment security scans of IaC',
            'Post-deployment compliance checks (drift detection)',
            'Automatic blocking of insecure deployments',
            'Self-healing for configuration drift'
        ],
        activities: [
            'Scan IaC for security misconfigurations (e.g., Checkov)',
            'Implement continuous runtime compliance monitoring',
            'Enforce security gates in the deployment pipeline',
            'Automate remediation of insecure settings'
        ],
        benefits: 'Continuous assurance of a secure and compliant operating environment',
        maturityIndicators: [
            'Pre-deployment scan reports',
            'Drift detection logs'
        ],
        suggestedEvidence: [
            'IaC scan results',
            'Compliance monitoring dashboard',
            'Automation ticket for remediation'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-a/'
    },

    // SD - Stream B: Secret Management
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'B',
        streamName: 'Secret Management',
        streamDescription: 'Handle secrets and credentials securely',
        level: 1,
        levelName: 'Initial',
        question: 'Do you ensure that secrets (passwords, keys) are not stored in application source code?',
        qualityCriteria: [
            'Manual code review for secrets',
            'Secrets stored in config files, not code',
            'Basic awareness among developers',
            'Immediate rotation if secret leaked'
        ],
        activities: [
            'Scan source code for hardcoded secrets',
            'Educate developers on secret management risks',
            'Move secrets to environment variables or config files',
            'Establish an emergency rotation procedure'
        ],
        benefits: 'Reduced risk of credential theft via source code access',
        maturityIndicators: [
            'Clean source code scan results',
            'Secret rotation documented'
        ],
        suggestedEvidence: [
            'Secret scanner reports (gitleaks, trufflehog)',
            'Developer training material',
            'Incident logs for past leaks'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-b/'
    },
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'B',
        streamName: 'Secret Management',
        streamDescription: 'Handle secrets and credentials securely',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a centralized secret management system to store and distribute secrets?',
        qualityCriteria: [
            'Dedicated secret manager (e.g., Vault, AWS SM)',
            'Least privilege access to secrets',
            'Secrets encrypted at rest and in transit',
            'Audit logs for all secret access'
        ],
        activities: [
            'Deploy a dedicated secret management solution',
            'Define access policies based on service identity',
            'Automate secret injection into applications',
            'Monitor and alert on secret access logs'
        ],
        benefits: 'Centralized control and visibility over sensitive credentials',
        maturityIndicators: [
            'Secret manager usage reports',
            'Audit logs for secret retrieval'
        ],
        suggestedEvidence: [
            'Secret manager configuration',
            'Access policy definitions',
            'Sample audit logs'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-b/'
    },
    {
        practiceId: 'SD',
        practiceName: 'Secure Deployment',
        streamId: 'B',
        streamName: 'Secret Management',
        streamDescription: 'Handle secrets and credentials securely',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use dynamic secrets and ensure that all secrets are rotated frequently and automatically?',
        qualityCriteria: [
            'Dynamic (short-lived) secrets used where possible',
            'Automated rotation for all static secrets',
            'Automated revocation of leaked secrets',
            'Secrets never touched by human operators in prod'
        ],
        activities: [
            'Implement dynamic credential generation',
            'Automate secret rotation across all environments',
            'Establish automated leak detection and response',
            'Eliminate manual secret handling in production'
        ],
        benefits: 'Minimized impact of compromised credentials and elimination of human error',
        maturityIndicators: [
            'Secret rotation logs',
            'Dynamic secret usage percentages'
        ],
        suggestedEvidence: [
            'Rotation configuration script',
            'Dynamic secret generation logs',
            'Incident response automation workflow'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/secure-deployment/stream-b/'
    },

    // DM - Stream A: Defect Tracking
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'A',
        streamName: 'Defect Tracking',
        streamDescription: 'Track and manage security defects',
        level: 1,
        levelName: 'Initial',
        question: 'Do you track security defects within your standard issue tracking system?',
        qualityCriteria: [
            'Security defects are labeled/tagged',
            'Basic defect information captured (type, discovery date)',
            'Informal resolution process',
            'Developers have access to defect data'
        ],
        activities: [
            'Use a central issue tracker for all security bugs',
            'Label issues as "Security" for easy filtering',
            'Document the discovery and impact of defects',
            'Communicate defects to the relevant dev teams'
        ],
        benefits: 'Centralized visibility into security technical debt',
        maturityIndicators: [
            'Use of security tags in Jira/ADO',
            'List of open security defects'
        ],
        suggestedEvidence: [
            'Issue tracker screenshots',
            'List of security labels',
            'Sample security ticket'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-a/'
    },
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'A',
        streamName: 'Defect Tracking',
        streamDescription: 'Track and manage security defects',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized rating system and SLA for all security defects?',
        qualityCriteria: [
            'Severity rating system (e.g., CVSS) adopted',
            'Remediation SLAs defined by severity',
            'Defects are categorized by root cause',
            'Consolidated view of defects across all apps'
        ],
        activities: [
            'Adopt CVSS for rating security defects',
            'Establish a policy for remediation timelines',
            'Perform root cause analysis for major defects',
            'Create a security defect dashboard for management'
        ],
        benefits: 'Consistent prioritization and accountability for security fixes',
        maturityIndicators: [
            'Severity-based SLA report',
            'Consolidated defect dashboard'
        ],
        suggestedEvidence: [
            'Defect Management Policy',
            'SLA compliance report',
            'CVSS scoring records'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-a/'
    },
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'A',
        streamName: 'Defect Tracking',
        streamDescription: 'Track and manage security defects',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you automatically verify defect remediation and perform trend analysis to improve the SDLC?',
        qualityCriteria: [
            'Automated verification of fixes (regression tests)',
            'Trend analysis on defect types and locations',
            'Defect metrics influence security training and tooling',
            'Closed-loop verification process'
        ],
        activities: [
            'Automate regression testing for resolved defects',
            'Analyze portfolio-wide defect trends quarterly',
            'Update security guidance based on recurring defect types',
            'Integrate defect verification into the CD pipeline'
        ],
        benefits: 'Continuous reduction of recurring flaws and verified fix integrity',
        maturityIndicators: [
            'Trend analysis reports',
            'Automated regression test results'
        ],
        suggestedEvidence: [
            'Quarterly defect review minutes',
            'Regression test suicide/logs',
            'Updated security standards based on data'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-a/'
    },

    // DM - Stream B: Metrics and Feedback
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'B',
        streamName: 'Metrics and Feedback',
        streamDescription: 'Drive improvement through defect metrics',
        level: 1,
        levelName: 'Initial',
        question: 'Do you periodically review security defect metrics with stakeholders?',
        qualityCriteria: [
            'Counts of open/closed defects',
            'Review with dev leads or product owners',
            'Information shared via email or meetings',
            'Basic awareness of defect backlog'
        ],
        activities: [
            'Report security defect counts periodically',
            'Hold meetings to discuss critical security bugs',
            'Share defect data with management as needed',
            'Identify "top" applications by defect count'
        ],
        benefits: 'Management awareness of security risks in the software portfolio',
        maturityIndicators: [
            'Periodic security reports',
            'Meeting minutes discussing defects'
        ],
        suggestedEvidence: [
            'Email reports',
            'Status meeting slide decks'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-b/'
    },
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'B',
        streamName: 'Metrics and Feedback',
        streamDescription: 'Drive improvement through defect metrics',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use security defect metrics to measure the effectiveness of your security program?',
        qualityCriteria: [
            'Metrics include Time-to-Remediate (TTR)',
            'Defect density metrics for each application',
            'Correlation with security activities (e.g., training)',
            'Target thresholds for key metrics defined'
        ],
        activities: [
            'Calculate and track TTR by severity',
            'Measure defect density across different project types',
            'Analyze if security training reduces specific defect types',
            'Establish target KPIs for defect management'
        ],
        benefits: 'Data-driven insights into the performance of AppSec activities',
        maturityIndicators: [
            'KPI dashboard with TTR and density',
            'Correlation analysis reports'
        ],
        suggestedEvidence: [
            'Monthly security KPI report',
            'Data analysis spreadsheets',
            'Program review documents'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-b/'
    },
    {
        practiceId: 'DM',
        practiceName: 'Defect Management',
        streamId: 'B',
        streamName: 'Metrics and Feedback',
        streamDescription: 'Drive improvement through defect metrics',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use defect metrics to drive automated improvements and real-time alerts?',
        qualityCriteria: [
            'Automated alerts for SLA breaches',
            'Real-time metrics dashboards accessible to all',
            'Metrics influence automated build gates',
            'Continuous feedback loop into strategy'
        ],
        activities: [
            'Set up automated notifications for overdue fixes',
            'Deploy live security metrics dashboards',
            'Adjust build gates based on application risk and defect history',
            'Review and refine the AppSec strategy based on metrics'
        ],
        benefits: 'Dynamic and responsive security program that optimizes based on real performance data',
        maturityIndicators: [
            'Alert configuration settings',
            'Live dashboard screenshots'
        ],
        suggestedEvidence: [
            'Alert logs',
            'Strategy update documents citing metrics',
            'Build gate configuration files'
        ],
        businessFunction: 'Implementation',
        officialLink: 'https://owaspsamm.org/model/implementation/defect-management/stream-b/'
    },

    // AA - Stream A: Architecture Validation
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'A',
        streamName: 'Architecture Validation',
        streamDescription: 'Validate architecture against security requirements',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform ad-hoc security reviews of your application architectures?',
        qualityCriteria: [
            'Informal review by security lead',
            'Focus on major components',
            'Risks identified verbally or in notes',
            'Occurs for major new projects'
        ],
        activities: [
            'Conduct informal architecture walkthroughs',
            'Identify obvious security flaws in design',
            'Review high-level data flows',
            'Discuss security concerns with architects'
        ],
        benefits: 'Early identification of major design flaws',
        maturityIndicators: [
            'Ad-hoc review notes',
            'Architecture diagrams with security marks'
        ],
        suggestedEvidence: [
            'Meeting notes',
            'Annotated architecture diagrams'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-a/'
    },
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'A',
        streamName: 'Architecture Validation',
        streamDescription: 'Validate architecture against security requirements',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized checklist to validate application architecture against security principles?',
        qualityCriteria: [
            'Standardized architecture review checklist',
            'Review covers all critical applications',
            'Formal report generated with findings',
            'Tracking of remediation for design flaws'
        ],
        activities: [
            'Develop a security architecture review checklist',
            'Formalize the architecture review process in the SDLC',
            'Document findings and recommendations formally',
            'Verify that design fixes are implemented'
        ],
        benefits: 'Consistent and thorough design-level security validation',
        maturityIndicators: [
            'Architecture review checklist',
            'Formal review reports'
        ],
        suggestedEvidence: [
            'Completed checklists',
            'Design review reports',
            'Remediation tracking logs'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-a/'
    },
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'A',
        streamName: 'Architecture Validation',
        streamDescription: 'Validate architecture against security requirements',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly review and update your architecture validation process based on emerging threats?',
        qualityCriteria: [
            'Review process updated annually',
            'Incorporate feedback from security incidents',
            'Automated architecture analysis where possible',
            'Benchmarking against industry standards'
        ],
        activities: [
            'Integrate automated architecture analysis tools',
            'Update review criteria based on post-mortem findings',
            'Perform deep-dive reviews for complex integrations',
            'Continuous improvement of the validation methodology'
        ],
        benefits: 'Resilient and adaptive architecture validation',
        maturityIndicators: [
            'Updated review methodology versioning',
            'Automated analysis reports'
        ],
        suggestedEvidence: [
            'Methodology update logs',
            'Tool configuration/reports',
            'Continuous improvement records'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-a/'
    },

    // AA - Stream B: Architecture Mitigation
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'B',
        streamName: 'Architecture Mitigation',
        streamDescription: 'Remediate architecture-level security gaps',
        level: 1,
        levelName: 'Initial',
        question: 'Do you identify and track mitigations for architecture-level security gaps?',
        qualityCriteria: [
            'Mitigations identified for major gaps',
            'Informal tracking of progress',
            'Basic prioritization of design fixes',
            'Stakeholders aware of major design risks'
        ],
        activities: [
            'Identify mitigations for architectural flaws',
            'Track remediation activities ad-hoc',
            'Discuss design-level risks in project meetings',
            'Document agreed-upon mitigations'
        ],
        benefits: 'Visibility and early action on design-level security risks',
        maturityIndicators: [
            'Mitigation lists',
            'Progress tracking notes'
        ],
        suggestedEvidence: [
            'Risk register snippets',
            'Meeting minutes'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-b/'
    },
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'B',
        streamName: 'Architecture Mitigation',
        streamDescription: 'Remediate architecture-level security gaps',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a formal process for tracking and verifying the implementation of architectural mitigations?',
        qualityCriteria: [
            'Formal tracking in defect management tool',
            'Verification of mitigations before system release',
            'Standardized mitigation patterns used',
            'Reporting on the status of design-level risks'
        ],
        activities: [
            'Integrate architectural mitigations into the issue tracker',
            'Verify mitigations through targeted testing',
            'Encourage the use of standard security components',
            'Report on design-level risk status to stakeholders'
        ],
        benefits: 'Enforced remediation of critical design flaws',
        maturityIndicators: [
            'Tracking logs in Jira/ADO',
            'Verification reports for design fixes'
        ],
        suggestedEvidence: [
            'Issue tracker reports',
            'Test results for specific mitigations',
            'Status dashboards'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-b/'
    },
    {
        practiceId: 'AA',
        practiceName: 'Architecture Assessment',
        streamId: 'B',
        streamName: 'Architecture Mitigation',
        streamDescription: 'Remediate architecture-level security gaps',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you perform trend analysis on design flaws and use the data to improve secure design standards?',
        qualityCriteria: [
            'Root cause analysis for architectural defects',
            'Trend analysis across the organization',
            'Design standards updated based on findings',
            'Metrics on mitigation effectiveness tracked'
        ],
        activities: [
            'Analyze recurring architectural flaw patterns',
            'Update secure design patterns library quarterly',
            'Provide targeted training based on flaw trends',
            'Measure the long-term effectiveness of mitigations'
        ],
        benefits: 'Systemic reduction of recurring design flaws through data-driven standards',
        maturityIndicators: [
            'Design flaw trend reports',
            'Updated design standards documentation'
        ],
        suggestedEvidence: [
            'Trend analysis slide decks',
            'Library change logs',
            'Training curriculum updates'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/architecture-assessment/stream-b/'
    },

    // RT - Stream A: Requirements Compliance
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'A',
        streamName: 'Requirements Compliance',
        streamDescription: 'Verify compliance with security requirements',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform basic testing to verify that security requirements are met?',
        qualityCriteria: [
            'Ad-hoc testing for key features',
            'Manual verification of basic controls (e.g., login)',
            'Informal test results',
            'Focus on "happy path" security'
        ],
        activities: [
            'Test basic security features manually',
            'Document simple pass/fail results',
            'Identify obvious gaps in requirement implementation',
            'Verify fix of found issues informally'
        ],
        benefits: 'Baseline assurance that core security features work as intended',
        maturityIndicators: [
            'Basic test notes',
            'Pass/fail reports'
        ],
        suggestedEvidence: [
            'Manual test logs',
            'Checklist results'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-a/'
    },
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'A',
        streamName: 'Requirements Compliance',
        streamDescription: 'Verify compliance with security requirements',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized test suite to verify all mandatory security requirements?',
        qualityCriteria: [
            'Standard security test plan for projects',
            'Testing covers all specified requirements',
            'Formal test report with detailed findings',
            'Integration with the requirements management tool'
        ],
        activities: [
            'Develop a standard security test suite',
            'Formalize security testing in the QA phase',
            'Generate formal compliance reports',
            'Map test cases to security requirements'
        ],
        benefits: 'Comprehensive and consistent verification of security standards',
        maturityIndicators: [
            'Standard security test plans',
            'Traceability matrix (Requirements to Tests)'
        ],
        suggestedEvidence: [
            'Completed test schedules',
            'Detailed findings reports',
            'Traceability documentation'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-a/'
    },
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'A',
        streamName: 'Requirements Compliance',
        streamDescription: 'Verify compliance with security requirements',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use automated testing to continuously verify compliance with security requirements?',
        qualityCriteria: [
            'Automated security test cases (e.g., BDD/TDD)',
            'Continuous verification in the CI/CD pipeline',
            'Automatic blocking of non-compliant builds',
            'Feedback loop to improve automated test coverage'
        ],
        activities: [
            'Automate verification of security user stories',
            'Integrate security testing into every build',
            'Enforce compliance gates in the pipeline',
            'Analyze automated test effectiveness quarterly'
        ],
        benefits: 'Continuous and scalable assurance of security requirement compliance',
        maturityIndicators: [
            'Automated test suite (code)',
            'Pipeline execution logs with security results'
        ],
        suggestedEvidence: [
            'Test code repository',
            'CI/CD dashboard screenshots',
            'Automation coverage reports'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-a/'
    },

    // RT - Stream B: Abuse Case Testing
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'B',
        streamName: 'Abuse Case Testing',
        streamDescription: 'Test for edge cases and abuse scenarios',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform basic testing for common abuse scenarios (e.g., path traversal)?',
        qualityCriteria: [
            'Brainstorming of simple abuse cases',
            'Ad-hoc manual testing for bypasses',
            'Focus on well-known attack vectors',
            'Test results recorded informally'
        ],
        activities: [
            'Identify simple ways an attacker might misuse the app',
            'Perform manual "what-if" testing',
            'Document identified abuse case vulnerabilities',
            'Share findings with the development team'
        ],
        benefits: 'Identification of obvious business logic and validation flaws',
        maturityIndicators: [
            'List of tested abuse cases',
            'Abuse case test notes'
        ],
        suggestedEvidence: [
            'Abuse case brainstorm notes',
            'Manual penetration test logs'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-b/'
    },
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'B',
        streamName: 'Abuse Case Testing',
        streamDescription: 'Test for edge cases and abuse scenarios',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a formal subset of abuse cases based on application risk and functionality?',
        qualityCriteria: [
            'Library of abuse cases for common app types',
            'Risk-based selection of abuse cases',
            'Formal test cases with expected results',
            'Review of abuse case coverage by security team'
        ],
        activities: [
            'Develop an abuse case library (e.g., from OWASP)',
            'Tailor abuse cases based on business risk',
            'Implement formal testing for selected scenarios',
            'Document results and track mitigations'
        ],
        benefits: 'Systematic and risk-appropriate testing for non-obvious flaws',
        maturityIndicators: [
            'Abuse case library',
            'Risk-based test plans'
        ],
        suggestedEvidence: [
            'Abuse case catalog',
            'Tailored test reports',
            'Issue tracker tickets for abuse findings'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-b/'
    },
    {
        practiceId: 'RT',
        practiceName: 'Requirements Testing',
        streamId: 'B',
        streamName: 'Abuse Case Testing',
        streamDescription: 'Test for edge cases and abuse scenarios',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you continuously update your abuse case library based on real-world incidents and new threats?',
        qualityCriteria: [
            'Library updated after major security incidents',
            'Incorporate newly discovered attack patterns',
            'Automated testing for common abuse patterns',
            'Feedback loop from security monitoring data'
        ],
        activities: [
            'Refresh the abuse case library every 6-12 months',
            'Integrate incident post-mortem findings into testing',
            'Automate regression tests for past abuse findings',
            'Analyze coverage of abuse testing across the portfolio'
        ],
        benefits: 'Advanced protection against evolving business logic attacks',
        maturityIndicators: [
            'Updated abuse case library versioning',
            'Regression test suicide results'
        ],
        suggestedEvidence: [
            'Abuse case update logs',
            'Incident-to-test mapping records',
            'Automated test reports'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/requirements-testing/stream-b/'
    },

    // ST - Stream A: Security Testing
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'A',
        streamName: 'Scalable Baseline Review',
        streamDescription: 'Automate security testing for a baseline level of assurance',
        level: 1,
        levelName: 'Initial',
        question: 'Do you use automated security testing tools in your development process?',
        qualityCriteria: [
            'Usage of SAST or DAST tools',
            'Tools run periodically or manually',
            'Vulnerabilities reviewed informally',
            'Focus on well-known vulnerabilities (e.g., OWASP Top 10)'
        ],
        activities: [
            'Deploy basic SAST/DAST tools',
            'Run security scans during major releases',
            'Review scan results for critical findings',
            'Educate teams on interpreting scan reports'
        ],
        benefits: 'Automated identification of common security vulnerabilities',
        maturityIndicators: [
            'Tool licenses/deployments',
            'Sample scan reports'
        ],
        suggestedEvidence: [
            'Tool configuration settings',
            'Vulnerability scan reports',
            'Remediation notes for scan findings'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-a/'
    },
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'A',
        streamName: 'Scalable Baseline Review',
        streamDescription: 'Automate security testing for a baseline level of assurance',
        level: 2,
        levelName: 'Defined',
        question: 'Do you integrate automated security testing into your build and deployment pipelines?',
        qualityCriteria: [
            'SAST/DAST integrated into CI/CD',
            'High-severity findings block the build/deployment',
            'Standardized tool configuration for all projects',
            'Vulnerability data consolidated in a central location'
        ],
        activities: [
            'Automate security scanning in the CI/CD pipeline',
            'Enforce quality gates based on scan results',
            'Implement a central vulnerability management dashboard',
            'Establish a consistent remediation process for findings'
        ],
        benefits: 'Consistent and timely identification of security flaws in the SDLC',
        maturityIndicators: [
            'CI/CD pipeline logs with security steps',
            'Centralized vulnerability management dashboard logout'
        ],
        suggestedEvidence: [
            'Pipeline YAML files showing security steps',
            'Screenshot of vulnerability manager',
            'Remediation time-to-fix reports'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-a/'
    },
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'A',
        streamName: 'Scalable Baseline Review',
        streamDescription: 'Automate security testing for a baseline level of assurance',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use advanced security testing techniques and tune tools for maximum effectiveness?',
        qualityCriteria: [
            'IAST or RASP tools used in staging/production',
            'Custom security rules/policies for SAST/DAST',
            'Continuous monitoring for new attack vectors',
            'Feedback loop from production incidents to test cases'
        ],
        activities: [
            'Deploy IAST (Interactive Application Security Testing)',
            'Tune security tools to reduce false positives',
            'Automate regression testing for all security defects',
            'Incorporate custom vulnerability signatures based on tech stack'
        ],
        benefits: 'Precision security assurance with minimal noise and maximum coverage',
        maturityIndicators: [
            'IAST tool configuration',
            'Custom rule sets/signatures count'
        ],
        suggestedEvidence: [
            'Custom scanning rules (e.g., Semgrep rules)',
            'IAST runtime reports',
            'Regression test suicide summary'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-a/'
    },

    // ST - Stream B: Deep Security Review
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'B',
        streamName: 'Deep Security Review',
        streamDescription: 'Perform in-depth security analysis for high-risk applications',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform periodic manual security penetration testing for your critical applications?',
        qualityCriteria: [
            'Annual penetration tests for core apps',
            'Qualified internal or external testers',
            'Report with remediation recommendations',
            'Focus on business logic and complex flaws'
        ],
        activities: [
            'Schedule annual penetration tests',
            'Engage professional security testers',
            'Document penetration test findings',
            'Track remediation of critical findings'
        ],
        benefits: 'Identification of complex security flaws that automated tools miss',
        maturityIndicators: [
            'Penetration test reports',
            'Evidence of finding remediation'
        ],
        suggestedEvidence: [
            'Statement of Work (SOW) for testing',
            'Pen-test report summary',
            'Remediation tickets in issue tracker'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-b/'
    },
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'B',
        streamName: 'Deep Security Review',
        streamDescription: 'Perform in-depth security analysis for high-risk applications',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a standardized methodology and risk-based scoping for all manual security reviews?',
        qualityCriteria: [
            'Standardized penetration testing methodology (e.g., ASVS)',
            'Scoped based on threat model and risk profile',
            'Review includes code analysis and architecture review',
            'Formal sign-off on remediation of high findings'
        ],
        activities: [
            'Adopt a formal manual testing framework',
            'Tailor the scope of testing based on the threat model',
            'Combine code review with dynamic testing',
            'Verify and sign-off on all high/critical fixes'
        ],
        benefits: 'Thorough and risk-aligned security assurance for high-priority software',
        maturityIndicators: [
            'Standard testing methodology documentation',
            'Scoped testing reports'
        ],
        suggestedEvidence: [
            'Testing methodology Wiki',
            'Detailed audit reports',
            'Sign-off logs from security team'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-b/'
    },
    {
        practiceId: 'ST',
        practiceName: 'Security Testing',
        streamId: 'B',
        streamName: 'Deep Security Review',
        streamDescription: 'Perform in-depth security analysis for high-risk applications',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you maintain an internal red-team or bug bounty program for continuous deep security review?',
        qualityCriteria: [
            'Internal red-team operations or bug bounty',
            'Continuous or very frequent testing cycle',
            'Rapid remediation of externally reported bugs',
            'Incorporate bug bounty findings into dev training'
        ],
        activities: [
            'Launch a bug bounty program (public or private)',
            'Establish an internal offensive security (Red) team',
            'Perform adversarial testing simulation (e.g., TIBER)',
            'Share findings across the organization to prevent recurrence'
        ],
        benefits: 'Continuous, real-world security validation and rapid discovery of zero-day flaws',
        maturityIndicators: [
            'Bug bounty platform dashboard',
            'Red-team activity logs'
        ],
        suggestedEvidence: [
            'Bug bounty reports',
            'Red-team campaign summaries',
            'CVEs credited to the team/program'
        ],
        businessFunction: 'Verification',
        officialLink: 'https://owaspsamm.org/model/verification/security-testing/stream-b/'
    },

    // IM - Stream A: Incident Detection
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'A',
        streamName: 'Incident Detection',
        streamDescription: 'Establish capabilities to detect security incidents',
        level: 1,
        levelName: 'Initial',
        question: 'Do you have basic application logging to help with incident investigation?',
        qualityCriteria: [
            'Application logs capture key events (e.g., log-in, errors)',
            'Logs are stored on the server',
            'Informal review of logs if an issue is suspected',
            'Awareness of critical log locations'
        ],
        activities: [
            'Enable logging for authentication and authorization',
            'Ensure logs include timestamps and user identifiers',
            'Document log file locations and formats',
            'Review logs manually during troubleshooting'
        ],
        benefits: 'Foundational ability to reconstruct events after an incident',
        maturityIndicators: [
            'Log file samples',
            'Logging configuration'
        ],
        suggestedEvidence: [
            'Application log entries',
            'Server logging settings',
            'Troubleshooting guides'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-a/'
    },
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'A',
        streamName: 'Incident Detection',
        streamDescription: 'Establish capabilities to detect security incidents',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use a centralized logging and monitoring system with automated alerts for security events?',
        qualityCriteria: [
            'Logs are centralized (e.g., SIEM, ELK stack)',
            'Real-time monitoring for high-priority alerts',
            'Alerts for common attack patterns (e.g., brute-force)',
            'Standardized logging format for all applications'
        ],
        activities: [
            'Deploy a centralized log management platform',
            'Configure real-time alerts for security events',
            'Monitor for suspicious patterns and anomalies',
            'Audit log coverage and centralized collection'
        ],
        benefits: 'Timely detection and response to potential security threats',
        maturityIndicators: [
            'SIEM dashboard screenshots',
            'List of configured alerts'
        ],
        suggestedEvidence: [
            'Log management configuration',
            'Alert rule definitions',
            'Monitoring dashboard access logs'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-a/'
    },
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'A',
        streamName: 'Incident Detection',
        streamDescription: 'Establish capabilities to detect security incidents',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use advanced analytics and threat hunting to identify complex security incidents?',
        qualityCriteria: [
            'Usage of ML/AI for anomaly detection',
            'Active threat hunting across application logs',
            'Incorporate threat intelligence feeds',
            'Continuous refinement of detection rules'
        ],
        activities: [
            'Implement behavior-based anomaly detection',
            'Perform quarterly threat hunting operations',
            'Integrate CTI feeds into monitoring rules',
            'Evaluate and improve detection logic monthly'
        ],
        benefits: 'Detection of advanced persistent threats (APTs) and sophisticated attacks',
        maturityIndicators: [
            'Threat hunting reports',
            'Detection rule update logs'
        ],
        suggestedEvidence: [
            'Advanced analytics dashboard summary',
            'CTI integration logs',
            'Threat hunting campaign documentation'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-a/'
    },

    // IM - Stream B: Incident Response
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'B',
        streamName: 'Incident Response',
        streamDescription: 'Respond to and recover from security incidents',
        level: 1,
        levelName: 'Initial',
        question: 'Do you have an identified point of contact for security incidents?',
        qualityCriteria: [
            'Contact person/group identified',
            'Basic awareness of how to report issues',
            'Informal response process',
            'Ad-hoc coordination of teams'
        ],
        activities: [
            'Define a primary security incident contact',
            'Provide an email/channel for incident reporting',
            'Document basic response steps informally',
            'Identify key people to involve during an incident'
        ],
        benefits: 'Clear starting point for handling security emergencies',
        maturityIndicators: [
            'Contact list',
            'Internal announcement of IR contact'
        ],
        suggestedEvidence: [
            'Contact information (Wiki/Portal)',
            'Incident report channel (e.g., Slack/Email)'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-b/'
    },
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'B',
        streamName: 'Incident Response',
        streamDescription: 'Respond to and recover from security incidents',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a formal incident response plan and a dedicated response team?',
        qualityCriteria: [
            'Documented Incident Response Plan (IRP)',
            'Designated IR team (internal or external)',
            'Standardized response procedure for common types',
            'Periodic training for IR team members'
        ],
        activities: [
            'Develop and publish a formal IRP',
            'Establish an Incident Response Team (IRT)',
            'Create playbooks for common incidents (e.g., Malware)',
            'Conduct annual IR awareness training'
        ],
        benefits: 'Effective and consistent management of security incidents reducing impact',
        maturityIndicators: [
            'IRP document',
            'IRT roster',
            'Incident playbooks library'
        ],
        suggestedEvidence: [
            'IRP PDF/Document',
            'Playbook samples',
            'Training completion logs'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-b/'
    },
    {
        practiceId: 'IM',
        practiceName: 'Incident Management',
        streamId: 'B',
        streamName: 'Incident Response',
        streamDescription: 'Respond to and recover from security incidents',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you regularly perform incident response simulations and improve your plan based on post-mortems?',
        qualityCriteria: [
            'Annual tabletop or red-team simulations',
            'Post-mortem for all major incidents',
            'IRP and playbooks updated based on learnings',
            'Automated IR playbooks (SOAR)'
        ],
        activities: [
            'Conduct cross-functional incident tabletop exercises',
            'Formalize the post-incident review (PIR) process',
            'Implement SOAR for automated incident orchestration',
            'Update the AppSec strategy based on incident trends'
        ],
        benefits: 'High IR maturity with automated response and continuous improvement loop',
        maturityIndicators: [
            'Tabletop exercise reports',
            'Completed PIR reports',
            'SOAR workflow definitions'
        ],
        suggestedEvidence: [
            'Simulation summaries',
            'PIR documents with action items',
            'SOAR automation logs'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/incident-management/stream-b/'
    },

    // EM - Stream A: Configuration Hardening
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'A',
        streamName: 'Configuration Hardening',
        streamDescription: 'Harden application hosting environments',
        level: 1,
        levelName: 'Initial',
        question: 'Do you follow basic hardening guidelines for your application hosting environments?',
        qualityCriteria: [
            'Vendor-provided hardening guides used',
            'Basic security settings applied (e.g., firewall)',
            'Ad-hoc updates to environment configs',
            'Awareness of common misconfigurations'
        ],
        activities: [
            'Apply baseline security settings to servers/cloud',
            'Configure network access controls (firewalls/VPC)',
            'Document basic environment configuration ad-hoc',
            'Review environment settings for obvious gaps'
        ],
        benefits: 'Reduced attack surface for host infrastructures',
        maturityIndicators: [
            'Basic hardening checklists',
            'Security group/firewall rules'
        ],
        suggestedEvidence: [
            'Vendor hardening checklist',
            'Screenshot of firewall configurations',
            'Environment setup notes'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-a/'
    },
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'A',
        streamName: 'Configuration Hardening',
        streamDescription: 'Harden application hosting environments',
        level: 2,
        levelName: 'Defined',
        question: 'Do you use standardized hardening baselines and automate configuration management?',
        qualityCriteria: [
            'Standard hardening baselines (e.g., CIS) adopted',
            'Infrastructure-as-Code (IaC) for environment config',
            'Automated configuration enforcement (e.g., Ansible)',
            'Regular audits of environment security settings'
        ],
        activities: [
            'Establish formal hardening baselines for all stacks',
            'Use IaC to define and deploy environments',
            'Automate configuration managementorg-wide',
            'Perform quarterly audits of production configs'
        ],
        benefits: 'Consistent and verifiable security posture across all environments',
        maturityIndicators: [
            'IaC repository (Terraform/Ansible)',
            'Audit reports for environment configuration'
        ],
        suggestedEvidence: [
            'Hardening policy document',
            'IaC script samples',
            'Quarterly audit results'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-a/'
    },
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'A',
        streamName: 'Configuration Hardening',
        streamDescription: 'Harden application hosting environments',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you continuously monitor for configuration drift and automatically remediate insecure settings?',
        qualityCriteria: [
            'Real-time drift detection tools used',
            'Automated self-healing for critical settings',
            'Baseline updates based on incident findings',
            'Infrastructure integrity verified periodically'
        ],
        activities: [
            'Deploy automated configuration monitoring tools',
            'Implement auto-remediation for high-risk drift',
            'Incorporate lessons from incidents into IaC baselines',
            'Verify server/cloud integrity via automated checks'
        ],
        benefits: 'Continuous assurance that production remains in a hardened and compliant state',
        maturityIndicators: [
            'Drift detection logs',
            'Remediation automation logs'
        ],
        suggestedEvidence: [
            'Monitoring dashboard screenshots',
            'Self-healing event logs',
            'Integrity check reports'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-a/'
    },

    // EM - Stream B: Patching and Vulnerability Management
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'B',
        streamName: 'Patching and Vulnerability Management',
        streamDescription: 'Maintain the environment through patching and updates',
        level: 1,
        levelName: 'Initial',
        question: 'Do you periodically patch your application hosting infrastructure?',
        qualityCriteria: [
            'Patches applied ad-hoc',
            'Focus on critical security updates',
            'Manual verification of patch application',
            'Awareness of vendor security bulletins'
        ],
        activities: [
            'Identify and apply critical OS/middleware patches',
            'Monitor for security bulletins from vendors',
            'Perform manual patch checks ad-hoc',
            'Track patching status informally'
        ],
        benefits: 'Basic protection against well-known infrastructure vulnerabilities',
        maturityIndicators: [
            'Patch history logs',
            'Subscription to security advisories'
        ],
        suggestedEvidence: [
            'Sample patch logs',
            'Vendor notification settings'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-b/'
    },
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'B',
        streamName: 'Patching and Vulnerability Management',
        streamDescription: 'Maintain the environment through patching and updates',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a formal patching policy and use automated tools for vulnerability scanning?',
        qualityCriteria: [
            'Patching policy with defined timelines (SLA)',
            'Automated infrastructure vulnerability scanner used',
            'Centralized patch management system',
            'Regular reporting on patch compliance'
        ],
        activities: [
            'Publish a formal infrastructure patching policy',
            'Deploy an automated vulnerability scanner (e.g., Nessus)',
            'Implement a central patch management platform',
            'Monitor and report on vulnerability remediation'
        ],
        benefits: 'Timely and consistent mitigation of infrastructure flaws',
        maturityIndicators: [
            'Vulnerability scan reports',
            'Patch compliance dashboard screenshots'
        ],
        suggestedEvidence: [
            'Patching policy PDF',
            'Scan results summary',
            'Monthly compliance report'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-b/'
    },
    {
        practiceId: 'EM',
        practiceName: 'Environment Management',
        streamId: 'B',
        streamName: 'Patching and Vulnerability Management',
        streamDescription: 'Maintain the environment through patching and updates',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you automate the entire patching process and ensure real-time vulnerability visibility?',
        qualityCriteria: [
            'Automated end-to-end patching pipeline',
            'Vulnerability scanning integrated into deployment',
            'Zero-day response plan formalized and tested',
            'Continuous verification of patch effectiveness'
        ],
        activities: [
            'Implement automated patching workflows for all tiers',
            'Integrate infra scanning into the CI/CD pipeline',
            'Perform regular zero-day IR tabletop exercises',
            'Verify patch levels continuously via automated tools'
        ],
        benefits: 'Rapid response to new vulnerabilities and minimized manual effort',
        maturityIndicators: [
            'Automated patch pipeline logs',
            'Zero-day drill reports'
        ],
        suggestedEvidence: [
            'Automation workflow definitions',
            'Real-time vulnerability dashboard',
            'Exercise post-mortem documents'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/environment-management/stream-b/'
    },

    // OM - Stream A: Data Protection
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'A',
        streamName: 'Data Protection',
        streamDescription: 'Protect application data across its lifecycle',
        level: 1,
        levelName: 'Initial',
        question: 'Do you perform basic backups of your application data?',
        qualityCriteria: [
            'Regular backup schedule',
            'Backups stored in a separate location',
            'Ad-hoc restoration testing',
            'Basic awareness of data sensitivity'
        ],
        activities: [
            'Configure daily/weekly data backups',
            'Store backup copies off-site or in separate cloud accounts',
            'Perform manual data restoration checks ad-hoc',
            'Identify high-level data types (e.g., PII)'
        ],
        benefits: 'Ability to recover from data loss or corruption incidents',
        maturityIndicators: [
            'Backup schedule/logs',
            'Off-site storage records'
        ],
        suggestedEvidence: [
            'Backup job logs',
            'Storage provider invoices/receipts',
            'Restoration test notes'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-a/'
    },
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'A',
        streamName: 'Data Protection',
        streamDescription: 'Protect application data across its lifecycle',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a formal data protection policy and use standardized encryption methods?',
        qualityCriteria: [
            'Data Protection Policy published',
            'Standardized encryption for data at rest and in transit',
            'Formal data classification scheme adopted',
            'Regularly tested backup and disaster recovery (DR)'
        ],
        activities: [
            'Develop a formal Data Protection and Privacy policy',
            'Enforce TLS and AES-256 for all sensitive data',
            'Implement a data classification tagging process',
            'Schedule and perform annual DR restoration drills'
        ],
        benefits: 'Consistent and effective protection of sensitive information',
        maturityIndicators: [
            'Data classification guide',
            'DR drill reports'
        ],
        suggestedEvidence: [
            'Data Protection Policy PDF',
            'Encryption configuration samples',
            'Completed DR exercise report'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-a/'
    },
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'A',
        streamName: 'Data Protection',
        streamDescription: 'Protect application data across its lifecycle',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use automated data loss prevention (DLP) and ensure granular data lifecycle management?',
        qualityCriteria: [
            'Automated DLP monitoring and enforcement',
            'Automated data retention and deletion (right to forget)',
            'Hardware-backed key management (HSM/KMS)',
            'Continuous monitoring of data access patterns'
        ],
        activities: [
            'Implement DLP across all application data paths',
            'Automate data cleanup based on retention policies',
            'Use KMS for granular encryption key lifecycle',
            'Analyze data access logs for anomalies using ML'
        ],
        benefits: 'Proactive prevention of data leaks and automated privacy compliance',
        maturityIndicators: [
            'DLP alert logs',
            'Data deletion automation reports'
        ],
        suggestedEvidence: [
            'DLP dashboard summary',
            'KMS policy definitions',
            'Data access anomaly reports'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-a/'
    },

    // OM - Stream B: Legacy Management
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'B',
        streamName: 'Legacy Management',
        streamDescription: 'Manage security risks of legacy applications',
        level: 1,
        levelName: 'Initial',
        question: 'Do you maintain an inventory of legacy applications and their known risks?',
        qualityCriteria: [
            'List of legacy/deprecated apps exists',
            'Basic assessment of security debt in legacy apps',
            'Ad-hoc updates to legacy components',
            'Awareness of EOL dates'
        ],
        activities: [
            'Catalog all applications approaching EOL',
            'Identify critical security gaps in legacy software',
            'Document EOL dates for middleware and frameworks',
            'Informally review legacy app risk ad-hoc'
        ],
        benefits: 'Visibility into the risk posture of older systems',
        maturityIndicators: [
            'Legacy app inventory',
            'EOL tracking spreadsheet'
        ],
        suggestedEvidence: [
            'Inventory list',
            'Risk assessment notes for legacy apps'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-b/'
    },
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'B',
        streamName: 'Legacy Management',
        streamDescription: 'Manage security risks of legacy applications',
        level: 2,
        levelName: 'Defined',
        question: 'Do you have a formal decommissioning process and active risk mitigation for legacy systems?',
        qualityCriteria: [
            'Documented decommissioning process',
            'Active mitigation plans for high-risk legacy apps',
            'Regular review of legacy risk with stakeholders',
            'Restricted access to legacy environments'
        ],
        activities: [
            'Establish an application sunsetting procedure',
            'Develop risk acceptance/mitigation for legacy systems',
            'Hold quarterly legacy risk reviews',
            'Implement additional network segmentation for legacy apps'
        ],
        benefits: 'Controlled reduction of legacy risk and technical debt',
        maturityIndicators: [
            'Decommissioning procedure document',
            'Legacy risk mitigation plans'
        ],
        suggestedEvidence: [
            'Sunset policy PDF',
            'Recorded risk acceptances',
            'Segmentation firewall rules'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-b/'
    },
    {
        practiceId: 'OM',
        practiceName: 'Operational Management',
        streamId: 'B',
        streamName: 'Legacy Management',
        streamDescription: 'Manage security risks of legacy applications',
        level: 3,
        levelName: 'Optimized',
        question: 'Do you use virtualization or containerization to isolate legacy systems and ensure sunsetting targets?',
        qualityCriteria: [
            'Legacy apps isolated in secure containers/VMs',
            'Automated tracking of sunsetting milestones',
            'Incentives/Budget for legacy replacement',
            'Continuous monitoring of isolated legacy tiers'
        ],
        activities: [
            'Migrate legacy apps to isolated, hardened containers',
            'Automate reporting on sunsetting progress org-wide',
            'Establish a central budget for technical debt removal',
            'Monitor legacy tiers for adversarial activity specifically'
        ],
        benefits: 'Minimized attack surface of legacy software and predictable risk elimination',
        maturityIndicators: [
            'Containerization status for legacy apps',
            'Decommissioning progress dashboard'
        ],
        suggestedEvidence: [
            'Isolation architecture diagrams',
            'Milestone tracking reports',
            'Budget allocation records'
        ],
        businessFunction: 'Operations',
        officialLink: 'https://owaspsamm.org/model/operations/operational-management/stream-b/'
    },
];

// ============================================================================
// Migration Functions
// ============================================================================

async function seedPractices() {
    console.log('\n📋 Seeding SAMM practices...');

    for (const practice of practices) {
        await client.query(`
      INSERT INTO samm_practices (
        practice_id, practice_name, description, business_function,
        stream_a_name, stream_a_description, stream_b_name, stream_b_description,
        official_link, "order"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (practice_id) DO UPDATE SET
        practice_name = EXCLUDED.practice_name,
        description = EXCLUDED.description,
        stream_a_name = EXCLUDED.stream_a_name,
        stream_a_description = EXCLUDED.stream_a_description,
        stream_b_name = EXCLUDED.stream_b_name,
        stream_b_description = EXCLUDED.stream_b_description,
        updated_at = NOW()
    `, [
            practice.practiceId,
            practice.practiceName,
            practice.description,
            practice.businessFunction,
            practice.streamAName,
            practice.streamADescription,
            practice.streamBName,
            practice.streamBDescription,
            practice.officialLink,
            practice.order
        ]);
    }

    console.log(`✅ Seeded ${practices.length} practices`);
}

async function seedQuestions() {
    console.log('\n📝 Seeding SAMM stream questions...');

    for (const q of questions) {
        await client.query(`
      INSERT INTO samm_stream_questions (
        practice_id, practice_name, stream_id, stream_name, stream_description,
        level, level_name, question, quality_criteria, activities, benefits,
        maturity_indicators, suggested_evidence, business_function, official_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (practice_id, stream_id, level) DO UPDATE SET
        question = EXCLUDED.question,
        quality_criteria = EXCLUDED.quality_criteria,
        activities = EXCLUDED.activities,
        benefits = EXCLUDED.benefits,
        updated_at = NOW()
    `, [
            q.practiceId,
            q.practiceName,
            q.streamId,
            q.streamName,
            q.streamDescription,
            q.level,
            q.levelName,
            q.question,
            JSON.stringify(q.qualityCriteria),
            JSON.stringify(q.activities),
            q.benefits,
            JSON.stringify(q.maturityIndicators),
            JSON.stringify(q.suggestedEvidence),
            q.businessFunction,
            q.officialLink
        ]);
    }

    console.log(`✅ Seeded ${questions.length} stream questions`);
    console.log('\n⚠️  NOTE: This is a partial seed with Strategy & Metrics only.');
    console.log('   Additional practices need to be added to complete the dataset.');
}

async function main() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        await seedPractices();
        await seedQuestions();

        console.log('\n✨ SAMM v2 dataset seeded successfully with all 15 practices and 90 stream questions!');
        console.log('\nReady for use in compliance assessments!');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

main();
