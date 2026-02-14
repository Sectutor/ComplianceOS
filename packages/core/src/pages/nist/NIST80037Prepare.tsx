
import React, { useState } from 'react';
import { useParams } from "wouter";
import NIST80037Layout from "./NIST80037Layout";
import { Play } from "lucide-react";
import { Users } from "lucide-react";
import { Globe } from "lucide-react";
import { Shield } from "lucide-react";
import { Target } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Plus } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Zap } from "lucide-react";
import { Scale } from "lucide-react";
import { Building2 } from "lucide-react";
import { Briefcase } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Save } from "lucide-react";

import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";

export default function NIST80037Prepare() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success("RMF Preparation Data Saved Successfully", {
                description: "System registration and risk strategy updated.",
            });
        }, 1500);
    };

    return (
        <NIST80037Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: `/dashboard` },
                        { label: "NIST Hub", href: `/clients/${clientId}/nist` },
                        { label: "SP 800-37 (RMF)", href: `/clients/${clientId}/nist/rmf` },
                        { label: "Step 0: Prepare" },
                    ]}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-600 text-white font-black px-3">STEP 0</Badge>
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700 font-bold uppercase tracking-widest text-[10px]">Preparation Phase</Badge>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                            <Play className="w-10 h-10 text-emerald-600" />
                            Organization & System Preparation
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-3xl">
                            Establish context and infrastructure for managing security and privacy risk before beginning the technical RMF steps.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 rounded-2xl h-14 px-8 shadow-xl shadow-emerald-200/50 font-black text-lg gap-2"
                    >
                        {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save RMF Context</>}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Progress Card */}
                    <Card className="lg:col-span-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/50 backdrop-blur-sm h-fit">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600">Prepare Task Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { task: "R-1: Role Assignments", status: "completed" },
                                { task: "R-2: Risk Strategy", status: "completed" },
                                { task: "R-3: Org Risk Assessment", status: "partial" },
                                { task: "S-1: Mission Definition", status: "pending" },
                                { task: "S-2: System Boundary", status: "pending" },
                                { task: "S-3: Information Types", status: "pending" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${item.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                        item.status === 'partial' ? 'border-amber-400 text-amber-500' : 'border-slate-200'
                                        }`}>
                                        {item.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-sm font-bold ${item.status === 'pending' ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-700'}`}>{item.task}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
                        <Tabs defaultValue="identification" className="w-full">
                            <div className="border-b px-8 bg-slate-50/50">
                                <TabsList className="h-16 bg-transparent gap-8">
                                    <TabsTrigger value="identification" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        System Identification
                                    </TabsTrigger>
                                    <TabsTrigger value="boundary" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Boundary Definition
                                    </TabsTrigger>
                                    <TabsTrigger value="roles" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Roles & Stakeholders
                                    </TabsTrigger>
                                    <TabsTrigger value="strategy" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Risk Strategy
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="h-[600px]">
                                <TabsContent value="identification" className="p-10 space-y-8 m-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4 md:col-span-2">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">System Name & Purpose (S-1)</Label>
                                            <Input placeholder="Enter official system name (e.g., Enterprise Cloud Operations)" className="h-14 rounded-2xl border-slate-200 focus:ring-emerald-500 text-lg font-bold" />
                                            <Textarea
                                                placeholder="Describe the mission or business processes the system supports..."
                                                className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">System Descriptor</Label>
                                            <Input placeholder="Unique System ID (e.g., SYS-2026-001)" className="h-12 rounded-xl" />
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Registration Status (S-4)</Label>
                                            <div className="flex gap-2">
                                                <Badge className="bg-emerald-100 text-emerald-700 py-2 px-4 rounded-xl font-bold cursor-pointer border-emerald-200">Registered</Badge>
                                                <Badge variant="outline" className="py-2 px-4 rounded-xl font-bold cursor-pointer text-slate-400">Pending Review</Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:col-span-2">
                                            <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Asset Inventory (S-6)</Label>
                                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                                        <Globe className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">Link Global Asset Inventory</h4>
                                                        <p className="text-xs text-slate-500 font-medium">Auto-import assets for this system boundary</p>
                                                    </div>
                                                </div>
                                                <Plus className="w-6 h-6 text-slate-300 group-hover:text-indigo-600" />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="boundary" className="p-10 space-y-8 m-0">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Authorization Boundary (S-7)</h3>
                                                <p className="text-sm text-slate-500 font-medium font-serif">Define the set of system components and data flows.</p>
                                            </div>
                                            <Button variant="outline" className="rounded-xl border-dashed border-2 gap-2 h-12">
                                                <ExternalLink className="w-4 h-4" /> Import Diagram
                                            </Button>
                                        </div>

                                        <div className="aspect-video bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group hover:bg-slate-100/50 transition-all cursor-pointer">
                                            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-4 text-emerald-500">
                                                <Target className="w-10 h-10" />
                                            </div>
                                            <p className="font-bold text-slate-500">Draft your boundary in Visual Architect</p>
                                            <p className="text-xs font-medium mt-1">NIST 800-37 system boundary mapping tool</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Logical Boundary</Label>
                                                <Textarea placeholder="VPCs, Subnets, Identity Providers..." className="rounded-2xl" />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Physical Boundary</Label>
                                                <Textarea placeholder="Data Centers, Office Locations, Remote Access Points..." className="rounded-2xl" />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="roles" className="p-10 space-y-8 m-0">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Management Role Assignments (R-1)</h3>
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                                                <Plus className="w-4 h-4" /> Assign New Role
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all text-slate-900">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100">
                                                        <Building2 className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authorizing Official (AO)</p>
                                                        <p className="text-lg font-bold text-slate-900">Sarah Jenkins (CEO)</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">Assignee Verified</Badge>
                                            </div>
                                            <div className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all text-slate-900">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100">
                                                        <Shield className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Chief Information Security Officer (CISO)</p>
                                                        <p className="text-lg font-bold text-slate-900">Marcus Chen</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">Assignee Verified</Badge>
                                            </div>
                                            <div className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all text-slate-900">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100">
                                                        <Briefcase className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">System Owner</p>
                                                        <p className="text-lg font-bold text-rose-400 italic">David Miller</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-indigo-600 font-bold underline">Assign Now</Button>
                                            </div>
                                            <div className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all text-slate-900">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100">
                                                        <Zap className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Information System Security Officer (ISSO)</p>
                                                        <p className="text-lg font-bold text-slate-900">Alex Rivera</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">Assignee Verified</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="strategy" className="p-10 space-y-8 m-0">
                                    <div className="space-y-8">
                                        <div className="p-8 bg-indigo-900 rounded-[3rem] text-white relative overflow-hidden">
                                            <div className="relative z-10 space-y-4">
                                                <h3 className="text-2xl font-black tracking-tight">Risk Management Strategy (R-2)</h3>
                                                <p className="text-indigo-200 font-medium leading-relaxed max-w-2xl">
                                                    The broad objective of the RMF is to ensure that enterprise-level strategy guides system-level decisions.
                                                </p>
                                                <div className="flex gap-4 pt-4">
                                                    <Button variant="secondary" className="bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl font-bold">Review Org Strategy</Button>
                                                    <Button variant="outline" className="border-indigo-400 text-white hover:bg-indigo-800 rounded-xl font-bold">Upload Custom Policy</Button>
                                                </div>
                                            </div>
                                            <Scale className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Risk Thresholds</Label>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                                                        <span>Low Impact (L)</span>
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black">ACCEPTABLE</Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                                                        <span>Moderate Impact (M)</span>
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-black">MITIGATION REQ</Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                                                        <span>High Impact (H)</span>
                                                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 font-black">AO REVIEW REQ</Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center text-center">
                                                <div className="bg-white w-20 h-20 rounded-full mx-auto shadow-sm flex items-center justify-center text-indigo-600 mb-4 border border-indigo-50">
                                                    <Users className="w-10 h-10" />
                                                </div>
                                                <h4 className="font-extrabold text-slate-900">Stakeholder Identification (S-5)</h4>
                                                <p className="text-xs text-slate-500 font-medium">Identify key stakeholders for security & privacy results</p>
                                                <Button variant="ghost" className="mt-4 text-indigo-600 font-black h-12 uppercase tracking-widest text-[10px] group">
                                                    Manage List <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                </Button>
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
