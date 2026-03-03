import React, { useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import {
    ShieldCheck,
    ShieldAlert,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    XCircle,
    HelpCircle,
    FileText,
    Building2,
    Scale,
    Network,
    ChevronRight,
    RotateCcw,
    Download,
    Sparkles,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// ── Quiz Questions ──────────────────────────────────────
interface QuizQuestion {
    id: string;
    title: string;
    description: string;
    helpText?: string;
    icon: React.ElementType;
    options: {
        label: string;
        value: string;
        description?: string;
        nextQuestion?: string | null; // null = terminal
        resultKey?: string;
    }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
    {
        id: 'q1_dod_contracts',
        title: 'Do you have contracts with the U.S. Department of Defense (DoD)?',
        description: 'This includes prime contracts, subcontracts, or any agreement where the U.S. Government is the end customer.',
        helpText: 'Even subcontract tiers (Tier 2, Tier 3) are in scope if CUI flows down.',
        icon: Building2,
        options: [
            {
                label: 'Yes',
                value: 'yes',
                description: 'We have active or prospective DoD contracts.',
                nextQuestion: 'q2_dfars_clause',
            },
            {
                label: 'No, but we are pursuing DoD work',
                value: 'pursuing',
                description: 'We plan to bid on DoD contracts in the future.',
                nextQuestion: 'q2_dfars_clause',
            },
            {
                label: 'No',
                value: 'no',
                description: 'We have no DoD contracts or plans for them.',
                nextQuestion: 'q1b_other_federal',
            },
        ],
    },
    {
        id: 'q1b_other_federal',
        title: 'Do you work with other federal agencies or handle government data?',
        description: 'CUI requirements can also apply to non-DoD federal contracts and grants.',
        icon: Scale,
        options: [
            {
                label: 'Yes, other federal agencies',
                value: 'yes_federal',
                description: 'We work with civilian agencies (DHS, NASA, DOE, etc.).',
                nextQuestion: 'q3_cui_types',
            },
            {
                label: 'Yes, state/local government',
                value: 'state_local',
                description: 'We handle state or local government data.',
                nextQuestion: 'q5_data_flow',
                resultKey: 'limited_cui',
            },
            {
                label: 'No government work',
                value: 'no_gov',
                description: 'We are a purely commercial organization.',
                nextQuestion: null,
                resultKey: 'not_applicable',
            },
        ],
    },
    {
        id: 'q2_dfars_clause',
        title: 'Do your contracts contain DFARS 252.204-7012?',
        description: 'This clause, "Safeguarding Covered Defense Information and Cyber Incident Reporting," is the primary trigger for NIST 800-171 compliance.',
        helpText: 'Search your contracts for "252.204-7012" or "Safeguarding Covered Defense Information." It may be in an addendum or flow-down clause.',
        icon: FileText,
        options: [
            {
                label: 'Yes, confirmed',
                value: 'yes',
                description: 'We have identified DFARS 7012 in one or more contracts.',
                nextQuestion: 'q3_cui_types',
            },
            {
                label: 'Not sure',
                value: 'unsure',
                description: "We haven't reviewed our contracts for this clause yet.",
                nextQuestion: 'q3_cui_types',
                resultKey: 'needs_contract_review',
            },
            {
                label: 'No, not present',
                value: 'no',
                description: 'We have verified it is not in our contracts.',
                nextQuestion: 'q3_cui_types',
            },
        ],
    },
    {
        id: 'q3_cui_types',
        title: 'What types of sensitive information does your organization handle?',
        description: 'Select the category that best describes the data you receive from or generate for the government.',
        icon: ShieldCheck,
        options: [
            {
                label: 'Covered Defense Information (CDI)',
                value: 'cdi',
                description: 'Technical data, engineering drawings, specifications, or source code for defense systems.',
                nextQuestion: 'q4_processing',
                resultKey: 'cui_cdi',
            },
            {
                label: 'Controlled Technical Information (CTI)',
                value: 'cti',
                description: 'Technical information with military or space application subject to export controls.',
                nextQuestion: 'q4_processing',
                resultKey: 'cui_cti',
            },
            {
                label: 'Export Controlled (ITAR/EAR)',
                value: 'itar',
                description: 'Items or data on the USML or CCL requiring export licenses.',
                nextQuestion: 'q4_processing',
                resultKey: 'cui_itar',
            },
            {
                label: 'PII / PHI / FOUO',
                value: 'pii',
                description: 'Personally identifiable information, health records, or For Official Use Only data.',
                nextQuestion: 'q4_processing',
                resultKey: 'cui_pii',
            },
            {
                label: 'Not sure / None of the above',
                value: 'unsure',
                description: "We're not sure what type of sensitive data we handle.",
                nextQuestion: 'q5_data_flow',
                resultKey: 'needs_data_classification',
            },
        ],
    },
    {
        id: 'q4_processing',
        title: 'How does your organization interact with this data?',
        description: 'Understanding your data interaction model determines the scope of your CUI boundary.',
        icon: Network,
        options: [
            {
                label: 'Store, Process, and Transmit',
                value: 'store_process_transmit',
                description: 'We keep CUI on our systems, work with it, and send/receive it.',
                nextQuestion: 'q5_data_flow',
                resultKey: 'full_scope',
            },
            {
                label: 'Transit / Pass-through Only',
                value: 'transit',
                description: 'CUI passes through our systems but is not stored long-term.',
                nextQuestion: 'q5_data_flow',
                resultKey: 'transit_scope',
            },
            {
                label: 'Cloud / Hosted Service',
                value: 'cloud',
                description: 'We provide a cloud platform where CUI resides.',
                nextQuestion: 'q5_data_flow',
                resultKey: 'cloud_scope',
            },
        ],
    },
    {
        id: 'q5_data_flow',
        title: 'Do your subcontractors or vendors also handle this data?',
        description: 'Flow-down requirements mean your supply chain may also need to comply.',
        icon: Building2,
        options: [
            {
                label: 'Yes, CUI flows to subcontractors',
                value: 'yes',
                description: 'We share CUI with vendors, subcontractors, or cloud providers.',
                nextQuestion: null,
                resultKey: 'supply_chain',
            },
            {
                label: 'No, CUI stays internal',
                value: 'no',
                description: 'All CUI processing happens within our organization only.',
                nextQuestion: null,
                resultKey: 'internal_only',
            },
            {
                label: 'Not sure',
                value: 'unsure',
                description: "We haven't mapped our supply chain data flows.",
                nextQuestion: null,
                resultKey: 'needs_supply_chain_review',
            },
        ],
    },
];

// ── Result Determination ────────────────────────────────
interface QuizResult {
    applicable: boolean;
    level: 'definite' | 'likely' | 'unlikely' | 'not_applicable';
    title: string;
    summary: string;
    nextSteps: { label: string; link: string; icon: React.ElementType }[];
    warnings: string[];
}

function determineResult(answers: Record<string, string>): QuizResult {
    const hasDoD = answers.q1_dod_contracts === 'yes' || answers.q1_dod_contracts === 'pursuing';
    const hasDFARS = answers.q2_dfars_clause === 'yes';
    const dfarsUnsure = answers.q2_dfars_clause === 'unsure';
    const hasCUI = ['cdi', 'cti', 'itar', 'pii'].includes(answers.q3_cui_types);
    const noGov = answers.q1b_other_federal === 'no_gov';
    const supplyChain = answers.q5_data_flow === 'yes';

    if (noGov) {
        return {
            applicable: false,
            level: 'not_applicable',
            title: 'CUI Requirements Likely Do Not Apply',
            summary: 'Based on your answers, your organization does not appear to handle government data or have federal contracts. NIST 800-171 / CMMC compliance is not required at this time.',
            nextSteps: [
                { label: 'Review Your Contracts Anyway', link: 'federal/contracts', icon: FileText },
            ],
            warnings: [
                'If you begin pursuing government contracts in the future, revisit this assessment.',
                'Some commercial contracts may reference NIST 800-171 as a best practice.',
            ],
        };
    }

    if (hasDoD && hasDFARS && hasCUI) {
        return {
            applicable: true,
            level: 'definite',
            title: '✅ NIST 800-171 / CMMC Compliance Is Required',
            summary: 'Your organization has DoD contracts with DFARS 252.204-7012 and handles CUI. You must implement NIST SP 800-171 controls and prepare for CMMC certification.',
            nextSteps: [
                { label: 'Define CUI Boundary (Asset Inventory)', link: 'risks/assets', icon: ShieldCheck },
                { label: 'Start Gap Analysis', link: 'federal/gap-report', icon: AlertTriangle },
                { label: 'Run 800-171 Assessment', link: 'federal/assessment-171', icon: CheckCircle2 },
                { label: 'Develop SSP', link: 'federal/ssp-171', icon: FileText },
                { label: 'Follow the Program Guide', link: 'federal/program-guide', icon: ChevronRight },
            ],
            warnings: supplyChain ? [
                '⚠️ You indicated CUI flows to subcontractors. You must include DFARS 7012 flow-down clauses in your subcontracts.',
                'Your subcontractors must also achieve CMMC certification at the appropriate level.',
            ] : [],
        };
    }

    if (hasDoD && (dfarsUnsure || hasCUI)) {
        return {
            applicable: true,
            level: 'likely',
            title: '⚠️ CUI Compliance Is Likely Required',
            summary: 'Your organization has DoD involvement and may handle CUI. We strongly recommend completing your contract review and data classification to confirm.',
            nextSteps: [
                { label: 'Review Contracts for DFARS 7012', link: 'federal/contracts', icon: FileText },
                { label: 'Define CUI Boundary (Asset Inventory)', link: 'risks/assets', icon: ShieldCheck },
                { label: 'Follow the Program Guide', link: 'federal/program-guide', icon: ChevronRight },
            ],
            warnings: [
                'Complete your contract review to confirm the presence of DFARS 252.204-7012.',
                'Begin data classification to identify exactly where CUI exists in your environment.',
                dfarsUnsure ? 'You indicated you are unsure about DFARS clauses — this is the most critical step.' : '',
            ].filter(Boolean),
        };
    }

    return {
        applicable: false,
        level: 'unlikely',
        title: 'CUI Compliance May Not Be Required — But Verify',
        summary: 'Based on your answers, CUI compliance is not clearly required. However, we recommend verifying your contracts and data classification to be certain.',
        nextSteps: [
            { label: 'Review Contracts', link: 'federal/contracts', icon: FileText },
            { label: 'View Program Guide', link: 'federal/program-guide', icon: ChevronRight },
        ],
        warnings: [
            'Regulations evolve. Re-assess periodically, especially when winning new contracts.',
            'CMMC requirements are expanding. Even Level 1 (FCI) may apply soon.',
        ],
    };
}

// ── Component ───────────────────────────────────────────
export default function CuiApplicabilityQuiz() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || '0');
    const [, setLocation] = useLocation();

    const [currentQuestionId, setCurrentQuestionId] = useState<string>('q1_dod_contracts');
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });

    const currentQuestion = QUIZ_QUESTIONS.find(q => q.id === currentQuestionId);
    const progress = history.length;
    const totalEstimate = 5; // Rough estimate for progress bar

    const result = useMemo(() => {
        if (!isComplete) return null;
        return determineResult(answers);
    }, [isComplete, answers]);

    const handleAnswer = (optionValue: string, nextQuestion: string | null | undefined) => {
        setSelectedOption(optionValue);

        setTimeout(() => {
            const newAnswers = { ...answers, [currentQuestionId]: optionValue };
            setAnswers(newAnswers);
            setHistory([...history, currentQuestionId]);

            if (nextQuestion === null || nextQuestion === undefined) {
                setIsComplete(true);
            } else {
                setCurrentQuestionId(nextQuestion);
            }
            setSelectedOption(null);
        }, 300);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const prevId = history[history.length - 1];
        setHistory(history.slice(0, -1));
        setCurrentQuestionId(prevId);
        setIsComplete(false);

        const newAnswers = { ...answers };
        delete newAnswers[prevId];
        setAnswers(newAnswers);
    };

    const handleReset = () => {
        setCurrentQuestionId('q1_dod_contracts');
        setAnswers({});
        setHistory([]);
        setIsComplete(false);
        setSelectedOption(null);
    };

    return (
        <DashboardLayout>
            <div className="pb-20">
                <div className="px-6 pt-6 pb-2">
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', href: `/clients/${clientId}/dashboard` },
                            { label: 'Federal Compliance', href: `/clients/${clientId}/federal` },
                            { label: 'CUI Applicability Quiz' },
                        ]}
                    />
                </div>

                <div className="max-w-3xl mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-200 text-blue-700 text-sm font-bold mb-4">
                            <HelpCircle className="w-4 h-4" />
                            Guided Assessment
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            Does Your Organization Need CUI Compliance?
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-xl mx-auto">
                            Answer a few questions to determine if NIST 800-171, CMMC, or other CUI requirements apply to your organization.
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Question {Math.min(progress + 1, totalEstimate)} of ~{totalEstimate}
                            </span>
                            {history.length > 0 && !isComplete && (
                                <button
                                    onClick={handleBack}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    Previous
                                </button>
                            )}
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${isComplete ? 100 : Math.min((progress / totalEstimate) * 100, 95)}%` }}
                            />
                        </div>
                    </div>

                    {/* Question Card */}
                    {!isComplete && currentQuestion && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 bg-blue-100 rounded-xl">
                                            <currentQuestion.icon className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-slate-200">
                                            Step {progress + 1}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-900 leading-tight">
                                        {currentQuestion.title}
                                    </CardTitle>
                                    <CardDescription className="text-base leading-relaxed">
                                        {currentQuestion.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-6">
                                    {currentQuestion.options.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleAnswer(option.value, option.nextQuestion)}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${selectedOption === option.value
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 scale-[0.99]'
                                                    : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedOption === option.value
                                                        ? 'border-blue-500 bg-blue-500'
                                                        : 'border-slate-300 group-hover:border-blue-400'
                                                    }`}>
                                                    {selectedOption === option.value && (
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 text-sm">{option.label}</p>
                                                    {option.description && (
                                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{option.description}</p>
                                                    )}
                                                </div>
                                                <ArrowRight className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-all ${selectedOption === option.value
                                                        ? 'text-blue-500 translate-x-1'
                                                        : 'text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5'
                                                    }`} />
                                            </div>
                                        </button>
                                    ))}

                                    {currentQuestion.helpText && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-800 leading-relaxed">
                                                <strong>Tip:</strong> {currentQuestion.helpText}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Results */}
                    {isComplete && result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            {/* Result Card */}
                            <Card className={`border-none shadow-xl overflow-hidden ${result.level === 'definite' ? 'shadow-emerald-200/30' :
                                    result.level === 'likely' ? 'shadow-amber-200/30' :
                                        result.level === 'not_applicable' ? 'shadow-slate-200/30' :
                                            'shadow-blue-200/30'
                                }`}>
                                <div className={`px-6 py-4 ${result.level === 'definite' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                                        result.level === 'likely' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                            result.level === 'not_applicable' ? 'bg-gradient-to-r from-slate-600 to-slate-700' :
                                                'bg-gradient-to-r from-blue-600 to-indigo-600'
                                    } text-white`}>
                                    <div className="flex items-center gap-3">
                                        {result.applicable ? (
                                            <ShieldAlert className="w-7 h-7" />
                                        ) : (
                                            <ShieldCheck className="w-7 h-7" />
                                        )}
                                        <div>
                                            <p className="text-sm font-bold uppercase tracking-widest opacity-80">
                                                Assessment Result
                                            </p>
                                            <h2 className="text-xl font-black">{result.title}</h2>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    <p className="text-slate-700 leading-relaxed mb-6">
                                        {result.summary}
                                    </p>

                                    {/* Warnings */}
                                    {result.warnings.length > 0 && (
                                        <div className="mb-6 space-y-2">
                                            {result.warnings.map((w, i) => (
                                                <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-800 leading-relaxed">{w}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Next Steps */}
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Recommended Next Steps
                                    </h3>
                                    <div className="space-y-2">
                                        {result.nextSteps.map((step, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setLocation(`/clients/${clientId}/${step.link}`)}
                                                className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group text-left"
                                            >
                                                <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                                                    <step.icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <span className="flex-1 font-semibold text-sm text-slate-700 group-hover:text-blue-700">
                                                    {step.label}
                                                </span>
                                                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Answers Summary */}
                            <Card className="border-none shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                        Your Answers
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {history.map((qId) => {
                                            const q = QUIZ_QUESTIONS.find(x => x.id === qId);
                                            const a = answers[qId];
                                            const opt = q?.options.find(o => o.value === a);
                                            if (!q || !opt) return null;
                                            return (
                                                <div key={qId} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-xs text-slate-700 line-clamp-1">{q.title}</p>
                                                        <p className="text-xs text-blue-600 font-medium">{opt.label}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Also show the last question if not in history */}
                                        {!history.includes(currentQuestionId) && answers[currentQuestionId] && (() => {
                                            const q = QUIZ_QUESTIONS.find(x => x.id === currentQuestionId);
                                            const a = answers[currentQuestionId];
                                            const opt = q?.options.find(o => o.value === a);
                                            if (!q || !opt) return null;
                                            return (
                                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-xs text-slate-700 line-clamp-1">{q.title}</p>
                                                        <p className="text-xs text-blue-600 font-medium">{opt.label}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    className="rounded-xl gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Retake Quiz
                                </Button>
                                <Button
                                    onClick={() => setLocation(`/clients/${clientId}/federal/program-guide`)}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 shadow-md"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                    View Full Program Guide
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
