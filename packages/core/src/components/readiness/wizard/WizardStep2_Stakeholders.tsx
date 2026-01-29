
import React from "react";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";

export function WizardStep2_Stakeholders({ data, onChange }: { data: any, onChange: (d: any) => void }) {
    const roles = ["Leadership / Sponsor", "IT / Engineering", "HR", "Legal / Compliance", "Procurement"];

    const updateRole = (role: string, name: string) => {
        onChange({ ...data, [role]: name });
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-neutral-500">Identify the key people who will be interviewed and responsible for evidence.</p>
            <div className="grid gap-4">
                {roles.map((role) => (
                    <div key={role} className="grid gap-2">
                        <Label>{role}</Label>
                        <Input
                            placeholder={`Name or email for ${role}`}
                            value={data?.[role] || ""}
                            onChange={(e) => updateRole(role, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
