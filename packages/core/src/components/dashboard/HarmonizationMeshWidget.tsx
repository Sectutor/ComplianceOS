import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { useLocation } from "wouter";

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
  const [selectedFramework, setSelectedFramework] = useState<string>("soc2");

  const frameworks: FrameworkNode[] = [
    {
      id: "soc2",
      name: "SOC 2 Type II",
      code: "SOC 2 (TSC 2017)",
      readiness: 94,
      totalControls: 68,
      satisfiedByMesh: 64,
    },
    {
      id: "iso27001",
      name: "ISO/IEC 27001:2022",
      code: "ISO 27001",
      readiness: 89,
      totalControls: 93,
      satisfiedByMesh: 83,
    },
    {
      id: "nist_csf",
      name: "NIST CSF 2.0",
      code: "NIST CSF",
      readiness: 91,
      totalControls: 106,
      satisfiedByMesh: 96,
    },
    {
      id: "hipaa",
      name: "HIPAA Security Rule",
      code: "HIPAA",
      readiness: 96,
      totalControls: 42,
      satisfiedByMesh: 40,
    },
    {
      id: "nis2",
      name: "EU NIS2 Directive",
      code: "NIS2 Art. 21",
      readiness: 88,
      totalControls: 54,
      satisfiedByMesh: 47,
    },
  ];

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
                <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  3.8x Multiplier
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Collect once, comply everywhere. Unified controls map automatically across global standards.
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLocation(clientId ? `/clients/${clientId}/frameworks` : "/frameworks")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View Full Matrix
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Framework Readiness Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {frameworks.map((fw) => {
            const isSelected = selectedFramework === fw.id;

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
              Your 124 verified evidence artifacts fulfill <strong>330 cross-framework audit requirements</strong> automatically.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex-shrink-0">
            Saved ~260 engineering hours
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
