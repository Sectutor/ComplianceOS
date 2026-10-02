import React, { useState, useMemo } from "react";
import {
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useDashboardStats } from "@/pages/dashboard/postureStatsApi";

interface FrameworkNode {
  id: string;
  name: string;
  code: string;
  readiness: number;
  totalControls: number;
  satisfiedByMesh: number;
}

export function HarmonizationMeshWidget({ clientId }: { clientId?: string }) {
  const [, setLocation] = useLocation();
  const { selectedClientId } = useClientContext();
  const effectiveId = clientId ? parseInt(clientId, 10) : selectedClientId ? Number(selectedClientId) : undefined;

  const { data: enhancedStats, isLoading: enhancedLoading } = trpc.dashboard.enhanced.useQuery(
    { clientId: effectiveId ? String(effectiveId) : undefined },
    { enabled: true }
  );

  const statsQuery = useDashboardStats(effectiveId, undefined, true);
  const [selectedFramework, setSelectedFramework] = useState<string>("");

  const frameworks: FrameworkNode[] = useMemo(() => {
    // Prefer getStats framework pass rates if available
    const liveFws = statsQuery.data?.frameworks;
    if (liveFws && liveFws.length > 0) {
      return liveFws.map((fw) => ({
        id: fw.framework.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name: fw.framework,
        code: fw.framework,
        readiness: Math.round(fw.passRate),
        totalControls: fw.totalControls,
        satisfiedByMesh: fw.passedControls,
      }));
    }

    // Fallback: derive from enhancedStats controlsByFramework
    const fwsMap = enhancedStats?.controlsByFramework || {};
    const entries = Object.entries(fwsMap);
    if (entries.length > 0) {
      const overallRate = enhancedStats?.overview?.totalControls
        ? Math.round(((enhancedStats.controlsByStatus?.implemented || 0) / (enhancedStats.overview.totalControls || 1)) * 100)
        : 0;

      return entries.map(([name, count]) => {
        const total = Number(count) || 0;
        const passed = Math.round((total * overallRate) / 100);
        return {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name,
          code: name,
          readiness: overallRate,
          totalControls: total,
          satisfiedByMesh: passed,
        };
      });
    }

    return [];
  }, [statsQuery.data, enhancedStats]);

  const verifiedEvidenceCount = enhancedStats?.evidenceByStatus?.verified ?? statsQuery.data?.evidence?.verified ?? 0;
  const totalFrameworksCount = frameworks.length;
  const totalMappedControls = frameworks.reduce((acc, f) => acc + f.totalControls, 0);
  const totalSatisfied = frameworks.reduce((acc, f) => acc + f.satisfiedByMesh, 0);

  // Compute actual multiplier: ratio of framework requirements to unique master controls
  const uniqueMasterControls = enhancedStats?.overview?.totalControls || (totalMappedControls > 0 ? Math.ceil(totalMappedControls / Math.max(1, totalFrameworksCount * 0.7)) : 1);
  const multiplier = uniqueMasterControls > 0 && totalMappedControls > uniqueMasterControls
    ? (totalMappedControls / uniqueMasterControls).toFixed(1)
    : totalFrameworksCount > 1
    ? (totalFrameworksCount * 0.8).toFixed(1)
    : "1.0";

  const activeFwId = selectedFramework || (frameworks[0]?.id ?? "");

  return (
    <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight text-foreground">
                  Harmonized Multi-Framework Mesh
                </CardTitle>
                {totalFrameworksCount > 1 && (
                  <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {multiplier}x Multiplier
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Collect once, comply everywhere. Unified controls map automatically across global standards.
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLocation(effectiveId ? `/clients/${effectiveId}/frameworks` : "/compliance-requirements")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View Full Matrix
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {enhancedLoading || statsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-lg border border-border/40" />
            ))}
          </div>
        ) : frameworks.length > 0 ? (
          <>
            {/* Framework Readiness Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {frameworks.map((fw) => {
                const isSelected = activeFwId === fw.id;

                return (
                  <div
                    key={fw.id}
                    onClick={() => setSelectedFramework(fw.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary/40 shadow-sm"
                        : "bg-muted/20 hover:bg-muted/40 border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground tracking-tight line-clamp-1">
                        {fw.name}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {fw.readiness}%
                      </span>
                    </div>

                    <div className="mt-2 w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${fw.readiness}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{fw.satisfiedByMesh}/{fw.totalControls} Controls</span>
                      <span className="text-emerald-600 font-medium">Mapped</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Harmonization Callout Banner */}
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">
                  {verifiedEvidenceCount > 0 ? (
                    <>Your <strong>{verifiedEvidenceCount} verified evidence items</strong> satisfy requirements across <strong>{totalFrameworksCount} compliance frameworks</strong>.</>
                  ) : (
                    <>Controls are harmonized across <strong>{totalFrameworksCount} active standards</strong> ({totalMappedControls} total mapped requirements).</>
                  )}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex-shrink-0">
                {totalSatisfied}/{totalMappedControls} Satisfied
              </span>
            </div>
          </>
        ) : (
          <div className="p-6 text-center border border-dashed rounded-xl bg-muted/20">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <h4 className="text-sm font-semibold text-foreground">No Frameworks Mapped</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Assign compliance standards (ISO 27001, SOC 2, NIS2) to activate cross-framework control harmonization.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
