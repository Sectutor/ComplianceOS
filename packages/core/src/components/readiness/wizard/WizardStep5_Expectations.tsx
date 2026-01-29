
import React from "react";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { Label } from "@complianceos/ui/ui/label";
import { Card } from "@complianceos/ui/ui/card";
import { Check } from "lucide-react";

export function WizardStep5_Expectations({ data, onChange }: { data: any, onChange: (d: any) => void }) {
    return (
        <div className="space-y-6">
            <p className="text-sm text-neutral-500">What is your primary goal for this readiness assessment?</p>

            <RadioGroup
                value={data?.goal || "gap_scan"}
                onValueChange={(val) => onChange({ ...data, goal: val })}
                className="grid gap-4"
            >
                <Card className={`p-4 border-2 cursor-pointer transition-all ${data?.goal === "gap_scan" ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-neutral-300"}`}>
                    <div className="flex items-start space-x-3">
                        <RadioGroupItem value="gap_scan" id="gap_scan" className="mt-1" />
                        <div className="grid gap-1.5 flex-1">
                            <Label htmlFor="gap_scan" className="font-semibold text-lg cursor-pointer">Gap Scan Only</Label>
                            <p className="text-sm text-neutral-500">"We just want to know where we stand." - Quick identification of major missing controls.</p>
                        </div>
                        {data?.goal === "gap_scan" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                </Card>

                <Card className={`p-4 border-2 cursor-pointer transition-all ${data?.goal === "audit_ready" ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-neutral-300"}`}>
                    <div className="flex items-start space-x-3">
                        <RadioGroupItem value="audit_ready" id="audit_ready" className="mt-1" />
                        <div className="grid gap-1.5 flex-1">
                            <Label htmlFor="audit_ready" className="font-semibold text-lg cursor-pointer">Audit Ready (6 Months)</Label>
                            <p className="text-sm text-neutral-500">"We want to pass an audit." - Detailed roadmap, remediation planning, and evidence collection.</p>
                        </div>
                        {data?.goal === "audit_ready" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                </Card>
            </RadioGroup>
        </div>
    );
}
