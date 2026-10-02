import React, { useState, useEffect } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { ArrowLeft, Save, AlertTriangle, HelpCircle, Loader2, Copy, ShieldCheck, FileSearch, FileText } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { useLocation, useParams } from "wouter";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@complianceos/ui/ui/separator";
import { Badge } from "@complianceos/ui/ui/badge";

type DpiaStatus = 'draft' | 'in_progress' | 'under_review' | 'completed';

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
    draft: { className: 'bg-slate-100 text-slate-600 font-bold', label: 'Draft' },
    in_progress: { className: 'bg-amber-100 text-amber-700 font-bold', label: 'In Progress' },
    under_review: { className: 'bg-sky-100 text-sky-700 font-bold', label: 'DPO Review' },
    completed: { className: 'bg-emerald-100 text-emerald-700 font-bold', label: 'DPO Approved' },
};

export default function DPIAQuestionnaire() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [location, setLocation] = useLocation();
    const params = useParams<{ id: string; dpiaId?: string }>();
    const dpiaId = params.dpiaId ? parseInt(params.dpiaId) : null;

    // Parse query params manually since wouter doesn't have useSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const templateIdStr = searchParams.get('templateId');
    const templateId = templateIdStr ? parseInt(templateIdStr) : null;
    const activityIdParam = searchParams.get('activityId');
    const activityIdFromUrl = activityIdParam ? parseInt(activityIdParam) : null;
    const activityNameParam = searchParams.get('activityName');

    const { data: templates, isLoading: templatesLoading } = trpc.privacyEnhancements.dpiaTemplates.list.useQuery({ clientId }, { enabled: !!clientId });
    // Existing record loaded from the relational DPIA registry
    const { data: existingRecord, isLoading: recordLoading } = trpc.dpia.get.useQuery(
        { id: dpiaId! },
        { enabled: !!clientId && !!dpiaId }
    );

    const [createdId, setCreatedId] = useState<number | null>(null);
    const activeRecordId = dpiaId ?? createdId;

    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(templateId);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [projectTitle, setProjectTitle] = useState("");
    const [projectDesc, setProjectDesc] = useState("");
    const [status, setStatus] = useState<DpiaStatus>("in_progress");
    const [activityId, setActivityId] = useState<number | null>(activityIdFromUrl);

    const storedQuestionnaire = (existingRecord?.questionnaireData as any) || null;
    const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)
        || (storedQuestionnaire?.templateId ? templates?.find(t => t.id === storedQuestionnaire.templateId) : null)
        || null;
    const templateMissing = (!!dpiaId && !!storedQuestionnaire) && !selectedTemplate;

    // Template questions fall back to the stored copy when the template was deleted
    const content: any = selectedTemplate?.templateContent || (storedQuestionnaire ? {
        screeningQuestions: storedQuestionnaire.screeningQuestions || [],
        riskFactors: storedQuestionnaire.riskFactors || [],
        mitigationMeasures: storedQuestionnaire.mitigationMeasures || [],
    } : null);

    // Populate from the existing record once loaded
    useEffect(() => {
        if (existingRecord) {
            setProjectTitle(existingRecord.title);
            setProjectDesc(existingRecord.description || "");
            setStatus((existingRecord.status as DpiaStatus) || "in_progress");
            if (existingRecord.activityId) setActivityId(existingRecord.activityId);
            if (storedQuestionnaire?.templateId) setSelectedTemplateId(storedQuestionnaire.templateId);
            setResponses(storedQuestionnaire?.answers || {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingRecord?.id]);

    // Linked ROPA activity name
    const { data: processes } = trpc.businessContinuity.processes.list.useQuery(
        { clientId },
        { enabled: !!clientId && !!activityId }
    );
    const linkedActivityName = activityNameParam
        ? decodeURIComponent(activityNameParam)
        : (activityId && processes ? processes.find((p: any) => p.id === activityId)?.name : null);

    const buildQuestionnaireData = () => {
        const affirmativeCount = Object.values(responses).filter(v => v === 'yes' || (typeof v === 'string' && v.length > 0 && v !== 'no')).length;
        const totalQuestions = content?.screeningQuestions?.length || 1;
        const calculatedScore = Math.min(100, Math.round((affirmativeCount / totalQuestions) * 100));
        return {
            projectDescription: projectDesc,
            answers: responses,
            screeningQuestions: content?.screeningQuestions || [],
            templateVersion: selectedTemplate?.version || 1,
            templateId: selectedTemplate?.id || storedQuestionnaire?.templateId || null,
            templateName: selectedTemplate?.name || storedQuestionnaire?.templateName || "Standard DPIA",
            riskFactors: content?.riskFactors || [],
            mitigationMeasures: content?.mitigationMeasures || [],
            score: calculatedScore,
            evaluatedAt: new Date().toISOString()
        };
    };

    const utils = trpc.useUtils();

    // Create (first save of a new assessment)
    const createMutation = trpc.dpia.create.useMutation();
    // Header-field sync (title/description/scope/status/lastReviewDate)
    const updateMutation = trpc.dpia.update.useMutation();
    // Questionnaire body save
    const saveResponsesMutation = trpc.dpia.saveResponses.useMutation();

    const handleSave = async (finalStatus?: DpiaStatus) => {
        if (!selectedTemplate && !activeRecordId) return;
        if (!projectTitle.trim()) {
            toast.error("Please provide an assessment title");
            return;
        }
        const targetStatus = finalStatus || status;
        const questionnaireData = buildQuestionnaireData();

        try {
            if (!activeRecordId) {
                const created = await createMutation.mutateAsync({
                    clientId,
                    title: projectTitle.trim(),
                    description: projectDesc.trim() || projectTitle.trim(),
                    scope: projectDesc.trim() || "See project description.",
                    identifiedRisks: (questionnaireData.riskFactors || []).map((r: any) => r.factor).join("; ") || "See questionnaire data.",
                    mitigationMeasures: (questionnaireData.mitigationMeasures || []).map((m: any) => m.measure).join("; ") || "See questionnaire data.",
                    activityId: activityId ?? undefined,
                    status: targetStatus,
                } as any);
                // Persist the questionnaire body immediately (create returns the row id)
                await saveResponsesMutation.mutateAsync({ id: created.id, responses: questionnaireData, status: targetStatus });
                setCreatedId(created.id);
            } else {
                await updateMutation.mutateAsync({
                    id: activeRecordId,
                    title: projectTitle.trim(),
                    description: projectDesc.trim(),
                    ...(targetStatus === 'completed' ? { status: 'completed' as const, lastReviewDate: new Date() } : {})
                } as any);
                await saveResponsesMutation.mutateAsync({
                    id: activeRecordId,
                    responses: questionnaireData,
                    ...(targetStatus === 'completed' ? {} : { status: targetStatus })
                });
            }
            setStatus(targetStatus);
            utils.dpia.list.invalidate({ clientId });
            utils.dpia.get.invalidate({ id: activeRecordId! });
            utils.privacy.getPrivacyStats.invalidate();
            toast.success(
                targetStatus === 'completed' ? "DPIA signed off and approved"
                    : targetStatus === 'under_review' ? "DPIA submitted for DPO review"
                        : "DPIA saved successfully"
            );
            if (targetStatus === 'completed') {
                setLocation(`/clients/${clientId}/privacy/dpia`);
            }
        } catch (err: any) {
            toast.error(`Failed to save DPIA: ${err?.message || 'Please try again.'}`);
        }
    };

    const copyDpiaReport = () => {
        const report = `DATA PROTECTION IMPACT ASSESSMENT (DPIA) AUDIT DOSSIER\n` +
            `============================================================\n` +
            `Project Title: ${projectTitle}\n` +
            `Client / Entity: #${clientId}\n` +
            `Status: ${status.toUpperCase()}\n` +
            `Linked Processing Activity: ${linkedActivityName || 'None'}\n` +
            `Evaluation Date: ${new Date().toLocaleDateString()}\n\n` +
            `1. Scope & Context:\n${projectDesc || 'N/A'}\n\n` +
            `2. Screening Answers:\n` +
            Object.entries(responses).map(([k, v]) => ` - [${k}]: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n') +
            `\n\n3. DPO Determination:\nProcessing compliant with GDPR Article 35. Supplementary safeguards enacted.`;

        navigator.clipboard.writeText(report);
        toast.success("DPIA Audit Report copied to clipboard!");
    };

    if (templatesLoading || (dpiaId && recordLoading)) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-brand-bright" />
                <p className="text-slate-400 font-medium animate-pulse">Loading assessment details...</p>
            </div>
        );
    }

    if (!activeRecordId && !selectedTemplate && !templateId) {
        return (
            <div className="p-12 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                            className="h-11 w-11 rounded-xl hover:bg-slate-100 text-slate-500"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="space-y-0.5">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">New DPIA Assessment</h1>
                            <p className="text-slate-500 text-lg">Select a template to begin</p>
                        </div>
                    </div>
                </div>

                {templates && templates.length > 0 ? (
                    <div className="grid gap-4 max-w-5xl mx-auto w-full">
                        {templates.map((template) => (
                            <Card
                                key={template.id}
                                className="cursor-pointer hover:shadow-lg hover:border-brand-bright/50 transition-all border-2 border-transparent"
                                onClick={() => setLocation(`/clients/${clientId}/privacy/dpia/new?templateId=${template.id}`)}
                            >
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                                        <p className="text-slate-500 text-sm mt-1">{template.description || 'No description'}</p>
                                    </div>
                                    <Button className="bg-brand-bright hover:bg-brand text-white font-bold">
                                        Select Template
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-12 space-y-4">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                        <h2 className="text-xl font-bold text-slate-900">No Templates Available</h2>
                        <p className="text-slate-500 max-w-sm mx-auto">Load the standard GDPR templates from the DPIA Manager to get started.</p>
                        <Button
                            variant="outline"
                            onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                            className="mt-4"
                        >
                            Return to DPIA Manager
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (!activeRecordId && !selectedTemplate) {
        return (
            <div className="p-12 text-center space-y-4 animate-in fade-in duration-500">
                <div className="mx-auto h-20 w-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Template Not Found</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">The requested assessment template could not be loaded or doesn't exist.</p>
                </div>
                <Button
                    variant="link"
                    onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                    className="text-brand-bright font-bold"
                >
                    Return to DPIA Manager
                </Button>
            </div>
        );
    }

    const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.in_progress;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                        className="h-11 w-11 rounded-xl hover:bg-slate-100 text-slate-500"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {activeRecordId ? "DPIA Assessment Dossier" : "Initialize Assessment"}
                            </h1>
                            <Badge className={statusInfo.className}>
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-lg">
                            Questionnaire: {selectedTemplate?.name || storedQuestionnaire?.templateName || 'Article 35 DPIA'}
                        </p>
                        {linkedActivityName && (
                            <Badge variant="outline" className="bg-sky-50 border-sky-200 text-sky-700 text-xs font-semibold gap-1">
                                <FileText className="w-3 h-3" />
                                Linked activity: {linkedActivityName}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={copyDpiaReport}
                        className="border-slate-300 hover:border-brand-bright text-slate-700 font-bold h-11 px-4 rounded-xl"
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Audit Report
                    </Button>
                    <Button
                        onClick={() => handleSave("under_review")}
                        disabled={createMutation.isPending || updateMutation.isPending || saveResponsesMutation.isPending || status === 'completed'}
                        variant="outline"
                        className="border-sky-300 text-sky-700 hover:bg-sky-50 font-bold h-11 px-4 rounded-xl"
                    >
                        <FileSearch className="mr-2 h-5 w-5" />
                        Submit for DPO Review
                    </Button>
                    <Button
                        onClick={() => handleSave("completed")}
                        disabled={createMutation.isPending || updateMutation.isPending || saveResponsesMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    >
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        DPO Sign-Off & Approve
                    </Button>
                    <Button
                        onClick={() => handleSave()}
                        disabled={createMutation.isPending || updateMutation.isPending || saveResponsesMutation.isPending}
                        className="bg-brand-bright hover:bg-brand text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
                    >
                        {(createMutation.isPending || updateMutation.isPending || saveResponsesMutation.isPending) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save Progress
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 max-w-5xl mx-auto w-full pb-20">
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-xl font-bold text-slate-900">Core Assessment Details</CardTitle>
                        <CardDescription className="text-slate-500">Define the organizational scope and title for this DPIA project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2.5">
                            <Label className="text-slate-700 font-bold">Assessment Instance Title</Label>
                            <Input
                                value={projectTitle}
                                onChange={e => setProjectTitle(e.target.value)}
                                placeholder="e.g. Q4 2024 CRM Integration Impact Assessment"
                                className="h-12 rounded-xl border-slate-200 focus:border-brand-bright focus:ring-brand-bright/20"
                            />
                            <p className="text-xs text-slate-400">Provide a descriptive name to distinguish this assessment from others using the same template.</p>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-slate-700 font-bold">Scope & Processing Context</Label>
                            <Textarea
                                className="min-h-[120px] rounded-xl border-slate-200 focus:border-brand-bright focus:ring-brand-bright/20 p-4"
                                placeholder="Describe the nature, scope, context and purposes of the data processing activity..."
                                value={projectDesc}
                                onChange={e => setProjectDesc(e.target.value)}
                            />
                        </div>
                        {activityId && (
                            <div className="space-y-2.5">
                                <Label className="text-slate-700 font-bold">Linked Processing Activity (ROPA)</Label>
                                <Select
                                    value={String(activityId)}
                                    onValueChange={(val) => setActivityId(parseInt(val))}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                        <SelectValue placeholder="Select ROPA activity..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(processes || []).map((p: any) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">Linking a ROPA activity ties this DPIA to the Art. 30 record for audit traceability.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-xl font-bold text-slate-900">Assessment Questionnaire</CardTitle>
                        <CardDescription className="text-slate-500">Respond to the screening questions to determine privacy risks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-8">
                        {content?.screeningQuestions?.length > 0 ? content.screeningQuestions.map((q: any) => (
                            <div key={q.id} className="space-y-4 group">
                                <Label className="flex items-start gap-3 text-lg font-bold text-slate-800 leading-snug">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-sky-50 flex items-center justify-center text-brand-bright text-[10px] shrink-0 border border-sky-100">
                                        ?
                                    </div>
                                    <span className="flex-1">
                                        {q.question}
                                        {q.required && <span className="text-rose-500 ml-1 font-black">*</span>}
                                    </span>
                                </Label>
                                {q.description && (
                                    <div className="ml-8 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 italic">
                                        {q.description}
                                    </div>
                                )}

                                <div className="ml-8">
                                    {q.type === 'text' && (
                                        <Input
                                            value={responses[q.id] || ''}
                                            onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                                            className="h-12 rounded-xl border-slate-200 focus:border-brand-bright focus:ring-brand-bright/20"
                                            placeholder="Provide detailed response..."
                                        />
                                    )}

                                    {q.type === 'boolean' && (
                                        <Select
                                            value={responses[q.id]}
                                            onValueChange={val => setResponses({ ...responses, [q.id]: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                                <SelectValue placeholder="Select binary response..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes" className="font-medium text-emerald-600">Yes / Affirmative</SelectItem>
                                                <SelectItem value="no" className="font-medium text-slate-600">No / Negative</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {q.type === 'select' && (
                                        <Select
                                            value={responses[q.id]}
                                            onValueChange={val => setResponses({ ...responses, [q.id]: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                                <SelectValue placeholder="Select from available options..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {q.options?.map((opt: string) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <Separator className="mt-8 opacity-50" />
                            </div>
                        )) : (
                            <div className="text-center py-12 text-slate-400 font-medium italic">
                                No questions are defined in this template configuration.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {content?.riskFactors && content.riskFactors.length > 0 && (
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-brand text-white overflow-hidden ring-1 ring-white/10">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-amber-400" />
                                Identified Risk Catalysts
                            </CardTitle>
                            <CardDescription className="text-white/60">Key factors that may increase the overall risk profile based on this template.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="grid gap-3">
                                {content.riskFactors.map((r: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-white/10 rounded-xl border border-white/10 flex gap-4 items-start">
                                        <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="font-bold text-white block">{r.factor}</span>
                                            {r.description && <span className="text-xs text-white/50 leading-relaxed block">{r.description}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
