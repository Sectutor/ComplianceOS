/**
 * NIS2 Evidence Repository - panels
 * ==================================
 * Renders the `evidenceRepository.*` contract (see
 * `packages/core/src/pages/evidenceRepositoryApi.ts`) as the "NIS2 Evidence
 * Repository" section on the Evidence page:
 *
 *   1. Evidence health strip       <- evidenceRepository.analyze
 *   2. Evidence quality table      <- evidenceRepository.analyze
 *   3. Audit trail feed            <- evidenceRepository.auditTrail
 *   4. Evidence suggestions        <- evidenceRepository.suggest
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the evidenceRepository.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/sky hexes, dark-mode safe. Status /
 * freshness / cadence pills use the Badge component; quality and coverage
 * bars use the documented data-viz exception (18). Demo mode (17) is gated
 * behind the "Demo data" switch, off by default, and renders a persistent
 * amber banner whenever sample data is shown. Live endpoint data always wins
 * over demo data.
 */

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  History,
  Hourglass,
  Layers,
  Lightbulb,
  ListChecks,
  Paperclip,
  ShieldCheck,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  buildDemoEvidenceAnalysis,
  buildDemoEvidenceAnalysisInput,
  buildDemoEvidenceAuditTrail,
  buildDemoEvidenceAuditTrailInput,
  buildDemoEvidenceSuggestions,
  buildDemoEvidenceSuggestionsInput,
  CADENCE_META,
  EVIDENCE_STATUS_META,
  FRESHNESS_META,
  QUALITY_BAND_META,
  qualityBarClass,
  useEvidenceAnalysis,
  useEvidenceAuditTrail,
  useEvidenceSuggestions,
  type EvidenceAnalysisInput,
  type EvidenceAnalysisResponse,
  type EvidenceAuditTrailInput,
  type EvidenceAuditTrailResponse,
  type EvidenceBarClass,
  type EvidenceSuggestionsInput,
  type EvidenceSuggestionsResponse,
} from "@/pages/evidenceRepositoryApi";

/** Stable anchor id for the section (deep-link / internal links). */
export const NIS2_EVIDENCE_REPOSITORY_SECTION_ID = "nis2-evidence-repository";

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
            ? `The ${procedure} endpoint is not live yet. It appears once the evidenceRepository router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({ value, barClass }: { value: number; barClass: EvidenceBarClass }) {
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

/** Human-readable "last updated" label for an audit event. */
function formatDaysSinceUpdate(days: number | null): string {
  if (days === null) return "No date";
  if (days <= 0) return "Updated today";
  return `${days}d ago`;
}

/** Gap-score badge variant (higher score = stronger need to act). */
function suggestionScoreBadge(score: number): "error" | "warning" | "info" {
  if (score >= 80) return "error";
  if (score >= 65) return "warning";
  return "info";
}

/* ------------------------------------------------------------------ */
/* 1. Evidence health strip                                            */
/* ------------------------------------------------------------------ */

function EvidenceHealthStrip({
  analysis,
  analysisQuery,
  onEnableDemo,
}: {
  analysis: EvidenceAnalysisResponse | undefined;
  analysisQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const overall = analysis?.overall;
  const counts = overall?.counts;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          Evidence health
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Quality, coverage and freshness of the Art. 21(2) evidence repository.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={analysisQuery.isLoading && !analysis}
          hasData={!!overall}
          isError={analysisQuery.isError && !analysis}
          procedure="evidenceRepository.analyze"
          icon={Gauge}
          emptyHint="Health metrics appear once evidence rows are analyzed by the evidenceRepository router. Enable demo mode to preview the strip."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
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
          {overall && counts ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                <HealthTile
                  icon={Gauge}
                  label="Avg quality score"
                  value={
                    <span className="tabular-nums">
                      {Math.round(overall.avgQualityScore)}
                      <span className="text-sm font-medium text-muted-foreground">/100</span>
                    </span>
                  }
                >
                  <div className="mt-3">
                    <ScoreBar value={overall.avgQualityScore} barClass={qualityBarClass(overall.avgQualityScore)} />
                  </div>
                </HealthTile>
                <HealthTile
                  icon={Target}
                  label="Coverage rate"
                  value={`${overall.coverageRate}%`}
                  valueClass="text-[var(--success-foreground)]"
                  hint="Verified share of the repository"
                >
                  <div className="mt-3">
                    <ScoreBar value={overall.coverageRate} barClass={qualityBarClass(overall.coverageRate)} />
                  </div>
                </HealthTile>
                <HealthTile
                  icon={CheckCircle2}
                  label="Verified"
                  value={counts.verified}
                  valueClass="text-[var(--success-foreground)]"
                />
                <HealthTile
                  icon={Hourglass}
                  label="Stale"
                  value={counts.stale}
                  valueClass={counts.stale > 0 ? "text-[var(--warning-foreground)]" : undefined}
                />
                <HealthTile
                  icon={Clock}
                  label="Expired"
                  value={counts.expired}
                  valueClass={counts.expired > 0 ? "text-[var(--error-foreground)]" : undefined}
                />
                <HealthTile
                  icon={AlertCircle}
                  label="Due soon"
                  value={counts.dueSoon}
                  valueClass={counts.dueSoon > 0 ? "text-[var(--warning-foreground)]" : undefined}
                />
              </div>

              {overall.recommendations.length > 0 ? (
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Top recommendations
                  </h4>
                  <ul className="space-y-2">
                    {overall.recommendations.slice(0, 5).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {recommendation}
                      </li>
                    ))}
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
/* 2. Evidence quality table                                           */
/* ------------------------------------------------------------------ */

function EvidenceQualityTable({
  analysis,
  analysisQuery,
  onEnableDemo,
}: {
  analysis: EvidenceAnalysisResponse | undefined;
  analysisQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const rows = analysis?.rows ?? [];

  const tableHead = (
    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <th className="px-4 text-left font-semibold">Evidence</th>
      <th className="px-4 text-left font-semibold">Status</th>
      <th className="px-4 text-left font-semibold">Quality</th>
      <th className="px-4 text-left font-semibold">Freshness</th>
      <th className="px-4 text-left font-semibold">Cadence</th>
      <th className="px-4 text-left font-semibold">Owner</th>
      <th className="px-4 text-left font-semibold">Next action</th>
    </tr>
  );

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          Evidence quality register
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Per-record quality band, freshness, renewal cadence and the next action to keep it auditor-ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={analysisQuery.isLoading && !analysis}
          hasData={rows.length > 0}
          isError={analysisQuery.isError && !analysis}
          procedure="evidenceRepository.analyze"
          icon={ListChecks}
          emptyHint="No evidence rows analyzed yet. Attach evidence to controls first, or enable demo mode to preview the register."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>{tableHead}</thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>{tableHead}</thead>
              <tbody>
                {rows.map((row) => {
                  const statusMeta = EVIDENCE_STATUS_META[row.status] ?? EVIDENCE_STATUS_META.pending;
                  const freshnessMeta = FRESHNESS_META[row.freshness];
                  const cadenceMeta = CADENCE_META[row.cadence];
                  const qualityMeta = QUALITY_BAND_META[row.qualityBand];
                  const actionable =
                    row.freshness === "expired" ||
                    row.cadence === "overdue" ||
                    row.status === "rejected" ||
                    row.status === "pending";
                  return (
                    <tr key={String(row.id)} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground">{row.evidenceId}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <ScoreBar value={row.qualityScore} barClass={qualityMeta.barClass} />
                          </div>
                          <span className="text-sm tabular-nums text-muted-foreground">{row.qualityScore}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={freshnessMeta.badgeVariant}>{freshnessMeta.label}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={cadenceMeta.badgeVariant}>{cadenceMeta.label}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                        {row.owner || "-"}
                      </td>
                      <td
                        className={cn(
                          "p-4 text-sm whitespace-nowrap",
                          actionable ? "font-semibold text-[var(--warning-foreground)]" : "text-foreground"
                        )}
                      >
                        {row.nextAction}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Audit trail feed                                                 */
/* ------------------------------------------------------------------ */

function EvidenceAuditFeed({
  audit,
  auditQuery,
  onEnableDemo,
}: {
  audit: EvidenceAuditTrailResponse | undefined;
  auditQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const events = audit?.events ?? [];
  const summary = audit?.summary;
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (a.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER) -
          (b.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER)
      ),
    [events]
  );

  return (
    <Card className="rounded-xl shadow-sm border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <History className="h-5 w-5 text-muted-foreground" />
          Audit trail
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Last activity per evidence record - stale rows surface early.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Degrade
          isLoading={auditQuery.isLoading && !audit}
          hasData={events.length > 0}
          isError={auditQuery.isError && !audit}
          procedure="evidenceRepository.auditTrail"
          icon={History}
          emptyHint="Audit events appear once the evidenceRepository router is deployed. Enable demo mode to preview the feed."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-28 rounded-full" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </>
          }
        >
          {summary ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Layers className="h-3 w-3" />
                {summary.totals.total} records
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {summary.withOwner} with owner
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Paperclip className="h-3 w-3" />
                {summary.withFiles} with files
              </Badge>
            </div>
          ) : null}
          <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {sorted.map((event) => {
              const statusMeta = EVIDENCE_STATUS_META[event.status] ?? EVIDENCE_STATUS_META.pending;
              const daysLabel = formatDaysSinceUpdate(event.daysSinceUpdate);
              const stale = event.daysSinceUpdate !== null && event.daysSinceUpdate > 90;
              return (
                <div
                  key={String(event.id)}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                >
                  <Badge variant={statusMeta.badgeVariant} className="shrink-0">
                    {statusMeta.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{event.evidenceId}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {event.type} · {event.owner ?? "no owner"} · {event.fileCount} file
                      {event.fileCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        "text-sm tabular-nums",
                        stale ? "font-semibold text-[var(--error-foreground)]" : "text-muted-foreground"
                      )}
                    >
                      {daysLabel}
                    </div>
                    {event.updatedAt ? (
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {format(new Date(event.updatedAt), "MMM d, yyyy")}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Evidence suggestions                                             */
/* ------------------------------------------------------------------ */

function EvidenceSuggestionsPanel({
  suggestions,
  suggestQuery,
  onEnableDemo,
}: {
  suggestions: EvidenceSuggestionsResponse | undefined;
  suggestQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const items = suggestions?.suggestions ?? [];

  return (
    <Card className="rounded-xl shadow-sm border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
          Evidence suggestions
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Automated collections mapped to ENISA measures (Art. 21(2) gap-driven).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Degrade
          isLoading={suggestQuery.isLoading && !suggestions}
          hasData={items.length > 0}
          isError={suggestQuery.isError && !suggestions}
          procedure="evidenceRepository.suggest"
          icon={Lightbulb}
          emptyHint="Suggestions appear once evidence gaps are analyzed by the evidenceRepository router. Enable demo mode to preview."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          }
        >
          <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {items.map((suggestion) => (
              <div key={suggestion.measureId} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">{suggestion.measureId}</Badge>
                    <Badge variant="secondary">{suggestion.article}</Badge>
                    <span className="text-sm font-semibold text-foreground">{suggestion.title}</span>
                  </div>
                  <Badge variant={suggestionScoreBadge(suggestion.score)} className="shrink-0 tabular-nums">
                    {suggestion.score}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestion.evidenceTypes.map((evidenceType) => (
                    <Badge key={evidenceType} variant="secondary" className="px-2 py-0 text-[10px]">
                      {evidenceType}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{suggestion.collectionMethod}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Example: <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{suggestion.exampleEvidence}</code>
                  <span className="mx-1">·</span>refresh every {suggestion.freshnessDays}d
                </p>
                <p className="mt-2 text-xs text-foreground/80">Why: {suggestion.matchReason}</p>
              </div>
            ))}
          </div>
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export default function EvidenceRepositoryPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  const analysisInput = useMemo<EvidenceAnalysisInput | null>(
    () => (demoMode ? buildDemoEvidenceAnalysisInput() : null),
    [demoMode]
  );
  const analysisQuery = useEvidenceAnalysis(clientId, analysisInput);
  const analysis: EvidenceAnalysisResponse | undefined = demoMode
    ? (analysisQuery.data ?? buildDemoEvidenceAnalysis())
    : analysisQuery.data;

  const auditInput = useMemo<EvidenceAuditTrailInput | null>(
    () => (demoMode ? buildDemoEvidenceAuditTrailInput() : null),
    [demoMode]
  );
  const auditQuery = useEvidenceAuditTrail(clientId, auditInput);
  const audit: EvidenceAuditTrailResponse | undefined = demoMode
    ? (auditQuery.data ?? buildDemoEvidenceAuditTrail())
    : auditQuery.data;

  const suggestInput = useMemo<EvidenceSuggestionsInput | null>(
    () => (demoMode ? buildDemoEvidenceSuggestionsInput() : null),
    [demoMode]
  );
  const suggestQuery = useEvidenceSuggestions(clientId, suggestInput);
  const suggestions: EvidenceSuggestionsResponse | undefined = demoMode
    ? (suggestQuery.data ?? buildDemoEvidenceSuggestions())
    : suggestQuery.data;

  return (
    <section id={NIS2_EVIDENCE_REPOSITORY_SECTION_ID} className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Evidence Repository
            </h2>
            <p className="text-sm text-muted-foreground">
              Art. 21(2) evidence quality, freshness, renewal cadence and ENISA-measure gaps.
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
            <code className="text-xs">evidenceRepository.*</code> APIs to see live evidence data.
          </span>
        </div>
      )}

      {/* 1. Evidence health strip */}
      <EvidenceHealthStrip
        analysis={analysis}
        analysisQuery={analysisQuery}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* 2. Evidence quality table */}
      <EvidenceQualityTable
        analysis={analysis}
        analysisQuery={analysisQuery}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* 3 + 4. Audit trail feed + evidence suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvidenceAuditFeed
          audit={audit}
          auditQuery={auditQuery}
          onEnableDemo={() => setDemoMode(true)}
        />
        <EvidenceSuggestionsPanel
          suggestions={suggestions}
          suggestQuery={suggestQuery}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Freshness and renewal cadence are derived from last-verified and expiration dates per NIS2
        Art. 21(2). Evidence suggestions map to the ENISA technical-measure catalogue.
      </p>
    </section>
  );
}
