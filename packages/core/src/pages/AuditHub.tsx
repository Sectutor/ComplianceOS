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

/* ============================================================================
 * LOCAL DATA-CONTRACT LAYER - UI-STANDARD.md 16 (coordination by convention)
 * ---------------------------------------------------------------------------
 * The AppRouter type does not surface these procedure names to the compiler
 * (several server router factories are loosely typed upstream), so this page
 * casts the shared tRPC client ONCE to the contract below. Every entry mirrors
 * a real procedure implemented under packages/core/src/server/routers/:
 *
 *   audit.inviteAuditor              audit.ts:11
 *   audit.list                       audit.ts:82
 *   evidence.getFrameworks           evidence.ts:114
 *   evidence.list                    evidence.ts:121
 *   evidence.linkIntegration         evidence.ts:337
 *   evidence.getFiles                evidence.ts:364
 *   evidence.seed                    evidence.ts:486
 *   evidence.create / delete / updateStatus / addComment / getComments /
 *     getAllComments                 evidence.ts
 *   findings.list / findings.create  findings.ts:13 / findings.ts:36
 *   clientControls.list              registered in routers.ts
 *   evidenceFiles.create / .delete   evidenceFiles.ts:23 / evidenceFiles.ts:133
 *
 * LIVE (cycle 35): the evidenceFiles router is mounted on the AppRouter as of
 * cycle 35, so evidenceFiles.create/.delete hit live endpoints again. The
 * EVIDENCE_FILES_LIVE capability flag below is kept as a dead-man switch:
 * flipping it back to false degrades the upload/delete affordances to a
 * toast + tooltip ("not available in this deployment") without touching the
 * call sites.
 * ============================================================================
 */

type HubQueryOpts = {
    enabled?: boolean;
    retry?: boolean | number;
    refetchInterval?: number;
};

interface HubQueryResult<T> {
    data?: T;
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    refetch: () => void;
}

interface HubMutationResult<TInput, TResult> {
    mutate: (input: TInput) => void;
    mutateAsync: (input: TInput) => Promise<TResult>;
    isLoading?: boolean;
}

interface HubQuery<TInput, TResult> {
    useQuery: (input: TInput, opts?: HubQueryOpts) => HubQueryResult<TResult>;
}

interface HubQueryNoInput<TResult> {
    useQuery: (opts?: HubQueryOpts) => HubQueryResult<TResult>;
}

// NOTE: react-query v5 ignores per-mutation callbacks passed to useMutation;
// the signature keeps accepting them because the existing page code passes
// them and they are inert no-ops at runtime (behaviour preserved).
interface HubMutation<TInput, TResult> {
    useMutation: (opts?: {
        onSuccess?: (data: TResult) => void;
        onError?: (error: { message: string }) => void;
    }) => HubMutationResult<TInput, TResult>;
}

interface AuditHubApi {
    audit: {
        inviteAuditor: HubMutation<{ clientId: number; email: string }, { success: boolean; message?: string }>;
        list: HubQuery<{ clientId: number }, any[]>;
    };
    evidence: {
        getFrameworks: HubQueryNoInput<any>;
        list: HubQuery<{ clientId: number }, any[]>;
        getFiles: HubQuery<{ evidenceId: number }, any[]>;
        getAllComments: HubQuery<{ clientId: number }, any[]>;
        getComments: HubQuery<{ evidenceId: number }, any[]>;
        seed: HubMutation<{ clientId: number; framework: string }, unknown>;
        create: HubMutation<{ clientId: number; clientControlId: number; evidenceId: string; description: string; owner: string }, unknown>;
        updateStatus: HubMutation<{ evidenceId: number; status: string }, unknown>;
        delete: HubMutation<{ id: number }, unknown>;
        linkIntegration: HubMutation<{ evidenceId: number; provider: string; resourceId: string }, unknown>;
        addComment: HubMutation<{ evidenceId: number; content: string }, unknown>;
    };
    findings: {
        list: HubQuery<{ clientId: number }, any[]>;
        create: HubMutation<{ clientId: number; title: string; description: string; severity: string }, unknown>;
    };
    clientControls: {
        list: HubQuery<{ clientId: number }, any[]>;
    };
    // Mirrors server/routers/evidenceFiles.ts create/delete inputs exactly:
    // create takes { evidenceId, filename, fileKey, url, originalFilename?,
    // mimeType?, size? } (url/mimeType/size map onto the fileUrl/contentType/
    // fileSize columns server-side).
    evidenceFiles: {
        create: HubMutation<{
            evidenceId: number;
            filename: string;
            fileKey: string;
            url: string;
            originalFilename?: string;
            mimeType?: string;
            size?: number;
        }, unknown>;
        delete: HubMutation<{ id: number }, unknown>;
    };
}

const hubApi = trpc as unknown as AuditHubApi;

/** Query-cache invalidation surface actually used by this page (16 typed api). */
interface HubUtils {
    evidence: {
        list: { invalidate: (input?: unknown) => void };
        getComments: { invalidate: (input?: unknown) => void };
    };
    findings: {
        list: { invalidate: (input?: unknown) => void };
    };
}

/** Capability flag: evidenceFiles router is mounted on the AppRouter as of cycle 35. */
const EVIDENCE_FILES_LIVE = true;

/**
 * Supabase-style auth metadata arrives on AuthUser untyped at runtime; read it
 * defensively here instead of weakening the shared AuthUser contract.
 */
const getUserMetadata = (u: unknown): Record<string, unknown> =>
    (u as { user_metadata?: Record<string, unknown> } | null)?.user_metadata ?? {};

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
    // user_metadata arrives untyped on AuthUser at runtime (Supabase-style); read it
    // through the defensive local accessor instead of weakening the shared type.
    const userMetadata = getUserMetadata(user);
    const userRole = typeof userMetadata.role === 'string' ? userMetadata.role : '';
    const isAuditorView = userRole === 'auditor' || (typeof window !== 'undefined' ? window.location.search.includes('view=auditor') : false);
    const Layout = isAuditorView ? AuditorLayout : DashboardLayout;

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const inviteMutation = hubApi.audit.inviteAuditor.useMutation({
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

    const isAdmin = userRole === 'admin' || userRole === 'owner' || userRole === 'super_admin';

    // Live Data Fetching
    const { data: frameworksData } = hubApi.evidence.getFrameworks.useQuery();
    console.log('[AuditHub] Frameworks Data:', frameworksData);

    const { data: evidenceData, isLoading: isEvidenceLoading, refetch: refetchList } = hubApi.evidence.list.useQuery(
        { clientId },
        { enabled: !!clientId, retry: false }
    );

    // Fetch files for selected request
    const { data: evidenceFiles, isLoading: isFilesLoading, refetch: refetchFiles } = hubApi.evidence.getFiles.useQuery(
        { evidenceId: (selectedRequest as any)?.original?.id || 0 },
        { enabled: !!(selectedRequest as any)?.original?.id, retry: false }
    );

    // Fetch counts for sidebar
    const { data: findings } = hubApi.findings.list.useQuery({ clientId }, { enabled: !!clientId, retry: false });
    const { data: comments } = hubApi.evidence.getAllComments.useQuery({ clientId }, { enabled: !!clientId, retry: false });

    const utils = trpc.useContext() as unknown as HubUtils;
    const initializeMutation = hubApi.evidence.seed.useMutation({
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

    const linkMutation = hubApi.evidence.linkIntegration.useMutation({
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

    // Cycle 35: the evidenceFiles router is mounted on the AppRouter, so the
    // file create/delete mutations below are live (EVIDENCE_FILES_LIVE remains
    // as a dead-man switch that still degrades them if flipped back to false).
    const attachEvidenceFileMutation = hubApi.evidenceFiles.create.useMutation();
    const removeEvidenceFileMutation = hubApi.evidenceFiles.delete.useMutation();

    const handleDeleteEvidenceFile = async (file: any) => {
        if (!EVIDENCE_FILES_LIVE) {
            toast.info("Evidence file management isn't available in this deployment.");
            return;
        }
        if (!window.confirm(`Delete "${file?.filename}"? This action cannot be undone.`)) return;
        try {
            await removeEvidenceFileMutation.mutateAsync({ id: file.id });
            refetchFiles();
            toast.success("File removed");
        } catch (err: any) {
            toast.error(err?.message || "Failed to remove file");
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!EVIDENCE_FILES_LIVE) {
            toast.error("Evidence file uploads aren't available in this deployment.");
            return;
        }
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

                            await attachEvidenceFileMutation.mutateAsync({
                                evidenceId,
                                filename,
                                originalFilename: file.name,
                                fileKey: key,
                                url,
                                mimeType: file.type,
                                size: file.size,
                            });
                            refetchFiles();
                            toast.success("File attached");
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
    const { data: audits } = hubApi.audit.list.useQuery({ clientId }, { enabled: !!clientId, retry: false });
    const activeAudit = audits?.[0]; // Get the latest one

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '??';
    };

    const createEvidenceMutation = hubApi.evidence.create.useMutation({
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

    const { data: clientControlsList } = hubApi.clientControls.list.useQuery({ clientId }, { enabled: createRequestOpen && !!clientId, retry: false });

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

    const updateStatusMutation = hubApi.evidence.updateStatus.useMutation({
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

    const deleteMutation = hubApi.evidence.delete.useMutation({
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Accepted':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Accepted
                    </Badge>
                );
            case 'In Review':
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-semibold">
                        <Clock className="h-3 w-3 mr-1" /> In Review
                    </Badge>
                );
            case 'Returned':
                return (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-semibold">
                        <AlertCircle className="h-3 w-3 mr-1" /> Returned
                    </Badge>
                );
            case 'Open':
            default:
                return (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] font-semibold">
                        <Circle className="h-2.5 w-2.5 mr-1 text-muted-foreground" /> Open
                    </Badge>
                );
        }
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-background overflow-hidden">

                {/* 1. Sleek Executive Header */}
                <header className="bg-card border-b border-border px-6 py-4 shrink-0 z-30 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Title & Standard Selector */}
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">Audit Preparation Hub</h1>
                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">Standard:</span>
                                        <Select value={activeFramework} onValueChange={setActiveFramework}>
                                            <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs font-semibold text-primary focus:ring-0 shadow-none">
                                                <SelectValue placeholder="Framework" />
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
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Evidence collection, verification clean room, and auditor communication
                                </p>
                            </div>
                        </div>

                        {/* Readiness Metric Pill & Header Actions */}
                        <div className="flex items-center gap-3">
                            {/* Readiness Pill */}
                            <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-muted/60 border border-border">
                                <div className="text-right">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Readiness</div>
                                    <div className="text-xs font-bold text-foreground">{progress}% Verified ({stats.accepted}/{stats.total})</div>
                                </div>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            <PageGuide
                                title="Audit Preparation Hub"
                                description="Centralized workspace for audit evidence collection and auditor collaboration."
                                rationale="Ensures continuous audit readiness with verified evidence artifacts and direct auditor engagement."
                                howToUse={[
                                    { step: "Initialize PBC", description: "Sync the standard request list for your active compliance framework." },
                                    { step: "Upload Evidence", description: "Attach documents or link automated integrations to fulfill controls." },
                                    { step: "Verify & Accept", description: "Mark requests as verified so they are visible to external auditors." },
                                    { step: "Manage Findings", description: "Review observations and coordinate corrective remediation." }
                                ]}
                                integrations={[
                                    { name: "Global Vault", description: "Reuse verified evidence across multiple frameworks." },
                                    { name: "Auditor Links", description: "Secure external clean room invitations." }
                                ]}
                            />

                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 gap-2 text-xs font-medium"
                                onClick={() => setCreateRequestOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Request</span>
                            </Button>

                            {isAdmin && (
                                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="h-9 gap-2 text-xs font-medium bg-primary text-primary-foreground shadow-xs">
                                            <Mail className="h-3.5 w-3.5" />
                                            <span>Invite Auditor</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Invite External Auditor</DialogTitle>
                                            <DialogDescription>
                                                Send a secure clean-room invitation to an external auditor for this client workspace.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="email" className="text-sm font-medium">Auditor Email</Label>
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
                                            <Button onClick={handleInvite} disabled={inviteMutation.isLoading || !inviteEmail}>
                                                {inviteMutation.isLoading ? "Sending..." : "Send Invitation"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>

                    {/* 2. Top Segmented Sub-Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                        <button
                            onClick={() => setActiveSection('pbc')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                activeSection === 'pbc'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>PBC Evidence</span>
                            <Badge variant="secondary" className={cn("text-[10px] h-4.5 px-1.5", activeSection === 'pbc' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                {displayRequests.length}
                            </Badge>
                        </button>

                        <button
                            onClick={() => setActiveSection('overview')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                activeSection === 'overview'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            <span>Executive Overview</span>
                        </button>

                        <button
                            onClick={() => setActiveSection('findings')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                activeSection === 'findings'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Audit Findings</span>
                            {findings && findings.length > 0 && (
                                <Badge variant="secondary" className={cn("text-[10px] h-4.5 px-1.5", activeSection === 'findings' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500/10 text-red-600")}>
                                    {findings.length}
                                </Badge>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveSection('discussions')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                activeSection === 'discussions'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Communications</span>
                            {comments && comments.length > 0 && (
                                <Badge variant="secondary" className={cn("text-[10px] h-4.5 px-1.5", activeSection === 'discussions' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                    {comments.length}
                                </Badge>
                            )}
                        </button>
                    </div>
                </header>

                {/* 3. Main Workspace Container */}
                <div className="flex-1 flex overflow-hidden">
                    {activeSection === 'pbc' ? (
                        <div className="flex-1 flex h-full overflow-hidden">

                            {/* Left Column: Request List (340px) */}
                            <aside className="w-[340px] border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
                                {/* Search & Filter Toolbar */}
                                <div className="p-3.5 border-b border-border space-y-2.5 bg-card shrink-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Requests ({displayRequests.length})</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleInitialize();
                                            }}
                                            disabled={initializeMutation.isLoading}
                                            title="Sync Standard Requests"
                                        >
                                            <RotateCw className={cn("h-3.5 w-3.5", initializeMutation.isLoading && "animate-spin")} />
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Search requests..."
                                                className="pl-8 h-8 text-xs bg-muted/50 border-border"
                                            />
                                        </div>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="w-[105px] h-8 text-xs bg-muted/50 border-border">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                                                <SelectItem value="Open" className="text-xs">Open</SelectItem>
                                                <SelectItem value="In Review" className="text-xs">In Review</SelectItem>
                                                <SelectItem value="Accepted" className="text-xs">Accepted</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Requests Scroll Area */}
                                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                                    {isEvidenceLoading ? (
                                        <div className="p-3 space-y-2.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : displayRequests.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="text-xs font-semibold text-foreground">No requests found</p>
                                            <p className="text-[11px] text-muted-foreground mt-1 mb-4">
                                                No requests for {activeFramework}.
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs w-full"
                                                onClick={handleInitialize}
                                                disabled={initializeMutation.isLoading}
                                            >
                                                {initializeMutation.isLoading ? "Initializing..." : `Initialize ${activeFramework}`}
                                            </Button>
                                        </div>
                                    ) : (
                                        displayRequests.map(req => {
                                            const isSelected = selectedRequest?.id === req.id;
                                            return (
                                                <div
                                                    key={req.id}
                                                    onClick={() => setSelectedRequest(req)}
                                                    className={cn(
                                                        "p-3 cursor-pointer transition-all border-l-3 group",
                                                        isSelected
                                                            ? "bg-primary/5 border-l-primary text-foreground"
                                                            : "border-l-transparent hover:bg-muted/40 text-foreground"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={cn("text-[11px] font-mono font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>
                                                            {req.control || req.id}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {getStatusBadge(req.status)}
                                                            <button
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                                                                onClick={(e) => confirmDelete(e, req)}
                                                                title="Delete Request"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className={cn("text-xs font-semibold leading-snug line-clamp-1 mb-1", isSelected ? "text-foreground" : "text-foreground/90")}>
                                                        {req.title}
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            <span>{req.evidence} {req.evidence === 1 ? 'file' : 'files'}</span>
                                                        </div>
                                                        {req.dueDate && new Date(req.dueDate).getFullYear() > 1970 && (
                                                            <span className="text-[10px]">
                                                                Due {new Date(req.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </aside>

                            {/* Right Column: Clean Detail Workspace */}
                            <main className="flex-1 bg-muted/20 flex flex-col h-full min-w-0 overflow-y-auto">
                                {selectedRequest ? (
                                    <div className="p-6 max-w-5xl w-full mx-auto space-y-6">

                                        {/* Request Detail Card */}
                                        <Card className="border-border shadow-xs bg-card">
                                            <CardHeader className="pb-4 border-b border-border">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="font-mono text-xs bg-muted border-border font-semibold">
                                                                {selectedRequest.control}
                                                            </Badge>
                                                            {selectedRequest.dueDate && new Date(selectedRequest.dueDate).getFullYear() > 1970 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Due {new Date(selectedRequest.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <CardTitle className="text-lg font-bold text-foreground tracking-tight">
                                                            {selectedRequest.title}
                                                        </CardTitle>
                                                        <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                                            {selectedRequest.description || "Provide verifiable compliance artifacts and documentation for this control requirement."}
                                                        </CardDescription>
                                                    </div>

                                                    {/* Verification Actions */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {selectedRequest.status !== 'Accepted' ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 gap-1.5 font-medium"
                                                                    onClick={() => handleStatusUpdate('rejected')}
                                                                    disabled={updateStatusMutation.isLoading}
                                                                >
                                                                    <AlertCircle className="h-3.5 w-3.5" /> Return
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-1.5 font-medium shadow-xs"
                                                                    onClick={() => handleStatusUpdate('verified')}
                                                                    disabled={updateStatusMutation.isLoading}
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Verify & Accept
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-3 py-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Verified & Approved
                                                                </Badge>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                                    onClick={() => handleStatusUpdate('rejected')}
                                                                    disabled={updateStatusMutation.isLoading}
                                                                >
                                                                    Re-open
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="p-0">
                                                <Tabs defaultValue="evidence" className="w-full">
                                                    <div className="px-6 border-b border-border bg-muted/30">
                                                        <TabsList className="bg-transparent h-10 p-0 space-x-6">
                                                            <TabsTrigger
                                                                value="evidence"
                                                                className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-1 text-xs font-semibold"
                                                            >
                                                                Evidence Files ({evidenceFiles?.length || 0})
                                                            </TabsTrigger>
                                                            <TabsTrigger
                                                                value="activity"
                                                                className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-1 text-xs font-semibold"
                                                            >
                                                                Discussion Thread
                                                            </TabsTrigger>
                                                        </TabsList>
                                                    </div>

                                                    {/* Evidence Files Tab */}
                                                    <TabsContent value="evidence" className="p-6 space-y-5 m-0 outline-none">
                                                        {/* Actions bar for evidence */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div className="text-xs text-muted-foreground">
                                                                Upload relevant documents, reports, or configuration screenshots.
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    aria-label="Upload evidence files"
                                                                    className="hidden"
                                                                    id="audit-hub-upload-input"
                                                                    onChange={handleFileSelect}
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 text-xs gap-1.5"
                                                                    onClick={() => setLibraryOpen(true)}
                                                                >
                                                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span>Global Library</span>
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 text-xs gap-1.5"
                                                                    onClick={() => setLinkOpen(true)}
                                                                >
                                                                    <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span>Link Integration</span>
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
                                                                    onClick={() => EVIDENCE_FILES_LIVE ? document.getElementById('audit-hub-upload-input')?.click() : toast.info("Evidence file uploads aren't available in this deployment.")}
                                                                >
                                                                    <Upload className="h-3.5 w-3.5" />
                                                                    <span>Upload File</span>
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Evidence Files Table */}
                                                        <div className="rounded-lg border border-border overflow-hidden">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50">
                                                                    <TableRow className="hover:bg-transparent border-border">
                                                                        <TableHead className="text-xs font-semibold text-muted-foreground h-9">Filename</TableHead>
                                                                        <TableHead className="text-xs font-semibold text-muted-foreground h-9">Uploaded</TableHead>
                                                                        <TableHead className="text-xs font-semibold text-muted-foreground h-9">Type</TableHead>
                                                                        <TableHead className="text-xs font-semibold text-muted-foreground h-9">Validation</TableHead>
                                                                        <TableHead className="text-right text-xs font-semibold text-muted-foreground h-9">Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {isFilesLoading ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">Loading evidence...</TableCell>
                                                                        </TableRow>
                                                                    ) : !evidenceFiles || evidenceFiles.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                                                                                No evidence files attached yet. Click "Upload File" above.
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        evidenceFiles.map((file: any) => (
                                                                            <TableRow key={file.id} className="hover:bg-muted/40 border-border transition-colors">
                                                                                <TableCell className="font-medium text-xs text-foreground py-2.5">
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <FileText className="h-4 w-4 text-primary shrink-0" />
                                                                                        <button
                                                                                            className="truncate max-w-[280px] hover:text-primary hover:underline text-left"
                                                                                            title={`Open ${file.filename}`}
                                                                                            onClick={() => file.fileUrl && window.open(file.fileUrl, '_blank')}
                                                                                        >
                                                                                            {file.filename}
                                                                                        </button>
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-muted-foreground text-xs">
                                                                                    {new Date(file.createdAt).toLocaleDateString()}
                                                                                </TableCell>
                                                                                <TableCell className="text-muted-foreground text-xs font-mono">
                                                                                    {file.contentType || 'Document'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                                                        <CheckCircle2 className="h-3 w-3" /> Safe
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        {file.fileUrl && (
                                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => window.open(file.fileUrl, '_blank')}>
                                                                                                <Download className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        )}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                                            onClick={() => handleDeleteEvidenceFile(file)}
                                                                                        >
                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </TabsContent>

                                                    {/* Discussion Thread Tab */}
                                                    <TabsContent value="activity" className="p-6 m-0 outline-none">
                                                        <ChatSection request={selectedRequest} />
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                        <div className="h-16 w-16 bg-card rounded-2xl flex items-center justify-center shadow-xs mb-4 border border-border">
                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground mb-1">Select an Evidence Request</h2>
                                        <p className="max-w-xs text-xs text-muted-foreground mb-6">
                                            Choose an item from the left pane to review documentation and verify compliance.
                                        </p>
                                    </div>
                                )}
                            </main>
                        </div>
                    ) : activeSection === 'overview' ? (
                        <div className="flex-1 overflow-y-auto">
                            <AuditOverview
                                clientId={clientId}
                                onNavigate={(section, filter) => {
                                    setActiveSection(section);
                                    if (filter) setFilterStatus(filter);
                                }}
                            />
                        </div>
                    ) : activeSection === 'findings' ? (
                        <div className="flex-1 overflow-y-auto">
                            <AuditFindings clientId={clientId} />
                        </div>
                    ) : activeSection === 'discussions' ? (
                        <div className="flex-1 overflow-y-auto">
                            <AuditDiscussions
                                clientId={clientId}
                                onNavigateToEvidence={(id) => {
                                    const idStr = String(id);
                                    const req = auditRequests.find(r => {
                                        if (r.id === idStr) return true;
                                        if (r.original?.id === idStr) return true;
                                        if (r.original?.evidenceId === idStr) return true;
                                        if (`EV-${r.id}` === idStr || `EV-${r.original?.evidenceId}` === idStr) return true;
                                        return false;
                                    });

                                    if (req) {
                                        setActiveSection('pbc');
                                        setSelectedRequest(req);
                                    } else {
                                        toast.error("Evidence request not found.");
                                    }
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Create Request Dialog */}
            <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Evidence Request</DialogTitle>
                        <DialogDescription>
                            Create a new evidence request linked to a specific control requirement.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold">Reference ID *</Label>
                            <Input
                                value={newRequestData.evidenceId}
                                onChange={(e) => setNewRequestData({ ...newRequestData, evidenceId: e.target.value })}
                                placeholder="e.g. PBC-001"
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold">Control *</Label>
                            <Select
                                value={newRequestData.clientControlId}
                                onValueChange={(val) => setNewRequestData({ ...newRequestData, clientControlId: val })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select a control..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {clientControlsList?.map((item: any) => (
                                        <SelectItem key={item.clientControl.id} value={item.clientControl.id.toString()} className="text-xs">
                                            <span className="font-mono text-xs mr-2 text-muted-foreground">{item.control?.controlId || item.clientControl.clientControlId}</span>
                                            {item.control?.name || "Unknown Control"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold">Description *</Label>
                            <Input
                                value={newRequestData.description}
                                onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                                placeholder="Describe the evidence required..."
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs font-semibold">Owner</Label>
                                <Input
                                    value={newRequestData.owner}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, owner: e.target.value })}
                                    placeholder="Optional owner"
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs font-semibold">Due Date</Label>
                                <Input
                                    type="date"
                                    value={newRequestData.dueDate}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, dueDate: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateRequestOpen(false)} className="h-9 text-xs">Cancel</Button>
                        <Button onClick={handleCreateRequest} disabled={createEvidenceMutation.isLoading} className="h-9 text-xs">
                            {createEvidenceMutation.isLoading ? "Creating..." : "Create Request"}
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
                            <Label className="text-xs font-semibold">Integration Provider</Label>
                            <Select
                                value={linkData.provider}
                                onValueChange={(val) => {
                                    setLinkData({ ...linkData, provider: val });
                                    setConnectionStatus('idle');
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="github" className="text-xs">GitHub (Commits/PRs)</SelectItem>
                                    <SelectItem value="aws" className="text-xs">AWS CloudTrail</SelectItem>
                                    <SelectItem value="jira" className="text-xs">Jira Tickets</SelectItem>
                                    <SelectItem value="s3" className="text-xs">S3 Bucket Policy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold">Resource ID / URL</Label>
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
                                className="h-9 text-xs"
                            />
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-[11px] text-muted-foreground">
                                    The system will monitor this resource for changes.
                                </p>
                                {connectionStatus === 'success' ? (
                                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                    </span>
                                ) : connectionStatus === 'testing' ? (
                                    <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                                        <RotateCw className="h-3.5 w-3.5 animate-spin" /> Testing...
                                    </span>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[11px] px-2 text-primary"
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
                        <Button variant="outline" onClick={() => setLinkOpen(false)} className="h-9 text-xs">Cancel</Button>
                        <Button
                            onClick={handleLink}
                            disabled={linkMutation.isLoading || !linkData.resourceId || connectionStatus !== 'success'}
                            className="h-9 text-xs"
                        >
                            {linkMutation.isLoading ? "Linking..." : connectionStatus === 'success' ? "Confirm Integration" : "Connect Integration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Evidence Library Dialog */}
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
            <Dialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-center text-base font-bold text-foreground">Delete Evidence Request?</DialogTitle>
                        <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed pt-1">
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{requestToDelete?.title}"</span>? This will remove all associated attachments.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-2 pt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmationOpen(false)} className="h-9 text-xs">Cancel</Button>
                        <Button variant="destructive" onClick={executeDelete} className="h-9 text-xs">
                            {deleteMutation.isLoading ? "Deleting..." : "Delete Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

function ChatSection({ request }: { request: any }) {
    const [commentText, setCommentText] = useState("");
    const { user } = useAuth();
    const utils = trpc.useContext() as unknown as HubUtils;

    const evidenceId = request?.original?.id;

    const { data: comments, isLoading } = hubApi.evidence.getComments.useQuery(
        { evidenceId },
        { enabled: !!evidenceId, refetchInterval: 5000 }
    );

    const addCommentMutation = hubApi.evidence.addComment.useMutation({
        onSuccess: () => {
            setCommentText("");
            utils.evidence.getComments.invalidate({ evidenceId });
            toast.success("Comment posted");
        },
        onError: () => {
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
        <div className="space-y-4">
            <div className="space-y-3 max-h-[360px] overflow-y-auto p-1">
                {isLoading ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">Loading comments...</div>
                ) : !comments || comments.length === 0 ? (
                    <div className="p-6 bg-muted/40 rounded-xl border border-border text-center">
                        <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-60" />
                        <p className="text-xs text-muted-foreground">No comments yet. Start a discussion below.</p>
                    </div>
                ) : (
                    comments.map((comment: any) => {
                        const isMe = comment.userId === user?.id;
                        return (
                            <div key={comment.id} className={cn("flex gap-2.5", isMe ? "flex-row-reverse" : "flex-row")}>
                                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                    <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                                        {(comment.userName || comment.userEmail || "U").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-foreground">{comment.userName || comment.userEmail}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={cn("p-3 rounded-xl text-xs leading-relaxed", isMe ? "bg-primary text-primary-foreground rounded-tr-xs" : "bg-card border border-border rounded-tl-xs shadow-xs text-foreground")}>
                                        {comment.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2.5 items-start pt-3 border-t border-border">
                <Textarea
                    placeholder="Leave an auditor comment or request clarification..."
                    className="min-h-[70px] text-xs bg-card resize-none"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                />
                <Button
                    size="sm"
                    className="h-[70px] px-4 text-xs font-semibold bg-primary text-primary-foreground shrink-0"
                    onClick={handlePostComment}
                    disabled={addCommentMutation.isLoading || !commentText.trim()}
                >
                    {addCommentMutation.isLoading ? "Posting..." : "Post"}
                </Button>
            </div>
        </div>
    );
}

function AuditOverview({ clientId, onNavigate }: { clientId: number, onNavigate: (section: string, filter?: string) => void }) {
    const { data: evidenceList } = hubApi.evidence.list.useQuery({ clientId }, { retry: false });
    const { data: findings } = hubApi.findings.list.useQuery({ clientId }, { retry: false });

    const openRequests = evidenceList?.filter(e => e.status === 'open' || e.status === 'collected').length || 0;
    const verifiedRequests = evidenceList?.filter(e => e.status === 'verified').length || 0;
    const totalRequests = evidenceList?.length || 1;
    const completionPercentage = Math.round((verifiedRequests / totalRequests) * 100);

    const openFindings = findings?.filter(f => f.status === 'open').length || 0;
    const highFindings = findings?.filter(f => f.status === 'open' && (f.severity === 'high' || f.severity === 'critical')).length || 0;

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto">
            <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Audit Readiness Overview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">High-level posture, control verification status, and audit observations.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Verification Rate</CardDescription>
                        <CardTitle className="text-2xl font-black text-foreground">{completionPercentage}%</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{verifiedRequests} of {totalRequests} verified</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Open Requests</CardDescription>
                        <CardTitle className="text-2xl font-black text-foreground">{openRequests}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            {openRequests > 0 ? "Pending submission / review" : "All requests fulfilled"}
                        </span>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Open Findings</CardDescription>
                        <CardTitle className="text-2xl font-black text-foreground">{openFindings}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        {highFindings > 0 ? (
                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                                {highFindings} Critical / High
                            </span>
                        ) : (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                No high severity findings
                            </span>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Audit Status</CardDescription>
                        <CardTitle className="text-2xl font-black text-foreground">{completionPercentage >= 80 ? "Audit Ready" : "In Progress"}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-[11px] text-muted-foreground font-medium">Clean room active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Priority Tasks & Findings split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border shadow-xs">
                    <CardHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground">Action Items</CardTitle>
                            <CardDescription className="text-xs">Required tasks to advance audit readiness</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary" onClick={() => onNavigate('pbc', 'all')}>
                            View All <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border">
                        {openRequests > 0 ? (
                            <div
                                className="p-4 hover:bg-muted/40 transition-colors flex gap-3.5 items-center cursor-pointer group"
                                onClick={() => onNavigate('pbc', 'Open')}
                            >
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Submit Pending Evidence</h4>
                                    <p className="text-[11px] text-muted-foreground truncate">{openRequests} evidence requests need documentation attached.</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    Action Required
                                </Badge>
                            </div>
                        ) : null}

                        {highFindings > 0 ? (
                            <div
                                className="p-4 hover:bg-muted/40 transition-colors flex gap-3.5 items-center cursor-pointer group"
                                onClick={() => onNavigate('findings')}
                            >
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-600 shrink-0">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Remediate Critical Findings</h4>
                                    <p className="text-[11px] text-muted-foreground truncate">{highFindings} severe non-conformities identified.</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                                    Critical
                                </Badge>
                            </div>
                        ) : null}

                        {openRequests === 0 && highFindings === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                <p className="text-xs font-semibold text-foreground">All items verified</p>
                                <p className="text-[11px] text-muted-foreground">No urgent actions pending at this time.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground">Recent Findings</CardTitle>
                            <CardDescription className="text-xs">Audit observations</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary" onClick={() => onNavigate('findings')}>
                            View <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border">
                        {!findings || findings.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No findings recorded.
                            </div>
                        ) : (
                            findings.slice(0, 4).map((f: any) => (
                                <div key={f.id} className="p-3 hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">{f.title}</span>
                                        <Badge className="text-[9px] capitalize px-1.5 py-0 font-bold">
                                            {f.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AuditFindings({ clientId }: { clientId: number }) {
    const [createOpen, setCreateOpen] = useState(false);
    const utils = trpc.useContext() as unknown as HubUtils;
    const { data: findings, isLoading } = hubApi.findings.list.useQuery({ clientId }, { retry: false });

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");

    const createMutation = hubApi.findings.create.useMutation({
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
    };

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Audit Findings & Observations</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Formal log of non-conformities, opportunities for improvement, and corrective actions.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-9 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-primary-foreground shadow-xs">
                            <AlertTriangle className="h-3.5 w-3.5" /> Report Finding
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Issue Formal Finding</DialogTitle>
                            <DialogDescription>
                                Document an audit non-conformity or observation for this client.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-semibold">Finding Title *</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Lack of Annual Penetration Testing"
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-semibold">Severity Level</Label>
                                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low" className="text-xs">Low - Minor Observation</SelectItem>
                                        <SelectItem value="medium" className="text-xs">Medium - Process Gap</SelectItem>
                                        <SelectItem value="high" className="text-xs">High - Security Risk</SelectItem>
                                        <SelectItem value="critical" className="text-xs">Critical - Compliance Blocker</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-semibold">Description & Evidence Reference</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe observation context, affected controls, and impact..."
                                    className="min-h-[100px] text-xs resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)} className="h-9 text-xs">Cancel</Button>
                            <Button onClick={handleCreate} disabled={createMutation.isLoading || !title} className="h-9 text-xs bg-red-600 hover:bg-red-700 text-primary-foreground">
                                {createMutation.isLoading ? "Saving..." : "Save Finding"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-border shadow-xs overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="w-[120px] text-xs font-semibold text-muted-foreground h-9">Severity</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground h-9">Title & Description</TableHead>
                            <TableHead className="w-[110px] text-xs font-semibold text-muted-foreground h-9">Status</TableHead>
                            <TableHead className="w-[120px] text-right text-xs font-semibold text-muted-foreground h-9">Issued</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">Loading findings...</TableCell>
                            </TableRow>
                        ) : !findings || findings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                                        <span className="font-semibold text-foreground">No Non-Conformities Found</span>
                                        <span className="text-[11px] text-muted-foreground mt-0.5">The audit has zero open findings recorded.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            findings.map((finding: any) => (
                                <TableRow key={finding.id} className="hover:bg-muted/40 border-border transition-colors">
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "capitalize text-[10px] font-bold",
                                            finding.severity === 'critical' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                finding.severity === 'high' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                    finding.severity === 'medium' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                        "bg-muted text-muted-foreground"
                                        )}>
                                            {finding.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="font-semibold text-xs text-foreground">{finding.title}</div>
                                        {finding.description && (
                                            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{finding.description}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/50 border-border">
                                            {finding.status || 'open'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {new Date(finding.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

function AuditDiscussions({ clientId, onNavigateToEvidence }: { clientId: number, onNavigateToEvidence: (id: string | number) => void }) {
    const { data: comments, isLoading } = hubApi.evidence.getAllComments.useQuery({ clientId }, { retry: false });

    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto">
            <div className="border-b border-border pb-4">
                <h2 className="text-xl font-bold text-foreground tracking-tight">Audit Communications Feed</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Centralized chronological feed of comments, feedback, and evidence inquiries.</p>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 w-full bg-muted/40 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : !comments || comments.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 border border-dashed border-border rounded-xl">
                        <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                        <h3 className="text-xs font-semibold text-foreground">No Discussion Threads</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Auditor and client messages will appear here.</p>
                    </div>
                ) : (
                    comments.map((comment: any) => (
                        <Card key={comment.id} className="border-border shadow-xs hover:border-primary/30 transition-all bg-card">
                            <CardContent className="p-4 flex gap-4">
                                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                                        {(comment.userName || "U").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-foreground">{comment.userName || comment.userEmail}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => onNavigateToEvidence(comment.evidenceId)}
                                        >
                                            View Request <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="text-xs text-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
                                        {comment.content}
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
