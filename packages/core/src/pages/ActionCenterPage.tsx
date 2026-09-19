import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
  Bot,
  Play,
  Check,
  X,
  AlertTriangle,
  Clock,
  Shield,
  ShieldAlert,
  Loader2,
  Users,
  Sparkles,
  Zap,
  CheckCircle2,
  Filter,
  Send,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  RefreshCw,
  FileText,
  AlertCircle,
  TrendingUp,
  Inbox,
  CheckCheck,
  Building2,
  BookOpen,
  HelpCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function ActionCenterPage() {
  const { selectedClientId, setSelectedClientId } = useClientContext();
  const [location, setLocation] = useLocation();

  // Extract from URL query param if present, e.g. /action-center?clientId=18
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlClientId = searchParams.get("clientId") ? parseInt(searchParams.get("clientId")!, 10) : null;

  // List available clients for selector & fallback
  const { data: clientsList, isLoading: clientsLoading } = trpc.clients.list.useQuery(undefined, { retry: false });

  // Resolve clientId: URL query > context > first client in list
  const clientId = selectedClientId || urlClientId || (Array.isArray(clientsList) && clientsList.length > 0 ? (clientsList[0].id as number) : 0);

  // Sync to context if we resolved one and context didn't have it
  useEffect(() => {
    if (clientId && (!selectedClientId || selectedClientId !== clientId)) {
      setSelectedClientId(clientId);
    }
  }, [clientId, selectedClientId, setSelectedClientId]);

  const utils = trpc.useContext();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);
  const [delegateDialogAction, setDelegateDialogAction] = useState<any | null>(null);
  const [delegatedAgent, setDelegatedAgent] = useState<string>("sla_agent");
  const [delegateNotes, setDelegateNotes] = useState<string>("");
  const [showGuideDialog, setShowGuideDialog] = useState<boolean>(false);
  const [inspectingActionId, setInspectingActionId] = useState<number | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.sentinel.getStats.useQuery(
    { clientId },
    { enabled: clientId > 0, refetchInterval: 15000 }
  );

  const { data: actions, isLoading: actionsLoading } = trpc.sentinel.listActions.useQuery(
    { clientId, status: "pending", limit: 500 },
    { enabled: clientId > 0, refetchInterval: 15000 }
  );

  const actionDetailQuery = trpc.sentinel.getActionDetail.useQuery(
    { clientId, actionId: inspectingActionId! },
    { enabled: clientId > 0 && inspectingActionId !== null }
  );

  const { data: executedActions } = trpc.sentinel.listActions.useQuery(
    { clientId, status: "executed", limit: 100 },
    { enabled: clientId > 0 }
  );

  // Mutations
  const runNow = trpc.sentinel.runNow.useMutation({
    onSuccess: (res) => {
      toast.success("Autonomous scan complete", {
        description: `Sentinels completed proactive audit. ${res?.findings ?? 0} total findings detected.`,
      });
      utils.sentinel.listActions.invalidate({ clientId });
      utils.sentinel.getStats.invalidate({ clientId });
    },
    onError: (err) => toast.error("Scan failed", { description: err.message }),
  });

  const updateCadence = trpc.sentinel.updateCadence.useMutation({
    onSuccess: (res) => {
      toast.success("Autonomous patrol cadence updated", {
        description: `Sentinels will now patrol every ${res.schedule}.`,
      });
      utils.sentinel.getStats.invalidate({ clientId });
    },
    onError: (err) => toast.error("Failed to update cadence", { description: err.message }),
  });

  const reviewAction = trpc.sentinel.reviewSentinelAction.useMutation({
    onSuccess: () => {
      toast.success("Action applied", { description: "Recommendation approved and logged to audit trail." });
      utils.sentinel.listActions.invalidate({ clientId });
      utils.sentinel.getStats.invalidate({ clientId });
      setDelegateDialogAction(null);
    },
    onError: (err) => toast.error("Execution failed", { description: err.message }),
  });

  const batchReview = trpc.sentinel.batchReviewActions.useMutation({
    onSuccess: (res) => {
      toast.success("Batch action applied", { description: `Successfully processed ${res.processed} items.` });
      setSelectedActionIds([]);
      utils.sentinel.listActions.invalidate({ clientId });
      utils.sentinel.getStats.invalidate({ clientId });
    },
    onError: (err) => toast.error("Batch review failed", { description: err.message }),
  });

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] p-8 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-sm">
          <Bot className="w-7 h-7 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Select an Organization</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          Choose a client workspace to view proactive sentinel findings and pending action proposals.
        </p>
        {Array.isArray(clientsList) && clientsList.length > 0 ? (
          <div className="w-full">
            <Select
              onValueChange={(val) => {
                const id = parseInt(val, 10);
                setSelectedClientId(id);
                setLocation(`/action-center?clientId=${id}`);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue placeholder="Choose an organization..." />
              </SelectTrigger>
              <SelectContent>
                {clientsList.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.portalTitle || c.name || `Client #${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Loading organizations...</p>
        )}
      </div>
    );
  }

  // Category predicates
  const isPolicyAction = (a: any) => {
    const botId = a.metadata?.botId || "";
    const typeStr = (a.type || "").toLowerCase();
    const titleStr = (a.title || "").toLowerCase();
    return botId === "policy-steward" || typeStr.includes("policy") || titleStr.includes("policy");
  };

  const isRiskAction = (a: any) => {
    const botId = a.metadata?.botId || "";
    const typeStr = (a.type || "").toLowerCase();
    const titleStr = (a.title || "").toLowerCase();
    return (
      botId === "risk-watchdog" ||
      botId === "vulnerability-sentinel" ||
      typeStr.includes("risk") ||
      typeStr.includes("vuln") ||
      titleStr.includes("risk") ||
      titleStr.includes("treatment") ||
      titleStr.includes("vulnerability") ||
      titleStr.includes("cve")
    );
  };

  const isSlaAction = (a: any) => {
    const botId = a.metadata?.botId || "";
    const typeStr = (a.type || "").toLowerCase();
    const titleStr = (a.title || "").toLowerCase();
    return (
      botId === "sla-hound" ||
      botId === "compliance-sentinel" ||
      botId === "bc-guardian" ||
      typeStr.includes("sla") ||
      typeStr.includes("questionnaire") ||
      typeStr.includes("evidence") ||
      typeStr.includes("dsar") ||
      typeStr.includes("bc") ||
      titleStr.includes("questionnaire") ||
      titleStr.includes("evidence") ||
      titleStr.includes("dsar") ||
      titleStr.includes("nis2") ||
      titleStr.includes("bc plan") ||
      titleStr.includes("sla")
    );
  };

  // Filter actions by category
  const filteredActions = (actions || []).filter((action: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "critical") return action.priority === "critical";
    if (activeTab === "policies") return isPolicyAction(action);
    if (activeTab === "risks") return isRiskAction(action);
    if (activeTab === "slas") return isSlaAction(action);
    return true;
  });

  const toggleSelectAction = (id: number) => {
    setSelectedActionIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAllFiltered = () => {
    if (selectedActionIds.length === filteredActions.length) {
      setSelectedActionIds([]);
    } else {
      setSelectedActionIds(filteredActions.map((a: any) => a.id));
    }
  };
  const toggleSelectAll = selectAllFiltered;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner - Clean, High-Contrast Modern Enterprise Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Proactive Action Center
              </h1>
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-xs px-2.5 py-0.5 font-bold">
                100% Human Sign-Off
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
              Autonomous sentinels continuously patrol your policies, vendor risks, audit evidence, and appetite thresholds. Every proposed remediation requires explicit human review and approval.
            </p>
          </div>

          {/* Quick Actions / Org & Cadence Control */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Organization Selector */}
            {Array.isArray(clientsList) && clientsList.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-xs">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">Org:</span>
                <Select
                  value={String(clientId)}
                  onValueChange={(val) => {
                    const id = parseInt(val, 10);
                    setSelectedClientId(id);
                    setLocation(`/action-center?clientId=${id}`);
                  }}
                >
                  <SelectTrigger className="h-7 min-w-[130px] max-w-[190px] bg-transparent border-0 text-slate-900 dark:text-white text-xs font-bold focus:ring-0">
                    <SelectValue placeholder="Select org..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800">
                    {clientsList.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.portalTitle || c.name || `Client #${c.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cadence Selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-xs">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">Cadence:</span>
              <Select
                value={stats?.cadence || "daily"}
                onValueChange={(val) => updateCadence.mutate({ clientId, schedule: val })}
              >
                <SelectTrigger className="h-7 w-[120px] bg-transparent border-0 text-slate-900 dark:text-white text-xs font-bold focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800">
                  <SelectItem value="15m">Every 15 min</SelectItem>
                  <SelectItem value="30m">Every 30 min</SelectItem>
                  <SelectItem value="hourly">Every 1 Hour</SelectItem>
                  <SelectItem value="6h">Every 6 Hours</SelectItem>
                  <SelectItem value="12h">Every 12 Hours</SelectItem>
                  <SelectItem value="daily">Daily (24h)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowGuideDialog(true)}
              className="rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2 font-bold text-xs shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              How It Works
            </Button>

            <Button
              onClick={() => runNow.mutate({ clientId })}
              disabled={runNow.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-2 font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              {runNow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {runNow.isPending ? "Patrolling..." : "Run Proactive Scan Now"}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row - Crisp High-Contrast Cards with Colored Accent Stripes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Pending Approvals
            </CardDescription>
            <CardTitle className="text-3xl font-black text-slate-950 dark:text-white flex items-center justify-between mt-1">
              {stats?.totalPending ?? 0}
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Inbox className="w-5 h-5" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 dark:text-slate-400 pt-0">
            Awaiting executive or compliance review
          </CardContent>
        </Card>

        {/* Critical Gaps */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Critical Gaps
            </CardDescription>
            <CardTitle className="text-3xl font-black text-rose-700 dark:text-rose-400 flex items-center justify-between mt-1">
              {stats?.criticalCount ?? 0}
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-rose-700/80 dark:text-rose-400/80 pt-0 font-medium">
            Immediate audit or risk exposure
          </CardContent>
        </Card>

        {/* Warnings & SLAs */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Warnings & SLAs
            </CardDescription>
            <CardTitle className="text-3xl font-black text-slate-950 dark:text-white flex items-center justify-between mt-1">
              {stats?.warningCount ?? 0}
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 dark:text-slate-400 pt-0">
            Upcoming expiration & clause gaps
          </CardContent>
        </Card>

        {/* Executed Remediations */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Executed Remediations
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700 dark:text-emerald-400 flex items-center justify-between mt-1">
              {stats?.executedCount ?? 0}
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCheck className="w-5 h-5" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 dark:text-slate-400 pt-0">
            Remediated with logged human sign-off
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Batch Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: "All Findings", count: actions?.length ?? 0 },
            { key: "critical", label: "Critical Priority", count: actions?.filter((a: any) => a.priority === "critical").length ?? 0 },
            { key: "policies", label: "Policies & Clauses", count: actions?.filter(isPolicyAction).length ?? 0 },
            { key: "risks", label: "Risks & Threats", count: actions?.filter(isRiskAction).length ?? 0 },
            { key: "slas", label: "SLAs & Evidence", count: actions?.filter(isSlaAction).length ?? 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === tab.key 
                  ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" 
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Batch Bar */}
        {filteredActions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllFiltered}
              className="text-xs sm:text-sm rounded-xl h-9 px-3.5 font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              {selectedActionIds.length === filteredActions.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedActionIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => batchReview.mutate({ clientId, actionIds: selectedActionIds, decision: "approved" })}
                  disabled={batchReview.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm rounded-xl h-9 px-4 font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Approve ({selectedActionIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchReview.mutate({ clientId, actionIds: selectedActionIds, decision: "rejected" })}
                  disabled={batchReview.isPending}
                  className="text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 dark:hover:bg-rose-950 text-xs sm:text-sm rounded-xl h-9 px-4 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Dismiss ({selectedActionIds.length})
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Cards Queue */}
      {actionsLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Patrolling and retrieving active recommendations...</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">All Clear — No Pending Approvals</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 mb-6">
            The sentinel bot fleet has not detected any unaddressed compliance breaches, overdue policies, or unassigned items for this workspace.
          </p>
          <Button
            onClick={() => runNow.mutate({ clientId })}
            disabled={runNow.isPending}
            variant="outline"
            className="rounded-xl font-bold text-xs gap-2 border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Trigger Patrol Check
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredActions.map((action: any) => {
            const meta = typeof action.metadata === "string" ? JSON.parse(action.metadata || "{}") : (action.metadata || {});
            const isSelected = selectedActionIds.includes(action.id);
            const isCritical = action.priority === "critical";

            // Determine bot identity with high-contrast accessible badges
            let botBadge = { 
              name: "Sentinel Bot", 
              icon: Bot, 
              color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800" 
            };
            if (action.type.includes("policy") || (action.title || "").toLowerCase().includes("policy")) {
              botBadge = { 
                name: "Policy Steward", 
                icon: Layers, 
                color: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800" 
              };
            } else if (action.type.includes("risk") || (action.title || "").toLowerCase().includes("risk")) {
              botBadge = { 
                name: "Risk Watchdog", 
                icon: AlertTriangle, 
                color: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800" 
              };
            } else if (action.type.includes("vuln")) {
              botBadge = { 
                name: "Vuln Sentinel", 
                icon: ShieldAlert, 
                color: "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800" 
              };
            } else if (action.type.includes("sla") || action.type.includes("questionnaire")) {
              botBadge = { 
                name: "SLA Hound", 
                icon: Clock, 
                color: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700" 
              };
            }

            const BotIcon = botBadge.icon;

            return (
              <Card
                key={action.id}
                className={`rounded-2xl transition-all border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/20"
                    : isCritical
                    ? "border-l-4 border-l-rose-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectAction(action.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer"
                      />
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border ${botBadge.color}`}>
                        <BotIcon className="w-4 h-4" />
                        {botBadge.name}
                      </span>
                      <Badge
                        className={`text-xs uppercase font-extrabold px-3 py-1 shadow-xs tracking-wider ${
                          isCritical
                            ? "bg-rose-600 text-white"
                            : action.priority === "high"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {action.priority || "MEDIUM"}
                      </Badge>
                      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
                        Detected: {action.createdAt ? new Date(action.createdAt).toLocaleDateString() : "Recently"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setInspectingActionId(action.id)}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-extrabold rounded-xl h-9 px-4 text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-all border border-slate-800 dark:border-slate-200"
                      >
                        <Eye className="w-4 h-4 text-sky-400 dark:text-sky-600 shrink-0" />
                        <span className="font-extrabold">View Details</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "approved" })}
                        disabled={reviewAction.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" /> Approve Fix
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDelegateDialogAction(action)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <UserCheck className="w-4 h-4" /> Delegate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "rejected" })}
                        disabled={reviewAction.isPending}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl h-9 w-9 p-0 flex items-center justify-center cursor-pointer transition-colors"
                        title="Dismiss recommendation"
                      >
                        <X className="w-4.5 h-4.5" />
                      </Button>
                    </div>
                  </div>

                  <CardTitle 
                    onClick={() => setInspectingActionId(action.id)}
                    className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mt-2.5 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors flex items-center gap-2.5 group"
                  >
                    <span>{action.title}</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 text-blue-600 dark:text-blue-400 transition-opacity shrink-0" />
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0">
                  {/* AI Rationale Box - High Contrast Accessible Insight Alert */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 border border-blue-200/80 dark:border-blue-900/60 leading-relaxed">
                    <div className="flex items-center gap-2 font-medium text-blue-950 dark:text-blue-200 mb-2 text-xs sm:text-sm">
                      <Sparkles className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      Sentinel Analysis & Findings:
                    </div>
                    <div className="text-slate-900 dark:text-slate-100 text-sm sm:text-base font-medium leading-relaxed">
                      {action.aiRationale || action.description}
                    </div>
                  </div>

                  {/* Fix Preview - High Contrast Diff Card */}
                  {meta.fixType === "policy_clause_addition" && meta.suggestedAddition && (
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 overflow-hidden shadow-xs mt-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2.5 flex items-center justify-between">
                        <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                          <span className="w-4.5 h-4.5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs leading-none">+</span>
                          Proposed Addition: {meta.clauseTitle || "New Policy Section"}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2.5 py-0.5 rounded-full">
                          Ready to Merge
                        </span>
                      </div>
                      <pre className="text-sm font-mono text-emerald-400 bg-slate-950 dark:bg-black p-4 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto selection:bg-emerald-800">
                        {meta.suggestedAddition}
                      </pre>
                      <div className="bg-slate-50 dark:bg-slate-900 border-t border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        Approving this fix will automatically append this clause into the policy document and generate a compliance log entry.
                      </div>
                    </div>
                  )}

                  {/* Residual Risk Metrics */}
                  {meta.residualScore && meta.appetite && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-sm mt-3">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        Residual Risk: <span className="font-black text-rose-600 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">{meta.residualScore}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        Appetite Limit: <span className="font-black text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-md">{meta.appetite}</span>
                      </div>
                      <div className="text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-semibold ml-auto flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Breaches accepted risk threshold
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delegation Dialog */}
      <Dialog open={!!delegateDialogAction} onOpenChange={(open) => !open && setDelegateDialogAction(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Delegate Sentinel Action
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Assign this finding as a formal task to a specific autonomous agent or team lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white text-xs block mb-1">Target Finding:</span>
              <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed break-words">
                {delegateDialogAction?.title}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                Delegate to Agent:
              </label>
              <Select value={delegatedAgent} onValueChange={setDelegatedAgent}>
                <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <SelectItem value="policy_agent">Policy Reviewer Bot</SelectItem>
                  <SelectItem value="risk_triage_agent">Risk Triage Agent</SelectItem>
                  <SelectItem value="sla_agent">SLA & Follow-Up Agent</SelectItem>
                  <SelectItem value="evidence_agent">Evidence Intake Collector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                Reviewer Instructions / Notes:
              </label>
              <Textarea
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
                placeholder="Add instructions or specific context for the assignee..."
                className="text-xs min-h-[95px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500 font-normal leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => setDelegateDialogAction(null)}
              className="rounded-xl h-9 px-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!delegateDialogAction) return;
                reviewAction.mutate({
                  clientId,
                  actionId: delegateDialogAction.id,
                  decision: "approved",
                  assigneeType: "agent",
                  assignedAgent: delegatedAgent,
                  customNotes: delegateNotes,
                });
              }}
              disabled={reviewAction.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {reviewAction.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Confirm & Delegate Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Document & Finding Inspector Dialog */}
      <Dialog open={inspectingActionId !== null} onOpenChange={(open) => !open && setInspectingActionId(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-2xl">
          {actionDetailQuery.isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Retrieving full document records and compliance history...</p>
            </div>
          ) : actionDetailQuery.data ? (
            (() => {
              const detail = actionDetailQuery.data;
              const act = detail.action;
              const ent = detail.entity;
              const meta = act.metadata || {};

              return (
                <div className="space-y-5">
                  <DialogHeader className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                          <Bot className="w-4 h-4" />
                          {act.type || "Sentinel Finding"}
                        </span>
                        <Badge className={`text-xs uppercase font-extrabold px-3 py-1 ${
                          act.priority === "critical" ? "bg-rose-600 text-white" : act.priority === "high" ? "bg-amber-600 text-white" : "bg-slate-700 text-white"
                        }`}>
                          {act.priority || "MEDIUM"}
                        </Badge>
                      </div>

                      {ent?.deepLink && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInspectingActionId(null);
                            setLocation(ent.deepLink);
                          }}
                          className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs sm:text-sm font-bold rounded-xl h-9 px-4 flex items-center gap-2 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open in Full Editor
                        </Button>
                      )}
                    </div>

                    <DialogTitle className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white leading-tight mt-1">
                      {act.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Action ID #{act.id} • Created {act.createdAt ? new Date(act.createdAt).toLocaleString() : "Recently"}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Document & Record Details */}
                  {ent ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {ent.title || ent.name || "Source Entity Record"}
                          </h4>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {ent.status || "Active"}
                        </span>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-xs uppercase font-bold text-slate-400 block mb-0.5">Version</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{ent.version || "1.0"}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-xs uppercase font-bold text-slate-400 block mb-0.5">Last Tested</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {ent.lastTestedDate ? new Date(ent.lastTestedDate).toLocaleDateString() : "Never Tested"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-xs uppercase font-bold text-slate-400 block mb-0.5">Next Test Due</span>
                          <span className="font-black text-rose-600 dark:text-rose-400">
                            {ent.nextTestDate ? new Date(ent.nextTestDate).toLocaleDateString() : "Unscheduled"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-xs uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{ent.status || "Active"}</span>
                        </div>
                      </div>

                      {/* Full Plan / Document Body */}
                      <div className="space-y-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                          Document Content & Operating Procedures:
                        </span>
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans shadow-inner">
                          {ent.content || "Standard operating procedures for disaster recovery and operational continuity."}
                        </div>
                      </div>

                      {/* Associated Strategies / Scenarios if present */}
                      {Array.isArray(ent.strategies) && ent.strategies.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                            Associated Continuity Strategies ({ent.strategies.length}):
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {ent.strategies.map((strat: any) => (
                              <div key={strat.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm flex items-center justify-between gap-3">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{strat.strategy_type || "Strategy"}</span>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{strat.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-blue-600 block">RTO: {strat.rto_target || "N/A"}</span>
                                  <span className="text-xs font-medium text-slate-400 block">RPO: {strat.rpo_target || "N/A"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm">
                      No linked document found directly in database. Showing Sentinel diagnostic data below.
                    </div>
                  )}

                  {/* Sentinel AI Analysis & Impact */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                    <div className="flex items-center gap-2 font-black text-blue-950 dark:text-blue-200 text-sm sm:text-base">
                      <Sparkles className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      Sentinel AI Rationale & Regulatory Context:
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium">
                      {act.aiRationale || act.description}
                    </p>
                    {meta.nis2Article && (
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5">
                          NIS2 Article {meta.nis2Article}
                        </Badge>
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          Requires regular testing of business continuity and incident response plans.
                        </span>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sm:justify-between">
                    <Button
                      size="sm"
                      onClick={() => setInspectingActionId(null)}
                      className="rounded-xl h-10 px-4 text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
                    >
                      Close
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const targetAct = act;
                          setInspectingActionId(null);
                          setDelegateDialogAction(targetAct);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <UserCheck className="w-4 h-4" /> Delegate Task...
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          reviewAction.mutate({ clientId, actionId: act.id, decision: "approved" });
                          setInspectingActionId(null);
                        }}
                        disabled={reviewAction.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" /> Approve Fix
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              );
            })()
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Unable to load action details.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Educational User Guide Dialog */}
      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 sm:p-8">
          <DialogHeader className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                  Action Center — How It Works
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Autonomous sentinel patrols with strict 100% Human-in-the-Loop approval
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4 text-xs">
            {/* Section 1: Concept */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Proactive Patrol vs. Passive Compliance
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Traditional compliance systems are passive databases waiting for human audits. ComplianceOS runs a background heartbeat that periodically inspects your live database (every 15m, 1h, Daily, or on-demand). When gaps or deadline breaches are detected, the autonomous bots generate actionable proposals with exact fix diffs, AI rationales, and priority scores.
              </p>
            </div>

            {/* Section 2: The 6 Bots */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                2. The 6 Autonomous Sentinel Bots
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Policy Steward
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Inspects policy text for missing mandatory clauses (MFA in Access Control, 72h regulatory breach SLAs in Incident Response) and flags stalled reviews (&gt;21d) or overdue annual reviews (&gt;365d).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Risk Watchdog
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Watches board-approved risk appetite thresholds (e.g. score &gt; 6). Escalates residual appetite breaches, overdue mitigation treatments, and unassigned high-impact orphan risks.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Vulnerability Sentinel
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Monitors active CVEs against remediation SLAs (7d Critical, 14d High, 30d Medium). Automatically computes overdue exposure age and generates emergency patching work items.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> SLA Hound
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Tracks real-time statutory clocks: vendor security questionnaires, GDPR DSAR 30-day windows, expiring vendor contracts entering notice periods, and NIS2 24h incident reporting.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Compliance Sentinel
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Tracks evidence validity dates. Flags evidence records expiring within 30 days or already expired to ensure continuous audit readiness across SOC 2 and ISO 27001.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-500" /> BC Guardian
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Validates operational resilience. Flags disaster recovery and business continuity plans that have never been tested or have exceeded their 12-month test window (NIS2 Art. 21.2.c).
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Reviewer Actions */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                3. Human-in-the-Loop Remediation Controls
              </h4>
              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold shrink-0">
                    Approve Fix
                  </span>
                  <span>
                    Applies the bot's proposed fix directly (e.g. appends missing MFA/72h clause to the policy) or generates an official tracked Work Item.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold shrink-0">
                    Delegate
                  </span>
                  <span>
                    Opens assignment modal to route the task to a named colleague or specialized autonomous agent (e.g. SLA Agent, Risk Triage Agent) with custom notes.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold shrink-0">
                    Dismiss
                  </span>
                  <span>
                    Rejects the recommendation as an accepted risk or false positive. The deduplication engine prevents re-flagging for 7 days.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold shrink-0">
                    Batch Review
                  </span>
                  <span>
                    Click <strong>Select All</strong> to approve or dismiss multiple findings simultaneously.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Audit Trail */}
            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
              <h5 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Audit Trail &amp; SOC 2 / ISO 27001 Readiness
              </h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Every action is permanently recorded in the immutable <code className="text-blue-700 dark:text-blue-300 font-mono text-[10px]">governance_events</code> audit trail, logging the exact reviewer ID, timestamp, before/after states, and rationale for external auditors.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-between w-full">
            <span className="text-[11px] text-slate-400">
              Documentation: <code className="text-blue-600 dark:text-blue-400 font-mono">docs/ACTION_CENTER_USER_GUIDE.md</code>
            </span>
            <Button
              size="sm"
              onClick={() => setShowGuideDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
            >
              Got it, Close Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
