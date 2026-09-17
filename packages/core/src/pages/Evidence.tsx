import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { StatCard } from "@complianceos/ui/ui/StatCard";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { PageHeader } from "@complianceos/ui/ui/PageHeader";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Paperclip, Upload, X, Search, ChevronRight, Filter, Info, AlertCircle, Clock, Shield, User, BarChart3, Download, BookOpen, LayoutGrid, Pencil } from "lucide-react";
import EvidenceFileUpload from "@/components/EvidenceFileUpload";
import EvidenceAnalysisButton from "@/components/EvidenceAnalysisButton";
import CollectorConnectionsPanel from "@/components/evidence/CollectorConnectionsPanel";
import EvidenceRenewalPanel from "@/pages/EvidenceRenewalPanel";
import EvidenceRepositoryPanels from "@/pages/EvidenceRepositoryPanels";
import { GoogleDriveFileBrowser } from "@/components/integrations/GoogleDriveFileBrowser";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@complianceos/ui/ui/accordion";
import { Badge } from "@complianceos/ui/ui/badge";
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
import { Separator } from "@complianceos/ui/ui/separator";
import { authedFetch } from "@/lib/authedFetch";

/**
 * Local typed contract layer for the file-attach flow (UI-STANDARD §16):
 * the page talks to evidenceFiles only through this surface, never via
 * direct router access. Mirrors server/routers/evidenceFiles.ts
 * create input exactly ({ evidenceId, filename, fileKey, url,
 * originalFilename?, mimeType?, size? }; url/mimeType/size map onto the
 * fileUrl/contentType/fileSize columns server-side).
 */
interface EvidenceFileCreateInput {
    evidenceId: number;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    fileKey: string;
    url: string;
}

// NOTE: react-query v5 ignores per-mutation callbacks passed to useMutation;
// the signature keeps accepting them because the existing page code passes
// them and they are inert no-ops at runtime (behaviour preserved).
interface TypedMutation<TInput> {
    useMutation: (opts?: {
        onSuccess?: () => void;
        onError?: (error: { message: string }) => void;
    }) => {
        mutate: (input: TInput) => void;
        mutateAsync: (input: TInput) => Promise<unknown>;
        isPending: boolean;
    };
}

interface EvidenceApi {
    evidenceFiles: {
        create: TypedMutation<EvidenceFileCreateInput>;
    };
}

const evidenceApi = trpc as unknown as EvidenceApi;

/** Capability flag: evidenceFiles router is mounted on the AppRouter as of cycle 35. */
const EVIDENCE_FILES_LIVE = true;

export default function Evidence() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('evidence');
  const clientId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<number | null>(null);
  const [viewingFiles, setViewingFiles] = useState<number | null>(null);
  const [googleDriveBrowserOpen, setGoogleDriveBrowserOpen] = useState<boolean>(false);
  const [selectedClientControlId, setSelectedClientControlId] = useState<string>("");
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [selectedRaci, setSelectedRaci] = useState<string>("R");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<any>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("NIST 800-53");

  const { data: client } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: clientId > 0 }
  );
  const { data: evidenceList, isLoading, refetch } = trpc.evidence.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: clientControls } = trpc.clientControls.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: employees } = trpc.employees.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const { data: frameworkMappings } = trpc.compliance.frameworkMappings.list.useQuery(
    {},
    { enabled: clientId > 0 }
  );

  const createMutation = trpc.evidence.create.useMutation();
  const createFileMutation = evidenceApi.evidenceFiles.create.useMutation({
    onSuccess: () => {
      toast.success("File attached");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const packMutation = trpc.evidence.pack.useMutation();
  const checkExpirationsMutation = trpc.evidence.checkExpirations.useMutation();

  const updateMutation = trpc.evidence.update.useMutation({
    onSuccess: () => {
      toast.success("Evidence updated");
      setEditingEvidence(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.evidence.delete.useMutation({
    onSuccess: () => {
      toast.success("Evidence removed");
      setEvidenceToDelete(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Categorization and Filtering Logic
  const groupedData = useMemo(() => {
    console.log("[DEBUG] groupedData memo recalculating. Dependencies:", {
      clientControls: !!clientControls,
      evidenceList: !!evidenceList,
      frameworkMappings: !!frameworkMappings,
      searchQuery,
      statusFilter,
      frameworkFilter
    });

    if (!clientControls || !evidenceList) {
      console.log("[DEBUG] evidenceList or clientControls missing, skipping memo logic");
      return [];
    }

    try {
      // Build mapping graph for faster lookups
      const mappingGraph = new Map<number, Set<number>>();
      if (frameworkMappings) {
        console.log("[DEBUG] Building mapping graph from", frameworkMappings.length, "mappings");
        frameworkMappings.forEach(mapping => {
          const s = mapping.sourceControlId;
          const t = mapping.targetControlId;
          if (!mappingGraph.has(s)) mappingGraph.set(s, new Set());
          if (!mappingGraph.has(t)) mappingGraph.set(t, new Set());
          mappingGraph.get(s)!.add(t);
          mappingGraph.get(t)!.add(s);
        });
      }

      const findEquivalentControlIds = (controlId: number) => {
        const equivalents = new Set<number>([controlId]);
        const queue = [controlId];
        const visited = new Set<number>([controlId]);

        while (queue.length > 0) {
          const current = queue.shift()!;
          const neighbors = mappingGraph.get(current);
          if (neighbors) {
            for (const neighbor of neighbors) {
              if (!visited.has(neighbor)) {
                visited.add(neighbor);
                equivalents.add(neighbor);
                queue.push(neighbor);
              }
            }
          }
        }
        return equivalents;
      };

      let filtered = clientControls.map(cc => {
        const masterControlId = cc.control?.id;
        if (!masterControlId) return { ...cc, evidence: [] };

        // Find all equivalent master control IDs
        const equivalentIds = findEquivalentControlIds(masterControlId);

        // Collect all evidence items from ANY equivalent control
        const evidence = evidenceList.filter(e => {
          const evidenceMasterControlId = e.control?.id;
          return evidenceMasterControlId && equivalentIds.has(evidenceMasterControlId);
        }).map(e => ({
          evidence: e, // Wrap to match UI expectations
          isInherited: e.control?.id !== masterControlId,
          sourceFramework: e.control?.framework,
          sourceControlId: e.control?.controlId
        }));

        return {
          ...cc,
          evidence
        };
      });

      console.log("[DEBUG] Filtered controls count:", filtered.length);

      // Apply Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
          item.control?.name?.toLowerCase().includes(query) ||
          item.clientControl.clientControlId?.toLowerCase().includes(query) ||
          item.control?.description?.toLowerCase().includes(query)
        );
      }

      // Apply Filters
      if (statusFilter !== "all") {
        filtered = filtered.filter(item => {
          if (statusFilter === "need_documents") return item.evidence.length === 0;
          if (statusFilter === "ok") return item.evidence.some(e => e.evidence.status === 'verified');
          return true;
        });
      }

      if (frameworkFilter !== "all") {
        filtered = filtered.filter(item => item.control?.framework === frameworkFilter);
      }

      const categories: Record<string, any> = {};

      filtered.forEach(item => {
        const category = item.control?.category || "Other";
        const grouping = item.control?.grouping || "General";

        if (!categories[category]) {
          categories[category] = {
            name: category,
            subgroups: {},
            totalItems: 0,
            okItems: 0
          };
        }

        if (!categories[category].subgroups[grouping]) {
          categories[category].subgroups[grouping] = {
            name: grouping,
            items: []
          };
        }

        categories[category].subgroups[grouping].items.push(item);
        categories[category].totalItems++;
        if (item.evidence.some(e => e.evidence.status === 'verified')) {
          categories[category].okItems++;
        }
      });

      return Object.values(categories).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("[DEBUG] Error in groupedData memo:", err);
      return [];
    }
  }, [clientControls, evidenceList, frameworkMappings, searchQuery, statusFilter, frameworkFilter]);

  const uniqueFrameworks = useMemo(() => {
    if (!clientControls) return [];
    return Array.from(new Set(clientControls.map(cc => cc.control?.framework).filter(Boolean)));
  }, [clientControls]);

  const getNextEvidenceId = () => {
    if (!evidenceList || evidenceList.length === 0) return "EVD-001";
    const maxNum = Math.max(...evidenceList.map(e => {
      const match = (e.evidenceId as string)?.match(/EVD-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }));
    return `EVD-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientControlId) {
      toast.error("Please select a control");
      return;
    }

    setIsUploading(true);
    const formData = new FormData(e.currentTarget);

    let ownerName = selectedOwner;
    if (selectedOwner && employees) {
      const emp = employees.find(e => e.id.toString() === selectedOwner);
      if (emp) {
        ownerName = `${emp.firstName} ${emp.lastName}`;
      }
    }

    try {
      const evidence = await createMutation.mutateAsync({
        clientId,
        clientControlId: parseInt(selectedClientControlId),
        evidenceId: formData.get("evidenceId") as string,
        description: formData.get("description") as string,
        type: formData.get("type") as string,
        location: formData.get("location") as string,
        owner: ownerName || (formData.get("owner") as string),
        status: formData.get("status") as "pending" | "verified" | "expired" | "not_applicable",
        intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : 365,
        expirationDate: formData.get("expirationDate") ? new Date(formData.get("expirationDate") as string) : undefined,
      });

      if (!EVIDENCE_FILES_LIVE && selectedFiles.length > 0) {
        toast.info("Evidence file uploads aren't available in this deployment.");
        setSelectedFiles([]);
      }
      if (selectedFiles.length > 0 && evidence?.id) {
        for (const file of selectedFiles) {
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                const extension = file.name.split('.').pop() || '';
                const generatedFilename = `evidence-${evidence.id}-${timestamp}-${randomSuffix}.${extension}`;

                const res = await authedFetch('/api/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    filename: generatedFilename,
                    data: base64,
                    contentType: file.type,
                    folder: 'evidence'
                  })
                });

                if (!res.ok) throw new Error("Upload failed");
                const { key, url } = await res.json();

                await createFileMutation.mutateAsync({
                  evidenceId: evidence.id,
                  filename: generatedFilename,
                  originalFilename: file.name,
                  mimeType: file.type,
                  size: file.size,
                  fileKey: key,
                  url: url,
                });
                resolve();
              } catch (err) { reject(err); }
            };
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
          });
        }
      }

      toast.success("Evidence added successfully");
      setIsAddOpen(false);
      setSelectedFiles([]);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create evidence");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>, evidenceId: number) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: evidenceId,
      evidenceId: formData.get("evidenceId") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as string,
      location: formData.get("location") as string,
      owner: formData.get("owner") as string,
      status: formData.get("status") as "pending" | "verified" | "expired" | "not_applicable",
      intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : 365,
      expirationDate: formData.get("expirationDate") ? new Date(formData.get("expirationDate") as string) : undefined,
    });
  };

  const handleDelete = (evidence: any) => {
    setEvidenceToDelete(evidence);
  };

  const confirmDelete = () => {
    if (evidenceToDelete) {
      deleteMutation.mutate({ id: evidenceToDelete.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/clients/${clientId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Button>
          <Breadcrumb
            items={[
              { label: client?.name || "Client", href: `/clients/${clientId}` },
              { label: "Evidence & Documents" },
            ]}
          />
        </div>

        {/* Standard Page Header */}
        <PageHeader
          title="Evidence & Documents"
          subtitle={`${client?.name || "Client"} • Continuous Evidence Collection, Verification & Audit Readiness`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PageGuide
                title="Evidence Command Center"
                description="Manage your compliance implementation through structured evidence collection."
                rationale="An auditor doesn't take your word for it—they need proof. This screen allows you to map documents (SOPs, screenshots, logs) to specific master controls, proving your security posture."
                howToUse={[
                  {
                    step: "Framework Selection",
                    description: "Filter by framework (e.g., NIST 800-53) to see which controls are missing evidence.",
                    targetId: "evidence-framework-selector"
                  },
                  {
                    step: "Search Controls",
                    description: "Quickly find a specific control by its ID or keyword to review its existing evidence.",
                    targetId: "evidence-search"
                  },
                  {
                    step: "Upload Documents",
                    description: "Click 'Add document' to link a new piece of evidence to a control. You can upload files or link external URLs.",
                    targetId: "evidence-add-document"
                  },
                  {
                    step: "Monitor Status",
                    description: "Track 'Verified OK' vs 'Missing Docs' to see where remediation resources are needed most.",
                    targetId: "evidence-stats-summary"
                  },
                  {
                    step: "Bulk Export",
                    description: "Use the 'Export all' button to generate a ZIP file of all evidence for your auditor.",
                    targetId: "evidence-export-all"
                  }
                ]}
                scenarios={[
                  {
                    title: "Preparing for Stage 2 Audit",
                    example: "The auditor is arriving tomorrow and you need to ensure every 'Implemented' control has a 'Verified' document.",
                    auditTip: "Set the Status filter to 'Needs Documents'. This will highlight the 'Empty' controls. Every control marked as 'Implemented' in Phase 1 MUST have at least one verified document in Phase 2."
                  },
                  {
                    title: "Handling Multi-Framework Audits",
                    example: "You are being audited for both SOC 2 and ISO 27001 at the same time.",
                    auditTip: "Use the 'Framework Filter'. ComplianceOS uses 'Evidence Inheritance'—if you upload a password policy for SOC 2, it automatically maps to the equivalent ISO 27001 control to save you dual-work."
                  }
                ]}
              />

              <Button 
                id="evidence-export-all" 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  const promise = packMutation.mutateAsync({ clientId, framework: frameworkFilter === 'all' ? undefined : frameworkFilter });
                  toast.promise(promise, {
                    loading: 'Generating Sealed Evidence Pack...',
                    success: (data: any) => {
                      window.open(data.url, '_blank');
                      return 'Evidence Pack generated and SHA-256 verified.';
                    },
                    error: 'Failed to generate pack'
                  });
                }}
              >
                <Shield className="mr-2 h-4 w-4" /> Sealed Pack
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-900/50 dark:text-amber-300 dark:bg-amber-950/30"
                onClick={() => {
                  const promise = checkExpirationsMutation.mutateAsync({ clientId });
                  toast.promise(promise, {
                    loading: 'Re-verifying evidence staleness...',
                    success: 'Continuous monitoring synchronized. Expired items updated.',
                    error: 'Failed to synchronize staleness'
                  });
                }}
              >
                <Clock className="mr-2 h-4 w-4" /> Sync Staleness
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${clientId}/evidence/overview`)}>
                <BookOpen className="mr-2 h-4 w-4" /> Usage Guide
              </Button>
              <EnhancedDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                trigger={
                  <Button size="sm" className="font-semibold gap-1.5" id="evidence-add-document">
                    <Plus className="h-4 w-4" /> Add Document
                  </Button>
                }
                title="Add Evidence"
                description="Track evidence for a control."
                footer={
                  <div className="flex justify-end gap-2 w-full">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const form = document.getElementById('add-evidence-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }}
                      disabled={createMutation.isPending || isUploading}
                    >
                      {createMutation.isPending || isUploading ? "Adding & Uploading..." : "Add Evidence"}
                    </Button>
                  </div>
                }
                size="lg"
              >
                <form id="add-evidence-form" onSubmit={handleCreate} onReset={() => {
                  setSelectedClientControlId("");
                  setSelectedOwner("");
                  setSelectedRaci("R");
                }}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Evidence ID</Label>
                        <Input name="evidenceId" defaultValue={getNextEvidenceId()} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Control *</Label>
                        <Select value={selectedClientControlId} onValueChange={setSelectedClientControlId}>
                          <SelectTrigger className={!selectedClientControlId ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select control" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {clientControls?.map((item) => (
                              <SelectItem key={item.clientControl.id} value={item.clientControl.id.toString()}>
                                {item.clientControl.clientControlId} - {item.control?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea name="description" placeholder="Describe the evidence..." className="min-h-[100px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select name="type" defaultValue="Document">
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Document">Document</SelectItem>
                            <SelectItem value="Screenshot">Screenshot</SelectItem>
                            <SelectItem value="Log">Log</SelectItem>
                            <SelectItem value="Report">Report</SelectItem>
                            <SelectItem value="Configuration">Configuration</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select name="status" defaultValue="pending">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="not_applicable">Not Applicable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                         <Label>Verification Interval (Days)</Label>
                         <Input name="intervalDays" type="number" defaultValue="365" />
                      </div>
                      <div className="grid gap-2">
                         <Label>Expiration Date (Optional)</Label>
                         <Input name="expirationDate" type="date" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Location</Label>
                      <Input name="location" placeholder="URL, file path, or system name..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Owner</Label>
                        <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id.toString()}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>RACI Role</Label>
                        <Select value={selectedRaci} onValueChange={setSelectedRaci}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R">Responsible</SelectItem>
                            <SelectItem value="A">Accountable</SelectItem>
                            <SelectItem value="C">Consulted</SelectItem>
                            <SelectItem value="I">Informed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2 mt-4">
                      <Label>Attachments</Label>
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/40 transition-colors cursor-pointer"
                        title={EVIDENCE_FILES_LIVE ? undefined : "Evidence file uploads aren't available in this deployment"}
                        onClick={() => EVIDENCE_FILES_LIVE ? document.getElementById('evidence-file-upload')?.click() : toast.info("Evidence file uploads aren't available in this deployment.")}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!EVIDENCE_FILES_LIVE) { toast.info("Evidence file uploads aren't available in this deployment."); } else if (e.dataTransfer.files) {
                            setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                          }
                        }}
                      >
                        <input id="evidence-file-upload" type="file" className="hidden" multiple onChange={(e) => {
                          if (!EVIDENCE_FILES_LIVE) { toast.info("Evidence file uploads aren't available in this deployment."); e.target.value = ""; } else if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }} />
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-foreground">Drag & drop files here, or click to select</p>
                        <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG, DOCX</p>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md border border-border text-sm">
                              <span className="truncate max-w-[200px] flex items-center gap-2">
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                {file.name}
                              </span>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </EnhancedDialog>
            </div>
          }
        />

        {/* Global Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="evidence-stats-summary">
          <StatCard
            label="Total Controls"
            value={groupedData.reduce((acc, cat) => acc + cat.totalItems, 0)}
            icon={BookOpen}
            tone="blue"
          />
          <StatCard
            label="Verified OK"
            value={groupedData.reduce((acc, cat) => acc + cat.okItems, 0)}
            icon={CheckCircle2}
            tone="green"
          />
          <StatCard
            label="Expired / Stale"
            value={evidenceList?.filter(e => e.status === 'expired').length || 0}
            icon={Clock}
            tone="red"
          />
          <StatCard
            label="Missing Docs"
            value={groupedData.reduce((acc, cat) => acc + (cat.totalItems - cat.okItems), 0)}
            icon={AlertCircle}
            tone="amber"
          />
          <StatCard
            label="Completion Rate"
            value={`${Math.round((groupedData.reduce((acc, cat) => acc + cat.okItems, 0) / (groupedData.reduce((acc, cat) => acc + cat.totalItems, 0) || 1)) * 100)}%`}
            icon={BarChart3}
            tone="brand"
          />
        </div>

        {/* Automated evidence sources (scorecard P0 #1 - collector connections) */}
        <CollectorConnectionsPanel clientId={clientId} />

        {/* Framework & Status Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs" id="evidence-framework-selector">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Framework:</span>
              <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                <SelectTrigger className="w-[240px] h-9">
                  <SelectValue placeholder="Select Framework..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2 font-medium">
                      <BarChart3 className="h-4 w-4 text-primary" /> All Frameworks (Consolidated)
                    </div>
                  </SelectItem>
                  <Separator className="my-1" />
                  {uniqueFrameworks.map(fw => (
                    <SelectItem key={fw} value={fw}>
                      {fw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-5 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
              <Select id="evidence-filter-status" value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All Documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="need_documents">Need Docs</SelectItem>
                  <SelectItem value="ok">Verified OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="evidence-search"
              placeholder="Search controls or evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Expiring & Renewal (evidenceRenewal.* endpoints; graceful fallback) */}
        <EvidenceRenewalPanel clientId={clientId} />

        {/* NIS2 Evidence Repository (evidenceRepository.* endpoints; graceful fallback) */}
        <EvidenceRepositoryPanels clientId={clientId} />

        {/* Main Content - Categories */}
        {
          isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : groupedData.length > 0 ? (
            <div className="space-y-6" id="evidence-domain-list">
              {groupedData.map((category) => (
                <div key={category.name} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
                      <div className={`h-2 w-2 rounded-full ${category.okItems === category.totalItems ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      {category.okItems} / {category.totalItems} OK
                    </div>
                  </div>

                  <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
                    <Accordion type="multiple" defaultValue={Object.keys(category.subgroups)} className="divide-y divide-border">
                      {Object.values(category.subgroups).map((subgroup: any) => (
                        <AccordionItem key={subgroup.name} value={subgroup.name} className="border-none">
                          <AccordionTrigger className="px-5 py-3.5 hover:no-underline hover:bg-muted/40 transition-all group border-b border-transparent data-[state=open]:border-border">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-muted group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary transition-colors">
                                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                </div>
                                <span className="font-semibold text-foreground tracking-tight">{subgroup.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {subgroup.items.some((i: any) => i.evidence.length === 0) && (
                                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold px-2 py-0.5 h-6 border-amber-200 dark:border-amber-800 border">
                                    {subgroup.items.filter((i: any) => i.evidence.length === 0).length} Action Required
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-muted-foreground font-medium px-2 py-0.5 h-6">
                                  {subgroup.items.length} Controls
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="border-t border-border bg-muted/20">
                              <Table>
                                <TableBody>
                                  {subgroup.items.map((item: any) => (
                                    <TableRow key={item.clientControl.id} className="hover:bg-card/80 group/row border-b border-border last:border-0 transition-colors">
                                      <TableCell className="w-16 text-center text-muted-foreground font-mono text-xs opacity-60 group-hover/row:opacity-100">
                                        {item.clientControl.clientControlId}
                                      </TableCell>
                                      <TableCell className="max-w-[320px]">
                                        <div className="font-medium text-foreground text-sm">{item.control?.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.control?.description}</div>
                                      </TableCell>
                                      <TableCell>
                                        {item.evidence.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {item.evidence.map((ev: any) => (
                                              <div key={ev.evidence.id} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 bg-card px-2.5 py-1 rounded-md border border-border text-xs shadow-2xs group/ev">
                                                  <span className="font-medium text-foreground">{ev.evidence.evidenceId}</span>
                                                  <span className={`h-1.5 w-1.5 rounded-full ${ev.evidence.status === 'verified' ? 'bg-emerald-500' :
                                                    ev.evidence.status === 'pending' ? 'bg-blue-500' :
                                                      ev.evidence.status === 'expired' ? 'bg-red-500' : 'bg-muted-foreground'
                                                    }`} />

                                                  {ev.isInherited && (
                                                    <Badge variant="outline" className="h-4 px-1 text-[10px] bg-muted/50 text-muted-foreground border-border font-normal">
                                                      Inherited
                                                    </Badge>
                                                  )}

                                                  <div className="flex items-center gap-1 ml-1 opacity-0 group-hover/ev:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={() => setEditingEvidence(ev.evidence.id)} title="Edit Evidence">
                                                      <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={() => setViewingFiles(ev.evidence.id)} title="View & Attach Files">
                                                      <Paperclip className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/80 hover:text-destructive" onClick={() => handleDelete(ev.evidence)} title="Delete Evidence">
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                                {ev.isInherited && (
                                                  <div className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1">
                                                    <Shield className="h-2.5 w-2.5" />
                                                    via {ev.sourceFramework} {ev.sourceControlId}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full border border-dashed border-border hover:bg-muted" onClick={() => {
                                              setSelectedClientControlId(item.clientControl.id.toString());
                                              setIsAddOpen(true);
                                            }} title="Add another document">
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                            <span>No evidence provided</span>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-primary font-medium hover:underline text-xs" onClick={() => {
                                              setSelectedClientControlId(item.clientControl.id.toString());
                                              setIsAddOpen(true);
                                            }}>
                                              Add document
                                            </Button>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="w-40">
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                          <User className="h-3 w-3" />
                                          <span className="truncate">{item.clientControl.owner || "Unassigned"}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="w-10 text-right">
                                        <EnhancedDialog
                                          open={viewingFiles === item.evidence[0]?.evidence.id}
                                          onOpenChange={(open) => !open && setViewingFiles(null)}
                                          trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></Button>}
                                          title="Control Details"
                                          size="lg"
                                        >
                                          <div className="space-y-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Framework</Label>
                                                <div className="font-medium mt-1">{item.control?.framework}</div>
                                              </div>
                                              <div>
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Frequency</Label>
                                                <div className="font-medium mt-1">{item.control?.frequency || "Continuous"}</div>
                                              </div>
                                            </div>
                                            <div>
                                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Implementation Guidance</Label>
                                              <p className="text-sm text-foreground/80 mt-1">{item.control?.implementationGuidance || "No guidance available"}</p>
                                            </div>
                                          </div>
                                        </EnhancedDialog>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No documents found"
              description="Try adjusting your search or filters to find what you're looking for."
              action={{ label: "Clear all filters", onClick: () => { setSearchQuery(""); setStatusFilter("all"); setFrameworkFilter("all"); } }}
            />
          )
        }

        {/* Persistence and Management Dialogs */}
        {
          viewingFiles !== null && (
            <EnhancedDialog
              open={viewingFiles !== null}
              onOpenChange={(open) => !open && setViewingFiles(null)}
              title="Evidence Files"
              description="Manage attachments and view analysis results"
              size="lg"
              footer={<Button onClick={() => setViewingFiles(null)}>Close</Button>}
            >
              <div className="py-4 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Files</h3>
                  <Button
                    variant="outline"
                    onClick={() => setGoogleDriveBrowserOpen(true)}
                    className="gap-2"
                  >
                    <span className="text-lg">📁</span>
                    Import from Google Drive
                  </Button>
                </div>
                <EvidenceFileUpload evidenceId={viewingFiles} clientId={clientId} />
                <div className="pt-4 border-t border-border">
                  <Label className="text-sm font-semibold mb-3 block">AI Compliance Analysis</Label>
                  <EvidenceAnalysisButton
                    evidenceId={viewingFiles}
                    controlName={evidenceList?.find(e => e.id === viewingFiles)?.control?.name}
                  />
                </div>
              </div>
            </EnhancedDialog>
          )
        }

        {/* Edit Evidence Dialog */}
        {
          editingEvidence !== null && (
            <EnhancedDialog
              open={editingEvidence !== null}
              onOpenChange={(open) => !open && setEditingEvidence(null)}
              title="Edit Evidence"
              description="Update evidence details for continuous monitoring."
              size="lg"
              footer={
                <div className="flex justify-end gap-2 w-full">
                  <Button variant="outline" onClick={() => setEditingEvidence(null)}>Cancel</Button>
                  <Button onClick={() => (document.getElementById('edit-evidence-form') as HTMLFormElement)?.requestSubmit()}>
                    Update Evidence
                  </Button>
                </div>
              }
            >
              <form id="edit-evidence-form" onSubmit={(e) => handleUpdate(e, editingEvidence!)}>
                {(() => {
                  const ev = evidenceList?.find(e => e.id === editingEvidence);
                  if (!ev) return null;
                  return (
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Evidence ID</Label>
                          <Input name="evidenceId" defaultValue={ev.evidenceId} />
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground flex items-center">
                          Linked to: {ev.control?.controlId} - {ev.control?.name}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea name="description" defaultValue={ev.description || ""} className="min-h-[100px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Type</Label>
                          <Select name="type" defaultValue={ev.type || "Document"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Document">Document</SelectItem>
                              <SelectItem value="Screenshot">Screenshot</SelectItem>
                              <SelectItem value="Log">Log</SelectItem>
                              <SelectItem value="Report">Report</SelectItem>
                              <SelectItem value="Configuration">Configuration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <Select name="status" defaultValue={ev.status || "pending"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="not_applicable">Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label>Verification Interval (Days)</Label>
                           <Input name="intervalDays" type="number" defaultValue={(ev as any).intervalDays || 365} />
                        </div>
                        <div className="grid gap-2">
                           <Label>Expiration Date</Label>
                           <Input 
                            name="expirationDate" 
                            type="date" 
                            defaultValue={(ev as any).expirationDate ? new Date((ev as any).expirationDate).toISOString().split('T')[0] : ""} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </form>
            </EnhancedDialog>
          )
        }

        {/* Google Drive Import Dialog */}
        {
          viewingFiles && (
            <GoogleDriveFileBrowser
              evidenceId={viewingFiles}
              clientId={clientId}
              open={googleDriveBrowserOpen}
              onOpenChange={setGoogleDriveBrowserOpen}
              onImportComplete={() => {
                // Refetch files after import
              }}
            />
          )
        }

        <AlertDialog open={!!evidenceToDelete} onOpenChange={(open) => !open && setEvidenceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Evidence?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this evidence? This action cannot be undone.
                {evidenceToDelete && evidenceToDelete.status === 'verified' && (
                  <div className="mt-2 p-2 bg-amber-50 rounded text-amber-800 text-sm border border-amber-200">
                    Warning: This evidence is marked as <b>Verified</b>. Deleting it may impact compliance status.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
              >
                Delete Evidence
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
