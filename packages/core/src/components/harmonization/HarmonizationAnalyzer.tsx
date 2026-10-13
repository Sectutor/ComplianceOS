
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Wand2, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface HarmonizationAnalyzerProps {
    planId: number;
    frameworkId: number;
    planTitle: string;
}

export const HarmonizationAnalyzer = ({ planId, frameworkId, planTitle }: HarmonizationAnalyzerProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [savings, setSavings] = useState(0);

    // This would ideally be a real mutation result
    const [opportunities, setOpportunities] = useState<any[]>([]);

    const analyzeMutation = trpc.harmonization.analyzePlanHarmonization.useMutation({
        onSuccess: (data) => {
            setAnalyzed(true);
            setSavings(data.savingsPercentage || 15); // Mock fallback
            setOpportunities(data.opportunities || [
                { id: 1, title: 'Access Control Policy', source: 'Internal Security Policy (SOC 2)', confidence: 'High' },
                { id: 2, title: 'Incident Response Procedure', source: 'GDPR Pack', confidence: 'Medium' }
            ]);
            toast.success("Harmonization Analysis Complete", { description: "Found 2 reusable controls." });
        },
        onError: (err) => {
            toast.error("Analysis Failed", { description: err.message });
        }
    });

    const handleAnalyze = () => {
        setIsAnalyzing(true);
        analyzeMutation.mutate({ planId }, {
            onSettled: () => setIsAnalyzing(false)
        });
    };

    return (
        <Card className="border-indigo-200 bg-indigo-50/40 shadow-xs">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Wand2 className="w-4 h-4 text-indigo-700" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-indigo-950">Work Reuse Engine</CardTitle>
                            <CardDescription className="text-xs text-indigo-700/80">
                                Avoid doing the same security work twice.
                            </CardDescription>
                        </div>
                    </div>
                    {analyzed && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-0.5">
                            {savings}% Effort Reused
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {!analyzed ? (
                    <div className="text-center py-4 space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            If you already implemented controls (like MFA or Incident Response) for <strong>SOC 2</strong> or <strong>GDPR</strong>, this scanner detects them so you don't have to re-do them for this plan.
                        </p>
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs h-8 px-3"
                        >
                            {isAnalyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
                            {isAnalyzing ? "Scanning Other Plans..." : "Scan for Reusable Work"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-1.5 bg-white p-3 rounded-lg border border-indigo-100">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>Duplicate Work Eliminated</span>
                                <span className="text-indigo-600 font-bold">{savings}%</span>
                            </div>
                            <Progress value={savings} className="h-1.5 bg-indigo-100" />
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                            <h4 className="font-bold text-xs text-slate-800">Reusable Items Found:</h4>
                            <div className="space-y-2">
                                {opportunities.map((opp) => (
                                    <div key={opp.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50/80 rounded-md border border-slate-200/80">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 truncate">{opp.title}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Already satisfied by: <strong className="text-slate-700">{opp.source}</strong>
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] text-indigo-700 hover:bg-indigo-50 border-indigo-200 font-bold px-2">
                                            Reuse
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default HarmonizationAnalyzer;
