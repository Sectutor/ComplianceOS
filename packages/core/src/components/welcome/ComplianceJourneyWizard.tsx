// Compliance Journey Wizard — 8-step guided setup experience
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
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
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Globe,
  Users,
  Link,
  Upload,
  Mail,
  PartyPopper,
  Loader2,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type JourneyStep =
  | "welcome"
  | "select_framework"
  | "review_controls"
  | "assign_owners"
  | "connect_tools"
  | "add_evidence"
  | "invite_team"
  | "setup_complete";

const ALL_STEPS: { key: JourneyStep; label: string; icon: React.ReactNode }[] = [
  { key: "welcome", label: "Welcome", icon: <Sparkles className="h-4 w-4" /> },
  { key: "select_framework", label: "Framework", icon: <Shield className="h-4 w-4" /> },
  { key: "review_controls", label: "Controls", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "assign_owners", label: "Owners", icon: <Users className="h-4 w-4" /> },
  { key: "connect_tools", label: "Tools", icon: <Link className="h-4 w-4" /> },
  { key: "add_evidence", label: "Evidence", icon: <Upload className="h-4 w-4" /> },
  { key: "invite_team", label: "Team", icon: <Mail className="h-4 w-4" /> },
  { key: "setup_complete", label: "Done", icon: <PartyPopper className="h-4 w-4" /> },
];

const FRAMEWORKS = [
  {
    id: "iso27001",
    name: "ISO 27001",
    description: "Information Security Management System",
    controls: 114,
    timeline: "3–6 months",
    color: "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700",
  },
  {
    id: "soc2",
    name: "SOC 2",
    description: "Service Organization Controls (Trust Services)",
    controls: 64,
    timeline: "3–6 months",
    color: "bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700",
  },
  {
    id: "nis2",
    name: "NIS2",
    description: "EU Network & Information Security Directive",
    controls: 76,
    timeline: "2–4 months",
    color: "bg-purple-100 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700",
  },
  {
    id: "gdpr",
    name: "GDPR",
    description: "EU General Data Protection Regulation",
    controls: 48,
    timeline: "2–4 months",
    color: "bg-indigo-100 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700",
  },
  {
    id: "hipaa",
    name: "HIPAA",
    description: "Health Insurance Portability & Accountability Act",
    controls: 42,
    timeline: "2–5 months",
    color: "bg-red-100 border-red-300 dark:bg-red-900/20 dark:border-red-700",
  },
  {
    id: "nist_csf",
    name: "NIST CSF",
    description: "Cybersecurity Framework",
    controls: 108,
    timeline: "3–6 months",
    color: "bg-amber-100 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700",
  },
];

const CONTROL_CATEGORIES: Record<string, { domain: string; items: string[] }[]> = {
  iso27001: [
    {
      domain: "Context & Leadership",
      items: [
        "4.1 Understanding the organization and its context",
        "4.2 Understanding the needs and expectations of interested parties",
        "4.3 Determining the scope of the ISMS",
        "5.1 Leadership and commitment",
        "5.2 Policy",
      ],
    },
    {
      domain: "Planning & Support",
      items: [
        "6.1 Actions to address risks and opportunities",
        "6.2 Information security objectives",
        "7.1 Resources",
        "7.2 Competence",
        "7.3 Awareness",
      ],
    },
    {
      domain: "Operation & Performance",
      items: [
        "8.1 Operational planning and control",
        "8.2 Information security risk assessment",
        "8.3 Information security risk treatment",
        "9.1 Monitoring, measurement, analysis and evaluation",
        "9.2 Internal audit",
      ],
    },
    {
      domain: "Improvement & Annex A",
      items: [
        "10.1 Nonconformity and corrective action",
        "10.2 Continual improvement",
        "A.5 Information security policies",
        "A.6 Organization of information security",
        "A.7 Human resource security",
      ],
    },
  ],
  soc2: [
    {
      domain: "Security (Common Criteria)",
      items: [
        "CC1.0 Control Environment",
        "CC2.0 Communication & Information",
        "CC3.0 Risk Assessment",
        "CC4.0 Monitoring Activities",
        "CC5.0 Control Activities",
      ],
    },
    {
      domain: "Additional Trust Services",
      items: [
        "A1.0 Availability",
        "C1.0 Confidentiality",
        "PI1.0 Processing Integrity",
        "P1.0 Privacy",
      ],
    },
  ],
  nist_csf: [
    {
      domain: "Govern",
      items: [
        "GV.OC — Organizational Context",
        "GV.RM — Risk Management Strategy",
        "GV.RR — Roles, Responsibilities & Authorities",
        "GV.SC — Supply Chain Risk Management",
      ],
    },
    {
      domain: "Identify & Protect",
      items: [
        "ID.AM — Asset Management",
        "ID.RA — Risk Assessment",
        "ID.IM — Improvement",
        "PR.AC — Identity Management & Access Control",
        "PR.DS — Data Security",
      ],
    },
    {
      domain: "Detect & Respond",
      items: [
        "DE.AE — Anomalies & Events",
        "DE.CM — Continuous Monitoring",
        "RS.MA — Incident Management",
        "RS.CO — Communications",
      ],
    },
    {
      domain: "Recover",
      items: [
        "RC.RP — Recovery Planning",
        "RC.IM — Improvement",
        "RC.CO — Communications",
      ],
    },
  ],
};

const TOOLS = [
  { id: "aws", name: "AWS", description: "Cloud infrastructure & access logs" },
  { id: "github", name: "GitHub", description: "Code repository & CI/CD activity" },
  { id: "okta", name: "Okta", description: "Identity & access management" },
  { id: "google_workspace", name: "Google Workspace", description: "Email & collaboration" },
  { id: "docker", name: "Docker", description: "Container security & registries" },
];

interface ComplianceJourneyWizardProps {
  clientId: number;
  open?: boolean;
  onClose?: () => void;
}

export function ComplianceJourneyWizard({
  clientId,
  open: externalOpen,
  onClose,
}: ComplianceJourneyWizardProps) {
  const [, setLocation] = useLocation();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const close = useCallback(() => {
    if (onClose) onClose();
    else setInternalOpen(false);
  }, [onClose]);

  const { data: journey, isLoading: journeyLoading } =
    trpc.complianceJourney.getState.useQuery({ clientId });
  const { data: progress } = trpc.complianceJourney.getProgress.useQuery(
    { clientId },
    { enabled: !!journey }
  );
  const advanceMutation = trpc.complianceJourney.advance.useMutation();
  const skipMutation = trpc.complianceJourney.skip.useMutation();
  const setFrameworkMutation = trpc.complianceJourney.setFramework.useMutation();
  const utils = trpc.useUtils();

  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [ownerAssignments, setOwnerAssignments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If journey is complete, show summary card
  if (!journeyLoading && journey?.onboardingStatus === "complete") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Setup Complete! 🎉</CardTitle>
              <CardDescription>
                Your compliance program is all set up and ready.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Framework</p>
              <p className="text-lg font-semibold capitalize">
                {journey.selectedFramework?.replace("_", " ") || "Not selected"}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
          </div>
          <Button className="w-full" onClick={() => setLocation(`/clients/${clientId}`)}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStepKey: JourneyStep =
    (journey?.currentStep as JourneyStep) || "welcome";
  const currentIdx = ALL_STEPS.findIndex((s) => s.key === currentStepKey);

  const handleAdvance = async (step: JourneyStep) => {
    setIsSubmitting(true);
    try {
      await advanceMutation.mutateAsync({ clientId, step });
      await utils.complianceJourney.getState.invalidate({ clientId });
      await utils.complianceJourney.getProgress.invalidate({ clientId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to advance step");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async (step: JourneyStep) => {
    setIsSubmitting(true);
    try {
      await skipMutation.mutateAsync({ clientId, step });
      await utils.complianceJourney.getState.invalidate({ clientId });
      await utils.complianceJourney.getProgress.invalidate({ clientId });
      toast.info(`Skipped ${step.replace(/_/g, " ")} — you can do this later`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to skip step");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectFramework = async (fw: string) => {
    setSelectedFramework(fw);
    try {
      await setFrameworkMutation.mutateAsync({ clientId, framework: fw });
    } catch (err: any) {
      toast.error(err?.message || "Failed to select framework");
    }
  };

  const renderStepIndicator = () => (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-center gap-1 min-w-max px-2">
        {ALL_STEPS.map((step, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isDone = step.key === "setup_complete";
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast || journey?.completedSteps?.includes(step.key)
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast || journey?.completedSteps?.includes(step.key) ? (
                  <Check className="h-3 w-3" />
                ) : (
                  step.icon
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < ALL_STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-6 mx-1 rounded ${
                    idx < currentIdx ? "bg-green-400" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWelcome = () => (
    <div className="space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex rounded-full bg-primary/10 p-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Let's get you compliant</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We'll guide you through setting up your compliance program step by step.
          First, choose a framework to get started.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw.id}
            onClick={() => handleSelectFramework(fw.id)}
            className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
              selectedFramework === fw.id || journey?.selectedFramework === fw.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            } ${fw.color}`}
          >
            {selectedFramework === fw.id ||
              (journey?.selectedFramework === fw.id && (
                <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
              ))}
            <p className="font-semibold text-sm">{fw.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{fw.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{fw.controls} controls</p>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={() => handleAdvance("welcome")}
          disabled={!journey?.selectedFramework && !selectedFramework || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Let's Start <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSelectFramework = () => {
    const fw = FRAMEWORKS.find(
      (f) => f.id === (journey?.selectedFramework || selectedFramework)
    );
    if (!fw) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please select a framework first.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => handleSkip("select_framework")}
          >
            Skip for now
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{fw.name}</h2>
          <p className="text-muted-foreground mt-1">{fw.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{fw.controls}</p>
              <p className="text-xs text-muted-foreground">
                This framework requires approximately {fw.controls} controls.
                We'll create them for you.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{fw.timeline}</p>
              <p className="text-xs text-muted-foreground">
                Typical time to achieve compliance
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {fw.id === "iso27001"
                  ? "Annex A"
                  : fw.id === "soc2"
                  ? "TSC"
                  : "Full Scope"}
              </p>
              <p className="text-xs text-muted-foreground">
                {fw.id === "iso27001"
                  ? "93 Annex A controls + ISMS clauses"
                  : fw.id === "soc2"
                  ? "Trust Services Criteria"
                  : "All applicable requirements"}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={() => handleSkip("select_framework")} disabled={isSubmitting}>
            Not sure? Skip for now
          </Button>
          <Button onClick={() => handleAdvance("select_framework")} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Confirm Framework <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderReviewControls = () => {
    const frameworkId = journey?.selectedFramework || selectedFramework || "iso27001";
    const categories = CONTROL_CATEGORIES[frameworkId] || CONTROL_CATEGORIES.iso27001;
    const controlCount = categories.reduce((acc, cat) => acc + cat.items.length, 0);
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Review Controls</h2>
          <p className="text-muted-foreground mt-1">
            Here are the <strong>{controlCount}</strong> controls we'll create for{" "}
            {FRAMEWORKS.find((f) => f.id === frameworkId)?.name || frameworkId}.
            You can customize these later.
          </p>
        </div>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {categories.map((cat) => (
            <Card key={cat.domain}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{cat.domain}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => handleSkip("review_controls")} disabled={isSubmitting}>
            Skip review
          </Button>
          <Button onClick={() => handleAdvance("review_controls")} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Looks good, create controls <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderAssignOwners = () => {
    const frameworkId = journey?.selectedFramework || selectedFramework || "iso27001";
    const categories = CONTROL_CATEGORIES[frameworkId] || CONTROL_CATEGORIES.iso27001;

    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Assign Owners</h2>
          <p className="text-muted-foreground mt-1">
            Who's responsible for these control areas?
          </p>
        </div>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div
              key={cat.domain}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{cat.domain}</p>
                <p className="text-xs text-muted-foreground">{cat.items.length} controls</p>
              </div>
              <Input
                placeholder="e.g. Engineering, HR, Security"
                className="max-w-xs"
                value={ownerAssignments[cat.domain] || ""}
                onChange={(e) =>
                  setOwnerAssignments((prev) => ({
                    ...prev,
                    [cat.domain]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => handleSkip("assign_owners")} disabled={isSubmitting}>
            I'll do this later
          </Button>
          <Button onClick={() => handleAdvance("assign_owners")} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderConnectTools = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Connect Tools</h2>
        <p className="text-muted-foreground mt-1">
          Automate your evidence collection by connecting your existing tools.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <Card
            key={tool.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-muted p-2">
                <Link className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => handleSkip("connect_tools")} disabled={isSubmitting}>
          Skip for now
        </Button>
        <Button onClick={() => handleAdvance("connect_tools")} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderAddEvidence = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Add Evidence</h2>
        <p className="text-muted-foreground mt-1">
          Upload your first evidence item to get started.
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse. Supported: PDF, PNG, JPG, DOCX up to 25MB
            </p>
          </div>
          <Button variant="outline" size="sm">
            Browse Files
          </Button>
        </CardContent>
      </Card>
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => handleSkip("add_evidence")} disabled={isSubmitting}>
          I'll do this later
        </Button>
        <Button onClick={() => handleAdvance("add_evidence")} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderInviteTeam = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Invite Your Team</h2>
        <p className="text-muted-foreground mt-1">
          They'll help you manage controls and evidence.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="emails">Email addresses</Label>
          <Input
            id="emails"
            placeholder="colleague@company.com, another@company.com"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Separate multiple emails with commas
          </p>
        </div>
        <div>
          <Label htmlFor="role">Default role</Label>
          <select
            id="role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="editor">Editor (can edit controls & evidence)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => handleSkip("invite_team")} disabled={isSubmitting}>
          Skip for now
        </Button>
        <div className="flex gap-2">
          {inviteEmails.trim() && (
            <Button variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Send Invitations
            </Button>
          )}
          <Button onClick={() => handleAdvance("invite_team")} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSetupComplete = () => (
    <div className="space-y-8 py-8 text-center">
      <div className="inline-flex rounded-full bg-green-100 p-6 dark:bg-green-900/30">
        <PartyPopper className="h-16 w-16 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-3xl font-bold">Setup Complete! 🎉</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your compliance program is set up and ready to go.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Framework</p>
          <p className="font-semibold capitalize">
            {journey?.selectedFramework?.replace("_", " ") || "N/A"}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Controls</p>
          <p className="font-semibold">
            {FRAMEWORKS.find((f) => f.id === journey?.selectedFramework)?.controls || "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Tools</p>
          <p className="font-semibold">0 connected</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Team</p>
          <p className="font-semibold">Ready to invite</p>
        </div>
      </div>
      <Button size="lg" onClick={() => setLocation(`/clients/${clientId}`)}>
        Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStepKey) {
      case "welcome":
        return renderWelcome();
      case "select_framework":
        return renderSelectFramework();
      case "review_controls":
        return renderReviewControls();
      case "assign_owners":
        return renderAssignOwners();
      case "connect_tools":
        return renderConnectTools();
      case "add_evidence":
        return renderAddEvidence();
      case "invite_team":
        return renderInviteTeam();
      case "setup_complete":
        return renderSetupComplete();
      default:
        return renderWelcome();
    }
  };

  if (journeyLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      {progress && (
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Setup Progress</span>
            <span className="text-sm font-medium">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}
      {renderStepIndicator()}
      <CardContent>{renderStepContent()}</CardContent>
    </Card>
  );
}
