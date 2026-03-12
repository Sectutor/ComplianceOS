/**
 * NIS2 Entity Classification Wizard
 * 
 * Helps organizations determine their NIS2 classification:
 * - Essential Entity
 * - Important Entity
 * - Not Applicable
 * 
 * Based on NIS2 Directive criteria including:
 * - Sector of operation
 * - Size thresholds (employees, turnover)
 * - Criticality of services
 */

import React, { useState } from "react";
import {
    Building2,
    Shield,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Users,
    Euro,
    Server,
    Activity,
    Phone,
    CreditCard,
    Plane,
    Train,
    Power,
    Hospital,
    Droplets,
    Banknote,
    Globe,
    Search,
    Info,
    Truck,
    Apple,
    Factory,
    TestTube
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@complianceos/ui/ui/select";
import { toast } from "sonner";

// NIS2 Sectors - Annex I and II
const NIS2_SECTORS = {
    essential: [
        { id: "energy", name: "Energy", icon: Power, criteria: ["Electricity", "Gas", "Oil", "Hydrogen"] },
        { id: "transport", name: "Transport", icon: Plane, criteria: ["Air", "Rail", "Water", "Road"] },
        { id: "banking", name: "Banking", icon: Banknote, criteria: ["Credit institutions", "Investment firms"] },
        { id: "financial", name: "Financial Market Infrastructures", icon: CreditCard, criteria: ["Trading venues", "Central counterparties"] },
        { id: "health", name: "Health", icon: Hospital, criteria: ["Healthcare providers", "Pharmaceuticals", "Medical devices"] },
        { id: "drinking_water", name: "Drinking Water", icon: Droplets, criteria: ["Water supply", "Distribution"] },
        { id: "digital_infrastructure", name: "Digital Infrastructure", icon: Server, criteria: ["IXPs", "DNS", "TLD registries", "Cloud providers"] },
        { id: "ict_service", name: "ICT Service Management", icon: Server, criteria: ["MSPs", "Managed service providers"] },
    ],
    important: [
        { id: "postal", name: "Postal Services", icon: Users, criteria: ["Universal service providers"] },
        { id: "waste", name: "Waste Management", icon: Truck, criteria: ["Waste collection", "Disposal"] },
        { id: "chemicals", name: "Chemicals", icon: TestTube, criteria: ["Production", "Distribution"] },
        { id: "food", name: "Food", icon: Apple, criteria: ["Production", "Processing", "Distribution"] },
        { id: "manufacturing", name: "Manufacturing", icon: Building2, criteria: ["Critical products", "Machinery"] },
        { id: "digital_providers", name: "Digital Providers", icon: Globe, criteria: ["Online marketplaces", "Search engines", "Cloud services"] },
        { id: "research", name: "Research", icon: TestTube, criteria: ["Research organizations"] },
    ]
};

// Size thresholds
const SIZE_THRESHOLDS = {
    employees: { medium: 50, large: 250 },
    turnover: { medium: 10, large: 50 } // in millions EUR
};

interface ClassificationResult {
    classification: "essential" | "important" | "not_applicable" | "unknown";
    confidence: number;
    reasoning: string[];
    nextSteps: string[];
}

interface NIS2EntityClassificationWizardProps {
    clientId?: number;
    onComplete?: (result: ClassificationResult) => void;
}

export function NIS2EntityClassificationWizard({ clientId, onComplete }: NIS2EntityClassificationWizardProps) {
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({
        sector: "",
        subsector: "",
        employeeCount: "",
        annualTurnover: "",
        criticalServices: [] as string[],
        isDigitalProvider: false,
        isMSP: false,
        isOperator: false
    });

    const [result, setResult] = useState<ClassificationResult | null>(null);

    const totalSteps = 4;

    const handleAnswer = (key: string, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const calculateClassification = (): ClassificationResult => {
        const reasoning: string[] = [];
        const nextSteps: string[] = [];
        let classification: "essential" | "important" | "not_applicable" | "unknown" = "unknown";
        let confidence = 0;

        // Check if in a NIS2 sector
        const isInEssentialSector = Object.values(NIS2_SECTORS.essential).some(s => s.id === answers.sector);
        const isInImportantSector = Object.values(NIS2_SECTORS.important).some(s => s.id === answers.sector);

        if (!isInEssentialSector && !isInImportantSector && answers.sector !== "other") {
            reasoning.push("Organization is not in a sector covered by NIS2");
            classification = "not_applicable";
            confidence = 95;
            nextSteps.push("NIS2 may not apply - verify with legal counsel");
            nextSteps.push("Consider other regulations (GDPR, sector-specific)");
        } else {
            // Check size thresholds
            const employees = parseInt(answers.employeeCount) || 0;
            const turnover = parseInt(answers.annualTurnover) || 0;

            const isLarge = employees >= SIZE_THRESHOLDS.employees.large || turnover >= SIZE_THRESHOLDS.turnover.large;
            const isMedium = employees >= SIZE_THRESHOLDS.employees.medium || turnover >= SIZE_THRESHOLDS.turnover.medium;

            if (isInEssentialSector) {
                if (isLarge) {
                    classification = "essential";
                    confidence = 95;
                    reasoning.push("Organization operates in an Essential sector and exceeds large entity thresholds");
                } else if (isMedium) {
                    classification = "important";
                    confidence = 85;
                    reasoning.push("Organization operates in an Essential sector and meets medium size threshold");
                    nextSteps.push("May qualify as Important entity - verify with national authority");
                } else {
                    classification = "unknown";
                    confidence = 60;
                    reasoning.push("Entity below size thresholds - classification uncertain");
                    nextSteps.push("Contact competent authority for clarification");
                }
            } else if (isInImportantSector) {
                if (isLarge || isMedium) {
                    classification = "important";
                    confidence = 90;
                    reasoning.push("Organization operates in an Important sector and meets size thresholds");
                } else {
                    classification = "not_applicable";
                    confidence = 85;
                    reasoning.push("Organization in Important sector but below size thresholds");
                }
            }

            // Additional factors
            if (answers.isDigitalProvider) {
                classification = "important";
                confidence = Math.min(confidence + 5, 95);
                reasoning.push("As a digital service provider, qualifies as Important entity");
            }

            if (answers.isMSP) {
                classification = "essential";
                confidence = Math.min(confidence + 10, 95);
                reasoning.push("As an MSP/ICT service provider, qualifies as Essential entity");
            }
        }

        // Set next steps
        if (classification === "essential") {
            nextSteps.push("Register with competent authority");
            nextSteps.push("Implement full NIS2 compliance program");
            nextSteps.push("Prepare for potential fines up to €10M or 2% of global turnover");
        } else if (classification === "important") {
            nextSteps.push("Register with competent authority");
            nextSteps.push("Implement NIS2 security measures");
            nextSteps.push("Prepare for potential fines up to €7M or 1.4% of global turnover");
        }

        return { classification, confidence, reasoning, nextSteps };
    };

    const handleComplete = () => {
        const classificationResult = calculateClassification();
        setResult(classificationResult);
        setStep(5);
        if (onComplete) {
            onComplete(classificationResult);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">What sector does your organization operate in?</h3>
                            <RadioGroup
                                value={answers.sector}
                                onValueChange={(v) => handleAnswer("sector", v)}
                                className="grid grid-cols-1 md:grid-cols-2 gap-3"
                            >
                                {[
                                    ...NIS2_SECTORS.essential.map(s => ({ ...s, type: "Essential" })),
                                    ...NIS2_SECTORS.important.map(s => ({ ...s, type: "Important" }))
                                ].map((sector) => (
                                    <div key={sector.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={sector.id} id={sector.id} />
                                        <Label htmlFor={sector.id} className="flex items-center gap-2 cursor-pointer">
                                            <Badge className={sector.type === "Essential" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                                                {sector.type}
                                            </Badge>
                                            <span>{sector.name}</span>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Size Criteria</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                NIS2 uses size thresholds to determine entity classification. Please provide your organization's figures.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="employees">Number of Employees</Label>
                                <Input
                                    id="employees"
                                    type="number"
                                    placeholder="e.g., 150"
                                    value={answers.employeeCount}
                                    onChange={(e) => handleAnswer("employeeCount", e.target.value)}
                                    className="mt-1"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Medium: 50+ | Large: 250+
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="turnover">Annual Turnover (€ millions)</Label>
                                <Input
                                    id="turnover"
                                    type="number"
                                    placeholder="e.g., 25"
                                    value={answers.annualTurnover}
                                    onChange={(e) => handleAnswer("annualTurnover", e.target.value)}
                                    className="mt-1"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Medium: €10M+ | Large: €50M+
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-amber-800">Size Thresholds</h4>
                                    <p className="text-sm text-amber-700 mt-1">
                                        If your organization meets EITHER the employee OR turnover threshold,
                                        you may be classified as an NIS2 entity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Additional Factors</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Some specific roles automatically qualify for NIS2 classification regardless of size.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Server className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="font-medium">ICT Service Provider / MSP</Label>
                                        <p className="text-sm text-slate-500">Managed service provider or managed security provider</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={answers.isMSP}
                                    onChange={(e) => handleAnswer("isMSP", e.target.checked)}
                                    className="h-5 w-5"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Globe className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="font-medium">Digital Service Provider</Label>
                                        <p className="text-sm text-slate-500">Online marketplace, search engine, or cloud service</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={answers.isDigitalProvider}
                                    onChange={(e) => handleAnswer("isDigitalProvider", e.target.checked)}
                                    className="h-5 w-5"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Review Your Answers</h3>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Sector:</span>
                                <span className="font-medium">{answers.sector || "Not selected"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Employees:</span>
                                <span className="font-medium">{answers.employeeCount || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Annual Turnover:</span>
                                <span className="font-medium">€{answers.annualTurnover || "0"}M</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">ICT Service Provider:</span>
                                <span className="font-medium">{answers.isMSP ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Digital Provider:</span>
                                <span className="font-medium">{answers.isDigitalProvider ? "Yes" : "No"}</span>
                            </div>
                        </div>

                        <Button onClick={handleComplete} className="w-full">
                            Calculate Classification
                        </Button>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${result?.classification === "essential" ? "bg-purple-100" :
                                result?.classification === "important" ? "bg-blue-100" :
                                    result?.classification === "not_applicable" ? "bg-green-100" : "bg-slate-100"
                                }`}>
                                {result?.classification === "essential" && <Shield className="h-10 w-10 text-purple-600" />}
                                {result?.classification === "important" && <Shield className="h-10 w-10 text-blue-600" />}
                                {result?.classification === "not_applicable" && <CheckCircle2 className="h-10 w-10 text-green-600" />}
                                {result?.classification === "unknown" && <AlertTriangle className="h-10 w-10 text-amber-600" />}
                            </div>

                            <Badge className={`mb-2 ${result?.classification === "essential" ? "bg-purple-500" :
                                result?.classification === "important" ? "bg-blue-500" :
                                    result?.classification === "not_applicable" ? "bg-green-500" : "bg-amber-500"
                                }`}>
                                {result?.classification === "essential" && "ESSENTIAL ENTITY"}
                                {result?.classification === "important" && "IMPORTANT ENTITY"}
                                {result?.classification === "not_applicable" && "NOT APPLICABLE"}
                                {result?.classification === "unknown" && "REQUIRES VERIFICATION"}
                            </Badge>

                            <p className="text-2xl font-bold text-slate-900">
                                Confidence: {result?.confidence}%
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">Reasoning</h4>
                                <ul className="space-y-2">
                                    {result?.reasoning.map((r, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                            <span>{r}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">Next Steps</h4>
                                <ul className="space-y-2">
                                    {result?.nextSteps.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5" />
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-800">Important Notice</h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        This is an initial assessment only. Final classification is determined by
                                        the relevant national competent authority. Consult with legal counsel
                                        for definitive determination.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Card className="border-slate-200/60 shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold">NIS2 Entity Classification</CardTitle>
                        <CardDescription>Determine your NIS2 entity type</CardDescription>
                    </div>
                    <Badge variant="outline">Step {step} of {totalSteps}</Badge>
                </div>
                <Progress value={(step / totalSteps) * 100} className="mt-4" />
            </CardHeader>

            <CardContent>
                {renderStep()}

                {step < 5 && (
                    <div className="flex justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                            disabled={step === totalSteps}
                        >
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                )}

                {step === 5 && (
                    <div className="flex justify-center mt-8">
                        <Button onClick={() => { setStep(1); setResult(null); }}>
                            Start Over
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper icons no longer needed - imported from lucide-react

export default NIS2EntityClassificationWizard;
