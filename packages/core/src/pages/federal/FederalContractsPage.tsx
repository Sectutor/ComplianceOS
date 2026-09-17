import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { format } from "date-fns";
import { Building2, ArrowRight, FileText, CheckCircle2, ShieldCheck, Plus, ListChecks } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { toast } from "sonner";

export default function FederalContractsPage() {
    const params = useParams();
    const clientId = Number(params.id);

    // Queries
    const { data: contracts, refetch, isLoading } = trpc.federal.listContracts.useQuery({ clientId });

    // State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        agencyName: '',
        contractNumber: '',
        type: 'prime',
        status: 'active',
        cmmcLevel: '',
        dfars7012: false,
        dfars7019: false,
        dfars7020: false,
        dfars7021: false,
        far5220421: false,
        startDate: '',
        endDate: ''
    });

    // Mutations
    const createContract = trpc.federal.createContract.useMutation({
        onSuccess: () => {
            toast.success("Contract added successfully");
            setIsDialogOpen(false);
            refetch();
        },
        onError: (err) => {
            toast.error("Failed to add contract: " + err.message);
        }
    });

    const updateContract = trpc.federal.updateContract.useMutation({
        onSuccess: () => {
            toast.success("Contract updated successfully");
            setIsDialogOpen(false);
            setEditingContract(null);
            refetch();
        },
        onError: (err) => {
            toast.error("Failed to update contract: " + err.message);
        }
    });

    const deleteContract = trpc.federal.deleteContract.useMutation({
        onSuccess: () => {
            toast.success("Contract deleted");
            setIsDialogOpen(false);
            setEditingContract(null);
            refetch();
        },
        onError: (err) => {
            toast.error("Failed to delete contract: " + err.message);
        }
    });

    const handleOpenDialog = (contract?: any) => {
        if (contract) {
            setEditingContract(contract);
            setFormData({
                title: contract.title || '',
                description: contract.description || '',
                agencyName: contract.agencyName || '',
                contractNumber: contract.contractNumber || '',
                type: contract.type || 'prime',
                status: contract.status || 'active',
                cmmcLevel: contract.cmmcLevel || '',
                dfars7012: !!contract.dfars7012,
                dfars7019: !!contract.dfars7019,
                dfars7020: !!contract.dfars7020,
                dfars7021: !!contract.dfars7021,
                far5220421: !!contract.far5220421,
                startDate: contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : '',
                endDate: contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : ''
            });
        } else {
            setEditingContract(null);
            setFormData({
                title: '',
                description: '',
                agencyName: '',
                contractNumber: '',
                type: 'prime',
                status: 'active',
                cmmcLevel: '',
                dfars7012: false,
                dfars7019: false,
                dfars7020: false,
                dfars7021: false,
                far5220421: false,
                startDate: '',
                endDate: ''
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.title) return toast.error("Title is required");

        if (editingContract) {
            updateContract.mutate({
                clientId,
                id: editingContract.id,
                ...formData
            });
        } else {
            createContract.mutate({
                clientId,
                ...formData
            });
        }
    };

    // Derived statistics
    const totalActive = contracts?.filter(c => c.status === 'active').length || 0;
    const requiringNist = contracts?.filter(c => c.dfars7012 || c.dfars7019 || c.dfars7020).length || 0;
    const requiringCmmc = contracts?.filter(c => c.dfars7021 || c.cmmcLevel).length || 0;

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 w-full">
                <Breadcrumb items={[
                    { label: "Dashboard", href: `/clients/${clientId}/dashboard` },
                    { label: "Federal Hub", href: `/clients/${clientId}/federal` },
                    { label: "Federal Contracts Tracker" }
                ]} />

                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <Building2 className="h-10 w-10 text-blue-600" />
                            Federal Contracts Tracker
                        </h1>
                        <p className="text-slate-500 text-lg max-w-3xl">Log and track Department of Defense (DoD) and civilian agency contracts. Automatically determine DFARS/CMMC applicability and compliance scope boundaries.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 font-bold h-12 px-6 shadow-md"
                            onClick={() => handleOpenDialog()}
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Add Contract
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-white border-slate-200">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Total Active</h3>
                            <div className="text-4xl font-black text-slate-900">{totalActive}</div>
                            <p className="text-slate-500 text-xs mt-2">Current federal engagements</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 border-l-4 border-l-amber-500">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">NIST 800-171 Scope</h3>
                            <div className="text-4xl font-black text-amber-600">{requiringNist}</div>
                            <p className="text-slate-500 text-xs mt-2">Contracts carrying DFARS 7012/19</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 border-l-4 border-l-blue-600">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">CMMC Scope</h3>
                            <div className="text-4xl font-black text-blue-600">{requiringCmmc}</div>
                            <p className="text-slate-500 text-xs mt-2">Contracts requiring CMMC validation</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">SPR Status</h3>
                            <div className="flex items-center gap-2 mt-4 text-emerald-600 font-bold">
                                <CheckCircle2 className="h-5 w-5" /> Required
                            </div>
                            <p className="text-slate-500 text-xs mt-2">SPRS score mapping needed for active scope</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Contracts List */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ListChecks className="h-6 w-6 text-slate-400" /> Contract Inventory
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : contracts?.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                            <CardContent className="p-12 text-center text-slate-500">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <h3 className="text-xl font-bold text-slate-700 mb-2">No Federal Contracts</h3>
                                <p className="mb-6 max-w-sm mx-auto">Get started by adding your first prime or subcontract to track compliance requirements.</p>
                                <Button onClick={() => handleOpenDialog()} variant="outline" className="border-blue-200 text-blue-700 font-bold bg-white">
                                    Add Your First Contract
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {contracts?.map((contract: any) => (
                                <Card
                                    key={contract.id}
                                    className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group"
                                    onClick={() => handleOpenDialog(contract)}
                                >
                                    {contract.dfars7012 && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 rotate-45 transform translate-x-8 -translate-y-8" />}
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{contract.title}</h3>
                                                    {contract.type === 'subcontractor' ? (
                                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Sub/Flow-down</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Prime</Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 font-medium">
                                                    {contract.agencyName || 'Unknown Agency'} • {contract.contractNumber || 'No Contract ID'}
                                                </div>
                                            </div>
                                            <Badge className={contract.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-400 hover:bg-slate-500 text-white'}>
                                                {contract.status.toUpperCase()}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-slate-600 mb-6 line-clamp-2 min-h-[40px]">
                                            {contract.description || "No description provided."}
                                        </p>

                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mt-auto">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Applicable Clauses</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {contract.dfars7012 && <Badge variant="secondary" className="bg-amber-100 text-amber-800">DFARS 7012</Badge>}
                                                {contract.dfars7019 && <Badge variant="secondary" className="bg-blue-100 text-blue-800">DFARS 7019</Badge>}
                                                {contract.dfars7020 && <Badge variant="secondary" className="bg-blue-100 text-blue-800">DFARS 7020</Badge>}
                                                {contract.dfars7021 && <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">DFARS 7021 (CMMC)</Badge>}
                                                {contract.far5220421 && <Badge variant="secondary" className="bg-slate-200 text-slate-800">FAR 52.204-21</Badge>}

                                                {!contract.dfars7012 && !contract.dfars7019 && !contract.dfars7020 && !contract.dfars7021 && !contract.far5220421 && (
                                                    <span className="text-sm text-slate-400 italic">No specific federal cyber clauses tracked</span>
                                                )}

                                                {contract.cmmcLevel && (
                                                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white ml-auto">
                                                        <ShieldCheck className="w-3 h-3 mr-1" /> {contract.cmmcLevel}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit/Add Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2 border-b">
                            <DialogTitle className="text-2xl font-black text-slate-900">
                                {editingContract ? 'Edit Federal Contract' : 'Add Federal Contract'}
                            </DialogTitle>
                            <DialogDescription>
                                Track contract details and specific DFARS/FAR cybersecurity clauses that dictate your compliance requirements.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4 p-6 overflow-y-auto w-full max-h-full">
                            {/* General Details */}
                            <div className="col-span-2 space-y-4">
                                <div>
                                    <Label className="font-bold">Contract/Engagement Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g., JADC2 Support Services"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="mt-1 font-medium bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-bold">Agency/Department</Label>
                                        <Input
                                            placeholder="e.g., DoD, Air Force, NASA"
                                            value={formData.agencyName}
                                            onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="font-bold">Contract / Solicitation No.</Label>
                                        <Input
                                            placeholder="e.g., W911W6-18-D-0001"
                                            value={formData.contractNumber}
                                            onChange={e => setFormData({ ...formData, contractNumber: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-start">
                                    <div>
                                        <Label className="font-bold mb-2">Role Type</Label>
                                        <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="prime">Prime Contractor</SelectItem>
                                                <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="font-bold mb-2">Status</Label>
                                        <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="prospective">Prospective (Bid)</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label className="font-bold">Summary/Description</Label>
                                    <Textarea
                                        placeholder="Brief description of the work performed and types of data handled..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="mt-1 h-20 bg-slate-50"
                                    />
                                </div>
                            </div>

                            {/* Clauses Section */}
                            <div className="col-span-2 pt-6 pb-2 border-b mt-2">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                    Security Clauses & Requirements
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Select the specific clauses called out in the contract or RFP.</p>
                            </div>

                            <div className="col-span-2 grid grid-cols-2 gap-y-4 gap-x-6 mt-2">
                                <label className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-blue-50 transition-colors">
                                    <Checkbox
                                        checked={formData.dfars7012}
                                        onCheckedChange={(val) => setFormData({ ...formData, dfars7012: !!val })}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-sm">DFARS 252.204-7012</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Safeguarding Covered Defense Information (CUI). Mandates NIST 800-171.</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-blue-50 transition-colors">
                                    <Checkbox
                                        checked={formData.dfars7019}
                                        onCheckedChange={(val) => setFormData({ ...formData, dfars7019: !!val })}
                                    />
                                    <div>
                                        <div className="font-bold text-sm">DFARS 252.204-7019</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Notice of NIST 800-171 DoD Assessment Requirements (SPRS Score).</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-blue-50 transition-colors">
                                    <Checkbox
                                        checked={formData.dfars7020}
                                        onCheckedChange={(val) => setFormData({ ...formData, dfars7020: !!val })}
                                    />
                                    <div>
                                        <div className="font-bold text-sm">DFARS 252.204-7020</div>
                                        <div className="text-xs text-slate-500 mt-0.5">NIST SP 800-171 DoD Assessment Requirements (Allows DoD entry).</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg bg-indigo-50 border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <Checkbox
                                        checked={formData.dfars7021}
                                        onCheckedChange={(val) => setFormData({ ...formData, dfars7021: !!val })}
                                    />
                                    <div>
                                        <div className="font-bold text-sm text-indigo-900">DFARS 252.204-7021 (CMMC)</div>
                                        <div className="text-xs text-indigo-700 mt-0.5">Cybersecurity Maturity Model Certification Requirements.</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-blue-50 transition-colors">
                                    <Checkbox
                                        checked={formData.far5220421}
                                        onCheckedChange={(val) => setFormData({ ...formData, far5220421: !!val })}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-sm">FAR 52.204-21</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Basic Safeguarding of Covered Contractor Info (FCI). CMMC Level 1 equivalent.</div>
                                    </div>
                                </label>

                                <div className="flex flex-col">
                                    <Label className="font-bold mb-2">Targeted CMMC Level</Label>
                                    <Select value={formData.cmmcLevel} onValueChange={(val) => setFormData({ ...formData, cmmcLevel: val })}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="No specific level identified" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Level 1">Level 1 (Foundational / FCI)</SelectItem>
                                            <SelectItem value="Level 2">Level 2 (Advanced / CUI)</SelectItem>
                                            <SelectItem value="Level 3">Level 3 (Expert)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="border-t p-6 bg-slate-50">
                            {editingContract && (
                                <Button
                                    variant="destructive"
                                    onClick={() => deleteContract.mutate({ clientId, id: editingContract.id })}
                                    className="mr-auto font-bold"
                                >
                                    Delete
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold bg-white">Cancel</Button>
                            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 text-white" disabled={createContract.isPending || updateContract.isPending}>
                                {createContract.isPending || updateContract.isPending ? 'Saving...' : 'Save Contract'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
