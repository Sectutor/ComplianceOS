/**
 * Sentinel Automation View — Unified command center for the Sentinel Bot Fleet,
 * Autopilot Cadence & Configuration, and the Action Inbox with human/bot work delegation.
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
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
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

interface SentinelAutomationViewProps {
  clientId: number;
}

interface BotDef {
  key: string;
  name: string;
  role: string;
  icon: any;
  cadence: string;
  color: string;
  description: string;
}

const BOTS: BotDef[] = [
  {
    key: "complianceSentinel",
    name: "Compliance Sentinel",
    role: "Score & Controls Auditor",
    icon: Shield,
    cadence: "Hourly",
    color: "from-blue-600 to-indigo-600",
    description: "Monitors framework score drops, failing automated tests, and unmapped controls.",
  },
  {
    key: "slaHound",
    name: "SLA Hound",
    role: "Lifecycle & Deadlines",
    icon: Clock,
    cadence: "Daily",
    color: "from-amber-600 to-orange-600",
    description: "Tracks expiring evidence, overdue policy reviews, vendor SLAs, and RACI gaps.",
  },
  {
    key: "riskWatchdog",
    name: "Risk Watchdog",
    role: "Risk & Appetite Guard",
    icon: AlertTriangle,
    cadence: "Daily",
    color: "from-rose-600 to-red-600",
    description: "Watches overdue treatments and residual risk levels breaching board appetite.",
  },
  {
    key: "vulnerabilitySentinel",
    name: "Vulnerability Sentinel",
    role: "CVE & Threat Hunter",
    icon: ShieldAlert,
    cadence: "Hourly",
    color: "from-purple-600 to-violet-600",
    description: "Audits critical CVE remediation SLAs (14-day SLA) and active exploit feeds.",
  },
  {
    key: "policySteward",
    name: "Policy Steward",
    role: "Governance & Policies",
    icon: Layers,
    cadence: "Weekly",
    color: "from-emerald-600 to-teal-600",
    description: "Tracks unapproved drafts, missing mandatory policies, and annual review cycles.",
  },
  {
    key: "bcGuardian",
    name: "BC Guardian",
    role: "Business Continuity",
    icon: Zap,
    cadence: "Weekly",
    color: "from-cyan-600 to-blue-600",
    description: "Monitors stale BCPs (>12 months), untested DR plans, and missing BIA reviews.",
  },
  {
    key: "anomalySpotter",
    name: "Anomaly Spotter",
    role: "Telemetry & Spikes",
    icon: Sparkles,
    cadence: "Hourly",
    color: "from-pink-600 to-rose-600",
    description: "Detects compliance metric anomalies and sudden security telemetry spikes.",
  },
];

const PRIORITY_VARIANT: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

const AGENT_TEAMMATES = [
  { id: "hermes", name: "Hermes", role: "Chief Compliance Orchestrator", avatar: "🧠" },
  { id: "sentinel", name: "Sentinel", role: "Continuous Control & Policy Auditor", avatar: "🛡️" },
  { id: "alex", name: "Alex", role: "Vendor Trust & SOC 2 Scout", avatar: "🕵️" },
  { id: "morgan", name: "Morgan", role: "Cloud & IaC Drift Remediator", avatar: "🛠️" },
  { id: "riley", name: "Riley", role: "Evidence Harvester & UAR Auditor", avatar: "📋" },
  { id: "nova", name: "Nova", role: "Incident Commander (NIS2 / DORA)", avatar: "🚨" },
  { id: "sasha", name: "Sasha", role: "Vulnerability Sentinel & Patch SLA", avatar: "🛡️" },
  { id: "tara", name: "Tara", role: "Privacy & GDPR/CCPA Officer", avatar: "⚖️" },
  { id: "elena", name: "Elena", role: "Audit Preparation & Auditor Liaison", avatar: "📑" },
  { id: "marcus", name: "Marcus", role: "Risk Assessment & BIA Modeler", avatar: "⚠️" },
  { id: "sam", name: "Sam", role: "Access Governor & Zero Trust", avatar: "🔐" },
];

export function SentinelAutomationView({ clientId }: SentinelAutomationViewProps) {
  const utils = trpc.useUtils();

  // Queries
  const { data: config, isLoading: configLoading } = trpc.autopilot.getConfig.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const { data: dynamicTeammates } = trpc.teammates.listTeammates.useQuery();

  const availableAgents = React.useMemo(() => {
    if (!dynamicTeammates || dynamicTeammates.length === 0) return AGENT_TEAMMATES;
    const dynamicFormatted = dynamicTeammates.map((tm: any) => ({
      id: tm.id,
      name: tm.name,
      role: tm.role,
      avatar: tm.avatar || "🤖",
    }));
    // Merge unique by name/id
    const ids = new Set(dynamicFormatted.map((a: any) => a.id));
    const staticFiltered = AGENT_TEAMMATES.filter((a) => !ids.has(a.id));
    return [...dynamicFormatted, ...staticFiltered];
  }, [dynamicTeammates]);

  const [inboxFilter, setInboxFilter] = useState<"pending_review" | "executed" | "rejected" | "all">("pending_review");

  const { data: actions, isLoading: actionsLoading, refetch: refetchActions } = trpc.sentinel.listActions.useQuery(
    { clientId, status: inboxFilter, limit: 100 },
    { enabled: !!clientId }
  );

  const { data: employees } = trpc.employees.list.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  // Local state for configuration
  const [enabled, setEnabled] = useState(true);
  const [schedule, setSchedule] = useState("daily");
  const [approvalMode, setApprovalMode] = useState("review");
  const [botModules, setBotModules] = useState<Record<string, boolean>>({});

  // Sync config state once loaded
  React.useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? true);
      setSchedule(config.schedule ?? "daily");
      setApprovalMode(config.approvalMode === "auto" ? "auto" : "review");
      setBotModules(config.modules || {});
    }
  }, [config]);

  // Collapsible Settings State (persisted)
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sentinel_settings_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSettingsExpanded = () => {
    setSettingsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sentinel_settings_expanded', String(next));
      } catch {}
      return next;
    });
  };

  // Delegation Modal State
  const [delegatingAction, setDelegatingAction] = useState<any | null>(null);
  const [delegationTarget, setDelegationTarget] = useState<"user" | "agent">("user");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("sentinel");
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [customNotes, setCustomNotes] = useState<string>("");

  // Mutations
  const updateConfig = trpc.autopilot.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Autopilot configuration updated");
      utils.autopilot.getConfig.invalidate({ clientId });
      utils.sentinel.listActions.invalidate({ clientId });
    },
    onError: (err) => toast.error(err.message),
  });

  const runNow = trpc.sentinel.runNow.useMutation({
    onSuccess: (res: any) => {
      toast.success("Sentinel sweep completed!", {
        description: `Inspected workspace. Found ${res?.findings ?? 0} notable observation(s).`,
      });
      utils.sentinel.listActions.invalidate({ clientId });
    },
    onError: (err) => toast.error(`Sweep failed: ${err.message}`),
  });

  const reviewAction = trpc.sentinel.reviewSentinelAction.useMutation({
    onSuccess: (_, vars) => {
      if (vars.decision === "approved") {
        toast.success("Action Approved & Work Item Created!", {
          description: vars.assigneeType === "agent"
            ? `Delegated to AI Agent (${vars.assignedAgent?.toUpperCase()}).`
            : "Assigned to team member with tracked deadline.",
        });
      } else {
        toast.info("Finding dismissed");
      }
      setDelegatingAction(null);
      utils.sentinel.listActions.invalidate({ clientId });
    },
    onError: (err) => toast.error(`Action failed: ${err.message}`),
  });

  const handleSaveConfig = () => {
    updateConfig.mutate({
      clientId,
      enabled,
      schedule: schedule as any,
      approvalMode: approvalMode as any,
      modules: botModules,
    });
  };

  const handleToggleBot = (botKey: string, currentVal: boolean) => {
    const nextModules = { ...botModules, [botKey]: !currentVal };
    setBotModules(nextModules);
    updateConfig.mutate({
      clientId,
      enabled,
      schedule: schedule as any,
      approvalMode: approvalMode as any,
      modules: nextModules,
    });
  };

  const handleOpenDelegation = (action: any) => {
    setDelegatingAction(action);
    setDelegationTarget("user");
    setSelectedAssigneeId(employees?.[0]?.id || null);
    setSelectedAgentId("sentinel");
    setDueInDays(14);
    setCustomNotes("");
  };

  const handleExecuteDelegation = () => {
    if (!delegatingAction) return;
    reviewAction.mutate({
      clientId,
      actionId: delegatingAction.id,
      decision: "approved",
      assigneeType: delegationTarget === "user" ? "employee" : "agent",
      assigneeId: delegationTarget === "user" ? (selectedAssigneeId || undefined) : undefined,
      assignedAgent: delegationTarget === "agent" ? selectedAgentId : undefined,
      dueInDays,
      customNotes,
    });
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Sentinel Autopilot & Action Inbox
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs">
                  Active Runtime
                </Badge>
              </h2>
              <p className="text-xs text-indigo-200/80">
                Continuous compliance bots observe your posture, flag gaps, and dispatch tasks to humans or AI teammates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSettingsExpanded}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-indigo-300" />
            <span>{settingsExpanded ? "Hide Settings" : "Configure Fleet & Cadence"}</span>
            {settingsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1.5 text-indigo-300" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1.5 text-indigo-300" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => runNow.mutate({ clientId })}
            disabled={runNow.isPending}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
          >
            {runNow.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-indigo-300" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5 text-indigo-300" />
            )}
            Run All Bots Now
          </Button>

          {settingsExpanded && (
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={updateConfig.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
            >
              {updateConfig.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Cadence
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Sentinel Fleet & Cadence Settings Card */}
      <Card className="border-border shadow-sm overflow-hidden transition-all">
        <div
          onClick={toggleSettingsExpanded}
          className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all select-none border-b border-border/60"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Specialized Sentinel Bots (7 Active) & Cadence Configuration
                </h3>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]">
                  {Object.values(botModules).filter((v) => v !== false).length} of 7 Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                One-time settings for bot activation, inspection cadence ({schedule}), and approval autonomy ({approvalMode === "auto" ? "Autopilot" : "Review"}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleSettingsExpanded();
              }}
              className="text-xs h-8 px-3 gap-1.5 font-medium border-border"
            >
              <span>{settingsExpanded ? "Collapse" : "Expand Settings"}</span>
              {settingsExpanded ? (
                <ChevronUp className="h-4 w-4 text-primary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {settingsExpanded && (
          <div className="p-6 space-y-6 animate-in fade-in-50 duration-200 bg-card">
            {/* Cadence & Autonomy Controls */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Autopilot Cadence & Policy Guardrails
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Enable Sentinel Fleet</Label>
                    <p className="text-[11px] text-muted-foreground">Wake bots on scheduled cadence</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Inspection Frequency
                  </Label>
                  <Select value={schedule} onValueChange={setSchedule}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly (Active Audit Mode)</SelectItem>
                      <SelectItem value="daily">Daily (Standard Protection)</SelectItem>
                      <SelectItem value="weekly">Weekly (Low Cadence)</SelectItem>
                      <SelectItem value="manual">Manual Trigger Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Approval Autonomy Mode
                  </Label>
                  <RadioGroup value={approvalMode} onValueChange={setApprovalMode} className="flex gap-3 pt-2">
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="review" id="mode-review" />
                      <Label htmlFor="mode-review" className="text-xs font-medium cursor-pointer">
                        Human Review
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="auto" id="mode-auto" />
                      <Label htmlFor="mode-auto" className="text-xs font-medium cursor-pointer">
                        Autopilot
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Sentinel Fleet Directory Grid */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  Bot Roster & Surface Scanners
                </h4>
                <Button
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={updateConfig.isPending}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {updateConfig.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Changes
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {BOTS.map((bot) => {
                  const Icon = bot.icon;
                  const isBotActive = botModules[bot.key] !== false;
                  return (
                    <Card
                      key={bot.key}
                      className={`relative overflow-hidden transition-all duration-200 border ${
                        isBotActive ? "border-primary/20 shadow-sm" : "border-border opacity-60 bg-muted/10"
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${bot.color} text-white shadow-sm`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-foreground leading-none">{bot.name}</h4>
                              <span className="text-[11px] text-muted-foreground">{bot.role}</span>
                            </div>
                          </div>
                          <Switch
                            checked={isBotActive}
                            onCheckedChange={() => handleToggleBot(bot.key, isBotActive)}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                          {bot.description}
                        </p>

                        <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Cadence: {bot.cadence}
                          </span>
                          <Badge variant={isBotActive ? "default" : "secondary"} className="text-[10px] py-0 px-1.5">
                            {isBotActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Action Inbox Section */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Action Inbox — Findings & Delegation Queue
              {actions && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {actions.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Review flagged findings and delegate resolution to human teammates or autonomous AI agents.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-muted p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setInboxFilter("pending_review")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  inboxFilter === "pending_review" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setInboxFilter("executed")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  inboxFilter === "executed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Executed
              </button>
              <button
                onClick={() => setInboxFilter("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  inboxFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Findings
              </button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchActions()}
              disabled={actionsLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${actionsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {actionsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!actionsLoading && (!actions || actions.length === 0) && (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <div className="p-3 bg-muted/50 rounded-2xl w-fit mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">No Pending Actions</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  The Sentinel fleet is continuously monitoring your compliance controls. You can click &quot;Run All Bots Now&quot; anytime to perform an on-demand audit.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runNow.mutate({ clientId })}
                disabled={runNow.isPending}
                className="mt-2 text-xs"
              >
                Trigger Live Sweep
              </Button>
            </div>
          )}

          {actions?.map((action: any) => {
            const meta = typeof action.metadata === "string" ? JSON.parse(action.metadata || "{}") : action.metadata || {};
            const isPending = action.status === "pending" || action.status === "pending_review";

            return (
              <div
                key={action.id}
                className="rounded-xl border border-border p-5 bg-card hover:border-primary/30 transition-all space-y-4 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={PRIORITY_VARIANT[action.priority] || PRIORITY_VARIANT.medium}>
                        {action.priority.toUpperCase()}
                      </Badge>
                      {meta.botId && (
                        <Badge variant="outline" className="text-[11px] font-mono border-primary/20 text-primary">
                          🤖 {meta.botId}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(action.createdAt).toLocaleString()}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          action.status === "executed"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                            : action.status === "rejected"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                        }
                      >
                        Status: {action.status}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-base text-foreground">{action.title}</h4>

                    <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Rationale & Root Cause:
                      </p>
                      {action.aiRationale}
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-start">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDelegation(action)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-xs"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        Approve & Assign
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          reviewAction.mutate({
                            clientId,
                            actionId: action.id,
                            decision: "approved",
                            assigneeType: "unassigned",
                          })
                        }
                        disabled={reviewAction.isPending}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Quick Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          reviewAction.mutate({
                            clientId,
                            actionId: action.id,
                            decision: "rejected",
                          })
                        }
                        disabled={reviewAction.isPending}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Delegation & Assignment Dialog */}
      <Dialog open={!!delegatingAction} onOpenChange={(open) => !open && setDelegatingAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Assign & Delegate Work Item
            </DialogTitle>
            <DialogDescription className="text-xs">
              Convert this Sentinel finding into an active work item and assign it to a team member or dispatch an autonomous AI teammate.
            </DialogDescription>
          </DialogHeader>

          {delegatingAction && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground line-clamp-1">{delegatingAction.title}</p>
                <p className="text-muted-foreground line-clamp-2">{delegatingAction.aiRationale}</p>
              </div>

              {/* Assignment Target Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Who should execute this?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDelegationTarget("user")}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      delegationTarget === "user"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4 text-indigo-600" />
                    <div>
                      <div className="text-xs">Team Member</div>
                      <div className="text-[10px] text-muted-foreground">Assign to Human</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDelegationTarget("agent")}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      delegationTarget === "agent"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Bot className="h-4 w-4 text-indigo-600" />
                    <div>
                      <div className="text-xs">Autonomous Agent</div>
                      <div className="text-[10px] text-muted-foreground">Dispatch Bot</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Assign to Human */}
              {delegationTarget === "user" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Assigned Team Member</Label>
                  <Select
                    value={selectedAssigneeId ? String(selectedAssigneeId) : ""}
                    onValueChange={(v) => setSelectedAssigneeId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee or owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp: any) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.firstName} {emp.lastName} ({emp.department || "Compliance"})
                        </SelectItem>
                      ))}
                      {(!employees || employees.length === 0) && (
                        <SelectItem value="0">Default Workspace Owner</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delegate to AI Agent */}
              {delegationTarget === "agent" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select AI Agent Teammate</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map((ag) => (
                        <SelectItem key={ag.id} value={ag.id}>
                          <span className="flex items-center gap-2">
                            <span>{ag.avatar}</span>
                            <span className="font-semibold">{ag.name}</span>
                            <span className="text-muted-foreground text-xs">— {ag.role}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Due Date in Days */}
              <div className="space-y-1.5">
                <Label className="text-xs">Due Timeline</Label>
                <Select value={String(dueInDays)} onValueChange={(v) => setDueInDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Days (Urgent)</SelectItem>
                    <SelectItem value="7">7 Days (Standard Sprint)</SelectItem>
                    <SelectItem value="14">14 Days (2 Weeks SLA)</SelectItem>
                    <SelectItem value="30">30 Days (Monthly Cycle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <Label className="text-xs">Reviewer Instructions / Custom Prompt (Optional)</Label>
                <Textarea
                  placeholder="e.g. Please renew the AWS SOC 2 bridge letter and upload it to the Evidence library."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDelegatingAction(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteDelegation}
              disabled={reviewAction.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {reviewAction.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Confirm & Dispatch Work Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
