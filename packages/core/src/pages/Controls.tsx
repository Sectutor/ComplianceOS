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
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, ArrowLeft, FlaskConical, Play, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect, useMemo, type FormEvent } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Switch } from "@complianceos/ui/ui/switch";
import { useClientContext } from "@/contexts/ClientContext";
import { useAuth } from "@/contexts/AuthContext";
import { Breadcrumb } from "@/components/Breadcrumb";
import { usePageHelp } from "@/hooks/usePageHelp";
import { useDebounce } from "@/hooks/useDebounce";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, Link } from "wouter";
import { ControlsStats } from "@/components/controls/ControlsStats";
import { ControlTable } from "@/components/controls/ControlTable";
import { ControlFilterBar } from "@/components/controls/ControlFilterBar";
import { ControlDetailsSheet } from "@/components/controls/ControlDetailsSheet";
import { AutoTestResultDialog, type AutoTestRun } from "@/components/controls/AutoTestResultDialog";
import { Loader2, Trash2, CalendarClock, Save } from "lucide-react";
import { Slot } from "@/registry";
import { PageGuide } from "@/components/PageGuide";
import { SlotNames } from "@/registry/slotNames";
import { PageHeader } from "@complianceos/ui/ui/PageHeader";
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
  const [, setLocation] = useLocation();
  const { t } = useTranslation('compliance');
  // Custom hook to track search params since wouter's useLocation might ignore query-only changes
  const useSearchParams = () => {
    const [search, setSearch] = useState(window.location.search);

    useEffect(() => {
      const onChange = () => setSearch(window.location.search);

      // Listen for popstate
      window.addEventListener('popstate', onChange);

      // Monkey-patch pushState/replaceState to detect changes
      const originalPush = window.history.pushState;
      const originalReplace = window.history.replaceState;

      window.history.pushState = function (...args) {
        const res = originalPush.apply(this, args);
        onChange();
        return res;
      };

      window.history.replaceState = function (...args) {
        const res = originalReplace.apply(this, args);
        onChange();
        return res;
      };

      return () => {
        window.history.pushState = originalPush;
        window.history.replaceState = originalReplace;
        window.removeEventListener('popstate', onChange);
      };
    }, []);

    return new URLSearchParams(search);
  };

  const searchParams = useSearchParams();
  const frameworkParam = searchParams.get('framework') || '';

  usePageHelp({
    pageTitle: "Controls Framework",
    description: "Manage master controls, frameworks, and requirements. Define controls, assign owners, and map them to frameworks.",
    keyTopics: ["Controls", "Frameworks", "Compliance Requirements", "Control Owners"],
    dataSummary: {
      context: "User is viewing the master Controls Library."
    }
  });

  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  // Control Auto-Tests (scorecard P0 #2 "Continuous control monitoring - UI trigger").
  // The page is the master Controls Library (not client-scoped), so the client is
  // taken from the global client switcher. The controlMonitoring tRPC procedures
  // (runAllForClient / history) are live on the backend; the local narrow cast
  // keeps this section type-safe without touching the shared trpc types.
  const autoTestClientId = selectedClientId ?? undefined;

  const ctlApi = trpc as unknown as {
    controlMonitoring: {
      runAllForClient: {
        useMutation: (opts?: {
          onSuccess?: (data: unknown) => void;
          onError?: (error: unknown) => void;
        }) => { mutate: (input: { clientId: number }) => void; isPending: boolean };
      };
      history: {
        useQuery: (
          input: { clientId: number; limit?: number },
          opts?: { enabled?: boolean; retry?: boolean | number }
        ) => {
          data?: Array<{
            id: number;
            clientControlId: number;
            controlCode?: string | null;
            status: string;
            score?: number | null;
            message?: string | null;
            findings?: Array<{ check: string; status: string; detail: string }> | null;
            executedAt?: string | Date | null;
          }>;
          isLoading: boolean;
          isError: boolean;
          refetch: () => unknown;
        };
      };
      getScheduleConfig: {
        useQuery: (
          input: { clientId: number },
          opts?: { enabled?: boolean; retry?: boolean | number }
        ) => {
          data?: { enabled: boolean; intervalHours: number; lastRunAt?: string | Date | null };
          isLoading: boolean;
          isError: boolean;
          refetch: () => unknown;
        };
      };
      updateScheduleConfig: {
        useMutation: (opts?: {
          onSuccess?: (data: unknown) => void;
          onError?: (error: unknown) => void;
        }) => {
          mutate: (input: { clientId: number; enabled?: boolean; intervalHours?: number }) => void;
          isPending: boolean;
        };
      };
    };
  };

  const runAllMutation = ctlApi.controlMonitoring.runAllForClient.useMutation({
    onSuccess: () => toast.success("Control auto-tests completed"),
    onError: () => toast.error("Control auto-tests failed"),
  });
  const autoTestHistory = ctlApi.controlMonitoring.history.useQuery(
    { clientId: autoTestClientId ?? 0, limit: 20 },
    { enabled: !!autoTestClientId, retry: false }
  );
  // Auto-test schedule: load the saved schedule config for the selected client.
  // The controlMonitoring.getScheduleConfig / updateScheduleConfig procedures
  // land on the backend this cycle; the narrow cast keeps this section
  // type-safe while they are still in flight (graceful degradation below).
  const scheduleQuery = ctlApi.controlMonitoring.getScheduleConfig.useQuery(
    { clientId: autoTestClientId ?? 0 },
    { enabled: !!autoTestClientId, retry: false }
  );
  const updateScheduleMutation = ctlApi.controlMonitoring.updateScheduleConfig.useMutation({
    onSuccess: () => {
      toast.success("Auto-test schedule saved");
      scheduleQuery.refetch();
    },
    onError: () => toast.error("Failed to save auto-test schedule"),
  });

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(6);

  // Sync local form state when the saved config loads (keeps user edits intact
  // until a save/refetch round-trips).
  useEffect(() => {
    if (scheduleQuery.data) {
      setScheduleEnabled(!!scheduleQuery.data.enabled);
      if (typeof scheduleQuery.data.intervalHours === "number") {
        setScheduleInterval(scheduleQuery.data.intervalHours);
      }
    }
  }, [scheduleQuery.data?.enabled, scheduleQuery.data?.intervalHours]);

  const handleSaveSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (!autoTestClientId) return;
    updateScheduleMutation.mutate({
      clientId: autoTestClientId,
      enabled: scheduleEnabled,
      intervalHours: scheduleInterval,
    });
  };

  const formatLastRun = (lastRunAt?: string | Date | null) => {
    if (!lastRunAt) return "Never";
    const d = new Date(String(lastRunAt));
    return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString();
  };

  const [searchQuery, setSearchQuery] = useState("");
  // Pagination State
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [frameworkFilter, setFrameworkFilter] = useState<string[]>(
    frameworkParam ? [frameworkParam] : []
  );
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  // Other filters could be added here

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<number | null>(null);
  const [viewingHistory, setViewingHistory] = useState<number | null>(null);
  const [controlToDelete, setControlToDelete] = useState<any>(null);
  const [selectedFramework, setSelectedFramework] = useState<string>("");

  const [selectedControlIds, setSelectedControlIds] = useState<number[]>([]);
  const [viewingControl, setViewingControl] = useState<any>(null);
  const [viewingTestRun, setViewingTestRun] = useState<AutoTestRun | null>(null);

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

  const guidanceRef = useRef<HTMLTextAreaElement>(null);

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
        <div className="flex items-center gap-4">
          {frameworkParam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/frameworks')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Frameworks
            </Button>
          )}
          <Breadcrumb
            items={frameworkParam ? [
              { label: "Frameworks", href: "/frameworks" },
              { label: `${frameworkParam} Controls` }
            ] : [
              { label: "Global Control Library" }
            ]}
          />
        </div>

        <PageHeader
          title={frameworkParam ? `${frameworkParam} Controls` : "Global Control Library"}
          subtitle={frameworkParam
            ? `Manage controls for ${frameworkParam} framework`
            : "Manage master controls, frameworks, and requirements."
          }
          className="mb-4"
          actions={<div className="flex items-center gap-3">
            <PageGuide
              title="Global Control Library"
              description="Your centralized repository for operational security controls. Define once, comply many times."
              rationale="Instead of managing separate compliance projects for SOC 2, ISO 27001, and HIPAA, define a single 'Master Control' (e.g., 'Employee Background Checks') and map it to multiple framework requirements. This eliminates redundant work."
              howToUse={[
                { step: "Define Controls", description: "Document your company's actual security practices (e.g., 'MFA is enforced')." },
                { step: "Map to Frameworks", description: "Link your internal control to external requirements (e.g., SOC 2 CC6.1)." },
                { step: "Assign Owners", description: "Designate a responsible person to maintain the control." },
                { step: "Upload Evidence", description: "Attach proof (screenshots, policies) to demonstrate effectiveness." }
              ]}
              integrations={[
                { name: "Frameworks", description: "Controls satisfy specific Requirements." },
                { name: "Risks", description: "Controls mitigate identified Risks." },
                { name: "Audits", description: "Evidence attached here is automatically pulled into audits." }
              ]}
            />
            <Slot name={SlotNames.CONTROL_HEADER_ACTIONS} />
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
          </div>}
        />

        <div className="space-y-6">
          <ControlsStats
            controls={enrichedControls}
            assignmentStats={assignmentStats}
            completionStats={completionStats}
          />

          {/* Control Auto-Tests (scorecard P0 #2 - UI trigger for continuous monitoring) */}
          <Card className="bg-card/70 backdrop-blur-xl border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary shrink-0" /> Control Auto-Tests
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Run automated verification checks against client controls (continuous control monitoring).
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={!autoTestClientId || runAllMutation.isPending}
                onClick={() => autoTestClientId && runAllMutation.mutate({ clientId: autoTestClientId })}
              >
                {runAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {runAllMutation.isPending ? "Running..." : "Run all tests"}
              </Button>
            </CardHeader>
            <CardContent>
              {!autoTestClientId ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="Select a client to run auto-tests"
                  description="Choose a client from the client switcher, then run automated checks against its controls."
                />
              ) : autoTestHistory.isError ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="Connect the controlMonitoring API"
                  description="The control-monitoring endpoint is not reachable. Verify the backend controlMonitoring router."
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Click a run to see why it failed, open the control, or add it to the task board.
                  </p>
                  <ScrollArea className="h-40 rounded-md border border-border">
                  {autoTestHistory.isLoading ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                    </div>
                  ) : (autoTestHistory.data?.length ?? 0) === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No auto-test runs yet - click "Run all tests" to start.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {autoTestHistory.data?.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setViewingTestRun(r as AutoTestRun)}
                          className="flex items-center justify-between gap-4 px-4 py-2.5 w-full text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant={
                                r.status === "pass"
                                  ? "success"
                                  : r.status === "fail"
                                    ? "destructive"
                                    : "warning"
                              }
                              className="shrink-0 capitalize"
                            >
                              {r.status}
                            </Badge>
                            <span className="text-sm text-foreground truncate">
                              {r.controlCode ?? `Control #${r.clientControlId}`}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {r.executedAt ? new Date(String(r.executedAt)).toLocaleString() : "-"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Control Auto-Test Schedule (scorecard P0 #2 - scheduled continuous monitoring) */}
          <Card className="bg-card/70 backdrop-blur-xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary shrink-0" /> Auto-test schedule
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically run control verification on an interval for the selected client.
              </p>
            </CardHeader>
            <CardContent>
              {!autoTestClientId ? (
                <p className="text-sm text-muted-foreground">
                  Select a client to configure an auto-test schedule.
                </p>
              ) : scheduleQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule...
                </div>
              ) : scheduleQuery.isError ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">
                    Schedule configuration is unavailable - connect the controlMonitoring.getScheduleConfig API to enable scheduling.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Auto-tests can still be run manually above.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveSchedule} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="auto-test-schedule-enabled"
                        checked={scheduleEnabled}
                        onCheckedChange={setScheduleEnabled}
                        aria-label="Enable scheduled auto-tests"
                      />
                      <Label
                        htmlFor="auto-test-schedule-enabled"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Scheduled auto-tests
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor="auto-test-schedule-interval"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Interval
                      </Label>
                      <Select
                        value={String(scheduleInterval)}
                        onValueChange={(v) => setScheduleInterval(parseInt(v, 10))}
                      >
                        <SelectTrigger id="auto-test-schedule-interval" className="w-28 h-9">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 6, 12, 24].map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {h}h
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground">
                      Last run:{" "}
                      <span className="font-medium text-foreground">
                        {formatLastRun(scheduleQuery.data?.lastRunAt)}
                      </span>
                    </p>
                    <Button size="sm" type="submit" disabled={updateScheduleMutation.isPending}>
                      {updateScheduleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {updateScheduleMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
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
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{page * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span> controls
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
                      <div className="text-sm font-medium px-2 text-muted-foreground">
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

      <AutoTestResultDialog
        run={viewingTestRun}
        clientId={autoTestClientId}
        onOpenChange={(open) => !open && setViewingTestRun(null)}
        onViewControl={(control) => setViewingControl(control)}
        onOpenTasks={() => autoTestClientId && setLocation(`/clients/${autoTestClientId}/tasks`)}
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
                <Input id="edit-controlId" name="controlId" defaultValue={controls.find(c => c.id === editingControl)?.controlId} required  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-framework" className="font-semibold text-foreground/80">Framework</Label>
                <Input id="edit-framework" name="framework" defaultValue={controls.find(c => c.id === editingControl)?.framework} readOnly className="bg-muted text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="font-semibold text-foreground/80">Name</Label>
              <Input id="edit-name" name="name" defaultValue={controls.find(c => c.id === editingControl)?.name} required  />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="font-semibold text-foreground/80">Description</Label>
              <Textarea id="edit-description" name="description" className="min-h-[80px]" defaultValue={controls.find(c => c.id === editingControl)?.description || ""} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-implementationGuidance" className="font-semibold text-foreground/80">Implementation Guidance (Examples)</Label>
                <Slot
                  name={SlotNames.CONTROL_EDIT_ACTIONS}
                  props={{
                    controlId: controls.find(c => c.id === editingControl)?.controlId || "",
                    name: controls.find(c => c.id === editingControl)?.name || "",
                    description: controls.find(c => c.id === editingControl)?.description || "",
                    framework: controls.find(c => c.id === editingControl)?.framework || "",
                    onGenerate: (text: string) => {
                      if (guidanceRef.current) {
                        const current = guidanceRef.current.value;
                        if (current && !confirm("Replace existing guidance?")) return;
                        guidanceRef.current.value = text;
                      }
                    }
                  }}
                />
              </div>
              <Textarea
                id="edit-implementationGuidance"
                ref={guidanceRef}
                name="implementationGuidance"
                placeholder="e.g. Ex1: Identify relevant internal stakeholders..."
                className="min-h-[120px] font-mono text-sm"
                defaultValue={(controls.find(c => c.id === editingControl) as any)?.implementationGuidance || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner" className="font-semibold text-foreground/80">Owner</Label>
                <Input id="edit-owner" name="owner"  defaultValue={controls.find(c => c.id === editingControl)?.owner || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-changeNote" className="font-semibold text-foreground/80">Change Note (Optional)</Label>
                <Input id="edit-changeNote" name="changeNote"  placeholder="Reason for update..." />
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
