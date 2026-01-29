import React from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Circle, Disc } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@complianceos/ui/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

interface WizardLayoutProps {
    currentStep: number;
    totalSteps: number;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onNext?: () => void;
    onBack?: () => void;
    isNextDisabled?: boolean;
    isLoading?: boolean;
    clientId: number;
}

const STEPS = [
    { id: 1, title: "Scope" },
    { id: 2, title: "Stakeholders" },
    { id: 3, title: "Documentation" },
    { id: 4, title: "Context" },
    { id: 5, title: "Expectations" },
];

export function WizardLayout({
    currentStep,
    totalSteps = 5,
    title,
    subtitle,
    children,
    onNext,
    onBack,
    isNextDisabled,
    isLoading,
    clientId
}: WizardLayoutProps) {
    return (
        <DashboardLayout>
            <div className="flex flex-col h-full -m-4 md:-m-6"> {/* Negative margin to counteract DashboardLayout padding for full width if desired, or just standard */}
                {/* Wizard Header - Make it sticky within the main area if needed, or just static */}
                <header className="bg-white border-b border-neutral-200 h-16 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href={`/clients/${clientId}/compliance`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5 text-neutral-500" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-neutral-900 leading-tight">ISO 27001 Readiness Assessment</h1>
                            <span className="text-xs text-neutral-500">Step {currentStep} of {totalSteps}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-neutral-600">
                            Save & Exit
                        </Button>
                    </div>
                </header>

                <div className="flex flex-1 min-h-[calc(100vh-4rem-3.5rem)]"> {/* approx height calc */}
                    {/* Sidebar - Progress - Changed from fixed to static/sticky */}
                    <div className="w-64 bg-white border-r border-neutral-200 p-6 hidden md:block shrink-0">
                        <nav className="space-y-1">
                            {STEPS.map((step) => {
                                const isActive = step.id === currentStep;
                                const isCompleted = step.id < currentStep;

                                return (
                                    <div
                                        key={step.id}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive ? "bg-primary/5 text-primary" : "text-neutral-500",
                                            isCompleted && "text-neutral-700"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : isActive ? (
                                            <Disc className="h-5 w-5 text-primary animate-pulse" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-neutral-300" />
                                        )}
                                        <span>{step.title}</span>
                                    </div>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
                            {subtitle && <p className="text-neutral-500 mt-1">{subtitle}</p>}
                        </div>

                        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 min-h-[400px]">
                            {children}
                        </div>

                        {/* Footer Navigation */}
                        <div className="flex items-center justify-between mt-8 pb-10">
                            <Button
                                variant="outline"
                                onClick={onBack}
                                disabled={currentStep === 1 || isLoading}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={onNext}
                                disabled={isNextDisabled || isLoading}
                                className="bg-primary hover:bg-primary/90 min-w-[100px]"
                            >
                                {isLoading ? "Saving..." : currentStep === totalSteps ? "Finish" : "Next Step"}
                            </Button>
                        </div>
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
