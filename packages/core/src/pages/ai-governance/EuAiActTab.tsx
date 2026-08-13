import React, { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Switch } from '@complianceos/ui/ui/switch';
import { Label } from '@complianceos/ui/ui/label';
import { Input } from '@complianceos/ui/ui/input';
import { Textarea } from '@complianceos/ui/ui/textarea';
import { Progress } from '@complianceos/ui/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@complianceos/ui/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@complianceos/ui/ui/select';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  FileText,
  Eye,
  Activity,
  Lock,
  Brain,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Loader2,
  Save,
  Gavel,
  BadgeEuro,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EuAiActTabProps {
  aiSystemId: number;
  clientId: number;
}

type EuRiskClass = 'unacceptable' | 'high' | 'limited' | 'minimal' | 'general_purpose_ai';
type ConformityType = 'self_assessment' | 'notified_body' | 'exempt' | null;

interface ComplianceFormData {
  // Article 9
  riskMgmtSystemEstablished: boolean;
  riskMgmtDocLink: string;
  // Article 10
  dataGovernanceImplemented: boolean;
  trainingDataProvenance: string;
  dataPrivacyCompliant: boolean;
  // Article 11-12
  techDocumentationComplete: boolean;
  techDocUrl: string;
  logsAutomaticallyRecorded: boolean;
  logRetentionDays: number;
  // Article 13
  transparencyInfoProvided: boolean;
  transparencyInfoUrl: string;
  // Article 14
  humanOversightMeasuresImplemented: boolean;
  humanOversightDescription: string;
  // Article 15
  accuracyBenchmarksMet: boolean;
  robustnessTested: boolean;
  cybersecurityMeasuresImplemented: boolean;
  // Article 26
  deployerHumanOversightAssigned: boolean;
  deployerMonitoringImplemented: boolean;
  deployerIncidentReportingConfigured: boolean;
  // Article 52
  transparencyLabelImplemented: boolean;
  transparencyLabelText: string;
  // Meta
  complianceStatus: string;
  complianceScore: number;
  assessmentNotes: string;
  // Classification
  euRiskClass: EuRiskClass;
  prohibitedAi: boolean;
  conformityAssessmentType: ConformityType;
  registrationNumber: string;
  notifyingAuthority: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_CLASS_OPTIONS: { value: EuRiskClass; label: string; color: string }[] = [
  { value: 'unacceptable', label: 'Unacceptable Risk', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'high', label: 'High Risk', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'limited', label: 'Limited Risk', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'minimal', label: 'Minimal Risk', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'general_purpose_ai', label: 'General-Purpose AI', color: 'bg-blue-100 text-blue-800 border-blue-300' },
];

const CONFORMITY_OPTIONS: { value: ConformityType; label: string }[] = [
  { value: 'self_assessment', label: 'Self-Assessment (Annex III)' },
  { value: 'notified_body', label: 'Notified Body Assessment' },
  { value: 'exempt', label: 'Exempt' },
];

const ARTICLE_META: { key: keyof ComplianceFormData; label: string; article: string; description: string }[] = [
  { key: 'riskMgmtSystemEstablished', label: 'Risk Management System', article: 'Article 9', description: 'Continuous iterative risk management throughout the AI system lifecycle.' },
  { key: 'dataGovernanceImplemented', label: 'Data Governance', article: 'Article 10', description: 'Training, validation and testing data governance practices.' },
  { key: 'techDocumentationComplete', label: 'Technical Documentation', article: 'Articles 11–12', description: 'Technical documentation and record-keeping requirements.' },
  { key: 'transparencyInfoProvided', label: 'Transparency', article: 'Article 13', description: 'Transparency and provision of information to deployers.' },
  { key: 'humanOversightMeasuresImplemented', label: 'Human Oversight', article: 'Article 14', description: 'Human oversight measures to minimise risk.' },
  { key: 'accuracyBenchmarksMet', label: 'Accuracy, Robustness & Cybersecurity', article: 'Article 15', description: 'Accuracy, robustness and cybersecurity requirements.' },
  { key: 'deployerHumanOversightAssigned', label: 'Deployer Obligations', article: 'Article 26', description: 'Obligations of deployers of high-risk AI systems.' },
  { key: 'transparencyLabelImplemented', label: 'Transparency Label', article: 'Article 52', description: 'Transparency obligations for certain AI systems (limited risk).' },
];

const ARTICLE_KEY_MAP: Record<string, keyof ComplianceFormData> = {
  'riskMgmtSystemEstablished': 'riskMgmtSystemEstablished',
  'dataGovernanceImplemented': 'dataGovernanceImplemented',
  'techDocumentationComplete': 'techDocumentationComplete',
  'transparencyInfoProvided': 'transparencyInfoProvided',
  'humanOversightMeasuresImplemented': 'humanOversightMeasuresImplemented',
  'accuracyBenchmarksMet': 'accuracyBenchmarksMet',
  'deployerHumanOversightAssigned': 'deployerHumanOversightAssigned',
  'transparencyLabelImplemented': 'transparencyLabelImplemented',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score < 40) return 'text-red-600';
  if (score < 80) return 'text-amber-600';
  return 'text-emerald-600';
}

function getProgressColor(score: number): string {
  if (score < 40) return 'bg-red-500';
  if (score < 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getBadgeVariant(score: number): 'destructive' | 'secondary' | 'default' {
  if (score < 40) return 'destructive';
  if (score < 80) return 'secondary';
  return 'default';
}

function getFormDefaults(): ComplianceFormData {
  return {
    riskMgmtSystemEstablished: false,
    riskMgmtDocLink: '',
    dataGovernanceImplemented: false,
    trainingDataProvenance: '',
    dataPrivacyCompliant: false,
    techDocumentationComplete: false,
    techDocUrl: '',
    logsAutomaticallyRecorded: false,
    logRetentionDays: 180,
    transparencyInfoProvided: false,
    transparencyInfoUrl: '',
    humanOversightMeasuresImplemented: false,
    humanOversightDescription: '',
    accuracyBenchmarksMet: false,
    robustnessTested: false,
    cybersecurityMeasuresImplemented: false,
    deployerHumanOversightAssigned: false,
    deployerMonitoringImplemented: false,
    deployerIncidentReportingConfigured: false,
    transparencyLabelImplemented: false,
    transparencyLabelText: '',
    complianceStatus: 'not_assessed',
    complianceScore: 0,
    assessmentNotes: '',
    euRiskClass: 'minimal',
    prohibitedAi: false,
    conformityAssessmentType: null,
    registrationNumber: '',
    notifyingAuthority: '',
  };
}

function computeComplianceScore(data: ComplianceFormData): number {
  const checks: boolean[] = [
    data.riskMgmtSystemEstablished,
    data.dataGovernanceImplemented,
    data.techDocumentationComplete,
    data.transparencyInfoProvided,
    data.humanOversightMeasuresImplemented,
    data.accuracyBenchmarksMet,
    data.robustnessTested,
    data.cybersecurityMeasuresImplemented,
    data.deployerHumanOversightAssigned,
    data.deployerMonitoringImplemented,
    data.deployerIncidentReportingConfigured,
    data.transparencyLabelImplemented,
    data.dataPrivacyCompliant,
    data.logsAutomaticallyRecorded,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getNextReviewDate(lastAssessedAt: Date | string | null | undefined): Date {
  const base = lastAssessedAt ? new Date(lastAssessedAt) : new Date();
  if (isNaN(base.getTime())) return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  return new Date(base.getTime() + 90 * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EuAiActTab = ({ aiSystemId, clientId }: EuAiActTabProps) => {
  const [isAssessDialogOpen, setIsAssessDialogOpen] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [formData, setFormData] = useState<ComplianceFormData>(getFormDefaults());

  // ── tRPC queries ────────────────────────────────────────────────────────

  const {
    data: complianceRecord,
    isLoading: loadingCompliance,
    refetch: refetchCompliance,
  } = trpc.ai.systems.getEuAiActCompliance.useQuery(
    { aiSystemId },
    { enabled: !!aiSystemId },
  );

  const upsertMutation = trpc.ai.systems.upsertEuAiActCompliance.useMutation({
    onSuccess: () => {
      toast.success('EU AI Act compliance saved successfully');
      setIsAssessDialogOpen(false);
      setIsSavePending(false);
      refetchCompliance();
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
      setIsSavePending(false);
    },
  });

  const assessMutation = trpc.ai.systems.assessEuAiActCompliance.useMutation({
    onSuccess: () => {
      toast.success('Automated assessment completed');
      refetchCompliance();
    },
    onError: (err) => {
      toast.error(`Assessment failed: ${err.message}`);
    },
  });

  // ── Populate form when data arrives ──────────────────────────────────────

  useEffect(() => {
    if (complianceRecord) {
      setFormData({
        riskMgmtSystemEstablished: complianceRecord.riskMgmtSystemEstablished ?? false,
        riskMgmtDocLink: complianceRecord.riskMgmtDocLink ?? '',
        dataGovernanceImplemented: complianceRecord.dataGovernanceImplemented ?? false,
        trainingDataProvenance: complianceRecord.trainingDataProvenance ?? '',
        dataPrivacyCompliant: complianceRecord.dataPrivacyCompliant ?? false,
        techDocumentationComplete: complianceRecord.techDocumentationComplete ?? false,
        techDocUrl: complianceRecord.techDocUrl ?? '',
        logsAutomaticallyRecorded: complianceRecord.logsAutomaticallyRecorded ?? false,
        logRetentionDays: complianceRecord.logRetentionDays ?? 180,
        transparencyInfoProvided: complianceRecord.transparencyInfoProvided ?? false,
        transparencyInfoUrl: complianceRecord.transparencyInfoUrl ?? '',
        humanOversightMeasuresImplemented: complianceRecord.humanOversightMeasuresImplemented ?? false,
        humanOversightDescription: complianceRecord.humanOversightDescription ?? '',
        accuracyBenchmarksMet: complianceRecord.accuracyBenchmarksMet ?? false,
        robustnessTested: complianceRecord.robustnessTested ?? false,
        cybersecurityMeasuresImplemented: complianceRecord.cybersecurityMeasuresImplemented ?? false,
        deployerHumanOversightAssigned: complianceRecord.deployerHumanOversightAssigned ?? false,
        deployerMonitoringImplemented: complianceRecord.deployerMonitoringImplemented ?? false,
        deployerIncidentReportingConfigured: complianceRecord.deployerIncidentReportingConfigured ?? false,
        transparencyLabelImplemented: complianceRecord.transparencyLabelImplemented ?? false,
        transparencyLabelText: complianceRecord.transparencyLabelText ?? '',
        complianceStatus: complianceRecord.complianceStatus ?? 'not_assessed',
        complianceScore: complianceRecord.complianceScore ?? 0,
        assessmentNotes: complianceRecord.assessmentNotes ?? '',
        euRiskClass: (complianceRecord as any).euRiskClass ?? 'minimal',
        prohibitedAi: (complianceRecord as any).prohibitedAi ?? false,
        conformityAssessmentType: (complianceRecord as any).conformityAssessmentType ?? null,
        registrationNumber: (complianceRecord as any).registrationNumber ?? '',
        notifyingAuthority: (complianceRecord as any).notifyingAuthority ?? '',
      });
    }
  }, [complianceRecord]);

  // ── Article score helpers ────────────────────────────────────────────────

  const articleChecks = useMemo(() => {
    return {
      riskMgmtSystemEstablished: formData.riskMgmtSystemEstablished,
      dataGovernanceImplemented: formData.dataGovernanceImplemented,
      techDocumentationComplete: formData.techDocumentationComplete,
      transparencyInfoProvided: formData.transparencyInfoProvided,
      humanOversightMeasuresImplemented: formData.humanOversightMeasuresImplemented,
      accuracyBenchmarksMet:
        formData.accuracyBenchmarksMet &&
        formData.robustnessTested &&
        formData.cybersecurityMeasuresImplemented,
      deployerHumanOversightAssigned:
        formData.deployerHumanOversightAssigned &&
        formData.deployerMonitoringImplemented &&
        formData.deployerIncidentReportingConfigured,
      transparencyLabelImplemented: formData.transparencyLabelImplemented,
    };
  }, [formData]);

  const complianceScore = useMemo(() => {
    if (complianceRecord?.complianceScore != null && complianceRecord.complianceScore > 0) {
      return complianceRecord.complianceScore;
    }
    return computeComplianceScore(formData);
  }, [complianceRecord, formData]);

  const riskClassMeta = RISK_CLASS_OPTIONS.find((o) => o.value === formData.euRiskClass);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = () => {
    setIsSavePending(true);
    upsertMutation.mutate({
      aiSystemId,
      clientId,
      riskMgmtSystemEstablished: formData.riskMgmtSystemEstablished,
      riskMgmtDocLink: formData.riskMgmtDocLink || undefined,
      dataGovernanceImplemented: formData.dataGovernanceImplemented,
      trainingDataProvenance: formData.trainingDataProvenance || undefined,
      dataPrivacyCompliant: formData.dataPrivacyCompliant,
      techDocumentationComplete: formData.techDocumentationComplete,
      techDocUrl: formData.techDocUrl || undefined,
      logsAutomaticallyRecorded: formData.logsAutomaticallyRecorded,
      logRetentionDays: formData.logRetentionDays,
      transparencyInfoProvided: formData.transparencyInfoProvided,
      transparencyInfoUrl: formData.transparencyInfoUrl || undefined,
      humanOversightMeasuresImplemented: formData.humanOversightMeasuresImplemented,
      humanOversightDescription: formData.humanOversightDescription || undefined,
      accuracyBenchmarksMet: formData.accuracyBenchmarksMet,
      robustnessTested: formData.robustnessTested,
      cybersecurityMeasuresImplemented: formData.cybersecurityMeasuresImplemented,
      deployerHumanOversightAssigned: formData.deployerHumanOversightAssigned,
      deployerMonitoringImplemented: formData.deployerMonitoringImplemented,
      deployerIncidentReportingConfigured: formData.deployerIncidentReportingConfigured,
      transparencyLabelImplemented: formData.transparencyLabelImplemented,
      transparencyLabelText: formData.transparencyLabelText || undefined,
      complianceScore: computeComplianceScore(formData),
      assessmentNotes: formData.assessmentNotes || undefined,
      euRiskClass: formData.euRiskClass,
      prohibitedAi: formData.prohibitedAi,
      conformityAssessmentType: formData.conformityAssessmentType,
      registrationNumber: formData.registrationNumber || undefined,
      notifyingAuthority: formData.notifyingAuthority || undefined,
    } as any);
  };

  const handleAssess = () => {
    assessMutation.mutate({ aiSystemId, clientId });
  };

  const handleToggle = (field: keyof ComplianceFormData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (field: keyof ComplianceFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (loadingCompliance) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading EU AI Act compliance data...
      </div>
    );
  }

  // ── Next review date ─────────────────────────────────────────────────────

  const nextReviewDate = useMemo(
    () => getNextReviewDate(complianceRecord?.lastAssessedAt),
    [complianceRecord?.lastAssessedAt],
  );

  const isOverdue = nextReviewDate < new Date();

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* ─── Top actions bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">EU AI Act Compliance</h3>
          <Badge variant="outline" className="text-xs font-mono">
            Regulation (EU) 2024/1689
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAssess}
            disabled={assessMutation.isPending}
          >
            {assessMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Assess Compliance
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsAssessDialogOpen(true)}>
            <Scale className="h-4 w-4" />
            Manage Compliance
          </Button>
        </div>
      </div>

      {/* ─── Row: Classification + Scorecard ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classification Card */}
        <Card className="lg:col-span-1 border-muted/30 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-indigo-600" />
              Classification
            </CardTitle>
            <CardDescription>EU AI Act risk category &amp; status</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Risk class badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Class</span>
              {riskClassMeta ? (
                <Badge className={`border text-xs px-3 py-1 ${riskClassMeta.color}`}>
                  {riskClassMeta.label}
                </Badge>
              ) : (
                <Badge variant="outline">Not classified</Badge>
              )}
            </div>

            {/* Prohibited AI */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prohibited AI</span>
              {formData.prohibitedAi ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Prohibited
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Not Prohibited
                </Badge>
              )}
            </div>

            {/* Conformity assessment type */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conformity Assessment</span>
              <Badge variant="outline" className="text-xs">
                {formData.conformityAssessmentType
                  ? CONFORMITY_OPTIONS.find((c) => c.value === formData.conformityAssessmentType)
                      ?.label ?? formData.conformityAssessmentType
                  : 'Not specified'}
              </Badge>
            </div>

            {/* Registration number */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Registration No.</span>
              <span className="text-sm font-mono font-medium">
                {formData.registrationNumber || '—'}
              </span>
            </div>

            {/* Notifying authority */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Notifying Authority</span>
              <span className="text-sm">{formData.notifyingAuthority || '—'}</span>
            </div>

            {/* Last assessed */}
            <div className="flex items-center justify-between pt-2 border-t border-muted/20">
              <span className="text-sm text-muted-foreground">Last Assessed</span>
              <span className="text-sm font-medium">
                {formatDate(complianceRecord?.lastAssessedAt)}
              </span>
            </div>

            {/* Next review */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Review Due</span>
              <span
                className={`text-sm font-medium flex items-center gap-1 ${
                  isOverdue ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                {formatDate(nextReviewDate)}
              </span>
            </div>

            {/* Compliance status badge */}
            <div className="pt-2 border-t border-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={
                    formData.complianceStatus === 'compliant'
                      ? 'default'
                      : formData.complianceStatus === 'partially_compliant'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {formData.complianceStatus === 'compliant'
                    ? 'Compliant'
                    : formData.complianceStatus === 'partially_compliant'
                    ? 'Partially Compliant'
                    : formData.complianceStatus === 'non_compliant'
                    ? 'Non-Compliant'
                    : 'Not Assessed'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Scorecard */}
        <Card className="lg:col-span-2 border-muted/30 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-muted/20 pb-4">
            <CardTitle className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-base">
                <BadgeEuro className="h-4 w-4 text-emerald-600" />
                Compliance Scorecard
              </span>
              <Badge variant={getBadgeVariant(complianceScore)} className="text-sm px-3 py-1">
                {complianceScore}%
              </Badge>
            </CardTitle>
            <CardDescription>
              EU AI Act compliance status across all applicable articles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Overall progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Compliance</span>
                <span className={getScoreColor(complianceScore)}>{complianceScore}%</span>
              </div>
              <Progress
                value={complianceScore}
                className="h-3 bg-muted rounded-full overflow-hidden"
                indicatorClassName={getProgressColor(complianceScore)}
              />
            </div>

            {/* Article checklist */}
            <div className="space-y-3 pt-1">
              {ARTICLE_META.map((article) => {
                const fieldKey = ARTICLE_KEY_MAP[article.key];
                const isMet = fieldKey ? !!articleChecks[fieldKey as keyof typeof articleChecks] : false;
                return (
                  <div
                    key={article.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-muted/20 px-4 py-3 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isMet ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{article.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {article.article} &middot; {article.description}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={isMet ? 'secondary' : 'outline'}
                      className="shrink-0 text-xs"
                    >
                      {isMet ? 'Compliant' : 'Pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Assessment Dialog ───────────────────────────────────────────── */}
      <Dialog open={isAssessDialogOpen} onOpenChange={setIsAssessDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              EU AI Act Compliance Assessment
            </DialogTitle>
            <DialogDescription>
              Complete the compliance checklist for this AI system. All fields map directly
              to requirements in Regulation (EU) 2024/1689.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* ── Classification Fields ──────────────────────────────────── */}
            <section>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Classification
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EU Risk Class */}
                <div className="space-y-2">
                  <Label htmlFor="eu-risk-class">EU AI Act Risk Class</Label>
                  <Select
                    value={formData.euRiskClass}
                    onValueChange={(v) => handleInputChange('euRiskClass', v)}
                  >
                    <SelectTrigger id="eu-risk-class">
                      <SelectValue placeholder="Select risk class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_CLASS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conformity Assessment Type */}
                <div className="space-y-2">
                  <Label htmlFor="conformity-type">Conformity Assessment Type</Label>
                  <Select
                    value={formData.conformityAssessmentType ?? 'null'}
                    onValueChange={(v) =>
                      handleInputChange(
                        'conformityAssessmentType',
                        v === 'null' ? null : v,
                      )
                    }
                  >
                    <SelectTrigger id="conformity-type">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Not specified</SelectItem>
                      {CONFORMITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value!} value={opt.value!}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prohibited AI */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="prohibited-ai" className="font-medium">
                      Prohibited AI Practice
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Does this system fall under Article 5 prohibited practices?
                    </p>
                  </div>
                  <Switch
                    id="prohibited-ai"
                    checked={formData.prohibitedAi}
                    onCheckedChange={() => handleToggle('prohibitedAi')}
                  />
                </div>

                {/* Registration Number */}
                <div className="space-y-2">
                  <Label htmlFor="reg-number">Registration Number</Label>
                  <Input
                    id="reg-number"
                    placeholder="e.g. EUDA-2025-XXXXX"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  />
                </div>

                {/* Notifying Authority */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notifying-authority">Notifying Authority</Label>
                  <Input
                    id="notifying-authority"
                    placeholder="e.g. Irish EPA, German BSI, etc."
                    value={formData.notifyingAuthority}
                    onChange={(e) => handleInputChange('notifyingAuthority', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 9: Risk Management ─────────────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 9 — Risk Management System
                </h4>
                <Switch
                  checked={formData.riskMgmtSystemEstablished}
                  onCheckedChange={() => handleToggle('riskMgmtSystemEstablished')}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="risk-mgmt-doc-link">Risk Management Documentation URL</Label>
                  <Input
                    id="risk-mgmt-doc-link"
                    placeholder="https://..."
                    value={formData.riskMgmtDocLink}
                    onChange={(e) => handleInputChange('riskMgmtDocLink', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 10: Data Governance ────────────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 10 — Data Governance
                </h4>
                <Switch
                  checked={formData.dataGovernanceImplemented}
                  onCheckedChange={() => handleToggle('dataGovernanceImplemented')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="training-data-provenance">Training Data Provenance</Label>
                  <Textarea
                    id="training-data-provenance"
                    placeholder="Describe the origin and curation of training/validation/test data..."
                    value={formData.trainingDataProvenance}
                    onChange={(e) => handleInputChange('trainingDataProvenance', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 md:self-start">
                  <div>
                    <Label htmlFor="data-privacy" className="font-medium">
                      Data Privacy Compliant
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      GDPR and data protection requirements met
                    </p>
                  </div>
                  <Switch
                    id="data-privacy"
                    checked={formData.dataPrivacyCompliant}
                    onCheckedChange={() => handleToggle('dataPrivacyCompliant')}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 11–12: Technical Documentation ─────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Articles 11–12 — Technical Documentation &amp; Record-Keeping
                </h4>
                <Switch
                  checked={formData.techDocumentationComplete}
                  onCheckedChange={() => handleToggle('techDocumentationComplete')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tech-doc-url">Technical Documentation URL</Label>
                  <Input
                    id="tech-doc-url"
                    placeholder="https://..."
                    value={formData.techDocUrl}
                    onChange={(e) => handleInputChange('techDocUrl', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log-retention">Log Retention (Days)</Label>
                  <Input
                    id="log-retention"
                    type="number"
                    min={0}
                    max={3650}
                    value={formData.logRetentionDays}
                    onChange={(e) =>
                      handleInputChange('logRetentionDays', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="logs-auto" className="font-medium">
                      Logs Automatically Recorded
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Events automatically logged with correlation IDs
                    </p>
                  </div>
                  <Switch
                    id="logs-auto"
                    checked={formData.logsAutomaticallyRecorded}
                    onCheckedChange={() => handleToggle('logsAutomaticallyRecorded')}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 13: Transparency ───────────────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 13 — Transparency
                </h4>
                <Switch
                  checked={formData.transparencyInfoProvided}
                  onCheckedChange={() => handleToggle('transparencyInfoProvided')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transparency-url">Transparency Information URL</Label>
                <Input
                  id="transparency-url"
                  placeholder="https://..."
                  value={formData.transparencyInfoUrl}
                  onChange={(e) => handleInputChange('transparencyInfoUrl', e.target.value)}
                />
              </div>
            </section>

            {/* ── Article 14: Human Oversight ────────────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 14 — Human Oversight
                </h4>
                <Switch
                  checked={formData.humanOversightMeasuresImplemented}
                  onCheckedChange={() => handleToggle('humanOversightMeasuresImplemented')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="human-oversight-desc">Human Oversight Description</Label>
                <Textarea
                  id="human-oversight-desc"
                  placeholder="Describe the human oversight measures in place (e.g. human-in-the-loop, human-on-the-loop)..."
                  value={formData.humanOversightDescription}
                  onChange={(e) => handleInputChange('humanOversightDescription', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </section>

            {/* ── Article 15: Accuracy, Robustness, Cybersecurity ────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 15 — Accuracy, Robustness &amp; Cybersecurity
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="accuracy" className="font-medium">
                      Accuracy Benchmarks Met
                    </Label>
                  </div>
                  <Switch
                    id="accuracy"
                    checked={formData.accuracyBenchmarksMet}
                    onCheckedChange={() => handleToggle('accuracyBenchmarksMet')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="robustness" className="font-medium">
                      Robustness Tested
                    </Label>
                  </div>
                  <Switch
                    id="robustness"
                    checked={formData.robustnessTested}
                    onCheckedChange={() => handleToggle('robustnessTested')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="cybersecurity" className="font-medium">
                      Cybersecurity Measures
                    </Label>
                  </div>
                  <Switch
                    id="cybersecurity"
                    checked={formData.cybersecurityMeasuresImplemented}
                    onCheckedChange={() => handleToggle('cybersecurityMeasuresImplemented')}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 26: Deployer Obligations ──────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 26 — Obligations of Deployers
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="deployer-oversight" className="font-medium">
                      Human Oversight Assigned
                    </Label>
                  </div>
                  <Switch
                    id="deployer-oversight"
                    checked={formData.deployerHumanOversightAssigned}
                    onCheckedChange={() => handleToggle('deployerHumanOversightAssigned')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="deployer-monitoring" className="font-medium">
                      Monitoring Implemented
                    </Label>
                  </div>
                  <Switch
                    id="deployer-monitoring"
                    checked={formData.deployerMonitoringImplemented}
                    onCheckedChange={() => handleToggle('deployerMonitoringImplemented')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="deployer-incident" className="font-medium">
                      Incident Reporting Configured
                    </Label>
                  </div>
                  <Switch
                    id="deployer-incident"
                    checked={formData.deployerIncidentReportingConfigured}
                    onCheckedChange={() => handleToggle('deployerIncidentReportingConfigured')}
                  />
                </div>
              </div>
            </section>

            {/* ── Article 52: Transparency Label ───────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Article 52 — Transparency Label (Limited Risk)
                </h4>
                <Switch
                  checked={formData.transparencyLabelImplemented}
                  onCheckedChange={() => handleToggle('transparencyLabelImplemented')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transparency-label-text">Transparency Label Text</Label>
                <Textarea
                  id="transparency-label-text"
                  placeholder="The actual disclosure text shown to users (e.g. 'This content was generated by AI...')"
                  value={formData.transparencyLabelText}
                  onChange={(e) => handleInputChange('transparencyLabelText', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </section>

            {/* ── Assessment Notes ───────────────────────────────────────── */}
            <section className="border-t border-muted/20 pt-6">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Assessment Notes
              </h4>
              <div className="space-y-2">
                <Label htmlFor="assessment-notes">Notes &amp; Comments</Label>
                <Textarea
                  id="assessment-notes"
                  placeholder="Any additional observations, evidence references, or comments..."
                  value={formData.assessmentNotes}
                  onChange={(e) => handleInputChange('assessmentNotes', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-muted/20 pt-4 gap-2">
            <Button variant="outline" onClick={() => setIsAssessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSavePending} className="gap-2">
              {isSavePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Compliance Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EuAiActTab;
