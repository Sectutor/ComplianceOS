/**
 * Vendor Mitigation Plan Viewer
 * AI-generated remediation steps for vendor risks
 */

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, Circle, Clock, User, ShieldAlert, AlertTriangle, Plus, Check } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useVendorMitigationPlan } from '@/hooks/useAdvisor';
import type { MitigationStep } from '@/lib/advisor/types';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface VendorMitigationPlanViewerProps {
    clientId: number;
    vendorId: number;
    vendorName: string;
    hasScanData: boolean;
}

export default function VendorMitigationPlanViewer({
    clientId,
    vendorId,
    vendorName,
    hasScanData
}: VendorMitigationPlanViewerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { generate, data, isLoading, error } = useVendorMitigationPlan();

    const handleGenerate = () => {
        if (!isOpen) {
            setIsOpen(true);
            if (!data) {
                generate({ clientId, vendorId });
            }
        } else {
            setIsOpen(false);
        }
    };

    if (!hasScanData) return null;

    return (
        <div className="mt-4">
            <Button
                onClick={handleGenerate}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-purple-200 hover:bg-purple-50 hover:text-purple-700 text-purple-600"
            >
                <Sparkles className="w-4 h-4" />
                <span>{data ? "View Mitigation Plan" : "Generate AI Mitigation Plan"}</span>
            </Button>

            {isOpen && (
                <div className="mt-4 border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                            <span className="text-gray-600 font-medium">Analyzing vulnerabilities and breach data...</span>
                            <span className="text-xs text-gray-500 mt-1">This may take up to 30 seconds</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-900">Generation Failed</p>
                                <p className="text-sm text-red-800">
                                    {(error as any).message || "Could not generate plan. Please try again."}
                                </p>
                            </div>
                        </div>
                    )}

                    {data && (
                        <div>
                            {/* Header */}
                            <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-purple-600" />
                                        Risk Mitigation Plan: {data.vendorName}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>Timeline: {data.estimatedTimeline}</span>
                                        </div>
                                        <div>
                                            <span>{data.mitigationSteps.length} Actions</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">{data.riskScore}</div>
                                    <div className="text-xs text-gray-500">Current Risk Score</div>
                                </div>
                            </div>

                            {/* Analysis Summary */}
                            {data.cveAnalysis && (
                                <div className="mb-6 bg-purple-50 border border-purple-100 rounded-lg p-4">
                                    <h4 className="font-semibold text-purple-900 mb-2 text-sm uppercase tracking-wide">Risk Analysis</h4>
                                    <p className="text-sm text-purple-800 leading-relaxed whitespace-pre-wrap">
                                        {data.cveAnalysis}
                                    </p>
                                </div>
                            )}

                            {/* Steps */}
                            <div className="space-y-4">
                                {data.mitigationSteps.map((step, index) => (
                                    <MitigationStepCard
                                        key={index}
                                        step={step}
                                        isLast={index === data.mitigationSteps.length - 1}
                                        clientId={clientId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MitigationStepCard({ step, isLast, clientId }: { step: MitigationStep; isLast: boolean; clientId: number }) {
    const [created, setCreated] = useState(false);

    const createTaskMutation = trpc.remediationTasks.create.useMutation({
        onSuccess: () => {
            toast.success("Remediation task created");
            setCreated(true);
        },
        onError: (err) => toast.error("Failed to create task: " + err.message)
    });

    const handleCreateTask = () => {
        createTaskMutation.mutate({
            clientId,
            title: step.title,
            description: step.description,
            priority: step.priority.toLowerCase(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 1 week
        });
    };
    const priorityColors = {
        'Critical': 'bg-red-100 text-red-800 border-red-200',
        'High': 'bg-orange-100 text-orange-800 border-orange-200',
        'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Low': 'bg-green-100 text-green-800 border-green-200'
    };

    return (
        <div className="relative pl-8">
            {/* Timeline dot */}
            <div className="absolute left-0 top-0">
                <Circle className={`w-6 h-6 fill-white ${step.priority === 'Critical' ? 'text-red-500' : 'text-purple-600'}`} />
            </div>

            {/* Timeline line */}
            {!isLast && (
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                        {step.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded border font-medium ${priorityColors[step.priority] || priorityColors['Medium']}`}>
                        {step.priority}
                    </span>
                </div>

                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{step.description}</p>

                <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        {step.assignedTo && (
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Owner: {step.assignedTo}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Effort: {step.estimatedEffort}</span>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant={created ? "ghost" : "outline"}
                        className={`h-7 px-2 text-xs ${created ? 'text-green-600 hover:text-green-700 bg-green-50' : ''}`}
                        onClick={handleCreateTask}
                        disabled={created || createTaskMutation.isPending}
                    >
                        {created ? (
                            <>
                                <Check className="w-3 h-3 mr-1" /> Task Created
                            </>
                        ) : (
                            <>
                                {createTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                Create Task
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
