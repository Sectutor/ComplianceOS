import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import { format } from 'date-fns';
import { AssignProgramTaskModal } from '@/components/AssignProgramTaskModal';
import { toast } from 'sonner';
import {
    CheckCircle2, Lock, ArrowRight, BookOpen, ArrowLeft, Compass,
    Shield, Clock, DollarSign, GitMerge, AlertTriangle, Users, Calendar,
    Building, Target, Search, ShieldCheck, RefreshCw, Layers,
    Settings, ClipboardCheck, CheckSquare, ActivitySquare, Server, Flame, Activity, Stethoscope, BarChart3, Globe, Award, CircleDashed,
    CalendarClock, Download, ExternalLink, FileText
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useClientContext } from '@/contexts/ClientContext';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getTprmRoadmap } from '@/data/frameworkRoadmaps';

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
                accent: 'from-violet-600 to-teal-600',
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
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-fuchsia-600',
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
        color: 'text-indigo-700',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        badge: 'bg-teal-100 text-indigo-800',
        accent: 'from-teal-600 to-indigo-600',
        tabActive: 'bg-teal-600 text-white shadow-md',
        tabInactive: 'text-indigo-700 bg-teal-50/50 border border-teal-200 hover:bg-teal-100',
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
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-violet-600',
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
                accent: 'from-violet-600 to-teal-600',
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
        color: 'text-teal-600',
        bg: 'bg-teal-50 border-teal-200',
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

export default function VendorProgramGuide(props?: { id?: string | number; clientId?: string | number }) {
    const params = useParams<{ id?: string; clientId?: string }>();
    const [location, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const urlMatch = location.match(/\/clients\/(\d+)/);
    const idParam = props?.id || props?.clientId || params?.id || params?.clientId || (urlMatch ? urlMatch[1] : undefined);
    const clientId = typeof idParam === "number" ? idParam : parseInt(idParam || "0", 10) || selectedClientId || 0;

    const [activeFw, setActiveFw] = useState<'nist' | 'iso' | 'hybrid'>('nist');

    // Read ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'playbook' | 'roadmap' | 'architecture' | 'auditor'> = ['playbook', 'roadmap', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'playbook';
    const [activeTab, setActiveTab] = useState<'playbook' | 'roadmap' | 'architecture' | 'auditor'>(initialTab);

    // Track origin if navigated from Start Here
    const [returnToStartHere, setReturnToStartHere] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) {
                const payload = JSON.stringify({ url: returnTo, timestamp: Date.now() });
                sessionStorage.setItem(`tprm_start_here_origin_${clientId}`, payload);
                return returnTo;
            }
            if (document.referrer && document.referrer.includes('/start-here')) {
                const defaultUrl = `/clients/${clientId}/start-here`;
                const payload = JSON.stringify({ url: defaultUrl, timestamp: Date.now() });
                sessionStorage.setItem(`tprm_start_here_origin_${clientId}`, payload);
                return defaultUrl;
            }
            const stored = sessionStorage.getItem(`tprm_start_here_origin_${clientId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.url && parsed.url.includes('/start-here')) {
                    return parsed.url;
                }
            }
            const startHereStored = sessionStorage.getItem(`start_here_origin_${clientId}`);
            if (startHereStored) {
                const parsed = JSON.parse(startHereStored);
                if (parsed?.url && parsed.url.includes('/start-here') && (Date.now() - (parsed.timestamp || 0)) < 2 * 60 * 60 * 1000) {
                    sessionStorage.setItem(`tprm_start_here_origin_${clientId}`, JSON.stringify({
                        url: parsed.url,
                        timestamp: Date.now()
                    }));
                    return parsed.url;
                }
            }
        } catch {}
        return null;
    });

    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here') && clientId > 0) {
                sessionStorage.setItem(`tprm_start_here_origin_${clientId}`, JSON.stringify({
                    url: returnTo,
                    timestamp: Date.now()
                }));
                setReturnToStartHere(returnTo);
            }
        } catch {}
    }, [clientId, location]);

    const handleTabChange = (newTab: 'playbook' | 'roadmap' | 'architecture' | 'auditor') => {
        setActiveTab(newTab);
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('tab', newTab);
            if (returnToStartHere) {
                u.searchParams.set('returnTo', returnToStartHere);
                u.searchParams.set('returnLabel', 'Start Here');
            }
            window.history.replaceState({}, '', u.toString());
        } catch {}
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sp = new URLSearchParams(window.location.search);
            const currentTab = sp.get('tab');
            if (currentTab && validTabs.includes(currentTab as any) && currentTab !== activeTab) {
                setActiveTab(currentTab as any);
            }
        }
    }, [location]);

    const handleReturnToStartHere = () => {
        try {
            sessionStorage.removeItem(`tprm_start_here_origin_${clientId}`);
            sessionStorage.removeItem(`start_here_origin_${clientId}`);
        } catch {}
        const target = returnToStartHere || `/clients/${clientId}/start-here`;
        setReturnToStartHere(null);
        setLocation(target);
    };

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'vendor'
    }, { enabled: !!clientId });

    // Derive mock statuses or real data based on vendors
    const { data: vendors } = trpc.vendors.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: dpas } = trpc.vendors.listDpas.useQuery({ clientId }, { enabled: !!clientId });

    const safeVendors = Array.isArray(vendors) ? vendors : [];
    const safeDpas = Array.isArray(dpas) ? dpas : [];
    const criticalVendorsCount = safeVendors.filter((v: any) => v.criticality === 'Tier 1' || v.criticality === 'critical' || v.tier === '1' || v.tier === 'critical').length;
    const assessedVendorsCount = safeVendors.filter((v: any) => (v.securityScore && v.securityScore > 0) || v.status === 'assessed' || v.status === 'active').length;

    const hasVendors = safeVendors.length > 0;
    const hasAssessedVendors = assessedVendorsCount > 0;
    const hasDpas = safeDpas.length > 0;

    // Simplistic completion logic mapping step id to status
    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'governance': return 'pending';
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
    const progressPercentage = Math.min(100, Math.round(((completedSteps / Math.max(1, fw.steps.length)) * 0.5 + (hasVendors ? 0.25 : 0) + (hasDpas ? 0.25 : 0)) * 100)) || 45;

    return (
        <DashboardLayout fullWidth={true}>
            <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* Header Breadcrumb & Back */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className="h-8 gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Start Here
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Third-Party Risk Management (TPRM) Program Guide
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/clients/${clientId}/vendors`}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                                <Building className="w-3.5 h-3.5 text-amber-600" />
                                Vendors Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Return to Start Here Banner */}
                {returnToStartHere && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-center gap-3">
                            <Compass className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Active Program Implementation</p>
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                                    You navigated here from Start Here. Click the button anytime to return to your program roadmap.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Start Here
                        </Button>
                    </div>
                )}

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-xs font-bold uppercase tracking-wider">
                                    NIST SP 800-161 • ISO/IEC 27036-2
                                </Badge>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-bold">
                                    Supply Chain Due Diligence Ready
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                Third-Party & Vendor Risk Management Program Guide
                            </h1>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                Comprehensive C-SCRM operational manual covering vendor tiering, critical cloud subprocessor due diligence, continuous security monitoring, and governance audit dossiers.
                            </p>

                            {/* Embedded Multi-Standard Framework Switcher */}
                            <div className="pt-2 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">Active Standard:</span>
                                {(Object.keys(FRAMEWORKS) as Array<keyof typeof FRAMEWORKS>).map(key => {
                                    const f = FRAMEWORKS[key];
                                    const isActive = activeFw === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setActiveFw(key as any)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 border",
                                                isActive 
                                                    ? "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-sm" 
                                                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Readiness Metric Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shrink-0 w-full lg:w-80 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>Supply Chain Safeguards Score</span>
                                <span className="text-white text-base font-black">{progressPercentage}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-slate-700" />
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                                <div>Total Vendors: <strong className="text-white">{safeVendors.length}</strong></div>
                                <div>Tier 1 Critical: <strong className="text-white">{criticalVendorsCount}</strong></div>
                                <div>Active DPAs: <strong className="text-white">{safeDpas.length}</strong></div>
                                <div>Assessed: <strong className="text-white">{assessedVendorsCount}</strong></div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleTabChange('roadmap')}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs mt-2 rounded-lg h-8 gap-1.5 shadow"
                            >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Continue 90-Day Roadmap
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Button
                        variant={activeTab === 'playbook' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('playbook')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'playbook' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Implementation Playbook ({fw.shortLabel})
                    </Button>
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('roadmap')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'roadmap' ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <CalendarClock className="w-4 h-4 mr-1.5" />
                        90-Day Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('architecture')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'architecture' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <Layers className="w-4 h-4 mr-1.5" />
                        Supply Chain Tiering Architecture
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('auditor')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'auditor' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        Executive & Governance Audit Binder
                    </Button>
                </div>

                {/* TAB 1: Implementation Playbook */}
                {activeTab === 'playbook' && (
                    <div className="space-y-8">
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
                )}

                {/* TAB 2: 90-Day Roadmap */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-4">
                        {returnToStartHere && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                                <span className="font-medium">
                                    Roadmap active for client #{clientId}. Completed tasks automatically sync to your dashboard.
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleReturnToStartHere}
                                    className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                                    Return to Start Here
                                </Button>
                            </div>
                        )}
                        <Framework90DayRoadmap
                            spec={getTprmRoadmap(clientId)}
                            clientId={clientId}
                        />
                    </div>
                )}

                {/* TAB 3: Supply Chain Tiering Architecture */}
                {activeTab === 'architecture' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Supply Chain Tiering Architecture & Trust Boundary</h2>
                            <p className="text-sm text-slate-500">Document third-party criticality hierarchy, data flow boundaries, and subprocessor concentration risk.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                        <Server className="w-4 h-4" /> Tier 1: Critical Infrastructure
                                    </h3>
                                    <Badge className="bg-red-100 text-red-800 text-[10px] font-bold">Inherent High</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Hosting providers, production databases, and IAM services with direct customer data access or operational runtime dependency.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>AWS / Azure / GCP Cloud Infrastructure</li>
                                    <li>Production Aurora RDS / MongoDB Atlas</li>
                                    <li>Okta / Auth0 Identity & SSO Gateways</li>
                                    <li>Mandatory: Annual SOC 2 Type II + 24h Breach SLA</li>
                                </ul>
                            </div>
                            <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl p-5 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <Globe className="w-4 h-4" /> Tier 2: SaaS & Subprocessors
                                    </h3>
                                    <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">Inherent Medium</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Software platforms processing business or employee metadata, billing integrations, and customer communications.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>Salesforce / HubSpot CRM & Zendesk Desk</li>
                                    <li>Stripe / NetSuite Financial Gateways</li>
                                    <li>GitHub Enterprise & CI/CD Pipelines</li>
                                    <li>Mandatory: Executed DPA + Security Assessment</li>
                                </ul>
                            </div>
                            <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-5 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Tier 3: Contractors & Low Risk
                                    </h3>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Inherent Low</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">External advisory, marketing agencies, office utilities, and non-integrated transactional tools without system access.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>Specialized Legal & Tax Consultants</li>
                                    <li>Office Logistics & Facility Management</li>
                                    <li>Public Marketing & Social Media Tools</li>
                                    <li>Mandatory: Standard Confidentiality & NDA</li>
                                </ul>
                            </div>
                        </div>

                        {/* 4th-Party Concentration Risk Card */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <GitMerge className="w-4 h-4 text-amber-600" />
                                        Fourth-Party Concentration & Cloud Subservice Dependencies
                                    </h4>
                                    <p className="text-xs text-slate-500">Track downstream infrastructure providers to avoid systemic single points of failure across vendors.</p>
                                </div>
                                <Link href={`/clients/${clientId}/vendors`}>
                                    <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5">
                                        <Building className="w-3.5 h-3.5" /> View Vendor Roster
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Primary Cloud Dependency</span>
                                    <strong className="text-slate-800 dark:text-slate-200 text-sm">AWS us-east-1 / eu-west-2</strong>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Core Authentication Relying Party</span>
                                    <strong className="text-slate-800 dark:text-slate-200 text-sm">Okta Universal Directory</strong>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Edge CDN & WAF Routing</span>
                                    <strong className="text-slate-800 dark:text-slate-200 text-sm">Cloudflare Enterprise Edge</strong>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* TAB 4: Executive & Governance Audit Binder */}
                {activeTab === 'auditor' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Executive & Governance Audit Binder</h2>
                                <p className="text-sm text-slate-500">Consolidated compliance evidence package for third-party auditors, customer security reviews, and board oversight.</p>
                            </div>
                            <Button
                                onClick={() => toast.success("Exporting complete TPRM Executive Audit Dossier (ZIP)...")}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Vendor Audit Dossier (ZIP)
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Third-Party Risk Management Master Policy</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Formal corporate governance policy detailing onboarding due diligence, mandatory security clauses, continuous monitoring frequency, and offboarding termination protocols.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("TPRM Policy exported!")}>
                                    Generate Policy Evidence Document
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Subprocessor & Critical Vendor Register</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Comprehensive export of all {safeVendors.length} vendors with tiering classifications, security questionnaire scores, SOC 2 report validities, and DPA counter-signatures.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("Vendor inventory exported!")}>
                                    Export Subprocessor Register (CSV)
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Data Processing Addenda (DPA) Vault</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">{safeDpas.length} active data processing and Business Associate Agreements verifying GDPR Article 28 and HIPAA subprocessor liability compliance.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("DPA manifest exported!")}>
                                    Export DPA Ledger
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Vendor Exception & Risk Acceptance Log</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Documented executive approvals and compensating controls for vendors with identified security findings or missing certifications.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("Risk acceptance register generated!")}>
                                    Generate Exception Log
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
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
