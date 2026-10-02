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
import { Input } from "@complianceos/ui/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";
import {
  Bot,
  Play,
  Check,
  X,
  AlertTriangle,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  ArrowUpRight,
  UserCheck,
  User,
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
  MoreVertical,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { ActionEscalateDialog } from "@/components/action-center/ActionEscalateDialog";
import { ActionAcceptRiskDialog } from "@/components/action-center/ActionAcceptRiskDialog";
import { ActionAuditHistoryTimeline } from "@/components/action-center/ActionAuditHistoryTimeline";

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
  const [showGuideDialog, setShowGuideDialog] = useState<boolean>(false);
  const [inspectingActionId, setInspectingActionId] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"details" | "history">("details");

  // Escalation & Risk Acceptance Dialog States
  const [escalatingAction, setEscalatingAction] = useState<any | null>(null);
  const [acceptingRiskAction, setAcceptingRiskAction] = useState<any | null>(null);

  // Delegation Modal States (Human vs Agent with HITL Reviewer)
  const [delegateDialogAction, setDelegateDialogAction] = useState<any | null>(null);
  const [delegationTab, setDelegationTab] = useState<"human" | "agent">("human");
  const [assignedStakeholderId, setAssignedStakeholderId] = useState<string>("");
  const [raciRole, setRaciRole] = useState<"responsible" | "accountable" | "consulted" | "informed">("responsible");
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [humanReviewerId, setHumanReviewerId] = useState<string>("");
  const [delegatedAgent, setDelegatedAgent] = useState<string>("policy_agent");
  const [delegateNotes, setDelegateNotes] = useState<string>("");

  // Incident Promotion Modal States
  const [promoteIncidentAction, setPromoteIncidentAction] = useState<any | null>(null);
  const [incidentTitle, setIncidentTitle] = useState<string>("");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [incidentDescription, setIncidentDescription] = useState<string>("");
  const [incidentIsSignificant, setIncidentIsSignificant] = useState<boolean>(false);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.sentinel.getStats.useQuery(
    { clientId },
    { enabled: clientId > 0, refetchInterval: 15000 }
  );

  const { data: actions, isLoading: actionsLoading } = trpc.sentinel.listActions.useQuery(
    { clientId, status: "all", limit: 500 },
    { enabled: clientId > 0, refetchInterval: 15000 }
  );

  const { data: clientInfo } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: clientId > 0 }
  );

  const { data: stakeholdersData } = trpc.risks.getStakeholders.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const stakeholders = Array.isArray(stakeholdersData) ? stakeholdersData : [];

  const actionDetailQuery = trpc.sentinel.getActionDetail.useQuery(
    { clientId, actionId: inspectingActionId! },
    { enabled: clientId > 0 && inspectingActionId !== null }
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

  const delegateActionMutation = trpc.sentinel.delegateAction.useMutation({
    onSuccess: (res) => {
      toast.success("Action delegated successfully", {
        description: res.status === "awaiting_human_review"
          ? "Autonomous agent staged a patch; finding is now held in Awaiting Human Review."
          : `Assigned to ${res.target || res.agent}. RACI & audit log recorded.`,
      });
      utils.sentinel.listActions.invalidate({ clientId });
      utils.sentinel.getStats.invalidate({ clientId });
      setDelegateDialogAction(null);
    },
    onError: (err) => toast.error("Delegation failed", { description: err.message }),
  });

  const promoteToIncidentMutation = trpc.sentinel.promoteToIncident.useMutation({
    onSuccess: (res) => {
      toast.success("Finding promoted to Security Incident", {
        description: `Official Incident #${res.incidentId || 'Created'} recorded with statutory reporting countdowns.`,
      });
      utils.sentinel.listActions.invalidate({ clientId });
      utils.sentinel.getStats.invalidate({ clientId });
      setPromoteIncidentAction(null);
    },
    onError: (err) => toast.error("Incident promotion failed", { description: err.message }),
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

  // Filter actions by tab
  const filteredActions = (actions || []).filter((action: any) => {
    if (activeTab === "all") {
      return !["executed", "rejected"].includes(action.status);
    }
    if (activeTab === "awaiting_review") return action.status === "awaiting_human_review";
    if (activeTab === "pending") return action.status === "pending";
    if (activeTab === "delegated") return action.status === "delegated_human" || action.status === "delegated_agent";
    if (activeTab === "escalated") return action.status === "escalated";
    if (activeTab === "risk_accepted") return action.status === "risk_accepted";
    if (activeTab === "executed") return action.status === "executed";
    if (activeTab === "critical") return action.priority === "critical" && !["executed", "rejected"].includes(action.status);
    if (activeTab === "policies") return isPolicyAction(action) && !["executed", "rejected"].includes(action.status);
    if (activeTab === "risks") return isRiskAction(action) && !["executed", "rejected"].includes(action.status);
    if (activeTab === "slas") return isSlaAction(action) && !["executed", "rejected"].includes(action.status);
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

  const openDelegateModal = (action: any) => {
    setDelegateDialogAction(action);
    setDelegationTab("human");
    setAssignedStakeholderId(stakeholders.length > 0 ? stakeholders[0].id : "");
    setRaciRole("responsible");
    setDueInDays(14);
    setHumanReviewerId(stakeholders.length > 0 ? stakeholders[0].id : "");
    setDelegateNotes("");

    // Set contextual agent default
    if (isPolicyAction(action)) setDelegatedAgent("policy_agent");
    else if (action.type.includes("vuln")) setDelegatedAgent("vuln_remediator");
    else if (isRiskAction(action)) setDelegatedAgent("risk_triage_agent");
    else if (isSlaAction(action)) setDelegatedAgent("sla_agent");
    else setDelegatedAgent("evidence_agent");
  };

  const openPromoteIncidentModal = (action: any) => {
    setPromoteIncidentAction(action);
    setIncidentTitle(action.title || "Security Finding");
    setIncidentSeverity(action.priority === "critical" ? "critical" : "high");
    setIncidentDescription(action.aiRationale || action.description || "");
    setIncidentIsSignificant(action.priority === "critical");
  };

  const handleConfirmDelegation = () => {
    if (!delegateDialogAction) return;

    if (delegationTab === "human") {
      const selectedStakeholder = stakeholders.find((s: any) => s.id === assignedStakeholderId);
      if (!selectedStakeholder) {
        toast.error("Please select a team member from your organization.");
        return;
      }

      delegateActionMutation.mutate({
        clientId,
        actionId: delegateDialogAction.id,
        delegationType: "human",
        assigneeType: selectedStakeholder.source === "employee" ? "employee" : "user",
        assigneeId: Number(selectedStakeholder.originalId),
        assigneeName: `${selectedStakeholder.firstName || ''} ${selectedStakeholder.lastName || ''}`.trim() || selectedStakeholder.email,
        raciRole,
        dueInDays,
        customNotes: delegateNotes,
      });
    } else {
      // Agent delegation with HITL gate
      const selectedReviewer = stakeholders.find((s: any) => s.id === humanReviewerId);
      if (!selectedReviewer) {
        toast.error("Please select a mandatory Human-in-the-Loop reviewer for this autonomous agent.");
        return;
      }

      delegateActionMutation.mutate({
        clientId,
        actionId: delegateDialogAction.id,
        delegationType: "agent",
        assignedAgent: delegatedAgent,
        reviewerUserId: Number(selectedReviewer.originalId),
        reviewerName: `${selectedReviewer.firstName || ''} ${selectedReviewer.lastName || ''}`.trim() || selectedReviewer.email,
        dueInDays,
        customNotes: delegateNotes,
      });
    }
  };

  const handleConfirmPromoteIncident = () => {
    if (!promoteIncidentAction) return;
    if (!incidentTitle.trim()) {
      toast.error("Please provide an incident title.");
      return;
    }

    promoteToIncidentMutation.mutate({
      clientId,
      actionId: promoteIncidentAction.id,
      title: incidentTitle.trim(),
      severity: incidentSeverity,
      description: incidentDescription.trim(),
      isSignificant: incidentIsSignificant,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="content-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                <Bot className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                Proactive Action Center
              </h1>
              <span className="badge-active">
                100% Human-in-the-Loop Sign-Off
              </span>
            </div>
            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              Autonomous sentinels continuously patrol policies, vendor risks, SLAs, and appetite thresholds. Every proposed remediation requires explicit human review, tiered escalation, or formal risk acceptance.
            </p>
          </div>

          {/* Quick Actions / Org & Cadence Control */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Organization Selector */}
            {Array.isArray(clientsList) && clientsList.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-2xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Org:</span>
                <Select
                  value={String(clientId)}
                  onValueChange={(val) => {
                    const id = parseInt(val, 10);
                    setSelectedClientId(id);
                    setLocation(`/action-center?clientId=${id}`);
                  }}
                >
                  <SelectTrigger className="h-7 min-w-[130px] max-w-[190px] bg-transparent border-0 text-slate-900 text-xs font-medium focus:ring-0">
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
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-2xl px-3 py-1.5">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Cadence:</span>
              <Select
                value={stats?.cadence || "daily"}
                onValueChange={(val) => updateCadence.mutate({ clientId, schedule: val })}
              >
                <SelectTrigger className="h-7 w-[120px] bg-transparent border-0 text-slate-900 text-xs font-medium focus:ring-0">
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
              className="btn-outline rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              How It Works
            </Button>

            <Button
              onClick={() => runNow.mutate({ clientId })}
              disabled={runNow.isPending}
              className="btn-primary rounded-xl px-4 py-2 text-xs flex items-center gap-2 cursor-pointer"
            >
              {runNow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {runNow.isPending ? "Patrolling..." : "Run Proactive Scan Now"}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row - 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Pending Triage */}
        <div className="content-card border-l-4 border-l-blue-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
            Pending Triage
          </div>
          <div className="text-2xl font-semibold text-blue-950 dark:text-blue-100 flex items-center justify-between">
            {(stats?.totalPending ?? 0).toLocaleString()}
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting triage &amp; initial routing</div>
        </div>

        {/* Awaiting Review (HITL) */}
        <div className="content-card border-l-4 border-l-amber-500 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Awaiting Review (HITL)
          </div>
          <div className="text-2xl font-semibold text-amber-950 dark:text-amber-100 flex items-center justify-between">
            {(stats?.awaitingReviewCount ?? 0).toLocaleString()}
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Staged patches ready for sign-off</div>
        </div>

        {/* Critical Gaps */}
        <div className="content-card border-l-4 border-l-rose-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">
            Critical Priority
          </div>
          <div className="text-2xl font-semibold text-rose-600 flex items-center justify-between">
            {(stats?.criticalCount ?? 0).toLocaleString()}
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Appetite &amp; SLA breaches</div>
        </div>

        {/* Escalated & Delegated */}
        <div className="content-card border-l-4 border-l-indigo-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Active Delegations
          </div>
          <div className="text-2xl font-semibold text-indigo-950 dark:text-indigo-100 flex items-center justify-between">
            {((stats?.delegatedCount ?? 0) + (stats?.escalatedCount ?? 0)).toLocaleString()}
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Assigned to RACI or DPO/CISO</div>
        </div>

        {/* Executed Remediations */}
        <div className="content-card border-l-4 border-l-emerald-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Remediated
          </div>
          <div className="text-2xl font-semibold text-emerald-600 flex items-center justify-between">
            {(stats?.executedCount ?? 0).toLocaleString()}
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Logged with audit sign-off</div>
        </div>
      </div>

      {/* Tabs & Batch Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: "all", label: "All Active", count: (actions || []).filter((a: any) => !["executed", "rejected"].includes(a.status)).length },
            { key: "awaiting_review", label: "Awaiting Review (HITL)", count: stats?.awaitingReviewCount ?? 0, highlight: true },
            { key: "pending", label: "Pending", count: stats?.totalPending ?? 0 },
            { key: "delegated", label: "Delegated", count: stats?.delegatedCount ?? 0 },
            { key: "escalated", label: "Escalated", count: stats?.escalatedCount ?? 0 },
            { key: "risk_accepted", label: "Risk Accepted", count: stats?.riskAcceptedCount ?? 0 },
            { key: "critical", label: "Critical", count: stats?.criticalCount ?? 0 },
            { key: "policies", label: "Policies", count: (actions || []).filter(isPolicyAction).length },
            { key: "risks", label: "Risks", count: (actions || []).filter(isRiskAction).length },
            { key: "slas", label: "SLAs", count: (actions || []).filter(isSlaAction).length },
            { key: "executed", label: "Remediated", count: stats?.executedCount ?? 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "tab-active shadow-xs"
                  : "tab-inactive"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                activeTab === tab.key 
                  ? "bg-white/20 text-white" 
                  : tab.highlight && tab.count > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                {tab.count.toLocaleString()}
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
              className="btn-outline text-xs rounded-xl h-8 px-3"
            >
              {selectedActionIds.length === filteredActions.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedActionIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => batchReview.mutate({ clientId, actionIds: selectedActionIds, decision: "approved" })}
                  disabled={batchReview.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl h-8 px-3 font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Approve ({selectedActionIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchReview.mutate({ clientId, actionIds: selectedActionIds, decision: "rejected" })}
                  disabled={batchReview.isPending}
                  className="text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 dark:hover:bg-rose-950 text-xs rounded-xl h-8 px-3 font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Dismiss ({selectedActionIds.length})
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
          <h3 className="text-base font-bold text-slate-900 dark:text-white">All Clear — No Items in this View</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 mb-6">
            The sentinel bot fleet has not detected any unaddressed compliance breaches, overdue policies, or pending approvals under this filter.
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
            const isAwaitingReview = action.status === "awaiting_human_review";
            const isEscalated = action.status === "escalated";
            const isDelegatedHuman = action.status === "delegated_human";
            const isDelegatedAgent = action.status === "delegated_agent";
            const isRiskAccepted = action.status === "risk_accepted";
            const isExecuted = action.status === "executed";

            // Determine bot identity badge
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
              <div
                key={action.id}
                className={`content-card transition-all ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50"
                    : isAwaitingReview
                    ? "border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
                    : isEscalated
                    ? "border-l-4 border-l-rose-600 bg-rose-50/20 dark:bg-rose-950/10"
                    : isCritical
                    ? "border-l-4 border-l-rose-600"
                    : ""
                }`}
              >
                {/* Status Banners */}
                {isAwaitingReview && (
                  <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>HITL Remediation Gate:</strong> Autonomous agent staged a patch. Explicit human review and approval is required before applying to live systems.
                      </span>
                    </div>
                    <Badge className="bg-amber-600 text-white font-bold text-[10px] shrink-0">
                      Sign-Off Required
                    </Badge>
                  </div>
                )}

                {isEscalated && (
                  <div className="mb-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Escalated to Tier {action.escalationLevel || 2} ({action.escalatedToRole || 'Leadership'}: {action.escalatedToName || 'Officer'}):</strong> {action.escalationReason || 'Under executive oversight.'}
                      </span>
                    </div>
                    {action.incidentId && (
                      <Badge className="bg-rose-600 text-white font-bold text-[10px] shrink-0">
                        Incident #{action.incidentId}
                      </Badge>
                    )}
                  </div>
                )}

                {isDelegatedHuman && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Delegated to team member (RACI: <strong>{action.metadata?.raciRole?.toUpperCase() || 'RESPONSIBLE'}</strong>) • Due: {action.dueAt ? new Date(action.dueAt).toLocaleDateString() : 'In 14 days'}
                      </span>
                    </div>
                  </div>
                )}

                {isDelegatedAgent && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Assigned to Agent [<strong>{action.assignedAgent || 'AI Bot'}</strong>] • Mandatory Reviewer: {action.reviewerUserId ? 'Assigned' : 'Required'}
                      </span>
                    </div>
                  </div>
                )}

                {isRiskAccepted && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-between gap-3 text-xs text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Formally Accepted Risk until {action.riskAcceptedUntil ? new Date(action.riskAcceptedUntil).toLocaleDateString() : 'Scheduled Review'}:</strong> {action.riskAcceptanceRationale || 'Risk accepted by management'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Top Row */}
                <div className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectAction(action.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer"
                      />
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${botBadge.color}`}>
                        <BotIcon className="w-3.5 h-3.5" />
                        {botBadge.name}
                      </span>
                      <Badge
                        className={`text-xs uppercase font-medium px-2.5 py-0.5 tracking-wider font-bold ${
                          isCritical || action.priority === "critical"
                            ? "bg-red-600 text-white"
                            : action.priority === "high"
                            ? "bg-orange-500 text-white"
                            : action.priority === "medium"
                            ? "bg-yellow-400 text-yellow-900"
                            : action.priority === "low"
                            ? "bg-green-500 text-white"
                            : "bg-yellow-400 text-yellow-900"
                        }`}
                      >
                        {action.priority || "MEDIUM"}
                      </Badge>
                      <span className="text-xs text-slate-500 font-normal">
                        Detected: {action.createdAt ? new Date(action.createdAt).toLocaleDateString() : "Recently"}
                      </span>
                    </div>

                    {/* Card Actions Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => {
                          setInspectorTab("details");
                          setInspectingActionId(action.id);
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950/80 dark:hover:bg-blue-900 dark:text-blue-200 rounded-xl h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Details</span>
                      </Button>

                      {/* Awaiting Review: HITL approve/reject buttons */}
                      {isAwaitingReview && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "approved" })}
                            disabled={reviewAction.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Review &amp; Approve Patch (HITL)
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setEscalatingAction(action)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 rounded-xl h-8 px-2.5 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Escalate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "rejected" })}
                            disabled={reviewAction.isPending}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                            title="Reject staged patch"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {/* Standard Pending Workflow Buttons */}
                      {action.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "approved" })}
                            disabled={reviewAction.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve Fix
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDelegateModal(action)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Delegate
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setEscalatingAction(action)}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Escalate
                          </Button>

                          {/* More Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-8 w-8 p-0 flex items-center justify-center text-slate-500 hover:text-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                                title="More actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs">
                              <DropdownMenuItem
                                onClick={() => setAcceptingRiskAction(action)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Accept Risk (ISO 27005)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPromoteIncidentModal(action)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer font-medium"
                              >
                                <AlertTriangle className="w-4 h-4 text-rose-500" />
                                Promote to Security Incident
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                              <DropdownMenuItem
                                onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "rejected" })}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                              >
                                <X className="w-4 h-4 text-slate-400" />
                                Dismiss Recommendation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}

                      {/* Escalated / Delegated / Risk Accepted buttons */}
                      {(isEscalated || isDelegatedHuman || isRiskAccepted) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => reviewAction.mutate({ clientId, actionId: action.id, decision: "approved" })}
                            disabled={reviewAction.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Sign-Off / Close
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-8 w-8 p-0 flex items-center justify-center text-slate-500 hover:text-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs">
                              <DropdownMenuItem
                                onClick={() => setEscalatingAction(action)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 cursor-pointer font-medium"
                              >
                                <ArrowUpRight className="w-4 h-4 text-amber-500" />
                                Escalate to Higher Tier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAcceptingRiskAction(action)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer font-medium"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Accept Risk (ISO 27005)
                              </DropdownMenuItem>
                              {!action.incidentId && (
                                <DropdownMenuItem
                                  onClick={() => openPromoteIncidentModal(action)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 cursor-pointer font-medium"
                                >
                                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                                  Promote to Incident
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 mt-2.5 leading-snug cursor-pointer hover:text-blue-600 hover:underline transition-colors flex items-center gap-2.5 group">
                    <span>{action.title}</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity shrink-0" />
                  </div>
                </div>

                <div className="space-y-3.5 pt-0">
                  {/* AI Rationale Box */}
                  <div className="highlight-section">
                    <div className="flex items-center gap-2 font-medium text-black dark:text-slate-200 mb-2 text-xs sm:text-sm">
                      <Sparkles className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                      Sentinel Analysis &amp; Findings:
                    </div>
                    <div className="text-black dark:text-slate-200 text-sm sm:text-base font-medium leading-relaxed">
                      {action.aiRationale || action.description}
                    </div>
                  </div>

                  {/* Fix Preview - High Contrast Diff Card */}
                  {meta.fixType === "policy_clause_addition" && meta.suggestedAddition && (
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 overflow-hidden shadow-xs mt-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2 flex items-center justify-between">
                        <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs leading-none">+</span>
                          Proposed Addition: {meta.clauseTitle || "New Policy Section"}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full">
                          Ready to Merge
                        </span>
                      </div>
                      <pre className="text-xs sm:text-sm font-mono text-emerald-400 bg-slate-950 dark:bg-black p-4 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto selection:bg-emerald-800">
                        {meta.suggestedAddition}
                      </pre>
                      <div className="bg-slate-50 dark:bg-slate-900 border-t border-emerald-100 dark:border-emerald-900/40 px-4 py-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        Approving this fix will automatically append this clause into the policy document and generate a non-repudiable audit log entry.
                      </div>
                    </div>
                  )}

                  {/* Residual Risk Metrics */}
                  {meta.residualScore && meta.appetite && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs sm:text-sm mt-3">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        Residual Risk: <span className="font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">{meta.residualScore}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        Appetite Limit: <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">{meta.appetite}</span>
                      </div>
                      <div className="text-rose-700 dark:text-rose-400 text-xs font-semibold ml-auto flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Breaches accepted risk threshold
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Hybrid Delegation Dialog (Human RACI vs Agent HITL) */}
      <Dialog open={!!delegateDialogAction} onOpenChange={(open) => !open && setDelegateDialogAction(null)}>
        <DialogContent className="max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Delegate Sentinel Action
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Assign this finding to a human team member with a RACI role, or dispatch an autonomous AI agent with mandatory human sign-off.
            </DialogDescription>
          </DialogHeader>

          {/* Segmented Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setDelegationTab("human")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                delegationTab === "human"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Team Member (Human Assignee)
            </button>
            <button
              type="button"
              onClick={() => setDelegationTab("agent")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                delegationTab === "agent"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Autonomous Agent (with HITL)
            </button>
          </div>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Target Summary */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider block mb-0.5">Target Finding:</span>
              <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                {delegateDialogAction?.title}
              </p>
            </div>

            {delegationTab === "human" ? (
              <>
                {/* Human Assignee Selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                    Assignee (Team Member):
                  </label>
                  {stakeholders.length > 0 ? (
                    <Select value={assignedStakeholderId} onValueChange={setAssignedStakeholderId}>
                      <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium">
                        <SelectValue placeholder="Select team member..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-56">
                        {stakeholders.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold">{s.firstName} {s.lastName}</span>
                              <span className="text-slate-400 font-normal">({s.jobTitle || s.role || s.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-amber-600">No stakeholders registered for this workspace.</p>
                  )}
                </div>

                {/* RACI Role & SLA Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                      RACI Matrix Role:
                    </label>
                    <Select value={raciRole} onValueChange={(val: any) => setRaciRole(val)}>
                      <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsible">Responsible (R) - Direct Owner</SelectItem>
                        <SelectItem value="accountable">Accountable (A) - Final Sign-Off</SelectItem>
                        <SelectItem value="consulted">Consulted (C) - Expert Advisor</SelectItem>
                        <SelectItem value="informed">Informed (I) - Notification Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                      Remediation SLA:
                    </label>
                    <Select value={String(dueInDays)} onValueChange={(val) => setDueInDays(parseInt(val, 10))}>
                      <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days (Urgent)</SelectItem>
                        <SelectItem value="14">14 Days (Standard)</SelectItem>
                        <SelectItem value="30">30 Days (Extended)</SelectItem>
                        <SelectItem value="60">60 Days (Strategic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Agent Selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                    Select Autonomous Bot:
                  </label>
                  <Select value={delegatedAgent} onValueChange={setDelegatedAgent}>
                    <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="policy_agent">Policy Reviewer Bot (Drafts missing policy clauses)</SelectItem>
                      <SelectItem value="risk_triage_agent">Risk Triage Agent (Assesses likelihood &amp; mitigations)</SelectItem>
                      <SelectItem value="sla_agent">SLA &amp; Follow-Up Agent (Tracks questionnaires &amp; notice dates)</SelectItem>
                      <SelectItem value="evidence_agent">Evidence Intake Collector (Collects fresh audit artifacts)</SelectItem>
                      <SelectItem value="vuln_remediator">Vulnerability Sentinel (Proposes patch advisory)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mandatory HITL Reviewer */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                      Mandatory Human-in-the-Loop Reviewer:
                    </label>
                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                      Required by EU AI Act / NIST
                    </span>
                  </div>
                  {stakeholders.length > 0 ? (
                    <Select value={humanReviewerId} onValueChange={setHumanReviewerId}>
                      <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                        <SelectValue placeholder="Select human reviewer..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {stakeholders.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold">{s.firstName} {s.lastName}</span>
                              <span className="text-slate-400 font-normal">({s.jobTitle || s.role})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-amber-600">No stakeholders available.</p>
                  )}
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    The bot will prepare a concrete patch, but no changes will be applied to the live database until this designated human signs off.
                  </p>
                </div>
              </>
            )}

            {/* Handover Instructions */}
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                {delegationTab === "human" ? "Assignment Instructions / Context:" : "Agent Directives & Prompt Directives:"}
              </label>
              <Textarea
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
                placeholder={delegationTab === "human" ? "Provide specific instructions or guidelines for this team member..." : "Add guidance for the agent's patch draft..."}
                className="text-xs min-h-[85px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDelegateDialogAction(null)}
              className="rounded-xl h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelegation}
              disabled={delegateActionMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {delegateActionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              {delegationTab === "human" ? "Assign to Team Member" : "Dispatch Agent with HITL Gate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog Component */}
      <ActionEscalateDialog
        action={escalatingAction}
        clientId={clientId}
        clientInfo={clientInfo}
        open={!!escalatingAction}
        onOpenChange={(open) => !open && setEscalatingAction(null)}
        onSuccess={() => {
          utils.sentinel.listActions.invalidate({ clientId });
          utils.sentinel.getStats.invalidate({ clientId });
          setEscalatingAction(null);
        }}
      />

      {/* Accept Risk Dialog Component */}
      <ActionAcceptRiskDialog
        action={acceptingRiskAction}
        clientId={clientId}
        open={!!acceptingRiskAction}
        onOpenChange={(open) => !open && setAcceptingRiskAction(null)}
        onSuccess={() => {
          utils.sentinel.listActions.invalidate({ clientId });
          utils.sentinel.getStats.invalidate({ clientId });
          setAcceptingRiskAction(null);
        }}
      />

      {/* Promote to Incident Dialog */}
      <Dialog open={!!promoteIncidentAction} onOpenChange={(open) => !open && setPromoteIncidentAction(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Promote to Security Incident
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Elevates this finding into an official incident record with statutory NIS2 (24h) and GDPR (72h) notification timers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                Incident Title:
              </label>
              <Input
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="e.g. Critical Ransomware Exposure on Core Server"
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                  Severity:
                </label>
                <Select value={incidentSeverity} onValueChange={(val: any) => setIncidentSeverity(val)}>
                  <SelectTrigger className="text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Impact</SelectItem>
                    <SelectItem value="medium">Medium Impact</SelectItem>
                    <SelectItem value="high">High Impact</SelectItem>
                    <SelectItem value="critical">Critical (P1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200">
                  <input
                    type="checkbox"
                    checked={incidentIsSignificant}
                    onChange={(e) => setIncidentIsSignificant(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <span className="font-semibold text-[11px]">NIS2 Significant Incident</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                Incident Description &amp; Scope:
              </label>
              <Textarea
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                placeholder="Describe detected symptoms, affected assets, and initial containment steps..."
                className="text-xs min-h-[90px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPromoteIncidentAction(null)}
              className="rounded-xl h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmPromoteIncident}
              disabled={promoteToIncidentMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {promoteToIncidentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Create Incident &amp; Start Clocks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Document & Finding Inspector Dialog with Audit History */}
      <Dialog open={inspectingActionId !== null} onOpenChange={(open) => !open && setInspectingActionId(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
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
                <div className="space-y-4">
                  <DialogHeader className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          {act.type || "Sentinel Finding"}
                        </span>
                        <Badge className={`text-xs uppercase font-extrabold px-2.5 py-0.5 ${
                          act.priority === "critical" ? "bg-rose-600 text-white" : act.priority === "high" ? "bg-amber-600 text-white" : "bg-slate-700 text-white"
                        }`}>
                          {act.priority || "MEDIUM"}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs capitalize">
                          Status: {act.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {ent?.deepLink && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInspectingActionId(null);
                            setLocation(ent.deepLink);
                          }}
                          className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl h-8 px-3.5 flex items-center gap-1.5 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in Full Editor
                        </Button>
                      )}
                    </div>

                    <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-white leading-tight mt-1">
                      {act.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Action ID #{act.id} • Created {act.createdAt ? new Date(act.createdAt).toLocaleString() : "Recently"}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Sub-tabs: Details vs Audit History */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setInspectorTab("details")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        inspectorTab === "details"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      Finding Details &amp; Diagnostics
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab("history")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                        inspectorTab === "history"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Audit Trail &amp; History
                    </button>
                  </div>

                  {inspectorTab === "details" ? (
                    <div className="space-y-4">
                      {/* Document & Record Details */}
                      {ent ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {ent.title || ent.name || "Source Entity Record"}
                              </h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {ent.status || "Active"}
                            </span>
                          </div>

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Version</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{ent.version || "1.0"}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Last Tested</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {ent.lastTestedDate ? new Date(ent.lastTestedDate).toLocaleDateString() : "Never Tested"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Next Test Due</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {ent.nextTestDate ? new Date(ent.nextTestDate).toLocaleDateString() : "Unscheduled"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{ent.status || "Active"}</span>
                            </div>
                          </div>

                          {/* Full Plan / Document Body */}
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              Document Content &amp; Operating Procedures:
                            </span>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans shadow-inner">
                              {ent.content || "Standard operating procedures and controls for this compliance record."}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                          No linked document found directly in database. Showing Sentinel diagnostic data below.
                        </div>
                      )}

                      {/* Sentinel AI Analysis & Impact */}
                      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 border border-blue-200/80 dark:border-blue-900/60 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200 text-xs">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          Sentinel AI Rationale &amp; Regulatory Context:
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 text-xs leading-relaxed font-medium">
                          {act.aiRationale || act.description}
                        </p>
                        {meta.nis2Article && (
                          <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5">
                              NIS2 Article {meta.nis2Article}
                            </Badge>
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Requires continuous verification and scheduled operational testing.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Audit History & Timeline Tab */
                    <div className="py-2">
                      <ActionAuditHistoryTimeline
                        actionId={act.id}
                        clientId={clientId}
                        initialCreatedAt={act.createdAt}
                      />
                    </div>
                  )}

                  <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectingActionId(null)}
                      className="rounded-xl h-9 px-4 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const target = act;
                          setInspectingActionId(null);
                          setEscalatingAction(target);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const target = act;
                          setInspectingActionId(null);
                          openDelegateModal(target);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Delegate Task...
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          reviewAction.mutate({ clientId, actionId: act.id, decision: "approved" });
                          setInspectingActionId(null);
                        }}
                        disabled={reviewAction.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Fix
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
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Action Center — Incident &amp; Remediation Architecture
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Autonomous sentinel patrols with strict 100% Human-in-the-Loop approval (NIST SP 800-61 / ISO 27001 / EU AI Act)
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
                Traditional compliance systems are passive databases waiting for annual audits. ComplianceOS runs continuous background sentinel patrols that inspect your live database against statutory regulations (NIS2, GDPR, SOC 2, ISO 27001). When gaps or risk breaches occur, sentinels generate concrete patch proposals with exact diffs, priority rankings, and AI rationales.
              </p>
            </div>

            {/* Section 2: Hybrid Delegation & Escalation */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                2. Enterprise Governance &amp; Remediation Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Hybrid Delegation &amp; RACI
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Assign actions to named team members with formal RACI roles (Responsible, Accountable, Consulted, Informed) and SLAs, or delegate to specialized AI agents.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Human-in-the-Loop (HITL) Gate
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Autonomous AI agents never apply patches directly to production without human consent. Agent work is staged in <code>Awaiting Review</code> for mandatory sign-off.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" /> 4-Tier Escalation Matrix
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Elevate unaddressed or severe findings through 4 structured tiers: Tier 1 (Admin), Tier 2 (DPO), Tier 3 (CISO), and Tier 4 (Board of Directors).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Formal Risk Acceptance (ISO 27005)
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Accept business risks with logged justification, compensating controls, and automatic 30/60/90/180-day sunset re-evaluations.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Audit Trail */}
            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
              <h5 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Immutable Audit Trail (SOC 2 CC7.3 / CC7.4 &amp; ISO 27001 A.5.28)
              </h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Every status transition, delegation hand-off, risk acceptance justification, and escalation is permanently logged in <code>autopilot_action_history</code> with actor signatures and timestamps.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end w-full">
            <Button
              size="sm"
              onClick={() => setShowGuideDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-4"
            >
              Got it, Close Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
