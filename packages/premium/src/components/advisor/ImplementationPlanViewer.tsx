/**
 * Implementation Plan Viewer - Step-by-step control implementation
 */

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, Circle, Clock, User } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useImplementationPlan } from '@/hooks/useAdvisor';
import type { ImplementationStep } from '@/lib/advisor/types';

interface ImplementationPlanViewerProps {
    clientId: number;
    controlId: number;
    controlName: string;
    selectedTech?: string;
}

export default function ImplementationPlanViewer({
    clientId,
    controlId,
    controlName,
    selectedTech,
}: ImplementationPlanViewerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { generate, data, isLoading, error } = useImplementationPlan();

    const handleGenerate = () => {
        if (!isOpen) {
            setIsOpen(true);
            generate({ clientId, controlId, selectedTech });
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className="mt-4">
            <Button
                onClick={handleGenerate}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
            >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Generate Implementation Plan</span>
            </Button>

            {isOpen && (
                <div className="mt-4 border border-gray-200 rounded-lg bg-white p-6">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                            <span className="ml-2 text-gray-600">Generating plan for {controlName}...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                Failed to generate plan. Please try again.
                            </p>
                        </div>
                    )}

                    {data && (
                        <div>
                            {/* Header */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Implementation Plan: {controlName}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Est. Duration: {data.estimatedDuration}</span>
                                    </div>
                                    <div>
                                        <span>{data.steps.length} steps</span>
                                    </div>
                                </div>
                            </div>

                            {/* Prerequisites */}
                            {data.prerequisites && data.prerequisites.length > 0 && (
                                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-900 mb-2">Prerequisites</h4>
                                    <ul className="space-y-1">
                                        {data.prerequisites.map((prereq, i) => (
                                            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>{prereq}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Steps */}
                            <div className="space-y-4">
                                {data.steps.map((step, index) => (
                                    <StepCard key={index} step={step} isLast={index === data.steps.length - 1} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StepCard({ step, isLast }: { step: ImplementationStep; isLast: boolean }) {
    return (
        <div className="relative pl-8">
            {/* Timeline dot */}
            <div className="absolute left-0 top-0">
                <Circle className="w-6 h-6 text-purple-600 fill-purple-100" />
            </div>

            {/* Timeline line */}
            {!isLast && (
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Content */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                        Step {step.order}: {step.title}
                    </h4>
                    {step.estimatedDuration && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {step.estimatedDuration}
                        </span>
                    )}
                </div>

                <p className="text-sm text-gray-700 mb-3">{step.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                    {step.owner && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{step.owner}</span>
                        </div>
                    )}
                    {step.dueDate && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Due: {step.dueDate}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
