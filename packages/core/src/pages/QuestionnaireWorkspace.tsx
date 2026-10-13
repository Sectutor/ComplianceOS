import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Save, ChevronRight, ChevronLeft, ArrowLeft, Sparkles, Lock, FileDown, FileSpreadsheet, Mail, LayoutGrid, Check, HelpCircle, Columns } from "lucide-react";
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

type Step = "upload" | "preview" | "generating" | "review";

export default function QuestionnaireWorkspace() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0");
  const qId = params.qId ? parseInt(params.qId) : null;

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
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isParseComplete, setIsParseComplete] = useState(false);

  // Template Selection State
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Vendor Dialog State
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");
  const [showAiColumns, setShowAiColumns] = useState<boolean | null>(null);

  // Horizontal Table Scroll State & Column Stepping Engine
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingTop = useRef(false);
  const isSyncingTable = useRef(false);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [tableScrollWidth, setTableScrollWidth] = useState(2100);

  const isAiVisible = showAiColumns !== null ? showAiColumns : true;
  const extraCols = Object.keys(answers[0]?.extraFields || {});

  // Define unpinned column step targets (relative to unpinned scroll window)
  const columnSteps = [
    { id: "answer", label: "Answer", offset: 0 },
    { id: "notes", label: "Reviewer Notes", offset: 320 },
    ...(isAiVisible ? [
      { id: "confidence", label: "Confidence", offset: 580 },
      { id: "sources", label: "Sources", offset: 685 }
    ] : []),
    ...extraCols.map((c, idx) => ({
      id: c,
      label: c,
      offset: (isAiVisible ? 815 : 705) + idx * 200
    }))
  ];

  const maxScrollLeft = tableScrollRef.current
    ? Math.max(0, tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth)
    : 0;

  const isAtMaxRight = maxScrollLeft > 50 && currentScrollX >= maxScrollLeft - 20;

  // Determine which column step is currently aligned
  const currentStepIndex = isAtMaxRight
    ? columnSteps.length - 1
    : columnSteps.reduce((accIndex, step, index) => {
        if (currentScrollX >= step.offset - 35) return index;
        return accIndex;
      }, 0);

  const canGoLeft = currentStepIndex > 0 || currentScrollX > 15;
  const canGoRight = currentStepIndex < columnSteps.length - 1;

  // Jump smoothly to a specific column step
  const scrollToColumn = (index: number) => {
    if (tableScrollRef.current) {
      const clampedIndex = Math.max(0, Math.min(index, columnSteps.length - 1));
      const targetStep = columnSteps[clampedIndex];
      if (clampedIndex === columnSteps.length - 1) {
        const maxScroll = tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth;
        const target = Math.min(maxScroll, Math.max(targetStep.offset, maxScroll - 50));
        tableScrollRef.current.scrollTo({ left: target, behavior: "smooth" });
      } else {
        tableScrollRef.current.scrollTo({ left: targetStep.offset, behavior: "smooth" });
      }
    }
  };

  // Move column-by-column until the last column is visible
  const handleScrollLeft = () => {
    const prevIndex = Math.max(0, currentStepIndex - 1);
    scrollToColumn(prevIndex);
  };

  const handleScrollRight = () => {
    const nextIndex = Math.min(columnSteps.length - 1, currentStepIndex + 1);
    scrollToColumn(nextIndex);
  };

  // Synchronized scroll handlers between Top Scrollbar and Table
  const handleTopScroll = () => {
    if (isSyncingTable.current) return;
    isSyncingTop.current = true;
    if (tableScrollRef.current && topScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      setCurrentScrollX(topScrollRef.current.scrollLeft);
    }
    requestAnimationFrame(() => {
      isSyncingTop.current = false;
    });
  };

  const handleTableScroll = () => {
    if (isSyncingTop.current) return;
    isSyncingTable.current = true;
    if (tableScrollRef.current) {
      const scrollLeft = tableScrollRef.current.scrollLeft;
      setCurrentScrollX(scrollLeft);
      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = scrollLeft;
      }
    }
    requestAnimationFrame(() => {
      isSyncingTable.current = false;
    });
  };

  // Keep table scroll width and positions updated
  useEffect(() => {
    const updateWidth = () => {
      if (tableScrollRef.current) {
        setTableScrollWidth(tableScrollRef.current.scrollWidth);
        const scrollLeft = tableScrollRef.current.scrollLeft;
        setCurrentScrollX(scrollLeft);
        if (topScrollRef.current) {
          topScrollRef.current.scrollLeft = scrollLeft;
        }
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [answers, showAiColumns]);

  // Detect template mode from URL (SSR-safe)
  useEffect(() => {
    // Skip during SSR - window is not available on the server
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'template') {
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

      // Determine step
      setCurrentStep("review");
    }
  }, [projectData]);

  const parseMutation = trpc.questionnaire.parse.useMutation({
    onSuccess: (data) => {
      setQuestions(data.questions);
      // setFileName(file?.name || "Untitled Questionnaire");
      setProjectName(file?.name?.replace(/\.[^/.]+$/, "") || "New Questionnaire");
      setIsCreateOpen(true); // Prompt to create project immediately
    },
    onError: (err) => {
      toast.error(`Failed to parse file: ${err.message}`);
    }
  });

  const createProjectMutation = trpc.questionnaire.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Questionnaire created successfully");
      setIsCreateOpen(false);
      // Save initial questions
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

      // Initialize answers array for the review table
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
      setCurrentStep("review"); // Go directly to review table

      // Redirect to persistent URL
      setLocation(`/clients/${clientId}/questionnaires/${data.id}`);
    }
  });

  const saveQuestionsMutation = trpc.questionnaire.saveQuestions.useMutation({
    onSuccess: () => {
      // toast.success("Saved");
    }
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

  const generateMutation = trpc.questionnaire.generateAnswers.useMutation({
    onError: (err) => {
      // Surface the error clearly — this is a Premium gated feature
      toast.error(err.message || 'AI generation failed. Please upgrade to Premium.');
    }
  });

  // Export queries
  const exportExcelQuery = trpc.questionnaire.exportExcel.useQuery({ id: qId! }, {
    enabled: false // Only fetch when needed
  });
  const exportJSONQuery = trpc.questionnaire.exportJSON.useQuery({ id: qId! }, {
    enabled: false // Only fetch when needed
  });

  // Template queries - only pass clientId if valid to ensure built-in templates always show
  const { data: templates } = trpc.questionnaire.listTemplates.useQuery(
    clientId && clientId > 0 ? { clientId } : {},
    { enabled: clientId !== undefined }
  );

  // Vendor list for dropdown - use listVendors to get org-specific vendors
  const { data: vendorList } = trpc.vendors.listVendors.useQuery(
    { clientId },
    { enabled: !!clientId && clientId > 0 }
  );

  // Vendor mutations
  const sendVendorInviteMutation = trpc.questionnaire.sendVendorInvite.useMutation({
    onSuccess: (data) => {
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

  // Handle sending to vendor
  const handleSendToVendor = () => {
    if (!qId || !vendorEmail || !vendorName) {
      toast.error("Please fill in vendor name and email");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(vendorEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    sendVendorInviteMutation.mutate({
      id: qId,
      clientId,
      vendorName,
      vendorEmail,
      message: vendorMessage
    });
  };

  // Handle submit for review
  const handleSubmitForReview = () => {
    if (!qId) return;
    submitForReviewMutation.mutate({ id: qId, clientId });
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Apply selected template - load questions and open create dialog
  const handleUseTemplate = () => {
    if (!selectedTemplateId || !templateQuestions) return;

    setProjectName(templates?.find(t => t.id === selectedTemplateId)?.name || "New Questionnaire");
    setQuestions(templateQuestions.map(q => ({ questionId: q.questionId, question: q.question })));
    setShowTemplateDialog(false);
    setIsCreateOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setUploadProgress(0);
    setIsParseComplete(false);

    // Simulate progress
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
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProject = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlDirection = (searchParams.get("direction") || "inbound") as "inbound" | "outbound";
    createProjectMutation.mutate({
      clientId,
      name: projectName,
      direction: urlDirection,
      senderName: senderName,
      productName: "Default"
    });
  };

  const handleGenerate = async () => {
    // AI generation disabled
    toast.info("AI generation is not available in this version.");
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

  // Export handlers
  const handleExportExcel = async () => {
    if (!qId) return;
    try {
      const data = await exportExcelQuery.refetch();
      if (!data.data) return;

      // Convert to CSV-like format for download
      const rows = data.data.questions;
      const headers = Object.keys(rows[0] || {});
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${data.data.name.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
      link.click();
      toast.success('Exported to CSV successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleExportJSON = async () => {
    if (!qId) return;
    try {
      const data = await exportJSONQuery.refetch();
      if (!data.data) return;

      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${data.data.metadata.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
      link.click();
      toast.success('Exported to JSON successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (qId && isProjectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout fullWidth>
      <div className="px-4 sm:px-6 py-2.5 max-w-[1680px] mx-auto space-y-2.5">
        {/* Sleek Compact Header Bar (replaces giant 3-story header) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/clients/${clientId}/questionnaires`)}
              className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground">
              <button
                onClick={() => setLocation(`/clients/${clientId}/questionnaires`)}
                className="hover:text-foreground transition-colors"
              >
                Questionnaires
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-900 font-bold text-sm max-w-[320px] truncate">
                {projectData?.name || "New Questionnaire"}
              </span>
            </nav>
            {projectData && (
              <Badge variant="outline" className="text-[10px] font-semibold capitalize bg-slate-50 text-slate-700 h-5 px-2">
                Status: {formatStatus(projectData.status)}
              </Badge>
            )}
            {projectData?.direction && (
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider h-5 px-1.5">
                {projectData.direction}
              </Badge>
            )}
          </div>
          <PageGuide
            title="Questionnaire Workspace & AI Answering Guide"
            description="Complete security questionnaires using AI Knowledge Base matching, verified policy citations, and assessment template blueprints."
            rationale="Security questionnaires require defensible, auditable answers. ComplianceOS pairs your verified company policies with AI response drafting, scoring match certainty and citing exact evidence documents."
            howToUse={[
              {
                step: "1. Upload or Adopt Assessment Blueprint",
                description: "Import third-party questionnaires (Excel, CSV, PDF) or instantiate standard frameworks (ISO 27001, CAIQ v4, CIS Controls v8, SOC 2)."
              },
              {
                step: "2. Generate AI Answers",
                description: "AI analyzes each question against your Knowledge Base and policy library to propose answers with transparent evidence attribution."
              },
              {
                step: "3. Understand Confidence Scores",
                description: "Indicates how strongly internal policies support each response: High (>70% Green: direct policy match), Medium (40-70% Amber: partial match), Low (<40% Red: weak match requiring manual review), or '—' (Template or manual question without an AI run)."
              },
              {
                step: "4. Verify Source Citations",
                description: "Badges indicate internal documents referenced (e.g. SOC 2 Type II, BCP/DR, Access Control Policy). Hover over any source badge to inspect the exact policy excerpt."
              },
              {
                step: "5. Review, Edit & Export",
                description: "Review answers, add reviewer comments, adjust focus areas, and export back to CSV, Excel, or JSON for client submission."
              }
            ]}
            scenarios={[
              {
                title: "Inbound Customer Security Reviews",
                example: "An enterprise customer sends a 150-question spreadsheet. AI answers are generated with Confidence ratings and policy Source citations.",
                auditTip: "Always review items with Confidence < 70%. Ensure cited source documents reflect your current audit period and latest published policies."
              },
              {
                title: "Template Blueprints & Outbound Vendor Reviews",
                example: "You create a questionnaire from the ISO 27001 or CIS 8 template to assess a vendor or conduct an internal baseline check.",
                auditTip: "Template questions start with '—' for Confidence and Sources because they are baseline control questions awaiting vendor completion or manual answers."
              }
            ]}
            integrations={[
              {
                name: "Knowledge Base & Policies",
                description: "The primary source of truth for all automated answers, confidence calculations, and citations."
              },
              {
                name: "Assessment Template Blueprints",
                description: "Standardized control libraries (ISO 27001:2022, CIS Controls v8, CAIQ v4, SOC 2) used to scaffold questionnaires."
              },
              {
                name: "Excel & JSON Exporters",
                description: "Generates formatted spreadsheets and data exports for sending to customers, auditors, or leadership."
              }
            ]}
          />
        </div>

        {/* Stepper */}
        {!qId && (
          <div className="flex items-center space-x-4 text-sm font-medium text-muted-foreground">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary' : ''}`}>
              <div className="w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs">1</div>
              Upload
            </div>
            <div className="h-px bg-border w-8" />
            <div className={`flex items-center ${currentStep === 'preview' ? 'text-primary' : ''}`}>
              <div className="w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs">2</div>
              Verify Questions
            </div>
            <div className="h-px bg-border w-8" />
            <div className={`flex items-center ${currentStep === 'generating' || currentStep === 'review' ? 'text-primary' : ''}`}>
              <div className="w-6 h-6 rounded-full border flex items-center justify-center mr-2 text-xs">3</div>
              Review
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === "upload" && (
          <Card className="max-w-xl mx-auto border-dashed border-2 hover:border-primary/50 hover:bg-slate-50/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] space-y-4">
              {isParseComplete ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-green-700">Import Completed!</h3>
                  <p className="text-muted-foreground mt-2">Preparing workspace...</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-muted rounded-full transition-transform duration-300 hover:scale-110">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Upload Questionnaire</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Support for PDF, Excel (.xlsx), and CSV files.
                    </p>
                  </div>

                  {!parseMutation.isPending && (
                    <Input
                      type="file"
                      accept=".pdf,.xlsx,.csv"
                      onChange={handleFileUpload}
                      className="max-w-xs cursor-pointer"
                    />
                  )}

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
                      Process Document
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview Questions */}
        {currentStep === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Extracted Questions</CardTitle>
              <CardDescription>
                We found {questions.length} questions. Remove any headers or irrelevant text before generating answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={i} className="p-3 flex gap-3 group">
                    {q.questionId && (
                      <span className="text-primary text-sm font-mono font-semibold min-w-[80px]">{q.questionId}</span>
                    )}
                    {!q.questionId && (
                      <span className="text-muted-foreground text-sm font-mono w-6">{i + 1}</span>
                    )}
                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const newQ = [...questions];
                        newQ[i] = { ...newQ[i], question: e.target.value };
                        setQuestions(newQ);
                      }}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQ = questions.filter((_, idx) => idx !== i);
                        setQuestions(newQ);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                {!qId && <Button variant="outline" onClick={() => setCurrentStep("upload")}>Back</Button>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generating (Loading) */}
        {currentStep === "generating" && (
          <Card className="max-w-xl mx-auto text-center py-12">
            <CardContent className="space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <RefreshCw className="w-full h-full animate-spin text-primary opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Generating Answers...</h3>
                <p className="text-muted-foreground">
                  Analyzing {questions.length} questions against your Knowledge Base.
                </p>
              </div>
              <Progress value={(generatedCount / Math.max(questions.length, 1)) * 100} className="w-[60%] mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">
                Processed {generatedCount} of {questions.length} questions
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review Answers */}
        {currentStep === "review" && (() => {
          const isOutbound = projectData?.direction === "outbound";
          const hasAiAnswers = answers.some(a => (a.confidence && a.confidence > 0) || (a.sources && a.sources.length > 0));

          return (
            <Card>
              <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 leading-none">
                    {isOutbound
                      ? "Assessment Controls & Questionnaire"
                      : hasAiAnswers
                      ? "Review Generated Answers"
                      : "Questionnaire Questions & Answers"}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {isOutbound
                      ? "Review and configure assessment controls before dispatching to the vendor or recording responses."
                      : hasAiAnswers
                      ? "Verify AI-suggested answers and edit as needed before completing."
                      : "Review, edit, or enter responses for this evaluation before completion."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {projectData?.status !== 'completed' && (
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setIsCompleteOpen(true)} disabled={completeMutation.isPending}>
                      {completeMutation.isPending ? <Loader2 className="animate-spin mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                      Mark Completed
                    </Button>
                  )}
                  {/* Show "Send to Vendor" for open/in_progress status */}
                  {(projectData?.status === 'open' || projectData?.status === 'in_progress') && (
                    <Button size="sm" className="h-7 px-2.5 text-xs bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white" onClick={() => setShowVendorDialog(true)}>
                      <Mail className="mr-1 h-3 w-3" /> Send to Vendor
                    </Button>
                  )}
                  {/* Show "Submit for Review" for vendor_pending status */}
                  {projectData?.status === 'vendor_pending' && (
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs border-amber-600 text-amber-700 hover:bg-amber-50" onClick={handleSubmitForReview} disabled={submitForReviewMutation.isPending}>
                      {submitForReviewMutation.isPending ? <Loader2 className="animate-spin mr-1 h-3 w-3" /> : <Check className="mr-1 h-3 w-3" />}
                      Submit for Review
                    </Button>
                  )}
                  {/* Show vendor info if already sent */}
                  {projectData?.status === 'vendor_pending' && projectData?.vendorName && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs">
                      <Mail className="h-3 w-3 text-amber-600" />
                      <span className="text-amber-800 text-xs">Sent: <strong>{projectData.vendorName}</strong></span>
                      {projectData.vendorLinkExpiresAt && (
                        <span className="text-amber-600 text-[10px]">
                          ({new Date(projectData.vendorLinkExpiresAt).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={handleSaveProgress}>
                    <Save className="mr-1 h-3 w-3" /> Save
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={handleExportExcel} disabled={exportExcelQuery.isFetching}>
                    <FileSpreadsheet className="mr-1 h-3 w-3" /> Export CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={handleExportJSON} disabled={exportJSONQuery.isFetching}>
                    <FileDown className="mr-1 h-3 w-3" /> Export JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-3.5 space-y-2">
                {/* Visible Section Navigation & Column Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-800 flex items-center gap-1 shrink-0 text-[11px]">
                      <LayoutGrid className="h-3 w-3 text-[#1C4D8D]" />
                      Sections:
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      1. Control & Question (Pinned)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      2. Answer & Notes (Visible)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAiColumns(!isAiVisible)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all shadow-2xs cursor-pointer h-5.5 ${
                        isAiVisible
                          ? "bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-200/80"
                          : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100/80"
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                      <span>3. AI Citations:</span>
                      <span className="font-bold underline">
                        {isAiVisible ? "Visible" : "2 Cols Hidden"}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] shrink-0">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Columns className="h-3 w-3 text-slate-400" />
                      <span>{4 + (isAiVisible ? 2 : 0) + Object.keys(answers[0]?.extraFields || {}).length} Cols</span>
                    </span>
                    {canGoRight && (
                      <span className="text-[10px] text-[#1C4D8D] font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hidden md:inline-flex items-center gap-1">
                        Next: {columnSteps[currentStepIndex + 1]?.label} <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
                    {!canGoRight && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hidden md:inline-flex items-center gap-1">
                        ✓ Last col ({columnSteps[columnSteps.length - 1]?.label}) in view
                      </span>
                    )}
                    <span className="text-slate-300">|</span>
                    {/* Top Bar Left/Right Column Step Buttons */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={handleScrollLeft}
                        disabled={!canGoLeft}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        title="Move to previous column"
                      >
                        <ChevronLeft className="h-3 w-3 text-[#1C4D8D]" />
                        <span>Left</span>
                      </button>
                      <div className="h-3 w-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={handleScrollRight}
                        disabled={!canGoRight}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        title={canGoRight ? `Next column: ${columnSteps[currentStepIndex + 1]?.label}` : "At last column"}
                      >
                        <span>Right</span>
                        <ChevronRight className="h-3 w-3 text-[#1C4D8D]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Top Column Step Navigator (1-Click Snap to Any Column) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1 bg-slate-50 border-t border-x border-slate-200 rounded-t-lg select-none">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 tracking-wider">Columns:</span>
                    {columnSteps.map((step, idx) => {
                      const isActive = currentStepIndex === idx;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => scrollToColumn(idx)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#1C4D8D] text-white shadow-2xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                          title={`Click to jump directly to ${step.label}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-slate-400"}`} />
                          <span>{idx + 1}. {step.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className="text-slate-400">Step {currentStepIndex + 1} of {columnSteps.length}:</span>
                    <span className="text-[#1C4D8D] font-bold">{columnSteps[currentStepIndex]?.label}</span>
                  </div>
                </div>

                {/* Top Horizontal Scrollbar (Synchronized 2-Way with Table) */}
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="w-full overflow-x-auto overflow-y-hidden bg-slate-100 border-x border-slate-200 select-none h-3.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-[#1C4D8D] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#153B6D] active:[&::-webkit-scrollbar-thumb]:bg-[#0f2d54]"
                  title="Drag or click top scrollbar to scroll horizontally across columns"
                >
                  <div style={{ width: `${Math.max(tableScrollWidth, 2100)}px`, height: '2px' }} />
                </div>

                {/* Horizontally Scrollable Table with Left & Right Chevron Controls */}
                <div className="relative group">
                  {/* Left Chevron Button */}
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    disabled={!canGoLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-40 h-9 w-9 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
                    title="Move to previous column"
                    aria-label="Previous column"
                  >
                    <ChevronLeft className="h-5 w-5 text-[#1C4D8D]" />
                  </button>

                  {/* Right Chevron Button */}
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    disabled={!canGoRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-40 h-9 w-9 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
                    title={canGoRight ? `Next: ${columnSteps[currentStepIndex + 1]?.label}` : "At last column"}
                    aria-label="Next column"
                  >
                    <ChevronRight className="h-5 w-5 text-[#1C4D8D]" />
                  </button>

                  {/* Horizontally Scrollable Table */}
                  <div
                    ref={tableScrollRef}
                    onScroll={handleTableScroll}
                    className="overflow-x-auto rounded-b border border-slate-200 shadow-2xs scroll-smooth"
                  >
                  <table className="w-full min-w-[2100px] caption-bottom text-sm border-collapse">
                    <TableHeader>
                      <TableRow className="bg-[#1C4D8D] hover:bg-[#1C4D8D] border-none text-white h-9">
                        {/* SECTION 1: Control & Category (Sticky Left 0) */}
                        <TableHead className="w-[160px] min-w-[160px] sticky left-0 z-30 bg-[#1C4D8D] text-white font-semibold py-1.5 px-3 text-xs border-r border-white/20 whitespace-nowrap h-9 leading-none">
                          Control / ID
                        </TableHead>

                        {/* SECTION 1b: Assessment Question (Sticky Left 160px - ALWAYS VISIBLE) */}
                        <TableHead className="w-[360px] min-w-[300px] sticky left-[160px] z-30 bg-[#1C4D8D] text-white font-semibold py-1.5 px-3 text-xs border-r-2 border-white/40 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)] whitespace-nowrap h-9 leading-none">
                          Assessment Question
                        </TableHead>

                        {/* SECTION 2: Answer / Response (Fully Visible) */}
                        <TableHead className="min-w-[280px] w-[320px] text-white font-semibold py-1.5 px-3 text-xs border-r border-white/20 whitespace-nowrap h-9 leading-none">
                          Answer / Response
                        </TableHead>

                        {/* SECTION 2b: Comment & Reviewer Notes (Fully Visible - Positioned adjacent to Answer) */}
                        <TableHead className="min-w-[240px] w-[260px] text-white font-semibold py-1.5 px-3 text-xs border-r-2 border-white/30 whitespace-nowrap h-9 leading-none">
                          Reviewer Notes
                        </TableHead>

                        {/* SECTION 3: AI Citations & Confidence (Expanded or Collapsed Divider) */}
                        {isAiVisible ? (
                          <>
                            <TableHead className="w-[105px] bg-[#163E72] text-white font-semibold py-1.5 px-3 text-xs whitespace-nowrap h-9 leading-none">
                              <div className="flex items-center gap-1 group relative cursor-help">
                                <span>Confidence</span>
                                <HelpCircle className="h-3 w-3 text-white/80 group-hover:text-white" />
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-900 text-white rounded-md shadow-xl text-xs font-normal z-50 pointer-events-none border border-slate-700">
                                  <p className="font-semibold text-amber-300 mb-0.5">AI Confidence Score</p>
                                  Measures how strongly your internal policies and Knowledge Base match the question.
                                </div>
                              </div>
                            </TableHead>
                            <TableHead className="w-[130px] bg-[#163E72] text-white font-semibold py-1.5 px-3 text-xs border-r-2 border-white/30 whitespace-nowrap h-9 leading-none">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 group relative cursor-help">
                                  <span>Sources</span>
                                  <HelpCircle className="h-3 w-3 text-white/80 group-hover:text-white" />
                                  <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-900 text-white rounded-md shadow-xl text-xs font-normal z-50 pointer-events-none border border-slate-700">
                                    <p className="font-semibold text-amber-300 mb-0.5">Policy Citations</p>
                                    Direct references to company policies and evidence documents cited.
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowAiColumns(false)}
                                  className="text-[10px] text-blue-200 hover:text-white underline cursor-pointer ml-1"
                                  title="Collapse AI columns"
                                >
                                  Hide
                                </button>
                              </div>
                            </TableHead>
                          </>
                        ) : (
                          <TableHead
                            className="w-[125px] bg-[#143A6B] hover:bg-[#0F2D54] text-white py-1 px-2 text-center cursor-pointer border-r-2 border-amber-400/80 transition-all select-none h-9 whitespace-nowrap leading-none"
                            onClick={() => setShowAiColumns(true)}
                            title="Click to reveal 2 hidden AI columns: Confidence & Sources"
                          >
                            <span className="inline-flex items-center justify-center gap-1 py-0.5 px-2 bg-amber-400/20 hover:bg-amber-400/30 rounded border border-amber-300/40 text-[10px] font-bold text-amber-200">
                              <Sparkles className="h-2.5 w-2.5 text-amber-300 shrink-0" />
                              <span>+2 AI Cols</span>
                            </span>
                          </TableHead>
                        )}

                        {/* SECTION 4: Dynamic Extra Fields from Spreadsheets */}
                        {Object.keys(answers[0]?.extraFields || {}).map(col => (
                          <TableHead key={col} className="text-white font-semibold py-1.5 px-3 text-xs whitespace-nowrap h-9 leading-none">{col}</TableHead>
                        ))}
                        {/* Buffer Space to ensure Sources and extra columns scroll completely into view */}
                        <TableHead className="w-[320px] min-w-[320px] bg-[#163E72] text-white/50 text-[10px] text-center italic py-1.5 px-3 whitespace-nowrap h-9 leading-none">
                          End of Columns
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answers.map((item, i) => (
                        <TableRow key={i} className="group hover:bg-slate-50/80 transition-colors">
                          {/* SECTION 1: Control & Category Cell (Sticky Left 0) */}
                          <TableCell className="w-[160px] min-w-[160px] sticky left-0 z-20 bg-white group-hover:bg-slate-50 align-top py-2 px-3 border-r border-slate-200">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-mono font-bold text-slate-400">#{i + 1}</span>
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.questionId || item.controlId || "-"}
                              </span>
                            </div>
                            {item.focusArea && (
                              <Badge variant="outline" className="text-[10px] font-medium text-slate-700 bg-slate-50 border-slate-200 block truncate max-w-[145px] mt-0.5" title={item.focusArea}>
                                {item.focusArea}
                              </Badge>
                            )}
                            {item.subFocusArea && (
                              <span className="text-[10px] text-slate-500 block line-clamp-1 leading-tight mt-0.5" title={item.subFocusArea}>
                                {item.subFocusArea}
                              </span>
                            )}
                          </TableCell>

                          {/* SECTION 1b: Assessment Question Cell (Sticky Left 160px - ALWAYS VISIBLE) */}
                          <TableCell className="w-[360px] min-w-[300px] sticky left-[160px] z-20 bg-white group-hover:bg-slate-50 align-top py-2 px-3 text-xs leading-relaxed border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                            <p className="font-medium text-slate-900 leading-snug text-xs">{item.question}</p>
                            {/* Evidence requirement guidance from template if present */}
                            {item.comment?.startsWith("Evidence Requirement:") && (
                              <div className="mt-1.5 p-1 rounded bg-blue-50/80 border border-blue-100 text-[10px] text-blue-800 leading-snug">
                                {item.comment}
                              </div>
                            )}
                          </TableCell>

                          {/* SECTION 2: Answer / Response Cell (Fully Visible) */}
                          <TableCell className="align-top py-2 px-3 border-r border-slate-200">
                            <Textarea
                              className="text-xs min-h-[58px] bg-white resize-y font-normal leading-snug focus:ring-1 focus:ring-[#1C4D8D] py-1.5 px-2"
                              placeholder={isOutbound ? "Awaiting vendor response..." : "Type response to this security question..."}
                              defaultValue={item.answer || ""}
                              onChange={(e) => {
                                const newAnswers = [...answers];
                                newAnswers[i].answer = e.target.value;
                                setAnswers(newAnswers);
                              }}
                            />
                          </TableCell>

                          {/* SECTION 2b: Comment & Reviewer Notes Cell (Fully Visible - Adjacent to Answer) */}
                          <TableCell className="align-top py-2 px-3 border-r-2 border-slate-300">
                            <Textarea
                              className="text-xs min-h-[58px] bg-amber-50/20 border-amber-200/80 focus:bg-white resize-y leading-snug text-slate-800 py-1.5 px-2"
                              placeholder="Add internal notes, auditor comments, or evidence links..."
                              defaultValue={item.comment || ""}
                              onChange={(e) => {
                                const newAnswers = [...answers];
                                newAnswers[i].comment = e.target.value;
                                setAnswers(newAnswers);
                              }}
                            />
                          </TableCell>

                          {/* SECTION 3: AI Citations & Confidence Cells (Expanded or Collapsed Divider) */}
                          {isAiVisible ? (
                            <>
                              <TableCell className="align-top py-2 px-2.5 bg-blue-50/20 text-center">
                                {item.confidence && item.confidence > 0 ? (
                                  <Badge className={`${item.confidence > 0.7 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                    item.confidence > 0.4 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                                      'bg-red-100 text-red-700 hover:bg-red-100'
                                    }`}>
                                    {Math.round(item.confidence * 100)}%
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono" title="No AI score (Manual / Template)">—</span>
                                )}
                              </TableCell>
                              <TableCell className="align-top space-y-1 py-2 px-2.5 bg-blue-50/20 border-r-2 border-slate-300">
                                {item.sources && item.sources.length > 0 ? (
                                  item.sources.map((s: any, idx: number) => (
                                    <div key={idx} className="text-xs flex items-center gap-1 group relative cursor-help">
                                      <Badge variant="outline" className="max-w-[120px] truncate bg-white">
                                        {s.title || `Source ${idx + 1}`}
                                      </Badge>
                                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white rounded shadow-lg z-50 text-xs pointer-events-none">
                                        <p className="font-semibold mb-1">{s.title}</p>
                                        {s.excerpt && <p className="text-slate-300 line-clamp-3">{s.excerpt}</p>}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono" title="No citations linked">—</span>
                                )}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell
                              className="align-middle text-center py-2 px-1 bg-amber-50/30 hover:bg-amber-100/50 border-r-2 border-amber-200/80 cursor-pointer transition-colors"
                              onClick={() => setShowAiColumns(true)}
                              title="Confidence & Sources are hidden. Click to expand."
                            >
                              <div className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 shadow-2xs">
                                <Sparkles className="h-2 w-2 text-amber-600" />
                                <span>Hidden</span>
                                <ChevronRight className="h-2 w-2 text-amber-600" />
                              </div>
                            </TableCell>
                          )}

                          {/* SECTION 4: Dynamic Extra Fields from Spreadsheets */}
                          {Object.keys(answers[0]?.extraFields || {}).map(col => (
                            <TableCell key={col} className="align-top py-2 px-3">
                              <Input
                                className="text-xs h-7"
                                defaultValue={(item.extraFields || {})[col] || ""}
                                onChange={(e) => {
                                  const newAnswers = [...answers];
                                  newAnswers[i].extraFields = { ...(newAnswers[i].extraFields || {}), [col]: e.target.value };
                                  setAnswers(newAnswers);
                                }}
                              />
                            </TableCell>
                          ))}
                          {/* Buffer Space to match TableHeader */}
                          <TableCell className="w-[320px] min-w-[320px] bg-slate-50/40 text-center text-[10px] text-slate-400 py-2">
                            ✓ All columns displayed
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              </div>
            </CardContent>
            </Card>
          );
        })()}

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={(open) => {
          setShowTemplateDialog(open);
          if (!open) {
            // Clear URL param when closing
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            window.history.replaceState({}, '', url.toString());
            setIsTemplateMode(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Select a Questionnaire Template
              </DialogTitle>
              <DialogDescription>
                Choose from pre-built templates for common compliance frameworks
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4">
              {templates?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates available. Upload a file to create a questionnaire.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates?.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                        ${selectedTemplateId === template.id
                          ? 'border-[#3ABEF9] bg-[#3ABEF9]/10'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {selectedTemplateId === template.id && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#3ABEF9] flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#1C4D8D]/10">
                          <FileText className="h-5 w-5 text-[#1C4D8D]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.framework}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {template.questionCount} questions
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowTemplateDialog(false);
                const url = new URL(window.location.href);
                url.searchParams.delete('mode');
                window.history.replaceState({}, '', url.toString());
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleUseTemplate}
                disabled={!selectedTemplateId}
                className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90"
              >
                Use Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save New Questionnaire</DialogTitle>
              <DialogDescription>
                Give this questionnaire a name to save your progress.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Questionnaire Name</Label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sent By (Vendor / Account)</Label>
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Framework / Standard</Label>
                  <Input placeholder="e.g. ISO 27001, SOC 2" />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Risk Tier</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Select risk tier...</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Questionnaire
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Completed — Proper AlertDialog */}
        <AlertDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark <strong>{projectData?.name}</strong> as completed and lock all answers.
                Any unanswered questions will remain as-is. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  completeMutation.mutate({ id: qId! });
                  setIsCompleteOpen(false);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Completion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Send to Vendor Dialog */}
        <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Questionnaire to Vendor</DialogTitle>
              <DialogDescription>
                Send this questionnaire to a vendor for them to complete directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Vendor</Label>
                {vendorList && vendorList.length > 0 ? (
                  <select
                    value={vendorName}
                    onChange={e => {
                      const selectedVendor = vendorList.find(v => v.name === e.target.value);
                      setVendorName(e.target.value);
                      if (selectedVendor?.primaryContactEmail) {
                        setVendorEmail(selectedVendor.primaryContactEmail);
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a vendor...</option>
                    {vendorList.map((vendor: any) => (
                      <option key={vendor.id} value={vendor.name}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={vendorName}
                    onChange={e => setVendorName(e.target.value)}
                    placeholder="e.g. Acme Corporation (no vendors found)"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Vendor Email</Label>
                <Input
                  type="email"
                  value={vendorEmail}
                  onChange={e => setVendorEmail(e.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Message (Optional)</Label>
                <Textarea
                  value={vendorMessage}
                  onChange={e => setVendorMessage(e.target.value)}
                  placeholder="Add a message for the vendor..."
                  rows={3}
                />
              </div>
              {projectData?.vendorLinkExpiresAt && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="font-medium text-amber-800">Link already sent</p>
                  <p className="text-amber-600">
                    Expires: {new Date(projectData.vendorLinkExpiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVendorDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSendToVendor}
                disabled={sendVendorInviteMutation.isPending || !vendorName || !vendorEmail}
                className="bg-green-600 hover:bg-green-700"
              >
                {sendVendorInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" />
                Send to Vendor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
