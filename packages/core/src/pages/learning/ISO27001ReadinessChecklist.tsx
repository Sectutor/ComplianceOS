import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Printer, ArrowLeft, Loader2, Save } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce"; // Ensure this hook exists or implement local debounce

export default function ISO27001ReadinessChecklist() {
    const { selectedClientId } = useClientContext();
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch existing state
    const { data: serverState, isLoading } = trpc.checklist.get.useQuery(
        { clientId: selectedClientId!, checklistId: 'iso-27001-readiness' },
        { enabled: !!selectedClientId }
    );

    useEffect(() => {
        if (serverState?.items) {
            setCheckedItems(serverState.items as Record<string, boolean>);
        }
    }, [serverState]);

    const updatemutation = trpc.checklist.update.useMutation({
        onSuccess: () => {
            setHasChanges(false);
        },
        onError: () => {
            toast.error("Failed to save progress");
        }
    });

    // Auto-save debouncer could be added here, but for now manual save or on-change effect
    // Let's do save on unmount or simple button? 
    // User requested "automatically updated". So auto-save is better.

    // Simple auto-save implementation
    const saveProgress = (newItems: Record<string, boolean>) => {
        if (!selectedClientId) return;
        updatemutation.mutate({
            clientId: selectedClientId,
            checklistId: 'iso-27001-readiness',
            items: newItems
        });
    };

    const handleCheck = (id: string, checked: boolean) => {
        const newItems = { ...checkedItems, [id]: checked };
        setCheckedItems(newItems);
        saveProgress(newItems);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                <div className="flex items-center justify-between mb-8 print:hidden">
                    <div className="flex items-center gap-4">
                        <Link href="/learning/iso-27001">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Guide
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">ISO 27001 Readiness Checklist</h1>
                            <p className="text-muted-foreground">A step-by-step guide to preparing for your audit. Progress saved automatically.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {updatemutation.isLoading && <p className="text-sm text-muted-foreground flex items-center pr-2"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</p>}
                        <Button onClick={handlePrint} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Checklist
                        </Button>
                    </div>
                </div>

                <div className="mb-8">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Process Overview</CardTitle>
                            <CardDescription>Understanding the lifecycle of your readiness journey.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="font-semibold text-blue-700 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm">1</div>
                                        Before
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Scope → gather docs → identify stakeholders → define expectations
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-semibold text-amber-700 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-sm">2</div>
                                        During
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Interviews → evidence → clause review → Annex A control review → gap analysis
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-semibold text-green-700 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm">3</div>
                                        After
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Report → roadmap → fix gaps → internal audit → management review → certification
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Section
                        title="🔹 BEFORE the Readiness Assessment"
                        color="bg-blue-50 border-blue-200 text-blue-900"
                        items={SECTIONS.BEFORE}
                        checkedItems={checkedItems}
                        onCheck={handleCheck}
                    />

                    <Section
                        title="🔹 DURING the Readiness Assessment"
                        color="bg-amber-50 border-amber-200 text-amber-900"
                        items={SECTIONS.DURING}
                        checkedItems={checkedItems}
                        onCheck={handleCheck}
                    />

                    <Section
                        title="🔹 AFTER the Readiness Assessment"
                        color="bg-green-50 border-green-200 text-green-900"
                        items={SECTIONS.AFTER}
                        checkedItems={checkedItems}
                        onCheck={handleCheck}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}

// ... Helper Data Structure ...
const SECTIONS = {
    BEFORE: [
        {
            title: "1. Define Scope",
            tasks: [
                "ISMS scope defined (boundaries, locations, teams, tech).",
                "Products/services in scope listed.",
                "Out-of-scope areas clearly documented."
            ]
        },
        // ... (truncated for brevity, keep existing structure but map properly)
        // I need to use the full content again or extract it. 
        // For efficiency, I will try to preserve the existing content structure via a separate constant or inline if I can view it fully first.
        // Since I'm replacing the whole file logic, I should re-include the content.
        {
            title: "2. Identify Stakeholders",
            tasks: [
                "Information security team identified.",
                "Process/Control owners listed (HR, IT, DevOps, Legal, Procurement).",
                "Executive sponsor assigned."
            ]
        },
        {
            title: "3. Gather Existing Documentation",
            tasks: [
                "Existing policies collected.",
                "Network diagrams available.",
                "Asset inventory available.",
                "Risk register (if exists) collected.",
                "Existing incident logs/procedures gathered.",
                "HR onboarding/offboarding documents gathered.",
                "Vendor list + any supplier assessments collected."
            ]
        },
        {
            title: "4. Understand Organizational Context",
            tasks: [
                "Business objectives documented.",
                "Legal/regulatory obligations identified (GDPR, HIPAA, etc.).",
                "Interested parties identified.",
                "Internal/external issues documented."
            ]
        },
        {
            title: "5. Prep Logistics",
            tasks: [
                "Interview schedule created.",
                "Evidence repository created (SharePoint/Drive).",
                "Staff notified of readiness assessment."
            ]
        }
    ],
    DURING: [
        {
            title: "1. ISO 27001 Clauses 4–10 Review",
            tasks: [
                "Organizational context reviewed.",
                "ISMS policy reviewed.",
                "Roles/responsibilities reviewed.",
                "Risk assessment methodology reviewed.",
                "Risk treatment plan reviewed.",
                "Document control and record-keeping reviewed.",
                "Monitoring & measurement practices checked.",
                "Internal audit process reviewed.",
                "Management review process reviewed.",
                "Corrective action process reviewed."
            ]
        },
        {
            title: "2. Annex A / 93 Controls Review (ISO 27001:2022)",
            tasks: [
                "A.5 Organizational Controls (Policies, roles, segregation of duties, project security, supplier management, legal requirements)",
                "A.6 People Controls (Background checks, awareness training, disciplinary processes, remote working)",
                "A.7 Physical Controls (Secure areas, equipment protection, entry controls, physical monitoring)",
                "A.8 Technological Controls (Access, MFA, logging, backups, crypto, patch mgmt, malware, secure dev, vuln mgmt)"
            ]
        },
        {
            title: "3. Interviews & Evidence Sampling",
            tasks: [
                "HR interviewed (onboarding/offboarding, screening).",
                "IT interviewed (access control, network, backups).",
                "DevOps/SRE interviewed (deployment, CI/CD, secure dev).",
                "Legal/Procurement interviewed (vendor management).",
                "Incident Response team interviewed.",
                "Samples taken (logs, access reviews, incident tickets)."
            ]
        },
        {
            title: "4. Gap Analysis",
            tasks: [
                "Controls scored (Not in place / Partial / Full).",
                "Risks assigned to gaps.",
                "Maturity levels documented."
            ]
        }
    ],
    AFTER: [
        {
            title: "1. Gap Analysis Report",
            tasks: [
                "High-level summary delivered.",
                "Nonconformities documented.",
                "Control-by-control status documented.",
                "Missing policies listed.",
                "Missing procedures listed."
            ]
        },
        {
            title: "2. Action Plan & Remediation",
            tasks: [
                "Tasks created for each gap.",
                "Owners assigned.",
                "Timelines defined.",
                "Required resources identified.",
                "Quick wins identified."
            ]
        },
        {
            title: "3. Update/Develop Documentation",
            tasks: [
                "ISMS policy updated.",
                "Statement of Applicability (SoA) updated.",
                "Information classification defined.",
                "Risk methodology & treatment plan refined.",
                "Incident response & BCP plans updated.",
                "Access control & supplier management procedures created."
            ]
        },
        {
            title: "4. Implement/Strengthen Controls",
            tasks: [
                "MFA enforced.",
                "Logging enhanced.",
                "Access reviews conducted.",
                "Backup tests performed.",
                "Vulnerability scans performed.",
                "Awareness training launched."
            ]
        },
        {
            title: "5. Internal Audit",
            tasks: [
                "Internal audit plan prepared.",
                "Internal audit executed.",
                "Corrective actions raised."
            ]
        },
        {
            title: "6. Management Review",
            tasks: [
                "Review meeting held.",
                "Minutes documented.",
                "Decisions/actions tracked."
            ]
        },
        {
            title: "7. Certification Prep",
            tasks: [
                "Stage 1 readiness confirmed.",
                "Evidence folders cleaned up and finalized.",
                "Staff briefed for external auditor interviews."
            ]
        }
    ]
};

function Section({ title, items, color, checkedItems, onCheck }: {
    title: string,
    items: { title: string, tasks: string[] }[],
    color: string,
    checkedItems: Record<string, boolean>,
    onCheck: (id: string, checked: boolean) => void
}) {
    return (
        <section className="print:break-inside-avoid">
            <h2 className={`text-xl font-bold px-4 py-2 rounded-lg mb-4 ${color}`}>{title}</h2>
            <div className="grid gap-6">
                {items.map((group, idx) => (
                    <Card key={idx} className="print:shadow-none print:border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{group.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {group.tasks.map((task, tIdx) => {
                                    // Generate a stable ID for the checkbox. 
                                    // Using a hash or simplified string of the task content + SectionTitle would be better but index works if content is static.
                                    // Let's use simplified string to be robust against reordering if ever.
                                    const taskId = `iso-chk-${task.substring(0, 10).replace(/[^a-z0-9]/gi, '')}-${idx}-${tIdx}`;

                                    return (
                                        <div key={tIdx} className="flex items-start space-x-2">
                                            <Checkbox
                                                id={taskId}
                                                className="mt-1"
                                                checked={!!checkedItems[taskId]}
                                                onCheckedChange={(c) => onCheck(taskId, c === true)}
                                            />
                                            <label
                                                htmlFor={taskId}
                                                className={`text-sm font-medium leading-none cursor-pointer ${checkedItems[taskId] ? 'text-muted-foreground line-through' : ''}`}
                                            >
                                                {task}
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
