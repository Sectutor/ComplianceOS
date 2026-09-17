import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@complianceos/ui/ui/tabs";
import { Input } from "@complianceos/ui/ui/input";
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
  Search,
  Filter,
  SortAsc,
  CheckCheck,
} from "lucide-react";

interface ActionCenterPageProps {
  clientId: number;
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

const moduleList = [
  "All Modules",
  "Evidence",
  "Controls",
  "Access Reviews",
  "Vendors",
  "Policies",
  "Training",
  "Integrations",
];

function getRelativeTime(daysUntilDue?: number): string {
  if (daysUntilDue === undefined) return "";
  if (daysUntilDue <= 0) return `Overdue by ${Math.abs(daysUntilDue)} days`;
  if (daysUntilDue === 0) return "Due today";
  return `Due in ${daysUntilDue} days`;
}

export function ActionCenterPage({ clientId }: ActionCenterPageProps) {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');

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

    let list = [...actions];

    // Priority filter
    if (priorityFilter !== 'all') {
      list = list.filter(a => a.priority === priorityFilter);
    }

    // Module filter
    if (moduleFilter !== "All Modules") {
      list = list.filter(a => a.module === moduleFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.module.toLowerCase().includes(q)
      );
    }

    // Sort
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (sortBy === 'priority') {
      list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      list.sort((a, b) => {
        if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
          return a.daysUntilDue - b.daysUntilDue;
        }
        if (a.daysUntilDue !== undefined) return -1;
        if (b.daysUntilDue !== undefined) return 1;
        return 0;
      });
    }

    // Group by module
    const groups: Record<string, typeof list> = {};
    for (const item of list) {
      if (!groups[item.module]) groups[item.module] = [];
      groups[item.module].push(item);
    }

    const result: typeof list = [];
    const moduleOrder = Object.keys(groups).sort();
    for (const mod of moduleOrder) {
      result.push(...groups[mod]);
    }
    return result;
  }, [actions, priorityFilter, moduleFilter, searchQuery, sortBy]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Failed to load action center</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Action Center</h1>
          {counts && (
            <Badge variant="secondary" className="text-sm">
              {counts.total} {counts.total === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Critical count badge */}
          {counts && counts.critical > 0 && (
            <Badge className="bg-red-500 text-white">{counts.critical} critical</Badge>
          )}
          {counts && counts.high > 0 && (
            <Badge className="bg-amber-500 text-white">{counts.high} high</Badge>
          )}
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Sort toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setSortBy(sortBy === 'priority' ? 'dueDate' : 'priority')}
        >
          <SortAsc className="h-4 w-4 mr-1" />
          Sort by {sortBy === 'priority' ? 'Priority' : 'Due Date'}
        </Button>

        {/* Mark all as read placeholder */}
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground">
          <CheckCheck className="h-4 w-4 mr-1" />
          Mark all as read
        </Button>
      </div>

      {/* Module Tabs */}
      <Tabs
        defaultValue="All Modules"
        value={moduleFilter}
        onValueChange={setModuleFilter}
        className="w-full"
      >
        <TabsList className="flex-wrap h-auto">
          {moduleList.map((mod) => {
            const count = mod === "All Modules"
              ? (actions?.length || 0)
              : (actions?.filter(a => a.module === mod).length || 0);
            return (
              <TabsTrigger key={mod} value={mod} className="text-xs h-8">
                {mod}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Priority Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Filter className="h-3 w-3" /> Priority:
        </span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
          <Button
            key={p}
            variant={priorityFilter === p ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs capitalize ${
              priorityFilter === p && p === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''
            } ${priorityFilter === p && p === 'high' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            ${priorityFilter === p && p === 'medium' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            ${priorityFilter === p && p === 'low' ? 'bg-gray-400 hover:bg-gray-500' : ''}`}
            onClick={() => setPriorityFilter(p)}
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Action List */}
      <div className="space-y-2">
        {filteredActions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">No matching actions</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "You're all caught up! No pending actions."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredActions.map((item) => (
            <Card
              key={item.id}
              className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                if (item.actionUrl) window.location.href = item.actionUrl;
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Priority dot */}
                  <span
                    className={`mt-1.5 h-3 w-3 rounded-full flex-shrink-0 ${priorityColors[item.priority] || "bg-gray-400"}`}
                  />

                  {/* Type icon */}
                  <span className={`mt-1 flex-shrink-0 ${typeIconColors[item.type] || "text-gray-400"}`}>
                    {typeIcons[item.type] || <AlertTriangle className="h-5 w-5" />}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.daysUntilDue !== undefined && (
                          <span className={`text-sm whitespace-nowrap ${
                            item.daysUntilDue <= 0 ? "text-red-500 font-medium" : "text-muted-foreground"
                          }`}>
                            {getRelativeTime(item.daysUntilDue)}
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.module}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          item.priority === 'critical' ? 'text-red-600 border-red-200' : ''
                        } ${item.priority === 'high' ? 'text-amber-600 border-amber-200' : ''}
                        ${item.priority === 'medium' ? 'text-blue-600 border-blue-200' : ''}
                        ${item.priority === 'low' ? 'text-gray-500 border-gray-200' : ''}`}
                      >
                        {item.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
