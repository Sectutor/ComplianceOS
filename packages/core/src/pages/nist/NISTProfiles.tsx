import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Info, Target, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NISTProfiles() {
    const [targetTiers, setTargetTiers] = useState<Record<string, number>>({
        'GOVERN': 3,
        'IDENTIFY': 3,
        'PROTECT': 3,
        'DETECT': 2,
        'RESPOND': 2,
        'RECOVER': 2
    });

    const [currentTiers, setCurrentTiers] = useState<Record<string, number>>({
        'GOVERN': 2,
        'IDENTIFY': 2,
        'PROTECT': 2,
        'DETECT': 1,
        'RESPOND': 1,
        'RECOVER': 1
    });

    const TIERS = [
        { id: 1, name: "Partial", description: "Risk management is ad hoc and reactive." },
        { id: 2, name: "Risk Informed", description: "Risk management practices are approved but not fully established policy." },
        { id: 3, name: "Repeatable", description: "Risk management practices are formally approved and expressed as policy." },
        { id: 4, name: "Adaptive", description: "Risk management practices are adapted based on lessons learned and predictive indicators." }
    ];

    const FUNCTIONS = ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organizational Profiles</h1>
                <p className="text-slate-500 max-w-2xl mt-2">
                    Define your Current and Target Implementation Tiers. Profiles help you align your cybersecurity activities with business requirements, risk tolerance, and resources.
                </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {TIERS.map((tier) => (
                    <Card key={tier.id} className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-2">
                            <Badge variant="outline" className="w-fit mb-2 border-slate-300 text-slate-500">Tier {tier.id}</Badge>
                            <CardTitle className="text-lg">{tier.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">{tier.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Profile Matrix</CardTitle>
                    <CardDescription>Select your Current and Target Tiers for each NIST Function.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-lg">Function</th>
                                    {TIERS.map(t => (
                                        <th key={t.id} className="px-6 py-4 text-center">
                                            Tier {t.id} <br />
                                            <span className="font-normal normal-case opacity-70">{t.name}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {FUNCTIONS.map((func) => (
                                    <tr key={func} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{func}</td>
                                        {TIERS.map((tier) => {
                                            const isCurrent = currentTiers[func] === tier.id;
                                            const isTarget = targetTiers[func] === tier.id;

                                            return (
                                                <td key={tier.id} className="px-6 py-4 text-center relative">
                                                    <div className={cn(
                                                        "w-full h-12 rounded-lg border-2 border-dashed border-transparent flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-slate-200",
                                                        isCurrent && "bg-slate-100 border-slate-300 border-solid",
                                                        isTarget && "bg-blue-50 border-blue-200 border-solid",
                                                        isCurrent && isTarget && "bg-gradient-to-r from-slate-100 to-blue-50"
                                                    )}
                                                        onClick={() => {
                                                            // Simple toggle logic for demo
                                                            if (isTarget) setTargetTiers({ ...targetTiers, [func]: 0 });
                                                            else setTargetTiers({ ...targetTiers, [func]: tier.id });
                                                        }}
                                                    >
                                                        {isCurrent && (
                                                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300">Current</Badge>
                                                        )}
                                                        {isTarget && (
                                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Target</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Profiles
                </Button>
            </div>
        </div>
    );
}
