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
    Shield, Clock, DollarSign, GitMerge, AlertTriangle, Users, Calendar,
    Building, Target, Search, ShieldCheck, RefreshCw, Layers,
    Settings, ClipboardCheck, CheckSquare, ActivitySquare, Server, Flame, Activity, Stethoscope, BarChart3, Globe, Award, CircleDashed
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// ─── Framework Data ───────────────────────────────────────────────────────────

const FRAMEWORKS = {
    nist: {
        id: 'nist',
        label: 'NIST SP 800-161',
        shortLabel: 'NIST 800-161',
        subtitle: 'Cybersecurity Supply Chain Risk Management',
        icon: Lock,
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        accent: 'from-blue-600 to-cyan-600',
        tabActive: 'bg-blue-600 text-white shadow-md',
        tabInactive: 'text-blue-700 bg-blue-50/50 border border-blue-200 hover:bg-blue-100',
        overview: `NIST SP 800-161 provides a multi-tier framework for integrating cybersecurity supply chain risk management (C-SCRM) into enterprise risk management. It addresses risks at enterprise, mission/business, and system levels, focusing on identifying, assessing, and mitigating supply chain vulnerabilities across your vendor ecosystem.`,
        highlightNote: `📌 Start here for supply chain-focused C-SCRM. Aligns with NIST CSF 2.0 for comprehensive vendor risk management. Expect 6–12 months for initial setup.`,
        timeline: '6 – 12 months',
        cost: 'Variable (self-assessment)',
        steps: [
            {
                id: 'governance',
                step: 1,
                title: 'Establish Governance & Foundation',
                subtitle: 'SR-2: C-SCRM Strategy',
                description: 'Define TPRM scope, policies, and oversight structure. Develop a C-SCRM strategy and implementation plan aligned with enterprise risk management.',
                icon: Building,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-indigo-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Assign RACI matrix for C-SCRM roles.',
                    'Gain executive sponsorship and budget approval.',
                    'Inventory existing vendor relationships.'
                ],
                keyActions: [
                    'Define TPRM scope, policies, and risk appetite.'
                ]
            },
            {
                id: 'inventory',
                step: 2,
                title: 'Identify & Inventory Third Parties',
                subtitle: 'SR-1: Supply Chain Inventory',
                description: 'Create a comprehensive vendor registry. Map supply chain dependencies and categorize vendors by criticality, data access, and business impact.',
                icon: Search,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Map supply chain dependencies and fourth-party risks.',
                    'Classify vendors by risk tier (Critical, High, Medium, Low).',
                    'Document data flows and system interactions.'
                ],
                keyActions: [
                    'Identify all third-party vendors, suppliers, and service providers.'
                ]
            },
            {
                id: 'assessment',
                step: 3,
                title: 'Risk Assessments & Due Diligence',
                subtitle: 'SR-4, SR-5: Supplier Assessment',
                description: 'Evaluate inherent and residual risks through questionnaires, SOC 2 reviews, ISO certifications, and gap analyses against NIST controls.',
                icon: ClipboardCheck,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-purple-600',
                link: 'vendors/reviews',
                cta: 'Go to Security Reviews',
                bestPractices: [
                    'Review SOC 2, ISO 27001, and penetration test reports.',
                    'Perform gap analyses against NIST SR control families.',
                    'Prioritize fourth-party/sub-processor risks.'
                ],
                keyActions: [
                    'Send risk questionnaires (SIG, CAIQ, custom).'
                ]
            },
            {
                id: 'contracts',
                step: 4,
                title: 'Develop Contracts & Agreements',
                subtitle: 'SR-3: Supplier Agreement',
                description: 'Embed security requirements in vendor contracts with clauses for incident reporting, audits, and flow-down requirements.',
                icon: FileTextIcon,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-600 to-fuchsia-600',
                link: 'vendors/dpa-manager',
                cta: 'Go to DPA Manager',
                bestPractices: [
                    'Include incident reporting requirements (e.g., 48-hour notification).',
                    'Add right-to-audit clauses for critical vendors.',
                    'Define sub-processor approval requirements.'
                ],
                keyActions: [
                    'Incorporate NIST SR-3 clauses for supplier agreements.'
                ]
            },
            {
                id: 'controls',
                step: 5,
                title: 'Implement Mitigation Controls',
                subtitle: 'SR-5, SR-6: Controls',
                description: 'Apply targeted controls to reduce identified risks through access controls, encryption, training, and POA&Ms.',
                icon: ShieldCheck,
                color: 'text-fuchsia-600',
                bgColor: 'bg-fuchsia-50',
                accent: 'from-fuchsia-600 to-rose-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Implement security awareness training for vendor-facing staff.',
                    'Create POA&M entries for identified gaps.',
                    'Establish vendor-specific security requirements.'
                ],
                keyActions: [
                    'Deploy access controls and encryption for vendor access.'
                ]
            },
            {
                id: 'monitoring',
                step: 6,
                title: 'Establish Ongoing Monitoring',
                subtitle: 'SR-7: Continuous Monitoring',
                description: 'Continuously track vendor performance through periodic reassessments, threat intelligence, and automated monitoring.',
                icon: ActivitySquare,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
                accent: 'from-rose-500 to-red-500',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Monitor external threat intelligence for vendor breaches.',
                    'Track contract renewals and SLA compliance.',
                    'Report annually or as needed to stakeholders.'
                ],
                keyActions: [
                    'Configure periodic reassessment schedules by tier.'
                ]
            },
            {
                id: 'incident',
                step: 7,
                title: 'Handle Incidents & Offboarding',
                subtitle: 'IR-1, IR-6: Incident Response',
                description: 'Manage incident responses, define secure offboarding processes, and mature the program over time.',
                icon: AlertTriangle,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-500 to-teal-500',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Define secure offboarding (data return/destruction).',
                    'Measure KPIs (e.g., risk reduction, assessment completion).',
                    'Mature program from foundational to enabling.'
                ],
                keyActions: [
                    'Integrate vendor incident response with enterprise IR.'
                ]
            }
        ]
    },

    iso: {
        id: 'iso',
        label: 'ISO/IEC 27036',
        shortLabel: 'ISO 27036',
        subtitle: 'Information Security for Supplier Relationships',
        icon: Shield,
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800',
        accent: 'from-purple-600 to-indigo-600',
        tabActive: 'bg-purple-600 text-white shadow-md',
        tabInactive: 'text-purple-700 bg-purple-50/50 border border-purple-200 hover:bg-purple-100',
        overview: `ISO/IEC 27036 is the dedicated international standard for information security in supplier relationships. It provides detailed guidance for managing information security risks throughout the supplier lifecycle, including ICT supply chains for hardware, software, and services.`,
        highlightNote: `📌 Use for ISMS integration and deeper supplier security. ISO 27036 provides "how-to" depth for ISO 27001 Annex A controls A.5.19–A.5.22. Timeline: 6–12 months.`,
        timeline: '6 – 12 months',
        cost: 'Variable (certification optional)',
        steps: [
            {
                id: 'governance',
                step: 1,
                title: 'Establish Governance & Foundation',
                subtitle: '27036-1: Overview & Concepts',
                description: 'Define TPRM scope, policies, and oversight structure aligned with ISO 27001 leadership and Annex A.5 organizational controls.',
                icon: Target,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-600 to-violet-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Align with ISO 27001 Clause 5 (Leadership).',
                    'Set risk appetite and supplier security policies.',
                    'Define acquirer and supplier roles and responsibilities.'
                ],
                keyActions: [
                    'Define scope based on organizational needs and regulations.'
                ]
            },
            {
                id: 'inventory',
                step: 2,
                title: 'Identify & Inventory Third Parties',
                subtitle: '27036-1/3: ICT Supply Chain',
                description: 'Build comprehensive vendor registry with visibility into multi-layered supply chains for hardware, software, and services.',
                icon: Layers,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-indigo-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Identify fourth-party/sub-processor dependencies.',
                    'Classify by criticality, data access, and chain layers.',
                    'Document hardware, software, and service relationships.'
                ],
                keyActions: [
                    'Create vendor registry with supply chain mapping.'
                ]
            },
            {
                id: 'assessment',
                step: 3,
                title: 'Risk Assessments & Due Diligence',
                subtitle: '27036-3: Supply Chain Security',
                description: 'Evaluate inherent and residual risks across the supply chain using questionnaires and security posture analysis.',
                icon: ClipboardCheck,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-blue-600',
                link: 'vendors/reviews',
                cta: 'Go to Security Reviews',
                bestPractices: [
                    'Analyze multi-layered threats in hardware/software/services.',
                    'Review certificates (SOC 2, ISO 27001) and audit reports.',
                    'Prioritize high-risk ICT elements and fourth parties.'
                ],
                keyActions: [
                    'Assess supplier security using ISO 27036-3 guidelines.'
                ]
            },
            {
                id: 'contracts',
                step: 4,
                title: 'Develop Contracts & Agreements',
                subtitle: '27036-2: Requirements',
                description: 'Embed security requirements in supplier agreements covering the full lifecycle from acquisition to termination.',
                icon: FileTextIcon,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-cyan-600',
                link: 'vendors/dpa-manager',
                cta: 'Go to DPA Manager',
                bestPractices: [
                    'Define information security objectives in agreements.',
                    'Include audit rights, breach notification, and termination clauses.',
                    'Address ICT supply chain specific requirements.'
                ],
                keyActions: [
                    'Incorporate ISO 27036-2 lifecycle security requirements.'
                ]
            },
            {
                id: 'controls',
                step: 5,
                title: 'Implement Mitigation Controls',
                subtitle: '27036-3: Chain Security',
                description: 'Apply targeted controls to reduce supply chain risks through visibility tools, access controls, and risk response.',
                icon: ShieldCheck,
                color: 'text-cyan-600',
                bgColor: 'bg-cyan-50',
                accent: 'from-cyan-600 to-teal-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Implement access controls and encryption requirements.',
                    'Create POA&Ms for identified gaps in supply chain.',
                    'Establish supplier security training programs.'
                ],
                keyActions: [
                    'Deploy chain visibility tools for hardware/software/services.'
                ]
            },
            {
                id: 'monitoring',
                step: 6,
                title: 'Establish Ongoing Monitoring',
                subtitle: '27036-2: Monitoring Processes',
                description: 'Continuously track supplier performance and supply chain security through automated tools and periodic reviews.',
                icon: ActivitySquare,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-green-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Use automated tools for change detection.',
                    'Conduct periodic supplier service reviews.',
                    'Report on supply chain security events.'
                ],
                keyActions: [
                    'Implement continuous monitoring per ISO 27036-2.'
                ]
            },
            {
                id: 'incident',
                step: 7,
                title: 'Handle Incidents & Offboarding',
                subtitle: '27036-2: Lifecycle Improvement',
                description: 'Manage incident responses, define secure termination processes, and continuously improve the supplier relationship lifecycle.',
                icon: AlertTriangle,
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                accent: 'from-green-500 to-emerald-500',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Define secure offboarding and data destruction.',
                    'Measure KPIs and conduct supplier audits.',
                    'Mature toward advanced chain visibility practices.'
                ],
                keyActions: [
                    'Integrate with ISO 27001 incident management (Clause 16).'
                ]
            }
        ]
    },

    hybrid: {
        id: 'hybrid',
        label: 'Hybrid Approach',
        shortLabel: 'Hybrid',
        subtitle: 'NIST + ISO Combined',
        icon: GitMerge,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        accent: 'from-emerald-600 to-teal-600',
        tabActive: 'bg-emerald-600 text-white shadow-md',
        tabInactive: 'text-emerald-700 bg-emerald-50/50 border border-emerald-200 hover:bg-emerald-100',
        overview: `The hybrid approach combines NIST SP 800-161's supply chain risk management focus with ISO/IEC 27036's supplier relationship security depth. This provides comprehensive coverage: NIST for C-SCRM strategy and controls, ISO 27036 for ISMS integration.`,
        highlightNote: `📌 Best for organizations needing both C-SCRM and ISMS compliance. Leverage NIST's supply chain focus to enhance ISO's supplier controls. Timeline: 9–18 months.`,
        timeline: '9 – 18 months',
        cost: '$50K – $500K+',
        steps: [
            {
                id: 'governance',
                step: 1,
                title: 'Establish Governance & Foundation',
                subtitle: 'SR-2 + 27036-1/2',
                description: 'Define TPRM scope with dual alignment to NIST C-SCRM and ISO 27001/27036 requirements. Set up cross-functional governance.',
                icon: Building,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-600 to-teal-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Align with ISO 27001 Clause 5 and A.5.19.',
                    'Create RACI matrix covering both frameworks.',
                    'Set unified risk appetite and policy framework.'
                ],
                keyActions: [
                    'Develop C-SCRM strategy aligned with NIST SR-2.'
                ]
            },
            {
                id: 'inventory',
                step: 2,
                title: 'Identify & Inventory Third Parties',
                subtitle: 'SR-1 + 27036-1/3',
                description: 'Build comprehensive vendor registry with supply chain mapping, covering both NIST enterprise mapping and ISO 27036 ICT visibility.',
                icon: Layers,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-cyan-600',
                link: 'vendors/discovery',
                cta: 'Go to Vendor Discovery',
                bestPractices: [
                    'Identify fourth-party and sub-processor risks.',
                    'Classify using both criticality and data sensitivity.',
                    'Document hardware, software, services dependencies.'
                ],
                keyActions: [
                    'Create unified vendor registry with chain mapping.'
                ]
            },
            {
                id: 'assessment',
                step: 3,
                title: 'Risk Assessments & Due Diligence',
                subtitle: 'SR-4/5 + 27036-3',
                description: 'Perform comprehensive assessments leveraging NIST SR control families and ISO 27036-3 supply chain security guidelines.',
                icon: ClipboardCheck,
                color: 'text-cyan-600',
                bgColor: 'bg-cyan-50',
                accent: 'from-cyan-600 to-sky-600',
                link: 'vendors/reviews',
                cta: 'Go to Security Reviews',
                bestPractices: [
                    'Apply ISO 27036-3 for ICT supply chain risks.',
                    'Review SOC 2, ISO reports, and audit findings.',
                    'Prioritize fourth-party and multi-layer chain risks.'
                ],
                keyActions: [
                    'Use NIST SR family for control-based assessment.'
                ]
            },
            {
                id: 'contracts',
                step: 4,
                title: 'Develop Contracts & Agreements',
                subtitle: 'SR-3 + 27036-2',
                description: 'Create supplier agreements incorporating both NIST flow-down requirements and ISO 27036-2 lifecycle security clauses.',
                icon: FileTextIcon,
                color: 'text-sky-600',
                bgColor: 'bg-sky-50',
                accent: 'from-sky-600 to-blue-600',
                link: 'vendors/dpa-manager',
                cta: 'Go to DPA Manager',
                bestPractices: [
                    'Add ISO 27036-2 lifecycle security clauses.',
                    'Include breach notification, audit rights, termination.',
                    'Define sub-processor chain visibility requirements.'
                ],
                keyActions: [
                    'Incorporate NIST SR-3 flow-down requirements.'
                ]
            },
            {
                id: 'controls',
                step: 5,
                title: 'Implement Mitigation Controls',
                subtitle: 'SR-5/6 + 27036-3',
                description: 'Deploy controls addressing both NIST supply chain requirements and ISO 27036-3 guidelines for hardware, software, and services security.',
                icon: ShieldCheck,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-indigo-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Implement ISO 27036-3 chain visibility measures.',
                    'Deploy access controls and encryption by tier.',
                    'Create POA&Ms with dual-framework alignment.'
                ],
                keyActions: [
                    'Apply NIST SR-5 supplier assessment controls.'
                ]
            },
            {
                id: 'monitoring',
                step: 6,
                title: 'Establish Ongoing Monitoring',
                subtitle: 'SR-7 + 27036-2/3',
                description: 'Implement continuous monitoring combining NIST C-SCRM monitoring with ISO 27036-2 supplier review processes.',
                icon: ActivitySquare,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Apply ISO 27036-2 monitoring/review processes.',
                    'Configure automated change detection tools.',
                    'Schedule periodic reassessments by vendor tier.'
                ],
                keyActions: [
                    'Implement NIST continuous monitoring approach.'
                ]
            },
            {
                id: 'incident',
                step: 7,
                title: 'Handle Incidents & Offboarding',
                subtitle: 'IR + 27036-2 Lifecycle',
                description: 'Manage incidents and offboarding with integrated NIST IR family and ISO 27036-2 lifecycle improvement processes.',
                icon: AlertTriangle,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-600 to-purple-600',
                link: 'vendors',
                cta: 'Go to Vendor Dashboard',
                bestPractices: [
                    'Define secure offboarding with data destruction.',
                    'Measure KPIs for both frameworks.',
                    'Mature toward advanced C-SCRM and chain visibility.'
                ],
                keyActions: [
                    'Integrate NIST IR family with ISO 27001 Clause 16.'
                ]
            }
        ]
    }
};

const OVERLAP_NOTES = [
    {
        icon: GitMerge,
        title: 'NIST 800-161 → ISO 27036',
        desc: 'NIST SR controls provide the "what" while ISO 27036 provides the "how" for supplier security. Use together for comprehensive TPRM.',
        color: 'text-purple-600',
        bg: 'bg-purple-50 border-purple-200',
    },
    {
        icon: Lock,
        title: 'ISO 27001 A.5 → ISO 27036',
        desc: 'ISO 27036 expands on A.5.19–A.5.22 controls with detailed supplier relationship guidance. Use 27036 for implementation depth.',
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200',
    },
    {
        icon: Shield,
        title: 'NIST CSF 2.0 Integration',
        desc: 'NIST SP 800-161 aligns with NIST CSF 2.0 Supply Chain Risk Management (GV.SC). Combine for enterprise-wide C-SCRM.',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200',
    },
];

// Reusable icon for arbitrary places
function FileTextIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
}

export default function VendorProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");
    const [activeFw, setActiveFw] = useState<'nist' | 'iso' | 'hybrid'>('nist');

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'vendor'
    }, { enabled: !!clientId });

    // Derive mock statuses or real data based on vendors
    const { data: vendors } = trpc.vendors.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: dpas } = trpc.vendors.listDpas.useQuery({ clientId }, { enabled: !!clientId });

    const hasVendors = !!vendors && vendors.length > 0;
    const hasAssessedVendors = !!vendors && vendors.some((v: any) => v.securityScore > 0);
    const hasDpas = !!dpas && dpas.length > 0;

    // Simplistic completion logic mapping step id to status
    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'governance': return 'pending'; // Requires manual sign-off outside this scope typically
            case 'inventory': return hasVendors ? 'completed' : 'pending';
            case 'assessment': return hasAssessedVendors ? 'completed' : 'pending';
            case 'contracts': return hasDpas ? 'completed' : 'pending';
            case 'controls': return 'pending';
            case 'monitoring': return 'pending';
            case 'incident': return 'pending';
            default: return 'pending';
        }
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
                        <Link href={`/clients/${clientId}/vendors`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Vendors Dashboard
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            TPRM Program Guides
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
                                Completion based on real-time data from your vendors dashboard. Complete all stages to initialize the program.
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

                                                <div className="pt-2 border-t border-slate-50 flex items-center justify-end">
                                                    <Link href={`/clients/${clientId}/${step.link}`}>
                                                        <Button className={`bg-gradient-to-r ${status === 'completed' ? 'from-emerald-600 to-green-600' : step.accent} hover:opacity-90 text-white shadow-md transition-all group-hover:translate-x-1 font-semibold`}>
                                                            {step.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ISO & NIST Relationship/Overlap Notes */}
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
                    guideType="vendor"
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
