
import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WizardLayout } from "@/components/readiness/WizardLayout";
import { WizardStep1_Scope } from "@/components/readiness/wizard/WizardStep1_Scope";
import { WizardStep2_Stakeholders } from "@/components/readiness/wizard/WizardStep2_Stakeholders";
import { WizardStep3_Docs } from "@/components/readiness/wizard/WizardStep3_Docs";
import { WizardStep4_Context } from "@/components/readiness/wizard/WizardStep4_Context";
import { WizardStep5_Expectations } from "@/components/readiness/wizard/WizardStep5_Expectations";
import { toast } from "sonner"; // Fixed import

export default function ReadinessWizardPage() {
    const [match, params] = useRoute("/clients/:clientId/readiness/wizard");
    const [, navigate] = useLocation();
    const clientId = parseInt(params?.clientId || "0");

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        scope: {},
        stakeholders: {},
        existingPolicies: {},
        context: {},
        expectations: {}
    });

    // Load existing state
    const { data: serverState, isLoading } = trpc.readiness.getState.useQuery(
        { clientId },
        {
            enabled: !!clientId,
            onSuccess: (data) => {
                if (data) {
                    setCurrentStep(data.currentStep || 1);
                    setFormData({
                        scope: data.scopeDetails || {},
                        stakeholders: data.stakeholders || {},
                        existingPolicies: data.existingPolicies || {},
                        context: data.businessContext || {},
                        expectations: data.maturityExpectations || {}
                    });
                }
            }
        }
    );

    const mutation = trpc.readiness.createOrUpdate.useMutation({
        onSuccess: () => {
            // toast.success("Progress saved");
        },
        onError: (err) => {
            toast.error("Error saving progress", { description: err.message });
        }
    });

    const handleDataChange = (stepKey: keyof typeof formData, newData: any) => {
        setFormData(prev => ({ ...prev, [stepKey]: newData }));
    };

    const handleNext = async () => {
        // Save current step data before moving
        await mutation.mutateAsync({
            clientId,
            step: currentStep === 5 ? 5 : currentStep + 1,
            data: {
                scope: formData.scope,
                stakeholders: formData.stakeholders,
                existingPolicies: formData.existingPolicies,
                context: formData.context,
                expectations: formData.expectations
            }
        });

        if (currentStep < 5) {
            setCurrentStep(curr => curr + 1);
        } else {
            toast.success("Assessment Setup Complete!", { description: "Redirecting to Dashboard..." });
            // TODO: Navigate to the main Readiness Dashboard (After Phase)
            // navigate(`/clients/${clientId}/readiness/dashboard`);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(curr => curr - 1);
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return <WizardStep1_Scope
                    data={formData.scope}
                    onChange={(d) => handleDataChange("scope", d)}
                />;
            case 2:
                return <WizardStep2_Stakeholders
                    data={formData.stakeholders}
                    onChange={(d) => handleDataChange("stakeholders", d)}
                />;
            case 3:
                return <WizardStep3_Docs
                    data={formData.existingPolicies}
                    onChange={(d) => handleDataChange("existingPolicies", d)}
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
            default: return null;
        }
    };

    const titles = [
        "Define Scope",
        "Identify Stakeholders",
        "Gather Existing Documentation",
        "Understand Business Context",
        "Clarify Maturity Expectations"
    ];

    const subtitles = [
        "What parts of the business are you trying to certify?",
        "Who needs to be involved in interviews and evidence collection?",
        "Collect what exists - don't aim for perfection yet.",
        "Define the environment your security system operates in.",
        "Set your goals for this readiness assessment."
    ];

    if (isLoading) return <div className="p-10 flex justify-center">Loading assessment state...</div>;

    return (
        <WizardLayout
            currentStep={currentStep}
            totalSteps={5}
            title={titles[currentStep - 1]}
            subtitle={subtitles[currentStep - 1]}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={mutation.isPending}
            clientId={clientId}
        >
            {getStepContent()}
        </WizardLayout>
    );
}
