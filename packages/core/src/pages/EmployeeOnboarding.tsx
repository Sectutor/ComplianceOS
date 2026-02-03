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
    CheckCircle2,
    Circle,
    FileText,
    GraduationCap,
    Shield,
    ChevronRight,
    Sparkles,
    Laptop,
    ArrowRight,
    Lock,
    CreditCard,
    CheckSquare
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { learningContent } from "@/data/learningContent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@complianceos/ui/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Eye } from "lucide-react";

// Mock Policy Content (In a real app, this would come from the API)
const POLICY_CONTENT = {
    code_of_conduct: {
        title: "Code of Conduct",
        content: `
            <h3>1. Professional Integrity</h3>
            <p>All employees are expected to maintain the highest standards of professional integrity...</p>
            <h3>2. Workplace Respect</h3>
            <p>We are committed to providing a workplace free from discrimination and harassment...</p>
            <h3>3. Conflict of Interest</h3>
            <p>Employees must avoid situations where personal interests conflict with company duties...</p>
        `
    },
    aup: {
        title: "Acceptable Use Policy",
        content: `
            <h3>1. System Usage</h3>
            <p>Company systems are for business use. Incidental personal use is permitted if it does not interfere with work...</p>
            <h3>2. Security</h3>
            <p>Users must not disable or circumvent security controls...</p>
        `
    },
    data_protection: {
        title: "Data Protection Agreement",
        content: `
            <h3>1. Data Handling</h3>
            <p>You agree to handle all personal and sensitive data in accordance with GDPR and company policy...</p>
            <h3>2. Confidentiality</h3>
            <p>Data must not be shared with unauthorized parties...</p>
        `
    },
    confidentiality: {
        title: "Confidentiality Agreement",
        content: `
            <h3>1. Confidential Information</h3>
            <p>Includes trade secrets, customer lists, and proprietary technology...</p>
            <h3>2. Obligations</h3>
            <p>You agree to keep all such information strictly confidential during and after employment...</p>
        `
    }
};

export default function EmployeeOnboarding() {
    const { user } = useAuth();
    // Track viewed policies in this session
    const [viewedPolicies, setViewedPolicies] = useState<Set<string>>(new Set());
    const [viewingPolicy, setViewingPolicy] = useState<string | null>(null);

    const markAsViewed = (policyId: string) => {
        setViewedPolicies(prev => new Set(prev).add(policyId));
        setViewingPolicy(null);
    };
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    // Fetch user's clients to handle cases where selectedClientId is not in URL context (e.g. /onboarding)
    const { data: myClients } = trpc.clients.list.useQuery();

    // Determine effective client ID
    const effectiveClientId = selectedClientId || (myClients && myClients.length > 0 ? myClients[0].id : 0);

    // Fetch current user's employee record
    const { data: me } = trpc.users.me.useQuery();
    const { data: employee, refetch: refetchEmployee } = (trpc.employees as any).getByEmail?.useQuery(
        { email: me?.email || "", clientId: effectiveClientId || 0 },
        { enabled: !!me?.email && !!effectiveClientId }
    );

    // Auto-ensure employee record exists for the current user
    const ensureSelfMutation = (trpc.employees as any).ensureSelf?.useMutation({
        onSuccess: () => {
            refetchEmployee();
        }
    });

    useEffect(() => {
        if (effectiveClientId && me?.email && employee === null && !ensureSelfMutation.isLoading && !ensureSelfMutation.isSuccess) {
            ensureSelfMutation.mutate({ clientId: effectiveClientId });
        }
    }, [effectiveClientId, me, employee, ensureSelfMutation]);

    // Fetch onboarding status from database
    const { data: onboardingStatus, refetch: refetchOnboarding } = (trpc.onboarding as any).getOnboardingStatus?.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Fetch training progress from database
    const { data: trainingData } = (trpc.onboarding as any).getTrainingProgress?.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Fetch pending policies
    const { data: policyData } = (trpc.policyManagement as any).getMyPolicies?.useQuery(
        { clientId: effectiveClientId || 0, employeeId: employee?.id || 0 },
        { enabled: !!effectiveClientId && !!employee?.id }
    );

    // Attest training mutation
    const attestTrainingMutation = (trpc.onboarding as any).attestTraining?.useMutation({
        onSuccess: () => {
            refetchOnboarding();
        }
    });

    // Acknowledgment mutation
    const submitAcknowledgmentMutation = (trpc.onboarding as any).submitAcknowledgment?.useMutation({
        onSuccess: () => {
            refetchOnboarding();
        }
    });

    // Security setup mutation
    const updateSecuritySetupMutation = (trpc.onboarding as any).updateSecuritySetup?.useMutation({
        onSuccess: () => {
            refetchOnboarding();
        }
    });

    // Asset receipt mutation
    const confirmAssetReceiptMutation = (trpc.onboarding as any).confirmAssetReceipt?.useMutation({
        onSuccess: () => {
            refetchOnboarding();
        }
    });

    // Calculate progress from database
    const progress = useMemo(() => {
        if (!onboardingStatus) {
            return { tasks: { policies: false, training: false, device: false }, completed: 0, total: 3, percentage: 0 };
        }

        // Update policy status from policyData
        const policyComplete = policyData?.assignments?.filter((a: any) => a.status === 'pending' || a.status === 'viewed').length === 0;

        const tasks = {
            policies: policyComplete,
            training: onboardingStatus.tasks.training.complete,
            device: onboardingStatus.tasks.device.complete
        };

        const completed = Object.values(tasks).filter(Boolean).length;
        const total = 3;
        const percentage = Math.round((completed / total) * 100);

        return { tasks, completed, total, percentage };
    }, [onboardingStatus, policyData]);

    const toggleTrainingSection = async (frameworkId: string, sectionId: string) => {
        if (!effectiveClientId || !employee?.id) return;

        const isComplete = isSectionComplete(frameworkId, sectionId);
        if (!isComplete) {
            // Mark as complete in database
            await attestTrainingMutation.mutateAsync({
                clientId: effectiveClientId,
                employeeId: employee.id,
                frameworkId,
                sectionId,
                timeSpentSeconds: 0
            });
        }
    };

    const isSectionComplete = (frameworkId: string, sectionId: string) => {
        if (!trainingData?.byFramework) return false;
        const frameworkRecords = trainingData.byFramework[frameworkId] || [];
        return frameworkRecords.some((r: any) => r.sectionId === sectionId);
    };

    const pendingPoliciesCount = policyData?.assignments?.filter(
        (a: any) => a.status === 'pending' || a.status === 'viewed'
    ).length || 0;

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-12">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Employee Onboarding" },
                    ]}
                />

                {/* Hero Section with Progress */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Welcome to ComplianceOS</h1>
                                <p className="text-blue-100 text-lg">Complete your onboarding to get started</p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Overall Progress</span>
                                <span className="text-2xl font-bold">{progress.percentage}%</span>
                            </div>
                            <Progress value={progress.percentage} className="h-3 bg-white/20" />
                            <p className="text-sm text-blue-100">
                                {progress.completed} of {progress.total} tasks completed
                            </p>
                        </div>
                    </div>
                </div>

                {/* Onboarding Tasks */}
                <div className="grid gap-6">
                    {/* Task 1: Policy Attestation */}
                    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${progress.tasks.policies ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Review & Sign Policies</CardTitle>
                                            {progress.tasks.policies ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {progress.tasks.policies
                                                ? "All policies reviewed and attested"
                                                : `${pendingPoliciesCount} ${pendingPoliciesCount === 1 ? 'policy' : 'policies'} pending your review`
                                            }
                                        </CardDescription>
                                    </div>
                                </div>
                                {!progress.tasks.policies && (
                                    <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                                        Action Required
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Review and attest to company policies to ensure you understand our security and compliance requirements.
                            </p>
                            <Button
                                onClick={() => setLocation(selectedClientId ? `/clients/${selectedClientId}/policies/my-policies` : '/policies')}
                                className="w-full sm:w-auto"
                                disabled={!selectedClientId}
                            >
                                {progress.tasks.policies ? 'View Policies' : 'Review Policies'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Task 2: Security Awareness Training */}
                    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${progress.tasks.training ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                                        <GraduationCap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Security Awareness Training</CardTitle>
                                            {progress.tasks.training ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {progress.tasks.training
                                                ? "Training modules completed"
                                                : `${trainingData?.totalCompleted || 0} sections completed`
                                            }
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Learn about key compliance frameworks and security best practices.
                            </p>

                            <div className="space-y-3">
                                {Object.entries(learningContent).map(([frameworkId, framework]) => (
                                    <Collapsible key={frameworkId}>
                                        <CollapsibleTrigger className="w-full">
                                            <div className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${framework.sections.every(s => isSectionComplete(frameworkId, s.id))
                                                        ? 'bg-green-500'
                                                        : 'bg-gray-300'
                                                        }`} />
                                                    <span className="font-medium">{framework.title}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {framework.sections.filter(s => isSectionComplete(frameworkId, s.id)).length}/{framework.sections.length}
                                                    </Badge>
                                                </div>
                                                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="mt-2 ml-4 space-y-2">
                                                {framework.sections.map((section) => {
                                                    const isComplete = isSectionComplete(frameworkId, section.id);
                                                    return (
                                                        <div
                                                            key={section.id}
                                                            className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-primary/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isComplete ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                ) : (
                                                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                                <span className="text-sm">{section.title}</span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant={isComplete ? "outline" : "default"}
                                                                onClick={() => toggleTrainingSection(frameworkId, section.id)}
                                                            >
                                                                {isComplete ? 'Completed' : 'Mark Complete'}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task 3: Device Security (Placeholder) */}
                    <Card className="border-2 border-dashed opacity-75">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-gray-100 text-gray-600">
                                        <Laptop className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Install Security Agent</CardTitle>
                                            <Circle className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <CardDescription className="mt-1">
                                            Coming soon
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Install our device security agent to ensure your workstation meets our security standards.
                            </p>
                            <Button variant="outline" disabled className="w-full sm:w-auto">
                                <Shield className="mr-2 h-4 w-4" />
                                Install Agent
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Task 4: Compliance Acknowledgments */}
                    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${onboardingStatus?.tasks.acknowledgments?.complete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <Shield className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Compliance Acknowledgments</CardTitle>
                                            {onboardingStatus?.tasks.acknowledgments?.complete ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {onboardingStatus?.tasks.acknowledgments?.complete
                                                ? "All agreements acknowledged"
                                                : "Review and acknowledge required agreements"}
                                        </CardDescription>
                                    </div>
                                </div>
                                {!onboardingStatus?.tasks.acknowledgments?.complete && (
                                    <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                                        Action Required
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {onboardingStatus?.tasks.acknowledgments?.requirements ? (
                                    // Dynamic rendering
                                    (onboardingStatus.tasks.acknowledgments.requirements as any[]).map((req: any) => (
                                        <AcknowledgmentCheckbox
                                            key={req.key}
                                            label={req.title}
                                            checked={onboardingStatus.tasks.acknowledgments.items[req.key] || false}
                                            onCheck={() => handleAcknowledgment(req.key)}
                                            onView={() => {
                                                // If we have DB content, use it. Otherwise try fallback.
                                                // We can pass the content directly to the view state if needed, or just set ID.
                                                // Ideally, we set the viewing policy ID, and the modal lookup finds the content.
                                                setViewingPolicy(req.key);
                                            }}
                                            viewed={viewedPolicies.has(req.key)}
                                        />
                                    ))
                                ) : (
                                    // Fallback / Loading state
                                    <div className="text-center py-4 text-gray-500">
                                        Loading requirements...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

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
                            <ScrollArea className="flex-1 p-4 border rounded-md bg-white">
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: viewingPolicy ? (
                                            onboardingStatus?.tasks.acknowledgments?.requirements?.find((r: any) => r.key === viewingPolicy)?.description
                                            || POLICY_CONTENT[viewingPolicy as keyof typeof POLICY_CONTENT]?.content
                                            || '<p>No content available.</p>'
                                        ) : ''
                                    }}
                                />
                            </ScrollArea>
                            <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-4 mt-auto">
                                <div className="text-sm text-gray-500">
                                    Please read the document carefully.
                                </div>
                                <Button onClick={() => viewingPolicy && markAsViewed(viewingPolicy)}>
                                    I have read and understood
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Task 5: Account Security Setup */}
                    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${onboardingStatus?.tasks.security?.complete ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Lock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Account Security Setup</CardTitle>
                                            {onboardingStatus?.tasks.security?.complete ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {onboardingStatus?.tasks.security?.complete
                                                ? "Security configuration complete"
                                                : "Complete your account security setup"}
                                        </CardDescription>
                                    </div>
                                </div>
                                {!onboardingStatus?.tasks.security?.complete && (
                                    <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                                        Action Required
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <SecurityCheckbox
                                    label="Multi-Factor Authentication (MFA) Enrolled"
                                    checked={onboardingStatus?.tasks.security?.mfaEnrolled || false}
                                    onCheck={(value) => handleSecuritySetup('mfaEnrolled', value)}
                                />
                                <SecurityCheckbox
                                    label="Password Manager Setup Complete"
                                    checked={onboardingStatus?.tasks.security?.passwordManagerSetup || false}
                                    onCheck={(value) => handleSecuritySetup('passwordManagerSetup', value)}
                                />
                                <SecurityCheckbox
                                    label="Security Questions Configured"
                                    checked={onboardingStatus?.tasks.security?.securityQuestionsSet || false}
                                    onCheck={(value) => handleSecuritySetup('securityQuestionsSet', value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task 6: Asset Receipt Confirmation */}
                    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${onboardingStatus?.tasks.assets?.complete ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <CreditCard className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl">Asset Receipt Confirmation</CardTitle>
                                            {onboardingStatus?.tasks.assets?.complete ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {onboardingStatus?.tasks.assets?.complete
                                                ? "All assets confirmed"
                                                : "Confirm receipt of assigned equipment"}
                                        </CardDescription>
                                    </div>
                                </div>
                                {!onboardingStatus?.tasks.assets?.complete && (
                                    <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                                        Action Required
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {onboardingStatus?.tasks.assets?.items && onboardingStatus.tasks.assets.items.length > 0 ? (
                                    onboardingStatus.tasks.assets.items.map((asset: any) => (
                                        <AssetCheckbox
                                            key={asset.type}
                                            label={`${asset.type.charAt(0).toUpperCase() + asset.type.slice(1).replace('_', ' ')} Received`}
                                            checked={asset.status === 'confirmed'}
                                            onCheck={() => handleAssetReceipt(asset.type)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                        <p>No assets assigned to you yet.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Completion Message */}
                {progress.percentage === 100 && (
                    <Card className="border-2 border-green-500 bg-green-50/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-green-900">Onboarding Complete!</h3>
                                    <p className="text-sm text-green-700">
                                        You're all set. Welcome to the team!
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );

    // Handler functions
    function handleAcknowledgment(policyId: string) {
        if (!employee || !effectiveClientId) return;

        // Enforce viewing
        if (!viewedPolicies.has(policyId) && !onboardingStatus?.tasks.acknowledgments?.items?.[policyId as keyof typeof onboardingStatus.tasks.acknowledgments.items]) {
            // If trying to check without viewing, do nothing or show toast (optional)
            return;
        }

        submitAcknowledgmentMutation?.mutate({
            clientId: effectiveClientId,
            employeeId: employee.id,
            policyId,
            version: "1.0"
        });
    }

    function handleSecuritySetup(field: 'mfaEnrolled' | 'passwordManagerSetup' | 'securityQuestionsSet', value: boolean) {
        if (!employee || !effectiveClientId) return;

        updateSecuritySetupMutation?.mutate({
            clientId: effectiveClientId,
            employeeId: employee.id,
            field,
            value
        });
    }

    function handleAssetReceipt(assetType: string) {
        if (!employee || !effectiveClientId) return;

        confirmAssetReceiptMutation?.mutate({
            clientId: effectiveClientId,
            employeeId: employee.id,
            assetType
        });
    }

    function handleViewPolicy(policyId: string) {
        setViewingPolicy(policyId);
    }
}

// Checkbox Components
function AcknowledgmentCheckbox({
    label,
    checked,
    onCheck,
    onView,
    viewed
}: {
    label: string;
    checked: boolean;
    onCheck: () => void;
    onView: () => void;
    viewed: boolean;
}) {
    const canCheck = checked || viewed;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
                <button
                    onClick={onCheck}
                    disabled={!canCheck && !checked}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked
                        ? 'bg-green-500 border-green-500'
                        : canCheck
                            ? 'border-gray-500 hover:border-green-500'
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                        }`}
                >
                    {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
                </button>
                <div className="flex flex-col">
                    <span className={`text-sm ${checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {label}
                    </span>
                    {!checked && !canCheck && (
                        <span className="text-xs text-orange-600">
                            Must view document first
                        </span>
                    )}
                </div>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onView();
                }}
                className="gap-2 h-8"
            >
                <Eye className="h-3 w-3" />
                View
            </Button>
        </div>
    );
}

function SecurityCheckbox({ label, checked, onCheck }: { label: string; checked: boolean; onCheck: (value: boolean) => void }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
            <button
                onClick={() => onCheck(!checked)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 hover:border-blue-500'
                    }`}
            >
                {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
            </button>
            <span className={`text-sm ${checked ? 'text-gray-500' : 'text-gray-900'}`}>
                {label}
            </span>
        </div>
    );
}

function AssetCheckbox({ label, checked, onCheck }: { label: string; checked: boolean; onCheck: () => void }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
            <button
                onClick={onCheck}
                disabled={checked}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-gray-300 hover:border-indigo-500'
                    }`}
            >
                {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
            </button>
            <span className={`text-sm ${checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {label}
            </span>
        </div>
    );
}
