
import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@complianceos/ui/ui/button';
import { Label } from '@complianceos/ui/ui/label';
import { Textarea } from '@complianceos/ui/ui/textarea';
import { Slider } from '@complianceos/ui/ui/slider';
import { Card, CardContent } from '@complianceos/ui/ui/card';
import { toast } from 'sonner';
import { Shield, AlertTriangle, Scale, Lock, ChevronRight, ChevronLeft } from 'lucide-react';

interface AIAssessmentWizardProps {
    aiSystemId: number;
    onComplete: () => void;
}

const steps = [
    { title: "Safety & Reliability", icon: Shield, color: "text-blue-500", key: "safetyImpact", scoreKey: "safetyScore" },
    { title: "Bias & Fairness", icon: Scale, color: "text-indigo-500", key: "biasImpact", scoreKey: "biasScore" },
    { title: "Privacy & Data", icon: Lock, color: "text-emerald-500", key: "privacyImpact", scoreKey: "privacyScore" },
    { title: "Security & Robustness", icon: AlertTriangle, color: "text-orange-500", key: "securityImpact", scoreKey: "securityScore" }
];

export const AIAssessmentWizard = ({ aiSystemId, onComplete }: AIAssessmentWizardProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        safetyImpact: '',
        safetyScore: 3,
        biasImpact: '',
        biasScore: 3,
        privacyImpact: '',
        privacyScore: 3,
        securityImpact: '',
        securityScore: 3,
        overallRiskScore: 50,
        recommendations: ''
    });
    const [useSuggestedScore, setUseSuggestedScore] = useState(true);

    const suggestedOverallRiskScore = useMemo(() => {
        const avg = (formData.safetyScore + formData.biasScore + formData.privacyScore + formData.securityScore) / 4;
        return Math.max(0, Math.min(100, Math.round(avg * 20)));
    }, [formData.safetyScore, formData.biasScore, formData.privacyScore, formData.securityScore]);

    useEffect(() => {
        if (!useSuggestedScore) return;
        if (formData.overallRiskScore === suggestedOverallRiskScore) return;
        setFormData((prev) => ({ ...prev, overallRiskScore: suggestedOverallRiskScore }));
    }, [useSuggestedScore, suggestedOverallRiskScore, formData.overallRiskScore]);

    const rubricBreakdown = useMemo(() => {
        const lines = [
            `Assessment rubric (0–5 each; suggested score: ${suggestedOverallRiskScore}/100):`,
            `- Safety & Reliability: ${formData.safetyScore}/5`,
            `- Bias & Fairness: ${formData.biasScore}/5`,
            `- Privacy & Data: ${formData.privacyScore}/5`,
            `- Security & Robustness: ${formData.securityScore}/5`,
            `- Overall Risk Score used: ${formData.overallRiskScore}/100${useSuggestedScore ? ' (suggested)' : ' (overridden)'}`
        ];
        return lines.join('\n');
    }, [
        suggestedOverallRiskScore,
        formData.safetyScore,
        formData.biasScore,
        formData.privacyScore,
        formData.securityScore,
        formData.overallRiskScore,
        useSuggestedScore
    ]);

    const utils = trpc.useUtils();
    const addAssessment = trpc.ai.systems.addImpactAssessment.useMutation({
        onSuccess: async () => {
            toast.success("Impact Assessment submitted successfully");
            await Promise.all([
                utils.ai.systems.getWithAssessments.invalidate(),
                utils.ai.systems.listAllAssessments.invalidate(),
                utils.ai.systems.getStats.invalidate(),
                utils.ai.systems.list.invalidate()
            ]);
            onComplete();
        }
    });

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        } else {
            const rec = (formData.recommendations || '').trimEnd();
            const withRubric = rec.includes('Assessment rubric') ? rec : (rec ? `${rec}\n\n${rubricBreakdown}` : rubricBreakdown);
            addAssessment.mutate({
                aiSystemId,
                safetyImpact: formData.safetyImpact,
                biasImpact: formData.biasImpact,
                privacyImpact: formData.privacyImpact,
                securityImpact: formData.securityImpact,
                overallRiskScore: formData.overallRiskScore,
                recommendations: withRubric
            });
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const StepIcon = currentStep < steps.length ? steps[currentStep].icon : ChevronRight;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                {steps.map((s, idx) => (
                    <div key={idx} className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${idx <= currentStep ? 'bg-primary border-primary text-white' : 'border-muted text-muted-foreground'
                            }`}>
                            {idx < currentStep ? '✓' : idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-0.5 w-12 mx-2 ${idx < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                        )}
                    </div>
                ))}
            </div>

            {currentStep < steps.length ? (
                <Card className="border-muted/30 shadow-sm animate-in slide-in-from-right-4 duration-300">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl bg-opacity-10 bg-current ${steps[currentStep].color}`}>
                                <StepIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">{steps[currentStep].title}</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Risk rating (0–5)</Label>
                                <span className="font-bold text-primary">
                                    {(formData as any)[steps[currentStep].scoreKey]} / 5
                                </span>
                            </div>
                            <Slider
                                value={[(formData as any)[steps[currentStep].scoreKey]]}
                                max={5}
                                step={1}
                                onValueChange={([val]) => setFormData({ ...formData, [steps[currentStep].scoreKey]: val })}
                                className="py-3"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use 0 for minimal impact/exposure and 5 for critical impact/exposure.
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                            How does this AI system address {steps[currentStep].title.toLowerCase()}? List known risks and mitigation strategies.
                        </p>
                        <Textarea
                            placeholder="Enter your assessment details here..."
                            className="min-h-[150px] text-base leading-relaxed"
                            value={(formData as any)[steps[currentStep].key]}
                            onChange={(e) => setFormData({ ...formData, [steps[currentStep].key]: e.target.value })}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-muted/30 shadow-sm animate-in slide-in-from-right-4 duration-300">
                    <CardContent className="pt-6 space-y-6">
                        <h3 className="text-xl font-bold">Final Review & recommendations</h3>

                        <div className="rounded-2xl border bg-muted/20 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-muted-foreground">Suggested Overall Risk Score (from rubric)</div>
                                <div className="font-bold text-primary">{suggestedOverallRiskScore} / 100</div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                <div>Safety: {formData.safetyScore}/5</div>
                                <div>Bias: {formData.biasScore}/5</div>
                                <div>Privacy: {formData.privacyScore}/5</div>
                                <div>Security: {formData.securityScore}/5</div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant={useSuggestedScore ? 'secondary' : 'outline'}
                                    onClick={() => setUseSuggestedScore(true)}
                                >
                                    Use Suggested
                                </Button>
                                <Button
                                    type="button"
                                    variant={!useSuggestedScore ? 'secondary' : 'outline'}
                                    onClick={() => setUseSuggestedScore(false)}
                                >
                                    Override Manually
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>Self-Assessed Overall Risk Score</Label>
                                <span className="font-bold text-primary">{formData.overallRiskScore} / 100</span>
                            </div>
                            <Slider
                                value={[formData.overallRiskScore]}
                                max={100}
                                step={1}
                                onValueChange={([val]) => setFormData({ ...formData, overallRiskScore: val })}
                                className="py-4"
                                disabled={useSuggestedScore}
                            />
                            {useSuggestedScore && (
                                <p className="text-xs text-muted-foreground">
                                    Manual override is disabled while using the suggested score.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Key Recommendations (MANAGE 1.1)</Label>
                            <Textarea
                                placeholder="State any immediate actions or required human-in-the-loop controls..."
                                className="min-h-[100px]"
                                value={formData.recommendations}
                                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNext} disabled={addAssessment.isPending}>
                    {currentStep < steps.length ? "Next Section" : "Submit Assessment"}
                    {currentStep < steps.length && <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
};
