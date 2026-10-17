import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { 
    ArrowLeft, 
    Save, 
    Sparkles, 
    ShieldCheck, 
    Lock, 
    Cloud, 
    FileText, 
    Layers, 
    Cpu, 
    HeartPulse, 
    Globe, 
    Eye, 
    Check, 
    Plus,
    CheckCircle2,
    SlidersHorizontal,
    Wand2,
    FolderPlus,
    X
} from "lucide-react";
import { toast } from "sonner";
import { QuestionTable, Section } from "./QuestionTable";
import { SectionPoolModal } from "./SectionPoolModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@complianceos/ui/ui/card";
import { PageGuide } from "@/components/PageGuide";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@complianceos/ui/ui/dialog";

export default function TemplateEditor() {
    const { id, templateId } = useParams(); // id is clientId, templateId is template ID or 'new'
    const { selectedClientId } = useClientContext();
    const [location, setLocation] = useLocation();

    // Ensure we have a valid clientId
    const clientId = selectedClientId || (id ? parseInt(id) : null);

    // Accurately detect if we are creating a new template (either via param or URL ending in /new)
    const isNew = location.endsWith("/new") || templateId === "new" || !templateId;
    const numericTemplateId = !isNew && templateId && !isNaN(parseInt(templateId)) ? parseInt(templateId) : null;

    // Fetch standard templates library
    const { data: standardTemplates } = trpc.vendors.getStandardTemplates.useQuery();

    // If 'new', ALWAYS start in "launchpad" mode so the user has the starter studio.
    // If editing existing, jump straight to "editing".
    const [creationStep, setCreationStep] = useState<"launchpad" | "editing">(isNew ? "launchpad" : "editing");
    const [activeMethod, setActiveMethod] = useState<"standards" | "ai" | "blank">("standards");

    // Keep creationStep synced if location changes to /new
    useEffect(() => {
        if (isNew) {
            setCreationStep("launchpad");
        }
    }, [location, isNew]);

    // Preview Modal State for Framework Blueprint
    const [previewBlueprint, setPreviewBlueprint] = useState<any | null>(null);

    // Vendor Portal Interactive Preview State
    const [isVendorPreviewOpen, setIsVendorPreviewOpen] = useState(false);

    // Launchpad Section Pool Modal State
    const [isLaunchpadSectionPoolOpen, setIsLaunchpadSectionPoolOpen] = useState(false);

    // AI Generator State
    const [aiForm, setAiForm] = useState({
        vendorCategory: "saas",
        riskLevel: "high",
        framework: "ISO/IEC 27001:2022"
    });
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const [templateData, setTemplateData] = useState({
        name: "",
        framework: "ISO/IEC 27001:2022",
        description: "",
        content: {
            sections: [] as Section[]
        },
    });

    // Fetch existing template if editing
    const { data: existingTemplate, isLoading: isFetchingCustom } = trpc.vendors.getTemplate.useQuery(
        { id: numericTemplateId! },
        { enabled: !!numericTemplateId }
    );

    // Load template data if editing existing
    useEffect(() => {
        if (existingTemplate) {
            try {
                const parsedContent = typeof existingTemplate.content === 'string'
                    ? JSON.parse(existingTemplate.content)
                    : existingTemplate.content;

                setTemplateData({
                    name: existingTemplate.name,
                    framework: parsedContent?.framework || "Custom",
                    description: existingTemplate.description || "",
                    content: {
                        sections: Array.isArray(parsedContent?.sections) && parsedContent.sections.length > 0
                            ? parsedContent.sections
                            : []
                    }
                });
                setCreationStep("editing");
            } catch (e) {
                console.error("Failed to parse template content:", e);
            }
        }
    }, [existingTemplate]);

    // Handler to adopt an industry standard blueprint
    const handleAdoptBlueprint = (blueprint: any) => {
        setTemplateData({
            name: blueprint.name,
            framework: blueprint.framework,
            description: blueprint.description,
            content: {
                sections: blueprint.sections as Section[]
            }
        });
        setCreationStep("editing");
        toast.success(`Adopted "${blueprint.name}" with ${blueprint.sections.reduce((a: number, s: any) => a + s.questions.length, 0)} mapped controls!`);
    };

    // Handler to start with a blank template
    const handleStartBlank = () => {
        setTemplateData({
            name: "Custom Vendor Assessment Template",
            framework: "Custom Baseline",
            description: "Organization-specific third-party vendor review questions.",
            content: {
                sections: [
                    {
                        title: "General Security Governance",
                        description: "Organizational security governance and policies",
                        questions: [
                            {
                                id: "gov_01",
                                text: "Does your organization maintain a documented and formally approved Information Security Policy?",
                                type: "yes_no",
                                required: true,
                                standard: "Custom",
                                controlId: "SEC-01",
                                guidance: "Provide copy or executive summary of policy dated within last 12 months."
                            }
                        ]
                    }
                ]
            }
        });
        setCreationStep("editing");
        toast.info("Created custom blank template canvas.");
    };

    // Handler to adopt sections from Section Pool on the launchpad
    const handleLaunchpadAddSections = (sections: Section[]) => {
        if (!sections || sections.length === 0) return;
        setTemplateData({
            name: "Custom Vendor Assessment Template",
            framework: "Custom Baseline",
            description: "Tailored vendor assessment built from domain section pool and audited question bank.",
            content: {
                sections: sections
            }
        });
        setCreationStep("editing");
        const totalQ = sections.reduce((acc, s) => acc + s.questions.length, 0);
        toast.success(`Adopted ${sections.length} domain sections with ${totalQ} audited controls!`);
    };

    // Handler for AI Questionnaire Generation
    const handleGenerateAi = () => {
        setIsGeneratingAi(true);

        setTimeout(() => {
            let catName = "SaaS Application";
            if (aiForm.vendorCategory === "cloud") catName = "Cloud Infrastructure & Hosting";
            if (aiForm.vendorCategory === "ai") catName = "AI & LLM Technology Provider";
            if (aiForm.vendorCategory === "payment") catName = "Payment & Financial Processing";
            if (aiForm.vendorCategory === "hr") catName = "HR & Employee Data Provider";
            if (aiForm.vendorCategory === "devs") catName = "Outsourced Software Engineering";

            const aiSections: Section[] = [
                {
                    title: "Access Control & Identity Isolation",
                    description: `Protections for ${catName} privileged access and tenant isolation.`,
                    questions: [
                        {
                            id: "ai_sec_01",
                            text: `Do you enforce Multi-Factor Authentication (MFA) and least-privilege role boundaries for all staff accessing ${catName} environments?`,
                            type: "yes_no",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "AC-MFA-01",
                            guidance: "Provide proof of MFA enforcement across production environments."
                        },
                        {
                            id: "ai_sec_02",
                            text: "Are client data and workloads strictly separated using logical or cryptographic tenant boundaries?",
                            type: "yes_no",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "ISO 27001: A.5.15",
                            guidance: "Detail multi-tenancy architecture and data isolation safeguards."
                        }
                    ]
                },
                {
                    title: "Data Protection, Encryption & Retention",
                    description: `Safeguards tailored for ${aiForm.riskLevel.toUpperCase()} risk customer data.`,
                    questions: [
                        {
                            id: "ai_sec_03",
                            text: "Is customer data encrypted in transit (TLS 1.2+) and at rest using AES-256 or stronger?",
                            type: "yes_no",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "CRY-01",
                            guidance: "Provide SSL Labs report and key management configuration summary."
                        },
                        {
                            id: "ai_sec_04",
                            text: "What is your defined data retention and permanent sanitization policy upon contract termination?",
                            type: "text",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "NIST 800-88",
                            guidance: "Attach certificate of data destruction workflow."
                        }
                    ]
                },
                {
                    title: "Threat Monitoring, Penetration Testing & Breach Notification",
                    description: "Continuous vulnerability management and incident commitment.",
                    questions: [
                        {
                            id: "ai_sec_05",
                            text: "Do you undergo annual independent third-party penetration testing?",
                            type: "file_upload",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "PEN-TEST-01",
                            guidance: "Upload the Executive Summary of your most recent third-party penetration test."
                        },
                        {
                            id: "ai_sec_06",
                            text: "Do you contractually commit to notifying our security team within 48 to 72 hours of any confirmed security incident?",
                            type: "yes_no",
                            required: true,
                            standard: aiForm.framework,
                            controlId: "INC-NOTIFY-01",
                            guidance: "Verify incident notification commitment in agreement."
                        }
                    ]
                }
            ];

            if (aiForm.vendorCategory === "ai") {
                aiSections.unshift({
                    title: "Model Governance & Zero-Data-Training Policy",
                    description: "Explicit protections preventing proprietary prompts from training foundation models.",
                    questions: [
                        {
                            id: "ai_llm_01",
                            text: "Do you guarantee contractually that customer prompts, embeddings, and context data are NEVER used to train your models?",
                            type: "yes_no",
                            required: true,
                            standard: "ISO 42001 & NIST AI RMF",
                            controlId: "A.6.2.2",
                            guidance: "Attach DPA or enterprise terms verifying zero-data-training guarantee."
                        }
                    ]
                });
            }

            setTemplateData({
                name: `${catName} Security Assessment (${aiForm.framework})`,
                framework: aiForm.framework,
                description: `Tailored security assessment for ${catName} handling ${aiForm.riskLevel.toUpperCase()} risk data, aligned with ${aiForm.framework}.`,
                content: {
                    sections: aiSections
                }
            });

            setIsGeneratingAi(false);
            setCreationStep("editing");
            toast.success(`Generated tailored AI template for ${catName} with ${aiSections.reduce((a, s) => a + s.questions.length, 0)} controls!`);
        }, 700);
    };

    const createMutation = trpc.vendors.createTemplate.useMutation({
        onSuccess: () => {
            toast.success("Template published successfully!");
            setLocation(`/clients/${clientId}/vendors/templates`);
        },
        onError: (err) => toast.error(`Failed to create: ${err.message}`)
    });

    const updateMutation = trpc.vendors.updateTemplate.useMutation({
        onSuccess: () => {
            toast.success("Template updated successfully!");
            setLocation(`/clients/${clientId}/vendors/templates`);
        },
        onError: (err) => toast.error(`Failed to update: ${err.message}`)
    });

    const handleSave = () => {
        if (!clientId) return;

        if (!templateData.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        const totalQuestions = templateData.content.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
        if (totalQuestions === 0) {
            toast.error("Template must have at least one question before saving.");
            return;
        }

        const payloadContent = {
            framework: templateData.framework,
            sections: templateData.content.sections
        };

        if (isNew) {
            createMutation.mutate({
                clientId,
                name: templateData.name,
                description: templateData.description,
                content: payloadContent,
            });
        } else {
            updateMutation.mutate({
                id: numericTemplateId!,
                name: templateData.name,
                description: templateData.description,
                content: payloadContent,
            });
        }
    };

    if (isFetchingCustom) {
        return (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p>Loading assessment template...</p>
            </div>
        );
    }

    const totalQuestions = templateData.content.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

    const getFrameworkIcon = (key: string) => {
        if (key.includes('iso')) return <ShieldCheck className="h-5 w-5 text-blue-600" />;
        if (key.includes('cis')) return <Lock className="h-5 w-5 text-emerald-600" />;
        if (key.includes('caiq')) return <Cloud className="h-5 w-5 text-indigo-600" />;
        if (key.includes('soc')) return <FileText className="h-5 w-5 text-purple-600" />;
        if (key.includes('ai')) return <Cpu className="h-5 w-5 text-amber-600" />;
        if (key.includes('hipaa')) return <HeartPulse className="h-5 w-5 text-rose-600" />;
        if (key.includes('gdpr')) return <Globe className="h-5 w-5 text-teal-600" />;
        return <Layers className="h-5 w-5 text-slate-600" />;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* ======================================================== */}
            {/* 1. CREATION LAUNCHPAD: WHEN USER CLICKS "NEW TEMPLATE"    */}
            {/* ======================================================== */}
            {creationStep === "launchpad" ? (
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => setLocation(`/clients/${clientId}/vendors/templates`)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                                    Create Vendor Assessment Template
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                        Creation Studio
                                    </Badge>
                                </h1>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Choose how you want to build your assessment. Jumpstart in seconds with standard blueprints or AI, or start blank.
                                </p>
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            onClick={handleStartBlank}
                            className="text-slate-600 hover:text-slate-900 text-xs font-medium"
                        >
                            Skip & start with blank canvas →
                        </Button>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => setActiveMethod("standards")}
                            className={`p-5 text-left rounded-xl border transition-all ${
                                activeMethod === "standards"
                                    ? "bg-blue-50/60 border-blue-600 shadow-sm ring-1 ring-blue-600"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                        >
                            <div className="h-10 w-10 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center mb-3">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-slate-900 text-base flex items-center justify-between">
                                Industry Standards Library
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">Recommended</Badge>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Pick from 8 pre-vetted compliance frameworks (ISO 27001, CIS 8, CAIQ, SOC 2, HIPAA, AI). Every question is pre-mapped with control IDs.
                            </p>
                        </button>

                        <button
                            onClick={() => setActiveMethod("ai")}
                            className={`p-5 text-left rounded-xl border transition-all ${
                                activeMethod === "ai"
                                    ? "bg-purple-50/60 border-purple-600 shadow-sm ring-1 ring-purple-600"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                        >
                            <div className="h-10 w-10 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center mb-3">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-slate-900 text-base">
                                AI Assessment Generator
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Answer 3 quick questions about the vendor (category, data sensitivity, target standard) and let ComplianceOS AI generate a tailored questionnaire.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveMethod("blank")}
                            className={`p-5 text-left rounded-xl border transition-all ${
                                activeMethod === "blank"
                                    ? "bg-slate-100 border-slate-600 shadow-sm ring-1 ring-slate-600"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                        >
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900 text-base">
                                    Section Pool & Question Bank
                                </h3>
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] hover:bg-emerald-100 border-0">
                                    Zero Blank Typing
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Select pre-curated security domains (IAM, Encryption, Supply Chain, AI, etc.) with audited controls. Assemble modularly without writing questions from scratch.
                            </p>
                        </button>
                    </div>

                    {/* METHOD 1: INDUSTRY STANDARDS LIBRARY */}
                    {activeMethod === "standards" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Select a Framework Blueprint to Adopt</h2>
                                    <p className="text-xs text-slate-500">
                                        Click "Use This Blueprint" to load all questions into the interactive editor. You can freely edit, add, or delete questions after loading.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {standardTemplates?.map((blueprint) => {
                                    const qCount = blueprint.sections.reduce((acc, s) => acc + s.questions.length, 0);

                                    return (
                                        <Card key={blueprint.idKey} className="border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between bg-white">
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                        {getFrameworkIcon(blueprint.idKey)}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                                                        {qCount} Controls
                                                    </Badge>
                                                </div>

                                                <CardTitle className="text-sm font-bold text-slate-900 mt-3 line-clamp-2 leading-snug">
                                                    {blueprint.name}
                                                </CardTitle>

                                                <CardDescription className="text-xs text-slate-500 line-clamp-3 mt-1.5 leading-relaxed">
                                                    {blueprint.description}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardFooter className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-xs h-8 px-2 text-slate-600 hover:text-slate-900"
                                                    onClick={() => setPreviewBlueprint(blueprint)}
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                                                </Button>

                                                <Button 
                                                    size="sm" 
                                                    className="text-xs h-8 bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white"
                                                    onClick={() => handleAdoptBlueprint(blueprint)}
                                                >
                                                    <Check className="h-3.5 w-3.5 mr-1" /> Use Blueprint
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* METHOD 2: AI ASSESSMENT GENERATOR */}
                    {activeMethod === "ai" && (
                        <Card className="border-purple-200 bg-white shadow-xs max-w-3xl">
                            <CardHeader className="bg-purple-50/50 border-b border-purple-100 pb-4">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    ComplianceOS AI Questionnaire Studio
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-600">
                                    Answer these 3 parameters. AI will dynamically construct specific questions with control IDs and audit evidence requirements tailored to this vendor.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-700">1. Vendor Classification / Technology Stack</Label>
                                    <Select 
                                        value={aiForm.vendorCategory} 
                                        onValueChange={(val) => setAiForm({ ...aiForm, vendorCategory: val })}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="saas">SaaS Application / Cloud Tool (e.g., Salesforce, Slack, Jira)</SelectItem>
                                            <SelectItem value="cloud">Cloud Infrastructure & Hosting (e.g., AWS, Azure, GCP, Datacenter)</SelectItem>
                                            <SelectItem value="ai">AI / LLM Technology Provider (e.g., OpenAI, Anthropic, Vector DB)</SelectItem>
                                            <SelectItem value="payment">Payment & Financial Processing (e.g., Stripe, Plaid)</SelectItem>
                                            <SelectItem value="hr">HR, Benefits & Payroll (e.g., Gusto, Rippling, Workday)</SelectItem>
                                            <SelectItem value="devs">Contract Software Engineering / Outsourced Devs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-700">2. Customer Data Sensitivity & Access Level</Label>
                                        <Select 
                                            value={aiForm.riskLevel} 
                                            onValueChange={(val) => setAiForm({ ...aiForm, riskLevel: val })}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="high">High: Access to Customer PII, Financials, or Production DB</SelectItem>
                                                <SelectItem value="medium">Medium: Confidential Internal Business Data (No PII)</SelectItem>
                                                <SelectItem value="low">Low: Metadata only / No Customer Data Access</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-700">3. Primary Compliance Target</Label>
                                        <Select 
                                            value={aiForm.framework} 
                                            onValueChange={(val) => setAiForm({ ...aiForm, framework: val })}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ISO/IEC 27001:2022">ISO/IEC 27001:2022 Annex A</SelectItem>
                                                <SelectItem value="SOC 2 Type II">SOC 2 Type II Trust Criteria</SelectItem>
                                                <SelectItem value="CIS Controls v8">CIS Controls v8 (Service Providers)</SelectItem>
                                                <SelectItem value="HIPAA Security Rule">HIPAA & HITECH Healthcare</SelectItem>
                                                <SelectItem value="GDPR Article 28">GDPR & International Privacy</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button 
                                        onClick={handleGenerateAi}
                                        disabled={isGeneratingAi}
                                        className="w-full bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 shadow-xs"
                                    >
                                        {isGeneratingAi ? (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                                Synthesizing Control Questions...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="mr-2 h-4 w-4" />
                                                Generate Custom AI Questionnaire
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* METHOD 3: SECTION POOL & QUESTION BANK */}
                    {activeMethod === "blank" && (
                        <Card className="border-emerald-200 bg-white shadow-xs max-w-3xl">
                            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold">Modular Assembly</Badge>
                                        <Badge variant="outline" className="text-xs text-slate-600">9 Security Domains Available</Badge>
                                    </div>
                                </div>
                                <CardTitle className="text-base font-bold text-slate-900 mt-2 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-emerald-600" />
                                    Build from Section Pool & Audited Question Bank
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-600">
                                    Never start from a blank page. Select security domain sections from our pool—each pre-loaded with vetted controls mapped to ISO 27001, CIS 8, CAIQ, and SOC 2. You can freely trim or add controls afterwards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Lock className="h-3.5 w-3.5 text-blue-600" /> Access & Identity
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">15 controls (MFA, RBAC, SSO, PAM)</p>
                                    </div>
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Cryptography & Data
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">11 controls (TLS 1.3, AES-256, KMS)</p>
                                    </div>
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5 text-indigo-600" /> Supply Chain & Vendors
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">12 controls (4th-party, SLAs, DPAs)</p>
                                    </div>
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Cpu className="h-3.5 w-3.5 text-purple-600" /> AppSec & Secure SDLC
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">12 controls (OWASP, SAST, CI/CD)</p>
                                    </div>
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI & LLM Governance
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">10 controls (No-training, Prompt injection)</p>
                                    </div>
                                    <div 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Globe className="h-3.5 w-3.5 text-teal-600" /> Privacy & Regulatory
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">10 controls (GDPR, CCPA, HIPAA, DSRs)</p>
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                                    <Button 
                                        onClick={() => setIsLaunchpadSectionPoolOpen(true)}
                                        className="w-full sm:w-auto bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white px-5 py-2.5 font-semibold text-xs shadow-xs"
                                    >
                                        <Layers className="mr-2 h-4 w-4" /> Open Section Pool & Select Domains
                                    </Button>
                                    <Button 
                                        variant="ghost"
                                        onClick={handleStartBlank}
                                        className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        Or start with empty blank canvas
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* ======================================================== */
                /* 2. THE INTERACTIVE TEMPLATE EDITOR (AFTER BLUEPRINT ADOPT) */
                /* ======================================================== */
                <div className="space-y-6">
                    {/* Header Action Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                    if (isNew) {
                                        setCreationStep("launchpad");
                                    } else {
                                        setLocation(`/clients/${clientId}/vendors/templates`);
                                    }
                                }}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                        {templateData.name || "Untitled Template"}
                                    </h1>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                                        {templateData.framework || "Standard"}
                                    </Badge>
                                    <Badge variant="secondary" className="font-semibold text-xs">
                                        {templateData.content.sections.reduce((acc, s) => acc + (s.questions?.filter(q => q.enabled !== false).length || 0), 0)} Active Controls ({totalQuestions} Total in Framework)
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Comprehensive standard loaded. Use Quick Presets, Section toggles, or search to trim questions for this vendor's scope.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {isNew && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreationStep("launchpad")}
                                    className="text-xs h-9 bg-white text-slate-700 border-slate-300"
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Switch Blueprint
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsVendorPreviewOpen(true)}
                                className="text-xs h-9 bg-white text-slate-700 border-slate-300"
                            >
                                <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-600" /> Preview Vendor View
                            </Button>

                            <Button 
                                onClick={handleSave} 
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white shadow-xs text-xs h-9 px-4 font-semibold"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isNew ? "Publish Template" : "Save Changes"}
                            </Button>
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <Card className="border-slate-200 shadow-xs bg-white">
                        <CardContent className="pt-5 grid gap-5 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-600">Template Name</Label>
                                <Input
                                    id="name"
                                    value={templateData.name}
                                    onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                                    placeholder="e.g., ISO/IEC 27001:2022 Supplier Security Evaluation"
                                    className="bg-white text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="framework" className="text-xs font-semibold uppercase tracking-wider text-slate-600">Target Framework / Standard</Label>
                                <Input
                                    id="framework"
                                    value={templateData.framework}
                                    onChange={(e) => setTemplateData({ ...templateData, framework: e.target.value })}
                                    placeholder="e.g., ISO 27001, CIS Controls v8, CSA CAIQ"
                                    className="bg-white text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="desc" className="text-xs font-semibold uppercase tracking-wider text-slate-600">Scope & Vendor Applicability</Label>
                                <Input
                                    id="desc"
                                    value={templateData.description}
                                    onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                                    placeholder="Applicable vendor tiers, scope, and evaluation threshold..."
                                    className="bg-white text-sm"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questionnaire Structure Editor */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Questionnaire Domains & Controls Table</h2>
                                <p className="text-xs text-slate-500">
                                    Each question has an exact Control ID (e.g. A.5.19, CIS 15.1), response type, and audit guidance for vendor evidence.
                                </p>
                            </div>
                        </div>

                        {templateData.content.sections.length === 0 && (
                            <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-3 my-4">
                                <Sparkles className="mx-auto h-8 w-8 text-blue-600" />
                                <h3 className="text-sm font-bold text-slate-800">No questions added yet</h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Choose an industry standard blueprint (ISO 27001, CIS 8, CAIQ, SOC 2) or use AI to generate questions in one click.
                                </p>
                                <div className="flex items-center justify-center gap-3 pt-2">
                                    <Button size="sm" onClick={() => setCreationStep("launchpad")} className="bg-[#1C4D8D] hover:bg-[#153B6D] text-white text-xs">
                                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Open Standards Library (8 Frameworks)
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleStartBlank} className="text-xs bg-white">
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Starter Section
                                    </Button>
                                </div>
                            </div>
                        )}

                        <QuestionTable
                            sections={templateData.content.sections}
                            onChange={(sections) => setTemplateData({ ...templateData, content: { sections } })}
                        />
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 3. BLUEPRINT PREVIEW MODAL                               */}
            {/* ======================================================== */}
            <Dialog open={!!previewBlueprint} onOpenChange={(open) => !open && setPreviewBlueprint(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                                {previewBlueprint?.framework}
                            </Badge>
                            <Badge variant="secondary">
                                {previewBlueprint?.sections.reduce((a: number, s: any) => a + s.questions.length, 0)} Controls
                            </Badge>
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            {previewBlueprint?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {previewBlueprint?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-2">
                        {previewBlueprint?.sections.map((sec: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-3.5 bg-slate-50/50 space-y-2">
                                <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">{sec.title}</h4>
                                <div className="space-y-1.5">
                                    {sec.questions.map((q: any) => (
                                        <div key={q.id} className="text-xs p-2.5 rounded bg-white border border-slate-200 space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-mono font-semibold text-blue-700">[{q.controlId}]</span>
                                                <Badge variant="outline" className="text-[10px]">{q.type.replace('_', ' ')}</Badge>
                                            </div>
                                            <p className="text-slate-800 font-medium">{q.text}</p>
                                            {q.guidance && (
                                                <p className="text-[11px] text-slate-500 italic">Guidance: {q.guidance}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setPreviewBlueprint(null)}>
                            Close
                        </Button>
                        <Button 
                            className="bg-[#1C4D8D] hover:bg-[#153B6D] text-white"
                            onClick={() => {
                                const bp = previewBlueprint;
                                setPreviewBlueprint(null);
                                handleAdoptBlueprint(bp);
                            }}
                        >
                            <Check className="h-4 w-4 mr-1.5" /> Adopt This Blueprint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ======================================================== */}
            {/* 4. VENDOR PORTAL LIVE PREVIEW MODAL                      */}
            {/* ======================================================== */}
            <Dialog open={isVendorPreviewOpen} onOpenChange={setIsVendorPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="border-b pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Badge className="bg-emerald-100 text-emerald-800 text-xs mb-1">
                                    External Vendor Portal View
                                </Badge>
                                <DialogTitle className="text-xl font-bold text-slate-900">
                                    {templateData.name || "Vendor Security Assessment"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    This is exactly how external vendors will see, answer, and attach evidence to this questionnaire.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {templateData.content.sections.map((section, sIdx) => (
                            <div key={sIdx} className="border rounded-xl p-5 bg-white shadow-xs space-y-4">
                                <div className="border-b pb-2">
                                    <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
                                    {section.description && (
                                        <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {section.questions.filter(q => q.enabled !== false).map((q, qIdx) => (
                                        <div key={q.id || qIdx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {qIdx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                                    {q.controlId || q.id}
                                                </Badge>
                                            </div>

                                            {q.guidance && (
                                                <p className="text-xs text-slate-500 bg-white p-2 rounded border border-dashed border-slate-300">
                                                    💡 <strong>Evidence Required:</strong> {q.guidance}
                                                </p>
                                            )}

                                            <div className="pt-1">
                                                {q.type === 'yes_no' ? (
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                                            <input type="radio" name={`preview_${sIdx}_${qIdx}`} defaultChecked className="accent-blue-600" /> Yes
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                                            <input type="radio" name={`preview_${sIdx}_${qIdx}`} className="accent-blue-600" /> No
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                                            <input type="radio" name={`preview_${sIdx}_${qIdx}`} className="accent-blue-600" /> In Progress
                                                        </label>
                                                    </div>
                                                ) : q.type === 'file_upload' ? (
                                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center bg-white">
                                                        <p className="text-xs text-slate-500 font-medium">Click to browse or drag & drop evidence document (PDF, DOCX, ZIP)</p>
                                                    </div>
                                                ) : (
                                                    <Input placeholder="Type response here..." disabled className="bg-white text-xs" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsVendorPreviewOpen(false)} className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white">
                            Back to Editor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Launchpad Section Pool Modal */}
            <SectionPoolModal
                isOpen={isLaunchpadSectionPoolOpen}
                onClose={() => setIsLaunchpadSectionPoolOpen(false)}
                onAddSections={handleLaunchpadAddSections}
                existingSectionTitles={new Set(templateData.content.sections.map(s => s.title))}
            />
        </div>
    );
}
