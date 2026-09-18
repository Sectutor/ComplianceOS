import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@complianceos/ui/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@complianceos/ui/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@complianceos/ui/ui/collapsible";
import { Badge } from "@complianceos/ui/ui/badge";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, User, Shield, FileText, Calendar,
  Link, ClipboardCheck, FileBarChart, Bell, Settings, BookOpen, ChevronRight,
  ChevronDown, Scale, Lock, History, AlertTriangle, Activity, Database, Bug,
  ClipboardList, Megaphone, Building2, ListTodo, MessageSquare, Star, LayoutGrid, Inbox, Sparkles, Briefcase, Rocket, ShieldAlert, Globe, ShieldCheck, Zap, Target, Search, Code, Radar, Brain, Compass, Flag, GraduationCap, Video, Upload, X, Loader2, Cloud, GitBranch, Server, Key, Palette, Gamepad2, ShoppingBag, Bot, UserCheck, Webhook, ArrowLeft, HeartPulse
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { GlobalSearch } from "./GlobalSearch";
import { GlobalNotificationCenter } from "./common/GlobalNotificationCenter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import { ExtensionSlot } from "@/registry/extensionRegistry";
import { TourProvider } from "./TourProvider";
import { useBranding, BrandLogo, CURATED_FONTS, getContrastColor } from "@/config/branding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Slider } from "@complianceos/ui/ui/slider";
// Force rebuild - single notification center active
import { toast } from "sonner";
import { resolveNavigationPath, clientSpecificMenuItems } from "@/lib/navigation";
import { useTranslation } from "react-i18next";

export function translateNavLabel(label: string, t: (key: string, options?: any) => string): string {
  if (!label) return "";

  const labelMap: Record<string, string> = {
    // Groups
    "Platform & Overview": "navigation:platformOverview",
    "Libraries & Knowledge": "navigation:librariesKnowledge",
    "Compliance Journey": "navigation:complianceJourney",
    "ISO 27001 ISMS": "navigation:iso27001isms",
    "Governance": "navigation:governance",
    "Risk Management": "navigation:risks",
    "Continuous Assurance & Telemetry": "navigation:continuousAssurance",
    "Continuous Assurance": "navigation:continuousAssurance",
    "Evidence & Audit Repository": "navigation:evidenceRepository",
    "Vendors & Third Parties": "navigation:vendors",
    "Reports & Intelligence": "navigation:reportsIntelligence",
    "Tools & Automation": "navigation:toolsAutomation",
    "Learning & Training": "navigation:training",
    "Settings & Administration": "navigation:settingsAdmin",

    // Items & Menus
    "Action Center": "navigation:actionCenter",
    "Start Here": "navigation:startHere",
    "Dashboard": "navigation:dashboard",
    "Agent": "navigation:agent",
    "Clients": "navigation:clients",
    "Settings": "navigation:settings",
    "Branding": "navigation:branding",
    "User Onboarding": "navigation:employeeOnboarding",
    "Global Control Library": "navigation:globalControlLibrary",
    "Harmonization": "navigation:harmonization",
    "Compliance Obligations": "navigation:complianceObligations",
    "Frameworks Library": "navigation:frameworksLibrary",
    "Learning Zone": "navigation:learningZone",
    "Workflows": "navigation:workflows",
    "Overview": "navigation:overview",
    "Discovery & Scoping": "navigation:discoveryScoping",
    "Evidence Collection": "navigation:evidence",
    "Audit Preparation": "navigation:audit",
    "Controls": "navigation:controls",
    "Access Reviews": "navigation:accessReviews",
    "Webhooks": "navigation:webhooks",
    "Workbench": "navigation:workbench",
    "Strategic Roadmaps": "navigation:strategicRoadmaps",
    "Roadmap Dashboard": "navigation:roadmapDashboard",
    "Implementation Plans": "navigation:implementationPlans",
    "Roadmap Templates": "navigation:roadmapTemplates",
    "Policies": "navigation:policies",
    "View All Policies": "navigation:viewAllPolicies",
    "Policy Templates": "navigation:policyTemplates",
    "People & Org": "navigation:peopleOrg",
    "RACI Matrix": "navigation:raciMatrix",
    "Client Branding": "navigation:clientBranding",
    "Risk Framework": "navigation:riskFramework",
    "Risk Assessments": "navigation:riskAssessments",
    "Guided Assessment": "navigation:guidedAssessment",
    "Risk Register": "navigation:riskRegister",
    "Assets": "navigation:assets",
    "Threats": "navigation:threats",
    "Vulnerabilities": "navigation:vulnerabilities",
    "Treatment Plan": "navigation:treatmentPlan",
    "Alignment Guide": "navigation:alignmentGuide",
    "Risk Reports": "navigation:riskReports",
    "Audit Hub": "navigation:audit",
    "Vendors": "navigation:vendors",
    "Vendor Directory": "navigation:vendorDirectory",
    "Questionnaires": "navigation:questionnaires",
    "Evidence": "navigation:evidence",
    "Training": "navigation:training",
    "Reports": "navigation:reports",
    "Profile": "navigation:profile",
    "Sign out": "navigation:logout",
    "Logout": "navigation:logout",
    "Client Onboarding": "navigation:clientOnboarding",
    "Administration": "navigation:administration",
    "Organizations": "navigation:organizations",
    "User Management": "navigation:userManagement",
    "User Invitations": "navigation:userInvitations",
    "Audit Logs": "navigation:auditLogs",
    "LLM Settings": "navigation:llmSettings",
    "Billing": "navigation:billing",
    "Waitlist Management": "navigation:waitlistManagement",
    "Global CRM": "navigation:globalCrm",
    "System Feedback": "navigation:systemFeedback",
    "Advisor Workbench": "navigation:advisorWorkbench",
    "Activity Log": "navigation:activityLog",
    "All Clients Directory": "navigation:allClientsDirectory",
  };

  const mappedKey = labelMap[label];
  if (mappedKey) {
    const translated = t(mappedKey, { defaultValue: label });
    if (translated && translated !== mappedKey) return translated;
  }

  const slugKey = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  const directNav = t(`navigation:${slugKey}`, { defaultValue: '' });
  if (directNav && directNav !== `navigation:${slugKey}`) return directNav;

  const directCommon = t(`common:common.${slugKey}`, { defaultValue: '' });
  if (directCommon && directCommon !== `common:common.${slugKey}`) return directCommon;

  return label;
}

// ... (existing imports)

const globalMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Inbox, label: "Action Center", path: "/action-center" },
  { icon: Bot, label: "Agent", path: "/agent" },
  { icon: Rocket, label: "Client Onboarding", path: "/onboarding" }, // New
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: Shield, label: "Global Control Library", path: "/controls" },
  { icon: FileText, label: "Policy Templates", path: "/policy-templates" },
  { icon: Scale, label: "Compliance Obligations", path: "/compliance-obligations" },
  { icon: Target, label: "Strategic Roadmaps", path: "/start-here" },
  { icon: Calendar, label: "Implementation Plans", path: "/implementation" },
];

const learningZoneMenuItem = {
  icon: BookOpen, label: "Learning Zone", path: "/learning", submenu: [
    { label: "ISO 27001", path: "/learning/iso-27001" },
    { label: "SOC 2", path: "/learning/soc-2" },
    { label: "GDPR", path: "/learning/gdpr" },
    { label: "HIPAA", path: "/learning/hipaa" },
    { label: "CMMC", path: "/learning/cmmc" },
    { label: "PCI DSS", path: "/learning/pci-dss" },
    { label: "NIST CSF", path: "/learning/nist-csf" },
  ]
};

const adminMenuItems = [
  { label: "Organizations", path: "/admin/organizations" },
  { label: "User Management", path: "/admin/user-management" },
  { label: "User Invitations", path: "/admin/invitations" },
  { label: "Audit Logs", path: "/admin/audit" },
  { label: "LLM Settings", path: "/admin/llm" },
  { label: "Billing", path: "/admin/billing" },
  { label: "Waitlist Management", path: "/sales/waitlist" },
  { label: "Global CRM", path: "/admin/crm" },
  { label: "System Feedback", path: "/admin/system-feedback" },
];

const adminMenuItem = {
  icon: Lock, label: "Admin Console", path: "/admin", submenu: adminMenuItems
};



const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// Helper to resolve the actual navigation path based on client context


// Helper to check if a navigation path is active given the current location
function isPathActive(navPath: string, currentPath: string, currentSearch: string): boolean {
  try {
    const baseUrl = 'http://localhost';
    const navUrl = new URL(navPath, baseUrl);
    const currUrl = new URL(currentPath + currentSearch, baseUrl);

    // Exact match for the whole thing including search
    if (navUrl.pathname === currUrl.pathname && navUrl.search === currUrl.search) return true;

    const navTab = navUrl.searchParams.get('tab');
    const currTab = currUrl.searchParams.get('tab');

    // Handle client workspace tabbed routes (/clients/:id?tab=...)
    const navIsClientBase = navUrl.pathname.match(/^\/clients\/\d+$/);
    const currIsClientBase = currUrl.pathname.match(/^\/clients\/\d+$/);

    if (navIsClientBase && currIsClientBase) {
      if (navTab) {
        return navTab === currTab;
      }
      if (currTab) return false;
      return true;
    }

    // Special case for the "Clients" list link (/clients)
    if (navUrl.pathname === '/clients') {
      return currUrl.pathname === '/clients';
    }

    // If nav is a client base but current is a sub-page (like /people)
    if (navIsClientBase && currUrl.pathname.startsWith(navUrl.pathname) && currUrl.pathname !== navUrl.pathname) {
      return false;
    }

    // Prefix match for other sections (e.g. /risks)
    if (navUrl.pathname !== '/' && navUrl.pathname !== '/dashboard' && currUrl.pathname.startsWith(navUrl.pathname)) {
      const nextChar = currUrl.pathname.charAt(navUrl.pathname.length);
      if (!nextChar || nextChar === '/') return true;
    }

    return false;
  } catch (e) {
    return currentPath + currentSearch === navPath;
  }
}

export default function DashboardLayout({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, signOut } = useAuth();
  const { selectedClientId } = useClientContext();
  const branding = useBranding();
  const { appName } = branding;

  // Redirect Auditors to their clean room
  if (user?.user_metadata?.role === 'auditor' && selectedClientId) {
    return <Redirect to={`/clients/${selectedClientId}/audit-hub`} />;
  }

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <Shield className="h-16 w-16 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to {appName}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Sign in to manage your compliance controls and policies.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--sidebar": branding.sidebarBg,
          "--sidebar-foreground": getContrastColor(branding.sidebarBg),
          "--primary": branding.primaryColor,
        } as CSSProperties
      }
    >
      <TourProvider>
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth} fullWidth={fullWidth}>
          {children}
        </DashboardLayoutContent>
      </TourProvider>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  fullWidth?: boolean;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  fullWidth = false,
}: DashboardLayoutContentProps) {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [menuSearch, setMenuSearch] = useState("");
  const {
    appName,
    logoUrl,
    primaryColor,
    updateBranding,
    resetBranding,
    logoSize,
    sidebarBg,
    headingFont,
    bodyFont,
    baseFontSize
  } = useBranding();
  const [brandingOpen, setBrandingOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingLogo(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateBranding({ logoUrl: result });
      setIsUploadingLogo(false);
      toast.success("Logo uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Extract client ID from URL if present
  const clientIdMatch = location.match(/\/clients\/(\d+)/);
  const activeClientId = clientIdMatch ? parseInt(clientIdMatch[1], 10) : null;

  // Use persistent client context
  const { selectedClientId, setSelectedClientId, clearSelectedClient, userRole: clientRole } = useClientContext();

  // Use selectedClientId from context if available, otherwise fall back to URL
  const persistentClientId = selectedClientId || activeClientId;

  // Roadmap return navigation tracking
  const [returnContext, setReturnContext] = useState<{
    url: string;
    label: string;
    frameworkId?: string;
    taskId?: string;
    taskTitle?: string;
  } | null>(null);
  const [dismissedReturnUrl, setDismissedReturnUrl] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);


  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo');
      const returnLabel = searchParams.get('returnLabel');
      const taskId = searchParams.get('taskId') || undefined;
      const taskTitle = searchParams.get('taskTitle') || undefined;
      const frameworkIdParam = searchParams.get('frameworkId') || undefined;

      // Extract frameworkId from returnTo path if not explicit (e.g., /clients/18/iso27001/program-guide)
      let detectedFrameworkId = frameworkIdParam;
      if (!detectedFrameworkId && returnTo) {
        const fwMatch = returnTo.match(/\/clients\/\d+\/([a-zA-Z0-9_-]+)\/program-guide/);
        if (fwMatch) detectedFrameworkId = fwMatch[1];
      }

      if (returnTo && returnTo !== location) {
        // Also check if sessionStorage has richer data for this URL
        let storedFw: string | undefined;
        try {
          const s = sessionStorage.getItem('cos_roadmap_return_nav');
          if (s) storedFw = JSON.parse(s)?.frameworkId;
        } catch {}

        setReturnContext({
          url: returnTo,
          label: returnLabel || '90-Day Roadmap',
          frameworkId: detectedFrameworkId || storedFw,
          taskId,
          taskTitle,
        });
        return;
      }

      // Check session storage if not directly in query params
      const stored = sessionStorage.getItem('cos_roadmap_return_nav');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.url !== location && (Date.now() - (parsed.timestamp || 0)) < 2 * 60 * 60 * 1000) {
          setReturnContext({
            url: parsed.url,
            label: parsed.label || '90-Day Roadmap',
            frameworkId: parsed.frameworkId,
            taskId: parsed.taskId,
            taskTitle: parsed.taskTitle,
          });
          return;
        } else if (parsed.url === location) {
          sessionStorage.removeItem('cos_roadmap_return_nav');
        }
      }

      setReturnContext(null);
    } catch (e) {
      setReturnContext(null);
    }
  }, [location]);






  // Only fetch client data if we're on a client-specific page
  const isClientSpecificPage = location.includes('/clients/') || location.includes('/client-');
  const shouldFetchClient = !!persistentClientId &&
    typeof persistentClientId === 'number' &&
    persistentClientId > 0 &&
    isClientSpecificPage;



  const { data: clientInfo, error: clientError } = trpc.clients.get.useQuery(
    { id: persistentClientId as number },
    {
      enabled: shouldFetchClient,
      retry: false
    }
  );

  const toggleRoadmapTaskMutation = trpc.frameworkRoadmapGates.toggleRoadmapTask.useMutation({
    onSuccess: () => {
      toast.success('Task marked complete!', { description: 'Returning to roadmap...' });
      setMarkingComplete(false);
      sessionStorage.removeItem('cos_roadmap_return_nav');
      if (returnContext) setLocation(returnContext.url);
    },
    onError: () => {
      toast.error('Failed to save. Returning anyway.');
      setMarkingComplete(false);
      sessionStorage.removeItem('cos_roadmap_return_nav');
      if (returnContext) setLocation(returnContext.url);
    },
  });



  const { data: clientsData } = trpc.clients.list.useQuery(undefined, { retry: false });

  const DEFAULT_FALLBACK_CLIENTS = [
    { id: 679, name: "Topware" },
    { id: 4, name: "Terraccotta LTD (Latore)" },
    { id: 5, name: "Roda Golf" },
    { id: 6, name: "ACME INC" },
    { id: 701, name: "TikTok" },
    { id: 730, name: "Acme Corp (Simulation)" },
    { id: 3, name: "Intellfence" },
    { id: 731, name: "NIS2 Demo Enterprise" },
    { id: 7, name: "Acme Enterprise Corp" }
  ];

  const availableClientsList = (Array.isArray(clientsData) && clientsData.length > 0)
    ? clientsData
    : DEFAULT_FALLBACK_CLIENTS;

  const effectiveSentinelClientId = persistentClientId || (availableClientsList?.[0]?.id as number) || 1;
  const { data: sentinelStats } = trpc.sentinel.getStats.useQuery(
    { clientId: effectiveSentinelClientId },
    {
      enabled: !!effectiveSentinelClientId,
      refetchInterval: 15000,
    }
  );
  const pendingSentinelCount = sentinelStats?.totalPending ?? 0;

  useEffect(() => {
    if (clientError && clientError.data?.code === 'FORBIDDEN' && isClientSpecificPage) {
      // Clear invalid client ID
      console.warn("Access denied for client ID", persistentClientId, "Clearing context.");
      clearSelectedClient();

      // Instead of auto-redirecting (which causes loops), just show a toast or let the user navigate
      // If we really must redirect, do it only if we are deep in a client route
      // But for now, let's stop the loop.
      if (location !== '/dashboard') {
        // toast.error("Access denied to this workspace. Redirecting to dashboard...");
        // setTimeout(() => setLocation('/dashboard'), 1000);
        // For now, FORCE redirect only if we are sure it won't loop
        setLocation('/dashboard');
      }
    }
  }, [clientError, persistentClientId, setLocation, isClientSpecificPage, location, clearSelectedClient]);

  // Sync planTier to ClientContext so pages can use it
  const { setPlanTier } = useClientContext();
  useEffect(() => {
    if (clientInfo && isClientSpecificPage) {
      // Avoid infinite loops by checking equality if possible, though React state setter handles primitives well
      setPlanTier(clientInfo.planTier);
    }
  }, [clientInfo, setPlanTier, isClientSpecificPage]);

  const finalSidebarBg = clientInfo?.sidebarBg || clientInfo?.brandSecondaryColor || sidebarBg;
  const finalSidebarFg = getContrastColor(finalSidebarBg);
  const finalPrimary = clientInfo?.brandPrimaryColor || primaryColor;

  const brandStyles: CSSProperties = {
    "--sidebar": finalSidebarBg,
    "--sidebar-background": finalSidebarBg, // Compatibility with glass-sidebar
    "--sidebar-foreground": finalSidebarFg,
    "--sidebar-primary": finalPrimary,
    "--sidebar-primary-foreground": getContrastColor(finalPrimary),
    "--sidebar-accent": finalSidebarFg === '#ffffff' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    "--sidebar-accent-foreground": finalSidebarFg,
    "--sidebar-border": finalSidebarFg === '#ffffff' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    "--sidebar-ring": finalPrimary,
  } as CSSProperties;

  const highlightMatch = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-blue-500/30 text-white rounded-sm px-0.5 border-b border-blue-400">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const { data: dbUser, isLoading: isUserLoading, refetch: refetchUser } = trpc.users.me.useQuery(undefined, {
    enabled: !!user,
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 5000)
  });

  // Redirect to payment completion if user has a paid tier but no active subscription
  const syncSubscription = trpc.billing.syncSubscriptionStatus.useMutation();

  // Fetch installed plugins for the current client
  const { data: installedPlugins } = trpc.plugins.listInstalled.useQuery(undefined, {
    enabled: !!persistentClientId
  });

  // Fetch active addon subscriptions for sidebar navigation
  const { data: addonSubscriptions } = trpc.addons.listMySubscriptions.useQuery(undefined);

  // Redirect to payment completion if user has a paid tier but no active subscription
  useEffect(() => {
    // Check for payment_success param
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      const graceExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes grace
      try {
        localStorage.setItem('payment_grace_period', graceExpiry.toString());
        // Optional: Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('payment_success');
        window.history.replaceState({}, '', newUrl.toString());
      } catch (e) { /* ignore storage errors */ }
    }

    // Check validity of grace period
    let inGracePeriod = false;
    try {
      const storedGrace = localStorage.getItem('payment_grace_period');
      if (storedGrace && parseInt(storedGrace) > Date.now()) {
        inGracePeriod = true;
      } else {
        localStorage.removeItem('payment_grace_period');
      }
    } catch (e) { /* ignore */ }

    const checkAndRedirect = async () => {
      // Robust check to stop loops if we are already on the page
      if (
        location.includes('/complete-subscription') ||
        window.location.pathname.includes('/complete-subscription')
      ) return;

      // Defensive: dbUser must exist and have required fields
      if (isUserLoading) return;

      if (!dbUser) {
        // If we have a Supabase user but no DB user, and not loading, we might involve a sync
        console.warn('[Subscription] No dbUser found after loading. User object:', user?.id);
        // Force a refetch after a short delay if this happens - could be a sync race
        setTimeout(() => refetchUser(), 2000);
        return;
      }

      // Grace period check
      if (inGracePeriod) return;

      // Handle missing or null planTier - default to 'free' for safety
      const planTier = dbUser.planTier || 'free';
      if (planTier === 'free' || planTier === 'enterprise') return;

      // Handle missing or null subscriptionStatus - treat null/undefined as active for development
      const subscriptionStatus = dbUser.subscriptionStatus;
      if (!subscriptionStatus || subscriptionStatus === 'none' || subscriptionStatus === 'past_due') {
        // For development, if no subscription status, sync with Stripe
        console.log('[Subscription] No subscription status, attempting sync...');
      } else if (['active', 'trialing'].includes(subscriptionStatus)) {
        return; // Already active
      }

      // Check if we already attempted to sync this session to avoid loops/delays
      const hasSynced = sessionStorage.getItem('has_synced_subscription');
      if (hasSynced) {
        console.log("Subscription sync already attempted this session.");
        // Only redirect if NOT already there (double check) and if status is clearly invalid
        if (!window.location.pathname.includes('/complete-subscription') &&
          subscriptionStatus &&
          !['active', 'trialing'].includes(subscriptionStatus)) {
          window.location.href = '/complete-subscription';
        }
        return;
      }

      // At this point, local status might be invalid. Try to self-heal.
      console.log("Subscription status potentially invalid ('" + subscriptionStatus + "'). Attempting to sync with Stripe...");

      try {
        // Mark as synced so we don't spam the server
        sessionStorage.setItem('has_synced_subscription', 'true');

        const result = await syncSubscription.mutateAsync();
        console.log("Sync result:", result);
        if (['active', 'trialing'].includes(result.status || '')) {
          console.log("Sync successful, subscription is active. Refreshing page...");
          window.location.reload();
          return;
        }
      } catch (err) {
        console.error("Failed to sync subscription:", err);
      }

      // If we are here and status is clearly invalid, redirect
      if (subscriptionStatus && !['active', 'trialing'].includes(subscriptionStatus)) {
        console.warn("Redirecting to complete-subscription due to invalid status:", subscriptionStatus);
        if (!window.location.pathname.includes('/complete-subscription')) {
          window.location.href = '/complete-subscription';
        }
      }
    };

    checkAndRedirect();
  }, [dbUser, location, isUserLoading, user, syncSubscription, refetchUser]);

  // Robust role check: use DB user if available, otherwise fall back to auth metadata
  const userRole = dbUser?.role || user?.user_metadata?.role || user?.app_metadata?.role;
  const adminRoles = ['admin', 'owner', 'super_admin', 'super', 'enterprise_admin', 'ent_admin'];
  const isAdminOrOwner = adminRoles.includes(userRole) || ['owner', 'admin'].includes(clientRole);


  // Group Definition
  const groups = [
    {
      label: "Platform & Overview",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        {
          icon: Inbox,
          label: "Action Center",
          path: persistentClientId ? `/action-center?clientId=${persistentClientId}` : "/action-center",
          badge: pendingSentinelCount > 0 ? `${pendingSentinelCount}` : undefined,
        },
        { icon: Bot, label: "Agent", path: "/agent" },
        { icon: Users, label: "Clients", path: "/clients" },
        { icon: Settings, label: "Settings", path: "/settings" },
        { icon: Sparkles, label: "License & Plans", path: "/settings/license" },
        ...(isAdminOrOwner && persistentClientId ? [{ icon: Palette, label: "Branding", path: "/settings?tab=branding" }] : []),
        { icon: GraduationCap, label: "User Onboarding", path: "/onboarding" },
      ]
    },
    {
      label: "Start Here & Roadmaps",
      items: [
        { icon: Rocket, label: "Start Here Launchpad", path: "/start-here" },
        { icon: Target, label: "Strategic Roadmaps", path: "/start-here" },
        ...(persistentClientId ? [
          {
            icon: Compass,
            label: "Framework Program Guides",
            path: `/clients/${persistentClientId}/iso27001/program-guide`,
            submenu: [
              { label: "ISO 27001 ISMS Guide", path: `/clients/${persistentClientId}/iso27001/program-guide` },
              { label: "SOC 2 Type II Guide", path: `/clients/${persistentClientId}/soc2/program-guide` },
              { label: "HIPAA Compliance Guide", path: `/clients/${persistentClientId}/hipaa/program-guide` },
              { label: "NIS2 & Cyber Resilience Guide", path: `/clients/${persistentClientId}/cyber/program-guide` },
              { label: "GDPR & Privacy Guide", path: `/clients/${persistentClientId}/privacy/program-guide` },
              { label: "Business Continuity (BCP) Guide", path: `/clients/${persistentClientId}/business-continuity/program-guide` },
              { label: "Vendor Risk (TPRM) Guide", path: `/clients/${persistentClientId}/vendors/program-guide` },
              { label: "Enterprise Risk (ERM) Guide", path: `/clients/${persistentClientId}/risks/program-guide` },
              { label: "Federal & CMMC Guide", path: `/clients/${persistentClientId}/federal/program-guide` },
            ]
          }
        ] : []),
        { icon: Calendar, label: "Implementation Plans", path: "/implementation/dashboard" },
        { icon: BookOpen, label: "Roadmap Templates", path: "/roadmap/templates" },
      ]
    },
    {
      label: "Libraries & Knowledge",
      items: [
        { icon: Shield, label: "Global Control Library", path: "/controls" },
        { icon: GitBranch, label: "Harmonization", path: "/harmonization" },
        ...(persistentClientId ? [
          { icon: Scale, label: "Compliance Obligations", path: `/clients/${persistentClientId}/compliance-obligations` },
        ] : []),
        { icon: BookOpen, label: "Compliance Guides", path: "/guides" },
      ]
    },
  ];

  // In Client Mode: Inject client-scoped framework sections
  if (persistentClientId) {
    const platformGroup = groups.find((g) => g.label === "Platform & Overview");
    if (platformGroup) {
      platformGroup.items.push({ icon: Zap, label: "Workflows", path: "/workflows" });
    }

    groups.push(
      {
        label: "Compliance Journey",
        items: [
          { icon: Compass, label: "Overview", path: `/clients/${persistentClientId}/compliance-journey` },
          { icon: BookOpen, label: "SOC 2 Program Guide & Roadmap", path: `/clients/${persistentClientId}/soc2/program-guide` },
          { icon: HeartPulse, label: "HIPAA Program Guide & Roadmap", path: `/clients/${persistentClientId}/hipaa/program-guide` },
          {
            icon: Star,
            label: "Discovery & Scoping",
            path: `/clients/${persistentClientId}/readiness/wizard`,
            submenu: [
              { label: "ISO 27001", path: `/clients/${persistentClientId}/readiness/wizard/ISO27001` },
              { label: "SOC 2", path: `/clients/${persistentClientId}/readiness/wizard/SOC2` },
              { label: "NIST CSF", path: `/clients/${persistentClientId}/readiness/wizard/NISTCSF` },
              { label: "HIPAA", path: `/clients/${persistentClientId}/readiness/wizard/HIPAA` },
              { label: "GDPR", path: `/clients/${persistentClientId}/readiness/wizard/GDPR` },
            ]
          },
          { icon: ClipboardCheck, label: "Evidence Collection", path: "/evidence" },
          { icon: Briefcase, label: "Audit Preparation", path: "/audit-hub" },
        ]
      },
      {
        label: "ISO 27001 ISMS",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/iso27001" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/iso27001/program-guide` },
          { icon: ShieldCheck, label: "Organization Context", path: "/iso27001/governance" },
          { icon: ClipboardList, label: "Statement of Applicability", path: "/iso27001/soa" },
          { icon: AlertTriangle, label: "Risk Management", path: "/iso27001/risks" },
          { icon: Database, label: "Asset Register", path: "/iso27001/assets" },
        ]
      },

      {
        label: "Governance",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/governance", isPremium: true } as any,
          { icon: Shield, label: "Controls", path: "/client-controls" },
          { icon: UserCheck, label: "Access Reviews", path: "/access-reviews" },
          { icon: Webhook, label: "Webhooks", path: "/webhooks" },
          { icon: ListTodo, label: "Workbench", path: "/governance/workbench", isPremium: true } as any,
          {
            icon: Target,
            label: "Strategic Roadmaps",
            path: "/start-here",
            submenu: [
              { label: "Command Center", path: "/start-here" },
              { label: "Implementation Plans", path: "/implementation/dashboard" },
              { label: "Roadmap Templates", path: "/roadmap/templates" }
            ]
          },
          {
            icon: FileText,
            label: "Policies",
            path: "/client-policies",
            submenu: [
              { label: "View All Policies", path: "/client-policies" },
              { label: "Policy Templates", path: "/policy-templates" },
            ]
          },
          { icon: Users, label: "People & Org", path: "/people" },
          { icon: FileBarChart, label: "RACI Matrix", path: "/raci-matrix" },
          { icon: Palette, label: "Client Branding", path: "/settings?tab=branding" },
        ]
      },
      {
        label: "Risk Management",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/risks" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/risks/program-guide` },
          { icon: LayoutGrid, label: "Risk Framework", path: "/risks/framework" },
          { icon: ClipboardCheck, label: "Risk Assessments", path: "/risks/assessments" },
          { icon: Compass, label: "Guided Assessment", path: "/risks/guided" },
          { icon: ListTodo, label: "Risk Register", path: "/risks/register" },
          { icon: Database, label: "Assets", path: "/risks/assets" },
          { icon: AlertTriangle, label: "Threats", path: "/risks/threats" },
          { icon: Bug, label: "Vulnerabilities", path: "/risks/vulnerabilities" },
          { icon: ShieldCheck, label: "Treatment Plan", path: "/risks/treatment-plan" },
          { icon: BookOpen, label: "Alignment Guide", path: "/risks/alignment-guide" },
          { icon: FileText, label: "Risk Reports", path: "/risks/report" },
          // Premium: Adversary Intelligence (conditionally added below)
        ]
      }
    );

    // Premium Feature: Threat Intelligence
    const isPremiumClient = (clientInfo?.planTier === 'pro' || clientInfo?.planTier === 'enterprise') && import.meta.env.VITE_ENABLE_PREMIUM !== 'false';
    if (isPremiumClient) {
      groups.push({
        label: "Threat Intelligence",
        items: [
          { icon: Radar, label: "Adversary Intelligence", path: `/clients/${persistentClientId}/risks/adversary-intel`, isPremium: true } as any,
          { icon: ShieldAlert, label: "Vulnerability Workbench", path: `/clients/${persistentClientId}/risks/vulnerability-workbench`, isPremium: true } as any
        ]
      });
    }

    // Premium Feature: Vendor Management
    // Show when a client is selected (premium check happens at route level)
    const enabledInBuild = import.meta.env.VITE_ENABLE_PREMIUM !== 'false';
    const { isPremiumStatus } = useClientContext();
    const isPremium = isPremiumStatus && enabledInBuild;



    groups.push({
      label: "Autonomous AI Agents",
      items: [
        {
          icon: Bot,
          label: "Agent Command Center",
          path: "/agent",
          submenu: [
            { label: "Multi-Agent Cockpit", path: "/agent" },
            { label: "Sentinel & Action Inbox", path: "/agent?tab=sentinel" },
            { label: "Fleet Directory", path: "/agent?tab=teammates" },
            { label: "Approval Inbox", path: "/agent?tab=approvals" },
            { label: "Scheduled Routines", path: "/agent?tab=routines" },
            { label: "Memory Cortex (VFS)", path: "/agent?tab=memory" },
          ]
        },
        { icon: Brain, label: "AI Governance", path: "/ai-governance", isPremium: true },
        { icon: Shield, label: "Security Projects", path: "/projects" },
        { icon: Code, label: "Threat Modeling", path: "/dev/projects", isPremium: true },
      ]
    });


    // Always show Vendor Management when a client is selected
    if (persistentClientId) {
      groups.push({
        label: "Vendor Management",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/vendors/overview" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/vendors/program-guide` },
          { icon: Building2, label: "All Vendors", path: "/vendors/all" },
          { icon: Search, label: "Discovery", path: "/vendors/discovery" },
          { icon: FileText, label: "Contract Templates", path: "/vendors/contracts" },
          { icon: ClipboardList, label: "Questionnaires", path: "/questionnaires" },
          { icon: Target, label: "Assessment Templates", path: "/vendors/templates" },
        ]
      });
    }

    groups.push(
      {
        label: "Control Frameworks",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/compliance" },
          { icon: BookOpen, label: "Knowledge Base", path: "/knowledge-base" },
          { icon: GraduationCap, label: "Guides", path: "/guides" },
          { icon: Link, label: "Mappings", path: "/mappings" },
        ]
      }
    );

    if (isPremium) {
      groups.push({
        label: "Federal Compliance",
        items: [
          { icon: Building2, label: "Overview", path: "/federal" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/federal/program-guide` },
          { icon: FileText, label: "Contract Tracker", path: "/federal/contracts" },
          { icon: Cloud, label: "FedRAMP Packages", path: "/federal/fedramp" },
          { icon: ShieldCheck, label: "NIST 800-53 Rev 5", path: "/federal/800-53" },
          { icon: ClipboardList, label: "FISMA Reporting", path: "/federal/fisma" },
          { icon: AlertTriangle, label: "Non-Compliance Gap Report", path: "/federal/gap-report" },
          { icon: GitBranch, label: "RMF Workflow", path: "/federal/rmf" },
          { icon: Target, label: "DFARS/SPRS Scoring", path: "/federal/dfars" },
          { icon: Server, label: "DISA STIG Checklists", path: "/federal/stigs" },
          { icon: Key, label: "FIPS 140 Cryptography", path: "/federal/fips-140" },
          { icon: Lock, label: "FIPS 199 Categorization", path: "/federal/fips-199" },
          { icon: FileText, label: "SSP (NIST 800-171)", path: "/federal/ssp-171" },
          { icon: Shield, label: "SSP (NIST 800-172)", path: "/federal/ssp-172" },
          { icon: ClipboardList, label: "SAR Report", path: "/federal/sar" },
          { icon: Zap, label: "POA&M (NIST 171)", path: "/federal/poam" },
        ]
      });
    }

    groups.push(
      {
        label: "Business Continuity",
        items: [
          { icon: Activity, label: "Overview", path: "/business-continuity" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/business-continuity/program-guide` },
          { icon: Database, label: "Business Processes", path: "/business-continuity/processes" },
          { icon: Shield, label: "Strategies", path: "/business-continuity/strategies" },
          { icon: ClipboardList, label: "Plans", path: "/business-continuity/plans" },
          { icon: AlertTriangle, label: "Scenarios", path: "/business-continuity/scenarios" },
          { icon: Users, label: "Call Tree", path: "/business-continuity/call-tree" },
          { icon: ListTodo, label: "Tasks", path: "/business-continuity/tasks" },
        ]
      },
      {
        label: "Privacy",
        items: [
          { icon: Lock, label: "Overview", path: "/privacy" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/privacy/program-guide` },
          { icon: Database, label: "Data Inventory", path: "/privacy/inventory" },
          { icon: FileText, label: "ROPA", path: "/privacy/ropa" },
          { icon: ShieldAlert, label: "Data Breaches", path: "/privacy/breaches" },
          { icon: Globe, label: "International Transfers", path: "/privacy/transfers" },
          { icon: Users, label: "DSAR Manager", path: "/privacy/dsar" },
          { icon: FileText, label: "DPA Templates", path: "/vendors/dpa-templates" },
        ]
      },
      {
        label: "NIS2 & Cyber Resilience",
        items: [
          { icon: ShieldCheck, label: "Overview", path: "/cyber" },
          { icon: Compass, label: "Program Guide & Roadmap", path: `/clients/${persistentClientId}/cyber/program-guide` },
          { icon: Building2, label: "Cyber Resilience Hub", path: `/clients/${persistentClientId}/nis2` },
          { icon: Shield, label: "Security Measures", path: `/clients/${persistentClientId}/nis2/security-measures` },
          { icon: AlertTriangle, label: "Incident Reporting", path: `/clients/${persistentClientId}/nis2/incident-reporting` },
          { icon: Building2, label: "Entity Registry", path: `/clients/${persistentClientId}/nis2/entity-registry` },
          { icon: Zap, label: "Supply Chain", path: `/clients/${persistentClientId}/nis2/supply-chain` },
          { icon: Globe, label: "Cross-Border", path: `/clients/${persistentClientId}/nis2/cross-border` },
          { icon: Users, label: "Management Oversight", path: `/clients/${persistentClientId}/nis2/management-liability` },
          { icon: FileText, label: "Audit Bundle", path: `/clients/${persistentClientId}/nis2/audit-bundle` },
          { icon: Activity, label: "Incidents", path: "/cyber/incidents" },
          { icon: FileText, label: "Documents", path: "/cyber/documents" },
        ]
      },
      {
        label: "Reporting & Assurance",
        items: [
          ...(clientInfo?.serviceModel === 'managed' && enabledInBuild ? [{ icon: Inbox, label: "Evidence Intake Box", path: "/intake" }] : []),
          { icon: LayoutDashboard, label: "Board Summary", path: "/board-summary" },
          { icon: ClipboardCheck, label: "Evidence Collection", path: "/evidence" },
          { icon: Zap, label: "Supply Chain (SCVS)", path: "/assurance/scvs" },
          { icon: ShieldCheck, label: "OpenSSF Hygiene", path: "/assurance/openssf" },
          { icon: Radar, label: "Mobile App Sec", path: "/assurance/masvs" },
        ]
      },
      {
        label: "Audit Hub",
        items: [
          { icon: ShieldCheck, label: "Audit Manager", path: `/clients/${persistentClientId}/audit-manager` },
          { icon: Briefcase, label: "Audit Preparation", path: `/clients/${persistentClientId}/audit-hub` },
        ]
      },
      {
        label: "Management",
        items: [
          { icon: FileBarChart, label: "Metrics", path: "/metrics" },
          { icon: FileBarChart, label: "Reports", path: "/reports" },
          { icon: Calendar, label: "Calendar", path: "/calendar" },
          { icon: ListTodo, label: "Tasks", path: "/tasks" },
          { icon: MessageSquare, label: "Communication", path: "/communication" },
          {
            icon: Settings, label: "Client Settings", submenu: [
              { label: "Security", path: "/settings/security" },
              // Plugins hidden from navigation (page still reachable by URL)
              { label: "User Onboarding", path: "/settings/onboarding" },
              { label: "Users", path: "/settings/users" },
              { label: "Organization", path: "/settings/organization" },
              { label: "Branding", path: "/settings?tab=branding" },
              { label: "Invitations", path: "/settings/invitations" },
              { label: "Integrations", path: "/settings/integrations" },
              { label: "Backup / Restore", path: "/settings?tab=backup-restore" },
            ]
          },
          ...(isAdminOrOwner ? [{ icon: GraduationCap, label: "Personnel Compliance", path: "/personnel-compliance" }] : []),
        ]
      },
      {
        label: "Marketing",
        items: [
          { icon: Megaphone, label: "CRM Dashboard", path: "/sales", isPremium: true } as any,
        ]
      }
    );

    // Addon menu and sub menus hidden for now
    // const activeAddons = (addonSubscriptions || []).filter(
    //   (s: any) => s.status === 'active' || s.status === 'trial'
    // );
    // groups.push({
    //   label: "Addons",
    //   items: [
    //     { icon: ShoppingBag, label: "Marketplace", path: "/addons" },
    //     ...activeAddons.map((sub: any) => ({
    //       icon: Cloud,
    //       label: sub.manifest?.name || sub.addon_slug,
    //       path: `/addons/${sub.addon_slug}`,
    //     })),
    //   ]
    // });

    // Add dynamic plugin groups if any are enabled
    if (installedPlugins && installedPlugins.length > 0) {
      const enabledPlugins = installedPlugins.filter(p => p.enabled);

      if (enabledPlugins.length > 0) {
        groups.push({
          label: "App Extensions",
          items: enabledPlugins.map(plugin => {
            // Mapping specific plugins to icons for demo
            let icon = ShoppingBag;
            if (plugin.id === 'cos-risk-game') icon = Gamepad2;

            return {
              icon,
              label: plugin.name,
              path: `/plugins/${plugin.slug}`,
              // Manifests might define where they go, for now we map them here
            };
          })
        });
      }
    }
  }


  if (isAdminOrOwner) {
    groups.push({
      label: "Administration",
      items: [
        adminMenuItem,
        { icon: Sparkles, label: "Advisor Workbench", path: "/advisor/workbench", isPremium: true } as any,
        { icon: History, label: "Activity Log", path: "/activity" },
      ]
    });
  }

  const filteredGroups = groups.map(group => {
    // If no search, return group as is
    if (!menuSearch) return group;

    // Filter items
    const filteredItems = group.items.map((item: any) => {
      // Check main item
      const matchMain = item.label.toLowerCase().includes(menuSearch.toLowerCase());

      // Check submenu
      const filteredSubmenu = item.submenu?.filter((sub: any) =>
        sub.label.toLowerCase().includes(menuSearch.toLowerCase())
      );

      if (matchMain) return item;
      if (filteredSubmenu && filteredSubmenu.length > 0) {
        return { ...item, submenu: filteredSubmenu };
      }
      return null;
    }).filter(Boolean);

    if (filteredItems.length > 0) {
      return { ...group, items: filteredItems };
    }
    return null;
  }).filter(Boolean);

  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';

  // Flatten to find best match active item (handling 1 level of nesting)
  // Note: we need to handle the structure of groups -> items -> potentially submenu
  const allItems = groups.flatMap(group =>
    group.items.flatMap((item: any) =>
      item.submenu ? [...item.submenu] : [item]  // skip pathless parents, keep submenu leaves + path-having parents
    )
  ).filter((item: any) => !!item.path);  // guard: skip items with no path

  const matchedItems = allItems.filter(item => {
    const navPath = resolveNavigationPath(item.path, persistentClientId);
    return isPathActive(navPath, location, currentSearch);
  });

  // Sort by specificity (path length), descending to find the "Best Match"
  matchedItems.sort((a, b) => {
    const pathA = resolveNavigationPath(a.path, persistentClientId);
    const pathB = resolveNavigationPath(b.path, persistentClientId);

    // If lengths are equal (e.g. parent link vs submenu link with same path),
    // Prefer the Leaf node (one without submenu) if possible, or maintain order.
    if (pathB.length === pathA.length) {
      if (!a.submenu && b.submenu) return -1; // a wins
      if (a.submenu && !b.submenu) return 1; // b wins
    }
    return pathB.length - pathA.length;
  });

  const bestMatchItem = matchedItems[0];
  const activeMenuItem = bestMatchItem;

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);


  return (
    <div style={brandStyles} className="contents">
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className={`border-r-0 ${finalSidebarBg === '#020617' || finalSidebarBg === '#000000' ? 'glass-sidebar' : ''}`}
          style={{ '--sidebar-background': finalSidebarBg } as CSSProperties}
          disableTransition={isResizing}
        >
          <SidebarHeader className="p-4 border-b border-white/5 bg-sidebar h-20 flex flex-col justify-center backdrop-blur-xl">
            <Dialog open={brandingOpen} onOpenChange={setBrandingOpen}>
              <DialogTrigger asChild>
                <div className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full flex items-center">
                  <BrandLogo className="origin-left" showText={!isCollapsed} />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Branding Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Application Name</Label>
                    <Input
                      value={appName}
                      onChange={(e) => updateBranding({ appName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex gap-4 items-start">
                      <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/20 overflow-hidden relative group">
                        {logoUrl ? (
                          <>
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            <button
                              onClick={() => updateBranding({ logoUrl: null })}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <Shield className="w-10 h-10 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Image
                        </Button>
                        <div className="text-xs text-muted-foreground mt-1">
                          <p>Supported: PNG, JPG, SVG</p>
                          <p>Max size: 2MB</p>
                          <p>Recommended: 512x512px transparent PNG</p>
                        </div>
                        <div className="text-xs text-muted-foreground pt-1 border-t border-muted/50 mt-1">
                          <span className="font-medium">Or use URL:</span>
                          <Input
                            value={logoUrl || ''}
                            onChange={(e) => updateBranding({ logoUrl: e.target.value || null })}
                            placeholder="https://..."
                            className="mt-1 h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label>Logo Size</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-8">50%</span>
                      <Slider
                        defaultValue={[logoSize]}
                        max={200}
                        min={50}
                        step={5}
                        onValueChange={(vals) => updateBranding({ logoSize: vals[0] })}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium w-8 text-right">{logoSize}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Sidebar Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={sidebarBg}
                          onChange={(e) => updateBranding({ sidebarBg: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={sidebarBg}
                          onChange={(e) => updateBranding({ sidebarBg: e.target.value })}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Heading Font</Label>
                      <select
                        value={headingFont}
                        onChange={(e) => updateBranding({ headingFont: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {CURATED_FONTS.map(font => (
                          <option key={font.name} value={font.name}>{font.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Body Font</Label>
                      <select
                        value={bodyFont}
                        onChange={(e) => updateBranding({ bodyFont: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {CURATED_FONTS.map(font => (
                          <option key={font.name} value={font.name}>{font.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Global Font Size</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-8">12px</span>
                      <Slider
                        defaultValue={[baseFontSize || 16]}
                        max={24}
                        min={12}
                        step={1}
                        onValueChange={(vals) => updateBranding({ baseFontSize: vals[0] })}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium w-8 text-right">{baseFontSize || 16}px</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={resetBranding}>Reset to Default</Button>
                    <Button onClick={() => setBrandingOpen(false)}>Done</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </SidebarHeader>


          <SidebarContent className="gap-2">
            {/* Client Context Indicator with Switcher */}
            {/* Client Context Indicator with Switcher */}
            {/* Client Context Indicator with Switcher */}
            {persistentClientId && (
              isCollapsed ? (
                <div className="flex flex-col items-center gap-2 py-6 border-b border-white/5 bg-sidebar">
                  <div
                    className="h-8 w-8 rounded-md bg-white/10 text-white flex items-center justify-center font-bold text-xs"
                    title={clientInfo?.portalTitle || clientInfo?.name || `Client #${persistentClientId}`}
                  >
                    {(clientInfo?.portalTitle || clientInfo?.name || "C")?.substring(0, 2).toUpperCase()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation('/clients')}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="px-5 py-6 border-b border-white/10 bg-sidebar">
                  <p className="text-[10px] font-bold text-[var(--sidebar-primary)] uppercase tracking-[0.15em] mb-2 opacity-80">Client Context</p>
                  <div className="flex flex-col gap-4">
                    <p className="text-xl font-bold text-white truncate leading-none">{clientInfo?.portalTitle || clientInfo?.name || `Client #${persistentClientId}`}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/clients')}
                      className="w-full h-9 text-xs bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-all justify-start px-3 font-medium rounded-md"
                    >
                      <LayoutGrid className="w-4 h-4 mr-3 opacity-60" />
                      Switch Organization
                    </Button>
                  </div>
                </div>
              )
            )}



            {/* Search Bar */}
            {!isCollapsed && (
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search menu..."
                    className="pl-8 h-9 text-xs bg-sidebar-accent/5"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                </div>
              </div>
            )}

            {filteredGroups.map((group, groupIndex) => (
              <CollapsibleGroup
                key={group.label || groupIndex}
                group={group}
                location={location}
                setLocation={setLocation}
                persistentClientId={persistentClientId}
                isCollapsed={isCollapsed}
                bestMatchItem={bestMatchItem}
                forceOpen={menuSearch.length > 0} // Expand groups when searching
                menuSearch={menuSearch}
                highlightMatch={highlightMatch}
              />
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-tour="user-menu"
                >
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "-"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.user_metadata?.full_name || user?.email || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation('/profile')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation('/settings/license')}
                  className="cursor-pointer"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  <span>License & Plans</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    // Use window.location.href to ensure a full refresh/clear of state
                    window.location.href = getLoginUrl();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="flex border-b border-border/80 h-14 items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-4 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background shadow-sm border border-border shrink-0" />}
            {returnContext && dismissedReturnUrl !== returnContext.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('cos_roadmap_return_nav');
                  setLocation(returnContext.url);
                }}
                className="h-8 gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white border-blue-500 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to {returnContext.label}</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-1 bg-primary rounded-full hidden md:block shrink-0" />
              <span className="tracking-tight text-foreground font-bold text-sm md:text-base truncate">
                {activeMenuItem?.label ?? "Dashboard"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Topbar Right-side Client Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 sm:px-3 gap-1.5 sm:gap-2 bg-card hover:bg-muted border-border text-foreground font-semibold text-xs rounded-lg shadow-sm"
                >
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="max-w-[120px] sm:max-w-[180px] truncate inline-block">
                    {clientInfo?.portalTitle || clientInfo?.name || (persistentClientId ? `Client #${persistentClientId}` : "Select Client")}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1 shadow-xl rounded-xl border border-border bg-popover z-50">
                <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  Switch Client Organization
                </div>
                {availableClientsList.map((c: any) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      if (location.startsWith('/action-center')) {
                        setLocation(`/action-center?clientId=${c.id}`);
                      } else if (location.includes('/clients/')) {
                        const newPath = location.replace(/\/clients\/\d+/, `/clients/${c.id}`);
                        setLocation(newPath);
                      } else {
                        setLocation(`/clients/${c.id}`);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      c.id === persistentClientId ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {c.id === persistentClientId && <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                  </DropdownMenuItem>
                ))}
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <DropdownMenuItem
                    onClick={() => setLocation('/clients')}
                    className="flex items-center justify-center p-2 text-xs font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 mr-2" />
                    All Clients Directory
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <GlobalSearch />
            {/* Language switcher: hidden pending full i18n page coverage */}
            {/* <LanguageSwitcher compact /> */}
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={() => setLocation(persistentClientId ? `/action-center?clientId=${persistentClientId}` : '/action-center')}
              className={`h-9 flex items-center gap-2 px-3 rounded-lg border transition-all cursor-pointer text-xs font-semibold shadow-xs shrink-0 ${
                pendingSentinelCount > 0
                  ? "bg-card hover:bg-accent border-rose-300 dark:border-rose-800/80 text-foreground ring-1 ring-rose-500/20"
                  : "bg-card hover:bg-muted border-border text-foreground"
              }`}
              title={pendingSentinelCount > 0 ? `${pendingSentinelCount} Autonomous Sentinel actions awaiting review in Action Center` : "Autonomous Sentinel AI Patrol Active"}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pendingSentinelCount > 0 ? "bg-rose-500" : "bg-emerald-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${pendingSentinelCount > 0 ? "bg-rose-600" : "bg-emerald-500"}`}></span>
              </span>
              <Bot className={`w-4 h-4 shrink-0 ${pendingSentinelCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-primary"}`} />
              <span className="hidden md:inline font-bold text-foreground">Action Center</span>
              {pendingSentinelCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs tracking-tight">
                  {pendingSentinelCount} pending
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              )}
            </button>
            <ExtensionSlot name="topbar.copilot-help" />
            <GlobalNotificationCenter />
          </div>
        </div>
        <div className={`flex-1 bg-background w-full max-w-full ${fullWidth ? "px-4 md:px-8 py-4" : "px-4 md:px-8 py-8"}`}>
          {returnContext && dismissedReturnUrl !== returnContext.url && (
            <div className="mb-6 bg-slate-900 text-white border border-slate-700/80 rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="text-white font-extrabold tracking-tight">Roadmap Navigation Active</span>
                    <span className="text-[10px] py-0.5 px-2.5 font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {returnContext.label}
                    </span>
                    {returnContext.taskTitle && (
                      <span className="text-[10px] py-0.5 px-2.5 font-bold rounded-full bg-slate-800 text-white border border-slate-600 truncate max-w-[280px]">
                        Task: {returnContext.taskTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate font-normal">
                    {returnContext.taskId
                      ? 'Complete the task on this page, then mark it done to return to your roadmap.'
                      : 'You opened this page from the 90-day roadmap. Complete your tasks here and return when ready.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                {returnContext.taskId && persistentClientId && returnContext.frameworkId && (
                  <Button
                    size="sm"
                    disabled={markingComplete}
                    onClick={() => {
                      setMarkingComplete(true);
                      toggleRoadmapTaskMutation.mutate({
                        clientId: persistentClientId as number,
                        frameworkId: returnContext.frameworkId!,
                        taskId: returnContext.taskId!,
                        completed: true,
                        taskTitle: returnContext.taskTitle,
                      });
                    }}
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md transition-colors"
                  >
                    {markingComplete ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {markingComplete ? 'Saving...' : '✓ Mark Complete & Return'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    sessionStorage.removeItem('cos_roadmap_return_nav');
                    setLocation(returnContext.url);
                  }}
                  className="h-8 text-xs font-bold gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border-slate-600 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {returnContext.taskId ? 'Return without Completing' : `Back to ${returnContext.label}`}
                </Button>
                <button
                  onClick={() => {
                    setDismissedReturnUrl(returnContext.url);
                  }}
                  className="h-7 w-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
                  title="Dismiss notice"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {children}
        </div>

        {/* AI Copilot Extension Slots - Decoupled from Core */}
        <ExtensionSlot name="global.copilot" props={{ clientId: persistentClientId || undefined }} />
        <ExtensionSlot name="global.copilot-panel" />
      </SidebarInset>
    </div>
  );
}

function CollapsibleGroup({
  group,
  location,
  setLocation,
  persistentClientId,
  isCollapsed,
  bestMatchItem,
  forceOpen,
  menuSearch,
  highlightMatch
}: {
  group: any,
  location: string,
  setLocation: any,
  persistentClientId: number | null,
  isCollapsed: boolean,
  bestMatchItem: any,
  forceOpen: boolean,
  menuSearch: string,
  highlightMatch: any
}) {
  const { t } = useTranslation(['navigation', 'common', 'compliance', 'risk', 'policy', 'vendors', 'settings', 'evidence']);
  const translatedGroupLabel = translateNavLabel(group.label, t);

  // Check if the current group contains the active menu item
  const containsActiveItem = group.items.some((item: any) => {
    if (item === bestMatchItem) return true;
    // Also check if active item is in a submenu of this group
    if (item.submenu) {
      return item.submenu.some((sub: any) => sub === bestMatchItem);
    }
    return false;
  });

  // Initialize open state based on whether group contains active item or is a primary group
  const isDefaultOpen = group.label === "Platform & Overview" || group.label === "Start Here & Roadmaps";
  const [isOpen, setIsOpen] = useState(forceOpen || containsActiveItem || isDefaultOpen);

  // Update open state when the active item changes (e.g., during navigation)
  useEffect(() => {
    if (forceOpen || containsActiveItem || isDefaultOpen) {
      setIsOpen(true);
    }
  }, [forceOpen, containsActiveItem, isDefaultOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup className="py-1">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full justify-start items-center text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors px-4 py-2 mt-4 overflow-hidden">
            <span className="truncate whitespace-nowrap flex-1">{highlightMatch(translatedGroupLabel, menuSearch)}</span>
            <ChevronRight className="ml-1 h-3 w-3 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90 opacity-40" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent className="mt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item: any, idx: number) => {
                const navigationPath = resolveNavigationPath(item.path, persistentClientId);
                const isActive = item === bestMatchItem;
                const translatedItemLabel = translateNavLabel(item.label, t);

                return (
                  <SidebarMenuItem key={`${item.path ?? item.label ?? 'item'}-${idx}`}>
                    {!item.submenu ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(navigationPath)}
                        tooltip={translatedItemLabel}
                        className={`h-11 px-3 transition-all font-medium rounded-lg mb-1 mx-2 w-[calc(100%-16px)] ${isActive
                          ? "bg-[var(--sidebar-primary)] text-white hover:bg-[var(--sidebar-primary)] hover:text-white shadow-[0_4px_12px_rgba(0,163,255,0.3)]"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                      >
                        <item.icon
                          className={`h-4.5 w-4.5 min-w-[1.125rem] ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                        />
                        <span className="ml-2 uppercase text-[11px] tracking-wide flex-1 truncate">{highlightMatch(translatedItemLabel, menuSearch)}</span>
                        {item.badge && (
                          <Badge className="ml-auto bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0 text-[9px] font-bold">
                            {item.badge}
                          </Badge>
                        )}
                        {item.isPremium && (
                          <Badge className="ml-auto bg-blue-500/20 text-blue-400 border-none px-1.5 py-0 text-[8px] font-bold uppercase tracking-tight">
                            Pro
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    ) : (
                      <CollapsibleMenuItem
                        item={item}
                        location={location}
                        setLocation={setLocation}
                        isCollapsed={isCollapsed}
                        currentSearch={menuSearch}
                        cid={persistentClientId}
                        bestMatchItem={bestMatchItem}
                        highlightMatch={highlightMatch}
                      />
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function CollapsibleMenuItem({
  item,
  location,
  setLocation,
  isCollapsed,
  currentSearch,
  cid,
  bestMatchItem,
  highlightMatch
}: {
  item: any,
  location: string,
  setLocation: any,
  isCollapsed: boolean,
  currentSearch: string,
  cid: number | null,
  bestMatchItem: any,
  highlightMatch: any
}) {
  const { t } = useTranslation(['navigation', 'common', 'compliance', 'risk', 'policy', 'vendors', 'settings', 'evidence']);
  const translatedItemLabel = translateNavLabel(item.label, t);
  const resolvedPath = resolveNavigationPath(item.path, cid);
  const isVisuallyActive = item === bestMatchItem;
  const isChildActive = item.submenu?.some((sub: any) => {
    const subPath = resolveNavigationPath(sub.path, cid);
    return isPathActive(subPath, location, currentSearch);
  });
  const shouldBeOpen = isPathActive(resolvedPath, location, currentSearch) || isChildActive;
  const [isOpen, setIsOpen] = useState(shouldBeOpen);

  useEffect(() => {
    if (shouldBeOpen) setIsOpen(true);
  }, [shouldBeOpen]);

  return (
    <div className="space-y-1">
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        tooltip={translatedItemLabel}
        isActive={isVisuallyActive}
        className={`h-11 px-3 transition-all font-medium rounded-lg mb-1 mx-2 w-[calc(100%-16px)] ${isVisuallyActive
          ? "bg-[var(--sidebar-primary)] text-white shadow-[0_4px_12px_rgba(0,163,255,0.3)]"
          : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <item.icon className={`h-4.5 w-4.5 min-w-[1.125rem] shrink-0 ${isVisuallyActive ? "text-white" : "text-slate-400"}`} />
          <span className="ml-2 uppercase text-[11px] tracking-wide truncate flex-1">{highlightMatch(translatedItemLabel, currentSearch)}</span>
        </div>
        {!isCollapsed && (
          <div className="ml-auto opacity-60">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>
        )}
      </SidebarMenuButton>

      {isOpen && !isCollapsed && (
        <div className="pl-4 space-y-1 mt-1 border-l ml-4">
          {item.submenu.map((subItem: any) => {
            const resolvedSubPath = resolveNavigationPath(subItem.path, cid);
            const isSubActive = subItem === bestMatchItem;
            const translatedSubLabel = translateNavLabel(subItem.label, t);

            return (
              <SidebarMenuButton
                key={subItem.path}
                isActive={isSubActive}
                onClick={() => setLocation(resolvedSubPath)}
                className={`h-9 px-3 transition-all font-medium rounded-lg mx-2 mb-0.5 w-[calc(100%-16px)] ${isSubActive
                  ? "bg-[var(--sidebar-primary)] text-white hover:bg-[var(--sidebar-primary)] hover:text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span className="ml-1 truncate text-[11px] uppercase tracking-wide">{highlightMatch(translatedSubLabel, currentSearch)}</span>
              </SidebarMenuButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
