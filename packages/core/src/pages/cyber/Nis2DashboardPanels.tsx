/**
 * NIS2 Security Command - panels (cycle 38)
 * ==========================================
 * Renders the `nis2Dashboard.*` contract (see
 * `packages/core/src/pages/nis2DashboardApi.ts`) as the "NIS2 Security
 * Command" dashboard section:
 *
 *   1. Section header ("NIS2 Security Command")
 *   2. Article 21 control-health card grid   <- nis2Dashboard.controlHealth
 *   3. Security Domains rollup grid           <- nis2Dashboard.domainSummary
 *   4. Article 21 heatmap strip               <- controlHealth (shared cache)
 *   5. Incident Clock panel                   <- nis2Dashboard.incidentClock
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never spinner-forever, retry:false so a
 * missing endpoint never refetch-storms), EmptyState
 * ("Connect the nis2Dashboard.<proc> API") on error or missing payload.
 * Token-only colors (2) - dark-mode safe; score bars / heat cells use the
 * documented data-viz exception (18). Demo mode (17) is gated behind the
 * "Demo data" switch (off by default) and renders a persistent amber banner
 * whenever sample data is shown; a live endpoint always wins.
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
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  buildDemoControlHealth,
  buildDemoControlHealthInput,
  buildDemoDomainSummary,
  buildDemoDomainSummaryInput,
  buildDemoIncidentClock,
  buildDemoIncidentClockInput,
  DOMAIN_STATUS_META,
  EMPTY_CONTROL_HEALTH,
  EMPTY_DOMAIN_SUMMARY,
  EMPTY_INCIDENT_CLOCK,
  formatScore,
  HEAT_BAND_META,
  heatBand,
  isControlHealthEmpty,
  isDomainSummaryEmpty,
  isIncidentClockEmpty,
  MEASURE_STATUS_META,
  sortDomainsCanonically,
  sortMeasuresCanonically,
  useNis2ControlHealth,
  useNis2DomainSummary,
  useNis2IncidentClock,
  type Nis2ControlHealthInput,
  type Nis2ControlHealthResponse,
  type Nis2DomainSummaryEntry,
  type Nis2DomainSummaryInput,
  type Nis2DomainSummaryResponse,
  type Nis2IncidentClockResponse,
  type Nis2IncidentDeadline,
  type Nis2Measure,
} from "@/pages/nis2DashboardApi";

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
        title={isError ? `Connect the ${procedure} API` : emptyHint}
        description={
          isError
            ? `The ${procedure} endpoint is not live yet. It appears once the nis2Dashboard router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/**
 * Score bar (UI-STANDARD 18) - muted track + vivid data-viz fill paired for
 * dark mode via the api layer's band classes.
 */
function ScoreBar({ value, fillClass, label }: { value: number; fillClass: string; label: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div className={cn("h-full rounded-full transition-all", fillClass)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Eyebrow sub-heading shared by all subsections (UI-STANDARD 4). */
function SectionEyebrow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
    </div>
  );
}

/** Compact ISO -> human datetime for deadline rows (runtime formatting). */
function formatDueAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Signed hours-remaining -> urgency badge styling + copy. */
function DeadlineChip({ hoursRemaining }: { hoursRemaining: number }) {
  if (hoursRemaining < 0) {
    return (
      <Badge variant="destructive" className="gap-1 tabular-nums">
        Overdue {Math.abs(Math.round(hoursRemaining))}h
      </Badge>
    );
  }
  const variant = hoursRemaining <= 24 ? "error" : hoursRemaining <= 72 ? "warning" : "info";
  return (
    <Badge variant={variant} className="gap-1 tabular-nums">
      {Math.round(hoursRemaining)}h remaining
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Control-health grid (nis2Dashboard.controlHealth)                    */
/* ------------------------------------------------------------------ */

function MeasureCard({ measure }: { measure: Nis2Measure }) {
  const statusMeta = MEASURE_STATUS_META[measure.status] ?? MEASURE_STATUS_META["no-data"];
  const band = heatBand(measure.status === "no-data" ? "no-data" : measure.score);
  const bandMeta = HEAT_BAND_META[band];
  const metrics = Array.isArray(measure.metrics) ? measure.metrics.slice(0, 2) : [];

  return (
    <Card className="h-full rounded-xl border-border shadow-sm">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        {/* Article chip + title + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {measure.article}
            </span>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground" title={measure.title}>
              {measure.title}
            </p>
          </div>
          <Badge variant={statusMeta.badgeVariant} className="shrink-0">
            {statusMeta.label}
          </Badge>
        </div>

        {/* Score + band-colored bar */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-lg font-bold tabular-nums", bandMeta.textClass)}>
              {formatScore(measure.score)}
            </span>
            <span className="text-[11px] text-muted-foreground">/ 100</span>
          </div>
          <ScoreBar
            value={measure.score}
            fillClass={bandMeta.cellClass}
            label={`${measure.title} effectiveness score`}
          />
        </div>

        {/* Alerts + evidence metric chips */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {measure.alertCount > 0 && (
            <Badge variant="error" className="gap-1 px-1.5 tabular-nums">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {measure.alertCount}
              <span className="sr-only">open alerts</span>
            </Badge>
          )}
          {metrics.map((metric) => (
            <span
              key={`${metric.label}-${metric.value}`}
              title={`${metric.label}: ${metric.value}`}
              className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <span className="font-medium tabular-nums text-foreground/70">{metric.value}</span>
              <span className="truncate">{metric.label}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ControlHealthGrid({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo?: () => void;
}) {
  const input = useMemo<Nis2ControlHealthInput | null>(
    () => (demoMode ? buildDemoControlHealthInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useNis2ControlHealth(input);
  const data: Nis2ControlHealthResponse = demoMode
    ? buildDemoControlHealth()
    : (query.data ?? EMPTY_CONTROL_HEALTH);
  const hasData = !isControlHealthEmpty(data);
  const measures = sortMeasuresCanonically(data.measures);

  return (
    <div className="space-y-3">
      <SectionEyebrow icon={ShieldAlert} label="Article 21 Control Health" />
      <Degrade
        isLoading={query.isLoading}
        hasData={hasData}
        isError={query.isError}
        procedure="nis2Dashboard.controlHealth"
        icon={ShieldAlert}
        emptyHint={
          clientId > 0
            ? "The 12-measure control-health grid appears once the nis2Dashboard router is deployed. Enable demo mode to preview it."
            : "Select a client workspace to activate the NIS2 command view."
        }
        onEnableDemo={clientId > 0 ? onEnableDemo : undefined}
        skeleton={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          aria-label="Article 21 control health across 12 measures"
        >
          {measures.map((measure) => (
            <MeasureCard key={measure.id} measure={measure} />
          ))}
        </div>
      </Degrade>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Security Domains grid (nis2Dashboard.domainSummary)                  */
/* ------------------------------------------------------------------ */

function DomainCard({ domain }: { domain: Nis2DomainSummaryEntry }) {
  const meta = DOMAIN_STATUS_META[domain.status] ?? DOMAIN_STATUS_META["no-data"];
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border border-border border-l-4 bg-card p-4 shadow-sm",
        meta.accentClass
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{domain.title}</p>
        {domain.alertCount > 0 ? (
          <Badge variant={meta.badgeVariant} className="shrink-0 gap-1 px-1.5 tabular-nums">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {domain.alertCount}
            <span className="sr-only">open alerts</span>
          </Badge>
        ) : (
          <Badge variant={meta.badgeVariant} className="shrink-0">
            {meta.label}
          </Badge>
        )}
      </div>
      <p className="text-sm text-foreground/80">{domain.primary}</p>
      <p className="mt-auto text-xs text-muted-foreground">{domain.secondary}</p>
    </div>
  );
}

function DomainSummaryGrid({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo?: () => void;
}) {
  const input = useMemo<Nis2DomainSummaryInput | null>(
    () => (demoMode ? buildDemoDomainSummaryInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useNis2DomainSummary(input);
  const data: Nis2DomainSummaryResponse = demoMode
    ? buildDemoDomainSummary()
    : (query.data ?? EMPTY_DOMAIN_SUMMARY);
  const hasData = !isDomainSummaryEmpty(data);
  const domains = sortDomainsCanonically(data.domains);

  return (
    <div className="space-y-3">
      <SectionEyebrow icon={Layers} label="Security Domains" />
      <Degrade
        isLoading={query.isLoading}
        hasData={hasData}
        isError={query.isError}
        procedure="nis2Dashboard.domainSummary"
        icon={Layers}
        emptyHint={
          clientId > 0
            ? "The eight-domain rollup appears once the nis2Dashboard router is deployed. Enable demo mode to preview it."
            : "Select a client workspace to activate the NIS2 command view."
        }
        onEnableDemo={clientId > 0 ? onEnableDemo : undefined}
        skeleton={
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          aria-label="Security domain rollups"
        >
          {domains.map((domain) => (
            <DomainCard key={domain.key} domain={domain} />
          ))}
        </div>
      </Degrade>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Article 21 heatmap strip (shares the controlHealth cache)             */
/* ------------------------------------------------------------------ */

function HeatmapStrip({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo?: () => void;
}) {
  const input = useMemo<Nis2ControlHealthInput | null>(
    () => (demoMode ? buildDemoControlHealthInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useNis2ControlHealth(input);
  const data = demoMode ? buildDemoControlHealth() : (query.data ?? EMPTY_CONTROL_HEALTH);
  const hasData = !isControlHealthEmpty(data);
  const measures = sortMeasuresCanonically(data.measures);

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">Article 21 Heatmap</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Effectiveness at a glance - green 80+, amber 50-79, red below 50, grey = no data.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={hasData}
          isError={query.isError}
          procedure="nis2Dashboard.controlHealth"
          icon={ShieldAlert}
          emptyHint={
            clientId > 0
              ? "The heatmap appears once the nis2Dashboard router is deployed. Enable demo mode to preview it."
              : "Select a client workspace to activate the NIS2 command view."
          }
          onEnableDemo={clientId > 0 ? onEnableDemo : undefined}
          skeleton={<Skeleton className="h-16 w-full rounded-lg" />}
        >
          <>
            <div
              className="flex items-end gap-1"
              role="img"
              aria-label="Article 21 effectiveness heatmap across 12 measures"
            >
              {measures.map((measure) => {
                const band =
                  measure.status === "no-data" ? heatBand("no-data") : heatBand(measure.score);
                const tooltip = `${measure.title} (${measure.article}) - ${formatScore(
                  measure.score
                )}/100 - ${MEASURE_STATUS_META[measure.status]?.label ?? measure.status}`;
                return (
                  <div key={measure.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      title={tooltip}
                      aria-label={tooltip}
                      className={cn(
                        "h-8 w-full rounded-md transition-colors",
                        HEAT_BAND_META[band].cellClass
                      )}
                    />
                    <span
                      className="w-full truncate text-center text-[10px] tabular-nums text-muted-foreground"
                      title={measure.article}
                    >
                      {formatScore(measure.score)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {(Object.keys(HEAT_BAND_META) as Array<keyof typeof HEAT_BAND_META>).map((band) => (
                <span key={band} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={cn("inline-block h-2.5 w-2.5 rounded-full", HEAT_BAND_META[band].cellClass)}
                    aria-hidden="true"
                  />
                  {HEAT_BAND_META[band].label}
                </span>
              ))}
            </div>
          </>
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Incident Clock panel (nis2Dashboard.incidentClock)                   */
/* ------------------------------------------------------------------ */

function DeadlineRow({ deadline }: { deadline: Nis2IncidentDeadline }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="info" className="gap-1">
          <Timer className="h-3 w-3" aria-hidden="true" />
          {deadline.label}
        </Badge>
        <DeadlineChip hoursRemaining={deadline.hoursRemaining} />
      </div>
      <p className="text-sm font-medium text-foreground">{deadline.incidentTitle}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        Due {formatDueAt(deadline.dueAt)}
        {deadline.incidentId !== null ? ` - incident #${deadline.incidentId}` : ""}
      </p>
    </div>
  );
}

function IncidentClockPanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo?: () => void;
}) {
  const input = useMemo(
    () => (demoMode ? buildDemoIncidentClockInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useNis2IncidentClock(input);
  const data: Nis2IncidentClockResponse = demoMode
    ? buildDemoIncidentClock()
    : (query.data ?? EMPTY_INCIDENT_CLOCK);
  const hasData = !isIncidentClockEmpty(data);
  const deadline = data.nextDeadline;

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              Incident Clock
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Significant incidents and the nearest regulatory reporting deadline (24h / 72h).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={hasData}
          isError={query.isError}
          procedure="nis2Dashboard.incidentClock"
          icon={Clock}
          emptyHint={
            clientId > 0
              ? "The incident clock appears once the nis2Dashboard router is deployed. Enable demo mode to preview it."
              : "Select a client workspace to activate the NIS2 command view."
          }
          onEnableDemo={clientId > 0 ? onEnableDemo : undefined}
          skeleton={
            <div className="space-y-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          }
        >
          <div className="space-y-4">
            {/* Significant incidents open */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {data.openSignificant}
              </span>
              <span className="text-sm text-muted-foreground">
                significant incident{data.openSignificant === 1 ? "" : "s"} open
              </span>
            </div>

            {/* Nearest regulatory clock - or a calm all-clear row */}
            {deadline !== null && deadline !== undefined ? (
              <DeadlineRow deadline={deadline} />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">No active regulatory clocks</p>
                  <p className="text-xs text-muted-foreground">
                    All significant incidents are within their reporting deadlines.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                      */
/* ------------------------------------------------------------------ */

export function Nis2DashboardPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  return (
    <section className="space-y-6" aria-label="NIS2 Security Command">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Security Command
            </h2>
            <p className="text-sm text-muted-foreground">
              Article 21 control health across 12 measures - domains, heat and regulatory clocks.
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Demo data
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Toggle demo data" />
        </label>
      </div>

      {/* Demo banner - persistent while sample data is shown (UI-STANDARD 17) */}
      {demoMode && (
        <div
          className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          role="status"
        >
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Demo mode:</strong> showing sample data. Connect the{" "}
            <code className="text-xs">nis2Dashboard.*</code> APIs to see live posture.
          </span>
        </div>
      )}

      {/* Article 21 control-health card grid */}
      <ControlHealthGrid clientId={clientId} demoMode={demoMode} onEnableDemo={() => setDemoMode(true)} />

      {/* Security domains rollup grid */}
      <DomainSummaryGrid clientId={clientId} demoMode={demoMode} onEnableDemo={() => setDemoMode(true)} />

      {/* Article 21 heatmap strip + incident clock side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapStrip clientId={clientId} demoMode={demoMode} onEnableDemo={() => setDemoMode(true)} />
        <IncidentClockPanel clientId={clientId} demoMode={demoMode} onEnableDemo={() => setDemoMode(true)} />
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Control health follows NIS2 Art. 21(2) and ENISA measures; deadlines follow the 24-hour
        early-warning and 72-hour notification clocks.
      </p>
    </section>
  );
}
