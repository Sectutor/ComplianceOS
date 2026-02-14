import React, { useState, useEffect } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { PrivacyLayout } from "./PrivacyLayout";
import { Button } from "@complianceos/ui/ui/button";
import { ArrowLeft, Save, AlertTriangle, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { useLocation } from "wouter";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@complianceos/ui/ui/separator";

export default function DPIAQuestionnaire() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [location, setLocation] = useLocation();

    // Parse query params manually since wouter doesn't have useSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const templateIdStr = searchParams.get('templateId');
    const templateId = templateIdStr ? parseInt(templateIdStr) : null;

    const { data: templates, isLoading: templatesLoading } = trpc.privacyEnhancements.dpiaTemplates.list.useQuery({ clientId }, { enabled: !!clientId });
    const selectedTemplate = templates?.find(t => t.id === templateId);

    const [responses, setResponses] = useState<Record<string, any>>({});
    const [projectTitle, setProjectTitle] = useState("");
    const [projectDesc, setProjectDesc] = useState("");

    useEffect(() => {
        if (selectedTemplate) {
            setProjectTitle(`${selectedTemplate.name} - ${new Date().toLocaleDateString()}`);
        }
    }, [selectedTemplate]);

    // Mutation to save assessment
    const saveMutation = trpc.privacy.saveAssessment.useMutation({
        onSuccess: () => {
            toast.success("DPIA saved successfully");
            setLocation(`/clients/${clientId}/privacy/dpia`);
        },
        onError: (err) => toast.error(`Failed to save: ${err.message}`)
    });

    const handleSave = () => {
        if (!selectedTemplate) return;
        if (!projectTitle) return toast.error("Please provide an assessment title");

        saveMutation.mutate({
            clientId,
            // We use a unique type string to allow multiple assessments of the same template
            type: `DPIA: ${projectTitle}`,
            responses: {
                projectDescription: projectDesc,
                answers: responses,
                templateVersion: selectedTemplate.version,
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name
            },
            riskLevel: "To Be Determined",
            recommendations: "Pending Review"
        });
    };

    if (templatesLoading) {
        return (
            <PrivacyLayout clientId={clientId}>
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            </PrivacyLayout>
        );
    }

    if (!selectedTemplate) {
        return (
            <PrivacyLayout clientId={clientId}>
                <div className="p-8 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-amber-500" />
                    <h2 className="text-xl font-bold">Template Not Found</h2>
                    <p>The requested assessment template could not be loaded.</p>
                    <Button variant="link" onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}>
                        Return to Dashboard
                    </Button>
                </div>
            </PrivacyLayout>
        );
    }

    const content = selectedTemplate.templateContent as any; // Type assertion

    return (
        <PrivacyLayout clientId={clientId}>
            <div className="space-y-6 max-w-4xl mx-auto pb-12">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Assessment</h1>
                        <p className="text-muted-foreground">Based on template: {selectedTemplate.name}</p>
                    </div>
                    <div className="ml-auto">
                        <Button onClick={handleSave} disabled={saveMutation.isLoading}>
                            {saveMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Assessment
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assessment Details</CardTitle>
                            <CardDescription>Define the scope of this DPIA.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Assessment Title</Label>
                                <Input
                                    value={projectTitle}
                                    onChange={e => setProjectTitle(e.target.value)}
                                    placeholder="e.g. HR System Upgrade - 2024"
                                />
                                <p className="text-xs text-muted-foreground">A unique name for this assessment instance.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Description of Processing</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    placeholder="Describe the nature, scope, context and purposes of the processing..."
                                    value={projectDesc}
                                    onChange={e => setProjectDesc(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Screening Questions</CardTitle>
                            <CardDescription>Answer the following questions to determine risks.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {content?.screeningQuestions?.map((q: any) => (
                                <div key={q.id} className="space-y-2 p-4 border rounded-md bg-slate-50/50">
                                    <Label className="flex items-center gap-2 text-base font-medium">
                                        {q.question}
                                        {q.required && <span className="text-red-500">*</span>}
                                    </Label>
                                    {q.description && (
                                        <p className="text-sm text-muted-foreground mb-2">{q.description}</p>
                                    )}

                                    <div className="pt-2">
                                        {q.type === 'text' && (
                                            <Input
                                                value={responses[q.id] || ''}
                                                onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                                            />
                                        )}

                                        {q.type === 'boolean' && (
                                            <Select
                                                value={responses[q.id]}
                                                onValueChange={val => setResponses({ ...responses, [q.id]: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="yes">Yes</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {q.type === 'select' && (
                                            <Select
                                                value={responses[q.id]}
                                                onValueChange={val => setResponses({ ...responses, [q.id]: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select option..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {q.options?.map((opt: string) => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!content?.screeningQuestions || content.screeningQuestions.length === 0) && (
                                <p className="text-muted-foreground italic">No screening questions defined in this template.</p>
                            )}
                        </CardContent>
                    </Card>

                    {content?.riskFactors && content.riskFactors.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Factors</CardTitle>
                                <CardDescription>Key risk factors associated with this template.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                    {content.riskFactors.map((r: any, idx: number) => (
                                        <li key={idx}>
                                            <span className="font-medium text-foreground">{r.factor}</span>
                                            {r.description && <span className="block text-xs mt-1 ml-1">— {r.description}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </PrivacyLayout>
    );
}
