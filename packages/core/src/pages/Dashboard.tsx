import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Users, Shield, FileText, CheckCircle2, ArrowRight, Plus, FolderOpen,
  TrendingUp, AlertCircle, AlertTriangle, Clock, BarChart3, PieChart, Activity, Target, Settings2, Sparkles, Building2, HardDrive,
  BrainCircuit, ChevronDown
} from "lucide-react";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { useLocation } from "wouter";
import { Badge } from "@complianceos/ui/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AnimatedMetricCard } from "@complianceos/ui/ui/AnimatedMetricCard";

// Helper to determine compliance status based on rate
function getComplianceStatus(rate: number) {
  if (rate >= 80) {
    return { label: 'SYSTEM OPTIMAL', pingColor: 'bg-emerald-400', dotColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
  }
  if (rate >= 50) {
    return { label: 'SYSTEM ACCEPTABLE', pingColor: 'bg-amber-400', dotColor: 'bg-amber-500', textColor: 'text-amber-500' };
  }
  return { label: 'CRITICAL POSTURE', pingColor: 'bg-rose-400', dotColor: 'bg-rose-500', textColor: 'text-rose-500' };
}

// Status indicator component with clear, readable logic
function StatusIndicator({ rate }: { rate: number }) {
  const status = getComplianceStatus(rate);
  
  return (
    <>
      <span className="flex h-2 w-2 relative">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.pingColor}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dotColor}`}></span>
      </span>
      <span className={`text-xs font-bold tracking-wider ${status.textColor}`}>
        {status.label}
      </span>
    </>
  );
}
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const COLORS = {
  implemented: "#22c55e",
  inProgress: "#3b82f6",
  notStarted: "#94a3b8",
  notApplicable: "#6b7280",
  approved: "#22c55e",
  review: "#f59e0b",
  draft: "#3b82f6",
  archived: "#6b7280",
  verified: "#22c55e",
  collected: "#3b82f6",
  pending: "#f59e0b",
  expired: "#ef4444",
};

const FRAMEWORK_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d",
  "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600"
];

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [framework, setFramework] = useState<string | undefined>();
  const [clientId, setClientId] = useState<string | undefined>();
  const [hasSeenOnboardingThisSession, setHasSeenOnboardingThisSession] = useState(false);
  const utils = trpc.useUtils();

  // Check for onboarding completion parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'complete') {
      // Force refresh data when returning from onboarding
      utils.clients.list.invalidate();
      utils.dashboard.enhanced.invalidate();
      // Clean up URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('onboarding');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [utils]);

  const { data: enhancedStats, isLoading: statsLoading } = trpc.dashboard.enhanced.useQuery({ framework, clientId }, {
    enabled: !!user
  });
  const { data: clients, isLoading: clientsLoading } = trpc.clients.list.useQuery(undefined, {
    enabled: !!user
  });
  const { data: complianceScores, isLoading: scoresLoading } = trpc.dashboard.complianceScores.useQuery(undefined, {
    enabled: !!user
  });
  const { data: overdueAssessments, isLoading: overdueLoading } = trpc.vendorAnalytics.getOverdueAssessments.useQuery(undefined, {
    enabled: !!user
  });
  const { data: insightsData } = trpc.dashboard.getInsights.useQuery({ clientId }, {
    enabled: !!user
  });
  const insights = Array.isArray(insightsData) ? insightsData : [];

  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; currentTarget: number } | null>(null);
  const [newTargetScore, setNewTargetScore] = useState(80);

  const setTargetMutation = trpc.clients.setTargetScore.useMutation({
    onSuccess: () => {
      toast.success(`Target score updated for ${selectedClient?.name}`);
      utils.dashboard.complianceScores.invalidate();
      setTargetDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update target: ${error.message}`);
    },
  });

  const sampleMutation = trpc.clients.createSampleData.useMutation({
    onSuccess: (client) => {
      toast.success("Magic Sample Data workspace created!");
      utils.clients.list.invalidate();
      utils.dashboard.enhanced.invalidate();
      setLocation(`/clients/${client.id}`);
    },
    onError: (error) => {
      toast.error(`Sample data creation failed: ${error.message}`);
    }
  });

  const handleSetTarget = (clientId: number, clientName: string, currentTarget: number) => {
    setSelectedClient({ id: clientId, name: clientName, currentTarget });
    setNewTargetScore(currentTarget);
    setTargetDialogOpen(true);
  };

  const handleSaveTarget = () => {
    if (selectedClient) {
      setTargetMutation.mutate({ clientId: selectedClient.id, targetScore: newTargetScore });
    }
  };

  // Prepare chart data with null safety
  const status = enhancedStats?.controlsByStatus || { implemented: 0, inProgress: 0, notStarted: 0, notApplicable: 0 };
  const pStatus = enhancedStats?.policiesByStatus || { approved: 0, review: 0, draft: 0, archived: 0 };
  const eStatus = enhancedStats?.evidenceByStatus || { verified: 0, collected: 0, pending: 0, expired: 0, notApplicable: 0 };
  const frameworkByName = enhancedStats?.controlsByFramework || {};
  const overview = enhancedStats?.overview || {
    totalClients: 0,
    totalControls: 0,
    totalPolicies: 0,
    totalEvidence: 0,
    totalLLMProviders: 0,
    controlsImplemented: 0,
    controlsInProgress: 0,
    controlsNotStarted: 0,
    totalRisks: 0,
    highRisks: 0,
    maxClients: 2,
    ownedClientsCount: 0
  };
  const clientsOverview = enhancedStats?.clientsOverview || [];
  const recentActivity = enhancedStats?.recentActivity || [];

  const controlStatusData = [
    { name: "Implemented", value: Number(status.implemented), color: COLORS.implemented },
    { name: "In Progress", value: Number(status.inProgress), color: COLORS.inProgress },
    { name: "Not Started", value: Number(status.notStarted), color: COLORS.notStarted },
    { name: "N/A", value: Number(status.notApplicable), color: COLORS.notApplicable },
  ].filter(d => d.value > 0);

  const policyStatusData = [
    { name: "Approved", value: Number(pStatus.approved), color: COLORS.approved },
    { name: "In Review", value: Number(pStatus.review), color: COLORS.review },
    { name: "Draft", value: Number(pStatus.draft), color: COLORS.draft },
    { name: "Archived", value: Number(pStatus.archived), color: COLORS.archived },
  ].filter(d => d.value > 0);

  const evidenceStatusData = [
    { name: "Verified", value: Number(eStatus.verified), color: COLORS.verified },
    { name: "Collected", value: Number(eStatus.collected), color: COLORS.collected },
    { name: "Pending", value: Number(eStatus.pending), color: COLORS.pending },
    { name: "Expired", value: Number(eStatus.expired), color: COLORS.expired },
    { name: "N/A", value: Number(eStatus.notApplicable), color: COLORS.notApplicable },
  ].filter(d => d.value > 0);

  const frameworkData = Object.entries(frameworkByName).map(([name, count]) => ({
    name,
    count: count as number
  }));

  // Calculate overall compliance rate
  const totalControlsAssigned = (status.implemented || 0) +
    (status.inProgress || 0) +
    (status.notStarted || 0);
  const overallComplianceRate = totalControlsAssigned > 0 ?
    Math.round(((status.implemented || 0) / totalControlsAssigned) * 100) : 0;

  // Show onboarding only if: no clients, not loading, and hasn't been shown this session
  const shouldShowOnboarding = !statsLoading && !clientsLoading && clients && clients.length === 0 && !hasSeenOnboardingThisSession;

  // Show loading state when transitioning from onboarding to dashboard
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mark that we've seen onboarding this session when conditions are met
  useEffect(() => {
    if (shouldShowOnboarding) {
      setHasSeenOnboardingThisSession(true);
    }
  }, [shouldShowOnboarding]);

  // Handle transition state when clients are being loaded after onboarding
  useEffect(() => {
    if (hasSeenOnboardingThisSession && clientsLoading) {
      setIsTransitioning(true);
    } else if (isTransitioning && !clientsLoading) {
      setIsTransitioning(false);
    }
  }, [hasSeenOnboardingThisSession, clientsLoading, isTransitioning]);

  if (shouldShowOnboarding || isTransitioning) {
    return (
      <DashboardLayout>
        {shouldShowOnboarding && <OnboardingWizard />}
        {isTransitioning && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading your workspace...</p>
            </div>
          </div>
        )}
        {shouldShowOnboarding && (
          <div className="max-w-4xl mx-auto space-y-8 mt-12 px-4">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-2">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">Set up your Compliance OS</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Follow our guided path to get audit-ready in record time. Complete these steps to activate your live compliance reports.
              </p>
            </div>

            <OnboardingChecklist stats={enhancedStats} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
              <Card className="bg-slate-100 border-none shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Auto-Policies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">Get 20+ policies tailored to your industry instantly using our AI policy engine.</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-100 border-none shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    Unified Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">Map one master control to multiple frameworks like ISO 27001 and SOC 2 seamlessly.</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-100 border-none shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Live Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">Connect your cloud stack to automate evidence collection and get real-time readiness scores.</p>
                </CardContent>
              </Card>
            </div>

            <div className="pt-8 flex flex-col items-center gap-4">
              <Button
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-bold shadow-lg shadow-indigo-200 animate-pulse"
                onClick={() => sampleMutation.mutate({ name: "DEMO Organization", industry: "Technology" })}
                disabled={sampleMutation.isPending}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {sampleMutation.isPending ? "Generating Magic..." : "Explore with Demo Data"}
              </Button>

              <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => setLocation('/learning')}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Not ready yet? Explore the Learning Zone
              </Button>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }

  return (

    <DashboardLayout>
      <OnboardingWizard />
      <div className="relative min-h-[calc(100vh-3.5rem)] -mx-4 -my-8 px-4 py-8 md:-mx-20 md:-mt-8 md:pl-20 md:pr-28 bg-slate-50/50 text-slate-900 overflow-hidden page-transition">
        {/* Ambient Light Mode Background Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-purple-500/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"></div>
        </div>
        <div className="relative z-10 space-y-8">
          <Breadcrumb
            items={[
              { label: "Dashboard" },
            ]}
          />


          {/* Animated Welcome & AI Command Center */}
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-between relative z-10 w-full pt-4">
            <div className="flex-1 w-full space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Commander'}.
                </h1>
                <p className="text-slate-600 font-medium mt-2 text-lg">
                  Your compliance posture is active and scanning. Here is your daily briefing.
                </p>
              </motion.div>

              {/* AI Action Briefing */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-sm shadow-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent group-hover:from-blue-500/20 transition-all duration-700 pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Posture Insights</h3>
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">Scanning Live</Badge>
                </div>

                <div className="space-y-4 relative z-10 mt-6">
                  {insights.length > 0 ? insights.slice(0, 3).map((insight: any) => (
                    <div key={insight.id} className="flex gap-4 p-4 rounded-2xl bg-slate-100 border border-white/60 hover:bg-white/10 hover:border-white/20 transition-all group/item">
                      <div className="mt-0.5">
                        {insight.type === 'critical' ? <AlertCircle className="h-5 w-5 text-red-400" /> :
                          insight.type === 'warning' ? <Clock className="h-5 w-5 text-amber-400" /> :
                            insight.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-blue-400" /> :
                              <Sparkles className="h-5 w-5 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 font-bold text-sm truncate">{insight.title}</h4>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed truncate">{insight.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase tracking-wider font-bold text-slate-900/70 hover:text-slate-900 bg-slate-100 hover:bg-white/20 ml-2" onClick={() => setLocation(insight.link)}>
                        {insight.action} <ArrowRight className="h-3 w-3 ml-2 opacity-50 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                      </Button>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-slate-500">
                      <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3 opacity-50" />
                      <p>No critical actions required today. You are fully aligned.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="w-full lg:w-96 shrink-0"
            >
              {/* Real-time Posture Score */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-sm rounded-3xl p-8 relative overflow-hidden group shadow-2xl h-full flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />

                <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-6 relative z-10">Live Posture Score</h3>

                <div className="relative z-10">
                  <CircularProgress
                    value={overallComplianceRate}
                    size={220}
                    strokeWidth={16}
                    showValue={true}
                    color={overallComplianceRate >= 80 ? '#10b981' : overallComplianceRate >= 50 ? '#f59e0b' : '#ef4444'}
                  />
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <StatusIndicator rate={overallComplianceRate} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters & Actions Header */}
          <div className="flex items-center flex-wrap justify-between mt-8 relative z-10 pb-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4 md:mb-0">Command Interface</h2>
            <div className="flex gap-4 items-center">
              {/* Light Client Selector */}
              {clients && clients.length > 0 && (
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2 shadow-sm transition-all hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500/50 group">
                  <span className="text-slate-500 font-semibold text-xs tracking-wider uppercase">Context:</span>
                  <select
                    className="bg-transparent border-none focus:ring-0 cursor-pointer pr-8 font-bold text-slate-900 focus:text-blue-600 max-w-[150px] truncate outline-none appearance-none transition-colors"
                    value={clientId || ""}
                    onChange={(e) => setClientId(e.target.value || undefined)}
                  >
                    <option value="" className="bg-white">Global Fleet</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id} className="bg-white text-slate-900">
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <div className="ml-[-1.5rem] pointer-events-none text-slate-500 group-hover:text-slate-900 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Light Standard Selector */}
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2 shadow-sm transition-all hover:bg-slate-50 focus-within:ring-2 focus-within:ring-purple-500/50 group">
                <span className="text-slate-500 font-semibold text-xs tracking-wider uppercase">Protocol:</span>
                <select
                  className="bg-transparent border-none focus:ring-0 cursor-pointer pr-8 font-bold text-slate-900 focus:text-purple-600 outline-none appearance-none transition-colors"
                  value={framework || ""}
                  onChange={(e) => setFramework(e.target.value || undefined)}
                >
                  <option value="" className="bg-white">All Protocols</option>
                  <option value="ISO 27001" className="bg-white text-slate-900">ISO 27001</option>
                  <option value="SOC 2" className="bg-white text-slate-900">SOC 2</option>
                </select>
                <div className="ml-[-1.5rem] pointer-events-none text-slate-500 group-hover:text-slate-900 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (
                <Button onClick={() => setLocation('/clients')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl h-10 px-5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                  <Plus className="mr-2 h-4 w-4" />
                  Deploy Node
                </Button>
              )}
            </div>
          </div>

          {/* Onboarding Banner (Short version for active dashboard) */}

          {!statsLoading && enhancedStats && (overview.totalPolicies === 0 || overview.totalEvidence === 0 || ((user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (overview.totalLLMProviders === 0))) && (
            <OnboardingChecklist stats={enhancedStats} role={user?.role} />
          )}

          {/* Key Metrics - Enhanced with Animations */}
          <div className="dashboard-grid grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/metric rounded-3xl hover:-translate-y-1 transition-all duration-300 shadow-sm border-slate-200">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-loose">Total Clients</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter">
                        {overview?.totalClients || 0}
                      </h3>
                    )}
                    <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                      {user?.role === 'super_admin'
                        ? "Unlimited Organizations"
                        : `${(overview as any)?.ownedClientsCount || 0} / ${(overview as any)?.maxClients || 2} used`}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 group-hover/metric:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/metric rounded-3xl hover:-translate-y-1 transition-all duration-300 shadow-sm border-slate-200">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-loose">Master Controls</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter">
                        {overview?.totalControls || 0}
                      </h3>
                    )}
                    <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                      {frameworkByName["ISO 27001"] || 0} ISO · {frameworkByName["SOC 2"] || 0} SOC 2
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20 group-hover/metric:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/metric rounded-3xl hover:-translate-y-1 transition-all duration-300 shadow-sm border-slate-200">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-orange-500/5 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-loose">Policy Templates</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter">
                        {overview?.totalPolicies || 0}
                      </h3>
                    )}
                    <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                      {pStatus?.approved || 0} approved
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20 group-hover/metric:scale-110 transition-transform duration-300">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/metric rounded-3xl hover:-translate-y-1 transition-all duration-300 shadow-sm border-slate-200 cursor-pointer" onClick={() => setLocation('/risk-register')}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-600/5 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-loose">Flagged Risks</p>
                      <span className="flex h-2 w-2 relative" title="Live Risk Monitoring">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter group-hover/metric:text-red-600 transition-colors">
                        {overview?.highRisks || 0}
                      </h3>
                    )}
                    <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">High & Critical severity</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 group-hover/metric:scale-110 transition-transform duration-300">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/metric rounded-3xl hover:-translate-y-1 transition-all duration-300 shadow-sm border-slate-200">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-teal-500/5 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-loose">Overall Compliance</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <h3 className="text-4xl font-black mt-1 text-slate-900 tracking-tighter">
                        {overallComplianceRate}%
                      </h3>
                    )}
                    <div className="mt-3 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
                      <Progress
                        value={overallComplianceRate}
                        className="h-2.5 rounded-full"
                        indicatorClassName={
                          overallComplianceRate >= 100 ? "progress-success" :
                            overallComplianceRate >= 80 ? "progress-brand" :
                              overallComplianceRate >= 50 ? "progress-teal" :
                                overallComplianceRate >= 25 ? "progress-warning" :
                                  "progress-error"
                        }
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20 group-hover/metric:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Trend Chart */}
          <Card className="col-span-full bg-white/60 backdrop-blur-xl relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50 pointer-events-none" />
            <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                Compliance Performance Trend
              </CardTitle>
              <CardDescription className="font-medium text-slate-500">Overall compliance improvement over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              {scoresLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : complianceScores && complianceScores.length > 0 ? (
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceScores || []}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Compliance Score"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="target"
                        name="Target Goal"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-xl mt-4 bg-slate-100">
                  <EmptyState
                    icon={Activity}
                    title="No Trend Data"
                    description="Complete your first assessments to start seeing compliance trends."
                    className="border-none bg-transparent"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Control Status Chart */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-50 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <PieChart className="h-5 w-5" />
                  </div>
                  Control Status
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Implementation status across all clients</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {statsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : controlStatusData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={controlStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data) => {
                            const statusMap: Record<string, string> = {
                              "Implemented": "implemented",
                              "In Progress": "in_progress",
                              "Not Started": "not_implemented",
                              "N/A": "not_applicable"
                            };
                            const status = statusMap[data.name];
                            if (status) setLocation(`/client-controls?status=${status}`);
                          }}
                          cursor="pointer"
                        >
                          {controlStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={Shield}
                    title="No Controls Found"
                    description="Start by adding your first compliance control to track progress."
                    action={{
                      label: "Add Control",
                      onClick: () => setLocation("/client-controls")
                    }}
                    className="h-48"
                  />
                )}
              </CardContent>
            </Card>

            {/* Policy Status Chart */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 opacity-50 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  Policy Status
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Policy approval status</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {statsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : policyStatusData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={policyStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data) => {
                            const statusMap: Record<string, string> = {
                              "Approved": "approved",
                              "In Review": "review",
                              "Draft": "draft",
                              "Archived": "archived"
                            };
                            const status = statusMap[data.name];
                            if (status) setLocation(`/client-policies?status=${status}`);
                          }}
                          cursor="pointer"
                        >
                          {policyStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No Policies Found"
                    description="Generate or upload policies to manage your compliance framework."
                    action={{
                      label: "Add Policy",
                      onClick: () => setLocation("/client-policies")
                    }}
                    className="h-48"
                  />
                )}
              </CardContent>
            </Card>

            {/* Evidence Status Chart */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-50 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600/10 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  Evidence Status
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Evidence verification status</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {statsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : evidenceStatusData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={evidenceStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data) => {
                            const statusMap: Record<string, string> = {
                              "Verified": "verified",
                              "Collected": "collected",
                              "Pending": "pending",
                              "Expired": "expired",
                              "N/A": "not_applicable"
                            };
                            const status = statusMap[data.name];
                            if (status) setLocation(`/evidence?status=${status}`);
                          }}
                          cursor="pointer"
                        >
                          {evidenceStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No Evidence Found"
                    description="Upload evidence files to demonstrate control implementation."
                    action={{
                      label: "Add Evidence",
                      onClick: () => setLocation("/evidence")
                    }}
                    className="h-48"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Framework Distribution */}
          <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-slate-400/5 opacity-50 pointer-events-none" />
            <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                Controls by Framework
              </CardTitle>
              <CardDescription className="font-medium text-slate-500">Distribution of controls in the master library</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              {statsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frameworkData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {frameworkData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FRAMEWORK_COLORS[index % FRAMEWORK_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Client Overview, Overdue Assessments, and Recent Activity */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Overdue Vendor Assessments - High Priority */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/overdue rounded-3xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5 opacity-0 group-hover/overdue:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  Overdue Assessments
                  {overdueAssessments && overdueAssessments.length > 0 && (
                    <span className="bg-red-500 text-white shadow-sm shadow-red-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full">{overdueAssessments.length}</span>
                  )}
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Pending vendor assessments past due</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {overdueLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : overdueAssessments && overdueAssessments.length > 0 ? (
                  <div className="space-y-3">
                    {overdueAssessments.slice(0, 5).map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg border bg-white/80 border border-slate-200 shadow-lg">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-medium truncate text-sm">{assessment.vendorName}</p>
                          <p className="text-xs text-muted-foreground truncate">{assessment.assessmentType}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'Overdue'}
                          </span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setLocation(`/clients/${assessment.clientId}/vendors/${assessment.vendorId}?tab=assessments`)}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    {overdueAssessments.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        + {overdueAssessments.length - 5} more overdue
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
                    <p className="text-sm">All assessments on track</p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Client Compliance Overview */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/clients rounded-3xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover/clients:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  Client Overview
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Compliance progress by client</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {statsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : clientsOverview.length > 0 ? (
                  <div className="space-y-4">
                    {clientsOverview.slice(0, 5).map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/clients/${client.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">{client.name}</p>
                            <span className="text-sm font-semibold text-primary">
                              {client.compliancePercentage}%
                            </span>
                          </div>
                          <Progress
                            value={client.compliancePercentage}
                            className="h-2"
                            indicatorClassName={
                              client.compliancePercentage >= 100 ? "progress-success" :
                                client.compliancePercentage >= 80 ? "progress-brand" :
                                  client.compliancePercentage >= 50 ? "progress-teal" :
                                    client.compliancePercentage >= 25 ? "progress-warning" :
                                      "progress-error"
                            }
                          />
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{client.controlsCount} controls</span>
                            <span>{client.policiesCount} policies</span>
                            <span>{client.evidenceCount} evidence</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                            title="View Strategic Roadmap"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/clients/${client.id}/readiness/roadmap`);
                            }}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                    {(clientsOverview.length > 5 || (clients && clients.length > 5)) && (
                      <Button variant="ghost" className="w-full" onClick={() => setLocation('/clients')}>
                        View all clients
                      </Button>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="No Organizations Yet"
                    description="Create your first organization workspace to start managing compliance."
                    action={user?.role === 'admin' ? {
                      label: "Create Organization",
                      onClick: () => setLocation("/clients")
                    } : undefined}
                    className="py-12"
                  />
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/60 backdrop-blur-xl relative overflow-hidden group/activity rounded-3xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover/activity:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  Recent Activity
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Latest updates across all clients</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {statsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${activity.type === 'control' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'policy' ? 'bg-green-100 text-green-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                          {activity.type === 'control' ? <Shield className="h-3 w-3" /> :
                            activity.type === 'policy' ? <FileText className="h-3 w-3" /> :
                              <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} updated
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No Recent Activity"
                    description="Latest updates will appear here once you start managing your workspace."
                    className="py-12 border-none bg-transparent"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden relative group/qa">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none group-hover/qa:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-4 relative z-10 border-b border-slate-200">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Quick Actions</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Common tasks to manage compliance</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              <div className="grid gap-4 md:grid-cols-4">
                {user?.role === 'admin' && (
                  <>
                    <Button variant="outline" className="justify-start h-auto py-5 px-5 rounded-2xl border-white hover:border-[#0284c7]/30 bg-slate-100 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-[#0284c7]/20" onClick={() => setLocation('/clients')}>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#0284c7]/10 text-[#0284c7] group-hover:scale-110 transition-transform">
                            <Plus className="h-4 w-4" />
                          </div>
                          <span className="font-extrabold text-slate-900 group-hover:text-[#0284c7] transition-colors">Add Client</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">Create new workspace</span>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-5 px-5 rounded-2xl border-white hover:border-[#0284c7]/30 bg-slate-100 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-[#0284c7]/20" onClick={() => setLocation('/controls')}>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#0284c7]/10 text-[#0284c7] group-hover:scale-110 transition-transform">
                            <Shield className="h-4 w-4" />
                          </div>
                          <span className="font-extrabold text-slate-900 group-hover:text-[#0284c7] transition-colors">Control Library</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">Manage master controls</span>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-5 px-5 rounded-2xl border-white hover:border-[#0284c7]/30 bg-slate-100 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-[#0284c7]/20" onClick={() => setLocation('/policy-templates')}>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#0284c7]/10 text-[#0284c7] group-hover:scale-110 transition-transform">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-extrabold text-slate-900 group-hover:text-[#0284c7] transition-colors">Policy Templates</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">Create templates</span>
                      </div>
                    </Button>
                  </>
                )}
                <Button variant="outline" className="justify-start h-auto py-5 px-5 rounded-2xl border-white hover:border-emerald-300 bg-slate-100 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-emerald-500/20" onClick={() => setLocation('/evidence')}>
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-600/10 text-emerald-600 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">Evidence Tracking</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">Track compliance evidence</span>
                  </div>
                </Button>
                {/* Strategic Roadmap Quick Link */}
                <Button variant="outline" className="justify-start h-auto py-5 px-5 rounded-2xl border-white hover:border-purple-300 bg-slate-100 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-purple-500/20" onClick={() => setLocation('/clients')}>
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">Strategic Planning</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">Manage client roadmaps</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
      {/* Target Score Dialog */}
      <EnhancedDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        title="Set Target Compliance Score"
        description={`Set a target compliance percentage for ${selectedClient?.name}`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setTargetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTarget} disabled={setTargetMutation.isPending}>
              {setTargetMutation.isPending ? "Saving..." : "Save Target"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetScore">Target Score (%)</Label>
            <Input
              id="targetScore"
              type="number"
              min={0}
              max={100}
              value={newTargetScore}
              onChange={(e) => setNewTargetScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
            <p className="text-sm text-muted-foreground">
              Current score: {selectedClient?.currentTarget}%
            </p>
          </div>
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex gap-2">
              {[50, 70, 80, 90, 100].map((score) => (
                <Button
                  key={score}
                  variant={newTargetScore === score ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTargetScore(score)}
                >
                  {score}%
                </Button>
              ))}
            </div>
          </div>
        </div>
      </EnhancedDialog>
    </DashboardLayout>
  );
}
