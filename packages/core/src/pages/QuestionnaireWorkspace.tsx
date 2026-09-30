import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, Save, ArrowLeft, Sparkles, FileDown, FileSpreadsheet, Mail, Check, Download, Zap, ShieldCheck, Copy, Users, Flag, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@complianceos/ui/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@complianceos/ui/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";

import {
  useQuestionnaireAnswersScore,
  getReadinessMeta,
  ScoreBadge,
  ScoreProgress,
  type QuestionnaireAnswer,
} from "./questionnaires/questionnaireApi.tsx";

type Step = "upload" | "preview" | "generating" | "review";
type Direction = "inbound" | "outbound";

/** Live auto-score panel for the review step (per-focus-area breakdown). */
function AutoScorePanel({ answers }: { answers: any[] }) {
  const { data, isLoading, isError } = useQuestionnaireAnswersScore(answers as QuestionnaireAnswer[]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Auto-score
          </CardTitle>
          <CardDescription>Computing readiness from the answers below…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-2/3 bg-muted animate-pulse rounded-full" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = data?.score;
  const summary = data?.summary;

  if (isError || !score || score.total === 0 || score.answered === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Auto-score
          </CardTitle>
          <CardDescription>Answer the questions below to see your readiness score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              No answers yet — fill in responses and this panel will show an overall readiness score
              plus a per-control-area breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta = getReadinessMeta(score.readiness);
  const shownAreas = (score.focusAreas || []).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Auto-score
        </CardTitle>
        <CardDescription>
          {summary?.description || "Readiness computed from the current answers."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold tabular-nums">{score.complianceScore}%</div>
            <ScoreBadge score={score.complianceScore} readiness={score.readiness} tone={meta.tone} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <ScoreProgress value={score.complianceScore} tone={meta.tone} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{score.answered} of {score.total} answered</span>
              <span>{score.completionRate}% complete</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {shownAreas.map((area) => (
            <div key={area.focusArea} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium w-44 truncate">{area.focusArea}</span>
                <ScoreProgress value={area.score} tone={meta.tone} className="max-w-[260px]" />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                {area.score}% · {area.answered}/{area.total}
              </span>
            </div>
          ))}
          {score.focusAreas.length > shownAreas.length && (
            <p className="text-xs text-muted-foreground">
              +{score.focusAreas.length - shownAreas.length} more control areas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuestionnaireWorkspace() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0");
  const qId = params.qId ? parseInt(params.qId) : null;

  // Direction from the dashboard link (?direction=outbound) — outbound flips
  // the workspace into vendor-assessment mode.
  const [direction] = useState<Direction>(() => {
    if (typeof window === "undefined") return "inbound";
    return new URLSearchParams(window.location.search).get("direction") === "outbound"
      ? "outbound"
      : "inbound";
  });
  const isOutbound = direction === "outbound";

  const [workspaceTab, setWorkspaceTab] = useState<"inplace" | "standard">("inplace");
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Array<{ questionId?: string; question: string }>>([]);
  const [answers, setAnswers] = useState<any[]>([]);

  // Create Questionnaire State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [productName, setProductName] = useState("Default");
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParseComplete, setIsParseComplete] = useState(false);

  // Paste-text parsing (fallback when file extraction fails)
  const [pastedText, setPastedText] = useState("");

  // Template Selection State
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // In-Place CAIQ / Excel Populator State
  const [targetCompany, setTargetCompany] = useState("");
  const [targetCloud, setTargetCloud] = useState("AWS (us-east-1)");
  const [targetIdp, setTargetIdp] = useState("Google Workspace & Okta");
  const [targetCodeHost, setTargetCodeHost] = useState("GitHub");
  const [populating, setPopulating] = useState(false);
  const [populatedResult, setPopulatedResult] = useState<any>(null);

  // Vendor invite dialog state (outbound assessments)
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [inviteVendorName, setInviteVendorName] = useState("");
  const [inviteVendorEmail, setInviteVendorEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteResult, setInviteResult] = useState<{ portalUrl: string; emailSent: boolean; emailError?: string } | null>(null);

  // Detect template mode from URL (SSR-safe): ?mode=template opens the picker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'template') {
      setShowTemplateDialog(true);
    }
  }, []);

  // Fetch template questions when a template is selected
  const { data: templateQuestions, isLoading: templateQuestionsLoading } = trpc.questionnaire.getTemplateQuestions.useQuery(
    { templateId: selectedTemplate?.id ?? "" },
    { enabled: !!selectedTemplate?.id }
  );

  // When template questions arrive, seed the create flow with them
  useEffect(() => {
    const qs = (templateQuestions as any)?.questions;
    if (selectedTemplate && Array.isArray(qs) && qs.length > 0) {
      setQuestions(
        qs.map((q: any) => ({
          questionId: q.questionId,
          question: q.question,
          focusArea: q.focusArea,
          subFocusArea: q.subFocusArea,
          responseType: q.responseType,
        }))
      );
      setProjectName(selectedTemplate.name);
      setShowTemplateDialog(false);
      setIsCreateOpen(true);
      setSelectedTemplate(null);
    }
  }, [templateQuestions, selectedTemplate]);

  // Queries & Mutations
  const { data: templates } = trpc.questionnaire.listTemplates.useQuery(
    clientId && clientId > 0 ? { clientId } : {},
    { enabled: clientId !== undefined }
  );

  const { data: projectData, isLoading: isProjectLoading, refetch: refetchProject } = trpc.questionnaire.get.useQuery(
    { id: qId!, clientId },
    { enabled: !!qId && !!clientId }
  );

  // Load project data when it changes
  useEffect(() => {
    if (projectData?.questions && projectData.questions.length > 0) {
      const mappedAnswers = projectData.questions.map((q: any) => ({
        questionId: q.questionId || `Q${q.id}`,
        rowId: q.id,
        focusArea: q.focusArea || "",
        subFocusArea: q.subFocusArea || "",
        extraFields: q.extraFields || {},
        question: q.question,
        answer: q.answer || "",
        comment: q.comment || "",
        confidence: q.confidence || 0,
        sources: q.sources || [],
        status: q.status
      }));
      setAnswers(mappedAnswers);
      setQuestions(mappedAnswers.map((a: any) => ({ questionId: a.questionId, question: a.question })));
      setCurrentStep("review");
    }
  }, [projectData]);

  const parseMutation = trpc.questionnaire.parse.useMutation({
    onSuccess: (data) => {
      if (!data.parsed || !data.questions?.length) {
        toast.error("Could not extract questions", {
          description: data.notice || "Try the In-Place Excel Populator, or paste the question text directly.",
        });
        return;
      }
      setQuestions(data.questions);
      setProjectName(file?.name?.replace(/\.[^/.]+$/, "") || "New Questionnaire");
      setIsCreateOpen(true);
    },
    onError: (err) => {
      toast.error(`Failed to parse input: ${err.message}`);
    }
  });

  const populateWorkbookMutation = trpc.questionnaire.populateWorkbook.useMutation({
    onSuccess: (data) => {
      setPopulatedResult(data);
      toast.success(`Successfully populated ${data.populatedCount} questions directly into ${data.filename}!`);
    },
    onError: (err) => {
      toast.error(`Excel population failed: ${err.message}`);
    }
  });

  const createProjectMutation = trpc.questionnaire.create.useMutation();

  const saveQuestionsMutation = trpc.questionnaire.saveQuestions.useMutation();

  const updateMutation = trpc.questionnaire.update.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire updated");
      refetchProject();
    }
  });

  const completeMutation = trpc.questionnaire.complete.useMutation({
    onSuccess: (data) => {
      toast.success(`Questionnaire completed! ${data.indexedCount} answers added to your answer library.`);
      refetchProject();
    },
    onError: (err) => {
      toast.error(`Failed to complete questionnaire: ${err.message}`);
    }
  });

  const exportWorkbookMutation = trpc.questionnaire.exportWorkbook.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.base64}`;
      link.download = data.filename;
      link.click();
      toast.success(`Exported ${data.questionCount} questions to ${data.filename}`);
    },
    onError: (err) => {
      toast.error(`Export failed: ${err.message}`);
    }
  });

  const sendVendorInviteMutation = trpc.questionnaire.sendVendorInvite.useMutation({
    onSuccess: (data) => {
      setInviteResult({ portalUrl: data.portalUrl, emailSent: !!data.emailSent, emailError: data.emailError });
      if (data.emailSent) {
        toast.success(`Vendor invite emailed to ${data.recipient}!`);
      } else {
        toast.warning("Invite created, but the email could not be delivered", {
          description: data.emailError || "Copy the link below and send it to the vendor manually.",
        });
      }
      refetchProject();
    },
    onError: (err) => {
      toast.error(`Failed to send invite: ${err.message}`);
    }
  });

  // Reviewer workflow (outbound assessments): approve/flag vendor answers.
  const reviewQuestionMutation = trpc.questionnaire.reviewQuestion.useMutation({
    onSuccess: () => {
      refetchFindings();
      refetchProject();
    },
    onError: (err) => toast.error(`Review action failed: ${err.message}`)
  });

  // Findings panel data (outbound only): failed/flagged vendor answers.
  const isOutboundProject = ((projectData as any)?.direction ?? direction) === "outbound";
  const { data: findingsData, refetch: refetchFindings } = trpc.questionnaire.getFindings.useQuery(
    { id: qId!, clientId },
    { enabled: !!qId && isOutboundProject }
  );

  const handleReviewQuestion = (rowId: number | undefined, status: string) => {
    if (!qId || !rowId) return;
    reviewQuestionMutation.mutate({
      questionnaireId: qId,
      clientId,
      rowId,
      status: status as any,
    });
  };

  const handleReviewMeta = (rowId: number | undefined, patch: { priority?: string; remediationDeadline?: string | null }) => {
    if (!qId || !rowId) return;
    reviewQuestionMutation.mutate({
      questionnaireId: qId,
      clientId,
      rowId,
      status: "needs_review",
      ...patch,
    } as any);
  };

  // Outbound lifecycle: send a rejected/updated assessment back to the vendor.
  const handleReopenForVendor = async () => {
    if (!qId) return;
    try {
      await updateMutation.mutateAsync({ id: qId, clientId, status: "vendor_pending" } as any);
      if (projectData?.vendorEmail) {
        await sendVendorInviteMutation.mutateAsync({
          questionnaireId: qId,
          clientId,
          vendorEmail: projectData.vendorEmail,
          vendorName: projectData.vendorName || undefined,
          message: "The reviewer requested updates to some of your answers. Please review the flagged questions and resubmit.",
        });
        setShowVendorDialog(true);
      } else {
        toast.info("Assessment reopened — send a new invite to the vendor.");
        handleOpenInviteDialog();
      }
    } catch {
      // handled by mutation onError handlers
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPopulatedResult(null);
    }
  };

  const handleInPlacePopulate = async (limit: number) => {
    if (!file) {
      toast.error("Please select an Excel (.xlsx) or CSV file first.");
      return;
    }

    setPopulating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (!base64) {
        setPopulating(false);
        return;
      }

      try {
        await populateWorkbookMutation.mutateAsync({
          fileBase64: base64,
          filename: file.name,
          maxQuestions: limit > 0 ? limit : undefined,
          context: {
            companyName: targetCompany || "Client Organization",
            cloudProvider: targetCloud,
            idp: targetIdp,
            codeHost: targetCodeHost,
          }
        });
      } catch {
        // Handled by onError
      } finally {
        setPopulating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPopulatedFile = () => {
    if (!populatedResult?.populatedBase64) return;
    const linkSource = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${populatedResult.populatedBase64}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = populatedResult.filename || "Populated_Assessment.xlsx";
    downloadLink.click();
  };

  const detectFileType = (name: string): "pdf" | "xlsx" | "csv" => {
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
    if (name.endsWith('.csv')) return 'csv';
    return 'pdf';
  };

  const handleParse = async () => {
    if (!file) return;

    setUploadProgress(0);
    setIsParseComplete(false);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (!base64) {
        clearInterval(interval);
        return;
      }

      try {
        await parseMutation.mutateAsync({
          fileBase64: base64,
          filename: file.name,
          fileType: detectFileType(file.name)
        });
        clearInterval(interval);
        setUploadProgress(100);
        setIsParseComplete(true);
      } catch {
        clearInterval(interval);
        setUploadProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleParsePastedText = async () => {
    if (!pastedText.trim()) return;
    await parseMutation.mutateAsync({ text: pastedText });
  };

  const handleCreateProject = async () => {
    if (isOutbound && !vendorEmail.trim()) {
      toast.error("Vendor email is required for outbound assessments");
      return;
    }

    try {
      const created = await createProjectMutation.mutateAsync({
        clientId,
        name: projectName,
        direction: isOutbound ? "outbound" : "inbound",
        senderName: isOutbound ? undefined : (senderName || undefined),
        productName: productName || "Default",
        vendorName: isOutbound ? (vendorName || undefined) : undefined,
        vendorEmail: isOutbound ? vendorEmail : undefined,
      } as any);

      toast.success("Questionnaire created successfully");
      setIsCreateOpen(false);

      if (questions.length > 0) {
        await saveQuestionsMutation.mutateAsync({
          questionnaireId: created.id,
          clientId,
          questions: questions.map(q => ({
            questionId: q.questionId,
            focusArea: (q as any).focusArea,
            subFocusArea: (q as any).subFocusArea,
            extraFields: (q as any).extraFields,
            question: q.question,
            status: 'pending'
          }))
        });
      }

      if (isOutbound && vendorEmail.trim()) {
        // Straight into the invite so the vendor actually receives the link.
        const invite = await sendVendorInviteMutation.mutateAsync({
          questionnaireId: created.id,
          clientId,
          vendorEmail: vendorEmail.trim(),
          vendorName: vendorName || undefined,
        });
        setInviteVendorEmail(vendorEmail);
        setInviteVendorName(vendorName);
        setInviteResult({ portalUrl: invite.portalUrl, emailSent: !!invite.emailSent, emailError: invite.emailError });
        setShowVendorDialog(true);
      } else {
        setLocation(`/clients/${clientId}/questionnaires/${created.id}`);
      }
    } catch (err: any) {
      toast.error(`Failed to create questionnaire: ${err.message}`);
    }
  };

  const handleOpenInviteDialog = () => {
    setInviteVendorName(projectData?.vendorName || "");
    setInviteVendorEmail(projectData?.vendorEmail || "");
    setInviteMessage("");
    setInviteResult(null);
    setShowVendorDialog(true);
  };

  const handleSendInvite = async () => {
    if (!qId) return;
    if (!inviteVendorEmail.trim()) {
      toast.error("Vendor email is required");
      return;
    }
    try {
      await sendVendorInviteMutation.mutateAsync({
        questionnaireId: qId,
        clientId,
        vendorEmail: inviteVendorEmail.trim(),
        vendorName: inviteVendorName || undefined,
        message: inviteMessage || undefined,
      });
    } catch {
      // handled by onError
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteResult?.portalUrl) return;
    try {
      await navigator.clipboard.writeText(inviteResult.portalUrl);
      toast.success("Portal link copied to clipboard");
    } catch {
      toast.error("Could not copy — select the link text manually");
    }
  };

  const handleSaveProgress = async () => {
    if (!qId) return;
    try {
      await saveQuestionsMutation.mutateAsync({
        questionnaireId: qId,
        clientId,
        questions: answers.map((a: any, i: number) => ({
          questionId: a.questionId || `Q${i + 1}`,
          question: a.question,
          focusArea: a.focusArea || "",
          subFocusArea: a.subFocusArea || "",
          extraFields: a.extraFields || {},
          answer: a.answer || "",
          comment: a.comment || "",
          confidence: a.confidence,
          sources: a.sources,
          status: a.status,
        })),
      });
      toast.success("Progress saved");
      refetchProject();
    } catch (err: any) {
      toast.error(`Failed to save progress: ${err.message}`);
    }
  };

  // AI answer generation (answer library → LLM, honest "Needs Review" on gaps)
  const generateAnswersMutation = trpc.questionnaire.generateAnswers.useMutation({
    onSuccess: (result: any) => {
      const answered = result?.answeredQuestions || [];
      let applied = 0;
      let needsReview = 0;
      setAnswers((prev: any[]) =>
        prev.map((a) => {
          const match = answered.find(
            (r: any) => r.questionId === a.questionId || r.questionText === a.question
          );
          if (!match) return a;
          applied++;
          if (match.shortAnswer === "Needs Review") needsReview++;
          return {
            ...a,
            answer: match.shortAnswer === "Needs Review"
              ? a.answer || match.answer
              : `${match.shortAnswer}. ${match.answer}`.trim(),
            confidence: Math.round(match.confidenceScore || 0),
            sources: [match.supportingEvidence, match.policyCitation].filter(Boolean),
            status: match.shortAnswer === "Needs Review" ? a.status || "pending" : "answered",
          };
        })
      );
      if (applied === 0) {
        toast.info("No new answers were generated");
      } else {
        toast.success(`AI drafted ${applied} question(s)`, {
          description: `Engine: ${result.engine}${result.modelUsed ? ` (${result.modelUsed})` : ""} · Avg confidence ${result.overallConfidence}%${needsReview > 0 ? ` · ${needsReview} need human review` : ""}`,
        });
      }
    },
    onError: (err: any) => {
      toast.error("AI answering failed", { description: err.message });
    },
  });

  const handleGenerateAnswers = async () => {
    if (!qId || !clientId) return;
    const unanswered = answers.filter((a: any) => !(a.answer || "").trim());
    if (answers.length === 0) {
      toast.error("No questions to answer", { description: "Upload or select questions first." });
      return;
    }
    if (unanswered.length === 0) {
      toast.info("All questions already have answers", { description: "Clear an answer to re-draft it with AI." });
      return;
    }
    await generateAnswersMutation.mutateAsync({
      clientId,
      questionnaireId: qId,
      engine: "auto",
      questions: unanswered.map((a: any) => ({
        questionId: a.questionId || String(a.rowId ?? ""),
        questionText: a.question,
        category: a.focusArea || undefined,
      })),
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "in_review":
      case "pending_review":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">In Review</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/clients/${clientId}/questionnaires`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {projectData ? projectData.name : isOutbound ? "New Vendor Assessment" : "AI Questionnaire & CAIQ Auto-Populator"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {projectData
                  ? `Status: ${formatStatus(projectData.status)}`
                  : isOutbound
                  ? "Send a security questionnaire to a vendor and track their responses."
                  : "Auto-populate vendor security assessments in-place or manage full audit workflows."
                }
              </p>
            </div>
          </div>
          <PageGuide
            title="Questionnaire Populator"
            description="High-velocity in-place Excel auto-populator and GRC questionnaire solver."
            rationale="Eliminates manual questionnaire filling by drafting answers directly into original client workbooks — every draft is flagged for human verification."
            howToUse={[
              { step: "Upload", description: "Drop the prospect's original .xlsx or .csv workbook." },
              { step: "Target Context", description: "Set company name, cloud provider, and IdP variables." },
              { step: "1-Click Populate", description: "Download the exact same .xlsx file with draft answers in-place." }
            ]}
          />
        </div>

        {!qId && (
          <Tabs value={workspaceTab} onValueChange={(v: any) => setWorkspaceTab(v)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="inplace" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                ⚡ In-Place Excel Populator
              </TabsTrigger>
              <TabsTrigger value="standard" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                📋 Standard Multi-Step Wizard
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: IN-PLACE EXCEL POPULATOR */}
            <TabsContent value="inplace" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Context Configuration */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Client Context Variables
                    </CardTitle>
                    <CardDescription>
                      Injected dynamically into draft responses. Every draft is marked for human verification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Company / Target Name</Label>
                      <Input
                        id="companyName"
                        placeholder="e.g. Acme Health SaaS"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cloudProvider">Cloud Infrastructure</Label>
                      <Input
                        id="cloudProvider"
                        placeholder="e.g. AWS (us-east-1)"
                        value={targetCloud}
                        onChange={(e) => setTargetCloud(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="idp">Identity & MFA Provider</Label>
                      <Input
                        id="idp"
                        placeholder="e.g. Google Workspace & Okta"
                        value={targetIdp}
                        onChange={(e) => setTargetIdp(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="codeHost">Code Repository & CI/CD</Label>
                      <Input
                        id="codeHost"
                        placeholder="e.g. GitHub"
                        value={targetCodeHost}
                        onChange={(e) => setTargetCodeHost(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column: Ingest & Populate */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Upload Workbook & Auto-Populate In-Place
                    </CardTitle>
                    <CardDescription>
                      Upload the prospect's original <code>.xlsx</code> file. All sheets, tabs, formulas, and styles are 100% preserved. Draft answers are written into the response column — verify each one before sending.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors">
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="font-semibold text-sm">Select CAIQ, SIG Lite, or Vendor Assessment (.xlsx / .csv)</p>
                      <p className="text-xs text-muted-foreground mt-1">Accepts standard Excel files with question and response columns.</p>

                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="max-w-xs mt-4 cursor-pointer"
                      />
                      {file && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-primary font-semibold">
                          <FileSpreadsheet className="h-4 w-4" />
                          Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={() => handleInPlacePopulate(25)}
                        disabled={!file || populating}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2"
                      >
                        {populating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        ⚡ Populate First 25 (Free Lead Magnet)
                      </Button>

                      <Button
                        onClick={() => handleInPlacePopulate(0)}
                        disabled={!file || populating}
                        variant="outline"
                        className="font-semibold flex items-center gap-2"
                      >
                        {populating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        🚀 Populate Full Workbook (All Questions)
                      </Button>
                    </div>

                    {/* Populated Result Box */}
                    {populatedResult && (
                      <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-5 space-y-4 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <h4 className="font-bold text-base text-green-800 dark:text-green-300">
                                In-Place Population Successful!
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Populated <strong>{populatedResult.populatedCount}</strong> questions directly into sheet <code>{populatedResult.sheetName}</code>. Every response is an unverified AI draft — review before sending.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Badge variant="outline" className="text-[10px]">
                                Question Col: {populatedResult.detectedColumns?.questionCol}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Response Col: {populatedResult.detectedColumns?.responseCol}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                Details Col: {populatedResult.detectedColumns?.detailsCol}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            onClick={handleDownloadPopulatedFile}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg flex items-center gap-2"
                          >
                            <Download className="h-5 w-5" />
                            Download Populated .xlsx
                          </Button>
                        </div>

                        {/* Live Answer Preview Table */}
                        {populatedResult.preview && populatedResult.preview.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-green-500/20 space-y-2">
                            <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                              Live Answer Previews (First {populatedResult.preview.length})
                            </h5>
                            <div className="max-h-[350px] overflow-y-auto border rounded-md bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead className="w-1/3">Question</TableHead>
                                    <TableHead className="w-24">Answer</TableHead>
                                    <TableHead>Implementation Details & Evidence</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {populatedResult.preview.map((p: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-mono text-xs font-bold text-primary">{p.questionId}</TableCell>
                                      <TableCell className="text-xs font-medium">{p.questionText}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                                          {p.shortAnswer}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs space-y-1">
                                        <p>{p.answer}</p>
                                        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{p.supportingEvidence}</span>
                                          <span className="text-primary">{p.policyCitation}</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: STANDARD MULTI-STEP WIZARD */}
            <TabsContent value="standard" className="space-y-6">
              <Card className="max-w-xl mx-auto border-dashed border-2 hover:border-primary/50 hover:bg-muted/50 transition-all duration-300">
                <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[260px] space-y-4">
                  <div className="p-4 bg-muted rounded-full">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Import Questionnaire for Workspace Tracking</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Creates a database-tracked questionnaire project with full multi-collaborator review.
                    </p>
                  </div>

                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.csv"
                    onChange={handleFileUpload}
                    className="max-w-xs cursor-pointer"
                  />

                  {parseMutation.isPending ? (
                    <div className="w-full max-w-xs space-y-3">
                      <Progress value={uploadProgress} className="h-2 w-full" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Extracting questions...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={handleParse} disabled={!file} className="min-w-[150px]">
                      Process & Create Project
                    </Button>
                  )}

                  <div className="w-full border-t border-border/60 pt-4 space-y-2">
                    <Label htmlFor="paste-questions" className="text-xs text-muted-foreground">
                      Or paste questions (one per line, or rows copied from Excel/CSV)
                    </Label>
                    <Textarea
                      id="paste-questions"
                      rows={5}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={"1. Is MFA enforced for all remote access?\n2. Are backups tested for restoration?"}
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleParsePastedText}
                      disabled={!pastedText.trim() || parseMutation.isPending}
                      className="w-full"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Parse Pasted Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Existing Review Table when opened inside a specific project */}
        {qId && (
          <div className="space-y-6">
            <AutoScorePanel answers={answers} />

            {/* Vendor Findings (outbound only): failed/flagged answers awaiting review */}
            {isOutboundProject && findingsData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4 text-amber-500" />
                    Vendor Findings
                  </CardTitle>
                  <CardDescription>
                    {findingsData.summary.failed} failed · {findingsData.summary.flagged} flagged, out of{" "}
                    {findingsData.summary.total} answers. Approve, flag, or set a remediation deadline —
                    then reopen &amp; re-invite to send flagged items back to the vendor.
                  </CardDescription>
                </CardHeader>
                {findingsData.findings.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      {findingsData.findings.map((f: any) => (
                        <div key={f.rowId} className="rounded-xl border border-border/70 p-3 space-y-2 bg-muted/20">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-mono">{f.questionId}</Badge>
                                <Badge
                                  className={
                                    f.classification === "fail"
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                  }
                                >
                                  {f.classification === "fail" ? "Failed" : f.status === "flagged" ? "Flagged" : "Needs Review"}
                                </Badge>
                                {f.priority === "high" && (
                                  <Badge variant="destructive" className="text-[10px]">High priority</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium mt-1.5">{f.question}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                <span className="font-semibold">Vendor answer:</span> {f.answer || "—"}
                              </p>
                              {f.comment && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                                  Vendor note: {f.comment}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => handleReviewQuestion(f.rowId, "approved")}
                              disabled={reviewQuestionMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Accept
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50">
                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              Priority
                              <select
                                value={f.priority}
                                onChange={(e) => handleReviewMeta(f.rowId, { priority: e.target.value })}
                                className="h-7 rounded-md border border-border bg-background text-xs px-1.5"
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              Remediation due
                              <Input
                                type="date"
                                value={f.remediationDeadline ? new Date(f.remediationDeadline).toISOString().slice(0, 10) : ""}
                                onChange={(e) =>
                                  handleReviewMeta(f.rowId, {
                                    remediationDeadline: e.target.value
                                      ? new Date(`${e.target.value}T23:59:59`).toISOString()
                                      : null,
                                  })
                                }
                                className="h-7 text-xs w-36"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Review & Edit Responses</CardTitle>
                  <CardDescription>
                    {answers.length} questions loaded. Verify and customize answers before marking complete.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    onClick={() => exportWorkbookMutation.mutate({ id: qId, clientId })}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={exportWorkbookMutation.isPending}
                  >
                    {exportWorkbookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    Export .xlsx
                  </Button>
                  {isOutboundProject &&
                    (projectData?.status === "completed" || projectData?.status === "pending_review") && (
                      <Button
                        onClick={handleReopenForVendor}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reopen & Re-invite Vendor
                      </Button>
                    )}
                  {isOutboundProject && (
                    <Button onClick={handleOpenInviteDialog} variant="outline" size="sm" className="flex items-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                      <Mail className="h-4 w-4" />
                      Invite Vendor
                    </Button>
                  )}
                  {!isOutboundProject && (
                    <Button onClick={handleGenerateAnswers} variant="outline" size="sm" className="flex items-center gap-2 border-amber-400 text-amber-700 hover:bg-amber-50" disabled={generateAnswersMutation.isPending}>
                      {generateAnswersMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                      {generateAnswersMutation.isPending ? "AI Answering…" : "AI Answer Unanswered"}
                    </Button>
                  )}
                  <Button onClick={handleSaveProgress} variant="outline" size="sm" className="flex items-center gap-2" disabled={saveQuestionsMutation.isPending}>
                    {saveQuestionsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Progress
                  </Button>
                  <Button onClick={() => setIsCompleteOpen(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <Check className="h-4 w-4" /> Mark Complete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead className="w-1/3">Question</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        {isOutboundProject && <TableHead className="w-32">Review</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answers.map((a, i) => (
                        <TableRow key={a.rowId ?? i}>
                          <TableCell className="font-mono text-xs font-bold text-primary">{a.questionId || `Q${i+1}`}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {a.question}
                            {isOutboundProject && a.comment && (
                              <p className="text-[11px] text-muted-foreground mt-1 italic">Vendor note: {a.comment}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={a.answer}
                              onChange={(e) => {
                                const newAnswers = [...answers];
                                newAnswers[i] = { ...newAnswers[i], answer: e.target.value };
                                setAnswers(newAnswers);
                              }}
                              rows={2}
                              className="text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            {a.status === "approved" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Approved</Badge>
                            ) : a.status === "flagged" ? (
                              <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">Flagged</Badge>
                            ) : a.status === "needs_review" ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">Needs Review</Badge>
                            ) : (
                              <Badge variant={a.answer ? "outline" : "secondary"}>
                                {a.answer ? "Drafted" : "Pending"}
                              </Badge>
                            )}
                          </TableCell>
                          {isOutboundProject && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10"
                                  title="Approve answer"
                                  onClick={() => handleReviewQuestion(a.rowId, "approved")}
                                  disabled={reviewQuestionMutation.isPending}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                                  title="Flag answer for vendor follow-up"
                                  onClick={() => handleReviewQuestion(a.rowId, "flagged")}
                                  disabled={reviewQuestionMutation.isPending}
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                                  title="Reset to needs review"
                                  onClick={() => handleReviewQuestion(a.rowId, "needs_review")}
                                  disabled={reviewQuestionMutation.isPending}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Project Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-lg">
            <DialogHeader>
              <DialogTitle>Create Questionnaire Project</DialogTitle>
              <DialogDescription>
                Parsed {questions.length} questions{file ? ` from ${file.name}` : " from pasted text"}. Enter details to initialize the workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="projName">Project Name</Label>
                <Input
                  id="projName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1"
                />
              </div>
              {isOutbound ? (
                <>
                  <div>
                    <Label htmlFor="vndName">Vendor Name</Label>
                    <Input
                      id="vndName"
                      placeholder="e.g. Acme Cloud Services"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vndEmail">Vendor Email (invite recipient)</Label>
                    <Input
                      id="vndEmail"
                      type="email"
                      placeholder="security@vendor.com"
                      value={vendorEmail}
                      onChange={(e) => setVendorEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="sndr">Sender / Client Organization</Label>
                  <Input
                    id="sndr"
                    placeholder="e.g. Enterprise Client Security Team"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isOutbound && vendorEmail.trim() ? "Create & Send Invite" : "Initialize Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vendor Invite Dialog */}
        <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
          <DialogContent className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                {inviteResult ? "Vendor Invite Ready" : "Invite Vendor"}
              </DialogTitle>
              <DialogDescription>
                {inviteResult
                  ? "The vendor completes the assessment through this secure link."
                  : "The vendor receives a secure link and can save progress until they submit."}
              </DialogDescription>
            </DialogHeader>
            {inviteResult ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2">
                  {inviteResult.emailSent ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      <Check className="h-3 w-3 mr-1" /> Email sent
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <AlertCircle className="h-3 w-3 mr-1" /> Email not sent{inviteResult.emailError ? `: ${inviteResult.emailError}` : ""}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label>Portal Link</Label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={inviteResult.portalUrl} className="text-xs font-mono" />
                    <Button variant="outline" size="sm" onClick={handleCopyInviteLink} className="shrink-0">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="invVndName">Vendor Name</Label>
                  <Input
                    id="invVndName"
                    placeholder="e.g. Acme Cloud Services"
                    value={inviteVendorName}
                    onChange={(e) => setInviteVendorName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invVndEmail">Vendor Email</Label>
                  <Input
                    id="invVndEmail"
                    type="email"
                    placeholder="security@vendor.com"
                    value={inviteVendorEmail}
                    onChange={(e) => setInviteVendorEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invMsg">Message (optional)</Label>
                  <Textarea
                    id="invMsg"
                    rows={3}
                    placeholder="Context for the vendor — deadlines, scope, contacts…"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {inviteResult ? (
                <>
                  <Button variant="outline" onClick={() => setShowVendorDialog(false)}>Close</Button>
                  <Button onClick={() => setLocation(`/clients/${clientId}/questionnaires`)}>Back to List</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowVendorDialog(false)}>Cancel</Button>
                  <Button onClick={handleSendInvite} disabled={sendVendorInviteMutation.isPending}>
                    {sendVendorInviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Send Invite
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Picker Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                Start from a Standard Template
              </DialogTitle>
              <DialogDescription>
                {isOutbound
                  ? "Pick the questionnaire to send to your vendor. You'll enter vendor details next."
                  : "Pick the assessment you received, or closest to it — you can edit questions after import."}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[380px] overflow-y-auto space-y-2 py-2">
              {(templates || []).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  disabled={templateQuestionsLoading}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-primary/40 transition-colors flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {t.questionCount} Q
                  </Badge>
                </button>
              ))}
              {(!templates || templates.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No templates available yet.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Complete Confirmation Dialog */}
        <AlertDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
          <AlertDialogContent className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Questionnaire?</AlertDialogTitle>
              <AlertDialogDescription>
                This will record final readiness scores and add all answered questions to your answer
                library — approved responses will be suggested automatically for matching questions in
                future questionnaires.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => completeMutation.mutate({ id: qId!, clientId })}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Confirm & Complete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
