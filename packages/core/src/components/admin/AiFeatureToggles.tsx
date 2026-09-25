/**
 * AI Feature Toggles — Per-feature on/off switches with data scope and confidence threshold.
 *
 * Shows all 12 AI features with their current status. Admins can enable/disable
 * each feature, set data scope per feature, and adjust confidence thresholds.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Switch, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Badge,
} from "@complianceos/ui";
import { toast } from "sonner";
import {
  FileText, AlertTriangle, Users, Zap, Shield, FileSearch,
  Layers, Target, Wrench, Bell, Gauge, MessageSquare, Settings,
} from "lucide-react";

interface AiFeatureTogglesProps {
  clientId: number;
}

const FEATURES = [
  { id: "evidence_classifier", name: "Evidence Classifier", description: "Auto-classify uploaded evidence to controls and frameworks", icon: FileText, category: "evidence" },
  { id: "gap_prioritizer", name: "Gap Prioritizer", description: "Prioritize compliance gaps by audit proximity and risk", icon: AlertTriangle, category: "gaps" },
  { id: "vendor_risk_scorer", name: "Vendor Risk Scorer", description: "Auto-score vendor security posture from documents", icon: Users, category: "vendor" },
  { id: "incident_triage", name: "Incident Triage", description: "Auto-classify incidents and determine regulatory obligations", icon: Zap, category: "incident" },
  { id: "dsar_classifier", name: "DSAR Classifier", description: "Classify data subject requests and map to processing activities", icon: Shield, category: "privacy" },
  { id: "policy_extractor", name: "Policy Extractor", description: "Extract obligations from regulation text", icon: FileSearch, category: "policy" },
  { id: "control_mapper", name: "Control Mapper", description: "Auto-map equivalent controls across frameworks", icon: Layers, category: "framework" },
  { id: "audit_readiness", name: "Audit Readiness Scorer", description: "Continuous audit readiness assessment with predictions", icon: Target, category: "audit" },
  { id: "remediation_orchestrator", name: "Remediation Orchestrator", description: "Auto-generate and assign remediation tasks", icon: Wrench, category: "remediation" },
  { id: "regulation_monitor", name: "Regulation Monitor", description: "Detect regulation changes and assess impact", icon: Bell, category: "compliance" },
  { id: "confidence_escalation", name: "Confidence Escalation", description: "Smart human review routing based on confidence scores", icon: Gauge, category: "ai" },
  { id: "compliance_query", name: "Natural Language Query", description: "Ask questions over your compliance data", icon: MessageSquare, category: "query" },
];

export default function AiFeatureToggles({ clientId }: AiFeatureTogglesProps) {
  const utils = trpc.useUtils();

  const { data: toggles, isLoading } = trpc.aiFeatures.getFeatureToggles.useQuery({ clientId });

  const updateMutation = trpc.aiFeatures.updateFeatureToggle.useMutation({
    onSuccess: () => {
      toast.success("Feature updated");
      utils.aiFeatures.getFeatureToggles.invalidate({ clientId });
    },
    onError: (err) => toast.error(err.message),
  });

  const getToggle = (featureId: string) => {
    return toggles?.find((t: any) => t.featureId === featureId) || {
      isEnabled: false,
      dataScope: "anonymized",
      confidenceThreshold: 70,
    };
  };

  const handleToggle = (featureId: string, enabled: boolean) => {
    updateMutation.mutate({ clientId, featureId, isEnabled: enabled });
  };

  const handleScopeChange = (featureId: string, scope: string) => {
    updateMutation.mutate({ clientId, featureId, dataScope: scope as any });
  };

  const handleThresholdChange = (featureId: string, threshold: number) => {
    updateMutation.mutate({ clientId, featureId, confidenceThreshold: threshold });
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6">Loading feature toggles...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Feature Toggles
        </CardTitle>
        <CardDescription>
          Enable or disable individual AI features. Each feature respects your privacy settings and data scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FEATURES.map((feature) => {
          const toggle = getToggle(feature.id);
          const Icon = feature.icon;

          return (
            <div key={feature.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">{feature.name}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {toggle.isEnabled && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                  <Switch
                    checked={toggle.isEnabled}
                    onCheckedChange={(v) => handleToggle(feature.id, v)}
                  />
                </div>
              </div>

              {toggle.isEnabled && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  {/* Data Scope */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Data Scope</Label>
                    <Select
                      value={toggle.dataScope}
                      onValueChange={(v) => handleScopeChange(feature.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metadata_only">Metadata Only</SelectItem>
                        <SelectItem value="anonymized">Anonymized</SelectItem>
                        <SelectItem value="full">Full Context</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Confidence Threshold: {toggle.confidenceThreshold}%
                    </Label>
                    <input
                      type="range"
                      min={30}
                      max={95}
                      step={5}
                      value={toggle.confidenceThreshold}
                      onChange={(e) => handleThresholdChange(feature.id, parseInt(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
