// AutopilotDashboard — Main Compliance Autopilot dashboard
import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Separator } from "@complianceos/ui/ui/separator";
import {
  Zap,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Settings,
  RefreshCw,
  Activity,
  Shield,
  FileSearch,
  ListChecks,
} from "lucide-react";

interface AutopilotDashboardProps {
  clientId: number;
}

interface RunHistoryItem {
  id: string;
  status: "success" | "failed" | "running";
  startedAt: string;
  evidenceCollected: number;
  healthIssues?: number;
  gapsFound: number;
  tasksCreated: number;
  errorMessage?: string;
}

interface PendingAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
}

interface AutopilotConfig {
  enabled: boolean;
  mode: "auto" | "review";
  schedule: "hourly" | "daily" | "weekly" | "manual";
  modules: {
    evidence: boolean;
    health: boolean;
    gaps: boolean;
    tasks: boolean;
    report: boolean;
    notifications: boolean;
  };
  lastRunAt?: string;
  lastRunStatus?: string;
}

const MODULES = [
  { key: "evidence" as const, label: "Evidence", icon: <FileSearch className="h-4 w-4" /> },
  { key: "health" as const, label: "Health", icon: <Activity className="h-4 w-4" /> },
  { key: "gaps" as const, label: "Gaps", icon: <AlertTriangle className="h-4 w-4" /> },
  { key: "tasks" as const, label: "Tasks", icon: <ListChecks className="h-4 w-4" /> },
  { key: "report" as const, label: "Report", icon: <Shield className="h-4 w-4" /> },
  { key: "notifications" as const, label: "Notifications", icon: <Zap className="h-4 w-4" /> },
];

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getRunStatusIcon(status: string) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "running":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function AutopilotDashboard({ clientId }: AutopilotDashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { data: config, isLoading: configLoading, isError: configError, refetch: refetchConfig } =
    trpc.autopilot.getConfig.useQuery(
      { clientId },
      { enabled: clientId > 0 }
    );

  const { data: runHistory, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } =
    trpc.autopilot.getRunHistory.useQuery(
      { clientId, limit: 10 },
      { enabled: clientId > 0 }
    );

  const { data: pendingActions, isLoading: actionsLoading, isError: actionsError, refetch: refetchActions } =
    trpc.autopilot.getPendingActions.useQuery(
      { clientId },
      { enabled: clientId > 0 }
    );

  const updateConfigMutation = trpc.autopilot.updateConfig.useMutation({
    onSuccess: () => refetchConfig(),
  });

  const runNowMutation = trpc.autopilot.runNow.useMutation({
    onSuccess: () => {
      setIsRunning(false);
      refetchHistory();
      refetchActions();
    },
    onError: () => setIsRunning(false),
  });

  const approveActionMutation = trpc.autopilot.approveAction.useMutation({
    onSuccess: () => refetchActions(),
  });

  const rejectActionMutation = trpc.autopilot.rejectAction.useMutation({
    onSuccess: () => refetchActions(),
  });

  const [localModules, setLocalModules] = useState<AutopilotConfig["modules"] | null>(null);
  const [localMode, setLocalMode] = useState<"auto" | "review">("auto");
  const [localSchedule, setLocalSchedule] = useState<AutopilotConfig["schedule"]>("daily");

  // Sync local state when config loads
  React.useEffect(() => {
    if (config) {
      setLocalModules({ ...config.modules });
      setLocalMode(config.mode);
      setLocalSchedule(config.schedule);
    }
  }, [config]);

  const handleToggle = useCallback((checked: boolean) => {
    updateConfigMutation.mutate({ clientId, enabled: checked });
  }, [clientId, updateConfigMutation]);

  const handleRunNow = useCallback(() => {
    setIsRunning(true);
    runNowMutation.mutate({ clientId });
  }, [clientId, runNowMutation]);

  const handleSaveSettings = useCallback(() => {
    if (!localModules) return;
    updateConfigMutation.mutate({
      clientId,
      modules: localModules,
      mode: localMode,
      schedule: localSchedule,
    });
  }, [clientId, localModules, localMode, localSchedule, updateConfigMutation]);

  const handleModuleToggle = useCallback((key: keyof AutopilotConfig["modules"]) => {
    setLocalModules((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  }, []);

  const handleApprove = useCallback((actionId: string) => {
    approveActionMutation.mutate({ clientId, actionId });
  }, [clientId, approveActionMutation]);

  const handleReject = useCallback((actionId: string) => {
    rejectActionMutation.mutate({ clientId, actionId });
  }, [clientId, rejectActionMutation]);

  // Derive latest run stats from history
  const latestRun: RunHistoryItem | undefined = Array.isArray(runHistory) ? runHistory[0] : undefined;

  // ── Loading State ──
  if (configLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error State ──
  if (configError) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <p className="text-lg font-semibold">Failed to load Autopilot</p>
            <p className="text-sm text-muted-foreground mt-1">
              There was an error loading the autopilot configuration.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchConfig()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Never Configured / Setup Prompt ──
  if (!config) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-6 py-16">
          <div className="rounded-full bg-primary/10 p-6">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold">Compliance Autopilot</h2>
            <p className="text-muted-foreground mt-2">
              Automate evidence collection, health monitoring, gap analysis, and task creation — all on a schedule you control.
            </p>
          </div>
          <Button size="lg" onClick={() => handleToggle(true)}>
            <Zap className="h-5 w-5 mr-2" />
            Enable Autopilot
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${config.enabled ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                <Zap className={`h-6 w-6 ${config.enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">⚡ Compliance Autopilot</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${config.enabled ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm text-muted-foreground">
                    {config.enabled ? "Running" : "Paused"}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Schedule: {config.schedule.charAt(0).toUpperCase() + config.schedule.slice(1)}
                  </span>
                  {config.lastRunAt && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        Last run: {getRelativeTime(config.lastRunAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunNow}
                disabled={isRunning || !config.enabled}
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Run Now
              </Button>
              <Switch checked={config.enabled} onCheckedChange={handleToggle} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileSearch className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Evidence</span>
            </div>
            <p className="text-2xl font-bold">{latestRun?.evidenceCollected ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {latestRun ? "collected this run" : "no data yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Health</span>
            </div>
            <p className="text-2xl font-bold">{latestRun?.healthIssues ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {latestRun ? "issues found" : "no data yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Gaps</span>
            </div>
            <p className="text-2xl font-bold">{latestRun?.gapsFound ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {latestRun ? "found this run" : "no data yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ListChecks className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Tasks</span>
            </div>
            <p className="text-2xl font-bold">{latestRun?.tasksCreated ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {latestRun ? "created this run" : "no data yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Run History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Runs
            <Badge variant="secondary" className="text-xs ml-auto">
              Last {Array.isArray(runHistory) ? runHistory.length : 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                </div>
              ))}
            </div>
          ) : historyError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">Failed to load run history</p>
              <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          ) : !Array.isArray(runHistory) || runHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No runs yet. Configure and run autopilot to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {runHistory.map((run: RunHistoryItem) => (
                <div
                  key={run.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getRunStatusIcon(run.status)}
                  <span className="text-sm text-muted-foreground w-28 flex-shrink-0">
                    {new Date(run.startedAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm flex-1">
                    {run.status === "failed" ? (
                      <span className="text-red-500">{run.errorMessage || "Run failed"}</span>
                    ) : (
                      <span>
                        {run.evidenceCollected} evidence, {run.gapsFound} gaps, {run.tasksCreated} tasks
                      </span>
                    )}
                  </span>
                  <Badge
                    variant={run.status === "success" ? "default" : run.status === "failed" ? "destructive" : "secondary"}
                    className="text-[10px] h-5"
                  >
                    {run.status === "success" ? "Success" : run.status === "failed" ? "Failed" : "Running"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Actions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-16 rounded" />
                    <Skeleton className="h-7 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : actionsError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">Failed to load pending actions</p>
              <Button variant="outline" size="sm" onClick={() => refetchActions()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          ) : !Array.isArray(pendingActions) || pendingActions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm text-muted-foreground">
                No pending actions. Everything is up to date.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(pendingActions as PendingAction[]).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(action.id)}
                      disabled={approveActionMutation.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(action.id)}
                      disabled={rejectActionMutation.isPending}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Settings Panel ── */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setSettingsOpen(!settingsOpen)}>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
            <Badge variant="outline" className="text-xs ml-auto">
              {settingsOpen ? "Click to close" : "Click to expand"}
            </Badge>
          </CardTitle>
        </CardHeader>
        {settingsOpen && localModules && (
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-6">
              {/* Module Toggles */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Modules</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MODULES.map((mod) => (
                    <div key={mod.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`module-${mod.key}`}
                        checked={localModules[mod.key]}
                        onCheckedChange={() => handleModuleToggle(mod.key)}
                      />
                      <Label htmlFor={`module-${mod.key}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        {mod.icon}
                        {mod.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Mode */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Approval Mode</Label>
                <RadioGroup
                  value={localMode}
                  onValueChange={(val: "auto" | "review") => setLocalMode(val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="auto" id="mode-auto" />
                    <Label htmlFor="mode-auto" className="text-sm cursor-pointer">Auto</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="review" id="mode-review" />
                    <Label htmlFor="mode-review" className="text-sm cursor-pointer">Review</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Schedule */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Schedule</Label>
                <Select value={localSchedule} onValueChange={(val: AutopilotConfig["schedule"]) => setLocalSchedule(val)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings} disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Settings
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
