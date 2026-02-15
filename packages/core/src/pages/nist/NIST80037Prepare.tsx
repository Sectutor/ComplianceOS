import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useParams, Link } from "wouter";
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
import { Info } from "lucide-react";
import { FileText, Trash2, X, UserCog } from "lucide-react";

import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Avatar, AvatarFallback } from "@complianceos/ui/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@complianceos/ui/ui/dialog";

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
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string, url: string, type: string }[]>([]);


    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success("RMF Preparation Data Saved Successfully", {
                description: "System registration and risk strategy updated.",
            });
        }, 1500);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const newFile = {
                name: file.name,
                url: URL.createObjectURL(file), // In a real app, this would be the S3 URL
                type: file.type
            };
            setUploadedFiles(prev => [...prev, newFile]);
            toast.success(`File attached: ${file.name}`, {
                description: "Document added to system boundary evidence."
            });
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const trpcContext = trpc.useContext();
    const { data: checklistState } = trpc.checklist.get.useQuery({
        clientId: clientId,
        checklistId: "nist-800-37-prepare"
    });

    const updateChecklistMutation = trpc.checklist.update.useMutation({
        onSuccess: () => {
            trpcContext.checklist.get.invalidate();
        }
    });

    const { data: employees = [] } = trpc.employees.list.useQuery({ clientId });

    // Store role assignments in local state for now, synced with checklist items in production

    const { data: orgRoles = [] } = trpc.orgRoles.list.useQuery({ clientId });

    // Dynamic RMF Roles State
    const [rmfRoles, setRmfRoles] = useState<{ id: string, title: string, icon: any, assigneeId: string | number | null }[]>([
        { id: "ao", title: "Authorizing Official (AO)", icon: Building2, assigneeId: null },
        { id: "ciso", title: "Chief Information Security Officer (CISO)", icon: Shield, assigneeId: null },
        { id: "system_owner", title: "System Owner", icon: Briefcase, assigneeId: null },
        { id: "isso", title: "Information System Security Officer (ISSO)", icon: Zap, assigneeId: null }
    ]);

    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [newRoleData, setNewRoleData] = useState({ roleTitle: "", employeeId: "" });

    // Default Roles Configuration
    const defaultRolesBase = [
        { id: "ao", title: "Authorizing Official (AO)", icon: Building2 },
        { id: "ciso", title: "Chief Information Security Officer (CISO)", icon: Shield },
        { id: "system_owner", title: "System Owner", icon: Briefcase },
        { id: "isso", title: "Information System Security Officer (ISSO)", icon: Zap }
    ];

    // Hydrate roles from checklist state (piggyback on r1 task)
    useEffect(() => {
        const r1Item = checklistState?.items?.['r1'];
        // Check if r1 is an object and has meta_roles
        if (typeof r1Item === 'object' && r1Item?.meta_roles) {
            const savedRoles = r1Item.meta_roles as any[];
            const hydratedRoles = savedRoles.map(r => {
                const defaultRole = defaultRolesBase.find(dr => dr.id === r.id);
                return {
                    ...r,
                    icon: defaultRole ? defaultRole.icon : (r.iconName === 'UserCog' ? UserCog : Users)
                };
            });
            setRmfRoles(hydratedRoles);
        } else {
            // Fallback defaults
            setRmfRoles(defaultRolesBase.map(role => ({ ...role, assigneeId: null })));
        }
    }, [checklistState?.items]);

    const saveRolesToBackend = (roles: typeof rmfRoles) => {
        const rolesToSave = roles.map(r => {
            const { icon, ...rest } = r;
            if (r.id.startsWith('custom_')) {
                return { ...rest, iconName: 'Users' };
            }
            return rest;
        });

        const currentR1 = checklistState?.items?.['r1'];
        const r1Data = typeof currentR1 === 'object' ? currentR1 : { checked: false };

        const newR1 = {
            ...r1Data,
            meta_roles: rolesToSave
        };

        const newItems = {
            ...(checklistState?.items || {}),
            r1: newR1
        };

        updateChecklistMutation.mutate({
            clientId,
            checklistId: "nist-800-37-prepare",
            items: newItems
        });
    };

    const handleAssignRole = (roleId: string, employeeId: string) => {
        const updatedRoles = rmfRoles.map(r =>
            r.id === roleId ? { ...r, assigneeId: employeeId } : r
        );
        setRmfRoles(updatedRoles);
        saveRolesToBackend(updatedRoles);
        toast.success("Role Assigned", {
            description: `User has been assigned to this role.`
        });
    };

    const handleRemoveAssignment = (roleId: string) => {
        const updatedRoles = rmfRoles.map(r =>
            r.id === roleId ? { ...r, assigneeId: null } : r
        );
        setRmfRoles(updatedRoles);
        saveRolesToBackend(updatedRoles);
        toast.info("Role Unassigned");
    };

    const handleAddRole = () => {
        if (!newRoleData.roleTitle) return;

        const newRole = {
            id: `custom_${Date.now()}`,
            title: newRoleData.roleTitle,
            icon: Users, // Safe icon
            assigneeId: newRoleData.employeeId || null
        };

        const updatedRoles = [...rmfRoles, newRole];
        setRmfRoles(updatedRoles);
        saveRolesToBackend(updatedRoles);

        setIsAddRoleOpen(false);
        setNewRoleData({ roleTitle: "", employeeId: "" });
        toast.success("New RMF Role Added", {
            description: `Added ${newRole.title} to the team.`
        });
    };

    const handleDeleteRole = (roleId: string) => {
        const updatedRoles = rmfRoles.filter(r => r.id !== roleId);
        setRmfRoles(updatedRoles);
        saveRolesToBackend(updatedRoles);
        toast.success("Role Removed from RMF Team");
    };

    const checklistItems = [
        { id: "r1", task: "R-1: Role Assignments" },
        { id: "r2", task: "R-2: Risk Strategy" },
        { id: "r3", task: "R-3: Org Risk Assessment" },
        { id: "s1", task: "S-1: Mission Definition" },
        { id: "s2", task: "S-2: System Boundary" },
        { id: "s3", task: "S-3: Information Types" }
    ];

    const getStatus = (id: string) => {
        const item = checklistState?.items?.[id];
        // If it's a boolean (legacy), true=completed, false=pending
        if (typeof item === 'boolean') return item ? 'completed' : 'pending';
        // If object (new), check 'checked' property or custom 'status' if we add it later
        if (typeof item === 'object') return item.checked ? 'completed' : 'pending';
        return 'pending';
    };

    const toggleStatus = (id: string, currentStatus: string) => {
        const newChecked = currentStatus !== 'completed';
        const currentItem = checklistState?.items?.[id];
        const itemData = typeof currentItem === 'object' ? currentItem : {};

        const newItems = {
            ...(checklistState?.items || {}),
            [id]: { ...itemData, checked: newChecked }
        };

        updateChecklistMutation.mutate({
            clientId,
            checklistId: "nist-800-37-prepare",
            items: newItems
        });
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

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start mb-8">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                        <Info className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-blue-900 text-lg">Page Guide: Managing Your Progress</h3>
                        <p className="text-blue-700 leading-relaxed font-medium">
                            Use the <strong>Detailed Tabs</strong> on the right (System Identification, Boundary, etc.) to input your system data.
                            The <strong>Prepare Task Checklist</strong> on the left is your personal tracker—manually mark items as "Completed" once you have finished the corresponding work in the tabs.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Progress Card */}
                    <Card className="lg:col-span-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/50 backdrop-blur-sm h-fit">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600">Prepare Task Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {checklistItems.map((item, i) => {
                                const status = getStatus(item.id);
                                return (
                                    <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => toggleStatus(item.id, status)}>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                                            {status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <span className={`text-sm font-bold ${status === 'pending' ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-700'}`}>{item.task}</span>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
                        <Tabs defaultValue="identification" className="w-full">
                            <div className="border-b px-8 bg-slate-50/50">
                                <TabsList className="h-16 bg-transparent gap-8">
                                    <TabsTrigger value="identification" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        System Identification
                                    </TabsTrigger>
                                    <TabsTrigger value="boundary" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Boundary Definition
                                    </TabsTrigger>
                                    <TabsTrigger value="roles" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
                                        Roles & Stakeholders
                                    </TabsTrigger>
                                    <TabsTrigger value="strategy" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none rounded-none font-black text-xs uppercase tracking-widest">
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
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*,.pdf,.vsdx"
                                                onChange={handleFileChange}
                                            />
                                            <Button variant="outline" onClick={handleImportClick} className="rounded-xl border-dashed border-2 gap-2 h-12">
                                                <ExternalLink className="w-4 h-4" /> Import Diagram
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            {uploadedFiles.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {uploadedFiles.map((file, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-slate-800">{file.name}</p>
                                                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 font-medium hover:underline">View Document</a>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeFile(idx)}
                                                                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-400">
                                                        <FileText className="w-8 h-8" />
                                                    </div>
                                                    <p className="font-bold text-slate-600">No documents uploaded</p>
                                                    <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">Upload architecture diagrams, data flow charts, or network topology documents.</p>
                                                    <Button variant="secondary" onClick={handleImportClick} className="bg-white border hover:bg-slate-50">
                                                        Select Files
                                                    </Button>
                                                </div>
                                            )}
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
                                            <Button onClick={() => setIsAddRoleOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                                                <Plus className="w-4 h-4" /> Add RMF Role
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {rmfRoles.map((role) => {
                                                const assignedEmployee = employees.find((e: any) => String(e.id) === String(role.assigneeId));
                                                const isCustom = role.id.startsWith('custom_');

                                                return (
                                                    <div key={role.id} className="p-6 bg-white border rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all text-slate-900 group">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100 relative">
                                                                <role.icon className="w-7 h-7" />
                                                                {isCustom && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border border-white" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{role.title}</p>
                                                                {assignedEmployee ? (
                                                                    <p className="text-lg font-bold text-slate-900">{assignedEmployee.firstName} {assignedEmployee.lastName}</p>
                                                                ) : (
                                                                    <p className="text-lg font-bold text-slate-300 italic">Unassigned</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {assignedEmployee ? (
                                                                <>
                                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">Assignee Verified</Badge>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-slate-400 hover:text-rose-500"
                                                                        onClick={() => handleRemoveAssignment(role.id)}
                                                                        title="Unassign User"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <div className="w-64">
                                                                    <Select onValueChange={(val) => handleAssignRole(role.id, val)}>
                                                                        <SelectTrigger className="h-10 rounded-xl border-indigo-200 text-indigo-600 font-bold focus:ring-0">
                                                                            <SelectValue placeholder="Assign Employee..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {employees.map((emp: any) => (
                                                                                <SelectItem key={emp.id} value={emp.id.toString()} className="font-medium">
                                                                                    {emp.firstName} {emp.lastName}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200"
                                                                onClick={() => handleDeleteRole(role.id)}
                                                                title="Delete Role"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                                                <Link href={`/clients/${clientId}/people`}>
                                                    <Button variant="ghost" className="mt-4 text-indigo-600 font-black h-12 uppercase tracking-widest text-[10px] group">
                                                        Manage List <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </Card>
                </div>
            </div>
            {/* Add Role Dialog */}
            <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add RMF Role</DialogTitle>
                        <DialogDescription>
                            Add a new role to your RMF team composition.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Role Title</Label>
                            <div className="flex flex-col gap-2">
                                <Input
                                    placeholder="Enter role title..."
                                    value={newRoleData.roleTitle}
                                    onChange={(e) => setNewRoleData(prev => ({ ...prev, roleTitle: e.target.value }))}
                                />
                                {orgRoles.length > 0 && (
                                    <Select
                                        onValueChange={(val) => setNewRoleData(prev => ({ ...prev, roleTitle: val }))}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-slate-50">
                                            <SelectValue placeholder="Or select from standard roles..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Privacy Officer">Privacy Officer</SelectItem>
                                            <SelectItem value="System Administrator">System Administrator</SelectItem>
                                            <SelectItem value="Data Steward">Data Steward</SelectItem>
                                            {orgRoles.map((role: any) => (
                                                <SelectItem key={role.id} value={role.title}>{role.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Assignee (Optional)</Label>
                            <Select
                                value={newRoleData.employeeId}
                                onValueChange={(val) => setNewRoleData(prev => ({ ...prev, employeeId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp: any) => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddRole}>Add Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </NIST80037Layout>
    );
}
