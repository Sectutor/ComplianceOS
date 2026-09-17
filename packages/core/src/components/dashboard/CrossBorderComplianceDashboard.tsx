/**
 * Cross-Border Compliance Dashboard
 * 
 * For companies operating in multiple EU member states, NIS2 requires compliance
 * with the national implementation of each jurisdiction where they operate.
 * 
 * Features:
 * - Multi-country compliance overview
 * - Country-specific requirements tracking
 * - Competent authority management
 * - Harmonization status
 */

import React, { useState } from "react";
import {
    Globe,
    Shield,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    Building2,
    Bell,
    Search,
    Plus,
    ArrowRight,
    Edit,
    Trash2,
    Eye,
    User,
    Mail,
    Phone,
    X
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import { toast } from "sonner";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";
import { getCompetentAuthority, EU_COUNTRIES, COMPETENT_AUTHORITIES } from "@/lib/nis2/competent-authorities";

interface EntityRegistration {
    id: number;
    countryCode: string;
    countryName: string;
    entityName: string;
    entityType: "essential" | "important";
    registrationNumber?: string;
    competentAuthority: string;
    complianceRate: number;
    lastAudit?: Date;
    status: "active" | "pending" | "non-compliant";
    // Additional NIS2 fields
    sector?: string;
    primaryContact?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    registrationDate?: Date;
    lastInspection?: Date;
    nextAuditDate?: Date;
    incidentCount?: number;
    fineHistory?: { year: number; amount: number; reason: string }[];
}

interface CrossBorderComplianceDashboardProps {
    clientId?: number;
}

export function CrossBorderComplianceDashboard({ clientId }: CrossBorderComplianceDashboardProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<EntityRegistration | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<EntityRegistration | null>(null);
    const [newEntity, setNewEntity] = useState({
        countryCode: "",
        entityName: "",
        entityType: "important" as "essential" | "important",
        registrationNumber: "",
        sector: "",
        primaryContact: "",
        contactEmail: "",
        contactPhone: "",
        address: ""
    });

    // Use state for registrations so newly added entities appear
    const [registrations, setRegistrations] = useState<EntityRegistration[]>([
        {
            id: 1,
            countryCode: "DE",
            countryName: "Germany",
            entityName: "Acme GmbH",
            entityType: "essential",
            registrationNumber: "DE-NIS2-001",
            competentAuthority: "BSI",
            complianceRate: 92,
            lastAudit: new Date("2025-01-15"),
            status: "active",
            sector: "Energy",
            primaryContact: "Hans Mueller",
            contactEmail: "hans.mueller@acme.de",
            contactPhone: "+49 30 12345678",
            address: "Alexanderplatz 1, 10178 Berlin",
            registrationDate: new Date("2023-06-01"),
            lastInspection: new Date("2025-01-15"),
            nextAuditDate: new Date("2026-01-15"),
            incidentCount: 2,
            fineHistory: []
        },
        {
            id: 2,
            countryCode: "FR",
            countryName: "France",
            entityName: "Acme SAS",
            entityType: "important",
            registrationNumber: "FR-NIS2-002",
            competentAuthority: "ANSSI",
            complianceRate: 85,
            lastAudit: new Date("2025-02-20"),
            status: "active",
            sector: "Healthcare",
            primaryContact: "Marie Dubois",
            contactEmail: "marie.dubois@acme.fr",
            contactPhone: "+33 1 23456789",
            address: "1 Rue de Rivoli, 75001 Paris",
            registrationDate: new Date("2023-08-15"),
            lastInspection: new Date("2025-02-20"),
            nextAuditDate: new Date("2026-02-20"),
            incidentCount: 1,
            fineHistory: [{ year: 2024, amount: 50000, reason: "Late incident notification" }]
        },
        {
            id: 3,
            countryCode: "NL",
            countryName: "Netherlands",
            entityName: "Acme BV",
            entityType: "important",
            competentAuthority: "NCSC-NL",
            complianceRate: 78,
            status: "pending",
            sector: "Digital Infrastructure",
            primaryContact: "Jan van Berg",
            contactEmail: "jan.vanberg@acme.nl",
            contactPhone: "+31 20 1234567",
            address: "Dam 1, 1012 JS Amsterdam",
            registrationDate: new Date("2024-03-01"),
            incidentCount: 0,
            fineHistory: []
        },
        {
            id: 4,
            countryCode: "AT",
            countryName: "Austria",
            entityName: "Acma GmbH",
            entityType: "important",
            registrationNumber: "AT-NIS2-004",
            competentAuthority: "BKO",
            complianceRate: 45,
            status: "non-compliant",
            sector: "Transport",
            primaryContact: "Stefan Weber",
            contactEmail: "stefan.weber@acma.at",
            contactPhone: "+43 1 2345678",
            address: "Schottenring 14-16, 1010 Wien",
            registrationDate: new Date("2023-09-01"),
            lastInspection: new Date("2024-09-15"),
            nextAuditDate: new Date("2025-03-01"),
            incidentCount: 5,
            fineHistory: [
                { year: 2024, amount: 150000, reason: "Security measure deficiencies" },
                { year: 2025, amount: 75000, reason: "Incomplete incident reporting" }
            ]
        },
        {
            id: 5,
            countryCode: "IT",
            countryName: "Italy",
            entityName: "Acme Srl",
            entityType: "essential",
            registrationNumber: "IT-NIS2-005",
            competentAuthority: "ACN",
            complianceRate: 88,
            lastAudit: new Date("2025-03-01"),
            status: "active",
            sector: "Banking",
            primaryContact: "Marco Rossi",
            contactEmail: "marco.rossi@acme.it",
            contactPhone: "+39 06 12345678",
            address: "Piazza Venezia 1, 00187 Roma",
            registrationDate: new Date("2023-04-15"),
            lastInspection: new Date("2025-03-01"),
            nextAuditDate: new Date("2026-03-01"),
            incidentCount: 0,
            fineHistory: []
        }
    ]);

    const handleAddEntity = () => {
        if (!newEntity.countryCode || !newEntity.entityName) {
            toast.error("Please fill in required fields");
            return;
        }

        const country = EU_COUNTRIES.find(c => c.code === newEntity.countryCode);
        const authority = getCompetentAuthority(newEntity.countryCode as any);

        // Add new entity to the registrations list
        const newId = Math.max(...registrations.map(r => r.id), 0) + 1;
        const newRegistration: EntityRegistration = {
            id: newId,
            countryCode: newEntity.countryCode,
            countryName: country?.name || newEntity.countryCode,
            entityName: newEntity.entityName,
            entityType: newEntity.entityType,
            registrationNumber: newEntity.registrationNumber || undefined,
            competentAuthority: authority?.acronym || "TBD",
            complianceRate: 0,
            status: "pending",
            sector: newEntity.sector || undefined,
            primaryContact: newEntity.primaryContact || undefined,
            contactEmail: newEntity.contactEmail || undefined,
            contactPhone: newEntity.contactPhone || undefined,
            address: newEntity.address || undefined,
            registrationDate: new Date(),
            incidentCount: 0,
            fineHistory: []
        };

        setRegistrations([...registrations, newRegistration]);
        toast.success(`Entity "${newEntity.entityName}" added for ${country?.name}`);
        setIsAddDialogOpen(false);
        setNewEntity({
            countryCode: "",
            entityName: "",
            entityType: "important",
            registrationNumber: "",
            sector: "",
            primaryContact: "",
            contactEmail: "",
            contactPhone: "",
            address: ""
        });
    };

    const handleEditEntity = (entity: EntityRegistration) => {
        setEditingEntity(entity);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingEntity) return;

        setRegistrations(registrations.map(r =>
            r.id === editingEntity.id ? editingEntity : r
        ));
        toast.success(`Entity "${editingEntity.entityName}" updated`);
        setIsEditDialogOpen(false);
        setEditingEntity(null);
    };

    const handleDeleteEntity = (entity: EntityRegistration) => {
        if (confirm(`Are you sure you want to delete "${entity.entityName}"?`)) {
            setRegistrations(registrations.filter(r => r.id !== entity.id));
            toast.success(`Entity "${entity.entityName}" deleted`);
        }
    };

    // Filter registrations
    const filteredRegistrations = registrations.filter(reg =>
        reg.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.countryCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate metrics
    const totalEntities = registrations.length;
    const activeEntities = registrations.filter(r => r.status === "active").length;
    const nonCompliant = registrations.filter(r => r.status === "non-compliant").length;
    const pendingRegistration = registrations.filter(r => r.status === "pending").length;
    const avgCompliance = Math.round(registrations.reduce((acc, r) => acc + r.complianceRate, 0) / totalEntities);
    const essentialEntities = registrations.filter(r => r.entityType === "essential").length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
            case "non-compliant": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const getEntityTypeBadge = (type: string) => {
        return type === "essential"
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : "bg-blue-100 text-blue-700 border-blue-200";
    };

    const getCompetentAuthorityInfo = (countryCode: string) => {
        const authority = getCompetentAuthority(countryCode as any);
        return authority || null;
    };

    if (!effectiveClientId) {
        return null;
    }

    return (
        <Card className="border-slate-200 shadow-lg shadow-slate-100/50 bg-white">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
                            <Globe className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Cross-Border Compliance
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Multi-jurisdiction NIS2 compliance management
                            </CardDescription>
                        </div>
                    </div>
                    <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entity
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* NIS2 Cross-Border Alert */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-emerald-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-emerald-800">EU-Wide Compliance</h4>
                            <p className="text-sm text-emerald-700 mt-1">
                                Your organization operates in {totalEntities} EU member states.
                                Each country has its own NIS2 implementation and competent authority.
                                Ensure compliance with all applicable national requirements.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-slate-900">{totalEntities}</div>
                        <div className="text-xs text-slate-500 font-medium">Total Entities</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-600">{activeEntities}</div>
                        <div className="text-xs text-slate-500 font-medium">Active</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-purple-600">{essentialEntities}</div>
                        <div className="text-xs text-slate-500 font-medium">Essential</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-amber-600">{pendingRegistration}</div>
                        <div className="text-xs text-slate-500 font-medium">Pending</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-red-600">{nonCompliant}</div>
                        <div className="text-xs text-slate-500 font-medium">Non-Compliant</div>
                    </div>
                </div>

                {/* Average Compliance */}
                <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700">Average Compliance Rate</span>
                        <span className="text-2xl font-black text-slate-900">{avgCompliance}%</span>
                    </div>
                    <Progress value={avgCompliance} className="h-3" />
                </div>

                {/* Entity Table */}
                <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Registered Entities</h4>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by country..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-brand hover:bg-brand">
                                    <TableHead className="text-white font-semibold">Country</TableHead>
                                    <TableHead className="text-white font-semibold">Entity</TableHead>
                                    <TableHead className="text-white font-semibold">Type</TableHead>
                                    <TableHead className="text-white font-semibold">Competent Authority</TableHead>
                                    <TableHead className="text-white font-semibold">Compliance</TableHead>
                                    <TableHead className="text-white font-semibold">Status</TableHead>
                                    <TableHead className="text-white font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.map((reg) => {
                                    const authority = getCompetentAuthorityInfo(reg.countryCode);
                                    return (
                                        <TableRow key={reg.id} className="bg-sky-50 border-b border-sky-100 transition-all hover:bg-sky-100 hover:shadow-sm cursor-pointer group">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-slate-400" />
                                                    <span className="font-medium">{reg.countryCode}</span>
                                                    <span className="text-slate-500">{reg.countryName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-slate-900">{reg.entityName}</div>
                                                    {reg.registrationNumber && (
                                                        <div className="text-xs text-slate-500">{reg.registrationNumber}</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getEntityTypeBadge(reg.entityType)}>
                                                    {reg.entityType.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {authority ? (
                                                    <div>
                                                        <div className="font-medium text-slate-900">{authority.acronym}</div>
                                                        <div className="text-xs text-slate-500">{authority.authorityName}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={reg.complianceRate} className="w-16 h-2" />
                                                    <span className={`text-sm font-medium ${reg.complianceRate >= 80 ? 'text-emerald-600' :
                                                        reg.complianceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                        {reg.complianceRate}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusBadge(reg.status)}>
                                                    {reg.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditEntity(reg)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedEntity(reg)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteEntity(reg)}
                                                        title="Delete"
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 pt-2 border-t">
                    <Button variant="outline" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
                        <Building2 className="h-4 w-4" />
                        Add Entity
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Generate EU Report
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Bell className="h-4 w-4" />
                        Authority Updates
                    </Button>
                </div>
            </CardContent>

            {/* Add Entity Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Cross-Border Entity</DialogTitle>
                        <DialogDescription>
                            Register an entity operating in another EU member state for NIS2 compliance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="country" className="text-sm font-medium">Country *</label>
                            <select
                                id="country"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newEntity.countryCode}
                                onChange={(e) => setNewEntity({ ...newEntity, countryCode: e.target.value })}
                            >
                                <option value="">Select EU Member State</option>
                                {EU_COUNTRIES.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.code} - {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="entityName" className="text-sm font-medium">Entity Name *</label>
                            <Input
                                id="entityName"
                                placeholder="e.g., Acme GmbH"
                                value={newEntity.entityName}
                                onChange={(e) => setNewEntity({ ...newEntity, entityName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="entityType" className="text-sm font-medium">Entity Type *</label>
                            <select
                                id="entityType"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newEntity.entityType}
                                onChange={(e) => setNewEntity({ ...newEntity, entityType: e.target.value as "essential" | "important" })}
                            >
                                <option value="essential">Essential Entity</option>
                                <option value="important">Important Entity</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="registrationNumber" className="text-sm font-medium">Registration Number</label>
                            <Input
                                id="registrationNumber"
                                placeholder="e.g., DE-NIS2-001"
                                value={newEntity.registrationNumber}
                                onChange={(e) => setNewEntity({ ...newEntity, registrationNumber: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="registrationNumber" className="text-sm font-medium">Registration Number</label>
                            <Input
                                id="registrationNumber"
                                placeholder="e.g., DE-NIS2-001"
                                value={newEntity.registrationNumber}
                                onChange={(e) => setNewEntity({ ...newEntity, registrationNumber: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="sector" className="text-sm font-medium">Sector</label>
                            <Input
                                id="sector"
                                placeholder="e.g., Energy, Healthcare, Transport"
                                value={newEntity.sector}
                                onChange={(e) => setNewEntity({ ...newEntity, sector: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="primaryContact" className="text-sm font-medium">Primary Contact</label>
                            <Input
                                id="primaryContact"
                                placeholder="Contact name"
                                value={newEntity.primaryContact}
                                onChange={(e) => setNewEntity({ ...newEntity, primaryContact: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="contactEmail" className="text-sm font-medium">Contact Email</label>
                            <Input
                                id="contactEmail"
                                type="email"
                                placeholder="contact@entity.com"
                                value={newEntity.contactEmail}
                                onChange={(e) => setNewEntity({ ...newEntity, contactEmail: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="contactPhone" className="text-sm font-medium">Contact Phone</label>
                            <Input
                                id="contactPhone"
                                placeholder="+32 2 123 4567"
                                value={newEntity.contactPhone}
                                onChange={(e) => setNewEntity({ ...newEntity, contactPhone: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="address" className="text-sm font-medium">Address</label>
                            <Input
                                id="address"
                                placeholder="Street, City, Postal Code"
                                value={newEntity.address}
                                onChange={(e) => setNewEntity({ ...newEntity, address: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-2">
                                <label htmlFor="complianceRate" className="text-sm font-medium">Compliance Rate (%)</label>
                                <Input
                                    id="complianceRate"
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0"
                                    value={newEntity.complianceRate}
                                    onChange={(e) => setNewEntity({ ...newEntity, complianceRate: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="incidentCount" className="text-sm font-medium">Incident Count</label>
                                <Input
                                    id="incidentCount"
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={newEntity.incidentCount}
                                    onChange={(e) => setNewEntity({ ...newEntity, incidentCount: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        {newEntity.countryCode && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                <p className="font-medium text-slate-700">Competent Authority:</p>
                                {(() => {
                                    const authority = getCompetentAuthority(newEntity.countryCode as any);
                                    return authority ? (
                                        <div className="mt-1 text-slate-600">
                                            <p>{authority.authorityName}</p>
                                            <p className="text-xs">{authority.website}</p>
                                        </div>
                                    ) : (
                                        <p className="text-amber-600">Authority not found</p>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddEntity}>
                            Add Entity
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Entity Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Entity</DialogTitle>
                        <DialogDescription>
                            Update entity registration details for NIS2 compliance.
                        </DialogDescription>
                    </DialogHeader>
                    {editingEntity && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Entity Name *</label>
                                <Input
                                    value={editingEntity.entityName}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, entityName: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Entity Type *</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingEntity.entityType}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, entityType: e.target.value as "essential" | "important" })}
                                >
                                    <option value="essential">Essential Entity</option>
                                    <option value="important">Important Entity</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Registration Number</label>
                                <Input
                                    value={editingEntity.registrationNumber || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, registrationNumber: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Sector</label>
                                <Input
                                    value={editingEntity.sector || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, sector: e.target.value })}
                                    placeholder="e.g., Energy, Healthcare, Transport"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Primary Contact</label>
                                <Input
                                    value={editingEntity.primaryContact || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, primaryContact: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Contact Email</label>
                                <Input
                                    type="email"
                                    value={editingEntity.contactEmail || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, contactEmail: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Contact Phone</label>
                                <Input
                                    value={editingEntity.contactPhone || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, contactPhone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Address</label>
                                <Input
                                    value={editingEntity.address || ""}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Compliance Rate (%)</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={editingEntity.complianceRate}
                                        onChange={(e) => setEditingEntity({ ...editingEntity, complianceRate: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Incident Count</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={editingEntity.incidentCount || 0}
                                        onChange={(e) => setEditingEntity({ ...editingEntity, incidentCount: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Status</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingEntity.status}
                                    onChange={(e) => setEditingEntity({ ...editingEntity, status: e.target.value as "active" | "pending" | "non-compliant" })}
                                >
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="non-compliant">Non-Compliant</option>
                                </select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Entity Details Panel */}
            {selectedEntity && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">{selectedEntity.entityName}</h2>
                                <p className="text-sm text-muted-foreground">{selectedEntity.countryName} • {selectedEntity.competentAuthority}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEntity(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status & Classification */}
                            <div className="flex gap-3">
                                <Badge className={selectedEntity.entityType === "essential" ? "bg-purple-500" : "bg-blue-500"}>
                                    {selectedEntity.entityType.toUpperCase()} ENTITY
                                </Badge>
                                <Badge className={getStatusBadge(selectedEntity.status)}>
                                    {selectedEntity.status.toUpperCase()}
                                </Badge>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Registration Number</p>
                                    <p className="font-medium">{selectedEntity.registrationNumber || "Not assigned"}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Sector</p>
                                    <p className="font-medium">{selectedEntity.sector || "Not specified"}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Registration Date</p>
                                    <p className="font-medium">{selectedEntity.registrationDate?.toLocaleDateString() || "Not registered"}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Compliance Rate</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Progress value={selectedEntity.complianceRate} className="flex-1 h-2" />
                                        <span className="font-bold">{selectedEntity.complianceRate}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h3 className="font-semibold mb-3">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEntity.primaryContact || "Not specified"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEntity.contactEmail || "Not specified"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEntity.contactPhone || "Not specified"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm col-span-1 md:col-span-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEntity.address || "Not specified"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Information */}
                            <div>
                                <h3 className="font-semibold mb-3">Audit & Compliance</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Last Audit</p>
                                        <p className="font-medium text-sm">{selectedEntity.lastAudit?.toLocaleDateString() || "N/A"}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Next Audit</p>
                                        <p className="font-medium text-sm">{selectedEntity.nextAuditDate?.toLocaleDateString() || "Scheduled"}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Incidents</p>
                                        <p className="font-medium text-sm">{selectedEntity.incidentCount || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Fine History */}
                            {selectedEntity.fineHistory && selectedEntity.fineHistory.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Fine History</h3>
                                    <div className="space-y-2">
                                        {selectedEntity.fineHistory.map((fine, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">{fine.reason}</p>
                                                    <p className="text-sm text-muted-foreground">{fine.year}</p>
                                                </div>
                                                <Badge variant="destructive">€{fine.amount.toLocaleString()}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => {
                                    setSelectedEntity(null);
                                    handleEditEntity(selectedEntity);
                                }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Entity
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    const authority = getCompetentAuthority(selectedEntity.countryCode as any);
                                    if (authority?.website) {
                                        window.open(authority.website, '_blank');
                                    }
                                }}>
                                    <Globe className="h-4 w-4 mr-2" />
                                    Competent Authority
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

export default CrossBorderComplianceDashboard;

