import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Label } from '@complianceos/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Slider } from '@complianceos/ui/ui/slider';
import { trpc } from '@/lib/trpc';
import { Save, Calculator, AlertTriangle, ShieldCheck, Landmark } from 'lucide-react';
import { useToast } from '@complianceos/ui/ui/use-toast';

interface RiskAppetiteProps {
    clientId: number;
}

export function RiskAppetiteCalculator({ clientId }: RiskAppetiteProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    
    const { data: appetite, isLoading } = trpc.risks.getAppetite.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    
    const saveMutation = trpc.risks.saveAppetite.useMutation({
        onSuccess: () => {
            toast({ title: "Appetite Saved", description: "Your risk appetite boundaries have been updated." });
            utils.risks.getAppetite.invalidate({ clientId });
        }
    });

    const [financial, setFinancial] = useState<number>(100000);
    const [reputational, setReputational] = useState<string>('Minor');
    const [operational, setOperational] = useState<number>(4);
    const [overallLevel, setOverallLevel] = useState<string>('Medium');

    useEffect(() => {
        if (appetite) {
            setFinancial(appetite.financialThreshold || 100000);
            setReputational(appetite.reputationalThreshold || 'Minor');
            setOperational(appetite.operationalThreshold || 4);
            setOverallLevel(appetite.overallRiskLevel || 'Medium');
        }
    }, [appetite]);

    const handleSave = () => {
        saveMutation.mutate({
            clientId,
            financialThreshold: financial,
            reputationalThreshold: reputational,
            operationalThreshold: operational,
            overallRiskLevel: overallLevel
        });
    };

    const getAppetiteColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-emerald-500';
            case 'Medium': return 'text-amber-500';
            case 'High': return 'text-rose-500';
            default: return 'text-slate-500';
        }
    };

    return (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-indigo-600" />
                            Risk Appetite Boundaries
                        </CardTitle>
                        <CardDescription>
                            Define the maximum level of risk your organization is willing to accept.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={getAppetiteColor(overallLevel)}>
                        {overallLevel} Appetite
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Financial Threshold */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-slate-500" />
                            <Label className="font-semibold text-slate-700">Financial Impact Boundary</Label>
                        </div>
                        <div className="space-y-2">
                            <div className="text-2xl font-mono font-bold text-slate-900">
                                ${financial.toLocaleString()}
                            </div>
                            <Slider
                                value={[financial]}
                                min={1000}
                                max={1000000}
                                step={5000}
                                onValueChange={(v) => setFinancial(v[0])}
                                className="py-4"
                            />
                            <p className="text-xs text-muted-foreground">
                                Single event loss exceeding this amount is considered "Critical".
                            </p>
                        </div>
                    </div>

                    {/* Operational Threshold */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-slate-500" />
                            <Label className="font-semibold text-slate-700">Operational Downtime Limit</Label>
                        </div>
                        <div className="space-y-2">
                            <div className="text-2xl font-mono font-bold text-slate-900">
                                {operational} Hours
                            </div>
                            <Slider
                                value={[operational]}
                                min={1}
                                max={72}
                                step={1}
                                onValueChange={(v) => setOperational(v[0])}
                                className="py-4"
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum acceptable disruption for critical services.
                            </p>
                        </div>
                    </div>

                    {/* Reputational Impact */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-slate-500" />
                            <Label className="font-semibold text-slate-700">Reputational Tolerance</Label>
                        </div>
                        <Select value={reputational} onValueChange={setReputational}>
                            <SelectTrigger className="w-full bg-white font-medium">
                                <SelectValue placeholder="Select tolerance" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">Zero Tolerance (No public impact)</SelectItem>
                                <SelectItem value="Minor">Minor (Localized social media mention)</SelectItem>
                                <SelectItem value="Moderate">Moderate (Regional news/Trade press)</SelectItem>
                                <SelectItem value="Severe">Strategic (National news impact)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Overall Risk Profile */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <Label className="font-semibold text-slate-700">Target Risk Posture</Label>
                        </div>
                        <div className="flex gap-2">
                            {['Low', 'Medium', 'High'].map((level) => (
                                <Button
                                    key={level}
                                    variant={overallLevel === level ? 'default' : 'outline'}
                                    className={cn(
                                        "flex-1 font-bold",
                                        overallLevel === level && level === 'Low' && "bg-emerald-600 hover:bg-emerald-700",
                                        overallLevel === level && level === 'Medium' && "bg-amber-600 hover:bg-amber-700",
                                        overallLevel === level && level === 'High' && "bg-rose-600 hover:bg-rose-700"
                                    )}
                                    onClick={() => setOverallLevel(level)}
                                >
                                    {level}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                    <Button 
                        onClick={handleSave} 
                        disabled={saveMutation.isLoading}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Risk Appetite
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

import { cn } from '@/lib/utils';
import { Badge } from "@complianceos/ui/ui/badge";
import { Sparkles } from "lucide-react";
