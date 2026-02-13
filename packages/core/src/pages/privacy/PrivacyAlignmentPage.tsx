import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { 
    CheckCircle2, Shield, Lock, FileKey, Server, Users, BookOpen, Scale, 
    Globe, Database, Activity, LayoutDashboard, Eye, FileText, UserCheck, AlertTriangle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';
import { cn } from '@/lib/utils';

export default function PrivacyAlignmentPage() {
    
    const iso27701Areas = [
        {
            id: 'pims',
            title: 'PIMS Requirements',
            standard: 'ISO 27701 Clause 5',
            icon: Shield,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            requirements: [
                'Understand context of the organization regarding privacy',
                'Demonstrate leadership and commitment to PIMS',
                'Plan actions to address privacy risks and opportunities'
            ],
            implementation: [
                { feature: 'Context Manager', detail: 'Document internal/external privacy factors' },
                { feature: 'Policy Engine', detail: 'Privacy policy management and versioning' },
                { feature: 'Risk Register', detail: 'Integrated privacy risk assessment module' }
            ]
        },
        {
            id: 'controllers',
            title: 'PII Controllers',
            standard: 'ISO 27701 Clause 7',
            icon: Users,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            requirements: [
                'Determine lawful basis for processing',
                'Obtain and record consent',
                'Provide privacy notices',
                'Handle data subject rights'
            ],
            implementation: [
                { feature: 'Consent Management', detail: 'Granular consent tracking and receipts' },
                { feature: 'DSAR Portal', detail: 'Automated workflow for subject access requests' },
                { feature: 'Privacy Notices', detail: 'Dynamic notice generation based on data map' }
            ]
        },
        {
            id: 'processors',
            title: 'PII Processors',
            standard: 'ISO 27701 Clause 8',
            icon: Server,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            requirements: [
                'Process data only on documented instructions',
                'Ensure confidentiality of processing',
                'Assist controller with obligations'
            ],
            implementation: [
                { feature: 'Processing Records', detail: 'Automated Article 30 / Clause 8.2.6 records' },
                { feature: 'Vendor Portal', detail: 'Secure channel for controller instructions' },
                { feature: 'Data Segregation', detail: 'Logical separation of client data' }
            ]
        }
    ];

    const hipaaAreas = [
        {
            id: 'privacy',
            title: 'Privacy Rule',
            standard: '45 CFR Part 160 & 164 Subparts A & E',
            icon: Eye,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            requirements: [
                'Permitted uses and disclosures of PHI',
                'Notice of Privacy Practices',
                'Right to access and amend PHI'
            ],
            implementation: [
                { feature: 'Disclosure Logging', detail: 'Track all PHI disclosures for accounting' },
                { feature: 'NPP Management', detail: 'Version control for Notices of Privacy Practices' },
                { feature: 'Patient Portal', detail: 'Secure interface for patient record access' }
            ]
        },
        {
            id: 'security',
            title: 'Security Rule',
            standard: '45 CFR Part 164 Subparts A & C',
            icon: Lock,
            color: 'text-slate-700',
            bgColor: 'bg-slate-100',
            requirements: [
                'Administrative Safeguards (Risk Analysis, Training)',
                'Physical Safeguards (Facility Access, Device Control)',
                'Technical Safeguards (Access Control, Audit Controls)'
            ],
            implementation: [
                { feature: 'SRA Tool', detail: 'Guided Security Risk Analysis workflow' },
                { feature: 'Audit Trails', detail: 'HIPAA-compliant immutable logging' },
                { feature: 'Encryption', detail: 'AES-256 at rest and TLS 1.2+ in transit' }
            ]
        },
        {
            id: 'breach',
            title: 'Breach Notification',
            standard: '45 CFR Part 164 Subpart D',
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            requirements: [
                'Notify individuals of breaches of unsecured PHI',
                'Notify HHS Secretary',
                'Notify media for breaches affecting >500 residents'
            ],
            implementation: [
                { feature: 'Incident Response', detail: 'Playbooks for breach determination and scoring' },
                { feature: 'Notification Templates', detail: 'Pre-approved legal templates for notifications' },
                { feature: 'Deadline Tracker', detail: 'Alerts for 60-day notification window' }
            ]
        }
    ];

    const gdprAreas = [
        {
            id: 'principles',
            title: 'Principles',
            standard: 'GDPR Chapter 2',
            icon: Scale,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            requirements: [
                'Lawfulness, fairness and transparency',
                'Purpose limitation and Data minimization',
                'Accuracy and Storage limitation'
            ],
            implementation: [
                { feature: 'Data Mapping', detail: 'Inventory of processing purposes and retention' },
                { feature: 'Retention Policies', detail: 'Automated deletion schedules' },
                { feature: 'Lawful Basis', detail: 'Documentation of basis for each process' }
            ]
        },
        {
            id: 'rights',
            title: 'Data Subject Rights',
            standard: 'GDPR Chapter 3',
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            requirements: [
                'Right of access and rectification',
                'Right to erasure (to be forgotten)',
                'Right to data portability'
            ],
            implementation: [
                { feature: 'DSAR Workflow', detail: 'End-to-end request management' },
                { feature: 'Identity Verification', detail: 'Secure ID checks for requestors' },
                { feature: 'Export Formats', detail: 'Machine-readable (JSON/CSV) data exports' }
            ]
        }
    ];

    const ccpaAreas = [
        {
            id: 'consumer-rights',
            title: 'Consumer Rights',
            standard: 'CCPA / CPRA',
            icon: FileKey,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            requirements: [
                'Right to Know and Delete',
                'Right to Opt-Out of Sale/Sharing',
                'Right to Limit Use of Sensitive PI'
            ],
            implementation: [
                { feature: 'Web Forms', detail: 'Embeddable "Do Not Sell" forms' },
                { feature: 'Request Verification', detail: 'Verify consumer residency and identity' },
                { feature: 'Opt-Out Signal', detail: 'Support for GPC (Global Privacy Control)' }
            ]
        }
    ];

    const frameworks = [
        { id: 'iso27701', label: 'ISO 27701', icon: Shield, areas: iso27701Areas },
        { id: 'hipaa', label: 'HIPAA', icon: Activity, areas: hipaaAreas },
        { id: 'gdpr', label: 'GDPR', icon: Globe, areas: gdprAreas },
        { id: 'ccpa', label: 'CCPA', icon: FileText, areas: ccpaAreas },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-6 lg:p-10">
            <div className="w-full space-y-8">
                {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 text-white mb-4">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            Privacy Compliance Alignment
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Comprehensive alignment with Global Privacy Standards and Regulations
                        </p>
                    </div>

                    {/* Framework Tabs */}
                    <Tabs defaultValue="iso27701" className="space-y-8">
                        <div className="flex justify-center">
                            <TabsList className="h-auto p-1 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm flex-wrap justify-center">
                                {frameworks.map(fw => (
                                    <TabsTrigger 
                                        key={fw.id} 
                                        value={fw.id}
                                        className="gap-2 px-6 py-3 text-sm font-medium data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
                                    >
                                        <fw.icon className="h-4 w-4" />
                                        {fw.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {frameworks.map(fw => (
                            <TabsContent key={fw.id} value={fw.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Framework Description Card */}
                                <Card className="border-2 border-slate-300 bg-white shadow-lg">
                                    <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-100">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-slate-800 rounded-lg text-white">
                                                <fw.icon className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-2xl">{fw.label} Alignment</CardTitle>
                                        </div>
                                        <CardDescription className="text-base">
                                            {fw.id === 'iso27701' && "Privacy Information Management System (PIMS) extension to ISO/IEC 27001."}
                                            {fw.id === 'hipaa' && "US federal law protecting sensitive patient health information."}
                                            {fw.id === 'gdpr' && "General Data Protection Regulation for EU data subjects."}
                                            {fw.id === 'ccpa' && "California Consumer Privacy Act and CPRA amendments."}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>

                                {/* Areas Tabs */}
                                <Tabs defaultValue={fw.areas[0].id} className="space-y-6">
                                    <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto bg-transparent p-0">
                                        {fw.areas.map((area) => (
                                            <TabsTrigger
                                                key={area.id}
                                                value={area.id}
                                                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-600 flex flex-col items-center gap-1 p-3 border border-transparent data-[state=active]:border-slate-200 hover:bg-white/50 transition-all rounded-lg"
                                            >
                                                <area.icon className={cn("w-5 h-5", area.color)} />
                                                <span className="text-xs font-bold">{area.title}</span>
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {fw.areas.map((area) => (
                                        <TabsContent key={area.id} value={area.id} className="space-y-6 mt-4">
                                            <Card className="border-2 shadow-lg">
                                                <CardHeader className={`${area.bgColor} border-b`}>
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                                                                    <area.icon className={`w-6 h-6 ${area.color}`} />
                                                                </div>
                                                                <div>
                                                                    <CardTitle className="text-2xl">{area.title}</CardTitle>
                                                                    <CardDescription className="text-sm font-medium">{area.standard}</CardDescription>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="default" className="bg-green-600">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Supported
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-6">
                                                    {/* Requirements */}
                                                    <div>
                                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <BookOpen className="w-5 h-5 text-slate-600" />
                                                            Standard Requirements
                                                        </h3>
                                                        <ul className="space-y-2">
                                                            {area.requirements.map((req, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                                    <span>{req}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Implementation */}
                                                    <div>
                                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <Shield className="w-5 h-5 text-slate-700" />
                                                            Platform Implementation
                                                        </h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {area.implementation.map((impl, idx) => (
                                                                <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <h4 className="font-semibold text-sm">{impl.feature}</h4>
                                                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                                            ✓ Supported
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">{impl.detail}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </TabsContent>
                        ))}
                    </Tabs>

                    {/* Strategic Value Card */}
                    <Card className="border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-gray-200 shadow-lg mt-12">
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Scale className="w-6 h-6 text-slate-700" />
                                Strategic Value
                            </CardTitle>
                            <CardDescription>
                                Unified privacy management across global jurisdictions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Shield className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Global Compliance</h4>
                                            <p className="text-xs text-muted-foreground">Map data once, satisfy GDPR, CCPA, and ISO requirements</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <UserCheck className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Trust Center</h4>
                                            <p className="text-xs text-muted-foreground">Build customer trust with transparent privacy practices</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Server className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Risk Reduction</h4>
                                            <p className="text-xs text-muted-foreground">Minimize breach impact with proactive controls</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Scale className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Audit Ready</h4>
                                            <p className="text-xs text-muted-foreground">Instant reporting for regulators and auditors</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}
