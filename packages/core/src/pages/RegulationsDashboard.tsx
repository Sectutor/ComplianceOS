import React, { useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { regulations } from "@/data/regulations";
import { frameworks } from "@/data/frameworks";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import {
  ArrowRight,
  Scale,
  Shield,
  Target,
  Rocket,
  Activity,
  Search,
  BookOpen,
  FileDown,
  Sparkles,
  Layers,
  Globe2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";
import { PageGuide } from "@/components/PageGuide";

interface ObligationItem {
  id: string;
  name: string;
  description: string;
  type: string;
  category: "regulation" | "framework";
  logo?: string;
}

function ObligationCard({
  item,
  stats,
  onClick,
}: {
  item: ObligationItem;
  stats: { percentage: number; total?: number; implemented?: number };
  onClick: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  const progressColor = (percentage: number) => {
    if (percentage === 0) return "text-muted-foreground/30";
    if (percentage < 30) return "#ef4444";
    if (percentage < 70) return "#f59e0b";
    return "#10b981";
  };

  const acronym = item.name.split(' ')[0].substring(0, 4).toUpperCase();

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
              {!imageError && item.logo ? (
                <img
                  src={item.logo}
                  alt={item.name}
                  className="w-full h-full object-contain p-1"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="text-sm font-black text-foreground/80 flex items-center gap-1">
                  <Scale className="h-4 w-4 text-primary" />
                  <span>{acronym}</span>
                </div>
              )}
            </div>
            <Badge
              variant="secondary"
              className="bg-muted/80 border border-border text-foreground font-semibold shadow-xs hover:bg-muted px-3 py-1 text-xs uppercase tracking-wider ml-2 whitespace-nowrap"
            >
              {item.type}
            </Badge>
          </div>

          <div className="mb-auto">
            <h3
              className="font-black text-xl text-foreground group-hover:text-primary transition-colors leading-tight mb-2 truncate tracking-tight"
              title={item.name}
            >
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground font-medium line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-border/70 flex items-center text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">
            View Requirements & Articles <ArrowRight className="ml-1.5 h-4 w-4" />
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
              stats.percentage > 0 ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {stats.percentage > 0 ? `${stats.percentage}% Done` : 'Not Started'}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function RegulationsDashboard() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation('dashboard');
  const params = useParams<{ id: string }>();
  const generateReport = trpc.regulations.generateReport.useMutation();
  const { selectedClientId } = useClientContext();

  const clientId = params.id ? parseInt(params.id, 10) : (selectedClientId || 1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "statutory" | "standards">("all");

  const { data: client } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );

  const { data: stats } = trpc.compliance.frameworkStats.list.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const getStats = (regName: string) => {
    if (!stats || !Array.isArray(stats)) return { percentage: 0 };
    const exact = stats.find((s: any) => s.framework === regName);
    if (exact) return exact;

    return stats.find((s: any) => regName.includes(s.framework) || s.framework.includes(regName)) || { percentage: 0 };
  };

  // Combine regulations and obligatory frameworks
  const allObligations: ObligationItem[] = useMemo(() => {
    const regList: ObligationItem[] = regulations.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type || "Statutory Law",
      category: "regulation",
      logo: r.logo,
    }));

    const fwList: ObligationItem[] = frameworks
      .filter((f) => f.isObligation)
      .map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        type: f.type || "Mandatory Standard",
        category: "framework",
        logo: f.logo,
      }));

    return [...regList, ...fwList];
  }, []);

  const filteredObligations = useMemo(() => {
    return allObligations.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === "statutory") return item.category === "regulation";
      if (selectedCategory === "standards") return item.category === "framework";
      return true;
    });
  }, [allObligations, searchQuery, selectedCategory]);

  const statutoryCount = allObligations.filter((o) => o.category === "regulation").length;
  const standardsCount = allObligations.filter((o) => o.category === "framework").length;

  const handleDownloadGapAnalysis = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.promise(generateReport.mutateAsync({ clientId }), {
      loading: 'Generating Comprehensive Regulatory Gap Analysis...',
      success: (data) => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return 'Regulatory Gap Analysis downloaded successfully!';
      },
      error: 'Failed to generate report',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: client?.name || "Client Workspace", href: `/clients/${clientId}` },
            { label: "Compliance Obligations" },
          ]}
        />

        {/* Sleek Page Header matching FrameworksDashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Scale className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Compliance Obligations
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Manage statutory legal mandates, regional privacy laws, and mandatory certification requirements.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <PageGuide
              title="Compliance Obligations"
              description="Manage mandatory regulatory requirements and statutory obligations."
              rationale="Regulatory compliance is not optional. Unlike voluntary frameworks, these are legal requirements based on your jurisdiction and industry. This dashboard tracks your legal must-haves to avoid statutory liabilities."
              howToUse={[
                {
                  step: "Gap Analysis",
                  description: "Download a comprehensive audit report showing legal posture across all statutory obligations.",
                  targetId: "reg-gap-analysis-btn",
                },
                {
                  step: "Filter by Category",
                  description: "Switch between Statutory Directives (GDPR, HIPAA, NIS2) and Mandatory Standards (PCI-DSS).",
                  targetId: "reg-category-filters",
                },
                {
                  step: "Search Regulations",
                  description: "Quickly locate specific national or regional frameworks using the search filter.",
                  targetId: "reg-search-bar",
                },
                {
                  step: "Domain Alignment",
                  description: "Navigate to Risk, Controls, or Roadmap to resolve legal gaps.",
                  targetId: "reg-quick-links",
                },
              ]}
              scenarios={[
                {
                  title: "Executive Audit & Board Reporting",
                  example: "General Counsel requests an executive summary of current GDPR, HIPAA, and CCPA exposure.",
                  auditTip: "Use 'Download Gap Analysis' to produce an executive-ready PDF report highlighting implemented articles and open risks.",
                },
                {
                  title: "Cross-Border Expansion",
                  example: "Expanding into Brazil, Canada, or Japan requires immediate LGPD, PIPEDA, and APPI alignment.",
                  auditTip: "Select the regulation to view pre-mapped internal controls, reducing duplicate engineering work.",
                },
              ]}
              integrations={[
                { name: "Internal Controls", description: "Linked internal controls automatically satisfy statutory requirements." },
                { name: "Risk Register", description: "Unmet legal obligations auto-populate the high-impact risk register." },
              ]}
            />

            <Button
              id="reg-gap-analysis-btn"
              onClick={handleDownloadGapAnalysis}
              variant="outline"
              className="gap-2 text-xs font-semibold shadow-xs hover:bg-muted/60"
            >
              <FileDown className="h-4 w-4 text-primary" />
              Download Gap Analysis
            </Button>
          </div>
        </div>

        {/* Quick Domain Navigation Cards */}
        <div id="reg-quick-links" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm"
            onClick={() => setLocation(`/clients/${clientId}/roadmap`)}
          >
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">Compliance Roadmap</p>
              <p className="text-xs text-muted-foreground">Strategic milestones</p>
            </div>
          </Card>

          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl group transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-sm"
            onClick={() => setLocation(`/clients/${clientId}/risks`)}
          >
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">Risk Register</p>
              <p className="text-xs text-muted-foreground">High-impact threats</p>
            </div>
          </Card>

          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl group transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-sm"
            onClick={() => setLocation(`/clients/${clientId}/controls`)}
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">Internal Controls</p>
              <p className="text-xs text-muted-foreground">Satisfying obligations</p>
            </div>
          </Card>

          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card border border-border/70 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-sm"
            onClick={() => setLocation(`/clients/${clientId}/implementation`)}
          >
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">Implementation</p>
              <p className="text-xs text-muted-foreground">Remediation velocity</p>
            </div>
          </Card>
        </div>

        {/* Sleek Search & Category Filter Bar matching FrameworksDashboard */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div
            id="reg-search-bar"
            className="flex items-center space-x-2 bg-card p-2 rounded-xl border border-border shadow-xs flex-1 max-w-md"
          >
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <Input
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-muted-foreground"
              placeholder="Search compliance obligations, laws, regulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            id="reg-category-filters"
            className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border text-xs"
          >
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Obligations ({allObligations.length})
            </button>
            <button
              onClick={() => setSelectedCategory("statutory")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "statutory"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Statutory Laws ({statutoryCount})
            </button>
            <button
              onClick={() => setSelectedCategory("standards")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedCategory === "standards"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mandatory Standards ({standardsCount})
            </button>
          </div>
        </div>

        {/* Obligation Cards Grid matching FrameworksDashboard layout & feel */}
        <div id="reg-grid-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObligations.map((item) => {
            const itemStats = getStats(item.name);
            return (
              <ObligationCard
                key={item.id}
                item={item}
                stats={itemStats}
                onClick={() => setLocation(`/clients/${clientId}/compliance-obligations/${item.id}`)}
              />
            );
          })}

          {filteredObligations.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-muted/10">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No compliance obligations found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No matching regulations or standards for "{searchQuery}". Try adjusting your search query or switching filters.
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
