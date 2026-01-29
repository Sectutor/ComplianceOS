import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Breadcrumb } from "@/components/Breadcrumb";
import { usePageHelp } from "@/hooks/usePageHelp";
import { useDebounce } from "@/hooks/useDebounce";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ControlsStats } from "@/components/controls/ControlsStats";
import { ControlTable } from "@/components/controls/ControlTable";
import { ControlFilterBar } from "@/components/controls/ControlFilterBar";
import { ControlDetailsSheet } from "@/components/controls/ControlDetailsSheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@complianceos/ui/ui/dialog";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Badge } from "@complianceos/ui/ui/badge";
import { Loader2, Trash2, CheckCircle2, ShieldCheck, Target, Wand2 } from "lucide-react";
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

export default function Controls() {
  usePageHelp({
    pageTitle: "Controls Framework",
    description: "Manage master controls, frameworks, and requirements. Define controls, assign owners, and map them to frameworks.",
    keyTopics: ["Controls", "Frameworks", "Compliance Requirements", "Control Owners"],
    dataSummary: {
      context: "User is viewing the master Controls Library."
    }
  });

  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  // Pagination State
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [frameworkFilter, setFrameworkFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  // Other filters could be added here

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<number | null>(null);
  const [viewingHistory, setViewingHistory] = useState<number | null>(null);
  const [controlToDelete, setControlToDelete] = useState<any>(null);
  const [selectedFramework, setSelectedFramework] = useState<string>("");

  const [selectedControlIds, setSelectedControlIds] = useState<number[]>([]);
  const [viewingControl, setViewingControl] = useState<any>(null);

  // Auto-Map State
  const [openAutoMap, setOpenAutoMap] = useState(false);
  const [autoSource, setAutoSource] = useState<string>("ISO 27001");
  const [autoTarget, setAutoTarget] = useState<string>("SOC 2");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  // Fetch Existing Mappings for display
  const { data: mappings, refetch: refetchMappings } = trpc.compliance.frameworkMappings.list.useQuery({});

  const groupedMappings = useMemo(() => {
    if (!mappings) return [];

    // Defensive check: mappings must be an array
    if (!Array.isArray(mappings)) {
      console.error("[Controls] 'mappings' is not an array:", mappings);
      return [];
    }

    const groups = new Map();
    mappings.forEach((m: any) => {
      if (!groups.has(m.sourceControlId)) {
        groups.set(m.sourceControlId, {
          source: {
            id: m.sourceControlId,
          },
          targets: []
        });
      }
      groups.get(m.sourceControlId).targets.push(m);
    });
    return Array.from(groups.values());
  }, [mappings]);

  const autoMapControls = trpc.compliance.frameworkMappings.autoMapControls.useMutation({
    onSuccess: (data: any) => {
      setSuggestions(data);
      setSelectedSuggestions(new Set(data.map((_: any, i: number) => i)));
      toast.success(`AI found ${data.length} potential mappings`);
    },
    onError: (e) => toast.error(e.message)
  });

  const bulkCreateMappings = trpc.compliance.frameworkMappings.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.count} mappings`);
      setOpenAutoMap(false);
      setSuggestions([]);
      refetchMappings();
    },
    onError: (e) => toast.error(e.message)
  });

  const handleRunAutoMap = () => {
    autoMapControls.mutate({
      sourceFramework: autoSource,
      targetFramework: autoTarget,
      save: false
    });
  };

  const handleApplyAutoMap = () => {
    const toCreate = suggestions.filter((_, i) => selectedSuggestions.has(i)).map(s => ({
      sourceControlId: s.sourceId,
      targetControlId: s.targetId,
      mappingType: s.mappingType,
      confidence: s.confidence.toString(),
      notes: `Auto-mapped by AI (${s.confidence}%)`
    }));

    if (toCreate.length === 0) return;
    bulkCreateMappings.mutate(toCreate);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [frameworkFilter, debouncedSearchQuery, ownerFilter]);

  const { data: paginatedData, isLoading, refetch } = trpc.controls.listPaginated.useQuery({
    framework: frameworkFilter.length > 0 ? (frameworkFilter.includes("all") ? "all" : frameworkFilter) : "all",
    limit: pageSize,
    offset: page * pageSize,
    search: debouncedSearchQuery
  }, {
    keepPreviousData: true
  });

  const controls = paginatedData?.items || [];
  const totalCount = paginatedData?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: availableFrameworksData } = trpc.controls.getAvailableFrameworks.useQuery(
    undefined,
    { enabled: true }
  );

  const availableFrameworks = Array.isArray(availableFrameworksData) ? availableFrameworksData : [];

  // Merge mappings into the control list
  const enrichedControls = useMemo(() => {
    if (!paginatedData?.items) return [];
    if (!mappings) return paginatedData.items;

    // Map: ControlID -> Array of "Framework Code" strings
    const map = new Map<number, string[]>();

    console.log(`[DEBUG] Mappings: ${mappings?.length}, Controls: ${paginatedData?.items?.length}`);

    mappings.forEach((m: any) => {
      // If this control is the SOURCE, add the TARGET's framework/code
      if (!map.has(m.sourceControlId)) map.set(m.sourceControlId, []);
      const targetStr = `${m.targetFramework} ${m.targetControlCode}`;
      if (!map.get(m.sourceControlId)?.includes(targetStr)) {
        map.get(m.sourceControlId)?.push(targetStr);
      }

      // If this control is the TARGET (show related OR equivalent), add the SOURCE's framework/code
      // We allow 'related' now so users can see the link regardless of strictness.
      if (m.mappingType === 'equivalent' || m.mappingType === 'related') {
        if (!map.has(m.targetControlId)) map.set(m.targetControlId, []);
        const sourceStr = `${m.sourceFramework} ${m.sourceControlCode}`;
        if (!map.get(m.targetControlId)?.includes(sourceStr)) {
          map.get(m.targetControlId)?.push(sourceStr);
        }
      }
    });

    console.log(`[DEBUG] Map Size: ${map.size}`);
    console.log(`[DEBUG] Sample Map Entry:`, map.entries().next().value);

    return paginatedData.items.map((c: any) => {
      const mappings = map.get(c.id);
      return {
        ...c,
        // If mappings exist, prepend the source framework so it doesn't disappear.
        // If no mappings, return undefined so ControlTable falls back to [c.framework]
        mappedFrameworks: mappings && mappings.length > 0
          ? [c.framework, ...mappings]
          : undefined
      };
    });
  }, [paginatedData?.items, mappings]);

  const { data: history } = trpc.controls.history.useQuery(
    { controlId: viewingHistory || 0 },
    { enabled: !!viewingHistory }
  );

  const createMutation = trpc.controls.create.useMutation({
    onSuccess: () => {
      toast.success("Control created successfully");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.controls.update.useMutation({
    onSuccess: () => {
      toast.success("Control updated successfully");
      setEditingControl(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.controls.delete.useMutation({
    onSuccess: () => {
      toast.success("Control deleted");
      setControlToDelete(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const generateGuidanceMutation = trpc.controls.generateGuidance.useMutation({
    onSuccess: (data) => {
      toast.success("Guidance generated successfully");
      if (guidanceRef.current) {
        const current = guidanceRef.current.value;
        if (current && !confirm("Replace existing guidance?")) return;
        guidanceRef.current.value = data.text;
      }
    },
    onError: (error) => toast.error("Failed to generate: " + error.message),
  });

  const guidanceRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerateGuidance = () => {
    const control = controls.find(c => c.id === editingControl);
    if (!control) return;

    generateGuidanceMutation.mutate({
      controlId: control.controlId,
      name: control.name,
      description: control.description || "",
      framework: control.framework,
    });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFramework) {
      toast.error("Please select a framework");
      return;
    }
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      controlId: formData.get("controlId") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      framework: selectedFramework,
      owner: formData.get("owner") as string,
      frequency: formData.get("frequency") as string,
      evidenceType: formData.get("evidenceType") as string,
      status: formData.get("status") as "active" | "inactive" | "draft",
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id,
      controlId: formData.get("controlId") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      framework: formData.get("framework") as string,
      owner: formData.get("owner") as string,
      frequency: formData.get("frequency") as string,
      evidenceType: formData.get("evidenceType") as string,
      status: formData.get("status") as "active" | "inactive" | "draft",
      implementationGuidance: formData.get("implementationGuidance") as string,
      changeNote: formData.get("changeNote") as string,
    });
  };

  const handleDelete = (control: any) => {
    setControlToDelete(control);
  };

  const confirmDelete = () => {
    if (controlToDelete) {
      deleteMutation.mutate({ id: controlToDelete.id });
    }
  };

  // Mock stats calculation (Replace with backend data later)
  const assignmentStats = useMemo(() => {
    // This is just estimation from current page, ideally should be from backend
    const assigned = controls.filter(c => c.owner).length;
    const unassigned = controls.length - assigned;
    // Scale up to total count for visual impact if needed, or just use page data
    return {
      unassigned: Math.round(unassigned * (totalCount / (controls.length || 1))),
      assigned: Math.round(assigned * (totalCount / (controls.length || 1))),
      needsReassignment: 0
    };
  }, [controls, totalCount]);

  const completionStats = useMemo(() => {
    return {
      total: totalCount,
      okCount: Math.round(totalCount * 0.45), // Mock: 45% compliance
      testPassed: 5,
      testTotal: 12,
      documentAttached: 8,
      documentTotal: 10
    };
  }, [totalCount]);


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Controls" },
          ]}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Control Library</h1>
            <p className="text-muted-foreground mt-1">Manage master controls, frameworks, and requirements.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setOpenAutoMap(true)}>
              <Sparkles className="h-4 w-4" />
              Smart Link
            </Button>
            <EnhancedDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              trigger={
                <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
                  <Plus className="h-4 w-4" />
                  New Control
                </Button>
              }
              title="Add New Control"
              description="Define a new master control requirement."
              footer={
                <div className="flex justify-end gap-2 w-full">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={(e) => {
                      const form = document.getElementById('new-control-form') as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Control"}
                  </Button>
                </div>
              }
              size="lg"
            >
              <form id="new-control-form" onSubmit={handleCreate} className="space-y-4 py-4">
                {/* Form contents same as before */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="controlId">Control ID</Label>
                    <Input id="controlId" name="controlId" placeholder="e.g. AC-1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="framework">Framework</Label>
                    <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFrameworks.map(fw => (
                          <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                        ))}
                        {!availableFrameworks && (
                          <>
                            <SelectItem value="ISO 27001">ISO 27001</SelectItem>
                            <SelectItem value="SOC 2">SOC 2</SelectItem>
                            <SelectItem value="GDPR">GDPR</SelectItem>
                            <SelectItem value="HIPAA">HIPAA</SelectItem>
                            <SelectItem value="NIST CSF">NIST CSF</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Control Name</Label>
                  <Input id="name" name="name" placeholder="Access Control Policy" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Requirement)</Label>
                  <Textarea id="description" name="description" placeholder="The organization shall establish..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner">Default Owner</Label>
                    <Input id="owner" name="owner" placeholder="e.g. CISO" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Review Frequency</Label>
                    <Select name="frequency" defaultValue="Annual">
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Annual">Annual</SelectItem>
                        <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="evidenceType">Evidence Type</Label>
                    <Select name="evidenceType" defaultValue="Document">
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Document">Document</SelectItem>
                        <SelectItem value="Screenshot">Screenshot</SelectItem>
                        <SelectItem value="Log">Log</SelectItem>
                        <SelectItem value="Configuration">Configuration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="active">
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </EnhancedDialog>
          </div>
        </div>

        <div className="space-y-6">
          <ControlsStats
            controls={enrichedControls}
            assignmentStats={assignmentStats}
            completionStats={completionStats}
          />

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <ControlFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={{
                framework: frameworkFilter,
                owner: ownerFilter,
                status: [],
                risk: []
              }}
              onFilterChange={(type, value) => {
                if (type === 'framework') setFrameworkFilter(value);
                if (type === 'owner') setOwnerFilter(value);
              }}
              availableFrameworks={availableFrameworks}
              availableOwners={Array.from(new Set(controls.map(c => c.owner).filter(Boolean))) as string[]}
            />

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <>
                <ControlTable
                  controls={enrichedControls}
                  selectedIds={selectedControlIds}
                  onSelectChange={setSelectedControlIds}
                  onEdit={(c) => setEditingControl(c.id)}
                  onDelete={(id) => {
                    const c = controls.find(x => x.id === id);
                    if (c) handleDelete(c);
                  }}
                  onViewDetails={(c) => setViewingControl(c)}
                />

                {totalCount > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                    <div className="text-sm text-slate-500">
                      Showing <span className="font-medium text-slate-900">{page * pageSize + 1}</span> to <span className="font-medium text-slate-900">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-medium text-slate-900">{totalCount}</span> controls
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="h-9 px-4"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      <div className="text-sm font-medium px-2 text-slate-600">
                        Page {page + 1} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="h-9 px-4"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ControlDetailsSheet
        open={!!viewingControl}
        onOpenChange={(open) => !open && setViewingControl(null)}
        control={viewingControl}
      />

      {/* Edit Dialog */}
      <EnhancedDialog
        open={!!editingControl}
        onOpenChange={(open) => !open && setEditingControl(null)}
        title="Edit Control"
        description="Update control details."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="outline" onClick={() => setEditingControl(null)}>Cancel</Button>
            <Button
              onClick={(e) => {
                const form = document.getElementById('edit-control-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
        size="lg"
      >
        {editingControl && controls?.find(c => c.id === editingControl) && (
          <form id="edit-control-form" onSubmit={(e) => handleUpdate(e, editingControl)} className="space-y-4 py-4">
            {/* Fields populated with existing data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-controlId" className="font-semibold text-foreground/80">Control ID</Label>
                <Input id="edit-controlId" name="controlId" defaultValue={controls.find(c => c.id === editingControl)?.controlId} required className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-framework" className="font-semibold text-foreground/80">Framework</Label>
                <Input id="edit-framework" name="framework" defaultValue={controls.find(c => c.id === editingControl)?.framework} readOnly className="border-2 border-slate-300 bg-slate-100 text-muted-foreground focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="font-semibold text-foreground/80">Name</Label>
              <Input id="edit-name" name="name" defaultValue={controls.find(c => c.id === editingControl)?.name} required className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="font-semibold text-foreground/80">Description</Label>
              <Textarea id="edit-description" name="description" className="min-h-[80px] border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" defaultValue={controls.find(c => c.id === editingControl)?.description || ""} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-implementationGuidance" className="font-semibold text-foreground/80">Implementation Guidance (Examples)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={handleGenerateGuidance}
                  disabled={generateGuidanceMutation.isPending}
                >
                  <Sparkles className="h-3 w-3" />
                  {generateGuidanceMutation.isPending ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea
                id="edit-implementationGuidance"
                ref={guidanceRef}
                name="implementationGuidance"
                placeholder="e.g. Ex1: Identify relevant internal stakeholders..."
                className="min-h-[120px] font-mono text-sm border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
                defaultValue={(controls.find(c => c.id === editingControl) as any)?.implementationGuidance || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner" className="font-semibold text-foreground/80">Owner</Label>
                <Input id="edit-owner" name="owner" className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" defaultValue={controls.find(c => c.id === editingControl)?.owner || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-changeNote" className="font-semibold text-foreground/80">Change Note (Optional)</Label>
                <Input id="edit-changeNote" name="changeNote" className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" placeholder="Reason for update..." />
              </div>
            </div>
            {/* Hidden fields for required but unchanged enums if needed, or rely on defaults */}
            <input type="hidden" name="frequency" value={controls.find(c => c.id === editingControl)?.frequency || 'Annual'} />
            <input type="hidden" name="evidenceType" value={controls.find(c => c.id === editingControl)?.evidenceType || 'Document'} />
            <input type="hidden" name="status" value={controls.find(c => c.id === editingControl)?.status || 'active'} />
          </form>
        )}
      </EnhancedDialog>

      {/* History Dialog */}
      <EnhancedDialog
        open={!!viewingHistory}
        onOpenChange={(open) => !open && setViewingHistory(null)}
        title="Control History"
        description="Version history for this control."
        size="lg"
      >
        <div className="border rounded-md max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>v{entry.version}</TableCell>
                  <TableCell>{new Date(entry.changedAt).toLocaleDateString()}</TableCell>
                  <TableCell>User {entry.changedBy}</TableCell>
                  <TableCell>{entry.changeNote}</TableCell>
                </TableRow>
              ))}
              {!history?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No history available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </EnhancedDialog>

      {/* Auto-Map Dialog */}
      <Dialog open={openAutoMap} onOpenChange={setOpenAutoMap}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Auto-Mapping</DialogTitle>
            <DialogDescription>
              Automatically identify and link equivalent controls between two frameworks using AI.
            </DialogDescription>
          </DialogHeader>

          {!suggestions.length ? (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Master Framework (Source)</Label>
                  <Select value={autoSource} onValueChange={setAutoSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableFrameworks.map(fw => (
                        <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Framework</Label>
                  <Select value={autoTarget} onValueChange={setAutoTarget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableFrameworks.map(fw => (
                        <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded text-sm text-slate-600">
                <p>This process will:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Analyze the text of controls from both frameworks.</li>
                  <li>Calculate similarity scores (Embeddings + Cosine Similarity).</li>
                  <li>Suggest high-confidence mappings (&gt;75% match).</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded-md flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Found {suggestions.length} potential mappings.
              </div>
              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedSuggestions.size === suggestions.length}
                          onCheckedChange={(c) => {
                            if (c) setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
                            else setSelectedSuggestions(new Set());
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-[45%]">Source Control</TableHead>
                      <TableHead className="w-[45%]">Target Control (Suggested)</TableHead>
                      <TableHead>Conf.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s: any, idx: number) => (
                      <TableRow key={idx} className="align-top">
                        <TableCell className="pt-4">
                          <Checkbox
                            checked={selectedSuggestions.has(idx)}
                            onCheckedChange={(c) => {
                              const next = new Set(selectedSuggestions);
                              if (c) next.add(idx);
                              else next.delete(idx);
                              setSelectedSuggestions(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="space-y-1 py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{s.sourceCode}</Badge>
                            <span className="font-semibold text-sm">{s.sourceName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3" title={s.sourceDescription}>
                            {s.sourceDescription}
                          </p>
                        </TableCell>
                        <TableCell className="space-y-1 py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {s.targetCode}
                            </Badge>
                            <span className="font-semibold text-sm">{s.targetName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3" title={s.targetDescription}>
                            {s.targetDescription}
                          </p>
                        </TableCell>
                        <TableCell className="pt-4">
                          <Badge variant={s.confidence > 85 ? "default" : "secondary"}>
                            {s.confidence}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            {!suggestions.length ? (
              <Button onClick={handleRunAutoMap} disabled={autoMapControls.isPending}>
                {autoMapControls.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Frameworks
              </Button>
            ) : (
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => setSuggestions([])}>Back</Button>
                <Button onClick={handleApplyAutoMap} disabled={bulkCreateMappings.isPending}>
                  {bulkCreateMappings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm {selectedSuggestions.size} Mappings
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!controlToDelete} onOpenChange={(open) => !open && setControlToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{controlToDelete?.controlId}</b>? This action cannot be undone and may affect compliance scores if evidence is attached.
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Control"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout >
  );
}
