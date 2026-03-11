import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, Shield, Plus, Trash2, Edit, Download, ClipboardList, LayoutGrid, List, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@complianceos/ui/ui/tooltip";
import ControlDetailsDialog from "@/components/ControlDetailsDialog";
import { EvidenceSuggestionsPopover } from "@/components/controls/EvidenceSuggestionsPopover";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import { NISTBaselineWizard } from "@/components/frameworks/NISTBaselineWizard";

export default function ClientControlsPage() {
    const { id: idParam } = useParams<{ id: string }>();
    const clientId = parseInt(idParam || "0");
    const { user } = useAuth();
    const [location, setLocation] = useLocation();

    const { data: client, isLoading: clientLoading } = trpc.clients.get.useQuery(
        { id: clientId },
        { enabled: clientId > 0 }
    );

    const { data: rawClientControls, isLoading: controlsLoading, error: controlsError, refetch: refetchControls } = trpc.clientControls.list.useQuery(
        { clientId },
        { enabled: clientId > 0 }
    );
    const { data: rawMasterControls } = trpc.controls.list.useQuery();

    if (controlsError) {
        console.error("Error loading client controls:", controlsError);
    }

    const safeUnwrap = (data: any) => {
        if (data && typeof data === 'object' && 'json' in data && Array.isArray(data.json)) {
            return data.json;
        }
        return data;
    };

    const clientControls = safeUnwrap(rawClientControls) || [];
    const masterControls = safeUnwrap(rawMasterControls) || [];

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    
    const [frameworkFilter, setFrameworkFilter] = useState<string>("all");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fw = params.get('framework');
        if (fw) setFrameworkFilter(fw);
        
        const openId = params.get('openId');
        const openCode = params.get('openCode');
        
        if (openId && clientControls.length > 0) {
            const ctrl = clientControls.find((c: any) => c.control?.id === parseInt(openId));
            if (ctrl) {
                setSelectedControl(ctrl);
            }
        } else if (openCode && clientControls.length > 0) {
            const ctrl = clientControls.find((c: any) => c.control?.controlId === openCode);
            if (ctrl) {
                setSelectedControl(ctrl);
            }
        }
    }, [window.location.search, clientControls]);

    const [isAddControlOpen, setIsAddControlOpen] = useState(false);
    const [isBaselineWizardOpen, setIsBaselineWizardOpen] = useState(false);
    const [selectedControlIds, setSelectedControlIds] = useState<string[]>([]);
    const [controlSearch, setControlSearch] = useState("");
    const [bulkFrameworks, setBulkFrameworks] = useState<string[]>([]);
    const [selectedControl, setSelectedControl] = useState<any>(null);
    const [deleteControlId, setDeleteControlId] = useState<number | null>(null);
    const [excludeControl, setExcludeControl] = useState<{ id: number, justification: string } | null>(null);
    const [justificationError, setJustificationError] = useState<number | null>(null);

    const uniqueFrameworks = Array.from(new Set(clientControls?.map((c: any) => c.control?.framework || 'Uncategorized') || [])).sort();
    const availableFrameworks = ["NIS2", "ISO 27001", "SOC 2", "GDPR", "HIPAA", "NIST CSF"];

    const filteredClientControls = (clientControls || []).filter(c => {
        if (frameworkFilter !== 'all' && (c.control?.framework || 'Uncategorized') !== frameworkFilter) return false;
        return true;
    });

    // Metric Calculations
    const stats = {
        total: clientControls.length,
        implemented: clientControls.filter((c: any) => c.clientControl.status === 'implemented').length,
        inProgress: clientControls.filter((c: any) => c.clientControl.status === 'in_progress').length,
        notImplemented: clientControls.filter((c: any) => c.clientControl.status === 'not_implemented').length,
        missingEvidence: clientControls.filter((c: any) => 
            c.clientControl.status !== 'not_implemented' && 
            c.clientControl.status !== 'not_applicable' && 
            (!c.evidenceCount || c.evidenceCount === 0)
        ).length,
        applicabilityRate: clientControls.length > 0 
            ? Math.round((clientControls.filter((c: any) => c.clientControl.applicability !== 'not_applicable').length / clientControls.length) * 100)
            : 0
    };

    const addControlMutation = trpc.clientControls.create.useMutation({
        onSuccess: () => {
            toast.success("Control assigned to client");
            setIsAddControlOpen(false);
            refetchControls();
        },
        onError: (error) => toast.error(error.message),
    });

    const deleteControlMutation = trpc.clientControls.delete.useMutation({
        onSuccess: () => {
            toast.success("Control removed");
            refetchControls();
            setDeleteControlId(null);
        },
        onError: (error) => toast.error(error.message),
    });

    const updateControlMutation = trpc.clientControls.update.useMutation({
        onSuccess: () => {
            toast.success("Control updated");
            refetchControls();
            setJustificationError(null);
        },
        onError: (error) => {
            toast.error(error.message);
            // If error relates to justification, highlight it
            if (error.message.toLowerCase().includes('justification')) {
                // Determine ID from context if possible, or just rely on toast
            }
        },
    });

    const bulkAssignMutation = trpc.clientControls.bulkAssign.useMutation({
        onSuccess: (result) => {
            toast.success(result.message);
            refetchControls();
        },
        onError: (error) => toast.error(error.message),
    });

    const handleBulkAssignInDialog = async () => {
        if (bulkFrameworks.length === 0) {
            toast.error("Please select at least one framework");
            return;
        }

        // Pass the array directly, assuming backend accepts string[]
        // Wait, backend signature in clientControls.ts was updated to z.array(z.string()).
        // Need to cast or unsure TS will catch it if trpc types aren't updated.
        await bulkAssignMutation.mutateAsync({ clientId, framework: bulkFrameworks as any });
        setIsAddControlOpen(false);
        setBulkFrameworks([]);
    };

    const handleAssignSelected = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedControlIds.length === 0) {
            toast.error("Please select at least one control");
            return;
        }
        selectedControlIds.forEach((id) => {
            addControlMutation.mutate({
                clientId,
                controlId: parseInt(id),
                status: 'not_implemented',
            });
        });
    };

    // ... (rendering logic unchanged until dialog)

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
                <div className="border-b pb-4">
                    {new URLSearchParams(window.location.search).get('from') === 'nis2-mapping' && (
                        <button
                            onClick={() => setLocation(`/clients/${clientId}/cyber/mapping`)}
                            className="flex items-center text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to NIS2 Mapping Hub
                        </button>
                    )}
                    <Breadcrumb items={[
                        { label: client?.name || "Client", href: `/clients/${clientId}` },
                        { label: "Controls", active: true }
                    ]} />
                    <div className="mt-2 flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Control Implementation</h1>
                        <Badge variant="outline" className="h-6 px-3 py-1 font-mono text-xs border-slate-200 text-slate-500 bg-slate-50">
                            {client?.organizationId || "ORG-000"}
                        </Badge>
                    </div>
                </div>

                {/* Professional Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white border text-slate-900 shadow-sm border-slate-200 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="h-16 w-16 text-slate-900" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Total Coverage</p>
                            <h3 className="text-4xl font-bold">{stats.total}</h3>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <span 
                                        className="h-full bg-blue-500 transition-all duration-1000" 
                                        style={{ width: `${stats.total > 0 ? 100 : 0}%` }}
                                    />
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border text-slate-900 shadow-sm border-slate-200">
                        <CardContent className="p-6">
                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Implementation Progress</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-4xl font-bold text-green-600">{stats.implemented}</h3>
                                <span className="text-slate-400 font-medium font-mono text-sm">/ {stats.total}</span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs text-slate-500 flex justify-between mb-1 text-center">
                                    <span>{Math.round((stats.implemented / (stats.total || 1)) * 100)}% Complete</span>
                                </p>
                                <span className="h-1.5 block w-full bg-slate-100 rounded-full overflow-hidden">
                                    <span 
                                        className="h-full bg-green-500 transition-all duration-1000" 
                                        style={{ width: `${(stats.implemented / (stats.total || 1)) * 100}%` }}
                                    />
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border text-slate-900 shadow-sm border-slate-200">
                        <CardContent className="p-6">
                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Action Needed</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-4xl font-bold text-amber-600">{stats.inProgress + stats.notImplemented}</h3>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">PENDING REVIEW</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-slate-500">
                                {stats.inProgress} in progress, {stats.notImplemented} not started
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border text-slate-900 shadow-sm border-slate-200">
                        <CardContent className="p-6">
                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Evidence Gaps</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className={`text-4xl font-bold ${stats.missingEvidence > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {stats.missingEvidence}
                                </h3>
                                {stats.missingEvidence > 0 && (
                                    <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
                                )}
                            </div>
                            <p className="mt-4 text-xs text-slate-500 uppercase tracking-tighter">
                                Critical for readiness score
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">Assigned Controls</h2>
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 border-slate-200">
                            {filteredClientControls.length} displayed
                        </Badge>
                        <PageGuide
                            title="Client Control Implementation"
                            description="Manage and validate the implementation of security controls for this client."
                            rationale="Controls are the operational reality of compliance. This dashboard allows you to move beyond 'check-box compliance' by documenting implementation, assigning accountability, and syncing evidence across frameworks."
                            howToUse={[
                                { step: "1. Build Your Baseline", description: "Import controls from the Global Library or use the 'Select Baseline' wizard to bulk-add industry standards like NIST or SOC 2." },
                                { step: "2. Determine Applicability", description: "Mark controls as 'Applicable' or 'Not Applicable'. If excluded, you MUST provide a professional justification for auditors." },
                                { step: "3. Document Implementation", description: "Click the 'Edit' icon to describe the operational reality of the control and set its Monitoring Frequency (e.g., Monthly/Continuous)." },
                                { step: "4. Assign Accountability (RACI)", description: "Use the RACI Grid to assign specific team members as Responsible or Accountable, ensuring clear ownership." },
                                { step: "5. Gather Evidence", description: "Upload proof (PDFs, Screenshots) or use 'Evidence Requests' to task teammates for information without them needing deep platform access." },
                                { step: "6. Cross-Framework Sync", description: "Implement once, comply twice. Use the sync feature to propagate status and evidence to related controls in other frameworks." }
                            ]}
                            integrations={[
                                { name: "Audit Trail", description: "Every implementation note and status change is logged for professional audit review." },
                                { name: "Evidence Repository", description: "Uploaded files are automatically linked to the client's central evidence library for future reuse." },
                                { name: "Situation Awareness", description: "The top metrics bar reflects your real-time compliance health and readiness score." }
                            ]}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* View Toggles & Export buttons (unchanged) */}
                        <div className="flex bg-muted rounded-md p-1 items-center">
                            <Button
                                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('card')}
                                className="h-8 px-2"
                                title="Card View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="h-8 px-2"
                                title="Statement of Applicability (Table)"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="w-[200px]">
                            <Select 
                                value={frameworkFilter} 
                                onValueChange={(val) => {
                                    setFrameworkFilter(val);
                                    const params = new URLSearchParams(window.location.search);
                                    if (val === 'all') params.delete('framework');
                                    else params.set('framework', val);
                                    const search = params.toString();
                                    setLocation(`${location}${search ? '?' + search : ''}`);
                                }}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Filter Framework" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Frameworks</SelectItem>
                                    {uniqueFrameworks.map(fw => (
                                        <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                    ))}
                                    {availableFrameworks.filter(f => !uniqueFrameworks.includes(f)).map(fw => (
                                        <SelectItem key={fw} value={fw} disabled className="opacity-50">{fw} (Not Assigned)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => {
                                window.location.assign(`/api/export/soa/${client?.id}`);
                            }}
                            title="Export SoA to Word"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export SoA
                        </Button>

                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                            onClick={() => setIsBaselineWizardOpen(true)}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            Select Baseline
                        </Button>
                        <Button onClick={() => setIsAddControlOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Control
                        </Button>
                    </div>
                </div>

                <NISTBaselineWizard
                    open={isBaselineWizardOpen}
                    onOpenChange={setIsBaselineWizardOpen}
                    clientId={clientId}
                    onSuccess={() => refetchControls()}
                />

                {/* Assign Control Dialog */}
                <EnhancedDialog
                    open={isAddControlOpen}
                    onOpenChange={setIsAddControlOpen}
                    title="Assign Controls"
                    description="Select individual controls or bulk assign standard frameworks."
                    size="xl"
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button type="button" variant="outline" onClick={() => setIsAddControlOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    const form = document.getElementById('assign-control-form') as HTMLFormElement;
                                    if (form) form.requestSubmit();
                                }}
                                disabled={addControlMutation.isPending}
                            >
                                {addControlMutation.isPending ? "Assigning..." : "Assign Selected"}
                            </Button>
                        </div>
                    }
                >
                    <div className="grid gap-6 py-4">
                        {/* Bulk Assignment Section */}
                        <div className="bg-muted/30 p-4 rounded-lg border">
                            <Label className="text-base font-semibold mb-2 block">Bulk Assignment</Label>
                            <p className="text-sm text-muted-foreground mb-4">Select frameworks to automatically assign all their standard controls.</p>
                            <div className="flex flex-wrap gap-4 mb-4">
                                {availableFrameworks.map(fw => (
                                    <div key={fw} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`bulk-${fw}`}
                                            checked={bulkFrameworks.includes(fw)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setBulkFrameworks([...bulkFrameworks, fw]);
                                                else setBulkFrameworks(bulkFrameworks.filter(f => f !== fw));
                                            }}
                                        />
                                        <label
                                            htmlFor={`bulk-${fw}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {fw}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleBulkAssignInDialog}
                                disabled={bulkAssignMutation.isPending || bulkFrameworks.length === 0}
                            >
                                {bulkAssignMutation.isPending ? "Assigning..." : "Assign Selected Frameworks"}
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or select individually</span>
                            </div>
                        </div>

                        {/* Individual Selection (Original Form) */}
                        <form id="assign-control-form" onSubmit={handleAssignSelected} className="grid gap-2">
                            <Label htmlFor="controlSearch">Search Controls</Label>
                            <Input id="controlSearch" value={controlSearch} onChange={(e) => setControlSearch(e.target.value)} placeholder="Type to filter controls..." />
                            <div className="mt-2 max-h-[40vh] overflow-auto rounded border">
                                {/* ... Control List ... */}
                                {Object.entries((masterControls || [])
                                    .filter((c) => (c.controlId + " " + c.name + " " + (c.description || ""))
                                        .toLowerCase().includes(controlSearch.toLowerCase()))
                                    .reduce((acc, control) => {
                                        const fw = control.framework || 'Uncategorized';
                                        const cat = control.category || 'General';
                                        if (!acc[fw]) acc[fw] = {};
                                        if (!acc[fw][cat]) acc[fw][cat] = [];
                                        acc[fw][cat].push(control);
                                        return acc;
                                    }, {} as Record<string, Record<string, typeof masterControls>>))
                                    .map(([framework, categories]) => (
                                        <div key={framework} className="border-b last:border-b-0">
                                            <div className="bg-muted/50 px-3 py-2 font-semibold text-sm sticky top-0 z-10">
                                                {framework}
                                            </div>
                                            {Object.entries(categories).map(([category, controls]) => (
                                                <div key={`${framework}-${category}`}>
                                                    <div className="bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground sticky top-9 z-10 backdrop-blur-sm">
                                                        {category}
                                                    </div>
                                                    {controls.map((control) => {
                                                        const idStr = control.id.toString();
                                                        const checked = selectedControlIds.includes(idStr);
                                                        return (
                                                            <label key={control.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                                                                <Checkbox
                                                                    checked={checked}
                                                                    onCheckedChange={(val) => {
                                                                        const isChecked = !!val;
                                                                        setSelectedControlIds((prev) => isChecked ? [...prev, idStr] : prev.filter((x) => x !== idStr));
                                                                    }}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-sm text-foreground">{control.controlId} - {control.name}</div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                    const filtered = (masterControls || [])
                                        .filter((c) => (c.controlId + " " + c.name + " " + (c.description || ""))
                                            .toLowerCase().includes(controlSearch.toLowerCase()))
                                        .map((c) => c.id.toString());
                                    setSelectedControlIds(filtered);
                                }}>Select All Filtered</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedControlIds([])}>Clear Selection</Button>
                            </div>
                        </form>
                    </div>
                </EnhancedDialog>

                {/* Control Details Dialog */}
                {selectedControl && (
                    <ControlDetailsDialog
                        open={!!selectedControl}
                        onOpenChange={(open) => !open && setSelectedControl(null)}
                        clientControl={selectedControl.clientControl}
                        control={selectedControl.control}
                        clientId={clientId}
                        onUpdate={() => refetchControls()}
                    />
                )}

                {/* Delete Control Confirmation */}
                <AlertDialog open={!!deleteControlId} onOpenChange={() => setDeleteControlId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Control?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the control assignment from this client. Any associated evidence or justifications will also be removed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteControlId && deleteControlMutation.mutate({ id: deleteControlId })}
                            >
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Exclude Control Dialog */}
                <EnhancedDialog
                    open={!!excludeControl}
                    onOpenChange={(open) => !open && setExcludeControl(null)}
                    title="Exclude Control"
                    description="Please provide a justification for marking this control as Not Applicable."
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="outline" onClick={() => setExcludeControl(null)}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    if (excludeControl) {
                                        updateControlMutation.mutate({
                                            id: excludeControl.id,
                                            applicability: 'not_applicable',
                                            justification: excludeControl.justification,
                                            status: 'not_applicable'
                                        });
                                        setExcludeControl(null);
                                    }
                                }}
                                disabled={!excludeControl?.justification || excludeControl.justification.length < 5}
                            >
                                Confirm Exclusion
                            </Button>
                        </div>
                    }
                >
                    <div className="py-4">
                        <Label htmlFor="exclusionJustification">Justification</Label>
                        <Input
                            id="exclusionJustification"
                            value={excludeControl?.justification || ''}
                            onChange={(e) => setExcludeControl(prev => prev ? { ...prev, justification: e.target.value } : null)}
                            placeholder="e.g., Use of cloud provider handles this control..."
                            className="mt-2"
                        />
                    </div>
                </EnhancedDialog>

                {/* Controls List */}
                {controlsError ? (
                    <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                        <h3 className="font-bold">Error Loading Controls</h3>
                        <p>{controlsError.message}</p>
                        <Button variant="outline" className="mt-2" onClick={() => refetchControls()}>Retry</Button>
                    </div>
                ) : controlsLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : clientControls && clientControls.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="space-y-6">
                            {Object.entries((filteredClientControls || [])
                                .reduce((acc, item) => {
                                    const fw = item.control?.framework || 'Uncategorized';
                                    const cat = item.control?.category || 'General';
                                    if (!acc[fw]) acc[fw] = {};
                                    if (!acc[fw][cat]) acc[fw][cat] = [];
                                    acc[fw][cat].push(item);
                                    return acc;
                                }, {} as Record<string, Record<string, typeof clientControls>>))
                                .map(([framework, categories]) => (
                                    <div key={framework} className="space-y-3">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-primary" />
                                            {framework}
                                        </h3>
                                        {Object.entries(categories).map(([category, items]) => (
                                            <div key={`${framework}-${category}`} className="pl-2 border-l-2 border-muted">
                                                <h4 className="text-sm font-semibold text-muted-foreground mb-3 pl-2">{category}</h4>
                                                <div className="space-y-3">
                                                    {items.map((item) => (
                                                        <Card key={`${clientId}-${item.clientControl.id}`} className="cursor-pointer" onDoubleClick={() => setSelectedControl(item)}>
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-mono text-sm text-muted-foreground">
                                                                                {item.clientControl.clientControlId}
                                                                            </span>
                                                                            <span className="font-medium">{item.control?.name}</span>
                                                                            {item.clientControl.applicability === 'not_applicable' && (
                                                                                <Badge variant="outline" className="text-muted-foreground border-dashed">N/A</Badge>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            {item.clientControl.customDescription || item.control?.description}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {item.clientControl.owner && (
                                                                                <span className="text-xs px-2 py-1 bg-muted rounded">
                                                                                    Owner: {item.clientControl.owner}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => setSelectedControl(item)}
                                                                            title="View details & add evidence"
                                                                        >
                                                                            <ClipboardList className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="text-destructive hover:text-destructive"
                                                                            onClick={() => setDeleteControlId(item.clientControl.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-white">
                            <Table className="table-fancy">
                                <TableHeader>
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="w-[100px] py-4">ID</TableHead>
                                        <TableHead className="w-[200px] py-4">Control Name</TableHead>
                                        <TableHead className="w-[150px] py-4">Framework</TableHead>
                                        <TableHead className="w-[180px] py-4">Applicability</TableHead>
                                        <TableHead className="w-[120px] py-4">Monitoring</TableHead>
                                        <TableHead className="py-4">Justification</TableHead>
                                        <TableHead className="w-[120px] py-4 text-center">Status</TableHead>
                                        <TableHead className="w-[50px] py-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clientControls.map((item) => (
                                        <TableRow key={item.clientControl.id} className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm group cursor-pointer" onDoubleClick={() => setSelectedControl(item)}>
                                            <TableCell className="font-mono text-xs font-medium text-black py-4">
                                                {item.clientControl.clientControlId}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm text-black py-4">
                                                <EvidenceSuggestionsPopover
                                                    controlId={item.clientControl.clientControlId}
                                                    controlName={item.control?.name || ''}
                                                    framework={item.control?.framework}
                                                    category={item.control?.category}
                                                >
                                                    {item.control?.name}
                                                </EvidenceSuggestionsPopover>
                                                <div className="text-[10px] text-gray-500 line-clamp-1" title={item.control?.description || ""}>
                                                    {item.control?.description}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-600 py-4">
                                                {item.control?.framework}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Select
                                                    value={item.clientControl.applicability || 'applicable'}
                                                    onValueChange={(val) => {
                                                        if (val === 'not_applicable' && !item.clientControl.justification) {
                                                            setExcludeControl({ id: item.clientControl.id, justification: '' });
                                                            return;
                                                        }
                                                        updateControlMutation.mutate({
                                                            id: item.clientControl.id,
                                                            applicability: val
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className={`h-8 w-[140px] text-xs bg-white ${item.clientControl.applicability === 'not_applicable' ? 'text-gray-500' : 'text-[#1C4D8D] font-medium'}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="applicable">Applicable</SelectItem>
                                                        <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {(() => {
                                                    const monitoring = item.clientControl.implementationNotes?.match(/Monitoring Frequency: (.*)$/m)?.[1] || "Manual";
                                                    return (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] font-medium whitespace-nowrap",
                                                            monitoring === 'Continuous' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                                                monitoring === 'Daily' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                    "text-slate-500 bg-slate-50"
                                                        )}>
                                                            {monitoring}
                                                        </Badge>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Input
                                                    className="h-8 text-xs bg-white text-black"
                                                    placeholder={item.clientControl.applicability === 'not_applicable' ? "Why is this excluded?" : "Why is this included?"}
                                                    defaultValue={item.clientControl.justification || ""}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== item.clientControl.justification) {
                                                            updateControlMutation.mutate({
                                                                id: item.clientControl.id,
                                                                justification: e.target.value
                                                            });
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Badge
                                                        variant={
                                                            item.clientControl.status === 'implemented' ? 'success' :
                                                                item.clientControl.status === 'in_progress' ? 'info' :
                                                                    item.clientControl.status === 'not_applicable' ? 'secondary' :
                                                                        'warning'
                                                        }
                                                        className="uppercase text-[10px] px-3 transition-all"
                                                    >
                                                        {item.clientControl.status?.replace('_', ' ')}
                                                    </Badge>
                                                    {item.clientControl.status !== 'not_implemented' && item.clientControl.status !== 'not_applicable' && (!item.evidenceCount || item.evidenceCount === 0) && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Missing Evidence!</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1C4D8D]/10 hover:text-[#1C4D8D] transition-colors duration-200" onClick={() => setSelectedControl(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )
                ) : (
                    <div className="py-12 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <div className="max-w-2xl mx-auto text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0B1120] text-white shadow-xl mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Shield className="h-10 w-10 text-blue-400" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4 text-center">Your Compliance Command Center is Empty</h2>
                            <p className="text-lg text-slate-600 mb-12">
                                You haven't assigned any security controls to this client yet. Security controls are the building blocks of your compliance posture—track implementation, collect evidence, and prove readiness.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-2">Assign Controls</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Choose specific controls from our master library to match your requirements.</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-2">Use Baseline Wizard</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Quickly setup standard frameworks like NIST or SOC 2 using our guided wizard.</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-2">Import from SoA</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Bring in your existing Statement of Applicability for instant tracking.</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button 
                                    size="lg" 
                                    className="h-12 px-8 text-lg font-semibold bg-[#0B1120] hover:bg-slate-800"
                                    onClick={() => setIsBaselineWizardOpen(true)}
                                >
                                    <Shield className="mr-2 h-5 w-5" />
                                    Start Setup Wizard
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    className="h-12 px-8 text-lg font-semibold border-2"
                                    onClick={() => setIsAddControlOpen(true)}
                                >
                                    Browse Library
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
