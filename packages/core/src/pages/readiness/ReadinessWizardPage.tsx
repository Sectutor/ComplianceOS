import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WizardLayout } from "@/components/readiness/WizardLayout";
import { WizardStep1_Scope } from "@/components/readiness/wizard/WizardStep1_Scope";
import { WizardStep2_Stakeholders } from "@/components/readiness/wizard/WizardStep2_Stakeholders";
import { WizardStep3_Docs } from "@/components/readiness/wizard/WizardStep3_Docs";
import { WizardStep4_Context } from "@/components/readiness/wizard/WizardStep4_Context";
import { WizardStep5_Expectations } from "@/components/readiness/wizard/WizardStep5_Expectations";
import { WizardStep6_Questionnaire } from "@/components/readiness/wizard/WizardStep6_Questionnaire";
import { WizardStep7_Summary } from "@/components/readiness/wizard/WizardStep7_Summary";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { READINESS_STANDARDS } from "@/data/readiness-standards";
import { PageGuide } from "@/components/PageGuide";
import { generateScopingReportDocx } from "@/lib/docx/generate-scoping-docx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    CheckCircle2,
    ShieldCheck,
    FileDown,
    LayoutDashboard,
    ArrowRight,
    Loader2,
    Sparkles,
    Check,
    ExternalLink
} from "lucide-react";

export default function ReadinessWizardPage() {
    const [match, params] = useRoute("/clients/:clientId/readiness/wizard/:standardId?");
    const [, navigate] = useLocation();
    const clientId = parseInt(params?.clientId || "0");
    const routeStandardId = params?.standardId || "ISO27001";

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        scope: {},
        stakeholders: {},
        existingPolicies: {},
        context: {},
        expectations: {},
        questionnaireData: {},
        scopingReport: ""
    });
    const [standardId, setStandardId] = useState(routeStandardId);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [isExportingDocx, setIsExportingDocx] = useState(false);
    const [isCompletedState, setIsCompletedState] = useState(false);

    useEffect(() => {
        if (params?.standardId && params.standardId !== standardId) {
            setStandardId(params.standardId);
        }
    }, [params?.standardId]);

    // Load existing state
    const { data: serverState, isLoading } = trpc.readiness.getState.useQuery(
        { clientId, standardId: routeStandardId },
        {
            enabled: !!clientId,
        }
    );

    useEffect(() => {
        if (serverState) {
            setCurrentStep(serverState.currentStep || 1);
            setIsCompletedState(serverState.status === 'completed');
            setFormData({
                scope: (serverState.scopeDetails as any) || {},
                stakeholders: (serverState.stakeholders as any) || {},
                existingPolicies: (serverState.existingPolicies as any) || {},
                context: (serverState.businessContext as any) || {},
                expectations: (serverState.maturityExpectations as any) || {},
                questionnaireData: (serverState.questionnaireData as any) || {},
                scopingReport: serverState.scopingReport || ""
            });
        }
    }, [serverState]);

    const mutation = trpc.readiness.createOrUpdate.useMutation({
        onSuccess: () => {
            // progress saved
        },
        onError: (err) => {
            toast.error("Error saving progress", { description: err.message });
        }
    });

    const baselineMutation = trpc.readiness.baseline.useMutation({
        onSuccess: (data) => {
            toast.success(`${data.framework} Framework Initialized!`, { description: "Discovery setup is now mapped to your workspace." });
        },
        onError: (err) => {
            toast.error("Failed to initialize framework", { description: err.message });
        }
    });

    const handleExportDocx = async () => {
        if (!formData.scopingReport) {
            toast.error("No executive report generated yet. Generate a report on Step 7 first.");
            return;
        }
        setIsExportingDocx(true);
        try {
            await generateScopingReportDocx({
                reportMarkdown: formData.scopingReport,
                standardId,
                organizationName: (formData.scope as any)?.orgBoundaries || "Organization",
            });
            toast.success("DOCX document downloaded successfully");
        } catch (error: any) {
            console.error('[DOCX Export Error]:', error);
            toast.error(error.message || "Failed to export DOCX document");
        } finally {
            setIsExportingDocx(false);
        }
    };

    const handleDataChange = (stepKey: keyof typeof formData, newData: any) => {
        setFormData(prev => ({ ...prev, [stepKey]: newData }));
    };

    const handleNext = async () => {
        await mutation.mutateAsync({
            clientId,
            standardId,
            step: currentStep === 7 ? 7 : currentStep + 1,
            data: {
                scope: formData.scope,
                stakeholders: formData.stakeholders,
                existingPolicies: formData.existingPolicies,
                context: formData.context,
                expectations: formData.expectations,
                questionnaireData: formData.questionnaireData,
                scopingReport: formData.scopingReport
            }
        });

        if (currentStep < 7) {
            setCurrentStep(curr => curr + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Final Step - Baseline & Show Completion Modal (no forced redirect)
            try {
                await baselineMutation.mutateAsync({ clientId, standardId });
                setIsCompletedState(true);
                setShowCompletionModal(true);
            } catch (e) {
                // Error handled by mutation onError
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(curr => curr - 1);
        }
    };

    const handleStepClick = (step: number) => {
        if (isLoading) return;
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return <WizardStep1_Scope
                    data={formData.scope}
                    onChange={(d) => handleDataChange("scope", d)}
                    standardId={standardId}
                />;
            case 2:

                return <WizardStep2_Stakeholders
                    data={formData.stakeholders}
                    onChange={(d) => handleDataChange("stakeholders", d)}
                    standardId={standardId}
                />;
            case 3:
                return <WizardStep3_Docs
                    data={formData.existingPolicies}
                    onChange={(d) => handleDataChange("existingPolicies", d)}
                    standardId={standardId}
                />;
            case 4:
                return <WizardStep4_Context
                    data={formData.context}
                    onChange={(d) => handleDataChange("context", d)}
                />;
            case 5:
                return <WizardStep5_Expectations
                    data={formData.expectations}
                    onChange={(d) => handleDataChange("expectations", d)}
                />;
            case 6:
                return <WizardStep6_Questionnaire
                    data={formData.questionnaireData}
                    onChange={(d) => handleDataChange("questionnaireData", d)}
                    standardId={standardId}
                />;
            case 7:
                return <WizardStep7_Summary
                    data={formData}
                    standardId={standardId}
                    onEditStep={handleStepClick}
                    onUpdate={(d) => {
                        setFormData(prev => ({ ...prev, scopingReport: d.scopingReport }));
                        // Auto-save on report generation
                        mutation.mutateAsync({
                            clientId,
                            standardId,
                            step: 7,
                            data: {
                                scope: formData.scope,
                                stakeholders: formData.stakeholders,
                                existingPolicies: formData.existingPolicies,
                                context: formData.context,
                                expectations: formData.expectations,
                                questionnaireData: formData.questionnaireData,
                                scopingReport: d.scopingReport
                            }
                        });
                    }}
                />;
            default: return null;
        }
    };

    const standardConfig = READINESS_STANDARDS[standardId] || READINESS_STANDARDS["ISO27001"];

    const titles = [
        standardConfig.steps.scope.title,
        standardConfig.steps.stakeholders.title,
        "Gather Existing Documentation",
        "Understand Business Context",
        "Clarify Maturity Expectations",
        "Readiness Questionnaire",
        "Discovery Summary & Review"
    ];

    const subtitles = [
        standardConfig.steps.scope.subtitle,
        standardConfig.steps.stakeholders.subtitle,
        "Do you have existing policies or evidence? Collect what exists - don't aim for perfection yet.",
        "Define the environment your security system operates in (Cloud, On-prem, Hybrid).",
        "Set your goals for this discovery assessment. What is the target compliance level?",
        "Answer the foundational requirements questions for this framework.",
        "Review everything we've gathered. Confirm the scope and business context to finalize your setup."
    ];

    if (isLoading) return (
        <DashboardLayout>
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
                <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Loading assessment state...</p>
            </div>
        </DashboardLayout>
    );
    return (
        <DashboardLayout>
            <div className="space-y-4">
                {isCompletedState && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-600 rounded-lg text-white">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-900 text-sm">
                                    Discovery & Scoping Completed ({standardConfig.name || standardId})
                                </h4>
                                <p className="text-xs text-emerald-700">
                                    This framework is baselined. You can freely review or modify your setup, or jump into compliance execution.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {formData.scopingReport && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportDocx}
                                    disabled={isExportingDocx}
                                    className="border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100/50"
                                >
                                    {isExportingDocx ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                        <FileDown className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Export DOCX
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => navigate(`/clients/${clientId}/compliance`)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                                Compliance Hub
                            </Button>
                        </div>
                    </div>
                )}

                <WizardLayout
                    currentStep={currentStep}
                    totalSteps={7}
                    title={titles[currentStep - 1]}
                    subtitle={subtitles[currentStep - 1]}
                    onNext={handleNext}
                    onBack={handleBack}
                    onStepClick={handleStepClick}
                    isLoading={mutation.isPending}
                    clientId={clientId}
                    embedded={true}
                    standardName={standardId.replace('ISO', 'ISO ').replace('SOC', 'SOC ').replace('NIST', 'NIST ')}
                    pageGuide={
                        <PageGuide
                            title="Compliance Readiness Wizard"
                            description="Step-by-step guide to assessing your compliance posture."
                            rationale="A structured assessment helps identify gaps early, saving time and resources during the audit."
                            howToUse={[
                                { step: "Define Scope", description: "Select the business units and systems to be assessed." },
                                { step: "Assign Stakeholders", description: "Identify key personnel responsible for compliance." },
                                { step: "Upload Evidence", description: "Provide existing policies and documentation." },
                                { step: "Assess Controls", description: "Answer specific questions to determine maturity." },
                                { step: "Generate Report", description: "Review findings and create a remediation plan." }
                            ]}
                            integrations={[
                                { name: "Policy Center", description: "Links to your existing policy library." },
                                { name: "Risk Register", description: "Automatically flags risks based on answers." }
                            ]}
                        />
                    }
                >
                    {getStepContent()}
                </WizardLayout>

                {/* Completion Confirmation Dialog */}
                <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
                    <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
                        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white relative">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
                            <div className="relative z-10 flex items-center gap-4 mb-4">
                                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30">
                                    <ShieldCheck className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                                        Discovery Complete
                                    </Badge>
                                    <DialogTitle className="text-2xl font-bold text-white">
                                        {standardConfig.name || standardId} Baselined!
                                    </DialogTitle>
                                </div>
                            </div>
                            <DialogDescription className="text-indigo-200 text-sm leading-relaxed relative z-10">
                                Your discovery assessment and business boundaries are confirmed. The framework controls are now mapped to your workspace.
                            </DialogDescription>
                        </div>

                        <div className="p-6 bg-white space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                What would you like to do next?
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {formData.scopingReport && (
                                    <Button
                                        onClick={handleExportDocx}
                                        disabled={isExportingDocx}
                                        variant="outline"
                                        className="w-full justify-between h-12 px-4 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50 text-indigo-900 font-semibold"
                                    >
                                        <span className="flex items-center gap-2">
                                            {isExportingDocx ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            ) : (
                                                <FileDown className="h-4 w-4 text-indigo-600" />
                                            )}
                                            Download Executive Blueprint (.docx)
                                        </span>
                                        <Badge variant="secondary" className="bg-white text-indigo-700 text-[10px]">
                                            Word Document
                                        </Badge>
                                    </Button>
                                )}

                                <Button
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        navigate(`/clients/${clientId}/compliance`);
                                    }}
                                    className="w-full justify-between h-12 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200"
                                >
                                    <span className="flex items-center gap-2">
                                        <LayoutDashboard className="h-4 w-4" />
                                        Go to Compliance Dashboard
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>

                                <Button
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        navigate(`/clients/${clientId}/controls`);
                                    }}
                                    variant="outline"
                                    className="w-full justify-between h-12 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                                >
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        View Initialized Controls
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between sm:justify-between">
                            <span className="text-xs text-slate-400">You can return to edit anytime.</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCompletionModal(false)}
                                className="text-slate-500 hover:text-slate-800"
                            >
                                Stay & Review Answers
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
