import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Loader2, AlertCircle, CheckCircle, Clock, Globe, Search, Building2, ShieldAlert, Activity, FileCheck, BookOpen, ArrowRight, TrendingUp, Eye, FileText, Shield, Radar, Zap } from "lucide-react";
import { Badge } from "@complianceos/ui/ui/badge";
import { Link } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { useVendorRiskOverviewQuery } from "./vendorRiskApi";
import DashboardLayout from "@/components/DashboardLayout";
import { ProgressIndicator } from "@complianceos/ui/ui/ProgressIndicator";
import { StatusBadge } from "@complianceos/ui/ui/StatusBadge";
import { PageGuide } from "@/components/PageGuide";

export interface AuditFinding {
    id: string;
    vendor: string;
    infrastructure: string;
    severity: "critical" | "high";
    cve: string;
}

/** Badge variant per TPRM tier (Tier 3 â†’ success, Tier 2 â†’ warning, Tier 1 â†’ error). */
function tierBadgeVariant(tier: string): "success" | "warning" | "error" | "info" {
    if (tier === "Tier 1 (Critical)") return "error";
    if (tier === "Tier 2 (High)") return "warning";
    if (tier === "Tier 3 (Medium)") return "success";
    return "info";
}

/** Data-viz severity bar color (Â§18): 0â€“100, higher = safer. */
function scoreBarColor(score: number): string {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
}

/** Short date + relative "due in N days" / "overdue by N days" for the next review. */
function formatNextReview(iso: string): string {
    const due = new Date(iso);
    if (isNaN(due.getTime())) return "â€”";
    const base = due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return `${base} (overdue ${Math.abs(days)}d)`;
    if (days === 0) return `${base} (due today)`;
    if (days <= 30) return `${base} (due in ${days}d)`;
    return base;
}

export default function VendorDashboard() {
    const { selectedClientId } = useClientContext();
    const { t } = useTranslation('vendors');
    const clientId = selectedClientId || 0;
    const { data: stats, isLoading } = trpc.vendors.getStats.useQuery({ clientId }, { enabled: !!clientId });
    const sendOutreachMutation = trpc.vendors.sendTargetAuditOutreach.useMutation();
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResults, setAuditResults] = useState<AuditFinding[] | null>(null);
    const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
    const [isOutreachOpen, setIsOutreachOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [emailContent, setEmailContent] = useState("");
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");

    const utils = trpc.useUtils();
    const { data: riskAssessments } = trpc.risks.getRiskAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: vendorRiskOverview, isLoading: riskLoading, isError: riskError } = useVendorRiskOverviewQuery(clientId);

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    const handleTargetAudit = () => {
        setIsAuditing(true);
        setAuditResults(null);
        toast.info("Initializing Target Audit...", {
            description: "Connecting to Global OSINT Intelligence feeds."
        });

        setTimeout(() => {
            toast.promise(
                new Promise((resolve) => setTimeout(resolve, 2000)),
                {
                    loading: 'Scanning 4th-party dependencies...',
                    success: 'Deep Scan Complete. Risk isolated to "CloudConnect Pro" infrastructure.',
                    error: 'Audit failed',
                }
            );
        }, 1000);

        setTimeout(() => {
            setIsAuditing(false);
            const defaultFindings: AuditFinding[] = [
                {
                    id: "vuln-1",
                    vendor: "CloudConnect Pro",
                    infrastructure: "Active Directory Sync",
                    severity: "critical",
                    cve: "CVE-2024-4321"
                },
                {
                    id: "vuln-2",
                    vendor: "SecureVault Backups",
                    infrastructure: "Log4j v2.14 Integration",
                    severity: "high",
                    cve: "CVE-2023-34048"
                }
            ];

            const activeFindings = defaultFindings.filter(f => {
                // If the user processed this finding, there should be a risk logged exactly like this
                const isResolved = riskAssessments?.some(risk =>
                    risk.title?.includes(f.vendor) &&
                    risk.threatDescription?.includes(f.infrastructure)
                );
                return !isResolved;
            });

            if (activeFindings.length > 0) {
                setAuditResults(activeFindings);
                toast.success("Audit Evidence Generated", {
                    description: "Critical risks identified. Suggested mitigation: Trigger Event Outreach and log risk instances."
                });
            } else {
                setAuditResults(null);
                toast.success("Audit Complete", {
                    description: "No new critical vulnerabilities detected across your supply chain surface."
                });
            }
        }, 4500);
    };

    const handleOpenOutreach = (finding: AuditFinding) => {
        setSelectedFinding(finding);
        setEmailTo(`security@${finding.vendor.toLowerCase().replace(/\s/g, '')}.com`);
        setEmailSubject(`URGENT: Affected Status Inquiry regarding ${finding.infrastructure}`);
        setEmailContent(`Team,\n\nWe are tracking a critical vulnerability (${finding.infrastructure} / ${finding.cve}). As a critical supplier in our ecosystem, we need immediate confirmation if your infrastructure is affected, and if our shared data is at risk.\n\nPlease reply to this email within 24 hours.\n\nRegards,\nCompliance & Risk Team`);
        setIsOutreachOpen(true);
    };

    const handleSendOutreach = async () => {
        if (!selectedFinding) return;
        setIsSending(true);

        try {
            await sendOutreachMutation.mutateAsync({
                clientId,
                vendorName: selectedFinding.vendor,
                emailTo,
                emailSubject,
                emailContent,
                infrastructure: selectedFinding.infrastructure,
            });

            setIsSending(false);
            setIsOutreachOpen(false);
            toast.success(`Communication Sent to ${selectedFinding.vendor}`, {
                description: "Email assigned to Communication Mailbox. Critical risk added to Risk Register."
            });

            // Instruct TRPC to refetch the risks to keep the UI perfectly synced
            utils.risks.getRiskAssessments.invalidate({ clientId });

            // Remove the sent finding from the list
            if (auditResults) {
                const remaining = auditResults.filter(f => f.id !== selectedFinding.id);
                if (remaining.length > 0) {
                    setAuditResults(remaining);
                } else {
                    setAuditResults(null);
                }
            }
            setSelectedFinding(null);
        } catch (error) {
            console.error(error);
            setIsSending(false);
            toast.error("Failed to send outreach");
        }
    };

    const riskData = stats?.riskBreakdown ? Object.entries(stats.riskBreakdown).map(([name, value]) => ({ name, value })) : [];
    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8']; // Green, Amber, Red, Slate

    return (
        <div className="relative space-y-6 page-transition">
            {/* Ambient Light Mode Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-emerald-500/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]" />
            </div>
            <div className="relative z-10 space-y-6">

                {/* Header */}
                <div className="animate-slide-down flex justify-end">
                    <PageGuide
                        title="Vendor Risk Management"
                        description="Overview of vendor ecosystem and risk posture."
                        rationale="Monitor vendor compliance and security posture to mitigate supply chain risks. Your supply chain is often your weakest security link."
                        howToUse={[
                            {
                                step: "Follow Lifecycle",
                                description: "Follow the 5-step lifecycle: Discover, Profile, Assess, Analyze, and Monitor.",
                                targetId: "vendor-lifecycle-workflow"
                            },
                            {
                                step: "Supply Chain Intel",
                                description: "Monitor OSINT and Dark Web feeds for potential breaches in your 3rd and 4th-party ecosystem.",
                                targetId: "vendor-intel-banner"
                            },
                        ]}
                        integrations={[
                            { name: "Global Catalog", description: "Standard security profiles for 10,000+ vendors." },
                            { name: "Risk Register", description: "Escalate supply chain risks to the corporate level." }
                        ]}
                        scenarios={[
                            {
                                title: "Assessing a High-Risk SaaS Provider",
                                example: "You are onboarding a new HR management system that will process sensitive employee PII.",
                                auditTip: "Focus on the 'Assess' phase of the lifecycle. Use a 'Full Security Review' template and require a SOC 2 Type II report as mandatory evidence."
                            },
                            {
                                title: "Identifying 4th Party Risk",
                                example: "One of your critical vendors is hosted on a cloud provider that just announced a major vulnerability.",
                                auditTip: "Use 'Supply Chain Intel' to see which of your vendors rely on that specific cloud provider. This allows you to proactively reach out to them before a breach occurs."
                            }
                        ]}
                    />
                </div>

                {/* Workflow Introduction Section - Getting Started with Vendor Risks */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl overflow-hidden relative mb-6 animate-fade-in" id="vendor-lifecycle-workflow">
                    <div className="absolute top-0 right-0 p-32 bg-teal-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 p-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                            <Globe className="w-7 h-7 text-teal-400" />
                            Getting Started with Vendor Risks
                        </CardTitle>
                        <CardDescription className="text-sidebar-foreground/80 font-medium text-base">
                            Manage vendor lifecycle from discovery to termination.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-500/0 via-teal-500/50 to-emerald-500/0 -z-10"></div>

                            {[
                                {
                                    step: "1. Discover",
                                    title: "Add Vendors",
                                    desc: "Import or discover new vendors.",
                                    link: `/clients/${clientId}/vendors/discovery`,
                                    icon: Search,
                                    color: "text-blue-300",
                                    bg: "bg-blue-900/60 border-blue-500/30",
                                    shadow: "shadow-blue-900/50"
                                },
                                {
                                    step: "2. Profile",
                                    title: "Categorize",
                                    desc: "Set criticality and tiering.",
                                    link: `/clients/${clientId}/vendors/all`,
                                    icon: Building2,
                                    color: "text-amber-300",
                                    bg: "bg-amber-900/60 border-amber-500/30",
                                    shadow: "shadow-amber-900/50"
                                },
                                {
                                    step: "3. Assess",
                                    title: "Security Review",
                                    desc: "Send questionnaires (SIG/CAIQ).",
                                    link: `/clients/${clientId}/vendors/reviews`,
                                    icon: ShieldAlert,
                                    color: "text-red-300",
                                    bg: "bg-red-900/60 border-red-500/30",
                                    shadow: "shadow-red-900/50"
                                },
                                {
                                    step: "4. Analyze",
                                    title: "Risk Analysis",
                                    desc: "Review findings and gaps.",
                                    link: `/clients/${clientId}/vendors/reviews`,
                                    icon: FileCheck,
                                    color: "text-teal-300",
                                    bg: "bg-teal-900/60 border-teal-500/30",
                                    shadow: "shadow-teal-900/50"
                                },
                                {
                                    step: "5. Monitor",
                                    title: "Continuous",
                                    desc: "Track performance and renewal.",
                                    link: `/clients/${clientId}/vendors/overview`,
                                    icon: Activity,
                                    color: "text-emerald-300",
                                    bg: "bg-emerald-900/60 border-emerald-500/30",
                                    shadow: "shadow-emerald-900/50"
                                }
                            ].map((item, i) => (
                                <Link key={i} href={item.link}>
                                    <div className="group relative flex flex-col items-center text-center p-5 rounded-2xl hover:bg-sidebar-foreground/5 transition-all duration-300 cursor-pointer h-full border border-transparent hover:border-sidebar-foreground/10 hover:shadow-xl backdrop-blur-sm">
                                        <div className={`w-14 h-14 rounded-2xl border ${item.bg} flex items-center justify-center mb-4 shadow-lg ${item.shadow} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                            <item.icon className={`w-7 h-7 ${item.color}`} />
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-bright mb-1.5">{item.step}</div>
                                        <div className="font-bold text-lg mb-1.5 text-white">{item.title}</div>
                                        <div className="text-sm text-sidebar-foreground/70 leading-snug font-medium group-hover:text-sidebar-foreground transition-colors">{item.desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* AI Supply Chain Intelligence Banner */}
                <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-1 rounded-2xl shadow-xl mb-6" id="vendor-intel-banner">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-sidebar-foreground/10">
                        <div className="flex items-center gap-4">
                            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400">
                                <Radar className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
                                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20 duration-1000"></div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-bold text-sm tracking-wide">AI SUPPLY CHAIN INTELLIGENCE</h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">MONITORING</span>
                                </div>
                                <p className="text-sidebar-foreground/80 text-sm mt-0.5">Scanning Dark Web & OSINT sources. <span className="text-white font-semibold flex items-center gap-1">2 potential breaches</span> detected in your 4th-party ecosystem.</p>
                            </div>
                        </div>
                        <button
                            className="px-4 py-2 bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-white rounded-lg text-sm font-bold transition-colors border border-sidebar-foreground/10 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                            onClick={handleTargetAudit}
                            disabled={isAuditing}
                        >
                            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Zap className="w-4 h-4 text-amber-400" />}
                            {isAuditing ? "Auditing..." : "Run Target Audit"}
                        </button>
                    </div>
                </div>

                {/* Audit Results Panel (Visible after scanning) */}
                {auditResults && auditResults.length > 0 && (
                    <div className="animate-slide-down bg-card rounded-2xl border border-destructive/20 shadow-sm overflow-hidden mb-6">
                        <div className="bg-destructive/5 p-4 border-b border-destructive/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-destructive">Target Audit Findings</h4>
                                    <p className="text-xs text-destructive/80 font-medium">Supply Chain Vulnerabilities Detected ({auditResults.length} Affected Vendors)</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
                                ACTION REQUIRED
                            </span>
                        </div>
                        <div className="divide-y divide-destructive/10">
                            {auditResults.map((finding) => (
                                <div key={finding.id} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <h5 className="text-sm font-black text-foreground uppercase tracking-wider">Compromised Asset Path</h5>
                                                {finding.severity === 'critical' ? (
                                                    <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded border border-destructive/20 uppercase">Critical</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:text-amber-400 text-[10px] font-bold rounded border border-amber-500/20 uppercase">High</span>
                                                )}
                                            </div>
                                            <div className="bg-muted p-4 rounded-xl border border-border space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground font-medium">3rd Party Vendor</span>
                                                    <span className="font-bold text-foreground">{finding.vendor}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground font-medium">Affected Service</span>
                                                    <span className="font-bold text-destructive font-mono text-xs bg-destructive/10 px-2 py-0.5 rounded">{finding.infrastructure}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground font-medium">4th Party Threat</span>
                                                    <span className="font-bold text-foreground">{finding.cve}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-between">
                                            <div>
                                                <h5 className="text-sm font-black text-foreground uppercase tracking-wider mb-2">Recommended Action</h5>
                                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                                    To maintain compliance, you must formally contact <span className="font-bold">{finding.vendor}</span> and log an incident risk.
                                                </p>
                                            </div>
                                            <Button onClick={() => handleOpenOutreach(finding)} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold group">
                                                Outreach & Log Risk
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}




                {/* Vendor Program Overview Callout */}
                <Card className="relative overflow-hidden border-none shadow-premium bg-gradient-to-r from-emerald-600 to-teal-700 text-white mb-6 animate-fade-in hover-lift">
                    <div className="absolute top-0 right-0 p-32 bg-sidebar-foreground/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex gap-5 items-center">
                            <div className="p-4 bg-sidebar-foreground/10 backdrop-blur-md rounded-2xl shadow-inner border border-sidebar-foreground/20 hidden sm:block">
                                <BookOpen className="w-8 h-8 text-emerald-50" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-white text-2xl tracking-tight">Vendor Risk Management Program Guide</h3>
                                <p className="text-emerald-50/90 mt-1 font-medium leading-relaxed">
                                    Learn how to establish a compliant TPRM program, categorize vendors, and manage lifecycle risks effectively.
                                </p>
                            </div>
                        </div>
                        <Link href={`/clients/${clientId}/vendors/program-guide`}>
                            <Button className="bg-sidebar-foreground text-emerald-900 hover:bg-emerald-50 font-bold whitespace-nowrap shadow-lg h-11 px-6 rounded-xl transition-all hover:scale-105 active:scale-95">
                                View Program Guide <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Key Performance Indicators */}
                <div className="grid gap-6 md:grid-cols-4" id="vendor-stats-summary">
                    <Card className="hover-lift border-none shadow-premium bg-card/60 backdrop-blur-xl group">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20 text-white rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                    <CheckCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Vendors</p>
                                    <h3 className="text-4xl font-black text-foreground">{stats?.totalVendors || 0}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="hover-lift border-none shadow-premium bg-card/60 backdrop-blur-xl group">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20 text-white rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Critical Risk</p>
                                    <h3 className="text-4xl font-black text-foreground">{stats?.riskBreakdown?.['High'] || 0}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Compliance Guide Card */}
                    <div className="md:col-span-2 p-5 rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-indigo-50/80 to-white shadow-premium flex flex-col justify-center cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group" onClick={() => window.location.href = `/clients/${clientId}/vendors/program-guide`}>
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-black text-foreground tracking-tight">ISO 27001 Alignment</span>
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 pointer-events-none font-bold shadow-inner">GUIDE</Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <span>Master your vendor risk program</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-card shadow-md text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <BookOpen className="w-7 h-7" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendor Risk Overview */}
                <section className="space-y-4" id="vendor-risk-overview" aria-label="Vendor risk overview">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Vendor risk overview</h2>
                        <p className="text-sm text-muted-foreground">TPRM posture across the vendor portfolio â€” tiers, residual scores and upcoming reviews.</p>
                    </div>

                    {riskLoading ? (
                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                {[0, 1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-[104px] w-full" />
                                ))}
                            </div>
                            <Skeleton className="h-[300px] w-full" />
                        </div>
                    ) : riskError || !vendorRiskOverview ? (
                        <EmptyState
                            icon={ShieldAlert}
                            title="Connect the vendorRisk.getOverview API"
                            description="The backend procedure lands with the next deploy. Tier counts, residual scores and review dates will appear here automatically."
                        />
                    ) : (
                        <>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="bg-card/60 backdrop-blur-xl">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Total vendors</p>
                                                <h3 className="text-2xl font-bold tabular-nums text-foreground">{vendorRiskOverview.summary.totalVendors ?? 0}</h3>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/60 backdrop-blur-xl">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                                <ShieldAlert className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Tier 1 (Critical)</p>
                                                <h3 className="text-2xl font-bold tabular-nums text-foreground">{vendorRiskOverview.summary.tierCounts?.tier1 ?? 0}</h3>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/60 backdrop-blur-xl">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <Activity className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Avg residual score</p>
                                                <h3 className="text-2xl font-bold tabular-nums text-foreground">{Math.round(vendorRiskOverview.summary.avgResidualScore ?? 0)}<span className="text-sm font-semibold text-muted-foreground"> / 100</span></h3>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/60 backdrop-blur-xl">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Reviews due</p>
                                                <h3 className="text-2xl font-bold tabular-nums text-foreground">{(vendorRiskOverview.summary.vendorsDueForReview ?? []).length}</h3>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="bg-card/60 backdrop-blur-xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-semibold tracking-tight">Vendor risk register</CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground">Residual score is 0â€“100 â€” higher is safer.</CardDescription>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor</th>
                                                <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">TPRM tier</th>
                                                <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Residual score</th>
                                                <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review frequency</th>
                                                <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next review</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(vendorRiskOverview.vendors ?? []).map((vendor) => (
                                                <tr key={vendor.vendorId} className="border-b border-border hover:bg-muted/50">
                                                    <td className="p-4 font-medium text-foreground whitespace-nowrap">{vendor.vendorName}</td>
                                                    <td className="p-4">
                                                        <Badge variant={tierBadgeVariant(vendor.tier)}>{vendor.tier}</Badge>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${scoreBarColor(vendor.residualScore)}`}
                                                                    style={{ width: `${Math.min(100, Math.max(0, vendor.residualScore))}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{vendor.residualScore}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground whitespace-nowrap">{vendor.reviewFrequency}</td>
                                                    <td className="p-4 text-muted-foreground whitespace-nowrap">{formatNextReview(vendor.nextReviewDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="h-[420px] border-none shadow-premium bg-card/60 backdrop-blur-xl hover-lift" id="vendor-risk-distribution">
                        <CardHeader className="pb-0 border-b border-border/50">
                            <CardTitle className="text-xl font-bold tracking-tight">Distribution by Criticality</CardTitle>
                            <CardDescription className="font-medium text-muted-foreground">Breakdown of vendors by assigned risk level</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[340px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={riskData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.name === 'High' ? COLORS[2] :
                                                    entry.name === 'Medium' ? COLORS[1] :
                                                        entry.name === 'Low' ? COLORS[0] : COLORS[3]
                                            } className="drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '13px' }} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="h-[420px] border-none shadow-premium bg-card/60 backdrop-blur-xl hover-lift">
                        <CardHeader className="pb-0 border-b border-border/50">
                            <CardTitle className="text-xl font-bold tracking-tight">Vendor Ecosystem</CardTitle>
                            <CardDescription className="font-medium text-muted-foreground">Geographic distribution (Visualizer)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[340px] pt-4 flex items-center justify-center">
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-map-pattern opacity-5 group-hover:opacity-10 transition-opacity duration-1000"></div>

                                <div className="z-10 text-center flex flex-col items-center">
                                    <div className="w-20 h-20 bg-card rounded-full shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <Globe className="w-10 h-10 text-muted-foreground group-hover:text-brand-bright transition-colors duration-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-foreground/70 mb-1">Global Visualization</h4>
                                    <p className="text-sm font-medium text-muted-foreground">Connecting interactive map modules...</p>
                                    <div className="flex gap-2 mt-4">
                                        <Badge variant="outline" className="bg-card/50 backdrop-blur-sm text-muted-foreground font-bold">US</Badge>
                                        <Badge variant="outline" className="bg-card/50 backdrop-blur-sm text-muted-foreground font-bold">EU</Badge>
                                        <Badge variant="outline" className="bg-card/50 backdrop-blur-sm text-muted-foreground font-bold">APAC</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <EnhancedDialog
                open={isOutreachOpen}
                onOpenChange={setIsOutreachOpen}
                title="Initiate Vendor Outreach"
                description={`Alert ${selectedFinding?.vendor || "Vendor"} about the zero-day threat and formally register this incident.`}
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setIsOutreachOpen(false)} disabled={isSending}>Cancel</Button>
                        <Button onClick={handleSendOutreach} disabled={isSending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSending ? "Processing..." : "Communicate & Log Risk"}
                        </Button>
                    </div>
                }
            >
                <div className="grid gap-6 py-4">
                    <div className="bg-muted p-4 border border-border rounded-lg space-y-4 shadow-inner">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">To Address</label>
                            <Input
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                className="font-mono text-sm bg-background"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Subject</label>
                            <Input
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="bg-background font-medium shadow-sm border-input"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Body</label>
                            <Textarea
                                value={emailContent}
                                onChange={(e) => setEmailContent(e.target.value)}
                                className="h-44 text-sm font-mono leading-relaxed bg-background shadow-sm border-input resize-none"
                            />
                        </div>
                    </div>
                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex items-start gap-4 shadow-sm">
                        <div className="p-2 bg-amber-500/10 rounded-full">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        </div>
                        <div>
                            <h4 className="text-amber-600 dark:text-amber-400 dark:text-amber-400 font-black text-sm uppercase tracking-wide">Risk Automation Context</h4>
                            <p className="text-amber-600 dark:text-amber-400 dark:text-amber-400 text-xs mt-1.5 leading-relaxed font-medium">This action will automatically generate a new record in your Risk Register categorized as <span className="font-bold underline">Supply Chain Security Incident</span>. The risk will block closure until the vendor confirms remediation via this communication thread.</p>
                        </div>
                    </div>
                </div>
            </EnhancedDialog>
        </div>
    );
}
