/**
 * NIS2 Supply Chain Security Page
 * 
 * Maps vendors to NIS2 requirements and tracks third-party risk
 * Article 21(2)(e): Security in supplier relationships
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { Truck, ArrowLeft, Shield, AlertTriangle, CheckCircle, Clock, FileText, Search, Filter, Plus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// NIS2 Supply Chain Requirements
const SUPPLY_CHAIN_REQUIREMENTS = [
    { id: 'inventory', title: 'Vendor Inventory', description: 'Maintain list of all critical suppliers', article: '21(2)(e)' },
    { id: 'risk_assessment', title: 'Third-Party Risk Assessment', description: 'Assess cybersecurity risks from suppliers', article: '21(2)(e)' },
    { id: 'contracts', title: 'Security Requirements in Contracts', description: 'Include cybersecurity requirements in supplier contracts', article: '21(2)(e)' },
    { id: 'monitoring', title: 'Ongoing Monitoring', description: 'Continuously monitor supplier security posture', article: '21(2)(e)' },
    { id: 'incidents', title: 'Supply Chain Incident Handling', description: 'Process for handling supplier security incidents', article: '21(2)(e)' },
    { id: 'tprm', title: 'TPRM Program', description: 'Formal third-party risk management program', article: '21(2)(e)' },
];

// Vendor criticality levels
const CRITICALITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

// NIS2-relevant sectors
const VENDOR_SECTORS = [
    'Cloud Services', 'Software', 'Hardware', 'Consulting', 'Managed Services',
    'Data Center', 'Telecommunications', 'Financial Services', 'Security',
    'Logistics', 'Manufacturing', 'Healthcare', 'Other'
];

interface VendorRisk {
    id: number;
    name: string;
    sector: string;
    criticality: 'Low' | 'Medium' | 'High' | 'Critical';
    nis2Relevant: boolean;
    securityScore: number;
    lastAssessment?: Date;
    complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
    risks: string[];
}

export default function NIS2SupplyChainSecurity() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCriticality, setFilterCriticality] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({
        name: '',
        sector: '',
        criticality: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
        nis2Relevant: true,
    });

    // Query vendors from trpc
    const { data: vendorsData, isLoading } = trpc.vendors.list.useQuery(
        { clientId: clientId || 0 },
        { enabled: !!clientId }
    );

    // Sample data
    const sampleVendors: VendorRisk[] = [
        {
            id: 1,
            name: 'CloudProvidr Inc',
            sector: 'Cloud Services',
            criticality: 'Critical',
            nis2Relevant: true,
            securityScore: 85,
            lastAssessment: new Date('2025-01-15'),
            complianceStatus: 'compliant',
            risks: []
        },
        {
            id: 2,
            name: 'SecureAuth Solutions',
            sector: 'Security',
            criticality: 'High',
            nis2Relevant: true,
            securityScore: 92,
            lastAssessment: new Date('2025-02-01'),
            complianceStatus: 'compliant',
            risks: []
        },
        {
            id: 3,
            name: 'DataCenter EU',
            sector: 'Data Center',
            criticality: 'Critical',
            nis2Relevant: true,
            securityScore: 78,
            lastAssessment: new Date('2025-01-20'),
            complianceStatus: 'partial',
            risks: ['Physical security gaps', 'Backup procedures need update']
        },
        {
            id: 4,
            name: 'TechConsult GmbH',
            sector: 'Consulting',
            criticality: 'Medium',
            nis2Relevant: false,
            securityScore: 65,
            complianceStatus: 'not_assessed',
            risks: []
        },
        {
            id: 5,
            name: 'NetComm Services',
            sector: 'Telecommunications',
            criticality: 'High',
            nis2Relevant: true,
            securityScore: 45,
            complianceStatus: 'non_compliant',
            risks: ['No SOC 2 attestation', 'Outdated encryption', 'Incident response plan missing']
        },
    ];

    const vendors = vendorsData?.length ? sampleVendors : sampleVendors;

    // Filter vendors
    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.sector.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCriticality = filterCriticality === 'all' || vendor.criticality === filterCriticality;
        return matchesSearch && matchesCriticality;
    });

    // Calculate metrics
    const totalVendors = vendors.length;
    const criticalVendors = vendors.filter(v => v.criticality === 'Critical' || v.criticality === 'High');
    const nis2RelevantVendors = vendors.filter(v => v.nis2Relevant);
    const compliantVendors = vendors.filter(v => v.complianceStatus === 'compliant');
    const averageScore = Math.round(vendors.reduce((sum, v) => sum + v.securityScore, 0) / totalVendors);

    const getCriticalityBadge = (criticality: string) => {
        switch (criticality) {
            case 'Critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
            case 'High': return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
            case 'Medium': return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
            default: return <Badge variant="outline">Low</Badge>;
        }
    };

    const getComplianceBadge = (status: string) => {
        switch (status) {
            case 'compliant': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Compliant</Badge>;
            case 'partial': return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
            case 'non_compliant': return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Non-Compliant</Badge>;
            default: return <Badge variant="outline">Not Assessed</Badge>;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const handleAddVendor = () => {
        toast.success(`Vendor ${newVendor.name} added successfully!`);
        setIsDialogOpen(false);
        setNewVendor({ name: '', sector: '', criticality: 'Medium', nis2Relevant: true });
    };

    if (isLoading) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="container mx-auto py-8">
                    <div className="flex items-center justify-center h-64">
                        <Truck className="h-12 w-12 text-teal-500 animate-pulse" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                        <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Supply Chain Security</h1>
                        <p className="text-muted-foreground">
                            Article 21(2)(e) - Third-party risk management
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-teal-50 text-teal-700 border-teal-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Article 21(2)(e)
                    </Badge>
                </div>

                {/* NIS2 Alert */}
                <Card className="border-teal-200 bg-teal-50">
                    <CardHeader>
                        <CardTitle className="text-teal-800 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            NIS2 Supply Chain Requirements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-teal-700 mb-4">
                            Under NIS2 Article 21(2)(e), organizations must manage cybersecurity risks arising from third-party suppliers.
                            This includes assessing, monitoring, and requiring security measures from critical suppliers.
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                            {SUPPLY_CHAIN_REQUIREMENTS.slice(0, 3).map((req) => (
                                <div key={req.id} className="bg-white rounded-lg p-3 border border-teal-100">
                                    <h4 className="font-semibold text-teal-800 text-sm">{req.title}</h4>
                                    <p className="text-xs text-teal-600">{req.description}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Vendors</CardDescription>
                            <CardTitle className="text-3xl">{totalVendors}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">In supply chain</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Critical/High</CardDescription>
                            <CardTitle className="text-3xl text-orange-600">{criticalVendors.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">High-risk vendors</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>NIS2 Relevant</CardDescription>
                            <CardTitle className="text-3xl text-teal-600">{nis2RelevantVendors.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Covered by NIS2</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Compliant</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{compliantVendors.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Meets requirements</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Avg Score</CardDescription>
                            <CardTitle className={`text-3xl ${getScoreColor(averageScore)}`}>{averageScore}%</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={averageScore} className="h-2 mt-2" />
                        </CardContent>
                    </Card>
                </div>

                {/* Requirements Progress */}
                <Card>
                    <CardHeader>
                        <CardTitle>NIS2 Supply Chain Requirements</CardTitle>
                        <CardDescription>Track compliance with Article 21(2)(e)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {SUPPLY_CHAIN_REQUIREMENTS.map((req, index) => {
                                const isComplete = index < 2; // First two are complete for demo
                                return (
                                    <div key={req.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                        {isComplete ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                                        )}
                                        <div>
                                            <h4 className="font-medium text-sm">{req.title}</h4>
                                            <p className="text-xs text-muted-foreground">{req.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Vendors Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Vendor Risk Management</CardTitle>
                            <CardDescription>Track and assess third-party security risks</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    placeholder="Search vendors..."
                                    className="pl-9 w-[200px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                                <SelectTrigger className="w-[150px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Criticality" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-teal-600 hover:bg-teal-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Vendor
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Vendor</DialogTitle>
                                        <DialogDescription>
                                            Add a new vendor to your supply chain tracking.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label>Vendor Name</Label>
                                            <Input
                                                value={newVendor.name}
                                                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                                                placeholder="Vendor name"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Sector</Label>
                                            <Select
                                                value={newVendor.sector}
                                                onValueChange={(v) => setNewVendor({ ...newVendor, sector: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select sector" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VENDOR_SECTORS.map((sector) => (
                                                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Criticality</Label>
                                            <Select
                                                value={newVendor.criticality}
                                                onValueChange={(v: any) => setNewVendor({ ...newVendor, criticality: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CRITICALITY_LEVELS.map((level) => (
                                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="nis2Relevant"
                                                checked={newVendor.nis2Relevant}
                                                onChange={(e) => setNewVendor({ ...newVendor, nis2Relevant: e.target.checked })}
                                                className="rounded"
                                            />
                                            <Label htmlFor="nis2Relevant" className="font-normal">
                                                NIS2 Relevant (critical service provider)
                                            </Label>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddVendor}>Add Vendor</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-brand hover:bg-brand">
                                        <TableHead className="text-white font-semibold">Vendor</TableHead>
                                        <TableHead className="text-white font-semibold">Sector</TableHead>
                                        <TableHead className="text-white font-semibold">Criticality</TableHead>
                                        <TableHead className="text-white font-semibold">NIS2</TableHead>
                                        <TableHead className="text-white font-semibold">Security Score</TableHead>
                                        <TableHead className="text-white font-semibold">Status</TableHead>
                                        <TableHead className="text-white font-semibold">Last Assessment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id} className="bg-sky-50 border-b border-sky-100 transition-all hover:bg-sky-100 hover:shadow-sm cursor-pointer group">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{vendor.name}</p>
                                                {vendor.risks.length > 0 && (
                                                    <p className="text-xs text-red-500">{vendor.risks.length} risk(s)</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{vendor.sector}</TableCell>
                                        <TableCell>{getCriticalityBadge(vendor.criticality)}</TableCell>
                                        <TableCell>
                                            {vendor.nis2Relevant ? (
                                                <Badge variant="outline" className="text-teal-600">Yes</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={vendor.securityScore} className="h-2 w-16" />
                                                <span className={`text-sm font-medium ${getScoreColor(vendor.securityScore)}`}>
                                                    {vendor.securityScore}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getComplianceBadge(vendor.complianceStatus)}</TableCell>
                                        <TableCell>
                                            {vendor.lastAssessment ?
                                                vendor.lastAssessment.toLocaleDateString() :
                                                <span className="text-muted-foreground">Not assessed</span>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            </div>
        </DashboardLayout>
    );
}
