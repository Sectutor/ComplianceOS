// AutopilotSetupWizard — Guided setup for first-time Compliance Autopilot configuration
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Separator } from "@complianceos/ui/ui/separator";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  FileSearch,
  Activity,
  AlertTriangle,
  ListChecks,
  Shield,
  Bell,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AutopilotSetupWizardProps {
  clientId: number;
  onComplete: () => void;
}

type SetupStep =
  | "welcome"
  | "modules"
  | "schedule"
  | "confirm"
  | "done";

const ALL_STEPS: { key: SetupStep; label: string; icon: React.ReactNode }[] = [
  { key: "welcome", label: "Welcome", icon: <Sparkles className="h-4 w-4" /> },
  { key: "modules", label: "Modules", icon: <FileSearch className="h-4 w-4" /> },
  { key: "schedule", label: "Schedule", icon: <Activity className="h-4 w-4" /> },
  { key: "confirm", label: "Confirm", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "done", label: "Done", icon: <PartyPopper className="h-4 w-4" /> },
];

const MODULES = [
  {
    key: "evidence" as const,
    label: "Evidence Collection",
    description: "Automatically collect evidence from connected sources on schedule",
    icon: <FileSearch className="h-5 w-5 text-blue-500" />,
  },
  {
    key: "health" as const,
    label: "Health Monitoring",
    description: "Track compliance health scores and identify deteriorating controls",
    icon: <Activity className="h-5 w-5 text-green-500" />,
  },
  {
    key: "gaps" as const,
    label: "Gap Analysis",
    description: "Detect missing controls and evidence requirements automatically",
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  },
  {
    key: "tasks" as const,
    label: "Task Creation",
    description: "Auto-generate remediation tasks from gaps and health issues",
    icon: <ListChecks className="h-5 w-5 text-purple-500" />,
  },
  {
    key: "report" as const,
    label: "Reports",
    description: "Generate compliance reports on each autopilot run",
    icon: <Shield className="h-5 w-5 text-indigo-500" />,
  },
  {
    key: "notifications" as const,
    label: "Notifications",
    description: "Send alerts for run results, pending approvals, and errors",
    icon: <Bell className="h-5 w-5 text-rose-500" />,
  },
];

export function AutopilotSetupWizard({ clientId, onComplete }: AutopilotSetupWizardProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    evidence: true,
    health: true,
    gaps: true,
    tasks: true,
    report: false,
    notifications: true,
  });
  const [mode, setMode] = useState<"auto" | "review">("review");
  const [schedule, setSchedule] = useState<"hourly" | "daily" | "weekly" | "manual">("daily");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateConfigMutation = trpc.autopilot.updateConfig.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setCurrentStepIdx(4); // Advance to "Done"
      toast.success("Autopilot is now running!");
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(err.message || "Failed to enable autopilot");
    },
  });

  const currentStep = ALL_STEPS[currentStepIdx];
  const totalSteps = ALL_STEPS.length;
  const progressPercent = Math.round(((currentStepIdx) / (totalSteps - 1)) * 100);

  const canAdvance = (): boolean => {
    switch (currentStep.key) {
      case "modules":
        return Object.values(selectedModules).some(Boolean);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleEnable = () => {
    setIsSubmitting(true);
    updateConfigMutation.mutate({
      clientId,
      enabled: true,
      mode,
      schedule,
      modules: {
        evidence: selectedModules.evidence ?? false,
        health: selectedModules.health ?? false,
        gaps: selectedModules.gaps ?? false,
        tasks: selectedModules.tasks ?? false,
        report: selectedModules.report ?? false,
        notifications: selectedModules.notifications ?? false,
      },
    });
  };

  const handleDone = () => {
    onComplete();
  };

  const toggleModule = (key: string) => {
    setSelectedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Step Renderers ──

  const renderWelcome = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-primary/10 p-6">
          <Zap className="h-14 w-14 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Welcome to Compliance Autopilot</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Automate your compliance maintenance — evidence collection, health monitoring,
            gap detection, and task creation — all running on a schedule you control.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-lg font-bold">24/7</p>
          <p className="text-xs text-muted-foreground">Monitoring</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-lg font-bold">Auto</p>
          <p className="text-xs text-muted-foreground">Remediation</p>
        </div>
      </div>
    </div>
  );

  const renderModules = () => (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-lg font-semibold">Choose Modules</h3>
        <p className="text-sm text-muted-foreground">
          Select which modules the autopilot should manage.
        </p>
      </div>
      <div className="space-y-3">
        {MODULES.map((mod) => (
          <Card
            key={mod.key}
            className={`cursor-pointer transition-colors ${
              selectedModules[mod.key]
                ? "border-primary/50 bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => toggleModule(mod.key)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <Checkbox
                id={`setup-module-${mod.key}`}
                checked={selectedModules[mod.key]}
                onCheckedChange={() => toggleModule(mod.key)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {mod.icon}
                  <Label
                    htmlFor={`setup-module-${mod.key}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {mod.label}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-7">
                  {mod.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6 py-2">
      <div>
        <h3 className="text-lg font-semibold">Schedule & Approval Mode</h3>
        <p className="text-sm text-muted-foreground">
          Configure how often autopilot runs and how actions are approved.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Run Schedule</Label>
        <Select value={schedule} onValueChange={(val: typeof schedule) => setSchedule(val)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select schedule" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Every Hour</SelectItem>
            <SelectItem value="daily">Every Day</SelectItem>
            <SelectItem value="weekly">Every Week</SelectItem>
            <SelectItem value="manual">Manual Only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {schedule === "hourly" && "Runs every hour — best for active compliance monitoring."}
          {schedule === "daily" && "Runs once per day — good for most compliance programs."}
          {schedule === "weekly" && "Runs once per week — suitable for low-velocity programs."}
          {schedule === "manual" && "Only runs when you trigger it manually."}
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Approval Mode</Label>
        <RadioGroup
          value={mode}
          onValueChange={(val: "auto" | "review") => setMode(val)}
          className="space-y-3"
        >
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              mode === "auto" ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("auto")}
          >
            <RadioGroupItem value="auto" id="setup-mode-auto" className="mt-1" />
            <div>
              <Label htmlFor="setup-mode-auto" className="text-sm font-medium cursor-pointer">
                Auto — Automatically approve all actions
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actions are executed without manual review. Best for trusted, stable environments.
              </p>
            </div>
          </div>
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              mode === "review" ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("review")}
          >
            <RadioGroupItem value="review" id="setup-mode-review" className="mt-1" />
            <div>
              <Label htmlFor="setup-mode-review" className="text-sm font-medium cursor-pointer">
                Review — Require approval for each action
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actions are queued for your review before execution. Recommended for sensitive environments.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-6 py-2">
      <div>
        <h3 className="text-lg font-semibold">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review your choices before enabling the autopilot.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Enabled Modules
            </p>
            <div className="flex flex-wrap gap-2">
              {MODULES.filter((m) => selectedModules[m.key]).map((mod) => (
                <Badge key={mod.key} variant="secondary" className="gap-1">
                  {mod.icon}
                  {mod.label}
                </Badge>
              ))}
              {MODULES.filter((m) => !selectedModules[m.key]).map((mod) => (
                <Badge key={mod.key} variant="outline" className="gap-1 text-muted-foreground">
                  {mod.icon}
                  {mod.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Schedule
              </p>
              <p className="text-sm font-medium capitalize">{schedule}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Approval Mode
              </p>
              <p className="text-sm font-medium capitalize">{mode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Ready to enable
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              The autopilot will start running immediately after you confirm. You can change these
              settings anytime from the Autopilot dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDone = () => (
    <div className="space-y-6 py-8 text-center">
      <div className="inline-flex rounded-full bg-green-100 p-6 dark:bg-green-900/30">
        <PartyPopper className="h-16 w-16 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-3xl font-bold">Done! Autopilot is running. 🎉</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your compliance autopilot is now active and managing your compliance program automatically.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Modules</p>
          <p className="font-semibold">{Object.values(selectedModules).filter(Boolean).length} active</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Schedule</p>
          <p className="font-semibold capitalize">{schedule}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Mode</p>
          <p className="font-semibold capitalize">{mode}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Monitoring</p>
          <p className="font-semibold">24/7</p>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep.key) {
      case "welcome":
        return renderWelcome();
      case "modules":
        return renderModules();
      case "schedule":
        return renderSchedule();
      case "confirm":
        return renderConfirm();
      case "done":
        return renderDone();
      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            Autopilot Setup
          </DialogTitle>
          <DialogDescription>
            Step {currentStepIdx + 1} of {totalSteps}: {currentStep.label}
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-1">
          {ALL_STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  idx === currentStepIdx
                    ? "bg-primary text-primary-foreground"
                    : idx < currentStepIdx
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {idx < currentStepIdx ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              {idx < totalSteps - 1 && (
                <div
                  className={`h-0.5 w-6 sm:w-10 transition-colors ${
                    idx < currentStepIdx ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Progress value={progressPercent} className="h-1" />

        {/* Step content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Footer */}
        <DialogFooter className="gap-2">
          {currentStep.key === "done" ? (
            <Button size="lg" onClick={handleDone} className="w-full sm:w-auto">
              Go to Autopilot Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              {currentStepIdx > 0 && (
                <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {currentStep.key === "confirm" ? (
                <Button onClick={handleEnable} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Enable Autopilot
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canAdvance()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
