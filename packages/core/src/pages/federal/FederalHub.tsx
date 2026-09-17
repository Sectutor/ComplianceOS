import DashboardLayout from "@/components/DashboardLayout";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FederalWorkflowsPanels } from "./FederalWorkflowsPanels";
import { FederalCmmcPanels } from "./FederalCmmcPanels";
import {
    FileText,
    ShieldCheck,
    ClipboardList,
    Zap,
    Lock,
    ScrollText,
    ArrowRight,
    Building2,
    CheckCircle2,
    BookOpen,
    AlertTriangle
} from "lucide-react";

export default function FederalHub() {
    const params = useParams();
    const clientId = Number(params.id);

    const modules = [
        {
            title: "FIPS 199 Categorization",
            description: "Categorize your system based on the impact to Confidentiality, Integrity, and Availability.",
            icon: Lock,
            path: `/clients/${clientId}/federal/fips-199`,
            category: "Categorization",
            status: "Required"
        },
        {
            title: "NIST 800-171 SSP",
            description: "System Security Plan (SSP) for CMMC Level 2 and NIST 800-171 compliance.",
            icon: FileText,
            path: `/clients/${clientId}/federal/ssp-171`,
            category: "System Security Plans",
            status: "In Progress"
        },
        {
            title: "NIST 800-172 SSP",
            description: "Enhanced security requirements for high-value assets and APT protection.",
            icon: ShieldCheck,
            path: `/clients/${clientId}/federal/ssp-172`,
            category: "System Security Plans",
            status: "Draft"
        },
        {
            title: "NIST 800-171 SAR",
            description: "Security Assessment Report (SAR) detailing the results of security control testing.",
            icon: ScrollText,
            path: `/clients/${clientId}/federal/sar-171`,
            category: "Security Assessments",
            status: "Ready"
        },
        {
            title: "NIST 800-172 SAR",
            description: "Enhanced SAR for advanced security requirements and specialized assessments.",
            icon: ClipboardList,
            path: `/clients/${clientId}/federal/sar-172`,
            category: "Security Assessments",
            status: "Ready"
        },
        {
            title: "Plan of Action & Milestones",
            description: "Standard DoD POA&M for tracking remediation of identified weaknesses.",
            icon: Zap,
            path: `/clients/${clientId}/federal/poam`,
            category: "Remediation",
            status: "Active"
        },
        {
            title: "Non-Compliance Gap Report",
            description: "Detailed analysis of implementation failures and security weaknesses.",
            icon: AlertTriangle,
            path: `/clients/${clientId}/federal/gap-report`,
            category: "Reporting",
            status: "New"
        }
    ];

    const categories = ["Categorization", "System Security Plans", "Security Assessments", "Remediation"];

    return (
        <DashboardLayout>
            <div className="p-8 space-y-6 w-full">
                <Breadcrumb items={[
                    { label: "Dashboard", href: `/clients/${clientId}/dashboard` },
                    { label: "Federal Compliance Hub" }
                ]} />

                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-foreground flex items-center gap-3 tracking-tight">
                            <Building2 className="h-10 w-10 text-primary" />
                            Federal Compliance Hub
                        </h1>
                        <p className="text-muted-foreground text-lg">Manage your DFARS, NIST 800-171/172, and CMMC documentation requirements.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href={`/clients/${clientId}/federal/rmf`}>
                            <Button className="font-bold h-12 px-6 gap-2 shadow-md">
                                <Zap className="h-4 w-4 fill-current" />
                                Start Guided RMF Journey
                            </Button>
                        </Link>
                        <div className="flex gap-3 h-12 items-center">
                            <Badge variant="info" className="px-4 py-1 font-bold">
                                DFARS 252.204-7012
                            </Badge>
                            <Badge variant="warning" className="px-4 py-1 font-bold">
                                NIST SP 800-171 Rev 3 Ready
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Federal Overview Callout */}
                <Card className="border-border bg-muted/40 mb-8">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 bg-primary/10 rounded-xl hidden sm:block">
                                <BookOpen className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-lg">Federal Compliance Guidance</h3>
                                <p className="text-muted-foreground max-w-2xl">
                                    New to Federal Compliance? View our comprehensive overview of DFARS 7012, NIST 800-171, and CMMC requirements to get started.
                                </p>
                            </div>
                        </div>
                        <Link href={`/clients/${clientId}/federal/program-guide`}>
                            <Button className="font-semibold whitespace-nowrap">
                                View Guide <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-8">
                    <Card className="bg-primary text-primary-foreground border-none shadow-md">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Overall Readiness</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black">68%</span>
                                <span className="opacity-80">Total Completion</span>
                            </div>
                            <div className="w-full bg-primary-foreground/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-primary-foreground h-full" style={{ width: '68%' }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Open Gaps</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-foreground">14</span>
                                <span className="text-muted-foreground">POA&M Items</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--success-foreground)] text-sm font-bold">
                                <CheckCircle2 className="h-4 w-4" />
                                4 items resolved this month
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Next Audit</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-foreground">42</span>
                                <span className="text-muted-foreground">Days Remaining</span>
                            </div>
                            <p className="text-muted-foreground text-xs">CMMC Level 2 Certification Assessment</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">System Impact</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-primary">MOD</span>
                                <span className="text-muted-foreground">High Water Mark</span>
                            </div>
                            <p className="text-muted-foreground text-xs">FIPS 199 Assessment: Moderate Impact</p>
                        </CardContent>
                    </Card>

                    {/* Compliance Guide Card */}
                    <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary hover:shadow-md transition-all group" onClick={() => window.location.href = `/clients/${clientId}/federal/program-guide`}>
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-foreground">CMMC 2.0</span>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 pointer-events-none">GUIDE</Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 font-medium group-hover:text-primary transition-colors">
                                    <span>View alignment</span>
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-accent transition-colors">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {categories.map(category => (
                    <div key={category} className="space-y-4 pt-4">
                        <h2 className="text-xl font-bold text-foreground border-l-4 border-primary pl-3">{category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {modules.filter(m => m.category === category).map((module, idx) => (
                                <Link key={idx} href={module.path}>
                                    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                                                    <module.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                                                </div>
                                                <Badge variant="secondary" className="font-bold uppercase text-[9px]">
                                                    {module.status}
                                                </Badge>
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">{module.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{module.description}</p>
                                            <div className="mt-6 flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Open Module <ArrowRight className="ml-2 h-4 w-4" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Federal workflow intelligence — trailing section, scoped to a valid client. */}
                {Number.isFinite(clientId) && (
                    <section className="pt-8">
                        <FederalWorkflowsPanels clientId={clientId} />
                    </section>
                )}

                {/* CMMC practice register (NIST SP 800-171) — trailing section, scoped to a valid client. */}
                {Number.isFinite(clientId) && (
                    <section className="pt-8">
                        <FederalCmmcPanels clientId={clientId} />
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
}
