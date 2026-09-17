// Agent Compliance Setup Wizard
// Walks users through: Agent Profile → Policy Card → Auto-Map → Report Card

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@complianceos/ui/ui/dialog";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from "@complianceos/ui/ui/button";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
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
import { Slider } from "@complianceos/ui/ui/slider";
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PartyPopper,
  ShieldCheck,
  FileText,
  Zap,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

interface AgentComplianceWizardProps {
  clientId: number;
  onComplete: () => void;
  onAgentCreated?: (agentId: number) => void;
}

type SetupStep =
  | "welcome"
  | "profile"
  | "security"
  | "tools"
  | "policy-card"
  | "auto-map"
  | "report-card"
  | "complete";

const STEPS: SetupStep[] = [
  "welcome",
  "profile",
  "security",
  "tools",
  "policy-card",
  "auto-map",
  "report-card",
  "complete",
];

const STEP_LABELS: Record<SetupStep, string> = {
  welcome: "Welcome",
  profile: "Agent Profile",
  security: "Security",
  tools: "Tools",
  "policy-card": "Policy Card",
  "auto-map": "Auto-Map",
  "report-card": "Report Card",
  complete: "Done",
};

const API_BASE = "/api/v1/agent-compliance";
const API_KEY = ""; // Populate from env

async function apiCall(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "API call failed");
  return json.data;
}

export function AgentComplianceWizard({
  clientId,
  onComplete,
  onAgentCreated,
}: AgentComplianceWizardProps) {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [agentId, setAgentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    description: "",
    type: "hermes",
    hosting: "docker_local",
    sandbox: "docker",
    owner: "",
  });

  // Security state
  const [security, setSecurity] = useState({
    memoryEncryption: true,
    networkIsolation: true,
    approvalMode: "manual" as "manual" | "smart" | "auto",
  });

  // Tools state
  const [tools, setTools] = useState<
    Array<{ name: string; category: string; requiresApproval: boolean }>
  >([]);

  // Policy card state
  const [policyCard, setPolicyCard] = useState({
    name: "",
    aiActRiskLevel: "limited",
    intendedUses: [] as string[],
    geography: [] as string[],
  });

  const stepIndex = STEPS.indexOf(step);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  // Step handlers
  const handleCreateProfile = useCallback(async () => {
    if (!profile.name) return toast.error("Agent name is required");
    setIsLoading(true);
    try {
      const created = await apiCall("/agents", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          ...profile,
          memoryEncryption: security.memoryEncryption,
          networkIsolation: security.networkIsolation,
          approvalMode: security.approvalMode,
          hosting: profile.hosting,
          sandbox: profile.sandbox,
        }),
      });
      setAgentId(created.id);
      onAgentCreated?.(created.id);
      toast.success("Agent profile created");
      nextStep();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [profile, security, clientId]);

  const handleSaveTools = useCallback(async () => {
    if (!agentId) return;
    if (tools.length === 0) return nextStep(); // Skip if no tools
    setIsLoading(true);
    try {
      const validTools = tools.filter(t => t.name.trim());
      for (const tool of validTools) {
        await apiCall(`/agents/${agentId}/tools`, {
          method: "POST",
          body: JSON.stringify({
            name: tool.name.trim(),
            category: tool.category,
            requiresApproval: tool.requiresApproval,
          }),
        });
      }
      toast.success(`${validTools.length} tool(s) saved`);
      nextStep();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, tools]);

  const handleCreatePolicyCard = useCallback(async () => {
    if (!agentId) return;
    if (!policyCard.name) return toast.error("Policy card name is required");
    setIsLoading(true);
    try {
      await apiCall(`/agents/${agentId}/policy-cards`, {
        method: "POST",
        body: JSON.stringify({
          name: policyCard.name,
          description: `Governance card for ${profile.name}`,
          aiActRiskLevel: policyCard.aiActRiskLevel,
          intendedUses: policyCard.intendedUses,
          geography: policyCard.geography,
          status: "active",
        }),
      });
      toast.success("Policy card created and activated");
      nextStep();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, policyCard, profile]);

  const handleAutoMap = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const result = await apiCall(`/agents/${agentId}/auto-map`, {
        method: "POST",
      });
      toast.success(
        `Auto-mapped ${result.totalMapped} controls. OWASP coverage: ${result.owaspCoverage}%`
      );
      nextStep();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const handleGenerateReport = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/report-card/pdf`, {
        headers: API_KEY ? { "X-API-Key": API_KEY } : {},
      });
      const html = await res.text();
      setReportHtml(html);
      toast.success("Report card generated");

      // Phase 4: Create engagement + portal token in background
      try {
        await apiCall(`/agents/${agentId}/engagement`, { method: "POST", body: JSON.stringify({ stage: "mapped" }) });
        await apiCall(`/agents/${agentId}/evaluate-engagement`, { method: "POST" });
      } catch { /* non-blocking */ }

      nextStep();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const handleComplete = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      // Generate portal token for client sharing
      const tokenRes = await apiCall(`/agents/${agentId}/portal-token`, {
        method: "POST",
        body: JSON.stringify({ expiresInDays: 90 }),
      });
      setPortalToken(tokenRes.token);
      setPortalUrl(tokenRes.url);
      toast.success("Compliance package complete!");
    } catch { /* non-blocking */ }
    setIsLoading(false);
    setStep("complete");
  }, [agentId]);

  const handlePrintReport = () => {
    if (!reportHtml) return;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(reportHtml);
      w.document.close();
      w.print();
    }
  };

  return (
    <Dialog open onOpenChange={onComplete}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agent Compliance Setup
          </DialogTitle>
          <DialogDescription>
            Deploy, govern, and generate compliance reports for your AI agent
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={
                  i <= stepIndex ? "text-primary font-medium" : ""
                }
              >
                {STEP_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        <Separator />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === "welcome" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  Welcome to Agent Compliance
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  This wizard will help you create a complete compliance
                  package for your AI agent in minutes: profile, policy card,
                  framework mappings, and a board-ready report card.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted p-3 rounded-lg">
                  <FileText className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                  <div className="font-medium">Policy Card</div>
                  <div className="text-xs text-muted-foreground">
                    Machine-readable governance
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">Auto-Mapping</div>
                  <div className="text-xs text-muted-foreground">
                    NIST/OWASP/EU AI Act/ISO
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <Zap className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                  <div className="font-medium">Report Card</div>
                  <div className="text-xs text-muted-foreground">
                    Board-ready PDF in one click
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Agent Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Agent Name *</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="e.g., Hermes Research Agent"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={profile.description}
                    onChange={(e) =>
                      setProfile({ ...profile, description: e.target.value })
                    }
                    placeholder="What does this agent do?"
                  />
                </div>
                <div>
                  <Label>Agent Type</Label>
                  <Select
                    value={profile.type}
                    onValueChange={(v) => setProfile({ ...profile, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hermes">Hermes Agent</SelectItem>
                      <SelectItem value="langchain">LangChain</SelectItem>
                      <SelectItem value="autogen">AutoGen</SelectItem>
                      <SelectItem value="crewai">CrewAI</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner / Responsible Person</Label>
                  <Input
                    value={profile.owner}
                    onChange={(e) =>
                      setProfile({ ...profile, owner: e.target.value })
                    }
                    placeholder="e.g., Emmanuel"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "security" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Security Posture</h3>
              <div className="space-y-3">
                <Card>
                  <CardContent className="pt-4">
                    <Label>Hosting Environment</Label>
                    <RadioGroup
                      value={profile.hosting}
                      onValueChange={(v) =>
                        setProfile({ ...profile, hosting: v as any })
                      }
                      className="mt-2 grid grid-cols-2 gap-2"
                    >
                      {[
                        { v: "docker_local", l: "Docker (Local)" },
                        { v: "docker_remote", l: "Docker (Remote VPS)" },
                        { v: "on_prem", l: "On-Premises" },
                        { v: "vps", l: "Cloud VPS" },
                      ].map((h) => (
                        <div key={h.v} className="flex items-center gap-2">
                          <RadioGroupItem value={h.v} id={`h-${h.v}`} />
                          <Label htmlFor={`h-${h.v}`} className="cursor-pointer">
                            {h.l}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <Label>Sandbox Isolation</Label>
                    <RadioGroup
                      value={profile.sandbox}
                      onValueChange={(v) =>
                        setProfile({ ...profile, sandbox: v as any })
                      }
                      className="mt-2 grid grid-cols-2 gap-2"
                    >
                      {[
                        { v: "docker", l: "Docker Container" },
                        { v: "vm", l: "Virtual Machine" },
                        { v: "ssh", l: "SSH Remote" },
                        { v: "none", l: "No Isolation" },
                      ].map((s) => (
                        <div key={s.v} className="flex items-center gap-2">
                          <RadioGroupItem value={s.v} id={`s-${s.v}`} />
                          <Label htmlFor={`s-${s.v}`} className="cursor-pointer">
                            {s.l}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={security.memoryEncryption}
                      onCheckedChange={(c) =>
                        setSecurity({
                          ...security,
                          memoryEncryption: c as boolean,
                        })
                      }
                    />
                    <Label>Memory Encryption</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={security.networkIsolation}
                      onCheckedChange={(c) =>
                        setSecurity({
                          ...security,
                          networkIsolation: c as boolean,
                        })
                      }
                    />
                    <Label>Network Isolation</Label>
                  </div>
                </div>
                <div>
                  <Label>Approval Mode</Label>
                  <Select
                    value={security.approvalMode}
                    onValueChange={(v) =>
                      setSecurity({
                        ...security,
                        approvalMode: v as any,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">
                        Manual (humans approve dangerous commands)
                      </SelectItem>
                      <SelectItem value="smart">Smart (risk-based)</SelectItem>
                      <SelectItem value="auto">Auto (no human in loop)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === "tools" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Tool Inventory</h3>
              <p className="text-sm text-muted-foreground">
                Define which tools this agent uses. You can skip this step and
                edit later.
              </p>
              {tools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tools added yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      setTools([
                        ...tools,
                        { name: "", category: "", requiresApproval: false },
                      ])
                    }
                  >
                    Add Tool
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tools.map((t, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Tool Name</Label>
                        <Input
                          value={t.name}
                          onChange={(e) => {
                            const n = [...tools];
                            n[i].name = e.target.value;
                            setTools(n);
                          }}
                          placeholder="e.g., web_search, file_read"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={t.category}
                          onValueChange={(v) => {
                            const n = [...tools];
                            n[i].category = v;
                            setTools(n);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="filesystem">Filesystem</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="browser">Browser</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTools(tools.filter((_, j) => j !== i))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTools([
                        ...tools,
                        { name: "", category: "", requiresApproval: false },
                      ])
                    }
                  >
                    + Add Another Tool
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "policy-card" && (
            <div className="space-y-4">
              <h3 className="font-semibold">AI Policy Card</h3>
              <div className="space-y-3">
                <div>
                  <Label>Policy Card Name *</Label>
                  <Input
                    value={policyCard.name}
                    onChange={(e) =>
                      setPolicyCard({ ...policyCard, name: e.target.value })
                    }
                    placeholder="e.g., GDPR-Compliant EU Research Agent"
                  />
                </div>
                <div>
                  <Label>EU AI Act Risk Level</Label>
                  <RadioGroup
                    value={policyCard.aiActRiskLevel}
                    onValueChange={(v) =>
                      setPolicyCard({ ...policyCard, aiActRiskLevel: v })
                    }
                    className="flex gap-4 mt-2"
                  >
                    {[
                      { v: "minimal", l: "Minimal" },
                      { v: "limited", l: "Limited" },
                      { v: "high", l: "High" },
                    ].map((r) => (
                      <div key={r.v} className="flex items-center gap-2">
                        <RadioGroupItem value={r.v} id={`r-${r.v}`} />
                        <Label htmlFor={`r-${r.v}`} className="cursor-pointer">
                          {r.l}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Intended Uses (comma-separated)</Label>
                  <Input
                    value={policyCard.intendedUses.join(", ")}
                    onChange={(e) =>
                      setPolicyCard({
                        ...policyCard,
                        intendedUses: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g., research, summarization, data analysis"
                  />
                </div>
                <div>
                  <Label>Geography (comma-separated ISO codes)</Label>
                  <Input
                    value={policyCard.geography.join(", ")}
                    onChange={(e) =>
                      setPolicyCard({
                        ...policyCard,
                        geography: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g., EU, EEA, US"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "auto-map" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  Auto-Map Agent to Compliance Frameworks
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  The system will automatically map your agent&apos;s security
                  posture to <strong>OWASP LLM Top 10</strong>,{" "}
                  <strong>NIST AI RMF</strong>, <strong>EU AI Act</strong>, and{" "}
                  <strong>ISO 42001</strong> controls —{" "}
                  <strong>43 controls total in seconds</strong>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">OWASP LLM</div>
                  <div className="text-muted-foreground">10 controls</div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">NIST AI RMF</div>
                  <div className="text-muted-foreground">11 controls</div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">EU AI Act</div>
                  <div className="text-muted-foreground">11 controls</div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">ISO 42001</div>
                  <div className="text-muted-foreground">7 controls</div>
                </div>
              </div>
            </div>
          )}

          {step === "report-card" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  Generate Report Card
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  One click generates a complete board-ready compliance report
                  including framework coverage, OWASP status, red team results,
                  policy card, assurance mappings, and evidence inventory.
                </p>
              </div>
              {reportHtml && (
                <div className="flex gap-2">
                  <Button onClick={handlePrintReport} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Print / Save PDF
                  </Button>
                  <Button onClick={() => setStep("complete")} variant="default">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  Agent Compliance Package Complete!
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Your agent now has a full compliance package: profile,
                  policy card, 43 framework mappings, and a board-ready report
                  card.
                </p>
              </div>
              {portalUrl && (
                <div className="w-full max-w-md">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Client Portal Ready</span>
                      </div>
                      <p className="text-xs text-blue-700 mb-2">Share this link with your client:</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={`/api/v1/agent-compliance/portal/${portalToken}/readiness`}
                          className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(`/api/v1/agent-compliance/portal/${portalToken}/readiness`)}
                        >
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (agentId) {
                      window.open(
                        `${API_BASE}/agents/${agentId}/report-card/pdf`,
                        "_blank"
                      );
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Report Card
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (agentId) {
                      window.open(
                        `${API_BASE}/agents/${agentId}/mappings`,
                        "_blank"
                      );
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Mappings
                </Button>
              </div>
              {reportHtml && (
                <Button onClick={handlePrintReport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Print / Save PDF
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step !== "welcome" && step !== "complete" && (
            <Button variant="outline" onClick={prevStep} disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {step === "welcome" && (
            <>
              <Button variant="outline" onClick={onComplete}>
                Cancel
              </Button>
              <Button onClick={nextStep}>
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {step === "profile" && (
            <Button onClick={handleCreateProfile} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Profile
            </Button>
          )}
          {step === "security" && (
            <Button onClick={nextStep}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === "tools" && (
            <Button onClick={handleSaveTools} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tools.length > 0 ? "Save Tools & Continue" : "Skip"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === "policy-card" && (
            <Button
              onClick={handleCreatePolicyCard}
              disabled={isLoading || !policyCard.name}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Policy Card
            </Button>
          )}
          {step === "auto-map" && (
            <Button onClick={handleAutoMap} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Brain className="h-4 w-4 mr-2" />
              Run Auto-Map
            </Button>
          )}
          {step === "report-card" && !reportHtml && (
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileText className="h-4 w-4 mr-2" />
              Generate Report Card
            </Button>
          )}
          {step === "report-card" && reportHtml && (
            <Button onClick={handleComplete} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finish & Generate Portal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === "complete" && (
            <Button onClick={onComplete}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
