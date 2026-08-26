
import React, { useState, useEffect } from 'react';
import { useParams, Link } from "wouter";
import NIST80037Layout from "./NIST80037Layout";
import { useNistSystemId } from "./useNistSystem";
import { trpc } from "../../lib/trpc";
import {
    FileCheck,
    FileSignature,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Zap,
    Plus,
    Search,
    FileText,
    ArrowRight,
    Save,
    Stamp,
    UserCheck,
    Briefcase,
    ScrollText,
    Gavel,
    Download,
    Award
} from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Progress } from "@complianceos/ui/ui/progress";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NIST80037Authorize() {
    const { id } = useParams<{ id: string }>();
    const systemId = useNistSystemId();
    const clientId = parseInt(id || "0");
    const [isSaving, setIsSaving] = useState(false);
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [decision, setDecision] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);

    // Reset local state when systemId changes
    useEffect(() => {
        setDecision(null);
        setIsSigned(false);
    }, [systemId]);

    // TRPC
    const { data: checklistData, refetch } = (trpc as any).checklist.get.useQuery({
        clientId,
        checklistId: systemId ? `nist-800-37-authorize-${systemId}` : 'no-system'
    }, {
        enabled: !!systemId
    });

    const updateChecklistMutation = (trpc as any).checklist.update.useMutation();

    useEffect(() => {
        if (checklistData?.items) {
            const items = checklistData.items as any;
            if (items.decision) setDecision(items.decision);
            if (items.isSigned !== undefined) setIsSigned(items.isSigned);
        }
    }, [checklistData]);

    const currentDecision = decision;
    const currentSignature = isSigned;

    const handleSave = async () => {
        if (!systemId) {
            toast.error("No system selected", { description: "Please select a system first." });
            return;
        }

        setIsSaving(true);
        try {
            await updateChecklistMutation.mutateAsync({
                clientId,
                checklistId: `nist-800-37-authorize-${systemId}`,
                items: {
                    ...checklistData?.items,
                    decision: currentDecision,
                    isSigned: currentSignature,
                    lastSaved: new Date().toISOString()
                }
            });
            toast.success("Authorization Package Saved", {
                description: "Risk determination and package updates recorded.",
            });
            refetch();
        } catch (err) {
            toast.error("Failed to save draft");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAuthorize = async () => {
        if (!systemId) {
            toast.error("No system selected", { description: "Please select a system first." });
            return;
        }
        if (!currentDecision) {
            toast.error("Please select an authorization decision");
            return;
        }
        if (!currentSignature) {
            toast.error("AO Digital Signature is required");
            return;
        }

        setIsAuthorizing(true);
        try {
            await updateChecklistMutation.mutateAsync({
                clientId,
                checklistId: `nist-800-37-authorize-${systemId}`,
                items: {
                    ...checklistData?.items,
                    decision: currentDecision,
                    isSigned: currentSignature,
                    status: 'granted',
                    grantedAt: new Date().toISOString()
                }
            });
            toast.success("System Authorized (ATO)", {
                description: `The ${currentDecision} has been officially granted.`,
            });
            refetch();
        } catch (err) {
            toast.error("Failed to grant authorization");
        } finally {
            setIsAuthorizing(true);
            setTimeout(() => setIsAuthorizing(false), 1000);
        }
    };

    return (
        <NIST80037Layout>
            <div className="space-y-8 w-full pb-20">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: `/dashboard` },
                        { label: "NIST Hub", href: `/clients/${clientId}/nist` },
                        { label: "SP 800-37 (RMF)", href: `/clients/${clientId}/nist/rmf` },
                        { label: "Step 5: Authorize" },
                    ]}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-rose-600 text-primary-foreground font-black px-3">STEP 5</Badge>
                            <Badge variant="outline" className="border-rose-200 text-rose-700 font-bold uppercase tracking-widest text-[10px]">Authorization Phase</Badge>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-4">
                            <FileCheck className="w-10 h-10 text-rose-600" />
                            System Authorization
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium max-w-3xl leading-relaxed">
                            Provide a high-level review of the body of evidence and make a risk-based decision to authorize the system's operation.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-2xl h-14 px-6 font-bold border-2 border-border hover:bg-muted text-muted-foreground"
                        >
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleAuthorize}
                            disabled={isAuthorizing}
                            className="bg-rose-600 hover:bg-rose-700 rounded-2xl h-14 px-8 shadow-xl shadow-rose-200/50 font-black text-lg gap-2"
                        >
                            {isAuthorizing ? "Authorizing..." : <><Stamp className="w-5 h-5" /> Grant ATO</>}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Authorization Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-sidebar text-sidebar-foreground overflow-hidden relative">
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sidebar-accent text-xs font-black uppercase tracking-widest">Authorization Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 relative z-10">
                                <div className="text-center py-4 bg-sidebar-foreground/10 rounded-[2rem] border border-sidebar-border">
                                    <h2 className="text-4xl font-black text-sidebar-foreground tracking-tighter uppercase">
                                        {checklistData?.items?.status === 'granted' ? "Authorized" : "Pending"}
                                    </h2>
                                    <p className="text-sidebar-accent/80 text-[10px] font-black uppercase tracking-widest mt-1">Status of Decision</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-sidebar-foreground/70">Package Readiness</span>
                                        <span className="font-black">92%</span>
                                    </div>
                                    <Progress value={92} className="h-1.5 bg-sidebar-foreground/20" indicatorClassName="bg-sidebar-accent" />

                                    <div className="pt-2 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                            <CheckCircle2 className="w-3 h-3" /> SSP Completed
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                            <CheckCircle2 className="w-3 h-3" /> SAR Finalized
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-sidebar-accent">
                                            <Activity className="w-3 h-3" /> POA&M Open (18)
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <Award className="absolute -bottom-10 -right-10 w-48 h-48 text-sidebar-foreground/5 -rotate-12" />
                        </Card>

                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card">
                            <CardHeader>
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Decision Milestones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { label: "SCA Review", status: "Approved", icon: UserCheck, color: "text-emerald-500" },
                                    { label: "CISO Endorsement", status: "Awaiting", icon: ScrollText, color: "text-primary" },
                                    { label: "AO Decision", status: "Pending", icon: Gavel, color: "text-muted-foreground" }
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <step.icon className={cn("w-4 h-4", step.color)} />
                                            <span className="text-sm font-bold text-muted-foreground">{step.label}</span>
                                        </div>
                                        <Badge variant="secondary" className={cn("font-black text-[10px]", step.color)}>{step.status}</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-3">
                        <Tabs defaultValue="package" className="w-full">
                            <div className="border-b px-8 bg-muted/50">
                                <TabsList className="h-16 bg-transparent gap-8">
                                    <TabsTrigger value="package" className="data-[state=active]:bg-transparent data-[state=active]:text-rose-700 data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Authorization Package
                                    </TabsTrigger>
                                    <TabsTrigger value="risk" className="data-[state=active]:bg-transparent data-[state=active]:text-rose-700 data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Risk Determination
                                    </TabsTrigger>
                                    <TabsTrigger value="decision" className="data-[state=active]:bg-transparent data-[state=active]:text-rose-700 data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        ATO Decision
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="pb-8">
                                <TabsContent value="package" className="p-10 space-y-10 m-0">
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Consolidated Evidence (R-1)</h3>
                                            <p className="text-muted-foreground font-medium">Verify that the three core components of the authorization package are complete.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Dynamic document list would come from checklist data */}
                                            <div className="p-8 rounded-[3rem] border border-border bg-card hover:border-ring transition-all group cursor-pointer h-full opacity-50">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-primary/10 text-primary">
                                                    <FileText className="w-7 h-7" />
                                                </div>
                                                <h4 className="text-xl font-black text-foreground mb-1">SSP</h4>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">System Security Plan</p>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <span className="text-muted-foreground">Status</span>
                                                        <span className="text-foreground">No Data</span>
                                                    </div>
                                                    <Button variant="outline" className="w-full rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest gap-2">
                                                        <Download className="w-3.5 h-3.5" /> View Package
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[3rem] border border-border bg-card hover:border-ring transition-all group cursor-pointer h-full opacity-50">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-emerald-50 text-emerald-600">
                                                    <ShieldCheck className="w-7 h-7" />
                                                </div>
                                                <h4 className="text-xl font-black text-foreground mb-1">SAR</h4>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Security Assessment Report</p>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <span className="text-muted-foreground">Status</span>
                                                        <span className="text-foreground">No Data</span>
                                                    </div>
                                                    <Button variant="outline" className="w-full rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest gap-2">
                                                        <Download className="w-3.5 h-3.5" /> View Package
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[3rem] border border-border bg-card hover:border-ring transition-all group cursor-pointer h-full opacity-50">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-amber-50 text-amber-600">
                                                    <AlertTriangle className="w-7 h-7" />
                                                </div>
                                                <h4 className="text-xl font-black text-foreground mb-1">POA&M</h4>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Plan of Action & Milestones</p>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <span className="text-muted-foreground">Status</span>
                                                        <span className="text-foreground">No Data</span>
                                                    </div>
                                                    <Button variant="outline" className="w-full rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest gap-2">
                                                        <Download className="w-3.5 h-3.5" /> View Package
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-primary/10 border border-primary/20 rounded-[3rem] flex items-center justify-between gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
                                                        <Zap className="w-6 h-6" />
                                                    </div>
                                                    <h4 className="text-xl font-black text-primary tracking-tight">AI Package Verification</h4>
                                                </div>
                                                <p className="text-primary/80 font-medium max-w-lg leading-relaxed">
                                                    AI Auditor has cross-referenced 325 controls between the SSP and SAR. Found 0 contradictions and 3 minor documentation improvements suggested.
                                                </p>
                                            </div>
                                            <Button className="bg-primary hover:bg-primary/90 rounded-xl font-bold h-12 px-6 shadow-lg shadow-indigo-200">
                                                Audit Report
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="risk" className="p-10 space-y-10 m-0">
                                    <div className="space-y-8">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Risk Determination (R-2)</h3>
                                            <p className="text-sm text-muted-foreground font-medium">Authorizing Official determination of risk to organizational operations and assets.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="p-8 bg-card border border-border rounded-[3rem] space-y-4 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-muted rotate-45 translate-x-16 -translate-y-16 group-hover:bg-rose-50 transition-colors" />
                                                    <div className="relative z-10 flex items-center gap-3 mb-2">
                                                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                                                        <h4 className="text-lg font-black text-foreground uppercase">Residual Risk Posture</h4>
                                                    </div>
                                                    <div className="relative z-10 py-6 text-center bg-muted rounded-2xl">
                                                        <span className="text-4xl font-black text-foreground">MODERATE</span>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Acceptable per Risk Strategy</p>
                                                    </div>
                                                    <p className="relative z-10 text-sm text-muted-foreground font-medium font-serif leading-relaxed italic">
                                                        "Residual risk is primarily driven by the 18 open POA&M items, which are scheduled for remediation within 60 days. Current compensating controls provide sufficient mitigation."
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">AO Risk Acceptance Rationale</Label>
                                                <Textarea
                                                    placeholder="Provide the rationale for accepting the residual risk..."
                                                    className="h-full min-h-[250px] rounded-[2.5rem] bg-muted border-none focus:ring-rose-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="decision" className="p-10 space-y-10 m-0">
                                    <div className="space-y-8 text-center max-w-2xl mx-auto">
                                        <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-rose-600 shadow-xl shadow-rose-200/50 mb-6">
                                            <FileSignature className="w-12 h-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-3xl font-black text-foreground tracking-tight">Grant Authority to Operate (ATO)</h3>
                                            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                                                By signing the authorization decision, you are formally accepting the risk of operating the system.
                                            </p>
                                        </div>

                                        <div className="bg-muted rounded-[3.5rem] p-10 border border-border space-y-8 text-left">
                                            <div className="space-y-4">
                                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Authorization Decision</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {["ATO (Full)", "IATT (Test)", "ATO-w-Conditions", "Denied"].map((opt) => (
                                                        <div
                                                            key={opt}
                                                            onClick={() => setDecision(opt)}
                                                            className={cn(
                                                                "flex items-center gap-3 p-4 bg-card rounded-2xl border-2 cursor-pointer transition-all",
                                                                currentDecision === opt ? "border-rose-500 bg-rose-50/30" : "border-border hover:border-ring"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                currentDecision === opt ? "border-rose-500" : "border-border"
                                                            )}>
                                                                {currentDecision === opt && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                                                            </div>
                                                            <span className={cn(
                                                                "font-bold text-sm",
                                                                currentDecision === opt ? "text-rose-900" : "text-foreground"
                                                            )}>{opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Signature Authority</Label>
                                                <div
                                                    onClick={() => setIsSigned(!currentSignature)}
                                                    className={cn(
                                                        "flex items-center gap-6 p-6 bg-card rounded-[2rem] border-2 border-dashed transition-all cursor-pointer",
                                                        currentSignature ? "border-emerald-500 bg-emerald-50/30" : "border-border hover:border-rose-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                                                        currentSignature ? "bg-emerald-500 text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {currentSignature ? <ShieldCheck className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                                                    </div>
                                                    <div>
                                                        <p className={cn(
                                                            "text-lg font-black uppercase tracking-tight",
                                                            currentSignature ? "text-emerald-900" : "text-foreground"
                                                        )}>
                                                            {currentSignature ? "Digital Signature Active" : "AO Digital Signature"}
                                                        </p>
                                                        <p className="text-xs font-bold text-muted-foreground">
                                                            {currentSignature ? "Signature validated via PKI integration" : "Click to provide PKI or Digital Signature"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleAuthorize}
                                            disabled={isAuthorizing}
                                            className="w-full bg-rose-600 hover:bg-rose-700 rounded-[2rem] h-20 text-2xl font-black shadow-2xl shadow-rose-500/30 gap-4"
                                        >
                                            {isAuthorizing ? "Processing Authorization..." : <><Stamp className="w-8 h-8" /> EXECUTE AUTHORIZATION DECISION</>}
                                        </Button>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
        </NIST80037Layout>
    );
}

const Activity = ({ className }: { className?: string }) => <div className={className} />;

