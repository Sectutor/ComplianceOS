import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
    Building2, Shield, FileText, CheckCircle2,
    Loader2, Rocket, ArrowLeft, ArrowRight,
    Users, Sparkles, Lock, BarChart3,
    ChevronRight, Info, HelpCircle
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

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #020617 0%, #312e81 50%, #020617 100%)' }}>
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/clients")}
                        className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to clients
                    </button>
                    <div className="h-4 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white">New Client Workspace</span>
                    </div>
                </div>

                {/* Step progress pills */}
                <div className="hidden md:flex items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                                step === s.id
                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                    : step > s.id
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-white/10 text-gray-400"
                            )}>
                                {step > s.id
                                    ? <CheckCircle2 className="h-3 w-3" />
                                    : <span>{s.id}</span>}
                                <span className="hidden lg:inline">{s.title}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <ChevronRight className="h-3 w-3 text-gray-500" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="text-xs text-gray-400">Step {step} of {STEPS.length}</div>
            </header>

            {/* Progress bar */}
            <div className="px-8 py-3 border-b border-white/5">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Progress</span>
                        <span className="text-xs text-gray-400">{Math.round((step / STEPS.length) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${(step / STEPS.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {/* Step 1: Company Info */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 mb-4">
                                            <Building2 className="h-7 w-7 text-indigo-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Who's your client?</h1>
                                        <p className="text-gray-300">Basic details to set up their workspace</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <Label className="text-gray-200 text-sm font-medium">Company Name *</Label>
                                                <Input
                                                    className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-400 focus:ring-indigo-400/20"
                                                    placeholder="e.g. Acme Corp"
                                                    value={company.name}
                                                    onChange={e => setCompany({ ...company, name: e.target.value })}
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-gray-200 text-sm font-medium">Industry *</Label>
                                                <div className="mt-1.5 grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                                                    {INDUSTRIES.map(ind => (
                                                        <button
                                                            key={ind}
                                                            onClick={() => setCompany({ ...company, industry: ind })}
                                                            className={cn(
                                                                "text-left px-3 py-2 rounded-lg text-sm border transition-all",
                                                                company.industry === ind
                                                                    ? "bg-indigo-600 border-indigo-400 text-white font-medium"
                                                                    : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
                                                            )}
                                                        >
                                                            {ind}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-gray-200 text-sm font-medium">Website</Label>
                                                    <Input
                                                        className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                                                        placeholder="https://acme.com"
                                                        value={company.website}
                                                        onChange={e => setCompany({ ...company, website: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-gray-200 text-sm font-medium">Employees</Label>
                                                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                                        {["1–10", "11–50", "51–200", "201–500", "500+"].map(size => (
                                                            <button
                                                                key={size}
                                                                onClick={() => setCompany({ ...company, employees: size })}
                                                                className={cn(
                                                                    "px-2 py-1.5 rounded-lg text-xs border transition-all",
                                                                    company.employees === size
                                                                        ? "bg-indigo-600 border-indigo-400 text-white"
                                                                        : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30"
                                                                )}
                                                            >
                                                                {size}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-gray-200 text-sm font-medium">Description (optional)</Label>
                                            <Textarea
                                                className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500 resize-none"
                                                placeholder="Brief description for AI context..."
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
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-400/30 mb-4">
                                            <Shield className="h-7 w-7 text-purple-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Compliance frameworks</h1>
                                        <p className="text-gray-300">Which standards does {company.name || "your client"} need to meet?</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {FRAMEWORKS.map(fw => {
                                            const selected = selectedFrameworks.includes(fw.id);
                                            return (
                                                <button
                                                    key={fw.id}
                                                    onClick={() => toggleFramework(fw.id)}
                                                    className={cn(
                                                        "relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200",
                                                        selected
                                                            ? "border-indigo-400 bg-indigo-500/20"
                                                            : "border-white/10 bg-white/5 hover:border-white/30"
                                                    )}
                                                >
                                                    {selected && (
                                                        <div className="absolute top-3 right-3">
                                                            <CheckCircle2 className="h-5 w-5 text-indigo-300" />
                                                        </div>
                                                    )}
                                                    <span className="text-2xl mb-2">{fw.icon}</span>
                                                    <div className="font-semibold text-sm text-white mb-0.5">{fw.name}</div>
                                                    <div className="text-xs text-gray-400 mb-2 line-clamp-2">{fw.desc}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                                                            {fw.controls} controls
                                                        </span>
                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                                                            {fw.badge}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedFrameworks.length > 0 && (
                                        <div className="flex items-center justify-center gap-6 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl py-3">
                                            <span><strong className="text-white">{selectedFrameworks.length}</strong> frameworks selected</span>
                                            <span className="text-white/20">|</span>
                                            <span><strong className="text-white">~{totalControls}</strong> controls to implement</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Risk Profile */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/30 mb-4">
                                            <BarChart3 className="h-7 w-7 text-amber-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Risk context</h1>
                                        <p className="text-gray-300">Helps us prioritise controls for {company.name || "your client"}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                        {[
                                            { key: "cloudOnly", label: "Cloud-first infrastructure", desc: "Systems run primarily in the cloud (AWS, Azure, GCP)" },
                                            { key: "hasPersonalData", label: "Processes personal data", desc: "Stores or processes customer PII or employee data" },
                                            { key: "regulated", label: "Operates in a regulated industry", desc: "Finance, health, government, or critical infrastructure" },
                                        ].map(item => (
                                            <div
                                                key={item.key}
                                                onClick={() => setRiskProfile(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    riskProfile[item.key as keyof typeof riskProfile]
                                                        ? "border-amber-400/50 bg-amber-500/10"
                                                        : "border-white/10 bg-white/5 hover:border-white/30"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                    riskProfile[item.key as keyof typeof riskProfile]
                                                        ? "border-amber-400 bg-amber-500"
                                                        : "border-white/30 bg-transparent"
                                                )}>
                                                    {riskProfile[item.key as keyof typeof riskProfile] &&
                                                        <CheckCircle2 className="h-3 w-3 text-white" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{item.label}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                        <div>
                                            <Label className="text-gray-200 text-sm font-medium">Additional context (optional)</Label>
                                            <Textarea
                                                className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-gray-500 resize-none"
                                                placeholder="Any specific compliance requirements, industry regulations, or security concerns..."
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
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/20 border border-pink-400/30 mb-4">
                                            <Sparkles className="h-7 w-7 text-pink-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">White-label branding</h1>
                                        <p className="text-gray-300">Customise how the workspace appears to {company.name || "your client"}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                                        <div>
                                            <Label className="text-gray-200 text-sm font-medium">Workspace name</Label>
                                            <Input
                                                className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                                                placeholder={`${company.name || "Acme"} Compliance Portal`}
                                                value={branding.customName}
                                                onChange={e => setBranding({ ...branding, customName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-200 text-sm font-medium">Tagline (optional)</Label>
                                            <Input
                                                className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                                                placeholder="Secure by design. Compliant by default."
                                                value={branding.motto}
                                                onChange={e => setBranding({ ...branding, motto: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-200 text-sm font-medium">Accent colour</Label>
                                            <div className="flex items-center gap-3 mt-2">
                                                <input
                                                    type="color"
                                                    value={branding.accentColor}
                                                    onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                                                    className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                                                />
                                                <div className="flex gap-2">
                                                    {["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setBranding({ ...branding, accentColor: color })}
                                                            className={cn(
                                                                "h-7 w-7 rounded-full border-2 transition-all",
                                                                branding.accentColor === color ? "border-white scale-110" : "border-transparent"
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-gray-300 text-sm font-mono">{branding.accentColor}</span>
                                            </div>
                                        </div>

                                        {/* Preview card */}
                                        <div className="mt-4 rounded-xl p-4 border border-white/10 bg-white/5">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Preview</div>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                                                    style={{ backgroundColor: branding.accentColor }}
                                                >
                                                    {(company.name || "A")[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">
                                                        {branding.customName || `${company.name || "Acme"} Compliance Portal`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
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
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/30 mb-4">
                                            <Users className="h-7 w-7 text-emerald-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Invite your client contact</h1>
                                        <p className="text-gray-300">They'll get access to fill in questionnaires and sign off on policies</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-gray-200 text-sm font-medium">Contact Name</Label>
                                                <Input
                                                    className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                                                    placeholder="Jane Smith"
                                                    value={invite.contactName}
                                                    onChange={e => setInvite({ ...invite, contactName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-gray-200 text-sm font-medium">Contact Email</Label>
                                                <Input
                                                    className="mt-1.5 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                                                    placeholder="jane@acme.com"
                                                    type="email"
                                                    value={invite.contactEmail}
                                                    onChange={e => setInvite({ ...invite, contactEmail: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setInvite({ ...invite, sendInvite: !invite.sendInvite })}
                                            className={cn(
                                                "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                invite.sendInvite
                                                    ? "border-emerald-400/50 bg-emerald-500/10"
                                                    : "border-white/10 bg-white/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                invite.sendInvite ? "border-emerald-400 bg-emerald-500" : "border-white/30"
                                            )}>
                                                {invite.sendInvite && <CheckCircle2 className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">Send invitation email immediately</div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    They'll receive a secure link to access their compliance workspace
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                                            <Lock className="h-3.5 w-3.5 text-gray-500" />
                                            <span>Client can only see their own data — your MSP account stays private</span>
                                        </div>

                                        <button
                                            onClick={() => setStep(6)}
                                            className="w-full text-center text-sm text-gray-400 hover:text-gray-200 py-2 transition-colors"
                                        >
                                            Skip for now → set up later
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Review & Confirm */}
                            {step === 6 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 mb-4">
                                            <FileText className="h-7 w-7 text-indigo-300" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Review & confirm</h1>
                                        <p className="text-gray-300">Double-check everything before launching</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                        {/* Company summary */}
                                        <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                                            <Building2 className="h-5 w-5 text-indigo-300 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-semibold text-white">{company.name}</div>
                                                <div className="text-xs text-gray-400">{company.industry} • {company.employees || 'N/A'} employees</div>
                                                {company.website && <div className="text-xs text-gray-500">{company.website}</div>}
                                            </div>
                                        </div>
                                        {/* Frameworks summary */}
                                        <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                                            <Shield className="h-5 w-5 text-purple-300 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-semibold text-white">{selectedFrameworks.length} Frameworks</div>
                                                <div className="text-xs text-gray-400">{selectedFrameworks.map(id => FRAMEWORKS.find(f => f.id === id)?.name).join(', ')}</div>
                                                <div className="text-xs text-indigo-300 mt-1">~{totalControls} controls will be generated</div>
                                            </div>
                                        </div>
                                        {/* Risk summary */}
                                        <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                                            <BarChart3 className="h-5 w-5 text-amber-300 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-semibold text-white">Risk Profile</div>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {riskProfile.cloudOnly && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Cloud-first</span>}
                                                    {riskProfile.hasPersonalData && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Personal data</span>}
                                                    {riskProfile.regulated && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Regulated</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Branding summary */}
                                        <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                                            <Sparkles className="h-5 w-5 text-pink-300 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-semibold text-white">
                                                    {branding.customName || `${company.name} Compliance Portal`}
                                                </div>
                                                <div className="text-xs text-gray-400">{branding.motto || 'Default tagline'}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: branding.accentColor }} />
                                                    <span className="text-xs text-gray-500">{branding.accentColor}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Contact summary */}
                                        <div className="flex items-start gap-4">
                                            <Users className="h-5 w-5 text-emerald-300 mt-0.5" />
                                            <div>
                                                {invite.contactName ? (
                                                    <>
                                                        <div className="text-sm font-semibold text-white">{invite.contactName}</div>
                                                        <div className="text-xs text-gray-400">{invite.contactEmail}</div>
                                                        <div className="text-xs text-emerald-300 mt-1">
                                                            {invite.sendInvite ? '✓ Invitation will be sent' : 'Invitation skipped'}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-gray-400">No contact invited yet</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-2">
                                        <Info className="h-3.5 w-3.5 text-gray-500" />
                                        <span>You can always update these settings after launch</span>
                                    </div>
                                </div>
                            )}

                            {/* Step 7: Done */}
                            {step === 7 && createdClientId && (
                                <div className="text-center space-y-6">
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/30 mx-auto mb-2"
                                    >
                                        <CheckCircle2 className="h-12 w-12 text-emerald-300" />
                                    </motion.div>
                                    <h1 className="text-4xl font-bold text-white">Workspace ready! 🎉</h1>
                                    <p className="text-gray-200 text-lg">
                                        <strong className="text-white">{company.name}</strong>'s compliance workspace has been provisioned with {selectedFrameworks.length} framework{selectedFrameworks.length !== 1 ? "s" : ""} and ~{totalControls} controls.
                                    </p>

                                    <div className="grid grid-cols-3 gap-4 my-8">
                                        {[
                                            { label: "Frameworks", value: selectedFrameworks.length, icon: Shield },
                                            { label: "Controls", value: `~${totalControls}`, icon: CheckCircle2 },
                                            { label: "AI Policies", value: "Auto-generated", icon: Sparkles },
                                        ].map(stat => (
                                            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <stat.icon className="h-5 w-5 text-indigo-300 mb-2 mx-auto" />
                                                <div className="text-xl font-bold text-white">{stat.value}</div>
                                                <div className="text-xs text-gray-400">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate("/clients")}
                                            className="border-white/20 text-gray-200 hover:bg-white/10"
                                        >
                                            Back to clients
                                        </Button>
                                        <Button
                                            onClick={() => navigate(`/clients/${createdClientId}/settings?tab=onboarding`)}
                                            className="border-white/20 text-gray-200 hover:bg-white/10 gap-2"
                                        >
                                            <Users className="h-4 w-4" />
                                            Setup employee onboarding
                                        </Button>
                                        <Button
                                            onClick={() => navigate(`/clients/${createdClientId}`)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            <Rocket className="h-4 w-4" />
                                            Enter workspace
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation footer (hidden on step 7 - success) */}
                    {step < 7 && (
                        <div className="flex items-center justify-between mt-8">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                disabled={step === 1}
                                className="text-gray-300 hover:text-white hover:bg-white/10 gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>

                            {step < 5 ? (
                                <Button
                                    onClick={() => {
                                        if (!canNext()) {
                                            toast.error(step === 1 ? "Please enter a company name and select an industry" : "Please select at least one framework");
                                            return;
                                        }
                                        setStep(prev => prev + 1);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            ) : step === 5 ? (
                                <Button
                                    onClick={() => setStep(6)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    Continue to review
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleLaunch}
                                    disabled={isProcessing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 min-w-[160px]"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Launching...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="h-4 w-4" />
                                            Launch workspace
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
