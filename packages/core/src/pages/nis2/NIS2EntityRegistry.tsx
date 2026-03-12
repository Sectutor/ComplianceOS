/**
 * NIS2 Essential Entities Registry Page
 * 
 * Tracks registration with competent authorities across EU member states
 * Article 3: Identification of essential and important entities
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { Building2, ArrowLeft, CheckCircle, Clock, AlertCircle, Globe, MapPin, FileText, Shield, Search } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { toast } from 'sonner';

// EU Member States and their competent authorities
const EU_COUNTRIES = [
    { code: 'AT', name: 'Austria', authority: 'BKO', authorityName: 'Bundesministerium für Inneres' },
    { code: 'BE', name: 'Belgium', authority: 'CCB', authorityName: 'Centre for Cybersecurity Belgium' },
    { code: 'BG', name: 'Bulgaria', authority: 'GovCERT', authorityName: 'Governmental Computer Emergency Response Team' },
    { code: 'HR', name: 'Croatia', authority: 'CARTC', authorityName: 'Croatian Academic and Research Network' },
    { code: 'CY', name: 'Cyprus', authority: 'CYSEC', authorityName: 'Cyprus Securities and Exchange Commission' },
    { code: 'CZ', name: 'Czech Republic', authority: 'NUKIB', authorityName: 'National Cyber and Information Security Agency' },
    { code: 'DK', name: 'Denmark', authority: 'CFCS', authorityName: 'Centre for Cybersecurity' },
    { code: 'EE', name: 'Estonia', authority: 'RIA', authorityName: 'Information System Authority' },
    { code: 'FI', name: 'Finland', authority: 'NCSC-FI', authorityName: 'National Cyber Security Centre' },
    { code: 'FR', name: 'France', authority: 'ANSSI', authorityName: 'Agence Nationale de la Sécurité des Systèmes d\'Information' },
    { code: 'DE', name: 'Germany', authority: 'BSI', authorityName: 'Bundesamt für Sicherheit in der Informationstechnik' },
    { code: 'GR', name: 'Greece', authority: 'NCSIA', authorityName: 'National Cyber Security Authority' },
    { code: 'HU', name: 'Hungary', authority: 'NHTC', authorityName: 'National Hungarian Telecom Company' },
    { code: 'IE', name: 'Ireland', authority: 'NCSC', authorityName: 'National Cyber Security Centre' },
    { code: 'IT', name: 'Italy', authority: 'ACN', authorityName: 'Agenzia per la Cybersicurezza Nazionale' },
    { code: 'LV', name: 'Latvia', authority: 'LTC', authorityName: 'Latvian Technical University' },
    { code: 'LT', name: 'Lithuania', authority: 'NETC', authorityName: 'National Emergency Centre' },
    { code: 'LU', name: 'Luxembourg', authority: 'CNPD', authorityName: 'Commission Nationale pour la Protection des Données' },
    { code: 'MT', name: 'Malta', authority: 'MCA', authorityName: 'Malta Communications Authority' },
    { code: 'NL', name: 'Netherlands', authority: 'NCSC', authorityName: 'National Cyber Security Centre' },
    { code: 'PL', name: 'Poland', authority: 'CSIRT NASK', authorityName: 'NASK - National Research Institute' },
    { code: 'PT', name: 'Portugal', authority: 'CNCS', authorityName: 'Centro Nacional de Cibersegurança' },
    { code: 'RO', name: 'Romania', authority: 'DNSC', authorityName: 'Directoratul Național de Securitate Cibernetică' },
    { code: 'SK', name: 'Slovakia', authority: 'NASK', authorityName: 'Network and Information Security' },
    { code: 'SI', name: 'Slovenia', authority: 'SI-CERT', authorityName: 'Slovenian Computer Emergency Response Team' },
    { code: 'ES', name: 'Spain', authority: 'CCN-CERT', authorityName: 'Centro Criptológico Nacional' },
    { code: 'SE', name: 'Sweden', authority: 'MSB', authorityName: 'Myndigheten för Samhällsskydd och Beredskap' },
];

// NIS2 Sectors
const NIS2_SECTORS = {
    essential: [
        'Energy', 'Transport', 'Banking', 'Financial Markets', 'Healthcare',
        'Drinking Water', 'Waste Water', 'Digital Infrastructure', 'ICT Service Management',
        'Public Administration', 'Space'
    ],
    important: [
        'Postal Services', 'Waste Management', 'Chemistry', 'Food', 'Manufacturing',
        'Research', 'Education', 'Real Estate', 'Digital Providers'
    ]
};

interface EntityRegistration {
    id: number;
    countryCode: string;
    countryName: string;
    entityName: string;
    entityType: 'essential' | 'important';
    registrationNumber: string;
    sector: string;
    status: 'registered' | 'pending' | 'in_progress' | 'not_applicable';
    registrationDate?: Date;
    competentAuthority: string;
    notes: string;
}

export default function NIS2EntityRegistry() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newRegistration, setNewRegistration] = useState({
        countryCode: '',
        entityName: '',
        entityType: 'essential' as 'essential' | 'important',
        registrationNumber: '',
        sector: '',
        status: 'pending' as 'registered' | 'pending' | 'in_progress' | 'not_applicable',
        notes: '',
    });

    // Sample data
    const registrations: EntityRegistration[] = [
        {
            id: 1,
            countryCode: 'DE',
            countryName: 'Germany',
            entityName: 'Acme GmbH',
            entityType: 'essential',
            registrationNumber: 'DE-NIS2-001',
            sector: 'Digital Infrastructure',
            status: 'registered',
            registrationDate: new Date('2024-06-15'),
            competentAuthority: 'BSI',
            notes: 'Primary operations in Frankfurt'
        },
        {
            id: 2,
            countryCode: 'FR',
            countryName: 'France',
            entityName: 'Acme SARL',
            entityType: 'essential',
            registrationNumber: 'FR-NIS2-002',
            sector: 'Healthcare',
            status: 'in_progress',
            competentAuthority: 'ANSSI',
            notes: 'Registration in progress'
        },
        {
            id: 3,
            countryCode: 'NL',
            countryName: 'Netherlands',
            entityName: 'Acme BV',
            entityType: 'important',
            registrationNumber: 'NL-NIS2-003',
            sector: 'ICT Service Management',
            status: 'pending',
            competentAuthority: 'NCSC',
            notes: 'Application submitted'
        },
    ];

    const filteredRegistrations = registrations.filter(reg =>
        reg.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.sector.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate metrics
    const totalEntities = registrations.length;
    const registeredCount = registrations.filter(r => r.status === 'registered').length;
    const pendingCount = registrations.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    const countriesCovered = new Set(registrations.map(r => r.countryCode)).size;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'registered':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Registered</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'in_progress':
                return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
            default:
                return <Badge variant="outline">N/A</Badge>;
        }
    };

    const handleCreateRegistration = () => {
        const country = EU_COUNTRIES.find(c => c.code === newRegistration.countryCode);
        toast.success(`Registration created for ${country?.name}!`);
        setIsDialogOpen(false);
        setNewRegistration({
            countryCode: '',
            entityName: '',
            entityType: 'essential',
            registrationNumber: '',
            sector: '',
            status: 'pending',
            notes: '',
        });
    };

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
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Essential Entities Registry</h1>
                        <p className="text-muted-foreground">
                            Article 3 - Track registration with EU competent authorities
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-indigo-50 text-indigo-700 border-indigo-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Article 3
                    </Badge>
                </div>

                {/* Registration Requirements */}
                <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader>
                        <CardTitle className="text-indigo-800 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            NIS2 Registration Requirements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="bg-white rounded-lg p-4 border border-indigo-100">
                                <h4 className="font-semibold text-indigo-800 mb-2">Essential Entities</h4>
                                <p className="text-sm text-indigo-700 mb-3">Must register with competent authority and include:</p>
                                <ul className="text-xs text-indigo-600 space-y-1">
                                    <li>• Entity name and contact details</li>
                                    <li>• Member states of operation</li>
                                    <li>• Relevant sectors</li>
                                    <li>• Cross-border impact assessment</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-indigo-100">
                                <h4 className="font-semibold text-indigo-800 mb-2">Important Entities</h4>
                                <p className="text-sm text-indigo-700 mb-3">Similar requirements but with:</p>
                                <ul className="text-xs text-indigo-600 space-y-1">
                                    <li>• Less frequent reporting</li>
                                    <li>• Lower fine thresholds</li>
                                    <li>• Simplified registration</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Entities</CardDescription>
                            <CardTitle className="text-3xl">{totalEntities}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Across EU member states</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Registered</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{registeredCount}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">With competent authorities</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>In Progress</CardDescription>
                            <CardTitle className="text-3xl text-amber-600">{pendingCount}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Pending registration</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Countries</CardDescription>
                            <CardTitle className="text-3xl text-indigo-600">{countriesCovered}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">EU member states covered</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Entity Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Entity Registrations</CardTitle>
                            <CardDescription>Manage registrations across EU member states</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    placeholder="Search entities..."
                                    className="pl-9 w-[250px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                                        Add Registration
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>New Entity Registration</DialogTitle>
                                        <DialogDescription>
                                            Register an entity for NIS2 compliance in an EU member state.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label>Country</Label>
                                            <Select
                                                value={newRegistration.countryCode}
                                                onValueChange={(v) => setNewRegistration({ ...newRegistration, countryCode: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select EU member state" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {EU_COUNTRIES.map((country) => (
                                                        <SelectItem key={country.code} value={country.code}>
                                                            {country.code} - {country.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Entity Name</Label>
                                            <Input
                                                value={newRegistration.entityName}
                                                onChange={(e) => setNewRegistration({ ...newRegistration, entityName: e.target.value })}
                                                placeholder="Legal entity name"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Entity Type</Label>
                                            <Select
                                                value={newRegistration.entityType}
                                                onValueChange={(v: any) => setNewRegistration({ ...newRegistration, entityType: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="essential">Essential Entity</SelectItem>
                                                    <SelectItem value="important">Important Entity</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Sector</Label>
                                            <Select
                                                value={newRegistration.sector}
                                                onValueChange={(v) => setNewRegistration({ ...newRegistration, sector: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select sector" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="header" disabled>Essential Sectors</SelectItem>
                                                    {NIS2_SECTORS.essential.map((sector) => (
                                                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                                    ))}
                                                    <SelectItem value="header2" disabled>Important Sectors</SelectItem>
                                                    {NIS2_SECTORS.important.map((sector) => (
                                                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Registration Number</Label>
                                            <Input
                                                value={newRegistration.registrationNumber}
                                                onChange={(e) => setNewRegistration({ ...newRegistration, registrationNumber: e.target.value })}
                                                placeholder="National registration ID"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Notes</Label>
                                            <Input
                                                value={newRegistration.notes}
                                                onChange={(e) => setNewRegistration({ ...newRegistration, notes: e.target.value })}
                                                placeholder="Additional notes"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateRegistration}>Create Registration</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Sector</TableHead>
                                    <TableHead>Competent Authority</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.map((reg) => {
                                    const country = EU_COUNTRIES.find(c => c.code === reg.countryCode);
                                    return (
                                        <TableRow key={reg.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{reg.entityName}</p>
                                                    <p className="text-xs text-muted-foreground">{reg.registrationNumber}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                    <span>{reg.countryName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={reg.entityType === 'essential' ? 'default' : 'secondary'}>
                                                    {reg.entityType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{reg.sector}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{reg.competentAuthority}</p>
                                                    <p className="text-xs text-muted-foreground">{country?.authorityName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(reg.status)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
