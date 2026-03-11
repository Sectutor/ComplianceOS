
import { useState, useEffect } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Progress } from "@complianceos/ui/ui/progress";
import { Badge } from "@complianceos/ui/ui/badge";
import { Save, Loader2, CheckCircle2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { PageGuide } from "@/components/PageGuide";
import { AUTOMATED_AUDITORS } from "@/lib/cyber/auditors";

const NIS2_CHECKLIST = [
    {
        id: "policies",
        category: "1. Information Systems Security Policies",
        questions: [
            { id: "nis2_1.1", text: "Do you have a formal Policy on the security of network and information systems? (1.1)", measureId: "1.1" },
            { id: "nis2_1.2", text: "Are roles, responsibilities and authorities for security clearly defined? (1.2)", measureId: "1.2" }
        ]
    },
    {
        id: "risk_mgmt",
        category: "2. Risk Management Framework",
        questions: [
            { id: "nis2_2.1", text: "Is there a documented Risk management framework? (2.1)", measureId: "2.1" },
            { id: "nis2_2.2", text: "Is there regular compliance monitoring of security measures? (2.2)", measureId: "2.2" },
            { id: "nis2_2.3", text: "Is an independent review of security conducted regularly? (2.3)", measureId: "2.3" }
        ]
    },
    {
        id: "incident_handling",
        category: "3. Incident Handling",
        questions: [
            { id: "nis2_3.1", text: "Is there a documented Incident handling policy? (3.1)", measureId: "3.1" },
            { id: "nis2_3.2", text: "Are monitoring and logging implemented for all systems? (3.2)", measureId: "3.2" },
            { id: "nis2_3.3", text: "Is there a process for event reporting? (3.3)", measureId: "3.3" },
            { id: "nis2_3.4", text: "Are events assessed and classified for potential impact? (3.4)", measureId: "3.4" },
            { id: "nis2_3.5", text: "Do you have formal incident response procedures? (3.5)", measureId: "3.5" },
            { id: "nis2_3.6", text: "Are post-incident reviews conducted to improve security? (3.6)", measureId: "3.6" }
        ]
    },
    {
        id: "bcp",
        category: "4. Business Continuity",
        questions: [
            { id: "nis2_4.1", text: "Is there a Business continuity and disaster recovery plan? (4.1)", measureId: "4.1" },
            { id: "nis2_4.2", text: "Is backup management enforced and tested? (4.2)", measureId: "4.2" },
            { id: "nis2_4.3", text: "Are crisis management procedures established? (4.3)", measureId: "4.3" }
        ]
    },
    {
        id: "supply_chain",
        category: "5. Supply Chain Security",
        questions: [
            { id: "nis2_5.1", text: "Is there a Supply chain security policy for third-party risks? (5.1)", measureId: "5.1" },
            { id: "nis2_5.2", text: "Maintain a directory of suppliers and service providers? (5.2)", measureId: "5.2" }
        ]
    },
    {
        id: "secure_dev",
        category: "6. Secure Development & Systems",
        questions: [
            { id: "nis2_6.1", text: "Security addressed in acquisition of ICT services and products? (6.1)", measureId: "6.1" },
            { id: "nis2_6.2", text: "Is a Secure development life cycle (SDLC) followed? (6.2)", measureId: "6.2" },
            { id: "nis2_6.3", text: "Is there formal configuration management? (6.3)", measureId: "6.3" },
            { id: "nis2_6.4", text: "Are change management, repairs and maintenance controlled? (6.4)", measureId: "6.4" },
            { id: "nis2_6.5", text: "Is regular security testing conducted? (6.5)", measureId: "6.5" },
            { id: "nis2_6.6", text: "Is a security patch management process in place? (6.6)", measureId: "6.6" },
            { id: "nis2_6.7", text: "Are network security measures implemented? (6.7)", measureId: "6.7" },
            { id: "nis2_6.8", text: "Is network segmentation enforced? (6.8)", measureId: "6.8" },
            { id: "nis2_6.9", text: "Protection against malicious/unauthorised software active? (6.9)", measureId: "6.9" },
            { id: "nis2_6.10", text: "Is there a process for vulnerability handling and disclosure? (6.10)", measureId: "6.10" }
        ]
    },
    {
        id: "effectiveness",
        category: "7. Assessment of Effectiveness",
        questions: [
            { id: "nis2_7.1", text: "Are there procedures to assess effectiveness of security? (7.1)", measureId: "7.1" }
        ]
    },
    {
        id: "hygiene",
        category: "8. Basic Cyber Hygiene & Training",
        questions: [
            { id: "nis2_8.1", text: "Are awareness raising and basic cyber hygiene practiced? (8.1)", measureId: "8.1" },
            { id: "nis2_8.2", text: "Is specialized security training provided to key staff? (8.2)", measureId: "8.2" }
        ]
    },
    {
        id: "cryptography",
        category: "9. Cryptography",
        questions: [
            { id: "nis2_9.1", text: "Are cryptography policies and encryption used? (9.1)", measureId: "9.1" }
        ]
    },
    {
        id: "hr_security",
        category: "10. Human Resources Security",
        questions: [
            { id: "nis2_10.1", text: "Are human resources security measures in place? (10.1)", measureId: "10.1" },
            { id: "nis2_10.2", text: "Is verification of background conducted for staff? (10.2)", measureId: "10.2" },
            { id: "nis2_10.3", text: "Termination or change of employment procedures exist? (10.3)", measureId: "10.3" },
            { id: "nis2_10.4", text: "Is there a formal disciplinary process for security? (10.4)", measureId: "10.4" }
        ]
    },
    {
        id: "access_control",
        category: "11. Access Control",
        questions: [
            { id: "nis2_11.1", text: "Is an access control policy documented and enforced? (11.1)", measureId: "11.1" },
            { id: "nis2_11.2", text: "Is management of access rights performed regularly? (11.2)", measureId: "11.2" },
            { id: "nis2_11.3", text: "Are privileged accounts and system admin accounts managed? (11.3)", measureId: "11.3" },
            { id: "nis2_11.4", text: "Are user responsibilities for security documented? (11.4)", measureId: "11.4" },
            { id: "nis2_11.5", text: "Is system and device authentication properly configured? (11.5)", measureId: "11.5" },
            { id: "nis2_11.6", text: "Are strong authentication mechanisms in place? (11.6)", measureId: "11.6" },
            { id: "nis2_11.7", text: "Is multi-factor authentication (MFA) used where needed? (11.7)", measureId: "11.7" }
        ]
    },
    {
        id: "asset_mgmt",
        category: "12. Asset Management",
        questions: [
            { id: "nis2_12.1", text: "Is asset classification implemented? (12.1)", measureId: "12.1" },
            { id: "nis2_12.4", text: "Is there an up-to-date asset inventory? (12.4)", measureId: "12.4" }
        ]
    },
    {
        id: "utilities",
        category: "13. Supporting Utilities & Physical Security",
        questions: [
            { id: "nis2_13.1", text: "Are supporting utilities (power, water) resilient? (13.1)", measureId: "13.1" },
            { id: "nis2_13.2", text: "Protection against physical and environmental threats? (13.2)", measureId: "13.2" }
        ]
    }
];

export default function CyberAssessment() {
    const [match, params] = useRoute("/clients/:clientId/cyber/assessment");
    const urlClientId = params?.clientId ? parseInt(params.clientId) : null;
    const { selectedClientId: contextClientId, setSelectedClientId } = useClientContext();

    // Use URL clientId if available, otherwise fall back to context
    const selectedClientId = urlClientId || contextClientId;

    // Debug logging
    useEffect(() => {
        console.log('[NIS2 Debug] urlClientId:', urlClientId);
        console.log('[NIS2 Debug] contextClientId:', contextClientId);
        console.log('[NIS2 Debug] selectedClientId:', selectedClientId);
    }, [urlClientId, contextClientId, selectedClientId]);

    // Sync URL clientId to context when it changes
    useEffect(() => {
        if (urlClientId && urlClientId !== contextClientId) {
            console.log('[NIS2 Debug] Syncing urlClientId to context:', urlClientId);
            setSelectedClientId(urlClientId);
        }
    }, [urlClientId, contextClientId, setSelectedClientId]);

    // Start with empty responses - onSuccess will load saved data
    const [responses, setResponses] = useState<Record<string, { answer: string; notes?: string; owner?: string; dueDate?: string }>>({});
    const [score, setScore] = useState(0);

    // Fetch existing data - onSuccess will populate responses from saved data
    const { data: assessment, isLoading, refetch } = trpc.cyber.getAssessment.useQuery(
        { clientId: selectedClientId || 0 },
        {
            enabled: !!selectedClientId,
            onSuccess: (data: any) => {
                console.log('[NIS2 Query] onSuccess, full data:', JSON.stringify(data).substring(0, 500));
                console.log('[NIS2 Query] data.responses:', data?.responses);
                console.log('[NIS2 Query] data.score:', data?.score);
                console.log('[NIS2 Query] data.responses keys:', data?.responses ? Object.keys(data.responses) : 'none');
                // Log the actual structure of first response
                if (data?.responses) {
                    const firstKey = Object.keys(data.responses)[0];
                    if (firstKey) {
                        console.log('[NIS2 Query] First response structure:', JSON.stringify(data.responses[firstKey]));
                    }
                    // Also check nis2_1.1 specifically
                    if (data.responses['nis2_1.1']) {
                        console.log('[NIS2 Query] nis2_1.1 data:', JSON.stringify(data.responses['nis2_1.1']));
                    }
                }
                if (data?.responses && typeof data.responses === 'object') {
                    console.log('[NIS2 Query] Setting responses from query, keys:', Object.keys(data.responses));
                    setResponses(data.responses as any);
                    console.log('[NIS2 Query] Set responses from query');
                } else {
                    console.log('[NIS2 Query] No responses in data or invalid format');
                }
            }
        }
    );

    // Mutation with verification
    const saveMutation = trpc.cyber.saveAssessment.useMutation({
        onSuccess: (data) => {
            console.log('[NIS2 Save] Success:', data);
            toast.success("Assessment saved successfully");
            // Verify the data was saved by refetching
            refetch().then(() => {
                console.log('[NIS2 Save] Data refetched successfully after save');
            }).catch((err) => {
                console.error('[NIS2 Save] Error refetching data:', err);
            });
        },
        onError: (e) => {
            console.error('[NIS2 Save] Error:', e);
            console.error('[NIS2 Save] Error details:', e.message, e.stack);
            toast.error(e.message || 'Failed to save assessment');
        }
    });

    const syncMutation = trpc.cyber.autoSyncNis2FromIso.useMutation({
        onSuccess: (data) => {
            if (data.syncedMeasures > 0) {
                toast.success(`Synced ${data.syncedMeasures} measures from ISO 27001`, {
                    description: data.measures.join(', ')
                });
                refetch();
            } else {
                toast.info("No new changes detected from ISO 27001");
            }
        },
        onError: (e) => {
            toast.error("Failed to sync: " + e.message);
        }
    });

    // Debug logging
    useEffect(() => {
        console.log('[NIS2 Debug] selectedClientId:', selectedClientId);
        console.log('[NIS2 Debug] assessment data:', assessment);
        console.log('[NIS2 Debug] assessment responses:', assessment?.responses);
        console.log('[NIS2 Debug] current responses state:', responses);
        console.log('[NIS2 Debug] current score:', score);
    }, [selectedClientId, assessment, responses, score]);

    // Calculate score - derive from assessment data when available, otherwise from local state
    const calculateScore = (resps: typeof responses) => {
        let yesCount = 0;
        let totalQuestions = 0;

        NIS2_CHECKLIST.forEach(cat => {
            cat.questions.forEach(q => {
                totalQuestions++;
                if (resps[q.id]?.answer === "yes") yesCount++;
                if (resps[q.id]?.answer === "partial") yesCount += 0.5;
            });
        });

        return totalQuestions > 0 ? Math.round((yesCount / totalQuestions) * 100) : 0;
    };

    // Update score when responses change
    useEffect(() => {
        const newScore = calculateScore(responses);
        console.log('[NIS2 Score] Calculated from responses:', newScore);
        setScore(newScore);
    }, [responses]);

    // Sync assessment data to responses state
    useEffect(() => {
        if (assessment?.responses && typeof assessment.responses === 'object' && Object.keys(assessment.responses).length > 0) {
            console.log('[NIS2 Effect] Syncing assessment.responses to state, keys:', Object.keys(assessment.responses));
            setResponses(assessment.responses as any);
            console.log('[NIS2 Effect] Synced assessment.responses');
        }
    }, [assessment]);

    // Also update score when assessment data loads
    useEffect(() => {
        if (assessment?.responses && Object.keys(assessment.responses).length > 0) {
            const newScore = calculateScore(assessment.responses);
            console.log('[NIS2 Score] Calculated from assessment:', newScore);
            setScore(newScore);
        }
    }, [assessment]);

    const handleAnswerChange = (qId: string, val: string) => {
        setResponses(prev => ({
            ...prev,
            [qId]: { ...prev[qId], answer: val, notes: prev[qId]?.notes || "" }
        }));
    };

    const handleNotesChange = (qId: string, val: string) => {
        setResponses(prev => ({
            ...prev,
            [qId]: { ...prev[qId], answer: prev[qId]?.answer || "not_started", notes: val }
        }));
    };

    const handleAutomatedAudit = async (qId: string, measureId: string) => {
        const auditor = AUTOMATED_AUDITORS.find(a => a.targetMeasureId === measureId);
        if (!auditor) return;

        toast.promise(auditor.checkLogic(selectedClientId!, {}), {
            loading: `Running automated audit: ${auditor.description}`,
            success: (result) => {
                const answer = result.status === 'passed' ? 'yes' : result.status === 'failed' ? 'partial' : 'partial';
                const evidenceStr = JSON.stringify(result.evidence);
                const notes = `[Automated Audit ${new Date().toLocaleDateString()}] Outcome: ${result.status.toUpperCase()}. Evidence: ${evidenceStr}`;

                setResponses(prev => ({
                    ...prev,
                    [qId]: { ...prev[qId], answer, notes }
                }));
                return `Audit complete: ${result.status.toUpperCase()}`;
            },
            error: "Automated audit failed"
        });
    };

    const handleSave = () => {
        console.log('[NIS2 Save] handleSave called, selectedClientId:', selectedClientId, 'type:', typeof selectedClientId);
        console.log('[NIS2 Save] responses count:', Object.keys(responses).length);
        console.log('[NIS2 Save] score:', score);

        if (!selectedClientId) {
            console.error('[NIS2 Save] No clientId, aborting');
            toast.error('No client selected');
            return;
        }

        // Ensure clientId is a number
        const clientId = typeof selectedClientId === 'string' ? parseInt(selectedClientId, 10) : selectedClientId;

        if (!clientId || isNaN(clientId)) {
            console.error('[NIS2 Save] Invalid clientId after conversion:', clientId);
            toast.error('Invalid client ID');
            return;
        }

        const status = score === 100 ? "completed" : score > 0 ? "in_progress" : "not_started";
        const payload = {
            clientId: clientId,
            responses,
            score,
            status
        };
        console.log('[NIS2 Save] Sending payload:', payload);
        saveMutation.mutate(payload);
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <PageGuide
                    title="NIS2 Compliance Checklist"
                    description="Assess your readiness against Article 21 requirements."
                    rationale="Regular self-assessment is mandatory to ensure ongoing compliance with NIS2 security measures."
                    howToUse={[
                        { step: "Assess", description: "Answer questions across all 10 categories." },
                        { step: "Evidence", description: "Add notes or links to evidence for verification." },
                        { step: "Track", description: "Monitor your compliance score and progress." }
                    ]}
                />
                <div className="flex items-center gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-right">
                        <div className="text-3xl font-extrabold text-slate-900">{score}%</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance</div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => selectedClientId && syncMutation.mutate({ clientId: selectedClientId })}
                            disabled={syncMutation.isLoading || !selectedClientId}
                            variant="outline"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 font-bold h-12 px-6 rounded-xl transition-all active:scale-95"
                        >
                            {syncMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 fill-emerald-500" />}
                            Sync ISO 27001
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="h-12 px-6 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all"
                        >
                            <a href={`/clients/${selectedClientId}/cyber/mapping`}>View Mappings</a>
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isLoading}
                            className="bg-[#3ABEF9] hover:bg-[#1C4D8D] text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
                        >
                            {saveMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Save Progress
                        </Button>
                    </div>
                </div>
            </div>

            {/* Progress Visualization */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="relative h-32 w-32 flex-shrink-0">
                            <svg className="h-full w-full" viewBox="0 0 100 100">
                                <circle className="text-slate-100" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                <circle
                                    className="text-[#3ABEF9] transition-all duration-1000 ease-out"
                                    strokeWidth="10"
                                    strokeDasharray={2 * Math.PI * 40}
                                    strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="40" cx="50" cy="50"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-black text-slate-900">{score}%</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4 w-full">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-slate-900">Overall Readiness</h3>
                                    <p className="text-sm text-slate-500">Based on {NIS2_CHECKLIST.reduce((acc, cat) => acc + cat.questions.length, 0)} mandatory measures.</p>
                                </div>
                                <span className={cn(
                                    "text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                                    score >= 100 ? "bg-green-100 text-green-700" : "bg-sky-100 text-sky-700"
                                )}>
                                    {score >= 100 ? "Compliant" : "In Progress"}
                                </span>
                            </div>
                            <Progress value={score} className="h-4 rounded-full bg-slate-100" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checklist */}
            <div className="space-y-8 pb-12">
                {NIS2_CHECKLIST.map((category, catIdx) => (
                    <Card key={category.id} className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${catIdx * 100}ms` }}>
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                            <CardTitle className="text-xl font-bold flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-[#1C4D8D] text-white flex items-center justify-center text-sm">
                                        {catIdx + 1}
                                    </div>
                                    {category.category}
                                </div>
                                {category.questions.every(q => (assessment?.responses?.[q.id] as any)?.answer === 'yes' || responses[q.id]?.answer === 'yes') ? (
                                    <Badge className="bg-green-500 text-white border-none font-bold">COMPLETED</Badge>
                                ) : (
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Section {catIdx + 1}</div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {category.questions.map((q, qIdx) => (
                                    <div key={q.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 hover:bg-slate-50/50 transition-colors">
                                        <div className="md:col-span-6">
                                            <div className="flex gap-4">
                                                <span className="text-slate-300 text-sm font-black mt-0.5">{qIdx + 1}.</span>
                                                <p className="text-[15px] font-bold text-slate-800 leading-relaxed">{q.text}</p>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Select
                                                key={q.id + '-' + ((assessment?.responses?.[q.id] as any)?.answer || 'empty')}
                                                value={(assessment?.responses?.[q.id] as any)?.answer || responses[q.id]?.answer || "not_started"}
                                                onValueChange={(val) => handleAnswerChange(q.id, val)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-10 text-xs font-bold rounded-xl border-none ring-1 ring-inset transition-all",
                                                    responses[q.id]?.answer === 'yes' || (assessment?.responses?.[q.id] as any)?.answer === 'yes' ? "bg-green-50 text-green-700 ring-green-200" :
                                                        responses[q.id]?.answer === 'partial' || (assessment?.responses?.[q.id] as any)?.answer === 'partial' ? "bg-amber-50 text-amber-700 ring-amber-200" :
                                                            "bg-slate-50 text-slate-500 ring-slate-200"
                                                )}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200">
                                                    <SelectItem value="not_started">Gap / Not Started</SelectItem>
                                                    <SelectItem value="partial">In Progress</SelectItem>
                                                    <SelectItem value="yes">Implemented</SelectItem>
                                                    <SelectItem value="na">N/A</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-4 flex items-start gap-2">
                                            <div className="flex-1">
                                                <Textarea
                                                    placeholder="Add implementation notes or evidence links..."
                                                    className="min-h-[2.5rem] h-10 text-sm py-2 px-4 rounded-xl border-slate-200 focus:border-[#3ABEF9] focus:ring-[#3ABEF9]/20 transition-all font-medium"
                                                    value={(assessment?.responses?.[q.id] as any)?.notes || responses[q.id]?.notes || ""}
                                                    onChange={(e) => handleNotesChange(q.id, e.target.value)}
                                                />
                                            </div>
                                            {AUTOMATED_AUDITORS.some(a => a.targetMeasureId === q.measureId) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 transition-all active:scale-90 flex-shrink-0"
                                                    title="Run Automated Auditor"
                                                    onClick={() => handleAutomatedAudit(q.id, q.measureId!)}
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}



