import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import {
    CheckCircle2, Circle, FileText, GraduationCap, Shield, Sparkles,
    Lock, CreditCard, PlayCircle, ChevronRight, ChevronLeft, Check,
    Eye, Loader2, ArrowRight, ClipboardCheck, PartyPopper, AlertCircle
} from "lucide-react";
import { TrainingModuleViewer } from "@/components/training/TrainingModuleViewer";
import { marked } from "marked";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@complianceos/ui/ui/dialog";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@complianceos/ui/ui/collapsible";
import { PageGuide } from "@/components/PageGuide";

// Wizard step definitions
const WIZARD_STEPS = [
    { id: 'welcome', label: 'Welcome', icon: Sparkles, estimatedMinutes: 1 },
    { id: 'acknowledgments', label: 'Acknowledgments', icon: FileText, estimatedMinutes: 15 },
    { id: 'training', label: 'Training', icon: GraduationCap, estimatedMinutes: 20 },
    { id: 'security', label: 'Security', icon: Shield, estimatedMinutes: 5 },
    { id: 'assets', label: 'Assets', icon: CreditCard, estimatedMinutes: 3 },
    { id: 'review', label: 'Review', icon: ClipboardCheck, estimatedMinutes: 2 },
];

// Policy content fallback for requirements without DB content
const POLICY_CONTENT: Record<string, { title: string; content: string }> = {
    code_of_conduct: {
        title: "Code of Conduct",
        content: `<h3>1. Professional Integrity</h3><p>All employees are expected to maintain the highest standards of professional integrity...</p><h3>2. Workplace Respect</h3><p>We are committed to providing a workplace free from discrimination and harassment...</p><h3>3. Conflict of Interest</h3><p>Employees must avoid situations where personal interests conflict with company duties...</p>`
    },
    acceptable_use_policy: {
        title: "Acceptable Use Policy",
        content: `<h3>1. System Usage</h3><p>Company systems are for business use. Incidental personal use is permitted if it does not interfere with work...</p><h3>2. Security</h3><p>Users must not disable or circumvent security controls...</p>`
    },
    data_protection_agreement: {
        title: "Data Protection Agreement",
        content: `<h3>1. Data Handling</h3><p>You agree to handle all personal and sensitive data in accordance with GDPR and company policy...</p><h3>2. Confidentiality</h3><p>Data must not be shared with unauthorized parties...</p>`
    },
    confidentiality_nda: {
        title: "Confidentiality Agreement",
        content: `<h3>1. Confidential Information</h3><p>Includes trade secrets, customer lists, and proprietary technology...</p><h3>2. Obligations</h3><p>You agree to keep all such information strictly confidential during and after employment...</p>`
    },
    infosec_policy: {
        title: "Information Security Policy",
        content: `<h3>1. Information Classification</h3><p>All company information must be classified according to sensitivity level...</p><h3>2. Access Control</h3><p>Access to information is granted on a need-to-know basis...</p>`
    },
    anti_harassment: {
        title: "Anti-Harassment Policy",
        content: `<h3>1. Zero Tolerance</h3><p>We maintain a zero-tolerance policy toward harassment of any kind...</p><h3>2. Reporting</h3><p>All incidents must be reported to HR immediately...</p>`
    },
    health_safety: {
        title: "Health & Safety Policy",
        content: `<h3>1. Workplace Safety</h3><p>All employees must follow established safety protocols...</p><h3>2. Emergency Procedures</h3><p>Familiarize yourself with emergency exits and procedures...</p>`
    },
    remote_work: {
        title: "Remote Work Policy",
        content: `<h3>1. Eligibility</h3><p>Remote work is available to employees who meet performance standards...</p><h3>2. Security Requirements</h3><p>Remote workers must use VPN and secure connections...</p>`
    },
    social_media: {
        title: "Social Media Policy",
        content: `<h3>1. Personal Accounts</h3><p>Personal social media use must not disclose company information...</p><h3>2. Company Representation</h3><p>Only authorized staff may post on behalf of the company...</p>`
    },
    travel_expense: {
        title: "Travel & Expense Policy",
        content: `<h3>1. Approved Travel</h3><p>All business travel must be pre-approved by management...</p><h3>2. Expense Reporting</h3><p>Expenses must be submitted within 30 days with receipts...</p>`
    },
    whistleblower: {
        title: "Whistleblower Policy",
        content: `<h3>1. Reporting Channel</h3><p>A confidential reporting channel is available for ethical concerns...</p><h3>2. Non-Retaliation</h3><p>The company prohibits retaliation against good-faith reporters...</p>`
    },
    ai_usage_policy: {
        title: "AI Usage Policy",
        content: `<h3>1. Responsible AI Use</h3><p>AI tools must be used responsibly and in compliance with data protection laws...</p><h3>2. Data Privacy</h3><p>Do not input confidential company data into public AI tools...</p>`
    },
};

function getYouTubeThumbnail(url: string | null) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
    }
    return null;
}

export default function EmployeeOnboarding() {
    const { user } = useAuth();
    const { selectedClientId } = useClientContext();
    const utils = trpc.useUtils();
    const [currentStep, setCurrentStep] = useState(0);
    const [viewingPolicy, setViewingPolicy] = useState<string | null>(null);
    const [isTrainingCenterOpen, setIsTrainingCenterOpen] = useState(false);
    const [activeTrainingModuleId, setActiveTrainingModuleId] = useState<number | null>(null);
    const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());

    // Fetch clients
    const { data: myClients } = trpc.clients.list.useQuery();
    const effectiveClientId = selectedClientId || (myClients && myClients.length > 0 ? myClients[0].id : 0);

    // Fetch current user
    const { data: me } = trpc.users.me.useQuery();
    const { data: employee } = (trpc.employees as any).getByEmail?.useQuery(
        { email: me?.email || "", clientId: effectiveClientId || 0 },
        { enabled: !!me?.email && !!effectiveClientId }
    );

    // Auto-ensure employee record
    const ensureSelfMutation = (trpc.employees as any).ensureSelf?.useMutation({
        onSuccess: () => { utils.employees.getByEmail.invalidate(); }
    });

    useEffect(() => {
        if (effectiveClientId && me?.email && employee === null && !ensureSelfMutation.isLoading && !ensureSelfMutation.isSuccess) {
            ensureSelfMutation.mutate({ clientId: effectiveClientId });
        }
    }, [effectiveClientId, me, employee, ensureSelfMutation]);

    // Fetch onboarding status
    const { data: onboardingStatus, refetch: refetchOnboarding } = (trpc.onboarding as any).getOnboardingStatus?.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Fetch training progress
    const { data: trainingData } = (trpc.onboarding as any).getTrainingProgress?.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Fetch custom training modules
    const { data: customModules } = trpc.training.list.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Mutations
    const submitAcknowledgmentMutation = (trpc.onboarding as any).submitAcknowledgment?.useMutation({
        onSuccess: () => {
            (utils.onboarding as any).getOnboardingStatus?.invalidate();
            refetchOnboarding();
            toast.success("Document acknowledged");
        }
    });

    const updateSecuritySetupMutation = (trpc.onboarding as any).updateSecuritySetup?.useMutation({
        onSuccess: () => {
            (utils.onboarding as any).getOnboardingStatus?.invalidate();
            refetchOnboarding();
            toast.success("Security setup updated");
        },
        onError: (err: any) => toast.error("Failed: " + err.message),
    });

    const confirmAssetReceiptMutation = (trpc.onboarding as any).confirmAssetReceipt?.useMutation({
        onSuccess: () => {
            (utils.onboarding as any).getOnboardingStatus?.invalidate();
            refetchOnboarding();
            toast.success("Asset receipt confirmed");
        },
        onError: (err: any) => toast.error("Failed: " + err.message),
    });

    const attestTrainingMutation = (trpc.onboarding as any).attestTraining?.useMutation({
        onSuccess: () => {
            (utils.onboarding as any).getOnboardingStatus?.invalidate();
            refetchOnboarding();
        }
    });

    // Calculate overall progress
    const progress = useMemo(() => {
        if (!onboardingStatus) {
            return { tasks: { training: false, acknowledgments: false, security: false, assets: false }, completed: 0, total: 4, percentage: 0 };
        }
        const tasks = {
            training: onboardingStatus.tasks.training.complete,
            acknowledgments: onboardingStatus.tasks.acknowledgments.complete,
            security: onboardingStatus.tasks.security.complete,
            assets: onboardingStatus.tasks.assets.complete,
        };
        const completed = Object.values(tasks).filter(Boolean).length;
        const total = 4;
        const percentage = Math.round((completed / total) * 100);
        return { tasks, completed, total, percentage };
    }, [onboardingStatus]);

    // Calculate total estimated time
    const totalEstimatedMinutes = WIZARD_STEPS.reduce((sum, step) => sum + step.estimatedMinutes, 0);
    const completedSteps = Math.floor((progress.percentage / 100) * WIZARD_STEPS.length);
    const timeRemaining = totalEstimatedMinutes - Math.floor((progress.percentage / 100) * totalEstimatedMinutes);

    const handleAcknowledgment = useCallback((policyId: string) => {
        if (!employee || !effectiveClientId) return;
        if (onboardingStatus?.tasks.acknowledgments?.items?.[policyId]) return;

        if (policyId.startsWith('policy_')) {
            const requirement = (onboardingStatus.tasks.acknowledgments.requirements as any[]).find(r => r.key === policyId);
            if (requirement?.isPolicy && requirement?.assignmentId) {
                (trpc.policyManagement as any).attestPolicy?.useMutation({
                    onSuccess: () => {
                        (utils.onboarding as any).getOnboardingStatus?.invalidate();
                        refetchOnboarding();
                        toast.success("Policy accepted");
                    }
                })?.mutate({ assignmentId: requirement.assignmentId });
            }
        } else {
            submitAcknowledgmentMutation.mutate({
                clientId: effectiveClientId,
                employeeId: employee.id,
                acknowledgmentType: policyId,
                version: "1.0"
            });
        }
    }, [employee, effectiveClientId, onboardingStatus, submitAcknowledgmentMutation, utils, refetchOnboarding, trpc]);

    const handleSecuritySetup = useCallback((field: 'mfaEnrolled' | 'passwordManagerSetup' | 'securityQuestionsSet', value: boolean) => {
        if (!employee || !effectiveClientId) return;
        updateSecuritySetupMutation.mutate({
            clientId: effectiveClientId,
            employeeId: employee.id,
            field,
            value
        });
    }, [employee, effectiveClientId, updateSecuritySetupMutation]);

    const handleAssetReceipt = useCallback((assetType: string) => {
        if (!employee || !effectiveClientId) return;
        confirmAssetReceiptMutation.mutate({
            clientId: effectiveClientId,
            employeeId: employee.id,
            assetType
        });
    }, [employee, effectiveClientId, confirmAssetReceiptMutation]);

    const toggleExpandReq = (key: string) => {
        setExpandedReqs(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const goNext = () => setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    const goPrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));
    const goToStep = (idx: number) => setCurrentStep(idx);

    // Render step content
    const renderStepContent = () => {
        const step = WIZARD_STEPS[currentStep];

        switch (step.id) {
            case 'welcome':
                return <WelcomeStep progress={progress} timeRemaining={timeRemaining} totalMinutes={totalEstimatedMinutes} onNext={goNext} />;

            case 'acknowledgments':
                return (
                    <AcknowledgmentsStep
                        onboardingStatus={onboardingStatus}
                        expandedReqs={expandedReqs}
                        toggleExpandReq={toggleExpandReq}
                        handleAcknowledgment={handleAcknowledgment}
                        viewingPolicy={viewingPolicy}
                        setViewingPolicy={setViewingPolicy}
                        onNext={goNext}
                        onPrev={goPrev}
                    />
                );

            case 'training':
                return (
                    <TrainingStep
                        onboardingStatus={onboardingStatus}
                        trainingData={trainingData}
                        customModules={customModules}
                        isTrainingCenterOpen={isTrainingCenterOpen}
                        setIsTrainingCenterOpen={setIsTrainingCenterOpen}
                        activeTrainingModuleId={activeTrainingModuleId}
                        setActiveTrainingModuleId={setActiveTrainingModuleId}
                        effectiveClientId={effectiveClientId}
                        employeeId={employee?.id}
                        onNext={goNext}
                        onPrev={goPrev}
                    />
                );

            case 'security':
                return (
                    <SecurityStep
                        onboardingStatus={onboardingStatus}
                        handleSecuritySetup={handleSecuritySetup}
                        isLoading={updateSecuritySetupMutation.isLoading}
                        onNext={goNext}
                        onPrev={goPrev}
                    />
                );

            case 'assets':
                return (
                    <AssetsStep
                        onboardingStatus={onboardingStatus}
                        handleAssetReceipt={handleAssetReceipt}
                        isLoading={confirmAssetReceiptMutation.isLoading}
                        onNext={goNext}
                        onPrev={goPrev}
                    />
                );

            case 'review':
                return (
                    <ReviewStep
                        onboardingStatus={onboardingStatus}
                        progress={progress}
                        onPrev={goPrev}
                        goToStep={goToStep}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-12 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Employee Onboarding" }]} />
                        <h1 className="text-2xl font-bold tracking-tight mt-2">Employee Onboarding</h1>
                        <p className="text-muted-foreground mt-1">Complete all steps to finish your onboarding.</p>
                    </div>
                    <PageGuide
                        title="Employee Onboarding"
                        description="Your step-by-step guide to completing security and compliance requirements."
                        rationale="Security is a shared responsibility. This onboarding ensures every team member understands their role in protecting the organization."
                        howToUse={[
                            { step: "Welcome", description: "Review your onboarding overview and estimated time." },
                            { step: "Acknowledgments", description: "Read and acknowledge required compliance documents." },
                            { step: "Training", description: "Complete assigned security awareness training modules." },
                            { step: "Security", description: "Configure MFA, password manager, and security questions." },
                            { step: "Assets", description: "Confirm receipt of assigned equipment." },
                            { step: "Review", description: "Review all completed items and submit." },
                        ]}
                    />
                </div>

                {/* Overall Progress Bar */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm font-bold">{progress.percentage}%</span>
                        </div>
                        <Progress value={progress.percentage} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {progress.completed} of {progress.total} task categories completed
                            {timeRemaining > 0 && ` · ~${timeRemaining} min remaining`}
                        </p>
                    </CardContent>
                </Card>

                {/* Step Indicator */}
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                    {WIZARD_STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep || (step.id === 'welcome' && currentStep > 0);
                        const isAccessible = idx <= currentStep || progress.percentage > (idx / WIZARD_STEPS.length) * 100;

                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => isAccessible ? goToStep(idx) : null}
                                    disabled={!isAccessible}
                                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all min-w-[80px] ${
                                        isActive ? 'bg-primary/10 text-primary' :
                                        isCompleted ? 'text-green-600 hover:bg-green-50' :
                                        isAccessible ? 'text-muted-foreground hover:bg-gray-50' :
                                        'text-gray-300 cursor-not-allowed'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full ${
                                        isActive ? 'bg-primary text-white' :
                                        isCompleted ? 'bg-green-100 text-green-600' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                        {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                    </div>
                                    <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
                                </button>
                                {idx < WIZARD_STEPS.length - 1 && (
                                    <div className={`h-0.5 w-6 md:w-12 mx-1 ${
                                        idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                    {renderStepContent()}
                </div>

                {/* Policy Viewer Modal */}
                <Dialog open={!!viewingPolicy} onOpenChange={(open) => !open && setViewingPolicy(null)}>
                    <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>
                                {viewingPolicy && (
                                    onboardingStatus?.tasks.acknowledgments?.requirements?.find((r: any) => r.key === viewingPolicy)?.title
                                    || POLICY_CONTENT[viewingPolicy as keyof typeof POLICY_CONTENT]?.title
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="flex-1 p-6 bg-slate-50/50">
                            <div
                                className="mx-auto max-w-2xl bg-white p-8 md:p-12 shadow-sm border rounded-sm min-h-full prose prose-slate dark:prose-invert [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-8 [&_h1]:text-slate-900 [&_h1]:border-b [&_h1]:pb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-slate-800 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-6 [&_p]:leading-relaxed [&_p]:text-slate-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_li]:mb-3 [&_li]:text-slate-700 whitespace-normal"
                                dangerouslySetInnerHTML={{
                                    __html: viewingPolicy ? (() => {
                                        const requirement = onboardingStatus?.tasks.acknowledgments?.requirements?.find((r: any) => r.key === viewingPolicy);
                                        const rawContent = requirement?.description
                                            || POLICY_CONTENT[viewingPolicy as keyof typeof POLICY_CONTENT]?.content
                                            || '<p>No content available.</p>';

                                        const decodeEntities = (html: string): string => {
                                            if (typeof document === 'undefined') return html;
                                            const txt = document.createElement("textarea");
                                            txt.innerHTML = html;
                                            return txt.value;
                                        };

                                        const unescaped = decodeEntities(rawContent).trim();
                                        const appearsToBeMarkdown = !unescaped.includes('<') && unescaped.includes('#');

                                        if (appearsToBeMarkdown) {
                                            return marked.parse(unescaped, { async: false }) as string;
                                        }
                                        return unescaped;
                                    })() : ''
                                }}
                            />
                        </ScrollArea>
                        <div className="flex justify-between items-center border-t pt-4">
                            <span className="text-sm text-muted-foreground">Please read the document carefully.</span>
                            <Button
                                onClick={() => {
                                    if (viewingPolicy) {
                                        handleAcknowledgment(viewingPolicy);
                                        setViewingPolicy(null);
                                    }
                                }}
                                disabled={!!(viewingPolicy && onboardingStatus?.tasks.acknowledgments?.items?.[viewingPolicy])}
                            >
                                {viewingPolicy && onboardingStatus?.tasks.acknowledgments?.items?.[viewingPolicy]
                                    ? "Already Accepted"
                                    : "I have read and understood"
                                }
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}

// ============================================
// STEP COMPONENTS
// ============================================

function WelcomeStep({ progress, timeRemaining, totalMinutes, onNext }: {
    progress: { percentage: number; completed: number; total: number };
    timeRemaining: number;
    totalMinutes: number;
    onNext: () => void;
}) {
    return (
        <Card className="border-2">
            <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-6">
                    <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <Sparkles className="h-12 w-12 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Welcome to ComplianceOS</h2>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            Complete your onboarding to get access to all systems. This process ensures you understand our security and compliance requirements.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{totalMinutes}</p>
                            <p className="text-xs text-muted-foreground">Minutes</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">6</p>
                            <p className="text-xs text-muted-foreground">Steps</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">12</p>
                            <p className="text-xs text-muted-foreground">Documents</p>
                        </div>
                    </div>

                    {progress.percentage > 0 && (
                        <div className="max-w-xs mx-auto">
                            <Progress value={progress.percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{progress.percentage}% already complete</p>
                        </div>
                    )}

                    <Button onClick={onNext} size="lg" className="gap-2">
                        {progress.percentage > 0 ? "Continue Onboarding" : "Start Onboarding"}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function AcknowledgmentsStep({
    onboardingStatus, expandedReqs, toggleExpandReq, handleAcknowledgment,
    viewingPolicy, setViewingPolicy, onNext, onPrev
}: {
    onboardingStatus: any;
    expandedReqs: Set<string>;
    toggleExpandReq: (key: string) => void;
    handleAcknowledgment: (key: string) => void;
    viewingPolicy: string | null;
    setViewingPolicy: (key: string | null) => void;
    onNext: () => void;
    onPrev: () => void;
}) {
    const requirements = onboardingStatus?.tasks.acknowledgments?.requirements || [];
    const items = onboardingStatus?.tasks.acknowledgments?.items || {};
    const completedCount = requirements.filter((r: any) => items[r.key]).length;
    const progressPct = requirements.length > 0 ? Math.round((completedCount / requirements.length) * 100) : 0;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-amber-500" />
                                Compliance Acknowledgments
                            </CardTitle>
                            <CardDescription>Read and acknowledge all required documents</CardDescription>
                        </div>
                        <Badge variant="outline">{completedCount}/{requirements.length}</Badge>
                    </div>
                    <Progress value={progressPct} className="h-2 mt-2" />
                </CardHeader>
                <CardContent>
                    {requirements.length > 0 ? (
                        <div className="space-y-2">
                            {(requirements as any[]).map((req: any) => {
                                const isAcknowledged = items[req.key];
                                const isExpanded = expandedReqs.has(req.key);

                                return (
                                    <Collapsible
                                        key={req.key}
                                        open={isExpanded}
                                        onOpenChange={() => toggleExpandReq(req.key)}
                                        className={`border rounded-lg transition-all ${
                                            isAcknowledged ? 'border-green-200 bg-green-50/30' : 'hover:border-primary/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 p-3">
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                                isAcknowledged ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                                            }`}>
                                                {isAcknowledged ? <Check className="h-4 w-4" /> : null}
                                            </div>

                                            <CollapsibleTrigger className="flex-1 text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm ${isAcknowledged ? 'text-gray-500 line-through' : ''}`}>
                                                        {req.title}
                                                    </span>
                                                    {req.isMandatory && (
                                                        <Badge variant="default" className="bg-red-500 text-xs h-5">Required</Badge>
                                                    )}
                                                    {req.isPolicy && (
                                                        <Badge variant="outline" className="text-xs h-5">Policy</Badge>
                                                    )}
                                                </div>
                                            </CollapsibleTrigger>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); setViewingPolicy(req.key); }}
                                                    className="h-8"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {!isAcknowledged && (
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); handleAcknowledgment(req.key); }}
                                                        className="h-8 text-xs"
                                                    >
                                                        Acknowledge
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <CollapsibleContent>
                                            <div className="px-4 pb-4 pt-1">
                                                <div className="bg-white border rounded-lg p-4 text-sm text-muted-foreground prose prose-sm max-w-none max-h-48 overflow-y-auto"
                                                    dangerouslySetInnerHTML={{
                                                        __html: req.description?.substring(0, 1000) + (req.description?.length > 1000 ? '...' : '')
                                                            || '<p>No preview available. Click view to read full document.</p>'
                                                    }}
                                                />
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Loading requirements...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={onNext} className="gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function TrainingStep({
    onboardingStatus, trainingData, customModules,
    isTrainingCenterOpen, setIsTrainingCenterOpen,
    activeTrainingModuleId, setActiveTrainingModuleId,
    effectiveClientId, employeeId, onNext, onPrev
}: {
    onboardingStatus: any;
    trainingData: any;
    customModules: any[];
    isTrainingCenterOpen: boolean;
    setIsTrainingCenterOpen: (open: boolean) => void;
    activeTrainingModuleId: number | null;
    setActiveTrainingModuleId: (id: number | null) => void;
    effectiveClientId: number;
    employeeId: number | undefined;
    onNext: () => void;
    onPrev: () => void;
}) {
    const trainingComplete = onboardingStatus?.tasks.training?.complete;
    const completedSections = trainingData?.totalCompleted || 0;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-cyan-500" />
                                Security Awareness Training
                            </CardTitle>
                            <CardDescription>Complete required training modules</CardDescription>
                        </div>
                        {trainingComplete ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Complete</Badge>
                        ) : (
                            <Badge variant="outline">{completedSections} sections done</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {customModules && customModules.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {(customModules as any[]).map((module: any) => (
                                    <div
                                        key={module.id}
                                        className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => {
                                            setActiveTrainingModuleId(module.id);
                                            setIsTrainingCenterOpen(true);
                                        }}
                                    >
                                        <div className="aspect-video bg-slate-100 relative flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                            {(module.thumbnailUrl || getYouTubeThumbnail(module.videoUrl)) && (
                                                <img
                                                    src={module.thumbnailUrl || getYouTubeThumbnail(module.videoUrl) || ""}
                                                    alt={module.title}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            )}
                                            {module.type === 'video' ? (
                                                <div className="z-10 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    <PlayCircle className="h-6 w-6 text-indigo-600 ml-0.5" />
                                                </div>
                                            ) : (
                                                <FileText className="h-10 w-10 text-slate-400 z-10" />
                                            )}
                                            <div className="absolute top-2 right-2 z-10">
                                                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs font-normal">
                                                    {module.durationMinutes} min
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                                                {module.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                                                {module.description || "No description provided."}
                                            </p>
                                            <Button size="sm" className="w-full mt-auto" variant="outline">
                                                Start Learning
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => setIsTrainingCenterOpen(true)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <PlayCircle className="mr-2 h-5 w-5" />
                                Launch Full Training Center
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No training modules assigned yet.</p>
                            <p className="text-xs mt-1">Contact your administrator if you believe this is an error.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Training Center Modal */}
            <Dialog open={isTrainingCenterOpen} onOpenChange={setIsTrainingCenterOpen}>
                <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle>Security Training Center</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden bg-slate-50 p-4">
                        {effectiveClientId && employeeId && (
                            <TrainingModuleViewer
                                clientId={effectiveClientId}
                                employeeId={employeeId}
                                initialModuleId={activeTrainingModuleId}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={onNext} className="gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function SecurityStep({
    onboardingStatus, handleSecuritySetup, isLoading, onNext, onPrev
}: {
    onboardingStatus: any;
    handleSecuritySetup: (field: 'mfaEnrolled' | 'passwordManagerSetup' | 'securityQuestionsSet', value: boolean) => void;
    isLoading: boolean;
    onNext: () => void;
    onPrev: () => void;
}) {
    const security = onboardingStatus?.tasks?.security || {};
    const isComplete = security.mfaEnrolled && security.passwordManagerSetup && security.securityQuestionsSet;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-500" />
                                Account Security Setup
                            </CardTitle>
                            <CardDescription>Configure your account security settings</CardDescription>
                        </div>
                        {isComplete && <Badge className="bg-green-500 hover:bg-green-600">Complete</Badge>}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <SecurityToggle
                            label="Multi-Factor Authentication (MFA) Enrolled"
                            description="Set up MFA on your account for enhanced security"
                            checked={security.mfaEnrolled || false}
                            onChange={(v) => handleSecuritySetup('mfaEnrolled', v)}
                            isLoading={isLoading}
                            icon={<Lock className="h-5 w-5 text-blue-500" />}
                        />
                        <SecurityToggle
                            label="Password Manager Setup Complete"
                            description="Configure an approved password manager"
                            checked={security.passwordManagerSetup || false}
                            onChange={(v) => handleSecuritySetup('passwordManagerSetup', v)}
                            isLoading={isLoading}
                            icon={<Shield className="h-5 w-5 text-cyan-500" />}
                        />
                        <SecurityToggle
                            label="Security Questions Configured"
                            description="Set up account recovery security questions"
                            checked={security.securityQuestionsSet || false}
                            onChange={(v) => handleSecuritySetup('securityQuestionsSet', v)}
                            isLoading={isLoading}
                            icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={onNext} className="gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function AssetsStep({
    onboardingStatus, handleAssetReceipt, isLoading, onNext, onPrev
}: {
    onboardingStatus: any;
    handleAssetReceipt: (assetType: string) => void;
    isLoading: boolean;
    onNext: () => void;
    onPrev: () => void;
}) {
    const assets = onboardingStatus?.tasks?.assets?.items || [];
    const hasAssets = assets.length > 0;
    const allConfirmed = hasAssets && assets.every((a: any) => a.status === 'confirmed');

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-indigo-500" />
                                Asset Receipt Confirmation
                            </CardTitle>
                            <CardDescription>Confirm receipt of assigned equipment</CardDescription>
                        </div>
                        {allConfirmed && <Badge className="bg-green-500 hover:bg-green-600">All Confirmed</Badge>}
                    </div>
                </CardHeader>
                <CardContent>
                    {hasAssets ? (
                        <div className="space-y-3">
                            {(assets as any[]).map((asset: any) => (
                                <AssetToggle
                                    key={asset.type}
                                    label={`${asset.type.charAt(0).toUpperCase() + asset.type.slice(1).replace(/_/g, ' ')} Received`}
                                    description={asset.confirmedAt ? `Confirmed on ${new Date(asset.confirmedAt).toLocaleDateString()}` : 'Click to confirm receipt'}
                                    checked={asset.status === 'confirmed'}
                                    onConfirm={() => handleAssetReceipt(asset.type)}
                                    isLoading={isLoading}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                            <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No assets assigned to you yet.</p>
                            <p className="text-xs mt-1">Contact IT if you expect equipment assignments.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={onNext} className="gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function ReviewStep({
    onboardingStatus, progress, onPrev, goToStep
}: {
    onboardingStatus: any;
    progress: { percentage: number; completed: number; total: number };
    onPrev: () => void;
    goToStep: (idx: number) => void;
}) {
    const requirements = onboardingStatus?.tasks.acknowledgments?.requirements || [];
    const ackItems = onboardingStatus?.tasks.acknowledgments?.items || {};
    const security = onboardingStatus?.tasks?.security || {};
    const assets = onboardingStatus?.tasks?.assets?.items || [];
    const trainingComplete = onboardingStatus?.tasks?.training?.complete;

    const allComplete = progress.percentage === 100;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-green-500" />
                                Review & Submit
                            </CardTitle>
                            <CardDescription>Review your completed items before final submission</CardDescription>
                        </div>
                        {allComplete && (
                            <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                                <PartyPopper className="h-3 w-3" /> Ready to Submit
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <SummaryCard
                                label="Acknowledgments"
                                value={`${requirements.filter((r: any) => ackItems[r.key]).length}/${requirements.length}`}
                                complete={onboardingStatus?.tasks.acknowledgments?.complete}
                                onClick={() => goToStep(1)}
                            />
                            <SummaryCard
                                label="Training"
                                value={trainingComplete ? "Complete" : "Pending"}
                                complete={trainingComplete}
                                onClick={() => goToStep(2)}
                            />
                            <SummaryCard
                                label="Security"
                                value={security.mfaEnrolled && security.passwordManagerSetup && security.securityQuestionsSet ? "Complete" : "Pending"}
                                complete={security.mfaEnrolled && security.passwordManagerSetup && security.securityQuestionsSet}
                                onClick={() => goToStep(3)}
                            />
                            <SummaryCard
                                label="Assets"
                                value={assets.length > 0 ? `${assets.filter((a: any) => a.status === 'confirmed').length}/${assets.length}` : "N/A"}
                                complete={assets.length > 0 && assets.every((a: any) => a.status === 'confirmed')}
                                onClick={() => goToStep(4)}
                            />
                        </div>

                        {/* Detailed Summary */}
                        <div className="border rounded-lg divide-y">
                            <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => goToStep(1)}>
                                <div className="flex items-center gap-3">
                                    {onboardingStatus?.tasks.acknowledgments?.complete ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="font-medium text-sm">Acknowledgments</span>
                                </div>
                                <Badge variant={onboardingStatus?.tasks.acknowledgments?.complete ? "default" : "outline"}>
                                    {requirements.filter((r: any) => ackItems[r.key]).length} of {requirements.length}
                                </Badge>
                            </div>
                            <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => goToStep(2)}>
                                <div className="flex items-center gap-3">
                                    {trainingComplete ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="font-medium text-sm">Training</span>
                                </div>
                                <Badge variant={trainingComplete ? "default" : "outline"}>
                                    {trainingComplete ? "Complete" : "Pending"}
                                </Badge>
                            </div>
                            <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => goToStep(3)}>
                                <div className="flex items-center gap-3">
                                    {security.mfaEnrolled && security.passwordManagerSetup && security.securityQuestionsSet ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="font-medium text-sm">Security Setup</span>
                                </div>
                                <Badge variant={security.mfaEnrolled && security.passwordManagerSetup && security.securityQuestionsSet ? "default" : "outline"}>
                                    {[security.mfaEnrolled, security.passwordManagerSetup, security.securityQuestionsSet].filter(Boolean).length}/3
                                </Badge>
                            </div>
                            <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => goToStep(4)}>
                                <div className="flex items-center gap-3">
                                    {assets.length > 0 && assets.every((a: any) => a.status === 'confirmed') ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="font-medium text-sm">Assets</span>
                                </div>
                                <Badge variant={assets.length > 0 && assets.every((a: any) => a.status === 'confirmed') ? "default" : "outline"}>
                                    {assets.length > 0 ? `${assets.filter((a: any) => a.status === 'confirmed').length}/${assets.length}` : "None"}
                                </Badge>
                            </div>
                        </div>

                        {/* Completion Message */}
                        {allComplete && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <PartyPopper className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="font-medium text-green-800">All tasks complete!</p>
                                <p className="text-sm text-green-600">Click submit to finalize your onboarding.</p>
                            </div>
                        )}

                        {!allComplete && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                <p className="font-medium text-amber-800">Some tasks are incomplete</p>
                                <p className="text-sm text-amber-600">You can submit now and complete remaining items later.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                    onClick={() => toast.success("Onboarding submitted successfully! Welcome to the team.")}
                    size="lg"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Onboarding
                </Button>
            </div>
        </div>
    );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function SecurityToggle({ label, description, checked, onChange, isLoading, icon }: {
    label: string; description: string; checked: boolean;
    onChange: (value: boolean) => void; isLoading?: boolean; icon: React.ReactNode;
}) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${checked ? 'border-green-200 bg-green-50/30' : 'hover:border-primary/30'}`}>
            <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">{icon}</div>
            <div className="flex-1">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                disabled={isLoading}
                className={`flex-shrink-0 w-10 h-6 rounded-full transition-all relative ${
                    checked ? 'bg-green-500' : 'bg-gray-300'
                } ${isLoading ? 'opacity-50' : ''}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-1'
                }`} />
            </button>
        </div>
    );
}

function AssetToggle({ label, description, checked, onConfirm, isLoading }: {
    label: string; description: string; checked: boolean;
    onConfirm: () => void; isLoading?: boolean;
}) {
    return (
        <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${checked ? 'border-green-200 bg-green-50/30' : 'hover:border-primary/30'}`}>
            <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {checked ? (
                <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                </Badge>
            ) : (
                <Button size="sm" onClick={onConfirm} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Confirm
                </Button>
            )}
        </div>
    );
}

function SummaryCard({ label, value, complete, onClick }: {
    label: string; value: string; complete: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-lg border text-center transition-all hover:shadow-sm ${
                complete ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
            }`}
        >
            <div className="flex justify-center mb-1">
                {complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                )}
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-bold">{value}</p>
        </button>
    );
}
