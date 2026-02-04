
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, CheckCircle, FileText, AlertCircle, Eye, Clock, GraduationCap, TrendingUp } from "lucide-react";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { ExceptionRequestDialog } from "@/components/policy/ExceptionRequestDialog";
import { marked } from 'marked';
import { useAuth } from "@/contexts/AuthContext";

export default function MyPolicies() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [, navigate] = useLocation();
    const { session } = useAuth();

    const { data: me } = (trpc.users as any).me.useQuery();
    const { data: employee } = (trpc.employees as any).getByEmail.useQuery(
        { email: me?.email || "", clientId },
        { enabled: !!me?.email && !!clientId }
    );

    const employeeId = employee?.id || 0;

    const { data, isLoading, refetch } = (trpc.policyManagement as any).getMyPolicies.useQuery(
        { clientId, employeeId },
        { enabled: clientId > 0 && employeeId > 0 }
    );

    const [viewPolicy, setViewPolicy] = useState<any | null>(null);
    const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
    const [exceptionPolicyId, setExceptionPolicyId] = useState<number | null>(null);

    const attestMutation = (trpc.policyManagement as any).attestPolicy.useMutation({
        onSuccess: () => {
            toast.success("Policy attested successfully");
            setViewPolicy(null);
            refetch();
        },
        onError: (e: any) => toast.error(e.message)
    });

    const viewMutation = (trpc.policyManagement as any).viewPolicy.useMutation({
        onSuccess: () => {
            refetch();
        }
    });

    const handleOpenPolicy = (assignment: any) => {
        setViewPolicy({ ...assignment, isLoadingContent: true });

        if (assignment.status === 'pending') {
            viewMutation.mutate({ assignmentId: assignment.assignmentId });
        }
    };

    const handleStartTraining = (trainingModule: any) => {
        // Navigate to employee onboarding page
        navigate(`/clients/${clientId}/onboarding/${employeeId}#${trainingModule.id}`);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Breadcrumb
                    items={[
                        { label: "Clients", href: "/clients" },
                        { label: "Client Workspace", href: `/clients/${clientId}` },
                        { label: "My Compliance" },
                    ]}
                />

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">My Compliance Center</h1>
                        <p className="text-muted-foreground">Track your policies, training, and compliance requirements.</p>
                    </div>
                </div>

                {/* Enhanced Stats */}
                {data?.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Policies</p>
                                        <p className="text-2xl font-bold">{data.summary.attestedPolicies}/{data.summary.totalPolicies}</p>
                                    </div>
                                    <FileText className="h-8 w-8 text-blue-600" />
                                </div>
                                {data.summary.pendingPolicies > 0 && (
                                    <p className="text-xs text-orange-600 mt-2">{data.summary.pendingPolicies} pending</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Training</p>
                                        <p className="text-2xl font-bold">{data.summary.completedTraining}/{data.summary.totalTraining}</p>
                                    </div>
                                    <GraduationCap className="h-8 w-8 text-green-600" />
                                </div>
                                {data.summary.pendingTraining > 0 && (
                                    <p className="text-xs text-orange-600 mt-2">{data.summary.pendingTraining} pending</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Items</p>
                                        <p className="text-2xl font-bold">{data.summary.completedItems}/{data.summary.totalItems}</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Overall Progress</p>
                                        <p className="text-2xl font-bold">{data.summary.overallProgress}%</p>
                                    </div>
                                    <TrendingUp className="h-8 w-8 text-amber-600" />
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${data.summary.overallProgress}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {employeeId === 0 && !isLoading && (
                    <Card className="bg-destructive/10 border-destructive/20">
                        <CardContent className="pt-6">
                            <p className="text-destructive">Could not find your employee record for this client. Please ensure your email matches an employee record.</p>
                        </CardContent>
                    </Card>
                )}

                {(isLoading || !data) && employeeId > 0 ? (
                    <div className="space-y-4">
                        <div className="h-12 w-full bg-muted animate-pulse rounded" />
                        <div className="h-64 w-full bg-muted animate-pulse rounded" />
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList>
                            <TabsTrigger value="all">All Items</TabsTrigger>
                            <TabsTrigger value="policies">Policies</TabsTrigger>
                            <TabsTrigger value="training">Training</TabsTrigger>
                            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                        </TabsList>

                        {/* ALL ITEMS TAB */}
                        <TabsContent value="all" className="mt-4">
                            <div className="grid gap-4">
                                {/* Pending Policies */}
                                {data?.assignments.filter((a: any) => a.status === 'pending' || a.status === 'viewed').map((assignment: any) => (
                                    <ComplianceItemCard
                                        key={`policy-${assignment.assignmentId}`}
                                        type="policy"
                                        item={assignment}
                                        onAction={() => handleOpenPolicy(assignment)}
                                        onException={() => {
                                            setExceptionPolicyId(assignment.policyId);
                                            setIsExceptionDialogOpen(true);
                                        }}
                                    />
                                ))}

                                {/* Pending Training */}
                                {data?.training.filter((t: any) => t.status === 'pending').map((training: any) => (
                                    <ComplianceItemCard
                                        key={`training-${training.id}`}
                                        type="training"
                                        item={training}
                                        onAction={() => handleStartTraining(training)}
                                    />
                                ))}

                                {/* Empty State */}
                                {data?.assignments.filter((a: any) => a.status !== 'attested').length === 0 &&
                                    data?.training.filter((t: any) => t.status === 'pending').length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                                            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                                            <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                                            <p>You have no pending compliance items.</p>
                                        </div>
                                    )}
                            </div>
                        </TabsContent>

                        {/* POLICIES TAB */}
                        <TabsContent value="policies" className="mt-4">
                            <div className="grid gap-4">
                                {data?.assignments.map((assignment: any) => (
                                    <ComplianceItemCard
                                        key={`policy-${assignment.assignmentId}`}
                                        type="policy"
                                        item={assignment}
                                        onAction={() => handleOpenPolicy(assignment)}
                                        onException={() => {
                                            setExceptionPolicyId(assignment.policyId);
                                            setIsExceptionDialogOpen(true);
                                        }}
                                    />
                                ))}
                                {data?.assignments.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">No policies assigned yet.</div>
                                )}
                            </div>
                        </TabsContent>

                        {/* TRAINING TAB */}
                        <TabsContent value="training" className="mt-4">
                            <div className="grid gap-4">
                                {data?.training.map((training: any) => (
                                    <ComplianceItemCard
                                        key={`training-${training.id}`}
                                        type="training"
                                        item={training}
                                        onAction={() => handleStartTraining(training)}
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        {/* EXCEPTIONS TAB */}
                        <TabsContent value="exceptions" className="mt-4">
                            <div className="grid gap-4">
                                {data?.exceptions.map((ex: any) => (
                                    <Card key={ex.id}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant={ex.status === 'approved' ? 'default' : ex.status === 'rejected' ? 'destructive' : 'outline'}>
                                                            {ex.status.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-sm text-muted-foreground">Requested on {new Date(ex.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="font-medium">Reason:</p>
                                                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">{ex.reason}</p>
                                                    {ex.expirationDate && (
                                                        <p className="text-xs text-red-500 mt-2 font-semibold">Expires: {new Date(ex.expirationDate).toLocaleDateString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {data?.exceptions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">No active exception requests.</div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                <PolicyViewDialog
                    assignment={viewPolicy}
                    open={!!viewPolicy}
                    onOpenChange={(open) => !open && setViewPolicy(null)}
                    onAttest={() => attestMutation.mutate({ assignmentId: viewPolicy.assignmentId })}
                    isAttesting={attestMutation.isPending}
                />

                {exceptionPolicyId && (
                    <ExceptionRequestDialog
                        open={isExceptionDialogOpen}
                        onOpenChange={setIsExceptionDialogOpen}
                        policyId={exceptionPolicyId}
                        employeeId={employeeId}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

// Unified Compliance Item Card Component
function ComplianceItemCard({ type, item, onAction, onException }: {
    type: 'policy' | 'training',
    item: any,
    onAction: () => void,
    onException?: () => void
}) {
    const isCompleted = type === 'policy' ? item.status === 'attested' : item.status === 'completed';
    const isPending = type === 'policy' ? (item.status === 'pending' || item.status === 'viewed') : item.status === 'pending';

    return (
        <Card>
            <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded ${isCompleted ? 'bg-green-100' : 'bg-primary/10'}`}>
                        {type === 'policy' ? (
                            isCompleted ? <CheckCircle className="h-6 w-6 text-green-600" /> : <FileText className="h-6 w-6 text-primary" />
                        ) : (
                            isCompleted ? <CheckCircle className="h-6 w-6 text-green-600" /> : <GraduationCap className="h-6 w-6 text-blue-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={type === 'policy' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                                {type === 'policy' ? 'Policy' : 'Training'}
                            </Badge>
                            {type === 'policy' && item.version && (
                                <span className="text-xs text-muted-foreground">v{item.version}</span>
                            )}
                        </div>
                        <h3 className="font-semibold text-lg">{type === 'policy' ? item.policyName : item.name}</h3>
                        {type === 'training' && item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                            {isCompleted ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                </Badge>
                            ) : (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Action Required
                                </Badge>
                            )}
                            {type === 'policy' && item.assignedAt && (
                                <span className="text-xs text-muted-foreground flex items-center">
                                    Assigned {new Date(item.assignedAt).toLocaleDateString()}
                                </span>
                            )}
                            {isCompleted && item.completedAt && (
                                <span className="text-xs text-green-600 flex items-center">
                                    Completed {new Date(item.completedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {type === 'policy' && !isCompleted && onException && (
                        <Button variant="outline" onClick={onException}>
                            Request Exception
                        </Button>
                    )}
                    <Button onClick={onAction} variant={isCompleted ? "ghost" : "default"}>
                        {type === 'policy' ? (isCompleted ? 'View Policy' : 'Review & Attest') : (isCompleted ? 'Review' : 'Start Training')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function PolicyViewDialog({ assignment, open, onOpenChange, onAttest, isAttesting }: { assignment: any, open: boolean, onOpenChange: (o: boolean) => void, onAttest: () => void, isAttesting: boolean }) {
    const { data: policy } = (trpc.clientPolicies as any).get.useQuery(
        { id: assignment?.policyId || 0 },
        { enabled: !!assignment?.policyId }
    );

    return (
        <EnhancedDialog
            open={open}
            onOpenChange={onOpenChange}
            title={assignment?.policyName}
            description="Please read carefully."
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            trigger={null}
            footer={
                <div className="flex justify-between w-full items-center bg-background py-2">
                    <p className="text-xs text-muted-foreground">By clicking attest, you certify that you have read and understood this policy.</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                        {assignment?.status !== 'attested' && (
                            <Button onClick={onAttest} disabled={isAttesting}>
                                {isAttesting ? "Attesting..." : "I Attest"}
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="py-4 space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none border p-4 rounded-md h-[60vh] overflow-y-auto bg-card">
                    {policy?.clientPolicy.content ? (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(policy.clientPolicy.content, { async: false }) as string }} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </EnhancedDialog>
    );
}
