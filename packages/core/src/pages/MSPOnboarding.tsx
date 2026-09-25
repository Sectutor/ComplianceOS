import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
    Building2, Shield, FileText, CheckCircle2, Check,
    Loader2, Rocket, ArrowLeft, ArrowRight,
    Users, Sparkles, Lock, BarChart3, Info
} from "lucide-react";

const FRAMEWORKS = [
    {
        id: "iso27001", name: "ISO 27001", icon: "🛡️", color: "blue",
        desc: "International information security management standard",
        badge: "Most Popular", controls: 114
    },
    {
        id: "soc2", name: "SOC 2 Type II", icon: "🔐", color: "indigo",
        desc: "Trust Services Criteria for SaaS & cloud services",
        badge: "US Standard", controls: 60
    },
    {
        id: "gdpr", name: "GDPR", icon: "🇪🇺", color: "emerald",
        desc: "EU data protection and privacy regulation",
        badge: "EU Required", controls: 45
    },
    {
        id: "nist", name: "NIST CSF 2.0", icon: "🏛️", color: "purple",
        desc: "US cybersecurity framework for critical infrastructure",
        badge: "Gov/Fed", controls: 108
    },
    {
        id: "iso27701", name: "ISO 27701", icon: "🔒", color: "rose",
        desc: "Privacy information management extension to ISO 27001",
        badge: "Privacy", controls: 49
    },
    {
        id: "cmmc", name: "CMMC 2.0", icon: "⭐", color: "amber",
        desc: "Cybersecurity Maturity Model Certification for DoD",
        badge: "Defense", controls: 110
    },
];

const INDUSTRIES = [
    "FinTech", "HealthTech", "SaaS", "E-commerce", "Legal",
    "Consulting", "Manufacturing", "Education", "Government", "Other"
];

const STEPS = [
    { id: 1, title: "Company Info", icon: Building2, desc: "Client basics", help: "Enter your client's basic information to set up their workspace" },
    { id: 2, title: "Frameworks", icon: Shield, desc: "Standards", help: "Select which compliance frameworks your client needs to meet" },
    { id: 3, title: "Risk Profile", icon: BarChart3, desc: "Scope & context", help: "Help us prioritise controls based on your client's risk profile" },
    { id: 4, title: "Branding", icon: Sparkles, desc: "White-label", help: "Customise how the workspace appears to your client" },
    { id: 5, title: "Invite Client", icon: Users, desc: "Onboard contact", help: "Invite your client contact to access their workspace" },
    { id: 6, title: "Review", icon: FileText, desc: "Confirm details", help: "Review all details before launching the workspace" },
    { id: 7, title: "Launch", icon: Rocket, desc: "Go live", help: "Your client's workspace is ready!" },
];

export default function MSPOnboarding() {
    const [, navigate] = useLocation();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdClientId, setCreatedClientId] = useState<number | null>(null);

    // Form data
    const [company, setCompany] = useState({
        name: "", industry: "", description: "", website: "", employees: "",
    });
    const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["iso27001"]);
    const [riskProfile, setRiskProfile] = useState({
        cloudOnly: true, hasPersonalData: true, regulated: true, notes: "",
    });
    const [branding, setBranding] = useState({
        accentColor: "#6366f1", customName: "", motto: "",
    });
    const [invite, setInvite] = useState({
        contactName: "", contactEmail: "", sendInvite: true,
    });

    const onboard = trpc.clients.onboard.useMutation();
    const utils = trpc.useUtils();

    const toggleFramework = (id: string) => {
        setSelectedFrameworks(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const canNext = () => {
        if (step === 1) return company.name.trim().length > 0 && company.industry.length > 0;
        if (step === 2) return selectedFrameworks.length > 0;
        return true;
    };

    const handleLaunch = async () => {
        setIsProcessing(true);
        try {
            const frameworkMap: Record<string, string> = {
                iso27001: "ISO 27001", soc2: "SOC 2", gdpr: "GDPR",
                nist: "NIST CSF", iso27701: "ISO 27701", cmmc: "CMMC"
            };
            const frameworks = selectedFrameworks.map(f => frameworkMap[f]).filter(Boolean);

            const result = await onboard.mutateAsync({
                name: company.name,
                industry: company.industry,
                frameworks,
                companyName: company.name,
                generatePolicies: true,
            });

            setCreatedClientId(result.id);
            utils.clients.list.invalidate();
            toast.success(`${company.name}'s workspace is ready! 🎉`);
            setStep(7);
        } catch (err) {
            toast.error("Failed to create workspace. Please try again.");
            setIsProcessing(false);
        }
    };

    const totalControls = selectedFrameworks
        .map(id => FRAMEWORKS.find(f => f.id === id)?.controls || 0)
        .reduce((a, b) => a + b, 0);

    const inputCls = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5";
    const textareaCls = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5";
    const labelCls = "text-sm font-medium text-slate-900";
    const cardCls = "rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-6";

    const chipCls = (selected: boolean) =>
        cn(
            "text-left px-4 py-2.5 rounded-xl text-[15px] border transition-all duration-200",
            selected
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
        );

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-2xl px-6 py-10">
                {/* Masthead */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate("/clients")}
                        className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Clients
                    </button>
                    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        New Client Workspace
                    </span>
                </div>

                {/* Segmented progress */}
                <div className="mt-8 flex items-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step}>
                    {STEPS.map(s => (
                        <div
                            key={s.id}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors duration-500",
                                step >= s.id ? "bg-slate-900" : "bg-slate-200"
                            )}
                        />
                    ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-600">{STEPS[step - 1].title}</span>
                    <span>Step {step} of {STEPS.length}</span>
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-10"
                    >
                        {/* Step 1: Company Info */}
                        {step === 1 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Who's your client?</h1>
                                <p className="mt-2 text-lg text-slate-500">Basic details to set up their workspace.</p>
                                <div className={cn("mt-8", cardCls)}>
                                    <div>
                                        <Label className={labelCls}>Company Name</Label>
                                        <Input
                                            className={inputCls}
                                            placeholder="e.g. Acme Corp"
                                            value={company.name}
                                            onChange={e => setCompany({ ...company, name: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <Label className={labelCls}>Industry</Label>
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {INDUSTRIES.map(ind => (
                                                <button key={ind} onClick={() => setCompany({ ...company, industry: ind })} className={chipCls(company.industry === ind)}>
                                                    {ind}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div>
                                            <Label className={labelCls}>Website</Label>
                                            <Input
                                                className={cn(inputCls, "mt-2")}
                                                placeholder="https://acme.com"
                                                value={company.website}
                                                onChange={e => setCompany({ ...company, website: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className={labelCls}>Employees</Label>
                                            <div className="mt-3 grid grid-cols-3 gap-2">
                                                {["1–10", "11–50", "51–200", "201–500", "500+"].map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setCompany({ ...company, employees: size })}
                                                        className={cn(chipCls(company.employees === size), "px-2 py-2 text-center text-sm")}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className={labelCls}>Description <span className="font-normal text-slate-400">(optional)</span></Label>
                                        <Textarea
                                            className={textareaCls}
                                            placeholder="Brief description for AI context…"
                                            rows={2}
                                            value={company.description}
                                            onChange={e => setCompany({ ...company, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Frameworks */}
                        {step === 2 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Compliance frameworks</h1>
                                <p className="mt-2 text-lg text-slate-500">
                                    Which standards does {company.name || "your client"} need to meet?
                                </p>
                                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                    {FRAMEWORKS.map(fw => {
                                        const selected = selectedFrameworks.includes(fw.id);
                                        return (
                                            <button
                                                key={fw.id}
                                                onClick={() => toggleFramework(fw.id)}
                                                className={cn(
                                                    "relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-200",
                                                    selected
                                                        ? "border-slate-900 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="text-[15px] font-semibold text-slate-900">{fw.name}</div>
                                                    <div className={cn(
                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                                                        selected ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"
                                                    )}>
                                                        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-sm leading-snug text-slate-500">{fw.desc}</div>
                                                <div className="mt-4 text-xs text-slate-400">
                                                    {fw.controls} controls · {fw.badge}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedFrameworks.length > 0 && (
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm text-slate-500">
                                        <span>
                                            <strong className="font-semibold text-slate-900">{selectedFrameworks.length}</strong> framework{selectedFrameworks.length !== 1 ? "s" : ""} selected
                                        </span>
                                        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
                                        <span>
                                            <strong className="font-semibold text-slate-900">~{totalControls}</strong> controls to implement
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Risk Profile */}
                        {step === 3 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Risk context</h1>
                                <p className="mt-2 text-lg text-slate-500">
                                    Helps us prioritise controls for {company.name || "your client"}.
                                </p>
                                <div className={cn("mt-8", cardCls)}>
                                    <div className="space-y-3">
                                        {[
                                            { key: "cloudOnly", label: "Cloud-first infrastructure", desc: "Systems run primarily in the cloud (AWS, Azure, GCP)" },
                                            { key: "hasPersonalData", label: "Processes personal data", desc: "Stores or processes customer PII or employee data" },
                                            { key: "regulated", label: "Operates in a regulated industry", desc: "Finance, health, government, or critical infrastructure" },
                                        ].map(item => {
                                            const on = riskProfile[item.key as keyof typeof riskProfile];
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => setRiskProfile(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                                    className={cn(
                                                        "flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200",
                                                        on ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                                                        on ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"
                                                    )}>
                                                        {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-medium text-slate-900">{item.label}</div>
                                                        <div className="mt-0.5 text-sm text-slate-500">{item.desc}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div>
                                        <Label className={labelCls}>Additional context <span className="font-normal text-slate-400">(optional)</span></Label>
                                        <Textarea
                                            className={textareaCls}
                                            placeholder="Any specific compliance requirements, industry regulations, or security concerns…"
                                            rows={3}
                                            value={riskProfile.notes}
                                            onChange={e => setRiskProfile({ ...riskProfile, notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Branding */}
                        {step === 4 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">White-label branding</h1>
                                <p className="mt-2 text-lg text-slate-500">
                                    Customise how the workspace appears to {company.name || "your client"}.
                                </p>
                                <div className={cn("mt-8", cardCls)}>
                                    <div>
                                        <Label className={labelCls}>Workspace name</Label>
                                        <Input
                                            className={inputCls}
                                            placeholder={`${company.name || "Acme"} Compliance Portal`}
                                            value={branding.customName}
                                            onChange={e => setBranding({ ...branding, customName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className={labelCls}>Tagline <span className="font-normal text-slate-400">(optional)</span></Label>
                                        <Input
                                            className={inputCls}
                                            placeholder="Secure by design. Compliant by default."
                                            value={branding.motto}
                                            onChange={e => setBranding({ ...branding, motto: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="msp-accent-color-picker" className={labelCls}>Accent colour</Label>
                                        <div className="mt-3 flex items-center gap-4">
                                            <input
                                                id="msp-accent-color-picker"
                                                type="color"
                                                aria-label="Brand accent color picker"
                                                value={branding.accentColor}
                                                onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                                                className="h-9 w-9 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5"
                                            />
                                            <div className="flex gap-2.5">
                                                {["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#0284c7"].map(color => (
                                                    <button
                                                        key={color}
                                                        aria-label={`Accent colour ${color}`}
                                                        onClick={() => setBranding({ ...branding, accentColor: color })}
                                                        className={cn(
                                                            "h-7 w-7 rounded-full transition-all",
                                                            branding.accentColor === color
                                                                ? "ring-2 ring-slate-900 ring-offset-2"
                                                                : "ring-1 ring-slate-200"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="font-mono text-sm text-slate-400">{branding.accentColor}</span>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Preview</div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <div
                                                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                                                style={{ backgroundColor: branding.accentColor }}
                                            >
                                                {(company.name || "A")[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-semibold text-slate-900">
                                                    {branding.customName || `${company.name || "Acme"} Compliance Portal`}
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    {branding.motto || "Powered by ComplianceOS"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Invite client */}
                        {step === 5 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Invite your client contact</h1>
                                <p className="mt-2 text-lg text-slate-500">
                                    They'll get access to fill in questionnaires and sign off on policies.
                                </p>
                                <div className={cn("mt-8", cardCls)}>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div>
                                            <Label className={labelCls}>Contact Name</Label>
                                            <Input
                                                className={inputCls}
                                                placeholder="Jane Smith"
                                                value={invite.contactName}
                                                onChange={e => setInvite({ ...invite, contactName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className={labelCls}>Contact Email</Label>
                                            <Input
                                                className={inputCls}
                                                placeholder="jane@acme.com"
                                                type="email"
                                                value={invite.contactEmail}
                                                onChange={e => setInvite({ ...invite, contactEmail: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setInvite({ ...invite, sendInvite: !invite.sendInvite })}
                                        className={cn(
                                            "flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200",
                                            invite.sendInvite ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                                            invite.sendInvite ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"
                                        )}>
                                            {invite.sendInvite && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-medium text-slate-900">Send invitation email immediately</div>
                                            <div className="mt-0.5 text-sm text-slate-500">
                                                They'll receive a secure link to access their compliance workspace
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-2.5 text-sm text-slate-400">
                                        <Lock className="h-4 w-4" />
                                        <span>Client can only see their own data — your MSP account stays private</span>
                                    </div>

                                    <button
                                        onClick={() => setStep(6)}
                                        className="w-full text-center text-[15px] text-slate-400 transition-colors hover:text-slate-900"
                                    >
                                        Skip for now — set up later
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 6: Review & Confirm */}
                        {step === 6 && (
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Review &amp; confirm</h1>
                                <p className="mt-2 text-lg text-slate-500">Double-check everything before launching.</p>
                                <div className={cn("mt-8", cardCls, "space-y-0 p-0")}>
                                    <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <Building2 className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-medium text-slate-900">{company.name}</div>
                                            <div className="mt-0.5 text-sm text-slate-500">{company.industry} • {company.employees || 'N/A'} employees</div>
                                            {company.website && <div className="mt-0.5 text-sm text-slate-400">{company.website}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <Shield className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-medium text-slate-900">
                                                {selectedFrameworks.length} Framework{selectedFrameworks.length !== 1 ? "s" : ""}
                                            </div>
                                            <div className="mt-0.5 text-sm text-slate-500">
                                                {selectedFrameworks.map(id => FRAMEWORKS.find(f => f.id === id)?.name).join(', ')}
                                            </div>
                                            <div className="mt-1 text-sm font-medium text-slate-700">~{totalControls} controls will be generated</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <BarChart3 className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-medium text-slate-900">Risk Profile</div>
                                            <div className="mt-1.5 flex flex-wrap gap-2">
                                                {riskProfile.cloudOnly && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Cloud-first</span>}
                                                {riskProfile.hasPersonalData && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Personal data</span>}
                                                {riskProfile.regulated && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Regulated</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <Sparkles className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-medium text-slate-900">
                                                {branding.customName || `${company.name} Compliance Portal`}
                                            </div>
                                            <div className="mt-0.5 text-sm text-slate-500">{branding.motto || 'Default tagline'}</div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: branding.accentColor }} />
                                                <span className="font-mono text-xs text-slate-400">{branding.accentColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <Users className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            {invite.contactName ? (
                                                <>
                                                    <div className="text-[15px] font-medium text-slate-900">{invite.contactName}</div>
                                                    <div className="mt-0.5 text-sm text-slate-500">{invite.contactEmail}</div>
                                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-emerald-600">
                                                        {invite.sendInvite ? <Check className="h-3.5 w-3.5" /> : null}
                                                        {invite.sendInvite ? 'Invitation will be sent' : 'Invitation skipped'}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-slate-500">No contact invited yet</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                                    <Info className="h-4 w-4" />
                                    <span>You can always update these settings after launch</span>
                                </div>
                            </div>
                        )}

                        {/* Step 7: Done */}
                        {step === 7 && createdClientId && (
                            <div className="py-8 text-center">
                                <motion.div
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500"
                                >
                                    <CheckCircle2 className="h-10 w-10 text-white" />
                                </motion.div>
                                <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-900">Workspace ready.</h1>
                                <p className="mx-auto mt-3 max-w-md text-lg text-slate-500">
                                    <strong className="font-semibold text-slate-900">{company.name}</strong>'s compliance workspace has been provisioned with {selectedFrameworks.length} framework{selectedFrameworks.length !== 1 ? "s" : ""} and ~{totalControls} controls.
                                </p>

                                <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3">
                                    {[
                                        { label: "Frameworks", value: selectedFrameworks.length },
                                        { label: "Controls", value: `~${totalControls}` },
                                        { label: "AI Policies", value: "Auto" },
                                    ].map(stat => (
                                        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</div>
                                            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                                    <button
                                        onClick={() => navigate("/clients")}
                                        className="h-11 rounded-full border border-slate-300 px-6 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-50"
                                    >
                                        Back to clients
                                    </button>
                                    <button
                                        onClick={() => navigate(`/clients/${createdClientId}/settings?tab=onboarding`)}
                                        className="h-11 rounded-full border border-slate-300 px-6 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-50"
                                    >
                                        Setup employee onboarding
                                    </button>
                                    <button
                                        onClick={() => navigate(`/clients/${createdClientId}`)}
                                        className="h-11 rounded-full bg-slate-900 px-6 text-[15px] font-medium text-white transition-colors hover:bg-slate-700"
                                    >
                                        Enter workspace
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Footer navigation (hidden on the success step) */}
                {step < 7 && (
                    <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                        <button
                            onClick={() => setStep(prev => Math.max(1, prev - 1))}
                            disabled={step === 1}
                            className="flex items-center gap-1.5 text-[15px] text-slate-500 transition-colors hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={() => {
                                    if (!canNext()) {
                                        toast.error(step === 1 ? "Please enter a company name and select an industry" : "Please select at least one framework");
                                        return;
                                    }
                                    setStep(prev => prev + 1);
                                }}
                                className="flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-[15px] font-medium text-white transition-colors hover:bg-slate-700"
                            >
                                Continue
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : step === 5 ? (
                            <button
                                onClick={() => setStep(6)}
                                className="flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-[15px] font-medium text-white transition-colors hover:bg-slate-700"
                            >
                                Continue to review
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunch}
                                disabled={isProcessing}
                                className="flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-full bg-slate-900 px-7 text-[15px] font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Launching…
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="h-4 w-4" />
                                        Launch workspace
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
