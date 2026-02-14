
import React, { useState } from 'react';
import { useParams } from "wouter";
import NIST80037Layout from "./NIST80037Layout";
import {
    Settings,
    Database,
    Shield,
    Zap,
    BarChart3,
    CheckCircle2,
    Plus,
    Search,
    AlertTriangle,
    FileText,
    LayoutGrid,
    Save,
    Globe,
    ShieldCheck,
    ArrowRight,
    Lock,
    Eye,
    ShieldAlert
} from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Progress } from "@complianceos/ui/ui/progress";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NIST80037Categorize() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success("Categorization Data Saved", {
                description: "Security categorization and high-water mark updated.",
            });
        }, 1500);
    };

    const impactLevels = [
        { level: "Low", color: "bg-emerald-50 text-emerald-700 border-emerald-100", score: 1 },
        { level: "Moderate", color: "bg-amber-50 text-amber-700 border-amber-100", score: 2 },
        { level: "High", color: "bg-rose-50 text-rose-700 border-rose-100", score: 3 }
    ];

    return (
        <NIST80037Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: `/dashboard` },
                        { label: "NIST Hub", href: `/clients/${clientId}/nist` },
                        { label: "SP 800-37 (RMF)", href: `/clients/${clientId}/nist/rmf` },
                        { label: "Step 1: Categorize" },
                    ]}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white font-black px-3">STEP 1</Badge>
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 font-bold uppercase tracking-widest text-[10px]">Categorization Phase</Badge>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                            <Settings className="w-10 h-10 text-indigo-600" />
                            System Categorization
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-3xl font-serif leading-relaxed italic">
                            Categorize the system and the information processed, stored, and transmitted based on an analysis of the impact of loss.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-14 px-8 shadow-xl shadow-indigo-200/50 font-black text-lg gap-2"
                    >
                        {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Update FIPS-199</>}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Status & Summary Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/50 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Security Objective</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-600">Confidentiality</span>
                                        <Badge className="bg-rose-500 text-white border-none font-black">HIGH</Badge>
                                    </div>
                                    <Progress value={100} className="h-1.5 bg-slate-100" indicatorClassName="bg-rose-500" />

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-600">Integrity</span>
                                        <Badge className="bg-amber-500 text-white border-none font-black">MODERATE</Badge>
                                    </div>
                                    <Progress value={66} className="h-1.5 bg-slate-100" indicatorClassName="bg-amber-500" />

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-600">Availability</span>
                                        <Badge className="bg-emerald-500 text-white border-none font-black">LOW</Badge>
                                    </div>
                                    <Progress value={33} className="h-1.5 bg-slate-100" indicatorClassName="bg-emerald-500" />
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">High-Water Mark</p>
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center gap-3">
                                        <ShieldAlert className="w-6 h-6 text-rose-600" />
                                        <span className="text-2xl font-black text-rose-700 tracking-tighter">HIGH / FIPS 199</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-900 text-white">
                            <CardHeader>
                                <CardTitle className="text-indigo-400 text-xs font-black uppercase tracking-widest">NIST 800-60 Alignment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    Information types are automatically mapped to NIST 800-60 Rev 1 guidelines for categorization.
                                </p>
                                <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800 rounded-xl h-10 text-xs font-bold uppercase tracking-widest">
                                    Browse NIST Catalog
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="lg:col-span-3 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
                        <Tabs defaultValue="inventory" className="w-full">
                            <div className="border-b px-8 bg-slate-50/50">
                                <TabsList className="h-16 bg-transparent gap-8">
                                    <TabsTrigger value="inventory" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Information Inventory
                                    </TabsTrigger>
                                    <TabsTrigger value="analysis" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Impact Analysis
                                    </TabsTrigger>
                                    <TabsTrigger value="fips" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        FIPS-199 Determination
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="h-[650px]">
                                <TabsContent value="inventory" className="p-10 space-y-8 m-0">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Information Types (C-1)</h3>
                                            <p className="text-sm text-slate-500 font-medium">Identify the types of information processed by the system.</p>
                                        </div>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 h-10">
                                            <Plus className="w-4 h-4" /> Add Info Type
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <Input placeholder="Search NIST 800-60 Service Types..." className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-indigo-500 font-bold" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { type: "Personally Identifiable Information (PII)", cat: "Privacy", impact: "High", icon: Database },
                                            { type: "Contract Management & Procurement", cat: "Business Services", impact: "Moderate", icon: FileText },
                                            { type: "Public Website Information", cat: "Public Relations", impact: "Low", icon: Globe },
                                            { type: "Financial Audit Data", cat: "Financial Management", impact: "Moderate", icon: BarChart3 }
                                        ].map((item, i) => (
                                            <div key={i} className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <item.icon className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-lg font-black text-slate-900">{item.type}</p>
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.cat}</Badge>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-500 mt-0.5">NIST SP 800-60 Rev 1 Descriptor: {item.cat === 'Privacy' ? 'D.1.1' : 'C.2.4'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className={cn(
                                                        "font-black px-3",
                                                        item.impact === 'High' ? "bg-rose-100 text-rose-700" :
                                                            item.impact === 'Moderate' ? "bg-amber-100 text-amber-700" :
                                                                "bg-emerald-100 text-emerald-700"
                                                    )}>{item.impact}</Badge>
                                                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-rose-500">
                                                        <Plus className="w-5 h-5 rotate-45" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="analysis" className="p-10 space-y-8 m-0">
                                    <div className="space-y-8">
                                        <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                                    <Shield className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight text-indigo-900">Impact Category Analysis (C-2)</h3>
                                            </div>
                                            <p className="text-indigo-700 font-medium leading-relaxed">
                                                For each security objective, describe the potential impact on organizational operations, assets, or individuals.
                                            </p>
                                        </div>

                                        <div className="space-y-10">
                                            {[
                                                { label: "Confidentiality", icon: Lock, description: "Unauthorized disclosure of information could have a limited, serious, or severe adverse effect.", current: "High" },
                                                { label: "Integrity", icon: ShieldCheck, description: "Unauthorized modification or destruction of information could have a limited, serious, or severe adverse effect.", current: "Moderate" },
                                                { label: "Availability", icon: Eye, description: "Disruption of access to or use of information could have a limited, serious, or severe adverse effect.", current: "Low" }
                                            ].map((obj, i) => (
                                                <div key={i} className="space-y-6 p-8 bg-white border rounded-[3rem] shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rotate-45 translate-x-16 -translate-y-16 group-hover:bg-indigo-50 transition-colors" />
                                                    <div className="flex items-center justify-between relative z-10">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                                                <obj.icon className="w-5 h-5" />
                                                            </div>
                                                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-wide">{obj.label}</h4>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {impactLevels.map((l) => (
                                                                <Button
                                                                    key={l.level}
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "h-10 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                                                        obj.current === l.level ? l.color + " ring-2 ring-offset-2 ring-indigo-500 border-transparent" : "border-slate-100 text-slate-400 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    {l.level}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impact Rationale</Label>
                                                        <Textarea
                                                            placeholder={`Describe why ${obj.label} impact is ${obj.current}...`}
                                                            className="rounded-2xl border-slate-100 min-h-[100px] focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="fips" className="p-10 space-y-10 m-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2 space-y-6">
                                            <div className="p-10 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden flex flex-col items-center text-center space-y-6">
                                                <div className="relative z-10">
                                                    <div className="w-20 h-20 bg-rose-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-rose-500/50 mb-6 mx-auto">
                                                        <ShieldAlert className="w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-4xl font-black tracking-tighter mb-2">High-Water Mark: HIGH</h3>
                                                    <p className="text-slate-400 font-medium max-w-lg mx-auto">
                                                        The overall categorization is based on the highest impact level across the three security objectives.
                                                    </p>
                                                </div>
                                                <div className="flex gap-4 relative z-10 pt-4">
                                                    <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs">
                                                        Download FIPS-199 Form
                                                    </Button>
                                                    <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs">
                                                        Approve Categorization
                                                    </Button>
                                                </div>
                                                <LayoutGrid className="absolute -bottom-20 -right-20 w-80 h-80 text-white/5 rotate-12" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Categorization Method (C-3)</Label>
                                            <Textarea
                                                placeholder="Describe the methodology used for this categorization..."
                                                className="rounded-[2rem] min-h-[150px]"
                                                defaultValue="Baseline categorization derived from NIST SP 800-60 Rev 1. High impact driven by PII processing in accordance with FIPS 199 guidelines."
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Reviewers & Approvers</Label>
                                            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-emerald-100 text-emerald-500">
                                                            <CheckCircle2 className="w-6 h-6" />
                                                        </div>
                                                        <span className="font-bold text-slate-900">CISO Approved</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Feb 12, 2026</span>
                                                </div>
                                                <div className="flex items-center justify-between opacity-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-300">
                                                            <CheckCircle2 className="w-6 h-6" />
                                                        </div>
                                                        <span className="font-bold text-slate-600">Authorizing Official</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Awaiting...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </NIST80037Layout>
    );
}
