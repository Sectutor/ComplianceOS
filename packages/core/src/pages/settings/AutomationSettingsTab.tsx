/**
 * Automation Settings tab — configure the sentinel agent runtime per client
 * and review the bot action inbox (approve / reject proposals).
 */
import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { Loader2, Bot, Play, Check, X, AlertTriangle, Clock, ArrowRight, Sparkles } from "lucide-react";

const BOT_LABELS: Record<string, string> = {
  complianceSentinel: "Compliance Sentinel — evidence expiry, control regressions, score drops",
  slaHound: "SLA Hound — questionnaires, DSAR deadlines, contracts, policy reviews",
  riskWatchdog: "Risk Watchdog — overdue treatments, appetite breaches",
  vulnerabilitySentinel: "Vulnerability Sentinel — remediation SLA breaches",
  policySteward: "Policy Steward — stuck reviews",
  bcGuardian: "BC Guardian — plan test dates, training expiry",
  anomalySpotter: "Anomaly Spotter — activity pattern spikes (heuristic)",
};

const PRIORITY_VARIANT: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export function AutomationSettingsTab({ clientId }: { clientId: number }) {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.autopilot.getConfig.useQuery({ clientId });
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [schedule, setSchedule] = useState(config?.schedule ?? "daily");
  const [approvalMode, setApprovalMode] = useState(config?.approvalMode === "auto" ? "auto" : "review");

  const updateConfig = trpc.autopilot.updateConfig.useMutation({
    onSuccess: () => {
      utils.autopilot.getConfig.invalidate({ clientId });
      utils.sentinel.listActions.invalidate({ clientId });
    },
  });

  const runNow = trpc.sentinel.runNow.useMutation({
    onSuccess: (r: any) => {
      utils.sentinel.listActions.invalidate({ clientId });
    },
  });

  const { data: actions, isLoading: actionsLoading } = trpc.sentinel.listActions.useQuery(
    { clientId, status: "pending_review", limit: 50 },
    { enabled: !!clientId }
  );

  const reviewAction = trpc.sentinel.reviewSentinelAction.useMutation({
    onSuccess: () => utils.sentinel.listActions.invalidate({ clientId }),
  });

  const handleSave = () => {
    updateConfig.mutate({
      clientId,
      enabled,
      schedule: schedule as any,
      approvalMode: approvalMode as any,
      modules: config?.modules,
    });
  };

  if (isLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Agent Command Center Banner */}
      <Card className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-indigo-800 text-white shadow-md">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                Agent & Sentinel Command Center
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                  Live on /agent
                </Badge>
              </h4>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Manage all 7 Sentinel bots, trigger live sweeps, and delegate findings to team members or autonomous AI teammates.
              </p>
            </div>
          </div>
          <Link href="/agent">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap shadow-sm font-semibold">
              Open Agent Center <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Runtime configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            Sentinel Agent Runtime
          </CardTitle>
          <CardDescription>
            Autonomous bots that continuously observe your compliance posture, detect notable events,
            and propose or execute actions. Configure cadence and how much autonomy they get.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="font-semibold">Enable sentinel bots</Label>
              <p className="text-xs text-muted-foreground">Bots wake on their schedule and scan your GRC data.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Run frequency</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action autonomy</Label>
              <RadioGroup value={approvalMode} onValueChange={setApprovalMode} className="flex gap-4 pt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="review" id="mode-review" />
                  <Label htmlFor="mode-review" className="font-normal">Propose for review</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="mode-auto" />
                  <Label htmlFor="mode-auto" className="font-normal">Auto-execute (non-critical)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
            <Label className="font-semibold">Active bots</Label>
            {Object.entries(BOT_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge variant={config?.modules?.[key] === false ? "outline" : "default"} className="mt-0.5 shrink-0">
                  {config?.modules?.[key] === false ? "off" : "on"}
                </Badge>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={updateConfig.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => runNow.mutate({ clientId })}
              disabled={runNow.isPending}
            >
              {runNow.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Play className="h-4 w-4 mr-2" />}
              Run All Bots Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action inbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Action Inbox — awaiting your decision
            {actions && <Badge variant="secondary">{actions.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Findings the bots flagged. Approving creates a tracked task in the governance queue;
            rejecting dismisses the finding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionsLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {!actionsLoading && (!actions || actions.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No pending actions. The sentinels are watching and will report anything notable.
            </div>
          )}
          {actions?.map((a: any) => {
            const meta = typeof a.metadata === "string" ? JSON.parse(a.metadata || "{}") : a.metadata || {};
            return (
              <div key={a.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={PRIORITY_VARIANT[a.priority] || PRIORITY_VARIANT.medium}>
                        {a.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      {meta.botId && (
                        <Badge variant="outline" className="text-[10px] font-mono">{meta.botId}</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.aiRationale}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => reviewAction.mutate({ clientId, actionId: a.id, decision: "approved" })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve & create task
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reviewAction.mutate({ clientId, actionId: a.id, decision: "rejected" })}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
