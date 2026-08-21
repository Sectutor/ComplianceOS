import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { 
  Calendar, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  PauseCircle, 
  Bot, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export function ScheduledRoutinesView() {
  const { data: routines, isLoading, refetch } = trpc.teammates.listRoutines.useQuery();
  const { data: teammates } = trpc.teammates.listTeammates.useQuery();

  const toggleMutation = trpc.teammates.toggleRoutine.useMutation({
    onSuccess: (data) => {
      toast.success(`Routine "${data.name}" ${data.status === "active" ? "activated" : "paused"}`);
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to update routine: ${err.message}`);
    }
  });

  const triggerMutation = trpc.teammates.triggerRoutineNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Triggered execution for "${data.name}"!`);
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to trigger routine: ${err.message}`);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Autonomous Compliance Routines
            </h2>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs">
              Continuous Background Agents
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Automated recurring schedules running inside agent sandboxes to continuously monitor vendors, cloud drift, and user access.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-border text-foreground hover:bg-accent"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh Routines
        </Button>
      </div>

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {routines?.map((routine) => {
          const tm = teammates?.find(t => t.id === routine.teammateId);
          const isActive = routine.status === "active";
          const isRunning = routine.status === "running";

          return (
            <Card key={routine.id} className="bg-card border-border flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{tm?.avatar || "🤖"}</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground leading-snug">
                        {routine.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-primary font-medium mt-0.5">
                        Assigned: {tm?.name || routine.teammateId}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      isRunning
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 animate-pulse"
                        : isActive
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-border text-muted-foreground bg-muted/40"
                    }`}
                  >
                    {isRunning ? "Running" : isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                  {routine.description}
                </p>

                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Cron Schedule:
                    </span>
                    <span className="font-mono text-foreground bg-card border border-border px-1.5 py-0.5 rounded text-[11px]">
                      {routine.schedule}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Last Execution:</span>
                    <span className="text-foreground font-medium">{routine.lastRun}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Next Scheduled:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{routine.nextRun}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 pt-2 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ routineId: routine.id, active: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">{isActive ? "Enabled" : "Disabled"}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRunning || triggerMutation.isLoading}
                  onClick={() => triggerMutation.mutate({ routineId: routine.id })}
                  className="h-8 text-xs border-border text-foreground hover:bg-accent"
                >
                  <Play className="w-3 h-3 mr-1 text-primary" />
                  Run Now
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
