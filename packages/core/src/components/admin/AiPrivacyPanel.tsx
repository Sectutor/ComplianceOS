/**
 * AI Privacy Panel — Master controls for external AI data sharing.
 *
 * Embedded in the LLM Settings page. Provides:
 * - Master kill switch (externalAiEnabled)
 * - Dry-run mode toggle
 * - Data scope selector (full / anonymized / metadata_only)
 * - Per-provider toggles (JevAI, Cloud LLM, Local LLM)
 * - Live status indicator
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Switch, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Badge,
  Button,
} from "@complianceos/ui";
import { ShieldCheck, ShieldAlert, Eye, EyeOff, FlaskConical, Server, Cloud, Cpu } from "lucide-react";
import { toast } from "sonner";

interface AiPrivacyPanelProps {
  clientId: number;
}

export default function AiPrivacyPanel({ clientId }: AiPrivacyPanelProps) {
  const utils = trpc.useUtils();

  const { data: privacy, isLoading } = trpc.aiFeatures.getPrivacySettings.useQuery({ clientId });

  const updateMutation = trpc.aiFeatures.updatePrivacySettings.useMutation({
    onSuccess: () => {
      toast.success("Privacy settings updated");
      utils.aiFeatures.getPrivacySettings.invalidate({ clientId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggle = (field: string, value: boolean) => {
    updateMutation.mutate({ clientId, [field]: value });
  };

  const handleScopeChange = (value: string) => {
    updateMutation.mutate({ clientId, defaultDataScope: value as any });
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6">Loading privacy settings...</CardContent></Card>;
  }

  const settings = privacy || {
    externalAiEnabled: false,
    dryRunMode: true,
    defaultDataScope: "anonymized",
    jevaiEnabled: false,
    cloudLlmEnabled: false,
    localLlmEnabled: true,
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`rounded-lg border px-4 py-3 text-sm ${settings.externalAiEnabled ? "bg-background text-foreground border-border" : "border-destructive/50 text-destructive"}`}>
        <div className="flex items-center gap-2 mb-1">
          {settings.externalAiEnabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          <h5 className="font-medium leading-none tracking-tight">
            {settings.externalAiEnabled
              ? settings.dryRunMode
                ? "External AI Enabled (Dry-Run Mode)"
                : "External AI Fully Enabled"
              : "External AI Disabled"}
          </h5>
        </div>
        <div className="text-sm [&_p]:leading-relaxed text-muted-foreground">
          {settings.externalAiEnabled
            ? settings.dryRunMode
              ? "AI calls are being logged but NOT sent to external providers. No data is leaving your instance."
              : "AI calls are being sent to external providers. Data is leaving your instance according to your scope settings below."
            : "No data is being sent to external AI providers. All AI features use deterministic local processing only."}
        </div>
      </div>

      {/* Master Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            External AI Controls
          </CardTitle>
          <CardDescription>
            Control whether external AI providers can process your compliance data.
            When disabled, all AI features use local deterministic processing only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Kill Switch */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable External AI</Label>
              <p className="text-sm text-muted-foreground">
                Allow external AI providers (JevAI, OpenAI, Anthropic) to process your data.
                When off, no data leaves your instance.
              </p>
            </div>
            <Switch
              checked={settings.externalAiEnabled}
              onCheckedChange={(v) => handleToggle("externalAiEnabled", v)}
            />
          </div>

          {/* Dry-Run Mode */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Dry-Run Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Log what would be sent to external AI without actually sending anything.
                Recommended when first enabling external AI.
              </p>
            </div>
            <Switch
              checked={settings.dryRunMode}
              onCheckedChange={(v) => handleToggle("dryRunMode", v)}
              disabled={!settings.externalAiEnabled}
            />
          </div>

          {/* Data Scope */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Data Scope</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Controls how much data is included when external AI calls are made.
            </p>
            <Select
              value={settings.defaultDataScope}
              onValueChange={handleScopeChange}
              disabled={!settings.externalAiEnabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metadata_only">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Metadata Only</div>
                      <div className="text-xs text-muted-foreground">Only data structure, no content. Safest option.</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="anonymized">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Anonymized</div>
                      <div className="text-xs text-muted-foreground">Content with PII removed (names, emails, domains).</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Full Context</div>
                      <div className="text-xs text-muted-foreground">Complete data including all content. Most powerful.</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Provider Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Provider Permissions
          </CardTitle>
          <CardDescription>
            Control which types of AI providers are allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Local LLM */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-green-600" />
              <div>
                <Label className="font-medium">Local LLM (Ollama, LM Studio)</Label>
                <p className="text-xs text-muted-foreground">Data never leaves your infrastructure. Always safe.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Safe</Badge>
              <Switch
                checked={settings.localLlmEnabled}
                onCheckedChange={(v) => handleToggle("localLlmEnabled", v)}
              />
            </div>
          </div>

          {/* JevAI */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="font-medium">JevAI (TypeSafe AI)</Label>
                <p className="text-xs text-muted-foreground">External cloud AI for classification, routing, scoring.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.jevaiEnabled}
                onCheckedChange={(v) => handleToggle("jevaiEnabled", v)}
                disabled={!settings.externalAiEnabled}
              />
            </div>
          </div>

          {/* Cloud LLM */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-purple-600" />
              <div>
                <Label className="font-medium">Cloud LLM (OpenAI, Anthropic, Gemini)</Label>
                <p className="text-xs text-muted-foreground">External cloud LLM providers for text generation.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.cloudLlmEnabled}
                onCheckedChange={(v) => handleToggle("cloudLlmEnabled", v)}
                disabled={!settings.externalAiEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
