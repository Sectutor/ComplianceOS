
import React from "react";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";

export function WizardStep1_Scope({ data, onChange }: { data: any, onChange: (d: any) => void }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Organizational Boundaries</Label>
                    <Textarea
                        placeholder="e.g., Entire Organization, Product Engineering Unit..."
                        value={data?.orgBoundaries || ""}
                        onChange={(e) => onChange({ ...data, orgBoundaries: e.target.value })}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Physical Locations</Label>
                    <Input
                        placeholder="e.g., HQ in London, Data Center in Dublin"
                        value={data?.locations || ""}
                        onChange={(e) => onChange({ ...data, locations: e.target.value })}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Key Technologies / Cloud Environments</Label>
                    <Textarea
                        placeholder="e.g., AWS Production Account (123456789), Azure AD..."
                        value={data?.technologies || ""}
                        onChange={(e) => onChange({ ...data, technologies: e.target.value })}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Out of Scope</Label>
                    <Textarea
                        placeholder="e.g., Marketing Website, Guest Wi-Fi..."
                        value={data?.outOfScope || ""}
                        onChange={(e) => onChange({ ...data, outOfScope: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
