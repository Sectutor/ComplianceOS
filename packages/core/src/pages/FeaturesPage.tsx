import { useState } from 'react';
import {
    Shield,
    FileText,
    BookOpen,
    Sparkles,
    Link,
    ClipboardCheck,
    AlertTriangle,
    Code,
    Activity,
    Compass,
    Flag,
    Brain,
    Building2,
    Users,
    FileBarChart,
    Calendar,
    Bell,
    Settings,
    ListTodo,
    MessageSquare,
    History,
    GraduationCap,
    CheckCircle2,
    Lock,
    Zap,
    Crown,
    Rocket,
    BarChart3,
    Puzzle,
    Server,
    LockIcon,
    Target,
    Eye,
    Database,
    Sliders,
    Layers,
    FlaskConical,
    MessageCircle,
    Bot,
    FileBarChart2,
    Briefcase,
    Handshake,
    Plug,
    HardDrive,
    Cloud,
    ShieldCheck,
    ShieldAlert,
    Radar,
    GitBranch,
    Gauge,
    FlaskRound,
    ArrowRight,
    Star,
    Clock,
    Palette
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';

interface Feature {
    name: string;
    description: string;
    icon: React.ElementType;
    status: 'core' | 'premium' | 'coming_soon';
    planRequired?: 'pro' | 'enterprise';
}

interface FeatureCategory {
    name: string;
    icon: React.ElementType;
    features: Feature[];
}

const coreFeatures: FeatureCategory[] = [
    {
        name: 'Compliance Management',
        icon: Shield,
        features: [
            { name: 'Controls Management', description: 'Implement and manage security controls', icon: Shield, status: 'core' },
            { name: 'Compliance Requirements', description: 'Track regulatory requirements', icon: ClipboardCheck, status: 'core' },
            { name: 'Policy Management', description: 'Create and manage compliance policies', icon: FileText, status: 'core' },
            { name: 'Evidence Collection', description: 'Collect and organize compliance evidence', icon: FileBarChart, status: 'core' },
            { name: 'Mappings', description: 'Map controls to frameworks', icon: Link, status: 'core' },
            { name: 'Knowledge Base', description: 'Centralized compliance documentation', icon: BookOpen, status: 'core' },
        ]
    },
    {
        name: 'Risk Management',
        icon: AlertTriangle,
        features: [
            { name: 'Risk Register', description: 'Track and manage organizational risks', icon: AlertTriangle, status: 'core' },
            { name: 'Risk Assessment', description: 'Conduct risk assessments', icon: Target, status: 'core' },
        ]
    },
    {
        name: 'Audit & Assessment',
        icon: ClipboardCheck,
        features: [
            { name: 'Audit Manager', description: 'Manage audit workflows and findings', icon: ClipboardCheck, status: 'core' },
            { name: 'Compliance Journey', description: 'Track compliance progress', icon: Compass, status: 'core' },
            { name: 'Discovery Wizard', description: 'Initial compliance assessment', icon: Flag, status: 'core' },
        ]
    },
    {
        name: 'Federal Compliance',
        icon: Building2,
        features: [
            { name: 'FIPS 199 Categorization', description: 'Federal information classification', icon: Building2, status: 'core' },
            { name: 'NIST 800-171 SSP', description: 'Controlled unclassified information', icon: FileText, status: 'core' },
            { name: 'POA&M Management', description: 'Plan of action and milestones', icon: ListTodo, status: 'core' },
            { name: 'SAR Reporting', description: 'Security assessment reports', icon: FileBarChart, status: 'core' },
        ]
    },
    {
        name: 'Operations',
        icon: Settings,
        features: [
            { name: 'People Management', description: 'Manage team members and roles', icon: Users, status: 'core' },
            { name: 'RACI Matrix', description: 'Responsibility assignment matrix', icon: FileBarChart, status: 'core' },
            { name: 'Calendar', description: 'Compliance deadlines and events', icon: Calendar, status: 'core' },
            { name: 'Task Management', description: 'Track compliance tasks', icon: ListTodo, status: 'core' },
            { name: 'Notifications', description: 'Alert and notification system', icon: Bell, status: 'core' },
            { name: 'Activity Log', description: 'Audit trail of actions', icon: History, status: 'core' },
            { name: 'Personnel Compliance', description: 'Employee compliance tracking', icon: GraduationCap, status: 'core' },
            { name: 'Communication', description: 'Team communication tools', icon: MessageSquare, status: 'core' },
        ]
    },
    {
        name: 'Reporting',
        icon: FileBarChart2,
        features: [
            { name: 'Basic Reports', description: 'Standard compliance reports', icon: FileBarChart2, status: 'core' },
            { name: 'Dashboard', description: 'Overview metrics and KPIs', icon: Gauge, status: 'core' },
        ]
    },
];

const premiumFeatures: FeatureCategory[] = [
    {
        name: 'AI Advisor',
        icon: Bot,
        features: [
            { name: 'Advisor Workbench', description: 'AI-powered centralized triage and compliance suggestions', icon: Bot, status: 'premium', planRequired: 'pro' },
            { name: 'AI Evidence Analysis', description: 'AI-powered analysis of compliance evidence', icon: Sparkles, status: 'premium', planRequired: 'pro' },
            { name: 'AI Risk Triage', description: 'AI-assisted risk prioritization', icon: AlertTriangle, status: 'premium', planRequired: 'pro' },
            { name: 'AI Policy Drafting', description: 'Generate policies with AI assistance', icon: FileText, status: 'premium', planRequired: 'pro' },
            { name: 'AI Control Guidance', description: 'AI guidance for control implementation', icon: Compass, status: 'premium', planRequired: 'pro' },
            { name: 'AI Gap Analysis', description: 'Automated gap analysis using AI', icon: Activity, status: 'premium', planRequired: 'pro' },
            { name: 'Multi-LLM Support', description: 'Choose from multiple AI providers', icon: Layers, status: 'premium', planRequired: 'pro' },
        ]
    },
    {
        name: 'Advanced Reporting',
        icon: BarChart3,
        features: [
            { name: 'Professional Reports', description: 'Advanced reporting templates', icon: FileBarChart2, status: 'premium', planRequired: 'pro' },
            { name: 'Executive Dashboards', description: 'C-level view dashboards', icon: BarChart3, status: 'premium', planRequired: 'pro' },
            { name: 'Scheduled Reports', description: 'Automated report delivery', icon: Clock, status: 'premium', planRequired: 'pro' },
            { name: 'Custom Branding', description: 'White-labeling for reports', icon: Palette, status: 'premium', planRequired: 'pro' },
        ]
    },
    {
        name: 'Integrations',
        icon: Plug,
        features: [
            { name: 'Pre-built Integrations', description: 'Slack, GitHub, SMTP and more', icon: Plug, status: 'premium', planRequired: 'pro' },
            { name: 'Cloud Integrations', description: 'Cloud service connections', icon: Cloud, status: 'premium', planRequired: 'enterprise' },
        ]
    },
    {
        name: 'Advanced Features',
        icon: Star,
        features: [
            { name: 'Threat Modeling', description: 'Software security threat modeling', icon: Code, status: 'premium', planRequired: 'pro' },
            { name: 'AI Governance', description: 'AI compliance and risk management', icon: Brain, status: 'premium', planRequired: 'pro' },
            { name: 'Vulnerability Workbench', description: 'CVE triage and management', icon: ShieldAlert, status: 'premium', planRequired: 'pro' },
            { name: 'CRM Dashboard', description: 'Sales and client management', icon: Briefcase, status: 'premium', planRequired: 'pro' },
        ]
    },
];

const comingSoonFeatures: FeatureCategory[] = [
    {
        name: 'Enterprise Security',
        icon: Lock,
        features: [
            { name: 'SSO / SAML', description: 'Single Sign-On integration', icon: Lock, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Advanced RBAC', description: 'Granular role-based access control', icon: Users, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Audit Trail', description: 'Comprehensive audit logging', icon: History, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Advanced Encryption', description: 'BYOK and advanced encryption', icon: ShieldCheck, status: 'coming_soon', planRequired: 'enterprise' },
        ]
    },
    {
        name: 'Enterprise Integrations',
        icon: Plug,
        features: [
            { name: 'Enterprise Storage', description: 'S3, Azure Blob integration', icon: HardDrive, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'SIEM Integration', description: 'Push logs to external SIEM', icon: Radar, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'CRM Integration', description: 'Salesforce, HubSpot sync', icon: Handshake, status: 'coming_soon', planRequired: 'enterprise' },
        ]
    },
    {
        name: 'Enterprise Scalability',
        icon: Server,
        features: [
            { name: 'Redis Caching', description: 'High-performance caching layer', icon: Zap, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Connection Pooling', description: 'Advanced DB connection pooling', icon: Database, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Read Replicas', description: 'Database read replicas', icon: GitBranch, status: 'coming_soon', planRequired: 'enterprise' },
        ]
    },
    {
        name: 'Deployment Options',
        icon: Cloud,
        features: [
            { name: 'Private Cloud', description: 'Dedicated cloud environment', icon: Cloud, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'On-Premises', description: 'Deploy in your infrastructure', icon: Server, status: 'coming_soon', planRequired: 'enterprise' },
            { name: 'Air-Gapped', description: 'Fully offline deployment', icon: LockIcon, status: 'coming_soon', planRequired: 'enterprise' },
        ]
    },
];

function FeatureCard({ feature }: { feature: Feature }) {
    const [, setLocation] = useLocation();;

    const statusConfig = {
        core: {
            badge: <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Open Source</Badge>,
            border: 'border-green-200',
            bg: 'bg-green-50/50'
        },
        premium: {
            badge: feature.planRequired === 'enterprise'
                ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Crown className="w-3 h-3 mr-1" /> Enterprise</Badge>
                : <Badge className="bg-teal-100 text-indigo-700 hover:bg-teal-100"><Zap className="w-3 h-3 mr-1" /> Pro</Badge>,
            border: 'border-cyan-200',
            bg: 'bg-teal-50/50'
        },
        coming_soon: {
            badge: <Badge variant="outline" className="border-slate-300 text-slate-500"><Clock className="w-3 h-3 mr-1" /> Coming Soon</Badge>,
            border: 'border-slate-200',
            bg: 'bg-slate-50/50'
        }
    };

    const config = statusConfig[feature.status];

    return (
        <div className={`p-4 rounded-lg border ${config.border} ${config.bg} transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <feature.icon className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">{feature.name}</h3>
                </div>
                {config.badge}
            </div>
            <p className="text-sm text-slate-600">{feature.description}</p>
        </div>
    );
}

function CategorySection({ category }: { category: FeatureCategory }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <category.icon className="w-5 h-5 text-slate-700" />
                <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {category.features.map((feature) => (
                    <FeatureCard key={feature.name} feature={feature} />
                ))}
            </div>
        </div>
    );
}

export default function FeaturesPage() {
    const [, setLocation] = useLocation();;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <div className="bg-blue-600 text-white py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            ComplianceOS Features
                        </h1>
                        <p className="text-xl text-blue-100 mb-8">
                            Choose the right level of compliance automation for your organization.
                            Start free with open source, upgrade for AI-powered features.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => setLocation('/start')}
                                className="bg-white text-blue-600 hover:bg-blue-50"
                            >
                                Get Started Free
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setLocation('/billing')}
                                className="border-white text-white hover:bg-white/10"
                            >
                                View Pricing
                                <Crown className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Tiers Overview */}
            <div className="container mx-auto px-4 -mt-10">
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    <Card className="border-2 border-slate-200">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                <Shield className="w-6 h-6 text-green-600" />
                            </div>
                            <CardTitle className="text-xl">Community</CardTitle>
                            <CardDescription>Open Source</CardDescription>
                            <div className="text-3xl font-bold mt-2">Free</div>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-slate-600 mb-4">Self-hosted, unlimited use</p>
                            <ul className="text-sm text-left space-y-2">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Core compliance features</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Policy management</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Risk register</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Evidence collection</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-cyan-300 relative shadow-xl">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-teal-600 text-white">Most Popular</Badge>
                        </div>
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                                <Zap className="w-6 h-6 text-cyan-600" />
                            </div>
                            <CardTitle className="text-xl">Pro</CardTitle>
                            <CardDescription>AI-Powered</CardDescription>
                            <div className="text-3xl font-bold mt-2 text-cyan-600">$299<span className="text-sm font-normal">/mo</span></div>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-slate-600 mb-4">Per organization, AI included</p>
                            <ul className="text-sm text-left space-y-2">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500" /> Everything in Community</li>
                                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-500" /> AI Advisor & Automation</li>
                                <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-500" /> Professional Reports</li>
                                <li className="flex items-center gap-2"><Plug className="w-4 h-4 text-cyan-500" /> Pre-built Integrations</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-amber-300">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                                <Crown className="w-6 h-6 text-amber-600" />
                            </div>
                            <CardTitle className="text-xl">Enterprise</CardTitle>
                            <CardDescription>Full Service</CardDescription>
                            <div className="text-3xl font-bold mt-2 text-amber-600">Custom</div>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-slate-600 mb-4">Managed & white-labeled</p>
                            <ul className="text-sm text-left space-y-2">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> Everything in Pro</li>
                                <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" /> SSO & Advanced Security</li>
                                <li className="flex items-center gap-2"><Server className="w-4 h-4 text-amber-500" /> Enterprise Scalability</li>
                                <li className="flex items-center gap-2"><Handshake className="w-4 h-4 text-amber-500" /> Dedicated Support</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Feature Tabs */}
            <div className="container mx-auto px-4 py-16">
                <Tabs defaultValue="core" className="w-full">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                        <TabsTrigger value="core" className="gap-2">
                            <Shield className="w-4 h-4" />
                            Open Source
                        </TabsTrigger>
                        <TabsTrigger value="premium" className="gap-2">
                            <Zap className="w-4 h-4" />
                            Premium
                        </TabsTrigger>
                        <TabsTrigger value="coming_soon" className="gap-2">
                            <Clock className="w-4 h-4" />
                            Coming Soon
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="core" className="space-y-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Open Source Features</h2>
                            <p className="text-slate-600 mt-2">Everything you need for basic compliance management - completely free</p>
                        </div>
                        {coreFeatures.map((category) => (
                            <CategorySection key={category.name} category={category} />
                        ))}
                    </TabsContent>

                    <TabsContent value="premium" className="space-y-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Premium Features</h2>
                            <p className="text-slate-600 mt-2">AI-powered automation and advanced capabilities for growing teams</p>
                        </div>
                        {premiumFeatures.map((category) => (
                            <CategorySection key={category.name} category={category} />
                        ))}
                    </TabsContent>

                    <TabsContent value="coming_soon" className="space-y-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Coming Soon</h2>
                            <p className="text-slate-600 mt-2">Enterprise-grade features planned for future releases</p>
                        </div>
                        {comingSoonFeatures.map((category) => (
                            <CategorySection key={category.name} category={category} />
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            {/* CTA Section */}
            <div className="bg-slate-900 text-white py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                        Join thousands of organizations using ComplianceOS to manage their compliance posture.
                        Start free with the open source version.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button
                            size="lg"
                            onClick={() => setLocation('/start')}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Start Free
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setLocation('/billing')}
                            className="border-slate-600 text-white hover:bg-slate-800"
                        >
                            Upgrade to Pro
                            <Zap className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
