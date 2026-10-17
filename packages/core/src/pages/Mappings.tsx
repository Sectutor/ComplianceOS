import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Input } from "@complianceos/ui/ui/input";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Link2,
  Edit2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  FileCheck2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Mappings() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState<string>("");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [editingMapping, setEditingMapping] = useState<any>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ai" | "manual">("all");

  // Multi-selection for suggested mappings dialog
  const [selectedSuggestions, setSelectedSuggestions] = useState<{ clientControlId: number; clientPolicyId: number; notes: string }[]>([]);

  const { data: client } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: clientId > 0 }
  );
  const { data: mappings, isLoading, refetch } = trpc.mappings.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: clientControls } = trpc.clientControls.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: clientPolicies, isLoading: policiesLoading } = trpc.clientPolicies.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: masterControls } = trpc.controls.list.useQuery();

  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = trpc.mappings.suggestedMappings.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  // Reset selected policy when dialog closes
  useEffect(() => {
    if (!isAddOpen) {
      setSelectedPolicyId("");
      setSelectedControlId("");
    }
  }, [isAddOpen]);

  // Mutations
  const createMutation = trpc.mappings.create.useMutation({
    onSuccess: () => {
      toast.success("Mapping created");
      setIsAddOpen(false);
      refetch();
      refetchSuggestions();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.mappings.delete.useMutation({
    onSuccess: () => {
      toast.success("Mapping removed");
      refetch();
      refetchSuggestions();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.mappings.update.useMutation({
    onSuccess: () => {
      toast.success("Mapping updated");
      setEditingMapping(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const autoMapMutation = trpc.mappings.autoMap.useMutation({
    onSuccess: (result) => {
      toast.success(`Auto-mapping completed! Created ${result.created} mappings across ${result.controlsEvaluated} controls.`);
      refetch();
      refetchSuggestions();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkCreateMutation = trpc.mappings.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully linked ${result.created} mappings!`);
      setIsSuggestionsOpen(false);
      setSelectedSuggestions([]);
      refetch();
      refetchSuggestions();
    },
    onError: (error) => toast.error(error.message),
  });

  // Calculate stats
  const totalControls = clientControls?.length || 0;
  const mappedControlIds = useMemo(() => {
    return new Set(mappings?.map((m) => m.mapping.clientControlId) || []);
  }, [mappings]);
  const mappedControlsCount = mappedControlIds.size;
  const coveragePercent = totalControls > 0 ? Math.round((mappedControlsCount / totalControls) * 100) : 0;
  const totalMappings = mappings?.length || 0;
  const aiMappingsCount = mappings?.filter((m) => (m.mapping as any).isAiGenerated)?.length || 0;
  const unmappedCount = Math.max(0, totalControls - mappedControlsCount);

  // Initialize selected suggestions when opening modal
  const handleOpenSuggestions = () => {
    if (suggestions) {
      const all: { clientControlId: number; clientPolicyId: number; notes: string }[] = [];
      for (const s of suggestions) {
        if (s.suggestedPolicies.length > 0) {
          // Default to the first (highest confidence) suggestion for each control
          all.push({
            clientControlId: s.controlId,
            clientPolicyId: s.suggestedPolicies[0].policyId,
            notes: s.suggestedPolicies[0].matchReason,
          });
        }
      }
      setSelectedSuggestions(all);
    }
    setIsSuggestionsOpen(true);
  };

  const toggleSuggestionSelection = (clientControlId: number, clientPolicyId: number, matchReason: string) => {
    const exists = selectedSuggestions.some(
      (m) => m.clientControlId === clientControlId && m.clientPolicyId === clientPolicyId
    );
    if (exists) {
      setSelectedSuggestions(selectedSuggestions.filter(
        (m) => !(m.clientControlId === clientControlId && m.clientPolicyId === clientPolicyId)
      ));
    } else {
      setSelectedSuggestions([...selectedSuggestions, { clientControlId, clientPolicyId, notes: matchReason }]);
    }
  };

  const handleSelectAllSuggestions = () => {
    if (!suggestions) return;
    const all: { clientControlId: number; clientPolicyId: number; notes: string }[] = [];
    for (const s of suggestions) {
      for (const p of s.suggestedPolicies) {
        all.push({
          clientControlId: s.controlId,
          clientPolicyId: p.policyId,
          notes: p.matchReason,
        });
      }
    }
    setSelectedSuggestions(all);
  };

  const handleDeselectAllSuggestions = () => {
    setSelectedSuggestions([]);
  };

  const handleApplySelectedSuggestions = () => {
    if (selectedSuggestions.length === 0) {
      toast.error("Please select at least one mapping to apply");
      return;
    }
    bulkCreateMutation.mutate({
      clientId,
      mappings: selectedSuggestions.map((m) => ({
        clientControlId: m.clientControlId,
        clientPolicyId: m.clientPolicyId,
        notes: m.notes,
        isAiGenerated: true,
      })),
    });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedControlId || !selectedPolicyId) {
      toast.error("Please select both a control and a policy");
      return;
    }
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId,
      clientControlId: parseInt(selectedControlId),
      clientPolicyId: parseInt(selectedPolicyId),
      evidenceReference: formData.get("evidenceReference") as string,
      notes: formData.get("notes") as string,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMapping) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingMapping.mapping.id,
      evidenceReference: formData.get("evidenceReference") as string,
      notes: formData.get("notes") as string,
    });
  };

  // Filtered mappings list
  const filteredMappings = useMemo(() => {
    if (!mappings) return [];
    return mappings.filter((item) => {
      // Type filter
      const isAi = (item.mapping as any).isAiGenerated;
      if (filterType === "ai" && !isAi) return false;
      if (filterType === "manual" && isAi) return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const ctrlCode = item.clientControl?.clientControlId?.toLowerCase() || "";
      const ctrlName = item.control?.name?.toLowerCase() || "";
      const polCode = item.clientPolicy?.clientPolicyId?.toLowerCase() || "";
      const polName = item.clientPolicy?.name?.toLowerCase() || "";
      const notes = item.mapping?.notes?.toLowerCase() || "";
      const evidence = item.mapping?.evidenceReference?.toLowerCase() || "";

      return (
        ctrlCode.includes(q) ||
        ctrlName.includes(q) ||
        polCode.includes(q) ||
        polName.includes(q) ||
        notes.includes(q) ||
        evidence.includes(q)
      );
    });
  }, [mappings, searchQuery, filterType]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Clients", href: "/clients" },
            { label: client?.name || "Client", href: `/clients/${clientId}` },
            { label: "Control-Policy Mappings" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/clients/${clientId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Control-Policy Traceability Matrix</h1>
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                  Audit Ready
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {client?.name ? `${client.name} · ` : ""}Demonstrate regulatory compliance coverage to auditors
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Map All Button */}
            <Button
              onClick={() => {
                if (confirm(`Auto-Map will intelligently link your controls to policies based on standard compliance domains. Continue?`)) {
                  autoMapMutation.mutate({ clientId });
                }
              }}
              disabled={autoMapMutation.isPending || totalControls === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
            >
              {autoMapMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Auto-Mapping...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  ⚡ Auto-Map All Controls
                </>
              )}
            </Button>

            {/* Review Suggestions Button */}
            <Button
              variant="outline"
              onClick={handleOpenSuggestions}
              disabled={suggestionsLoading || (suggestions?.length === 0)}
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Zap className="h-4 w-4 text-indigo-500" />
              Review Suggestions ({suggestions?.length || 0})
            </Button>

            {/* Manual Add Button */}
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Manual
            </Button>
          </div>
        </div>

        {/* Coverage Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card shadow-sm border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Control Coverage
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {coveragePercent}%
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${coveragePercent >= 80 ? 'bg-emerald-100 text-emerald-700' : coveragePercent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={coveragePercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {mappedControlsCount} of {totalControls} controls mapped
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Mappings
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {totalMappings}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <Link2 className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {aiMappingsCount} automated · {totalMappings - aiMappingsCount} manual
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client Policies
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {clientPolicies?.length || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-teal-100 text-teal-700">
                  <FileCheck2 className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Internal documented policies available
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Unmapped Controls
                  </p>
                  <p className="text-2xl font-bold mt-1 text-slate-800">
                    {unmappedCount}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${unmappedCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {unmappedCount === 0 ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {unmappedCount === 0 ? "Complete audit coverage! 🎉" : "Pending policy assignment"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unmapped Controls Alert Banner if any */}
        {unmappedCount > 0 && totalMappings > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm">
                <strong>{unmappedCount} controls</strong> are currently not linked to an internal policy.
                Run auto-mapping to bridge the remaining gaps.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => autoMapMutation.mutate({ clientId })}
              disabled={autoMapMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 ml-4"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Map Remaining Controls
            </Button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        {totalMappings > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls, policies, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 rounded-md transition-all ${filterType === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All ({mappings?.length || 0})
                </button>
                <button
                  onClick={() => setFilterType("ai")}
                  className={`px-3 py-1 rounded-md transition-all ${filterType === "ai" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Auto-Mapped ({aiMappingsCount})
                </button>
                <button
                  onClick={() => setFilterType("manual")}
                  className={`px-3 py-1 rounded-md transition-all ${filterType === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Manual ({totalMappings - aiMappingsCount})
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="h-9 px-2 text-muted-foreground hover:text-slate-900"
                title="Refresh table"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Mappings Table or Empty State */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : filteredMappings.length > 0 ? (
          <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-brand hover:bg-brand border-none">
                  <TableHead className="text-white font-semibold py-4 w-1/3">Control Requirement</TableHead>
                  <TableHead className="text-white font-semibold py-4 w-1/3">Enforcing Policy</TableHead>
                  <TableHead className="text-white font-semibold py-4 w-28">Source</TableHead>
                  <TableHead className="text-white font-semibold py-4">Evidence / Audit Notes</TableHead>
                  <TableHead className="w-20 text-white font-semibold py-4 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.map((item) => {
                  const isAi = (item.mapping as any).isAiGenerated;
                  return (
                    <TableRow
                      key={`mapping-${item.mapping.id}`}
                      className="bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors group"
                      onDoubleClick={() => setEditingMapping(item)}
                    >
                      {/* Control */}
                      <TableCell className="py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {item.clientControl?.clientControlId || item.control?.controlId || `ID #${item.clientControl?.id}`}
                            </span>
                            {item.control?.framework && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {item.control.framework}
                              </span>
                            )}
                            {item.control?.category && (
                              <span className="text-[11px] text-slate-500">
                                · {item.control.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-900 leading-snug">
                            {item.control?.name || item.clientControl?.clientControlId}
                          </p>
                          {item.control?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.control.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Policy */}
                      <TableCell className="py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100">
                              {item.clientPolicy?.clientPolicyId || `POL-${item.clientPolicy?.id}`}
                            </span>
                            {item.clientPolicy?.module && (
                              <span className="text-[11px] text-muted-foreground capitalize">
                                · {item.clientPolicy.module}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">
                            {item.clientPolicy?.name}
                          </p>
                        </div>
                      </TableCell>

                      {/* Source */}
                      <TableCell className="py-4 align-top">
                        {isAi ? (
                          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200 text-[11px] gap-1 shadow-none">
                            <Sparkles className="h-3 w-3 text-teal-600" />
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 text-[11px] shadow-none">
                            Manual
                          </Badge>
                        )}
                      </TableCell>

                      {/* Evidence / Notes */}
                      <TableCell className="py-4 align-top text-xs text-slate-600 max-w-xs">
                        {item.mapping.notes ? (
                          <p className="line-clamp-2 text-slate-700 font-normal">
                            {item.mapping.notes}
                          </p>
                        ) : item.mapping.evidenceReference ? (
                          <p className="font-mono text-[11px] text-indigo-700">
                            {item.mapping.evidenceReference}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">No notes</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 align-top text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => setEditingMapping(item)}
                            title="Edit notes"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm("Remove this mapping?")) {
                                deleteMutation.mutate({ id: item.mapping.id });
                              }
                            }}
                            title="Delete mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : totalMappings > 0 && searchQuery ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <h3 className="text-base font-medium">No matching mappings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No mappings match &quot;{searchQuery}&quot;. Try adjusting your search query or filter.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-4">
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <Card className="py-12 border-dashed bg-gradient-to-b from-white to-slate-50/50">
            <CardContent className="max-w-xl mx-auto text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  ⚡ 1-Click Auto-Mapping Ready
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ComplianceOS detected <strong>{totalControls} controls</strong> and <strong>{clientPolicies?.length || 0} policies</strong> for {client?.name || "this client"}.
                  You do not need to link them one-by-one — our compliance intelligence can automatically map all standard controls to their enforcing internal policies in seconds.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => autoMapMutation.mutate({ clientId })}
                  disabled={autoMapMutation.isPending || totalControls === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 shadow-md flex items-center gap-2 w-full sm:w-auto"
                >
                  {autoMapMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Auto-Mapping Controls...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ⚡ Auto-Map All Controls Now
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleOpenSuggestions}
                  disabled={suggestionsLoading || (suggestions?.length === 0)}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <Zap className="h-4 w-4 text-indigo-600" />
                  Review Suggestions First
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setIsAddOpen(true)}
                  className="w-full sm:w-auto text-muted-foreground"
                >
                  Add Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestion Review Dialog */}
        <EnhancedDialog
          open={isSuggestionsOpen}
          onOpenChange={setIsSuggestionsOpen}
          title="Review AI Suggested Mappings"
          description={`Select which policy mappings to link to your controls (${selectedSuggestions.length} selected).`}
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllSuggestions}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAllSuggestions}
                  className="text-xs text-muted-foreground"
                >
                  Deselect All
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setIsSuggestionsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApplySelectedSuggestions}
                  disabled={bulkCreateMutation.isPending || selectedSuggestions.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {bulkCreateMutation.isPending ? "Applying..." : `Apply Selected (${selectedSuggestions.length})`}
                </Button>
              </div>
            </div>
          }
        >
          <div className="py-2">
            <ScrollArea className="h-[480px] pr-4">
              <div className="space-y-4">
                {suggestionsLoading ? (
                  <div className="p-8 text-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-sm text-muted-foreground">Analyzing controls and policies...</p>
                  </div>
                ) : suggestions && suggestions.length > 0 ? (
                  suggestions.map((item) => (
                    <div
                      key={`sug-ctrl-${item.controlId}`}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border text-slate-800">
                              {item.clientControlId}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            {item.controlName}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pl-2">
                        {item.suggestedPolicies.map((pol) => {
                          const isSelected = selectedSuggestions.some(
                            (s) => s.clientControlId === item.controlId && s.clientPolicyId === pol.policyId
                          );
                          return (
                            <div
                              key={`sug-pol-${item.controlId}-${pol.policyId}`}
                              onClick={() => toggleSuggestionSelection(item.controlId, pol.policyId, pol.matchReason)}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-indigo-50/60 border-indigo-200 shadow-xs"
                                  : "bg-white border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSuggestionSelection(item.controlId, pol.policyId, pol.matchReason)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {pol.policyName}
                                  </p>
                                  <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 text-[10px] shrink-0 ml-2">
                                    Match
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {pol.matchReason}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No suggestions available at this time.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </EnhancedDialog>

        {/* Manual Create Dialog */}
        <EnhancedDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          title="Create Manual Mapping"
          description="Link a specific control to an internal policy."
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const form = document.getElementById("create-mapping-form") as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Mapping"}
              </Button>
            </div>
          }
        >
          <form id="create-mapping-form" onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Control *</Label>
                <Select value={selectedControlId} onValueChange={setSelectedControlId}>
                  <SelectTrigger className={!selectedControlId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select control" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {clientControls && clientControls.length > 0 ? (
                      clientControls.map((item) => {
                        const code = item.clientControl.clientControlId ||
                          item.control?.controlId ||
                          (item.control?.id ? `CTL-${item.control.id}` : `CTL-${item.clientControl.id}`);
                        const name = item.control?.name ||
                          masterControls?.find(c => c.id === item.clientControl.controlId)?.name ||
                          'Unnamed Control';
                        const framework = item.control?.framework ? ` [${item.control.framework}]` : '';
                        const displayText = `${code} - ${name}${framework}`;

                        return (
                          <SelectItem key={item.clientControl.id} value={item.clientControl.id.toString()}>
                            {displayText}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">No controls available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Policy *</Label>
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger className={!selectedPolicyId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {clientPolicies && clientPolicies.length > 0 ? (
                      clientPolicies.map((item) => (
                        <SelectItem key={item.clientPolicy.id} value={item.clientPolicy.id.toString()}>
                          {item.clientPolicy.clientPolicyId ? `${item.clientPolicy.clientPolicyId} - ` : ""}{item.clientPolicy.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">No policies available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Evidence Reference</Label>
                <Textarea name="evidenceReference" placeholder="Reference to evidence supporting this mapping..." />
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea name="notes" placeholder="Additional compliance notes..." />
              </div>
            </div>
          </form>
        </EnhancedDialog>

        {/* Edit Mapping Dialog */}
        <EnhancedDialog
          open={!!editingMapping}
          onOpenChange={(open) => !open && setEditingMapping(null)}
          title="Edit Mapping Details"
          description="Update evidence reference or audit notes for this mapping."
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => setEditingMapping(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const form = document.getElementById("edit-mapping-form") as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          }
        >
          {editingMapping && (
            <form id="edit-mapping-form" onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Control</Label>
                  <div className="p-2.5 border rounded-lg bg-muted/50 text-sm">
                    <span className="font-mono font-medium">{editingMapping.clientControl?.clientControlId || editingMapping.control?.controlId || 'CTL'}: </span>
                    {editingMapping.control?.name || "Control"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Policy</Label>
                  <div className="p-2.5 border rounded-lg bg-muted/50 text-sm">
                    {editingMapping.clientPolicy?.name
                      ? `${editingMapping.clientPolicy?.clientPolicyId || 'POL'} - ${editingMapping.clientPolicy.name}`
                      : (editingMapping.clientPolicy?.clientPolicyId || 'Policy')}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Evidence Reference</Label>
                  <Textarea
                    name="evidenceReference"
                    defaultValue={editingMapping.mapping.evidenceReference || ""}
                    placeholder="Reference to evidence supporting this mapping..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    name="notes"
                    defaultValue={editingMapping.mapping.notes || ""}
                    placeholder="Additional compliance notes..."
                  />
                </div>
              </div>
            </form>
          )}
        </EnhancedDialog>
      </div>
    </DashboardLayout>
  );
}
