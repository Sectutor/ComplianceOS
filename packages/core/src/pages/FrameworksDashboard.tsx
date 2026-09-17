import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import {
  Search,
  Shield,
  ArrowRight,
  BookOpen,
  Upload,
  Lock,
  Sparkles,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { useAuth } from "@/contexts/AuthContext";
import { frameworks } from "@/data/frameworks";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";
import { FrameworkImportDialog } from "@/components/settings/FrameworkImportDialog";
import { toast } from "sonner";
import { PageGuide } from "@/components/PageGuide";
import { ExtensionSlot } from "@/registry/extensionRegistry";

// Representative control count estimates for major frameworks
const CONTROL_COUNTS: Record<string, number> = {
  "iso-27001": 93,
  "iso-22301": 56,
  "hitrust": 156,
  "soc-2": 66,
  "soc-1": 42,
  "nist-csf": 106,
  "nist-800-171": 110,
  "nist-800-53": 284,
  "nist-800-161": 88,
  "pci-dss-v4": 64,
  "cis-controls": 153,
  "csa-ccm": 197,
  "fedramp-moderate": 325,
  "cyber-essentials": 25,
  "nist-ai-rmf": 72,
  "owasp-aisvs": 38,
  "owasp-asvs": 84,
  "owasp_masvs": 46,
  "owasp_samm": 90,
  "owasp_api_top10": 10,
  "owasp_top10": 10,
  "owasp_top10_2021": 10,
  "essential-eight": 37,
  "cmmc-2": 110,
  "tisax": 52,
  "scf": 340,
  "owasp_ml_top10": 10,
};

const FrameworkCard = ({
  fw,
  stats,
  onClick,
}: {
  fw: any;
  stats: any;
  onClick: () => void;
}) => {
  const [imageError, setImageError] = useState(false);

  const progressColor = (percentage: number) => {
    if (percentage === 0) return "text-muted-foreground/30";
    if (percentage < 30) return "#ef4444";
    if (percentage < 70) return "#f59e0b";
    return "#10b981";
  };

  const acronym = fw.name.split(" ")[0].substring(0, 4).toUpperCase();
  const representativeControls = CONTROL_COUNTS[fw.id] || 48;

  return (
    <Card
      className="group hover:border-primary/40 bg-card/70 backdrop-blur-xl border border-border/70 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden rounded-3xl relative flex flex-col h-full"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="p-6 flex h-full gap-6 relative z-10">
        {/* Left Side: Info */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-16 min-w-[4rem] rounded-xl bg-background border border-border shadow-xs flex items-center justify-center group-hover:shadow-sm transition-shadow overflow-hidden">
              {!imageError && fw.logo ? (
                <img
                  src={fw.logo}
                  alt={fw.name}
                  className="w-full h-full object-contain p-1"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="text-sm font-black text-foreground/80 flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{acronym}</span>
                </div>
              )}
            </div>
            <Badge
              variant="secondary"
              className="bg-muted/80 border border-border text-foreground font-semibold shadow-xs hover:bg-muted px-3 py-1 text-xs uppercase tracking-wider ml-2 whitespace-nowrap"
            >
              {fw.type}
            </Badge>
          </div>

          <div className="mb-auto">
            <h3
              className="font-black text-xl text-foreground group-hover:text-primary transition-colors leading-tight mb-2 truncate tracking-tight"
              title={fw.name}
            >
              {fw.name}
            </h3>
            <p className="text-sm text-muted-foreground font-medium line-clamp-3 leading-relaxed">
              {fw.description}
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              <span className="font-bold text-foreground">{representativeControls}</span> Controls
            </span>
            <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View Controls <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Right Side: Progress */}
        <div className="flex flex-col items-center justify-center border-l border-dashed border-border/70 pl-6 min-w-[120px]">
          <CircularProgress
            value={stats.percentage}
            size={100}
            strokeWidth={10}
            color={progressColor(stats.percentage)}
          />
          <span
            className={`mt-3 text-[10px] font-black uppercase tracking-wider text-center ${
              stats.percentage > 0 ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {stats.percentage > 0 ? `${stats.percentage}% Done` : "Not Started"}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default function FrameworksDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { t } = useTranslation("dashboard");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCustomImportOpen, setIsCustomImportOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { selectedClientId, isPremiumStatus } = useClientContext();
  const clientId = selectedClientId || 1;

  // Fetch Stats
  const { data: stats } = trpc.compliance.frameworkStats.list.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const { data: client } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );

  const isPremium = isPremiumStatus;

  const getStats = (fwName: string) => {
    if (!stats || !Array.isArray(stats)) return { percentage: 0, total: 0, implemented: 0 };
    const exact = stats.find((s: any) => s.framework === fwName);
    if (exact) return exact;

    return (
      stats.find((s: any) => fwName.includes(s.framework) || s.framework.includes(fwName)) || {
        percentage: 0,
        total: 0,
        implemented: 0,
      }
    );
  };

  // Consolidate ALL frameworks (without filtering out isObligation)
  const allFrameworks = useMemo(() => {
    return frameworks;
  }, []);

  const filteredFrameworks = useMemo(() => {
    return allFrameworks.filter((fw) => {
      const matchesSearch =
        fw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fw.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fw.type.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "security") {
        return (
          fw.type === "Security" &&
          !fw.id.includes("fedramp") &&
          !fw.id.includes("cmmc") &&
          !fw.id.includes("800-")
        );
      }
      if (selectedCategory === "federal") {
        return (
          fw.id.includes("fedramp") ||
          fw.id.includes("cmmc") ||
          fw.id.includes("800-") ||
          fw.name.includes("NIST")
        );
      }
      if (selectedCategory === "ai_app") {
        return fw.type === "AI & Data" || fw.id.includes("owasp") || fw.name.includes("AI");
      }
      if (selectedCategory === "governance") {
        return (
          fw.type === "Governance" ||
          fw.type === "Business Continuity" ||
          fw.id.includes("tisax") ||
          fw.id.includes("hitrust") ||
          fw.id.includes("essential") ||
          fw.id.includes("soc-1")
        );
      }

      return true;
    });
  }, [allFrameworks, searchQuery, selectedCategory]);

  // Compute summary stats
  const totalFrameworksCount = allFrameworks.length;
  const activeCount = useMemo(() => {
    if (!stats || !Array.isArray(stats)) return 0;
    return stats.filter((s: any) => s.percentage > 0).length;
  }, [stats]);

  const avgReadiness = useMemo(() => {
    if (!stats || !Array.isArray(stats) || stats.length === 0) return 0;
    const active = stats.filter((s: any) => s.percentage > 0);
    if (active.length === 0) return 0;
    const sum = active.reduce((acc: number, s: any) => acc + s.percentage, 0);
    return Math.round(sum / active.length);
  }, [stats]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: client?.name || "Client Workspace", href: `/clients/${clientId}` },
            { label: "Frameworks Library" },
          ]}
        />

        {/* Sleek Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Layers className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Frameworks Library
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Explore, adopt, and manage standard security, privacy, and federal compliance frameworks.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <PageGuide
              title="Framework Implementation Guide"
              description="Learn how to adopt and implement compliance standards efficiently."
              rationale="Compliance frameworks provide the structure for your security program. Proper implementation ensures you meet regulatory requirements while building a robust security posture."
              howToUse={[
                {
                  step: "Browse Standards",
                  description: "Search for frameworks like SOC 2, ISO 27001, or NIST in our library.",
                  targetId: "fw-search-bar",
                },
                {
                  step: "Adopt & Import",
                  description: "Select a framework to import its controls into your Control Workbench.",
                  targetId: "fw-import-standard-btn",
                },
                {
                  step: "Track Progress",
                  description: "Monitor implementation status across all active frameworks via the dashboard.",
                  targetId: "fw-grid-container",
                },
                {
                  step: "Custom Frameworks",
                  description: "Pro and Enterprise users can import proprietary control sets.",
                  targetId: "fw-import-custom-btn",
                },
              ]}
              scenarios={[
                {
                  title: "Multi-Framework Strategy",
                  example: "You need to comply with both ISO 27001 and SOC 2.",
                  auditTip:
                    "Import both frameworks. ComplianceOS automatically deduplicates controls. Implementing a 'Password Complexity' control once will satisfy both frameworks simultaneously.",
                },
                {
                  title: "Handling Custom Audit Scopes",
                  example: "Your client has a specific proprietary security questionnaire.",
                  auditTip:
                    "Use 'Import Custom'. Our engine converts CSV/Excel mappings into live, trackable controls, allowing you to manage custom requirements just like international standards.",
                },
              ]}
              integrations={[
                { name: "Ready Wizards", description: "Launch step-by-step readiness assessments for any standard." },
                { name: "Global Mappings", description: "Controls are cross-mapped to reduce duplicate implementation work." },
                { name: "Audit Hub", description: "Implementation data flows directly into audit reports." },
              ]}
            />

            <Button
              id="fw-import-standard-btn"
              onClick={() => setIsImportDialogOpen(true)}
              variant="outline"
              className="gap-2 text-xs font-semibold shadow-xs hover:bg-muted/60"
            >
              <Upload className="h-4 w-4" />
              Import Standard
            </Button>

            <Button
              id="fw-import-custom-btn"
              onClick={() =>
                isPremium
                  ? setIsCustomImportOpen(true)
                  : setLocation("/upgrade-required?feature=custom-frameworks")
              }
              variant={isPremium ? "default" : "secondary"}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              {isPremium ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Import Custom
            </Button>
          </div>
        </div>

        {/* Strategic Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{totalFrameworksCount}</p>
              <p className="text-xs font-medium text-muted-foreground">Available Standards</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">{activeCount}</p>
              <p className="text-xs font-medium text-muted-foreground">Active In-Scope Frameworks</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {avgReadiness > 0 ? `${avgReadiness}%` : "Ready"}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Average Implementation</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">~2,400+</p>
              <p className="text-xs font-medium text-muted-foreground">Pre-Mapped Controls</p>
            </div>
          </Card>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div
            id="fw-search-bar"
            className="flex items-center space-x-2 bg-card p-2 rounded-xl border border-border shadow-xs flex-1 max-w-md"
          >
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <Input
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-muted-foreground"
              placeholder="Search frameworks, standards, controls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border text-xs flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Frameworks ({allFrameworks.length})
            </button>
            <button
              onClick={() => setSelectedCategory("security")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "security"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Core Security (ISO, SOC 2, PCI)
            </button>
            <button
              onClick={() => setSelectedCategory("federal")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "federal"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Federal & Defense (FedRAMP, NIST)
            </button>
            <button
              onClick={() => setSelectedCategory("ai_app")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "ai_app"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI & AppSec (OWASP, AI RMF)
            </button>
            <button
              onClick={() => setSelectedCategory("governance")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "governance"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Resilience & Industry (TISAX, HITRUST)
            </button>
          </div>
        </div>

        <FrameworkImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          clientId={clientId}
        />

        <ExtensionSlot
          name="frameworks.custom-import"
          props={{
            open: isCustomImportOpen,
            onOpenChange: setIsCustomImportOpen,
            clientId,
            onImport: async (data: any) => {
              const result = await trpc.frameworkImports.importCustomFramework.mutate({
                clientId,
                ...data,
              });
              if (result.success) {
                toast.success(`Imported ${result.count} controls!`);
              }
              return result;
            },
          }}
        />

        {/* Consolidated, Fully Interactive Framework Grid */}
        <div id="fw-grid-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFrameworks.map((fw) => (
            <FrameworkCard
              key={fw.id}
              fw={fw}
              stats={getStats(fw.name)}
              onClick={() => setLocation(`/controls?framework=${encodeURIComponent(fw.name)}`)}
            />
          ))}

          {filteredFrameworks.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-muted/10">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No frameworks found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No matching frameworks found for "{searchQuery}". Try clearing your search or switching categories.
              </p>
              {searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-xs"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
