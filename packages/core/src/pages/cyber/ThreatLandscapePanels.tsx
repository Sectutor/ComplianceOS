/**
 * NIS2 Threat Landscape - panels
 * ===============================
 * Renders the `threatLandscape.*` contract (see
 * `packages/core/src/pages/threatLandscapeApi.ts`) as the "NIS2 Threat
 * Landscape Integration" section on the Cyber Dashboard:
 *
 *   1. Landscape summary strip   <- threatLandscape.summary
 *   2. Threat classification     <- threatLandscape.classify (tool)
 *   3. Sector scenarios          <- threatLandscape.scenarios (tool)
 *   4. TARA workbook             <- threatLandscape.tara
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the threatLandscape.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/sky hexes, dark-mode safe. Category /
 * severity / likelihood / risk-band pills use the Badge component; exposure
 * and confidence bars use the documented data-viz exception (18). Demo mode
 * (17) is gated behind the "Demo data" switch, off by default, and renders a
 * persistent amber banner whenever sample data is shown. Live endpoint data
 * always wins over demo data.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Switch } from "@complianceos/ui/ui/switch";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Crosshair,
  FlaskConical,
  Gauge,
  History,
  ListChecks,
  MapPin,
  Radar,
  ScanSearch,
  ShieldAlert,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  buildDemoTaraTemplate,
  buildDemoTaraTemplateInput,
  buildDemoThreatClassification,
  buildDemoThreatClassificationInput,
  buildDemoThreatScenarios,
  buildDemoThreatScenariosInput,
  buildDemoThreatSummary,
  buildDemoThreatSummaryInput,
  DEMO_SECTOR,
  DEMO_THREAT_CLASSIFICATION_INPUT,
  IMPACT_LEVEL_META,
  LIKELIHOOD_META,
  RISK_BAND_META,
  RISK_BAND_ORDER,
  SEVERITY_META,
  THREAT_SEVERITY_ORDER,
  threatCategoryMeta,
  confidenceBarClass,
  exposureBarClass,
  formatConfidence,
  trendDeltaDirection,
  TREND_DELTA_META,
  useTaraTemplate,
  useThreatClassification,
  useThreatLandscapeSummary,
  useThreatScenarios,
  type TaraTemplateInput,
  type TaraTemplateResponse,
  type ThreatBarClass,
  type ThreatClassification,
  type ThreatEventInput,
  type ThreatLandscapeSummary,
  type ThreatLandscapeSummaryInput,
  type ThreatScenariosInput,
  type ThreatScenariosResponse,
} from "@/pages/threatLandscapeApi";

/** Stable anchor id for the section (deep-link / internal links). */
export const NIS2_THREAT_LANDSCAPE_SECTION_ID = "nis2-threat-landscape";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/**
 * Degradation helper (UI-STANDARD 13/16): skeleton -> EmptyState -> children.
 * `isLoading` is always checked before "empty" so nothing flashes.
 */
function Degrade({
  isLoading,
  hasData,
  isError,
  procedure,
  icon,
  emptyHint,
  onEnableDemo,
  skeleton,
  children,
}: {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
  procedure: string;
  icon: LucideIcon;
  emptyHint: string;
  onEnableDemo?: () => void;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading && !hasData) {
    return <div className="space-y-3">{skeleton}</div>;
  }
  if (isError || !hasData) {
    return (
      <EmptyState
        icon={icon}
        title={`Connect the ${procedure} API`}
        description={
          isError
            ? `The ${procedure} endpoint is not live yet. It appears once the threatLandscape router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({ value, barClass }: { value: number; barClass: ThreatBarClass }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", barClass)}>
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Compact health tile (UI-STANDARD 4: numbers tabular-nums). */
function HealthTile({
  icon: Icon,
  label,
  value,
  valueClass = "text-foreground",
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-tight text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={cn("text-2xl font-bold tabular-nums", valueClass)}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {children}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Landscape summary strip                                          */
/* ------------------------------------------------------------------ */

function LandscapeSummaryPanel({
  summary,
  summaryQuery,
  onEnableDemo,
}: {
  summary: ThreatLandscapeSummary | undefined;
  summaryQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const trend = summary?.trend;
  const trendMeta = trend ? TREND_DELTA_META[trendDeltaDirection(trend.delta)] : undefined;
  const criticalHigh =
    (summary?.severityCounts.critical ?? 0) + (summary?.severityCounts.high ?? 0);

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Radar className="h-5 w-5 text-muted-foreground" />
          Threat landscape summary
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          ENISA taxonomy category and severity pressure, 30-day trend and exposure for the
          reporting period.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={summaryQuery.isLoading && !summary}
          hasData={!!summary}
          isError={summaryQuery.isError && !summary}
          procedure="threatLandscape.summary"
          icon={Radar}
          emptyHint="The landscape summary appears once threat events are aggregated by the threatLandscape router. Enable demo mode to preview the strip."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-xl shadow-sm border-border">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-7 w-14" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          {summary && trend && trendMeta ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <HealthTile
                  icon={Gauge}
                  label="Exposure score"
                  value={
                    <span className="tabular-nums">
                      {summary.exposureScore}
                      <span className="text-sm font-medium text-muted-foreground">/100</span>
                    </span>
                  }
                  hint="Base 40 + 20 per applicable sector scenario"
                >
                  <div className="mt-3">
                    <ScoreBar
                      value={summary.exposureScore}
                      barClass={exposureBarClass(summary.exposureScore)}
                    />
                  </div>
                </HealthTile>
                <HealthTile
                  icon={Activity}
                  label="30-day trend"
                  value={
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{trend.last30d}</span>
                      <span className="text-sm font-medium text-muted-foreground">vs {trend.prior30d}</span>
                    </span>
                  }
                  hint="Events this period vs the prior 30 days"
                >
                  <Badge
                    variant={trendMeta.badgeVariant}
                    className="mt-3 gap-1 tabular-nums"
                  >
                    {trendMeta.glyph} {Math.abs(trend.delta)}
                  </Badge>
                </HealthTile>
                <HealthTile
                  icon={ListChecks}
                  label="Total events"
                  value={summary.totalEvents}
                  hint="In the aggregation window"
                />
                <HealthTile
                  icon={AlertTriangle}
                  label="Critical / High"
                  value={criticalHigh}
                  valueClass={
                    criticalHigh > 0 ? "text-[var(--error-foreground)]" : "text-foreground"
                  }
                  hint="Requires immediate attention"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {summary.categoryCounts.map((category) => {
                  const meta = threatCategoryMeta(category.categoryId, category.categoryName);
                  return (
                    <Badge key={category.categoryId} variant={meta.badgeVariant} className="gap-1.5">
                      {category.categoryName}
                      <span className="tabular-nums">{category.count}</span>
                    </Badge>
                  );
                })}
                {THREAT_SEVERITY_ORDER.map((severity) => {
                  const meta = SEVERITY_META[severity];
                  const count = summary.severityCounts[severity] ?? 0;
                  return (
                    <Badge key={severity} variant="outline" className="gap-1.5">
                      {meta.label}
                      <span className="tabular-nums">{count}</span>
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    Recent threat events
                  </h4>
                  <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                    {summary.recentEvents.map((event) => {
                      const meta = SEVERITY_META[event.severity];
                      return (
                        <div
                          key={String(event.id)}
                          className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                        >
                          <Badge variant={meta.badgeVariant} className="shrink-0">
                            {meta.label}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {event.title}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {event.categoryName}
                            </div>
                          </div>
                          {event.occurredAt ? (
                            <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {format(new Date(event.occurredAt), "MMM d, yyyy")}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {summary.recommendations.slice(0, 5).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Threat classification tool                                       */
/* ------------------------------------------------------------------ */

function ThreatClassificationTool({
  classification,
  classifyQuery,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onClassify,
  onEnableDemo,
}: {
  classification: ThreatClassification | undefined;
  classifyQuery: { isLoading: boolean; isError: boolean };
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClassify: () => void;
  onEnableDemo: () => void;
}) {
  const resultSkeleton = (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ScanSearch className="h-5 w-5 text-muted-foreground" />
          Threat classification
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Classify an event against the ENISA Threat Taxonomy 2024 (Art. 21(2)(a)) to get the
          category, impact level and NIS2 articles.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Tool form - always visible so the tool is usable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="tl-classify-title"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Event title
            </label>
            <Input
              id="tl-classify-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="e.g. Ransomware encrypting backup repositories"
              className="border-border bg-muted/30"
            />
          </div>
          <div>
            <label
              htmlFor="tl-classify-desc"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Description (keywords drive the match)
            </label>
            <Textarea
              id="tl-classify-desc"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="e.g. Encryption behaviour on the backup cluster followed by an extortion demand."
              rows={2}
              className="border-border bg-muted/30"
            />
          </div>
        </div>
        <Button
          onClick={onClassify}
          disabled={title.trim() === "" && description.trim() === ""}
          className="mt-3 gap-2"
        >
          <Crosshair className="h-4 w-4" />
          Classify threat
        </Button>

        {/* Result area - skeleton -> EmptyState -> category card */}
        <div className="mt-5">
          <Degrade
            isLoading={classifyQuery.isLoading && !classification}
            hasData={!!classification}
            isError={classifyQuery.isError && !classification}
            procedure="threatLandscape.classify"
            icon={ScanSearch}
            emptyHint="Enter an event title/description and run the classifier, or enable demo mode to preview a sample classification."
            onEnableDemo={onEnableDemo}
            skeleton={resultSkeleton}
          >
            {classification ? (
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={threatCategoryMeta(classification.categoryId, classification.categoryName).badgeVariant}
                  >
                    {classification.categoryName}
                  </Badge>
                  <Badge
                    variant={
                      IMPACT_LEVEL_META[classification.impactLevel]?.badgeVariant ?? "secondary"
                    }
                  >
                    Impact: {classification.impactLevel}
                  </Badge>
                  <Badge variant="outline" className="tabular-nums">
                    {formatConfidence(classification.confidence)} match
                  </Badge>
                  <span className="text-xs text-muted-foreground">{classification.categoryId}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {classification.title || "Untitled event"}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Confidence</span>
                    <span className="tabular-nums">{formatConfidence(classification.confidence)}</span>
                  </div>
                  <div className="mt-1">
                    <ScoreBar
                      value={classification.confidence * 100}
                      barClass={confidenceBarClass(classification.confidence)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {classification.matchedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="px-2 py-0 text-[10px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                {classification.nis2Articles.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">NIS2:</span>
                    {classification.nis2Articles.map((article) => (
                      <Badge key={article} variant="outline" className="px-2 py-0 text-[10px]">
                        {article}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Degrade>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Sector scenarios                                                 */
/* ------------------------------------------------------------------ */

function SectorScenariosPanel({
  scenarios,
  scenariosQuery,
  sector,
  onSectorChange,
  onGenerate,
  onEnableDemo,
}: {
  scenarios: ThreatScenariosResponse | undefined;
  scenariosQuery: { isLoading: boolean; isError: boolean };
  sector: string;
  onSectorChange: (value: string) => void;
  onGenerate: () => void;
  onEnableDemo: () => void;
}) {
  const items = scenarios?.items ?? [];

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          Sector threat scenarios
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Deterministic scenario catalogue for a sector (ENISA category, likelihood and ISO 27001
          controls attached).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={sector}
            onChange={(event) => onSectorChange(event.target.value)}
            placeholder="e.g. Energy, Healthcare, Finance"
            className="border-border bg-muted/30 sm:max-w-xs"
          />
          <Button
            onClick={onGenerate}
            disabled={sector.trim() === ""}
            className="gap-2"
          >
            <ListChecks className="h-4 w-4" />
            Generate scenarios
          </Button>
        </div>

        <div className="mt-5">
          <Degrade
            isLoading={scenariosQuery.isLoading && !scenarios}
            hasData={items.length > 0}
            isError={scenariosQuery.isError && !scenarios}
            procedure="threatLandscape.scenarios"
            icon={MapPin}
            emptyHint="Pick a sector and generate scenarios, or enable demo mode to preview the Energy sector catalogue."
            onEnableDemo={onEnableDemo}
            skeleton={
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-5 w-40 rounded-full" />
                  </div>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((scenario) => {
                const categoryMeta = threatCategoryMeta(scenario.categoryId, scenario.categoryName);
                const likelihoodMeta = LIKELIHOOD_META[scenario.likelihood] ?? {
                  label: scenario.likelihood,
                  badgeVariant: "secondary",
                };
                return (
                  <div key={scenario.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={categoryMeta.badgeVariant}>{categoryMeta.label}</Badge>
                      <Badge variant={likelihoodMeta.badgeVariant}>
                        {likelihoodMeta.label} likelihood
                      </Badge>
                      <span className="text-xs text-muted-foreground">{scenario.id}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-foreground">{scenario.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{scenario.description}</p>
                    <p className="mt-2 text-xs text-foreground/80">
                      <span className="font-medium text-muted-foreground">Impact: </span>
                      {scenario.potentialImpact}
                    </p>
                    {scenario.recommendedControls.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {scenario.recommendedControls.map((control) => (
                          <Badge key={control} variant="secondary" className="px-2 py-0 text-[10px]">
                            {control}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Sectors:</span>
                      {scenario.industrySector.map((industry) => (
                        <Badge key={industry} variant="outline" className="px-2 py-0 text-[10px]">
                          {industry}
                        </Badge>
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">NIS2:</span>
                      {scenario.nis2Articles.map((article) => (
                        <Badge key={article} variant="outline" className="px-2 py-0 text-[10px]">
                          {article}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Degrade>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 4. TARA workbook                                                    */
/* ------------------------------------------------------------------ */

function TaraWorkbookPanel({
  tara,
  taraQuery,
  onEnableDemo,
}: {
  tara: TaraTemplateResponse | undefined;
  taraQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const rows = tara?.rows ?? [];
  const summary = tara?.summary;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Target className="h-5 w-5 text-muted-foreground" />
          TARA workbook
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Asset x scenario inherent risk (likelihood x criticality, 1-12) with per-band rollup and
          top risks.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={taraQuery.isLoading && !tara}
          hasData={rows.length > 0}
          isError={taraQuery.isError && !tara}
          procedure="threatLandscape.tara"
          icon={Target}
          emptyHint="The workbook is built from assets and scenarios by the threatLandscape router. Enable demo mode to preview a sample workbook."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="rounded-xl shadow-sm border-border">
                    <CardContent className="pt-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="mt-2 h-6 w-10" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          }
        >
          {summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <HealthTile
                  icon={ListChecks}
                  label="Risk rows"
                  value={summary.totalRows}
                  hint={`Avg risk ${summary.avgRiskScore}/12`}
                />
                {RISK_BAND_ORDER.map((band) => {
                  const meta = RISK_BAND_META[band];
                  return (
                    <HealthTile
                      key={band}
                      icon={band === "critical" ? AlertTriangle : Activity}
                      label={meta.label}
                      value={summary.perBand[band]}
                      valueClass={meta.textClass}
                    />
                  );
                })}
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 text-left font-semibold">Asset</th>
                      <th className="px-4 text-left font-semibold">Scenario</th>
                      <th className="px-4 text-center font-semibold">Likelihood</th>
                      <th className="px-4 text-center font-semibold">Impact</th>
                      <th className="px-4 text-right font-semibold">Risk</th>
                      <th className="px-4 text-left font-semibold">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const bandMeta = RISK_BAND_META[row.riskBand];
                      return (
                        <tr key={`${String(row.assetId)}-${String(row.scenarioId)}`} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4 whitespace-nowrap text-sm font-semibold text-foreground">
                            {row.assetName}
                          </td>
                          <td className="p-4 min-w-[220px]">
                            <div className="text-sm text-foreground">{row.scenarioTitle}</div>
                            <div className="text-xs text-muted-foreground">{row.categoryName}</div>
                          </td>
                          <td className="p-4 text-center text-sm tabular-nums text-muted-foreground">
                            {row.inherentLikelihood}
                          </td>
                          <td className="p-4 text-center text-sm tabular-nums text-muted-foreground">
                            {row.inherentImpact}
                          </td>
                          <td className={cn("p-4 text-right text-sm font-semibold tabular-nums", bandMeta.textClass)}>
                            {row.riskScore}/12
                          </td>
                          <td className="p-4">
                            <Badge variant={bandMeta.badgeVariant}>{bandMeta.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {summary.topRisks.length > 0 ? (
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Top risks
                  </h4>
                  <ul className="space-y-2">
                    {summary.topRisks.map((risk) => {
                      const meta = RISK_BAND_META[risk.riskBand];
                      return (
                        <li key={`${String(risk.assetId)}-${String(risk.scenarioId)}`} className="flex items-center gap-3 text-sm">
                          <Badge variant={meta.badgeVariant} className="shrink-0 tabular-nums">
                            {risk.riskScore}/12
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {risk.assetName}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {meta.label} risk
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export default function ThreatLandscapePanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  /* --- threatLandscape.summary ------------------------------------- */
  const summaryInput = useMemo<ThreatLandscapeSummaryInput | null>(
    () => (demoMode ? buildDemoThreatSummaryInput() : null),
    [demoMode]
  );
  const summaryQuery = useThreatLandscapeSummary(clientId, summaryInput);
  const summary: ThreatLandscapeSummary | undefined = demoMode
    ? (summaryQuery.data ?? buildDemoThreatSummary())
    : summaryQuery.data;

  /* --- threatLandscape.classify (tool) ------------------------------ */
  const [classifyTitle, setClassifyTitle] = useState("");
  const [classifyDescription, setClassifyDescription] = useState("");
  const [classifySubmitted, setClassifySubmitted] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setClassifyTitle(DEMO_THREAT_CLASSIFICATION_INPUT.title ?? "");
      setClassifyDescription(DEMO_THREAT_CLASSIFICATION_INPUT.description ?? "");
      setClassifySubmitted(true);
    }
  }, [demoMode]);

  const classifyInput = useMemo<ThreatEventInput | null>(() => {
    if (demoMode) return buildDemoThreatClassificationInput();
    if (!classifySubmitted) return null;
    return { title: classifyTitle, description: classifyDescription, source: "manual" };
  }, [demoMode, classifySubmitted, classifyTitle, classifyDescription]);
  const classifyQuery = useThreatClassification(clientId, classifyInput);
  const classification: ThreatClassification | undefined = demoMode
    ? (classifyQuery.data ?? buildDemoThreatClassification())
    : classifyQuery.data;

  /* --- threatLandscape.scenarios (tool) ----------------------------- */
  const [sector, setSector] = useState("");
  const [scenariosSubmitted, setScenariosSubmitted] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setSector(DEMO_SECTOR);
      setScenariosSubmitted(true);
    }
  }, [demoMode]);

  const scenariosInput = useMemo<ThreatScenariosInput | null>(() => {
    if (demoMode) return buildDemoThreatScenariosInput();
    if (!scenariosSubmitted) return null;
    return { sector, limit: 8 };
  }, [demoMode, scenariosSubmitted, sector]);
  const scenariosQuery = useThreatScenarios(clientId, scenariosInput);
  const scenarios: ThreatScenariosResponse | undefined = demoMode
    ? (scenariosQuery.data ?? buildDemoThreatScenarios())
    : scenariosQuery.data;

  /* --- threatLandscape.tara ----------------------------------------- */
  const taraInput = useMemo<TaraTemplateInput | null>(
    () => (demoMode ? buildDemoTaraTemplateInput() : null),
    [demoMode]
  );
  const taraQuery = useTaraTemplate(clientId, taraInput);
  const tara: TaraTemplateResponse | undefined = demoMode
    ? (taraQuery.data ?? buildDemoTaraTemplate())
    : taraQuery.data;

  const enableDemo = () => setDemoMode(true);

  return (
    <section id={NIS2_THREAT_LANDSCAPE_SECTION_ID} className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Threat Landscape Integration
            </h2>
            <p className="text-sm text-muted-foreground">
              ENISA taxonomy classification, sector scenarios and TARA risk assessment (Art.
              21(2)(a)).
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
          <FlaskConical className="h-4 w-4" />
          Demo data
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Toggle demo data" />
        </label>
      </div>

      {/* Demo banner - persistent while sample data is shown (UI-STANDARD 17) */}
      {demoMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>
            <strong>Demo mode:</strong> showing sample data. Connect the{" "}
            <code className="text-xs">threatLandscape.*</code> APIs to see live threat data.
          </span>
        </div>
      )}

      {/* 1. Landscape summary strip */}
      <LandscapeSummaryPanel
        summary={summary}
        summaryQuery={summaryQuery}
        onEnableDemo={enableDemo}
      />

      {/* 2. Threat classification tool */}
      <ThreatClassificationTool
        classification={classification}
        classifyQuery={classifyQuery}
        title={classifyTitle}
        description={classifyDescription}
        onTitleChange={setClassifyTitle}
        onDescriptionChange={setClassifyDescription}
        onClassify={() => setClassifySubmitted(true)}
        onEnableDemo={enableDemo}
      />

      {/* 3. Sector scenarios */}
      <SectorScenariosPanel
        scenarios={scenarios}
        scenariosQuery={scenariosQuery}
        sector={sector}
        onSectorChange={setSector}
        onGenerate={() => setScenariosSubmitted(true)}
        onEnableDemo={enableDemo}
      />

      {/* 4. TARA workbook */}
      <TaraWorkbookPanel tara={tara} taraQuery={taraQuery} onEnableDemo={enableDemo} />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        Classification and scenarios follow the ENISA Threat Taxonomy 2024. TARA risk scores are
        inherent (likelihood x criticality) before controls are applied, per ISO 27005 / ENISA
        Measure 2.1.
      </p>
    </section>
  );
}
