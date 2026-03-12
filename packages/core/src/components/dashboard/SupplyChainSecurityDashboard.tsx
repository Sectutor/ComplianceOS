/**
 * Supply Chain Security Dashboard
 * 
 * NIS2 Article 21(2)(e) requires entities to manage cybersecurity risks
 * arising from third-party suppliers.
 * 
 * Features:
 * - Vendor risk scoring
 * - Critical supplier tracking
 * - NIS2 compliance mapping
 * - Incident notification tracking
 */

import React, { useState } from "react";
import {
    Network,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    Building2,
    Eye,
    FileText,
    Send,
    RefreshCw,
    Filter,
    Search,
    ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Input } from "@complianceos/ui/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@complianceos/ui/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";

// NIS2 Supply Chain Requirements
const NIS2_SUPPLY_CHAIN_REQUIREMENTS = [
    { id: "inventory", title: "Vendor Inventory", description: "Maintain list of all critical suppliers" },
    { id: "risk_assessment", title: "Risk Assessment", description: "Evaluate supplier security posture" },
    { id: "contracts", title: "Security Contracts", description: "Include security clauses in contracts" },
    { id: "monitoring", title: "Continuous Monitoring", description: "Regular supplier security reviews" },
    { id: "incident_notification", title: "Incident Notification", description: "Require suppliers to notify of breaches" },
    { id: "exit_strategy", title: "Exit Strategy", description: "Have plans for supplier transitions" }
];

interface VendorRisk {
    id: number;
    name: string;
    category: string;
    criticality: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    lastAssessment?: Date;
    certifications: string[];
    nis2Category?: string;
    supplyChainImpact?: string;
    hasDPA: boolean;
    incidentNotifications: number;
}

interface SupplyChainSecurityDashboardProps {
    clientId?: number;
}

export function SupplyChainSecurityDashboard({ clientId }: SupplyChainSecurityDashboardProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;

    // Query for vendors
    const { data: vendorsData, isLoading, refetch } = trpc.vendorAssessments.listVendors.useQuery(
        { clientId: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    const [filter, setFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Sample vendor data (in production, this comes from queries)
    const sampleVendors: VendorRisk[] = [
        {
            id: 1,
            name: "CloudHost Pro",
            category: "Infrastructure",
            criticality: "critical",
            riskScore: 85,
            lastAssessment: new Date("2025-02-15"),
            certifications: ["ISO 27001", "SOC 2 Type II"],
            nis2Category: "Digital Infrastructure",
            supplyChainImpact: "High",
            hasDPA: true,
            incidentNotifications: 0
        },
        {
            id: 2,
            name: "SecureAuth Inc",
            category: "Security",
            criticality: "critical",
            riskScore: 92,
            lastAssessment: new Date("2025-01-20"),
            certifications: ["ISO 27001", "SOC 2"],
            nis2Category: "Identity Provider",
            supplyChainImpact: "High",
            hasDPA: true,
            incidentNotifications: 1
        },
        {
            id: 3,
            name: "DataFlow Analytics",
            category: "Analytics",
            criticality: "high",
            riskScore: 68,
            lastAssessment: new Date("2024-12-10"),
            certifications: ["SOC 2"],
            hasDPA: true,
            incidentNotifications: 0
        },
        {
            id: 4,
            name: "Legacy ERP Systems",
            category: "Enterprise Software",
            criticality: "high",
            riskScore: 45,
            lastAssessment: new Date("2024-06-15"),
            certifications: [],
            hasDPA: false,
            incidentNotifications: 2
        },
        {
            id: 5,
            name: "Global Logistics Co",
            category: "Logistics",
            criticality: "medium",
            riskScore: 72,
            lastAssessment: new Date("2025-01-05"),
            certifications: ["ISO 27001"],
            hasDPA: true,
            incidentNotifications: 0
        }
    ];

    // Filter vendors
    const filteredVendors = sampleVendors.filter(vendor => {
        const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === "all" || vendor.criticality === filter;
        return matchesSearch && matchesFilter;
    });

    // Calculate metrics
    const totalVendors = sampleVendors.length;
    const criticalVendors = sampleVendors.filter(v => v.criticality === "critical" || v.criticality === "high");
    const assessedVendors = sampleVendors.filter(v => v.lastAssessment);
    const vendorsWithDPA = sampleVendors.filter(v => v.hasDPA);
    const averageRiskScore = Math.round(sampleVendors.reduce((acc, v) => acc + v.riskScore, 0) / totalVendors);
    const overdueAssessments = sampleVendors.filter(v => {
        if (!v.lastAssessment) return true;
        const monthsSince = (new Date().getTime() - v.lastAssessment.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsSince > 12;
    }).length;

    const getRiskColor = (score: number) => {
        if (score >= 80) return "text-emerald-600 bg-emerald-50";
        if (score >= 60) return "text-amber-600 bg-amber-50";
        return "text-red-600 bg-red-50";
    };

    const getCriticalityBadge = (criticality: string) => {
        switch (criticality) {
            case "critical": return "bg-red-100 text-red-700 border-red-200";
            case "high": return "bg-orange-100 text-orange-700 border-orange-200";
            case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    if (!effectiveClientId) {
        return null;
    }

    return (
        <Card className="border-slate-200/60 shadow-lg shadow-slate-100/50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
                            <Network className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Supply Chain Security
                            </CardTitle>
                            <CardDescription className="text-sm">
                                NIS2 Article 21(2)(e) - Third-party risk management
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Import Vendors
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* NIS2 Alert */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-purple-800">NIS2 Supply Chain Requirements</h4>
                            <p className="text-sm text-purple-700 mt-1">
                                Organizations must manage cybersecurity risks arising from third-party suppliers.
                                Critical suppliers must be identified, assessed, and continuously monitored.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-slate-900">{totalVendors}</div>
                        <div className="text-xs text-slate-500 font-medium">Total Vendors</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-red-600">{criticalVendors.length}</div>
                        <div className="text-xs text-slate-500 font-medium">Critical/High Risk</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-600">{assessedVendors.length}</div>
                        <div className="text-xs text-slate-500 font-medium">Assessed</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-amber-600">{overdueAssessments}</div>
                        <div className="text-xs text-slate-500 font-medium">Overdue</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-blue-600">{averageRiskScore}%</div>
                        <div className="text-xs text-slate-500 font-medium">Avg Score</div>
                    </div>
                </div>

                {/* NIS2 Requirements Progress */}
                <div>
                    <h4 className="font-semibold text-slate-900 mb-3">NIS2 Compliance Requirements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {NIS2_SUPPLY_CHAIN_REQUIREMENTS.map((req) => {
                            const isComplete = req.id === "inventory" || req.id === "contracts";
                            return (
                                <div
                                    key={req.id}
                                    className={`border rounded-xl p-3 ${isComplete ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-sm text-slate-900">{req.title}</h5>
                                            <p className="text-xs text-slate-500 mt-1">{req.description}</p>
                                        </div>
                                        {isComplete ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-amber-500" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Vendor Table */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-900">Vendor Risk Register</h4>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search vendors..."
                                    className="pl-9 w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Filter by risk" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Risks</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold">Vendor</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Criticality</TableHead>
                                    <TableHead className="font-semibold">Risk Score</TableHead>
                                    <TableHead className="font-semibold">Last Assessment</TableHead>
                                    <TableHead className="font-semibold">Certifications</TableHead>
                                    <TableHead className="font-semibold">DPA</TableHead>
                                    <TableHead className="font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVendors.map((vendor) => (
                                    <TableRow key={vendor.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium">
                                            <div>
                                                <div className="text-slate-900">{vendor.name}</div>
                                                {vendor.nis2Category && (
                                                    <div className="text-xs text-purple-600">{vendor.nis2Category}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{vendor.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getCriticalityBadge(vendor.criticality)}>
                                                {vendor.criticality.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={vendor.riskScore} className="w-16 h-2" />
                                                <span className={`text-sm font-medium ${vendor.riskScore >= 80 ? 'text-emerald-600' : vendor.riskScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {vendor.riskScore}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {vendor.lastAssessment ? (
                                                <span className="text-sm text-slate-600">
                                                    {vendor.lastAssessment.toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-amber-600">Never</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {vendor.certifications.map((cert, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-[10px]">
                                                        {cert}
                                                    </Badge>
                                                ))}
                                                {vendor.certifications.length === 0 && (
                                                    <span className="text-xs text-slate-400">None</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {vendor.hasDPA ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <FileText className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 pt-2 border-t">
                    <Button variant="outline" className="gap-2">
                        <Send className="h-4 w-4" />
                        Send Assessment Requests
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Generate SAR Report
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Run Risk Scan
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default SupplyChainSecurityDashboard;
