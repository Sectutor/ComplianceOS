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
import { Button } from "@complianceos/ui/ui/button";
import { Card } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
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
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Building2,
  ShieldCheck,
  X,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@complianceos/ui/ui/dropdown-menu";
import { format } from "date-fns";
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
  useQuestionnaireScore,
  getReadinessMeta,
  ScoreBadge,
  ScoreProgress,
  type QuestionnaireScoreResponse,
} from "./questionnaires/questionnaireApi.tsx";

type Direction = "inbound" | "outbound";

/** Per-row readiness score cell (isolated so hooks stay out of the map loop). */
function QuestionnaireScoreCell({ questionnaireId }: { questionnaireId: number }) {
  const { data, isLoading, isError } = useQuestionnaireScore(questionnaireId);
  if (isLoading) {
    return <div className="h-5 w-24 bg-muted/60 animate-pulse rounded-full" aria-label="Loading score" />;
  }
  const scoreResult = data as QuestionnaireScoreResponse | null | undefined;
  if (isError || !scoreResult?.score) {
    return <span className="text-muted-foreground text-xs font-mono">—</span>;
  }
  const meta = getReadinessMeta(scoreResult.score.readiness);
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <ScoreBadge score={scoreResult.score.complianceScore} readiness={scoreResult.score.readiness} tone={meta.tone} />
      <ScoreProgress value={scoreResult.score.complianceScore} tone={meta.tone} className="max-w-[110px]" />
    </div>
  );
}

export default function QuestionnairesDashboard() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0", 10);

  const [direction, setDirection] = useState<Direction>("inbound");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<any>(null);

  // Reset status filter and search query when switching direction
  useEffect(() => {
    setStatusFilter("all");
    setSearchQuery("");
  }, [direction]);

  const { data: questionnaires, refetch, isLoading } = trpc.questionnaire.list.useQuery(
    { clientId, direction },
    { enabled: !!clientId }
  );

  // Filtered list based on status and search query
  const filteredQuestionnaires = useMemo(() => {
    if (!questionnaires) return [];
    return questionnaires.filter(q => {
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      const qName = (q.name || "").toLowerCase();
      const senderOrVendor = ((q.senderName || q.vendorName || "") as string).toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || qName.includes(query) || senderOrVendor.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [questionnaires, statusFilter, searchQuery]);

  // Executive summary counts
  const stats = useMemo(() => {
    const total = questionnaires?.length || 0;
    const open = questionnaires?.filter(q => q.status === "open").length || 0;
    const inProgress = questionnaires?.filter(q => q.status === "in_progress").length || 0;
    const completed = questionnaires?.filter(q => q.status === "completed").length || 0;
    return { total, open, inProgress, completed };
  }, [questionnaires]);

  const deleteMutation = trpc.questionnaire.delete.useMutation({
    onSuccess: () => refetch()
  });

  const handleDelete = (q: any) => setQuestionnaireToDelete(q);

  const confirmDelete = async () => {
    if (questionnaireToDelete) {
      await deleteMutation.mutateAsync({ id: questionnaireToDelete.id });
      setQuestionnaireToDelete(null);
    }
  };

  const createDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs hover:shadow-md transition-all gap-2 text-xs h-9 px-4 rounded-xl">
          <Plus className="w-4 h-4" />
          {direction === "inbound" ? "New Inbound Assessment" : "New Vendor Assessment"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-border/80 p-1.5">
        <DropdownMenuItem
          className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
          onClick={() =>
            setLocation(`/clients/${clientId}/questionnaire-workspace?direction=${direction}`)
          }
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Upload className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Upload Spreadsheet / PDF</div>
            <div className="text-[10px] text-muted-foreground">Import XLSX, CSV, or document</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
          onClick={() =>
            setLocation(`/clients/${clientId}/questionnaire-workspace?mode=template&direction=${direction}`)
          }
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Start from Standard Template</div>
            <div className="text-[10px] text-muted-foreground">SIG Lite, CAIQ, Vanta Standard</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Trust & Vendor Security Assessments</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Security Questionnaires
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Automate customer security reviews and streamline third-party supplier risk evaluations with AI-assisted answers and evidence linking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PageGuide
              title="Security Questionnaires"
              description="Manage incoming customer RFPs and outgoing supplier security assessments."
              rationale="Streamlines vendor risk management and accelerates enterprise sales closing."
              howToUse={[
                { step: "Customer Questionnaires (Inbound)", description: "Answer security forms sent by prospective clients using AI copilot.", targetId: "dir-tab-inbound" },
                { step: "Vendor Assessments (Outbound)", description: "Send automated compliance questionnaires to third-party vendors.", targetId: "dir-tab-outbound" },
                { step: "Review & Score", description: "Audit readiness percentages and evidence traceability before exporting.", targetId: "quest-table-list" }
              ]}
              integrations={[
                { name: "Knowledge Base", description: "Autonomous answering engine." },
                { name: "Evidence Library", description: "Automatic control proof attachment." }
              ]}
            />
            {createDropdown}
          </div>
        </div>

        {/* Strategic Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{stats.total}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {direction === "inbound" ? "Total Inbound RFPs" : "Total Vendor Assessments"}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{stats.open}</p>
              <p className="text-xs font-medium text-muted-foreground">Open / Awaiting Action</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{stats.inProgress}</p>
              <p className="text-xs font-medium text-muted-foreground">In Progress / AI Drafting</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{stats.completed}</p>
              <p className="text-xs font-medium text-muted-foreground">Completed & Verified</p>
            </div>
          </Card>
        </div>

        {/* Direction Switcher (Inbound vs Outbound) */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="p-1 bg-muted/60 rounded-2xl border border-border/70 inline-flex shadow-xs">
              <button
                id="dir-tab-inbound"
                onClick={() => setDirection("inbound")}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                  direction === "inbound"
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Inbox className="h-4 w-4 text-blue-500" />
                <span>Customer Questionnaires (Inbound)</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-muted text-foreground">
                  {direction === "inbound" ? stats.total : questionnaires?.length ?? 0}
                </Badge>
              </button>

              <button
                id="dir-tab-outbound"
                onClick={() => setDirection("outbound")}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                  direction === "outbound"
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Send className="h-4 w-4 text-emerald-500" />
                <span>Vendor Risk Assessments (Outbound)</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-muted text-foreground">
                  {direction === "outbound" ? stats.total : 0}
                </Badge>
              </button>
            </div>

            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Showing {filteredQuestionnaires.length} of {stats.total} assessments</span>
            </div>
          </div>

          {/* Search Bar & Status Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search input with live query state */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search by title, ${direction === "inbound" ? "customer" : "vendor"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 bg-card/80 border-border/80 focus-visible:ring-primary/20 rounded-xl text-xs h-10 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Segmented Filters */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/70 text-xs flex-wrap">
              {[
                { id: "all", label: "All", count: stats.total },
                { id: "open", label: "Open", count: stats.open },
                { id: "in_progress", label: "In Progress", count: stats.inProgress },
                { id: "completed", label: "Completed", count: stats.completed },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                    statusFilter === s.id
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === s.id ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                  }`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card/80 backdrop-blur-md" id="quest-table-list">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
                  <TableHead className="py-3.5 px-5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Assessment Name
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Completion
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Compliance Score
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {direction === "inbound" ? "Customer / Sender" : "Vendor / Supplier"}
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Created
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Due Date
                  </TableHead>
                  <TableHead className="w-[60px] py-3.5 text-right pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/40">
                      <TableCell colSpan={8} className="py-5 px-5">
                        <div className="h-5 bg-muted/60 animate-pulse rounded-md w-3/4" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredQuestionnaires.length > 0 ? (
                  filteredQuestionnaires.map((q) => (
                    <TableRow
                      key={q.id}
                      onClick={() => setLocation(`/clients/${clientId}/questionnaires/${q.id}`)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 group"
                    >
                      <TableCell className="py-4 px-5 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {q.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>ID #{q.id}</span>
                              <span>•</span>
                              <span>{direction === "inbound" ? "Customer Form" : "Supplier Form"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                (q.progress ?? 0) >= 100
                                  ? "bg-emerald-500"
                                  : (q.progress ?? 0) > 0
                                  ? "bg-primary"
                                  : "bg-muted-foreground/30"
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, q.progress ?? 0))}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground/80 tabular-nums">
                            {q.progress ?? 0}%
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <QuestionnaireScoreCell questionnaireId={q.id} />
                      </TableCell>

                      <TableCell className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            q.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                              : q.status === "in_progress"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              q.status === "completed"
                                ? "bg-emerald-500"
                                : q.status === "in_progress"
                                ? "bg-primary animate-pulse"
                                : "bg-muted-foreground"
                            }`}
                          />
                          {q.status === "in_progress"
                            ? "In Progress"
                            : q.status === "completed"
                            ? "Completed"
                            : "Open"}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 text-xs font-medium text-foreground/80">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {q.senderName || q.vendorName || "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-xs text-muted-foreground font-mono">
                        {q.createdAt ? format(new Date(q.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>

                      <TableCell className="py-4 text-xs font-mono">
                        {q.dueDate ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(q.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-4 text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/80 p-1">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${clientId}/questionnaires/${q.id}`);
                              }}
                              className="rounded-lg text-xs font-medium cursor-pointer"
                            >
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open Workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              className="text-destructive rounded-lg text-xs font-medium cursor-pointer hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(q);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete Assessment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
                        <div className="h-16 w-16 bg-muted/60 border border-border/60 rounded-2xl flex items-center justify-center text-muted-foreground shadow-xs">
                          <FileText className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-base">
                            {searchQuery || statusFilter !== "all"
                              ? "No matching questionnaires found"
                              : "No questionnaires added yet"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {searchQuery || statusFilter !== "all"
                              ? "Try clearing your search query or switching your status filter tab."
                              : direction === "inbound"
                              ? "Upload an RFP spreadsheet or PDF you've received from an enterprise customer to start answering."
                              : "Send a standard security questionnaire (SIG, CAIQ, SOC2) to your third-party vendors."}
                          </p>
                        </div>
                        {searchQuery || statusFilter !== "all" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("all");
                            }}
                            className="text-xs rounded-xl border-border"
                          >
                            Reset Filters
                          </Button>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                setLocation(`/clients/${clientId}/questionnaire-workspace?direction=${direction}`)
                              }
                              className="text-xs rounded-xl font-semibold gap-1.5"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload Questionnaire
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setLocation(`/clients/${clientId}/questionnaire-workspace?mode=template&direction=${direction}`)
                              }
                              className="text-xs rounded-xl font-semibold gap-1.5 border-border"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                              Use Template
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!questionnaireToDelete} onOpenChange={(open) => !open && setQuestionnaireToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Questionnaire?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <b className="text-foreground">{questionnaireToDelete?.name}</b>?
              All mapped responses, AI answer drafts, and attached evidence will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-semibold"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
