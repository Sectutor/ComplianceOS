
import React from "react";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";

export function WizardStep4_Context({ data, onChange }: { data: any, onChange: (d: any) => void }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Business Model Description</Label>
                    <Textarea
                        placeholder="Briefly describe how the business makes money and delivers value..."
                        value={data?.businessModel || ""}
                        onChange={(e) => onChange({ ...data, businessModel: e.target.value })}
                        className="h-24"
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Regulatory Requirements</Label>
                    <Input
                        placeholder="e.g., GDPR, HIPAA, CCPA, PCI-DSS..."
                        value={data?.regulations || ""}
                        onChange={(e) => onChange({ ...data, regulations: e.target.value })}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Key Interested Parties</Label>
                    <Textarea
                        placeholder="Who cares about your security? (Customers, Investors, Regulators...)"
                        value={data?.parties || ""}
                        onChange={(e) => onChange({ ...data, parties: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
