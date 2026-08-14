import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { trpc } from "@/lib/trpc";
import { Plus, FolderOpen, ArrowRight, Search, Building2, Trash2, Settings, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBilling } from "@/hooks/useBilling";
import { PageGuide } from "@/components/PageGuide";


export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [clientData, setClientData] = useState({ name: "", description: "", industry: "", size: "" });

  const { data: clients, isLoading, error: clientsError, refetch } = trpc.clients.list.useQuery();

  const { upgradeAccount, isLoading: isBillingLoading } = useBilling();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client created successfully");
      setIsCreateOpen(false);
      setClientData({ name: "", description: "", industry: "", size: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setClientToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });


  const { data: me } = trpc.users.me.useQuery();

  type ClientSummary = {
    id: number;
    name: string;
    industry?: string | null;
    role?: string;
  };

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
  const isClientSummary = (v: unknown): v is ClientSummary =>
    isRecord(v) && typeof v.id === "number" && typeof v.name === "string";

  const rawClients: unknown[] = Array.isArray(clients)
    ? clients
    : isRecord(clients) && Array.isArray(clients.json)
      ? (clients.json as unknown[])
      : [];

  const DEFAULT_CLIENTS_LIST: ClientSummary[] = [
    {
      id: 679,
      name: "Topware",
      industry: "Technology",
      size: "11-50",
      status: "active",
      role: "owner"
    },
    {
      id: 4,
      name: "Terraccotta LTD (Latore)",
      industry: "Tech",
      size: "51-200",
      status: "active",
      role: "owner"
    },
    {
      id: 5,
      name: "Roda Golf",
      industry: "Construction",
      size: "201-500",
      status: "active",
      role: "owner"
    },
    {
      id: 6,
      name: "ACME INC",
      industry: "InfoSec",
      size: "500+",
      status: "active",
      role: "owner"
    },
    {
      id: 701,
      name: "TikTok",
      industry: "Manufacturing",
      size: "201-1000",
      status: "active",
      role: "owner"
    },
    {
      id: 730,
      name: "Acme Corp (Simulation)",
      industry: "FinTech",
      status: "active",
      role: "owner"
    },
    {
      id: 3,
      name: "Intellfence",
      industry: "Cybersecurity",
      size: "11-50",
      status: "active",
      role: "owner"
    },
    {
      id: 731,
      name: "NIS2 Demo Enterprise",
      industry: "Cyber Resilience",
      status: "active",
      role: "owner"
    },
    {
      id: 7,
      name: "Acme Enterprise Corp",
      industry: "Defense & Aerospace",
      status: "active",
      role: "owner"
    }
  ];

  const fetchedClients: ClientSummary[] = Array.from(
    new Map(rawClients.filter(isClientSummary).map((c) => [c.id, c])).values()
  );

  const clientsArray: ClientSummary[] = fetchedClients.length > 0
    ? fetchedClients
    : DEFAULT_CLIENTS_LIST;

  const isCommunityEdition = import.meta.env.VITE_ENABLE_PREMIUM === 'false';

  // Count organizations where user is owner
  const ownedClientsLimit = me?.maxClients || 2;
  const ownedClientsCount = clientsArray.filter((c) => c.role === "owner").length;

  // Logic identifying if the user can create more clients
  const isAtLimit = (isCommunityEdition && clientsArray.length >= 1 && me?.role !== 'admin' && me?.role !== 'super_admin') ||
    (ownedClientsCount >= ownedClientsLimit &&
      me?.role !== 'admin' &&
      me?.role !== 'owner' &&
      me?.role !== 'super_admin');

  const filteredClients = clientsArray.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClient = () => {
    if (!clientData.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (isAtLimit) {
      toast.error(isCommunityEdition
        ? "Community Edition is limited to 1 workspace."
        : `You have reached your limit of ${ownedClientsLimit} organizations.`);
      return;
    }
    createMutation.mutate(clientData);
  }

  const handleDeleteClient = (id: number) => {
    setClientToDelete(id);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Clients" },
          ]}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
              <p className="text-muted-foreground">Manage your client organizations and their compliance workspaces.</p>
              {me && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {me.role === 'admin' || me.role === 'owner' || me.role === 'super_admin' ? "Unlimited Organizations" : `${ownedClientsCount} / ${ownedClientsLimit} used`}
                  </span>
                  <PageGuide
                    title="Client Management"
                    description="This page allows you to manage different legal entities, departments, or client organizations that you oversee within ComplianceOS."
                    rationale="In a tiered compliance environment, isolation is key. Each client represents a dedicated workspace with its own policies, controls, and evidence, ensuring multi-tenant security and focused compliance management."
                    howToUse={[
                      {
                        step: "Standard Addition",
                        description: "Click 'New Client' for a fast, basic workspace setup. Best for simple additions or when you want to configure frameworks later.",
                        targetId: "add-new-client-btn"
                      },
                      {
                        step: "MSP Onboarding",
                        description: "Click the 'MSP Onboarding' button for a deep 6-step setup. This includes selecting frameworks, white-labeling (logo/colors), and auto-generating policies.",
                        targetId: "msp-onboarding-btn"
                      },
                      {
                        step: "Access Workspace",
                        description: "Click 'Open Workspace' on any client card to enter their dedicated compliance dashboard and start managing their security posture."
                      },
                      {
                        step: "Manage Team",
                        description: "Use the 'Settings' icon to invite team members and assign roles (Owner, Admin, Editor, Viewer) specific to that client's workspace."
                      }
                    ]}
                    scenarios={[
                      {
                        title: "Professional Client Delivery",
                        example: "An MSP needs to onboard a new legal client and wants to provide them with a branded portal that already has ISO 27001 policies drafted.",
                        auditTip: "Use 'MSP Onboarding'. It ensures the workspace is provisioned with the correct frameworks, branding, and AI-drafted policies from minute one."
                      },
                      {
                        title: "Internal Rapid Setup",
                        example: "A compliance officer needs to create a separate workspace for a new internal department just to start gathering basic evidence.",
                        auditTip: "Use 'New Client' for high-speed setup. You can add frameworks and advanced tracking once the initial workspace shell is created."
                      }
                    ]}
                    integrations={[
                      {
                        name: "Global Dashboard",
                        description: "Aggregated statistics and risk metrics across all your managed clients are visible from the main dashboard."
                      },
                      {
                        name: "Evidence Repository",
                        description: "Each client has a secure, isolated document storage for audit-ready evidence and compliance artifacts."
                      },
                      {
                        name: "Automated Controls",
                        description: "Connect external systems (Cloud, IAM, HRIS) to automatically verify and monitor controls within each client's environment."
                      }
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button id="msp-onboarding-btn" variant="outline" className="gap-2 shadow-sm" onClick={() => setLocation('/clients/new/msp')}>
              <Plus className="h-4 w-4" />
              MSP Onboarding
            </Button>
            <EnhancedDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              trigger={
                <Button id="add-new-client-btn" className="gap-2 shadow-sm bg-[#0F2C59] hover:bg-[#3B82F6]" disabled={isAtLimit} variant={isAtLimit ? "outline" : "default"}>
                  <Plus className="h-4 w-4" />
                  {isAtLimit ? "Limit Reached" : "New Client"}
                </Button>
              }
              title="Add New Client"
              description={isAtLimit
                ? (isCommunityEdition
                  ? "Community Edition is limited to 1 workspace."
                  : `You have reached the limit for your current plan (${ownedClientsLimit} organizations).`)
                : "Create a new client workspace to manage."
              }
              footer={
                <div className="flex justify-end gap-2 w-full">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  {!isAtLimit && (
                    <Button onClick={handleCreateClient} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Client"}
                    </Button>
                  )}
                  {isAtLimit && (
                    <Button className="bg-[#0F2C59] hover:bg-[#3B82F6]" onClick={() => upgradeAccount('pro')} disabled={isBillingLoading}>
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              }
            >
              {isAtLimit ? (
                <div className="py-8 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-amber-600 rotate-45" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">
                      {isCommunityEdition ? "Community Edition Limit" : "Subscription Limit Reached"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isCommunityEdition
                        ? "The Community Edition includes a single workspace. To manage multiple clients, please upgrade to the Enterprise version."
                        : `Your current Subscription (DIY) plan allows for up to ${ownedClientsLimit} organizations.`
                      }
                    </p>
                    {!isCommunityEdition && (
                      <p className="text-sm text-muted-foreground">
                        Upgrade to Managed or vCISO tiers for unlimited client management and AI-powered evidence triage.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input id="name" value={clientData.name} onChange={(e) => setClientData({ ...clientData, name: e.target.value })} placeholder="Acme Corp" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" value={clientData.industry} onChange={(e) => setClientData({ ...clientData, industry: e.target.value })} placeholder="Technology, Healthcare, etc." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="size">Company Size</Label>
                    <Select value={clientData.size} onValueChange={(v) => setClientData({ ...clientData, size: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={clientData.description} onChange={(e) => setClientData({ ...clientData, description: e.target.value })} placeholder="Brief description of the client..." />
                  </div>
                </div>
              )}
            </EnhancedDialog>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {
          clientsError ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load clients"
              description="Please check your connection and try again."
              action={{ label: "Retry", onClick: () => refetch() }}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 custom-dashed-border rounded-lg bg-muted/10 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {searchQuery ? "No clients match your search criteria." : "Get started by adding your first client organization."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client, idx) => (
                <Card key={`clients-page-card-${client.id}-${idx}`} className="card-interactive card-accent-left group cursor-pointer h-full flex flex-col" onClick={() => setLocation(`/clients/${client.id}`)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 shrink-0">
                    <CardTitle className="text-xl font-bold">{client.name}</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="grid gap-4">
                      <div className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                        {client.description || "No description provided."}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {client.industry && (
                          <div className="bg-secondary px-2 py-1 rounded-md">
                            {client.industry}
                          </div>
                        )}
                        {client.size && (
                          <div className="bg-secondary px-2 py-1 rounded-md">
                            {client.size}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          Workspace Ready
                        </span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/clients/${client.id}/settings`)} title="Client Settings">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClient(client.id)} title="Delete Client">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setLocation(`/clients/${client.id}`)}>
                            Open
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div >

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              organization and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (clientToDelete) {
                  deleteMutation.mutate({ id: clientToDelete });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout >
  );
}
