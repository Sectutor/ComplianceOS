import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@complianceos/ui/ui/button';
import { Label } from '@complianceos/ui/ui/label';
import { Input } from '@complianceos/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Textarea } from '@complianceos/ui/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Database, Loader2, Save, ArrowLeft, Calendar, Shield, Info, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Separator } from '@complianceos/ui/ui/separator';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';
import ThreatIntelPanel from '@/components/risk/ThreatIntelPanel';
import { PageGuide } from "@/components/PageGuide";
import { Switch } from '@complianceos/ui/ui/switch';

const ASSET_TYPES = [
    'Hardware',
    'Software',
    'Information / Data',
    'People / Roles',
    'Service',
    'Intangible / Reputation',
    'Site / Facility'
];

const CUI_CATEGORIES = [
    'CDI (Covered Defense Information)',
    'CTI (Controlled Technical Information)',
    'ITAR (Export Controlled)',
    'FOUO (For Official Use Only)',
    'LES (Law Enforcement Sensitive)',
    'PII (Personally Identifiable Info)',
    'PHI (Protected Health Info)',
    'Proprietary Business',
    'Other',
];

export default function RiskAssetEditor(props: any) {
    const [location, setLocation] = useLocation();
    const [match, localParams] = useRoute('/clients/:clientId/risks/assets/:assetId');

    // Prefer props from parent router, fallback to local route match
    const params = props.clientId ? props : (match ? localParams : null);

    const clientId = params?.clientId ? parseInt(params.clientId) : 0;

    console.log('[RiskAssetEditor] Params Debug:', { props, match, localParams, finalParams: params, parsedClientId: clientId });

    const assetIdParam = params?.assetId;
    const isNew = assetIdParam === 'new';
    const dbId = !isNew && assetIdParam ? parseInt(assetIdParam) : null;

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    const [formData, setFormData] = useState({
        name: '',
        type: 'Hardware',
        owner: '',
        location: '',
        status: 'active',
        acquisitionDate: '',
        lastReviewDate: '',
        valuationC: 3,
        valuationI: 3,
        valuationA: 3,
        description: '',
        // Technical identifiers for threat matching
        vendor: '',
        productName: '',
        version: '',
        technologies: [] as string[],
        // CUI Boundary
        cuiScope: false,
        cuiCategory: '',
        cuiJustification: '',
    });

    // Queries
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });

    // Fetch existing asset if editing
    const { data: assets, isLoading: isLoadingAsset } = trpc.risks.getAssets.useQuery(
        { clientId },
        {
            enabled: !!dbId && !!clientId
        }
    );

    const { data: assetRisks } = trpc.risks.getRiskAssessments.useQuery(
        { clientId, assetId: dbId || undefined },
        { enabled: !!dbId }
    );

    const existingAsset = assets?.find(a => a.id === dbId);

    // Initial Data Load
    useEffect(() => {
        if (existingAsset) {
            setFormData({
                name: existingAsset.name || '',
                type: existingAsset.type || 'Hardware',
                owner: existingAsset.owner || '',
                location: existingAsset.location || '',
                status: existingAsset.status || 'active',
                acquisitionDate: existingAsset.acquisitionDate ? new Date(existingAsset.acquisitionDate).toISOString().split('T')[0] : '',
                lastReviewDate: existingAsset.lastReviewDate ? new Date(existingAsset.lastReviewDate).toISOString().split('T')[0] : '',
                valuationC: existingAsset.valuationC || 3,
                valuationI: existingAsset.valuationI || 3,
                valuationA: existingAsset.valuationA || 3,
                description: existingAsset.description || '',
                vendor: existingAsset.vendor || '',
                productName: existingAsset.productName || '',
                version: existingAsset.version || '',
                technologies: (existingAsset.technologies as string[]) || [],
                cuiScope: existingAsset.cuiScope || false,
                cuiCategory: (existingAsset as any).cuiCategory || '',
                cuiJustification: (existingAsset as any).cuiJustification || '',
            });
        }
    }, [existingAsset]);

    // Mutations
    const createMutation = trpc.risks.createAsset.useMutation({
        onSuccess: () => {
            toast.success('Asset added successfully');
            setLocation(`/clients/${clientId}/risks/assets`);
        },
        onError: (err) => toast.error(`Failed to add: ${err.message}`)
    });

    const updateMutation = trpc.risks.updateAsset.useMutation({
        onSuccess: () => {
            toast.success('Asset updated successfully');
            setLocation(`/clients/${clientId}/risks/assets`);
        },
        onError: (err) => toast.error(`Failed to update: ${err.message}`)
    });

    const handleSubmit = async () => {
        if (!formData.name) {
            toast.error("Asset name is required");
            return;
        }

        setLoading(true);
        try {
            const commonData = {
                name: formData.name,
                type: formData.type,
                owner: formData.owner,
                location: formData.location,
                status: formData.status as any,
                acquisitionDate: formData.acquisitionDate || undefined,
                lastReviewDate: formData.lastReviewDate || undefined,
                valuationC: formData.valuationC,
                valuationI: formData.valuationI,
                valuationA: formData.valuationA,
                description: formData.description,
                // Technical identifiers for NVD matching
                vendor: formData.vendor || undefined,
                productName: formData.productName || undefined,
                version: formData.version || undefined,
                technologies: formData.technologies.length > 0 ? formData.technologies : undefined,
                cuiScope: formData.cuiScope,
                cuiCategory: formData.cuiCategory || undefined,
                cuiJustification: formData.cuiJustification || undefined,
            };

            if (dbId) {
                console.log('[RiskAssetEditor] Updating asset', { dbId, clientId, commonData });
                await updateMutation.mutateAsync({
                    id: dbId,
                    clientId: clientId, // Ensuring clientId is passed
                    ...commonData,
                });
            } else {
                console.log('[RiskAssetEditor] Creating asset', { clientId, commonData });
                await createMutation.mutateAsync({
                    clientId,
                    ...commonData,
                });
            }
        } catch (error) {
            console.error('[RiskAssetEditor] Submit error:', error);
            toast.error(`Submit failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingAsset && !isNew) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-8 py-8 pb-20">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: client?.name || "Client", href: `/clients/${clientId}` },
                            { label: "Asset Inventory", href: `/clients/${clientId}/risks/assets` },
                            { label: isNew ? "Add Asset" : formData.name || "Edit Asset" },
                        ]}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation(`/clients/${clientId}/risks/assets`)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Database className="w-6 h-6 text-[#1C4D8D]" />
                                {isNew ? 'Add to Asset Inventory' : 'Edit Asset'}
                            </h1>
                            <p className="text-muted-foreground">{isNew ? 'Define a new organization asset' : `Managing asset: ${formData.name}`}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setLocation(`/clients/${clientId}/risks/assets`)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            {isNew ? 'Add Asset' : 'Save Changes'}
                        </Button>
                        <PageGuide
                            title={isNew ? "Add New Asset" : "Edit Asset Details"}
                            description="Document the attributes, ownership, and value of this asset."
                            rationale="Accurate asset records allow for better threat modeling. Knowing the 'technology stack' (e.g. Apache, Windows) allows us to auto-match known vulnerabilities."
                            howToUse={[
                                { step: "Define Basics", description: "Name, owner, and type are mandatory for identification." },
                                { step: "Set Valuation", description: "Use the CIA Valuation tab to score importance from 1 (Low) to 5 (Critical)." },
                                { step: "Add Tech Stack", description: "List technologies (e.g., 'nginx', 'postgres') to enable automated threat intelligence scanning." },
                                { step: "Monitor Lifecycle", description: "Set review dates to ensure the asset record stays current." }
                            ]}
                            integrations={[
                                { name: "NVD Scanning", description: "Vendor and Product fields are used to search the National Vulnerability Database." },
                                { name: "Business Impact", description: "The CIA score directly influences the Impact calculation in risk assessments." }
                            ]}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1 space-y-1">
                        <nav className="flex flex-col space-y-1 sticky top-8">
                            {[
                                { id: 'basic', label: 'Basic Info', icon: Info, desc: 'Core Details' },
                                { id: 'valuation', label: 'CIA Valuation', icon: Shield, desc: 'Security Rating' },
                                { id: 'lifecycle', label: 'Lifecycle & Status', icon: Calendar, desc: 'Operations' },
                                // Only show Threat Intel tab for Software/Hardware assets (not new)
                                ...(!isNew && ['Software', 'Hardware'].includes(formData.type)
                                    ? [{ id: 'threatIntel', label: 'Threat Intel', icon: AlertTriangle, desc: 'Vulnerabilities' }]
                                    : []),
                                { id: 'cuiScope', label: 'CUI Scope', icon: ShieldCheck, desc: 'DFARS Boundary' },
                                ...(!isNew ? [{ id: 'risks', label: 'Linked Risks', icon: ShieldAlert, desc: 'Risk Scenarios' }] : []),
                            ].map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveTab(section.id)}
                                    className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === section.id
                                        ? 'bg-[#1C4D8D] text-white shadow-md ring-1 ring-[#1C4D8D]'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent'
                                        }`}
                                >
                                    <div className={`p-2 rounded-md transition-colors ${activeTab === section.id
                                        ? 'bg-white/20'
                                        : 'bg-slate-100 group-hover:bg-white border border-slate-200 group-hover:border-slate-300'
                                        }`}
                                    >
                                        <section.icon className={`w-4 h-4 ${activeTab === section.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
                                    </div>
                                    <div>
                                        <span className="block">{section.label}</span>
                                        <span className={`text-[10px] font-normal ${activeTab === section.id ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                            {section.desc}
                                        </span>
                                    </div>
                                    {activeTab === section.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Main Content Form */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Basic Info Section */}
                        <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Asset Identification</CardTitle>
                                    <CardDescription>Enter the core details of the asset.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Asset Name *</Label>
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Primary Customer DB"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Asset Type</Label>
                                            <Select
                                                value={formData.type}
                                                onValueChange={v => setFormData({ ...formData, type: v })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {ASSET_TYPES.map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Owner / Department</Label>
                                            <Input
                                                value={formData.owner}
                                                onChange={e => setFormData({ ...formData, owner: e.target.value })}
                                                placeholder="e.g. Engineering, HR"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Location / Environment</Label>
                                            <Input
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                placeholder="e.g. AWS us-east-1, Office HQ"
                                            />
                                        </div>
                                    </div>

                                    {/* Technical Identifiers for Threat Intelligence */}
                                    <div className="pt-4 border-t">
                                        <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                                            <Shield className="w-4 h-4" />
                                            Technical Identifiers (for NVD Scanning)
                                        </Label>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Adding vendor and product details enables more accurate vulnerability matching.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Vendor</Label>
                                                <Input
                                                    value={formData.vendor}
                                                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                                    placeholder="e.g. Microsoft, Apache, Oracle"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Product Name</Label>
                                                <Input
                                                    value={formData.productName}
                                                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                                    placeholder="e.g. SQL Server, Tomcat, MySQL"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Version</Label>
                                                <Input
                                                    value={formData.version}
                                                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                                                    placeholder="e.g. 2019, 9.0.50, 8.0"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            <Label>Technologies (comma-separated)</Label>
                                            <Input
                                                value={formData.technologies.join(', ')}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    technologies: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                                })}
                                                placeholder="e.g. nodejs, postgresql, docker, react"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Purpose and scope of this asset..."
                                            className="min-h-[120px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Valuation Section */}
                        <div className={activeTab === 'valuation' ? 'block' : 'hidden'}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>CIA Security Valuation</CardTitle>
                                    <CardDescription>Rate the importance of Confidentiality, Integrity, and Availability (1-5).</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { id: 'valuationC', label: 'Confidentiality', color: 'text-red-600', desc: 'Protection against unauthorized access.' },
                                            { id: 'valuationI', label: 'Integrity', color: 'text-green-600', desc: 'Protection against unauthorized changes.' },
                                            { id: 'valuationA', label: 'Availability', color: 'text-blue-600', desc: 'Accessibility when required.' },
                                        ].map((field) => (
                                            <div key={field.id} className="space-y-4">
                                                <div className="flex flex-col gap-1">
                                                    <Label className={`font-bold text-base ${field.color}`}>{field.label}</Label>
                                                    <p className="text-xs text-muted-foreground leading-tight">{field.desc}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        type="number"
                                                        min="1" max="5"
                                                        className="w-20 text-center font-bold text-lg"
                                                        value={formData[field.id as keyof typeof formData] as number}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const clamped = Math.max(1, Math.min(5, val));
                                                            setFormData({ ...formData, [field.id]: clamped });
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-slate-400">/ 5</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white border border-gray-300 rounded-lg p-5 shadow-sm dark:bg-gray-950 dark:border-gray-700">
                                        <div className="flex gap-3">
                                            <Info className="w-5 h-5 text-gray-900 shrink-0 dark:text-gray-100" />
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <p className="font-bold mb-2">Scoring Guide (1-5)</p>
                                                <ul className="list-disc list-inside space-y-1 text-sm">
                                                    <li><span className="font-semibold">1 - Minimal:</span> Negligible impact.</li>
                                                    <li><span className="font-semibold">2 - Low:</span> Minor impact.</li>
                                                    <li><span className="font-semibold">3 - Moderate:</span> Serious impact.</li>
                                                    <li><span className="font-semibold">4 - High:</span> Significant impact.</li>
                                                    <li><span className="font-semibold">5 - Critical:</span> Catastrophic impact.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Lifecycle Section */}
                        <div className={activeTab === 'lifecycle' ? 'block' : 'hidden'}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Lifecycle & Compliance</CardTitle>
                                    <CardDescription>Track the operational status and review schedule.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label>Operational Status</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={v => setFormData({ ...formData, status: v })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="archived">Archived</SelectItem>
                                                    <SelectItem value="disposed">Disposed</SelectItem>
                                                    <SelectItem value="under review">Under Review</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Acquisition Date</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                                <Input
                                                    type="date"
                                                    className="pl-9"
                                                    value={formData.acquisitionDate}
                                                    onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Next Review Date</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                                <Input
                                                    type="date"
                                                    className="pl-9"
                                                    value={formData.lastReviewDate}
                                                    onChange={e => setFormData({ ...formData, lastReviewDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Threat Intel Section (only for existing assets) */}
                        {!isNew && dbId && (
                            <div className={activeTab === 'threatIntel' ? 'block' : 'hidden'}>
                                <ThreatIntelPanel
                                    clientId={clientId}
                                    assetId={dbId}
                                    assetName={formData.name}
                                    assetVendor={formData.vendor}
                                    assetProduct={formData.productName}
                                />
                            </div>
                        )}

                        {/* CUI Scope Section */}
                        <div className={activeTab === 'cuiScope' ? 'block' : 'hidden'}>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                                        CUI Boundary Definition
                                    </CardTitle>
                                    <CardDescription>
                                        Define whether this asset is within the Controlled Unclassified Information (CUI) enclave.
                                        This is required for DFARS 252.204-7012 and CMMC scoping.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50">
                                        <div>
                                            <Label className="text-base font-semibold">In CUI Scope</Label>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Does this asset store, process, or transmit CUI?
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.cuiScope}
                                            onCheckedChange={v => setFormData({ ...formData, cuiScope: v })}
                                        />
                                    </div>

                                    {formData.cuiScope && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>CUI Data Category</Label>
                                                <Select
                                                    value={formData.cuiCategory}
                                                    onValueChange={v => setFormData({ ...formData, cuiCategory: v })}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select CUI category..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {CUI_CATEGORIES.map(c => (
                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Common categories: CDI (most DFARS contracts), CTI (technical data), ITAR (export controlled).
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Scope Justification</Label>
                                                <Textarea
                                                    value={formData.cuiJustification}
                                                    onChange={e => setFormData({ ...formData, cuiJustification: e.target.value })}
                                                    placeholder="Describe why this asset is in the CUI boundary. Reference the contract or data flow that brings CUI into contact with this system..."
                                                    className="min-h-[100px]"
                                                />
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex gap-3">
                                                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                                                    <div className="text-sm text-blue-900">
                                                        <p className="font-bold mb-1">Why Does This Matter?</p>
                                                        <p>Any asset marked as CUI-in-scope becomes part of your authorization boundary for NIST 800-171 and CMMC assessments. Only assets in this boundary need to meet the 110 security controls. Proper scoping reduces certification cost and complexity.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {!formData.cuiScope && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                                            <p className="text-sm text-muted-foreground">
                                                This asset is <strong>not</strong> currently marked as handling CUI. Toggle the switch above if this asset stores, processes, or transmits Controlled Unclassified Information.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Linked Risks Section */}
                        {!isNew && dbId && (
                            <div className={activeTab === 'risks' ? 'block' : 'hidden'}>
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle>Linked Risks</CardTitle>
                                                <CardDescription>Risks associated with this asset.</CardDescription>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${clientId}/risks/register?assetId=${dbId}`)}>
                                                Manage in Risk Register
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="rounded-md border">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {assetRisks?.length === 0 ? (
                                                        <tr>
                                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                                No risks linked to this asset.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        assetRisks?.map((risk) => (
                                                            <tr key={risk.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/register?openRiskId=${risk.id}&assetId=${dbId}`)}>
                                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                                    {risk.threatDescription || 'Attributes-based Risk'}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${risk.riskLevel === 'High' || risk.riskLevel === 'Critical' ? 'bg-red-100 text-red-800' :
                                                                        risk.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                        }`}>
                                                                        {risk.riskLevel || 'Unrated'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                                    {risk.status}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
