import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Input } from "@complianceos/ui/ui/input";
import { Progress } from "@complianceos/ui/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@complianceos/ui/ui/dialog";
import {
  Brain,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
  FileText,
  Database,
  Users,
  RefreshCw,
  Scale,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface AIVendorDueDiligenceProps {
  vendorId: number;
  clientId: number;
}

type AiVendorRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

interface AiVendorAssessment {
  aiServiceType: string;
  aiUseCase: string;
  aiRiskLevel: AiVendorRiskLevel;
  trainingDataPolicy: string;
  dataUsedForTraining: boolean;
  humanOversightProvided: boolean;
  explainabilitySupported: boolean;
  biasTestingPerformed: boolean;
  securityMeasuresDocumented: boolean;
  incidentResponsePlan: boolean;
  certifications: string;
  dataRetentionPolicy: string;
  dataProcessingLocation: string;
  subcontractorsUsed: boolean;
  subcontractorNames: string;
  slaDocumented: boolean;
  lastSecurityAuditDate: string;
  aiGovernancePolicy: boolean;
  modelCardAvailable: boolean;
  overallScore: number;
}

const defaultAssessment: AiVendorAssessment = {
  aiServiceType: "",
  aiUseCase: "",
  aiRiskLevel: "unknown",
  trainingDataPolicy: "",
  dataUsedForTraining: false,
  humanOversightProvided: false,
  explainabilitySupported: false,
  biasTestingPerformed: false,
  securityMeasuresDocumented: false,
  incidentResponsePlan: false,
  certifications: "",
  dataRetentionPolicy: "",
  dataProcessingLocation: "",
  subcontractorsUsed: false,
  subcontractorNames: "",
  slaDocumented: false,
  lastSecurityAuditDate: "",
  aiGovernancePolicy: false,
  modelCardAvailable: false,
  overallScore: 0,
};

const AI_SERVICE_TYPES = [
  { value: "llm_chat", label: "LLM Chat / Assistant" },
  { value: "llm_embedding", label: "LLM Embeddings / Vector" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "nlp_processing", label: "NLP / Text Processing" },
  { value: "speech_recognition", label: "Speech Recognition" },
  { value: "decision_intelligence", label: "Decision Intelligence" },
  { value: "anomaly_detection", label: "Anomaly Detection" },
  { value: "recommendation", label: "Recommendation Engine" },
  { value: "automation", label: "AI Automation / RPA" },
  { value: "other", label: "Other AI Service" },
];

const AI_USE_CASES = [
  { value: "customer_support", label: "Customer Support" },
  { value: "content_generation", label: "Content Generation" },
  { value: "data_analysis", label: "Data Analysis / Insights" },
  { value: "security_monitoring", label: "Security Monitoring" },
  { value: "fraud_detection", label: "Fraud Detection" },
  { value: "hr_recruiting", label: "HR / Recruiting" },
  { value: "financial_analysis", label: "Financial Analysis" },
  { value: "healthcare", label: "Healthcare / Diagnostics" },
  { value: "legal", label: "Legal / Compliance" },
  { value: "code_generation", label: "Code Generation" },
  { value: "other", label: "Other" },
];

function calculateOverallScore(assessment: AiVendorAssessment): number {
  let score = 0;
  const checks = [
    assessment.dataUsedForTraining === false,
    assessment.humanOversightProvided,
    assessment.explainabilitySupported,
    assessment.biasTestingPerformed,
    assessment.securityMeasuresDocumented,
    assessment.incidentResponsePlan,
    assessment.slaDocumented,
    assessment.aiGovernancePolicy,
    assessment.modelCardAvailable,
    !!assessment.dataRetentionPolicy,
    !!assessment.dataProcessingLocation,
    !!assessment.trainingDataPolicy,
  ];
  const passed = checks.filter(Boolean).length;
  score = Math.round((passed / checks.length) * 100);
  return score;
}

export function AIVendorDueDiligence({ vendorId, clientId }: AIVendorDueDiligenceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assessment, setAssessment] = useState<AiVendorAssessment>(defaultAssessment);
  const [isSaving, setIsSaving] = useState(false);

  // Check if this vendor has AI-related fields
  const { data: vendor, isLoading: vendorLoading } = trpc.vendors.get.useQuery({ id: vendorId });

  const updateAssessment = (key: keyof AiVendorAssessment, value: any) => {
    const updated = { ...assessment, [key]: value };
    updated.overallScore = calculateOverallScore(updated);
    setAssessment(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save AI fields to the vendor record
      await trpc.vendors.update.useMutation().mutateAsync({
        id: vendorId,
        usesAi: true,
        isAiService: assessment.aiServiceType !== "",
        aiDataUsage: JSON.stringify(assessment),
      });
      toast.success("AI vendor due diligence saved successfully");
      setIsDialogOpen(false);
    } catch (err) {
      toast.error("Failed to save AI vendor assessment");
    } finally {
      setIsSaving(false);
    }
  };

  const isAiVendor = vendor?.usesAi || vendor?.isAiService;
  const scoreColor = assessment.overallScore >= 80 ? "text-green-600" : assessment.overallScore >= 40 ? "text-amber-600" : "text-red-600";
  const scoreBarColor = assessment.overallScore >= 80 ? "bg-green-500" : assessment.overallScore >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="border-t-4 border-t-indigo-500">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-500" />
            AI Vendor Due Diligence
          </CardTitle>
          <CardDescription>
            Assess AI-specific risks, data usage, and governance practices for this vendor
          </CardDescription>
        </div>
        <Badge variant={isAiVendor ? "default" : "outline"} className={isAiVendor ? "bg-indigo-500" : ""}>
          {isAiVendor ? "AI Vendor" : "Not AI-flagged"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Risk Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-muted-foreground">AI Risk Level</div>
            <div className="font-semibold mt-1 capitalize">{assessment.aiRiskLevel}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-muted-foreground">Overall Score</div>
            <div className={`font-semibold mt-1 ${scoreColor}`}>{assessment.overallScore}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-muted-foreground">Data for Training</div>
            <div className="font-semibold mt-1">{assessment.dataUsedForTraining ? "Yes" : "No"}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-muted-foreground">Human Oversight</div>
            <div className="font-semibold mt-1">{assessment.humanOversightProvided ? "Yes" : "No"}</div>
          </div>
        </div>

        {/* Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">AI Vendor Readiness Score</span>
            <span className="font-semibold">{assessment.overallScore}%</span>
          </div>
          <Progress value={assessment.overallScore} className={scoreBarColor} />
        </div>

        {/* Due Diligence Checklist */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Key AI Governance Checks</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { key: "humanOversightProvided", label: "Human Oversight" },
              { key: "explainabilitySupported", label: "Explainability" },
              { key: "biasTestingPerformed", label: "Bias Testing" },
              { key: "aiGovernancePolicy", label: "AI Governance Policy" },
              { key: "modelCardAvailable", label: "Model Card Available" },
              { key: "incidentResponsePlan", label: "Incident Response Plan" },
            ].map((check) => (
              <div key={check.key} className="flex items-center gap-2 text-sm">
                {(assessment as any)[check.key] ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3 pt-2">
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Brain className="h-4 w-4" />
            {isAiVendor ? "Update AI Assessment" : "Run AI Due Diligence"}
          </Button>
          {isAiVendor && vendor?.aiDataUsage && (
            <Button variant="outline" className="gap-2" onClick={() => {
              try {
                setAssessment(JSON.parse(vendor.aiDataUsage as string));
              } catch {}
            }}>
              <RefreshCw className="h-4 w-4" />
              Load Saved Data
            </Button>
          )}
        </div>

        {/* AI Vendor Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-500" />
                AI Vendor Due Diligence Assessment
              </DialogTitle>
              <DialogDescription>
                Evaluate this vendor's AI capabilities, data usage, and governance practices
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Service Type */}
              <div className="space-y-2">
                <Label>AI Service Type</Label>
                <Select value={assessment.aiServiceType} onValueChange={(v) => updateAssessment("aiServiceType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select AI service type..." /></SelectTrigger>
                  <SelectContent>
                    {AI_SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Use Case */}
              <div className="space-y-2">
                <Label>AI Use Case</Label>
                <Select value={assessment.aiUseCase} onValueChange={(v) => updateAssessment("aiUseCase", v)}>
                  <SelectTrigger><SelectValue placeholder="Select primary use case..." /></SelectTrigger>
                  <SelectContent>
                    {AI_USE_CASES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Level */}
              <div className="space-y-2">
                <Label>AI Risk Level</Label>
                <Select value={assessment.aiRiskLevel} onValueChange={(v) => updateAssessment("aiRiskLevel", v)}>
                  <SelectTrigger><SelectValue placeholder="Assess AI risk level..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minimal impact</SelectItem>
                    <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                    <SelectItem value="high">High - Significant impact</SelectItem>
                    <SelectItem value="critical">Critical - Safety/rights impact</SelectItem>
                    <SelectItem value="unknown">Unknown - Insufficient data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data & Privacy */}
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-500" />
                  Data Usage & Privacy
                </h4>
                <div className="flex items-center justify-between">
                  <Label>Customer data used for training?</Label>
                  <Switch checked={assessment.dataUsedForTraining} onCheckedChange={(v) => updateAssessment("dataUsedForTraining", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Training Data Policy</Label>
                  <Textarea
                    value={assessment.trainingDataPolicy}
                    onChange={(e) => updateAssessment("trainingDataPolicy", e.target.value)}
                    placeholder="Describe how this vendor handles training data..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Retention Policy</Label>
                  <Textarea
                    value={assessment.dataRetentionPolicy}
                    onChange={(e) => updateAssessment("dataRetentionPolicy", e.target.value)}
                    placeholder="Data retention and deletion practices..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Processing Location</Label>
                  <Input
                    value={assessment.dataProcessingLocation}
                    onChange={(e) => updateAssessment("dataProcessingLocation", e.target.value)}
                    placeholder="e.g., US, EU, Global..."
                  />
                </div>
              </div>

              {/* Governance & Transparency */}
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Governance & Transparency
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Human Oversight</Label>
                    <Switch checked={assessment.humanOversightProvided} onCheckedChange={(v) => updateAssessment("humanOversightProvided", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Explainability</Label>
                    <Switch checked={assessment.explainabilitySupported} onCheckedChange={(v) => updateAssessment("explainabilitySupported", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Bias Testing</Label>
                    <Switch checked={assessment.biasTestingPerformed} onCheckedChange={(v) => updateAssessment("biasTestingPerformed", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">AI Governance Policy</Label>
                    <Switch checked={assessment.aiGovernancePolicy} onCheckedChange={(v) => updateAssessment("aiGovernancePolicy", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Model Card</Label>
                    <Switch checked={assessment.modelCardAvailable} onCheckedChange={(v) => updateAssessment("modelCardAvailable", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Incident Response Plan</Label>
                    <Switch checked={assessment.incidentResponsePlan} onCheckedChange={(v) => updateAssessment("incidentResponsePlan", v)} />
                  </div>
                </div>
              </div>

              {/* Security & Compliance */}
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  Security & Compliance
                </h4>
                <div className="flex items-center justify-between">
                  <Label>Security measures documented?</Label>
                  <Switch checked={assessment.securityMeasuresDocumented} onCheckedChange={(v) => updateAssessment("securityMeasuresDocumented", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>SLA Documented?</Label>
                  <Switch checked={assessment.slaDocumented} onCheckedChange={(v) => updateAssessment("slaDocumented", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Certifications (ISO 27001, SOC 2, etc.)</Label>
                  <Input
                    value={assessment.certifications}
                    onChange={(e) => updateAssessment("certifications", e.target.value)}
                    placeholder="List relevant certifications..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Security Audit Date</Label>
                  <Input
                    type="date"
                    value={assessment.lastSecurityAuditDate}
                    onChange={(e) => updateAssessment("lastSecurityAuditDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Subcontractors */}
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Subcontractors & Supply Chain
                </h4>
                <div className="flex items-center justify-between">
                  <Label>Subcontractors used?</Label>
                  <Switch checked={assessment.subcontractorsUsed} onCheckedChange={(v) => updateAssessment("subcontractorsUsed", v)} />
                </div>
                {assessment.subcontractorsUsed && (
                  <div className="space-y-2">
                    <Label>Subcontractor Names</Label>
                    <Input
                      value={assessment.subcontractorNames}
                      onChange={(e) => updateAssessment("subcontractorNames", e.target.value)}
                      placeholder="List subcontractor names..."
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Score:</span>
                <span className={`font-bold text-lg ${scoreColor}`}>{assessment.overallScore}%</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Assessment
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}