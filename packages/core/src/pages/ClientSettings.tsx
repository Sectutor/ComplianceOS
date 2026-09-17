
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { DemoImportDialog } from "@/components/admin/DemoImportDialog";
import { toast } from "sonner";
import {
    CreditCard,
    Settings,
    FileText,
    Shield,
    Loader2,
    ArrowLeft,
    Building2,
    Users,
    Trash2,
    Image,
    Server,
    Mail,
    Database,
    Briefcase,
    MapPin,
    Globe,
    Bot
} from "lucide-react";


import ClientContactInfo from "@/components/ClientContactInfo";
import ClientTeamManagement from "@/components/ClientTeamManagement";
import ClientGeneralSettings from "@/components/ClientGeneralSettings";
import ClientBrandingSettings from "@/components/ClientBrandingSettings";
import { SmtpSettings } from "@/components/settings/SmtpSettings";
import { AutomationSettingsTab } from "./settings/AutomationSettingsTab";
import { PolicySettingsTab } from "@/components/settings/PolicySettingsTab";
import { FrameworksSettingsTab } from "@/components/settings/FrameworksSettingsTab";
import { Badge } from "@complianceos/ui/ui/badge";
import { EmailTemplatesTab } from "@/components/settings/EmailTemplatesTab";
import { PersonalizationReference } from "@/components/settings/PersonalizationReference";
import { ShoppingBag, History } from "lucide-react";
import { BackupRestoreSettings } from "@/components/settings/BackupRestoreSettings";
import { BillingTab } from "@/components/settings/BillingTab";

interface ClientSettingsProps {
    id?: string;
}

export default function ClientSettings(props?: ClientSettingsProps) {
    const params = useParams<{ id?: string }>();
    const { selectedClientId } = useClientContext();
    const rawId = props?.id || params?.id || (selectedClientId ? String(selectedClientId) : "0");
    const clientId = Number(rawId);
    const [location, setLocation] = useLocation();
    const { user } = useAuth();

    // Lazy loaded to avoid potential circular dep issues or just keep clean


    const [isDeletingClient, setIsDeletingClient] = useState(false);
    const [isImportingData, setIsImportingData] = useState(false);

    const { data: dbUser } = trpc.users.me.useQuery();
    const { data: client, isLoading, refetch } = trpc.clients.get.useQuery({ id: clientId });

    const userGlobalRole = dbUser?.role;
    const userRoleInClient = client?.userRole;

    const hasManagementAccess = 
        userGlobalRole === 'admin' || 
        userGlobalRole === 'owner' || 
        userGlobalRole === 'super_admin' ||
        userRoleInClient === 'admin' ||
        userRoleInClient === 'owner';

    const isPremiumOrg = client?.planTier === 'consultant' || client?.planTier === 'enterprise';
    const adminRoles = ['admin', 'owner', 'super_admin', 'super', 'enterprise_admin', 'ent_admin'];
    const canAccessBackupRestore = isPremiumOrg || adminRoles.includes(userGlobalRole || '');

    const deleteClientMutation = trpc.clients.delete.useMutation({
        onSuccess: () => {
            toast.success("Client deleted successfully");
            setLocation("/clients");
        },
        onError: (err) => toast.error(err.message),
    });

    const importDemoDataMutation = trpc.clients.importDemoData.useMutation({
        onSuccess: () => {
            toast.success("Demo data imported successfully!");
            setIsImportingData(false);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!client) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Client not found</p>
                </div>
            </DashboardLayout>
        );
    }

    const queryParams = new URLSearchParams(window.location.search);
    const [activeTab, setActiveTab] = useState(queryParams.get("tab") || "general");

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", val);
        window.history.replaceState({}, "", url.toString());
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 w-full max-w-full">
                <Breadcrumb
                    items={[
                        { label: "Clients", href: "/clients" },
                        { label: client.name, href: `/clients/${clientId}` },
                        { label: "Settings" },
                    ]}
                />

                {/* Hero Header */}
                <Card className="border border-border/80 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 p-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                    <CardContent className="p-6 sm:p-8 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-muted/80 border border-border/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                                    {client.logoUrl ? (
                                        <img src={client.logoUrl} alt={client.name} className="h-10 w-10 object-contain p-1" />
                                    ) : (
                                        <Building2 className="h-7 w-7 text-primary" />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{client.name}</h1>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-0.5">
                                            Client Settings
                                        </Badge>
                                        {client.planTier && (
                                            <Badge variant="outline" className="text-xs font-semibold border-border uppercase">
                                                {client.planTier}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground/80" />
                                            {client.industry || "Industry not set"}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-muted-foreground/80" />
                                            {client.size || "Size not set"}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                                            {client.headquarters || "HQ not set"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                                <Button
                                    variant="outline"
                                    className="border-border text-xs font-semibold h-9 px-4 rounded-xl gap-2 hover:bg-muted"
                                    onClick={() => setLocation(`/clients/${clientId}`)}
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Back to Dashboard
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                    <TabsList className="bg-muted/50 p-1.5 h-auto flex flex-wrap justify-start gap-1.5 w-full border border-border/70 rounded-2xl">
                        <TabsTrigger
                            value="general"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Building2 className="mr-2 h-3.5 w-3.5" />
                            General
                        </TabsTrigger>
                        <TabsTrigger
                            value="billing"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <CreditCard className="mr-2 h-3.5 w-3.5 text-primary" />
                            Subscription & Billing
                        </TabsTrigger>
                        <TabsTrigger
                            value="policy"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <FileText className="mr-2 h-3.5 w-3.5" />
                            Policy Settings
                        </TabsTrigger>
                        <TabsTrigger
                            value="team"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Users className="mr-2 h-3.5 w-3.5" />
                            Team
                        </TabsTrigger>
                        <TabsTrigger
                            value="branding"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Image className="mr-2 h-3.5 w-3.5" />
                            Branding
                        </TabsTrigger>
                        <TabsTrigger
                            value="license"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Shield className="mr-2 h-3.5 w-3.5" />
                            License
                        </TabsTrigger>
                        <TabsTrigger
                            value="integrations"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Server className="mr-2 h-3.5 w-3.5" />
                            Integrations
                        </TabsTrigger>
                        {canAccessBackupRestore && (
                            <TabsTrigger
                                value="backup-restore"
                                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                            >
                                <History className="mr-2 h-3.5 w-3.5" />
                                Backup / Restore
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value="frameworks"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Shield className="mr-2 h-3.5 w-3.5" />
                            Frameworks
                        </TabsTrigger>
                        <TabsTrigger
                            value="data"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Database className="mr-2 h-3.5 w-3.5" />
                            Demo Data
                        </TabsTrigger>
                        <TabsTrigger
                            value="automation"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Bot className="mr-2 h-3.5 w-3.5" />
                            Automation
                        </TabsTrigger>
                        <TabsTrigger
                            value="email-templates"
                            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground font-semibold border border-transparent px-3.5 py-2 rounded-xl text-xs transition-all flex items-center"
                        >
                            <Mail className="mr-2 h-3.5 w-3.5" />
                            Emails
                        </TabsTrigger>
                    </TabsList>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className={activeTab === "billing" ? "lg:col-span-3 space-y-8" : "lg:col-span-2 space-y-8"}>
                            {/* General Tab */}
                            <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Organization Details</CardTitle>
                                        <CardDescription>Manage the core profile information for this client.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ClientGeneralSettings
                                            clientId={clientId}
                                            initialData={{
                                                name: client.name,
                                                description: client.description,
                                                industry: client.industry,
                                                size: client.size,
                                                cisoName: client.cisoName,
                                                dpoName: client.dpoName,
                                                headquarters: client.headquarters,
                                                mainServiceRegion: client.mainServiceRegion,
                                                currency: (client as any).currency,
                                                locale: (client as any).locale,
                                                dateFormat: (client as any).dateFormat,
                                            }}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Contact Information</CardTitle>
                                        <CardDescription>Primary point of contact for this organization.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ClientContactInfo
                                            clientId={clientId}
                                            contactName={client?.primaryContactName}
                                            contactTitle={undefined}
                                            contactEmail={client?.primaryContactEmail}
                                            contactPhone={client?.primaryContactPhone}
                                            address={undefined}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Onboarding tab removed — redundant with /settings/onboarding ("User Onboarding") */}

                            {/* Policy Settings Tab */}
                            <TabsContent value="policy" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <PolicySettingsTab
                                    clientId={clientId}
                                    client={client}
                                    onUpdate={refetch}
                                />
                            </TabsContent>

                            {/* Team Tab */}
                            <TabsContent value="team" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Team Management</CardTitle>
                                        <CardDescription>Manage members who have access to this workspace.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ClientTeamManagement clientId={clientId} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Branding Tab */}
                            <TabsContent value="branding" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <ClientBrandingSettings
                                    clientId={clientId}
                                    clientName={client?.name || "Client"}
                                    initialData={{
                                        logoUrl: client?.logoUrl,
                                        brandPrimaryColor: client?.brandPrimaryColor,
                                        brandSecondaryColor: client?.brandSecondaryColor,
                                        portalTitle: client?.portalTitle
                                    }}
                                    onUpdate={refetch}
                                />
                            </TabsContent>

                                                        {/* Billing Tab */}
                            <TabsContent value="billing" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <BillingTab clientId={clientId} clientName={client.name} />
                            </TabsContent>

                            {/* License Tab */}
                            <TabsContent value="license" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>License Management</CardTitle>
                                        <CardDescription>
                                            Manage your ComplianceOS license and access premium features.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium">License Status</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Activate or manage your license for premium features
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setLocation(`/clients/${clientId}/license`)}
                                            >
                                                <Shield className="h-4 w-4 mr-2" />
                                                Manage License
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Quick Actions</span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setLocation(`/clients/${clientId}/license`)}
                                                >
                                                    Go to License Page
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="justify-start"
                                                    onClick={() => setLocation(`/clients/${clientId}/license`)}
                                                >
                                                    <Shield className="h-4 w-4 mr-2" />
                                                    View License Status
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="justify-start"
                                                    onClick={() => window.open("https://gumroad.com/l/complianceos-enterprise", "_blank")}
                                                >
                                                    <CreditCard className="h-4 w-4 mr-2" />
                                                    Purchase License
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="justify-start"
                                                    onClick={() => window.open("https://docs.complianceos.com", "_blank")}
                                                >
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    View Documentation
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            <p>
                                                Need help with your license? Contact support or visit the
                                                <a href="/admin/license" className="text-primary hover:underline ml-1">
                                                    admin license management page
                                                </a>.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Integrations Tab */}
                            <TabsContent value="integrations" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>SMTP Configuration</CardTitle>
                                        <CardDescription>Configure email server settings for outgoing notifications.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <SmtpSettings clientId={clientId} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Email Templates Tab */}
                            <TabsContent value="email-templates" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <EmailTemplatesTab clientId={clientId} />
                            </TabsContent>

                            {/* Backup & Restore Tab */}
                            {canAccessBackupRestore && (
                                <TabsContent value="backup-restore" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                    <BackupRestoreSettings clientId={clientId} />
                                </TabsContent>
                            )}

                            {/* Frameworks Tab */}
                            <TabsContent value="frameworks" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <FrameworksSettingsTab clientId={clientId} />
                            </TabsContent>



                            {/* Demo Data Tab */}
                            <TabsContent value="data" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Database className="h-5 w-5 text-primary" />
                                            Import Demo Data
                                        </CardTitle>
                                        <CardDescription>
                                            Populate this organization with comprehensive sample data for testing purposes.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">
                                                    <Shield className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-amber-800 mb-1">Warning: Use with caution</h4>
                                                    <p className="text-sm text-amber-700 leading-relaxed">
                                                        This action will generate significant amounts of data including employees, assets, risks, vendors, and policies.
                                                        It is strictly intended for <strong>empty</strong> or <strong>demo</strong> organizations.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <Button onClick={() => setIsImportingData(true)}>
                                            <Database className="mr-2 h-4 w-4" />
                                            Import Demo Data
                                        </Button>
                                        <DemoImportDialog
                                            open={isImportingData}
                                            onOpenChange={setIsImportingData}
                                            onImport={async () => {
                                                await importDemoDataMutation.mutateAsync({ clientId });
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Automation Tab — sentinel agent runtime */}
                            <TabsContent value="automation" className="m-0 space-y-6 animate-in fade-in-50 duration-300">
                                <AutomationSettingsTab clientId={clientId} />
                            </TabsContent>
                        </div>

                        {activeTab !== "billing" && (
                        <div className="space-y-6">
                            {/* Tips / Info Side Panel */}
                            <Card className="bg-slate-50/50 border-slate-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Quick Tips</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-sm text-slate-600">
                                        <p className="mb-2 font-medium text-slate-900">Keeping profiles updated</p>
                                        <p>Accurate industry and size information helps us benchmark your compliance posture against peers.</p>
                                    </div>
                                    <div className="h-px bg-slate-200"></div>
                                    <div className="text-sm text-slate-600">
                                        <p className="mb-2 font-medium text-slate-900">Policy Management</p>
                                        <p>Configure default review cycles and approval workflows in the Policy Settings tab.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <PersonalizationReference />

                            {/* Danger Zone - Only for Admins */}
                            {(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin') && (
                                <Card className="border-red-200 bg-red-50/30 overflow-hidden">
                                    <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
                                        <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                                            <Trash2 className="h-5 w-5" />
                                            Danger Zone
                                        </CardTitle>
                                        <CardDescription className="text-red-600/80">
                                            Irreversible actions for this organization.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-600 mb-4">
                                            Permanently delete this client and all associated data. This action cannot be undone and will remove:
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-slate-600 mb-6 space-y-1 ml-1">
                                            <li>All policies and procedures</li>
                                            <li>Risk assessments and registers</li>
                                            <li>Employee records and evidence</li>
                                            <li>Access controls and settings</li>
                                        </ul>
                                        <EnhancedDialog
                                            open={isDeletingClient}
                                            onOpenChange={setIsDeletingClient}
                                            title="Delete Client"
                                            description={
                                                <>
                                                    Are you sure you want to delete <span className="font-semibold text-foreground">{client.name}</span>?
                                                    This will permanently delete all associated controls, policies, evidence, mappings, and assignments.
                                                </>
                                            }
                                            footer={
                                                <div className="flex justify-end gap-2 w-full">
                                                    <Button variant="outline" onClick={() => setIsDeletingClient(false)}>Cancel</Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => deleteClientMutation.mutate({ id: clientId })}
                                                        disabled={deleteClientMutation.isPending}
                                                    >
                                                        {deleteClientMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                                    </Button>
                                                </div>
                                            }
                                            trigger={
                                                <Button variant="destructive" className="w-full">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Organization
                                                </Button>
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        )}
                    </div>
                </Tabs>
            </div>
        </DashboardLayout >
    );
}
