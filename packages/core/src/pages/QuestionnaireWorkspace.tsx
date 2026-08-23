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
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Save, ChevronRight, ArrowLeft, Sparkles, Lock, FileDown, FileSpreadsheet, Mail, LayoutGrid, Check, Download, Zap, ShieldCheck, Database, KeyRound, Cloud } from "lucide-react";
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParseComplete, setIsParseComplete] = useState(false);

  // Template Selection State
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // In-Place CAIQ / Excel Populator State
  const [targetCompany, setTargetCompany] = useState("");
  const [targetCloud, setTargetCloud] = useState("AWS (us-east-1)");
  const [targetIdp, setTargetIdp] = useState("Google Workspace & Okta");
  const [targetCodeHost, setTargetCodeHost] = useState("GitHub");
  const [maxQuestionLimit, setMaxQuestionLimit] = useState<number>(25);
  const [populating, setPopulating] = useState(false);
  const [populatedResult, setPopulatedResult] = useState<any>(null);

  // Vendor Dialog State
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");

  // Detect template mode from URL (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'template') {
      setIsTemplateMode(true);
      setShowTemplateDialog(true);
    }
  }, []);

  // Fetch template questions when a template is selected
  const { data: templateQuestions } = trpc.questionnaire.getTemplateQuestions.useQuery(
    { templateId: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // Queries & Mutations
  const { data: projectData, isLoading: isProjectLoading, refetch: refetchProject } = trpc.questionnaire.get.useQuery({ id: qId! }, {
    enabled: !!qId
  });

  // Load project data when it changes
  useEffect(() => {
    if (projectData?.questions && projectData.questions.length > 0) {
      const mappedAnswers = projectData.questions.map((q: any) => ({
        questionId: q.questionId,
        focusArea: q.focusArea || "",
        subFocusArea: q.subFocusArea || "",
        extraFields: q.extraFields || {},
        question: q.question,
        answer: q.answer || "",
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
      setQuestions(data.questions);
      setProjectName(file?.name?.replace(/\.[^/.]+$/, "") || "New Questionnaire");
      setIsCreateOpen(true);
    },
    onError: (err) => {
      toast.error(`Failed to parse file: ${err.message}`);
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

  const createProjectMutation = trpc.questionnaire.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Questionnaire created successfully");
      setIsCreateOpen(false);
      await saveQuestionsMutation.mutateAsync({
        questionnaireId: data.id,
        questions: questions.map(q => ({
          questionId: q.questionId,
          focusArea: (q as any).focusArea,
          subFocusArea: (q as any).subFocusArea,
          extraFields: (q as any).extraFields,
          question: q.question,
          status: 'pending'
        }))
      });

      const initialAnswers = questions.map(q => ({
        questionId: q.questionId,
        focusArea: (q as any).focusArea || "",
        subFocusArea: (q as any).subFocusArea || "",
        extraFields: (q as any).extraFields || {},
        question: q.question,
        answer: "",
        comment: "",
        tags: [],
        access: "internal",
        assignee: null,
        confidence: 0,
        sources: [],
        status: "pending"
      }));
      setAnswers(initialAnswers);
      setCurrentStep("review");
      setLocation(`/clients/${clientId}/questionnaires/${data.id}`);
    }
  });

  const saveQuestionsMutation = trpc.questionnaire.saveQuestions.useMutation({
    onSuccess: () => {}
  });

  const updateMutation = trpc.questionnaire.update.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire updated");
      refetchProject();
    }
  });

  const completeMutation = trpc.questionnaire.complete.useMutation({
    onSuccess: (data) => {
      toast.success(`Questionnaire completed! ${data.indexedCount} answers saved.`);
      refetchProject();
    },
    onError: (err) => {
      toast.error(`Failed to complete questionnaire: ${err.message}`);
    }
  });

  const exportExcelQuery = trpc.questionnaire.exportExcel.useQuery({ id: qId! }, {
    enabled: false
  });

  const { data: templates } = trpc.questionnaire.listTemplates.useQuery(
    clientId && clientId > 0 ? { clientId } : {},
    { enabled: clientId !== undefined }
  );

  const { data: vendorList } = trpc.vendors.listVendors.useQuery(
    { clientId },
    { enabled: !!clientId && clientId > 0 }
  );

  const sendVendorInviteMutation = trpc.questionnaire.sendVendorInvite.useMutation({
    onSuccess: () => {
      toast.success(`Vendor invite sent to ${vendorEmail}!`);
      setShowVendorDialog(false);
      setVendorName("");
      setVendorEmail("");
      setVendorMessage("");
      refetchProject();
    },
    onError: (err) => {
      toast.error(`Failed to send invite: ${err.message}`);
    }
  });

  const submitForReviewMutation = trpc.questionnaire.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire submitted for review!");
      refetchProject();
    },
    onError: (err) => {
      toast.error(`Failed to submit: ${err.message}`);
    }
  });

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

      const fileType = file.name.endsWith('.pdf') ? 'pdf' :
        file.name.endsWith('.xlsx') ? 'xlsx' :
          file.name.endsWith('.csv') ? 'csv' : 'pdf';

      try {
        await parseMutation.mutateAsync({
          fileBase64: base64,
          filename: file.name,
          fileType: fileType as any
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

  const handleCreateProject = () => {
    createProjectMutation.mutate({
      clientId,
      name: projectName,
      direction: "inbound",
      senderName: senderName,
      productName: "Default"
    });
  };

  const handleSaveProgress = async () => {
    if (!qId) return;
    await saveQuestionsMutation.mutateAsync({
      questionnaireId: qId,
      questions: answers.map((a: any) => ({
        question: a.question,
        focusArea: a.focusArea,
        subFocusArea: a.subFocusArea,
        extraFields: a.extraFields,
        answer: a.answer,
        confidence: a.confidence,
        sources: a.sources,
        status: a.status,
      })),
    });
    toast.success("Progress saved");
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "in_review":
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
                {projectData ? projectData.name : "AI Questionnaire & CAIQ Auto-Populator"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {projectData
                  ? `Status: ${projectData.status}`
                  : "Auto-populate vendor security assessments in-place or manage full audit workflows."
                }
              </p>
            </div>
          </div>
          <PageGuide
            title="Questionnaire Populator"
            description="High-velocity in-place Excel auto-populator and GRC questionnaire solver."
            rationale="Eliminates manual questionnaire filling by injecting auditor-grade answers directly into original client workbooks."
            howToUse={[
              { step: "Upload", description: "Drop the prospect's original .xlsx or .csv workbook." },
              { step: "Target Context", description: "Set company name, cloud provider, and IdP variables." },
              { step: "1-Click Populate", description: "Download the exact same .xlsx file populated in-place." }
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
                      Injected dynamically into boilerplate responses.
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
                      Upload the prospect's original <code>.xlsx</code> file. All sheets, tabs, formulas, and styles are 100% preserved.
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
                              Populated <strong>{populatedResult.populatedCount}</strong> questions directly into sheet <code>{populatedResult.sheetName}</code>.
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Existing Review Table when opened inside a specific project */}
        {qId && (
          <div className="space-y-6">
            <AutoScorePanel answers={answers} />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Review & Edit Responses</CardTitle>
                  <CardDescription>
                    {answers.length} questions loaded. Verify and customize answers before marking complete.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveProgress} variant="outline" size="sm" className="flex items-center gap-2">
                    <Save className="h-4 w-4" /> Save Progress
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answers.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-bold text-primary">{a.questionId || `Q${i+1}`}</TableCell>
                          <TableCell className="text-sm font-medium">{a.question}</TableCell>
                          <TableCell>
                            <Textarea
                              value={a.answer}
                              onChange={(e) => {
                                const newAnswers = [...answers];
                                newAnswers[i].answer = e.target.value;
                                setAnswers(newAnswers);
                              }}
                              rows={2}
                              className="text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.answer ? "outline" : "secondary"}>
                              {a.answer ? "Drafted" : "Pending"}
                            </Badge>
                          </TableCell>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Questionnaire Project</DialogTitle>
              <DialogDescription>
                Parsed {questions.length} questions from {file?.name}. Enter details to initialize the workspace.
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Initialize Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Confirmation Dialog */}
        <AlertDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Questionnaire?</AlertDialogTitle>
              <AlertDialogDescription>
                This will lock the questionnaire, record final readiness compliance scores, and index verified answers into your knowledge base.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => completeMutation.mutate({ id: qId! })}
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
