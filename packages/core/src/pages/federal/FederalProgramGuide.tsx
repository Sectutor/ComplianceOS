import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import { format } from 'date-fns';
import { AssignProgramTaskModal } from '@/components/AssignProgramTaskModal';
import {
    CheckCircle2, Lock, ArrowRight, BookOpen, ArrowLeft,
    Shield, Cloud, Clock, DollarSign, GitMerge, AlertTriangle, Users, Calendar,
    Building, Target, Search, ShieldCheck, RefreshCw, Layers,
    Settings, ClipboardCheck, CheckSquare, ActivitySquare, Server, Flame, Activity, Stethoscope, BarChart3, Globe, Award, CircleDashed
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// ─── Framework Data ───────────────────────────────────────────────────────────

const FRAMEWORKS = {
    nist: {
        id: 'nist',
        label: 'NIST 800-171',
        shortLabel: 'NIST 800-171',
        subtitle: 'Protect Controlled Unclassified Information (CUI)',
        icon: Lock,
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        accent: 'from-blue-600 to-cyan-600',
        tabActive: 'bg-blue-600 text-white shadow-md',
        tabInactive: 'text-blue-700 bg-blue-50/50 border border-blue-200 hover:bg-blue-100',
        overview: `NIST SP 800-171 outlines 110 security controls across 14 families to protect Controlled Unclassified Information (CUI) in non-federal systems and organizations. It is the foundational framework for the others — start here if your organization handles CUI. Compliance is self-attested but may require third-party validation for DoD contracts.`,
        highlightNote: `📌 Start here — NIST 800-171 is the foundation for both CMMC and FedRAMP Moderate. Expect 6–12 months for initial compliance.`,
        timeline: '6 – 12 months',
        cost: 'Variable (self-assessment)',
        steps: [
            {
                id: 'applicability',
                step: 1,
                title: 'Determine Applicability',
                subtitle: 'DFARS 252.204-7012',
                description: 'Identify if your organization handles Controlled Unclassified Information (CUI). Review your contracts for the 7012 clause.',
                icon: Search,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-indigo-600',
                link: 'federal/contracts',
                cta: 'Go to Contract Tracker',
                secondaryLink: 'federal/cui-quiz',
                secondaryCta: 'Take the CUI Applicability Quiz',
                bestPractices: [
                    'Review all active and prospective DoD contracts.',
                    'Locate any instances of DFARS 252.204-7012.',
                    'Identify internal systems that store, process, or transmit CUI.'
                ],
                keyActions: [
                    'Take the CUI Applicability Quiz to determine your obligations.'
                ]
            },
            {
                id: 'scope',
                step: 2,
                title: 'Scope & Assets',
                subtitle: 'Define the Boundary',
                description: 'Map out exactly where CUI lives in your network. Isolate and segment CUI environments to minimize the scope of the assessment.',
                icon: Layers,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                link: 'risks/assets',
                cta: 'Go to Asset Inventory',
                bestPractices: [
                    'Inventory all hardware, software, and data flows.',
                    'Establish a defined authorization boundary (CUI enclave).'
                ],
                keyActions: [
                    'Limit access to the CUI enclave to authorized personnel only.'
                ]
            },
            {
                id: 'gap_analysis',
                step: 3,
                title: 'Gap Analysis',
                subtitle: 'Assess Current Posture',
                description: 'Conduct a baseline assessment against the 110 controls in NIST 800-171. Identify which controls are met, partially met, or not met.',
                icon: ClipboardCheck,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-purple-600',
                link: 'federal/gap-report',
                cta: 'Go to Gap Analysis',
                bestPractices: [
                    'Evaluate current policies and technical implementations.',
                    'Use NIST 800-171A as the assessment framework.'
                ],
                keyActions: [
                    'Document initial findings and deficiencies.'
                ]
            },
            {
                id: 'ssp',
                step: 4,
                title: 'Develop SSP & POA&M',
                subtitle: 'Document Your Plan',
                description: 'The System Security Plan (SSP) describes how you meet each control. The Plan of Action and Milestones (POA&M) tracks how you will fix unmet controls.',
                icon: FileTextIcon,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-600 to-fuchsia-600',
                link: 'federal/ssp-171',
                cta: 'Go to SSP Editor',
                bestPractices: [
                    'Draft a comprehensive SSP for your configured boundary.',
                    'Create POA&M entries for all identified gaps.'
                ],
                keyActions: [
                    'Assign resources and timelines to POA&M remediation.'
                ]
            },
            {
                id: 'implementation',
                step: 5,
                title: 'Implement Controls',
                subtitle: 'Technical & Admin Fixes',
                description: 'Execute your POA&M. Deploy necessary security tools (e.g., MFA, SIEM, Encryption) and establish administrative policies and training.',
                icon: ShieldCheck,
                color: 'text-fuchsia-600',
                bgColor: 'bg-fuchsia-50',
                accent: 'from-fuchsia-600 to-rose-600',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Implement FIPS-validated encryption for CUI at rest and in transit.',
                    'Conduct staff security awareness training.'
                ],
                keyActions: [
                    'Deploy Multi-Factor Authentication (MFA) across the boundary.'
                ]
            },
            {
                id: 'assessment',
                step: 6,
                title: 'Conduct Self-Assessment',
                subtitle: 'Validate Implementation',
                description: 'Validate your implementation against NIST 800-171A assessment guidelines. Score each control and document evidence.',
                icon: CheckSquare,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
                accent: 'from-rose-500 to-red-500',
                link: 'federal/assessment-171',
                cta: 'Go to 800-171 Assessment',
                bestPractices: [
                    'Collect and organize evidence for each control.',
                    'Calculate your overall assessment score.'
                ],
                keyActions: [
                    'Score controls using the NIST 800-171A methodology.'
                ]
            },
            {
                id: 'monitoring',
                step: 7,
                title: 'Remediate & Monitor',
                subtitle: 'Fix & Track',
                description: 'Develop a Plan of Action and Milestones (POA&M) for any remaining gaps. Implement continuous monitoring for ongoing compliance.',
                icon: ActivitySquare,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-500 to-teal-500',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Prioritize remediation by risk severity.',
                    'Implement automated monitoring and alerting.'
                ],
                keyActions: [
                    'Create a POA&M with owners and target dates for each gap.'
                ]
            },
            {
                id: 'attestation',
                step: 8,
                title: 'Attest Compliance',
                subtitle: 'Submit Assessment',
                description: 'Submit your self-assessment score to SPRS (Supplier Performance Risk System) if required for DoD contracts. Prepare documentation for potential audits.',
                icon: Award,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-500 to-cyan-500',
                link: 'federal/dfars',
                cta: 'Go to SPRS Submissions',
                bestPractices: [
                    'Maintain copies of your SSP and evidence package.',
                    'Prepare for potential third-party verification.'
                ],
                keyActions: [
                    'Upload your assessment score to SPRS.'
                ]
            },
        ],
    },

    cmmc: {
        id: 'cmmc',
        label: 'CMMC',
        shortLabel: 'CMMC',
        subtitle: 'DoD Contractor Certification',
        icon: Shield,
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800',
        accent: 'from-red-600 to-rose-600',
        tabActive: 'bg-red-600 text-white shadow-md',
        tabInactive: 'text-red-700 bg-red-50/50 border border-red-200 hover:bg-red-100',
        overview: `The Cybersecurity Maturity Model Certification (CMMC) is a DoD-specific certification that verifies implementation of cybersecurity controls for contractors handling CUI. It builds directly on NIST 800-171, with Levels 1–3. Level 2 (the most common for CUI) requires all 110 NIST 800-171 controls and often mandates a third-party C3PAO assessment.`,
        highlightNote: `📌 CMMC is built on NIST 800-171 — complete that first. Level 2 certification requires a C3PAO audit. Timeline: 9–18 months. Cost: $50K (self-assessed) to $200K+ (certification).`,
        timeline: '9 – 18 months',
        cost: '$50K – $200K+',
        steps: [
            {
                id: 'level',
                step: 1,
                title: 'Determine Your Level',
                subtitle: 'CMMC Level 1, 2, or 3',
                description: 'Identify the required CMMC maturity level based on your DoD contract type. Level 1 covers basic cyber hygiene (17 practices). Level 2 requires 110 NIST 800-171 controls and may need a C3PAO audit.',
                icon: Target,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                accent: 'from-red-600 to-rose-600',
                link: 'federal/contracts',
                cta: 'Go to Contract Tracker',
                bestPractices: [
                    'Level 1: Self-attestation. Level 2: May require C3PAO audit.',
                    'Level 3: Government-led assessment for advanced CUI.'
                ],
                keyActions: [
                    'Review your DoD solicitations for CMMC level requirements.'
                ],
            },
            {
                id: 'scope',
                step: 2,
                title: 'Scope Assets & Data',
                subtitle: 'Define CUI Boundary',
                description: 'Define the boundary for all assets, networks, and personnel that touch CUI. Proper scoping reduces certification cost and complexity.',
                icon: Layers,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
                accent: 'from-rose-600 to-pink-600',
                link: 'risks/assets',
                cta: 'Go to Asset Inventory',
                bestPractices: [
                    'Use CMMC scoping guides to isolate CUI environments.',
                    'Consider network segmentation to reduce scope.'
                ],
                keyActions: [
                    'Inventory all systems, networks, and data in scope.'
                ],
            },
            {
                id: 'gap_analysis',
                step: 3,
                title: 'Gap Analysis',
                subtitle: 'Compare Against CMMC Controls',
                description: 'Assess your current security posture against all applicable CMMC controls. Identify partial or missing implementations across all 14 control families.',
                icon: ClipboardCheck,
                color: 'text-pink-600',
                bgColor: 'bg-pink-50',
                accent: 'from-pink-600 to-fuchsia-600',
                link: 'federal/gap-report',
                cta: 'Go to Gap Analysis',
                bestPractices: [
                    'Identify controls that are partially vs. fully implemented.',
                    'Leverage NIST 800-171 gap work already completed.'
                ],
                keyActions: [
                    'Use CMMC assessment guides and scoring worksheets.'
                ],
            },
            {
                id: 'ssp',
                step: 4,
                title: 'Develop SSP & Documentation',
                subtitle: 'Document Security Posture',
                description: 'Expand or develop your System Security Plan (SSP) for CMMC. Include a POA&M for any outstanding gaps and ensure all policies are documented.',
                icon: FileTextIcon,
                color: 'text-fuchsia-600',
                bgColor: 'bg-fuchsia-50',
                accent: 'from-fuchsia-600 to-violet-600',
                link: 'federal/ssp-171',
                cta: 'Go to SSP Editor',
                bestPractices: [
                    'Create a formal POA&M for all identified gaps.',
                    'Ensure all security policies and procedures are written and approved.'
                ],
                keyActions: [
                    'Expand NIST 800-171 SSP to cover CMMC-specific practices.'
                ],
            },
            {
                id: 'implementation',
                step: 5,
                title: 'Implement & Remediate',
                subtitle: 'Close Gaps',
                description: 'Apply all required technical and administrative controls. Deploy tools for monitoring, access management, and incident response. Train all employees.',
                icon: ShieldCheck,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-purple-600',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Conduct mandatory cybersecurity awareness training.',
                    'Complete all POA&M remediation actions.'
                ],
                keyActions: [
                    'Deploy EDR, SIEM, and MFA solutions.'
                ],
            },
            {
                id: 'assessment',
                step: 6,
                title: 'Self-Assessment or Audit Prep',
                subtitle: 'Validate Readiness',
                description: 'For Level 2 self-attestation, conduct an internal assessment and score all controls. For C3PAO certification, engage an assessor and prepare your evidence package.',
                icon: CheckSquare,
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
                accent: 'from-amber-500 to-orange-500',
                link: 'federal/assessment-171',
                cta: 'Go to Assessment',
                bestPractices: [
                    'Organize evidence packages: policies, logs, screenshots, configurations.',
                    'Engage a C3PAO early for Level 2 certification planning.'
                ],
                keyActions: [
                    'Score all controls internally against CMMC assessment objectives.'
                ],
            },
            {
                id: 'audit',
                step: 7,
                title: 'Undergo C3PAO Assessment',
                subtitle: 'Certification Audit',
                description: 'Submit to a CMMC Third-Party Assessment Organization (C3PAO) for formal review. Address any findings before the assessment is finalized.',
                icon: Award,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
                accent: 'from-orange-500 to-red-500',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Work with C3PAO to schedule and conduct the formal assessment.',
                    'Remediate any deficiencies identified during the assessment.'
                ],
                keyActions: [
                    'Select an accredited C3PAO from the CMMC-AB Marketplace.'
                ],
            },
            {
                id: 'monitoring',
                step: 8,
                title: 'Maintain & Report',
                subtitle: 'Ongoing Compliance',
                description: 'CMMC certification requires annual affirmations and recertification every 3 years. Maintain continuous monitoring and update your SSP as the system evolves.',
                icon: ActivitySquare,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-500 to-teal-500',
                link: 'federal/dfars',
                cta: 'Go to SPRS Submissions',
                bestPractices: [
                    'Maintain continuous monitoring programs.',
                    'Prepare for recertification every 3 years.'
                ],
                keyActions: [
                    'Submit annual affirmations via SPRS.'
                ],
            },
        ],
    },

    fedramp: {
        id: 'fedramp',
        label: 'FedRAMP',
        shortLabel: 'FedRAMP',
        subtitle: 'Cloud Services for Federal Agencies',
        icon: Cloud,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        accent: 'from-emerald-600 to-teal-600',
        tabActive: 'bg-emerald-600 text-white shadow-md',
        tabInactive: 'text-emerald-700 bg-emerald-50/50 border border-emerald-200 hover:bg-emerald-100',
        overview: `FedRAMP standardizes security assessments and authorization for cloud services used by federal agencies. It uses NIST 800-53-based controls with baselines at Low, Moderate, or High impact levels. FedRAMP Moderate aligns closely with NIST 800-171, enabling control reuse. Authorization requires agency sponsorship or a Joint Authorization Board (JAB) review.`,
        highlightNote: `📌 FedRAMP is for cloud service providers (CSPs). Moderate baseline aligns with NIST 800-171 — leverage existing controls. Timeline: 12–24 months. Initial cost: $500K–$2M+.`,
        timeline: '12 – 24 months',
        cost: '$500K – $2M+',
        steps: [
            {
                id: 'impact',
                step: 1,
                title: 'Determine Impact Level',
                subtitle: 'Low, Moderate, or High',
                description: 'Classify your cloud service based on the sensitivity of federal data it processes. Use FIPS 199 to determine impact. Moderate is the most common and aligns with NIST 800-171.',
                icon: Target,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-600 to-teal-600',
                link: 'federal/fips-199',
                cta: 'Go to FIPS-199 Categorization',
                bestPractices: [
                    'Confirm moderate or high based on agency data sensitivity.',
                    'Review the FedRAMP baselines for control count differences.'
                ],
                keyActions: [
                    'Apply FIPS 199 categorization to your service.'
                ],
            },
            {
                id: 'readiness',
                step: 2,
                title: 'Readiness Assessment',
                subtitle: 'Evaluate Preparedness',
                description: 'Conduct an internal gap analysis against FedRAMP baselines. Secure an agency sponsor or begin JAB engagement. A FedRAMP Readiness Assessment Report (RAR) is recommended.',
                icon: ClipboardCheck,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-cyan-600',
                link: 'federal/gap-report',
                cta: 'Go to Gap Analysis',
                bestPractices: [
                    'Conduct an internal gap analysis against the applicable baseline.',
                    'Engage a 3PAO early to perform a readiness assessment (RAR).'
                ],
                keyActions: [
                    'Identify a federal agency sponsor willing to authorize your service.'
                ],
            },
            {
                id: 'ssp',
                step: 3,
                title: 'Develop SSP & Documentation',
                subtitle: 'Detail Security Posture',
                description: 'Create a comprehensive SSP, POA&M, and all required policy documents. Map every control to the NIST 800-53 baseline. Include detailed system architecture diagrams.',
                icon: FileTextIcon,
                color: 'text-cyan-600',
                bgColor: 'bg-cyan-50',
                accent: 'from-cyan-600 to-sky-600',
                link: 'federal/ssp-171',
                cta: 'Go to SSP Editor',
                bestPractices: [
                    'Develop required artifacts: SSP, PIA, AIA, CIS, CRM.',
                    'Create detailed architecture diagrams showing data flows and boundaries.'
                ],
                keyActions: [
                    'Write implementation statements for all baseline controls.'
                ],
            },
            {
                id: 'implementation',
                step: 4,
                title: 'Implement Controls',
                subtitle: 'Build a Compliant System',
                description: 'Apply NIST 800-53-based controls and focus on automation for continuous monitoring. Leverage existing NIST 800-171 or CMMC controls where they overlap.',
                icon: ShieldCheck,
                color: 'text-sky-600',
                bgColor: 'bg-sky-50',
                accent: 'from-sky-600 to-blue-600',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Prioritize automation for vulnerability scanning and log management.',
                    'Reuse NIST 800-171 control implementations where applicable.'
                ],
                keyActions: [
                    'Implement all required technical controls systematically.'
                ],
            },
            {
                id: 'audit',
                step: 5,
                title: 'Engage a 3PAO',
                subtitle: 'Independent Assessment',
                description: 'Select an accredited Third-Party Assessment Organization (3PAO) to perform an independent assessment. The 3PAO conducts testing and reviews your evidence.',
                icon: Award,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-indigo-600',
                link: 'federal/fedramp',
                cta: 'Go to FedRAMP Packages',
                bestPractices: [
                    'Work with 3PAO to develop the Security Assessment Plan (SAP).',
                    'Undergo testing including vulnerability scanning, penetration testing, and control interview.'
                ],
                keyActions: [
                    'Select an accredited 3PAO from the FedRAMP Marketplace.'
                ],
            },
            {
                id: 'authorization',
                step: 6,
                title: 'Submit for Authorization',
                subtitle: 'Seek ATO',
                description: 'Package all documentation and submit to your agency sponsor or JAB for Authority to Operate (ATO) review. Address any findings from the review.',
                icon: FileTextIcon,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                link: 'federal/fedramp',
                cta: 'Go to FedRAMP Packages',
                bestPractices: [
                    'Submit to agency AO or JAB for review.',
                    'Respond to questions and address reviewer findings promptly.'
                ],
                keyActions: [
                    'Compile the full authorization package: SSP, SAP, SAR, POA&M.'
                ],
            },
            {
                id: 'ato',
                step: 7,
                title: 'Achieve ATO',
                subtitle: 'Authorization to Operate',
                description: 'Receive your Authority to Operate from the agency or JAB. Get listed on the FedRAMP Marketplace, enabling other federal agencies to reuse your authorization.',
                icon: CheckCircle2,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-purple-600',
                link: 'federal/fedramp',
                cta: 'Go to FedRAMP Packages',
                bestPractices: [
                    'Get listed on the FedRAMP Marketplace.',
                    'Brief agency ISSO and ISSM on ongoing monitoring obligations.'
                ],
                keyActions: [
                    'Receive the signed ATO letter from the Authorizing Official (AO).'
                ],
            },
            {
                id: 'monitoring',
                step: 8,
                title: 'Continuous Monitoring',
                subtitle: 'Maintain Authorization',
                description: 'FedRAMP requires ongoing monthly security reporting, annual assessments, and change management via ConMon. Failure to report can result in ATO revocation.',
                icon: ActivitySquare,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-600 to-rose-600',
                link: 'federal/poam',
                cta: 'Go to POA&M Tracker',
                bestPractices: [
                    'Undergo annual 3PAO assessments.',
                    'Process significant changes through the FedRAMP Change Management process.'
                ],
                keyActions: [
                    'Submit monthly vulnerability and POA&M reports to the agency.'
                ],
            },
        ],
    },
};

const OVERLAP_NOTES = [
    {
        icon: GitMerge,
        title: 'NIST 800-171 → CMMC',
        desc: 'CMMC Level 2 is built directly on NIST 800-171. Complete NIST first — all 110 controls carry over.',
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200',
    },
    {
        icon: GitMerge,
        title: 'NIST 800-171 → FedRAMP Moderate',
        desc: 'FedRAMP Moderate aligns closely with NIST 800-171. Reuse your SSP and control implementations.',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200',
    },
    {
        icon: GitMerge,
        title: 'CMMC + FedRAMP Overlap',
        desc: 'If both are required, start with FedRAMP (stricter) — it covers all CMMC Level 2 controls and more.',
        color: 'text-purple-600',
        bg: 'bg-purple-50 border-purple-200',
    },
];

// Reusable icon for arbitrary places
function FileTextIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
}

export default function FederalProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");
    const [activeFw, setActiveFw] = useState<'nist' | 'cmmc' | 'fedramp'>('nist');

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'federal'
    }, { enabled: !!clientId });

    // Derive mock statuses or real data
    const getStatus = (stepId: string) => {
        // Return mostly 'pending' as a starting point, mock some as completed
        if (stepId === 'applicability' || stepId === 'level' || stepId === 'impact') return 'completed';
        return 'pending';
    };

    const fw = FRAMEWORKS[activeFw];
    const FwIcon = fw.icon;

    const completedSteps = fw.steps.filter(s => getStatus(s.id) === 'completed').length;
    const progressPercentage = Math.round((completedSteps / fw.steps.length) * 100);

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/clients/${clientId}/federal/dashboard`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Federal Hub
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            Federal Compliance Guides
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(Object.keys(FRAMEWORKS) as Array<keyof typeof FRAMEWORKS>).map(key => {
                            const f = FRAMEWORKS[key];
                            const isActive = activeFw === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveFw(key as any)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isActive ? f.tabActive : f.tabInactive}`}
                                >
                                    {f.shortLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 md:p-10 xl:px-12">
                    <div className="w-full mx-auto">
                        <div className="flex flex-col lg:flex-row gap-8 mb-12">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 text-white mb-4 lg:mb-0 bg-gradient-to-br ${fw.accent}`} style={{ backgroundImage: `var(--tw-gradient-stops)` }}>
                                <FwIcon className="w-8 h-8" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{fw.label}</h1>
                                    <Badge className={fw.badge}>{fw.subtitle}</Badge>
                                </div>
                                <p className="text-slate-700 leading-relaxed text-sm max-w-4xl">{fw.overview}</p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Timeline: <strong>{fw.timeline}</strong>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                        Est. Cost: <strong>{fw.cost}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-10">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{fw.highlightNote}</p>
                        </div>

                        {/* Progress Section */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8 mb-12">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                    {progressPercentage === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    Implementation Progress
                                </h3>
                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{progressPercentage}% Complete</span>
                            </div>
                            <Progress value={progressPercentage} className="h-3 rounded-full" />
                            <p className="text-xs text-slate-500 mt-4">
                                Progress is based on completed steps. Complete all stages to initialize the program.
                            </p>
                        </div>

                        <div className="space-y-12 relative pb-12">
                            <div className="absolute top-12 bottom-12 left-[31px] w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

                            {fw.steps.map((step) => {
                                const status = getStatus(step.id);
                                return (
                                    <div key={step.step} className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 group">
                                        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white ring-1 ring-slate-100 group-hover:ring-slate-300 transition-all duration-300">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${status === 'completed' ? 'from-emerald-500 to-green-600' : step.accent} text-white shadow-inner`}>
                                                {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black text-xl">{step.step}</span>}
                                            </div>
                                        </div>

                                        <Card className={`flex-grow transition-shadow ${status === 'completed' ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200 hover:shadow-md'}`}>
                                            <CardHeader className={`${status === 'completed' ? 'bg-emerald-50/50' : step.bgColor} border-b border-white rounded-t-xl bg-opacity-50 pb-5`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Badge variant="outline" className={`mb-2 bg-white/80 ${status === 'completed' ? 'text-emerald-700 border-emerald-200' : fw.color + ' border-current'}`}>
                                                            Phase {step.step}: {step.subtitle}
                                                        </Badge>
                                                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                                                            <step.icon className={`w-5 h-5 ${status === 'completed' ? 'text-emerald-600' : fw.color}`} />
                                                            {step.title}
                                                        </CardTitle>
                                                    </div>
                                                    {status === 'completed' ? (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0">
                                                            Completed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 flex items-center gap-1 shrink-0">
                                                            <CircleDashed className="w-3 h-3" /> Needs Attention
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-6">
                                                <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                                                    {step.description}
                                                </p>

                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                            Key Actions & Best Practices
                                                        </h4>
                                                        <ul className="space-y-2 text-sm">
                                                            {[...step.keyActions, ...step.bestPractices].map((practice, i) => (
                                                                <li key={i} className="flex items-start gap-3 text-slate-600">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                                                                    <span className="leading-relaxed">{practice}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                                                                <Users className="w-4 h-4 text-indigo-500" />
                                                                Task Assignment
                                                            </h4>
                                                            <p className="text-xs text-slate-500 mb-4">Assign this phase to a team member and set a target deadline.</p>

                                                            <div className="space-y-3 border-t border-slate-100 pt-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium text-slate-500 uppercase">Owner</span>
                                                                    <span className="text-sm text-slate-800 font-medium">{assignments?.[step.id]?.owner || 'Unassigned'}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Target Date</span>
                                                                    <span className="text-sm text-slate-800 font-medium">{assignments?.[step.id]?.targetDate ? format(new Date(assignments[step.id].targetDate), 'MMM d, yyyy') : 'Not set'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <Button variant="outline" size="sm" className="w-full text-xs font-semibold hover:bg-slate-50" onClick={() => { setSelectedStep(step); setIsAssignModalOpen(true); }}>
                                                                Manage Assignment
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-50 flex items-center justify-end gap-3 flex-wrap">
                                                    {('secondaryLink' in step && step.secondaryLink && 'secondaryCta' in step && step.secondaryCta) && (
                                                        <Link href={`/clients/${clientId}/${(step as any).secondaryLink}`}>
                                                            <Button variant="outline" className={`hover:bg-slate-50 border-slate-200 text-slate-600 font-semibold transition-all group-hover:bg-white`}>
                                                                {(step as any).secondaryCta} <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    {step.cta && step.link && (
                                                        <Link href={`/clients/${clientId}/${step.link}`}>
                                                            <Button className={`bg-gradient-to-r ${status === 'completed' ? 'from-emerald-600 to-green-600' : step.accent} hover:opacity-90 text-white shadow-md transition-all group-hover:translate-x-1 font-semibold`}>
                                                                {step.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Overlap Notes */}
                        <div className="mt-8 mb-16 pt-8 border-t border-slate-200">
                            <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                                <GitMerge className="w-5 h-5 text-slate-400" />
                                Framework Synergy & Overlaps
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {OVERLAP_NOTES.map((note, idx) => (
                                    <div key={idx} className={`p-5 rounded-2xl border ${note.bg} flex items-start gap-4`}>
                                        <div className="bg-white p-2.5 rounded-xl shadow-sm shrink-0">
                                            <note.icon className={`w-5 h-5 ${note.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{note.title}</h4>
                                            <p className="text-sm text-slate-700 leading-relaxed">{note.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {selectedStep && (
                <AssignProgramTaskModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    clientId={clientId}
                    guideType="federal"
                    stepId={selectedStep.id}
                    stepTitle={selectedStep.title}
                    currentUserId={assignments?.[selectedStep.id]?.ownerId}
                    currentTargetDate={assignments?.[selectedStep.id]?.targetDate}
                    onAssignmentUpdated={() => refetchAssignments()}
                />
            )}
        </DashboardLayout>
    );
}
