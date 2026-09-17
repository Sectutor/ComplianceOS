import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@complianceos/ui/ui/tabs";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Clock,
  AlertTriangle,
  UserCheck,
  FileSearch,
  FileText,
  ClipboardList,
  GraduationCap,
  Shield,
  Wifi,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

interface ActionCenterWidgetProps {
  clientId: number;
  compact?: boolean;
}

type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

const typeIcons: Record<string, React.ReactNode> = {
  evidence_expiring: <Clock className="h-4 w-4" />,
  evidence_missing: <AlertTriangle className="h-4 w-4" />,
  control_overdue: <AlertTriangle className="h-4 w-4" />,
  access_review_pending: <UserCheck className="h-4 w-4" />,
  vendor_assessment_due: <FileSearch className="h-4 w-4" />,
  policy_review_due: <FileText className="h-4 w-4" />,
  task_overdue: <ClipboardList className="h-4 w-4" />,
  training_incomplete: <GraduationCap className="h-4 w-4" />,
  exception_expiring: <Shield className="h-4 w-4" />,
  connector_failed: <Wifi className="h-4 w-4" />,
  review_due: <ClipboardList className="h-4 w-4" />,
};

const typeIconColors: Record<string, string> = {
  evidence_expiring: "text-orange-500",
  evidence_missing: "text-red-500",
  control_overdue: "text-red-500",
  access_review_pending: "text-blue-500",
  vendor_assessment_due: "text-purple-500",
  policy_review_due: "text-indigo-500",
  task_overdue: "text-orange-500",
  training_incomplete: "text-teal-500",
  exception_expiring: "text-yellow-500",
  connector_failed: "text-red-500",
  review_due: "text-gray-500",
};

function getRelativeTime(dueDate?: Date | string, daysUntilDue?: number): string {
  if (!dueDate && daysUntilDue === undefined) return "";
  if (daysUntilDue !== undefined) {
    if (daysUntilDue <= 0) return `Overdue by ${Math.abs(daysUntilDue)} days`;
    if (daysUntilDue === 0) return "Due today";
    return `Due in ${daysUntilDue} days`;
  }
  const d = new Date(dueDate!);
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return `Overdue by ${Math.abs(diff)} days`;
  if (diff === 0) return "Due today";
  return `Due in ${diff} days`;
}

export function ActionCenterWidget({ clientId, compact = false }: ActionCenterWidgetProps) {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const { data: actions, isLoading, isError, refetch } = trpc.actionCenter.getActions.useQuery(
    { clientId },
    { enabled: clientId > 0, refetchInterval: 60000 }
  );

  const { data: counts } = trpc.actionCenter.getActionCount.useQuery(
    { clientId },
    { enabled: clientId > 0, refetchInterval: 120000 }
  );

  const filteredActions = useMemo(() => {
    if (!actions) return [];
    let list = actions;
    if (priorityFilter !== 'all') {
      list = list.filter(a => a.priority === priorityFilter);
    }
    if (compact) {
      list = list.slice(0, 5);
    }
    // Group by module, sorted by priority within group
    const groups: Record<string, typeof list> = {};
    for (const item of list) {
      if (!groups[item.module]) groups[item.module] = [];
      groups[item.module].push(item);
    }
    // Sort each group by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    // Return flattened but grouped
    const result: typeof list = [];
    const moduleOrder = Object.keys(groups).sort();
    for (const mod of moduleOrder) {
      result.push(...groups[mod]);
    }
    return result;
  }, [actions, priorityFilter, compact]);

  // ── Loading ──
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Action Center
            {counts && <Badge variant="secondary" className="ml-auto text-xs">{counts.total} items</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Action Center
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <p className="text-sm text-muted-foreground">Failed to load actions</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // ── Empty State ──
  if (!actions || actions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Action Center
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-sm font-medium">No pending actions. You're all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Action Center
          <Badge variant="secondary" className="ml-auto text-xs">
            {counts?.total || actions.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Priority Tabs */}
        <Tabs
          defaultValue="all"
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-5 h-8">
            <TabsTrigger value="all" className="text-xs px-1 py-0.5 h-7">All</TabsTrigger>
            <TabsTrigger value="critical" className="text-xs px-1 py-0.5 h-7 data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              Critical
            </TabsTrigger>
            <TabsTrigger value="high" className="text-xs px-1 py-0.5 h-7 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
              High
            </TabsTrigger>
            <TabsTrigger value="medium" className="text-xs px-1 py-0.5 h-7 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              Med
            </TabsTrigger>
            <TabsTrigger value="low" className="text-xs px-1 py-0.5 h-7 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
              Low
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action List */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-xs">No {priorityFilter !== 'all' ? priorityFilter : ''} actions</p>
            </div>
          ) : (
            filteredActions.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => {
                  if (item.actionUrl) window.location.href = item.actionUrl;
                }}
              >
                {/* Priority dot */}
                <span
                  className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${priorityColors[item.priority] || "bg-gray-400"}`}
                />

                {/* Type icon */}
                <span className={`mt-0.5 flex-shrink-0 ${typeIconColors[item.type] || "text-gray-400"}`}>
                  {typeIcons[item.type] || <AlertTriangle className="h-4 w-4" />}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                    {item.daysUntilDue !== undefined && (
                      <span className={`text-xs whitespace-nowrap flex-shrink-0 ${
                        item.daysUntilDue <= 0 ? "text-red-500 font-medium" : "text-muted-foreground"
                      }`}>
                        {getRelativeTime(undefined, item.daysUntilDue)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {item.module}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">{item.priority}</span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            ))
          )}
        </div>

        {/* Compact: View all link */}
        {compact && actions.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { window.location.href = `/client/${clientId}/action-center`; }}
          >
            View all {actions.length} items
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
