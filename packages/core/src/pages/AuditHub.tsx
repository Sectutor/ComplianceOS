import { useState, useEffect } from "react";
import { Label } from "@complianceos/ui/ui/label";

import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import { EvidenceLibraryDialog } from "@/components/EvidenceLibraryDialog";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@complianceos/ui/ui/avatar";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Separator } from "@complianceos/ui/ui/separator";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    MessageSquare,
    AlertCircle,
    Search,
    Filter,
    Download,
    MoreHorizontal,
    ArrowLeft,
    Briefcase,
    Mail,
    Shield,
    LayoutDashboard,
    AlertTriangle,
    Check,
    X,
    ArrowRight,
    RotateCw,
    Trash2,
    Plus,
    Loader2,
    Upload
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Input } from "@complianceos/ui/ui/input";
import { toast } from "sonner";
import AuditorLayout from "@/components/AuditorLayout";
import { authedFetch } from "@/lib/authedFetch";
import { useAuth } from "@/contexts/AuthContext";
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@complianceos/ui/ui/select";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";
import { Suspense, lazy } from 'react';
import { Slot, SlotNames } from "@/registry";

import { PageGuide } from "@/components/PageGuide";

const EvidenceFileUpload = lazy(() => import('@/components/EvidenceFileUpload'));

export default function AuditHub() {
    const [match, params] = useRoute("/clients/:clientId/audit-hub");
    const { t } = useTranslation('dashboard');
    const clientId = params?.clientId ? parseInt(params.clientId) : 0;
    const [activeSection, setActiveSection] = useState('pbc'); // 'overview', 'pbc', 'findings'
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [activeFramework, setActiveFramework] = useState("ISO 27001");

    const { user } = useAuth();
    // Determine if we should show the Auditor View (Restricted Clean Room)
    // Check for 'auditor' role or explicit 'view=auditor' query param for testing/admin preview
    const isAuditorView = user?.user_metadata?.role === 'auditor' || (typeof window !== 'undefined' ? window.location.search.includes('view=auditor') : false);
    const Layout = isAuditorView ? AuditorLayout : DashboardLayout;

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const inviteMutation = trpc.audit.inviteAuditor.useMutation({
        onSuccess: () => {
            toast.success("Invitation sent successfully");
            setInviteOpen(false);
            setInviteEmail("");
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleInvite = () => {
        if (!inviteEmail) return;
        inviteMutation.mutate({
            clientId: clientId,
            email: inviteEmail
        });
    };

    const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'owner' || user?.user_metadata?.role === 'super_admin';

    // Live Data Fetching
    const { data: frameworksData } = trpc.evidence.getFrameworks.useQuery();
    console.log('[AuditHub] Frameworks Data:', frameworksData);

    const { data: evidenceData, isLoading: isEvidenceLoading, refetch: refetchList } = trpc.evidence.list.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch files for selected request
    const { data: evidenceFiles, isLoading: isFilesLoading, refetch: refetchFiles } = trpc.evidence.getFiles.useQuery(
        { evidenceId: (selectedRequest as any)?.original?.id || 0 },
        { enabled: !!(selectedRequest as any)?.original?.id }
    );

    // Fetch counts for sidebar
    const { data: findings } = trpc.findings.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: comments } = trpc.evidence.getAllComments.useQuery({ clientId }, { enabled: !!clientId });

    const utils = trpc.useContext();
    const initializeMutation = trpc.evidence.seed.useMutation({
        onSuccess: () => {
            toast.success("Audit workspace initialized with request list.");
            utils.evidence.list.invalidate();
        }
    });

    const handleInitialize = () => {
        initializeMutation.mutate({
            clientId,
            framework: activeFramework
        });
    };

    const [createRequestOpen, setCreateRequestOpen] = useState(false);
    const [newRequestData, setNewRequestData] = useState({
        evidenceId: '',
        description: '',
        clientControlId: '',
        owner: '',
        dueDate: ''
    });

    const [fileToDelete, setFileToDelete] = useState<any>(null);

    // Link Integration State
    const [libraryOpen, setLibraryOpen] = useState(false);

    const [linkOpen, setLinkOpen] = useState(false);
    const [linkData, setLinkData] = useState({ provider: 'github', resourceId: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const testConnection = () => {
        if (!linkData.resourceId) {
            toast.error("Please enter a resource ID first");
            return;
        }
        setConnectionStatus('testing');
        // Simulate network request
        setTimeout(() => {
            setConnectionStatus('success');
            toast.success("Connection established successfully");
        }, 1500);
    };

    const linkMutation = trpc.evidence.linkIntegration.useMutation({
        onSuccess: () => {
            toast.success("Integration Linked Successfully");
            setLinkOpen(false);
            setLinkData({ provider: 'github', resourceId: '' });
            setConnectionStatus('idle');
            utils.evidence.list.invalidate(); // Refresh list to show status change
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const fileDeleteMutation = trpc.evidenceFiles.delete.useMutation({
        onSuccess: () => {
            toast.success("File removed successfully");
            refetchFiles();
            utils.evidence.list.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const createFileMutation = trpc.evidenceFiles.create.useMutation({
        onSuccess: () => {
            refetchFiles();
            utils.evidence.list.invalidate();
        },
        onError: (error) => toast.error(error.message),
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const evidenceId = (selectedRequest as any)?.original?.id;
        if (!evidenceId) return;

        for (const file of files) {
            try {
                const reader = new FileReader();
                const uploadPromise = new Promise<void>((resolve, reject) => {
                    reader.onload = async () => {
                        try {
                            const base64 = (reader.result as string).split(',')[1];
                            const timestamp = Date.now();
                            const randomSuffix = Math.random().toString(36).substring(2, 8);
                            const extension = file.name.split('.').pop() || '';
                            const filename = `evidence-${evidenceId}-${timestamp}-${randomSuffix}.${extension}`;

                            const response = await authedFetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    filename,
                                    data: base64,
                                    contentType: file.type,
                                    folder: 'evidence'
                                }),
                            });

                            if (!response.ok) throw new Error('Upload failed');
                            const { key, url } = await response.json();

                            await createFileMutation.mutateAsync({
                                evidenceId,
                                filename,
                                originalFilename: file.name,
                                mimeType: file.type,
                                size: file.size,
                                fileKey: key,
                                url,
                            });
                            resolve();
                        } catch (err) { reject(err); }
                    };
                    reader.readAsDataURL(file);
                });
                toast.promise(uploadPromise, {
                    loading: `Uploading ${file.name}...`,
                    success: `${file.name} uploaded successfully`,
                    error: `Failed to upload ${file.name}`
                });
                await uploadPromise;
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleLink = () => {
        if (!selectedRequest || !linkData.resourceId) return;
        linkMutation.mutate({
            evidenceId: selectedRequest.original.id,
            provider: linkData.provider,
            resourceId: linkData.resourceId
        });
    };

    // Fetch latest audit for auditor details
    const { data: audits } = trpc.audit.list.useQuery({ clientId }, { enabled: !!clientId });
    const activeAudit = audits?.[0]; // Get the latest one

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '??';
    };

    const createEvidenceMutation = trpc.evidence.create.useMutation({
        onSuccess: () => {
            toast.success("Evidence request created successfully");
            setCreateRequestOpen(false);
            setNewRequestData({
                evidenceId: '',
                description: '',
                clientControlId: '',
                owner: '',
                dueDate: ''
            });
            refetchList();
        },
        onError: (err) => {
            toast.error("Failed to create request: " + err.message);
        }
    });

    const { data: clientControlsList } = trpc.clientControls.list.useQuery({ clientId }, { enabled: createRequestOpen && !!clientId });

    const handleCreateRequest = () => {
        if (!newRequestData.description || !newRequestData.clientControlId) {
            toast.error("Description and Control are required");
            return;
        }

        const controlId = parseInt(newRequestData.clientControlId);
        if (isNaN(controlId) || controlId <= 0) {
            toast.error("Please select a valid control");
            return;
        }

        createEvidenceMutation.mutate({
            clientId,
            clientControlId: controlId,
            evidenceId: newRequestData.evidenceId || `MANUAL-${Date.now().toString().slice(-4)}`,
            description: newRequestData.description,
            owner: newRequestData.owner,
            // dueDate: newRequestData.dueDate // Not supported by backend yet, but UI is there
        });
    };

    const updateStatusMutation = trpc.evidence.updateStatus.useMutation({
        onSuccess: () => {
            toast.success("Audit status updated");
            refetchList();
            if (selectedRequest) {
                // Update local state if needed
            }
        },
        onError: (err) => {
            toast.error("Failed to update status: " + err.message);
        }
    });

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<any>(null);

    const deleteMutation = trpc.evidence.delete.useMutation({
        onSuccess: () => {
            toast.success("Evidence request deleted");
            refetchList();
            setSelectedRequest(null);
            setDeleteConfirmationOpen(false);
            setRequestToDelete(null);
        },
        onError: (err) => {
            toast.error("Failed to delete request: " + err.message);
        }
    });

    const confirmDelete = (e: React.MouseEvent, req: any) => {
        e.stopPropagation();
        setRequestToDelete(req);
        setDeleteConfirmationOpen(true);
    };

    const executeDelete = () => {
        if (requestToDelete) {
            deleteMutation.mutate({ id: requestToDelete.original.id });
        }
    };

    const handleStatusUpdate = (status: 'verified' | 'rejected') => {
        if (!selectedRequest?.original?.id) return;
        updateStatusMutation.mutate({
            evidenceId: selectedRequest.original.id,
            status
        });

        // Optimistically update
        setSelectedRequest({
            ...selectedRequest,
            status: status === 'verified' ? 'Accepted' : 'Returned'
        });
    };

    const auditRequests = evidenceData?.map((e: any) => ({
        id: e.evidenceId || `EV-${e.id}`, // Use reliable DB ID reference if possible
        title: e.title || 'Untitled Request',
        control: e.control?.controlCode || 'General',
        status: e.status === 'verified' ? 'Accepted' : e.status === 'collected' ? 'In Review' : 'Open',
        comments: 0,
        evidence: e.fileCount || 0,
        dueDate: e.dueDate || null,
        description: e.description,
        original: e
    })) || [];

    // Derived State
    const displayRequests = auditRequests.filter(req => {
        const matchesStatus = filterStatus === 'all' || req.status.toLowerCase() === filterStatus.toLowerCase();

        // Robust framework matching
        const itemFramework = req.original.framework?.toString().trim().toLowerCase();
        const targetFramework = activeFramework.trim().toLowerCase();

        const matchesFramework = (!itemFramework && targetFramework === 'iso 27001') ||
            (itemFramework === targetFramework) ||
            targetFramework === 'all' ||
            (itemFramework === 'custom') ||
            (!itemFramework);

        return matchesStatus && matchesFramework;
    });

    // Auto-select first item if list is populated and nothing is selected
    // THIS FIXES THE "I DON'T SEE THE LIST" CONFUSION
    useEffect(() => {
        if (displayRequests.length > 0 && !selectedRequest) {
            setSelectedRequest(displayRequests[0]);
            // Force view to list if we are auto-selecting
            setActiveSection('pbc');
        }
    }, [displayRequests, selectedRequest]); // Runs when list updates or selection is cleared

    const stats = {
        total: auditRequests.length,
        accepted: auditRequests.filter(r => r.status === 'Accepted').length,
        review: auditRequests.filter(r => r.status === 'In Review').length,
        open: auditRequests.filter(r => r.status === 'Open').length,
    };

    const progress = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Accepted': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200';
            case 'In Review': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:text-amber-300 border-amber-200';
            case 'Returned': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'Open': return 'bg-muted text-foreground border-border';
            default: return 'bg-muted text-foreground';
        }
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-muted/50 overflow-hidden">

                {/* 1. Universal Header (Audit Context) - Professionally Redesigned */}
                <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-40 relative shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-brand h-9 w-9 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-foreground/5">
                                <Shield className="h-5 w-5 text-emerald-400 dark:text-emerald-300" />
                            </div>
                            <div>
                                <h1 className="font-bold text-brand leading-tight tracking-tight">AuditWorkspace™</h1>
                                <div className="text-[10px] font-bold text-brand/60 uppercase tracking-wider">Secure Clean Room</div>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-muted" />

                        {/* Framework Selector Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Compliance Standard</span>
                            <Select value={activeFramework} onValueChange={setActiveFramework}>
                                <SelectTrigger className="w-[180px] h-9 bg-muted border-border text-xs font-semibold text-foreground">
                                    <SelectValue placeholder="Select Framework" />
                                </SelectTrigger>
                                <SelectContent>
                                    {frameworksData?.map((fw: any) => (
                                        <SelectItem key={fw.id} value={fw.id} className="text-xs">
                                            {fw.name}
                                        </SelectItem>
                                    ))}
                                    {(!frameworksData || frameworksData.length === 0) && (
                                        <SelectItem value="ISO 27001" className="text-xs">ISO 27001</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{activeFramework} Sync</span>
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-border">FY2025</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">Client ID: #{clientId}</span>
                        </div>
                    </div>

                    {/* Readiness Header Progress */}
                    {(() => {
                        const total = displayRequests.length;
                        const accepted = displayRequests.filter(r => r.status === 'Accepted').length;
                        const score = total > 0 ? Math.round((accepted / total) * 100) : 0;
                        return (
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 pr-6 border-r border-border">
                                    <div className="text-right">
                                        <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Audit Status</div>
                                        <div className="text-sm font-bold text-foreground">{score}% Verified</div>
                                    </div>
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${score}%` }} />
                                    </div>
                                </div>

                                <PageGuide
                                    title="Audit Hub"
                                    description="Centralized workspace for audit evidence and external auditor collaboration."
                                    rationale="Streamlines the audit process by providing a secure, auditable 'Clean Room' where auditors only see verified evidence."
                                    howToUse={[
                                        { step: "Initialize PBC", description: "Use the rotate icon in the sidebar to sync a standard request list." },
                                        { step: "Collect Evidence", description: "Drag and drop files or link integrations to fulfill requests." },
                                        { step: "Internal Review", description: "Set status to 'Verified' to make evidence visible to the auditor." },
                                        { step: "Manage Findings", description: "Track auditor observations and link them to remediation tasks." }
                                    ]}
                                    integrations={[
                                        { name: "Global Vault", description: "Sync existing evidence." },
                                        { name: "Magic Links", description: "Secure external auditor access." }
                                    ]}
                                />

                                {isAdmin && (
                                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9 gap-2 bg-card border-border text-foreground hover:bg-muted hover:text-foreground font-medium">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>Invite Auditor</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Invite External Auditor</DialogTitle>
                                                <DialogDescription>
                                                    Send a secure link to an external auditor to review evidence for this client.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <label htmlFor="email" className="text-sm font-medium">Auditor Email</label>
                                                    <Input
                                                        id="email"
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                        placeholder="auditor@firm.com"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                                <Button onClick={handleInvite} disabled={inviteMutation.isLoading}>
                                                    {inviteMutation.isLoading ? "Sending..." : "Send Invitation"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        );
                    })()}
                </header>

                {/* 2. Three-Pane Workspace */}
                <div className="flex-1 flex overflow-hidden">

                    {/* PANE 1: Navigation Sidebar (240px) */}
                    <nav className="w-64 bg-muted border-r border-border flex flex-col shrink-0 relative z-30">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 pr-2">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Workspace</div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-muted rounded-full"
                                    onClick={() => setCreateRequestOpen(true)}
                                    title="Add Manual Request"
                                >
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Sidebar Readiness Gauge */}
                            {(() => {
                                const total = displayRequests.length;
                                const accepted = displayRequests.filter(r => r.status === 'Accepted').length;
                                const score = total > 0 ? Math.round((accepted / total) * 100) : 0;

                                const getPhase = (s: number) => {
                                    if (s === 0) return "Not Started";
                                    if (s < 30) return "Planning";
                                    if (s < 70) return "Evidence Collection";
                                    if (s < 100) return "Final Review";
                                    return "Audit Ready";
                                };

                                return (
                                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm mb-6 flex flex-col items-center text-center">
                                        <CircularProgress
                                            value={score}
                                            size={72}
                                            strokeWidth={6}
                                            color="text-primary-cta"
                                            className="mb-3"
                                        />
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Audit Readiness</div>
                                        <div className="text-sm font-extrabold text-foreground mb-1">{getPhase(score)}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium">
                                            {accepted} / {total} Verified
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-1">
                                <NavButton
                                    active={activeSection === 'overview'}
                                    onClick={() => setActiveSection('overview')}
                                    icon={LayoutDashboard}
                                    label="Overview"
                                />
                                <NavButton
                                    active={activeSection === 'pbc'}
                                    onClick={() => setActiveSection('pbc')}
                                    icon={CheckCircle2}
                                    label="PBC Inbox"
                                    count={displayRequests.length}
                                />
                                <NavButton
                                    active={activeSection === 'findings'}
                                    onClick={() => setActiveSection('findings')}
                                    icon={AlertCircle}
                                    label="Findings"
                                    count={findings?.length ?? 0}
                                />
                                <NavButton
                                    active={activeSection === 'discussions'}
                                    onClick={() => setActiveSection('discussions')}
                                    icon={MessageSquare}
                                    label="Discussions"
                                    count={comments?.length || 0}
                                />
                            </div>
                        </div>

                        {/* Auditor Branding/Contact */}
                        <div className="mt-auto p-4 border-t border-border">
                            {activeAudit ? (
                                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border shadow-sm">
                                    <Avatar className="h-9 w-9 border-2 border-border bg-muted">
                                        <AvatarFallback className="text-xs font-bold text-muted-foreground">
                                            {getInitials(activeAudit.auditorName || "Unknown")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-foreground truncate">{activeAudit.auditorName || "Auditor Assigned"}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{activeAudit.auditFirm || "External Audit"}</div>
                                    </div>
                                </div>
                            ) : isAdmin ? (
                                <button
                                    onClick={() => setInviteOpen(true)}
                                    className="w-full flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-dashed border-amber-300 text-left hover:bg-amber-500/10 transition-colors group"
                                >
                                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-200">
                                        <Mail className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 dark:text-amber-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-amber-800">Invite Auditor</div>
                                        <div className="text-[10px] text-amber-600 dark:text-amber-400 dark:text-amber-300">No auditor assigned yet</div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-amber-400 dark:text-amber-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            ) : null}
                        </div>

                    </nav>

                    {activeSection === 'pbc' && (
                        <div className="w-96 bg-card border-r border-border flex flex-col shrink-0 z-20 shadow-sm h-full max-h-full overflow-hidden">

                            {/* Inbox Toolbar */}
                            <div className="p-4 border-b border-border space-y-3 bg-card/50 backdrop-blur-sm sticky top-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-foreground text-sm tracking-tight">Evidence Requests</h2>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-muted-foreground hover:text-primary-cta"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleInitialize();
                                            }}
                                            disabled={initializeMutation.isLoading}
                                            title="Sync Standard Requests"
                                        >
                                            <RotateCw className={cn("h-3 w-3", initializeMutation.isLoading && "animate-spin")} />
                                        </Button>
                                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-[10px] h-5">{displayRequests.length}</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by ID or title..."
                                            className="pl-8 bg-muted border-border h-9 text-xs focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-[110px] h-9 text-xs bg-card border-border">
                                            <div className="flex items-center gap-2">
                                                <Filter className="h-3 w-3 text-muted-foreground" />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="In Review">In Review</SelectItem>
                                            <SelectItem value="Accepted">Accepted</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex-1 bg-muted/30 overflow-y-auto min-h-0">


                                {isEvidenceLoading ? (
                                    <div className="p-4 space-y-3">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {displayRequests.length === 0 ? (
                                            <div className="p-8 text-center bg-muted/50 rounded-xl m-4 border border-border">
                                                <div className="bg-card h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ring-1 ring-foreground/5">
                                                    <Shield className="h-6 w-6 text-primary-cta" />
                                                </div>
                                                <h3 className="text-sm font-bold text-foreground mb-1">Standard Not Initialized</h3>
                                                <p className="text-xs text-muted-foreground mb-6 max-w-[200px] mx-auto leading-relaxed">
                                                    No requests found for <span className="font-semibold text-foreground">{activeFramework}</span>. Would you like to populate the standard request list?
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="w-full bg-primary-cta hover:bg-primary-cta text-primary-foreground shadow-sm ring-1 ring-slate-900/10 gap-2 h-9"
                                                    onClick={handleInitialize}
                                                    disabled={initializeMutation.isLoading}
                                                >
                                                    {initializeMutation.isLoading ? (
                                                        <>
                                                            <RotateCw className="h-3.5 w-3.5 animate-spin" />
                                                            <span>Initializing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Initialize {activeFramework}</span>
                                                        </>
                                                    )}
                                                </Button>
                                                <p className="text-[10px] text-muted-foreground mt-4 italic">
                                                    This will import verified seed requests for this standard.
                                                </p>
                                            </div>
                                        ) : (
                                            displayRequests.map(req => (
                                                <div
                                                    key={req.id}
                                                    onClick={() => setSelectedRequest(req)}
                                                    className={cn(
                                                        "group px-4 py-3 cursor-pointer border-b border-border transition-colors relative",
                                                        selectedRequest?.id === req.id
                                                            ? "bg-card shadow-sm z-10"
                                                            : "bg-card/50 hover:bg-card"
                                                    )}
                                                >
                                                    {selectedRequest?.id === req.id && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary-cta" />
                                                    )}

                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className={cn(
                                                                "font-medium text-xs truncate max-w-[120px]",
                                                                selectedRequest?.id === req.id ? "text-primary-cta" : "text-foreground"
                                                            )}>
                                                                {req.id}
                                                            </span>
                                                            {!req.status || req.status === 'pending' || req.status === 'Open' ? (
                                                                <span className="h-2 w-2 rounded-full bg-primary-cta shrink-0" title="Unread" />
                                                            ) : null}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={cn(
                                                                "text-[10px] whitespace-nowrap",
                                                                selectedRequest?.id === req.id ? "text-primary-cta/80" : "text-muted-foreground group-hover:text-muted-foreground"
                                                            )}>
                                                                {req.dueDate && new Date(req.dueDate).getFullYear() > 1970
                                                                    ? new Date(req.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                                                    : ''}
                                                            </span>
                                                            <button
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 dark:text-red-400 dark:text-red-300"
                                                                onClick={(e) => confirmDelete(e, req)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        "text-sm mb-1 leading-tight truncate pr-2",
                                                        selectedRequest?.id === req.id ? "font-bold text-foreground" : "font-medium text-foreground group-hover:text-foreground"
                                                    )}>
                                                        {req.title}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground line-clamp-1 mb-2.5 pr-4">
                                                        <span className="text-muted-foreground mr-1">{req.control || req.framework || "General"} ·</span>
                                                        {req.description
                                                            ? <span>{req.description}</span>
                                                            : <span className="italic text-foreground/70">No description</span>}
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={cn(
                                                                "h-1.5 w-1.5 rounded-full",
                                                                req.status === 'Accepted' ? 'bg-emerald-500' :
                                                                    req.status === 'In Review' ? 'bg-amber-400' :
                                                                        req.status === 'Returned' ? 'bg-rose-500' : 'bg-muted'
                                                            )} />
                                                            <span className={cn(
                                                                "text-[10px] font-medium",
                                                                req.status === 'Accepted' ? 'text-emerald-600 dark:text-emerald-400' :
                                                                    req.status === 'In Review' ? 'text-amber-600 dark:text-amber-400 dark:text-amber-300' :
                                                                        req.status === 'Returned' ? 'text-rose-600' : 'text-muted-foreground'
                                                            )}>{req.status}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                            <div className={cn(
                                                                "flex items-center gap-1",
                                                                req.evidence > 0 ? 'text-primary-cta' : 'text-foreground/70'
                                                            )}>
                                                                <FileText className="h-3 w-3" />
                                                                <span>{req.evidence}</span>
                                                            </div>
                                                            {req.comments > 0 && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <MessageSquare className="h-3 w-3" />
                                                                    <span>{req.comments}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>


                        </div>
                    )}

                    {/* PANE 3: Workspace / Detail / Overview */}
                    <div className="flex-1 bg-muted/30 flex flex-col h-full min-w-0 overflow-auto">
                        {activeSection === 'pbc' ? (
                            selectedRequest ? (
                                <>
                                    {/* Workspace Header - Redesigned */}
                                    <div className="bg-card border-b border-border px-8 py-6 flex items-start justify-between shrink-0 sticky top-0 z-30 shadow-sm">
                                        <div className="max-w-2xl">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Badge variant="outline" className="bg-muted text-foreground border-border font-mono tracking-tight text-[11px]">
                                                    {selectedRequest.control}
                                                </Badge>
                                                {selectedRequest.dueDate && new Date(selectedRequest.dueDate).getFullYear() > 1970 && (
                                                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                                                        Due {new Date(selectedRequest.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <h1 className="text-xl font-bold text-foreground mb-3 leading-tight">{selectedRequest.title}</h1>
                                            <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                                                {selectedRequest.description || "Please provide evidence demonstrating compliance with this control requirement. Ensure all documents are recent (within last 12 months) and approved by management."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            {/* Status Badge - Big */}
                                            <Badge variant="outline" className={cn("px-3 py-1 text-xs font-semibold uppercase tracking-wider border", getStatusColor(selectedRequest.status))}>
                                                {selectedRequest.status}
                                            </Badge>

                                            {/* Primary Actions - Moved to Header */}
                                            {selectedRequest.status !== 'Accepted' && (
                                                <div className="flex gap-2 mt-2">
                                                    <Button variant="outline" size="sm" className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 gap-2 font-medium" onClick={() => handleStatusUpdate('rejected')} disabled={updateStatusMutation.isLoading}>
                                                        <AlertCircle className="h-3.5 w-3.5" /> Return
                                                    </Button>
                                                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-2 font-medium shadow-sm" onClick={() => handleStatusUpdate('verified')} disabled={updateStatusMutation.isLoading}>
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify & Accept
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Workspace Content Tabs */}
                                    <Tabs defaultValue="evidence" className="flex-1 flex flex-col min-h-0">
                                        <div className="bg-card border-b px-8 sticky top-[calc(theme(spacing.24)+theme(spacing.10))] z-20">
                                            <TabsList className="bg-transparent h-12 w-full justify-start p-0 space-x-8">
                                                <TabsTrigger value="evidence" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-primary-cta data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium text-muted-foreground hover:text-foreground">Evidence Files</TabsTrigger>
                                                <TabsTrigger value="activity" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-primary-cta data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium text-muted-foreground hover:text-foreground">Activity & Discussion</TabsTrigger>
                                                <TabsTrigger value="audit-log" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-primary-cta data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium text-muted-foreground hover:text-foreground">Audit Log</TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-auto bg-muted/50">
                                            <TabsContent value="evidence" className="m-0 p-8 max-w-5xl mx-auto w-full focus-visible:ring-0 outline-none">

                                                {/* Evidence Toolbar */}
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-foreground">Evidence Documentation</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{evidenceFiles?.length || 0} file{(evidenceFiles?.length || 0) !== 1 ? 's' : ''} attached</p>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <Slot
                                                            name={SlotNames.EVIDENCE_TOOLBAR_ACTIONS}
                                                            props={{
                                                                evidenceId: selectedRequest.original.id,
                                                                controlName: selectedRequest.control,
                                                                controlDescription: selectedRequest.description || (selectedRequest as any).evidenceDescription || "No description provided"
                                                            }}
                                                        />

                                                        {/* Consolidated Add Evidence dropdown */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="sm" className="gap-2 bg-primary-cta hover:bg-primary-cta text-primary-foreground shadow-sm">
                                                                    <Plus className="h-4 w-4" />
                                                                    Add Evidence
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52">
                                                                <DropdownMenuItem
                                                                    className="gap-2 cursor-pointer"
                                                                    onClick={() => document.getElementById('audit-hub-upload-input')?.click()}
                                                                >
                                                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                                                    Upload File
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="gap-2 cursor-pointer"
                                                                    onClick={() => setLibraryOpen(true)}
                                                                >
                                                                    <Search className="h-4 w-4 text-muted-foreground" />
                                                                    Select from Library
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="gap-2 cursor-pointer"
                                                                    onClick={() => setLinkOpen(true)}
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                                    Link Integration
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <input
                                                            id="audit-hub-upload-input"
                                                            type="file"
                                                            className="hidden"
                                                            onChange={handleFileSelect}
                                                            multiple
                                                        />
                                                    </div>
                                                </div>

                                                {selectedRequest.evidence === 0 && !evidenceFiles?.length ? (
                                                    <div className="p-6">
                                                        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading uploader...</div>}>
                                                            <EvidenceFileUpload
                                                                evidenceId={selectedRequest.original.id}
                                                                clientId={clientId}
                                                            />
                                                        </Suspense>
                                                    </div>
                                                ) : (
                                                    <Card className="border-border shadow-sm overflow-hidden">
                                                        <Table>
                                                            <TableHeader className="bg-muted/50">
                                                                <TableRow className="hover:bg-transparent border-border">
                                                                    <TableHead className="w-[40%] text-xs font-semibold text-muted-foreground uppercase tracking-wider h-10">Filename / Resource</TableHead>
                                                                    <TableHead className="w-[20%] text-xs font-semibold text-muted-foreground uppercase tracking-wider h-10">Date Uploaded</TableHead>
                                                                    <TableHead className="w-[15%] text-xs font-semibold text-muted-foreground uppercase tracking-wider h-10">Type</TableHead>
                                                                    <TableHead className="w-[15%] text-xs font-semibold text-muted-foreground uppercase tracking-wider h-10">Validation</TableHead>
                                                                    <TableHead className="w-[10%] text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider h-10">Action</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {isFilesLoading ? (
                                                                    <TableRow>
                                                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading evidence...</TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    evidenceFiles?.map((file: any) => (
                                                                        <TableRow key={file.id} className="hover:bg-muted/50 group border-border transition-colors">
                                                                            <TableCell className="font-medium text-foreground py-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center shrink-0 border border-indigo-100 text-primary-cta">
                                                                                        {file.fileUrl ? <FileText className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
                                                                                    </div>
                                                                                    <button
                                                                                        className="truncate max-w-[240px] hover:text-primary-cta hover:underline text-left transition-colors"
                                                                                        title={`Open ${file.filename}`}
                                                                                        onClick={() => file.fileUrl && window.open(file.fileUrl, '_blank')}
                                                                                    >
                                                                                        {file.filename}
                                                                                    </button>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-muted-foreground text-xs">{new Date(file.createdAt).toLocaleDateString()} {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                                            <TableCell className="text-muted-foreground text-xs font-mono">{file.contentType || 'Integration'}</TableCell>
                                                                            <TableCell>
                                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:text-emerald-300 text-[10px] font-medium border border-emerald-100">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Safe
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                {file.fileUrl && (
                                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary-cta hover:bg-muted" onClick={() => window.open(file.fileUrl, '_blank')}>
                                                                                        <Download className="h-4 w-4" />
                                                                                    </Button>
                                                                                )}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 dark:text-red-400 dark:text-red-300 hover:bg-red-500/10"
                                                                                    onClick={() => setFileToDelete(file)}
                                                                                    disabled={fileDeleteMutation.isLoading}
                                                                                >
                                                                                    {fileDeleteMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )}
                                                                {/* Also show linked integrations if stored differently or merged here */}
                                                                {selectedRequest.type === 'api' && (
                                                                    <TableRow className="hover:bg-muted/50 group border-border transition-colors">
                                                                        <TableCell className="font-medium text-foreground py-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="h-8 w-8 bg-blue-500/10 rounded flex items-center justify-center shrink-0 border border-blue-100 text-blue-600 dark:text-blue-400">
                                                                                    <RotateCw className="h-4 w-4" />
                                                                                </div>
                                                                                <span className="truncate max-w-[240px]">
                                                                                    Link Integration: {selectedRequest.location}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-muted-foreground text-xs">{new Date(selectedRequest.updatedAt).toLocaleDateString()}</TableCell>
                                                                        <TableCell className="text-muted-foreground text-xs font-mono">API Link</TableCell>
                                                                        <TableCell>
                                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-medium border border-blue-100">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Active
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary-cta hover:bg-muted">
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </Card>
                                                )}
                                            </TabsContent>

                                            {/* Activity Tab Content */}
                                            <TabsContent value="activity" className="m-0 p-8 max-w-4xl mx-auto w-full focus-visible:ring-0">
                                                <ChatSection request={selectedRequest} />
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </>
                            ) : (
                                /* Empty State */
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/50">
                                    <div className="h-24 w-24 bg-card rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-border">
                                        <Briefcase className="h-10 w-10 text-foreground/70" />
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground mb-2">
                                        {displayRequests.length > 0 ? "Select a Request" : "Ready to Audit"}
                                    </h2>
                                    <p className="max-w-xs text-muted-foreground text-sm mb-8 leading-relaxed">
                                        {displayRequests.length > 0
                                            ? "Select a request from the list on the left to view evidence, verify compliance, and leave findings."
                                            : "Initialize the workspace to generate the standard evidence request list for this framework."}
                                    </p>

                                    <div className="flex gap-3 mt-8">
                                        <Button variant="outline" className="gap-2 text-primary-cta border-indigo-200 bg-muted hover:bg-muted h-9 text-sm">
                                            <Download className="h-4 w-4" /> Audit Methodology
                                        </Button>
                                        <Button
                                            className="gap-2 h-9 text-sm"
                                            onClick={handleInitialize}
                                            disabled={initializeMutation.isLoading}
                                        >
                                            {initializeMutation.isLoading ? "Updating..." : (displayRequests.length > 0 ? "Update Workspace" : "Initialize Workspace")}
                                        </Button>
                                    </div>
                                    {displayRequests.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground mt-4 max-w-sm">
                                            Tip: Click "Update Workspace" to add any missing standard requests for the selected framework without affecting existing work.
                                        </p>
                                    )}
                                </div>
                            )
                        ) : activeSection === 'overview' ? (
                            <AuditOverview
                                clientId={clientId}
                                onNavigate={(section, filter) => {
                                    setActiveSection(section);
                                    if (filter) setFilterStatus(filter);
                                }}
                            />
                        ) : activeSection === 'findings' ? (
                            <AuditFindings clientId={clientId} />
                        ) : activeSection === 'discussions' ? (
                            <AuditDiscussions
                                clientId={clientId}
                                onNavigateToEvidence={(id) => {
                                    // Try to find the evidence request by various ID formats
                                    const idStr = String(id);
                                    const req = auditRequests.find(r => {
                                        // Direct match on id
                                        if (r.id === idStr) return true;
                                        // Match on original.id
                                        if (r.original?.id === idStr) return true;
                                        // Match on original.evidenceId
                                        if (r.original?.evidenceId === idStr) return true;
                                        // Match EV- prefix format
                                        if (`EV-${r.id}` === idStr || `EV-${r.original?.evidenceId}` === idStr) return true;
                                        return false;
                                    });

                                    if (req) {
                                        console.log("[AuditHub] Navigating to evidence request:", req.id);
                                        setActiveSection('pbc');
                                        setSelectedRequest(req);
                                    } else {
                                        console.warn("[AuditHub] Evidence request not found for id:", id);
                                        toast.error("Evidence request not found.");
                                    }
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
            <Dialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 dark:text-red-300" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold text-foreground">Delete Evidence Request?</DialogTitle>
                        <DialogDescription className="text-center text-sm text-muted-foreground max-w-[300px] mx-auto leading-relaxed pt-2">
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{requestToDelete?.title}"</span>? This action cannot be undone and will remove all associated findings.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 pt-6">
                        <Button variant="outline" onClick={() => setDeleteConfirmationOpen(false)} className="h-10 font-medium border-border hover:bg-muted">Cancel</Button>
                        <Button variant="destructive" onClick={executeDelete} className="h-10 font-semibold bg-red-600 hover:bg-red-700 text-primary-foreground shadow-sm ring-1 ring-red-700/10">
                            {deleteMutation.isLoading ? "Deleting..." : "Delete Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Request Dialog */}
            <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Manual Evidence Request</DialogTitle>
                        <DialogDescription>
                            Create a new evidence request linked to a specific control.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Reference ID *</label>
                            <Input
                                value={newRequestData.evidenceId}
                                onChange={(e) => setNewRequestData({ ...newRequestData, evidenceId: e.target.value })}
                                placeholder="e.g. MANUAL-001"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Control *</label>
                            <Select
                                value={newRequestData.clientControlId}
                                onValueChange={(val) => setNewRequestData({ ...newRequestData, clientControlId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a control..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {clientControlsList?.map((item: any) => (
                                        <SelectItem key={item.clientControl.id} value={item.clientControl.id.toString()}>
                                            <span className="font-mono text-xs mr-2 text-muted-foreground">{item.control?.controlId || item.clientControl.clientControlId}</span>
                                            {item.control?.name || "Unknown Control"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Description *</label>
                            <Input
                                value={newRequestData.description}
                                onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                                placeholder="Describe the evidence required..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Owner</label>
                                <Input
                                    value={newRequestData.owner}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, owner: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Due Date</label>
                                <Input
                                    type="date"
                                    value={newRequestData.dueDate}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateRequestOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateRequest} disabled={createEvidenceMutation.isLoading}>
                            {createEvidenceMutation.isLoading ? "Creating..." : "Create Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auditor Invite Dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Auditor</DialogTitle>
                        <DialogDescription>
                            This will send an email invitation to the external auditor to access this specific clean room.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="auditor@firm.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                        <Button onClick={handleInvite} disabled={inviteMutation.isLoading || !inviteEmail}>
                            {inviteMutation.isLoading ? "Sending Invitation..." : "Send Invitation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Link Integration Dialog */}
            <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Link Automated Evidence</DialogTitle>
                        <DialogDescription>
                            Connect an external integration to automatically collect evidence for this control.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Integration Provider</label>
                            <Select
                                value={linkData.provider}
                                onValueChange={(val) => {
                                    setLinkData({ ...linkData, provider: val });
                                    setConnectionStatus('idle');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="github">GitHub (Commits/PRs)</SelectItem>
                                    <SelectItem value="aws">AWS CloudTrail</SelectItem>
                                    <SelectItem value="jira">Jira Tickets</SelectItem>
                                    <SelectItem value="s3">S3 Bucket Policy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Resource ID / URL</label>
                            <div className="flex gap-2">
                                <Input
                                    value={linkData.resourceId}
                                    onChange={(e) => {
                                        setLinkData({ ...linkData, resourceId: e.target.value });
                                        setConnectionStatus('idle');
                                    }}
                                    placeholder={
                                        linkData.provider === 'github' ? "https://github.com/org/repo/pull/123" :
                                            linkData.provider === 'aws' ? "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-events" :
                                                "Resource Identifier"
                                    }
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] text-muted-foreground">
                                    The system will monitor this resource for changes.
                                </p>
                                {connectionStatus === 'success' ? (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Connection Verified
                                    </span>
                                ) : connectionStatus === 'testing' ? (
                                    <span className="text-[10px] font-bold text-primary-cta flex items-center gap-1">
                                        <RotateCw className="h-3 w-3 animate-spin" /> Verifying...
                                    </span>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-primary-cta hover:text-primary-cta hover:bg-muted px-2"
                                        onClick={testConnection}
                                        disabled={!linkData.resourceId}
                                    >
                                        Test Connection
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleLink}
                            disabled={linkMutation.isLoading || !linkData.resourceId || connectionStatus !== 'success'}
                            className={cn(
                                connectionStatus === 'success' ? "bg-emerald-600 hover:bg-emerald-700" : ""
                            )}
                        >
                            {linkMutation.isLoading ? "Linking..." : connectionStatus === 'success' ? "Confirm Integration" : "Connect Integration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EvidenceLibraryDialog
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                clientId={clientId}
                evidenceId={selectedRequest?.original?.id || 0}
                onSuccess={() => {
                    refetchFiles();
                    utils.evidence.list.invalidate();
                }}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the evidence file "{fileToDelete?.filename}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            onClick={() => {
                                if (fileToDelete) {
                                    fileDeleteMutation.mutate({ id: fileToDelete.id });
                                    setFileToDelete(null);
                                }
                            }}
                        >
                            {fileDeleteMutation.isLoading ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </Layout>
    );
}

function ChatSection({ request }: { request: any }) {
    const [commentText, setCommentText] = useState("");
    const { user } = useAuth();
    const utils = trpc.useContext();

    // We need the numeric ID from the backend, assuming request.original.id is it.
    const evidenceId = request.original.id;

    // Only fetch if we have a valid ID
    const { data: comments, isLoading } = trpc.evidence.getComments.useQuery(
        { evidenceId },
        { enabled: !!evidenceId, refetchInterval: 5000 }
    );

    const addCommentMutation = trpc.evidence.addComment.useMutation({
        onSuccess: () => {
            setCommentText("");
            utils.evidence.getComments.invalidate({ evidenceId });
            toast.success("Comment posted");
        },
        onError: (err) => {
            toast.error("Failed to post comment");
        }
    });

    const handlePostComment = () => {
        if (!commentText.trim()) return;
        addCommentMutation.mutate({
            evidenceId,
            content: commentText
        });
    };

    return (
        <div className="max-w-4xl p-0">
            <div className="flex flex-col gap-6">

                <div className="space-y-6 min-h-[200px]">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
                    ) : comments?.length === 0 ? (
                        <div className="p-8 bg-muted rounded-lg border border-border text-center">
                            <MessageSquare className="h-8 w-8 text-foreground/70 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground italic">No discussion yet. Start a thread below.</p>
                        </div>
                    ) : (
                        comments?.map((comment: any) => {
                            const isMe = comment.userId === user?.id;
                            return (
                                <div key={comment.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                                    <Avatar className="h-8 w-8 shrink-0 mt-1">
                                        <AvatarFallback className={cn("text-[10px]", isMe ? "bg-muted text-primary-cta" : "bg-muted text-muted-foreground")}>
                                            {(comment.userName || comment.userEmail || "U").substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-foreground">{comment.userName || comment.userEmail}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className={cn("p-3 rounded-lg text-sm", isMe ? "bg-primary-cta text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none shadow-sm text-foreground")}>
                                            {comment.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-4 items-start pt-6 border-t mt-4">
                    <Avatar className="h-8 w-8 hidden sm:block">
                        <AvatarFallback className="bg-muted text-primary-cta">ME</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <Textarea
                            placeholder="Leave a comment, request clarification, or approve..."
                            className="min-h-[80px] bg-card"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                className="bg-primary-cta text-primary-foreground"
                                onClick={handlePostComment}
                                disabled={addCommentMutation.isLoading || !commentText.trim()}
                            >
                                {addCommentMutation.isLoading ? "Posting..." : "Post Comment"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}

function AuditOverview({ clientId, onNavigate }: { clientId: number, onNavigate: (section: string, filter?: string) => void }) {
    const { data: evidenceList } = trpc.evidence.list.useQuery({ clientId });
    const { data: findings } = trpc.findings.list.useQuery({ clientId });

    // Calculate stats
    const openRequests = evidenceList?.filter(e => e.status === 'open' || e.status === 'collected').length || 0;
    const verifiedRequests = evidenceList?.filter(e => e.status === 'verified').length || 0;
    const totalRequests = evidenceList?.length || 1;
    const completionPercentage = Math.round((verifiedRequests / totalRequests) * 100);

    const openFindings = findings?.filter(f => f.status === 'open').length || 0;
    const highFindings = findings?.filter(f => f.status === 'open' && (f.severity === 'high' || f.severity === 'critical')).length || 0;

    // Check for comments (hacky/approximate since we don't have a direct "unread" count yet)
    // We can show the action if there are ANY comments, or maybe just default to showing it if there are open requests.
    // For now, let's filter evidenceList for items with comments.
    const requestsWithComments = evidenceList?.filter(e => (e.commentCount || 0) > 0).length || 0;

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Executive Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-border">
                    <CardHeader className="p-5 pb-1">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Progress</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground tracking-tight">{completionPercentage}%</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-3">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary-cta rounded-full transition-all duration-1000" style={{ width: `${completionPercentage}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium">{verifiedRequests} of {totalRequests} controls verified</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border">
                    <CardHeader className="p-5 pb-1">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Requests</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground tracking-tight">{openRequests}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 dark:text-amber-300 bg-amber-500/10 inline-flex px-2 py-0.5 rounded-full border border-amber-100">
                            <Clock className="h-3 w-3" />
                            <span>Action Required</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border">
                    <CardHeader className="p-5 pb-1">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Findings</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground tracking-tight">{openFindings}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-3">
                        {highFindings > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 dark:text-red-300 bg-red-500/10 inline-flex px-2 py-0.5 rounded-full border border-red-100">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{highFindings} High Severity</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 dark:text-emerald-300 bg-emerald-500/10 inline-flex px-2 py-0.5 rounded-full border border-emerald-100">
                                <Check className="h-3 w-3" />
                                <span>Risk Low</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border">
                    <CardHeader className="p-5 pb-1">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Phase</CardDescription>
                        <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Fieldwork</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-3">
                        <p className="text-[11px] text-muted-foreground font-medium">Est. Completion: Feb 28, 2026</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 shadow-sm border-border h-full">
                    <CardHeader className="border-b border-border bg-muted/50 py-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold text-foreground">Priority Action Items</CardTitle>
                                <CardDescription className="text-xs">Tasks requiring immediate attention to proceed.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate('pbc', 'all')}>View All Tasks</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {/* Dynamic Action Items */}
                            {highFindings > 0 && (
                                <div
                                    className="p-4 hover:bg-muted transition-colors flex gap-4 items-start group cursor-pointer"
                                    onClick={() => onNavigate('findings')}
                                >
                                    <div className="mt-1 p-2 bg-red-500/10 text-red-600 dark:text-red-400 dark:text-red-300 rounded-lg border border-red-100 shrink-0">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-cta transition-colors">Resolve Critical Findings</h4>
                                            <Badge variant="outline" className="border-red-200 text-red-700 dark:text-red-400 bg-red-500/10 text-[10px]">High Priority</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">There are {highFindings} high severity findings that impact compliance certification.</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 opacity-0 group-hover:opacity-100"><ArrowLeft className="h-4 w-4 rotate-180" /></Button>
                                </div>
                            )}

                            {openRequests > 0 && (
                                <div
                                    className="p-4 hover:bg-muted transition-colors flex gap-4 items-start group cursor-pointer"
                                    onClick={() => onNavigate('pbc', 'open')}
                                >
                                    <div className="mt-1 p-2 bg-muted text-primary-cta rounded-lg border border-indigo-100 shrink-0">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-cta transition-colors">Submit Missing Evidence</h4>
                                            <Badge variant="outline" className="border-indigo-200 text-primary-cta bg-muted text-[10px]">Action Required</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{openRequests} evidence requests are pending submission.</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 opacity-0 group-hover:opacity-100"><ArrowLeft className="h-4 w-4 rotate-180" /></Button>
                                </div>
                            )}

                            {requestsWithComments > 0 ? (
                                <div
                                    className="p-4 hover:bg-muted transition-colors flex gap-4 items-start group cursor-pointer"
                                    onClick={() => onNavigate('pbc', 'all')} // Go to list, maybe we should filter by 'commented' if we had that filter
                                >
                                    <div className="mt-1 p-2 bg-muted text-muted-foreground rounded-lg border border-border shrink-0">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-cta transition-colors">Review Auditor Comments</h4>
                                            <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">Review</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Check discussions on evidence requests.</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 opacity-0 group-hover:opacity-100"><ArrowLeft className="h-4 w-4 rotate-180" /></Button>
                                </div>
                            ) : null}

                            {highFindings === 0 && openRequests === 0 && requestsWithComments === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400 dark:text-emerald-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                                    <p className="text-xs">No priority actions required at this time.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border h-full">
                    <CardHeader className="border-b border-border bg-muted/50 py-4">
                        <CardTitle className="text-base font-semibold text-foreground">Recent Findings</CardTitle>
                        <CardDescription className="text-xs">Latest observations</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {findings?.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-xs italic">
                                    No findings reported.
                                </div>
                            ) : (
                                findings?.slice(0, 5).map((f: any) => (
                                    <div key={f.id} className="p-3 flex items-start gap-3 hover:bg-muted transition-colors group">
                                        <div className={cn(
                                            "mt-0.5 h-2 w-2 rounded-full shrink-0",
                                            f.severity === 'critical' ? "bg-red-600" :
                                                f.severity === 'high' ? "bg-red-500" :
                                                    f.severity === 'medium' ? "bg-orange-500" :
                                                        "bg-yellow-500"
                                        )} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-foreground truncate group-hover:text-primary-cta">{f.title}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AuditFindings({ clientId }: { clientId: number }) {
    const [createOpen, setCreateOpen] = useState(false);
    const utils = trpc.useContext();
    const { data: findings, isLoading } = trpc.findings.list.useQuery({ clientId });

    // State for new finding
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");

    const createMutation = trpc.findings.create.useMutation({
        onSuccess: () => {
            toast.success("Finding created");
            setCreateOpen(false);
            setTitle("");
            setDescription("");
            utils.findings.list.invalidate();
        }
    });

    const handleCreate = () => {
        if (!title) return;
        createMutation.mutate({
            clientId,
            title,
            description,
            severity
        });
    }

    return (
        <div className="p-8 h-full flex flex-col space-y-6">
            <div className="flex justify-between items-end border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Findings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Official record of non-conformities and audit observations.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-primary-foreground gap-2 h-9 shadow-sm">
                            <AlertTriangle className="h-4 w-4" /> Report New Finding
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Issue Formal Finding</DialogTitle>
                            <DialogDescription>
                                Document a non-conformity found during the audit process.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-5 py-6">
                            <div className="grid gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Finding Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Lack of Multi-Factor Authentication"
                                    className="h-10 border-border focus:ring-red-500/10 focus:border-red-500/50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Severity Level</label>
                                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                                    <SelectTrigger className="h-10 border-border">
                                        <SelectValue placeholder="Select severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low - Minor Observation</SelectItem>
                                        <SelectItem value="medium">Medium - Process Issue</SelectItem>
                                        <SelectItem value="high">High - Security Risk</SelectItem>
                                        <SelectItem value="critical">Critical - Compliance Blocker</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide context, evidence references, and impact analysis..."
                                    className="min-h-[120px] border-border focus:ring-red-500/10 focus:border-red-500/50"
                                />
                            </div>
                        </div>
                        <DialogFooter className="bg-muted/50 p-6 -m-6 mt-0 rounded-b-lg border-t border-border">
                            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="h-10 font-medium">Cancel</Button>
                            <Button variant="destructive" onClick={handleCreate} className="h-10 px-8 bg-red-600 hover:bg-red-700 font-semibold uppercase tracking-wide text-xs">Confirm Finding</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>

            <Card className="rounded-xl border-border overflow-hidden shadow-sm shadow-slate-200/50">
                <Table>
                    <TableHeader className="bg-muted/80">
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Severity</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Identification & Title</TableHead>
                            <TableHead className="w-[120px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="w-[120px] text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date Issued</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-4 w-32 bg-muted mx-auto rounded"></div>
                                        <div className="h-3 w-48 bg-muted mx-auto rounded"></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : findings?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-24 text-muted-foreground">
                                    <div className="flex flex-col items-center">
                                        <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 dark:text-emerald-300 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                                            <Check className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-foreground font-semibold mb-1">No Non-Conformities Found</h3>
                                        <p className="text-sm max-w-xs text-muted-foreground">The audit has not yielded any formal findings yet. Continue review to maintain this status.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            findings?.map((finding: any) => (
                                <TableRow key={finding.id} className="cursor-pointer hover:bg-muted/50 transition-colors border-border group">
                                    <TableCell>
                                        <Badge className={cn(
                                            "capitalize font-bold border-none px-2 py-0.5 text-[10px]",
                                            finding.severity === 'critical' ? "bg-red-600/10 text-red-700 hover:bg-red-600/20" :
                                                finding.severity === 'high' ? "bg-red-600/10 text-red-600 dark:text-red-400 dark:text-red-300 hover:bg-red-600/20" :
                                                    finding.severity === 'medium' ? "bg-orange-600/10 text-orange-700 dark:text-orange-400 hover:bg-orange-600/20" :
                                                        "bg-yellow-600/10 text-yellow-700 hover:bg-yellow-600/20"
                                        )}>
                                            {finding.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="py-1">
                                            <div className="font-semibold text-foreground group-hover:text-primary-cta transition-colors">{finding.title}</div>
                                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1 font-medium">{finding.description}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="uppercase text-[9px] font-black border-border tracking-tight text-muted-foreground bg-card">
                                            {finding.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground font-medium text-[11px]">
                                        {new Date(finding.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div >
    );
}

function AuditDiscussions({ clientId, onNavigateToEvidence }: { clientId: number, onNavigateToEvidence: (id: string | number) => void }) {
    const { data: comments, isLoading } = trpc.evidence.getAllComments.useQuery({ clientId });

    return (
        <div className="p-8 h-full flex flex-col space-y-6 text-left">
            <div className="border-b border-border pb-6">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Communications</h1>
                <p className="text-sm text-muted-foreground mt-1">Centralized activity feed for all evidence requests and auditor feedback.</p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : comments?.length === 0 ? (
                    <div className="text-center py-24 bg-muted border border-dashed border-border rounded-2xl">
                        <MessageSquare className="h-10 w-10 text-foreground/70 mx-auto mb-4" />
                        <h3 className="text-foreground font-semibold mb-1">No Active Threads</h3>
                        <p className="text-sm text-muted-foreground">Activity across all workspaces will appear here.</p>
                    </div>
                ) : (
                    comments?.map((comment: any) => (
                        <Card key={comment.id} className="hover:shadow-md transition-all duration-300 border-border group overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex">
                                    {/* Accent strip based on role/status? Placeholder for now */}
                                    <div className="w-1 bg-primary-cta group-hover:bg-primary-cta transition-colors" />

                                    <div className="flex-1 p-5 flex gap-5">
                                        <Avatar className="h-10 w-10 border border-border shadow-sm shrink-0">
                                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                                                {(comment.userName || "U").substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground text-sm">{comment.userName || comment.userEmail}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium tracking-tight">
                                                        {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-primary-cta hover:bg-muted hover:text-primary-cta bg-muted border border-border"
                                                    onClick={() => onNavigateToEvidence(comment.evidenceId)}
                                                >
                                                    View Context <ArrowRight className="ml-1.5 h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-1.5 mb-3">
                                                <div className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-tight">On Request</div>
                                                <span className="text-xs font-semibold text-foreground truncate hover:text-primary-cta cursor-pointer transition-colors">
                                                    {comment.evidenceTitle || `Evidence Request #${comment.evidenceId}`}
                                                </span>
                                            </div>

                                            <div className="text-sm text-foreground leading-relaxed bg-muted p-4 rounded-xl border border-border group-hover:border-border font-medium">
                                                {comment.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all group",
                active
                    ? "bg-brand-bright text-primary-foreground shadow-sm ring-1 ring-brand-bright/50"
                    : "bg-brand text-primary-foreground hover:bg-brand-bright"
            )}
        >
            <Icon className={cn("h-4.5 w-4.5 transition-colors", active ? "text-primary-foreground" : "text-primary-foreground/80 group-hover:text-primary-foreground")} />
            <span>{label}</span>
            {count !== undefined && (
                <span className={cn(
                    "ml-auto text-[10px] font-bold py-0.5 px-2 rounded-full",
                    active ? "bg-card/20 text-primary-foreground" : "bg-card/10 text-primary-foreground/90"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}
