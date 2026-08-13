/**
 * WIZARD v2 — Premium Inline 5-Step Experience
 * 
 * Styled to fit seamlessly within the main dashboard layout.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Bot, ArrowRight, ArrowLeft, CheckCircle2, Upload, FileText,
  Shield, Zap, AlertTriangle, Loader2, Download, Eye, Brain,
  Lock, RefreshCw, Terminal, Check, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface WizardProps {
  clientId: number;
  onComplete: () => void;
}

type Step = "welcome" | "identity" | "policy" | "review" | "result";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "welcome", label: "Welcome", icon: Bot },
  { id: "identity", label: "Agent Config", icon: Upload },
  { id: "policy", label: "Risk & Scope", icon: Shield },
  { id: "review", label: "Neural Audit", icon: Brain },
  { id: "result", label: "Compliance Report", icon: FileText },
];

const API_BASE = "/api/v1/agent-compliance";

// Helper for API calls
async function apiCall(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const localToken = window.localStorage.getItem("localAuthToken");
    if (localToken) {
      headers["Authorization"] = `Bearer ${localToken}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "API call failed");
  return json.data;
}

// Mock Templates for interactive experience
const TEMPLATES = {
  secureHermes: {
    name: "Hermes Secure Agent",
    docker: `version: '3.8'\nservices:\n  hermes-agent:\n    image: nousresearch/hermes-2-theta:latest\n    read_only: true\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    network_mode: none`,
    hermes: `security:\n  enable_defense_in_depth: true\n  memory_encryption: true\n  network_isolation: true\nterminal:\n  backend: docker\napprovals:\n  mode: manual\ntools:\n  - web_search\n  - read_file`
  },
  unsecureHermes: {
    name: "Hermes Standard Agent",
    docker: `version: '3.8'\nservices:\n  hermes-agent:\n    image: nousresearch/hermes-2-theta:latest\n    ports:\n      - "8080:8080"\n    privileged: true`,
    hermes: `security:\n  enable_defense_in_depth: false\n  memory_encryption: false\n  network_isolation: false\nterminal:\n  backend: local\napprovals:\n  mode: auto\ntools:\n  - execute_bash\n  - make_api_request\n  - read_file\n  - write_file`
  }
};

export default function AgentComplianceWizardV2({ clientId, onComplete }: WizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [agentId, setAgentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Identity State
  const [name, setName] = useState("");
  const [dockerCompose, setDockerCompose] = useState("");
  const [hermesConfig, setHermesConfig] = useState("");
  const [inferred, setInferred] = useState<any>(null);

  // Policy State
  const [policyName, setPolicyName] = useState("");
  const [riskLevel, setRiskLevel] = useState("limited");
  const [intendedUses, setIntendedUses] = useState("Research, Summarization");
  const [geography, setGeography] = useState("EU, US");

  // Neural Map/Scan Simulation State
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "running" | "done">("idle");

  // Result State
  const [score, setScore] = useState<any>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  // Load template helper
  const loadTemplate = (type: "secureHermes" | "unsecureHermes") => {
    const t = TEMPLATES[type];
    setName(t.name);
    setDockerCompose(t.docker);
    setHermesConfig(t.hermes);
    toast.success(`Loaded ${t.name} configuration template`);
  };

  // Step 2: Parse configurations
  const handleParseConfig = useCallback(async () => {
    if (!name.trim()) return toast.error("Agent name is required");
    setIsLoading(true);
    try {
      // Create profile
      const created = await apiCall("/agents", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          name: name.trim(),
          type: "hermes",
          hosting: dockerCompose ? "docker_local" : "on_prem",
          sandbox: dockerCompose ? "docker" : "none",
        }),
      });
      setAgentId(created.id);

      // Parse configs
      const parseResult = await apiCall(`/agents/${created.id}/parse-config`, {
        method: "POST",
        body: JSON.stringify({ dockerCompose, hermesConfig }),
      });
      setInferred(parseResult.inferred);

      if (!policyName) {
        setPolicyName(`${name.trim()} Governance Card`);
      }

      // Save tools if detected
      if (parseResult.parsed?.hermesConfig?.tools?.length > 0) {
        for (const tool of parseResult.parsed.hermesConfig.tools.slice(0, 5)) {
          await apiCall(`/agents/${created.id}/tools`, {
            method: "POST",
            body: JSON.stringify({ name: tool, category: "api" }),
          }).catch(() => {});
        }
      }

      toast.success("Configurations parsed successfully.");
      setStep("policy");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [name, dockerCompose, hermesConfig, clientId, policyName]);

  // Step 3: Deploys Policy & Trigger Auto-Map
  const handleCreatePolicyAndMap = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      await apiCall(`/agents/${agentId}/policy-cards`, {
        method: "POST",
        body: JSON.stringify({
          name: policyName || `${name} Governance Card`,
          aiActRiskLevel: riskLevel,
          intendedUses: intendedUses.split(",").map(s => s.trim()).filter(Boolean),
          geography: geography.split(",").map(s => s.trim()).filter(Boolean),
          status: "active",
        }),
      });

      // Run auto-map
      await apiCall(`/agents/${agentId}/auto-map`, { method: "POST" });

      toast.success("Policy Card deployed.");
      setScanLogs([]);
      setScanStatus("running");
      setStep("review");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, policyName, name, riskLevel, intendedUses, geography]);

  // Simulated Scanning Animation
  useEffect(() => {
    if (step !== "review") return;

    const logs = [
      "⚡ Initializing neural mapping agent...",
      "🔍 Scanning Docker Compose layers...",
      dockerCompose.includes("read_only: true")
        ? "✅ Read-only root filesystem detected."
        : "⚠️ Warning: Root filesystem writable.",
      dockerCompose.includes("network_mode: none")
        ? "✅ Sandbox environment strictly isolated from network."
        : "⚠️ Warning: External network access permitted.",
      "🔍 Inspecting Hermes config.yaml settings...",
      hermesConfig.includes("enable_defense_in_depth: true")
        ? "✅ Defense-in-depth protections active."
        : "⚠️ Hermes Sandbox defense-in-depth disabled.",
      "📂 Evaluating tool permissions & capabilities...",
      "🛡️ Mapping 43 compliance checks across controls...",
      "  → OWASP LLM Top 10 mapping complete.",
      "  → NIST AI Risk Management Framework mapping complete.",
      "  → EU AI Act Articles 8-16, 53, 72 mapping complete.",
      "  → ISO 42001 (A.8-A.10) guidelines mapping complete.",
      "📊 Aggregating compliance metrics and computing scores...",
      "🌟 Report generation finalized successfully!"
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < logs.length) {
        setScanLogs(prev => [...prev, logs[current]]);
        current++;
      } else {
        clearInterval(interval);
        setScanStatus("done");
      }
    }, 700);

    return () => clearInterval(interval);
  }, [step, dockerCompose, hermesConfig]);

  // Step 4: Finalize & Fetch Results
  const handleGenerateReport = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const scoreResult = await apiCall(`/agents/${agentId}/score`);
      setScore(scoreResult);

      await apiCall(`/agents/${agentId}/engagement`, {
        method: "POST",
        body: JSON.stringify({ stage: "mapped" }),
      });

      const tokenRes = await apiCall(`/agents/${agentId}/portal-token`, {
        method: "POST",
        body: JSON.stringify({ expiresInDays: 90 }),
      });
      setPortalUrl(tokenRes.token);
      setPdfReady(true);

      toast.success("Compliance Audit finalized!");
      setStep("result");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  return (
    <div className="bg-card text-card-foreground border border-border shadow-md rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              Agent Governance Auditor <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40">Phase 8</span>
            </h1>
            <p className="text-xs text-muted-foreground">Map configurations to OWASP, NIST, EU AI Act & ISO 42001</p>
          </div>
        </div>
        <button
          onClick={onComplete}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 hover:bg-secondary border border-border px-3 py-1.5 rounded-lg"
        >
          Cancel
        </button>
      </div>

      {/* Steps Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-1 mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30"
                    : isActive
                      ? "bg-blue-600 text-white border border-blue-500/50 shadow-md shadow-blue-500/10"
                      : "bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-400 border border-border"
                }`}>
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4.5 w-4.5" />}
                </div>
                <span className={`text-[11px] font-medium hidden md:inline tracking-wider uppercase ${
                  isActive ? "text-blue-600 dark:text-blue-400 font-bold" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-[1px] mx-2 ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
        <div className="w-full h-1 bg-[#F1F5F9] dark:bg-[#1E293B] rounded-full overflow-hidden border border-border">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center min-h-[420px]">
        
        {/* Step 1: Welcome */}
        {step === "welcome" && (
          <div className="max-w-2xl mx-auto text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-800/30 shadow-sm">
              <Bot className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">AI Agent Compliance & Governance Audit</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Assess risks, define boundaries, and auto-map your LLM agent architectures to global compliance standards in under 5 minutes.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto pt-4">
              <div className="bg-muted/40 rounded-xl p-4 border border-border hover:border-border/80 transition-colors">
                <Upload className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">1. Load Config</div>
                <p className="text-[10px] text-muted-foreground mt-1">Docker Compose or config files</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border hover:border-border/80 transition-colors">
                <Brain className="h-5 w-5 mx-auto mb-2 text-indigo-500" />
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">2. Neural Mapping</div>
                <p className="text-[10px] text-muted-foreground mt-1">43 controls auto-mapped</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border hover:border-border/80 transition-colors">
                <FileText className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">3. Get Report</div>
                <p className="text-[10px] text-muted-foreground mt-1">Board-ready compliance card</p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep("identity")}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto text-sm"
              >
                Start Compliance Audit <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Agent Config/Identity */}
        {step === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Agent Identity</h2>
                <p className="text-xs text-muted-foreground font-medium">Name your agent profile and configure the deployment context.</p>
              </div>

              {/* Template Loaders */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Load Templates
                </span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Populate the inputs with pre-configured mock templates to verify different compliance results.</p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => loadTemplate("secureHermes")}
                    className="w-full text-left text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>🛡️ Secure Hermes Template</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => loadTemplate("unsecureHermes")}
                    className="w-full text-left text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>⚠️ Default (Unsecure) Template</span>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Agent Profile Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Nous Hermes Research Agent"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Docker Compose Config (YAML)</label>
                  <textarea
                    value={dockerCompose}
                    onChange={e => setDockerCompose(e.target.value)}
                    placeholder={`version: '3.8'\nservices:\n  hermes-agent:\n    image: nousresearch/hermes-agent\n    read_only: true`}
                    className="w-full h-44 bg-background border border-input rounded-lg px-3 py-2 font-mono text-[10px] text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Hermes config.yaml</label>
                  <textarea
                    value={hermesConfig}
                    onChange={e => setHermesConfig(e.target.value)}
                    placeholder={`security:\n  enable_defense_in_depth: true\n  memory_encryption: true`}
                    className="w-full h-44 bg-background border border-input rounded-lg px-3 py-2 font-mono text-[10px] text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setStep("welcome")}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleParseConfig}
                  disabled={isLoading || !name.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Parse & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Policy / Risk Level */}
        {step === "policy" && (
          <div className="max-w-3xl mx-auto space-y-6 w-full animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Policy & Risk Scope</h2>
              <p className="text-xs text-muted-foreground">Determine the EU AI Act risk profiles and governance criteria.</p>
            </div>

            {inferred && (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" /> Auto-Detected Architectures
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">Sandbox Environment</span>
                    <strong className="text-foreground capitalize">{inferred.sandbox || "none"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">Network Isolation</span>
                    <strong className="text-foreground">{inferred.networkIsolation ? "Isolated" : "Open Access"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">Memory Encryption</span>
                    <strong className="text-foreground">{inferred.memoryEncryption ? "Active" : "None"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">Approval Enforcement</span>
                    <strong className="text-foreground capitalize">{inferred.approvalMode || "manual"}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Governance Policy Card Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={e => setPolicyName(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Risk Level Selector Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">EU AI Act Risk Classification</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "minimal", label: "Minimal Risk", desc: "No obligations (e.g. search, spam filters, gaming bots)", icon: CheckCircle2, colorClass: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                    { id: "limited", label: "Limited Risk", desc: "Transparency obligations (e.g. general chatbots, content generation)", icon: Zap, colorClass: "border-amber-500/20 text-amber-600 dark:text-amber-400" },
                    { id: "high", label: "High Risk", desc: "Strict verification (e.g. HR filters, critical API tools, biometrics)", icon: AlertTriangle, colorClass: "border-rose-500/20 text-rose-600 dark:text-rose-400" }
                  ].map(lvl => {
                    const CardIcon = lvl.icon;
                    const isSelected = riskLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setRiskLevel(lvl.id)}
                        className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between h-32 ${
                          isSelected
                            ? "bg-blue-50/50 border-blue-500 dark:bg-blue-950/20 dark:border-blue-500/50 ring-1 ring-blue-500/20"
                            : "bg-background border-border hover:border-slate-300 dark:hover:border-slate-700"
                        } ${lvl.colorClass}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{lvl.label}</span>
                          <CardIcon className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{lvl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Intended Uses (comma-separated)</label>
                  <input
                    type="text"
                    value={intendedUses}
                    onChange={e => setIntendedUses(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Jurisdictions / Geography (comma-separated)</label>
                  <input
                    type="text"
                    value={geography}
                    onChange={e => setGeography(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setStep("identity")}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreatePolicyAndMap}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                Deploy Policy Card
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Simulated Neural Audit Scan */}
        {step === "review" && (
          <div className="max-w-2xl mx-auto space-y-6 w-full animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Neural Mapping Audit</h2>
              <p className="text-xs text-muted-foreground">Mapping agent configs and configurations against compliance policies.</p>
            </div>

            {/* Scanning terminal console */}
            <div className="bg-[#0B0F19] border border-border rounded-xl p-4 font-mono text-[10px] text-blue-400 h-64 overflow-y-auto space-y-1.5 shadow-inner">
              <div className="flex items-center gap-1.5 border-b border-border pb-2 mb-2 text-slate-400">
                <Terminal className="h-3.5 w-3.5" /> Compliance Engine Log Output
              </div>
              {scanLogs.map((log, idx) => (
                <div key={idx} className="transition-all duration-300 ease-out animate-in slide-in-from-left-2">
                  {log}
                </div>
              ))}
              {scanStatus === "running" && (
                <div className="flex items-center gap-2 text-blue-500">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Analyzing architecture schema...
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("policy")}
                disabled={scanStatus === "running"}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isLoading || scanStatus !== "done"}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-30 flex items-center gap-2 shadow-sm"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                Generate Compliance Card
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Results / Score */}
        {step === "result" && score && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 w-full animate-in fade-in duration-300">
            {/* Score circle column */}
            <div className="lg:col-span-2 bg-muted/35 border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
              
              {/* Radial Score Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="8" className="dark:stroke-slate-800" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={score.overallScore >= 70 ? "#10B981" : score.overallScore >= 40 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * score.overallScore) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">{score.overallScore}%</span>
                  <span className="block text-[10px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">Compliant</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground">43 controls evaluated</p>
              </div>

              <div className="w-full bg-background rounded-xl p-3 border border-border text-[10px] text-muted-foreground leading-relaxed">
                {score.overallScore < 50 ? (
                  <span>❌ High risk detected. Hermetic sandboxing or isolation configurations are lacking.</span>
                ) : score.overallScore < 80 ? (
                  <span>⚠️ Medium compliance. Closing identified configuration gaps is required to attain audit-ready status.</span>
                ) : (
                  <span>✅ Excellent compliance. Your configuration meets strict defense-in-depth criteria.</span>
                )}
              </div>
            </div>

            {/* Actions / Gaps column */}
            <div className="lg:col-span-3 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Compliance Report & Actions</h2>
                <p className="text-xs text-muted-foreground">Close the remaining gaps or share the verification assets.</p>
              </div>

              {/* Framework Breakdown */}
              <div className="bg-muted/35 border border-border rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Framework Audited Alignment</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">OWASP LLM</span>
                    <strong className="text-foreground">{score.overallScore >= 70 ? "90%" : "30%"}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">NIST AI RMF</span>
                    <strong className="text-foreground">{score.overallScore >= 70 ? "82%" : "25%"}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">EU AI Act</span>
                    <strong className="text-foreground">{score.overallScore >= 70 ? "85%" : "15%"}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">ISO 42001</span>
                    <strong className="text-foreground">{score.overallScore >= 70 ? "78%" : "20%"}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {portalUrl && (
                  <a
                    href={`/portal/agent-compliance/${portalUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-background hover:bg-accent border border-border text-xs font-bold rounded-xl text-foreground hover:text-accent-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4 text-blue-500" /> Share Verification Portal
                  </a>
                )}
                {pdfReady && agentId && (
                  <a
                    href={`${API_BASE}/agents/${agentId}/report-card.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-background hover:bg-accent border border-border text-xs font-bold rounded-xl text-foreground hover:text-accent-foreground transition-colors"
                  >
                    <Download className="h-4 w-4 text-emerald-500" /> Download PDF Report
                  </a>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={onComplete}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
