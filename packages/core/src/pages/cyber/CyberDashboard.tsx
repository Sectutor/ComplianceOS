import React from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Activity,
    Lock,
    ArrowRight,
    CheckCircle2,
    Shield,
    FileText,
    Server,
    Zap,
    BookOpen,
    Target
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";
import { PageGuide } from "@/components/PageGuide";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ComplianceMonitorPanels } from "@/pages/cyber/ComplianceMonitorPanels";
import ThreatLandscapePanels from "@/pages/cyber/ThreatLandscapePanels";

export default function CyberDashboard() {
    const { selectedClientId } = useClientContext();
    const { t } = useTranslation('dashboard');
    const [, setLocation] = useLocation();

    const sections = [
        {
            title: "NIS2 Assessment",
            headerTitle: "Article 21 Compliance",
            description: "Conduct a comprehensive gap analysis against the 10 key measures of the NIS2 Directive.",
            icon: ShieldCheck,
            color: "from-brand-bright to-brand",
            textColor: "text-brand-bright",
            bgLight: "bg-sky-50",
            path: `/clients/${selectedClientId}/cyber/assessment`,
            benefits: [
                "Automated gap analysis",
                "Compliance scoring",
                "Actionable remediation plan"
            ]
        },
        {
            title: "Risk Management",
            headerTitle: "Cyber Risk Framework",
            description: "Identify, assess, and mitigate risks to network and information systems security.",
            icon: AlertTriangle,
            color: "from-amber-500 to-orange-400",
            textColor: "text-amber-600",
            bgLight: "bg-amber-50",
            path: `/clients/${selectedClientId}/risks/dashboard`,
            benefits: [
                "Risk Register & Matrix",
                "Threat modeling",
                "Treatment planning"
            ]
        },
        {
            title: "Business Continuity",
            headerTitle: "Article 21 (c)",
            description: "Ensure continuity of essential services with BIA, recovery plans, and crisis management.",
            icon: Activity,
            color: "from-teal-500 to-violet-400",
            textColor: "text-teal-600",
            bgLight: "bg-teal-50",
            path: `/clients/${selectedClientId}/business-continuity`,
            benefits: [
                "Business Impact Analysis",
                "Disaster Recovery Plans",
                "Crisis Management"
            ]
        },
        {
            title: "Incident Reporting",
            headerTitle: "Article 23 Notifications",
            description: "Streamlined workflow for reporting significant incidents to the CSIRT within strict 24h/72h deadlines.",
            icon: Zap,
            color: "from-rose-500 to-red-400",
            textColor: "text-rose-600",
            bgLight: "bg-rose-50",
            path: `/clients/${selectedClientId}/cyber/incidents`,
            benefits: [
                "24h Early Warning wizard",
                "72h Incident Notification",
                "Root cause analysis log"
            ]
        },
        {
            title: "Supply Chain Security",
            headerTitle: "Vendor Risk Management",
            description: "Manage risks stemming from your relationships with suppliers and service providers.",
            icon: Lock,
            color: "from-blue-500 to-cyan-400",
            textColor: "text-blue-600",
            bgLight: "bg-blue-50",
            path: `/clients/${selectedClientId}/vendors/overview`,
            benefits: [
                "Certifications tracking",
                "Supplier assessments",
                "Third-party risk monitoring"
            ]
        },
        {
            title: "Documentation & Evidence",
            headerTitle: "Article 21 Compliance",
            description: "Centralized repository for policies, procedures, and evidence required for NIS2 audits.",
            icon: FileText,
            color: "from-slate-500 to-gray-400",
            textColor: "text-slate-600",
            bgLight: "bg-slate-50",
            path: `/clients/${selectedClientId}/cyber/documents`,
            benefits: [
                "Policy management",
                "Evidence collection",
                "Audit trail"
            ]
        },
        {
            title: "Mapping Hub",
            headerTitle: "Framework Alignment",
            description: "Cross-reference NIS2 measures against ISO 27001, ENISA guidelines, and internal controls.",
            icon: Shield,
            color: "from-emerald-500 to-teal-400",
            textColor: "text-emerald-600",
            bgLight: "bg-emerald-50",
            path: `/clients/${selectedClientId}/cyber/mapping`,
            benefits: [
                "ISO 27001 Cross-walk",
                "ENISA Technical Mapping",
                "Programmatic Traceability"
            ]
        },
        {
            title: "Compliance Workbook",
            headerTitle: "Guidance & Evidence",
            description: "Dedicated regulatory catalog with official guidance and evidence blueprints for all NIS2 measures.",
            icon: BookOpen,
            color: "from-sky-500 to-indigo-500",
            textColor: "text-sky-600",
            bgLight: "bg-sky-50",
            path: `/clients/${selectedClientId}/cyber/workbook`,
            benefits: [
                "Official requirement text",
                "Regulatory guidance",
                "Evidence blueprints"
            ]
        },
        {
            title: "Threat Intelligence",
            headerTitle: "Scenario-based Analysis",
            description: "Sector-specific threat landscape analysis and automated risk scenarios based on ENISA guidance.",
            icon: Shield,
            color: "from-indigo-600 to-violet-500",
            textColor: "text-indigo-600",
            bgLight: "bg-indigo-50",
            path: `/clients/${selectedClientId}/cyber/threat-intel`,
            benefits: [
                "ENISA taxonomy mapping",
                "Automated scenarios",
                "TARA risk assessing"
            ]
        },
        {
            title: "Vulnerability Management",
            headerTitle: "Article 21 (e) (g)",
            description: "Automated CVE tracking, patch management, and vulnerability disclosure procedures.",
            icon: ShieldAlert,
            color: "from-blue-600 to-indigo-600",
            textColor: "text-blue-600",
            bgLight: "bg-blue-50",
            path: `/clients/${selectedClientId}/cyber/vulnerabilities`,
            benefits: [
                "Automated NVD/CVE scans",
                "Patch management workflow",
                "Vulnerability aging metrics"
            ]
        },
        {
            title: "Asset Criticality Matrix",
            headerTitle: "Systemic Asset Tracking",
            description: "Define and monitor the criticality of ICT assets based on confidentiality, integrity, and availability.",
            icon: Server,
            color: "from-slate-700 to-slate-900",
            textColor: "text-slate-800",
            bgLight: "bg-slate-100",
            path: `/clients/${selectedClientId}/cyber/assets`,
            benefits: [
                "BIA alignment",
                "Criticality scoring (CIA)",
                "Dependency mapping"
            ]
        },
        {
            title: "Security Testing & Exercises",
            headerTitle: "Art. 21 Testing",
            description: "Manage pentests, vulnerability scans, and red team exercises for continuous assurance.",
            icon: Target,
            color: "from-rose-500 to-rose-700",
            textColor: "text-rose-600",
            bgLight: "bg-rose-50",
            path: `/clients/${selectedClientId}/cyber/testing`,
            benefits: [
                "Pentest tracking",
                "Automated scan logs",
                "Red Team scenarios"
            ]
        }
    ];

    const { data: incidents } = trpc.cyber.getIncidents.useQuery(
        { clientId: selectedClientId! },
        { enabled: !!selectedClientId }
    );

    const significantActiveIncidents = incidents?.filter(i => i.isSignificant && !i.reportedToAuthorities && i.status !== 'resolved') || [];

    const getTargetId = (title: string) => {
        switch (title) {
            case "NIS2 Assessment": return "cyber-nis2-assessment";
            case "Incident Reporting": return "cyber-incident-reporting";
            case "Supply Chain Security": return "cyber-vendor-risk";
            case "Business Continuity": return "cyber-continuity";
            case "Compliance Workbook": return "cyber-workbook";
            default: return undefined;
        }
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-sky-600" />
                        NIS2 & Cyber Resilience
                        <Badge className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-none px-3 py-1 text-[10px] font-bold tracking-widest shadow-lg shadow-sky-200 uppercase">
                            Dashboard
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
                        Centralized command for NIS2 compliance and systemic cyber resilience.
                    </p>
                </div>
                <PageGuide
                    title="Cyber Resilience (NIS2)"
                    description="Centralized command for NIS2 compliance and systemic cyber resilience."
                    rationale="The NIS2 Directive introduces strict security measures and reporting obligations for essential and important entities. This dashboard helps you navigate Article 21 (measures) and Article 23 (reporting) to ensure legal compliance and technical hardening."
                    howToUse={[
                        {
                            step: "Assess Compliance",
                            description: "Start with the NIS2 Assessment to gap analyze your current posture against the 10 key measures.",
                            targetId: "cyber-nis2-assessment"
                        },
                        {
                            step: "Incident Reporting",
                            description: "Access the workflow for 24h/72h incident notifications required by the Directive.",
                            targetId: "cyber-incident-reporting"
                        },
                        {
                            step: "Supply Chain",
                            description: "Monitor risks from your external vendors and service providers.",
                            targetId: "cyber-vendor-risk"
                        },
                        {
                            step: "Continuity Planning",
                            description: "Build and test your Business Impact Analysis (BIA) and recovery plans.",
                            targetId: "cyber-continuity"
                        }
                    ]}
                    scenarios={[
                        {
                            title: "Critical Incident Response",
                            example: "A major ransomware attack hits a core system. Use the Incident Reporting module to meet the 24-hour Early Warning deadline for the CSIRT.",
                            auditTip: "Regulators look for 'vulnerability to significant impact'. Document not just the tech fix, but the business continuity steps taken to protect essential services."
                        },
                        {
                            title: "Third-Party Breach",
                            example: "A SaaS provider used by your HR team is breached. Use Supply Chain Security to assess the impact.",
                            auditTip: "Article 21 specifically mandates 'supply chain security'. Ensure you have a central list of all critical suppliers and their security certifications (ISO 27001, SOC 2)."
                        }
                    ]}
                    integrations={[
                        { name: "Risk Register", description: "Cyber risks identified during assessment automatically sync to your global risk board." },
                        { name: "Incident Management", description: "Direct link to CSIRT reporting workflows." }
                    ]}
                />
            </div>

            {/* Significant Incident Alert Overlay */}
            {significantActiveIncidents.length > 0 && (
                <Card className="border-none shadow-2xl shadow-red-200 bg-red-600 text-white rounded-[2.5rem] overflow-hidden animate-bounce-subtle">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex gap-6 items-center">
                            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-2xl">ACTION REQUIRED: Significant Incident</h3>
                                <p className="text-red-100 font-medium text-lg">
                                    You have {significantActiveIncidents.length} significant incident(s) that require mandatory NIS2 notification within 24h.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setLocation(`/clients/${selectedClientId}/cyber/incidents`)}
                            className="bg-white hover:bg-red-50 text-red-600 font-black h-14 px-10 rounded-2xl shadow-xl transition-all active:scale-95 whitespace-nowrap text-lg"
                        >
                            Report to CSIRT <ArrowRight className="w-6 h-6 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-brand p-8 md:p-12 text-white shadow-2xl shadow-sky-900/20">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-brand-bright/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />

                <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                            <Shield className="w-4 h-4 text-brand-bright" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-100">Cyber Resilience OS</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
                            NIS2 <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-bright via-brand-bright to-emerald-400">
                                Mastery.
                            </span>
                        </h1>
                        <p className="text-lg text-sky-100/70 leading-relaxed font-medium max-w-lg">
                            An integrated ecosystem for managing the complexities of NIS2 compliance, risk governance, and technical resilience.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            {[
                                { label: "NIS2 Compliant", icon: CheckCircle2 },
                                { label: "ISO 27001 Aligned", icon: CheckCircle2 },
                                { label: "DORA Ready", icon: CheckCircle2 },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center space-x-2 text-xs font-bold text-sky-100/60 uppercase tracking-wider">
                                    <item.icon className="w-3.5 h-3.5 text-brand-bright" />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="hidden lg:flex justify-center relative">
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-3xl rotate-3 hover:rotate-0 transition-all duration-700 group cursor-default">
                            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/10">
                                {[Server, Activity, Lock, Zap].map((Icon, i) => (
                                    <div key={i} className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center group-hover:bg-brand-bright/20 transition-colors">
                                        <Icon className="w-8 h-8 text-brand-bright" />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex justify-between items-end mb-3">
                                    <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Resilience Index</div>
                                    <div className="text-xl font-black text-brand-bright">84%</div>
                                </div>
                                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-[84%] bg-gradient-to-r from-brand-bright to-emerald-400 rounded-full shadow-[0_0_20px_rgba(58,190,249,0.5)]" />
                                </div>
                                <div className="mt-3 flex gap-1.5 overflow-hidden">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className={cn("h-1 flex-1 rounded-full", i < 6 ? "bg-brand-bright" : "bg-white/10")} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Access / Guide */}
            <div className="grid md:grid-cols-4 gap-8">
                <Card className="md:col-span-3 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden ring-1 ring-slate-200/50">
                    <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-8">
                        <div className="flex gap-6 items-center">
                            <div className="h-16 w-16 bg-sky-50 rounded-2xl flex items-center justify-center text-brand-bright">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-xl">NIS2 Compliance Workbook</h3>
                                <p className="text-slate-500 font-medium">
                                    Access established best practices and evidence blueprints for every NIS2 measure.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setLocation(`/clients/${selectedClientId}/cyber/workbook`)}
                            className="bg-brand-bright hover:bg-brand text-white font-bold h-14 px-8 rounded-2xl shadow-lg shadow-sky-100 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Open Workbook <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-brand overflow-hidden flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-xs font-black text-white/50 uppercase tracking-widest mb-2">Total Modules</div>
                    <div className="text-5xl font-black text-white">06</div>
                </Card>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {sections.map((section, idx) => (
                    <Card key={idx} id={getTargetId(section.title)} className="group overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-200/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-900/5">
                        <CardContent className="p-0">
                            <div className={`h-2 bg-gradient-to-r ${section.color}`} />
                            <div className="p-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`h-16 w-16 rounded-2xl ${section.bgLight} ${section.textColor} flex items-center justify-center shadow-inner`}>
                                        <section.icon className="w-8 h-8" />
                                    </div>
                                    <Badge variant="outline" className="font-black text-[10px] tracking-widest text-slate-400 uppercase border-slate-200 px-3 py-1 rounded-full">
                                        {section.headerTitle}
                                    </Badge>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-4">{section.title}</h2>
                                <p className="text-slate-500 mb-8 leading-relaxed font-medium text-sm">
                                    {section.description}
                                </p>
                                <div className="space-y-4 mb-10">
                                    {section.benefits.map((benefit, bIdx) => (
                                        <div key={bIdx} className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-tight">
                                            <div className={cn("w-1.5 h-1.5 rounded-full mr-3 bg-gradient-to-r", section.color)} />
                                            {benefit}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    onClick={() => setLocation(section.path)}
                                    className={cn(
                                        "w-full bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 font-bold py-6 rounded-2xl border border-slate-200 transition-all duration-300 flex items-center justify-between px-6"
                                    )}
                                >
                                    <span>Access Module</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Why it Matters Section - Premium version */}
            <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-12 md:p-20 text-white mt-8 shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(58,190,249,0.1),transparent)]" />
                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight">Systemic Resilience</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        NIS2 ensures a high common level of cybersecurity across the Union, enhancing protection for critical infrastructure and critical national services.
                    </p>

                    <div className="grid md:grid-cols-3 gap-12 mt-16 text-left">
                        {[
                            { title: "Continuity", desc: "Ensuring essential services continue to operate even during severe cyber incidents." },
                            { title: "Security", desc: "NIS2 introduces strict accountability and enforcement for critical entities." },
                            { title: "Trust", desc: "Securing the supply chain is critical to preventing cascading attacks." }
                        ].map((item, i) => (
                            <div key={i} className="space-y-3">
                                <div className="h-1 w-12 bg-brand-bright rounded-full" />
                                <h3 className="font-black text-xl">{item.title}</h3>
                                <p className="text-slate-500 text-sm font-medium italic">"{item.desc}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Continuous Compliance Monitoring - NIS2 Phase 5 Task 5.2 (additive section) */}
            <ComplianceMonitorPanels />

            {/* NIS2 Threat Landscape Integration - Phase 1 Task 1.1 (additive section, Cycle 25) */}
            <ThreatLandscapePanels clientId={selectedClientId ?? 0} />
        </div>
    );
}
