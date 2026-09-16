import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
    Shield,
    FileCheck,
    Award,
    Activity,
    ArrowRight,
    CheckCircle2,
    PlayCircle,
    LayoutDashboard,
    Search,
    BookOpen,
    BarChart3,
    Building2,
    AlertTriangle,
    FileText,
    Info,
    Rocket,
    Clock,
    Target,
    Zap,
    Lock,
    Scale,
    ExternalLink,
    ChevronRight,
    Plus,
    Check
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Progress } from '@complianceos/ui/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@complianceos/ui/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@complianceos/ui/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useClientContext } from '@/contexts/ClientContext';
import { PageGuide } from '@/components/PageGuide';
import { Breadcrumb } from '@/components/Breadcrumb';
import ReportGeneratorDialog from '@/components/roadmap/ReportGeneratorDialog';

// Type definitions for Workflows & Methodology Steps
interface WorkflowStep {
    title: string;
    description: string;
    link: string;
    icon?: React.ReactNode;
    details?: string;
}

interface WorkflowGuide {
    id: string;
    title: string;
    description: string;
    goal: string;
    infographicSteps: WorkflowStep[];
}

const WORKFLOW_GUIDES: Record<string, WorkflowGuide> = {
    'iso27001': {
        id: 'iso27001',
        title: 'ISO 27001:2022 Certification Journey',
        description: 'The end-to-end journey to establishing an ISMS and achieving accredited external certification.',
        goal: 'Prepare your organization for a successful external audit with full Annex A coverage.',
        infographicSteps: [
            {
                title: '1. Foundation & ISMS Scope',
                description: 'Define organizational scope, leadership charter, and security policy.',
                link: '/clients/select/iso27001/governance',
                details: 'Secure leadership commitment (Clause 5) and establish ISMS boundaries (Clause 4.3). Appoint internal security committee and publish the master Information Security Policy.'
            },
            {
                title: '2. Information Assets & Risk Assessment',
                description: 'Catalog assets, identify threats/vulnerabilities, and score risks.',
                link: '/clients/select/risks/register',
                details: 'Inventory all hardware, cloud infrastructure, and data assets (Clause 6.1.2). Evaluate risk likelihood and business impact to build the formal risk register.'
            },
            {
                title: '3. Annex A Controls & SoA',
                description: 'Select controls and formalize the Statement of Applicability.',
                link: '/clients/select/iso27001/soa',
                details: 'Review the 93 ISO 27001:2022 Annex A controls. Document justifications for inclusion and exclusion to generate your approved Statement of Applicability.'
            },
            {
                title: '4. Operational Policies & Workforce Training',
                description: 'Deploy mandatory governance policies and track employee acknowledgments.',
                link: '/clients/select/policies',
                details: 'Publish operational policies (Access Control, Cryptography, Incident Management) and ensure 100% staff completion of security awareness training.'
            },
            {
                title: '5. Internal Audit & Management Review',
                description: 'Conduct internal audit cycle and top management review.',
                link: '/clients/select/audit-hub',
                details: 'Execute an objective internal audit (Clause 9.2). Remediate identified non-conformities and present ISMS performance metrics to executive leadership (Clause 9.3).'
            },
            {
                title: '6. Stage 1 & Stage 2 Certification Audits',
                description: 'Undergo accredited third-party registrar examination.',
                link: '/clients/select/compliance-journey',
                details: 'Engage an accredited certification body. Clear Stage 1 documentation review and Stage 2 evidence effectiveness audit to earn your official certificate.'
            }
        ]
    },
    'soc2': {
        id: 'soc2',
        title: 'SOC 2 Type II Readiness & Examination',
        description: 'Comprehensive readiness, evidence automation, and independent CPA audit examination.',
        goal: 'Attain an unqualified SOC 2 Type II report to demonstrate operational security to enterprise customers.',
        infographicSteps: [
            {
                title: '1. Trust Services Criteria Scoping',
                description: 'Define in-scope systems, data boundaries, and selected criteria.',
                link: '/clients/select/readiness/wizard/SOC2',
                details: 'Define system description and select applicable Trust Services Categories (Security baseline + Availability, Confidentiality, Processing Integrity, Privacy).'
            },
            {
                title: '2. Control Design & Policy Formalization',
                description: 'Map internal controls to TSC requirements and approve security policies.',
                link: '/clients/select/controls',
                details: 'Design administrative and technical controls matching AICPA criteria. Enforce MFA, least privilege IAM, branch protection, and encrypted backup snapshots.'
            },
            {
                title: '3. Automated Evidence Collection (90-Day Window)',
                description: 'Gather continuous operational logs, tickets, and system proofs.',
                link: '/clients/select/evidence',
                details: 'Monitor continuous control effectiveness across the 90-to-180 day observation window. Accumulate auditable artifacts for every in-scope control.'
            },
            {
                title: '4. CPA Audit Fieldwork & Final Report',
                description: 'Undergo auditor sample testing and receive SOC 2 Type II report.',
                link: '/clients/select/audit-hub',
                details: 'Coordinate auditor interviews, fulfill evidence sample requests, provide management representation letter, and receive the finalized SOC 2 Type II report.'
            }
        ]
    },
    'hipaa': {
        id: 'hipaa',
        title: 'HIPAA Security & Privacy Compliance',
        description: 'End-to-end framework safeguarding Protected Health Information (PHI) across systems.',
        goal: 'Ensure 100% compliance with HIPAA Security, Privacy, and Breach Notification Rules.',
        infographicSteps: [
            {
                title: '1. Governance & Business Associate Agreements (BAAs)',
                description: 'Designate statutory officers and inventory all Business Associates.',
                link: '/clients/select/vendors',
                details: 'Appoint HIPAA Privacy and Security Officers. Inventory every external SaaS vendor and cloud provider handling ePHI and execute signed BAAs.'
            },
            {
                title: '2. HIPAA Security Risk Assessment',
                description: 'Identify threats and technical vulnerabilities to ePHI.',
                link: '/clients/select/risks/register',
                details: 'Perform comprehensive risk analysis required under 45 CFR § 164.308(a)(1)(ii)(A). Score vulnerabilities across physical, technical, and administrative areas.'
            },
            {
                title: '3. Technical Safeguards & Encryption Enforcement',
                description: 'Enforce AES-256 encryption at rest, TLS 1.3, and strict IAM.',
                link: '/clients/select/controls',
                details: 'Configure cloud databases with KMS encryption, mandate biometric/FIDO2 MFA, and verify emergency access procedures for healthcare records.'
            },
            {
                title: '4. Workforce Training & Breach Notification Drill',
                description: 'Train staff on PHI handling and simulate 60-day breach notification.',
                link: '/clients/select/cyber/incidents',
                details: 'Deliver annual HIPAA training to all employees. Rehearse statutory breach notification protocols to patients, HHS OCR, and media.'
            }
        ]
    },
    'cmmc': {
        id: 'cmmc',
        title: 'CMMC 2.0 Level 2 Defense Readiness',
        description: 'DoD contractor cybersecurity alignment with 110 NIST SP 800-171 requirements.',
        goal: 'Secure DoD contract eligibility through validated CMMC Level 2 third-party certification.',
        infographicSteps: [
            {
                title: '1. CUI Boundary & Enclave Scoping',
                description: 'Isolate Controlled Unclassified Information (CUI) processing environments.',
                link: '/clients/select/risks/assets',
                details: 'Identify everywhere CUI is stored, processed, or transmitted. Establish isolated virtual enclave boundaries to minimize compliance overhead.'
            },
            {
                title: '2. NIST 800-171 Gap Assessment & Control Implementation',
                description: 'Evaluate compliance across all 14 NIST families and remediate gaps.',
                link: '/clients/select/gap-analysis',
                details: 'Score current posture against 110 NIST 800-171 controls. Implement missing requirements such as FIPS-validated encryption and SIEM logging.'
            },
            {
                title: '3. System Security Plan (SSP) & POA&M Assembly',
                description: 'Author formal SSP documentation and remediation milestone plans.',
                link: '/clients/select/policies',
                details: 'Document comprehensive System Security Plan mapping operational implementations to NIST requirements, with clear POA&Ms for remaining gaps.'
            },
            {
                title: '4. Accredited C3PAO External Assessment',
                description: 'Undergo formal audit by Certified Third-Party Assessment Organization.',
                link: '/clients/select/audit-hub',
                details: 'Engage an accredited C3PAO for official assessment, validate SPRS score in the DoD Supplier Performance Risk System, and receive certification.'
            }
        ]
    },
    'gdpr': {
        id: 'gdpr',
        title: 'EU GDPR & Global Privacy Governance',
        description: 'Comprehensive operational compliance for GDPR, UK DPA, and international privacy laws.',
        goal: 'Establish robust privacy-by-design, DSAR fulfillment, and 72-hour breach readiness.',
        infographicSteps: [
            {
                title: '1. Article 30 Records of Processing (RoPA)',
                description: 'Map personal data categories, purposes, and lawful bases.',
                link: '/clients/select/privacy/ropa',
                details: 'Document personal data flows, retention schedules, and legal justifications across departments in compliance with GDPR Article 30.'
            },
            {
                title: '2. DPIAs & Cross-Border Transfer Impact Assessments',
                description: 'Conduct impact assessments and verify Standard Contractual Clauses.',
                link: '/clients/select/privacy/dpia',
                details: 'Evaluate privacy risks for high-risk processing operations and assess third-party cross-border transfers under Chapter V.'
            },
            {
                title: '3. DSAR Fulfillment Workflow',
                description: 'Deploy self-service data access and erasure processing pipelines.',
                link: '/clients/select/privacy/dsar',
                details: 'Implement verifiable identity authentication and end-to-end fulfillment for Right of Access, Rectification, and Erasure requests within 30 days.'
            },
            {
                title: '4. 72-Hour Supervisory Breach Notification Protocol',
                description: 'Rehearse regulatory breach reporting and notification timelines.',
                link: '/clients/select/cyber/incidents',
                details: 'Establish direct incident escalation channels to DPO and practice statutory notifications to supervisory authorities within 72 hours.'
            }
        ]
    },
    'nis2': {
        id: 'nis2',
        title: 'EU NIS2 Directive Cybersecurity Resilience',
        description: 'Statutory compliance for essential and important entities across European operations.',
        goal: 'Implement mandatory Article 21 cybersecurity measures and 24-hour incident reporting.',
        infographicSteps: [
            {
                title: '1. Classification & National Competent Authority Registration',
                description: 'Determine statutory entity tier and establish regulatory contacts.',
                link: '/clients/select/compliance-journey',
                details: 'Evaluate entity size and sector criteria under NIS2 Annex I/II to classify as Essential or Important. Register with national CSIRT authorities.'
            },
            {
                title: '2. Article 21 Cybersecurity Risk Management Measures',
                description: 'Deploy mandatory cryptography, MFA, and vulnerability management.',
                link: '/clients/select/controls',
                details: 'Implement technical baseline: multi-factor authentication, end-to-end data encryption, asset hygiene, and zero-trust perimeter access controls.'
            },
            {
                title: '3. Direct Supply Chain Security & Vendor Audits',
                description: 'Assess key IT service providers and cloud infrastructure vendors.',
                link: '/clients/select/vendors',
                details: 'Evaluate supply chain dependencies, enforce contractual security standards, and verify business continuity capabilities of critical suppliers.'
            },
            {
                title: '4. 24h Early-Warning & Incident Notification Pipeline',
                description: 'Deploy automated notification mechanisms for significant incidents.',
                link: '/clients/select/cyber/incidents',
                details: 'Operationalize statutory timelines: early warning within 24 hours, formal incident notification within 72 hours, and final report within 1 month.'
            }
        ]
    },
    'risk-assessment': {
        id: 'risk-assessment',
        title: 'Enterprise Risk Management Program',
        description: 'Identify, analyze, evaluate, and systematically treat organizational and cyber risks.',
        goal: 'Complete an enterprise risk register and board-approved treatment plan.',
        infographicSteps: [
            {
                title: '1. Asset Inventory & Ownership',
                description: 'Catalog critical information assets, systems, and data repositories.',
                link: '/clients/select/risks/assets',
                details: 'Create a comprehensive inventory of all information assets, including hardware, software, cloud infrastructure, and data. Assign owners and classification levels.'
            },
            {
                title: '2. Threat Modeling & Vulnerability Discovery',
                description: 'Identify cyber threats and technical vulnerabilities affecting assets.',
                link: '/clients/select/risks/vulnerabilities',
                details: 'Ingest vulnerability scan results and catalog threat vectors (e.g. ransomware, supply-chain, credential stuffing) threatening core assets.'
            },
            {
                title: '3. Risk Scoring & Matrix Analysis',
                description: 'Score risks based on likelihood, business impact, and exposure.',
                link: '/clients/select/risks/register',
                details: 'Quantify inherent risk scores, factor in existing mitigating controls, and determine residual risk levels against organizational risk appetite.'
            },
            {
                title: '4. Risk Treatment Plan Execution',
                description: 'Execute mitigation, transfer, avoidance, or acceptance strategies.',
                link: '/clients/select/risks/treatment-plan',
                details: 'Assign remediation owners, define control implementation milestones, allocate security budgets, and report posture to leadership.'
            }
        ]
    },
    'business-continuity': {
        id: 'business-continuity',
        title: 'Business Continuity & Disaster Recovery (ISO 22301)',
        description: 'Resilience program ensuring organizational survival and swift operational recovery from disruptions.',
        goal: 'Establish proven RTO/RPO targets and rehearsed disaster recovery playbooks.',
        infographicSteps: [
            {
                title: '1. Scope & Governance Charter',
                description: 'Establish BCMS policy, executive sponsor, and operational scope.',
                link: '/clients/select/business-continuity/plans',
                details: 'Define business continuity policy, designate crisis leadership team, and establish organizational context under ISO 22301 Clause 4.'
            },
            {
                title: '2. Business Impact Analysis (BIA)',
                description: 'Identify critical activities, dependencies, and set RTO/RPO.',
                link: '/clients/select/business-continuity/bia',
                details: 'Interview business unit leads to model downtime costs over time. Establish Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO).'
            },
            {
                title: '3. Disaster Recovery & Continuity Plans (BCP/DRP)',
                description: 'Author actionable recovery playbooks for datacenter/cloud outages.',
                link: '/clients/select/business-continuity/plans',
                details: 'Formulate emergency communication trees, failover runbooks, secondary site activations, and operational workarounds.'
            },
            {
                title: '4. Tabletop Simulation Exercises & Retrospectives',
                description: 'Validate plans through simulated crisis drills with team leaders.',
                link: '/clients/select/business-continuity/exercises',
                details: 'Conduct realistic tabletop disaster exercises, measure team response times, resolve execution bottlenecks, and update continuity plans.'
            }
        ]
    },
    'vendor-risk': {
        id: 'vendor-risk',
        title: 'Third-Party Vendor Risk Management (TPRM)',
        description: 'Holistic program to evaluate, tier, and continuously monitor third-party suppliers.',
        goal: 'Eliminate supply-chain vulnerabilities and ensure external partners uphold security standards.',
        infographicSteps: [
            {
                title: '1. Vendor Catalog & Criticality Tiering',
                description: 'Register all third-party suppliers and categorize by risk impact.',
                link: '/clients/select/vendors',
                details: 'Catalog every SaaS tool, hosting provider, and outsourced partner. Classify them into Tier 1 (Critical) through Tier 4 based on data access.'
            },
            {
                title: '2. Security Due Diligence & Questionnaires',
                description: 'Dispatch SIG/CAIQ questionnaires and inspect SOC 2 / ISO certs.',
                link: '/clients/select/vendors',
                details: 'Assess vendor security posture, verify independent audit certifications, review data encryption practices, and identify security shortcomings.'
            },
            {
                title: '3. Contractual Safeguards & DPAs',
                description: 'Negotiate right-to-audit clauses and data protection addendums.',
                link: '/clients/select/vendors',
                details: 'Ensure supplier contracts mandate prompt breach notification SLAs, right-to-audit provisions, and stringent confidentiality protections.'
            },
            {
                title: '4. Continuous Posture & SLA Monitoring',
                description: 'Monitor external risk scores and execute annual re-assessments.',
                link: '/clients/select/vendors',
                details: 'Track security ratings changes, monitor dark web credential leaks related to suppliers, and schedule recurring annual security reviews.'
            }
        ]
    },
    'incident-response': {
        id: 'incident-response',
        title: 'CSIRT & Cyber Incident Response Program',
        description: 'Enterprise framework for rapid triage, containment, eradication, and regulatory reporting.',
        goal: 'Minimize cyber breach impact, ensure zero unauthorized data loss, and maintain statutory compliance.',
        infographicSteps: [
            {
                title: '1. CSIRT Team Charter & Escalation Matrix',
                description: 'Define roles, incident severity criteria, and communication channels.',
                link: '/clients/select/cyber/incidents',
                details: 'Appoint Incident Commander, Technical Lead, Legal Counsel, and PR Officer. Define severity matrix (P1-P4) and off-band communication trees.'
            },
            {
                title: '2. Automated Threat Triage & Containment Playbooks',
                description: 'Implement containment runbooks for Ransomware, BOLA, and Phishing.',
                link: '/clients/select/cyber/incidents',
                details: 'Standardize forensic capture procedures, host network isolation steps, API token invalidation, and SIEM correlation rules.'
            },
            {
                title: '3. Simulated Breach Tabletop Drill',
                description: 'Rehearse crisis response with technical, legal, and executive teams.',
                link: '/clients/select/cyber/incidents',
                details: 'Run an unannounced mock cyberattack drill to evaluate Mean Time to Detect (MTTD), Mean Time to Contain (MTTC), and escalation effectiveness.'
            },
            {
                title: '4. Post-Mortem Review & Regulatory Reporting',
                description: 'Conduct blameless retrospectives and fulfill statutory reporting.',
                link: '/clients/select/cyber/incidents',
                details: 'Document root cause analysis, track corrective actions to completion, and maintain audit-ready records for regulators and insurance underwriters.'
            }
        ]
    }
};

export default function StartHere() {
    const params = useParams<{ id?: string }>();
    const [location, setLocation] = useLocation();
    const { selectedClientId, setSelectedClientId } = useClientContext();

    // Prioritize URL param, then Context, then fallback to 7
    const clientIdParam = params.id ? parseInt(params.id, 10) : null;
    const clientId = clientIdParam || selectedClientId || 7;

    const [activeTab, setActiveTab] = useState<'all' | 'frameworks' | 'programs'>('all');
    const [selectedGuide, setSelectedGuide] = useState<WorkflowGuide | null>(null);
    const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    // Clients query for workspace switcher
    const { data: clientsList } = trpc.clients.list.useQuery();
    const currentClient = clientsList?.find((c: any) => c.id === clientId) || {
        id: clientId,
        name: clientId === 7 ? "LaTorre LTD" : `Client #${clientId}`,
        industry: "Technology"
    };

    // Fetch active roadmaps for this client
    const {
        data: activeRoadmaps,
        isLoading: isLoadingRoadmaps,
        refetch: refetchRoadmaps
    } = trpc.roadmap.listStrategic.useQuery(
        { clientId: clientId },
        { enabled: !!clientId }
    );

    // Fetch roadmap templates from backend
    const { data: templates = [] } = trpc.roadmap.listTemplates.useQuery();

    // 1-Click Instant Instantiation Mutation
    const instantiateMutation = trpc.roadmap.instantiateTemplate.useMutation({
        onSuccess: (res) => {
            toast.success(`Strategic Roadmap initialized! ${res.milestonesCount} milestones pre-populated.`);
            refetchRoadmaps();
            const startedId = startingTemplateId;
            setStartingTemplateId(null);
            
            // Route to dedicated comprehensive program guide
            const matchedTemplate = templates.find(t => t.id === startedId);
            if (matchedTemplate?.programGuideUrl) {
                setLocation(`/clients/${clientId}${matchedTemplate.programGuideUrl}`);
            } else {
                const destination = getDestinationForRoadmap(res.roadmap);
                setLocation(destination);
            }
        },
        onError: (err) => {
            toast.error(`Failed to start roadmap: ${err.message}`);
            setStartingTemplateId(null);
        }
    });

    const handleStartRoadmap = async (templateId: string) => {
        setStartingTemplateId(templateId);
        try {
            await instantiateMutation.mutateAsync({
                clientId: clientId,
                templateId: templateId
            });
        } catch (error) {
            // Handled in onError
        }
    };

    // Route active roadmaps to comprehensive program guides when available
    const getDestinationForRoadmap = (r: any) => {
        if (!r) return `/clients/${clientId}/start-here`;
        const titleLower = (r.title || '').toLowerCase();
        const frameworkLower = (r.framework || '').toLowerCase();
        
        if (titleLower.includes('iso 27001') || frameworkLower.includes('iso 27001') || frameworkLower.includes('iso')) {
            return `/clients/${clientId}/iso27001/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('nis2') || frameworkLower.includes('nis2') || titleLower.includes('cyber resilience')) {
            return `/clients/${clientId}/cyber/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('privacy') || frameworkLower.includes('gdpr') || titleLower.includes('gdpr')) {
            return `/clients/${clientId}/privacy/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('continuity') || frameworkLower.includes('bcp') || frameworkLower.includes('22301') || titleLower.includes('business continuity')) {
            return `/clients/${clientId}/business-continuity/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('vendor') || frameworkLower.includes('tprm') || titleLower.includes('third-party')) {
            return `/clients/${clientId}/vendors/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('soc 2') || frameworkLower.includes('soc 2') || titleLower.includes('soc2')) {
            return `/clients/${clientId}/soc2/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('cmmc') || frameworkLower.includes('cmmc') || titleLower.includes('defense') || frameworkLower.includes('federal')) {
            return `/clients/${clientId}/federal/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('hipaa') || frameworkLower.includes('hipaa')) {
            return `/clients/${clientId}/hipaa/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('risk') || frameworkLower.includes('31000') || frameworkLower.includes('rmf')) {
            return `/clients/${clientId}/risks/program-guide?tab=roadmap`;
        }
        if (titleLower.includes('incident') || titleLower.includes('csirt')) {
            return `/clients/${clientId}/cyber/incidents`;
        }
        return `/clients/${clientId}/roadmap/${r.id}`;
    };

    // Route catalog templates to comprehensive program guides
    const getDestinationForTemplate = (template: any, activeRoadmap?: any) => {
        if (template.programGuideUrl) {
            return `/clients/${clientId}${template.programGuideUrl}`;
        }
        return getDestinationForRoadmap({
            title: template.title,
            framework: template.framework,
            id: activeRoadmap?.id
        });
    };

    const handleNavigateStep = (stepLink: string) => {
        // Resolve client placeholder
        const resolved = stepLink.replace('/clients/select', `/clients/${clientId}`);
        setLocation(resolved);
    };

    const handleSwitchClient = (newId: number) => {
        setSelectedClientId(newId);
        setLocation(`/clients/${newId}/start-here`);
    };

    // Filter templates based on active tab
    const frameworkCount = templates.filter(t => t.category === 'framework').length;
    const programCount = templates.filter(t => t.category === 'program').length;

    const filteredTemplates = templates.filter(t => {
        if (activeTab === 'frameworks') return t.category === 'framework';
        if (activeTab === 'programs') return t.category === 'program';
        return true;
    });

    // Match roadmap to template if existing
    const getActiveRoadmapForTemplate = (template: any) => {
        if (!activeRoadmaps || activeRoadmaps.length === 0) return null;
        return activeRoadmaps.find((r: any) =>
            r.title.toLowerCase().includes(template.framework.toLowerCase()) ||
            r.framework?.toLowerCase() === template.framework.toLowerCase() ||
            r.title.toLowerCase() === template.title.toLowerCase()
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                {/* TOP BREADCRUMB & WORKSPACE SWITCHER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Breadcrumb items={[{ label: "Start Here / Strategic Roadmaps" }]} />
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm font-medium">
                                    <Building2 className="w-4 h-4 mr-2 text-emerald-500" />
                                    <span className="text-slate-500 text-xs mr-1.5">Workspace:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{currentClient.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Select Active Client</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {clientsList?.map((c: any) => (
                                    <DropdownMenuItem
                                        key={c.id}
                                        onClick={() => handleSwitchClient(c.id)}
                                        className="cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{c.name}</span>
                                            <span className="text-xs text-slate-400">ID #{c.id} • {c.industry || 'Enterprise'}</span>
                                        </div>
                                        {c.id === clientId && <Check className="w-4 h-4 text-emerald-500 ml-2" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            className="h-10 px-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                            onClick={() => setReportDialogOpen(true)}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Board PDF
                        </Button>

                        <PageGuide
                            title="Strategic Roadmaps Command Center"
                            description="1-Click Launchpad to initialize tracked compliance roadmaps and explore end-to-end GRC methodologies."
                            rationale="Compliance roadmaps convert abstract standards into measurable execution milestones. Starting a roadmap pre-populates scheduled audit gates, risk assessments, and evidence collection milestones."
                            howToUse={[
                                {
                                    step: "Select a Strategic Goal",
                                    description: "Choose a framework (ISO 27001, SOC 2, HIPAA, CMMC) or an operational program (Risk, BCMS, TPRM).",
                                    targetId: "roadmap-grid"
                                },
                                {
                                    step: "1-Click Launch",
                                    description: "Click 'Start Roadmap' to instantly provision the milestone timeline in your active workspace.",
                                    targetId: "btn-start-roadmap"
                                },
                                {
                                    step: "Review Methodology",
                                    description: "Use 'View Steps' to inspect the educational journey and deep-link directly to respective modules.",
                                    targetId: "btn-view-steps"
                                },
                                {
                                    step: "Board Reporting",
                                    description: "Generate executive board-ready progress summaries at any point in the cycle.",
                                    targetId: "btn-generate-report"
                                }
                            ]}
                            scenarios={[
                                {
                                    title: "Turnkey Audit Readiness",
                                    example: "You need to achieve SOC 2 Type II within 6 months with clear quarterly gates.",
                                    auditTip: "Auditors expect evidence of management oversight. An active tracked roadmap proves formal project governance from day one."
                                }
                            ]}
                        />
                    </div>
                </div>

                {/* HERO BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#001e2b] to-slate-900 text-white shadow-2xl p-8 md:p-10 border border-slate-800">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    <div className="relative z-10 max-w-3xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 font-semibold text-xs">
                                🚀 Strategic Launchpad
                            </Badge>
                            <span className="text-slate-400 text-sm flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                Continuous Compliance Cycle 2026
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                            Start Here & Command Center
                        </h1>
                        <p className="text-base md:text-lg text-slate-300 leading-relaxed font-normal">
                            Instantly instantiate tracked compliance roadmaps for <strong className="text-white font-semibold">{currentClient.name}</strong> with pre-populated milestones, or explore guided step-by-step methodologies.
                        </p>
                    </div>
                </div>

                {/* ACTIVE ROADMAPS BAR (IF CLIENT HAS RUNNING ROADMAPS) */}
                {activeRoadmaps && activeRoadmaps.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Strategic Initiatives</h2>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {activeRoadmaps.length} Running
                                </Badge>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Click any initiative to view the interactive Gantt & milestone execution</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {activeRoadmaps.map((r: any) => (
                                <Card
                                    key={r.id}
                                    onClick={() => setLocation(getDestinationForRoadmap(r))}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                                >
                                    <CardHeader className="p-5 pb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-xs font-semibold uppercase bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-white border-slate-300 dark:border-slate-700">
                                                {r.framework || 'General'}
                                            </Badge>
                                            <Badge className="bg-emerald-600 text-white text-xs capitalize">
                                                {r.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                                            {r.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                                            {r.description || 'Continuous strategic execution tracking'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                        <div className="flex items-center text-xs text-slate-500">
                                            <Target className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            Target: {r.targetDate ? new Date(r.targetDate).toLocaleDateString() : 'Continuous'}
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center group-hover:translate-x-1 transition-transform">
                                            Resume Roadmap <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </span>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ROADMAP TEMPLATES CATALOG / LAUNCHPAD */}
                <div className="space-y-6" id="roadmap-grid">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Launchpad Catalog
                            </h2>
                            <p className="text-sm text-slate-500">
                                Select any framework or program below to instantly launch a tracked Strategic Roadmap.
                            </p>
                        </div>

                        {/* CATEGORY TABS */}
                        <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700/80 self-start shadow-inner">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'all'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <span>All</span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTab === 'all'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-500/30'
                                    : 'bg-slate-300/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                    }`}>
                                    {templates.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('frameworks')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'frameworks'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <span>Framework Certifications</span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTab === 'frameworks'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-500/30'
                                    : 'bg-slate-300/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                    }`}>
                                    {frameworkCount}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('programs')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'programs'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <span>Core GRC Programs</span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTab === 'programs'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-500/30'
                                    : 'bg-slate-300/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                    }`}>
                                    {programCount}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* TEMPLATES GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template) => {
                            const activeRoadmap = getActiveRoadmapForTemplate(template);
                            const guide = WORKFLOW_GUIDES[template.id];
                            const isStarting = startingTemplateId === template.id;

                            return (
                                <Card
                                    key={template.id}
                                    className={`bg-white dark:bg-slate-900 border rounded-3xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg ${activeRoadmap
                                        ? 'border-emerald-500/40 hover:border-emerald-500 ring-1 ring-emerald-500/20'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <CardHeader className="p-6 pb-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${template.category === 'framework'
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                    }`}
                                            >
                                                {template.framework}
                                            </Badge>

                                            <span className="text-xs text-slate-500 font-medium flex items-center">
                                                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                                {template.durationMonths} Months Duration
                                            </span>
                                        </div>

                                        <div>
                                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                                {template.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2 font-normal">
                                                {template.description}
                                            </CardDescription>
                                        </div>

                                        {/* Objectives preview */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                                                Key Phased Milestones ({template.milestones.length})
                                            </span>
                                            {template.milestones.slice(0, 3).map((m, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs truncate">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    <span className="truncate">{m.title}</span>
                                                </div>
                                            ))}
                                            {template.milestones.length > 3 && (
                                                <span className="text-[11px] text-slate-400 italic block pt-0.5">
                                                    +{template.milestones.length - 3} additional milestones...
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardFooter className="p-6 pt-2 flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                                        <div className="flex items-center gap-2 w-full">
                                            {activeRoadmap ? (
                                                <Button
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-sm"
                                                    onClick={() => setLocation(getDestinationForTemplate(template, activeRoadmap))}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    Resume Roadmap
                                                </Button>
                                            ) : (
                                                <Button
                                                    id="btn-start-roadmap"
                                                    disabled={isStarting}
                                                    onClick={() => handleStartRoadmap(template.id)}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-sm"
                                                >
                                                    {isStarting ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                            Initializing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Rocket className="w-4 h-4 mr-2" />
                                                            Start Roadmap
                                                        </>
                                                    )}
                                                </Button>
                                            )}

                                            {guide && (
                                                <Button
                                                    variant="outline"
                                                    id="btn-view-steps"
                                                    onClick={() => setSelectedGuide(guide)}
                                                    className="h-10 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="View Methodology & Steps"
                                                >
                                                    <BookOpen className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between w-full text-[11px] text-slate-500 px-1">
                                            <span>
                                                {activeRoadmap ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
                                                        Active in workspace
                                                    </span>
                                                ) : (
                                                    <span>Status: Not started</span>
                                                )}
                                            </span>
                                            {guide && (
                                                <button
                                                    onClick={() => setSelectedGuide(guide)}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                                                >
                                                    Explore Methodology →
                                                </button>
                                            )}
                                        </div>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* METHODOLOGY & STEPS MODAL DIALOG */}
                {selectedGuide && (
                    <Dialog open={!!selectedGuide} onOpenChange={(open) => !open && setSelectedGuide(null)}>
                        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-8 rounded-3xl">
                            <DialogHeader className="mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-600 text-white text-xs">Methodology Walkthrough</Badge>
                                </div>
                                <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {selectedGuide.title}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 leading-relaxed mt-1">
                                    {selectedGuide.description}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 mb-6 flex items-start gap-3">
                                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Target Milestone Goal</span>
                                    <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">{selectedGuide.goal}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    Execution Phases & Modules
                                </h3>

                                <div className="space-y-3">
                                    {selectedGuide.infographicSteps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-emerald-500/50 transition-colors"
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-black shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {step.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                        {step.details || step.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedGuide(null);
                                                    handleNavigateStep(step.link);
                                                }}
                                                className="shrink-0 h-8 text-xs font-semibold border-slate-300 dark:border-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                                            >
                                                Open Module <ExternalLink className="w-3 h-3 ml-1.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setSelectedGuide(null)}
                                    className="text-xs text-slate-500"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setSelectedGuide(null);
                                        handleStartRoadmap(selectedGuide.id);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9"
                                >
                                    <Rocket className="w-3.5 h-3.5 mr-1.5" />
                                    Start This Roadmap Now
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* EXECUTIVE BOARD REPORT GENERATOR DIALOG */}
                {reportDialogOpen && (
                    <ReportGeneratorDialog
                        open={reportDialogOpen}
                        onOpenChange={setReportDialogOpen}
                        clientId={clientId}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
