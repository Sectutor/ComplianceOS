import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  frameworks: string[];
  category: "cloud" | "policy" | "vendor" | "evidence" | "access" | "risk";
  source: string;
  dueDate: string;
  actionLabel: string;
  targetRoute?: string;
}

const FALLBACK_ITEMS: ActionItem[] = [
  {
    id: "act-1",
    title: "AWS S3 Public Read Access Detected in Production",
    description: "Bucket 'compliance-artifacts-prod' has public read ACL enabled, violating SOC 2 CC6.1 and ISO 27001 A.9.4.",
    severity: "critical",
    frameworks: ["SOC 2 CC6.1", "ISO 27001 A.9.4", "NIS2"],
    category: "cloud",
    source: "AWS Continuous Scanner",
    dueDate: "Immediate",
    actionLabel: "Enforce Block Public Access",
    targetRoute: "/cloud-security",
  },
  {
    id: "act-2",
    title: "Annual Penetration Testing Report Overdue",
    description: "Last external gray-box pentest was completed 13 months ago. Required for SOC 2 Type II and HIPAA audit readiness.",
    severity: "critical",
    frameworks: ["SOC 2 CC7.1", "HIPAA 164.308"],
    category: "evidence",
    source: "Audit Readiness Engine",
    dueDate: "2 days left",
    actionLabel: "Upload Pentest Artifact",
    targetRoute: "/evidence",
  },
  {
    id: "act-3",
    title: "3 Contractors Missing MFA on Google Workspace",
    description: "Active Directory sync identified accounts without Hardware/App MFA enforcement enabled.",
    severity: "warning",
    frameworks: ["SOC 2 CC6.2", "NIST AC-7", "ISO A.9.2"],
    category: "access",
    source: "Identity Collector (Okta / GSuite)",
    dueDate: "Today",
    actionLabel: "Enforce MFA via SSO",
    targetRoute: "/access-reviews",
  },
  {
    id: "act-4",
    title: "Critical Subprocessor Risk Review: OpenAI & Datadog",
    description: "Annual SOC 2 / DPA compliance re-evaluation due for Tier-1 AI & Logging sub-processors.",
    severity: "warning",
    frameworks: ["GDPR Art. 28", "ISO 27001 A.15.1"],
    category: "vendor",
    source: "Vendor Risk Module",
    dueDate: "5 days left",
    actionLabel: "Launch Vendor Review",
    targetRoute: "/vendors",
  },
  {
    id: "act-5",
    title: "Information Security Policy v2.4 Pending Acknowledgement",
    description: "42 team members have not signed the updated Acceptable Use and Cryptography policy.",
    severity: "info",
    frameworks: ["SOC 2 CC2.1", "ISO 27001 A.5.1"],
    category: "policy",
    source: "Policy Center",
    dueDate: "Next week",
    actionLabel: "Send Automated Slack Reminders",
    targetRoute: "/policies",
  },
];

export function ZeroInboxActionQueue({ clientId }: { clientId?: string }) {
  const [, setLocation] = useLocation();
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
  const { data: dbActions, refetch } = trpc.actionCenter.getActions.useQuery(
    { clientId: parsedClientId! },
    { enabled: !!parsedClientId && parsedClientId > 0 }
  );

  const dismissMutation = trpc.actionCenter.dismissAction.useMutation();

  // Map live DB actions or use fallback
  const items: ActionItem[] = useMemo(() => {
    if (dbActions && dbActions.length > 0) {
      return dbActions.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        severity: a.priority === 'critical' ? 'critical' : a.priority === 'high' ? 'warning' : 'info',
        frameworks: a.frameworks || ['SOC 2', 'ISO 27001'],
        category: a.module ? (a.module.toLowerCase() as any) : 'evidence',
        source: `${a.module} Subsystem`,
        dueDate: a.daysUntilDue !== undefined ? (a.daysUntilDue <= 0 ? 'Overdue' : `${a.daysUntilDue} days left`) : 'Scheduled',
        actionLabel: a.actionLabel || 'Remediate',
        targetRoute: a.actionUrl || '/evidence',
      }));
    }
    return FALLBACK_ITEMS;
  }, [dbActions]);

  const activeItems = items.filter((item) => !resolvedIds.has(item.id));
  const filteredItems = activeItems.filter(
    (item) => filter === "all" || item.severity === filter
  );

  const criticalCount = activeItems.filter((i) => i.severity === "critical").length;
  const warningCount = activeItems.filter((i) => i.severity === "warning").length;
  const totalCount = items.length;
  const completedCount = resolvedIds.size;
  const progressPercentage = Math.round((completedCount / (totalCount || 1)) * 100);

  const handleResolve = (item: ActionItem) => {
    setIsProcessing(item.id);
    dismissMutation.mutate({ actionId: item.id, actionType: item.category });
    setTimeout(() => {
      setResolvedIds((prev) => new Set([...prev, item.id]));
      setIsProcessing(null);
      toast.success(`Action Completed: ${item.title}`, {
        description: `Satisfied requirements across: ${item.frameworks.join(", ")}`,
      });
    }, 500);
  };

  const handleNavigate = (route?: string) => {
    if (route) {
      setLocation(clientId ? `/clients/${clientId}${route.startsWith('/') ? route : '/' + route}` : route);
    }
  };

  const handleSnooze = (item: ActionItem) => {
    setResolvedIds((prev) => new Set([...prev, item.id]));
    dismissMutation.mutate({ actionId: item.id, actionType: item.category });
    toast.info("Item Snoozed / Risk Accepted", {
      description: "Added to the audit trail as an accepted operational exception (14 days).",
    });
  };

  return (
    <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Zero-Inbox Action Queue
                <Badge variant="outline" className="text-xs font-mono font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  {activeItems.length} Open Tasks
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Prioritized remediation stream powering continuous audit readiness.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({activeItems.length})
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filter === "critical"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : "text-muted-foreground hover:text-rose-600"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilter("warning")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filter === "warning"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Warning ({warningCount})
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-muted/60 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {progressPercentage}% Triage Cleared
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center flex flex-col items-center justify-center space-y-3 bg-muted/20 rounded-xl border border-dashed border-border"
          >
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Zero Inbox Achieved!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                All high-priority security gaps and audit evidence requirements are fulfilled. Your continuous posture is pristine.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setResolvedIds(new Set());
                refetch();
                toast.info("Action queue refreshed");
              }}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh Action Queue
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const isCritical = item.severity === "critical";
                const isWarning = item.severity === "warning";

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, margin: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`group relative rounded-lg p-3.5 border transition-all ${
                      isCritical
                        ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20"
                        : isWarning
                        ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                        : "bg-muted/30 hover:bg-muted/50 border-border/60"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {isCritical ? (
                            <ShieldAlert className="h-5 w-5 text-rose-500" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className="text-sm font-semibold text-foreground tracking-tight hover:underline cursor-pointer"
                              onClick={() => handleNavigate(item.targetRoute)}
                            >
                              {item.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono px-1.5 py-0 uppercase ${
                                isCritical
                                  ? "border-rose-500/40 text-rose-600 bg-rose-500/10"
                                  : isWarning
                                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                  : "border-blue-500/40 text-blue-600 bg-blue-500/10"
                              }`}
                            >
                              {item.severity}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-emerald-500" />
                              Satisfies:
                            </span>
                            {item.frameworks.map((fw) => (
                              <span
                                key={fw}
                                className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/80 border border-border/70 text-foreground"
                              >
                                {fw}
                              </span>
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-2">
                              Source: <span className="text-foreground font-medium">{item.source}</span> • Due: <span className="text-foreground font-medium">{item.dueDate}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSnooze(item)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          title="Snooze or register risk acceptance exception"
                        >
                          Snooze
                        </Button>

                        <Button
                          size="sm"
                          disabled={isProcessing === item.id}
                          onClick={() => handleResolve(item)}
                          className={`h-8 text-xs font-semibold shadow-sm transition-all ${
                            isCritical
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : isWarning
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                        >
                          {isProcessing === item.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {item.actionLabel}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
