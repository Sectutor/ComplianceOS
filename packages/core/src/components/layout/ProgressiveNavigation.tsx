// ProgressiveNavigation — Simplified sidebar shown during compliance journey
// When journey is incomplete, only shows relevant navigation items
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@complianceos/ui/ui/sidebar";
import { Progress } from "@complianceos/ui/ui/progress";
import { Avatar, AvatarFallback } from "@complianceos/ui/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Compass,
  Shield,
  FileText,
  ClipboardCheck,
  Settings,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/config/branding";
import { useSidebar } from "@complianceos/ui/ui/sidebar";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

type JourneyStep =
  | "welcome"
  | "select_framework"
  | "review_controls"
  | "assign_owners"
  | "connect_tools"
  | "add_evidence"
  | "invite_team"
  | "setup_complete";

const STEP_LABELS: Record<JourneyStep, string> = {
  welcome: "Welcome",
  select_framework: "Select Framework",
  review_controls: "Review Controls",
  assign_owners: "Assign Owners",
  connect_tools: "Connect Tools",
  add_evidence: "Add Evidence",
  invite_team: "Invite Team",
  setup_complete: "Complete",
};

const STEP_ICONS: Record<JourneyStep, React.ReactNode> = {
  welcome: <Sparkles className="h-4 w-4" />,
  select_framework: <Shield className="h-4 w-4" />,
  review_controls: <CheckCircle2 className="h-4 w-4" />,
  assign_owners: <Shield className="h-4 w-4" />,
  connect_tools: <Shield className="h-4 w-4" />,
  add_evidence: <ClipboardCheck className="h-4 w-4" />,
  invite_team: <Shield className="h-4 w-4" />,
  setup_complete: <PartyPopper className="h-4 w-4" />,
};

interface ProgressiveNavigationProps {
  clientId: number;
  onNavigate?: () => void;
}

export function ProgressiveNavigation({ clientId, onNavigate }: ProgressiveNavigationProps) {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { appName } = useBranding();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: journey, isLoading: journeyLoading } =
    trpc.complianceJourney.getState.useQuery({ clientId }, { enabled: !!clientId });
  const { data: progress } = trpc.complianceJourney.getProgress.useQuery(
    { clientId },
    { enabled: !!clientId && !!journey }
  );

  const navigate = (path: string) => {
    setLocation(path);
    if (onNavigate) onNavigate();
  };

  const currentStep = (journey?.currentStep || "welcome") as JourneyStep;
  const isComplete = journey?.onboardingStatus === "complete";

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="h-16 justify-center border-b">
          <div className="flex items-center gap-3 px-2 transition-all w-full">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="h-5 w-5 text-primary shrink-0" />
                <span className="font-semibold tracking-tight truncate text-sm">
                  ComplianceOS
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Progress section */}
          {progress && !isComplete && (
            <SidebarGroup>
              <SidebarGroupContent className="px-3 pt-3">
                {!isCollapsed && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Setup Progress</span>
                      <span className="font-medium">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Main navigation */}
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard — always visible */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === `/clients/${clientId}` || location === `/clients/${clientId}?tab=dashboard`}
                    onClick={() => navigate(`/clients/${clientId}`)}
                    tooltip="Dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Journey / Setup — always visible when not complete */}
                {!isComplete && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.includes("/journey")}
                      onClick={() => navigate(`/clients/${clientId}/journey`)}
                      tooltip="Setup Journey"
                    >
                      <Compass className="h-4 w-4" />
                      <span>Setup Journey</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Current step progress indicator */}
                {!isComplete && !isCollapsed && (
                  <SidebarMenuItem>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="text-xs text-muted-foreground">
                        Current: <strong className="text-foreground">{STEP_LABELS[currentStep]}</strong>
                      </span>
                    </div>
                  </SidebarMenuItem>
                )}

                {/* When complete, show full navigation */}
                {isComplete && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={location.includes("/client-controls") || location.includes("/controls")}
                        onClick={() => navigate(`/clients/${clientId}/controls`)}
                        tooltip="Controls"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Controls</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={location.includes("/policies")}
                        onClick={() => navigate(`/clients/${clientId}/policies`)}
                        tooltip="Policies"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Policies</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={location.includes("/evidence")}
                        onClick={() => navigate(`/clients/${clientId}/evidence`)}
                        tooltip="Evidence"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Evidence</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={location.includes("/settings")}
                        onClick={() => navigate(`/clients/${clientId}/settings`)}
                        tooltip="Settings"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Suggested next step */}
          {!isComplete && !isCollapsed && (
            <SidebarGroup>
              <SidebarGroupLabel>Next Step</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                        {STEP_ICONS[currentStep]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{STEP_LABELS[currentStep]}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Click "Setup Journey" to continue
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/clients/${clientId}/journey`)}
                      className="w-full flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline py-1"
                    >
                      Continue <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none">
                    {user?.email || "User"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  window.location.href = getLoginUrl();
                }}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
