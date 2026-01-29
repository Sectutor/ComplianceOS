
import React from "react";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";

const DOC_ITEMS = [
    "Information Security Policy",
    "Asset Inventory / Register",
    "Risk Methodology / Register",
    "Network Diagrams",
    "HR Onboarding Process",
    "Incident Response Plan",
    "Business Continuity Plan",
    "Vendor / Supplier List",
    "Access Control Policy"
];

export function WizardStep3_Docs({ data, onChange }: { data: any, onChange: (d: any) => void }) {
    const toggleItem = (item: string) => {
        const current = data?.existingDocs || [];
        const updated = current.includes(item)
            ? current.filter((i: string) => i !== item)
            : [...current, item];
        onChange({ ...data, existingDocs: updated });
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-neutral-500">Check off the documents you already have (even if they are drafts).</p>
            <div className="grid gap-3">
                {DOC_ITEMS.map((item) => (
                    <div key={item} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-neutral-50">
                        <Checkbox
                            id={item}
                            checked={data?.existingDocs?.includes(item)}
                            onCheckedChange={() => toggleItem(item)}
                        />
                        <Label htmlFor={item} className="cursor-pointer flex-1">{item}</Label>
                    </div>
                ))}
            </div>
        </div>
    );
}
