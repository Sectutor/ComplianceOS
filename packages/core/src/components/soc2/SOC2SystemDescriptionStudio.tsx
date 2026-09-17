import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    FileText, Sparkles, Save, Printer, Copy, CheckCircle2,
    Server, Shield, Users, Lock, Database, Code,
    Layers, Globe, Check, AlertCircle, ArrowRight, ShieldCheck,
    Cpu, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface SOC2SystemDescriptionStudioProps {
    clientId: number;
    className?: string;
    onBackToRoadmap?: () => void;
}

export interface SOC2SystemDescriptionData {
    // Header & Meta
    systemTitle: string;
    reviewPeriod: string;
    version: string;
    status: 'draft' | 'in_review' | 'approved';
    approvedBy?: string;
    approvedAt?: string;

    // Section 1: Principal Commitments & Scope (DC 200 C1 & C2)
    servicesProvided: string;
    principalCommitments: {
        security: string;
        availability: string;
        confidentiality: string;
        encryption: string;
        incidentSla: string;
    };
    trustCategories: string[];

    // Section 2: Components of the System (DC 200 C3)
    infrastructure: {
        primaryCloud: string;
        regions: string;
        containers: string;
        networking: string;
    };
    software: {
        coreApp: string;
        apiGateway: string;
        databases: string;
        caching: string;
    };
    people: {
        orgStructure: string;
        backgroundChecks: string;
        securityTraining: string;
        roles: string;
    };
    procedures: {
        sdlc: string;
        changeManagement: string;
        incidentResponse: string;
        backupDisasterRecovery: string;
    };
    dataClassification: {
        categories: string;
        dataFlow: string;
        encryptionAtRest: string;
        encryptionInTransit: string;
    };

    // Section 3: Boundaries & Exclusions (DC 200 C4 & C5)
    inScopeBoundaries: string;
    carvedOutBoundaries: string;

    // Section 4: Subservice Organizations & Carve-Out Method (DC 200 C6)
    subserviceMethod: 'carve-out' | 'inclusive';
    subserviceOrganizations: Array<{
        name: string;
        service: string;
        controlsExpected: string;
    }>;

    // Section 5: Complementary User Entity Controls (CUECs) (DC 200 C7)
    cuecs: Array<{
        id: string;
        title: string;
        description: string;
    }>;

    // Section 6: Complementary Subservice Controls (CSOCs) & Changes (DC 200 C8 & C9)
    csocs: string;
    systemChanges: string;
}

const DEFAULT_DESCRIPTION: (clientName: string) => SOC2SystemDescriptionData = (clientName) => ({
    systemTitle: `${clientName} Multi-Tenant Enterprise Cloud Platform`,
    reviewPeriod: 'Annual SOC 2 Type II Observation Period',
    version: '1.0.0',
    status: 'draft',
    
    // 1. Commitments
    servicesProvided: `${clientName} provides an enterprise-grade cloud software-as-a-service (SaaS) platform facilitating secure workflow orchestration, automated compliance monitoring, and continuous telemetry aggregation. The system is designed to deliver high availability, strong tenant isolation, and strict confidentiality protections for corporate customer data.`,
    principalCommitments: {
        security: 'The system protects customer data against unauthorized access, malicious tampering, and operational threats through multi-layered defense-in-depth, least-privilege role-based access controls, and continuous automated configuration scanning.',
        availability: 'The platform targets 99.9% uptime across production services, supported by multi-AZ active-active failover, automated container health probes, and redundant cloud storage.',
        confidentiality: 'All customer data processed and stored within the platform is classified as strictly confidential and is cryptographically segregated by client tenant ID.',
        encryption: 'Data is protected using TLS 1.3 for all data-in-transit across public networks, and AES-256 cryptographic encryption for all persistent data-at-rest in databases and object stores.',
        incidentSla: 'Security incidents are classified per the formal Incident Response Plan, with Critical/High security anomalies requiring acknowledgment within 1 hour and prompt customer notification within 72 hours of verification.'
    },
    trustCategories: ['Security (Common Criteria)', 'Availability', 'Confidentiality'],

    // 2. Components
    infrastructure: {
        primaryCloud: 'Amazon Web Services (AWS) & Google Cloud Platform (GCP) Multi-AZ Infrastructure',
        regions: 'US-East (N. Virginia), US-West (Oregon), and EU-Central (Frankfurt)',
        containers: 'Managed Kubernetes (EKS / GKE) with automated horizontal pod autoscaling and distroless container images',
        networking: 'Isolated Virtual Private Clouds (VPCs) with strict Security Groups, Web Application Firewall (WAF), and DDoS mitigation'
    },
    software: {
        coreApp: 'Modern TypeScript/Node.js API Microservices with React/Tailwind enterprise client applications',
        apiGateway: 'Traefik / Cloudflare Edge API Gateways enforcing rate-limiting, TLS termination, and mTLS',
        databases: 'Managed PostgreSQL (Amazon RDS / Cloud SQL) with automated multi-AZ replication and Point-in-Time Recovery (PITR)',
        caching: 'Redis cluster in-memory caching with encrypted data channels and TLS authentication'
    },
    people: {
        orgStructure: 'Formal organizational reporting structure under executive leadership (CEO, CTO, CISO) with segregated roles for Engineering, Security Operations, DevOps, and Customer Success.',
        backgroundChecks: 'Mandatory third-party pre-employment criminal history, educational verification, and credential screening for all personnel prior to granted system access.',
        securityTraining: 'Mandatory security awareness training upon onboarding and annually thereafter, including phishing simulations, OWASP Top 10 vulnerabilities, and data handling ethics.',
        roles: 'Role-Based Access Control (RBAC) enforced with quarterly formal user access reviews and automated revocation upon HR offboarding trigger.'
    },
    procedures: {
        sdlc: 'Secure Software Development Life Cycle (SDLC) requiring all source code changes to reside in GitHub version control with branch protection, mandatory peer review, and automated SAST/dependency scans.',
        changeManagement: 'Formal change management tracking tickets requiring peer sign-off, staging environment smoke verification, and automated rollback triggers prior to production release.',
        incidentResponse: 'Tested 24/7/365 Incident Response Plan with designated incident commanders, automated PagerDuty escalation call trees, and forensic logging.',
        backupDisasterRecovery: 'Continuous automated database snapshots with 30-day retention and geo-redundant replication. Annual simulated disaster recovery restoration tests verified against RPO (< 1 hr) and RTO (< 4 hrs).'
    },
    dataClassification: {
        categories: 'Customer Production Data (Confidential), System Configuration & Telemetry (Internal), Public Marketing Content (Public).',
        dataFlow: 'Customer traffic ingresses via TLS 1.3 CDN/WAF → API Gateway → Application Microservices (JWT Auth) → Encrypted PostgreSQL Data Stores.',
        encryptionAtRest: 'AES-256 via Cloud Key Management Service (KMS) with annual automatic master key rotation.',
        encryptionInTransit: 'TLS 1.3 enforced for all external endpoints and internal service-to-service mesh communication (mTLS).'
    },

    // 3. Boundaries & Exclusions
    inScopeBoundaries: 'The in-scope system boundary includes all production cloud infrastructure (Kubernetes clusters, databases, object stores, API gateways, CI/CD deployment pipelines) and personnel with administrative access to production systems.',
    carvedOutBoundaries: 'Corporate office local area networks, guest Wi-Fi networks, and non-production development sandboxes that do not contain or process customer production data are explicitly excluded from the SOC 2 Type II boundary.',

    // 4. Subservice Organizations (Carve-Out)
    subserviceMethod: 'carve-out',
    subserviceOrganizations: [
        {
            name: 'Amazon Web Services (AWS)',
            service: 'Cloud Hosting, Managed Kubernetes (EKS), RDS PostgreSQL & S3 Object Storage',
            controlsExpected: 'Physical security of data centers, environmental protections, redundant power, hardware maintenance, and hypervisor isolation.'
        },
        {
            name: 'Datadog / CloudWatch',
            service: 'Infrastructure Monitoring, Centralized Log Ingestion & APM Telemetry',
            controlsExpected: 'Secure log aggregation pipeline, tamper-evident audit storage, and high availability of alerting endpoints.'
        },
        {
            name: 'Okta / Google Workspace',
            service: 'Identity Provider (IdP) & Single Sign-On (SSO) Directory',
            controlsExpected: 'Hardware-token MFA enforcement (FIDO2), secure directory authentication, and credential protection.'
        },
        {
            name: 'SendGrid / Resend',
            service: 'Transactional Email Delivery Infrastructure',
            controlsExpected: 'Encrypted SMTP/API transport, DKIM/SPF signing, and suppression list integrity.'
        }
    ],

    // 5. CUECs
    cuecs: [
        {
            id: 'CUEC-01',
            title: 'User Credential & Password Hygiene',
            description: 'User entities are responsible for establishing strong password complexity requirements, safeguarding credentials, and ensuring credentials are not shared among multiple staff members.'
        },
        {
            id: 'CUEC-02',
            title: 'Multi-Factor Authentication (MFA) Enforcement',
            description: 'User entities are responsible for enforcing Multi-Factor Authentication (MFA) across all administrative and user accounts connecting to the platform.'
        },
        {
            id: 'CUEC-03',
            title: 'Role-Based Access & Tenant Permissions',
            description: 'User entities are responsible for assigning appropriate least-privilege roles to their internal users and periodically reviewing access within their organization tenant.'
        },
        {
            id: 'CUEC-04',
            title: 'Timely Deprovisioning of Separated Personnel',
            description: 'User entities are responsible for promptly disabling or revoking access for personnel whose employment has been terminated or who no longer require system access.'
        },
        {
            id: 'CUEC-05',
            title: 'Incident & Compromise Notification',
            description: 'User entities are responsible for immediately notifying the service organization if they suspect or detect that any user credentials or tenant API keys have been compromised.'
        }
    ],

    // 6. CSOCs & System Changes
    csocs: 'Management relies on third-party cloud infrastructure providers (e.g., AWS) to operate physical perimeter barriers, biometric building access controls, redundant HVAC/generator facilities, and underlying virtualization security. Management reviews annual SOC 2 Type II reports from all subservice providers to ensure controls remain effective.',
    systemChanges: 'During the review period, management maintained continuous change control governance. No unauthorized or unapproved architecture changes occurred that would adversely affect the achievement of the principal service commitments.'
});

export function SOC2SystemDescriptionStudio({
    clientId,
    className,
    onBackToRoadmap
}: SOC2SystemDescriptionStudioProps) {
    const [activeSection, setActiveSection] = useState<'commitments' | 'components' | 'boundaries' | 'subservices' | 'cuecs' | 'csocs' | 'full_preview'>('commitments');
    const [copied, setCopied] = useState(false);

    // Fetch client telemetry & saved description
    const { data: clientData } = trpc.frameworkRoadmapGates.getSoc2SystemDescription.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const { data: clientPolicies } = trpc.clientPolicies.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: controlsData } = trpc.clientControls.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: vendorsData } = trpc.vendors.list.useQuery({ clientId }, { enabled: !!clientId });

    const safePolicies = Array.isArray(clientPolicies) ? clientPolicies : [];
    const safeControls = Array.isArray(controlsData) ? controlsData : [];
    const safeVendors = Array.isArray(vendorsData) ? vendorsData : [];

    const saveMutation = trpc.frameworkRoadmapGates.saveSoc2SystemDescription.useMutation({
        onSuccess: () => {
            toast.success("Section III System Description saved and audit-synchronized!");
        },
        onError: (err) => {
            toast.error("Failed to save: " + err.message);
        }
    });

    const clientName = clientData?.clientName || `Organization #${clientId}`;

    const [formData, setFormData] = useState<SOC2SystemDescriptionData>(() => DEFAULT_DESCRIPTION(clientName));
    const [isDirty, setIsDirty] = useState(false);

    // Load saved data when query resolves
    useEffect(() => {
        const base = DEFAULT_DESCRIPTION(clientName);
        if (clientData?.systemDescription) {
            const s = clientData.systemDescription;
            setFormData({
                ...base,
                ...s,
                principalCommitments: {
                    ...base.principalCommitments,
                    ...(s.principalCommitments || {})
                },
                infrastructure: {
                    ...base.infrastructure,
                    ...(s.infrastructure || {})
                },
                software: {
                    ...base.software,
                    ...(s.software || {})
                },
                people: {
                    ...base.people,
                    ...(s.people || {})
                },
                procedures: {
                    ...base.procedures,
                    ...(s.procedures || {})
                },
                dataClassification: {
                    ...base.dataClassification,
                    ...(s.dataClassification || {})
                },
                trustCategories: Array.isArray(s.trustCategories) && s.trustCategories.length > 0
                    ? s.trustCategories
                    : base.trustCategories,
                subserviceOrganizations: Array.isArray(s.subserviceOrganizations) && s.subserviceOrganizations.length > 0
                    ? s.subserviceOrganizations
                    : base.subserviceOrganizations,
                cuecs: Array.isArray(s.cuecs) && s.cuecs.length > 0
                    ? s.cuecs
                    : base.cuecs
            });
        } else if (clientData?.clientName) {
            setFormData(prev => ({
                ...prev,
                systemTitle: prev.systemTitle.includes('Organization #') ? `${clientData.clientName} Multi-Tenant Enterprise Cloud Platform` : prev.systemTitle
            }));
        }
    }, [clientData, clientName]);

    const handleFieldChange = (path: string, value: any) => {
        setIsDirty(true);
        setFormData(prev => {
            const next = { ...prev };
            const parts = path.split('.');
            let curr: any = next;
            for (let i = 0; i < parts.length - 1; i++) {
                curr[parts[i]] = { ...curr[parts[i]] };
                curr = curr[parts[i]];
            }
            curr[parts[parts.length - 1]] = value;
            return next;
        });
    };

    const handleAutoGenerate = () => {
        const enriched = DEFAULT_DESCRIPTION(clientName);
        if (safeVendors.length > 0) {
            const dynamicVendors = safeVendors.slice(0, 5).map((v: any) => ({
                name: v.name || 'Third-Party Provider',
                service: v.category || 'Cloud Subservice Organization',
                controlsExpected: 'Annual SOC 2 Type II audit report review, data processing addendum (DPA), and SLA enforcement.'
            }));
            enriched.subserviceOrganizations = [
                ...dynamicVendors,
                ...enriched.subserviceOrganizations.filter(o => !dynamicVendors.some(d => d.name.toLowerCase() === o.name.toLowerCase()))
            ];
        }

        setFormData(enriched);
        setIsDirty(true);
        toast.success(`Generated Section III draft populated with ${clientName} telemetry & vendor profiles!`);
    };

    const handleSave = () => {
        saveMutation.mutate({
            clientId,
            data: {
                ...formData,
                status: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: 'Lead Implementer / CISO'
            }
        });
        setIsDirty(false);
    };

    const generateMarkdownDocument = (): string => {
        return `# SECTION III: MANAGEMENT'S DESCRIPTION OF THE SYSTEM
**System Title:** ${formData.systemTitle}  
**Review Period:** ${formData.reviewPeriod}  
**Service Organization:** ${clientName}  
**Criteria Standard:** AICPA Description Criteria (DC 200)  
**Applicable Trust Services Categories:** ${formData.trustCategories.join(', ')}  
**Status:** ${formData.status.toUpperCase()} (Audit Version ${formData.version})  

---

## 1. PRINCIPAL SERVICE COMMITMENTS & SYSTEM REQUIREMENTS
### 1.1 Types of Services Provided
${formData.servicesProvided}

### 1.2 Principal Service Commitments
- **Security:** ${formData.principalCommitments.security}
- **Availability:** ${formData.principalCommitments.availability}
- **Confidentiality:** ${formData.principalCommitments.confidentiality}
- **Encryption:** ${formData.principalCommitments.encryption}
- **Incident Response SLA:** ${formData.principalCommitments.incidentSla}

---

## 2. COMPONENTS OF THE SYSTEM
### 2.1 Infrastructure
- **Cloud Provider:** ${formData.infrastructure.primaryCloud}
- **Regions:** ${formData.infrastructure.regions}
- **Container Architecture:** ${formData.infrastructure.containers}
- **Network Boundaries:** ${formData.infrastructure.networking}

### 2.2 Software
- **Core Applications:** ${formData.software.coreApp}
- **API Gateways:** ${formData.software.apiGateway}
- **Data Stores:** ${formData.software.databases}
- **Caching & Caching Transport:** ${formData.software.caching}

### 2.3 People & Governance
- **Organizational Structure:** ${formData.people.orgStructure}
- **Background Checks:** ${formData.people.backgroundChecks}
- **Security Awareness:** ${formData.people.securityTraining}
- **Role-Based Access (RBAC):** ${formData.people.roles}

### 2.4 Operational Procedures
- **SDLC & Code Reviews:** ${formData.procedures.sdlc}
- **Change Management:** ${formData.procedures.changeManagement}
- **Incident Response Protocol:** ${formData.procedures.incidentResponse}
- **Backup & Disaster Recovery:** ${formData.procedures.backupDisasterRecovery}

### 2.5 Data Classification & Encryption
- **Data Categories:** ${formData.dataClassification.categories}
- **Data Processing Flow:** ${formData.dataClassification.dataFlow}
- **Encryption at Rest:** ${formData.dataClassification.encryptionAtRest}
- **Encryption in Transit:** ${formData.dataClassification.encryptionInTransit}

---

## 3. BOUNDARIES OF THE SYSTEM & CARVE-OUTS
### 3.1 In-Scope System Boundary
${formData.inScopeBoundaries}

### 3.2 Out-of-Scope Carve-Outs
${formData.carvedOutBoundaries}

---

## 4. SUBSERVICE ORGANIZATIONS & CARVE-OUT METHOD
Management utilizes the **${(formData.subserviceMethod || 'carve-out').toUpperCase()} METHOD** per AICPA DC 200 criteria. Controls implemented by the following subservice organizations are excluded from the examination scope of this report:

| Subservice Organization | Services Provided | Controls Expected / Monitored |
|---|---|---|
${(formData.subserviceOrganizations || []).map(s => `| **${s.name}** | ${s.service} | ${s.controlsExpected} |`).join('\n')}

---

## 5. COMPLEMENTARY USER ENTITY CONTROLS (CUECs)
The controls described in this report cover operations performed by ${clientName}. The effectiveness of ${clientName}'s internal controls depends, in part, upon user entities implementing the following Complementary User Entity Controls (CUECs):

${(formData.cuecs || []).map(c => `### ${c.id}: ${c.title}\n${c.description}\n`).join('\n')}

---

## 6. COMPLEMENTARY SUBSERVICE ORGANIZATION CONTROLS (CSOCs) & SYSTEM CHANGES
### 6.1 Complementary Subservice Controls (CSOCs)
${formData.csocs}

### 6.2 Significant Changes During Review Period
${formData.systemChanges}
`;
    };

    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(generateMarkdownDocument());
        setCopied(true);
        toast.success("Section III document copied to clipboard as formal Markdown!");
        setTimeout(() => setCopied(false), 2500);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header / Command Bar */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs font-bold px-2.5 py-0.5">
                                    AICPA Description Criteria DC 200
                                </Badge>
                                <Badge className={cn(
                                    "text-xs font-bold px-2.5 py-0.5",
                                    formData.status === 'approved' 
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                        : "bg-amber-500/20 text-amber-300 border-amber-400/30"
                                )}>
                                    {formData.status === 'approved' ? 'Audit-Ready & Approved' : 'Draft In Progress'}
                                </Badge>
                                {clientData?.updatedAt && (
                                    <span className="text-xs text-slate-400">
                                        Last saved {new Date(clientData.updatedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-400 shrink-0" />
                                Section III: Management's System Description Studio
                            </h2>
                            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                                Author, synchronize, and export the official <strong>AICPA DC 200 Section III System Description</strong> for {clientName}. This formal document defines principal service commitments, cloud system boundaries, subservice carve-outs, and CUECs for your CPA audit firm.
                            </p>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleAutoGenerate}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 shadow-xs"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                Auto-Fill with Telemetry
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyMarkdown}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 shadow-xs"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy Markdown'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePrint}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 shadow-xs"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print Document
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 shadow-md"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {saveMutation.isPending ? 'Saving...' : 'Save & Lock Draft'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card">
                    <div className="text-xs text-muted-foreground font-medium">Approved Policies</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">{safePolicies.length} Active</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Mapped to DC 200 C1</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card">
                    <div className="text-xs text-muted-foreground font-medium">Subservices in Scope</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">{(formData.subserviceOrganizations || []).length} Providers</div>
                    <div className="text-[11px] text-blue-600 font-semibold mt-0.5">Carve-Out Method</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card">
                    <div className="text-xs text-muted-foreground font-medium">Mandatory CUECs</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">{(formData.cuecs || []).length} User Controls</div>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">DC 200 C7 Ready</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card">
                    <div className="text-xs text-muted-foreground font-medium">Audit Clean Room</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">SOC 2 Type II</div>
                    <div className="text-[11px] text-amber-600 font-semibold mt-0.5">AICPA DC 200 Verified</div>
                </div>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                {[
                    { id: 'commitments', label: '1. Commitments & Scope', icon: Shield },
                    { id: 'components', label: '2. Five System Components', icon: Layers },
                    { id: 'boundaries', label: '3. Boundaries & Carve-Outs', icon: Globe },
                    { id: 'subservices', label: '4. Subservice Organizations', icon: Server },
                    { id: 'cuecs', label: '5. User Controls (CUECs)', icon: Users },
                    { id: 'csocs', label: '6. Subservice Controls (CSOCs)', icon: Lock },
                    { id: 'full_preview', label: 'Formal Document Preview', icon: FileText },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSection === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as any)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENT: 1. Commitments & Scope */}
            {activeSection === 'commitments' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-600" />
                                1. System Title, Services & Principal Commitments (DC 200 C1 & C2)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Formal identification of the service organization, system title, and explicit security & availability commitments made to users.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-foreground block mb-1">Official System Title</label>
                                    <input
                                        type="text"
                                        value={formData.systemTitle}
                                        onChange={(e) => handleFieldChange('systemTitle', e.target.value)}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-foreground block mb-1">Audit Observation Window</label>
                                    <input
                                        type="text"
                                        value={formData.reviewPeriod}
                                        onChange={(e) => handleFieldChange('reviewPeriod', e.target.value)}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">Types of Services Provided</label>
                                <textarea
                                    rows={3}
                                    value={formData.servicesProvided}
                                    onChange={(e) => handleFieldChange('servicesProvided', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-normal leading-relaxed focus:ring-1 focus:ring-primary"
                                    placeholder="Describe the SaaS platform, APIs, user base, and core functionality..."
                                />
                            </div>

                            <div className="border-t border-border pt-3">
                                <h4 className="text-xs font-bold text-foreground mb-3">Principal Service Commitments (Per Trust Services Criteria)</h4>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">Security Commitment</span>
                                        <textarea
                                            rows={2}
                                            value={formData.principalCommitments.security}
                                            onChange={(e) => handleFieldChange('principalCommitments.security', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5">Availability Commitment (Uptime SLA)</span>
                                        <textarea
                                            rows={2}
                                            value={formData.principalCommitments.availability}
                                            onChange={(e) => handleFieldChange('principalCommitments.availability', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 block mb-0.5">Confidentiality & Data Privacy Commitment</span>
                                        <textarea
                                            rows={2}
                                            value={formData.principalCommitments.confidentiality}
                                            onChange={(e) => handleFieldChange('principalCommitments.confidentiality', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-foreground block mb-0.5">Cryptographic Encryption Commitment</span>
                                            <textarea
                                                rows={2}
                                                value={formData.principalCommitments.encryption}
                                                onChange={(e) => handleFieldChange('principalCommitments.encryption', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-foreground block mb-0.5">Incident Response SLA Commitment</span>
                                            <textarea
                                                rows={2}
                                                value={formData.principalCommitments.incidentSla}
                                                onChange={(e) => handleFieldChange('principalCommitments.incidentSla', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: 2. Five System Components */}
            {activeSection === 'components' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-600" />
                                2. Components of the System (AICPA DC 200 C3)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Detail the five foundational pillars of the operating environment: Infrastructure, Software, People, Procedures, and Data.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-1">
                            {/* Infrastructure */}
                            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Server className="w-3.5 h-3.5 text-blue-600" />
                                    2.1 Infrastructure
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Primary Cloud & Hosting</label>
                                        <input
                                            type="text"
                                            value={formData.infrastructure.primaryCloud}
                                            onChange={(e) => handleFieldChange('infrastructure.primaryCloud', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Regions & Availability Zones</label>
                                        <input
                                            type="text"
                                            value={formData.infrastructure.regions}
                                            onChange={(e) => handleFieldChange('infrastructure.regions', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Container Orchestration</label>
                                        <input
                                            type="text"
                                            value={formData.infrastructure.containers}
                                            onChange={(e) => handleFieldChange('infrastructure.containers', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Network Architecture & WAF</label>
                                        <input
                                            type="text"
                                            value={formData.infrastructure.networking}
                                            onChange={(e) => handleFieldChange('infrastructure.networking', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Software */}
                            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Code className="w-3.5 h-3.5 text-indigo-600" />
                                    2.2 Software Applications & Databases
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Core Application Stack</label>
                                        <input
                                            type="text"
                                            value={formData.software.coreApp}
                                            onChange={(e) => handleFieldChange('software.coreApp', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">API Gateway & Edge Routers</label>
                                        <input
                                            type="text"
                                            value={formData.software.apiGateway}
                                            onChange={(e) => handleFieldChange('software.apiGateway', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Primary Databases & Replication</label>
                                        <input
                                            type="text"
                                            value={formData.software.databases}
                                            onChange={(e) => handleFieldChange('software.databases', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">In-Memory Caching & Session Storage</label>
                                        <input
                                            type="text"
                                            value={formData.software.caching}
                                            onChange={(e) => handleFieldChange('software.caching', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* People */}
                            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-amber-600" />
                                    2.3 People & Organizational Hierarchy
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Organizational Structure & Governance</label>
                                        <textarea
                                            rows={2}
                                            value={formData.people.orgStructure}
                                            onChange={(e) => handleFieldChange('people.orgStructure', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Pre-Employment Background Checks</label>
                                            <input
                                                type="text"
                                                value={formData.people.backgroundChecks}
                                                onChange={(e) => handleFieldChange('people.backgroundChecks', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Security Awareness Training Protocol</label>
                                            <input
                                                type="text"
                                                value={formData.people.securityTraining}
                                                onChange={(e) => handleFieldChange('people.securityTraining', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Procedures */}
                            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                                    2.4 Operational Procedures (SDLC, Changes, Incidents, Backups)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">SDLC & Code Reviews</label>
                                        <textarea
                                            rows={2}
                                            value={formData.procedures.sdlc}
                                            onChange={(e) => handleFieldChange('procedures.sdlc', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Change Management</label>
                                        <textarea
                                            rows={2}
                                            value={formData.procedures.changeManagement}
                                            onChange={(e) => handleFieldChange('procedures.changeManagement', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Incident Response Procedures</label>
                                        <textarea
                                            rows={2}
                                            value={formData.procedures.incidentResponse}
                                            onChange={(e) => handleFieldChange('procedures.incidentResponse', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Backup & Disaster Recovery</label>
                                        <textarea
                                            rows={2}
                                            value={formData.procedures.backupDisasterRecovery}
                                            onChange={(e) => handleFieldChange('procedures.backupDisasterRecovery', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Data */}
                            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5 text-cyan-600" />
                                    2.5 Data Classification & Encryption Controls
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Data Classifications</label>
                                        <input
                                            type="text"
                                            value={formData.dataClassification.categories}
                                            onChange={(e) => handleFieldChange('dataClassification.categories', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">End-to-End Data Processing Flow</label>
                                        <textarea
                                            rows={2}
                                            value={formData.dataClassification.dataFlow}
                                            onChange={(e) => handleFieldChange('dataClassification.dataFlow', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Encryption at Rest</label>
                                            <input
                                                type="text"
                                                value={formData.dataClassification.encryptionAtRest}
                                                onChange={(e) => handleFieldChange('dataClassification.encryptionAtRest', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Encryption in Transit</label>
                                            <input
                                                type="text"
                                                value={formData.dataClassification.encryptionInTransit}
                                                onChange={(e) => handleFieldChange('dataClassification.encryptionInTransit', e.target.value)}
                                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: 3. Boundaries & Carve-Outs */}
            {activeSection === 'boundaries' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Globe className="w-4 h-4 text-cyan-600" />
                                3. System Boundaries & Exclusions (DC 200 C4 & C5)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Clearly articulate what assets, networks, and environments are inside the audit boundary versus excluded carve-outs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">In-Scope System Boundary Definition</label>
                                <textarea
                                    rows={4}
                                    value={formData.inScopeBoundaries}
                                    onChange={(e) => handleFieldChange('inScopeBoundaries', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-normal leading-relaxed focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">Carved-Out / Excluded Environments</label>
                                <textarea
                                    rows={4}
                                    value={formData.carvedOutBoundaries}
                                    onChange={(e) => handleFieldChange('carvedOutBoundaries', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-normal leading-relaxed focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: 4. Subservice Organizations */}
            {activeSection === 'subservices' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Server className="w-4 h-4 text-blue-600" />
                                        4. Subservice Organizations & Carve-Out Method (DC 200 C6)
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Formal carve-out schedule of external cloud providers and third-party vendors whose internal controls are excluded from this report.
                                    </CardDescription>
                                </div>
                                <Badge className="bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 text-xs font-bold">
                                    Carve-Out Method
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 border-b border-border text-foreground font-bold">
                                        <tr>
                                            <th className="p-3">Subservice Organization</th>
                                            <th className="p-3">Function / Services Provided</th>
                                            <th className="p-3">Controls Relied Upon / Expected</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {(formData.subserviceOrganizations || []).map((sub, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30">
                                                <td className="p-3 font-bold text-foreground">
                                                    <input
                                                        type="text"
                                                        value={sub.name}
                                                        onChange={(e) => {
                                                            const copy = (formData.subserviceOrganizations || []).map((item, i) =>
                                                                i === idx ? { ...item, name: e.target.value } : item
                                                            );
                                                            handleFieldChange('subserviceOrganizations', copy);
                                                        }}
                                                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-bold"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={sub.service}
                                                        onChange={(e) => {
                                                            const copy = (formData.subserviceOrganizations || []).map((item, i) =>
                                                                i === idx ? { ...item, service: e.target.value } : item
                                                            );
                                                            handleFieldChange('subserviceOrganizations', copy);
                                                        }}
                                                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={sub.controlsExpected}
                                                        onChange={(e) => {
                                                            const copy = (formData.subserviceOrganizations || []).map((item, i) =>
                                                                i === idx ? { ...item, controlsExpected: e.target.value } : item
                                                            );
                                                            handleFieldChange('subserviceOrganizations', copy);
                                                        }}
                                                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: 5. CUECs */}
            {activeSection === 'cuecs' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                5. Complementary User Entity Controls (CUECs) (DC 200 C7)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Mandatory controls that customer organizations must implement in their own environment for the SOC 2 trust commitments to be fully met.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3.5 pt-1">
                            {(formData.cuecs || []).map((cuec, idx) => (
                                <div key={cuec.id} className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge className="bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 text-xs font-bold">
                                            {cuec.id}
                                        </Badge>
                                        <input
                                            type="text"
                                            value={cuec.title}
                                            onChange={(e) => {
                                                const copy = (formData.cuecs || []).map((item, i) =>
                                                    i === idx ? { ...item, title: e.target.value } : item
                                                );
                                                handleFieldChange('cuecs', copy);
                                            }}
                                            className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs font-bold ml-2"
                                        />
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={cuec.description}
                                        onChange={(e) => {
                                            const copy = (formData.cuecs || []).map((item, i) =>
                                                i === idx ? { ...item, description: e.target.value } : item
                                            );
                                            handleFieldChange('cuecs', copy);
                                        }}
                                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground focus:text-foreground leading-relaxed"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: 6. CSOCs & Changes */}
            {activeSection === 'csocs' && (
                <div className="space-y-4">
                    <Card className="border border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Lock className="w-4 h-4 text-emerald-600" />
                                6. Complementary Subservice Controls (CSOCs) & System Changes (DC 200 C8 & C9)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Controls expected from hosting providers and record of major architectural changes during the audit period.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">Complementary Subservice Organization Controls (CSOCs)</label>
                                <textarea
                                    rows={4}
                                    value={formData.csocs}
                                    onChange={(e) => handleFieldChange('csocs', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-normal leading-relaxed focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">Significant Architecture & System Changes During Observation Window</label>
                                <textarea
                                    rows={4}
                                    value={formData.systemChanges}
                                    onChange={(e) => handleFieldChange('systemChanges', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-normal leading-relaxed focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: Formal Document Preview */}
            {activeSection === 'full_preview' && (
                <Card className="border border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/40 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold text-foreground">
                                    Official SOC 2 Section III Audit Report Document
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Complete audit-ready copy formatted for inclusion in your CPA firm's report.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={handleCopyMarkdown} className="text-xs font-bold gap-1">
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied Markdown' : 'Copy Formal Text'}
                                </Button>
                                <Button size="sm" onClick={handlePrint} className="text-xs font-bold gap-1 bg-primary text-primary-foreground">
                                    <Printer className="w-3.5 h-3.5" />
                                    Print / Save PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/10 overflow-x-auto max-h-[600px] overflow-y-auto">
                        {generateMarkdownDocument()}
                    </CardContent>
                </Card>
            )}

            {/* Bottom Footer Save Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">
                        {isDirty ? 'You have unsaved changes in your Section III draft.' : 'All Section III changes synchronized with compliance database.'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {onBackToRoadmap && (
                        <Button size="sm" variant="outline" onClick={onBackToRoadmap} className="text-xs font-semibold">
                            Back to 90-Day Roadmap
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saveMutation.isPending ? 'Saving...' : 'Save & Synchronize with Roadmap'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
