import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
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
  CalendarClock,
  RotateCcw,
  Bell,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  useQuestionnaireScoresBatch,
  getReadinessMeta,
  ScoreBadge,
  ScoreProgress,
  type QuestionnaireScoreResponse,
} from "./questionnaires/questionnaireApi.tsx";
import { Framework90DayRoadmap } from "@/components/roadmap/Framework90DayRoadmap";
import { getQuestionnaireRoadmap } from "@/data/frameworkRoadmaps";

type Direction = "inbound" | "outbound";

/** Per-row readiness score cell — fed by the batched scoreAll query. */
function QuestionnaireScoreCell({
  scoreResult,
  isLoading,
}: {
  scoreResult: QuestionnaireScoreResponse | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-5 w-24 bg-muted/60 animate-pulse rounded-full" aria-label="Loading score" />;
  }
  if (!scoreResult?.score) {
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
  const [activeTab, setActiveTab] = useState<Direction | "roadmap">("inbound");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<any>(null);

  const selectTab = (tab: Direction | "roadmap") => {
    setActiveTab(tab);
    if (tab !== "roadmap") setDirection(tab);
  };

  // Reset status filter and search query when switching direction
  useEffect(() => {
    setStatusFilter("all");
    setSearchQuery("");
  }, [direction]);

  // Deep link: #quest-roadmap opens the roadmap tab directly
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#quest-roadmap") setActiveTab("roadmap");
  }, []);

  const { data: questionnaires, refetch, isLoading } = trpc.questionnaire.list.useQuery(
    { clientId, direction },
    { enabled: !!clientId }
  );

  // Per-direction totals for the tab badges (server-computed, both tabs at once).
  const { data: directionCounts } = trpc.questionnaire.counts.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  // Batched readiness scores — one round-trip for the whole visible list.
  const { data: scoreBatch, refetch: scoreBatchRefetch, isFetching: scoresLoading } = useQuestionnaireScoresBatch(
    { clientId, direction },
    { enabled: !!clientId }
  );
  const scoreById = useMemo(() => {
    const map = new Map<number, QuestionnaireScoreResponse>();
    for (const item of scoreBatch?.scores || []) {
      map.set(item.questionnaireId, item);
    }
    return map;
  }, [scoreBatch]);

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
    onSuccess: () => {
      toast.success("Questionnaire deleted");
      refetch();
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`)
  });

  const updateMutation = trpc.questionnaire.update.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire updated");
      refetch();
      // Batched scores may have shifted with a status change.
      scoreBatchRefetch();
    }
  });

  const sendReminderMutation = trpc.questionnaire.sendVendorReminder.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success(`Reminder emailed to ${data.recipient}`);
      } else {
        toast.warning("Reminder could not be emailed", {
          description: data.emailError || "Check your SMTP/SendGrid settings and re-invite the vendor.",
        });
      }
    },
    onError: (err) => toast.error(`Failed to send reminder: ${err.message}`)
  });

  const handleSendReminder = (q: any) => {
    sendReminderMutation.mutate({ questionnaireId: q.id, clientId });
  };

  const handleSetDueDate = (q: any, value: string) => {
    if (!value) return;
    const dueDate = new Date(`${value}T23:59:59`).toISOString();
    updateMutation.mutate({ id: q.id, clientId, dueDate });
  };

  const handleSetStatus = (q: any, status: string) => {
    if (q.status === status) return;
    updateMutation.mutate({ id: q.id, clientId, status: status as any });
  };

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
          {direction === "inbound" ? "Answer a Questionnaire" : "Send to a Vendor"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl shadow-lg border-border/80 p-1.5">
        {direction === "inbound" ? (
          <>
            <DropdownMenuItem
              className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
              onClick={() =>
                setLocation(`/clients/${clientId}/questionnaire-workspace?direction=inbound`)
              }
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Upload className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Upload the questionnaire you received</div>
                <div className="text-[10px] text-muted-foreground">The XLSX / CSV / PDF a customer sent you</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
              onClick={() =>
                setLocation(`/clients/${clientId}/questionnaire-workspace?mode=template&direction=inbound`)
              }
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Answer using a matching template</div>
                <div className="text-[10px] text-muted-foreground">Closest to what they sent — SIG Lite, CAIQ v4, SOC 2</div>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
              onClick={() =>
                setLocation(`/clients/${clientId}/questionnaire-workspace?mode=template&direction=outbound`)
              }
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Send a standard template to a vendor</div>
                <div className="text-[10px] text-muted-foreground">They answer via a secure link — SIG Lite, CAIQ v4, SOC 2</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-lg p-2.5 cursor-pointer font-medium text-xs flex items-center gap-2.5 hover:bg-muted"
              onClick={() =>
                setLocation(`/clients/${clientId}/questionnaire-workspace?direction=outbound`)
              }
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Upload className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Upload your own question set</div>
                <div className="text-[10px] text-muted-foreground">Your XLSX / CSV questions to send out</div>
              </div>
            </DropdownMenuItem>
          </>
        )}
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
              Two directions, one place: <span className="font-semibold text-blue-600 dark:text-blue-400">Inbound</span> — a customer sent you a questionnaire and you answer it; <span className="font-semibold text-emerald-600 dark:text-emerald-400">Outbound</span> — you send a questionnaire to a vendor and review their answers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PageGuide
              title="Security Questionnaires"
              description="One place for both directions: questionnaires you receive and questionnaires you send."
              rationale="Answer customer reviews faster with AI drafts from your Answer Library, and assess vendors with secure links, scoring, and findings."
              howToUse={[
                { step: "Inbound — a customer asked you", description: "Upload the file they sent or pick the closest template; AI drafts answers, you review and export it back.", targetId: "dir-tab-inbound" },
                { step: "Outbound — you ask a vendor", description: "Pick a template, enter the vendor's email; they answer via a secure link and you score the results.", targetId: "dir-tab-outbound" },
                { step: "Review & Score", description: "Track completion, readiness scores, findings, and due dates before exporting or following up.", targetId: "quest-table-list" }
              ]}
              integrations={[
                { name: "Answer Library", description: "Approved answers reused automatically on inbound questionnaires." },
                { name: "Vendor Findings", description: "Failed vendor answers become flagged findings with remediation deadlines." }
              ]}
            />
            {activeTab !== "roadmap" && createDropdown}
          </div>
        </div>

        {/* Strategic Overview Metric Cards — each stat carries its own accent
            gradient so the page reads inviting rather than clinical. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Layers,
              value: stats.total,
              label: direction === "inbound" ? "Received from customers" : "Sent to vendors",
              card: "from-blue-50 to-indigo-50/70 border-blue-200/70",
              chip: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25",
              valueText: "text-blue-700",
            },
            {
              icon: Clock,
              value: stats.open,
              label: direction === "inbound" ? "Open — waiting on you" : "Open — not sent yet",
              card: "from-amber-50 to-orange-50/70 border-amber-200/70",
              chip: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25",
              valueText: "text-amber-700",
            },
            {
              icon: Sparkles,
              value: stats.inProgress,
              label: "In Progress / AI Drafting",
              card: "from-violet-50 to-purple-50/70 border-violet-200/70",
              chip: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25",
              valueText: "text-violet-700",
            },
            {
              icon: CheckCircle2,
              value: stats.completed,
              label: direction === "inbound" ? "Completed & sent back" : "Completed & reviewed",
              card: "from-emerald-50 to-teal-50/70 border-emerald-200/70",
              chip: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
              valueText: "text-emerald-700",
            },
          ].map((s) => (
            <Card
              key={s.label}
              className={`p-4 flex items-center gap-4 border bg-gradient-to-br shadow-sm rounded-2xl hover:shadow-md transition-shadow ${s.card}`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${s.chip}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-2xl font-black tracking-tight ${s.valueText}`}>{s.value}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Direction Switcher (Inbound vs Outbound) */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="p-1 bg-muted/60 rounded-2xl border border-border/70 inline-flex shadow-xs">
              <button
                id="dir-tab-inbound"
                onClick={() => selectTab("inbound")}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-xl font-semibold text-xs transition-all duration-200 border ${
                  activeTab === "inbound"
                    ? "bg-blue-50 border-blue-300 text-blue-950 shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70"
                }`}
              >
                <Inbox className="h-4 w-4 text-blue-500" />
                <span className="flex flex-col items-start leading-tight text-left">
                  <span className="flex items-center gap-2">
                    Customer Questionnaires
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-blue-100 text-blue-700">
                      {directionCounts?.inbound ?? 0}
                    </Badge>
                  </span>
                  <span className={`text-[10px] font-normal ${activeTab === "inbound" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                    They asked — you answer &amp; send it back
                  </span>
                </span>
              </button>

              <button
                id="dir-tab-outbound"
                onClick={() => selectTab("outbound")}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-xl font-semibold text-xs transition-all duration-200 border ${
                  activeTab === "outbound"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70"
                }`}
              >
                <Send className="h-4 w-4 text-emerald-500" />
                <span className="flex flex-col items-start leading-tight text-left">
                  <span className="flex items-center gap-2">
                    Vendor Assessments
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-emerald-100 text-emerald-700">
                      {directionCounts?.outbound ?? 0}
                    </Badge>
                  </span>
                  <span className={`text-[10px] font-normal ${activeTab === "outbound" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    You ask — they answer via a secure link
                  </span>
                </span>
              </button>

              <button
                id="dir-tab-roadmap"
                onClick={() => selectTab("roadmap")}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-xl font-semibold text-xs transition-all duration-200 border ${
                  activeTab === "roadmap"
                    ? "bg-amber-50 border-amber-300 text-amber-950 shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70"
                }`}
              >
                <MapIcon className="h-4 w-4 text-amber-500" />
                <span className="flex flex-col items-start leading-tight text-left">
                  <span>90-Day Roadmap</span>
                  <span className={`text-[10px] font-normal ${activeTab === "roadmap" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    Your 12-week program plan
                  </span>
                </span>
              </button>
            </div>

            {activeTab !== "roadmap" && (
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <span>Showing {filteredQuestionnaires.length} of {stats.total} assessments</span>
              </div>
            )}
          </div>

          {activeTab !== "roadmap" && (
          <>
          {/* Direction explainer — removes the inbound/outbound ambiguity and
              gives first-time users an unambiguous "where to start" action. */}
          <div
            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
              direction === "inbound"
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                direction === "inbound"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {direction === "inbound" ? <Inbox className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {direction === "inbound"
                  ? "A customer sent you a security questionnaire — you fill it in and send it back."
                  : "You are assessing a vendor's security — they fill in the questionnaire you send."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {direction === "inbound"
                  ? "Where to start: upload the file they sent (XLSX / CSV / PDF) or pick the closest template. AI drafts answers from your Answer Library — you review, export, and return it."
                  : "Where to start: pick a standard template (SIG Lite, CAIQ v4, SOC 2…), enter the vendor's email, and they receive a secure link. Their answers come back here for you to score, flag, and follow up."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setLocation(
                  direction === "inbound"
                    ? `/clients/${clientId}/questionnaire-workspace?direction=inbound`
                    : `/clients/${clientId}/questionnaire-workspace?mode=template&direction=outbound`
                )
              }
              className={`shrink-0 font-semibold text-xs rounded-xl gap-1.5 ${
                direction === "inbound"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {direction === "inbound" ? <Upload className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {direction === "inbound" ? "Start answering" : "Send to a vendor"}
            </Button>
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
                        <QuestionnaireScoreCell
                          scoreResult={scoreById.get(q.id)}
                          isLoading={scoresLoading && !scoreById.size}
                        />
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
                          (() => {
                            const due = new Date(q.dueDate);
                            const isOverdue =
                              q.status !== "completed" && due.getTime() < Date.now();
                            return (
                              <div className={`flex items-center gap-1 ${isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-muted-foreground"}`}>
                                <Calendar className="h-3 w-3" />
                                <span>{format(due, "MMM d, yyyy")}</span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0 h-3.5 font-bold">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            );
                          })()
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
                          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/80 p-1">
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetStatus(q, "completed");
                              }}
                              className="rounded-lg text-xs font-medium cursor-pointer"
                            >
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetStatus(q, "in_progress");
                              }}
                              className="rounded-lg text-xs font-medium cursor-pointer"
                            >
                              <RotateCcw className="mr-2 h-3.5 w-3.5 text-amber-500" />
                              Reopen (In Progress)
                            </DropdownMenuItem>
                            <div
                              className="px-2.5 py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                <CalendarClock className="h-3 w-3" />
                                Due Date
                              </label>
                              <Input
                                type="date"
                                defaultValue={q.dueDate ? format(new Date(q.dueDate), "yyyy-MM-dd") : ""}
                                onChange={(e) => handleSetDueDate(q, e.target.value)}
                                className="h-8 text-xs rounded-lg"
                              />
                            </div>
                            {(q as any).direction === "outbound" && (q as any).vendorEmail && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendReminder(q);
                                }}
                                className="rounded-lg text-xs font-medium cursor-pointer"
                              >
                                <Bell className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                Send Reminder to Vendor
                              </DropdownMenuItem>
                            )}
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
                              ? "A customer sent you a questionnaire — upload the file they sent above to start answering."
                              : "You send it: use \"Send to a vendor\" above — pick a template, enter their email, and they answer via a secure link."}
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
          </>
          )}

          {/* Roadmap tab view — the 12-week program plan as a first-class
              view (same tab pattern as the vendor program guide), not a
              footnote at the bottom of the page. */}
          {activeTab === "roadmap" && (
            <div className="rounded-2xl border border-border/80 shadow-xs bg-card/80 backdrop-blur-md p-4" id="quest-roadmap">
              <Framework90DayRoadmap
                spec={getQuestionnaireRoadmap(clientId)}
                clientId={clientId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!questionnaireToDelete} onOpenChange={(open) => !open && setQuestionnaireToDelete(null)}>
        <AlertDialogContent className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-lg">
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
