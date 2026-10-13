import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@complianceos/ui/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Label } from "@complianceos/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@complianceos/ui/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@complianceos/ui/ui/dialog";
import {
  Plus,
  FileText,
  MoreVertical,
  Trash2,
  ExternalLink,
  Search,
  Upload,
  Inbox,
  Send,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@complianceos/ui/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
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

type Direction = "inbound" | "outbound";

export default function QuestionnairesDashboard() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");

  const [direction, setDirection] = useState<Direction>("inbound");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<any>(null);

  // Create Questionnaire Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    direction: "inbound" as Direction,
    senderName: "",
    vendorName: "",
    productName: "ComplianceOS Platform",
    dueDate: "",
    priority: "medium",
    templateId: ""
  });

  // Reset status filter and search query when switching direction tabs
  useEffect(() => {
    setStatusFilter("all");
    setSearchQuery("");
  }, [direction]);

  // Queries
  const { data: questionnaires, isLoading, refetch } = trpc.questionnaire.list.useQuery(
    { clientId, direction },
    { enabled: !!clientId }
  );

  // Fetch available assessment templates (both standard blueprints and custom templates)
  const { data: templates } = trpc.questionnaire.listTemplates.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  // Fetch registered vendors for client
  const { data: vendorList } = trpc.vendors.listVendors.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  // Set default template when templates load
  useEffect(() => {
    if (templates && templates.length > 0 && !createForm.templateId) {
      setCreateForm(prev => ({ ...prev, templateId: templates[0].id }));
    }
  }, [templates]);

  // Mutations
  const createMutation = trpc.questionnaire.create.useMutation({
    onSuccess: (project) => {
      toast.success("Questionnaire created and controls populated!");
      setIsCreateModalOpen(false);
      refetch();
      setLocation(`/clients/${clientId}/questionnaires/${project.id}`);
    },
    onError: (err) => {
      toast.error(`Failed to create questionnaire: ${err.message}`);
    }
  });

  const deleteMutation = trpc.questionnaire.delete.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire deleted");
      refetch();
    }
  });

  const handleDelete = (q: any) => setQuestionnaireToDelete(q);

  const confirmDelete = async () => {
    if (questionnaireToDelete) {
      await deleteMutation.mutateAsync({ id: questionnaireToDelete.id });
      setQuestionnaireToDelete(null);
    }
  };

  const handleOpenCreateModal = (targetDirection?: Direction) => {
    const dir = targetDirection || direction;
    setCreateForm({
      name: dir === "inbound" ? "Customer Security Evaluation" : "Vendor Third-Party Review",
      direction: dir,
      senderName: dir === "inbound" ? "Enterprise Client" : "",
      vendorName: dir === "outbound" && vendorList && vendorList.length > 0 ? vendorList[0].name : "",
      productName: "ComplianceOS Platform",
      dueDate: format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"),
      priority: "medium",
      templateId: templates && templates.length > 0 ? templates[0].id : "iso27001-2022"
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Please enter a questionnaire name");
      return;
    }

    createMutation.mutate({
      clientId,
      name: createForm.name,
      direction: createForm.direction,
      senderName: createForm.direction === "inbound" ? createForm.senderName : "Vendor Risk Management Office",
      vendorName: createForm.direction === "outbound" ? createForm.vendorName : undefined,
      productName: createForm.productName,
      dueDate: createForm.dueDate || undefined,
      priority: createForm.priority,
      templateId: createForm.templateId || undefined
    });
  };

  // Filtered questionnaires memo
  const filteredQuestionnaires = useMemo(() => {
    if (!questionnaires) return [];
    return questionnaires.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = q.name?.toLowerCase().includes(query);
        const senderMatch = q.senderName?.toLowerCase().includes(query);
        const vendorMatch = q.vendorName?.toLowerCase().includes(query);
        const productMatch = q.productName?.toLowerCase().includes(query);
        const statusMatch = q.status?.toLowerCase().includes(query);
        if (!nameMatch && !senderMatch && !vendorMatch && !productMatch && !statusMatch) {
          return false;
        }
      }
      return true;
    });
  }, [questionnaires, statusFilter, searchQuery]);

  // Status counts for KPI and tabs
  const totalCount = questionnaires?.length || 0;
  const openCount = questionnaires?.filter(q => q.status === "open").length || 0;
  const sentCount = questionnaires?.filter(q => q.status === "sent").length || 0;
  const inProgressCount = questionnaires?.filter(q => q.status === "in_progress").length || 0;
  const completedCount = questionnaires?.filter(q => q.status === "completed").length || 0;

  const selectedTemplateDetails = useMemo(() => {
    return templates?.find(t => t.id === createForm.templateId);
  }, [templates, createForm.templateId]);

  // Status filter pill bar
  const statusTabs = (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
      {[
        { id: "all", label: "All", count: totalCount },
        ...(direction === "outbound" ? [{ id: "sent", label: "Sent to Vendor", count: sentCount }] : []),
        { id: "open", label: "Open", count: openCount },
        { id: "in_progress", label: "In Progress", count: inProgressCount },
        { id: "completed", label: "Completed", count: completedCount }
      ].map((tab) => {
        const isActive = statusFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isActive
                ? "bg-[#1C4D8D] text-white shadow-xs active:bg-[#153B6D]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const questionnaireTable = (
    <div className="rounded-xl border border-slate-200 shadow-xs overflow-hidden bg-white" id="quest-table-list">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#1C4D8D] hover:bg-[#1C4D8D] border-none text-white">
            <TableHead className="text-white font-semibold text-xs py-3.5 pl-4 w-[34%]">
              Questionnaire
            </TableHead>
            <TableHead className="text-white font-semibold text-xs py-3.5 w-[14%]">
              Progress
            </TableHead>
            <TableHead className="text-white font-semibold text-xs py-3.5 w-[14%]">
              Status
            </TableHead>
            <TableHead className="text-white font-semibold text-xs py-3.5 w-[16%]">
              {direction === "inbound" ? "Sender / Client" : "Vendor / Supplier"}
            </TableHead>
            <TableHead className="text-white font-semibold text-xs py-3.5 w-[11%]">
              Date Added
            </TableHead>
            <TableHead className="text-white font-semibold text-xs py-3.5 w-[11%]">
              Due Date
            </TableHead>
            <TableHead className="w-[48px] text-white font-semibold py-3.5 pr-4 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuestionnaires.map((q) => {
            const isOverdue = q.dueDate && new Date(q.dueDate) < new Date() && q.status !== "completed";

            return (
              <TableRow
                key={q.id}
                onClick={() => setLocation(`/clients/${clientId}/questionnaires/${q.id}`)}
                className="cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100"
              >
                {/* Title */}
                <TableCell className="py-3 pl-4 align-middle">
                  <div className="font-semibold text-xs text-slate-900 hover:text-blue-700 leading-snug">
                    {q.name}
                  </div>
                  {q.productName && (
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Target: {q.productName}
                    </span>
                  )}
                </TableCell>

                {/* Progress */}
                <TableCell className="py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (q.progress || 0) === 100
                            ? "bg-emerald-500"
                            : (q.progress || 0) > 0
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${q.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {q.progress ?? 0}%
                    </span>
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell className="py-3 align-middle">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      q.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : q.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : q.status === "sent"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        q.status === "completed"
                          ? "bg-emerald-500"
                          : q.status === "in_progress"
                          ? "bg-blue-600"
                          : q.status === "sent"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {q.status === "sent"
                      ? "Sent to Vendor"
                      : q.status === "in_progress"
                      ? "In Progress"
                      : q.status === "completed"
                      ? "Completed"
                      : q.status === "open"
                      ? "Open"
                      : q.status?.replace("_", " ")}
                  </span>
                </TableCell>

                {/* Sender / Vendor */}
                <TableCell className="py-3 align-middle text-xs text-slate-700 font-medium">
                  {direction === "inbound"
                    ? q.senderName || "Enterprise Customer"
                    : q.vendorName || q.senderName || "-"}
                </TableCell>

                {/* Date Added */}
                <TableCell className="py-3 align-middle text-xs text-slate-600 whitespace-nowrap">
                  {q.createdAt ? format(new Date(q.createdAt), "MMM d, yyyy") : "-"}
                </TableCell>

                {/* Due Date */}
                <TableCell className="py-3 align-middle text-xs whitespace-nowrap">
                  {q.dueDate ? (
                    <span
                      className={
                        isOverdue ? "text-rose-600 font-bold flex items-center gap-1" : "text-slate-600"
                      }
                    >
                      {format(new Date(q.dueDate), "MMM d, yyyy")}
                      {isOverdue && <span className="text-[10px] uppercase font-bold text-rose-500">Overdue</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 pr-4 align-middle text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/clients/${clientId}/questionnaires/${q.id}`);
                        }}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Open Assessment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-xs text-rose-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q);
                        }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}

          {filteredQuestionnaires.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-16">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {searchQuery ? "No matching questionnaires found" : "No questionnaires in this view"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `No results match "${searchQuery}". Try searching for another keyword or clearing the filter.`
                        : direction === "inbound"
                        ? "Upload or log a security questionnaire received from prospective clients to get started."
                        : "Create or dispatch questionnaires to your vendors and suppliers to evaluate their compliance."}
                    </p>
                  </div>
                  {searchQuery ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="text-xs h-8 mt-2"
                    >
                      Clear Search
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenCreateModal()}
                      className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white text-xs h-8 mt-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create New Questionnaire
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Questionnaires Workspace</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage inbound security assessments from customers and outbound evaluations sent to your third-party vendor supply chain.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <PageGuide
              title="Questionnaires Dashboard"
              description="Coordinate customer security assessments (inbound) and vendor third-party reviews (outbound)."
              rationale="Streamlines the assessment lifecycle through standardized assessment templates, AI-assisted answering, confidence scoring, and defensible source citations."
              howToUse={[
                {
                  step: "1. Customer Questionnaires (Inbound)",
                  description: "Manage security questionnaires received from clients. Run AI answering against your Knowledge Base to auto-draft responses with Confidence ratings and policy citations.",
                  targetId: "dir-tab-inbound"
                },
                {
                  step: "2. Vendor Evaluations (Outbound)",
                  description: "Dispatch assessments to third-party vendors and suppliers. Select standard blueprints (ISO 27001, CIS 8, CAIQ) to track vendor compliance posture.",
                  targetId: "dir-tab-outbound"
                },
                {
                  step: "3. Adopt Assessment Templates",
                  description: "Click '+ New Questionnaire' and select an Assessment Template Blueprint to automatically populate all mapped security controls and evidence requirements.",
                  targetId: "quest-table-list"
                },
                {
                  step: "4. Confidence & Source Tracking",
                  description: "When reviewing questionnaire answers, Confidence scores indicate policy match strength (>70% Green, 40-70% Amber, <40% Red), while Sources cite the exact internal policies referenced."
                }
              ]}
              scenarios={[
                {
                  title: "Responding to Customer Due Diligence",
                  example: "A client sends a questionnaire with 100 questions. You create an Inbound questionnaire, run AI answering, and review answers backed by your policy citations.",
                  auditTip: "Focus audit review on answers with lower confidence ratings (<70%) and verify that cited documents are up-to-date."
                },
                {
                  title: "Conducting Vendor Risk Assessments",
                  example: "You send an ISO 27001 or CIS 8 assessment to a critical SaaS vendor to verify their security controls prior to onboarding.",
                  auditTip: "Template questions initially show '—' for Confidence and Sources until vendor responses are submitted or matched against evidence."
                }
              ]}
              integrations={[
                { name: "Assessment Templates", description: "Standard blueprints (ISO 27001, CIS Controls v8, CAIQ v4, SOC 2) and custom organizational templates." },
                { name: "Knowledge Base", description: "Repository of company policies, procedures, and audits used to generate answers and citations." },
                { name: "Vendor Management", description: "Direct integration with third-party vendor directory for tracking external supply chain risk." }
              ]}
            />
            <Button
              onClick={() => handleOpenCreateModal()}
              className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white font-semibold text-xs h-9 px-4 shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Questionnaire
            </Button>
          </div>
        </div>

        {/* Direction Switcher (Inbound vs Outbound) */}
        <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-col sm:flex-row gap-1 border border-slate-200">
            <TabsTrigger
              id="dir-tab-inbound"
              value="inbound"
              className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white data-[state=active]:shadow-xs px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all"
            >
              <Inbox className="h-4 w-4" />
              <span>Customer Questionnaires</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 data-[state=active]:text-white">
                Inbound
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              id="dir-tab-outbound"
              value="outbound"
              className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white data-[state=active]:shadow-xs px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all"
            >
              <Send className="h-4 w-4" />
              <span>Vendor Questionnaires</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 data-[state=active]:text-white">
                Outbound
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Assessments
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{totalCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {direction === "inbound" ? "In Progress" : "Pending Vendor"}
                  </p>
                  <p className="text-xl font-bold text-amber-600 mt-0.5">
                    {direction === "inbound" ? inProgressCount : sentCount + inProgressCount}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Open / New
                  </p>
                  <p className="text-xl font-bold text-blue-600 mt-0.5">{openCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Inbox className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{completedCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Pill Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {statusTabs}

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, sender, vendor..."
                  className="pl-9 pr-8 h-9 text-xs bg-white border-slate-300 focus-visible:ring-[#1C4D8D]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500 whitespace-nowrap">
                {filteredQuestionnaires.length} assessment{filteredQuestionnaires.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* TAB 1: INBOUND CUSTOMER QUESTIONNAIRES */}
          <TabsContent value="inbound" className="mt-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">Loading questionnaires...</div>
            ) : (
              questionnaireTable
            )}
          </TabsContent>

          {/* TAB 2: OUTBOUND VENDOR QUESTIONNAIRES */}
          <TabsContent value="outbound" className="mt-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">Loading questionnaires...</div>
            ) : (
              questionnaireTable
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* CREATE QUESTIONNAIRE MODAL - BRIDGES ASSESSMENT TEMPLATES & QUESTIONNAIRES */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs font-semibold">
                Questionnaire Instantiation
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-600">
                Templates Connected
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
              Create New Questionnaire
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Instantiate an active questionnaire workspace from an Assessment Template blueprint or customer inquiry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Direction Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Questionnaire Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, direction: "inbound", name: "Customer Security Evaluation" })}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                    createForm.direction === "inbound"
                      ? "bg-blue-50/80 border-[#1C4D8D] ring-1 ring-[#1C4D8D]"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="h-8 w-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Inbound Review</p>
                    <p className="text-[10px] text-slate-500">For customers evaluating you</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, direction: "outbound", name: "Vendor Third-Party Review" })}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                    createForm.direction === "outbound"
                      ? "bg-blue-50/80 border-[#1C4D8D] ring-1 ring-[#1C4D8D]"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="h-8 w-8 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Outbound Audit</p>
                    <p className="text-[10px] text-slate-500">To evaluate your suppliers</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Questionnaire Name *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Annual Cloud Infrastructure Security Evaluation 2026"
                className="bg-white text-xs h-9"
                required
              />
            </div>

            {/* Dynamic Target Party depending on direction */}
            {createForm.direction === "inbound" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer / Sender Name</Label>
                  <Input
                    value={createForm.senderName}
                    onChange={(e) => setCreateForm({ ...createForm, senderName: e.target.value })}
                    placeholder="e.g. Acme Financial Group"
                    className="bg-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Scope / Target Product</Label>
                  <Input
                    value={createForm.productName}
                    onChange={(e) => setCreateForm({ ...createForm, productName: e.target.value })}
                    placeholder="e.g. ComplianceOS Platform"
                    className="bg-white text-xs h-9"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Vendor to Assess</Label>
                <div className="flex gap-2">
                  <Select
                    value={createForm.vendorName}
                    onValueChange={(val) => setCreateForm({ ...createForm, vendorName: val })}
                  >
                    <SelectTrigger className="bg-white text-xs h-9 flex-1">
                      <SelectValue placeholder="Select from registered vendors..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorList?.map((v) => (
                        <SelectItem key={v.id} value={v.name} className="text-xs">
                          {v.name} ({v.category || "Supplier"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={createForm.vendorName}
                    onChange={(e) => setCreateForm({ ...createForm, vendorName: e.target.value })}
                    placeholder="Or type custom vendor..."
                    className="bg-white text-xs h-9 w-44"
                  />
                </div>
              </div>
            )}

            {/* THE BRIDGE: CHOOSE ASSESSMENT TEMPLATE BLUEPRINT */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  Assessment Template Blueprint (Populate Questions)
                </Label>
                <span className="text-[11px] text-blue-700 font-medium">Controls will auto-populate</span>
              </div>

              <Select
                value={createForm.templateId}
                onValueChange={(val) => setCreateForm({ ...createForm, templateId: val })}
              >
                <SelectTrigger className="bg-white text-xs h-10 border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Choose an Assessment Template..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="font-semibold text-slate-800">{t.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                            {t.framework}
                          </Badge>
                          <Badge className="text-[10px] bg-blue-100 text-blue-800">
                            {t.questionCount} Controls
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Template Highlight Callout */}
              {selectedTemplateDetails && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-700" /> {selectedTemplateDetails.name}
                    </span>
                    <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {selectedTemplateDetails.questionCount} Controls Mapped
                    </Badge>
                  </div>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    {selectedTemplateDetails.description}
                  </p>
                </div>
              )}
            </div>

            {/* Due Date & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Due Date</Label>
                <Input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                  className="bg-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Evaluation Priority</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(val) => setCreateForm({ ...createForm, priority: val })}
                >
                  <SelectTrigger className="bg-white text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical" className="text-xs text-rose-600 font-bold">Critical Risk</SelectItem>
                    <SelectItem value="high" className="text-xs text-amber-600 font-bold">High Priority</SelectItem>
                    <SelectItem value="medium" className="text-xs text-blue-600 font-medium">Medium Priority</SelectItem>
                    <SelectItem value="low" className="text-xs text-slate-600">Low / Informational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200 flex items-center justify-between sm:justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setLocation(`/clients/${clientId}/questionnaire-workspace?direction=${createForm.direction}`);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Or upload spreadsheet / PDF instead
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white text-xs font-semibold h-8 shadow-xs"
                >
                  {createMutation.isPending ? "Instantiating Controls..." : "Create & Open Workspace"}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!questionnaireToDelete} onOpenChange={(open) => !open && setQuestionnaireToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questionnaire?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{questionnaireToDelete?.name}</b>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              Delete Questionnaire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
