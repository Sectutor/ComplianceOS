import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Label } from "@complianceos/ui/ui/label";
import { toast } from "sonner";
import { Download, ArrowLeft, Save, FileText, Sparkles } from "lucide-react";
import { useAskQuestion } from "@/hooks/useAdvisor";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function RiskReportEditor() {
    const params = useParams();
    const [_, setLocation] = useLocation();
    const clientId = params.id ? Number(params.id) : 0;

    const [downloading, setDownloading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generatingAI, setGeneratingAI] = useState<string | null>(null);

    const { askAsync, isLoading: aiLoading } = useAskQuestion();

    // Report metadata state
    const [reportData, setReportData] = useState({
        title: "Risk Management Report",
        executiveSummary: "",
        introduction: "",
        scope: "",
        methodology: "",
        keyFindings: "",
        recommendations: "",
        conclusion: "",
        assumptions: "",
        references: ""
    });

    // Fetch client details
    const { data: client } = trpc.clients.get.useQuery(
        { id: clientId },
        { enabled: !!clientId }
    );

    // Fetch risk assessments for the report
    const { data: riskAssessments, isLoading } = trpc.risks.getRiskAssessments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const generateReportMutation = trpc.risks.exportReport.useMutation();
    const saveReportMutation = trpc.risks.saveReport.useMutation();

    // Fetch saved report data
    const { data: savedReport } = trpc.risks.getReport.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Populate state when saved report loads
    useEffect(() => {
        if (savedReport) {
            setReportData(prev => ({
                ...prev,
                executiveSummary: savedReport.executiveSummary || prev.executiveSummary,
                introduction: savedReport.introduction || prev.introduction,
                scope: savedReport.scope || prev.scope,
                methodology: savedReport.methodology || prev.methodology,
                keyFindings: savedReport.keyFindings || prev.keyFindings,
                recommendations: savedReport.recommendations || prev.recommendations,
                conclusion: savedReport.conclusion || prev.conclusion,
                assumptions: savedReport.assumptions || prev.assumptions,
                references: savedReport.references || prev.references,
            }));
        }
    }, [savedReport]);

    const handleFieldChange = (field: string, value: string) => {
        setReportData(prev => ({ ...prev, [field]: value }));
    };

    const handleAISuggestion = async (field: string, sectionName: string) => {
        setGeneratingAI(field);

        const highRisks = riskAssessments?.filter((r: any) => r.inherentRisk === 'High' || r.inherentRisk === 'Very High').length || 0;
        const totalRisks = riskAssessments?.length || 0;

        const prompts: Record<string, string> = {
            executiveSummary: `Generate a professional executive summary for a risk management report. The client is ${client?.name}. They have ${totalRisks} total risks identified, including ${highRisks} high/critical risks. Write 2-3 paragraphs summarizing the overall risk landscape and key priorities.`,
            introduction: `Write an introduction section for a risk management report for ${client?.name}. Explain the purpose of this risk assessment and provide context about why risk management is important for their organization.`,
            scope: `Define the scope section for a risk management report. Describe what areas, systems, and processes are covered in this assessment for ${client?.name}.`,
            methodology: `Describe the methodology used for this risk assessment. Include information about risk identification, analysis, evaluation, and treatment approaches.`,
            keyFindings: `Based on ${totalRisks} identified risks (${highRisks} high/critical), summarize the key findings from the risk assessment. Highlight the most significant risk areas and patterns observed.`,
            recommendations: `Provide key recommendations for risk treatment based on the assessment. Focus on actionable steps to reduce the ${highRisks} high/critical risks identified.`,
            conclusion: `Write a conclusion for the risk management report. Summarize the main points and outline next steps for ${client?.name}.`,
            assumptions: `List common assumptions and limitations for a risk management assessment, such as data accuracy, timeframe, and scope boundaries.`,
            references: `List common standards and frameworks referenced in risk management, such as ISO 31000, NIST RMF, and relevant industry standards.`
        };

        try {
            const response = await askAsync({
                clientId: clientId || 0,
                question: prompts[field]
            });

            // Directly populate the field with AI response
            handleFieldChange(field, response.answer);
            toast.success(`${sectionName} generated successfully`);
        } catch (error) {
            toast.error("Failed to generate AI suggestion");
        } finally {
            setGeneratingAI(null);
        }
    };

    const handleGenerateAll = async () => {
        setGeneratingAI('all');

        const highRisks = riskAssessments?.filter((r: any) => r.inherentRisk === 'High' || r.inherentRisk === 'Very High').length || 0;
        const totalRisks = riskAssessments?.length || 0;

        const sections = [
            { field: 'executiveSummary', name: 'Executive Summary', prompt: `Generate a professional executive summary for a risk management report. The client is ${client?.name}. They have ${totalRisks} total risks identified, including ${highRisks} high/critical risks. Write 2-3 paragraphs summarizing the overall risk landscape and key priorities.` },
            { field: 'introduction', name: 'Introduction', prompt: `Write an introduction section for a risk management report for ${client?.name}. Explain the purpose of this risk assessment and provide context about why risk management is important for their organization.` },
            { field: 'scope', name: 'Scope', prompt: `Define the scope section for a risk management report. Describe what areas, systems, and processes are covered in this assessment for ${client?.name}.` },
            { field: 'methodology', name: 'Methodology', prompt: `Describe the methodology used for this risk assessment. Include information about risk identification, analysis, evaluation, and treatment approaches.` },
            { field: 'keyFindings', name: 'Key Findings', prompt: `Based on ${totalRisks} identified risks (${highRisks} high/critical), summarize the key findings from the risk assessment. Highlight the most significant risk areas and patterns observed.` },
            { field: 'recommendations', name: 'Recommendations', prompt: `Provide key recommendations for risk treatment based on the assessment. Focus on actionable steps to reduce the ${highRisks} high/critical risks identified.` },
            { field: 'conclusion', name: 'Conclusion', prompt: `Write a conclusion for the risk management report. Summarize the main points and outline next steps for ${client?.name}.` },
            { field: 'assumptions', name: 'Assumptions', prompt: `List common assumptions and limitations for a risk management assessment, such as data accuracy, timeframe, and scope boundaries.` },
            { field: 'references', name: 'References', prompt: `List common standards and frameworks referenced in risk management, such as ISO 31000, NIST RMF, and relevant industry standards.` }
        ];

        let successCount = 0;
        let failCount = 0;

        for (const section of sections) {
            try {
                const response = await askAsync({
                    clientId: clientId || 0,
                    question: section.prompt
                });

                handleFieldChange(section.field, response.answer);
                successCount++;
                toast.success(`${section.name} generated`);
            } catch (error) {
                failCount++;
                console.error(`Failed to generate ${section.name}:`, error);
            }
        }

        setGeneratingAI(null);

        if (failCount === 0) {
            toast.success(`All sections generated successfully!`);
        } else {
            toast.warning(`Generated ${successCount} sections, ${failCount} failed`);
        }
    };

    const handleExport = async () => {
        try {
            setDownloading(true);
            const data = await generateReportMutation.mutateAsync({
                clientId,
                ...reportData
            });

            // Convert base64 to blob and download
            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = data.filename;
            link.click();

            toast.success("Report downloaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate report");
        } finally {
            setDownloading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await saveReportMutation.mutateAsync({
                clientId,
                ...reportData
            });
            toast.success("Report data saved successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save report");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
            </DashboardLayout>
        );
    }

    const highRisks = riskAssessments?.filter(r => r.inherentRisk === 'High' || r.inherentRisk === 'Very High').length || 0;
    const totalRisks = riskAssessments?.length || 0;

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: client?.name || "Client", href: `/clients/${clientId}` },
                            { label: "Risk Management", href: `/clients/${clientId}/risks` },
                            { label: "Risk Report", href: `/clients/${clientId}/risks/report` },
                        ]}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setLocation(`/clients/${clientId}/risks`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Risk Dashboard
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Risk Management Report</h1>
                            <p className="text-muted-foreground mt-1">
                                Customize and export your risk management report
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="default"
                            onClick={handleGenerateAll}
                            disabled={generatingAI === 'all' || aiLoading}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {generatingAI === 'all' ? 'Generating All...' : 'Generate All with AI'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={downloading}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {downloading ? "Generating..." : "Export Report"}
                        </Button>
                    </div>
                </div>

                {/* Report Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Report Overview
                        </CardTitle>
                        <CardDescription>
                            This report covers {totalRisks} risk assessments, including {highRisks} high/critical risks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">Client</div>
                                <div className="font-medium">{client?.name || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Total Risks</div>
                                <div className="font-medium">{totalRisks}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">High/Critical</div>
                                <div className="font-medium text-red-600">{highRisks}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Report Content Sections */}
                <Card>
                    <CardHeader>
                        <CardTitle>Report Content</CardTitle>
                        <CardDescription>
                            Customize the content sections of your risk management report
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Executive Summary */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="executiveSummary">Executive Summary</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAISuggestion('executiveSummary', 'Executive Summary')}
                                    disabled={generatingAI === 'executiveSummary' || aiLoading}
                                    className="h-7 text-xs"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {generatingAI === 'executiveSummary' ? 'Generating...' : 'AI Suggest'}
                                </Button>
                            </div>
                            <Textarea
                                id="executiveSummary"
                                placeholder="Provide a high-level overview of the risk landscape..."
                                value={reportData.executiveSummary}
                                onChange={(e) => handleFieldChange('executiveSummary', e.target.value)}
                                rows={4}
                            />
                        </div>

                        {/* Introduction */}
                        <div className="space-y-2">
                            <Label htmlFor="introduction">Introduction</Label>
                            <Textarea
                                id="introduction"
                                placeholder="Introduce the purpose and context of this risk assessment..."
                                value={reportData.introduction}
                                onChange={(e) => handleFieldChange('introduction', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Scope */}
                        <div className="space-y-2">
                            <Label htmlFor="scope">Scope</Label>
                            <Textarea
                                id="scope"
                                placeholder="Define the boundaries and coverage of this assessment..."
                                value={reportData.scope}
                                onChange={(e) => handleFieldChange('scope', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Methodology */}
                        <div className="space-y-2">
                            <Label htmlFor="methodology">Methodology</Label>
                            <Textarea
                                id="methodology"
                                placeholder="Describe the approach and methods used for risk assessment..."
                                value={reportData.methodology}
                                onChange={(e) => handleFieldChange('methodology', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Key Findings */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="keyFindings">Key Findings</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAISuggestion('keyFindings', 'Key Findings')}
                                    disabled={generatingAI === 'keyFindings' || aiLoading}
                                    className="h-7 text-xs"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {generatingAI === 'keyFindings' ? 'Generating...' : 'AI Suggest'}
                                </Button>
                            </div>
                            <Textarea
                                id="keyFindings"
                                placeholder="Summarize the most important discoveries and risk insights..."
                                value={reportData.keyFindings}
                                onChange={(e) => handleFieldChange('keyFindings', e.target.value)}
                                rows={4}
                            />
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="recommendations">Key Recommendations</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAISuggestion('recommendations', 'Recommendations')}
                                    disabled={generatingAI === 'recommendations' || aiLoading}
                                    className="h-7 text-xs"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {generatingAI === 'recommendations' ? 'Generating...' : 'AI Suggest'}
                                </Button>
                            </div>
                            <Textarea
                                id="recommendations"
                                placeholder="Provide actionable recommendations for risk treatment..."
                                value={reportData.recommendations}
                                onChange={(e) => handleFieldChange('recommendations', e.target.value)}
                                rows={4}
                            />
                        </div>

                        {/* Conclusion */}
                        <div className="space-y-2">
                            <Label htmlFor="conclusion">Conclusion</Label>
                            <Textarea
                                id="conclusion"
                                placeholder="Conclude with final thoughts and next steps..."
                                value={reportData.conclusion}
                                onChange={(e) => handleFieldChange('conclusion', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Assumptions */}
                        <div className="space-y-2">
                            <Label htmlFor="assumptions">Assumptions & Limitations</Label>
                            <Textarea
                                id="assumptions"
                                placeholder="Document any assumptions made during the assessment..."
                                value={reportData.assumptions}
                                onChange={(e) => handleFieldChange('assumptions', e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* References */}
                        <div className="space-y-2">
                            <Label htmlFor="references">References</Label>
                            <Textarea
                                id="references"
                                placeholder="List any standards, frameworks, or documents referenced..."
                                value={reportData.references}
                                onChange={(e) => handleFieldChange('references', e.target.value)}
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
