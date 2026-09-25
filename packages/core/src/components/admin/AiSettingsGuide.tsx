/**
 * AI Settings Guide — Inline documentation panel for the LLM Settings page.
 *
 * Renders a collapsible, tabbed guide covering:
 * - LLM Providers
 * - Local Models
 * * - Dynamic Routing
 * - AI Privacy & Features (all 12 features)
 * - Configuration recipes
 * - Troubleshooting
 * - Security & compliance
 */

import React, { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Alert, AlertDescription, AlertTitle,
  Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@complianceos/ui";
import {
  BookOpen, ChevronDown, Server, Cpu, Route, Shield, FileText,
  AlertTriangle, Lightbulb, Lock, HelpCircle, Zap, Eye, EyeOff,
  FlaskConical, CheckCircle2, XCircle, Info, ChevronRight,
} from "lucide-react";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function AiSettingsGuide() {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("providers");

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const sections: GuideSection[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <BookOpen className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The <strong>AI & LLM Settings</strong> page is the central control hub for all artificial intelligence capabilities in ComplianceOS. It is organized into five tabs across the top of this page.
          </p>
          <div className="rounded-lg border divide-y">
            <div className="p-3 flex items-start gap-3">
              <Server className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">LLM Providers</p>
                <p className="text-xs text-muted-foreground">Add and manage AI model providers (OpenAI, Anthropic, Gemini, JevAI, etc.)</p>
              </div>
            </div>
            <div className="p-3 flex items-start gap-3">
              <Cpu className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Local GRC Models & Hardware Guide</p>
                <p className="text-xs text-muted-foreground">Discover and configure local/self-hosted LLM runtimes (Ollama, LM Studio, vLLM)</p>
              </div>
            </div>
            <div className="p-3 flex items-start gap-3">
              <Route className="h-4 w-4 mt-0.5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Dynamic Routing</p>
                <p className="text-xs text-muted-foreground">Route specific features to specific AI providers for cost/performance optimization</p>
              </div>
            </div>
            <div className="p-3 flex items-start gap-3">
              <FileText className="h-4 w-4 mt-0.5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Data & Indexing</p>
                <p className="text-xs text-muted-foreground">Manage knowledge base embeddings and reindexing for semantic search</p>
              </div>
            </div>
            <div className="p-3 flex items-start gap-3">
              <Shield className="h-4 w-4 mt-0.5 text-red-500" />
              <div>
                <p className="text-sm font-medium">AI Privacy & Features</p>
                <p className="text-xs text-muted-foreground">Control external AI data sharing and enable 12 AI-powered compliance features</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "providers",
      title: "LLM Providers",
      icon: <Server className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Supported Providers</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "OpenAI", models: "GPT-4o, GPT-4, GPT-3.5" },
                { name: "Anthropic", models: "Claude 3.5 Sonnet, Claude 3 Opus" },
                { name: "Google", models: "Gemini Pro, Gemini Ultra" },
                { name: "DeepSeek", models: "DeepSeek Chat, Coder" },
                { name: "OpenRouter", models: "100+ models aggregated" },
                { name: "JevAI", models: "Classifier, Router, Scorer" },
                { name: "Ollama", models: "Local Llama, Mistral, etc." },
                { name: "Custom", models: "Any OpenAI-compatible API" },
              ].map((p) => (
                <div key={p.name} className="rounded border p-2">
                  <p className="text-xs font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.models}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Provider Priority & Failover</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Providers are tried in priority order (highest first). If the highest-priority provider fails, the system automatically falls back to the next one.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p><strong>Cost optimization:</strong> Set cheap models as high priority, expensive as backup</p>
              <p><strong>Redundancy:</strong> If OpenAI rate-limits, fall back to Anthropic</p>
              <p><strong>Data residency:</strong> Use EU-based providers as primary, US as backup</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">How to Add a Provider</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click <strong>"Add Provider"</strong></li>
              <li>Enter a friendly name (e.g., "Company OpenAI")</li>
              <li>Select the provider type from the dropdown</li>
              <li>Enter the model ID and your API key</li>
              <li>Set priority (higher = tried first)</li>
              <li>Click <strong>"Create Provider"</strong></li>
              <li>Click <strong>"Test"</strong> to verify connectivity</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "local-models",
      title: "Local GRC Models",
      icon: <Cpu className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Zero Data Leaves Your Infrastructure</AlertTitle>
            <AlertDescription className="text-xs">
              Local models run entirely on your hardware. No data is sent to any external server. This is the safest option for sensitive compliance data.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="text-sm font-semibold mb-2">Hardware Requirements</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Tier</th>
                    <th className="text-left p-2">Hardware</th>
                    <th className="text-left p-2">Models</th>
                    <th className="text-left p-2">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">Workstation</td>
                    <td className="p-2">16GB RAM, 4-core CPU</td>
                    <td className="p-2">7B-8B parameter</td>
                    <td className="p-2">$0 (existing)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Pro Workstation</td>
                    <td className="p-2">32GB RAM, 8-core CPU</td>
                    <td className="p-2">13B-34B parameter</td>
                    <td className="p-2">$500-1500</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Enterprise GPU</td>
                    <td className="p-2">64GB+ RAM, RTX 4090/A100</td>
                    <td className="p-2">70B+ parameter</td>
                    <td className="p-2">$3000-8000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Supported Local Runtimes</h4>
            <div className="space-y-2">
              {[
                { name: "Ollama", desc: "Easy-to-use local LLM runner. Best for developers and small teams.", port: "11434" },
                { name: "LM Studio", desc: "GUI-based local LLM manager. Best for non-technical users.", port: "1234" },
                { name: "vLLM", desc: "High-performance inference server. Best for production deployments.", port: "8000" },
                { name: "LocalAI", desc: "OpenAI-compatible local API. Drop-in replacement.", port: "8080" },
              ].map((r) => (
                <div key={r.name} className="rounded border p-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">:{r.port}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "dynamic-routing",
      title: "Dynamic Routing",
      icon: <Route className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dynamic Routing lets you assign specific AI features to specific providers. This gives you fine-grained control over cost, performance, and data residency.
          </p>

          <div>
            <h4 className="text-sm font-semibold mb-2">Feature Routing Reference</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Feature</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Recommended</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">General Advisor</td>
                    <td className="p-2">Chat and general Q&A</td>
                    <td className="p-2">Cheap model (GPT-4o-mini)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Risk Analysis</td>
                    <td className="p-2">Risk scoring and triage</td>
                    <td className="p-2">Accurate model (GPT-4o)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Policy Generation</td>
                    <td className="p-2">Policy drafting and tailoring</td>
                    <td className="p-2">Long-context (Claude Sonnet)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Tech Suggestions</td>
                    <td className="p-2">Control/tool recommendations</td>
                    <td className="p-2">Any capable model</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Implementation Plan</td>
                    <td className="p-2">Step-by-step planning</td>
                    <td className="p-2">Accurate model</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Explain Mapping</td>
                    <td className="p-2">Regulation mapping explanation</td>
                    <td className="p-2">Any capable model</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Vendor Mitigation</td>
                    <td className="p-2">Vendor risk remediation plans</td>
                    <td className="p-2">Accurate model</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-xs space-y-1">
            <p className="font-medium text-blue-800 dark:text-blue-200">Example Routing Strategy</p>
            <p className="text-blue-700 dark:text-blue-300">General Q&A → OpenRouter (free model) — Cheapest for simple questions</p>
            <p className="text-blue-700 dark:text-blue-300">Policy Gen → Anthropic Claude Sonnet — Best for long structured docs</p>
            <p className="text-blue-700 dark:text-blue-300">Risk Analysis → OpenAI GPT-4o — Best for accurate scoring</p>
          </div>
        </div>
      ),
    },
    {
      id: "ai-privacy",
      title: "AI Privacy & Features",
      icon: <Shield className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Safe by Default</AlertTitle>
            <AlertDescription className="text-xs">
              External AI is OFF by default. Dry-run mode is ON by default. No data leaves your instance until you explicitly enable it.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="text-sm font-semibold mb-2">Master Controls</h4>
            <div className="space-y-2">
              {[
                { name: "External AI", desc: "Master switch. OFF = no external calls. ON = features respect per-feature toggles.", default: "OFF" },
                { name: "Dry-Run Mode", desc: "Log what would be sent without actually sending. Verify before going live.", default: "ON" },
                { name: "Data Scope", desc: "How much data is included: metadata_only, anonymized (recommended), or full.", default: "anonymized" },
              ].map((c) => (
                <div key={c.name} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    <Badge variant="outline" className="text-xs">{c.default}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">The 12 AI Features</h4>
            <div className="space-y-2">
              {[
                { name: "Evidence Classifier", mode: "Classifier + Scorer", desc: "Auto-maps uploaded evidence to controls + frameworks with confidence scores" },
                { name: "Gap Prioritizer", mode: "Router + Scorer", desc: "Prioritizes compliance gaps by audit proximity, risk, effort, and cross-framework impact" },
                { name: "Vendor Risk Scorer", mode: "Classifier + Scorer + Extractor", desc: "Auto-scores vendor security posture from SOC 2 reports and questionnaires" },
                { name: "Incident Triage", mode: "Classifier + Router", desc: "Auto-classifies incidents and calculates regulatory notification deadlines" },
                { name: "DSAR Classifier", mode: "Classifier + Router", desc: "Classifies data subject requests and maps to processing activities" },
                { name: "Policy Extractor", mode: "Extractor + Scorer", desc: "Extracts obligations from regulation text and suggests policy clauses" },
                { name: "Control Mapper", mode: "Router", desc: "Auto-discovers equivalent controls across frameworks" },
                { name: "Audit Readiness", mode: "Scorer", desc: "Continuous 0-100 readiness score with days-until-audit prediction" },
                { name: "Remediation Orchestrator", mode: "Router + Scorer", desc: "Auto-generates prioritized remediation tasks with assignees" },
                { name: "Regulation Monitor", mode: "Extractor + Scorer", desc: "Detects regulation changes and assesses impact on controls/policies" },
                { name: "Confidence Escalation", mode: "Wrapper", desc: "Smart human review routing — auto-execute high-confidence, escalate low" },
                { name: "Compliance Query", mode: "Router + Extractor", desc: "Natural language queries over your compliance data" },
              ].map((f, i) => (
                <div key={f.name} className="rounded border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <p className="text-sm font-medium">{f.name}</p>
                    <Badge variant="secondary" className="text-xs ml-auto">{f.mode}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Data Scope Levels</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border p-3 text-center">
                <EyeOff className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Metadata Only</p>
                <p className="text-xs text-muted-foreground">Structure, no content</p>
              </div>
              <div className="rounded border p-3 text-center border-primary bg-primary/5">
                <Eye className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">Anonymized</p>
                <p className="text-xs text-muted-foreground">PII stripped (recommended)</p>
              </div>
              <div className="rounded border p-3 text-center">
                <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Full Context</p>
                <p className="text-xs text-muted-foreground">Complete data</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "recipes",
      title: "Configuration Recipes",
      icon: <Lightbulb className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Ready-to-use configurations for common scenarios.</p>

          {[
            {
              name: "Air-Gapped (Maximum Privacy)",
              color: "green",
              settings: [
                "Master Switch: OFF (or ON with Local LLM only)",
                "Local LLM: ENABLED (Ollama with Llama 3 70B)",
                "Cloud LLM: DISABLED",
                "JevAI: DISABLED",
                "Feature Toggles: All ON (will use local processing)",
              ],
              result: "All AI features work locally. No data leaves your infrastructure.",
            },
            {
              name: "Balanced (Recommended)",
              color: "blue",
              settings: [
                "Master Switch: ON",
                "Local LLM: ENABLED (for general Q&A)",
                "Cloud LLM: ENABLED (for high-accuracy tasks)",
                "JevAI: ENABLED (for classification/routing)",
                "Dry-Run: ON for first week, then OFF",
                "Data Scope: anonymized",
                "Enable: Evidence Classifier, Gap Prioritizer, Audit Readiness, Compliance Query",
              ],
              result: "Strong AI features with PII protection. Dry-run verifies before going live.",
            },
            {
              name: "Full Power (Cloud-First)",
              color: "purple",
              settings: [
                "Master Switch: ON",
                "Cloud LLM: ENABLED (GPT-4o + Claude Sonnet)",
                "JevAI: ENABLED",
                "Dry-Run: OFF",
                "Data Scope: full",
                "Confidence Threshold: 80%",
                "Feature Toggles: All 12 ON",
              ],
              result: "Maximum AI accuracy across all features.",
            },
            {
              name: "Evidence-Only",
              color: "orange",
              settings: [
                "Master Switch: ON",
                "JevAI: ENABLED (classifier mode only)",
                "Dry-Run: ON",
                "Data Scope: anonymized",
                "Feature Toggles: ONLY Evidence Classifier ON",
              ],
              result: "Only evidence is auto-classified. Everything else is manual.",
            },
          ].map((recipe) => (
            <div key={recipe.name} className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-semibold">{recipe.name}</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {recipe.settings.map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium pt-1 border-t">{recipe.result}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <HelpCircle className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          {[
            {
              problem: "No LLM provider configured",
              cause: "No providers exist, or all are disabled/demo keys",
              fix: "Add a real provider with a valid API key. Test the connection.",
            },
            {
              problem: "Provider uses a demo placeholder API key",
              cause: "Provider was created with a placeholder key",
              fix: "Edit the provider and replace the key with a real one.",
            },
            {
              problem: "Rate limit exceeded / Insufficient Balance",
              cause: "Hit free-tier limits (common with OpenRouter free models)",
              fix: "Add credits, add a second provider for fallback, set cheaper models as higher priority.",
            },
            {
              problem: "All LLM providers failed",
              cause: "Every provider in the priority chain failed",
              fix: "Check provider status, add backup providers, verify API keys.",
            },
            {
              problem: "Decryption failed: Invalid initialization vector",
              cause: "API key was encrypted with a different APP_ENCRYPTION_KEY",
              fix: "Re-enter the API key (the encryption key may have changed).",
            },
            {
              problem: "AI Features tab is blank or shows errors",
              cause: "Component failed to load",
              fix: "Hard refresh (Ctrl+Shift+R). Check browser console for specific errors.",
            },
            {
              problem: "Feature toggle changes don't take effect",
              cause: "Privacy settings cache has a 60-second TTL",
              fix: "Wait 60 seconds or refresh the page.",
            },
          ].map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-3 w-3 text-red-500" />
                {item.problem}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Cause:</strong> {item.cause}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                <strong>Fix:</strong> {item.fix}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "security",
      title: "Security & Compliance",
      icon: <Lock className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Data Residency</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Data Stays In Instance?</th>
                    <th className="text-left p-2">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2">Local LLM</td>
                    <td className="p-2"><Badge variant="outline" className="text-green-600">Yes</Badge></td>
                    <td className="p-2">Your infrastructure</td>
                  </tr>
                  <tr>
                    <td className="p-2">JevAI</td>
                    <td className="p-2"><Badge variant="outline" className="text-red-600">No</Badge></td>
                    <td className="p-2">TypeSafe AI cloud (US)</td>
                  </tr>
                  <tr>
                    <td className="p-2">OpenAI</td>
                    <td className="p-2"><Badge variant="outline" className="text-red-600">No</Badge></td>
                    <td className="p-2">OpenAI cloud (US)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Anthropic</td>
                    <td className="p-2"><Badge variant="outline" className="text-red-600">No</Badge></td>
                    <td className="p-2">Anthropic cloud (US)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Encryption</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> API keys encrypted at rest using AES-256-GCM</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Data in transit uses TLS 1.3</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Encryption key derived from APP_ENCRYPTION_KEY env var</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Audit Trail</h4>
            <p className="text-sm text-muted-foreground">
              Every external AI call is logged with: timestamp, feature, provider, data scope, success/failure, confidence score, and latency. Viewable in the AI Privacy & Features tab.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Compliance Standards</h4>
            <div className="flex flex-wrap gap-2">
              {["GDPR", "SOC 2", "HIPAA", "ISO 27001", "PCI DSS", "NIS2"].map((std) => (
                <Badge key={std} variant="outline">{std}</Badge>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI & LLM Settings Guide</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">v1.0</Badge>
        </div>
        <CardDescription className="text-xs">
          Comprehensive guide for configuring AI providers, privacy controls, and 12 AI-powered compliance features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              title={section.title}
              icon={section.icon}
              isOpen={expandedSections.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
            >
              {section.content}
            </CollapsibleSection>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Simple collapsible section — no UI package dependency */
function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
}
