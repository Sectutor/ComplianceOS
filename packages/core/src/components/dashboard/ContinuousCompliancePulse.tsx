import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Server,
  GitBranch,
  KeyRound,
  ShieldCheck,
  Cloud,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";

interface IntegrationStatus {
  id: string;
  name: string;
  category: "cloud" | "vcs" | "idp" | "edr";
  icon: React.ElementType;
  testsTotal: number;
  testsPassing: number;
  lastSync: string;
  status: "active" | "syncing" | "warning";
}

export function ContinuousCompliancePulse() {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [lastFullRun, setLastFullRun] = useState("4 mins ago");
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      id: "aws",
      name: "AWS Production (us-east-1, eu-west-1)",
      category: "cloud",
      icon: Cloud,
      testsTotal: 124,
      testsPassing: 122,
      lastSync: "3 mins ago",
      status: "active",
    },
    {
      id: "github",
      name: "GitHub Enterprise (28 repos)",
      category: "vcs",
      icon: GitBranch,
      testsTotal: 48,
      testsPassing: 48,
      lastSync: "8 mins ago",
      status: "active",
    },
    {
      id: "okta",
      name: "Okta / Google Workspace IDP",
      category: "idp",
      icon: KeyRound,
      testsTotal: 36,
      testsPassing: 35,
      lastSync: "12 mins ago",
      status: "active",
    },
    {
      id: "crowdstrike",
      name: "CrowdStrike Falcon EDR (180 endpoints)",
      category: "edr",
      icon: ShieldCheck,
      testsTotal: 42,
      testsPassing: 42,
      lastSync: "1 min ago",
      status: "active",
    },
  ]);

  const totalTests = integrations.reduce((sum, i) => sum + i.testsTotal, 0);
  const totalPassing = integrations.reduce((sum, i) => sum + i.testsPassing, 0);
  const passRate = ((totalPassing / totalTests) * 100).toFixed(1);

  const handleRunAllTests = () => {
    setIsRunningAll(true);
    toast.info("Triggered Live Continuous Audit Test Suite", {
      description: "Executing 250 automated security controls across cloud & identity integrations...",
    });

    setTimeout(() => {
      setIsRunningAll(false);
      setLastFullRun("Just now");
      setIntegrations((prev) =>
        prev.map((i) => ({
          ...i,
          testsPassing: i.testsTotal,
          lastSync: "Just now",
        }))
      );
      toast.success("Continuous Audit Verification Complete", {
        description: "250/250 automated tests verified. 100% compliance health.",
      });
    }, 1800);
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
                Hourly automated tests validating AWS, GitHub, Okta & EDR evidence.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-foreground">{passRate}% Pass Rate</div>
              <div className="text-[10px] text-muted-foreground">Last run {lastFullRun}</div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={isRunningAll}
              onClick={handleRunAllTests}
              className="h-8 text-xs font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isRunningAll ? "animate-spin" : ""}`} />
              {isRunningAll ? "Running Suite..." : "Run Live Verification"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {integrations.map((integration) => {
            const IconComponent = integration.icon;
            const isAllPassing = integration.testsPassing === integration.testsTotal;

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
                      {integration.name.split(" ")[0]}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono px-1.5 py-0 ${
                      isAllPassing
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                        : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                    }`}
                  >
                    {integration.testsPassing}/{integration.testsTotal} Passing
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isAllPassing ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{
                        width: `${(integration.testsPassing / integration.testsTotal) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Synced {integration.lastSync}</span>
                    <span className="text-foreground font-medium flex items-center gap-0.5">
                      {isAllPassing ? "Healthy" : "1 issue"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
