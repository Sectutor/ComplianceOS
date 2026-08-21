import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { 
  Bot, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  FileText, 
  ExternalLink,
  Code2,
  RefreshCw,
  Cpu,
  Layers,
  ChevronRight,
  Download,
  Plus,
  Pencil,
  Trash2,
  Settings2
} from "lucide-react";
import { toast } from "sonner";

const AVATAR_PRESETS = ["🤖", "🕵️", "🛠️", "📋", "🛡️", "⚖️", "🔍", "⚡", "🚀", "💻", "🎯", "🧠"];

export function TeammatesFleetView() {
  const { data: teammates, isLoading: loadingTeammates, refetch: refetchTeammates } = trpc.teammates.listTeammates.useQuery();
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = trpc.teammates.listTasks.useQuery();

  const createTaskMutation = trpc.teammates.createTask.useMutation({
    onSuccess: () => {
      toast.success("Autonomous task dispatched to worker sandbox!");
      refetchTeammates();
      refetchTasks();
      setOpenModal(false);
    },
    onError: (err) => {
      toast.error(`Failed to dispatch task: ${err.message}`);
    }
  });

  const createTeammateMutation = trpc.teammates.createTeammate.useMutation({
    onSuccess: () => {
      toast.success("New autonomous teammate created and deployed to fleet!");
      refetchTeammates();
      setOpenBotModal(false);
    },
    onError: (err) => {
      toast.error(`Failed to create teammate: ${err.message}`);
    }
  });

  const updateTeammateMutation = trpc.teammates.updateTeammate.useMutation({
    onSuccess: () => {
      toast.success("Teammate configuration updated successfully!");
      refetchTeammates();
      setOpenBotModal(false);
    },
    onError: (err) => {
      toast.error(`Failed to update teammate: ${err.message}`);
    }
  });

  const deleteTeammateMutation = trpc.teammates.deleteTeammate.useMutation({
    onSuccess: () => {
      toast.success("Teammate decommissioned from active fleet.");
      refetchTeammates();
    },
    onError: (err) => {
      toast.error(`Failed to delete teammate: ${err.message}`);
    }
  });

  const [selectedTeammateId, setSelectedTeammateId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<"browser_audit" | "vendor_soc2" | "iac_remediation" | "access_review" | "policy_gap">("vendor_soc2");
  const [targetUrl, setTargetUrl] = useState("");
  const [taskSummary, setTaskSummary] = useState("");
  const [activeTaskView, setActiveTaskView] = useState<any | null>(null);

  // Bot Create/Edit Modal State
  const [openBotModal, setOpenBotModal] = useState(false);
  const [botModalMode, setBotModalMode] = useState<"create" | "edit">("create");
  const [editBotId, setEditBotId] = useState<string | null>(null);
  const [botName, setBotName] = useState("");
  const [botRole, setBotRole] = useState("");
  const [botAvatar, setBotAvatar] = useState("🤖");
  const [botDescription, setBotDescription] = useState("");
  const [botSandboxType, setBotSandboxType] = useState<"docker" | "e2b" | "browser" | "cli">("browser");
  const [botModel, setBotModel] = useState("claude-3-7-sonnet");
  const [botCapabilities, setBotCapabilities] = useState("");

  const selectedTeammate = teammates?.find(t => t.id === selectedTeammateId) || teammates?.[0];

  const handleOpenCreateBot = () => {
    setBotModalMode("create");
    setEditBotId(null);
    setBotName("");
    setBotRole("");
    setBotAvatar("🤖");
    setBotDescription("");
    setBotSandboxType("browser");
    setBotModel("claude-3-7-sonnet");
    setBotCapabilities("Automated Evidence Harvester, REST/GraphQL Querying, Headless Browser");
    setOpenBotModal(true);
  };

  const handleOpenEditBot = (tm: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setBotModalMode("edit");
    setEditBotId(tm.id);
    setBotName(tm.name);
    setBotRole(tm.role);
    setBotAvatar(tm.avatar || "🤖");
    setBotDescription(tm.description);
    setBotSandboxType(tm.sandboxType || "browser");
    setBotModel(tm.model || "claude-3-7-sonnet");
    setBotCapabilities(tm.capabilities?.join(", ") || "");
    setOpenBotModal(true);
  };

  const handleDeleteBot = (tmId: string, tmName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to decommission "${tmName}" from the fleet?`)) {
      deleteTeammateMutation.mutate({ id: tmId });
    }
  };

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const capabilitiesArray = botCapabilities
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);

    if (botModalMode === "create") {
      createTeammateMutation.mutate({
        name: botName,
        role: botRole,
        avatar: botAvatar,
        description: botDescription,
        sandboxType: botSandboxType,
        model: botModel,
        capabilities: capabilitiesArray
      });
    } else if (editBotId) {
      updateTeammateMutation.mutate({
        id: editBotId,
        name: botName,
        role: botRole,
        avatar: botAvatar,
        description: botDescription,
        sandboxType: botSandboxType,
        model: botModel,
        capabilities: capabilitiesArray
      });
    }
  };

  const handleOpenDispatch = (teammateId: string) => {
    setSelectedTeammateId(teammateId);
    if (teammateId === "alex_tprm") {
      setTaskTitle("Harvest Vendor SOC 2 & Update Risk");
      setTaskType("vendor_soc2");
      setTargetUrl("https://trust.stripe.com");
      setTaskSummary("Log into vendor trust center, sign NDA click-wrap, extract Section IV exceptions, and calculate updated TPRM score.");
    } else if (teammateId === "morgan_iac") {
      setTaskTitle("Scan Cloud Drift & Generate Terraform Patch");
      setTaskType("iac_remediation");
      setTargetUrl("");
      setTaskSummary("Audit AWS S3 bucket encryption-at-rest and IAM MFA status, then prepare a ready-to-merge GitHub Pull Request.");
    } else {
      setTaskTitle("Execute Quarterly Access Review (UAR) Digest");
      setTaskType("access_review");
      setTargetUrl("");
      setTaskSummary("Pull active user roles across GitHub and Google Workspace, then dispatch 1-click Slack sign-off requests.");
    }
    setOpenModal(true);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeammate) return;
    createTaskMutation.mutate({
      teammateId: selectedTeammate.id,
      title: taskTitle,
      type: taskType,
      targetUrl: targetUrl || undefined,
      summary: taskSummary
    });
  };

  return (
    <div className="space-y-6">
      {/* Fleet Overview Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Rakazo Autonomous Teammates Fleet
            </h2>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
              3 Workers Active
            </Badge>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs">
              Sandboxed E2B / Docker
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Persistent AI teammates with dedicated virtual browser and terminal sandboxes to perform end-to-end compliance operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchTeammates(); refetchTasks(); }}
            className="border-border text-foreground hover:bg-accent"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreateBot}
            className="border-border text-foreground hover:bg-accent"
          >
            <Plus className="w-4 h-4 mr-1.5 text-primary" />
            New Bot
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenDispatch(teammates?.[0]?.id || "alex_tprm")}
            className="font-medium shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Dispatch Task
          </Button>
        </div>
      </div>

      {/* Teammates Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {teammates?.map((tm) => {
          const isRunning = tm.status === "running";
          return (
            <Card key={tm.id} className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {tm.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground flex items-center gap-1.5">
                        {tm.name}
                        {isRunning && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs text-primary font-medium">
                        {tm.role}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                      title="Edit Bot Configuration"
                      onClick={(e) => handleOpenEditBot(tm, e)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md"
                      title="Decommission Bot"
                      onClick={(e) => handleDeleteBot(tm.id, tm.name, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Badge
                      variant="outline"
                      className={
                        isRunning
                          ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px]"
                          : "border-border text-muted-foreground bg-muted/50 text-[11px]"
                      }
                    >
                      {isRunning ? "Running" : "Idle"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                  {tm.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tm.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[10px] font-medium bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-md"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                  <div className="text-muted-foreground">
                    Sandbox: <span className="text-foreground capitalize font-medium">{tm.sandboxType}</span>
                  </div>
                  <div className="text-muted-foreground text-right">
                    Tasks: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tm.tasksCompleted} completed</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDispatch(tm.id)}
                  disabled={isRunning}
                  className="w-full border-border hover:border-primary/50 hover:bg-accent text-foreground text-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1 text-primary" />
                  Dispatch {tm.name}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Live Tasks & Activity Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Agent Executions
            </h3>
            <span className="text-xs text-muted-foreground">{tasks?.length || 0} tasks</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {tasks?.map((task) => {
              const tm = teammates?.find(t => t.id === task.teammateId);
              const isSelected = activeTaskView?.id === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskView(task)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{tm?.avatar || "🤖"}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{task.title}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        task.status === "completed"
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : task.status === "running"
                          ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {task.summary}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2.5 pt-2 border-t border-border">
                    <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                    <span className="text-primary font-medium flex items-center hover:underline">
                      View Sandbox Logs <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Terminal & Sandbox Screencast Viewer */}
        <div className="lg:col-span-2">
          {activeTaskView || tasks?.[0] ? (
            (() => {
              const current = activeTaskView || tasks?.[0];
              const tm = teammates?.find(t => t.id === current.teammateId);
              return (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-[520px]">
                  {/* Terminal Header */}
                  <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                      </div>
                      <div className="text-xs font-mono text-foreground flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold">sandbox-{current.teammateId}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground truncate max-w-xs">{current.title}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground bg-background">
                      {tm?.name} ({tm?.model})
                    </Badge>
                  </div>

                  {/* Browser Steps (if browser task) */}
                  {current.browserSteps && current.browserSteps.length > 0 && (
                    <div className="bg-muted/20 p-3 border-b border-border">
                      <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-500" />
                        Headless Browser Screencast Steps:
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {current.browserSteps.map((step: any, idx: number) => (
                          <div
                            key={idx}
                            className="shrink-0 bg-card border border-border rounded-lg p-2 text-[10px] text-foreground flex items-center gap-2 shadow-xs"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[9px]">
                              {step.step}
                            </span>
                            <span className="font-medium">{step.action}</span>
                            <span className="text-muted-foreground font-mono">{step.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terminal Execution Logs */}
                  <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 bg-background text-foreground">
                    <div className="text-muted-foreground select-none pb-1">
                      // Rakazo Sandboxed Worker Initialized :: Isolated Kernel v6.8.0-e2b
                    </div>
                    {current.logs?.map((log: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-muted-foreground select-none text-[11px]">
                          [{log.timestamp.slice(11, 19)}]
                        </span>
                        <span
                          className={`font-semibold text-[11px] uppercase ${
                            log.level === "action"
                              ? "text-blue-600 dark:text-blue-400"
                              : log.level === "warn"
                              ? "text-amber-600 dark:text-amber-400"
                              : log.level === "error"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span className="text-foreground">{log.message}</span>
                      </div>
                    ))}
                    {current.status === "running" && (
                      <div className="flex items-center gap-2 text-primary animate-pulse pt-2">
                        <span className="inline-block w-2 h-4 bg-primary"></span>
                        <span>Autonomous agent executing live browser & container commands...</span>
                      </div>
                    )}
                  </div>

                  {/* Generated Artifacts Footer */}
                  {current.artifacts && current.artifacts.length > 0 && (
                    <div className="bg-muted/30 p-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs text-foreground font-medium">
                          Generated {current.artifacts.length} Audit Evidence Artifacts
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {current.artifacts.map((art: any) => (
                          <Button
                            key={art.id}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-card border-border text-foreground hover:bg-accent"
                            onClick={() => toast.success(`Viewing verified evidence: ${art.name}`)}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1 text-primary" />
                            {art.name} ({art.size})
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="bg-card border border-border rounded-xl h-[520px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground shadow-sm">
              <Terminal className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-semibold text-foreground">No Task Selected</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Select a completed or running task on the left to inspect live execution logs, screenshots, and evidence artifacts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              Dispatch Task to {selectedTeammate?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDispatchSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Teammate Agent</Label>
              <div className="p-2.5 bg-muted/50 border border-border rounded-lg flex items-center gap-2 text-xs">
                <span className="text-xl">{selectedTeammate?.avatar}</span>
                <div>
                  <div className="font-semibold text-foreground">{selectedTeammate?.name}</div>
                  <div className="text-muted-foreground text-[11px]">{selectedTeammate?.role}</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Task Title</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Harvest Datadog SOC 2 Report"
                className="bg-background border-border text-foreground text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Workflow Type</Label>
                <Select value={taskType} onValueChange={(val: any) => setTaskType(val)}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs">
                    <SelectItem value="vendor_soc2">Vendor SOC 2 Ingestion</SelectItem>
                    <SelectItem value="browser_audit">Headless Browser Audit</SelectItem>
                    <SelectItem value="iac_remediation">IaC Terraform Remediation</SelectItem>
                    <SelectItem value="access_review">User Access Review (UAR)</SelectItem>
                    <SelectItem value="policy_gap">Policy Gap Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target URL (Optional)</Label>
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://trust.vendor.com"
                  className="bg-background border-border text-foreground text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Goal / Instructions</Label>
              <Textarea
                value={taskSummary}
                onChange={(e) => setTaskSummary(e.target.value)}
                placeholder="Detailed instructions for the autonomous agent..."
                rows={3}
                className="bg-background border-border text-foreground text-xs resize-none"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isLoading}
                className="font-medium shadow-sm"
              >
                {createTaskMutation.isLoading ? "Spawning Sandbox..." : "Launch Autonomous Worker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bot Configuration / Edit Modal */}
      <Dialog open={openBotModal} onOpenChange={setOpenBotModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Bot className="w-5 h-5 text-primary" />
              {botModalMode === "create" ? "Deploy New Autonomous Teammate" : `Edit Teammate: ${botName}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure autonomous persona, virtual execution sandbox, reasoning model, and compliance directives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBotSubmit} className="space-y-4 pt-2">
            {/* Avatar Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Avatar Emoji</Label>
              <div className="flex items-center gap-2 flex-wrap p-2.5 bg-muted/40 border border-border rounded-lg">
                {AVATAR_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setBotAvatar(emoji)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      botAvatar === emoji
                        ? "bg-primary/20 border-2 border-primary scale-110 shadow-xs"
                        : "hover:bg-accent border border-transparent"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name and Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bot Name</Label>
                <Input
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="e.g. Sentinel, Harper, Horizon"
                  className="bg-background border-border text-foreground text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Role / Specialization</Label>
                <Input
                  value={botRole}
                  onChange={(e) => setBotRole(e.target.value)}
                  placeholder="e.g. ISO 27001 Auditor, Cloud Drift Fixer"
                  className="bg-background border-border text-foreground text-xs"
                  required
                />
              </div>
            </div>

            {/* Sandbox & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Execution Sandbox Runtime</Label>
                <Select value={botSandboxType} onValueChange={(val: any) => setBotSandboxType(val)}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs">
                    <SelectItem value="browser">Headless Browser (Playwright / Camoufox)</SelectItem>
                    <SelectItem value="docker">Docker Container (Isolated Alpine/Ubuntu)</SelectItem>
                    <SelectItem value="e2b">E2B Virtual Sandbox (Cloud MicroVM)</SelectItem>
                    <SelectItem value="cli">CLI Terminal (Subprocess Node)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reasoning Model</Label>
                <Select value={botModel} onValueChange={(val: any) => setBotModel(val)}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs">
                    <SelectItem value="claude-3-7-sonnet">Claude 3.7 Sonnet (Hybrid Reasoning)</SelectItem>
                    <SelectItem value="deepseek-r1">DeepSeek R1 (Open Reasoning)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Multimodal Analysis)</SelectItem>
                    <SelectItem value="deepseek-v3">DeepSeek V3 (Fast Tool Use)</SelectItem>
                    <SelectItem value="claude-3-5-haiku">Claude 3.5 Haiku (High Speed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description / Instructions */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mission Statement &amp; Directives</Label>
              <Textarea
                value={botDescription}
                onChange={(e) => setBotDescription(e.target.value)}
                placeholder="Explain what this bot monitors, its primary tasks, and how it handles compliance exceptions..."
                rows={3}
                className="bg-background border-border text-foreground text-xs resize-none"
                required
              />
            </div>

            {/* Capabilities */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capabilities &amp; Skill Tags (Comma-separated)</Label>
              <Input
                value={botCapabilities}
                onChange={(e) => setBotCapabilities(e.target.value)}
                placeholder="e.g. S3 Drift Fixer, Slack Alerts, OCR Parser, Terraform Generator"
                className="bg-background border-border text-foreground text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenBotModal(false)}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTeammateMutation.isLoading || updateTeammateMutation.isLoading}
                className="font-medium shadow-sm"
              >
                {botModalMode === "create"
                  ? (createTeammateMutation.isLoading ? "Deploying..." : "Deploy Teammate")
                  : (updateTeammateMutation.isLoading ? "Saving..." : "Save Changes")
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
