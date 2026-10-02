import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  GitBranch,
  KeyRound,
  ShieldCheck,
  Cloud,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";

interface ContinuousCompliancePulseProps {
  clientId?: string;
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  aws: Cloud,
  github: GitBranch,
  okta: KeyRound,
  crowdstrike: ShieldCheck,
  google: KeyRound,
  azure: Cloud,
};

export function ContinuousCompliancePulse({ clientId }: ContinuousCompliancePulseProps) {
  const [, setLocation] = useLocation();
  const { selectedClientId } = useClientContext();
  const effectiveId = clientId ? parseInt(clientId, 10) : selectedClientId ? Number(selectedClientId) : undefined;
  const utils = trpc.useUtils();

  const { data: installedConnectors, isLoading: connectorsLoading } = trpc.connectors.listInstalled.useQuery(
    { clientId: effectiveId! },
    { enabled: !!effectiveId && effectiveId > 0 }
  );

  const { data: collectorLogs, isLoading: logsLoading } = trpc.connectors.getLogs.useQuery(
    { clientId: effectiveId! },
    { enabled: !!effectiveId && effectiveId > 0 }
  );

  const runAllMutation = trpc.connectors.runAll.useMutation({
    onSuccess: (res) => {
      toast.success("Continuous Audit Verification Complete", {
        description: `Verified collectors and generated ${res.totalEvidenceGenerated} evidence artifacts.`,
      });
      utils.connectors.getLogs.invalidate();
      utils.dashboard.enhanced.invalidate();
    },
    onError: (err) => {
      toast.error("Collector Run Failed", { description: err.message });
    },
  });

  const connectors = installedConnectors || [];
  const logs = collectorLogs || [];

  // Map latest status from logs per provider
  const connectorStatusList = connectors.map((c: any) => {
    const provider = String(c.provider || '').toLowerCase();
    const providerLogs = logs.filter((l: any) => String(l.provider || '').toLowerCase() === provider);
    const latestLog = providerLogs[0];
    const isPassing = latestLog ? latestLog.status === 'success' || latestLog.status === 'completed' : true;
    const evidenceCount = latestLog?.evidenceCount ?? 0;
    const findings = Array.isArray(latestLog?.findings) ? latestLog.findings : [];
    const icon = PROVIDER_ICONS[provider] || Cloud;
    const name = c.metadata?.name || `${provider.toUpperCase()} Integration`;
    const lastSync = latestLog?.executedAt
      ? new Date(latestLog.executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "Pending run";

    return {
      id: String(c.id),
      name,
      provider,
      icon,
      isPassing,
      evidenceCount,
      findingsCount: findings.length,
      lastSync,
    };
  });

  const totalConnectors = connectorStatusList.length;
  const passingConnectors = connectorStatusList.filter((c) => c.isPassing).length;
  const passRate = totalConnectors > 0 ? Math.round((passingConnectors / totalConnectors) * 100) : 100;

  const handleRunAllTests = () => {
    if (!effectiveId) {
      toast.info("Select an organization to execute automated audit collectors.");
      return;
    }
    if (totalConnectors === 0) {
      toast.info("No automated connectors installed. Connect AWS, GitHub, or Okta first.");
      setLocation("/settings/plugins");
      return;
    }
    toast.info("Triggered Live Continuous Audit Test Suite", {
      description: `Executing collectors across ${totalConnectors} installed integrations...`,
    });
    runAllMutation.mutate({ clientId: effectiveId });
  };

  return (
    <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight text-foreground">
                  Continuous Automated Control Telemetry
                </CardTitle>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Automated continuous testing across cloud, version control, and identity telemetry.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalConnectors > 0 && (
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-foreground">{passRate}% Healthy</div>
                <div className="text-[10px] text-muted-foreground">{passingConnectors}/{totalConnectors} Active</div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={runAllMutation.isPending}
              onClick={handleRunAllTests}
              className="h-8 text-xs font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${runAllMutation.isPending ? "animate-spin" : ""}`} />
              {runAllMutation.isPending ? "Executing..." : "Run Live Verification"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {connectorsLoading || logsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-lg border border-border/40" />
            ))}
          </div>
        ) : totalConnectors > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {connectorStatusList.map((integration) => {
              const IconComponent = integration.icon;
              return (
                <div
                  key={integration.id}
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-background border border-border text-foreground">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground line-clamp-1">
                        {integration.name}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-1.5 py-0 ${
                        integration.isPassing
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                      }`}
                    >
                      {integration.isPassing ? "Healthy" : `${integration.findingsCount} Issues`}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${integration.isPassing ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: integration.isPassing ? "100%" : "60%" }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{integration.lastSync}</span>
                      <span className="text-foreground font-medium flex items-center gap-0.5">
                        {integration.evidenceCount} artifacts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-dashed border-border bg-muted/20 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Continuous Automated Collectors Standing By</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect cloud accounts (AWS), code repositories (GitHub), or identity providers (Okta) to stream real-time compliance telemetry.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0 font-medium"
              onClick={() => setLocation("/settings/plugins")}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Connect Integrations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
